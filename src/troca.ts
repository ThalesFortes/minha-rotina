/**
 * Troca de dados entre aparelhos por arquivo (sem servidor).
 *
 * Cada "documento" (um dia da agenda, a lista de um dia, uma semana, as configurações,
 * os projetos…) ganha um carimbo com a hora da última alteração. Ao receber o arquivo
 * de outro aparelho, cada documento fica com a versão mais recente; pomodoros e
 * travamentos (dúvidas) se somam.
 */
import { useEffect, useRef } from "react";
import type { Config, Foco, Plano, Projeto, Semana, Tarefa, Travamento } from "./types";

const CHAVE_CARIMBOS = "rotina.carimbos";
export const CHAVE_ULTIMA_TROCA = "rotina.ultimaTroca";

export interface EstadoTrocado {
  planos: Record<string, Plano>;
  listas: Record<string, Tarefa[]>;
  semanas: Record<string, Semana>;
  config: Config;
  projetos: Projeto[];
  travamentos: Travamento[];
  pomodoros: Record<string, number>;
  foco: Foco | null;
}

function documentos(e: EstadoTrocado): Map<string, string> {
  const m = new Map<string, string>();
  for (const [id, v] of Object.entries(e.planos)) m.set(`planos/${id}`, JSON.stringify(v));
  for (const [id, v] of Object.entries(e.listas)) m.set(`listas/${id}`, JSON.stringify(v));
  for (const [id, v] of Object.entries(e.semanas)) m.set(`semanas/${id}`, JSON.stringify(v));
  m.set("config", JSON.stringify(e.config));
  m.set("projetos", JSON.stringify(e.projetos));
  m.set("foco", JSON.stringify(e.foco));
  return m;
}

const lerJson = <T,>(chave: string, padrao: T): T => {
  try {
    const v = localStorage.getItem(chave);
    return v ? (JSON.parse(v) as T) : padrao;
  } catch {
    return padrao;
  }
};
const gravarJson = (chave: string, v: unknown) => {
  try {
    localStorage.setItem(chave, JSON.stringify(v));
  } catch {
    /* sem armazenamento */
  }
};

/** Registra a hora em que cada documento mudou neste aparelho. */
export function useCarimbos({ planos, listas, semanas, config, projetos, foco }: EstadoTrocado) {
  const anterior = useRef<Map<string, string> | null>(null);
  useEffect(() => {
    const atual = documentos({ planos, listas, semanas, config, projetos, foco, travamentos: [], pomodoros: {} });
    const antes = anterior.current;
    anterior.current = atual;
    if (!antes) return; // primeira renderização: nada mudou ainda
    const carimbos = lerJson<Record<string, number>>(CHAVE_CARIMBOS, {});
    let mudou = false;
    const agora = Date.now();
    for (const [k, json] of atual) {
      if (antes.get(k) !== json) {
        carimbos[k] = agora;
        mudou = true;
      }
    }
    if (mudou) gravarJson(CHAVE_CARIMBOS, carimbos);
  }, [planos, listas, semanas, config, projetos, foco]);
}

export interface ResultadoTroca {
  novos: number;
  atualizados: number;
  mantidos: number;
}

/**
 * Junta os dados de um arquivo de outro aparelho com os deste, ficando com o mais recente.
 * Não apaga nada que só existe aqui.
 */
