import type { Tarefa } from "./types";

/**
 * Interpretador local de português: transforma frases soltas (digitadas ou ditadas)
 * em itens com título, duração, horário fixo e prioridade. Sem IA, sem internet.
 */

// Remove acentos preservando o tamanho da string (índices batem com o original).
export const normalizar = (s: string) =>
  [...s].map((c) => c.normalize("NFD")[0]).join("").toLowerCase();

export const hhmm = (min: number) => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};
export const paraMin = (h: string) => {
  const [a, b] = h.split(":").map(Number);
  return a * 60 + (b || 0);
};

const HORA = String.raw`(\d{1,2})(?:(?:h|:)(\d{2}))?\s*(h|hs|hrs?|horas?)?`;
const PERIODO = String.raw`(?:\s*(?:da|de)\s*(manha|tarde|noite))?`;

function montarHora(h: string, m: string | undefined, periodo: string | undefined, explicita: boolean): number | null {
  let hora = Number(h);
  const min = m ? Number(m) : 0;
  if (hora > 24 || min > 59) return null;
  if ((periodo === "tarde" || periodo === "noite") && hora < 12) hora += 12;
  else if (!periodo && !explicita && hora >= 1 && hora <= 6) hora += 12; // "das 2 às 4" → tarde
  return hora * 60 + min;
}

const NUMEROS: Record<string, number> = { uma: 1, um: 1, duas: 2, dois: 2, tres: 3, quatro: 4, cinco: 5, seis: 6 };

// Estimativas quando o usuário não diz quanto tempo leva.
const ESTIMATIVAS: [RegExp, number, { fora?: boolean; prioridade?: boolean }?][] = [
  [/\b(prova|tcc|entrega|prazo)\b/, 90, { prioridade: true }],
  [/\b(estud|revis|ler |leitura|trabalho da faculdade|exercicio)/, 60],
  [/\b(supermercado|mercado|feira|compras)\b/, 60, { fora: true }],
  [/\b(farmacia|padaria|correio|banco|loteria|cartorio|lotérica|acougue)\b/, 30, { fora: true }],
  [/\b(medico|dentista|consulta|exame|psicolog|fisioterap)/, 60, { fora: true }],
  [/\b(academia)\b/, 60, { fora: true }],
  [/\b(treino|treinar|correr|corrida|caminhada|caminhar|exercicios?)\b/, 45],
  [/\b(e-?mails?|mensagens|whatsapp|responder)\b/, 30],
  [/\b(ligar|ligacao|telefonar)\b/, 15],
  [/\b(pagar|boleto|conta de|fatura)\b/, 15],
  [/\b(faxina|limpar|limpeza|arrumar|organizar)\b/, 45],
  [/\b(lavar|louca|roupa|passar roupa)\b/, 30],
  [/\b(cozinhar|marmita|fazer comida)\b/, 45],
  [/\b(reuniao|aula|curso|almoco|jantar)\b/, 60],
  [/\b(levar|buscar)\b/, 30, { fora: true }],
];

const PRIORIDADE = /\b(urgente|importante|sem falta|prioridade|nao posso esquecer|vence|ate hoje)\b/;

