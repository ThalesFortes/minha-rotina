import { dividir, interpretarItem, normalizar, novoId } from "./interpretador";
import { organizar } from "./organizador";
import type { Config, Meta, NaoCoube, Plano, Semana, Tarefa } from "./types";

// ---------- Datas ----------

export const isoDe = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const deIso = (s: string) => {
  const [a, m, d] = s.split("-").map(Number);
  return new Date(a, m - 1, d);
};
export const somarDias = (iso: string, n: number) => {
  const d = deIso(iso);
  d.setDate(d.getDate() + n);
  return isoDe(d);
};
/** Segunda-feira da semana que contém a data. */
export const segundaDe = (iso: string) => {
  const dow = deIso(iso).getDay();
  return somarDias(iso, dow === 0 ? -6 : 1 - dow);
};
export const diasDaSemana = (segunda: string) => Array.from({ length: 7 }, (_, i) => somarDias(segunda, i));

const NOMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const nomeCurto = (iso: string) => NOMES[deIso(iso).getDay()];
export const diaMes = (iso: string) => {
  const d = deIso(iso);
  return `${d.getDate()}/${String(d.getMonth() + 1).padStart(2, "0")}`;
};

/** Semana que deve estar planejada agora, conforme o momento da revisão escolhido. */
export function semanaAlvo(hoje: string, agoraMin: number, revisao: Config["revisao"]): string {
  const ehDomingoNoite = deIso(hoje).getDay() === 0 && agoraMin >= 18 * 60;
  return revisao === "domingo" && ehDomingoNoite ? somarDias(hoje, 1) : segundaDe(hoje);
}

// ---------- Interpretação ----------

const DIA_NOME = String.raw`(segunda|terca|quarta|quinta|sexta|sabado|domingo)(?:[- ]feira)?`;
const INDICE: Record<string, number> = { domingo: 0, segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6 };

/** Converte "quarta" na data dentro da semana; null se já passou. */
function dataDoDia(nome: string, segunda: string, hoje: string): string | null {
  const idx = INDICE[nome];
  const iso = somarDias(segunda, idx === 0 ? 6 : idx - 1);
  return iso < hoje ? null : iso;
}

function extrairDia(texto: string, segunda: string, hoje: string) {
  const n = normalizar(texto);
  let resto = texto;
  let dia: string | undefined;
  let ateDia: string | undefined;
  const apagar = (m: RegExpExecArray) => {
    resto = resto.slice(0, m.index) + " ".repeat(m[0].length) + resto.slice(m.index + m[0].length);
  };

  const prazo = new RegExp(String.raw`\b(?:ate|antes d[aeo]|no maximo)\s+(?:a |o |na |no )?(?:${DIA_NOME}|(amanha)|(o )?fim de semana)\b`).exec(n);
  if (prazo) {
    ateDia = prazo[1] ? (dataDoDia(prazo[1], segunda, hoje) ?? undefined) : prazo[2] ? somarDias(hoje, 1) : somarDias(segunda, 6);
    apagar(prazo);
  }
  const exato = new RegExp(String.raw`\b(?:n[ao]\s+|n[ao] proxim[ao]\s+|toda\s+|todo\s+)?(?:${DIA_NOME}|(depois de amanha|amanha|hoje)|(?:n?o )?(fim de semana))\b`).exec(
    normalizar(resto),
  );
  if (exato) {
    if (exato[1]) dia = dataDoDia(exato[1], segunda, hoje) ?? undefined;
    else if (exato[2]) dia = somarDias(hoje, exato[2] === "hoje" ? 0 : exato[2] === "amanha" ? 1 : 2);
    else if (exato[3]) dia = somarDias(segunda, 5);
    apagar(exato);
  }
  return { resto, dia, ateDia };
}

