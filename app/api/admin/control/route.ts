import {
  can,
  database,
  ensureAdminSchema,
  getAdmin,
  hashPassword,
  logAdmin,
} from "../../_db";
const jsonError = (error: string, status = 400) =>
  Response.json({ success: false, error }, { status });
export async function GET(r: Request) {
  try {
    const admin = await getAdmin(r);
    if (!admin) return jsonError("Não autorizado", 401);
    const db = database(),
      u = new URL(r.url),
      limit = Math.min(
        100,
        Math.max(10, Number(u.searchParams.get("limit") || 30)),
      ),
      offset = Math.max(0, Number(u.searchParams.get("offset") || 0));
    const teams = (
      await db
        .prepare(
          "SELECT * FROM teams WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT ? OFFSET ?",
        )
        .bind(limit, offset)
        .all()
    ).results as any[];
    const enriched = await Promise.all(
      teams.map(async (t) => ({
        ...t,
        players: (
          await db
            .prepare(
              "SELECT * FROM players WHERE team_id=? ORDER BY roster_type,created_at",
            )
            .bind(t.id)
            .all()
        ).results,
        coach: await db
          .prepare("SELECT * FROM team_coaches WHERE team_id=? LIMIT 1")
          .bind(t.id)
          .first(),
        responsible: await db
          .prepare("SELECT * FROM team_responsibles WHERE team_id=? LIMIT 1")
          .bind(t.id)
          .first(),
      })),
    );
    const [
      settings,
      stages,
      prizes,
      groups,
      managers,
      logs,
      rules,
      results,
      total,
      qualificationResults,
      stageGroups,
    ] = await Promise.all([
      db
        .prepare("SELECT * FROM competition_settings WHERE id='current'")
        .first(),
      db.prepare("SELECT * FROM competition_stages ORDER BY order_index").all(),
      db.prepare("SELECT * FROM competition_prizes ORDER BY order_index").all(),
      db
        .prepare("SELECT * FROM competition_groups ORDER BY sort_order,name")
        .all(),
      db
        .prepare(
          "SELECT id,name,email,role,status,permissions,last_login,created_at FROM admin_users ORDER BY created_at DESC",
        )
        .all(),
      db
        .prepare("SELECT * FROM admin_logs ORDER BY created_at DESC LIMIT 100")
        .all(),
      db.prepare("SELECT * FROM rules ORDER BY sort_order").all(),
      db
        .prepare("SELECT * FROM match_results ORDER BY stage_id,round_name")
        .all(),
      db
        .prepare("SELECT COUNT(*) total FROM teams WHERE deleted_at IS NULL")
        .first(),
      db
        .prepare(
          "SELECT * FROM stage_qualification_results ORDER BY stage_id,final_position",
        )
        .all(),
      db
        .prepare(
          "SELECT * FROM stage_group_assignments ORDER BY stage_id,group_name,created_at",
        )
        .all(),
    ]);
    return Response.json({
      success: true,
      admin,
      teams: enriched,
      settings,
      stages: stages.results,
      prizes: prizes.results,
      groups: groups.results,
      managers: managers.results.map((x: any) => ({
        ...x,
        permissions: JSON.parse(x.permissions || "[]"),
      })),
      logs: logs.results,
      rules: rules.results,
      results: results.results,
      qualificationResults: qualificationResults.results,
      stageGroups: stageGroups.results,
      total: (total as any)?.total || 0,
      limit,
      offset,
    });
  } catch (e) {
    console.error("[ADMIN CONTROL GET]", e);
    return jsonError("Não foi possível carregar o painel", 500);
  }
}
export async function POST(r: Request) {
  try {
    const admin = await getAdmin(r);
    if (!admin) return jsonError("Não autorizado", 401);
    const b = (await r.json()) as any,
      db = database();
    if (b.action === "manager_create") {
      if (!can(admin, "managers.create"))
        return jsonError("Sem permissão", 403);
      if (!b.name || !b.email || !b.password || b.password.length < 8)
        return jsonError("Informe nome, e-mail e senha com 8 caracteres");
      const id = crypto.randomUUID();
      await db
        .prepare(
          "INSERT INTO admin_users(id,name,email,password_hash,role,status,permissions,created_at) VALUES(?,?,?,?,?,?,?,?)",
        )
        .bind(
          id,
          b.name,
          String(b.email).toLowerCase(),
          await hashPassword(b.password),
          "MANAGER",
          "ATIVO",
          JSON.stringify(b.permissions || []),
          Date.now(),
        )
        .run();
      await logAdmin(admin, "CRIOU GERENTE", "GERENTE", id, b.name);
      return Response.json({ success: true });
    }
    if (b.action === "group_create") {
      if (!can(admin, "groups.edit")) return jsonError("Sem permissão", 403);
      const name = String(b.name || "")
        .trim()
        .toUpperCase();
      if (!name) return jsonError("Nome do grupo obrigatório");
      const id = crypto.randomUUID();
      await db
        .prepare(
          "INSERT INTO competition_groups(id,name,sort_order,created_at) VALUES(?,?,?,?)",
        )
        .bind(id, name, Date.now(), Date.now())
        .run();
      await logAdmin(admin, "CRIOU GRUPO", "GRUPO", id, name);
      return Response.json({ success: true });
    }
    return jsonError("Ação inválida");
  } catch (e) {
    console.error("[ADMIN CONTROL POST]", e);
    return jsonError(
      e instanceof Error ? e.message : "Falha administrativa",
      500,
    );
  }
}
export async function PATCH(r: Request) {
  try {
    const admin = await getAdmin(r);
    if (!admin) return jsonError("Não autorizado", 401);
    const b = (await r.json()) as any,
      db = database();
    if (b.action === "results_save") {
      if (!can(admin, "results.edit")) return jsonError("Sem permissão", 403);
      const roundName = String(b.roundName || "")
          .trim()
          .toUpperCase(),
        stage = (await db
          .prepare("SELECT name FROM competition_stages WHERE id=?")
          .bind(b.stageId)
          .first()) as any;
      if (!stage || !roundName || !Array.isArray(b.rows))
        return jsonError("Fase, rodada e resultados são obrigatórios");
      const now = Date.now(),
        statements: any[] = [
          db
            .prepare(
              "DELETE FROM match_results WHERE stage_id=? AND round_name=?",
            )
            .bind(b.stageId, roundName),
        ];
      for (const x of b.rows) {
        if (!x.team_id) continue;
        statements.push(
          db
            .prepare(
              "INSERT INTO match_results(id,stage_id,round_name,team_id,booyahs,kills,placement_points,penalty_points,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)",
            )
            .bind(
              crypto.randomUUID(),
              b.stageId,
              roundName,
              x.team_id,
              Math.max(0, Number(x.booyahs) || 0),
              Math.max(0, Number(x.kills) || 0),
              Math.max(0, Number(x.placement_points) || 0),
              Math.max(0, Number(x.penalty_points) || 0),
              now,
              now,
            ),
        );
      }
      await db.batch(statements);
      await logAdmin(
        admin,
        "PUBLICOU RESULTADOS",
        "CLASSIFICAÇÃO",
        b.stageId,
        stage.name,
        roundName,
      );
      return Response.json({ success: true });
    }
    if (b.action === "competition_publish") {
      if (!can(admin, "competition.edit"))
        return jsonError("Sem permissão", 403);
      if (!Array.isArray(b.stages) || !b.stages.length)
        return jsonError("Adicione pelo menos uma fase");
      if (!Array.isArray(b.prizes)) return jsonError("Premiações inválidas");
      const currentStages = (
        await db
          .prepare("SELECT * FROM competition_stages ORDER BY order_index")
          .all()
      ).results as any[];
      const frozenStages = (
        await db.prepare("SELECT stage_id FROM stage_finalizations").all()
      ).results as any[];
      for (const frozen of frozenStages) {
        const previousIndex = currentStages.findIndex(
          (x) => x.id === frozen.stage_id,
        );
        const currentFrozen = currentStages[previousIndex];
        const incomingFrozen = currentFrozen
          ? b.stages.find((x: any) => x.id === currentFrozen.id)
          : null;
        if (
          currentFrozen &&
          (!incomingFrozen ||
            Number(incomingFrozen.team_count) !==
              Number(currentFrozen.team_count) ||
            (currentFrozen.group_count != null &&
              Number(incomingFrozen.group_count || 0) !==
                Number(currentFrozen.group_count)))
        )
          return jsonError(
            `${currentFrozen.name} já possui uma classificação oficial encerrada. A configuração não foi alterada e nenhuma classificação foi apagada.`,
            409,
          );
        const currentNext = currentStages[previousIndex + 1];
        const incomingNext = currentNext
          ? b.stages.find((x: any) => x.id === currentNext.id)
          : null;
        if (
          currentNext &&
          (!incomingNext ||
            Number(incomingNext.team_count) !== Number(currentNext.team_count))
        )
          return jsonError(
            `A quantidade de equipes de ${currentNext.name} está vinculada a uma classificação oficial já encerrada. A configuração não foi alterada e nenhuma classificação foi apagada.`,
            409,
          );
      }
      const confirmedGroups = (
        await db
          .prepare(
            "SELECT stage_id,COUNT(DISTINCT group_name) group_count FROM stage_group_assignments WHERE confirmed_at IS NOT NULL GROUP BY stage_id",
          )
          .all()
      ).results as any[];
      for (const confirmed of confirmedGroups) {
        const current = currentStages.find((x) => x.id === confirmed.stage_id);
        const incoming = b.stages.find((x: any) => x.id === confirmed.stage_id);
        if (
          current &&
          (!incoming ||
            Number(incoming.team_count) !== Number(current.team_count) ||
            Number(incoming.group_count || 0) !==
              Number(current.group_count || confirmed.group_count || 0))
        )
          return jsonError(
            `A configuração de ${current.name} possui grupos oficiais confirmados. A configuração não foi alterada e os grupos existentes foram preservados.`,
            409,
          );
      }
      const old = (await db
          .prepare(
            "SELECT prize_pool FROM competition_settings WHERE id='current'",
          )
          .first()) as any,
        now = Date.now(),
        s = b.settings || {},
        statements: any[] = [
          db
            .prepare(
              "UPDATE competition_settings SET registrations_open=?,registration_start=?,registration_end=?,season_start=?,season_end=?,prize_pool=?,prize_currency=?,prize_heading=?,prize_highlight=?,cta_title=?,cta_button_text=?,cta_button_link=?,published_at=? WHERE id='current'",
            )
            .bind(
              s.registrations_open ? 1 : 0,
              s.registration_start || null,
              s.registration_end || null,
              s.season_start || null,
              s.season_end || null,
              Number(s.prize_pool) || 0,
              s.prize_currency || "USD",
              s.prize_heading || "",
              s.prize_highlight || "",
              s.cta_title || "",
              s.cta_button_text || "",
              s.cta_button_link || "/registration",
              now,
            ),
          db
            .prepare(
              "UPDATE competition_stages SET is_visible=0,is_featured=0,updated_at=?",
            )
            .bind(now),
          db.prepare("DELETE FROM competition_prizes"),
        ];
      b.stages.forEach((x: any, i: number) =>
        statements.push(
          db
            .prepare(
              "INSERT INTO competition_stages(id,order_index,name,team_count,group_count,match_count,format_text,start_date,end_date,status,is_visible,is_featured,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET order_index=excluded.order_index,name=excluded.name,team_count=excluded.team_count,group_count=excluded.group_count,match_count=excluded.match_count,format_text=excluded.format_text,start_date=excluded.start_date,end_date=excluded.end_date,status=excluded.status,is_visible=excluded.is_visible,is_featured=excluded.is_featured,updated_at=excluded.updated_at",
            )
            .bind(
              x.id || crypto.randomUUID(),
              i,
              String(x.name || "FASE").trim(),
              Number(x.team_count) || 0,
              Math.max(1, Math.min(32, Math.trunc(Number(x.group_count) || 1))),
              Math.max(1, Math.min(24, Math.trunc(Number(x.match_count) || 6))),
              String(x.format_text || "").trim(),
              x.start_date || null,
              x.end_date || null,
              x.status || "FUTURA",
              x.is_visible ? 1 : 0,
              x.is_featured ? 1 : 0,
              now,
            ),
        ),
      );
      b.prizes.forEach((x: any, i: number) =>
        statements.push(
          db
            .prepare(
              "INSERT INTO competition_prizes(id,order_index,title,amount,currency,is_visible,updated_at) VALUES(?,?,?,?,?,?,?)",
            )
            .bind(
              x.id || crypto.randomUUID(),
              i,
              String(x.title || "PRÊMIO").trim(),
              Number(x.amount) || 0,
              s.prize_currency || "USD",
              x.is_visible ? 1 : 0,
              now,
            ),
        ),
      );
      await db.batch(statements);
      await logAdmin(
        admin,
        "PUBLICOU COMPETIÇÃO",
        "COMPETIÇÃO",
        undefined,
        s.season_name || "SEASON",
        `Prize Pool: ${old?.prize_pool || 0} → ${Number(s.prize_pool) || 0}; ${b.stages.length} fases; ${b.prizes.length} prêmios`,
      );
      return Response.json({ success: true, publishedAt: now });
    }
    if (b.action === "footer_settings") {
      if (!can(admin, "settings.edit")) return jsonError("Sem permissão", 403);
      const valid = (value: any, hosts: string[]) => {
          if (!value) return false;
          try {
            const u = new URL(String(value));
            return (
              u.protocol === "https:" &&
              hosts.some(
                (h) => u.hostname === h || u.hostname.endsWith("." + h),
              )
            );
          } catch {
            return false;
          }
        },
        instagram = String(b.instagram_url || "").trim(),
        discord = String(b.discord_url || "").trim(),
        whatsapp = String(b.whatsapp_number || "").replace(/\D/g, "");
      if (b.show_instagram && !valid(instagram, ["instagram.com"]))
        return jsonError("Informe um link válido do Instagram");
      if (b.show_discord && !valid(discord, ["discord.gg", "discord.com"]))
        return jsonError("Informe um convite válido do Discord");
      if (b.show_whatsapp && !whatsapp)
        return jsonError("Informe o número do WhatsApp com código do país");
      await db
        .prepare(
          "UPDATE competition_settings SET footer_logo_url=?,footer_symbol_url=?,footer_brand_text=?,show_instagram=?,instagram_url=?,show_discord=?,discord_url=?,show_whatsapp=?,whatsapp_number=?,whatsapp_message=? WHERE id='current'",
        )
        .bind(
          b.footer_logo_url || null,
          b.footer_symbol_url || null,
          String(b.footer_brand_text || "").trim(),
          b.show_instagram ? 1 : 0,
          instagram || null,
          b.show_discord ? 1 : 0,
          discord || null,
          b.show_whatsapp ? 1 : 0,
          whatsapp || null,
          String(b.whatsapp_message || "").trim() || null,
        )
        .run();
      await logAdmin(
        admin,
        "ATUALIZOU FOOTER E REDES",
        "CONFIGURAÇÕES",
        undefined,
        "FOOTER",
        `${[b.show_instagram && "Instagram", b.show_discord && "Discord", b.show_whatsapp && "WhatsApp"].filter(Boolean).join(", ") || "Redes ocultas"}`,
      );
      return Response.json({ success: true });
    }
    if (b.action === "team_status") {
      if (
        !can(
          admin,
          b.status === "APROVADA"
            ? "registrations.approve"
            : "registrations.review",
        )
      )
        return jsonError("Sem permissão", 403);
      const team = (await db
        .prepare("SELECT name FROM teams WHERE id=? AND deleted_at IS NULL")
        .bind(b.id)
        .first()) as any;
      await db.batch([
        db
          .prepare("UPDATE teams SET status=?,updated_at=? WHERE id=?")
          .bind(b.status, Date.now(), b.id),
        db
          .prepare(
            "UPDATE registrations SET status=?,updated_at=? WHERE team_id=?",
          )
          .bind(b.status, Date.now(), b.id),
      ]);
      await logAdmin(admin, `${b.status} EQUIPE`, "EQUIPE", b.id, team?.name);
      return Response.json({ success: true });
    }
    if (b.action === "team_group_batch") {
      if (!can(admin, "groups.edit")) return jsonError("Sem permissão", 403);
      const ids = [...new Set((b.teamIds || []).map(String))] as string[];
      if (!ids.length) return jsonError("Selecione pelo menos uma equipe");
      const group = (await db
        .prepare("SELECT name FROM competition_groups WHERE name=?")
        .bind(b.group)
        .first()) as any;
      if (!group) return jsonError("Grupo não encontrado", 404);
      const statements = ids.map((id) =>
        db
          .prepare(
            "UPDATE teams SET group_name=?,updated_at=? WHERE id=? AND status='APROVADA' AND deleted_at IS NULL",
          )
          .bind(group.name, Date.now(), id),
      );
      await db.batch(statements);
      await logAdmin(
        admin,
        "ADICIONOU EQUIPES AO GRUPO",
        "GRUPO",
        undefined,
        group.name,
        `${ids.length} equipe(s)`,
      );
      return Response.json({ success: true, count: ids.length });
    }
    if (b.action === "team_group") {
      if (!can(admin, "groups.edit")) return jsonError("Sem permissão", 403);
      if (b.group) {
        const group = await db
          .prepare("SELECT name FROM competition_groups WHERE name=?")
          .bind(b.group)
          .first();
        if (!group) return jsonError("Grupo não encontrado", 404);
      }
      const team = (await db
        .prepare(
          "SELECT name FROM teams WHERE id=? AND status='APROVADA' AND deleted_at IS NULL",
        )
        .bind(b.id)
        .first()) as any;
      if (!team) return jsonError("Equipe aprovada não encontrada", 404);
      await db
        .prepare("UPDATE teams SET group_name=?,updated_at=? WHERE id=?")
        .bind(b.group || null, Date.now(), b.id)
        .run();
      await logAdmin(
        admin,
        b.group ? "MOVEU EQUIPE" : "REMOVEU EQUIPE DO GRUPO",
        "EQUIPE",
        b.id,
        team.name,
        b.group || "SEM GRUPO",
      );
      return Response.json({ success: true });
    }
    if (b.action === "team_remove") {
      if (!can(admin, "teams.remove")) return jsonError("Sem permissão", 403);
      if (!String(b.reason || "").trim())
        return jsonError("Motivo obrigatório");
      const team = (await db
        .prepare("SELECT name FROM teams WHERE id=?")
        .bind(b.id)
        .first()) as any;
      await db
        .prepare(
          "UPDATE teams SET deleted_at=?,status='REMOVIDA',updated_at=? WHERE id=?",
        )
        .bind(Date.now(), Date.now(), b.id)
        .run();
      await logAdmin(
        admin,
        "REMOVEU EQUIPE",
        "EQUIPE",
        b.id,
        team?.name,
        b.reason,
      );
      return Response.json({ success: true });
    }
    if (b.action === "settings") {
      if (!can(admin, "settings.edit")) return jsonError("Sem permissão", 403);
      await db
        .prepare(
          "UPDATE competition_settings SET total_slots=?,min_starters=?,max_starters=?,max_reserves=?,coach_required=?,group_limit=?,season_name=?,competition_name=?,registrations_open=? WHERE id='current'",
        )
        .bind(
          Number(b.total_slots),
          Number(b.min_starters),
          Number(b.max_starters),
          Number(b.max_reserves),
          b.coach_required ? 1 : 0,
          Number(b.group_limit),
          b.season_name,
          b.competition_name,
          b.registrations_open ? 1 : 0,
        )
        .run();
      await logAdmin(
        admin,
        "ATUALIZOU CONFIGURAÇÕES",
        "COMPETIÇÃO",
        undefined,
        b.season_name,
      );
      return Response.json({ success: true });
    }
    if (b.action === "manager_update") {
      if (!can(admin, "managers.edit")) return jsonError("Sem permissão", 403);
      const target = (await db
        .prepare("SELECT name FROM admin_users WHERE id=?")
        .bind(b.id)
        .first()) as any;
      if (b.password)
        await db
          .prepare(
            "UPDATE admin_users SET name=?,status=?,permissions=?,password_hash=? WHERE id=?",
          )
          .bind(
            b.name,
            b.status,
            JSON.stringify(b.permissions || []),
            await hashPassword(b.password),
            b.id,
          )
          .run();
      else
        await db
          .prepare(
            "UPDATE admin_users SET name=?,status=?,permissions=? WHERE id=?",
          )
          .bind(b.name, b.status, JSON.stringify(b.permissions || []), b.id)
          .run();
      await logAdmin(admin, "EDITOU GERENTE", "GERENTE", b.id, target?.name);
      return Response.json({ success: true });
    }
    if (b.action === "group_delete") {
      if (!can(admin, "groups.edit")) return jsonError("Sem permissão", 403);
      const group = (await db
        .prepare("SELECT name FROM competition_groups WHERE id=?")
        .bind(b.id)
        .first()) as any;
      if (!group) return jsonError("Grupo não encontrado", 404);
      const used = (await db
        .prepare(
          "SELECT COUNT(*) total FROM teams WHERE group_name=? AND deleted_at IS NULL",
        )
        .bind(group.name)
        .first()) as any;
      if (used.total) return jsonError("O grupo precisa estar vazio");
      await db
        .prepare("DELETE FROM competition_groups WHERE id=?")
        .bind(b.id)
        .run();
      await logAdmin(admin, "EXCLUIU GRUPO", "GRUPO", b.id, group.name);
      return Response.json({ success: true });
    }
    if (b.action === "rule_save") {
      if (!can(admin, "rules.edit")) return jsonError("Sem permissão", 403);
      await db
        .prepare(
          "INSERT INTO rules(id,section,content,sort_order,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(section) DO UPDATE SET content=excluded.content,updated_at=excluded.updated_at",
        )
        .bind(
          crypto.randomUUID(),
          b.section,
          b.content,
          b.sort_order || 0,
          Date.now(),
        )
        .run();
      await logAdmin(
        admin,
        "EDITOU REGULAMENTO",
        "REGULAMENTO",
        undefined,
        b.section,
      );
      return Response.json({ success: true });
    }
    return jsonError("Ação inválida");
  } catch (e) {
    console.error("[ADMIN CONTROL PATCH]", e);
    return jsonError(
      e instanceof Error ? e.message : "Falha administrativa",
      500,
    );
  }
}
