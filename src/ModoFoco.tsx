import { useEffect, useState } from "react";
import { novoId } from "./interpretador";
import { Passos } from "./Passos";
import type { ConfigPomodoro, EstadoPomodoro, Foco, Passo, Travamento } from "./types";
import { useDitado } from "./useDitado";

interface Props {
  foco: Foco;
  limiteMin: number;
  pomodoro: ConfigPomodoro;
  pomodorosHoje: number;
  onPomodoro: () => void;
  onAtualizar: (f: Foco) => void;
  onRegistrar: (t: Travamento) => void;
  onConcluir: () => void;
  onFechar: () => void;
  passos?: Passo[];
  onPassos?: (p: Passo[]) => void;
}

const DICAS = [
  "Leia a mensagem de erro inteira, com calma — ela costuma dizer a linha e o motivo.",
  "Explique o problema em voz alta, como se fosse para outra pessoa (método do patinho de borracha).",
  "Divida em um passo menor: qual é a menor coisa que você consegue testar agora?",
  "Volte ao último ponto que funcionava e compare o que mudou.",
  "Releia o enunciado / a aula: o que exatamente está sendo pedido?",
];

const relogio = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
};

function perguntaParaIA(tarefa: string, duvida: string, minutos: number) {
  return (
    `Estou estudando/desenvolvendo: ${tarefa}.\n` +
    `Travei em: ${duvida}\n` +
    `Já tentei sozinho por ${minutos} minutos.\n` +
    `Me ajude a entender o problema com dicas passo a passo, sem me entregar a resposta completa de cara — quero aprender a resolver.`
  );
}

const ROTULO: Record<EstadoPomodoro["fase"], string> = { foco: "🍅 Foco", pausa: "☕ Pausa curta", pausaLonga: "🌿 Pausa longa" };

function avisar(titulo: string, corpo: string) {
  try {
    navigator.vibrate?.([300, 150, 300]);
  } catch {
    /* sem vibração */
  }
  if ("Notification" in window && Notification.permission === "granted") {
    navigator.serviceWorker?.getRegistration().then((reg) => {
      if (reg) reg.showNotification(titulo, { body: corpo, icon: "/pwa-192x192.png", tag: "pomodoro" });
      else new Notification(titulo, { body: corpo });
    });
  }
}

