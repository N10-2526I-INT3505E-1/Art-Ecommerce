import { sql } from 'drizzle-orm';
import { int, numeric, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-typebox';
import { t } from 'elysia';
import { usersTable } from '../users/user.model.ts';

export const paymentsTable = sqliteTable(
	'payments', {
		id: text().primaryKey(),
		order_id: text().notNull(),
		amount: numeric().notNull(),
		payment_gateway: text().notNull(),
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

// Schema for the incoming request body
export const createPaymentBodySchema = t.Object({
	order_id: t.String({
		minimum: 1,
		error: "A valid 'orderId' is required."
	}),
	amount: t.Integer({
		minimum: 0,
		error: "'amount' must be a integer >= 0."
	}),
	payment_gateway: t.String()
});

// Schema for a successful response
export const paymentResponseSchema = t.Object({
	id: t.String(),
	order_id: t.String(),
	amount: t.String(), // Numeric is returned as a string
	payment_gateway: t.String(),
	status: t.String(),
	paymentUrl: t.String()
});

// Schema for an error response
export const errorResponseSchema = t.Object({
	error: t.String()
});
const paymentStatusSchema = t.Union([
	t.Literal('paid'),
	t.Literal('failed'),
	t.Literal('cancelled'),
	t.Literal('pending')
], {
	error: "Status must be one of 'paid', 'failed', 'cancelled', or 'pending'."
});


// Schema for URL Parameters 
export const updatePaymentParamsSchema = t.Object({
	id: t.String({ 
		error: "A valid payment 'id' is required in the URL."
	})
});


// Schema for the Request Body 
export const updatePaymentBodySchema = t.Object({
	status: paymentStatusSchema
});


// Schema for the Successful (200 OK) Response
export const updatePaymentResponseSchema = t.Object({
	id: t.String(),
	order_id: t.Integer(),
	amount: t.String(), 
	payment_gateway: t.String(),
	status: t.String() 
});