import { dividir, novoId } from "./interpretador";
import type { Passo } from "./types";

const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "criar o repositório, modelar a tabela de usuários e depois fazer a tela de login" → passos */
export function textoParaPassos(texto: string): Passo[] {
  return dividir(texto)
    .map((t) => t.replace(/^(?:e|depois|primeiro|então|entao|aí|ai)\s+/i, "").trim())
    .filter(Boolean)
    .map((t) => ({ id: novoId(), texto: capitalizar(t), feito: false }));
}

export const resumoPassos = (p?: Passo[]) => (p?.length ? `🧩 ${p.filter((x) => x.feito).length}/${p.length}` : "");
