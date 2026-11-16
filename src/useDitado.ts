import { useCallback, useEffect, useRef, useState } from "react";

// Tipos mínimos da Web Speech API (não vêm no lib.dom do TypeScript).
interface ResultadoFala {
  isFinal: boolean;
  0: { transcript: string };
}
interface EventoFala {
  resultIndex: number;
  results: ArrayLike<ResultadoFala>;
}
interface Reconhecedor {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: EventoFala) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

const Construtor: (new () => Reconhecedor) | undefined =
  (window as unknown as { SpeechRecognition?: new () => Reconhecedor }).SpeechRecognition ??
  (window as unknown as { webkitSpeechRecognition?: new () => Reconhecedor }).webkitSpeechRecognition;

/** Ditado por voz em pt-BR. `aoFinalizar` recebe cada trecho reconhecido. */
export function useDitado(aoFinalizar: (texto: string) => void) {
  const [ouvindo, setOuvindo] = useState(false);
  const [parcial, setParcial] = useState("");
  const [erro, setErro] = useState("");
  const rec = useRef<Reconhecedor | null>(null);
  const querOuvir = useRef(false);
  const callback = useRef(aoFinalizar);
  useEffect(() => {
    callback.current = aoFinalizar;
  }, [aoFinalizar]);

  const parar = useCallback(() => {
    querOuvir.current = false;
    rec.current?.stop();
  }, []);

  const iniciar = useCallback(() => {
    if (!Construtor) {
      setErro("Seu navegador não suporta ditado. Use o Chrome, ou o microfone do teclado.");
      return;
    }
    setErro("");
    const r = new Construtor();
    r.lang = "pt-BR";
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let temp = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) callback.current(res[0].transcript.trim());
        else temp += res[0].transcript;
      }
      setParcial(temp);
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed") setErro("Permita o uso do microfone para ditar.");
      else if (e.error !== "no-speech" && e.error !== "aborted") setErro(`Erro no ditado: ${e.error}`);
    };
    r.onend = () => {
      // O Chrome encerra sozinho após silêncio; reinicia enquanto o usuário não parar.
      if (querOuvir.current) {
        try {
          r.start();
          return;
        } catch {
          /* cai para o encerramento */
        }
      }
      setOuvindo(false);
      setParcial("");
    };
    rec.current = r;
    querOuvir.current = true;
    r.start();
    setOuvindo(true);
  }, []);

  useEffect(() => () => parar(), [parar]);

  return { suportado: !!Construtor, ouvindo, parcial, erro, iniciar, parar };
}
