import { Elysia, t } from 'elysia';
import { db } from './db';
import {
	createPaymentBodySchema,
	errorResponseSchema,
	paymentResponseSchema,
	paymentsTable,
	updatePaymentBodySchema,
	updatePaymentParamsSchema,
	updatePaymentResponseSchema,
} from './payment.model';
import { PaymentIPN, PaymentService } from './payment.service';
import { rabbitPlugin, QUEUES } from './rabbitmq';
import { ForbiddenError, UnauthorizedError } from '@common/errors/httpErrors';
const paymentService = new PaymentService(db);

export const paymentsPlugin = (dependencies: { paymentService: PaymentService }) =>
	new Elysia()
		.decorate('paymentService', paymentService)
		// POST /api/payments - Creates a new payment record with pending status
		// Accepts order_id, amount, and payment_gateway in the request body
		// Returns the created payment with a generated payment URL
		.group('/v1/payments', (app) =>
			app.guard(
				{}, // Không cần beforeHandle verify token nữa
				(app) =>
					app
						// Trích xuất thông tin User từ Header do Gateway gửi xuống
						.derive(({ headers }) => {
							const userId = headers['x-user-id'];
							const userRole = headers['x-user-role'];
							const internalSecret = headers['x-internal-secret'];
							if (internalSecret && internalSecret == process.env.INTERNAL_HEADER_SECRET) {
								return {
									user: {
										id: 'internal-service',
										email: '',
										role: 'operator',
									},
								};
							}
							// Nếu không có header -> Ai đó đang gọi thẳng vào Service bỏ qua Gateway -> Chặn
							if (userId == null) {
								throw new UnauthorizedError('Missing Gateway Headers (x-user-id).');
							}
							// Nếu secret đúng thì bỏ qua, đây là call nội bộ giữa các service

							// Trả về thông tin User để gắn vào context
							return {
								user: {
									id: userId as string,
									email: '', // Gateway thường không gửi email, service tự fetch nếu cần
									role: (userRole as string) || 'user',
								},
							};
						})
						.post(
							'/',
							async ({ body, set, paymentService }) => {
								//try {
								// A transaction ensures the insert is an all-or-nothing operation.

								// If transaction is successful, set status and return the new payment
								const apiResponse = await paymentService.createPayment(
									body.order_id,
									body.amount,
									body.payment_gateway,
								);
								set.status = 201;
								return apiResponse;
							},
							{
								// Apply the schemas for automatic validation and documentation
								body: createPaymentBodySchema,
								response: {
									201: paymentResponseSchema,
									400: errorResponseSchema,
									500: errorResponseSchema,
								},
								detail: {
									summary: 'Create a Pending Payment',
									description:
										"Creates a new payment record with a 'pending' status. The body should contain order_id, amount, and paymentGateway.",
									tags: ['Payments'],
								},
							},
						)

						// PATCH /api/payments/:id - Updates the status of an existing payment
						// Accepts payment ID in the URL and new status in the request body
						// Used primarily for webhook callbacks from payment providers
						.patch(
							'/:id',
							async ({ params, body, user, set, paymentService }) => {
								if (user.role !== 'manager' && user.role !== 'operator') {
									throw new ForbiddenError('You do not have permission to update payment status.');
								}
								const apiResponse = await paymentService.updatePaymentStatus(
									String(params.id),
									body.status,
								);
								set.status = 200;
								return apiResponse;
							},
							{
								// Apply schemas for validation and documentation
								params: updatePaymentParamsSchema,
								body: updatePaymentBodySchema,
								response: {
									200: updatePaymentResponseSchema,
									400: errorResponseSchema, // Handles validation errors for body/params
									404: errorResponseSchema, // Handles our custom "not found" case
									500: errorResponseSchema,
								},
								detail: {
									summary: "Update a Payment's Status",
									description:
										'Updates the status of an existing payment by its ID. This is typically used by a webhook from a payment provider.',
									tags: ['Payments'],
								},
							},
						)

						// GET /api/payments/:id - Retrieves payment details by ID
						// Returns the payment record with all its information (id, order_id, amount, gateway, status, timestamps)
						.get(
							'/:id',
							async ({ params, user, set, paymentService }) => {
								if (user.role !== 'manager' && user.role !== 'operator') {
									throw new ForbiddenError(
										'You do not have permission to access payment information.',
									);
								}
								const apiResponse = await paymentService.getPaymentById(String(params.id));
								set.status = 200;
								return apiResponse;
							},
							{
								// Apply schemas for validation and documentation
								params: updatePaymentParamsSchema,
								response: {
									200: updatePaymentResponseSchema,
									500: errorResponseSchema,
								},
								detail: {
									summary: 'Get Payment Information by ID',
									description: 'Retrieves payment details for a specific payment by its ID.',
									tags: ['Payments'],
								},
							},
						),
			),
		);

// Helper function to sort object keys
function sortObject(obj: Record<string, any>): Record<string, any> {
	const sorted: Record<string, any> = {};
	const keys = Object.keys(obj).sort();
	for (const key of keys) {
		sorted[key] = obj[key];
	}
	return sorted;
}

const paymentIPN = new PaymentIPN(db);
// VNPay IPN endpoint handler
export const vnpayIpnHandler = (dependencies: { paymentIPN: PaymentIPN }) =>
	new Elysia()
		.use(rabbitPlugin())
		.decorate('paymentIPN', paymentIPN)
		.get(
			'/v1/vnpay_ipn',
			async ({ query, set, paymentIPN, sendToQueue }) => {
				const response = await paymentIPN.handleVnpayIpn(query);
				const orderId = response.orderId;
				if (response.RspCode === '00') {
					const isSendToQueue = sendToQueue(QUEUES.PAYMENT_PROCESS, {
						type: 'PAYMENT_RESULT',
						orderId: orderId, // VNPay Transaction Reference
						status: 'PAID',
						amount: query.vnp_Amount,
						id: query.vnp_TxnRef,
					});
					if (!isSendToQueue) {
						(console.error(
							'Failed to send payment result to RabbitMQ, Order Service might not be notified',
						),
							{
								type: 'PAYMENT_RESULT',
								orderId: query.vnp_TxnRef, // VNPay Transaction Reference
								status: 'PAID',
								amount: query.vnp_Amount,
								id: query.vnp_TxnRef,
							});
					}
					return {
						RspCode: response.RspCode,
						Message: response.Message,
					};
				}
				set.status = 200;
				return response;
			},
			{
				detail: {
					summary: 'VNPay IPN Callback',
					description:
						'Webhook endpoint for VNPay payment verification using HMAC-SHA512 hash validation.',
					tags: ['Payments'],
				},
			},
		);
