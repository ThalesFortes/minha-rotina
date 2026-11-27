/** Conteúdo do treino: exercícios, aquecimento, coluna, corrida e guia. */

export interface Teste {
  flex: string;
  barra: string;
  abd: string;
  dist: string;
}

export interface Exercicio {
  nome: string;
  musculos: string;
  series: number;
  reps: (t: Teste) => string;
  descansoSeg: number;
  segurarSeg?: number; // exercícios de tempo (prancha)
  video: string;
  videoFacil?: string;
  busca: string;
  comoFazer: string[];
  facil: string;
  demo?: { fonte: string; url: string };
}

export interface ItemGuiado {
  nome: string;
  segundos: number;
  dica: string;
  video?: string;
  busca: string;
}

export interface ExercicioColuna {
  nome: string;
  musculos: string;
  dose: string;
  segundos: number;
  video: string;
  comoFazer: string[];
  facil?: string;
}

export interface SemanaCorrida {
  semana: number;
  resumo: string;
  fases: { seg: number; correr: boolean }[];
}

export const buscaYoutube = (q: string) =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(`Calistenia Brasil ${q} shorts`)}&sp=EgIYAQ%253D%253D`;

const metade = (v: string, fallback: string) => {
  const n = parseInt(v, 10);
  return n > 0 ? `${Math.max(1, Math.round(n / 2))} reps` : fallback;
};

export const AQUECIMENTO: ItemGuiado[] = [
  { nome: "Polichinelo", segundos: 60, dica: "Pule abrindo pernas e braços ao mesmo tempo e feche. Ritmo leve.", video: "https://www.youtube.com/watch?v=l-60Ky-FJf4", busca: "polichinelo como fazer" },
  { nome: "Corrida parada", segundos: 60, dica: "Corra no lugar, elevando um pouco os joelhos.", video: "https://www.youtube.com/watch?v=Y117-yUhQQE", busca: "corrida parada aquecimento" },
  { nome: "Rotação de braços (frente e trás)", segundos: 60, dica: "Braços esticados para os lados, círculos pequenos que vão aumentando. 30 s para frente, 30 s para trás.", video: "https://www.youtube.com/shorts/0WXJ9X5g_Bw", busca: "rotação de braços aquecimento ombro" },
  { nome: "Rotação de quadril", segundos: 60, dica: "Mãos na cintura, faça círculos com o quadril. Troque de lado na metade.", video: "https://www.youtube.com/watch?v=zUoi-0dTA4s", busca: "rotação de quadril aquecimento" },
  { nome: "Agachamento leve", segundos: 60, dica: "Agachamentos devagar, sem descer muito.", video: "https://www.youtube.com/shorts/w6WJK9NnlK8", busca: "agachamento livre aquecimento" },
  { nome: "Flexão com joelhos no chão", segundos: 60, dica: "Flexões leves com os joelhos no chão, só para acordar peito e braços.", video: "https://www.youtube.com/shorts/h5ClL5IYzog", busca: "flexão com joelho apoiado iniciante" },
  { nome: "Mobilidade livre", segundos: 120, dica: "Gire punhos, tornozelos e pescoço devagar e alongue o que estiver duro.", video: "https://www.youtube.com/watch?v=3JEdmtr30nw", busca: "mobilidade aquecimento calistenia" },
];

export const FORCA_A: Exercicio[] = [
  {
    nome: "Flexão de braço", musculos: "Peito · ombros · tríceps", series: 4,
    reps: (t) => metade(t.flex, "6–10 reps (ou metade do seu máximo)"), descansoSeg: 90,
    video: "https://www.youtube.com/watch?v=vgjx5sgT1TQ", videoFacil: "https://www.youtube.com/shorts/h5ClL5IYzog", busca: "flexão de braço iniciante",
    comoFazer: ["Mãos no chão, um pouco mais abertas que os ombros.", "Corpo reto da cabeça aos pés, abdômen firme (sem deixar o quadril cair).", "Desça o peito até perto do chão, cotovelos a uns 45° do corpo.", "Suba empurrando o chão. Solte o ar na subida."],
    facil: "mãos apoiadas numa mesa ou com os joelhos no chão.", demo: { fonte: "Tua Saúde", url: "https://www.tuasaude.com/flexao-de-braco/" },
  },
  {
    nome: "Barra fixa (palmas para frente)", musculos: "Costas · bíceps · antebraço", series: 4,
    reps: (t) => (parseInt(t.barra, 10) >= 2 ? metade(t.barra, "") : "3–5 negativas"), descansoSeg: 90,
    video: "https://www.youtube.com/shorts/iBXK5M9NFsE", busca: "barra fixa iniciante negativa",
    comoFazer: ["Segure a barra com as palmas para frente, um pouco mais aberto que os ombros.", "Antes de puxar, \"abaixe\" os ombros (afaste-os das orelhas).", "Puxe até o queixo passar da barra, sem balançar.", "Desça controlando até os braços estenderem."],
    facil: "negativas: suba com ajuda de uma cadeira e desça devagar em 3–5 segundos. Sem barra: remada australiana na mesa ou remada com toalha na porta.",
    demo: { fonte: "MuscleWiki", url: "https://musclewiki.com/pt-br/exercise/pull-ups" },
  },
  {
    nome: "Agachamento", musculos: "Coxas · glúteos", series: 3, reps: () => "15–20 reps", descansoSeg: 60,
    video: "https://www.youtube.com/shorts/w6WJK9NnlK8", busca: "agachamento livre execução",
    comoFazer: ["Pés na largura dos ombros, pontas levemente para fora.", "Leve o quadril para trás e para baixo, como se fosse sentar.", "Peito erguido, calcanhares no chão, joelhos na direção dos pés.", "Desça até a coxa ficar paralela ao chão e suba empurrando o chão."],
    facil: "sente e levante de uma cadeira.",
  },
  {
    nome: "Afundo (passada)", musculos: "Coxas · glúteos · equilíbrio", series: 3, reps: () => "10 reps cada perna", descansoSeg: 60,
    video: "https://www.youtube.com/shorts/gFzol9TFkGM", busca: "afundo passada execução",
    comoFazer: ["Dê um passo largo à frente.", "Desça até os dois joelhos ficarem a uns 90°, joelho de trás perto do chão.", "Tronco reto.", "Volte empurrando com o pé da frente. Alterne as pernas."],
    facil: "faça menos fundo, apoiando a mão numa parede.",
  },
  {
    nome: "Abdominal supra", musculos: "Abdômen", series: 3, reps: () => "15–20 reps", descansoSeg: 45,
    video: "https://www.youtube.com/shorts/AZiKjSjipMo", busca: "abdominal supra execução correta",
    comoFazer: ["Deitado, joelhos dobrados, pés no chão.", "Mãos cruzadas no peito ou atrás da orelha (sem puxar o pescoço).", "Suba só as escápulas do chão, contraindo o abdômen.", "Solte o ar ao subir, desça devagar."],
    facil: "faça menos repetições, com o movimento bem curto.",
  },
  {
    nome: "Prancha", musculos: "Abdômen · lombar", series: 3, reps: () => "30–45 s", segurarSeg: 30, descansoSeg: 45,
    video: "https://www.youtube.com/shorts/rttTAImJW-A", busca: "prancha abdominal como fazer",
    comoFazer: ["Apoie antebraços e pontas dos pés.", "Corpo reto, sem levantar nem deixar cair o quadril.", "Contraia abdômen e glúteos.", "Respire normalmente o tempo todo, sem prender o ar."],
    facil: "joelhos no chão.",
  },
  {
    nome: "Panturrilha em pé", musculos: "Panturrilha", series: 3, reps: () => "20 reps", descansoSeg: 45,
    video: "https://www.youtube.com/shorts/GIhaVQ0Qwu0", busca: "panturrilha em pé degrau",
    comoFazer: ["Fique com a ponta dos pés num degrau, calcanhares para fora.", "Suba na ponta dos pés o máximo que der.", "Desça devagar até sentir alongar.", "Segure numa parede para equilíbrio."],
    facil: "faça no chão plano.",
  },
];

export const FORCA_B: Exercicio[] = [
  {
    nome: "Flexão pike (ombros)", musculos: "Ombros · tríceps", series: 3, reps: () => "8–12 reps", descansoSeg: 90,
    video: "https://www.youtube.com/shorts/__DfVDfxyrc", busca: "flexão pike ombro",
    comoFazer: ["Mãos no chão e quadril para cima, formando um \"V\" invertido.", "Dobre os cotovelos levando a cabeça em direção ao chão, entre as mãos.", "Empurre de volta. Cotovelos a uns 45°, não abertos para os lados.", "Vá só até onde não incomodar o ombro."],
    facil: "mãos numa cadeira ou sofá e amplitude menor.", demo: { fonte: "Fitwill", url: "https://fitwill.app/pt-br/exercise/3818/pike-push-up/" },
  },
  {
    nome: "Barra supinada ou remada australiana", musculos: "Bíceps · costas", series: 4,
    reps: (t) => (parseInt(t.barra, 10) >= 2 ? metade(t.barra, "") : "8–12 remadas"), descansoSeg: 90,
    video: "https://www.youtube.com/shorts/W_hpSqnsVpM", busca: "remada australiana em casa",
    comoFazer: ["Barra: palmas viradas para você, mãos na largura dos ombros, puxe até o queixo passar.", "Remada: deite sob uma mesa firme, segure a borda e mantenha o corpo reto.", "Puxe o peito em direção à mesa, cotovelos para trás.", "Desça controlando."],
    facil: "remada com os joelhos dobrados (pés mais perto).", demo: { fonte: "Fitwill", url: "https://fitwill.app/pt-br/exercise/3381/inverted-row-under-table/" },
  },
  {
    nome: "Mergulho na cadeira", musculos: "Tríceps", series: 3, reps: () => "10–15 reps", descansoSeg: 60,
    video: "https://www.youtube.com/shorts/nHbSlJJ0APs", busca: "mergulho no banco tríceps",
    comoFazer: ["Mãos na borda de uma cadeira firme, atrás de você.", "Pernas à frente, quadril perto da cadeira.", "Desça dobrando os cotovelos para trás até uns 90°.", "Suba estendendo os braços, sem encolher os ombros."],
    facil: "joelhos dobrados e descida mais curta.", demo: { fonte: "MuscleWiki", url: "https://musclewiki.com/pt-br/exercise/bench-dips" },
  },
  {
    nome: "Agachamento búlgaro", musculos: "Coxas · glúteos", series: 3, reps: () => "8–10 reps cada perna", descansoSeg: 60,
    video: "https://www.youtube.com/shorts/p_qNZJ50iO8", busca: "agachamento búlgaro em casa",
    comoFazer: ["De costas para uma cadeira, apoie o peito do pé de trás nela.", "Pé da frente uns 60 cm à frente.", "Desça até o joelho de trás chegar perto do chão.", "Suba empurrando com o calcanhar da frente."],
    facil: "apoie a mão numa parede ou faça o afundo comum.", demo: { fonte: "Tua Saúde", url: "https://www.tuasaude.com/agachamento-bulgaro/" },
  },
  {
    nome: "Ponte de glúteo (elevação pélvica no chão)", musculos: "Glúteos · posterior da coxa", series: 3, reps: () => "15–20 reps", descansoSeg: 45,
    video: "https://www.youtube.com/watch?v=bI-tvb6gxLw", busca: "ponte de glúteo como fazer",
    comoFazer: ["Deitado, joelhos dobrados, pés no chão.", "Suba o quadril até formar uma linha reta dos ombros aos joelhos.", "Aperte os glúteos 1–2 s no alto.", "Desça devagar."],
    facil: "menos repetições.",
  },
  {
    nome: "Elevação de pernas", musculos: "Abdômen inferior", series: 3, reps: () => "12–15 reps", descansoSeg: 45,
    video: "https://www.youtube.com/shorts/4aYP6NkOVlY", busca: "elevação de pernas deitado abdominal",
    comoFazer: ["Deitado, mãos ao lado do corpo ou sob o quadril.", "Pernas esticadas, suba até uns 90°.", "Desça devagar sem encostar no chão.", "Lombar sempre colada no chão."],
    facil: "joelhos dobrados.",
  },
  {
    nome: "Super-homem", musculos: "Lombar", series: 3, reps: () => "12–15 reps", descansoSeg: 45,
    video: "https://www.youtube.com/shorts/fgIgK1AzhMA", busca: "exercício super homem lombar",
    comoFazer: ["Deitado de bruços, braços esticados à frente.", "Suba braços e pernas juntos, alguns centímetros.", "Segure 1–2 s.", "Desça devagar."],
    facil: "suba só braços ou só pernas. Se a lombar incomodar, troque pelo perdigueiro (aba Coluna).",
  },
  {
    nome: "Prancha lateral", musculos: "Abdômen lateral", series: 2, reps: () => "20–30 s cada lado", segurarSeg: 25, descansoSeg: 30,
    video: "https://www.youtube.com/watch?v=A0RGKVDnUok", busca: "prancha lateral como fazer",
    comoFazer: ["De lado, apoiado no antebraço e na lateral do pé.", "Corpo reto, quadril alto.", "Respire normalmente.", "Troque de lado."],
    facil: "joelhos no chão.",
  },
];

export const COLUNA: ExercicioColuna[] = [
  {
    nome: "Retração do queixo", musculos: "Cervical (pescoço)", dose: "10 vezes · segure 5 s", segundos: 60, video: "https://www.youtube.com/watch?v=jCMjpUoAy70",
    comoFazer: ["Sentado ou em pé, coluna reta, olhando para frente.", "Puxe o queixo para trás, como se fosse fazer \"papada\", sem baixar a cabeça.", "Sinta o alongamento atrás do pescoço e segure 5 segundos.", "Solte e repita. Bom de fazer também nas pausas do estudo."],
  },
  {
    nome: "Gato e camelo", musculos: "Coluna inteira (mobilidade)", dose: "10 vezes, devagar", segundos: 60, video: "https://www.youtube.com/shorts/QoxSN4siCXA",
    comoFazer: ["De quatro apoios: mãos embaixo dos ombros, joelhos embaixo do quadril.", "Solte o ar e arredonde as costas para cima, olhando para o umbigo.", "Puxe o ar e afunde as costas devagar, olhando para frente.", "Movimento lento e sem dor, acompanhando a respiração."],
  },
  {
    nome: "Perdigueiro", musculos: "Lombar · abdômen · glúteos", dose: "8 de cada lado · segure 2–3 s", segundos: 120, video: "https://www.youtube.com/watch?v=5qilsXG8ufc",
    comoFazer: ["De quatro apoios, costas retas como uma mesa.", "Estique um braço à frente e a perna oposta para trás, ao mesmo tempo.", "Segure 2–3 segundos sem deixar o quadril girar ou a lombar afundar.", "Volte devagar e troque de lado."],
    facil: "estique só o braço ou só a perna.",
  },
  {
    nome: "Inseto morto", musculos: "Abdômen profundo · lombar", dose: "8 de cada lado", segundos: 90, video: "https://www.youtube.com/shorts/Bgn0OXKEX2o",
    comoFazer: ["Deitado de costas, braços esticados para o teto, joelhos dobrados no ar (90°).", "Cole a lombar no chão e mantenha assim o tempo todo.", "Desça devagar um braço para trás e a perna oposta para frente, perto do chão.", "Volte e troque de lado. Solte o ar ao esticar."],
    facil: "mexa só as pernas, um pé de cada vez encostando no chão.",
  },
  {
    nome: "Alongamento de peitoral na parede", musculos: "Peito · ombros (postura)", dose: "30 s de cada lado", segundos: 60, video: "https://www.youtube.com/watch?v=6Be-s3RwVp4",
    comoFazer: ["Apoie o antebraço numa parede ou batente, cotovelo na altura do ombro.", "Gire o corpo devagar para o lado oposto até sentir alongar o peito.", "Segure 30 segundos respirando normalmente, sem dor.", "Troque de lado."],
  },
];

const repetir = (vezes: number, correr: number, andar: number) =>
  Array.from({ length: vezes }, () => [
    { seg: correr, correr: true },
    { seg: andar, correr: false },
  ]).flat();

export const CORRIDA: SemanaCorrida[] = [
  { semana: 1, resumo: "10× (1 min correndo + 1 min andando)", fases: repetir(10, 60, 60) },
  { semana: 2, resumo: "8× (2 min correndo + 1 min andando)", fases: repetir(8, 120, 60) },
  { semana: 3, resumo: "6× (3 min correndo + 1 min andando)", fases: repetir(6, 180, 60) },
  { semana: 4, resumo: "4× (5 min correndo + 1 min andando)", fases: repetir(4, 300, 60) },
  { semana: 5, resumo: "3× (8 min correndo + 1 min andando)", fases: repetir(3, 480, 60) },
  { semana: 6, resumo: "2× (12 min correndo + 1 min andando)", fases: repetir(2, 720, 60) },
  { semana: 7, resumo: "20 min correndo direto", fases: [{ seg: 1200, correr: true }] },
  { semana: 8, resumo: "25–30 min correndo direto", fases: [{ seg: 1500, correr: true }] },
];

export interface SecaoGuia {
  titulo: string;
  intro?: string;
  numerada?: boolean;
  itens: string[];
  fim?: string;
}

export const GUIA: SecaoGuia[] = [
  { titulo: "O que você precisa", itens: ["Tênis de corrida com bom amortecimento.", "Barra fixa de porta (de encaixe, sem furar). Sem barra? Uma mesa firme serve para a remada.", "Uma cadeira firme (que não escorregue).", "Toalha ou tapete para o chão.", "Garrafa de água."] },
  { titulo: "Antes do primeiro treino", itens: ["Seu cardiologista recomendou exercício: pode começar, mas leve.", "Não treine no dia em que sentir tontura, dor no peito ou mal-estar.", "Coma algo leve 30 a 60 minutos antes e beba água. Não treine em jejum.", "Leia a parte de Cuidados, logo abaixo."] },
  {
    titulo: "Semana 1, dia 1: faça o teste", intro: "O teste mostra seu ponto de partida. Depois do aquecimento:", numerada: true,
    itens: ["Flexões: quantas conseguir seguidas, com o corpo reto. Pode ser com os joelhos no chão; só anote qual foi.", "Barras: quantas conseguir. Zero é normal no começo.", "Abdominais: quantos em 1 minuto.", "12 minutos correndo e/ou andando: anote a distância."],
    fim: "Descanse 3 a 5 minutos entre cada item e anote tudo em Progresso. O app ajusta as repetições sozinho.",
  },
  { titulo: "Como ler o treino", intro: "\"4 séries × 10 reps · descanso 90 s\" quer dizer:", itens: ["Repetição (rep): fazer o movimento uma vez (uma flexão = 1 rep).", "Série: um bloco de repetições seguidas (10 flexões = 1 série).", "Descanso: a pausa entre uma série e outra."], fim: "Ou seja: faça 10 flexões, descanse 90 s, repita até completar 4 vezes. Depois vá para o próximo exercício." },
  { titulo: "Como usar", itens: ["Terminou uma série? Toque em \"Série 1\": ela fica marcada e o descanso começa sozinho, com som e vibração no final.", "No cronômetro: +15 s se precisar de mais descanso, Pausar, Pular ou Parar.", "Como fazer: passo a passo e versão mais fácil. ▶ Ver vídeo: vídeo curto do exercício.", "No fim do treino de força, toque em \"Concluir treino de hoje\" para o app acompanhar sua evolução.", "Deixe a tela ligada durante o treino para o cronômetro funcionar bem."] },
  { titulo: "Como é um dia de treino", numerada: true, itens: ["Aquecimento guiado (8 min).", "Exercícios na ordem, marcando as séries.", "Rotina da coluna (7 min).", "Água e café da manhã com proteína."] },
  { titulo: "Primeiras 2 semanas", itens: ["Use a versão mais fácil de qualquer exercício que estiver difícil.", "Pode fazer 2 ou 3 séries em vez de 4. O importante é a técnica.", "Respire: solte o ar no esforço, nunca prenda.", "Termine cada série sentindo que ainda daria +2 reps.", "Dor muscular por 1 ou 2 dias depois é normal. Dor na articulação (joelho, ombro, punho) não é: diminua ou troque o exercício."] },
];

export const CUIDADOS = {
  sempre: ["Beba água antes, durante e depois (o diurético faz perder líquido).", "Evite treinar no sol forte do meio-dia.", "Não prenda a respiração no esforço.", "Levante devagar do chão entre os exercícios.", "Termine a corrida sempre caminhando 5 min.", "Na corrida, você precisa conseguir falar frases curtas. Não use frequência cardíaca: o remédio segura os batimentos."],
  urgencia: ["Dor no peito forte, em aperto, ou indo para braço, pescoço ou mandíbula.", "Falta de ar forte, suor frio, desmaio.", "Boca torta, fraqueza num lado do corpo, fala enrolada."],
  avisarMedico: ["Tontura frequente nos treinos.", "Cansaço a ponto de atrapalhar o dia.", "A dor leve no peito voltar."],
};

/** Checklist diário de saúde. `auto` = marcado sozinho pelo histórico de treino. */
export interface ItemChecklist {
  id: string;
  texto: string;
  auto?: "treino" | "coluna";
}

export const CHECKLIST: ItemChecklist[] = [
  { id: "remedio", texto: "💊 Remédio da pressão de manhã" },
  { id: "treino", texto: "🏋️ Treino do dia (ou descanso no domingo)", auto: "treino" },
  { id: "coluna", texto: "🧘 Rotina da coluna", auto: "coluna" },
  { id: "sal", texto: "🧂 Comi com pouco sal (sem embutidos e tempero pronto)" },
  { id: "proteina", texto: "🍳 Proteína nas refeições" },
  { id: "tela", texto: "📵 Celular longe 30 min antes de dormir" },
  { id: "sono", texto: "😴 Dormir até meia-noite" },
];

export const META_AGUA = 8; // copos
export const LIMITE_CAFE = 2; // xícaras
