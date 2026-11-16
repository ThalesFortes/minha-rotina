import { interpretarItem, normalizar, novoId } from "./interpretador";
import { deIso, isoDe, segundaDe, somarDias } from "./semana";
import type { Etapa, Meta, Plano, Projeto } from "./types";

const MESES = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const ultimoDiaDoMes = (ano: number, mes: number) => isoDe(new Date(ano, mes + 1, 0));

interface Analise {
  titulo: string;
  horas?: number;
  horasAntes: number;
  prazo?: string;
  sessaoMin: number;
  depoisDe?: string;
  antesDe?: string;
}

/** "pós-graduação de 360 horas, já fiz 40h, tenho até junho" → Projeto */
export function interpretarProjeto(texto: string, hoje: string): Projeto | null {
  const a = analisar(texto, hoje);
  if (!a.horas) return null;
  const h = deIso(hoje);
  return {
    id: novoId(),
    titulo: a.titulo,
    horasTotais: a.horas,
    horasAntes: a.horasAntes,
    prazo: a.prazo ?? ultimoDiaDoMes(h.getFullYear(), h.getMonth() + 3), // sem prazo → 3 meses
    sessaoMin: a.sessaoMin,
    depoisDe: a.depoisDe,
    antesDe: a.antesDe,
    etapas: [],
  };
}

/** "desenvolver o software de gestão 80h até março" → Etapa (sem horas → estimativa de 10h). */
export function interpretarEtapa(texto: string, hoje: string): Etapa | null {
  const a = analisar(texto, hoje);
  if (!a.titulo || a.titulo === "Projeto") return null;
  return { id: novoId(), titulo: a.titulo, horas: a.horas ?? 10, prazo: a.prazo, concluida: false };
}

function analisar(texto: string, hoje: string): Analise {
  let resto = texto;
  const n = normalizar(texto);
  const apagar = (m: RegExpExecArray | null) => {
    if (m) resto = resto.slice(0, m.index) + " ".repeat(m[0].length) + resto.slice(m.index + m[0].length);
    return m;
  };
  const h = deIso(hoje);

  // Horas já feitas: "já fiz 40h", "já tenho 40 horas", "completei 40h"
  let horasAntes = 0;
  const feitas = apagar(/\b(?:ja\s+)?(?:fiz|tenho feito|completei|cumpri|concluí|conclui|fez)\s+(\d+(?:[.,]\d+)?)\s*(?:h|hs|horas?)\b/.exec(n));
  if (feitas) horasAntes = parseFloat(feitas[1].replace(",", "."));

  // Prazo
  let prazo: string | undefined;
  let m: RegExpExecArray | null;
  if ((m = apagar(/\b(?:ate|prazo(?: ate| de| e)?|termina(?:r)? em|entregar em)?\s*(?:o dia |dia )?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/.exec(n)))) {
    const ano = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : h.getFullYear();
    let d = new Date(ano, Number(m[2]) - 1, Number(m[1]));
    if (!m[3] && isoDe(d) < hoje) d = new Date(ano + 1, Number(m[2]) - 1, Number(m[1]));
    prazo = isoDe(d);
  } else if ((m = apagar(new RegExp(String.raw`\b(?:ate|em|prazo(?: ate| de| e)?|termina(?:r)? em)?\s*(?:o (?:fim|final) de |final de |fim de )?(${MESES.join("|")})(?:\s*(?:de|\/)\s*(\d{4}))?`).exec(n)))) {
    const mes = MESES.indexOf(m[1]);
    let ano = m[2] ? Number(m[2]) : h.getFullYear();
    if (!m[2] && mes < h.getMonth()) ano++;
    prazo = ultimoDiaDoMes(ano, mes);
  } else if ((m = apagar(/\b(?:ate o |ate |no )?(?:fim|final) do ano\b/.exec(n)))) {
    prazo = `${h.getFullYear()}-12-31`;
  } else if ((m = apagar(/\b(?:em|daqui a|daqui|nos proximos|ate)\s+(\d+|um|uma|dois|duas|tres|seis|doze)\s+(meses|mes|semanas?)\b/.exec(n)))) {
    const num = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, seis: 6, doze: 12 }[m[1]] ?? Number(m[1]);
    if (m[2].startsWith("sem")) prazo = somarDias(hoje, num * 7);
    else prazo = isoDe(new Date(h.getFullYear(), h.getMonth() + num, h.getDate()));
  }

  // Total de horas: "360 horas", "360h de desenvolvimento"
  const total = apagar(/\b(\d+(?:[.,]\d+)?)\s*(?:h|hs|horas?)\b(?:\s+(?:de|no) total)?/.exec(normalizar(resto)));
  const horas = total ? parseFloat(total[1].replace(",", ".")) : undefined;

  // Sessão: "sessões de 90 min", "blocos de 2h"
  let sessaoMin = 60;
  const sessao = apagar(/\b(?:sessoes|sessao|blocos?)\s+de\s+(\d+)\s*(min|minutos|h|horas?)\b/.exec(normalizar(resto)));
  if (sessao) sessaoMin = Number(sessao[1]) * (sessao[2].startsWith("h") ? 60 : 1);

  resto = resto.replace(/\b(tenho|eu|preciso|faltam?|de|da|do|com|que)\b\s*$/i, "");
  const item = interpretarItem(resto.replace(/\b(de|com)\s*$/i, ""));
  const titulo = (item?.titulo || "Projeto").replace(/\s+(?:de|com|e|que)$/i, "");

  return { titulo, horas, horasAntes, prazo, sessaoMin, depoisDe: item?.depoisDe, antesDe: item?.antesDe };
}

