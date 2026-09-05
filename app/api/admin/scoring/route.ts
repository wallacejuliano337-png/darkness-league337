import { can, database, getAdmin, logAdmin } from "../../_db";
import {
  ensureScoringSchema,
  normalizePlacements,
  scoreRow,
} from "../../_scoring";

const fail = (error: string, status = 400) =>
  Response.json({ success: false, error }, { status });
const cleanRound = (value: unknown) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .slice(0, 60);

export async function GET(r: Request) {
  try {
    const admin = await getAdmin(r);
    if (!admin) return fail("Não autorizado", 401);
    await ensureScoringSchema();
    const db = database();
    const [rules, results, finalizations, qualificationResults, stageTeams] =
      await Promise.all([
        db
          .prepare(
            "SELECT * FROM scoring_rules WHERE is_active=1 ORDER BY stage_id",
          )
          .all(),
        db
          .prepare(
            "SELECT * FROM match_results WHERE match_number>0 ORDER BY stage_id,round_name,match_number,team_id",
          )
          .all(),
        db
          .prepare(
            "SELECT * FROM stage_finalizations ORDER BY finalized_at DESC",
          )
          .all(),
        db
          .prepare(
            `SELECT q.*,t.name,t.tag,t.logo_url FROM stage_qualification_results q JOIN teams t ON t.id=q.team_id ORDER BY q.stage_id,q.final_position`,
          )
          .all(),
        db
          .prepare(
            `SELECT a.*,t.name,t.tag,t.logo_url,t.country,t.region,t.status FROM stage_group_assignments a JOIN teams t ON t.id=a.team_id WHERE a.confirmed_at IS NOT NULL AND t.status='APROVADA' AND t.deleted_at IS NULL ORDER BY a.stage_id,a.group_name,t.name`,
          )
          .all(),
      ]);
    return Response.json({
      success: true,
      rules: rules.results.map((x: any) => ({
        ...x,
        placements: JSON.parse(x.placement_points_json || "{}"),
      })),
      results: results.results,
      finalizations: finalizations.results,
      qualificationResults: qualificationResults.results,
      stageTeams: stageTeams.results,
    });
  } catch (e) {
    console.error("[SCORING GET]", e);
    return fail("Não foi possível carregar a pontuação", 500);
  }
}

