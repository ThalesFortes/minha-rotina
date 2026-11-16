import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { agendarNotificacoes, baixarArquivo, gerarICS, gerarLembreteSemanal, hojeISO, paraData } from "./agenda";
import { fixosDoDia, interpretarTexto, novoId, paraMin } from "./interpretador";
import { ItemTarefa } from "./ItemTarefa";
import { ModoFoco } from "./ModoFoco";
import { resumoPassos } from "./passosUtil";
import { organizar } from "./organizador";
import { metasDaSemana, ritmoProjeto } from "./projetos";
import { RevisaoSemanal } from "./RevisaoSemanal";
import { diaMes, distribuirSemana, nomeCurto, semanaAlvo, somarDias } from "./semana";
import { SemanaView } from "./SemanaView";
import {
  carregarAdiada,
  carregarConfig,
  carregarFoco,
  carregarPomodoros,
  carregarProjetos,
  carregarTravamentos,
  exportarTudo,
  importarTudo,
  pedirArmazenamentoPersistente,
  carregarSemanas,
  salvarAdiada,
  salvarFoco,
  salvarPomodoros,
  salvarProjetos,
  salvarTravamentos,
  salvarSemanas,
  carregarListas,
  carregarPlanos,
  carregarRascunho,
  salvarConfig,
  salvarListas,
  salvarPlanos,
  salvarRascunho,
} from "./storage";
import type { Bloco, Config, Foco, Meta, Passo, Plano, Projeto, Semana, Tarefa, Travamento } from "./types";
import { useDitado } from "./useDitado";

type Aba = "agenda" | "novo" | "semana" | "ajustes";

const ICONE: Record<Bloco["tipo"], string> = {
  fixo: "📌",
  tarefa: "✅",
  pausa: "☕",
  refeicao: "🍽️",
  deslocamento: "🚶",
};

const agoraMin = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};

