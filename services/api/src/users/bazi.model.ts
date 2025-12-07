// src/bazi/bazi.model.ts

import { usersTable } from '@user/user.model';
import { sql } from 'drizzle-orm';
import { int, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-typebox';
import type { Static } from 'elysia';
import { t } from 'elysia';

export const baziProfilesTable = sqliteTable(
	'bazi_profiles',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => Bun.randomUUIDv7()),
		user_id: text('user_id')
			.notNull()
			.references(() => usersTable.id, { onDelete: 'cascade' }),
		profile_name: text('profile_name').notNull(),

		// --- INPUT DATA ---
		gender: text('gender', { enum: ['male', 'female'] }).notNull(),
		birth_day: int('birth_day').notNull(),
		birth_month: int('birth_month').notNull(),
		birth_year: int('birth_year').notNull(),
		birth_hour: int('birth_hour').notNull(),
		birth_minute: int('birth_minute').notNull().default(0),
		longitude: real('longitude'),
		timezone_offset: real('timezone_offset'),

		// --- CALCULATED BAZI DATA (CACHED) ---
		year_stem: int('year_stem'),
		year_branch: int('year_branch'),
		month_stem: int('month_stem'),
		month_branch: int('month_branch'),
		day_stem: int('day_stem'),
		day_branch: int('day_branch'),
		hour_stem: int('hour_stem'),
		hour_branch: int('hour_branch'),

		// ANALYSIS RESULTS
		day_master_status: text('day_master_status'),
		structure_type: text('structure_type'),
		structure_name: text('structure_name'),
		analysis_reason: text('analysis_reason'),

		favorable_elements: text('favorable_elements', { mode: 'json' }),
		element_scores: text('element_scores', { mode: 'json' }),
		god_scores: text('god_scores', { mode: 'json' }),
		interactions: text('interactions', { mode: 'json' }),
		score_details: text('score_details', { mode: 'json' }),
		shen_sha: text('shen_sha', { mode: 'json' }),
		party_score: real('party_score'),
		enemy_score: real('enemy_score'),
		percentage_self: real('percentage_self'),
		luck_start_age: int('luck_start_age'),

		created_at: text('created_at')
			.notNull()
			.default(sql`CURRENT_TIMESTAMP`),
		updated_at: text('updated_at')
			.notNull()
			.default(sql`(CURRENT_TIMESTAMP)`)
			.$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
	},
	(table) => ({
		userIdIdx: uniqueIndex('bazi_profiles_user_id_unique').on(table.user_id),
	}),
);

export const CreateBaziProfileSchema = createInsertSchema(baziProfilesTable, {
	profile_name: t.String({ minLength: 1, maxLength: 100 }),
	gender: t.Enum({ male: 'male', female: 'female' }),
	birth_year: t.Integer({ minimum: 1900, maximum: new Date().getFullYear() }),
	birth_month: t.Integer({ minimum: 1, maximum: 12 }),
	birth_day: t.Integer({ minimum: 1, maximum: 31 }),
	birth_hour: t.Integer({ minimum: 0, maximum: 23 }),
	birth_minute: t.Optional(t.Integer({ minimum: 0, maximum: 59, default: 0 })),
	longitude: t.Optional(t.Number({ minimum: -180, maximum: 180 })),
	timezone_offset: t.Optional(t.Number({ minimum: -12, maximum: 14 })),
});

export const BaziProfileResponseSchema = createSelectSchema(baziProfilesTable);

export type BaziInput = Static<typeof CreateBaziProfileSchema>;
