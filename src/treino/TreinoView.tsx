import { useEffect, useState, type ReactNode } from "react";
import "./treino.css";
import {
  AQUECIMENTO,
  CHECKLIST,
  COLUNA,
  CORRIDA,
  CUIDADOS,
  FORCA_A,
  FORCA_B,
  GUIA,
  LIMITE_CAFE,
  META_AGUA,
  buscaYoutube,
  type Exercicio,
  type Teste,
} from "./dados";
import {
  adicionarRegistro,
  carregarTreino,
  ddmm,
  diasEntre,
  isoLocal,
  planoDaSemana,
  prontoParaEvoluir,
  salvarTreino,
  segundaDe,
  semanaDoPrograma,
  type AbaDia,
  type DiaChecklist,
  type EstadoTreino,
  type RegistroTreino,
} from "./store";
import { formatar, useCronometro, type Cronometro } from "./useCronometro";

type Sub = "hoje" | "a" | "b" | "corrida" | "coluna" | "progresso" | "guia";

const SUBABAS: [Sub, string][] = [
  ["hoje", "Hoje"],
  ["a", "Força A"],
  ["b", "Força B"],
  ["corrida", "Corrida"],
  ["coluna", "Coluna"],
  ["progresso", "Progresso"],
  ["guia", "Guia"],
];

const NOME: Record<AbaDia, string> = { a: "Força A", b: "Força B", corrida: "Corrida", coluna: "Coluna (descanso)" };
const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const DIA_VAZIO: DiaChecklist = { marcados: {}, agua: 0, cafe: 0 };