/** Tarefas da semana: "sexta pagar boleto", "até quarta entregar trabalho", "quinta dentista às 15h". */
export function interpretarTarefasSemana(texto: string, segunda: string, hoje: string): Tarefa[] {
  const out: Tarefa[] = [];
  for (const parte of dividir(texto)) {
    const { resto, dia, ateDia } = extrairDia(parte, segunda, hoje);
    const t = interpretarItem(resto);
    if (!t) continue;
    const fim = somarDias(segunda, 6);
    out.push({
      ...t,
      semana: true,
      dia: dia && dia <= fim ? dia : undefined,
      ateDia: !dia && ateDia && ateDia <= fim ? ateDia : undefined,
    });
  }
  return out;
}

const VEZES_PALAVRA: Record<string, number> = { uma: 1, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7 };

/** Metas: "academia 3x", "estudar inglês 5h na semana", "ler 30 min por dia". */
export function interpretarMetas(texto: string): Meta[] {
  const out: Meta[] = [];
  for (const linha of texto.split(/\n|;|,(?!\d)|\.(?!\d)/)) {
    if (!linha.trim()) continue;
    let resto = linha;
    const n = normalizar(linha);
    const apagar = (m: RegExpExecArray | null) => {
      if (m) resto = resto.slice(0, m.index) + " ".repeat(m[0].length) + resto.slice(m.index + m[0].length);
      return m;
    };
    apagar(/^\s*(?:minha meta (?:e|eh)|meta(?: da semana)?:?|quero|preciso|tenho que)\s+/.exec(n));

    let tipo: Meta["tipo"] = "vezes";
    let alvo = 3;
    let m: RegExpExecArray | null;
    if ((m = apagar(/\b(\d+(?:[.,]\d+)?)\s*(?:h|hs|horas?)\s*(?:por|na|pela|durante a|da)\s+semana\b/.exec(n)))) {
      tipo = "horas";
      alvo = parseFloat(m[1].replace(",", "."));
    } else if ((m = apagar(/\b(\d+)\s*(?:x|vezes)\b(?:\s*(?:por|na)\s+semana)?/.exec(n)))) {
      alvo = Number(m[1]);
    } else if ((m = apagar(/\b(uma|duas|tres|quatro|cinco|seis|sete)\s+vezes\b(?:\s*(?:por|na)\s+semana)?/.exec(n)))) {
      alvo = VEZES_PALAVRA[m[1]];
    } else if (apagar(/\b(?:todo(?:s os)? dias?|diariamente|por dia|todo santo dia)\b/.exec(n))) {
      alvo = 7;
    } else if (apagar(/\b(?:nos |em )?dias uteis\b|\bde segunda a sexta\b/.exec(n))) {
      alvo = 5;
    } else if (apagar(/\b(?:no |nos )?fins? de semana\b/.exec(n))) {
      alvo = 2;
    }
    apagar(/\b(?:por|na) semana\b/.exec(normalizar(resto)));

    const temDuracao = /\d+\s*(?:min|h\b|hora)|meia hora|\bhora\b/.test(normalizar(resto));
    const item = interpretarItem(resto);
    if (!item) continue;
    out.push({
      id: novoId(),
      titulo: item.titulo,
      tipo,
      alvo: Math.max(1, alvo),
      sessaoMin: temDuracao ? item.duracaoMin : tipo === "horas" ? 60 : Math.max(30, item.duracaoMin),
      fora: item.fora,
      depoisDe: item.depoisDe,
      antesDe: item.antesDe,
    });
  }
  return out;
}

// ---------- Progresso ----------

const duracaoBloco = (ini: string, fim: string) => {
  const [a, b] = ini.split(":").map(Number);
  const [c, d] = fim.split(":").map(Number);
  return (c * 60 + d - (a * 60 + b) + 1440) % 1440;
};

export const sessoesNecessarias = (m: Meta) => (m.tipo === "vezes" ? m.alvo : Math.ceil((m.alvo * 60) / m.sessaoMin));

/** Chave de progresso: a meta, ou a etapa de um projeto. */
export const chaveMeta = (metaId: string, etapaId?: string) => (etapaId ? `${metaId}#${etapaId}` : metaId);

