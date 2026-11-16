import { fixosDoDia, hhmm, paraMin } from "./interpretador";
import type { Bloco, Config, NaoCoube, Plano, Tarefa, TipoBloco } from "./types";

interface Item {
  ini: number; // minutos desde 00:00 do dia (pode passar de 1440)
  fim: number;
  titulo: string;
  tipo: TipoBloco;
  observacao: string;
  tarefaId?: string;
  feito?: boolean;
}

interface Unidade {
  tarefa: Tarefa;
  restante: number;
  partes: number;
  depois: number;
  antes: number;
}

const TRANSICAO = 5;
const MENOR_PARTE = 25;
const sem = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const teto5 = (m: number) => Math.ceil(m / 5) * 5;

export interface PedidoOrganizar {
  data: string;
  tarefas: Tarefa[];
  config: Config;
  feitos: Bloco[]; // blocos já concluídos (mantidos no lugar)
  inicioMin: number; // a partir de quando pode agendar (agora, se for hoje)
}

export function organizar({ data, tarefas, config, feitos, inicioMin }: PedidoOrganizar): Plano {
  const acordar = paraMin(config.acordar);
  let dormir = paraMin(config.dormir);
  if (dormir <= acordar) dormir += 1440;
  const [a, m, d] = data.split("-").map(Number);
  const diaSemana = new Date(a, m - 1, d).getDay();

  const intervalo = (ini: string, fim: string): [number, number] => {
    let i = paraMin(ini);
    let f = paraMin(fim);
    if (i < acordar - 120) i += 1440; // madrugada pertence ao fim do dia
    while (f <= i) f += 1440;
    return [i, f];
  };

  const itens: Item[] = [];
  const ocupado: [number, number][] = [];
  const foiFeito = (titulo: string, inicio: string) => feitos.some((b) => b.titulo === titulo && b.inicio === inicio);

  // 1. Compromissos fixos (da semana + com horário no texto)
  const fixos = [...fixosDoDia(config.compromissosFixos, diaSemana), ...tarefas.filter((t) => t.inicio)];
  for (const t of fixos) {
    const [ini, fim] = intervalo(t.inicio!, t.fim ?? hhmm(paraMin(t.inicio!) + t.duracaoMin));
    itens.push({ ini, fim, titulo: t.titulo, tipo: "fixo", observacao: "", tarefaId: t.id, feito: foiFeito(t.titulo, t.inicio!) });
    ocupado.push([ini, fim]);
  }

  // 2. Blocos já concluídos ficam onde estão
  for (const b of feitos) {
    if (b.tipo === "fixo") continue;
    const [ini, fim] = intervalo(b.inicio, b.fim);
    itens.push({ ini, fim, titulo: b.titulo, tipo: b.tipo, observacao: b.observacao, tarefaId: b.tarefaId, feito: true });
    ocupado.push([ini, fim]);
  }

  const inicio = teto5(Math.max(acordar, inicioMin));
  const livreEm = (ini: number, fim: number) => ini >= inicio && fim <= dormir && !ocupado.some(([x, y]) => ini < y && fim > x);

  // 3. Refeições automáticas, se o usuário não mencionou
  if (config.refeicoes) {
    const textos = [...fixos.map((t) => t.titulo), ...tarefas.map((t) => t.titulo), ...feitos.map((b) => b.titulo)].map(sem).join(" | ");
    const refeicoes: [string, RegExp, number, number[]][] = [
      ["Café da manhã", /cafe/, 20, [acordar + 10, acordar + 30, acordar + 60]],
      ["Almoço", /almoc/, 45, [720, 750, 690, 780, 810, 660]],
      ["Jantar", /janta/, 40, [1170, 1140, 1200, 1230, 1110, 1260, 1290, 1320]],
    ];
    for (const [titulo, re, dur, horarios] of refeicoes) {
      if (re.test(textos)) continue;
      const h = horarios.find((x) => livreEm(x, x + dur));
      if (h === undefined) continue;
      itens.push({ ini: h, fim: h + dur, titulo, tipo: "refeicao", observacao: "" });
      ocupado.push([h, h + dur]);
    }
  }

  // 4. Espaços livres
  ocupado.sort((x, y) => x[0] - y[0]);
  const lacunas: [number, number][] = [];
  let cursor = inicio;
  for (const [x, y] of ocupado) {
    if (x > cursor) lacunas.push([cursor, Math.min(x, dormir)]);
    cursor = Math.max(cursor, y);
    if (cursor >= dormir) break;
  }
  if (cursor < dormir) lacunas.push([cursor, dormir]);

  // 5. Fila de tarefas flexíveis: prioridade → prazo → mais longas primeiro
  const feitoPorTarefa = new Map<string, number>();
  for (const b of feitos) if (b.tarefaId) feitoPorTarefa.set(b.tarefaId, (feitoPorTarefa.get(b.tarefaId) ?? 0) + (paraMin(b.fim) - paraMin(b.inicio) + 1440) % 1440);

  const fila: Unidade[] = tarefas
    .filter((t) => !t.inicio)
    .map((t) => ({
      tarefa: t,
      restante: t.duracaoMin - (feitoPorTarefa.get(t.id) ?? 0),
      partes: 0,
      depois: t.depoisDe ? intervalo(t.depoisDe, t.depoisDe)[0] : 0,
      antes: t.antesDe ? intervalo(t.antesDe, t.antesDe)[0] : Infinity,
    }))
    .filter((u) => u.restante >= 10)
    .sort(
      (x, y) =>
        Number(y.tarefa.prioridade) - Number(x.tarefa.prioridade) ||
        x.antes - y.antes ||
        y.restante - x.restante,
    );

  const colocados: Item[] = [];
  const pomo = config.pomodoro?.ativo ? config.pomodoro : null;
  const foco = pomo ? pomo.focoMin : config.focoMaxMin;
  const pausaCurta = pomo ? pomo.pausaCurtaMin : config.pausaMin;
  const menorParte = Math.min(MENOR_PARTE, foco);
  const desl = config.deslocamentoMin;

  for (const [gIni, gFim] of lacunas) {
    let c = gIni;
    let focoAtual = 0;
    let anteriorTarefa = false;
    let ciclosDesdeLonga = 0;

    for (;;) {
      let colocou = false;
      for (const u of fila) {
        if (u.restante <= 0) continue;
        const fora = u.tarefa.fora;
        const precisaPausa = !fora && focoAtual > 0 && focoAtual + Math.min(u.restante, foco) > foco;
        const longa = !!pomo && ciclosDesdeLonga >= pomo.ciclos;
        const pausaDur = longa ? pomo!.pausaLongaMin : pausaCurta;
        let ini = c + (precisaPausa ? pausaDur : anteriorTarefa ? TRANSICAO : 0);
        ini = teto5(Math.max(ini, u.depois));
        const limite = Math.min(gFim, u.antes);
        const extra = fora ? desl * 2 : 0; // ida e volta
        const disponivel = limite - ini - extra;

        let parte = fora ? u.restante : Math.min(u.restante, foco);
        if (u.restante - parte > 0 && u.restante - parte < 10) parte = u.restante; // não deixa sobrinha
        if (parte > disponivel) {
          // Divide tarefas longas para aproveitar o espaço
          const sobra = u.restante - disponivel;
          if (!fora && disponivel >= menorParte && (sobra === 0 || sobra >= Math.min(20, foco))) parte = disponivel;
          else continue;
        }
        parte = Math.floor(parte / 5) * 5 || parte;

        if (precisaPausa && !(u.depois > c + pausaDur)) {
          colocados.push({
            ini: c,
            fim: c + pausaDur,
            titulo: pomo ? (longa ? "Pausa longa" : "Pausa curta") : "Pausa",
            tipo: "pausa",
            observacao: longa ? "Saia da tela: caminhe, coma algo, descanse a vista" : "Levante, beba água, alongue",
          });
          focoAtual = 0;
          if (longa) ciclosDesdeLonga = 0;
        }
        let t = ini;
        if (fora) {
          colocados.push({ ini: t, fim: t + desl, titulo: `Ida: ${u.tarefa.titulo.toLowerCase()}`, tipo: "deslocamento", observacao: "" });
          t += desl;
        }
        colocados.push({ ini: t, fim: t + parte, titulo: u.tarefa.titulo, tipo: "tarefa", observacao: "", tarefaId: u.tarefa.id });
        t += parte;
        if (fora) {
          colocados.push({ ini: t, fim: t + desl, titulo: "Volta para casa", tipo: "deslocamento", observacao: "" });
          t += desl;
          focoAtual = 0;
          anteriorTarefa = false;
        } else {
          focoAtual += parte;
          anteriorTarefa = true;
          ciclosDesdeLonga++;
        }
        u.restante -= parte;
        u.partes++;
        c = t;
        colocou = true;
        break;
      }
      if (!colocou) break;
    }
  }

  const livreMin = Math.max(
    0,
    lacunas.reduce((acc, [x, y]) => acc + y - x, 0) - colocados.reduce((acc, b) => acc + b.fim - b.ini, 0),
  );

  // 6. Partes numeradas e dicas
  for (const u of fila) {
    const blocos = colocados.filter((b) => b.tarefaId === u.tarefa.id);
    const anteriores = feitos.filter((b) => b.tarefaId === u.tarefa.id).length;
    if (blocos.length + anteriores > 1)
      blocos.forEach((b, i) => (b.titulo = `${u.tarefa.titulo} (${pomo ? "🍅" : "parte"} ${i + 1 + anteriores})`));
    if (blocos[0]) {
      const n = sem(u.tarefa.titulo);
      if (u.tarefa.prioridade) blocos[0].observacao = "Prioridade do dia — celular longe da mesa";
      else if (/mercado|compras|feira/.test(n)) blocos[0].observacao = "Leve a lista pronta";
      else if (/estud|revis|prova/.test(n)) blocos[0].observacao = "Comece pelo assunto mais difícil";
    }
  }

  const naoCouberam: NaoCoube[] = fila
    .filter((u) => u.restante >= 10)
    .map((u) => ({
      titulo: u.tarefa.titulo,
      motivo:
        u.partes > 0
          ? `Faltaram ${u.restante} min — continue amanhã`
          : u.antes !== Infinity
            ? `Não há espaço livre antes das ${hhmm(u.antes)}`
            : "Sem espaço livre até a hora de dormir",
    }));

  const todos = [...itens, ...colocados].sort((x, y) => x.ini - y.ini);
  const blocos: Bloco[] = todos.map((b) => ({
    inicio: hhmm(b.ini),
    fim: hhmm(b.fim),
    titulo: b.titulo,
    tipo: b.tipo,
    observacao: b.observacao,
    tarefaId: b.tarefaId,
    feito: b.feito,
  }));

  const minutosFoco = colocados.filter((b) => b.tipo === "tarefa").reduce((s, b) => s + b.fim - b.ini, 0);
  const qtd = new Set(colocados.filter((b) => b.tarefaId).map((b) => b.tarefaId)).size;
  const principal = fila.find((u) => u.tarefa.prioridade && u.partes > 0)?.tarefa.titulo;
  const horas = minutosFoco >= 60 ? `${Math.floor(minutosFoco / 60)}h${String(minutosFoco % 60).padStart(2, "0")}` : `${minutosFoco} min`;
  const resumo =
    qtd === 0
      ? naoCouberam.length
        ? "Hoje não sobrou espaço livre para as tarefas. Veja o que ficou para depois."
        : "Agenda montada com seus compromissos."
      : `${qtd} ${qtd === 1 ? "tarefa encaixada" : "tarefas encaixadas"} · ${horas} de foco.` +
        (principal ? ` Comece por: ${principal}.` : " Um bloco de cada vez — você consegue.");

  return { data, resumo, blocos, naoCouberam, tarefas, livreMin, criadoEm: new Date().toISOString() };
}
