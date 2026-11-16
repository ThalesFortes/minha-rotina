import { useState } from "react";
import { formatarHoras, interpretarEtapa, interpretarProjeto, ritmoProjeto, situacaoEtapas } from "./projetos";
import { deIso } from "./semana";
import type { Etapa, Plano, Projeto } from "./types";
import { Passos } from "./Passos";
import { resumoPassos } from "./passosUtil";
import { useDitado } from "./useDitado";

interface Props {
  projetos: Projeto[];
  planos: Record<string, Plano>;
  segunda: string;
  hoje: string;
  onChange: (p: Projeto[]) => void;
}

const dataBr = (iso: string) => deIso(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

export function ProjetosCard({ projetos, planos, segunda, hoje, onChange }: Props) {
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState("");
  const ditado = useDitado((t) => setTexto((x) => (x ? `${x.trimEnd()} ${t}` : t)));

  const editar = (id: string, mud: Partial<Projeto>) => onChange(projetos.map((p) => (p.id === id ? { ...p, ...mud } : p)));

  function adicionar() {
    ditado.parar();
    const p = interpretarProjeto(texto, hoje);
    if (!p) {
      setErro("Diga o total de horas, ex.: “pós-graduação de 360 horas até junho”.");
      return;
    }
    onChange([...projetos, p]);
    setTexto("");
    setErro("");
  }

  return (
    <section className="cartao">
      <h2>🚀 Projetos de longo prazo</h2>
      <p className="dica">
        Ex.: “pós-graduação de 360 horas, já fiz 40h, tenho até junho” ou “projeto de programação 120h até março depois das
        19h”. O app calcula as horas por semana e coloca em toda semana organizada.
      </p>
      <textarea
        rows={2}
        value={texto + (ditado.parcial ? ` ${ditado.parcial}` : "")}
        onChange={(e) => setTexto(e.target.value)}
        readOnly={ditado.ouvindo}
        placeholder="Descreva o projeto…"
      />
      <div className="acoes">
        {ditado.suportado && (
          <button className={`mic ${ditado.ouvindo ? "gravando" : ""}`} onClick={ditado.ouvindo ? ditado.parar : ditado.iniciar} aria-label="Ditar por voz">
            {ditado.ouvindo ? "⏹" : "🎙️"}
          </button>
        )}
        <button className="primario" disabled={!texto.trim()} onClick={adicionar}>
          ➕ Adicionar projeto
        </button>
      </div>
      {(erro || ditado.erro) && <p className="aviso">{erro || ditado.erro}</p>}

      <ul className="lista-tarefas">
        {projetos.map((p) => {
          const r = ritmoProjeto(p, planos, segunda);
          return (
            <li key={p.id} className="item projeto">
              <div className="item-linha">
                <span className="icone">🚀</span>
                <input className="titulo-input" value={p.titulo} onChange={(e) => editar(p.id, { titulo: e.target.value })} aria-label="Nome do projeto" />
                <button className="icone" onClick={() => onChange(projetos.filter((x) => x.id !== p.id))} aria-label="Remover">
                  ✕
                </button>
              </div>

              <div className="item-linha opcoes">
                <label className="seletor">
                  Total
                  <input
                    className="numero"
                    type="number"
                    min={1}
                    value={p.horasTotais}
                    onChange={(e) => editar(p.id, { horasTotais: Math.max(1, Number(e.target.value) || 1) })}
                  />
                  h
                </label>
                <label className="seletor">
                  Já feitas antes
                  <input
                    className="numero"
                    type="number"
                    min={0}
                    value={p.horasAntes}
                    onChange={(e) => editar(p.id, { horasAntes: Math.max(0, Number(e.target.value) || 0) })}
                  />
                  h
                </label>
              </div>
              <div className="item-linha opcoes">
                <label className="seletor">
                  Até
                  <input type="date" value={p.prazo} min={hoje} onChange={(e) => e.target.value && editar(p.id, { prazo: e.target.value })} />
                </label>
                <label className="seletor">
                  Sessões de
                  <input
                    className="numero"
                    type="number"
                    min={15}
                    step={15}
                    value={p.sessaoMin}
                    onChange={(e) => editar(p.id, { sessaoMin: Math.max(15, Number(e.target.value) || 60) })}
                  />
                  min
                </label>
              </div>

              <div className="barra pequena" aria-label="Progresso total">
                <div style={{ width: `${r.fracao * 100}%` }} />
                <span>
                  {formatarHoras(r.feitoMin)} de {p.horasTotais}h ({Math.round(r.fracao * 100)}%)
                </span>
              </div>

              <p className={`ritmo ${r.pesado || r.prazoPassou ? "alerta" : ""}`}>
                {r.concluido
                  ? "🎉 Concluído!"
                  : r.prazoPassou
                    ? `⚠️ O prazo (${dataBr(p.prazo)}) já passou. Faltam ${formatarHoras(r.restanteMin)} — ajuste a data.`
                    : `Ritmo: ${formatarHoras(r.horasSemana * 60)} por semana · ${r.semanas} ${r.semanas === 1 ? "semana" : "semanas"} até ${dataBr(p.prazo)}` +
                      (r.pesado ? " — ⚠️ ritmo muito alto, considere estender o prazo." : "")}
              </p>
              {r.motivo && !r.concluido && <p className="ritmo">Ritmo puxado por: {r.motivo}.</p>}

              <EtapasProjeto
                projeto={p}
                planos={planos}
                hoje={hoje}
                onChange={(etapas) => editar(p.id, { etapas })}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Atividades/entregas dentro do projeto, em ordem. */
function EtapasProjeto({
  projeto,
  planos,
  hoje,
  onChange,
}: {
  projeto: Projeto;
  planos: Record<string, Plano>;
  hoje: string;
  onChange: (e: Etapa[]) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");
  const [passosDe, setPassosDe] = useState<string | null>(null);
  const etapas = projeto.etapas ?? [];
  const situacao = situacaoEtapas(projeto, planos);
  const atual = situacao.find((x) => !x.etapa.concluida);
  const editar = (id: string, mud: Partial<Etapa>) => onChange(etapas.map((e) => (e.id === id ? { ...e, ...mud } : e)));
  const mover = (i: number, d: number) => {
    const n = [...etapas];
    [n[i], n[i + d]] = [n[i + d], n[i]];
    onChange(n);
  };

  function adicionar() {
    const novas = texto
      .split(/\n|;/)
      .map((l) => interpretarEtapa(l, hoje))
      .filter((e): e is Etapa => e !== null);
    if (novas.length) onChange([...etapas, ...novas]);
    setTexto("");
  }

  return (
    <div className="etapas">
      <button className="link" onClick={() => setAberto(!aberto)}>
        {aberto ? "▾" : "▸"} Etapas / atividades ({etapas.filter((e) => e.concluida).length}/{etapas.length})
        {!aberto && atual ? ` · agora: ${atual.etapa.titulo}` : ""}
      </button>

      {aberto && (
        <>
          <p className="dica">
            Ex.: “desenvolver o software de gestão 80h até março”, “escrever o artigo 20h”. As horas da semana vão para as
            etapas em ordem.
          </p>
          <ol className="lista-etapas">
            {situacao.map(({ etapa: e, feitoMin, estourou }, i) => (
              <li key={e.id} className={`${e.concluida ? "concluida" : ""} ${estourou ? "estourou" : ""}`}>
                <div className="item-linha">
                  <input
                    type="checkbox"
                    checked={e.concluida}
                    onChange={() => editar(e.id, { concluida: !e.concluida })}
                    aria-label={`Etapa ${e.titulo} concluída`}
                  />
                  <input className="titulo-input" value={e.titulo} onChange={(ev) => editar(e.id, { titulo: ev.target.value })} aria-label="Etapa" />
                  <button className="icone" disabled={i === 0} onClick={() => mover(i, -1)} aria-label="Subir">
                    ↑
                  </button>
                  <button className="icone" disabled={i === etapas.length - 1} onClick={() => mover(i, 1)} aria-label="Descer">
                    ↓
                  </button>
                  <button className="icone" onClick={() => onChange(etapas.filter((x) => x.id !== e.id))} aria-label="Remover etapa">
                    ✕
                  </button>
                </div>
                <div className="item-linha opcoes">
                  <span>
                    {formatarHoras(feitoMin)} de
                  </span>
                  <input
                    className="numero"
                    type="number"
                    min={1}
                    value={e.horas}
                    onChange={(ev) => editar(e.id, { horas: Math.max(1, Number(ev.target.value) || 1) })}
                    aria-label="Horas estimadas"
                  />
                  <span>h</span>
                  <label className="seletor">
                    até
                    <input type="date" value={e.prazo ?? ""} onChange={(ev) => editar(e.id, { prazo: ev.target.value || undefined })} />
                  </label>
                </div>
                <button className="link passos-toggle" onClick={() => setPassosDe(passosDe === e.id ? null : e.id)}>
                  {passosDe === e.id ? "▾" : "▸"} 🧩 {e.passos?.length ? `Passos ${resumoPassos(e.passos).slice(3)}` : "Quebrar em passos"}
                </button>
                {passosDe === e.id && <Passos titulo={e.titulo} contexto={projeto.titulo} passos={e.passos ?? []} onChange={(passos) => editar(e.id, { passos })} />}
                {estourou && (
                  <small className="ritmo alerta">
                    ⚠️ Passou da estimativa. Se terminou, marque como concluída; se não, aumente as horas para o ritmo se ajustar.
                  </small>
                )}
              </li>
            ))}
          </ol>
          <div className="acoes">
            <input
              className="entrada-etapa"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && adicionar()}
              placeholder="Nova etapa… (ex.: criar o backend 30h até fevereiro)"
            />
            <button className="secundario" disabled={!texto.trim()} onClick={adicionar}>
              ➕
            </button>
          </div>
        </>
      )}
    </div>
  );
}
