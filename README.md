# Minha Rotina

PWA instalável no celular que organiza o seu dia: você fala ou escreve o que precisa fazer e os horários que não dá para mexer, e o app monta uma agenda com pausas, refeições e deslocamentos.

**100% grátis e offline**: sem IA paga, sem chave de API, sem servidor. Os dados ficam só no aparelho.

## Como funciona

1. **Planejar** — fale (ditado do Chrome, pt-BR) ou escreva do seu jeito.
2. O **interpretador local** (`src/interpretador.ts`) separa as atividades e reconhece:
   - horários fixos: "das 19h às 22h", "8h-12h", "às 15h", "ao meio-dia"
   - restrições: "depois das 18h", "antes das 12h"
   - durações: "2h", "1h30", "meia hora", "uma hora e meia", "45 minutos"
   - prioridade: "prova", "urgente", "importante", "prazo"
   - saídas de casa: mercado, farmácia, banco, médico, academia…
   - estimativa automática de duração quando não informada
3. Você **revisa a lista** (título, duração, horário fixo, prioridade, sair de casa).
4. O **organizador** (`src/organizador.ts`) monta a agenda:
   - mantém compromissos fixos (do texto + fixos da semana em Ajustes)
   - reserva café, almoço e jantar nos espaços livres
   - prioridades e prazos primeiro, tarefas longas cedo
   - divide tarefas longas em partes com pausa a cada *foco máximo*
   - ida e volta para tarefas fora de casa
   - lista o que não coube, com botão para passar para amanhã
5. Na **Agenda**: marque o que fez, "Atrasei — reorganizar a partir de agora", exportar `.ics`.

## Semana e metas

- **Metas** (aba Semana): "academia 3x depois das 18h", "estudar inglês 5h na semana", "ler 30 min por dia", "meditar nos dias úteis". Sessões espalhadas pelos dias com mais tempo livre, com barra de progresso.
- **Tarefas da semana**: "sexta pagar o boleto", "até quarta entregar o trabalho 2h", "quinta dentista às 15h", "lavar o carro no fim de semana". Dia exato → aquele dia; prazo → o quanto antes; sem dia → dia mais folgado (prioridades primeiro).
- **Organizar a semana** gera a agenda de cada dia (`src/semana.ts`), reservando 20% de folga para imprevistos.
- **Revisão semanal** (domingo após 18h ou segunda, configurável): ao abrir o app, mostra como foi a semana, quais metas manter e quais pendências levar, e recomeça. Lembrete recorrente opcional via `.ics` em Ajustes.

## Projetos de longo prazo

Para objetivos com carga horária e prazo (pós-graduação, curso, TCC, projeto de programação):

- Diga, por exemplo: "pós-graduação de 360 horas, já fiz 40h, tenho até junho", "projeto de programação 120h até março depois das 19h", "curso de inglês 80h em 6 meses", "TCC 100h até o fim do ano, sessões de 90 min".
- O app calcula o **ritmo semanal** = horas restantes ÷ semanas até o prazo (arredondado para meia hora) e o injeta como meta de horas em cada semana organizada (`src/projetos.ts`).
- O progresso soma as horas anteriores + todo bloco marcado como feito, em todas as semanas. Se você atrasar, o ritmo das próximas semanas sobe automaticamente; acima de 20h/semana, o app avisa.
- A revisão semanal mostra o andamento de cada projeto.

### Etapas dentro do projeto

Cada projeto pode ter etapas/atividades em ordem (ex.: "módulo de banco de dados 20h", "desenvolver o software de gestão 80h até março", "escrever o artigo final"). Sem horas, a etapa recebe estimativa de 10h.

- As horas da semana vão para as etapas em ordem; as sessões aparecem como "Pós-graduação: Desenvolver o software".
- Cada etapa mostra horas feitas × estimadas; ao passar da estimativa sem concluir, o app avisa e reserva +25% (mín. 1h).
- O ritmo semanal é o maior entre: carga do curso restante, soma do que falta nas etapas, e o necessário para cumprir o prazo de cada etapa. O cartão mostra o que está puxando o ritmo.

## Quebrar tarefas difíceis em passos

Qualquer tarefa (Planejar/Semana), etapa de projeto ou sessão no Modo Foco tem **🧩 Quebrar em passos**, com três jeitos:

- **✨ Quebrar para mim** (automático, offline, grátis — `src/quebrador.ts`): reconhece o tipo pelo título e aplica um roteiro com o assunto da tarefa — programação (bug, deploy, banco/tabela, API, tela/front, software em geral), estudo/prova/aula, leitura, escrita (artigo/TCC/relatório), apresentação, limpeza, e-mails, mercado, ou um roteiro genérico. **✨ Refazer** substitui a lista.
- **🤖 IA grátis**: abre o ChatGPT (versão gratuita) com o pedido pronto ("5 a 10 passos de 5–15 min, um por linha"). **📋 Colar passos** abre uma caixa (preenchida automaticamente se o navegador permitir ler a área de transferência) e converte a resposta — remove numeração, marcadores, negrito e frases de introdução.
- **Você mesmo**: escreva ou fale os passinhos ("criar o componente, validar e-mail e senha e depois conectar com a API").

