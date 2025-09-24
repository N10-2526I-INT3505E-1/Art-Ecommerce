import { Elysia, t } from 'elysia';
import { paymentsTable } from './payments.model';
import { db } from './db';
import { eq } from 'drizzle-orm';
import { createPaymentUrlFromProvider } from './paymentHandle/vnpayPaymentHandle';
// --- 3. Elysia Type Schemas for Validation & Documentation ---

// Schema for the incoming request body
const createPaymentBodySchema = t.Object({
	order_id: t.Integer({
		minimum: 1,
		error: "A valid 'orderId' is required."
	}),
	// We accept amount in cents (as an integer) to avoid float issues
	amount: t.Integer({
		minimum: 0,
		error: "'amount' must be a integer >= 0."
	}),
	payment_gateway: t.String()
});

// Schema for a successful response
const paymentResponseSchema = t.Object({
	id: t.Integer(),
	order_id: t.Integer(),
	amount: t.String(), // Numeric is returned as a string
	payment_gateway: t.String(),
	status: t.String(),
	paymentUrl: t.String()
});

// Schema for an error response
const errorResponseSchema = t.Object({
	error: t.String()
});
const paymentStatusSchema = t.Union([
	t.Literal('completed'),
	t.Literal('failed'),
	t.Literal('cancelled')
], {
	error: "Status must be one of 'completed', 'failed', or 'cancelled'."
});


// --- 1. Schema for URL Parameters ---
// This validates the '/:id' part of the route.
export const updatePaymentParamsSchema = t.Object({
	id: t.Numeric({ // t.Numeric is used for path parameters that should be numbers
		minimum: 1,
		error: "A valid payment 'id' is required in the URL."
	})
});


// --- 2. Schema for the Request Body ---
// This validates the JSON payload sent with the PATCH request.
export const updatePaymentBodySchema = t.Object({
	status: paymentStatusSchema
});


// --- 3. Schema for the Successful (200 OK) Response ---
// This defines the structure of the object returned when the update is successful.
export const updatePaymentResponseSchema = t.Object({
	id: t.Integer(),
	order_id: t.Integer(),
	amount: t.String(), // The 'numeric' type from the DB is often returned as a string
	payment_gateway: t.String(),
	status: t.String() // You could also use paymentStatusSchema here for stricter typing
});
// --- 4. The Elysia API Endpoint ---

export const paymentsPlugin = new Elysia({ prefix: '/api' })
	.post('/payments', async ({ body, set }) => {
		try {
			// A transaction ensures the insert is an all-or-nothing operation.
			const [newPayment] = await db.transaction(async (tx) => {
				const result = await tx.insert(paymentsTable)
					.values({
						order_id: body.order_id,
						// Convert integer cents from API to a string for the 'numeric' DB column
						amount: body.amount.toString(),
						payment_gateway: body.payment_gateway,
						status: 'pending' // Always start as 'pending'
					})
					.returning(); // Return the newly created record

				return result;
			});

			// If transaction is successful, set status and return the new payment
			if (newPayment == null) {
				throw new Error('Payment initialization failed.');
			}
			set.status = 201; // 201 Created is the correct status for creating a resource
			const getUrl = createPaymentUrlFromProvider(newPayment.amount);
			const apiResponse = {
				id: newPayment.id,
				order_id: newPayment.order_id,
				amount: newPayment.amount, // Numeric is returned as a string
				payment_gateway: newPayment.payment_gateway,
				status: newPayment.status,
				// create payment
				paymentUrl: (await getUrl).paymentUrl,
			};
			return apiResponse;

		} catch (error) {
			// If the transaction fails, Drizzle rolls it back automatically.
			console.error("💥 Failed to create payment:", error);
			set.status = 500; // Internal Server Error
			return { error: "Could not process the payment creation." };
		}
	}, {
		// Apply the schemas for automatic validation and documentation
		body: createPaymentBodySchema,
		response: {
			201: paymentResponseSchema,
			400: errorResponseSchema, // Elysia handles validation errors automatically
			500: errorResponseSchema
		},
		detail: {
			summary: "Create a Pending Payment",
			description: "Creates a new payment record with a 'pending' status. The body should contain orderId, amount, and paymentGateway.",
			tags: ['Payments']
		}
	})
	.patch('/payments/:id', async ({ params, body, set }) => {
		try {
			// Drizzle's update method to find a payment by ID and set its status
			const [updatedPayment] = await db.update(paymentsTable)
				.set({ status: body.status })
				.where(eq(paymentsTable.id, params.id)) // Find the record where id matches the param
				.returning(); // Return the updated record

			// If the query returns nothing, the ID was not found
			if (!updatedPayment) {
				set.status = 404; // Not Found
				return { error: `Payment with ID ${params.id} not found.` };
			}

			set.status = 200; // OK
			// No need to map the response, .returning() gives us the correct shape
			return updatedPayment;

		} catch (error) {
			console.error(`💥 Failed to update payment ${params.id}:`, error);
			set.status = 500; // Internal Server Error
			return { error: "Could not process the payment update." };
		}
	}, {
		// Apply schemas for validation and documentation
		params: updatePaymentParamsSchema,
		body: updatePaymentBodySchema,
		response: {
			200: updatePaymentResponseSchema,
			400: errorResponseSchema, // Handles validation errors for body/params
			404: errorResponseSchema, // Handles our custom "not found" case
			500: errorResponseSchema
		},
		detail: {
			summary: "Update a Payment's Status",
			description: "Updates the status of an existing payment by its ID. This is typically used by a webhook from a payment provider.",
			tags: ['Payments']
		}
	})
	.listen(3000);
