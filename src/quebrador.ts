import { normalizar, novoId } from "./interpretador";
import type { Passo } from "./types";

/**
 * Quebra automática de tarefas em passos pequenos, sem IA: reconhece o tipo de
 * tarefa pelo título e aplica um roteiro, encaixando o assunto da tarefa nos passos.
 */

const VERBOS_INICIAIS =
  /^(fazer|criar|desenvolver|implementar|programar|construir|terminar|finalizar|concluir|estudar|revisar|ler|escrever|redigir|preparar|montar|resolver|corrigir|arrumar|organizar|limpar|responder|ir ao|ir a|ir na|ir no|ir|comprar|entregar|assistir|aprender|praticar|configurar|publicar|subir)\s+(?:a |o |as |os |um |uma |uns |umas )?/i;

/** "Fazer a tela de login do software" → "tela de login do software" */
export function assuntoDe(titulo: string): string {
  return titulo
    .replace(/\s*\((?:parte|🍅) \d+\)$/, "")
    .replace(/^.*?:\s*/, (m) => (m.length < titulo.length - 3 ? "" : m)) // "Pós: Desenvolver X" → "Desenvolver X"
    .replace(VERBOS_INICIAIS, "")
    .replace(/^(?:para|pra|pro|sobre)\s+(?:a |o |as |os )?/i, "")
    .trim();
}

type Roteiro = (assunto: string) => string[];

const ROTEIROS: [RegExp, Roteiro][] = [
  // ---------- Programação ----------
  [
    /\b(bug|erro|corrigir|consertar|falha|quebrado|nao funciona)\b/,
    (a) => [
      `Reproduzir o problema e anotar os passos exatos: ${a}`,
      "Ler a mensagem de erro inteira e anotar arquivo e linha",
      "Isolar: descobrir a menor parte do código que causa o erro",
      "Escrever uma hipótese do motivo em 1 frase",
      "Testar a hipótese com um log ou breakpoint",
      "Aplicar a correção",
      "Testar de novo o caminho que quebrava e um caminho normal",
      "Fazer commit explicando a causa e a correção",
    ],
  ],
  [
    /\b(deploy|publicar|subir|hospedar|producao|servidor)\b/,
    (a) => [
      `Listar o que precisa estar pronto para publicar: ${a}`,
      "Rodar o build localmente e corrigir erros",
      "Conferir variáveis de ambiente e segredos (sem commitar senhas)",
      "Escolher/abrir o serviço de hospedagem e criar o projeto",
      "Fazer o primeiro deploy",
      "Testar o site/app publicado no celular e no computador",
      "Anotar no README como publicar de novo",
    ],
  ],
  [
    /\b(banco|tabela|modelagem|modelar|sql|migration|migracao|entidade|diagrama)\b/,
    (a) => [
      `Listar as informações que precisam ser guardadas: ${a}`,
      "Desenhar as tabelas/entidades e os relacionamentos (papel serve)",
      "Definir chaves primárias, estrangeiras e tipos de cada campo",
      "Escrever o script/migration de criação",
      "Rodar e conferir se as tabelas foram criadas",
      "Inserir alguns dados de teste",
      "Testar as consultas principais",
      "Fazer commit",
    ],
  ],
  [
    /\b(api|endpoint|backend|rota|servico|integracao|integrar)\b/,
    (a) => [
      `Escrever em 1 frase o que recebe e o que devolve: ${a}`,
      "Definir rota, método e formato do JSON de entrada e saída",
      "Criar a rota retornando um valor fixo (só para testar)",
      "Implementar a lógica real",
      "Validar os dados de entrada e tratar erros",
      "Testar com Postman/Insomnia/curl (caso certo e caso errado)",
      "Fazer commit",
    ],
  ],
  [
    /\b(tela|pagina|componente|frontend|front|layout|interface|formulario|login|cadastro|dashboard|menu)\b/,
    (a) => [
      `Rabiscar como vai ficar (papel ou Figma, 5 min): ${a}`,
      "Criar o arquivo do componente com um texto fixo aparecendo",
      "Montar a estrutura (campos, botões, listas) sem estilo",
      "Ligar os dados/estado e os eventos (cliques, envio)",
      "Conectar com a API ou com os dados reais",
      "Tratar carregando, erro e lista vazia",
      "Ajustar o visual e testar no celular",
      "Fazer commit",
    ],
  ],
  [
    /\b(software|sistema|app|aplicativo|projeto|funcionalidade|feature|programar|codigo|implementar|desenvolver|crud|site)\b/,
    (a) => [
      `Reler o requisito e escrever em 1 frase o que é “${a}” pronto`,
      "Abrir o projeto e criar uma branch para isso",
      "Listar as partes/arquivos que vão mudar",
      "Fazer a versão mais simples que funcione (sem capricho)",
      "Testar o caminho principal",
      "Tratar erros e casos estranhos",
      "Organizar o código e dar nomes melhores",
      "Escrever ou rodar os testes",
      "Fazer commit com mensagem clara",
    ],
  ],
  // ---------- Estudo ----------
  [
    /\b(prova|estudar|estudo|revisar|revisao|materia|conteudo|aula|modulo|curso|disciplina|videoaula|assistir|aprender)\b/,
    (a) => [
      `Separar o material e escolher só um tópico: ${a}`,
      "Ver/ler o tópico uma vez sem anotar (visão geral)",
      "Anotar com suas palavras os 3 a 5 conceitos principais",
      "Fazer 3 exercícios ou exemplos práticos",
      "Corrigir e anotar onde errou",
      "Explicar o tópico em voz alta em 2 minutos",
      "Criar 3 flashcards/perguntas para revisar depois",
    ],
  ],
  [
    /\b(ler|leitura|livro|capitulo|artigo cientifico|paper|texto)\b/,
    (a) => [
      `Ler título, resumo e subtítulos (5 min): ${a}`,
      "Escrever 2 perguntas que você quer responder com a leitura",
      "Ler a primeira seção",
      "Ler as seções seguintes, marcando as ideias principais",
      "Responder as 2 perguntas",
      "Resumir em 5 linhas com suas palavras",
    ],
  ],
  // ---------- Escrita ----------
  [
    /\b(escrever|redigir|artigo|tcc|monografia|relatorio|redacao|documentacao|resumo|ensaio|dissertacao)\b/,
    (a) => [
      `Escrever em 1 frase o objetivo do texto: ${a}`,
      "Listar os tópicos (esqueleto do texto)",
      "Juntar referências e anotações de cada tópico",
      "Rascunhar a introdução sem se preocupar com qualidade",
      "Rascunhar o desenvolvimento, um tópico por vez",
      "Rascunhar a conclusão",
      "Revisar lendo em voz alta",
      "Formatar e conferir as referências (ABNT)",
    ],
  ],
  [
    /\b(apresentacao|slides?|seminario|pitch|palestra)\b/,
    (a) => [
      `Definir a mensagem principal em 1 frase: ${a}`,
      "Listar os tópicos, um por slide",
      "Criar os slides só com títulos",
      "Preencher o conteúdo (pouco texto, mais imagens)",
      "Ensaiar uma vez cronometrando",
      "Cortar o que passou do tempo e ensaiar de novo",
    ],
  ],
  // ---------- Casa e vida ----------
  [
    /\b(limpar|limpeza|faxina|arrumar|organizar)\b/,
    (a) => [
      `Pegar um saco e jogar fora o óbvio (5 min): ${a}`,
      "Guardar o que está fora do lugar",
      "Tirar o pó das superfícies",
      "Varrer ou aspirar",
      "Passar pano",
      "Levar o lixo para fora",
    ],
  ],
  [
    /\b(e-?mails?|mensagens|whatsapp|caixa de entrada|inbox)\b/,
    () => [
      "Abrir a caixa e arquivar o que não precisa de resposta",
      "Responder tudo que leva menos de 2 minutos",
      "Listar os que precisam de mais tempo",
      "Responder o mais importante da lista",
      "Agendar ou anotar os restantes",
    ],
  ],
  [
    /\b(mercado|supermercado|compras|feira)\b/,
    () => [
      "Ver o que falta na geladeira e no armário",
      "Fazer a lista separada por seção",
      "Pegar sacolas, carteira e a lista",
      "Fazer as compras seguindo a lista",
      "Guardar as compras",
    ],
  ],
];

