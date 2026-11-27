import type { Teste } from "./dados";

/** Tipos de treino que entram no histórico. */
export type TipoTreino = "a" | "b" | "corrida" | "coluna";

export interface RegistroTreino {
  d: string; // "YYYY-MM-DD"
  t: TipoTreino;
  feitas?: number; // séries feitas (força)
  total?: number; // séries planejadas (força)
  completos?: number[]; // índices dos exercícios com todas as séries feitas
  semana?: number; // semana do plano de corrida
  em: string; // ISO da gravação (usado para mesclar entre aparelhos)
}

export interface DiaChecklist {
  marcados: Record<string, boolean>;
  agua: number;
  cafe: number;
  em?: string;
}

export interface EstadoTreino {
  inicio: string; // primeiro dia de uso → define a semana do programa
  visto: boolean; // já viu o "Comece aqui"
  teste: Teste & { data?: string };
  semanaCorrida: number;
  log: RegistroTreino[];
  series: Record<string, Record<string, boolean>>; // por dia: "a0-1" → feita
  checklist: Record<string, DiaChecklist>;
}

export const CHAVES = {
  inicio: "rotina.treino.inicio",
  visto: "rotina.treino.visto",
  teste: "rotina.treino.teste",
  semanaCorrida: "rotina.treino.semanaCorrida",
  log: "rotina.treino.log",
  series: "rotina.treino.series",
  checklist: "rotina.treino.checklist",
} as const;

function ler<T>(chave: string, padrao: T): T {
  try {
    const bruto = localStorage.getItem(chave);
    return bruto ? (JSON.parse(bruto) as T) : padrao;
  } catch {
    return padrao;
  }
}

function gravar(chave: string, valor: unknown) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    /* armazenamento indisponível — segue sem persistir */
  }
}

const pad = (n: number) => String(n).padStart(2, "0");
export const isoLocal = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const paraData = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const segundaDe = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
};
export const diasEntre = (a: string, b: string) => Math.round((paraData(b).getTime() - paraData(a).getTime()) / 86400000);
export const ddmm = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}`;

export function carregarTreino(hoje: string): EstadoTreino {
  return {
    inicio: ler(CHAVES.inicio, hoje),
    visto: ler(CHAVES.visto, false),
    teste: ler(CHAVES.teste, { flex: "", barra: "", abd: "", dist: "" }),
    semanaCorrida: ler(CHAVES.semanaCorrida, 1),
    log: ler<RegistroTreino[]>(CHAVES.log, []),
    series: ler(CHAVES.series, {}),
    checklist: ler(CHAVES.checklist, {}),
  };
}

export function salvarTreino(e: EstadoTreino) {
  gravar(CHAVES.inicio, e.inicio);
  gravar(CHAVES.visto, e.visto);
  gravar(CHAVES.teste, e.teste);
  gravar(CHAVES.semanaCorrida, e.semanaCorrida);
  gravar(CHAVES.log, e.log);
  // guarda só os últimos 14 dias de séries marcadas
  const corte = isoLocal(new Date(Date.now() - 14 * 86400000));
  gravar(CHAVES.series, Object.fromEntries(Object.entries(e.series).filter(([d]) => d >= corte)));
  gravar(CHAVES.checklist, e.checklist);
}

/** Semana do programa (0, 1, 2…) contada a partir da segunda-feira do primeiro uso. */
export function semanaDoPrograma(inicio: string, hoje: string) {
  return Math.max(0, Math.round((segundaDe(paraData(hoje)).getTime() - segundaDe(paraData(inicio)).getTime()) / (7 * 86400000)));
}

export type AbaDia = "a" | "b" | "corrida" | "coluna";

/** Treino de cada dia da semana (0 = domingo). A e B se alternam a cada semana. */
export function planoDaSemana(indice: number): Record<number, AbaDia> {
  const impar = indice % 2 === 1;
  return { 1: impar ? "b" : "a", 2: "corrida", 3: impar ? "a" : "b", 4: "corrida", 5: impar ? "b" : "a", 6: "corrida", 0: "coluna" };
}

/** Um registro por dia e tipo; o mais recente vence. */
export function adicionarRegistro(log: RegistroTreino[], r: RegistroTreino) {
  return [...log.filter((x) => !(x.d === r.d && x.t === r.t)), r].sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0));
}

/** O exercício foi completado nos 2 últimos treinos desse tipo → hora de evoluir. */
export function prontoParaEvoluir(log: RegistroTreino[], tipo: "a" | "b", indice: number) {
  const ultimos = log.filter((r) => r.t === tipo).slice(-2);
  return ultimos.length === 2 && ultimos.every((r) => r.completos?.includes(indice));
}

/**
 * Junta os dados de treino de outro aparelho (Ajustes → Receber dados).
 * Histórico: união por dia+tipo (o registro mais recente vence). Checklist: o dia mais
 * recente vence. Teste: o mais novo. Semana da corrida: a maior. Início: o mais antigo.
 * Retorna quantos registros novos entraram.
 */
export function mesclarTreino(de: Record<string, unknown>): number {
  let novos = 0;

  const logAqui = ler<RegistroTreino[]>(CHAVES.log, []);
  const porChave = new Map(logAqui.map((r) => [`${r.d}|${r.t}`, r]));
  for (const r of (de[CHAVES.log] as RegistroTreino[] | undefined) ?? []) {
    const k = `${r.d}|${r.t}`;
    const atual = porChave.get(k);
    if (!atual) {
      porChave.set(k, r);
      novos++;
    } else if ((r.em ?? "") > (atual.em ?? "")) porChave.set(k, r);
  }
  gravar(CHAVES.log, [...porChave.values()].sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0)));

  const chkAqui = ler<Record<string, DiaChecklist>>(CHAVES.checklist, {});
  for (const [d, v] of Object.entries((de[CHAVES.checklist] as Record<string, DiaChecklist> | undefined) ?? {})) {
    if (!chkAqui[d] || (v.em ?? "") > (chkAqui[d].em ?? "")) chkAqui[d] = v;
  }
  gravar(CHAVES.checklist, chkAqui);

  const testeFora = de[CHAVES.teste] as (Teste & { data?: string }) | undefined;
  const testeAqui = ler<(Teste & { data?: string }) | null>(CHAVES.teste, null);
  if (testeFora && (!testeAqui || (testeFora.data ?? "") > (testeAqui.data ?? ""))) gravar(CHAVES.teste, testeFora);

  const semFora = de[CHAVES.semanaCorrida];
  if (typeof semFora === "number" && semFora > ler(CHAVES.semanaCorrida, 1)) gravar(CHAVES.semanaCorrida, semFora);

  const iniFora = de[CHAVES.inicio];
  const iniAqui = ler<string | null>(CHAVES.inicio, null);
  if (typeof iniFora === "string" && (!iniAqui || iniFora < iniAqui)) gravar(CHAVES.inicio, iniFora);

  if (de[CHAVES.visto] === true) gravar(CHAVES.visto, true);
  return novos;
}
