/** Passinho pequeno de uma tarefa difícil (5–15 min, começa com verbo). */
export interface Passo {
  id: string;
  texto: string;
  feito: boolean;
}

export type TipoBloco = "fixo" | "tarefa" | "pausa" | "refeicao" | "deslocamento";

/** Item da lista do dia, entendido a partir do texto/voz e editável pelo usuário. */
export interface Tarefa {
  id: string;
  titulo: string;
  duracaoMin: number;
  prioridade: boolean;
  fora: boolean; // precisa sair de casa (gera deslocamento)
  inicio?: string; // "HH:MM" → compromisso com horário fixo
  fim?: string;
  depoisDe?: string; // restrição: só começar depois deste horário
  antesDe?: string; // restrição: terminar antes deste horário
  // Planejamento semanal
  semana?: boolean; // veio da semana (é substituído ao reorganizar a semana)
  metaId?: string; // sessão de uma meta
  etapaId?: string; // sessão de uma etapa de projeto
  passos?: Passo[];
  dia?: string; // "YYYY-MM-DD" — dia exato pedido
  ateDia?: string; // "YYYY-MM-DD" — prazo
}

export interface Meta {
  id: string;
  titulo: string;
  tipo: "vezes" | "horas"; // N vezes na semana ou N horas na semana
  alvo: number;
  sessaoMin: number;
  fora: boolean;
  depoisDe?: string;
  antesDe?: string;
  etapaId?: string;
}

/** Objetivo de longo prazo: N horas até uma data (ex.: pós-graduação). */
export interface Projeto {
  id: string;
  titulo: string;
  horasTotais: number;
  horasAntes: number; // já feitas antes de usar o app
  prazo: string; // "YYYY-MM-DD"
  sessaoMin: number;
  depoisDe?: string;
  antesDe?: string;
  etapas?: Etapa[];
}

export interface Semana {
  inicio: string; // segunda-feira "YYYY-MM-DD"
  metas: Meta[];
  tarefas: Tarefa[];
  naoCouberam: NaoCoube[];
  organizadaEm?: string;
}

export interface Bloco {
  inicio: string; // "HH:MM"
  fim: string;
  titulo: string;
  tipo: TipoBloco;
  observacao: string;
  tarefaId?: string;
  feito?: boolean;
}

export interface NaoCoube {
  titulo: string;
  motivo: string;
}

export interface Plano {
  data: string; // "YYYY-MM-DD"
  resumo: string;
  blocos: Bloco[];
  naoCouberam: NaoCoube[];
  tarefas: Tarefa[];
  livreMin?: number;
  criadoEm: string;
}

export interface Config {
  acordar: string;
  dormir: string;
  focoMaxMin: number;
  pausaMin: number;
  deslocamentoMin: number;
  refeicoes: boolean;
  compromissosFixos: string;
  notificacoes: boolean;
  revisao: "domingo" | "segunda";
  limiteTravadoMin: number; // tempo tentando sozinho antes de pedir ajuda
  pomodoro: ConfigPomodoro;
}

export interface ConfigPomodoro {
  ativo: boolean;
  focoMin: number;
  pausaCurtaMin: number;
  pausaLongaMin: number;
  ciclos: number; // pomodoros até a pausa longa
}

/** Atividade/entrega dentro de um projeto (ex.: "desenvolver o software" dentro da pós). */
export interface Etapa {
  id: string;
  titulo: string;
  horas: number; // estimativa
  prazo?: string; // "YYYY-MM-DD"
  concluida: boolean;
  passos?: Passo[];
}

/** Registro de um momento em que o usuário travou numa tarefa. */
export interface Travamento {
  id: string;
  data: string; // "YYYY-MM-DD"
  tarefa: string;
  descricao: string;
  minutos: number;
  resolvido: boolean;
  ajuda?: string; // onde buscou ajuda (ChatGPT, Google…)
}

/** Sessão de foco em andamento (sobrevive a recarregar a página). */
export interface Foco {
  data: string;
  inicioBloco: string;
  titulo: string;
  fimBloco: string;
  inicioTs: number;
  tarefaId?: string;
  travado?: { descricao: string; inicioTs: number; alertado: boolean; ajuda?: string };
  pomodoro?: EstadoPomodoro;
}

export interface EstadoPomodoro {
  fase: "foco" | "pausa" | "pausaLonga";
  faseInicioTs: number;
  concluidos: number;
  pausadoEm?: number;
}
