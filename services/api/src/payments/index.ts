import { jwtAuthDerive } from '@common/auth/jwtAuthDerive';
import { ForbiddenError, UnauthorizedError } from '@common/errors/httpErrors';
import { jwt } from '@elysiajs/jwt';
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

const paymentService = new PaymentService(db);

export const paymentsPlugin = (dependencies: { paymentService: PaymentService }) =>
	new Elysia()
		.decorate('paymentService', dependencies.paymentService)
		.use(jwt({ name: 'jwt', secret: process.env.JWT_SECRET as string }))
		// POST /api/payments - Creates a new payment record with pending status
		// Accepts order_id, amount, and payment_gateway in the request body
		// Returns the created payment with a generated payment URL
		.group('/v1/payments', (app) =>
			app.guard({}, (app) =>
				app
					// Verify JWT from Authorization header, with internal service fallback
					.derive(async ({ headers, jwt }) => {
						// Allow internal service calls via secret header
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

						// Otherwise use JWT auth
						return jwtAuthDerive({ headers, jwt });
					})
					.post(
						'/',
						async ({ body, set, paymentService }) => {
							const apiResponse = await paymentService.createPayment(
								body.order_id,
								body.amount,
								body.payment_gateway,
							);
							set.status = 201;
							return apiResponse;
						},
						{
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
							params: updatePaymentParamsSchema,
							body: updatePaymentBodySchema,
							response: {
								200: updatePaymentResponseSchema,
								400: errorResponseSchema,
								404: errorResponseSchema,
								500: errorResponseSchema,
							},
							detail: {
								summary: "Update a Payment's Status",
								description: 'Updates the status of an existing payment by its ID.',
								tags: ['Payments'],
							},
						},
					)

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

// Stubbed VNPay IPN handler for demo — no RabbitMQ, just updates payment status directly
const paymentIPN = new PaymentIPN(db);
export const vnpayIpnHandler = (dependencies: { paymentIPN: PaymentIPN }) =>
	new Elysia().decorate('paymentIPN', paymentIPN).get(
		'/v1/vnpay_ipn',
		async ({ query, set, paymentIPN }) => {
			const response = await paymentIPN.handleVnpayIpn(query);
			set.status = 200;
			return {
				RspCode: response.RspCode,
				Message: response.Message,
			};
		},
		{
			detail: {
				summary: 'VNPay IPN Callback (Stubbed)',
				description:
					'Webhook endpoint for VNPay payment verification. In demo mode, RabbitMQ is not used.',
				tags: ['Payments'],
			},
		},
	);