const duracao = (ini: string, fim: string) => {
  const [a, b] = ini.split(":").map(Number);
  const [c, d] = fim.split(":").map(Number);
  return (c * 60 + d - (a * 60 + b) + 1440) % 1440;
};

/** Minutos concluídos do projeto (ou de uma etapa dele) no app, opcionalmente só antes de uma data. */
export function minutosFeitos(id: string, planos: Record<string, Plano>, antesDe?: string, etapaId?: string) {
  let total = 0;
  for (const [data, p] of Object.entries(planos)) {
    if (antesDe && data >= antesDe) continue;
    const ids = new Set(p.tarefas.filter((t) => t.metaId === id && (!etapaId || t.etapaId === etapaId)).map((t) => t.id));
    for (const b of p.blocos) if (b.feito && b.tarefaId && ids.has(b.tarefaId)) total += duracao(b.inicio, b.fim);
  }
  return total;
}

export interface SituacaoEtapa {
  etapa: Etapa;
  feitoMin: number;
  restanteMin: number; // pelo que falta da estimativa
  estourou: boolean; // passou da estimativa e não foi concluída
}

/** Quanto falta de cada etapa. Etapa que passou da estimativa ganha +25% (mín. 1h) e é sinalizada. */
export function situacaoEtapas(p: Projeto, planos: Record<string, Plano>, antesDe?: string): SituacaoEtapa[] {
  return (p.etapas ?? []).map((e) => {
    const feitoMin = minutosFeitos(p.id, planos, antesDe, e.id);
    const estimativa = e.horas * 60;
    const estourou = !e.concluida && feitoMin >= estimativa;
    const restanteMin = e.concluida ? 0 : estourou ? Math.max(60, Math.round(estimativa * 0.25)) : estimativa - feitoMin;
    return { etapa: e, feitoMin, restanteMin, estourou };
  });
}

const semanasEntre = (segunda: string, prazo: string) =>
  prazo < segunda ? 1 : Math.round((deIso(segundaDe(prazo)).getTime() - deIso(segunda).getTime()) / (7 * 86400000)) + 1;

