import type { Config, Foco, Plano, Projeto, Semana, Tarefa, Travamento } from "./types";

const CHAVE_CONFIG = "rotina.config";
const CHAVE_PLANOS = "rotina.planos";
const CHAVE_RASCUNHO = "rotina.rascunho";
const CHAVE_LISTAS = "rotina.listas";

export const CONFIG_PADRAO: Config = {
  acordar: "07:00",
  dormir: "23:00",
  focoMaxMin: 50,
  pausaMin: 10,
  deslocamentoMin: 15,
  refeicoes: true,
  compromissosFixos: "",
  notificacoes: false,
  revisao: "domingo",
  limiteTravadoMin: 20,
  pomodoro: { ativo: true, focoMin: 25, pausaCurtaMin: 5, pausaLongaMin: 15, ciclos: 4 },
};

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

export const carregarConfig = (): Config => {
  const salvo = ler<Partial<Config>>(CHAVE_CONFIG, {});
  return { ...CONFIG_PADRAO, ...salvo, pomodoro: { ...CONFIG_PADRAO.pomodoro, ...salvo.pomodoro } };
};
export const salvarConfig = (c: Config) => gravar(CHAVE_CONFIG, c);

export const carregarPlanos = () => ler<Record<string, Plano>>(CHAVE_PLANOS, {});
export const salvarPlanos = (p: Record<string, Plano>) => gravar(CHAVE_PLANOS, p);

export const carregarRascunho = () => ler<string>(CHAVE_RASCUNHO, "");
export const salvarRascunho = (t: string) => gravar(CHAVE_RASCUNHO, t);

export const carregarListas = () => ler<Record<string, Tarefa[]>>(CHAVE_LISTAS, {});
export const salvarListas = (l: Record<string, Tarefa[]>) => gravar(CHAVE_LISTAS, l);

export const carregarSemanas = () => ler<Record<string, Semana>>("rotina.semanas", {});
export const salvarSemanas = (s: Record<string, Semana>) => gravar("rotina.semanas", s);

export const carregarAdiada = () => ler<string>("rotina.revisaoAdiada", "");
export const salvarAdiada = (d: string) => gravar("rotina.revisaoAdiada", d);

export const carregarProjetos = () => ler<Projeto[]>("rotina.projetos", []);
export const salvarProjetos = (p: Projeto[]) => gravar("rotina.projetos", p);

export const carregarTravamentos = () => ler<Travamento[]>("rotina.travamentos", []);
export const salvarTravamentos = (t: Travamento[]) => gravar("rotina.travamentos", t);

export const carregarFoco = () => ler<Foco | null>("rotina.foco", null);
export const salvarFoco = (f: Foco | null) => gravar("rotina.foco", f);

// ---------- Backup ----------

const PREFIXO = "rotina.";

/** Todos os dados do app num JSON para guardar fora do celular. */
export function exportarTudo(): string {
  const dados: Record<string, unknown> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(PREFIXO)) dados[k] = JSON.parse(localStorage.getItem(k) ?? "null");
    }
  } catch {
    /* sem acesso ao armazenamento */
  }
  return JSON.stringify({ app: "minha-rotina", versao: 1, exportadoEm: new Date().toISOString(), dados }, null, 2);
}

/** Substitui os dados atuais pelos do backup. Lança erro se o arquivo não for válido. */
export function importarTudo(json: string) {
  const b = JSON.parse(json) as { app?: string; dados?: Record<string, unknown> };
  if (b.app !== "minha-rotina" || !b.dados) throw new Error("Este arquivo não é um backup do Minha Rotina.");
  const chaves: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(PREFIXO)) chaves.push(k);
  }
  chaves.forEach((k) => localStorage.removeItem(k));
  for (const [k, v] of Object.entries(b.dados)) if (k.startsWith(PREFIXO)) localStorage.setItem(k, JSON.stringify(v));
}

/** Pede ao navegador para não apagar os dados quando faltar espaço. */
export async function pedirArmazenamentoPersistente(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    return (await navigator.storage.persisted()) || (await navigator.storage.persist());
  } catch {
    return false;
  }
}

/** Pomodoros concluídos por dia. */
export const carregarPomodoros = () => ler<Record<string, number>>("rotina.pomodoros", {});
export const salvarPomodoros = (p: Record<string, number>) => gravar("rotina.pomodoros", p);