export async function PATCH(r: Request) {
  try {
    const admin = await getAdmin(r);
    if (!admin) return fail("Não autorizado", 401);
    if (!can(admin, "results.edit")) return fail("Sem permissão", 403);
    await ensureScoringSchema();
    const db = database(),
      b = (await r.json()) as any;
    if (b.action === "scoring_rule_save") {
      const stage = (await db
        .prepare("SELECT name FROM competition_stages WHERE id=?")
        .bind(b.stageId)
        .first()) as any;
      if (!stage) return fail("Fase não encontrada", 404);
      const kills = Number(b.killsPoints),
        booyah = Number(b.booyahPoints),
        placements = normalizePlacements(b.placements);
      if (
        !Number.isFinite(kills) ||
        kills < 0 ||
        !Number.isFinite(booyah) ||
        booyah < 0 ||
        Object.keys(placements).length < 12
      )
        return fail(
          "Informe valores válidos para eliminação, Booyah e posições",
        );
      const previous = (await db
          .prepare(
            "SELECT COALESCE(MAX(version),0) version FROM scoring_rules WHERE stage_id=?",
          )
          .bind(b.stageId)
          .first()) as any,
        id = crypto.randomUUID(),
        now = Date.now();
      await db.batch([
        db
          .prepare(
            "UPDATE scoring_rules SET is_active=0,updated_at=? WHERE stage_id=?",
          )
          .bind(now, b.stageId),
        db
          .prepare(
            "INSERT INTO scoring_rules(id,stage_id,version,kills_points,booyah_points,placement_points_json,is_active,created_at,updated_at) VALUES(?,?,?,?,?,?,1,?,?)",
          )
          .bind(
            id,
            b.stageId,
            Number(previous?.version || 0) + 1,
            kills,
            booyah,
            JSON.stringify(placements),
            now,
            now,
          ),
      ]);
      await logAdmin(
        admin,
        "CONFIGUROU PONTUAÇÃO",
        "CLASSIFICAÇÃO",
        b.stageId,
        stage.name,
        `Eliminação: ${kills}; Booyah: ${booyah}; versão ${Number(previous?.version || 0) + 1}`,
      );
      return Response.json({ success: true });
    }
    if (b.action === "match_save") {
      const roundName = cleanRound(b.roundName),
        groupName = String(b.groupName || "")
          .trim()
          .slice(0, 60),
        matchNumber = Math.trunc(Number(b.matchNumber));
      const stage = (await db
        .prepare(
          "SELECT name,team_count,match_count FROM competition_stages WHERE id=?",
        )
        .bind(b.stageId)
        .first()) as any;
      if (
        await db
          .prepare("SELECT id FROM stage_finalizations WHERE stage_id=?")
          .bind(b.stageId)
          .first()
      )
        return fail(
          "Esta fase já foi encerrada e seu ranking está congelado",
          409,
        );
      const rule = (await db
        .prepare(
          "SELECT * FROM scoring_rules WHERE stage_id=? AND is_active=1 LIMIT 1",
        )
        .bind(b.stageId)
        .first()) as any;
      const group = (await db
        .prepare("SELECT name FROM competition_groups WHERE name=?")
        .bind(groupName)
        .first()) as any;
      if (!stage || !rule || !roundName || !group || !Array.isArray(b.rows))
        return fail(
          "Fase, jornada, grupo, queda, regra e resultados são obrigatórios",
        );
      if (
        !Number.isInteger(matchNumber) ||
        matchNumber < 1 ||
        matchNumber > Number(stage.match_count || 6)
      )
        return fail("Selecione uma queda válida para esta fase");
      const placements = JSON.parse(rule.placement_points_json || "{}"),
        maxPosition = Math.max(
          ...Object.keys(placements).map(Number).filter(Number.isFinite),
          0,
        ),
        used = new Map<number, string>(),
        scored: any[] = [];
      for (const x of b.rows) {
        const position = Math.trunc(Number(x.placement_position) || 0);
        if (position === 0) continue;
        const kills = Number(x.kills),
          penalty = Number(x.penalty_points);
        if (
          !x.team_id ||
          !Number.isInteger(position) ||
          position < 1 ||
          position > Math.min(12, maxPosition)
        )
          return fail(`Colocação inválida para ${x.name || "uma equipe"}`);
        if (!Number.isFinite(kills) || kills < 0 || !Number.isInteger(kills))
          return fail(`Eliminações inválidas para ${x.name || "uma equipe"}`);
        if (!Number.isFinite(penalty) || penalty < 0)
          return fail(`Penalidade inválida para ${x.name || "uma equipe"}`);
        if (used.has(position))
          return fail(
            `A colocação ${position}º está repetida entre ${used.get(position)} e ${x.name || "outra equipe"}.`,
          );
        used.set(position, x.name || x.team_id);
        scored.push({
          ...x,
          ...scoreRow({ ...x, booyahs: position === 1 ? 1 : 0 }, rule),
        });
      }
      if (!scored.length)
        return fail("Informe o resultado de pelo menos uma equipe");
      const ids = scored.map((x) => String(x.team_id)),
        placeholders = ids.map(() => "?").join(","),
        approved = String(stage.name).toUpperCase().includes("SEMIFINAL")
          ? ((await db
              .prepare(
                `SELECT COUNT(*) total FROM teams t JOIN stage_group_assignments a ON a.team_id=t.id WHERE t.id IN (${placeholders}) AND t.status='APROVADA' AND t.deleted_at IS NULL AND a.stage_id=? AND a.group_name=? AND a.confirmed_at IS NOT NULL`,
              )
              .bind(...ids, b.stageId, groupName)
              .first()) as any)
          : ((await db
              .prepare(
                `SELECT COUNT(*) total FROM teams WHERE id IN (${placeholders}) AND status='APROVADA' AND deleted_at IS NULL AND group_name=?`,
              )
              .bind(...ids, groupName)
              .first()) as any);
      if (Number(approved?.total) !== ids.length)
        return fail(`Uma ou mais equipes não pertencem ao ${groupName}`);
      const now = Date.now(),
        statements: any[] = [
          db
            .prepare(
              "DELETE FROM match_results WHERE stage_id=? AND round_name=? AND group_name=? AND match_number=?",
            )
            .bind(b.stageId, roundName, groupName, matchNumber),
        ];
      for (const x of scored)
        statements.push(
          db
            .prepare(
              "INSERT INTO match_results(id,stage_id,round_name,group_name,match_number,team_id,booyahs,kills,placement_points,penalty_points,created_at,updated_at,placement_position,total_points,scoring_rule_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            )
            .bind(
              crypto.randomUUID(),
              b.stageId,
              roundName,
              groupName,
              matchNumber,
              x.team_id,
              x.booyahs,
              x.kills,
              x.placementPoints,
              x.penalty,
              now,
              now,
              x.position,
              x.total,
              rule.id,
            ),
        );
      await db.batch(statements);
      await logAdmin(
        admin,
        "SALVOU QUEDA",
        "CLASSIFICAÇÃO",
        b.stageId,
        stage.name,
        `${roundName} · ${groupName} · QUEDA ${matchNumber} · ${scored.length} equipe(s)`,
      );
      return Response.json({ success: true, count: scored.length });
    }
    if (b.action === "standings_publish") {
      const roundName = cleanRound(b.roundName),
        groupName = String(b.groupName || "")
          .trim()
          .slice(0, 60),
        stage = (await db
          .prepare("SELECT name FROM competition_stages WHERE id=?")
          .bind(b.stageId)
          .first()) as any;
      const validGroup =
        groupName === "TODOS" ||
        (String(stage?.name || "")
          .toUpperCase()
          .includes("SEMIFINAL") &&
          Boolean(
            await db
              .prepare(
                "SELECT id FROM stage_group_assignments WHERE stage_id=? AND group_name=? AND confirmed_at IS NOT NULL LIMIT 1",
              )
              .bind(b.stageId, groupName)
              .first(),
          )) ||
        Boolean(
          await db
            .prepare("SELECT id FROM competition_groups WHERE name=?")
            .bind(groupName)
            .first(),
        );
      if (
        await db
          .prepare("SELECT id FROM stage_finalizations WHERE stage_id=?")
          .bind(b.stageId)
          .first()
      )
        return fail(
          "Esta fase já foi encerrada e seu ranking está congelado",
          409,
        );
      if (!stage || !roundName || !validGroup)
        return fail("Fase, jornada e grupo são obrigatórios");
      const whereGroup = groupName === "TODOS" ? "" : " AND group_name=?",
        params =
          groupName === "TODOS"
            ? [b.stageId, roundName]
            : [b.stageId, roundName, groupName];
      const aggregate = (
        await db
          .prepare(
            `SELECT group_name,team_id,SUM(booyahs) booyahs,SUM(kills) kills,SUM(placement_points) placement_points,SUM(penalty_points) penalty_points,SUM(total_points) total_points FROM match_results WHERE stage_id=? AND round_name=?${whereGroup} AND match_number>0 GROUP BY group_name,team_id`,
          )
          .bind(...params)
          .all()
      ).results as any[];
      if (!aggregate.length)
        return fail("Salve pelo menos uma queda antes de publicar");
      const now = Date.now(),
        statements: any[] = [
          groupName === "TODOS"
            ? db
                .prepare(
                  "DELETE FROM published_standings WHERE stage_id=? AND round_name=?",
                )
                .bind(b.stageId, roundName)
            : db
                .prepare(
                  "DELETE FROM published_standings WHERE stage_id=? AND round_name=? AND group_name=?",
                )
                .bind(b.stageId, roundName, groupName),
        ];
      for (const x of aggregate)
        statements.push(
          db
            .prepare(
              "INSERT INTO published_standings(id,stage_id,round_name,group_name,team_id,booyahs,kills,placement_points,penalty_points,total_points,published_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
            )
            .bind(
              crypto.randomUUID(),
              b.stageId,
              roundName,
              x.group_name,
              x.team_id,
              Number(x.booyahs) || 0,
              Number(x.kills) || 0,
              Number(x.placement_points) || 0,
              Number(x.penalty_points) || 0,
              Number(x.total_points) || 0,
              now,
            ),
        );
      await db.batch(statements);
      await logAdmin(
        admin,
        "PUBLICOU CLASSIFICAÇÃO",
        "CLASSIFICAÇÃO",
        b.stageId,
        stage.name,
        `${roundName} · ${groupName} · ${aggregate.length} equipe(s)`,
      );
      return Response.json({ success: true, publishedAt: now });
    }
    if (b.action === "qualifiers_finalize") {
      const stage = (await db
        .prepare(
          "SELECT id,name,order_index FROM competition_stages WHERE id=?",
        )
        .bind(b.stageId)
        .first()) as any;
      if (!stage || !String(stage.name).toUpperCase().includes("CLASSIFICAT"))
        return fail("Selecione a fase Classificatórias");
      if (
        await db
          .prepare("SELECT id FROM stage_finalizations WHERE stage_id=?")
          .bind(b.stageId)
          .first()
      )
        return fail("As Classificatórias já foram encerradas", 409);
      const nextStage = (await db
        .prepare(
          "SELECT id,name,team_count FROM competition_stages WHERE order_index>? ORDER BY order_index LIMIT 1",
        )
        .bind(stage.order_index)
        .first()) as any;
      const limit = Math.max(0, Math.trunc(Number(nextStage?.team_count) || 0));
      if (!limit)
        return fail(
          "Configure a quantidade de equipes da próxima fase antes de encerrar as Classificatórias",
          409,
        );
      const ranking = (
        await db
          .prepare(
            `SELECT r.team_id,t.name,t.group_name,SUM(r.booyahs) booyahs,SUM(r.kills) kills,SUM(r.placement_points) placement_points,SUM(r.penalty_points) penalty_points,SUM(r.total_points) total_points FROM match_results r JOIN teams t ON t.id=r.team_id WHERE r.stage_id=? AND r.match_number>0 AND t.status='APROVADA' AND t.deleted_at IS NULL GROUP BY r.team_id,t.name,t.group_name ORDER BY total_points DESC,booyahs DESC,kills DESC,t.name ASC`,
          )
          .bind(b.stageId)
          .all()
      ).results as any[];
      if (!ranking.length)
        return fail(
          "Salve os resultados antes de encerrar as Classificatórias",
        );
      if (ranking.length < limit)
        return fail(
          `NÃO É POSSÍVEL ENCERRAR AS CLASSIFICATÓRIAS. São necessárias pelo menos ${limit} equipes na Classificação Geral para definir as classificadas para ${nextStage.name}. Equipes atuais: ${ranking.length}. Mínimo necessário: ${limit}.`,
          409,
        );
      const finalizationId = crypto.randomUUID(),
        now = Date.now(),
        statements: any[] = [
          db
            .prepare(
              "INSERT INTO stage_finalizations(id,stage_id,status,qualified_limit,finalized_at,finalized_by) VALUES(?,?,?,?,?,?)",
            )
            .bind(
              finalizationId,
              b.stageId,
              "FINALIZADA",
              limit,
              now,
              admin.email,
            ),
          db
            .prepare(
              "UPDATE competition_stages SET status='FINALIZADA',updated_at=? WHERE id=?",
            )
            .bind(now, b.stageId),
        ];
      ranking.forEach((x: any, i: number) =>
        statements.push(
          db
            .prepare(
              "INSERT INTO stage_qualification_results(id,finalization_id,stage_id,team_id,final_position,qualification_status,group_name,booyahs,kills,placement_points,penalty_points,total_points) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
            )
            .bind(
              crypto.randomUUID(),
              finalizationId,
              b.stageId,
              x.team_id,
              i + 1,
              i < limit ? "CLASSIFICADA" : "ELIMINADA",
              x.group_name || null,
              Number(x.booyahs) || 0,
              Number(x.kills) || 0,
              Number(x.placement_points) || 0,
              Number(x.penalty_points) || 0,
              Number(x.total_points) || 0,
            ),
        ),
      );
      await db.batch(statements);
      await logAdmin(
        admin,
        "ENCERROU CLASSIFICATÓRIAS",
        "CLASSIFICAÇÃO",
        b.stageId,
        stage.name,
        `${Math.min(limit, ranking.length)} classificadas · ${Math.max(0, ranking.length - limit)} eliminadas`,
      );
      return Response.json({
        success: true,
        finalizedAt: now,
        qualifiedCount: Math.min(limit, ranking.length),
      });
    }
    return fail("Ação inválida");
  } catch (e) {
    console.error("[SCORING PATCH]", e);
    return fail(e instanceof Error ? e.message : "Falha na pontuação", 500);
  }
}
