import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
export const teams = sqliteTable("teams", {
  id: text("id").primaryKey(),
  registrationId: text("registration_id").notNull().unique(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  tag: text("tag").notNull(),
  country: text("country").notNull(),
  region: text("region").notNull(),
  groupName: text("group_name"),
  logoUrl: text("logo_url"),
  instagram: text("instagram"),
  discord: text("discord"),
  status: text("status").notNull().default("EM ANÁLISE"),
  responsibleName: text("responsible_name").notNull(),
  responsibleNick: text("responsible_nick"),
  responsibleEmail: text("responsible_email").notNull(),
  responsibleWhatsapp: text("responsible_whatsapp"),
  responsibleDiscord: text("responsible_discord"),
  deletedAt: integer("deleted_at"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
export const players = sqliteTable("players", {
  id: text("id").primaryKey(),
  teamId: text("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  nickname: text("nickname").notNull(),
  fullName: text("full_name"),
  freefireId: text("freefire_id").notNull(),
  discordId: text("discord_id").notNull(),
  discordType: text("discord_type").notNull().default("numeric_id"),
  discordValue: text("discord_value"),
  country: text("country").notNull(),
  role: text("role").notNull(),
  rosterType: text("roster_type").notNull(),
  photoUrl: text("photo_url"),
  createdAt: integer("created_at").notNull(),
});
export const teamCoaches = sqliteTable("team_coaches", {
  id: text("id").primaryKey(),
  teamId: text("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(),
  nickname: text("nickname").notNull(),
  country: text("country").notNull(),
  photoUrl: text("photo_url"),
  discordType: text("discord_type").notNull(),
  discordValue: text("discord_value").notNull(),
  whatsapp: text("whatsapp"),
  instagram: text("instagram"),
  freefireId: text("freefire_id"),
  createdAt: integer("created_at").notNull(),
});
export const teamResponsibles = sqliteTable("team_responsibles", {
  id: text("id").primaryKey(),
  teamId: text("team_id")
    .notNull()
    .unique()
    .references(() => teams.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(),
  nickname: text("nickname"),
  email: text("email").notNull(),
  whatsapp: text("whatsapp"),
  discord: text("discord"),
  createdAt: integer("created_at").notNull(),
});
export const registrations = sqliteTable("registrations", {
  id: text("id").primaryKey(),
  registrationId: text("registration_id").notNull().unique(),
  teamId: text("team_id")
    .notNull()
    .unique()
    .references(() => teams.id, { onDelete: "cascade" }),
  submissionKey: text("submission_key").notNull().unique(),
  status: text("status").notNull().default("EM ANÁLISE"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
export const competitionSettings = sqliteTable("competition_settings", {
  id: text("id").primaryKey(),
  minStarters: integer("min_starters").notNull().default(4),
  maxStarters: integer("max_starters").notNull().default(4),
  maxReserves: integer("max_reserves").notNull().default(2),
  coachRequired: integer("coach_required", { mode: "boolean" })
    .notNull()
    .default(false),
  totalSlots: integer("total_slots").notNull().default(48),
  groupLimit: integer("group_limit").notNull().default(12),
  seasonName: text("season_name").notNull().default("SEASON 1"),
  competitionName: text("competition_name")
    .notNull()
    .default("DARKNESS LEAGUE"),
  registrationsOpen: integer("registrations_open", { mode: "boolean" })
    .notNull()
    .default(true),
  registrationStart: text("registration_start"),
  registrationEnd: text("registration_end"),
  seasonStart: text("season_start"),
  seasonEnd: text("season_end"),
  prizePool: integer("prize_pool").notNull().default(200),
  prizeCurrency: text("prize_currency").notNull().default("USD"),
  prizeHeading: text("prize_heading").notNull().default("O topo não é dado."),
  prizeHighlight: text("prize_highlight").notNull().default("É conquistado."),
  ctaTitle: text("cta_title").notNull().default("YOUR NAME COULD BE NEXT."),
  ctaButtonText: text("cta_button_text")
    .notNull()
    .default("REGISTER YOUR TEAM"),
  ctaButtonLink: text("cta_button_link").notNull().default("/registration"),
  publishedAt: integer("published_at"),
  footerLogoUrl: text("footer_logo_url"),
  footerSymbolUrl: text("footer_symbol_url"),
  footerBrandText: text("footer_brand_text")
    .notNull()
    .default("DARKNESS LEAGUE · LEAGUE FEM · SEASON 1"),
  showInstagram: integer("show_instagram", { mode: "boolean" })
    .notNull()
    .default(false),
  instagramUrl: text("instagram_url"),
  showDiscord: integer("show_discord", { mode: "boolean" })
    .notNull()
    .default(false),
  discordUrl: text("discord_url"),
  showWhatsapp: integer("show_whatsapp", { mode: "boolean" })
    .notNull()
    .default(false),
  whatsappNumber: text("whatsapp_number"),
  whatsappMessage: text("whatsapp_message"),
});
export const competitionStages = sqliteTable("competition_stages", {
  id: text("id").primaryKey(),
  orderIndex: integer("order_index").notNull(),
  name: text("name").notNull(),
  teamCount: integer("team_count").notNull(),
  groupCount: integer("group_count"),
  matchCount: integer("match_count").notNull().default(6),
  formatText: text("format_text").notNull(),
  startDate: text("start_date"),
  endDate: text("end_date"),
  status: text("status").notNull().default("FUTURA"),
  isVisible: integer("is_visible", { mode: "boolean" }).notNull().default(true),
  isFeatured: integer("is_featured", { mode: "boolean" })
    .notNull()
    .default(false),
  updatedAt: integer("updated_at").notNull(),
});
export const competitionPrizes = sqliteTable("competition_prizes", {
  id: text("id").primaryKey(),
  orderIndex: integer("order_index").notNull(),
  title: text("title").notNull(),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull().default("USD"),
  isVisible: integer("is_visible", { mode: "boolean" }).notNull().default(true),
  updatedAt: integer("updated_at").notNull(),
});
export const adminSessions = sqliteTable("admin_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  email: text("email").notNull(),
  userId: text("user_id"),
  role: text("role").notNull().default("OWNER"),
  expiresAt: integer("expires_at").notNull(),
});
export const adminUsers = sqliteTable("admin_users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("MANAGER"),
  status: text("status").notNull().default("ATIVO"),
  permissions: text("permissions").notNull(),
  lastLogin: integer("last_login"),
  createdAt: integer("created_at").notNull(),
});
export const competitionGroups = sqliteTable("competition_groups", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: integer("created_at").notNull(),
});
export const adminLogs = sqliteTable("admin_logs", {
  id: text("id").primaryKey(),
  adminEmail: text("admin_email").notNull(),
  adminName: text("admin_name").notNull(),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id"),
  targetName: text("target_name"),
  details: text("details"),
  createdAt: integer("created_at").notNull(),
});
export const rules = sqliteTable("rules", {
  id: text("id").primaryKey(),
  section: text("section").notNull().unique(),
  content: text("content").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  updatedAt: integer("updated_at").notNull(),
});
export const matchResults = sqliteTable(
  "match_results",
  {
    id: text("id").primaryKey(),
    stageId: text("stage_id")
      .notNull()
      .references(() => competitionStages.id),
    roundName: text("round_name").notNull(),
    groupName: text("group_name").notNull().default("SEM GRUPO"),
    matchNumber: integer("match_number").notNull().default(0),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id),
    booyahs: integer("booyahs").notNull().default(0),
    kills: integer("kills").notNull().default(0),
    placementPoints: integer("placement_points").notNull().default(0),
    penaltyPoints: integer("penalty_points").notNull().default(0),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [
    uniqueIndex("match_results_stage_round_group_match_team_unique").on(
      t.stageId,
      t.roundName,
      t.groupName,
      t.matchNumber,
      t.teamId,
    ),
    index("results_stage_group_idx").on(t.stageId, t.roundName, t.groupName),
  ],
);

export const publishedStandings = sqliteTable(
  "published_standings",
  {
    id: text("id").primaryKey(),
    stageId: text("stage_id")
      .notNull()
      .references(() => competitionStages.id),
    roundName: text("round_name").notNull(),
    groupName: text("group_name").notNull().default("SEM GRUPO"),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id),
    booyahs: integer("booyahs").notNull().default(0),
    kills: integer("kills").notNull().default(0),
    placementPoints: integer("placement_points").notNull().default(0),
    penaltyPoints: integer("penalty_points").notNull().default(0),
    totalPoints: integer("total_points").notNull().default(0),
    publishedAt: integer("published_at").notNull(),
  },
  (t) => [
    uniqueIndex("published_standings_stage_round_group_team_unique").on(
      t.stageId,
      t.roundName,
      t.groupName,
      t.teamId,
    ),
    index("published_standings_stage_round_group_idx").on(
      t.stageId,
      t.roundName,
      t.groupName,
    ),
  ],
);

export const stageFinalizations = sqliteTable("stage_finalizations", {
  id: text("id").primaryKey(),
  stageId: text("stage_id")
    .notNull()
    .unique()
    .references(() => competitionStages.id),
  status: text("status").notNull().default("FINALIZADA"),
  qualifiedLimit: integer("qualified_limit").notNull().default(48),
  finalizedAt: integer("finalized_at").notNull(),
  finalizedBy: text("finalized_by").notNull(),
});

export const stageQualificationResults = sqliteTable(
  "stage_qualification_results",
  {
    id: text("id").primaryKey(),
    finalizationId: text("finalization_id")
      .notNull()
      .references(() => stageFinalizations.id),
    stageId: text("stage_id")
      .notNull()
      .references(() => competitionStages.id),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id),
    finalPosition: integer("final_position").notNull(),
    qualificationStatus: text("qualification_status").notNull(),
    groupName: text("group_name"),
    booyahs: integer("booyahs").notNull().default(0),
    kills: integer("kills").notNull().default(0),
    placementPoints: integer("placement_points").notNull().default(0),
    penaltyPoints: integer("penalty_points").notNull().default(0),
    totalPoints: integer("total_points").notNull().default(0),
  },
  (t) => [
    uniqueIndex("stage_qualification_stage_team_unique").on(
      t.stageId,
      t.teamId,
    ),
    uniqueIndex("stage_qualification_stage_position_unique").on(
      t.stageId,
      t.finalPosition,
    ),
    index("stage_qualification_status_idx").on(
      t.stageId,
      t.qualificationStatus,
    ),
  ],
);

export const stageGroupAssignments = sqliteTable(
  "stage_group_assignments",
  {
    id: text("id").primaryKey(),
    stageId: text("stage_id")
      .notNull()
      .references(() => competitionStages.id),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id),
    groupName: text("group_name").notNull(),
    confirmedAt: integer("confirmed_at"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [
    uniqueIndex("stage_group_assignment_stage_team_unique").on(
      t.stageId,
      t.teamId,
    ),
    index("stage_group_assignment_stage_group_idx").on(t.stageId, t.groupName),
  ],
);

export const sponsors = sqliteTable("sponsors", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  logoUrl: text("logo_url").notNull(),
  instagramUrl: text("instagram_url").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