export default function App() {
  const [config, setConfig] = useState<Config>(carregarConfig);
  const [planos, setPlanos] = useState<Record<string, Plano>>(carregarPlanos);
  const [listas, setListas] = useState<Record<string, Tarefa[]>>(carregarListas);
  const [aba, setAba] = useState<Aba>("novo");
  const [dia, setDia] = useState<string>(hojeISO());
  const [texto, setTexto] = useState<string>(carregarRascunho);
  const [aviso, setAviso] = useState("");
  const [agora, setAgora] = useState(() => Date.now());
  const [semanas, setSemanas] = useState<Record<string, Semana>>(carregarSemanas);
  const [adiada, setAdiada] = useState<string>(carregarAdiada);
  const [projetos, setProjetos] = useState<Projeto[]>(carregarProjetos);
  const [travamentos, setTravamentos] = useState<Travamento[]>(carregarTravamentos);
  const [foco, setFoco] = useState<Foco | null>(carregarFoco);
  const [focoAberto, setFocoAberto] = useState(() => !!carregarFoco());
  const [persistente, setPersistente] = useState<boolean | null>(null);
  const [pomodoros, setPomodoros] = useState<Record<string, number>>(carregarPomodoros);

  const hoje = hojeISO();
  const alvo = semanaAlvo(hoje, agoraMin(), config.revisao);
  const semana: Semana = semanas[alvo] ?? { inicio: alvo, metas: [], tarefas: [], naoCouberam: [] };
  const anteriores = Object.keys(semanas).filter((k) => k < alvo).sort();
  const semanaAnterior = anteriores.length ? semanas[anteriores[anteriores.length - 1]] : undefined;
  const mostrarRevisao = !semanas[alvo] && !!semanaAnterior && adiada !== hoje;

  const plano = planos[dia];
  const lista = listas[dia] ?? plano?.tarefas ?? [];

  const ditado = useDitado((trecho) => setTexto((t) => (t ? `${t.trimEnd()} ${trecho}` : trecho)));

  useEffect(() => salvarRascunho(texto), [texto]);
  useEffect(() => salvarPlanos(planos), [planos]);
  useEffect(() => salvarListas(listas), [listas]);
  useEffect(() => salvarConfig(config), [config]);
  useEffect(() => salvarSemanas(semanas), [semanas]);
  useEffect(() => salvarAdiada(adiada), [adiada]);
  useEffect(() => salvarProjetos(projetos), [projetos]);
  useEffect(() => salvarTravamentos(travamentos), [travamentos]);
  useEffect(() => salvarFoco(foco), [foco]);
  useEffect(() => salvarPomodoros(pomodoros), [pomodoros]);
  useEffect(() => {
    pedirArmazenamentoPersistente().then(setPersistente);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!config.notificacoes || !plano) return;
    return agendarNotificacoes(plano);
  }, [plano, config.notificacoes]);

  const setLista = (l: Tarefa[]) => setListas((ls) => ({ ...ls, [dia]: l }));
  const editar = (id: string, mud: Partial<Tarefa>) => setLista(lista.map((t) => (t.id === id ? { ...t, ...mud } : t)));

  function adicionarDoTexto() {
    if (ditado.ouvindo) ditado.parar();
    const novos = interpretarTexto(texto);
    if (!novos.length) {
      setAviso("Não encontrei nenhuma atividade no texto.");
      return;
    }
    setLista([...lista, ...novos]);
    setTexto("");
    setAviso("");
  }

  function gerar(aPartirDeAgora: boolean, tarefas = lista) {
    const ehHoje = dia === hojeISO();
    const novo = organizar({
      data: dia,
      tarefas,
      config,
      feitos: plano?.blocos.filter((b) => b.feito) ?? [],
      inicioMin: ehHoje && (aPartirDeAgora || agoraMin() > paraMin(config.acordar)) ? agoraMin() : 0,
    });
    setPlanos((ps) => ({ ...ps, [dia]: novo }));
    setListas((ls) => ({ ...ls, [dia]: tarefas }));
    setAviso("");
    setAba("agenda");
  }

  const setSemana = (s: Semana) => {
    setSemanas((ss) => ({ ...ss, [s.inicio]: s }));
    // Passos editados na semana valem também nas cópias já distribuídas nos dias
    const porId = new Map(s.tarefas.filter((t) => t.passos).map((t) => [t.id, t.passos]));
    if (porId.size) sincronizarTarefas((t) => (porId.has(t.id) ? { ...t, passos: porId.get(t.id) } : t), false);
  };

  /** Aplica uma mudança em todas as cópias de tarefas (listas do dia, planos e, opcionalmente, semanas). */
  function sincronizarTarefas(f: (t: Tarefa) => Tarefa, incluirSemanas = true) {
    const mapa = <T extends { tarefas: Tarefa[] }>(o: T): T => ({ ...o, tarefas: o.tarefas.map(f) });
    setListas((ls) => Object.fromEntries(Object.entries(ls).map(([k, l]) => [k, l.map(f)])));
    setPlanos((ps) => Object.fromEntries(Object.entries(ps).map(([k, p]) => [k, mapa(p)])));
    if (incluirSemanas) setSemanas((ss) => Object.fromEntries(Object.entries(ss).map(([k, s]) => [k, mapa(s)])));
  }

  /** Tarefa (e etapa de projeto, se houver) por trás de um bloco da agenda. */
  function origemDoBloco(data: string, tarefaId?: string) {
    if (!tarefaId) return {};
    const tarefa = (listas[data] ?? []).find((t) => t.id === tarefaId) ?? planos[data]?.tarefas.find((t) => t.id === tarefaId);
    const etapa = tarefa?.etapaId
      ? projetos.find((p) => p.id === tarefa.metaId)?.etapas?.find((e) => e.id === tarefa.etapaId)
      : undefined;
    return { tarefa, etapa };
  }

  const passosDoBloco = (data: string, tarefaId?: string): Passo[] | undefined => {
    const { tarefa, etapa } = origemDoBloco(data, tarefaId);
    return etapa ? etapa.passos : tarefa?.passos;
  };

  function salvarPassos(data: string, tarefaId: string, passos: Passo[]) {
    const { tarefa, etapa } = origemDoBloco(data, tarefaId);
    if (etapa && tarefa?.metaId) {
      setProjetos((ps) =>
        ps.map((p) => (p.id === tarefa.metaId ? { ...p, etapas: p.etapas?.map((e) => (e.id === etapa.id ? { ...e, passos } : e)) } : p)),
      );
    } else sincronizarTarefas((t) => (t.id === tarefaId ? { ...t, passos } : t));
  }

  function organizarSemana() {
    const metasProjetos = projetos
      .flatMap((p) => metasDaSemana(p, ritmoProjeto(p, planos, semana.inicio), planos, semana.inicio));
    const r = distribuirSemana({
      semana: { ...semana, metas: [...metasProjetos, ...semana.metas] },
      config,
      planos,
      listas,
      hoje,
      agoraMin: agoraMin(),
    });
    setPlanos((ps) => ({ ...ps, ...r.planos }));
    setListas((ls) => ({ ...ls, ...r.listas }));
    setSemana({ ...semana, naoCouberam: r.naoCouberam, organizadaEm: new Date().toISOString() });
    setAviso("");
  }

  function recomecar(metas: Meta[], pendentes: Tarefa[]) {
    setSemana({
      inicio: alvo,
      metas,
      tarefas: pendentes.map((t) => ({ ...t, id: novoId(), dia: undefined, ateDia: undefined, semana: true })),
      naoCouberam: [],
    });
    setAba("semana");
  }

  function passarParaAmanha() {
    if (!plano) return;
    const amanha = hojeISO(1);
    const titulos = new Set(plano.naoCouberam.map((n) => n.titulo));
    const minutos = new Map(
      plano.naoCouberam.map((n) => [n.titulo, Number(/Faltaram (\d+)/.exec(n.motivo)?.[1]) || undefined]),
    );
    const movidas = plano.tarefas
      .filter((t) => !t.inicio && titulos.has(t.titulo))
      .map((t) => ({ ...t, id: novoId(), duracaoMin: minutos.get(t.titulo) ?? t.duracaoMin, depoisDe: undefined, antesDe: undefined }));
    const existentes = listas[amanha] ?? planos[amanha]?.tarefas ?? [];
    setListas((ls) => ({ ...ls, [amanha]: [...existentes, ...movidas] }));
    setDia(amanha);
    setAba("novo");
    setAviso(`${movidas.length} ${movidas.length === 1 ? "tarefa passou" : "tarefas passaram"} para amanhã. Revise e toque em Organizar.`);
  }

  function iniciarFoco(b: Bloco) {
    setFoco({ data: dia, inicioBloco: b.inicio, fimBloco: b.fim, titulo: b.titulo, inicioTs: Date.now(), tarefaId: b.tarefaId });
    setFocoAberto(true);
  }

  function concluirFoco() {
    if (!foco) return;
    if (foco.travado) {
      const minutos = Math.max(1, Math.round((Date.now() - foco.travado.inicioTs) / 60000));
      setTravamentos((ts) => [
        ...ts,
        { id: novoId(), data: foco.data, tarefa: foco.titulo, descricao: foco.travado!.descricao, minutos, resolvido: false, ajuda: foco.travado!.ajuda },
      ]);
    }
    setPlanos((ps) => {
      const p = ps[foco.data];
      if (!p) return ps;
      const blocos = p.blocos.map((b) => (b.inicio === foco.inicioBloco && b.titulo === foco.titulo ? { ...b, feito: true } : b));
      return { ...ps, [foco.data]: { ...p, blocos } };
    });
    setFoco(null);
    setFocoAberto(false);
  }

  function baixarBackup() {
    baixarArquivo(`minha-rotina-backup-${hoje}.json`, exportarTudo(), "application/json");
  }

  async function restaurarBackup(arquivo: File | undefined) {
    if (!arquivo) return;
    try {
      importarTudo(await arquivo.text());
      location.reload();
    } catch (e) {
      setAviso(e instanceof Error ? e.message : "Não consegui ler o backup.");
    }
  }

  const duvidasAbertas = travamentos.filter((t) => !t.resolvido);

  function alternarFeito(i: number) {
    if (!plano) return;
    const blocos = plano.blocos.map((b, j) => (j === i ? { ...b, feito: !b.feito } : b));
    setPlanos((ps) => ({ ...ps, [dia]: { ...plano, blocos } }));
  }

  const blocoAtual = useMemo(() => {
    if (!plano || dia !== hojeISO()) return -1;
    return plano.blocos.findIndex((b) => {
      const ini = paraData(plano.data, b.inicio).getTime();
      const fim = paraData(plano.data, b.fim).getTime();
      return agora >= ini && agora < fim;
    });
  }, [plano, dia, agora]);

  const progresso = plano
    ? (() => {
        const tarefas = plano.blocos.filter((b) => b.tipo === "tarefa");
        return { feitas: tarefas.filter((b) => b.feito).length, total: tarefas.length };
      })()
    : null;

  const [a, m, d] = dia.split("-").map(Number);
  const fixosHoje = fixosDoDia(config.compromissosFixos, new Date(a, m - 1, d).getDay());

  async function ativarNotificacoes(ativar: boolean) {
    if (ativar && "Notification" in window) {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setAviso("Permissão de notificação negada nas configurações do navegador.");
        return;
      }
    }
    setConfig({ ...config, notificacoes: ativar });
  }

  return (
    <div className="app">
      <header className="topo">
        <h1>Minha Rotina</h1>
      </header>
      <div className="faixa-dias" role="tablist">
        {Array.from({ length: 7 }, (_, i) => somarDias(hoje, i)).map((dd, i) => (
          <button key={dd} className={dia === dd ? "ativo" : ""} onClick={() => setDia(dd)}>
            <small>{i === 0 ? "Hoje" : i === 1 ? "Amanhã" : nomeCurto(dd)}</small>
            <strong>{diaMes(dd)}</strong>
          </button>
        ))}
      </div>

      <main className="conteudo">
        {aviso && (
          <div className="erro" role="alert">
            {aviso}
            <button onClick={() => setAviso("")} aria-label="Fechar">
              ×
            </button>
          </div>
        )}

        {aba === "novo" && (
          <>
            <section className="cartao">
              <h2>O que você precisa fazer?</h2>
              <p className="dica">
                Fale ou escreva do seu jeito. Ex.: “tenho aula das 19h às 22h, preciso estudar 2h para a prova, ir ao
                mercado e responder os e-mails”.
              </p>

              <textarea
                value={texto + (ditado.parcial ? ` ${ditado.parcial}` : "")}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Digite aqui ou toque em Falar…"
                rows={4}
                readOnly={ditado.ouvindo}
              />

              <div className="acoes">
                {ditado.suportado && (
                  <button
                    className={`mic ${ditado.ouvindo ? "gravando" : ""}`}
                    onClick={ditado.ouvindo ? ditado.parar : ditado.iniciar}
                    aria-label={ditado.ouvindo ? "Parar ditado" : "Ditar por voz"}
                  >
                    {ditado.ouvindo ? "⏹ Parar" : "🎙️ Falar"}
                  </button>
                )}
                <button className="primario" disabled={!texto.trim() && !ditado.parcial} onClick={adicionarDoTexto}>
                  ➕ Adicionar à lista
                </button>
              </div>
              {ditado.erro && <p className="aviso">{ditado.erro}</p>}
            </section>

            <section className="cartao">
              <div className="cabecalho-lista">
                <h2>Lista do dia</h2>
                {lista.length > 0 && (
                  <button className="link" onClick={() => setLista([])}>
                    Limpar
                  </button>
                )}
              </div>

              {fixosHoje.length > 0 && (
                <p className="dica">
                  📌 Fixos da semana: {fixosHoje.map((f) => `${f.titulo} ${f.inicio}–${f.fim}`).join(" · ")}
                </p>
              )}

              {lista.length === 0 && <p className="dica">Nada ainda. Fale ou escreva acima e toque em Adicionar.</p>}

              <ul className="lista-tarefas">
                {lista.map((t) => (
                  <ItemTarefa
                    key={t.id}
                    tarefa={t}
                    onChange={(mud) => editar(t.id, mud)}
                    onRemove={() => setLista(lista.filter((x) => x.id !== t.id))}
                  />
                ))}
              </ul>

              <button
                className="secundario largo"
                onClick={() => setLista([...lista, { id: novoId(), titulo: "Nova tarefa", duracaoMin: 30, prioridade: false, fora: false }])}
              >
                + Item manual
              </button>
              <button className="primario largo" disabled={!lista.length && !fixosHoje.length} onClick={() => gerar(false)}>
                🗓️ Organizar meu dia
              </button>
            </section>
          </>
        )}

        {aba === "agenda" &&
          (plano ? (
            <section>
              <div className="cartao resumo">
                <p>{plano.resumo}</p>
                {progresso && progresso.total > 0 && (
                  <div className="barra" aria-label={`${progresso.feitas} de ${progresso.total} blocos`}>
                    <div style={{ width: `${(progresso.feitas / progresso.total) * 100}%` }} />
                    <span>
                      {progresso.feitas}/{progresso.total} blocos de tarefa
                    </span>
                  </div>
                )}
              </div>

              <ol className="linha-tempo">
                {plano.blocos.map((b, i) => (
                  <li
                    key={`${b.inicio}-${i}`}
                    className={`bloco ${b.tipo} ${b.feito ? "feito" : ""} ${i === blocoAtual ? "atual" : ""}`}
                  >
                    <div className="hora">
                      <strong>{b.inicio}</strong>
                      <span>{b.fim}</span>
                    </div>
                    <div className="info">
                      <span className="titulo">
                        {ICONE[b.tipo]} {b.titulo}
                      </span>
                      {b.observacao && <span className="obs">{b.observacao}</span>}
                      {resumoPassos(passosDoBloco(plano.data, b.tarefaId)) && (
                        <span className="obs">{resumoPassos(passosDoBloco(plano.data, b.tarefaId))} passos</span>
                      )}
                    </div>
                    {b.tipo === "tarefa" && !b.feito && (
                      <button className="icone play" onClick={() => iniciarFoco(b)} aria-label={`Começar ${b.titulo} em modo foco`}>
                        ▶
                      </button>
                    )}
                    {b.tipo !== "pausa" && b.tipo !== "deslocamento" && (
                      <input
                        type="checkbox"
                        checked={!!b.feito}
                        onChange={() => alternarFeito(i)}
                        aria-label={`Concluir ${b.titulo}`}
                      />
                    )}
                  </li>
                ))}
              </ol>

              {plano.naoCouberam.length > 0 && (
                <div className="cartao nao-coube">
                  <h3>Não coube</h3>
                  <ul>
                    {plano.naoCouberam.map((n, i) => (
                      <li key={i}>
                        <strong>{n.titulo}</strong> — {n.motivo}
                      </li>
                    ))}
                  </ul>
                  {dia === hojeISO() && (
                    <button className="secundario largo" onClick={passarParaAmanha}>
                      ➡️ Passar o que não coube para amanhã
                    </button>
                  )}
                </div>
              )}

              <div className="acoes coluna">
                {dia === hojeISO() && (
                  <button className="primario" onClick={() => gerar(true, plano.tarefas)}>
                    🔄 Atrasei — reorganizar a partir de agora
                  </button>
                )}
                <button className="secundario" onClick={() => setAba("novo")}>
                  ✏️ Editar lista / adicionar tarefas
                </button>
                <button
                  className="secundario"
                  onClick={() => baixarArquivo(`rotina-${plano.data}.ics`, gerarICS(plano), "text/calendar")}
                >
                  📅 Exportar para a agenda do celular (.ics)
                </button>
              </div>
            </section>
          ) : (
            <section className="cartao vazio">
              <p>Nenhum plano para este dia ainda.</p>
              <button className="primario" onClick={() => setAba("novo")}>
                Criar plano
              </button>
            </section>
          ))}

        {aba === "semana" && (
          <SemanaView
            semana={semana}
            hoje={hoje}
            planos={planos}
            projetos={projetos}
            onProjetos={setProjetos}
            onChange={setSemana}
            onOrganizar={organizarSemana}
            onAbrirDia={(d) => {
              setDia(d);
              setAba("agenda");
            }}
          />
        )}

        {aba === "semana" && duvidasAbertas.length > 0 && (
          <section className="cartao">
            <h2>📝 Dúvidas em aberto</h2>
            <p className="dica">Leve para o professor, tutor ou fórum da pós. Marque quando resolver.</p>
            <ul className="lista-check">
              {duvidasAbertas.map((t) => (
                <li key={t.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={() => setTravamentos((ts) => ts.map((x) => (x.id === t.id ? { ...x, resolvido: true } : x)))}
                    />
                    <span>
                      {t.descricao} <small>· {t.tarefa}</small>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </section>
        )}

        {aba === "ajustes" && (
          <section className="cartao ajustes">
            <h2>Configurações</h2>

            <div className="linha">
              <label>
                Acordo às
                <input type="time" value={config.acordar} onChange={(e) => setConfig({ ...config, acordar: e.target.value })} />
              </label>
              <label>
                Durmo às
                <input type="time" value={config.dormir} onChange={(e) => setConfig({ ...config, dormir: e.target.value })} />
              </label>
            </div>

            <div className="linha">
              <label>
                Foco máximo (min)
                <input
                  type="number"
                  min={15}
                  max={180}
                  value={config.focoMaxMin}
                  onChange={(e) => setConfig({ ...config, focoMaxMin: Number(e.target.value) || 50 })}
                />
              </label>
              <label>
                Pausa (min)
                <input
                  type="number"
                  min={3}
                  max={60}
                  value={config.pausaMin}
                  onChange={(e) => setConfig({ ...config, pausaMin: Number(e.target.value) || 10 })}
                />
              </label>
              <label>
                Trajeto (min)
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={config.deslocamentoMin}
                  onChange={(e) => setConfig({ ...config, deslocamentoMin: Number(e.target.value) || 0 })}
                />
              </label>
            </div>

            <label>
              Compromissos fixos da semana
              <textarea
                rows={5}
                value={config.compromissosFixos}
                onChange={(e) => setConfig({ ...config, compromissosFixos: e.target.value })}
                placeholder={"Seg a sex: trabalho 8h–17h\nTer e qui: academia 18h–19h\nSeg, qua, sex: faculdade 19h às 22h"}
              />
              <small>Um por linha. Valem para os dias indicados — não precisa repetir ao planejar.</small>
            </label>

            <label className="check">
              <input type="checkbox" checked={config.refeicoes} onChange={(e) => setConfig({ ...config, refeicoes: e.target.checked })} />
              Reservar café, almoço e jantar automaticamente
            </label>

            <label className="check">
              <input type="checkbox" checked={config.notificacoes} onChange={(e) => ativarNotificacoes(e.target.checked)} />
              Avisar no início de cada atividade (com o app aberto ou recente)
            </label>

            <label>
              Revisão da semana
              <select value={config.revisao} onChange={(e) => setConfig({ ...config, revisao: e.target.value as Config["revisao"] })}>
                <option value="domingo">Domingo à noite (a partir das 18h)</option>
                <option value="segunda">Segunda-feira</option>
              </select>
              <small>O app pergunta como foi a semana e ajuda a recomeçar.</small>
            </label>
            <button
              className="secundario largo"
              onClick={() => baixarArquivo("lembrete-semanal.ics", gerarLembreteSemanal(config.revisao), "text/calendar")}
            >
              ⏰ Lembrete semanal na agenda do celular (.ics)
            </button>

            <h2>🍅 Pomodoro</h2>
            <label className="check">
              <input
                type="checkbox"
                checked={config.pomodoro.ativo}
                onChange={(e) => setConfig({ ...config, pomodoro: { ...config.pomodoro, ativo: e.target.checked } })}
              />
              Usar Pomodoro na agenda e no Modo Foco
            </label>
            {config.pomodoro.ativo && (
              <div className="linha">
                {(
                  [
                    ["focoMin", "Foco"],
                    ["pausaCurtaMin", "Pausa"],
                    ["pausaLongaMin", "Longa"],
                    ["ciclos", "Ciclos"],
                  ] as const
                ).map(([campo, rotulo]) => (
                  <label key={campo}>
                    {rotulo}
                    <input
                      type="number"
                      min={1}
                      max={campo === "ciclos" ? 10 : 120}
                      value={config.pomodoro[campo]}
                      onChange={(e) =>
                        setConfig({ ...config, pomodoro: { ...config.pomodoro, [campo]: Math.max(1, Number(e.target.value) || 1) } })
                      }
                    />
                  </label>
                ))}
              </div>
            )}
            <small className="dica">
              {config.pomodoro.ativo
                ? `${config.pomodoro.focoMin} min de foco, ${config.pomodoro.pausaCurtaMin} de pausa e ${config.pomodoro.pausaLongaMin} de pausa longa a cada ${config.pomodoro.ciclos}. Substitui “foco máximo” e “pausa” acima. Reorganize o dia/semana para aplicar.`
                : "Desligado: usa o foco máximo e a pausa configurados acima."}
            </small>

            <label>
              Tempo tentando sozinho antes de pedir ajuda (min)
              <input
                type="number"
                min={5}
                max={120}
                value={config.limiteTravadoMin}
                onChange={(e) => setConfig({ ...config, limiteTravadoMin: Math.max(5, Number(e.target.value) || 20) })}
              />
              <small>No Modo Foco, ao tocar em “Travei”, o app conta esse tempo e depois sugere IA/pesquisa.</small>
            </label>

            <h2>💾 Seus dados</h2>
            <p className="dica">
              Tudo fica salvo só neste celular, no navegador
              {persistente === true ? " (protegido contra limpeza automática)." : persistente === false ? " — o navegador pode apagar se faltar espaço." : "."}{" "}
              Se você limpar os dados do Chrome, desinstalar o app ou trocar de celular, perde tudo — faça backup de vez em quando.
            </p>
            <button className="secundario largo" onClick={baixarBackup}>
              ⬇️ Baixar backup (.json)
            </button>
            <label className="secundario largo botao-arquivo">
              ⬆️ Restaurar backup
              <input type="file" accept="application/json,.json" onChange={(e) => restaurarBackup(e.target.files?.[0])} />
            </label>
            <small className="dica">Restaurar substitui todos os dados atuais pelos do arquivo.</small>
          </section>
        )}
      </main>

      <nav className="abas">
        <button className={aba === "agenda" ? "ativo" : ""} onClick={() => setAba("agenda")}>
          <span>🗓️</span>Agenda
        </button>
        <button className={aba === "novo" ? "ativo" : ""} onClick={() => setAba("novo")}>
          <span>🎙️</span>Planejar
        </button>
        <button className={aba === "semana" ? "ativo" : ""} onClick={() => setAba("semana")}>
          <span>🎯</span>Semana
        </button>
        <button className={aba === "ajustes" ? "ativo" : ""} onClick={() => setAba("ajustes")}>
          <span>⚙️</span>Ajustes
        </button>
      </nav>

      {foco && !focoAberto && (
        <button className="foco-minimizado" onClick={() => setFocoAberto(true)}>
          🎯 Em foco: {foco.titulo}
          {foco.travado ? " · 😵 travado" : ""} — abrir
        </button>
      )}

      {foco && focoAberto && (
        <ModoFoco
          foco={foco}
          limiteMin={config.limiteTravadoMin}
          pomodoro={config.pomodoro}
          pomodorosHoje={pomodoros[hoje] ?? 0}
          onPomodoro={() => setPomodoros((ps) => ({ ...ps, [hoje]: (ps[hoje] ?? 0) + 1 }))}
          onAtualizar={setFoco}
          onRegistrar={(t) => setTravamentos((ts) => [...ts, t])}
          onConcluir={concluirFoco}
          onFechar={() => setFocoAberto(false)}
          passos={passosDoBloco(foco.data, foco.tarefaId)}
          onPassos={foco.tarefaId ? (p) => salvarPassos(foco.data, foco.tarefaId!, p) : undefined}
        />
      )}

      {mostrarRevisao && !focoAberto && (
        <RevisaoSemanal
          anterior={semanaAnterior}
          alvo={alvo}
          planos={planos}
          projetos={projetos}
          travamentos={travamentos}
          pomodoros={pomodoros}
          onRecomecar={recomecar}
          onDepois={() => setAdiada(hoje)}
        />
      )}
    </div>
  );
}