function limparTitulo(t: string): string {
  let s = t.replace(/\s+/g, " ").trim();
  const inicio =
    /^(?:e|eu|tamb[eé]m|depois|a[ií]|ent[aã]o|hoje|amanh[aã]|ainda|que|tenho que|tenho de|tenho|preciso de|preciso|vou ter que|vou|devo|quero|tem que|precisa|uma|um|de|pra|para)\s+/i;
  const fim =
    /\s+(?:por|durante|umas?|uns|cerca de|mais ou menos|de|das|da|[aà]s|a|hoje|amanh[aã]|at[eé]|e|tamb[eé]m|pra|para|no|na)$/i;
  for (let i = 0; i < 6; i++) s = s.replace(inicio, "").replace(fim, "").trim();
  s = s
    .replace(/\b(urgente|importante|sem falta|prioridade)\b/gi, "")
    .replace(/\s+/g, " ")
    .replace(/^[\s,.\-–:]+|[\s,.\-–:]+$/g, "");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

let contador = 0;
export const novoId = () => `${Date.now().toString(36)}-${(contador++).toString(36)}`;

/** Interpreta um trecho como um único item. Retorna null se não sobrar título. */
export function interpretarItem(texto: string): Tarefa | null {
  const n = normalizar(texto);
  const cortes: [number, number][] = [];
  const cortar = (m: RegExpExecArray) => cortes.push([m.index, m.index + m[0].length]);
  const livre = (i: number) => !cortes.some(([a, b]) => i >= a && i < b);

  let inicio: number | undefined;
  let fim: number | undefined;
  let depoisDe: number | undefined;
  let antesDe: number | undefined;
  let duracao: number | undefined;

  // Intervalo: "das 19h às 22h", "8h-12h", "de 14:00 até 15:30"
  const reIntervalo = new RegExp(
    String.raw`(\b(?:das?|de|entre)\s+)?\b${HORA}${PERIODO}(\s*(?:-|–|ate)\s*|\s+(?:as|a|e)\s+)${HORA}${PERIODO}`,
    "g",
  );
  for (let m; (m = reIntervalo.exec(n)); ) {
    const [, prefixo, h1, m1, u1, p1, sep, h2, m2, u2, p2] = m;
    const marcado = !!(m1 || (u1 && u1.startsWith("h") && u1.length <= 3));
    const traco = /-|–|ate/.test(sep);
    if (!prefixo && !marcado && !traco) continue;
    if (sep.trim() === "e" && !/entre/.test(prefixo ?? "")) continue;
    if (!m1 && u2 && /hora/.test(u2) && !(u1 && u1.length <= 3)) continue; // "de 2 a 3 horas" é duração
    const ini = montarHora(h1, m1, p1 ?? p2, !!m1 || Number(h1) > 6);
    const fi = montarHora(h2, m2, p2, !!m2 || Number(h2) > 6);
    if (ini == null || fi == null) continue;
    inicio = ini;
    fim = fi <= ini && fi + 720 > ini ? fi + 720 : fi;
    cortar(m);
    break;
  }

  // Restrições: "depois das 18h", "antes das 10h", "até as 17h"
  const reRestricao = new RegExp(String.raw`\b(depois d[ao]s?|apos as|a partir d[ao]s?|antes d[ao]s?|ate as)\s+${HORA}${PERIODO}`, "g");
  for (let m; (m = reRestricao.exec(n)); ) {
    if (!livre(m.index)) continue;
    const v = montarHora(m[2], m[3], m[5], !!m[3] || Number(m[2]) > 6);
    if (v == null) continue;
    if (/antes|ate/.test(m[1])) antesDe = v;
    else depoisDe = v;
    cortar(m);
  }

  // Horário único: "às 15h", "ao meio-dia", "19:30"
  if (inicio === undefined) {
    const reMeioDia = /\b(?:ao |as )?meio[ -]dia\b/;
    const mm = reMeioDia.exec(n);
    if (mm && livre(mm.index)) {
      inicio = 720;
      cortar(mm);
    } else {
      const reAs = new RegExp(String.raw`\bas\s+${HORA}${PERIODO}`, "g");
      for (let m; (m = reAs.exec(n)); ) {
        if (!livre(m.index)) continue;
        const v = montarHora(m[1], m[2], m[4], !!m[2] || Number(m[1]) > 6);
        if (v != null) {
          inicio = v;
          cortar(m);
          break;
        }
      }
    }
    if (inicio === undefined) {
      const reBare = /\b(\d{1,2})(?::(\d{2})|h(\d{2})?)(?!\s*(?:min|hora))\b/g;
      for (let m; (m = reBare.exec(n)); ) {
        const h = Number(m[1]);
        if (!livre(m.index) || (!m[2] && h <= 6)) continue; // "2h" sozinho é duração
        const v = montarHora(m[1], m[2] ?? m[3], undefined, true);
        if (v != null) {
          inicio = v;
          cortar(m);
          break;
        }
      }
    }
  }

  // Duração
  const somar = (re: RegExp, f: (m: RegExpExecArray) => number) => {
    for (let m; (m = re.exec(n)); ) {
      if (!livre(m.index)) continue;
      duracao = (duracao ?? 0) + f(m);
      cortar(m);
    }
  };
  somar(/\b(\d{1,2})\s*h\s*(\d{1,2})\b(?!\s*min)/g, (m) => Number(m[1]) * 60 + Number(m[2]));
  somar(
    /\b(\d+(?:[.,]\d+)?)\s*(?:h|hs|hrs?|horas?)\b(?:\s*e\s*(meia|\d+\s*min(?:utos?)?))?/g,
    (m) => parseFloat(m[1].replace(",", ".")) * 60 + (m[2] ? (m[2] === "meia" ? 30 : parseInt(m[2])) : 0),
  );
  somar(/\b(uma|um|duas|dois|tres|quatro|cinco|seis)\s+horas?(\s+e\s+meia)?\b/g, (m) => NUMEROS[m[1]] * 60 + (m[2] ? 30 : 0));
  somar(/\bhora e meia\b/g, () => 90);
  somar(/\bmeia hora\b/g, () => 30);
  somar(/\b(\d+)\s*(?:min|mins|minutos?)\b/g, (m) => Number(m[1]));

  // Título = original sem os trechos de horário/duração
  let restante = "";
  for (let i = 0; i < texto.length; i++) restante += livre(i) ? texto[i] : " ";
  const titulo = limparTitulo(restante);
  if (!titulo) return null;

  const nt = normalizar(titulo);
  let fora = false;
  let prioridade = PRIORIDADE.test(n);
  let estimativa = 30;
  for (const [re, min, extra] of ESTIMATIVAS) {
    if (re.test(nt)) {
      estimativa = min;
      fora = !!extra?.fora;
      prioridade ||= !!extra?.prioridade;
      break;
    }
  }

  if (inicio !== undefined && fim === undefined) fim = inicio + (duracao ?? estimativa);
  const duracaoMin = inicio !== undefined && fim !== undefined ? fim - inicio : (duracao ?? estimativa);

  return {
    id: novoId(),
    titulo,
    duracaoMin: Math.max(5, Math.round(duracaoMin)),
    prioridade,
    fora: inicio === undefined && fora,
    inicio: inicio !== undefined ? hhmm(inicio) : undefined,
    fim: fim !== undefined ? hhmm(fim) : undefined,
    depoisDe: depoisDe !== undefined ? hhmm(depoisDe) : undefined,
    antesDe: antesDe !== undefined ? hhmm(antesDe) : undefined,
  };
}

const VERBOS =
  "preciso|tenho|vou|devo|quero|ir|fazer|estudar|ligar|pagar|comprar|lavar|limpar|arrumar|responder|mandar|enviar|ler|escrever|terminar|buscar|levar|passar|treinar|correr|cozinhar|marcar|resolver|organizar|revisar|trabalhar|academia|reuniao|reunião|aula";

/** Divide um texto livre em itens. */
export function dividir(texto: string): string[] {
  return texto
    .split(
      new RegExp(
        String.raw`\n|;|[.,](?!\d)|(?<!\d)[.,]|\s+(?:e depois|depois disso|depois(?!\s+d[aoe]s?\b)|e também|também|além disso|aí|ai)\s+|\s+e\s+(?=(?:eu\s+|também\s+)?(?:${VERBOS})\b)`,
        "i",
      ),
    )
    .map((p) => p?.trim())
    .filter((p): p is string => !!p && p.length > 1);
}

export function interpretarTexto(texto: string): Tarefa[] {
  return dividir(texto)
    .map(interpretarItem)
    .filter((t): t is Tarefa => t !== null);
}

const DIAS: Record<string, number> = { dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6 };

/** Compromissos fixos da semana (Ajustes) que valem para o dia da semana informado. */
export function fixosDoDia(texto: string, diaSemana: number): Tarefa[] {
  const out: Tarefa[] = [];
  for (const linha of texto.split("\n")) {
    if (!linha.trim()) continue;
    const n = normalizar(linha);
    let dias: Set<number> | null = null;
    let corpo = linha;

    const reDias =
      /^\s*((?:todos? (?:os )?dias?|diariamente|dias? (?:uteis|de semana)|fins? de semana|fds|(?:dom|seg|ter|qua|qui|sex|sab)[a-z-]*(?:\s*(?:,|e|a|ate|-|–)\s*(?:dom|seg|ter|qua|qui|sex|sab)[a-z-]*)*))\s*[:\-–]?\s*/;
    const m = reDias.exec(n);
    if (m) {
      const d = m[1];
      corpo = linha.slice(m[0].length);
      if (/todo|diariamente/.test(d)) dias = new Set([0, 1, 2, 3, 4, 5, 6]);
      else if (/uteis|de semana/.test(d)) dias = new Set([1, 2, 3, 4, 5]);
      else if (/fim|fins|fds/.test(d)) dias = new Set([0, 6]);
      else {
        dias = new Set();
        const tokens = d.split(/\s*(,|\be\b|\ba\b|\bate\b|-|–)\s*/).filter((x) => x.trim());
        for (let i = 0; i < tokens.length; i++) {
          const v = DIAS[tokens[i].slice(0, 3)];
          if (v === undefined) continue;
          const prox = tokens[i + 2] ? DIAS[tokens[i + 2].slice(0, 3)] : undefined;
          if (/^(a|ate|-|–)$/.test(tokens[i + 1] ?? "") && prox !== undefined) {
            for (let k = v; k !== (prox + 1) % 7; k = (k + 1) % 7) dias.add(k);
            i += 2;
          } else dias.add(v);
        }
      }
    }
    if (dias && !dias.has(diaSemana)) continue;
    const t = interpretarItem(corpo);
    if (t?.inicio) out.push({ ...t, id: `fixo-${normalizar(t.titulo)}-${t.inicio}` });
  }
  return out;
}
