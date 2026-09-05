import { can, database, getAdmin, logAdmin } from "../../_db";

const fail = (error: string, status = 400) =>
  Response.json({ success: false, error }, { status });
const groupNames = (count: number) =>
  Array.from(
    { length: count },
    (_, i) => `GRUPO ${i < 26 ? String.fromCharCode(65 + i) : i + 1}`,
  );
const capacities = (total: number, groups: number) =>
  Array.from(
    { length: groups },
    (_, i) => Math.floor(total / groups) + (i < total % groups ? 1 : 0),
  );

async function context(stageId?: string | null) {
  const db = database();
  const stages = (
    await db
      .prepare("SELECT * FROM competition_stages ORDER BY order_index")
      .all()
  ).results as any[];
  const stageIndex = stages.findIndex((x) =>
    stageId
      ? x.id === stageId
      : String(x.name).toUpperCase().includes("SEMIFINA"),
  );
  const stage = stages[stageIndex],
    qualifier = stageIndex > 0 ? stages[stageIndex - 1] : null;
  const existingGroups = (
    await db
      .prepare("SELECT name FROM competition_groups ORDER BY sort_order,name")
      .all()
  ).results as any[];
  const total = Math.max(0, Math.trunc(Number(stage?.team_count) || 0));
  const configuredGroups = Math.trunc(Number(stage?.group_count) || 0);
  const groups = Math.max(
    1,
    configuredGroups || existingGroups.length || 1,
  );
  const names = configuredGroups
    ? groupNames(groups)
    : existingGroups.slice(0, groups).map((x) => String(x.name));
  return {
    db,
    stage,
    qualifier,
    total,
    groups,
    names,
    capacities: capacities(total, groups),
  };
}

export async function GET(r: Request) {
  try {
    const admin = await getAdmin(r);
    if (!admin) return fail("Não autorizado", 401);
    const stageId = new URL(r.url).searchParams.get("stageId");
    const { db, stage, qualifier, total, groups, names, capacities } =
      await context(stageId);
    if (!stage) return fail("Fase Semifinal não encontrada", 404);
    const finalization = qualifier
      ? ((await db
          .prepare("SELECT * FROM stage_finalizations WHERE stage_id=?")
          .bind(qualifier.id)
          .first()) as any)
      : null;
    const teams = finalization
      ? (
          await db
            .prepare(
              "SELECT t.*,q.final_position FROM stage_qualification_results q JOIN teams t ON t.id=q.team_id WHERE q.stage_id=? AND q.qualification_status='CLASSIFICADA' AND t.status='APROVADA' AND t.deleted_at IS NULL ORDER BY q.final_position",
            )
            .bind(qualifier.id)
            .all()
        ).results
      : [];
    const assignments = stage
      ? (
          await db
            .prepare(
              "SELECT * FROM stage_group_assignments WHERE stage_id=? ORDER BY group_name,created_at",
            )
            .bind(stage.id)
            .all()
        ).results
      : [];
    return Response.json({
      success: true,
      stage,
      finalized: Boolean(finalization),
      teams,
      assignments,
      total,
      phaseCapacity: total,
      availableTeams: teams.length,
      groupCount: groups,
      groupNames: names,
      capacities,
    });
  } catch (e) {
    console.error("[SEMIFINAL GROUPS GET]", e);
    return fail("Não foi possível carregar os grupos da Semifinal", 500);
  }
}

