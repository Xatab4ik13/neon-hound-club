import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  serial,
  index,
} from "drizzle-orm/pg-core";

/** RSS-источники агента. */
export const newsSources = pgTable(
  "news_sources",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    url: text("url").notNull(),
    siteUrl: text("site_url"),
    lang: varchar("lang", { length: 8 }).notNull().default("en"),
    /** hot — каждые 15 мин, normal — каждые 2 часа. */
    stream: varchar("stream", { length: 10 }).notNull().default("normal"),
    weight: integer("weight").notNull().default(0),
    active: boolean("active").notNull().default(true),
    lastFetchedAt: timestamp("last_fetched_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ streamIdx: index("news_sources_stream_idx").on(t.active, t.stream) }),
);

/** Найденные новости до рерайта. */
export const newsCandidates = pgTable(
  "news_candidates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceId: integer("source_id"),
    sourceName: varchar("source_name", { length: 120 }).notNull().default(""),
    url: text("url").notNull(),
    titleHash: varchar("title_hash", { length: 64 }).notNull().default(""),
    lang: varchar("lang", { length: 8 }).notNull().default("en"),
    srcTitle: text("src_title").notNull().default(""),
    srcText: text("src_text").notNull().default(""),
    srcImage: text("src_image"),
    srcPublishedAt: timestamp("src_published_at", { withTimezone: true }),
    score: integer("score").notNull().default(0),
    isHot: boolean("is_hot").notNull().default(false),
    topic: varchar("topic", { length: 40 }).notNull().default(""),
    /** new | drafted | rejected | used | failed */
    status: varchar("status", { length: 16 }).notNull().default("new"),
    rejectReason: text("reject_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    draftedAt: timestamp("drafted_at", { withTimezone: true }),
  },
  (t) => ({
    statusIdx: index("news_cand_status_idx").on(t.status, t.isHot, t.score),
    hashIdx: index("news_cand_hash_idx").on(t.titleHash),
    createdIdx: index("news_cand_created_idx").on(t.createdAt),
  }),
);

/** Готовые варианты русского текста (по 2 на кандидата). */
export const newsVariants = pgTable(
  "news_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    candidateId: uuid("candidate_id").notNull(),
    idx: integer("idx").notNull().default(0),
    /** plain — сухой-информативный, punchy — с эмоцией. */
    tone: varchar("tone", { length: 20 }).notNull().default("plain"),
    title: text("title").notNull().default(""),
    text: text("text").notNull().default(""),
    category: varchar("category", { length: 60 }).notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ candIdx: index("news_variants_cand_idx").on(t.candidateId, t.idx) }),
);

/** Singleton-состояние агента: настройки, пауза, lease. */
export const newsAgentState = pgTable("news_agent_state", {
  id: integer("id").primaryKey().default(1),
  enabled: boolean("enabled").notNull().default(true),
  paused: boolean("paused").notNull().default(false),
  pausedReason: text("paused_reason"),
  leaseUntil: timestamp("lease_until", { withTimezone: true }),
  lastHotRunAt: timestamp("last_hot_run_at", { withTimezone: true }),
  lastNormalRunAt: timestamp("last_normal_run_at", { withTimezone: true }),
  prompt: text("prompt").notNull().default(""),
  filterModel: varchar("filter_model", { length: 80 }).notNull().default("google/gemini-2.5-flash-lite"),
  writerModel: varchar("writer_model", { length: 80 }).notNull().default("google/gemini-2.5-pro"),
  minScore: integer("min_score").notNull().default(62),
  hotDraftCap: integer("hot_draft_cap").notNull().default(3),
  normalDraftCap: integer("normal_draft_cap").notNull().default(6),
  queueGapMin: integer("queue_gap_min").notNull().default(100),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Лог прогонов. */
export const newsAgentRuns = pgTable(
  "news_agent_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    stream: varchar("stream", { length: 10 }).notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    fetched: integer("fetched").notNull().default(0),
    newCandidates: integer("new_candidates").notNull().default(0),
    drafted: integer("drafted").notNull().default(0),
    errors: integer("errors").notNull().default(0),
    note: text("note"),
  },
  (t) => ({ startedIdx: index("news_runs_idx").on(t.startedAt) }),
);

export type NewsSource = typeof newsSources.$inferSelect;
export type NewsCandidate = typeof newsCandidates.$inferSelect;
export type NewsVariant = typeof newsVariants.$inferSelect;
export type NewsAgentState = typeof newsAgentState.$inferSelect;