export function ModoFoco({ foco, limiteMin, pomodoro, pomodorosHoje, onPomodoro, onAtualizar, onRegistrar, onConcluir, onFechar, passos, onPassos }: Props) {
  const [agora, setAgora] = useState(() => Date.now());
  const [descrevendo, setDescrevendo] = useState(false);
  const [duvida, setDuvida] = useState("");
  const [copiado, setCopiado] = useState(false);
  const ditado = useDitado((t) => setDuvida((x) => (x ? `${x.trimEnd()} ${t}` : t)));

  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // ---------- Pomodoro ----------
  const pomo = pomodoro.ativo ? foco.pomodoro : undefined;
  const duracaoFase = (f: EstadoPomodoro["fase"]) =>
    (f === "foco" ? pomodoro.focoMin : f === "pausa" ? pomodoro.pausaCurtaMin : pomodoro.pausaLongaMin) * 60000;

  useEffect(() => {
    if (pomodoro.ativo && !foco.pomodoro) onAtualizar({ ...foco, pomodoro: { fase: "foco", faseInicioTs: foco.inicioTs, concluidos: 0 } });
  }, [pomodoro.ativo, foco, onAtualizar]);

  const referencia = pomo?.pausadoEm ?? agora;
  const restanteFase = pomo ? duracaoFase(pomo.fase) - (referencia - pomo.faseInicioTs) : 0;

  function avancar(contar: boolean) {
    if (!pomo) return;
    const fimFase = Math.min(agora, pomo.faseInicioTs + duracaoFase(pomo.fase));
    let concluidos = pomo.concluidos;
    let proxima: EstadoPomodoro["fase"] = "foco";
    if (pomo.fase === "foco") {
      if (contar) {
        concluidos++;
        onPomodoro();
      }
      proxima = concluidos > 0 && concluidos % pomodoro.ciclos === 0 && contar ? "pausaLonga" : "pausa";
    }
    // Se o app ficou fechado por muito tempo, recomeça a fase agora
    const inicio = agora - fimFase > duracaoFase(proxima) ? agora : fimFase;
    onAtualizar({ ...foco, pomodoro: { fase: proxima, faseInicioTs: inicio, concluidos } });
    if (contar || pomo.fase !== "foco") {
      avisar(
        proxima === "foco" ? "Pausa acabou — de volta ao foco 🍅" : `🍅 Pomodoro ${concluidos} concluído!`,
        proxima === "foco" ? foco.titulo : `${ROTULO[proxima]} de ${duracaoFase(proxima) / 60000} min. Levante e respire.`,
      );
    }
  }

  useEffect(() => {
    if (pomo && !pomo.pausadoEm && restanteFase <= 0) avancar(true);
  });

  function pausarOuRetomar() {
    if (!pomo) return;
    if (pomo.pausadoEm) onAtualizar({ ...foco, pomodoro: { ...pomo, faseInicioTs: pomo.faseInicioTs + (Date.now() - pomo.pausadoEm), pausadoEm: undefined } });
    else onAtualizar({ ...foco, pomodoro: { ...pomo, pausadoEm: Date.now() } });
  }

  const t = foco.travado;
  const limiteMs = limiteMin * 60000;
  const tentando = t ? agora - t.inicioTs : 0;
  const estourou = !!t && tentando >= limiteMs;
  const minutosTentando = Math.max(1, Math.round(tentando / 60000));

  // Aviso quando o tempo de tentativa acaba
  useEffect(() => {
    if (!t || !estourou || t.alertado) return;
    try {
      navigator.vibrate?.([300, 150, 300]);
    } catch {
      /* sem vibração */
    }
    if ("Notification" in window && Notification.permission === "granted") {
      navigator.serviceWorker?.getRegistration().then((reg) => {
        const corpo = `Você tentou por ${limiteMin} min: “${t.descricao}”. Hora de pedir ajuda.`;
        if (reg) reg.showNotification("Travou? Peça ajuda 🙋", { body: corpo, icon: "/pwa-192x192.png", tag: "travado" });
        else new Notification("Travou? Peça ajuda 🙋", { body: corpo });
      });
    }
    onAtualizar({ ...foco, travado: { ...t, alertado: true } });
  }, [estourou, t, foco, limiteMin, onAtualizar]);

  function comecarTentativa() {
    ditado.parar();
    if (!duvida.trim()) return;
    onAtualizar({ ...foco, travado: { descricao: duvida.trim(), inicioTs: Date.now(), alertado: false } });
    setDescrevendo(false);
    setDuvida("");
  }

  function encerrarTravamento(resolvido: boolean) {
    if (!t) return;
    onRegistrar({
      id: novoId(),
      data: foco.data,
      tarefa: foco.titulo,
      descricao: t.descricao,
      minutos: minutosTentando,
      resolvido,
      ajuda: t.ajuda,
    });
    onAtualizar({ ...foco, travado: undefined });
  }

  function abrirAjuda(nome: string, url: string) {
    if (t) onAtualizar({ ...foco, travado: { ...t, ajuda: nome } });
    window.open(url, "_blank", "noopener");
  }

  async function copiar() {
    if (!t) return;
    try {
      await navigator.clipboard.writeText(perguntaParaIA(foco.titulo, t.descricao, minutosTentando));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* sem acesso à área de transferência */
    }
  }

  const pergunta = t ? encodeURIComponent(perguntaParaIA(foco.titulo, t.descricao, minutosTentando)) : "";
  const busca = t ? encodeURIComponent(t.descricao) : "";

  return (
    <div className="modal-fundo" role="dialog" aria-modal="true" aria-labelledby="titulo-foco">
      <div className="modal foco">
        <p className="dica">
          Sessão {foco.inicioBloco}–{foco.fimBloco}
        </p>
        <h2 id="titulo-foco">🎯 {foco.titulo}</h2>
        {pomo ? (
          <div className={`pomodoro ${pomo.fase}`}>
            <p className="fase">
              {ROTULO[pomo.fase]}
              {pomo.pausadoEm ? " · pausado" : ""}
            </p>
            <p className="cronometro" aria-live="off">
              {relogio(restanteFase)}
            </p>
            <p className="ciclo" aria-label={`${pomo.concluidos % pomodoro.ciclos} de ${pomodoro.ciclos} até a pausa longa`}>
              {Array.from({ length: pomodoro.ciclos }, (_, i) => (
                <span key={i} className={i < pomo.concluidos % pomodoro.ciclos ? "cheio" : ""}>
                  ●
                </span>
              ))}
              <small>
                {" "}
                · {pomo.concluidos} nesta sessão · {pomodorosHoje} hoje
              </small>
            </p>
            <div className="acoes">
              <button className="secundario" onClick={pausarOuRetomar}>
                {pomo.pausadoEm ? "▶ Retomar" : "⏸ Pausar"}
              </button>
              <button className="secundario" onClick={() => avancar(false)}>
                ⏭ {pomo.fase === "foco" ? "Pular para pausa" : "Pular pausa"}
              </button>
            </div>
            {pomo.fase !== "foco" && <p className="dica">Pausa de verdade: longe da tela. Água, alongamento, janela.</p>}
          </div>
        ) : (
          <p className="cronometro" aria-live="off">
            {relogio(agora - foco.inicioTs)}
          </p>
        )}

        {onPassos && <Passos titulo={foco.titulo} passos={passos ?? []} onChange={onPassos} foco />}

        {!t && !descrevendo && (
          <button className="secundario largo" onClick={() => setDescrevendo(true)}>
            😵 Travei
          </button>
        )}

        {!t && descrevendo && (
          <div className="travado">
            <h3>No que você travou?</h3>
            <textarea
              rows={3}
              value={duvida + (ditado.parcial ? ` ${ditado.parcial}` : "")}
              onChange={(e) => setDuvida(e.target.value)}
              readOnly={ditado.ouvindo}
              placeholder="Ex.: erro “undefined is not a function” ao chamar a API no React"
            />
            <div className="acoes">
              {ditado.suportado && (
                <button className={`mic ${ditado.ouvindo ? "gravando" : ""}`} onClick={ditado.ouvindo ? ditado.parar : ditado.iniciar} aria-label="Ditar">
                  {ditado.ouvindo ? "⏹" : "🎙️"}
                </button>
              )}
              <button className="primario" disabled={!duvida.trim()} onClick={comecarTentativa}>
                Tentar sozinho por {limiteMin} min
              </button>
            </div>
          </div>
        )}

        {t && (
          <div className={`travado ${estourou ? "estourou" : ""}`}>
            <p>
              <strong>Travado em:</strong> {t.descricao}
            </p>

            {!estourou ? (
              <>
                <div className="barra pequena" aria-label="Tempo de tentativa">
                  <div style={{ width: `${(tentando / limiteMs) * 100}%` }} />
                  <span>Tentando sozinho · faltam {relogio(limiteMs - tentando)}</span>
                </div>
                <h3>Para destravar</h3>
                <ul className="dicas">
                  {DICAS.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="ritmo alerta">⏰ Você já tentou {minutosTentando} min. Não fique preso — peça ajuda:</p>
            )}

            <div className="ajuda">
              <button className="chip" onClick={() => abrirAjuda("ChatGPT", `https://chatgpt.com/?q=${pergunta}`)}>
                🤖 ChatGPT
              </button>
              <button className="chip" onClick={() => abrirAjuda("Claude", `https://claude.ai/new?q=${pergunta}`)}>
                🤖 Claude
              </button>
              <button className="chip" onClick={() => abrirAjuda("Google", `https://www.google.com/search?q=${busca}`)}>
                🔎 Google
              </button>
              <button className="chip" onClick={() => abrirAjuda("YouTube", `https://www.youtube.com/results?search_query=${busca}`)}>
                ▶️ YouTube
              </button>
              <button className="chip" onClick={() => abrirAjuda("Stack Overflow", `https://pt.stackoverflow.com/search?q=${busca}`)}>
                💬 Stack Overflow
              </button>
              <button className="chip" onClick={copiar}>
                {copiado ? "✔ Copiado" : "📋 Copiar pergunta"}
              </button>
            </div>

            <div className="acoes">
              <button className="primario" onClick={() => encerrarTravamento(true)}>
                ✅ Resolvi
              </button>
              <button className="secundario" onClick={() => encerrarTravamento(false)}>
                📝 Anotar e seguir
              </button>
            </div>
            <small className="dica">“Anotar e seguir” guarda a dúvida para levar ao professor/tutor.</small>
          </div>
        )}

        <div className="acoes coluna">
          <button className="primario" onClick={onConcluir}>
            ✅ Concluir sessão
          </button>
          <button className="secundario" onClick={onFechar}>
            Minimizar
          </button>
        </div>
      </div>
    </div>
  );
}
