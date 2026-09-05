"use client";
import { useEffect, useMemo, useState } from "react";
import GroupManager from "./GroupManager";

function Logo({ team }: { team: any }) {
  return (
    <div className="groupLogo">
      {team.logo_url ? (
        <img src={team.logo_url} alt="" />
      ) : (
        <b>{String(team.tag || "").slice(0, 3)}</b>
      )}
    </div>
  );
}

export default function PhaseGroupManager({
  data,
  mutate,
  view,
  refresh,
}: {
  data: any;
  mutate: (body: any, method?: string) => Promise<boolean>;
  view: (team: any) => void;
  refresh: () => Promise<void>;
}) {
  const [phase, setPhase] = useState("CLASSIFICATÓRIAS"),
    [target, setTarget] = useState<string | null>(null),
    [selected, setSelected] = useState<string[]>([]),
    [search, setSearch] = useState(""),
    [notice, setNotice] = useState(""),
    [semiData, setSemiData] = useState<any>(null);
  const semifinal = data.stages.find((x: any) =>
    String(x.name).toUpperCase().includes("SEMIFINA"),
  );
  async function loadSemi() {
    if (!semifinal?.id) return;
    const r = await fetch(
        `/api/admin/semifinal-groups?stageId=${encodeURIComponent(semifinal.id)}`,
        { cache: "no-store" },
      ),
      j = await r.json();
    if (r.ok) setSemiData(j);
    else setNotice(j.error);
  }
  useEffect(() => {
    if (phase === "SEMIFINAL") loadSemi();
  }, [phase, semifinal?.id, semifinal?.team_count, semifinal?.group_count]);
  const teams = (semiData?.teams || []).map((t: any) => ({
      ...t,
      players: [],
    })),
    assignments = semiData?.assignments || [],
    total =
      Number(semiData?.phaseCapacity) || Number(semifinal?.team_count) || 0,
    names: string[] =
      semiData?.groupNames?.length > 0
        ? semiData.groupNames
        : (data.groups || []).map((x: any) => String(x.name)),
    capacities: number[] = names.map(
      (_, i) =>
        Math.floor(total / Math.max(1, names.length)) +
        (i < total % Math.max(1, names.length) ? 1 : 0),
    ),
    confirmed =
      assignments.length === total &&
      total > 0 &&
      assignments.every((x: any) => x.confirmed_at);
  const assignment = new Map(
      assignments.map((x: any) => [x.team_id, x.group_name]),
    ),
    unassigned = teams.filter((x: any) => !assignment.has(x.id)),
    complete =
      teams.length === total &&
      names.every(
        (name, i) =>
          assignments.filter((x: any) => x.group_name === name).length ===
          capacities[i],
      );
  const ordered = useMemo(
    () =>
      [...teams].sort(
        (a: any, b: any) =>
          Number(assignment.has(a.id)) - Number(assignment.has(b.id)) ||
          a.name.localeCompare(b.name),
      ),
    [teams, assignments],
  );
  async function request(body: any) {
    const r = await fetch("/api/admin/semifinal-groups", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, stageId: semifinal?.id }),
      }),
      j = await r.json();
    setNotice(r.ok ? "ALTERAÇÃO SALVA" : j.error);
    if (r.ok) {
      setTarget(null);
      setSelected([]);
      await Promise.all([loadSemi(), refresh()]);
    }
    return r.ok;
  }
  const selector = (
    <div className="phaseGroupSelector">
      <label>
        FASE
        <select value={phase} onChange={(e) => setPhase(e.target.value)}>
          <option>CLASSIFICATÓRIAS</option>
          <option>SEMIFINAL</option>
        </select>
      </label>
      {phase === "SEMIFINAL" && (
        <span>
          {teams.length}/{total} EQUIPES DISPONÍVEIS
        </span>
      )}
    </div>
  );
  if (phase === "CLASSIFICATÓRIAS")
    return (
      <>
        {selector}
        <GroupManager
          teams={data.teams || []}
          groups={data.groups || []}
          mutate={mutate}
          view={view}
        />
      </>
    );
  const targetCapacity = target ? capacities[names.indexOf(target)] || 0 : 0;
  return (
    <div className="semifinalGroups">
      {selector}
      {notice && (
        <button className="scoringNotice" onClick={() => setNotice("")}>
          {notice} ×
        </button>
      )}
      <>
          <div className="semifinalStatus">
            <b>
              {confirmed
                ? "GRUPOS DA SEMIFINAL CONFIRMADOS"
                : !semiData?.finalized
                  ? "SEMIFINAL AGUARDANDO CLASSIFICATÓRIAS"
                : "DISTRIBUIÇÃO MANUAL DA SEMIFINAL"}
            </b>
            <span>
              {assignments.length}/{total} equipes distribuídas
            </span>
          </div>
          <div className="groupBoard semifinalBoard">
            {[{ name: "SEM GRUPO" }, ...names.map((name) => ({ name }))].map(
              (g: any) => {
                const index = names.indexOf(g.name),
                  capacity = capacities[index] || 0,
                  list =
                    g.name === "SEM GRUPO"
                      ? unassigned
                      : teams.filter(
                          (t: any) => assignment.get(t.id) === g.name,
                        );
                return (
                  <section key={g.name}>
                    <header>
                      <h3>{g.name}</h3>
                      <b>
                        {g.name === "SEM GRUPO"
                          ? `${list.length} EQUIPE${list.length === 1 ? "" : "S"}`
                          : `${list.length}/${capacity}`}
                      </b>
                    </header>
                    {g.name !== "SEM GRUPO" && !confirmed && (
                      <button
                        className="addTeamGroup"
                        disabled={list.length >= capacity}
                        onClick={() => {
                          setTarget(g.name);
                          setSelected([]);
                          setSearch("");
                        }}
                      >
                        ＋ ADICIONAR EQUIPE
                      </button>
                    )}
                    <div className="groupCards">
                      {list.map((t: any) => (
                        <article key={t.id}>
                          <Logo team={t} />
                          <p>
                            <b>{t.name}</b>
                            <small>
                              {t.tag} · {t.country}
                            </small>
                          </p>
                          <details>
                            <summary>⋯</summary>
                            <div>
                              <button onClick={() => view(t)}>
                                VER EQUIPE
                              </button>
                              {!confirmed && g.name !== "SEM GRUPO" && (
                                <>
                                  {names
                                    .filter((x) => x !== g.name)
                                    .map((name) => (
                                      <button
                                        key={name}
                                        onClick={() =>
                                          request({
                                            action: "assign",
                                            teamIds: [t.id],
                                            group: name,
                                          })
                                        }
                                      >
                                        MOVER PARA {name}
                                      </button>
                                    ))}
                                  <button
                                    onClick={() =>
                                      request({
                                        action: "assign",
                                        teamIds: [t.id],
                                        group: null,
                                      })
                                    }
                                  >
                                    REMOVER DO GRUPO
                                  </button>
                                </>
                              )}
                            </div>
                          </details>
                        </article>
                      ))}
                    </div>
                  </section>
                );
              },
            )}
          </div>
          <button
            className="adminPrimary confirmSemifinal"
            disabled={!complete || confirmed}
            onClick={() =>
              confirm(
                `CONFIRMAR OS ${names.length} GRUPOS DA SEMIFINAL? Após confirmar, a distribuição ficará disponível na Classificação.`,
              ) && request({ action: "confirm" })
            }
          >
            {confirmed
              ? "GRUPOS DA SEMIFINAL CONFIRMADOS"
              : "CONFIRMAR GRUPOS DA SEMIFINAL"}
          </button>
      </>
      {target && (
        <div className="groupModal">
          <section>
            <button className="modalClose" onClick={() => setTarget(null)}>
              ×
            </button>
            <small>SEMIFINAL · DISTRIBUIÇÃO MANUAL</small>
            <h2>ADICIONAR EQUIPE AO {target}</h2>
            <input
              placeholder="BUSCAR EQUIPE"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div>
              {ordered
                .filter((t: any) =>
                  `${t.name} ${t.tag}`
                    .toLowerCase()
                    .includes(search.toLowerCase()),
                )
                .map((t: any) => (
                  <label key={t.id}>
                    <input
                      type="checkbox"
                      checked={selected.includes(t.id)}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? [...selected, t.id]
                            : selected.filter((id) => id !== t.id),
                        )
                      }
                    />
                    <Logo team={t} />
                    <p>
                      <b>{t.name}</b>
                      <small>
                        {t.tag} · {t.country}
                      </small>
                    </p>
                    <em>{assignment.get(t.id) || "SEM GRUPO"}</em>
                  </label>
                ))}
            </div>
            <footer>
              <span>{selected.length} SELECIONADA(S)</span>
              <button onClick={() => setTarget(null)}>CANCELAR</button>
              <button
                className="adminPrimary"
                disabled={
                  !selected.length ||
                  assignments.filter(
                    (x: any) =>
                      x.group_name === target && !selected.includes(x.team_id),
                  ).length +
                    selected.length >
                    targetCapacity
                }
                onClick={() =>
                  request({
                    action: "assign",
                    teamIds: selected,
                    group: target,
                  })
                }
              >
                ADICIONAR AO {target}
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
