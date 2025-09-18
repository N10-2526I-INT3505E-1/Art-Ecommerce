// Define the User model and its schema using Drizzle ORM and Elysia

import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-typebox';
import { t } from 'elysia';

export const usersTable = sqliteTable('users', {
	id: int().primaryKey({ autoIncrement: true }),
	email: text().notNull().unique(),
	username: text().notNull().unique(),
	password: text().notNull(),
	first_name: text().notNull(),
	last_name: text().notNull(),
	dob: text(),
	role: text('role', { enum: ['admin', 'operator', 'user'] })
		.notNull()
		.default('user'),
	created_at: text()
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`),
	updated_at: text()
		.notNull()
		.default(sql`(CURRENT_TIMESTAMP)`)
		.$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
});

export const schema = { usersTable } as const;

export const SignUpSchema = createInsertSchema(usersTable, {
	email: t.String({ format: 'email' }),
	username: t.String({ minLength: 5, maxLength: 30 }),
	password: t.String({ minLength: 6 }),
	first_name: t.String({ minLength: 1, maxLength: 50 }),
	last_name: t.String({ minLength: 1, maxLength: 50 }),
	dob: t.Optional(
		t.Union([t.String({ format: 'date' }), t.Null(), t.String({ minLength: 0 })], {
			default: null,
		}),
	),
});

export const LoginSchema = t.Object({
	email: t.String({ format: 'email' }),
	password: t.String({ minLength: 6 }),
});

export const UserResponseSchema = createSelectSchema(usersTable);

export type Table = typeof usersTable;
