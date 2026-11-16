import { useState } from "react";
import { hhmm, paraMin } from "./interpretador";
import { Passos } from "./Passos";
import { resumoPassos } from "./passosUtil";
import { diaMes, nomeCurto } from "./semana";
import type { Tarefa } from "./types";

interface Props {
  tarefa: Tarefa;
  onChange: (mud: Partial<Tarefa>) => void;
  onRemove: () => void;
  /** Dias da semana disponíveis: mostra os seletores de dia e prazo. */
  dias?: string[];
}

export function ItemTarefa({ tarefa: t, onChange, onRemove, dias }: Props) {
  const [verPassos, setVerPassos] = useState(false);
  return (
    <li className={t.inicio ? "item fixo" : "item"}>
      <div className="item-linha">
        <button
          className={`icone ${t.prioridade ? "on" : ""}`}
          onClick={() => onChange({ prioridade: !t.prioridade })}
          aria-label="Prioridade"
          title="Prioridade"
        >
          {t.prioridade ? "⭐" : "☆"}
        </button>
        <input className="titulo-input" value={t.titulo} onChange={(e) => onChange({ titulo: e.target.value })} aria-label="Título" />
        <button className="icone" onClick={onRemove} aria-label="Remover">
          ✕
        </button>
      </div>

      <div className="item-linha opcoes">
        {t.inicio ? (
          <>
            <input
              type="time"
              value={t.inicio}
              onChange={(e) => onChange({ inicio: e.target.value, fim: hhmm(paraMin(e.target.value) + t.duracaoMin) })}
              aria-label="Início"
            />
            <span>até</span>
            <input
              type="time"
              value={t.fim}
              onChange={(e) =>
                onChange({ fim: e.target.value, duracaoMin: (paraMin(e.target.value) - paraMin(t.inicio!) + 1440) % 1440 || 30 })
              }
              aria-label="Fim"
            />
          </>
        ) : (
          <label className="duracao">
            ⏱
            <input
              type="number"
              min={5}
              step={5}
              value={t.duracaoMin}
              onChange={(e) => onChange({ duracaoMin: Math.max(5, Number(e.target.value) || 5) })}
              aria-label="Duração em minutos"
            />
            min
          </label>
        )}
        <button
          className={`chip ${t.inicio ? "on" : ""}`}
          onClick={() =>
            t.inicio ? onChange({ inicio: undefined, fim: undefined }) : onChange({ inicio: "09:00", fim: hhmm(540 + t.duracaoMin), fora: false })
          }
        >
          📌 Horário fixo
        </button>
        {!t.inicio && (
          <button className={`chip ${t.fora ? "on" : ""}`} onClick={() => onChange({ fora: !t.fora })}>
            🚶 Sair de casa
          </button>
        )}
      </div>

      {dias && (
        <div className="item-linha opcoes">
          <label className="seletor">
            Dia
            <select
              value={t.dia ?? ""}
              onChange={(e) => onChange({ dia: e.target.value || undefined, ateDia: e.target.value ? undefined : t.ateDia })}
            >
              <option value="">Qualquer</option>
              {dias.map((d) => (
                <option key={d} value={d}>
                  {nomeCurto(d)} {diaMes(d)}
                </option>
              ))}
            </select>
          </label>
          {!t.dia && (
            <label className="seletor">
              Prazo
              <select value={t.ateDia ?? ""} onChange={(e) => onChange({ ateDia: e.target.value || undefined })}>
                <option value="">Sem prazo</option>
                {dias.map((d) => (
                  <option key={d} value={d}>
                    até {nomeCurto(d)} {diaMes(d)}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}

      {!t.inicio && (
        <button className="link passos-toggle" onClick={() => setVerPassos(!verPassos)}>
          {verPassos ? "▾" : "▸"} 🧩 {t.passos?.length ? `Passos ${resumoPassos(t.passos).slice(3)}` : "Quebrar em passos"}
        </button>
      )}
      {verPassos && <Passos titulo={t.titulo} passos={t.passos ?? []} onChange={(passos) => onChange({ passos })} />}

      {(t.depoisDe || t.antesDe) && !t.inicio && (
        <small className="restricao">
          {t.depoisDe && `depois das ${t.depoisDe} `}
          {t.antesDe && `antes das ${t.antesDe}`}
          <button className="link" onClick={() => onChange({ depoisDe: undefined, antesDe: undefined })}>
            remover
          </button>
        </small>
      )}
    </li>
  );
}
