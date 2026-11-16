import { useState } from "react";
import { textoParaPassos } from "./passosUtil";
import { passosDaResposta, perguntaQuebrar, quebrarAutomatico } from "./quebrador";
import type { Passo } from "./types";
import { useDitado } from "./useDitado";

interface Props {
  passos: Passo[];
  onChange: (p: Passo[]) => void;
  /** Modo Foco: destaca só o próximo passo. */
  foco?: boolean;
  /** Título da tarefa/etapa, para a quebra automática. */
  titulo: string;
  contexto?: string;
}

export function Passos({ passos, onChange, foco, titulo, contexto }: Props) {
  const [texto, setTexto] = useState("");
  const [colando, setColando] = useState(false);
  const [colado, setColado] = useState("");
  const [aviso, setAviso] = useState("");
  const ditado = useDitado((t) => setTexto((x) => (x ? `${x.trimEnd()} ${t}` : t)));
  const proximo = passos.find((p) => !p.feito);
  const feitos = passos.filter((p) => p.feito).length;

  function adicionar() {
    ditado.parar();
    const novos = textoParaPassos(texto);
    if (novos.length) onChange([...passos, ...novos]);
    setTexto("");
  }
  function abrirIA() {
    window.open(`https://chatgpt.com/?q=${encodeURIComponent(perguntaQuebrar(titulo, contexto))}`, "_blank", "noopener");
    setAviso("Copie a lista que a IA responder e volte aqui para tocar em “Colar passos”.");
  }

  async function colar() {
    // A caixa abre na hora; se o navegador deixar ler a área de transferência, já vem preenchida.
    setColando(true);
    try {
      const txt = await Promise.race([
        navigator.clipboard.readText(),
        new Promise<string>((_, rej) => setTimeout(() => rej(new Error("tempo")), 3000)),
      ]);
      if (passosDaResposta(txt).length) setColado(txt);
    } catch {
      /* sem permissão: o usuário cola manualmente */
    }
  }

  function confirmarColado() {
    const novos = passosDaResposta(colado);
    if (novos.length) onChange([...passos, ...novos]);
    setColado("");
    setColando(false);
    setAviso("");
  }

  const alternar = (id: string) => onChange(passos.map((p) => (p.id === id ? { ...p, feito: !p.feito } : p)));

  return (
    <div className={`passos ${foco ? "no-foco" : ""}`}>
      {foco && passos.length > 0 && (
        <p className="proximo-passo">
          {proximo ? (
            <>
              👉 <strong>Próximo passo:</strong> {proximo.texto}
            </>
          ) : (
            "🎉 Todos os passos feitos!"
          )}
        </p>
      )}

      {passos.length > 0 && (
        <>
          <div className="barra pequena" aria-label={`${feitos} de ${passos.length} passos`}>
            <div style={{ width: `${(feitos / passos.length) * 100}%` }} />
            <span>
              {feitos}/{passos.length} passos
            </span>
          </div>
          <ul className="lista-passos">
            {passos.map((p) => (
              <li key={p.id} className={`${p.feito ? "feito" : ""} ${p.id === proximo?.id ? "proximo" : ""}`}>
                <label>
                  <input type="checkbox" checked={p.feito} onChange={() => alternar(p.id)} />
                  <span>{p.texto}</span>
                </label>
                <button className="icone" onClick={() => onChange(passos.filter((x) => x.id !== p.id))} aria-label={`Remover passo ${p.texto}`}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="quebrar">
        {!passos.length && (
          <button className="primario" onClick={() => onChange(quebrarAutomatico(titulo, contexto))}>
            ✨ Quebrar para mim
          </button>
        )}
        <button className="chip" onClick={abrirIA} title="Abre o ChatGPT grátis com o pedido pronto">
          🤖 IA grátis
        </button>
        <button className="chip" onClick={colar}>
          📋 Colar passos
        </button>
        {passos.length > 0 && (
          <button className="chip" onClick={() => onChange(quebrarAutomatico(titulo, contexto))} title="Substitui a lista atual">
            ✨ Refazer
          </button>
        )}
      </div>
      {aviso && <small className="dica">{aviso}</small>}
      {colando && (
        <div className="colar">
          <textarea rows={4} value={colado} onChange={(e) => setColado(e.target.value)} placeholder="Toque e segure aqui → Colar a resposta da IA" />
          <div className="acoes">
            <button className="primario" disabled={!colado.trim()} onClick={confirmarColado}>
              Transformar em passos
            </button>
            <button className="secundario" onClick={() => setColando(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="acoes">
        {ditado.suportado && (
          <button className={`mic ${ditado.ouvindo ? "gravando" : ""}`} onClick={ditado.ouvindo ? ditado.parar : ditado.iniciar} aria-label="Ditar passos">
            {ditado.ouvindo ? "⏹" : "🎙️"}
          </button>
        )}
        <input
          className="entrada-etapa"
          value={texto + (ditado.parcial ? ` ${ditado.parcial}` : "")}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && adicionar()}
          readOnly={ditado.ouvindo}
          placeholder={passos.length ? "Mais passos…" : "Quebre em passos: criar o repositório, modelar a tabela…"}
        />
        <button className="secundario" disabled={!texto.trim() && !ditado.parcial} onClick={adicionar} aria-label="Adicionar passos">
          ➕
        </button>
      </div>
      {!passos.length && <small className="dica">Ou escreva/fale você mesmo: passos de 5–15 min, separados por vírgula ou “depois”.</small>}
    </div>
  );
}
