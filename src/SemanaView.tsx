import { useState } from "react";
import { novoId } from "./interpretador";
import { ItemTarefa } from "./ItemTarefa";
import { ProjetosCard } from "./ProjetosCard";
import {
  diaMes,
  diasDaSemana,
  feitoNaSemana,
  interpretarMetas,
  interpretarTarefasSemana,
  nomeCurto,
  progressoMeta,
} from "./semana";
import type { Meta, Plano, Projeto, Semana } from "./types";
import { useDitado } from "./useDitado";

interface Props {
  semana: Semana;
  hoje: string;
  planos: Record<string, Plano>;
  projetos: Projeto[];
  onProjetos: (p: Projeto[]) => void;
  onChange: (s: Semana) => void;
  onOrganizar: () => void;
  onAbrirDia: (d: string) => void;
}

type Alvo = "metas" | "tarefas";

export function SemanaView({ semana, hoje, planos, projetos, onProjetos, onChange, onOrganizar, onAbrirDia }: Props) {
  const [textoMetas, setTextoMetas] = useState("");
  const [textoTarefas, setTextoTarefas] = useState("");
  const [alvo, setAlvo] = useState<Alvo>("tarefas");
  const ditado = useDitado((trecho) => {
    const set = alvo === "metas" ? setTextoMetas : setTextoTarefas;
    set((t) => (t ? `${t.trimEnd()} ${trecho}` : trecho));
  });

  const dias = diasDaSemana(semana.inicio);
  const diasFuturos = dias.filter((d) => d >= hoje);
  const { porMeta } = feitoNaSemana(semana.inicio, planos);

  const editarMeta = (id: string, mud: Partial<Meta>) =>
    onChange({ ...semana, metas: semana.metas.map((m) => (m.id === id ? { ...m, ...mud } : m)) });

  function adicionarMetas() {
    ditado.parar();
    const novas = interpretarMetas(textoMetas);
    if (novas.length) onChange({ ...semana, metas: [...semana.metas, ...novas] });
    setTextoMetas("");
  }
  function adicionarTarefas() {
    ditado.parar();
    const novas = interpretarTarefasSemana(textoTarefas, semana.inicio, hoje);
    if (novas.length) onChange({ ...semana, tarefas: [...semana.tarefas, ...novas] });
    setTextoTarefas("");
  }

  const mic = (a: Alvo) =>
    ditado.suportado && (
      <button
        className={`mic ${ditado.ouvindo && alvo === a ? "gravando" : ""}`}
        onClick={() => {
          if (ditado.ouvindo) ditado.parar();
          else {
            setAlvo(a);
            ditado.iniciar();
          }
        }}
        aria-label="Ditar por voz"
      >
        {ditado.ouvindo && alvo === a ? "⏹" : "🎙️"}
      </button>
    );

  const valor = (a: Alvo, t: string) => t + (ditado.ouvindo && alvo === a && ditado.parcial ? ` ${ditado.parcial}` : "");

  return (
    <>
      <section className="cartao">
        <h2>
          Semana de {diaMes(dias[0])} a {diaMes(dias[6])}
        </h2>
        <p className="dica">Coloque suas metas e o que precisa fazer. O app espalha tudo pelos dias livres.</p>
      </section>

      <ProjetosCard projetos={projetos} planos={planos} segunda={semana.inicio} hoje={hoje} onChange={onProjetos} />

      <section className="cartao">
        <h2>🎯 Metas da semana</h2>
        <p className="dica">Ex.: “academia 3x depois das 18h”, “estudar inglês 5h na semana”, “ler 30 min por dia”.</p>
        <textarea
          rows={2}
          value={valor("metas", textoMetas)}
          onChange={(e) => setTextoMetas(e.target.value)}
          readOnly={ditado.ouvindo && alvo === "metas"}
          placeholder="Uma meta por linha…"
        />
        <div className="acoes">
          {mic("metas")}
          <button className="primario" disabled={!textoMetas.trim()} onClick={adicionarMetas}>
            ➕ Adicionar metas
          </button>
        </div>

        <ul className="lista-tarefas metas">
          {semana.metas.map((m) => {
            const p = progressoMeta(m, porMeta);
            return (
              <li key={m.id} className="item meta">
                <div className="item-linha">
                  <span className="icone">🎯</span>
                  <input className="titulo-input" value={m.titulo} onChange={(e) => editarMeta(m.id, { titulo: e.target.value })} />
                  <button className="icone" onClick={() => onChange({ ...semana, metas: semana.metas.filter((x) => x.id !== m.id) })} aria-label="Remover">
                    ✕
                  </button>
                </div>
                <div className="item-linha opcoes">
                  <input
                    className="numero"
                    type="number"
                    min={1}
                    value={m.alvo}
                    onChange={(e) => editarMeta(m.id, { alvo: Math.max(1, Number(e.target.value) || 1) })}
                    aria-label="Alvo"
                  />
                  <select value={m.tipo} onChange={(e) => editarMeta(m.id, { tipo: e.target.value as Meta["tipo"] })} aria-label="Tipo">
                    <option value="vezes">vezes</option>
                    <option value="horas">horas</option>
                  </select>
                  <span>na semana · sessões de</span>
                  <input
                    className="numero"
                    type="number"
                    min={5}
                    step={5}
                    value={m.sessaoMin}
                    onChange={(e) => editarMeta(m.id, { sessaoMin: Math.max(5, Number(e.target.value) || 30) })}
                    aria-label="Minutos por sessão"
                  />
                  <span>min</span>
                </div>
                <div className="barra pequena" aria-label={p.texto}>
                  <div style={{ width: `${p.fracao * 100}%` }} />
                  <span>{p.texto}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="cartao">
        <h2>📝 Tarefas da semana</h2>
        <p className="dica">Ex.: “sexta pagar o boleto, até quarta entregar o trabalho 3h, quinta dentista às 15h, ir ao mercado”.</p>
        <textarea
          rows={3}
          value={valor("tarefas", textoTarefas)}
          onChange={(e) => setTextoTarefas(e.target.value)}
          readOnly={ditado.ouvindo && alvo === "tarefas"}
          placeholder="Digite ou fale…"
        />
        <div className="acoes">
          {mic("tarefas")}
          <button className="primario" disabled={!textoTarefas.trim()} onClick={adicionarTarefas}>
            ➕ Adicionar tarefas
          </button>
        </div>
        {ditado.erro && <p className="aviso">{ditado.erro}</p>}

        <ul className="lista-tarefas">
          {semana.tarefas.map((t) => (
            <ItemTarefa
              key={t.id}
              tarefa={t}
              dias={diasFuturos}
              onChange={(mud) => onChange({ ...semana, tarefas: semana.tarefas.map((x) => (x.id === t.id ? { ...x, ...mud } : x)) })}
              onRemove={() => onChange({ ...semana, tarefas: semana.tarefas.filter((x) => x.id !== t.id) })}
            />
          ))}
        </ul>
        <button
          className="secundario largo"
          onClick={() =>
            onChange({
              ...semana,
              tarefas: [...semana.tarefas, { id: novoId(), titulo: "Nova tarefa", duracaoMin: 30, prioridade: false, fora: false, semana: true }],
            })
          }
        >
          + Item manual
        </button>
        <button className="primario largo" disabled={!semana.metas.length && !semana.tarefas.length && !projetos.length} onClick={onOrganizar}>
          🗓️ Organizar a semana
        </button>
      </section>

      {semana.organizadaEm && (
        <section className="cartao">
          <h2>Visão da semana</h2>
          <ul className="visao-semana">
            {dias.map((d) => {
              const p = planos[d];
              const tarefas = p?.blocos.filter((b) => b.tipo === "tarefa") ?? [];
              const feitas = tarefas.filter((b) => b.feito).length;
              return (
                <li key={d}>
                  <button className={`dia-semana ${d === hoje ? "hoje" : ""} ${d < hoje ? "passado" : ""}`} onClick={() => onAbrirDia(d)}>
                    <span className="dia-nome">
                      <strong>{nomeCurto(d)}</strong> {diaMes(d)}
                    </span>
                    <span className="dia-tarefas">
                      {tarefas.length
                        ? [...new Set(tarefas.map((b) => b.titulo.replace(/ \((?:parte|🍅) \d+\)$/, "")))].join(" · ")
                        : p
                          ? "Só compromissos fixos"
                          : "Sem plano"}
                    </span>
                    {tarefas.length > 0 && (
                      <span className="dia-contagem">
                        {feitas}/{tarefas.length}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          {semana.naoCouberam.length > 0 && (
            <div className="nao-coube">
              <h3>Não coube na semana</h3>
              <ul>
                {semana.naoCouberam.map((n, i) => (
                  <li key={i}>
                    <strong>{n.titulo}</strong> — {n.motivo}
                  </li>
                ))}
              </ul>
              <p className="dica">Dica: reduza o alvo de alguma meta ou o tempo das sessões e organize de novo.</p>
            </div>
          )}
        </section>
      )}
    </>
  );
}
