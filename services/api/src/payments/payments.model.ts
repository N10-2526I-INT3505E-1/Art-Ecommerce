import { int, numeric, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-typebox';
import { t } from 'elysia';
import { usersTable } from '../users/user.model.ts';

export const paymentsTable = sqliteTable(
	'payments', {
		id: int().primaryKey({ autoIncrement: true }),
		order_id: int().notNull(),
		amount: numeric().notNull(),
		payment_gateway: text().notNull(),
		transaction_id: text(),
		status: text().notNull(),
		created_at: text()
			.notNull()
			.default(sql`CURRENT_TIMESTAMP`),
		updated_at: text()
			.notNull()
			.default(sql`(CURRENT_TIMESTAMP)`)
			.$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
	}
);
export const schema = { paymentsTable } as const;

export type Table = typeof paymentsTable;