import { Elysia, t } from 'elysia';
import { paymentsTable } from './payments.model';
import { db } from './db';
import { eq } from 'drizzle-orm';
import { createPaymentUrl } from './paymentHandle/vnpayPaymentHandle';
import { createPaymentBodySchema, paymentResponseSchema, errorResponseSchema, updatePaymentBodySchema, updatePaymentParamsSchema, updatePaymentResponseSchema } from './payments.model';


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
			const getUrl = createPaymentUrl(Number(newPayment.amount));
			const apiResponse = {
				id: newPayment.id,
				order_id: newPayment.order_id,
				amount: newPayment.amount, // Numeric is returned as a string
				payment_gateway: newPayment.payment_gateway,
				status: newPayment.status,
				// create payment
				paymentUrl: (await getUrl),
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
