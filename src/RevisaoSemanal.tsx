import { useState } from "react";
import { formatarHoras, ritmoProjeto } from "./projetos";
import { diaMes, feitoNaSemana, progressoMeta, somarDias, tarefasPendentes } from "./semana";
import type { Meta, Plano, Projeto, Semana, Tarefa, Travamento } from "./types";

interface Props {
  anterior?: Semana;
  alvo: string; // segunda-feira da semana a planejar
  planos: Record<string, Plano>;
  projetos: Projeto[];
  travamentos: Travamento[];
  pomodoros: Record<string, number>;
  onRecomecar: (metas: Meta[], pendentes: Tarefa[]) => void;
  onDepois: () => void;
}

export function RevisaoSemanal({ anterior, alvo, planos, projetos, travamentos, pomodoros, onRecomecar, onDepois }: Props) {
  const tomates = anterior
    ? Object.entries(pomodoros)
        .filter(([d]) => d >= anterior.inicio && d < alvo)
        .reduce((s, [, n]) => s + n, 0)
    : 0;
  const daSemana = anterior ? travamentos.filter((t) => t.data >= anterior.inicio && t.data < alvo) : [];
  const minutosTravado = daSemana.reduce((s, t) => s + t.minutos, 0);
  const abertas = daSemana.filter((t) => !t.resolvido);
  const { porMeta } = anterior ? feitoNaSemana(anterior.inicio, planos) : { porMeta: new Map<string, number>() };
  const pendentes = anterior ? tarefasPendentes(anterior, planos) : [];
  const [metasOk, setMetasOk] = useState<Set<string>>(() => new Set(anterior?.metas.map((m) => m.id)));
  const [pendOk, setPendOk] = useState<Set<string>>(() => new Set(pendentes.map((t) => t.id)));

  const alternar = (set: Set<string>, id: string, fn: (s: Set<string>) => void) => {
    const n = new Set(set);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    fn(n);
  };

  const concluidas = anterior ? anterior.tarefas.length - pendentes.length : 0;
  const metasCumpridas = anterior?.metas.filter((m) => progressoMeta(m, porMeta).fracao >= 1).length ?? 0;

  return (
    <div className="modal-fundo" role="dialog" aria-modal="true" aria-labelledby="titulo-revisao">
      <div className="modal">
        <h2 id="titulo-revisao">🔁 Hora de recomeçar a semana</h2>
        <p className="dica">
          Semana de {diaMes(alvo)} a {diaMes(somarDias(alvo, 6))}.
        </p>

        {anterior && (
          <>
            <h3>Como foi a semana passada</h3>
            <p>
              {anterior.tarefas.length > 0 && (
                <>
                  ✅ {concluidas} de {anterior.tarefas.length} tarefas concluídas.{" "}
                </>
              )}
              {anterior.metas.length > 0 && (
                <>
                  🎯 {metasCumpridas} de {anterior.metas.length} metas cumpridas.
                </>
              )}
              {tomates > 0 && ` 🍅 ${tomates} pomodoros (${Math.round((tomates * 25) / 60)}h de foco).`}
              {concluidas + metasCumpridas + tomates > 0 ? " Bom trabalho!" : " Tudo bem — semana nova, começo novo."}
            </p>

            {anterior.metas.length > 0 && (
              <>
                <h3>Manter quais metas?</h3>
                <ul className="lista-check">
                  {anterior.metas.map((m) => (
                    <li key={m.id}>
                      <label>
                        <input type="checkbox" checked={metasOk.has(m.id)} onChange={() => alternar(metasOk, m.id, setMetasOk)} />
                        <span>
                          {m.titulo} <small>({progressoMeta(m, porMeta).texto})</small>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {pendentes.length > 0 && (
              <>
                <h3>Levar o que ficou pendente?</h3>
                <ul className="lista-check">
                  {pendentes.map((t) => (
                    <li key={t.id}>
                      <label>
                        <input type="checkbox" checked={pendOk.has(t.id)} onChange={() => alternar(pendOk, t.id, setPendOk)} />
                        <span>{t.titulo}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}

        {daSemana.length > 0 && (
          <>
            <h3>Travamentos</h3>
            <p>
              😵 Você travou {daSemana.length} {daSemana.length === 1 ? "vez" : "vezes"} ({minutosTravado} min no total)
              {daSemana.some((t) => t.ajuda) ? " e pediu ajuda quando precisou — ótimo." : "."}
              {abertas.length > 0 && ` ${abertas.length} ${abertas.length === 1 ? "dúvida continua" : "dúvidas continuam"} em aberto:`}
            </p>
            {abertas.length > 0 && (
              <ul className="dicas">
                {abertas.map((t) => (
                  <li key={t.id}>
                    {t.descricao} <small>· {t.tarefa}</small>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {projetos.length > 0 && (
          <>
            <h3>Projetos de longo prazo</h3>
            <ul className="lista-check">
              {projetos.map((p) => {
                const r = ritmoProjeto(p, planos, alvo);
                return (
                  <li key={p.id}>
                    <span>
                      🚀 <strong>{p.titulo}</strong> — {formatarHoras(r.feitoMin)} de {p.horasTotais}h.{" "}
                      {r.concluido ? "Concluído! 🎉" : `Nesta semana: ${formatarHoras(r.horasSemana * 60)} (${r.semanas} semanas restantes).`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        <div className="acoes coluna">
          <button
            className="primario"
            onClick={() =>
              onRecomecar(
                anterior?.metas.filter((m) => metasOk.has(m.id)) ?? [],
                pendentes.filter((t) => pendOk.has(t.id)),
              )
            }
          >
            Planejar a nova semana
          </button>
          <button className="secundario" onClick={onDepois}>
            Agora não
          </button>
        </div>
      </div>
    </div>
  );
}
