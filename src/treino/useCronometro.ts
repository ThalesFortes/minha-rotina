import { useCallback, useEffect, useRef, useState } from "react";

export interface Fase {
  rotulo: string;
  seg: number;
  destaque?: boolean; // fase de esforço (correr, segurar)
}

interface Interno {
  fases: Fase[];
  i: number;
  fim: number; // timestamp do fim da fase atual
  restantePausado: number | null; // ms restantes quando pausado
  aoTerminar?: () => void;
}

let audio: AudioContext | null = null;

function bipar(vezes: number) {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audio = audio ?? new Ctx();
    for (let k = 0; k < vezes; k++) {
      const osc = audio.createOscillator();
      const ganho = audio.createGain();
      osc.frequency.value = 880;
      osc.connect(ganho);
      ganho.connect(audio.destination);
      const t0 = audio.currentTime + k * 0.25;
      ganho.gain.setValueAtTime(0.25, t0);
      ganho.gain.exponentialRampToValueAtTime(0.001, t0 + 0.2);
      osc.start(t0);
      osc.stop(t0 + 0.22);
    }
  } catch {
    /* sem áudio */
  }
  try {
    navigator.vibrate?.(vezes > 1 ? [200, 100, 200] : 200);
  } catch {
    /* sem vibração */
  }
}

async function notificar(titulo: string, corpo: string) {
  if (!document.hidden || !("Notification" in window) || Notification.permission !== "granted") return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(titulo, { body: corpo, icon: "/pwa-192x192.png", tag: "treino" });
    else new Notification(titulo, { body: corpo });
  } catch {
    /* ignora */
  }
}

interface Retrato {
  fase: Fase;
  proxima?: Fase;
  indice: number;
  total: number;
  restanteMs: number;
  pausado: boolean;
}

/** Cronômetro de fases (descanso, aquecimento guiado, corrida intervalada). */
export function useCronometro() {
  // Estado mutável no ref (lido só em eventos/intervalo); a tela usa o "retrato".
  const ref = useRef<Interno | null>(null);
  const [retrato, setRetrato] = useState<Retrato | null>(null);
  const ativo = retrato !== null;

  const fotografar = useCallback(() => {
    const s = ref.current;
    if (!s) return setRetrato(null);
    setRetrato({
      fase: s.fases[s.i],
      proxima: s.fases[s.i + 1],
      indice: s.i + 1,
      total: s.fases.length,
      restanteMs: s.restantePausado ?? Math.max(0, s.fim - Date.now()),
      pausado: s.restantePausado !== null,
    });
  }, []);

  const avancar = useCallback(() => {
    const s = ref.current;
    if (!s) return;
    s.i++;
    if (s.i >= s.fases.length) {
      bipar(3);
      notificar("Treino", "Etapa concluída!");
      ref.current = null;
      fotografar();
      s.aoTerminar?.();
      return;
    }
    const f = s.fases[s.i];
    bipar(f.destaque ? 2 : 1);
    notificar(f.rotulo, f.seg >= 60 ? `${Math.round(f.seg / 60)} min` : `${f.seg} s`);
    s.fim = Date.now() + f.seg * 1000;
    s.restantePausado = null;
    fotografar();
  }, [fotografar]);

  useEffect(() => {
    if (!ativo) return;
    const id = window.setInterval(() => {
      const s = ref.current;
      if (s && s.restantePausado === null && Date.now() >= s.fim) avancar();
      else fotografar();
    }, 250);
    return () => clearInterval(id);
  }, [ativo, avancar, fotografar]);

  const comEstado = (f: (s: Interno) => void) => () => {
    const s = ref.current;
    if (!s) return;
    f(s);
    fotografar();
  };

  return {
    ativo,
    fase: retrato?.fase,
    proxima: retrato?.proxima,
    indice: retrato?.indice ?? 0,
    total: retrato?.total ?? 0,
    restante: Math.ceil((retrato?.restanteMs ?? 0) / 1000),
    progresso: retrato ? 1 - retrato.restanteMs / (retrato.fase.seg * 1000) : 0,
    pausado: retrato?.pausado ?? false,
    iniciar: (fases: Fase[], aoTerminar?: () => void) => {
      if (!fases.length) return;
      bipar(1);
      ref.current = { fases: fases.map((f) => ({ ...f })), i: 0, fim: Date.now() + fases[0].seg * 1000, restantePausado: null, aoTerminar };
      fotografar();
    },
    parar: () => {
      ref.current = null;
      fotografar();
    },
    pular: avancar,
    mais15: comEstado((s) => {
      s.fases[s.i].seg += 15;
      if (s.restantePausado !== null) s.restantePausado += 15000;
      else s.fim += 15000;
    }),
    alternarPausa: comEstado((s) => {
      if (s.restantePausado === null) s.restantePausado = Math.max(0, s.fim - Date.now());
      else {
        s.fim = Date.now() + s.restantePausado;
        s.restantePausado = null;
      }
    }),
  };
}

export type Cronometro = ReturnType<typeof useCronometro>;

export const formatar = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s % 60)).padStart(2, "0")}`;
