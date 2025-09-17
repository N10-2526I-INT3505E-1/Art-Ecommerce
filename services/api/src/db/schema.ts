// Define database schema using Drizzle ORM for SQLite
import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
	id: int().primaryKey({ autoIncrement: true }),
	email: text().notNull().unique(),
	username: text().notNull().unique(),
	password: text().notNull(),
	first_name: text().notNull(),
	last_name: text().notNull(),
	dob: text(),
	role: text('role', { enum: ['admin', 'user'] })
		.notNull()
		.default('user'),
});

export const table = {
	users,
} as const;

export type Table = typeof table;