function Link({ href, children, forte }: { href: string; children: ReactNode; forte?: boolean }) {
  return (
    <a className={`tr-botao ${forte ? "forte" : ""}`} href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

function BarraCronometro({ c }: { c: Cronometro }) {
  if (!c.ativo || !c.fase) return null;
  return (
    <div className="tr-cronometro" role="timer" aria-live="polite">
      <div className="tr-crono-topo">
        <div>
          <strong className={c.fase.destaque ? "destaque" : ""}>{c.fase.rotulo}</strong>
          <small>
            {c.proxima ? `Depois: ${c.proxima.rotulo}` : "Última etapa"}
            {c.total > 2 ? ` · ${c.indice}/${c.total}` : ""}
          </small>
        </div>
        <span className="tr-tempo">{formatar(c.restante)}</span>
      </div>
      <div className="tr-barra">
        <i style={{ width: `${Math.min(100, c.progresso * 100)}%` }} />
      </div>
      <div className="tr-crono-botoes">
        <button onClick={c.mais15}>+15 s</button>
        <button onClick={c.alternarPausa}>{c.pausado ? "Continuar" : "Pausar"}</button>
        <button onClick={c.pular}>Pular</button>
        <button onClick={c.parar}>Parar</button>
      </div>
    </div>
  );
}

function Aquecimento({ c }: { c: Cronometro }) {
  return (
    <section className="cartao">
      <h2>Aquecimento · 8 min</h2>
      <p className="dica">Faça na ordem. O aquecimento guiado avisa quando trocar.</p>
      <ul className="tr-lista-guiada">
        {AQUECIMENTO.map((w, i) => (
          <li key={w.nome}>
            <div>
              <strong>
                {i + 1}. {w.nome}
              </strong>{" "}
              <small>· {w.segundos / 60} min</small>
              <p>{w.dica}</p>
            </div>
            <Link href={w.video ?? buscaYoutube(w.busca)}>▶ Vídeo</Link>
          </li>
        ))}
      </ul>
      <button className="primario tr-largo" onClick={() => c.iniciar(AQUECIMENTO.map((w) => ({ rotulo: w.nome, seg: w.segundos, destaque: true })))}>
        Iniciar aquecimento guiado
      </button>
    </section>
  );
}

function CartaoExercicio(props: {
  ex: Exercicio;
  i: number;
  tipo: "a" | "b";
  teste: Teste;
  feitas: Record<string, boolean>;
  evoluir: boolean;
  onSerie: (chave: string, descanso: number, nome: string) => void;
  onSegurar: (seg: number, nome: string) => void;
}) {
  const { ex, i, tipo, teste, feitas, evoluir, onSerie, onSegurar } = props;
  return (
    <section className="cartao tr-exercicio">
      <div className="tr-cabeca">
        <span className="tr-num">{i + 1}</span>
        <div>
          <h2>{ex.nome}</h2>
          <p className="dica">{ex.musculos}</p>
        </div>
      </div>
      <p className="tr-dose">
        <b>{ex.series} séries</b> × <b>{ex.reps(teste)}</b> · descanso {ex.descansoSeg} s
      </p>
      {evoluir && (
        <p className="tr-evoluir">
          ↑ Você completou todas as séries nos 2 últimos treinos. Hora de evoluir:{" "}
          {ex.segurarSeg ? "+5 a 10 segundos" : "+1 ou 2 repetições por série, ou a versão mais difícil"}.
        </p>
      )}
      <div className="tr-series">
        {Array.from({ length: ex.series }, (_, k) => {
          const chave = `${tipo}${i}-${k}`;
          return (
            <button key={chave} className={feitas[chave] ? "feita" : ""} onClick={() => onSerie(chave, ex.descansoSeg, ex.nome)}>
              {feitas[chave] ? "✓ " : ""}Série {k + 1}
            </button>
          );
        })}
      </div>
      <p className="tr-pequeno">Toque na série ao terminar: o descanso começa sozinho.</p>
      <details>
        <summary>Como fazer</summary>
        <ol>
          {ex.comoFazer.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ol>
        <p>
          <b>Versão mais fácil:</b> {ex.facil}
        </p>
      </details>
      <div className="tr-links">
        <Link href={ex.video} forte>
          ▶ Ver vídeo
        </Link>
        {ex.videoFacil && <Link href={ex.videoFacil}>▶ Versão fácil</Link>}
        {ex.segurarSeg && (
          <button className="tr-botao" onClick={() => onSegurar(ex.segurarSeg!, ex.nome)}>
            ⏱ Cronometrar {ex.segurarSeg} s
          </button>
        )}
        <Link href={buscaYoutube(ex.busca)}>Mais vídeos</Link>
        {ex.demo && <Link href={ex.demo.url}>Demonstração ({ex.demo.fonte})</Link>}
      </div>
    </section>
  );
}

const AvisoSeguranca = () => (
  <section className="cartao tr-alerta">
    <h2>Antes de começar</h2>
    <ul>
      <li>Não prenda a respiração: solte o ar no esforço.</li>
      <li>Pare cada série sentindo que ainda daria +2 repetições.</li>
      <li>Levante devagar do chão. Beba água.</li>
      <li>Tontura, visão escurecendo ou dor no peito: pare e sente.</li>
    </ul>
  </section>
);

export function TreinoView() {
  const [abertoEm] = useState(() => new Date()); // data de referência enquanto a aba está aberta
  const hoje = isoLocal(abertoEm);
  const [e, setE] = useState<EstadoTreino>(() => carregarTreino(hoje));
  const [sub, setSub] = useState<Sub>(() => (e.visto ? "hoje" : "guia"));
  const [msg, setMsg] = useState<Partial<Record<string, string>>>({});
  const c = useCronometro();

  useEffect(() => salvarTreino(e), [e]);

  const semanaIdx = semanaDoPrograma(e.inicio, hoje);
  const plano = planoDaSemana(semanaIdx);
  const dow = abertoEm.getDay();
  const doDia = plano[dow];
  const feitasHoje = e.series[hoje] ?? {};
  const fezHoje = (t: RegistroTreino["t"][]) => e.log.some((r) => r.d === hoje && t.includes(r.t));
  const diaCheck = e.checklist[hoje] ?? DIA_VAZIO;

  const atualizar = (f: (x: EstadoTreino) => EstadoTreino) => setE((x) => f(x));
  const ir = (s: Sub) => {
    setSub(s);
    window.scrollTo({ top: 0 });
  };

  const registrar = (r: Omit<RegistroTreino, "em" | "d">, chaveMsg: string, texto: string) => {
    atualizar((x) => ({ ...x, log: adicionarRegistro(x.log, { ...r, d: hoje, em: new Date().toISOString() }) }));
    setMsg((m) => ({ ...m, [chaveMsg]: texto }));
  };

  const marcarSerie = (chave: string, descanso: number, nome: string) => {
    const agora = !feitasHoje[chave];
    atualizar((x) => ({ ...x, series: { ...x.series, [hoje]: { ...(x.series[hoje] ?? {}), [chave]: agora } } }));
    if (agora) c.iniciar([{ rotulo: `Descanso · ${nome}`, seg: descanso }]);
  };

  const concluirForca = (tipo: "a" | "b") => {
    const lista = tipo === "a" ? FORCA_A : FORCA_B;
    let feitas = 0;
    let total = 0;
    const completos: number[] = [];
    lista.forEach((ex, i) => {
      let todas = true;
      for (let k = 0; k < ex.series; k++) {
        total++;
        if (feitasHoje[`${tipo}${i}-${k}`]) feitas++;
        else todas = false;
      }
      if (todas) completos.push(i);
    });
    registrar({ t: tipo, feitas, total, completos }, tipo, `✓ Treino salvo: ${feitas} de ${total} séries.`);
  };

  const zerarSeries = (tipo: "a" | "b") =>
    atualizar((x) => ({
      ...x,
      series: { ...x.series, [hoje]: Object.fromEntries(Object.entries(x.series[hoje] ?? {}).filter(([k]) => !k.startsWith(tipo))) },
    }));

  const setChecklist = (f: (d: DiaChecklist) => DiaChecklist) =>
    atualizar((x) => ({ ...x, checklist: { ...x.checklist, [hoje]: { ...f(x.checklist[hoje] ?? DIA_VAZIO), em: new Date().toISOString() } } }));

  const autoMarcado = (auto?: "treino" | "coluna") =>
    auto === "treino" ? dow === 0 || fezHoje(["a", "b", "corrida"]) : auto === "coluna" ? fezHoje(["coluna"]) : false;

  const checklistFeitos = CHECKLIST.filter((it) => (it.auto ? autoMarcado(it.auto) : diaCheck.marcados[it.id])).length;

  const semanaAtual = (() => {
    const seg = segundaDe(abertoEm);
    return [1, 2, 3, 4, 5, 6, 0].map((d) => {
      const dt = new Date(seg);
      dt.setDate(seg.getDate() + ((d + 6) % 7));
      const iso = isoLocal(dt);
      return { d, iso, tipo: plano[d], feito: e.log.some((r) => r.d === iso && r.t !== "coluna") };
    });
  })();

  const corrida = CORRIDA[e.semanaCorrida - 1];
  const corridasNaSemana = e.log.filter((r) => r.t === "corrida" && r.semana === e.semanaCorrida).length;
  const diasDoTeste = e.teste.data ? diasEntre(e.teste.data, hoje) : null;

  const forca = (tipo: "a" | "b") => {
    const lista = tipo === "a" ? FORCA_A : FORCA_B;
    const salvoHoje = fezHoje([tipo]);
    return (
      <>
        <h2 className="tr-titulo">
          {NOME[tipo]} {doDia === tipo && <span className="tr-tag">Treino de hoje</span>}
        </h2>
        <p className="dica">Corpo todo · uns 40 min · descanso de 30 a 90 s entre as séries.</p>
        <AvisoSeguranca />
        <Aquecimento c={c} />
        {lista.map((ex, i) => (
          <CartaoExercicio
            key={ex.nome}
            ex={ex}
            i={i}
            tipo={tipo}
            teste={e.teste}
            feitas={feitasHoje}
            evoluir={prontoParaEvoluir(e.log, tipo, i)}
            onSerie={marcarSerie}
            onSegurar={(seg, nome) => c.iniciar([{ rotulo: "Prepare-se", seg: 5 }, { rotulo: `${nome} · segure`, seg, destaque: true }])}
          />
        ))}
        <section className="cartao">
          <h2>Terminou?</h2>
          <p className="dica">Salve o treino para o app acompanhar sua evolução e avisar quando aumentar a dificuldade.</p>
          <div className="acoes">
            <button className="primario" onClick={() => concluirForca(tipo)}>
              Concluir treino de hoje
            </button>
            <button className="secundario" onClick={() => zerarSeries(tipo)}>
              Zerar séries
            </button>
          </div>
          <p className="tr-ok">{msg[tipo] ?? (salvoHoje ? "✓ Treino de hoje já salvo." : "")}</p>
        </section>
      </>
    );
  };

  return (
    <div className="treino">
      <nav className="tr-subabas" aria-label="Seções do treino">
        {SUBABAS.map(([id, rotulo]) => (
          <button key={id} className={sub === id ? "ativo" : ""} onClick={() => ir(id)}>
            {rotulo}
          </button>
        ))}
      </nav>

      {sub === "hoje" && (
        <>
          <section className="cartao tr-destaque">
            <small>
              {DIAS[dow]} · semana {semanaIdx + 1} do programa
            </small>
            <h2>Hoje: {NOME[doDia]}</h2>
            <p className="dica">
              {doDia === "coluna"
                ? "Dia de descanso. Faça só a rotina da coluna (7 min)."
                : doDia === "corrida"
                  ? `Corrida da semana ${e.semanaCorrida}: ${corrida.resumo}. Depois, a rotina da coluna.`
                  : "Aquecimento → exercícios → rotina da coluna. Uns 50 minutos."}
            </p>
            <button className="primario tr-largo" onClick={() => ir(doDia)}>
              {fezHoje([doDia]) ? "✓ Feito · ver de novo" : "Começar o treino de hoje"}
            </button>
          </section>

          <section className="cartao">
            <div className="tr-linha">
              <h2>Checklist de saúde</h2>
              <span className="tr-contador">
                {checklistFeitos}/{CHECKLIST.length}
              </span>
            </div>
            <ul className="tr-checklist">
              {CHECKLIST.map((it) => {
                const marcado = it.auto ? autoMarcado(it.auto) : !!diaCheck.marcados[it.id];
                return (
                  <li key={it.id}>
                    <label>
                      <input
                        type="checkbox"
                        checked={marcado}
                        disabled={!!it.auto}
                        onChange={() => setChecklist((d) => ({ ...d, marcados: { ...d.marcados, [it.id]: !d.marcados[it.id] } }))}
                      />
                      <span>{it.texto}</span>
                    </label>
                    {it.auto && <small>marca sozinho quando você salva o treino</small>}
                  </li>
                );
              })}
            </ul>
            <div className="tr-contadores">
              <div>
                <span>💧 Água</span>
                <div className="tr-passo">
                  <button onClick={() => setChecklist((d) => ({ ...d, agua: Math.max(0, d.agua - 1) }))} aria-label="Menos um copo">
                    −
                  </button>
                  <span className="tr-valor">
                    <b>
                      {diaCheck.agua}/{META_AGUA}
                    </b>
                    <small>copos</small>
                  </span>
                  <button onClick={() => setChecklist((d) => ({ ...d, agua: d.agua + 1 }))} aria-label="Mais um copo">
                    +
                  </button>
                </div>
              </div>
              <div>
                <span>☕ Café</span>
                <div className="tr-passo">
                  <button onClick={() => setChecklist((d) => ({ ...d, cafe: Math.max(0, d.cafe - 1) }))} aria-label="Menos uma xícara">
                    −
                  </button>
                  <span className={`tr-valor ${diaCheck.cafe > LIMITE_CAFE ? "tr-acima" : ""}`}>
                    <b>
                      {diaCheck.cafe}/{LIMITE_CAFE}
                    </b>
                    <small>xícaras</small>
                  </span>
                  <button onClick={() => setChecklist((d) => ({ ...d, cafe: d.cafe + 1 }))} aria-label="Mais uma xícara">
                    +
                  </button>
                </div>
              </div>
            </div>
            {diaCheck.cafe > LIMITE_CAFE && <p className="tr-pequeno tr-acima">Passou do limite de café de hoje. Que tal um chá ou água?</p>}
            <p className="tr-pequeno">Dica: café só de manhã e depois do treino, junto com o café da manhã.</p>
          </section>

          <section className="cartao">
            <h2>Esta semana</h2>
            <ul className="tr-semana">
              {semanaAtual.map((s) => (
                <li key={s.iso} className={s.d === dow ? "hoje" : ""}>
                  <span>
                    {DIAS[s.d].slice(0, 3)} <small>{ddmm(s.iso)}</small>
                  </span>
                  <span>{NOME[s.tipo]}</span>
                  <span>{s.feito ? "✓" : ""}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      {sub === "a" && forca("a")}
      {sub === "b" && forca("b")}

      {sub === "corrida" && (
        <>
          <h2 className="tr-titulo">
            Corrida {doDia === "corrida" && <span className="tr-tag">Treino de hoje</span>}
          </h2>
          <p className="dica">3 vezes por semana. Se uma semana ficar pesada, repita ela.</p>
          {corridasNaSemana >= 3 && (
            <section className="cartao tr-evoluir-cartao">
              {e.semanaCorrida < 8 ? (
                <>
                  <h2>Pronto para avançar?</h2>
                  <p>
                    Você já fez {corridasNaSemana} corridas da semana {e.semanaCorrida}. Se foi confortável (deu para falar frases curtas), passe para a próxima.
                  </p>
                  <button className="primario tr-largo" onClick={() => atualizar((x) => ({ ...x, semanaCorrida: x.semanaCorrida + 1 }))}>
                    Avançar para a semana {e.semanaCorrida + 1}
                  </button>
                  <p className="tr-pequeno">Se ainda foi pesado, repita esta semana. Sem pressa.</p>
                </>
              ) : (
                <>
                  <h2>Plano completo!</h2>
                  <p>Você já corre 25 a 30 min direto. Mantenha 3 vezes por semana e, se quiser, aumente 5 min a cada 2 semanas.</p>
                </>
              )}
            </section>
          )}
          <section className="cartao">
            <h2>Semana do plano</h2>
            <div className="tr-chips">
              {CORRIDA.map((s) => (
                <button key={s.semana} className={s.semana === e.semanaCorrida ? "ativo" : ""} onClick={() => atualizar((x) => ({ ...x, semanaCorrida: s.semana }))}>
                  {s.semana}
                </button>
              ))}
            </div>
            <p className="tr-dose">
              <b>{corrida.resumo}</b>
            </p>
            <p className="tr-pequeno">
              + 5 min andando antes e depois (já no cronômetro). Corridas feitas nesta semana do plano: <b>{corridasNaSemana}</b> de 3.
            </p>
            <ul className="tr-fases">
              <li>Ande 5 min</li>
              {corrida.fases.map((f, i) => (
                <li key={i} className={f.correr ? "correr" : ""}>
                  {f.correr ? "Corra" : "Ande"} {f.seg >= 60 ? `${Math.round(f.seg / 60)} min` : `${f.seg} s`}
                </li>
              ))}
              <li>Ande 5 min</li>
            </ul>
            <div className="acoes coluna">
              <button
                className="primario"
                onClick={() =>
                  c.iniciar(
                    [
                      { rotulo: "Aquecimento: ande", seg: 300 },
                      ...corrida.fases.map((f) => ({ rotulo: f.correr ? "CORRA (leve)" : "ANDE", seg: f.seg, destaque: f.correr })),
                      { rotulo: "Desaquecimento: ande", seg: 300 },
                    ],
                    () => registrar({ t: "corrida", semana: e.semanaCorrida }, "corrida", "✓ Corrida salva."),
                  )
                }
              >
                Iniciar corrida guiada
              </button>
              <button className="secundario" onClick={() => registrar({ t: "corrida", semana: e.semanaCorrida }, "corrida", "✓ Corrida salva.")}>
                Marcar corrida como feita
              </button>
            </div>
            <p className="tr-ok">{msg.corrida ?? ""}</p>
          </section>
          <section className="cartao">
            <h2>Ritmo certo</h2>
            <ul>
              <li>Você precisa conseguir falar uma frase curta: "Hoje o dia está bonito."</li>
              <li>Só sai uma palavra? Diminua ou ande um pouco.</li>
              <li>Não use frequência cardíaca: o remédio segura os batimentos.</li>
              <li>Nunca pare de repente: a caminhada final é obrigatória.</li>
              <li>Em casa: trote no terraço ou corrida parada, com curvas suaves.</li>
            </ul>
          </section>
          <section className="cartao tr-alerta">
            <h2>Pare e caminhe se sentir</h2>
            <p>Tontura, visão escurecendo, dor no peito ou falta de ar fora do normal.</p>
          </section>
        </>
      )}

      {sub === "coluna" && (
        <>
          <h2 className="tr-titulo">Coluna</h2>
          <p className="dica">Para a lombar e a cervical · uns 7 min · todo dia, no fim do treino.</p>
          <section className="cartao">
            <h2>Rotina guiada</h2>
            <p className="dica">O cronômetro avisa quando trocar de exercício.</p>
            <div className="acoes coluna">
              <button
                className="primario"
                onClick={() =>
                  c.iniciar(
                    COLUNA.map((x) => ({ rotulo: x.nome, seg: x.segundos, destaque: true })),
                    () => registrar({ t: "coluna" }, "coluna", "✓ Rotina da coluna salva."),
                  )
                }
              >
                Iniciar rotina da coluna
              </button>
              <button className="secundario" onClick={() => registrar({ t: "coluna" }, "coluna", "✓ Rotina da coluna salva.")}>
                Marcar como feita
              </button>
            </div>
            <p className="tr-ok">{msg.coluna ?? (fezHoje(["coluna"]) ? "✓ Feita hoje." : "")}</p>
          </section>
          {COLUNA.map((x, i) => (
            <section key={x.nome} className="cartao tr-exercicio">
              <div className="tr-cabeca">
                <span className="tr-num">{i + 1}</span>
                <div>
                  <h2>{x.nome}</h2>
                  <p className="dica">{x.musculos}</p>
                </div>
              </div>
              <p className="tr-dose">
                <b>{x.dose}</b>
              </p>
              <details>
                <summary>Como fazer</summary>
                <ol>
                  {x.comoFazer.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ol>
                {x.facil && (
                  <p>
                    <b>Versão mais fácil:</b> {x.facil}
                  </p>
                )}
              </details>
              <div className="tr-links">
                <Link href={x.video} forte>
                  ▶ Ver vídeo
                </Link>
              </div>
            </section>
          ))}
          <section className="cartao tr-alerta">
            <h2>Pare se</h2>
            <p>Algum movimento causar dor forte, ou se a dor for para o braço ou a perna com formigamento. Nesse caso, procure um médico ou fisioterapeuta.</p>
          </section>
          <section className="cartao">
            <h2>No dia a dia</h2>
            <ul>
              <li>Tela do computador e do celular na altura dos olhos.</li>
              <li>A cada 40–50 min de estudo, levante e se mexa 2 minutos.</li>
              <li>Faça a retração do queixo algumas vezes ao longo do dia.</li>
            </ul>
          </section>
        </>
      )}

      {sub === "progresso" && (
        <>
          <h2 className="tr-titulo">Semana {semanaIdx + 1} do programa</h2>
          <p className="dica">
            O app alterna Força A e B sozinho. Na semana que vem: {semanaIdx % 2 === 1 ? "A na segunda e sexta, B na quarta" : "B na segunda e sexta, A na quarta"}.
          </p>
          {!e.teste.data ? (
            <section className="cartao tr-evoluir-cartao">
              <h2>Faça o teste</h2>
              <p>Ainda não há teste salvo. Faça no próximo treino de força e anote abaixo.</p>
            </section>
          ) : (
            diasDoTeste !== null &&
            diasDoTeste >= 56 && (
              <section className="cartao tr-evoluir-cartao">
                <h2>Hora de refazer o teste</h2>
                <p>Seu último teste foi há {diasDoTeste} dias. Refaça e atualize os números abaixo.</p>
              </section>
            )
          )}
          <section className="cartao">
            <h2>Meu teste</h2>
            <p className="dica">Flexão e barra viram "metade do máximo" nos treinos.</p>
            {(
              [
                ["flex", "Flexões seguidas (máximo)"],
                ["barra", "Barras seguidas (máximo)"],
                ["abd", "Abdominais em 1 min"],
                ["dist", "Distância em 12 min (m)"],
              ] as [keyof Teste, string][]
            ).map(([k, rotulo]) => (
              <label key={k} className="tr-campo">
                <span>{rotulo}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={e.teste[k]}
                  onChange={(ev) => atualizar((x) => ({ ...x, teste: { ...x.teste, [k]: ev.target.value, data: hoje } }))}
                />
              </label>
            ))}
            {e.teste.data && <p className="tr-pequeno">Última atualização: {ddmm(e.teste.data)}.</p>}
          </section>
          <section className="cartao">
            <h2>Seu histórico</h2>
            <p>
              Treinos nos últimos 7 dias: <b>{e.log.filter((r) => r.t !== "coluna" && diasEntre(r.d, hoje) < 7).length}</b> · Total: <b>{e.log.length}</b>
            </p>
            {e.log.length ? (
              <ul className="tr-historico">
                {e.log
                  .slice(-15)
                  .reverse()
                  .map((r) => (
                    <li key={`${r.d}-${r.t}`}>
                      <span>{ddmm(r.d)}</span>
                      <span>
                        {r.t === "corrida"
                          ? `Corrida · semana ${r.semana}`
                          : r.t === "coluna"
                            ? "Coluna"
                            : `${NOME[r.t]} · ${r.feitas}/${r.total} séries`}
                      </span>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="tr-pequeno">Nenhum treino salvo ainda. Use "Concluir treino de hoje" no fim de cada treino.</p>
            )}
          </section>
          <section className="cartao">
            <h2>Como evoluir</h2>
            <ul>
              <li>O app avisa (↑) quando você completar todas as séries de um exercício em 2 treinos seguidos: aumente 1 ou 2 repetições.</li>
              <li>Na corrida, depois de 3 corridas na mesma semana do plano, ele sugere avançar.</li>
              <li>Dormiu mal ou está muito cansado? Faça um treino mais leve.</li>
            </ul>
          </section>
        </>
      )}

      {sub === "guia" && (
        <>
          <h2 className="tr-titulo">Comece aqui</h2>
          <p className="dica">Leia uma vez antes do primeiro treino. Leva uns 3 minutos.</p>
          {GUIA.map((g, i) => (
            <section key={g.titulo} className="cartao">
              <div className="tr-cabeca">
                <span className="tr-num">{i + 1}</span>
                <h2>{g.titulo}</h2>
              </div>
              {g.intro && <p>{g.intro}</p>}
              {g.numerada ? (
                <ol>
                  {g.itens.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ol>
              ) : (
                <ul>
                  {g.itens.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              )}
              {g.fim && <p>{g.fim}</p>}
            </section>
          ))}
          <section className="cartao">
            <h2>Cuidados (pressão e remédio)</h2>
            <ul>
              {CUIDADOS.sempre.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </section>
          <section className="cartao tr-alerta">
            <h2>Ligue 192 ou vá à UPA</h2>
            <ul>
              {CUIDADOS.urgencia.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </section>
          <section className="cartao">
            <h2>Avise o cardiologista se</h2>
            <ul>
              {CUIDADOS.avisarMedico.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            <p className="tr-pequeno">Este guia não substitui a orientação médica.</p>
          </section>
          <button
            className="primario tr-largo"
            onClick={() => {
              atualizar((x) => ({ ...x, visto: true }));
              ir("hoje");
            }}
          >
            Entendi, ir para o treino de hoje
          </button>
        </>
      )}

      <BarraCronometro c={c} />
    </div>
  );
}