export async function PATCH(r: Request) {
  try {
    const admin = await getAdmin(r);
    if (!admin) return fail("Não autorizado", 401);
    if (!can(admin, "groups.edit")) return fail("Sem permissão", 403);
    const b = (await r.json()) as any,
      { db, stage, qualifier, total, groups, names, capacities } =
        await context(b.stageId);
    if (!stage || stage.id !== b.stageId)
      return fail("Fase Semifinal não encontrada", 404);
    const finalization = qualifier
      ? ((await db
          .prepare("SELECT * FROM stage_finalizations WHERE stage_id=?")
          .bind(qualifier.id)
          .first()) as any)
      : null;
    if (!finalization)
      return fail("SEMIFINAL AGUARDANDO CLASSIFICATÓRIAS", 409);
    const officialTotal = Number(finalization.qualified_limit) || total;
    if (b.action === "assign") {
      if (
        await db
          .prepare(
            "SELECT id FROM stage_group_assignments WHERE stage_id=? AND confirmed_at IS NOT NULL LIMIT 1",
          )
          .bind(stage.id)
          .first()
      )
        return fail("Os grupos da Semifinal já foram confirmados", 409);
      const ids = [
          ...new Set((b.teamIds || [b.teamId]).filter(Boolean).map(String)),
        ] as string[],
        group = b.group ? String(b.group).toUpperCase() : null;
      if (!ids.length) return fail("Selecione pelo menos uma equipe");
      if (group && !names.includes(group))
        return fail("Selecione um grupo válido");
      const marks = ids.map(() => "?").join(","),
        official = (await db
          .prepare(
            `SELECT COUNT(*) total FROM stage_qualification_results WHERE stage_id=? AND qualification_status='CLASSIFICADA' AND team_id IN (${marks})`,
          )
          .bind(qualifier.id, ...ids)
          .first()) as any;
      if (Number(official?.total) !== ids.length)
        return fail(
          "Somente equipes oficialmente classificadas podem entrar na Semifinal",
          403,
        );
      const current = (
          await db
            .prepare(
              "SELECT team_id,group_name FROM stage_group_assignments WHERE stage_id=?",
            )
            .bind(stage.id)
            .all()
        ).results as any[],
        targetIndex = group ? names.indexOf(group) : -1;
      if (
        group &&
        current.filter(
          (x) => x.group_name === group && !ids.includes(String(x.team_id)),
        ).length +
          ids.length >
          capacities[targetIndex]
      )
        return fail(
          `${group} aceita no máximo ${capacities[targetIndex]} equipes`,
        );
      const now = Date.now(),
        statements = ids.map((id) =>
          group
            ? db
                .prepare(
                  "INSERT INTO stage_group_assignments(id,stage_id,team_id,group_name,confirmed_at,created_at,updated_at) VALUES(?,?,?,?,NULL,?,?) ON CONFLICT(stage_id,team_id) DO UPDATE SET group_name=excluded.group_name,confirmed_at=NULL,updated_at=excluded.updated_at",
                )
                .bind(crypto.randomUUID(), stage.id, id, group, now, now)
            : db
                .prepare(
                  "DELETE FROM stage_group_assignments WHERE stage_id=? AND team_id=?",
                )
                .bind(stage.id, id),
        );
      await db.batch(statements);
      await logAdmin(
        admin,
        group
          ? "DISTRIBUIU EQUIPE NA SEMIFINAL"
          : "REMOVEU EQUIPE DA DISTRIBUIÇÃO",
        "SEMIFINAL",
        stage.id,
        group || "SEM GRUPO",
        `${ids.length} equipe(s)`,
      );
      return Response.json({ success: true });
    }
    if (b.action === "confirm") {
      const official = (await db
        .prepare(
          "SELECT COUNT(*) total FROM stage_qualification_results WHERE stage_id=? AND qualification_status='CLASSIFICADA'",
        )
        .bind(qualifier.id)
        .first()) as any;
      if (Number(official?.total) !== officialTotal)
        return fail(
          `São necessárias ${officialTotal} equipes oficialmente classificadas`,
          409,
        );
      const counts = (
        await db
          .prepare(
            "SELECT group_name,COUNT(*) total FROM stage_group_assignments WHERE stage_id=? GROUP BY group_name",
          )
          .bind(stage.id)
          .all()
      ).results as any[];
      const valid = names.every(
        (name, i) =>
          Number(counts.find((x) => x.group_name === name)?.total) ===
          capacities[i],
      );
      if (
        !valid ||
        counts.reduce((sum, x) => sum + Number(x.total), 0) !== officialTotal
      )
        return fail(
          "Distribua todas as equipes nas capacidades configuradas antes de confirmar",
        );
      const now = Date.now();
      await db
        .prepare(
          "UPDATE stage_group_assignments SET confirmed_at=?,updated_at=? WHERE stage_id=?",
        )
        .bind(now, now, stage.id)
        .run();
      await logAdmin(
        admin,
        "CONFIRMOU GRUPOS DA SEMIFINAL",
        "SEMIFINAL",
        stage.id,
        stage.name,
        `${groups} grupos · ${capacities.join(" / ")} equipes`,
      );
      return Response.json({ success: true, confirmedAt: now });
    }
    return fail("Ação inválida");
  } catch (e) {
    console.error("[SEMIFINAL GROUPS]", e);
    return fail(
      e instanceof Error ? e.message : "Falha ao organizar a Semifinal",
      500,
    );
  }
}
