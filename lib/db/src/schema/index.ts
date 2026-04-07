import { pgTable, text, numeric, timestamp } from "drizzle-orm/pg-core";

export const sportBetsTable = pgTable("sport_bets", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  matchId: text("match_id").notNull(),
  homeTeam: text("home_team").notNull(),
  awayTeam: text("away_team").notNull(),
  betType: text("bet_type").notNull(),
  odds: numeric("odds", { precision: 10, scale: 2 }).notNull(),
  stake: numeric("stake", { precision: 20, scale: 2 }).notNull(),
  potentialWin: numeric("potential_win", { precision: 20, scale: 2 }).notNull(),
  ouLine: numeric("ou_line", { precision: 5, scale: 2 }),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  settledAt: timestamp("settled_at", { withTimezone: true }),
});

export type SportBet = typeof sportBetsTable.$inferSelect;
export type InsertSportBet = typeof sportBetsTable.$inferInsert;
