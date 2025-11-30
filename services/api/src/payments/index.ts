import { Elysia, t } from 'elysia';
import { paymentsTable } from './payment.model';
import { db } from './db';
import { eq } from 'drizzle-orm';
import { createVNPPaymentUrl } from './paymentHandle/vnpayPaymentHandle';
import { createPaymentBodySchema, paymentResponseSchema, errorResponseSchema, updatePaymentBodySchema, updatePaymentParamsSchema, updatePaymentResponseSchema } from './payment.model';
import { IpnFailChecksum, IpnOrderNotFound, IpnInvalidAmount, InpOrderAlreadyConfirmed, IpnUnknownError, IpnSuccess } from 'vnpay';
import type { VerifyReturnUrl } from 'vnpay';
import crypto from 'crypto';
import { stringify } from 'qs';
import { randomUUIDv7 } from 'bun';
import { PaymentService, PaymentIPN } from './payment.service';

const paymentService = new PaymentService(db);

export const paymentsPlugin = new Elysia({ prefix: '/api' })
	.decorate('paymentService', paymentService)
	// POST /api/payments - Creates a new payment record with pending status
	// Accepts order_id, amount, and payment_gateway in the request body
	// Returns the created payment with a generated payment URL
	.post('/payments', async ({ body, set, paymentService }) => {
		//try {
			// A transaction ensures the insert is an all-or-nothing operation.

			// If transaction is successful, set status and return the new payment
			const apiResponse = await paymentService.createPayment(body.order_id, body.amount, body.payment_gateway);
			set.status = 201;
			return apiResponse;
		// } catch (error) {
		// 	console.error("Failed to create payment:", error);
		// 	set.status = 500; // Internal Server Error
		// 	return { error: "Could not process the payment creation." };
		// }
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
			description: "Creates a new payment record with a 'pending' status. The body should contain order_id, amount, and paymentGateway.",
			tags: ['Payments']
		}
	})

	// PATCH /api/payments/:id - Updates the status of an existing payment
	// Accepts payment ID in the URL and new status in the request body
	// Used primarily for webhook callbacks from payment providers
	.patch('/payments/:id', async ({ params, body, set, paymentService }) => {
		const apiResponse = await paymentService.updatePaymentStatus(Number(params.id), body.status);
		set.status = 200;
		return apiResponse;
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
	.get('/payments/:id', async ({ params, set, paymentService }) => {
		const apiResponse = await paymentService.getPaymentById(Number(params.id));
		set.status = 200;
		return apiResponse;	
	}, {
		// Apply schemas for validation and documentation
		params: updatePaymentParamsSchema,
		response: {
			200: updatePaymentResponseSchema,
			500: errorResponseSchema
		},
		detail: {
			summary: "Get Payment Information by ID",
			description: "Retrieves payment details for a specific payment by its ID.",
			tags: ['Payments']
		}
	})
	.listen(3000);

// Helper function to sort object keys
function sortObject(obj: Record<string, any>): Record<string, any> {
	const sorted: Record<string, any> = {};
	const keys = Object.keys(obj).sort();
	for (const key of keys) {
		sorted[key] = obj[key];
	}
	return sorted;
}

// VNPay IPN endpoint handler
export const vnpayIpnHandler = new Elysia({ prefix: '/api' })
	.decorate('db', db)
	.derive(({ db }) => ({
		paymentIPN: new PaymentIPN(db),
	}))
.get('/vnpay_ipn', async ({ query, set, paymentIPN }) => {
	const response = await paymentIPN.handleVnpayIpn(query);
	set.status = 200;
	return response;
	}, {
		detail: {
			summary: "VNPay IPN Callback",
			description: "Webhook endpoint for VNPay payment verification using HMAC-SHA512 hash validation.",
			tags: ['Payments']
		}
	});
