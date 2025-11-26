import { Elysia, t } from 'elysia';
import { paymentsTable } from './payment.model';
import { db } from './db';
import { eq } from 'drizzle-orm';
import { createPaymentUrl } from './paymentHandle/vnpayPaymentHandle';
import { createPaymentBodySchema, paymentResponseSchema, errorResponseSchema, updatePaymentBodySchema, updatePaymentParamsSchema, updatePaymentResponseSchema } from './payment.model';

export const paymentsPlugin = new Elysia({ prefix: '/api' })
	// POST /api/payments - Creates a new payment record with pending status
	// Accepts order_id, amount, and payment_gateway in the request body
	// Returns the created payment with a generated payment URL
	.post('/payments', async ({ body, set }) => {
		try {
			// A transaction ensures the insert is an all-or-nothing operation.
			const [newPayment] = await db.transaction(async (tx) => {
				const result = await tx.insert(paymentsTable)
					.values({
						order_id: body.order_id,
						amount: body.amount.toString(),
						payment_gateway: body.payment_gateway,
						status: 'pending'
					})
					.returning(); // Return the newly created record

				return result;
			});

			// If transaction is successful, set status and return the new payment
			if (newPayment == null) {
				throw new Error('Payment initialization failed.');
			}
			set.status = 201; 
			const getUrl = createPaymentUrl(Number(newPayment.amount));
			const apiResponse = {
				id: newPayment.id,
				order_id: newPayment.order_id,
				amount: newPayment.amount, // Numeric is returned as a string
				payment_gateway: newPayment.payment_gateway,
				status: newPayment.status,
				paymentUrl: (await getUrl),
			};
			return apiResponse;

		} catch (error) {
			console.error("Failed to create payment:", error);
			set.status = 500; // Internal Server Error
			return { error: "Could not process the payment creation." };
		}
	}, {
		// Apply the schemas for automatic validation and documentation
		body: createPaymentBodySchema,
		response: {
			201: paymentResponseSchema,
			400: errorResponseSchema,
			500: errorResponseSchema
		},
		detail: {
			summary: "Create a Pending Payment",
			description: "Creates a new payment record with a 'pending' status. The body should contain orderId, amount, and paymentGateway.",
			tags: ['Payments']
		}
	})
	// PATCH /api/payments/:id - Updates the status of an existing payment
	// Accepts payment ID in the URL and new status in the request body
	// Used primarily for webhook callbacks from payment providers
	.patch('/payments/:id', async ({ params, body, set }) => {
		try {
			// Drizzle's update method to find a payment by ID and set its status
			const [updatedPayment] = await db.update(paymentsTable)
				.set({ status: body.status })
				.where(eq(paymentsTable.id, params.id)) 
				.returning(); 

			if (!updatedPayment) {
				set.status = 404;
				return { error: `Payment with ID ${params.id} not found.` };
			}

			set.status = 200;
			return updatedPayment;

		} catch (error) {
			console.error(`Failed to update payment ${params.id}:`, error);
			set.status = 500;
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
	// GET /api/payments/:id - Retrieves payment details by ID
	// Returns the payment record with all its information (id, order_id, amount, gateway, status, timestamps)
	.get('/payments/:id', async ({ params, set }) => {
		try {
			// Query the payment by ID
			const payment = await db.query.paymentsTable.findFirst({
				where: eq(paymentsTable.id, Number(params.id))
			});

			if (!payment) {
				set.status = 404;
				return { error: `Payment with ID ${params.id} not found.` };
			}

			set.status = 200;
			return payment;

		} catch (error) {
			console.error(`Failed to retrieve payment ${params.id}:`, error);
			set.status = 500;
			return { error: "Could not process the payment retrieval." };
		}
	}, {
		// Apply schemas for validation and documentation
		params: updatePaymentParamsSchema,
		response: {
			200: updatePaymentResponseSchema,
			400: errorResponseSchema, // Handles validation errors for params
			404: errorResponseSchema, // Handles our custom "not found" case
			500: errorResponseSchema
		},
		detail: {
			summary: "Get Payment Information by ID",
			description: "Retrieves payment details for a specific payment by its ID.",
			tags: ['Payments']
		}
	})
	.listen(3000);
