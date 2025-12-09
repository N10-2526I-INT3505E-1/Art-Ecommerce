// src/users/bazi.model.ts

import { usersTable } from '@user/user.model';
import { sql } from 'drizzle-orm';
import { int, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-typebox';
import type { Static } from 'elysia';
import { t } from 'elysia';
import type { CenterZoneAnalysis, LimitScoreProfile, EnergyNode, Interaction } from './bazi.types'; // Import các type để định nghĩa cho cột JSON

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

		// --- CALCULATED BAZI DATA ---
		// Đổi sang TEXT để lưu chữ 'Giáp', 'Tý'... cho dễ debug
		year_stem: text('year_stem'),
		year_branch: text('year_branch'),
		month_stem: text('month_stem'),
		month_branch: text('month_branch'),
		day_stem: text('day_stem'),
		day_branch: text('day_branch'),
		hour_stem: text('hour_stem'),
		hour_branch: text('hour_branch'),

		// --- ANALYSIS RESULTS (VULONG METHOD) ---

		// Thông tin cơ bản
		day_master_status: text('day_master_status'), // "Vượng" / "Nhược"
		structure_type: text('structure_type'), // "Nội Cách" / "Ngoại Cách"
		structure_name: text('structure_name'), // "Chính Quan Cách"...
		analysis_reason: text('analysis_reason'), // Log giải thích

		// Dữ liệu JSON phức tạp (Frontend sẽ dùng để vẽ biểu đồ)
		// 1. Phân tích vùng tâm (Hiệu số, điểm phe ta/địch)
		center_analysis: text('center_analysis', { mode: 'json' }).$type<CenterZoneAnalysis>(),

		// 2. Sơ đồ dòng chảy năng lượng (Nodes, biến động điểm) - QUAN TRỌNG NHẤT
		energy_flow: text('energy_flow', { mode: 'json' }).$type<EnergyNode[]>(),

		// 3. Hồ sơ điểm hạn (Dụng/Hỷ/Kỵ và điểm số)
		limit_score: text('limit_score', { mode: 'json' }).$type<LimitScoreProfile>(),

		// 4. Các tương tác đã xảy ra (Hợp, Xung...)
		interactions: text('interactions', { mode: 'json' }).$type<Interaction[]>(),

		// Các trường Legacy (Giữ lại nếu cần query đơn giản, hoặc map từ dữ liệu trên)
		favorable_elements: text('favorable_elements', { mode: 'json' }).$type<string[]>(), // Lưu mảng Dụng thần
		party_score: real('party_score'),
		enemy_score: real('enemy_score'),

		// Các trường chưa dùng tới ngay (có thể để null)
		percentage_self: real('percentage_self'),
		luck_start_age: int('luck_start_age'),
		score_details: text('score_details', { mode: 'json' }),
		element_scores: text('element_scores', { mode: 'json' }),
		god_scores: text('god_scores', { mode: 'json' }),
		shen_sha: text('shen_sha', { mode: 'json' }),

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

// Schema Validation
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