export interface Ritmo {
  feitoMin: number;
  restanteMin: number;
  semanas: number; // semanas restantes, contando a semana planejada
  horasSemana: number; // meta desta semana
  fracao: number;
  prazoPassou: boolean;
  concluido: boolean;
  pesado: boolean; // ritmo acima de 20h/semana
  etapasExcedem: boolean; // etapas somam mais horas do que a carga do projeto
  motivo?: string; // o que está puxando o ritmo para cima
}

/** Ritmo necessário a partir da semana que começa em `segunda`. */
export function ritmoProjeto(p: Projeto, planos: Record<string, Plano>, segunda: string): Ritmo {
  const totalMin = p.horasTotais * 60;
  const feitoMin = p.horasAntes * 60 + minutosFeitos(p.id, planos);
  const feitoAntesDaSemana = p.horasAntes * 60 + minutosFeitos(p.id, planos, segunda);
  const prazoPassou = p.prazo < segunda;
  const semanas = semanasEntre(segunda, p.prazo);

  // O que falta: o maior entre a carga do projeto e a soma do que falta nas etapas
  const etapas = situacaoEtapas(p, planos, segunda);
  const restanteEtapas = etapas.reduce((s, e) => s + e.restanteMin, 0);
  const restanteCarga = Math.max(0, totalMin - feitoAntesDaSemana);
  const etapasExcedem = restanteEtapas > restanteCarga;
  let necessario = Math.max(restanteCarga, restanteEtapas) / semanas;
  let motivo: string | undefined = etapasExcedem ? "as etapas somam mais horas do que a carga do curso" : undefined;

  // Etapas com prazo próprio: precisa dar conta delas (e das anteriores) até a data
  let acumulado = 0;
  for (const e of etapas) {
    acumulado += e.restanteMin;
    if (!e.etapa.prazo || e.restanteMin === 0) continue;
    const porSemana = acumulado / semanasEntre(segunda, e.etapa.prazo);
    if (porSemana > necessario) {
      necessario = porSemana;
      motivo = `prazo da etapa “${e.etapa.titulo}”`;
    }
  }
  const minSemana = Math.ceil(necessario / 30) * 30; // arredonda para meia hora
  return {
    feitoMin,
    restanteMin: Math.max(0, totalMin - feitoMin),
    semanas,
    horasSemana: minSemana / 60,
    fracao: totalMin ? Math.min(1, feitoMin / totalMin) : 1,
    prazoPassou,
    concluido: feitoMin >= totalMin,
    pesado: minSemana > 20 * 60,
    etapasExcedem,
    motivo,
  };
}

/**
 * Converte o projeto nas metas desta semana. Com etapas, as horas da semana vão
 * para as etapas em ordem (termina uma, começa a próxima), cada sessão sabendo sua etapa.
 */
export function metasDaSemana(p: Projeto, r: Ritmo, planos: Record<string, Plano>, segunda: string): Meta[] {
  if (r.horasSemana <= 0 || (r.concluido && !(p.etapas ?? []).some((e) => !e.concluida))) return [];
  const base = { tipo: "horas" as const, sessaoMin: p.sessaoMin, fora: false, depoisDe: p.depoisDe, antesDe: p.antesDe };
  let saldo = r.horasSemana * 60;
  const metas: Meta[] = [];
  for (const e of situacaoEtapas(p, planos, segunda)) {
    if (saldo <= 0) break;
    if (e.restanteMin <= 0) continue;
    const min = Math.min(saldo, Math.ceil(e.restanteMin / 30) * 30);
    metas.push({ ...base, id: p.id, etapaId: e.etapa.id, titulo: `${p.titulo}: ${e.etapa.titulo}`, alvo: min / 60 });
    saldo -= min;
  }
  if (saldo > 0) metas.push({ ...base, id: p.id, titulo: p.titulo, alvo: saldo / 60 });
  return metas;
}

export const formatarHoras = (min: number) => {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
};