export function mesclarArquivo(texto: string): ResultadoTroca {
  const b = JSON.parse(texto) as { app?: string; dados?: Record<string, unknown> };
  if (b.app !== "minha-rotina" || !b.dados) throw new Error("Este arquivo não é do Minha Rotina.");
  const de = b.dados;
  const carimbosFora = (de[CHAVE_CARIMBOS] as Record<string, number> | undefined) ?? {};
  const carimbosAqui = lerJson<Record<string, number>>(CHAVE_CARIMBOS, {});
  const r: ResultadoTroca = { novos: 0, atualizados: 0, mantidos: 0 };

  // Carimbo de um documento; para agendas antigas sem carimbo, usa quando foi gerada
  const carimbo = (c: Record<string, number>, k: string, v: unknown) =>
    c[k] ?? (v && typeof v === "object" && "criadoEm" in v ? Date.parse(String((v as Plano).criadoEm)) || 0 : 0);

  // Coleções por dia/semana
  for (const [nome, prefixo] of [
    ["rotina.planos", "planos"],
    ["rotina.listas", "listas"],
    ["rotina.semanas", "semanas"],
  ] as const) {
    const aqui = lerJson<Record<string, unknown>>(nome, {});
    const fora = (de[nome] as Record<string, unknown> | undefined) ?? {};
    for (const [id, v] of Object.entries(fora)) {
      const k = `${prefixo}/${id}`;
      if (!(id in aqui)) {
        aqui[id] = v;
        carimbosAqui[k] = carimbo(carimbosFora, k, v);
        r.novos++;
      } else if (JSON.stringify(aqui[id]) === JSON.stringify(v)) {
        continue;
      } else if (carimbo(carimbosFora, k, v) > carimbo(carimbosAqui, k, aqui[id])) {
        aqui[id] = v;
        carimbosAqui[k] = carimbosFora[k];
        r.atualizados++;
      } else r.mantidos++;
    }
    gravarJson(nome, aqui);
  }

  // Documentos únicos: o mais recente vence
  for (const [nome, k] of [
    ["rotina.config", "config"],
    ["rotina.projetos", "projetos"],
    ["rotina.foco", "foco"],
  ] as const) {
    if (!(nome in de)) continue;
    const aqui = lerJson<unknown>(nome, null);
    if (JSON.stringify(aqui) === JSON.stringify(de[nome])) continue;
    if ((carimbosFora[k] ?? 0) > (carimbosAqui[k] ?? 0) || aqui === null) {
      gravarJson(nome, de[nome]);
      carimbosAqui[k] = carimbosFora[k] ?? 0;
      r.atualizados++;
    } else r.mantidos++;
  }

  // Pomodoros: maior contagem de cada dia (cada aparelho conta os seus)
  const pomAqui = lerJson<Record<string, number>>("rotina.pomodoros", {});
  for (const [d, n] of Object.entries((de["rotina.pomodoros"] as Record<string, number>) ?? {})) {
    if (n > (pomAqui[d] ?? 0)) pomAqui[d] = n;
  }
  gravarJson("rotina.pomodoros", pomAqui);

  // Dúvidas/travamentos: união; se um aparelho marcou como resolvida, fica resolvida
  const travAqui = lerJson<Travamento[]>("rotina.travamentos", []);
  const porId = new Map(travAqui.map((t) => [t.id, t]));
  for (const t of (de["rotina.travamentos"] as Travamento[]) ?? []) {
    const atual = porId.get(t.id);
    if (!atual) {
      porId.set(t.id, t);
      r.novos++;
    } else if (t.resolvido && !atual.resolvido) porId.set(t.id, { ...atual, resolvido: true });
  }
  gravarJson("rotina.travamentos", [...porId.values()]);

  gravarJson(CHAVE_CARIMBOS, carimbosAqui);
  gravarJson(CHAVE_ULTIMA_TROCA, new Date().toISOString());
  return r;
}

/** Compartilha o arquivo (WhatsApp, Drive, e-mail…) ou baixa, se o aparelho não suportar. */
export async function compartilharArquivo(nome: string, conteudo: string): Promise<"compartilhado" | "baixado" | "cancelado"> {
  const tentativas = [
    new File([conteudo], `${nome}.json`, { type: "application/json" }),
    new File([conteudo], `${nome}.txt`, { type: "text/plain" }), // alguns Androids só compartilham .txt
  ];
  for (const arquivo of tentativas) {
    if (!navigator.canShare?.({ files: [arquivo] })) continue;
    try {
      await navigator.share({ files: [arquivo], title: "Dados do Minha Rotina" });
      gravarJson(CHAVE_ULTIMA_TROCA, new Date().toISOString());
      return "compartilhado";
    } catch (e) {
      if ((e as Error).name === "AbortError") return "cancelado";
    }
  }
  const url = URL.createObjectURL(new Blob([conteudo], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nome}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  gravarJson(CHAVE_ULTIMA_TROCA, new Date().toISOString());
  return "baixado";
}

export const ultimaTroca = () => lerJson<string>(CHAVE_ULTIMA_TROCA, "");