/** Minutos concluídos de cada meta/tarefa na semana. */
export function feitoNaSemana(segunda: string, planos: Record<string, Plano>) {
  const porId = new Map<string, number>();
  const porMeta = new Map<string, number>();
  for (const d of diasDaSemana(segunda)) {
    for (const b of planos[d]?.blocos ?? []) {
      if (!b.feito || !b.tarefaId) continue;
      const min = duracaoBloco(b.inicio, b.fim);
      porId.set(b.tarefaId, (porId.get(b.tarefaId) ?? 0) + min);
      const t = planos[d].tarefas.find((x) => x.id === b.tarefaId);
      if (t?.metaId) {
        const k = chaveMeta(t.metaId, t.etapaId);
        porMeta.set(k, (porMeta.get(k) ?? 0) + min);
      }
    }
  }
  return { porId, porMeta };
}

export function progressoMeta(m: Meta, porMeta: Map<string, number>) {
  const min = porMeta.get(m.id) ?? 0;
  if (m.tipo === "horas") {
    const feito = Math.round((min / 60) * 10) / 10;
    return { texto: `${feito}/${m.alvo}h`, fracao: Math.min(1, min / (m.alvo * 60)) };
  }
  const vezes = Math.floor(min / m.sessaoMin + 0.01);
  return { texto: `${Math.min(vezes, m.alvo)}/${m.alvo} vezes`, fracao: Math.min(1, vezes / m.alvo) };
}

export function tarefasPendentes(s: Semana, planos: Record<string, Plano>): Tarefa[] {
  const { porId } = feitoNaSemana(s.inicio, planos);
  // Compromissos com horário marcado já passaram — não viram pendência.
  return s.tarefas.filter((t) => !t.inicio && (porId.get(t.id) ?? 0) < t.duracaoMin);
}

// ---------- Distribuição ----------

interface Entrada {
  semana: Semana;
  config: Config;
  planos: Record<string, Plano>;
  listas: Record<string, Tarefa[]>;
  hoje: string;
  agoraMin: number;
}

