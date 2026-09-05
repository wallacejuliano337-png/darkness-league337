"use client";
import { useEffect, useMemo, useState } from "react";

type Props = {
  data: any;
  mutate: (body: any, method?: string) => Promise<boolean>;
};
const defaults: Record<string, number> = {
  1: 12,
  2: 9,
  3: 8,
  4: 7,
  5: 6,
  6: 5,
  7: 4,
  8: 3,
  9: 2,
  10: 1,
  11: 0,
  12: 0,
};
const n = (value: any) => Number(value) || 0;

export default function StandingsManager({ data }: Props) {
  const stages = data.stages || [],
    groups = data.groups || [],
    teams = (data.teams || []).filter((x: any) => x.status === "APROVADA");
  const [stageId, setStageId] = useState(stages[0]?.id || ""),
    [round, setRound] = useState("JORNADA 1"),
    [group, setGroup] = useState(groups[0]?.name || "TODOS"),
    [drop, setDrop] = useState("GERAL"),
    [rows, setRows] = useState<any[]>([]),
    [rules, setRules] = useState<any[]>([]),
    [results, setResults] = useState<any[]>([]),
    [finalizations, setFinalizations] = useState<any[]>([]),
    [qualificationResults, setQualificationResults] = useState<any[]>([]),
    [stageTeamAssignments, setStageTeamAssignments] = useState<any[]>([]),
    [modal, setModal] = useState(false),
    [finalizeModal, setFinalizeModal] = useState(false),
    [finalizing, setFinalizing] = useState(false),
    [draft, setDraft] = useState<any>({
      kills_points: 1,
      booyah_points: 3,
      placements: defaults,
    }),
    [notice, setNotice] = useState("");
  const stage = stages.find((x: any) => x.id === stageId),
    stageIndex = stages.findIndex((x: any) => x.id === stageId),
    nextStage = stageIndex >= 0 ? stages[stageIndex + 1] : null,
    matchCount = Math.max(1, n(stage?.match_count) || 6),
    rule = rules.find((x) => x.stage_id === stageId) || {
      kills_points: 1,
      booyah_points: 3,
      placements: defaults,
    },
    positions = Object.keys({ ...defaults, ...rule.placements })
      .map(Number)
      .filter((x) => x > 0 && x <= 12)
      .sort((a, b) => a - b),
    isSemifinal = String(stage?.name || "")
      .toUpperCase()
      .includes("SEMIFINAL"),
    stageTeams = isSemifinal
      ? stageTeamAssignments
          .filter((x: any) => x.stage_id === stageId)
          .map((x: any) => ({ ...x, id: x.team_id }))
      : teams;
  const semifinalGroupCount = Math.max(1, n(stage?.group_count) || 1),
    semifinalGroupNames = Array.from(
      { length: semifinalGroupCount },
      (_, i) => `GRUPO ${String.fromCharCode(65 + i)}`,
    ),
    availableGroups = isSemifinal
      ? semifinalGroupNames.map((name) => ({ id: `${stageId}-${name}`, name }))
      : groups;
  const groupTeams =
    group === "TODOS"
      ? stageTeams
      : stageTeams.filter((x: any) => x.group_name === group);
  const finalized = finalizations.find((x: any) => x.stage_id === stageId),
    qualificationLimit = Math.max(
      0,
      n(finalized?.qualified_limit) || n(nextStage?.team_count),
    ),
    isQualifiers = String(stage?.name || "")
      .toUpperCase()
      .includes("CLASSIFICAT");
  async function load() {
    const r = await fetch("/api/admin/scoring"),
      j = await r.json();
    if (r.ok) {
      setRules(j.rules || []);
      setResults(j.results || []);
      setFinalizations(j.finalizations || []);
      setQualificationResults(j.qualificationResults || []);
      setStageTeamAssignments(j.stageTeams || []);
    } else setNotice(j.error);
  }
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    if (!stageId && stages[0]) setStageId(stages[0].id);
  }, [stages, stageId]);
  useEffect(() => {
    if (
      group !== "TODOS" &&
      !groups.some((x: any) => x.name === group) &&
      groups[0]
    )
      setGroup(groups[0].name);
  }, [groups, group]);
  useEffect(() => {
    if (group === "TODOS" || (drop !== "GERAL" && n(drop) > matchCount))
      setDrop("GERAL");
  }, [stageId, group, matchCount, drop]);
  useEffect(() => {
    if (drop === "GERAL" || group === "TODOS") return;
    const saved = results.filter(
      (x: any) =>
        x.stage_id === stageId &&
        x.round_name === round &&
        x.group_name === group &&
        n(x.match_number) === n(drop),
    );
    setRows(
      groupTeams.map((t: any) => {
        const r = saved.find((x: any) => x.team_id === t.id);
        return {
          team_id: t.id,
          name: t.name,
          tag: t.tag,
          logo_url: t.logo_url,
          kills: r?.kills ?? 0,
          placement_position: r?.placement_position ?? 0,
          penalty_points: r?.penalty_points ?? 0,
        };
      }),
    );
  }, [results, data.teams, stageId, round, group, drop]);
  const matchScore = (r: any) =>
    n(rule.placements?.[String(r.placement_position)]) +
    n(r.kills) * n(rule.kills_points) +
    (n(r.placement_position) === 1 ? n(rule.booyah_points) : 0) -
    n(r.penalty_points);
  const general = useMemo(() => {
    const frozen = qualificationResults.filter(
      (x: any) => x.stage_id === stageId,
    );
    if (finalized && group === "TODOS" && frozen.length) return frozen;
    return groupTeams
      .map((t: any) => {
        const saved = results.filter(
          (x: any) =>
            x.stage_id === stageId &&
            (group === "TODOS" ||
              (x.round_name === round && x.group_name === group)) &&
            x.team_id === t.id &&
            n(x.match_number) > 0,
        );
        return {
          ...t,
          booyahs: saved.reduce((a: any, x: any) => a + n(x.booyahs), 0),
          kills: saved.reduce((a: any, x: any) => a + n(x.kills), 0),
          placement_points: saved.reduce(
            (a: any, x: any) => a + n(x.placement_points),
            0,
          ),
          penalty_points: saved.reduce(
            (a: any, x: any) => a + n(x.penalty_points),
            0,
          ),
          total_points: saved.reduce(
            (a: any, x: any) => a + n(x.total_points),
            0,
          ),
          matches: saved.length,
        };
      })
      .filter((x: any) => x.matches > 0)
      .sort(
        (a: any, b: any) =>
          b.total_points - a.total_points ||
          b.booyahs - a.booyahs ||
          b.kills - a.kills ||
          a.name.localeCompare(b.name),
      );
  }, [
    groupTeams,
    results,
    qualificationResults,
    finalized,
    stageId,
    round,
    group,
  ]);
  const matchRows = useMemo(
      () =>
        [...rows].sort(
          (a, b) =>
            (n(a.placement_position) || 999) -
              (n(b.placement_position) || 999) || a.name.localeCompare(b.name),
        ),
      [rows],
    ),
    canFinalize =
      qualificationLimit > 0 && general.length >= qualificationLimit;
  const update = (id: string, key: string, value: string) =>
    setRows((x) =>
      x.map((r) =>
        r.team_id === id
          ? { ...r, [key]: value === "" ? 0 : Math.max(0, Number(value) || 0) }
          : r,
      ),
    );
  function openConfig() {
    setDraft({
      kills_points: n(rule.kills_points),
      booyah_points: n(rule.booyah_points),
      placements: { ...defaults, ...rule.placements },
    });
    setModal(true);
  }
  async function request(body: any, success: string) {
    const r = await fetch("/api/admin/scoring", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
      j = await r.json();
    setNotice(r.ok ? success : j.error);
    if (r.ok) await load();
    return r.ok;
  }
  async function saveConfig() {
    if (
      await request(
        {
          action: "scoring_rule_save",
          stageId,
          killsPoints: draft.kills_points,
          booyahPoints: draft.booyah_points,
          placements: draft.placements,
        },
        "CONFIGURAÇÃO SALVA",
      )
    )
      setModal(false);
  }
  async function saveMatch() {
    const used = new Map<number, string>();
    for (const r of rows) {
      const p = n(r.placement_position);
      if (!p) continue;
      if (used.has(p)) {
        setNotice(
          `A COLOCAÇÃO ${p}º ESTÁ REPETIDA ENTRE ${used.get(p)} E ${r.name}.`,
        );
        return;
      }
      used.set(p, r.name);
    }
    if (!confirm(`SALVAR ${round} · ${group} · QUEDA ${drop}?`)) return;
    await request(
      {
        action: "match_save",
        stageId,
        roundName: round,
        groupName: group,
        matchNumber: n(drop),
        rows,
      },
      "QUEDA SALVA · GERAL DO GRUPO RECALCULADO",
    );
  }
  async function publish() {
    if (!general.length) {
      setNotice("SALVE PELO MENOS UMA QUEDA ANTES DE PUBLICAR.");
      return;
    }
    if (!confirm(`PUBLICAR A CLASSIFICAÇÃO GERAL DE ${round} · ${group}?`))
      return;
    await request(
      {
        action: "standings_publish",
        stageId,
        roundName: round,
        groupName: group,
      },
      "CLASSIFICAÇÃO GERAL PUBLICADA",
    );
  }
  async function finalize() {
    setFinalizing(true);
    try {
      if (
        await request(
          { action: "qualifiers_finalize", stageId },
          `CLASSIFICATÓRIAS ENCERRADAS · TOP ${qualificationLimit} DEFINIDO`,
        )
      )
        setFinalizeModal(false);
    } finally {
      setFinalizing(false);
    }
  }
  return (
    <div className="standingsAdmin">
      {notice && (
        <button className="scoringNotice" onClick={() => setNotice("")}>
          {notice} ×
        </button>
      )}
      <div className="resultToolbar">
        <label>
          FASE
          <select
            value={stageId}
            onChange={(e) => {
              const next = stages.find((x: any) => x.id === e.target.value);
              setStageId(e.target.value);
              setGroup(
                String(next?.name || "")
                  .toUpperCase()
                  .includes("SEMIFINAL")
                  ? "GRUPO A"
                  : group,
              );
              setDrop("GERAL");
            }}
          >
            {stages.map((x: any) => (
              <option value={x.id} key={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          JORNADA / RODADA
          <input
            value={round}
            onChange={(e) => setRound(e.target.value.toUpperCase())}
          />
        </label>
        <label>
          GRUPO / SALA
          <select
            value={group}
            onChange={(e) => {
              setGroup(e.target.value);
              if (e.target.value === "TODOS") setDrop("GERAL");
            }}
          >
            <option value="TODOS">TODOS</option>
            {availableGroups.map((x: any) => (
              <option value={x.name} key={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          QUEDA
          <select
            value={drop}
            disabled={group === "TODOS"}
            onChange={(e) => setDrop(e.target.value)}
          >
            <option value="GERAL">GERAL</option>
            {group !== "TODOS" &&
              Array.from({ length: matchCount }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  QUEDA {i + 1}
                </option>
              ))}
          </select>
        </label>
        <button className="scoringConfigBtn" onClick={openConfig}>
          CONFIGURAR PONTUAÇÃO
        </button>
        {drop === "GERAL" ? (
          <button
            className="adminPrimary"
            disabled={Boolean(finalized)}
            onClick={publish}
          >
            {finalized ? "RANKING CONGELADO" : "SALVAR E PUBLICAR"}
          </button>
        ) : (
          <button
            className="adminPrimary"
            disabled={Boolean(finalized)}
            onClick={saveMatch}
          >
            SALVAR QUEDA
          </button>
        )}
      </div>
      <div className="scoringSummary">
        <span>REGRA ATUAL</span>
        <b>
          ELIMINAÇÃO · {rule.kills_points}{" "}
          {n(rule.kills_points) === 1 ? "PT" : "PTS"}
        </b>
        <b>BOOYAH · {rule.booyah_points} PTS EXTRA</b>
      </div>
      {drop === "GERAL" && group === "TODOS" && isQualifiers && (
        <div className="qualifierActions">
          <p>
            <b>CLASSIFICAÇÃO GERAL DAS CLASSIFICATÓRIAS</b>
            <span>
              {finalized
                ? `ENCERRADA · ${new Date(finalized.finalized_at).toLocaleString("pt-BR")}`
                : `TOP ${qualificationLimit} PROVISÓRIO · ATUALIZA A CADA RESULTADO`}
            </span>
          </p>
          <button
            disabled={Boolean(finalized)}
            onClick={() => setFinalizeModal(true)}
          >
            {finalized
              ? "CLASSIFICATÓRIAS ENCERRADAS"
              : "ENCERRAR CLASSIFICATÓRIAS"}
          </button>
        </div>
      )}
      {drop === "GERAL" ? (
        <div className="resultTable resultTableGeneral">
          <header>
            <b>#</b>
            <b>EQUIPE</b>
            <b>BOOYAH</b>
            <b>ELIM.</b>
            <b>POSIÇÃO</b>
            <b>PENALIDADE</b>
            <b>TOTAL</b>
          </header>
          {general.map((r: any, i: number) => {
            const position = n(r.final_position) || i + 1,
              status =
                isQualifiers && group === "TODOS"
                  ? r.qualification_status ||
                    (position <= qualificationLimit
                      ? "CLASSIFICADA"
                      : "ELIMINADA")
                  : "";
            return (
              <article key={r.id || r.team_id}>
                <strong>{position}º</strong>
                <div>
                  {r.logo_url ? (
                    <img src={r.logo_url} alt="" />
                  ) : (
                    <i>{r.tag}</i>
                  )}
                  <span>
                    <b>{r.name}</b>
                    <small>
                      {r.tag}
                      {status
                        ? ` · ${status}${!finalized && status === "CLASSIFICADA" ? " PROVISÓRIA" : ""}`
                        : ""}
                    </small>
                  </span>
                </div>
                <em>{r.booyahs}</em>
                <em>{r.kills}</em>
                <em>{r.placement_points}</em>
                <em>{r.penalty_points}</em>
                <em>{r.total_points}</em>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="resultTable resultTableDrop">
          <header>
            <b>#</b>
            <b>EQUIPE</b>
            <b>COLOCAÇÃO</b>
            <b>ELIM.</b>
            <b>PENALIDADE</b>
            <b>PONTOS</b>
          </header>
          {matchRows.map((r: any, i: number) => (
            <article key={r.team_id}>
              <strong>{i + 1}</strong>
              <div>
                {r.logo_url ? <img src={r.logo_url} alt="" /> : <i>{r.tag}</i>}
                <span>
                  <b>{r.name}</b>
                  <small>
                    {r.tag}
                    {n(r.placement_position) === 1
                      ? " · BOOYAH AUTOMÁTICO"
                      : ""}
                  </small>
                </span>
              </div>
              <select
                aria-label={`Colocação de ${r.name}`}
                value={r.placement_position}
                onChange={(e) =>
                  update(r.team_id, "placement_position", e.target.value)
                }
              >
                <option value={0}>—</option>
                {positions.map((p) => (
                  <option key={p} value={p}>
                    {p}º
                  </option>
                ))}
              </select>
              <input
                aria-label={`Eliminações de ${r.name}`}
                type="number"
                min="0"
                step="1"
                value={r.kills}
                onChange={(e) => update(r.team_id, "kills", e.target.value)}
              />
              <input
                aria-label={`Penalidade de ${r.name}`}
                type="number"
                min="0"
                step="0.5"
                value={r.penalty_points}
                onChange={(e) =>
                  update(r.team_id, "penalty_points", e.target.value)
                }
              />
              <em>{n(r.placement_position) ? matchScore(r) : 0}</em>
            </article>
          ))}
        </div>
      )}
      {drop === "GERAL" && !general.length && (
        <p className="adminEmpty">
          SELECIONE UM GRUPO, UMA QUEDA E SALVE OS RESULTADOS PARA GERAR A
          CLASSIFICAÇÃO.
        </p>
      )}
      {group !== "TODOS" && !groupTeams.length && (
        <p className="adminEmpty">NENHUMA EQUIPE APROVADA NESTE GRUPO.</p>
      )}
      {!teams.length && (
        <p className="adminEmpty">APROVE EQUIPES PARA LANÇAR OS RESULTADOS.</p>
      )}
      {modal && (
        <div className="scoringModal" role="dialog" aria-modal="true">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveConfig();
            }}
          >
            <header>
              <div>
                <small>FASE SELECIONADA</small>
                <h2>CONFIGURAR PONTUAÇÃO</h2>
                <p>{stage?.name}</p>
              </div>
              <button type="button" onClick={() => setModal(false)}>
                ×
              </button>
            </header>
            <div className="scoringBase">
              <label>
                PONTOS POR ELIMINAÇÃO
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={draft.kills_points}
                  onChange={(e) =>
                    setDraft({ ...draft, kills_points: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                PONTOS POR BOOYAH
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={draft.booyah_points}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      booyah_points: Number(e.target.value),
                    })
                  }
                />
                <small>PONTUAÇÃO EXTRA</small>
              </label>
            </div>
            <section>
              <h3>PONTOS DE POSIÇÃO POR QUEDA</h3>
              <p>
                Defina quantos pontos cada colocação vale em uma única queda.
              </p>
              <div className="placementGrid">
                {Object.keys(draft.placements)
                  .sort((a, b) => Number(a) - Number(b))
                  .map((position) => (
                    <label key={position}>
                      <span>{position}º LUGAR</span>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={draft.placements[position]}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            placements: {
                              ...draft.placements,
                              [position]: Number(e.target.value),
                            },
                          })
                        }
                      />
                    </label>
                  ))}
              </div>
            </section>
            <footer>
              <button type="button" onClick={() => setModal(false)}>
                CANCELAR
              </button>
              <button className="adminPrimary">SALVAR CONFIGURAÇÃO</button>
            </footer>
          </form>
        </div>
      )}
      {finalizeModal && !finalized && (
        <div
          className="scoringModal finalizeModal"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="finalize-title"
          aria-describedby="finalize-description"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (canFinalize) finalize();
            }}
          >
            <header>
              <div>
                <small>CONFIRMAÇÃO ADMINISTRATIVA</small>
                <h2 id="finalize-title">ENCERRAR CLASSIFICATÓRIAS</h2>
              </div>
              <button
                type="button"
                aria-label="Fechar"
                disabled={finalizing}
                onClick={() => setFinalizeModal(false)}
              >
                ×
              </button>
            </header>
            <p id="finalize-description">
              Ao confirmar, a classificação geral atual será congelada e
              utilizada para definir oficialmente as {qualificationLimit}{" "}
              equipes classificadas para a Semifinal.
            </p>
            {!canFinalize && (
              <div className="finalizeProtection" role="alert">
                <b>NÃO É POSSÍVEL ENCERRAR AS CLASSIFICATÓRIAS</b>
                <p>
                  São necessárias pelo menos {qualificationLimit} equipes na
                  Classificação Geral para definir as classificadas para a
                  Semifinal.
                </p>
                <span>
                  <strong>Equipes atuais: {general.length}</strong>
                  <strong>Mínimo necessário: {qualificationLimit}</strong>
                </span>
              </div>
            )}
            <footer>
              <button
                type="button"
                disabled={finalizing}
                onClick={() => setFinalizeModal(false)}
              >
                CANCELAR
              </button>
              <button
                className="finalizeConfirm"
                disabled={finalizing || !canFinalize}
              >
                {finalizing ? "ENCERRANDO..." : "CONFIRMAR ENCERRAMENTO"}
              </button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}
