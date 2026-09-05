"use client";
import { useEffect, useState } from "react";

export default function PublicStandings() {
  const [content, setContent] = useState<any>(null),
    [stage, setStage] = useState(""),
    [round, setRound] = useState("GERAL");
  useEffect(() => {
    fetch("/api/settings?scope=standings")
      .then((r) => r.json())
      .then((x) => x.success && setContent(x))
      .catch(() => {});
  }, []);
  const standings = content?.standings || [],
    roundResults = content?.roundResults || [],
    activeStage = stage || standings[0]?.stage_id || "",
    rounds = [
      ...new Set(
        roundResults
          .filter((x: any) => x.stage_id === activeStage)
          .map((x: any) => x.round_name),
      ),
    ] as string[],
    rows = (round === "GERAL" ? standings : roundResults).filter(
      (x: any) =>
        x.stage_id === activeStage &&
        (round === "GERAL" || x.round_name === round),
    ),
    configuredStages = content?.stages || [],
    phases = configuredStages.filter((stage: any) =>
      standings.some((x: any) => x.stage_id === stage.id),
    ),
    isQualifiers = String(phases.find((x) => x.id === activeStage)?.name || "")
      .toUpperCase()
      .includes("CLASSIFICAT"),
    finalization = (content?.finalizations || []).find(
      (x: any) => x.stage_id === activeStage,
    ),
    activeIndex = configuredStages.findIndex((x: any) => x.id === activeStage),
    qualificationLimit =
      Number(finalization?.qualified_limit) ||
      Number(configuredStages[activeIndex + 1]?.team_count) ||
      0,
    isFinal = Boolean(finalization);
  return (
    <main className="rankingPage">
      <section className="publicStandings">
        <div className="rankingShell">
          <div className="rankingHeading">
            <div className="title">
              <small>04 — LIVE RANKING</small>
              <h2>CLASSIFICAÇÃO</h2>
            </div>
            {standings.length > 0 && (
              <div className="rankingFilters">
                <label>
                  FASE
                  <select
                    value={activeStage}
                    onChange={(e) => {
                      setStage(e.target.value);
                      setRound("GERAL");
                    }}
                  >
                    {phases.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                  </select>
                </label>
                {rounds.length > 0 && (
                  <label>
                    JORNADA
                    <select
                      value={round}
                      onChange={(e) => setRound(e.target.value)}
                    >
                      <option>GERAL</option>
                      {rounds.map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            )}
          </div>
          {standings.length ? (
            <div className="rankingCard">
              <div className="rankingTable">
                <header>
                  <b>#</b>
                  <b>EQUIPE</b>
                  <b>BOOYAH</b>
                  <b>ELIM.</b>
                  <b>POSIÇÃO</b>
                  <b>TOTAL</b>
                </header>
                {rows.map((x: any, i: number) => {
                  const position = Number(x.final_position) || i + 1,
                    status =
                      isQualifiers && round === "GERAL"
                        ? x.qualification_status ||
                          (position <= qualificationLimit
                            ? "CLASSIFICADA"
                            : "ELIMINADA")
                        : "";
                  return (
                    <article
                      className={`rankRow rank${position} ${status ? `rank-${status.toLowerCase()}` : ""}`}
                      key={`${x.team_id}-${round}`}
                    >
                      <strong className="rankPosition">{position}º</strong>
                      <div className="rankTeam">
                        {x.logo_url ? (
                          <img
                            src={x.logo_url}
                            alt=""
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <i>{x.tag}</i>
                        )}
                        <span>
                          <b>{x.name}</b>
                          <small>
                            {x.group_name || "SEM GRUPO"}
                            {status && (
                              <>
                                {" "}
                                ·{" "}
                                <em className="qualificationStatus">
                                  {status}
                                  {!isFinal && status === "CLASSIFICADA"
                                    ? " (PROVISÓRIA)"
                                    : ""}
                                </em>
                              </>
                            )}
                          </small>
                        </span>
                      </div>
                      <div className="rankStat">
                        <small>BOOYAH</small>
                        <em>{x.booyahs}</em>
                      </div>
                      <div className="rankStat">
                        <small>ELIM.</small>
                        <em>{x.kills}</em>
                      </div>
                      <div className="rankStat">
                        <small>POSIÇÃO</small>
                        <em>{Number(x.placement_points) || 0}</em>
                      </div>
                      <div className="rankTotal">
                        <small>TOTAL</small>
                        <strong>{x.total_points}</strong>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rankingEmpty">
              A CLASSIFICAÇÃO OFICIAL SERÁ PUBLICADA EM BREVE.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