export function distribuirSemana({ semana, config, planos, listas, hoje, agoraMin }: Entrada) {
  const dias = diasDaSemana(semana.inicio).filter((d) => d >= hoje);
  const { porId, porMeta } = feitoNaSemana(semana.inicio, planos);
  const atribuidas: Record<string, Tarefa[]> = Object.fromEntries(dias.map((d) => [d, []]));
  const manuais: Record<string, Tarefa[]> = {};
  const saldo: Record<string, number> = {};
  const naoCouberam: NaoCoube[] = [];

  // Tempo livre real de cada dia (já descontando fixos, refeições, feitos e tarefas avulsas do dia)
  for (const d of dias) {
    manuais[d] = (listas[d] ?? planos[d]?.tarefas ?? []).filter((t) => !t.semana);
    const base = organizar({
      data: d,
      tarefas: manuais[d],
      config,
      feitos: planos[d]?.blocos.filter((b) => b.feito) ?? [],
      inicioMin: d === hoje ? agoraMin : 0,
    });
    saldo[d] = Math.floor((base.livreMin ?? 0) * 0.8); // folga de 20% para imprevistos e pausas
  }

  const custo = (t: Tarefa) => (t.inicio ? 0 : t.duracaoMin + (t.fora ? config.deslocamentoMin * 2 : 0) + config.pausaMin);
  const por = (d: string, t: Tarefa) => {
    atribuidas[d].push(t);
    saldo[d] -= custo(t);
  };

  const pendentes = semana.tarefas
    .map((t) => ({ ...t, duracaoMin: t.duracaoMin - (porId.get(t.id) ?? 0) }))
    .filter((t) => t.duracaoMin >= 10 || (t.inicio && !porId.has(t.id)));

  // 1. Dia exato
  for (const t of pendentes.filter((t) => t.dia)) {
    if (atribuidas[t.dia!]) por(t.dia!, t);
    else naoCouberam.push({ titulo: t.titulo, motivo: "O dia pedido já passou" });
  }
  // 2. Com prazo: o quanto antes
  for (const t of pendentes.filter((t) => !t.dia && t.ateDia).sort((a, b) => a.ateDia!.localeCompare(b.ateDia!))) {
    const possiveis = dias.filter((d) => d <= t.ateDia!);
    const d = possiveis.find((x) => saldo[x] >= custo(t)) ?? [...possiveis].sort((a, b) => saldo[b] - saldo[a])[0];
    if (d) por(d, t);
    else naoCouberam.push({ titulo: t.titulo, motivo: "O prazo já passou" });
  }
  // 3. Metas: sessões espalhadas pela semana
  for (const m of semana.metas) {
    const feitas = Math.floor((porMeta.get(chaveMeta(m.id, m.etapaId)) ?? 0) / m.sessaoMin + 0.01);
    const faltam = sessoesNecessarias(m) - feitas;
    if (faltam <= 0 || !dias.length) continue;
    const usados = new Map<string, number>();
    for (let i = 0; i < faltam; i++) {
      const ideal = Math.min(dias.length - 1, Math.floor(((i + 0.5) * dias.length) / faltam));
      const sessao: Tarefa = {
        id: `${m.id}-${i}-${novoId()}`,
        titulo: m.titulo,
        duracaoMin: m.sessaoMin,
        prioridade: false,
        fora: m.fora,
        depoisDe: m.depoisDe,
        antesDe: m.antesDe,
        semana: true,
        metaId: m.id,
        etapaId: m.etapaId,
      };
      const rodada = Math.floor(i / dias.length);
      const candidatos = dias
        .map((d, k) => ({ d, dist: Math.abs(k - ideal) }))
        .filter(({ d }) => (usados.get(d) ?? 0) <= rodada && saldo[d] >= custo(sessao))
        .sort((a, b) => a.dist - b.dist);
      const escolhido = candidatos[0]?.d;
      if (!escolhido) {
        naoCouberam.push({ titulo: `${m.titulo} (sessão ${feitas + i + 1})`, motivo: "Semana sem espaço livre suficiente" });
        continue;
      }
      usados.set(escolhido, (usados.get(escolhido) ?? 0) + 1);
      por(escolhido, sessao);
    }
  }
  // 4. Sem dia: prioridades o quanto antes; o resto no dia mais folgado
  const livres = pendentes
    .filter((t) => !t.dia && !t.ateDia)
    .sort((a, b) => Number(b.prioridade) - Number(a.prioridade) || b.duracaoMin - a.duracaoMin);
  for (const t of livres) {
    if (t.inicio) {
      por(dias[0], t); // horário fixo sem dia → primeiro dia disponível
      continue;
    }
    const d = t.prioridade
      ? dias.find((x) => saldo[x] >= custo(t))
      : [...dias].sort((a, b) => saldo[b] - saldo[a] || a.localeCompare(b)).find((x) => saldo[x] >= custo(t));
    if (d) por(d, t);
    else naoCouberam.push({ titulo: t.titulo, motivo: "Semana sem espaço livre suficiente" });
  }

  // 5. Monta a agenda de cada dia
  const novasListas: Record<string, Tarefa[]> = {};
  const novosPlanos: Record<string, Plano> = {};
  for (const d of dias) {
    const tarefas = [...manuais[d], ...atribuidas[d]];
    novasListas[d] = tarefas;
    novosPlanos[d] = organizar({
      data: d,
      tarefas,
      config,
      feitos: planos[d]?.blocos.filter((b) => b.feito) ?? [],
      inicioMin: d === hoje ? agoraMin : 0,
    });
    for (const n of novosPlanos[d].naoCouberam) naoCouberam.push({ titulo: n.titulo, motivo: `${nomeCurto(d)}: ${n.motivo}` });
  }

  return { listas: novasListas, planos: novosPlanos, naoCouberam };
}
