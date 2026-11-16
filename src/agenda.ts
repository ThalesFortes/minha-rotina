import type { Plano } from "./types";

export const hojeISO = (offsetDias = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const agoraHHMM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export const paraData = (data: string, hhmm: string) => {
  const [a, m, d] = data.split("-").map(Number);
  const [h, min] = hhmm.split(":").map(Number);
  return new Date(a, m - 1, d, h, min);
};

/** Gera um arquivo .ics com lembrete 5 min antes de cada bloco (exceto pausas). */
export function gerarICS(plano: Plano): string {
  const fmt = (dt: Date) =>
    `${dt.getFullYear()}${String(dt.getMonth() + 1).padStart(2, "0")}${String(dt.getDate()).padStart(2, "0")}T${String(dt.getHours()).padStart(2, "0")}${String(dt.getMinutes()).padStart(2, "0")}00`;
  const esc = (s: string) => s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
  const eventos = plano.blocos
    .filter((b) => b.tipo !== "pausa" && !b.feito)
    .map((b, i) => {
      const ini = paraData(plano.data, b.inicio);
      let fim = paraData(plano.data, b.fim);
      if (fim <= ini) fim = new Date(fim.getTime() + 86400000); // passou da meia-noite
      return [
        "BEGIN:VEVENT",
        `UID:${plano.data}-${i}-${b.inicio.replace(":", "")}@organizar-rotina`,
        `DTSTAMP:${fmt(new Date())}`,
        `DTSTART:${fmt(ini)}`,
        `DTEND:${fmt(fim)}`,
        `SUMMARY:${esc(b.titulo)}`,
        b.observacao ? `DESCRIPTION:${esc(b.observacao)}` : "",
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        `DESCRIPTION:${esc(b.titulo)}`,
        "TRIGGER:-PT5M",
        "END:VALARM",
        "END:VEVENT",
      ]
        .filter(Boolean)
        .join("\r\n");
    });
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Organizar Rotina//PT-BR", ...eventos, "END:VCALENDAR"].join("\r\n");
}

export function baixarArquivo(nome: string, conteudo: string, tipo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Agenda notificações locais para os próximos blocos (funciona enquanto o app está aberto/em segundo plano recente). */
export function agendarNotificacoes(plano: Plano): () => void {
  if (!("Notification" in window) || Notification.permission !== "granted") return () => {};
  const timers: number[] = [];
  const agora = Date.now();
  for (const b of plano.blocos) {
    if (b.feito || b.tipo === "pausa") continue;
    const quando = paraData(plano.data, b.inicio).getTime() - agora;
    if (quando <= 0 || quando > 86400000) continue;
    timers.push(
      window.setTimeout(async () => {
        const reg = await navigator.serviceWorker?.getRegistration();
        const corpo = `${b.inicio}–${b.fim}${b.observacao ? ` · ${b.observacao}` : ""}`;
        if (reg) reg.showNotification(b.titulo, { body: corpo, icon: "/pwa-192x192.png", tag: `${plano.data}-${b.inicio}` });
        else new Notification(b.titulo, { body: corpo });
      }, quando),
    );
  }
  return () => timers.forEach(clearTimeout);
}

/** Evento semanal recorrente lembrando de revisar e planejar a semana. */
export function gerarLembreteSemanal(quando: "domingo" | "segunda"): string {
  const base = new Date();
  const alvo = quando === "domingo" ? 0 : 1;
  base.setDate(base.getDate() + ((alvo - base.getDay() + 7) % 7));
  const [h, m] = quando === "domingo" ? [19, 0] : [7, 30];
  const ymd = `${base.getFullYear()}${String(base.getMonth() + 1).padStart(2, "0")}${String(base.getDate()).padStart(2, "0")}`;
  const hora = (hh: number, mm: number) => `${String(hh + Math.floor(mm / 60)).padStart(2, "0")}${String(mm % 60).padStart(2, "0")}00`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Organizar Rotina//PT-BR",
    "BEGIN:VEVENT",
    `UID:revisao-semanal-${quando}@organizar-rotina`,
    `DTSTAMP:${ymd}T000000`,
    `DTSTART:${ymd}T${hora(h, m)}`,
    `DTEND:${ymd}T${hora(h, m + 15)}`,
    `RRULE:FREQ=WEEKLY;BYDAY=${quando === "domingo" ? "SU" : "MO"}`,
    "SUMMARY:Planejar a semana (Minha Rotina)",
    "DESCRIPTION:Abra o app Minha Rotina para revisar a semana e recomeçar.",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Planejar a semana",
    "TRIGGER:PT0M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