- No **Modo Foco**, aparece só **"👉 Próximo passo"** em destaque, com o checklist dos que faltam.
- Na agenda, cada bloco mostra o andamento (🧩 1/4). Marcar em qualquer lugar atualiza a tarefa/etapa de origem — passos de uma etapa acompanham todas as sessões dela, em qualquer dia.

## Pomodoro

Ligado por padrão (Ajustes → 🍅 Pomodoro): 25 min de foco, 5 de pausa, 15 de pausa longa a cada 4 ciclos — tudo ajustável.

- **Agenda:** blocos de tarefa saem em pomodoros numerados (🍅 1, 🍅 2…) com pausas curtas e longas; sobras < 10 min são absorvidas.
- **Modo Foco:** contagem regressiva por fase, troca automática foco ↔ pausa com vibração/notificação, pausar/retomar, pular fase, bolinhas do ciclo e contador de pomodoros do dia.
- A revisão semanal mostra quantos pomodoros você fez.

## Modo Foco e anti-travamento

- Na Agenda, ▶ em uma tarefa abre o Modo Foco (cronômetro; sobrevive a fechar o app; pode minimizar).
- **😵 Travei**: descreva a dúvida (voz ou texto) e tente sozinho pelo tempo limite (padrão 20 min, em Ajustes), com dicas para destravar.
- Ao estourar o tempo: vibra/notifica e oferece ajuda com a dúvida já preenchida — ChatGPT, Claude (pergunta pede dicas passo a passo, não a resposta pronta), Google, YouTube, Stack Overflow ou copiar a pergunta.
- **Resolvi** / **Anotar e seguir**: tudo vira registro. Dúvidas não resolvidas aparecem em "Dúvidas em aberto" (aba Semana) e na revisão semanal, junto com o tempo total travado.

## Usar no celular e no computador

O app funciona em qualquer navegador moderno (Chrome/Edge no PC também instalam como app). Os dados de cada aparelho ficam nele — para levar de um para o outro, sem conta nem servidor:

1. No aparelho onde você mexeu por último: **Ajustes → 📤 Enviar meus dados** (abre o compartilhar: WhatsApp, Drive, e-mail; sem suporte, baixa o arquivo).
2. No outro: **📥 Receber dados de outro aparelho** e escolha o arquivo.

A troca **junta** em vez de substituir (`src/troca.ts`): cada dia da agenda, lista do dia, semana, configuração e projetos guardam a hora da última alteração, e fica a versão mais recente de cada um; o que só existe em um aparelho é mantido; pomodoros ficam com a maior contagem do dia; dúvidas se somam (resolvida em qualquer aparelho = resolvida). Importar o mesmo arquivo de novo não muda nada.

## Onde ficam os dados

Tudo fica no `localStorage` do navegador do aparelho (chaves `rotina.*`): configurações, listas, agendas, blocos feitos, semanas, metas, projetos, travamentos e o foco em andamento. Não há servidor nem sincronização.

- O app pede **armazenamento persistente** ao navegador para reduzir o risco de limpeza automática.
- Limpar dados do Chrome, desinstalar o app ou trocar de celular **apaga tudo** — use **Ajustes → Baixar backup** (.json) e **Restaurar backup** (este substitui tudo; para trocar entre aparelhos use Enviar/Receber).

## Stack

React 19 + TypeScript + Vite + `vite-plugin-pwa`. Sem dependências de runtime além do React.

## Rodar localmente

```bash
npm install
npm run dev        # desenvolvimento
npm run build      # gera dist/
npm run preview    # serve o build
```

## Instalar no Android

O PWA precisa de **HTTPS** (microfone e instalação não funcionam via IP da rede local). Publique a pasta `dist/` em um host estático gratuito (Vercel, Netlify, GitHub Pages, Cloudflare Pages), abra o link no Chrome do celular e toque em **⋮ → Instalar app**.

## Estrutura

| Arquivo | Papel |
|---|---|
| `src/interpretador.ts` | Texto livre → itens (horários, durações, prioridade) e fixos da semana |
| `src/organizador.ts` | Algoritmo que encaixa tudo na agenda do dia |
| `src/semana.ts` | Metas, tarefas da semana, distribuição e progresso |
| `src/projetos.ts` / `src/ProjetosCard.tsx` | Projetos de longo prazo (horas até um prazo) |
| `src/SemanaView.tsx` / `src/RevisaoSemanal.tsx` | Aba Semana e janela de revisão |
| `src/Passos.tsx` / `src/passosUtil.ts` | Checklist de passos pequenos (tarefas e etapas) |
| `src/quebrador.ts` | Quebra automática por roteiros + pergunta/colagem de IA grátis |
| `src/ModoFoco.tsx` | Cronômetro de foco e fluxo “Travei → tentar → pedir ajuda” |
| `src/useDitado.ts` | Hook de reconhecimento de voz (Web Speech API) |
| `src/agenda.ts` | Datas, exportação .ics, notificações |
| `src/troca.ts` | Troca entre aparelhos por arquivo, com mesclagem pelo mais recente |
| `src/storage.ts` | Persistência local, backup/restauração e armazenamento persistente |
| `src/App.tsx` | Interface (Agenda, Planejar, Ajustes) |