const GENERICO: Roteiro = (a) => [
  `Escrever em 1 frase como fica “${a}” pronto`,
  "Separar o que vai precisar (material, arquivos, ferramentas)",
  "Fazer a primeira parte bem pequena (10 min)",
  "Fazer a parte principal",
  "Revisar o resultado",
  "Finalizar e avisar/entregar quem precisa",
];

/** Gera os passos automaticamente a partir do título (e do contexto, ex.: nome do projeto). */
export function quebrarAutomatico(titulo: string, contexto = ""): Passo[] {
  const n = normalizar(`${titulo} ${contexto}`);
  const nTitulo = normalizar(titulo);
  // O título manda; o contexto (ex.: "pós em desenvolvimento") só desempata
  const roteiro = ROTEIROS.find(([re]) => re.test(nTitulo))?.[1] ?? ROTEIROS.find(([re]) => re.test(n))?.[1] ?? GENERICO;
  const assunto = assuntoDe(titulo) || titulo;
  return roteiro(assunto).map((texto) => ({ id: novoId(), texto, feito: false }));
}

/** Pergunta pronta para uma IA gratuita. */
export function perguntaQuebrar(titulo: string, contexto = ""): string {
  return (
    `Quebre a tarefa "${assuntoDe(titulo) || titulo}"${contexto ? ` (contexto: ${contexto})` : ""} em 5 a 10 passos pequenos e concretos, ` +
    `de 5 a 15 minutos cada, começando com verbo no infinitivo. Responda só com a lista, um passo por linha, sem explicações.`
  );
}

/** Converte a resposta colada da IA ("1. Fazer x", "- **Fazer y**") em passos. */
export function passosDaResposta(texto: string): Passo[] {
  return texto
    .split(/\r?\n/)
    .map((l) =>
      l
        .replace(/^\s*(?:[-*•–]|\d+[.)]|passo\s*\d+\s*[:.-])\s*/i, "")
        .replace(/\*\*|__|`/g, "")
        .trim(),
    )
    .filter((l) => l.length > 2 && l.length < 200 && !/:$/.test(l))
    .map((l) => ({ id: novoId(), texto: l.charAt(0).toUpperCase() + l.slice(1), feito: false }));
}
