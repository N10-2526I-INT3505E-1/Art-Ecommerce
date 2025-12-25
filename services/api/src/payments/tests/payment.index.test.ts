import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Elysia, t } from 'elysia';
import {
	InternalServerError,
	NotFoundError,
	UnauthorizedError,
	ForbiddenError,
} from '@common/errors/httpErrors';
import { errorHandler } from '@common/errors/errorHandler';

// 1. Mock the business logic services
const mockPaymentService = {
	createPayment: mock(),
	updatePaymentStatus: mock(),
	getPaymentById: mock(),
};

const mockPaymentIPN = {
	handleVnpayIpn: mock(),
};

// Reset all mocks
const resetMocks = () => {
	Object.values(mockPaymentService).forEach((m) => m.mockReset());
	Object.values(mockPaymentIPN).forEach((m) => m.mockReset());
};

// 2. Mock data to be returned by the mock services
const MOCK_PAYMENT = {
	id: 'payment-001',
	order_id: 'order-101',
	amount: '1500',
	payment_gateway: 'vnpay',
	status: 'pending',
	paymentUrl: 'https://payment-gateway.com/pay/1',
	created_at: new Date().toISOString(),
	updated_at: new Date().toISOString(),
};

// Helper to create auth headers
const createAuthHeaders = (userId: string, role: string = 'user') => ({
	'x-user-id': userId,
	'x-user-role': role,
	'Content-Type': 'application/json',
});

// Helper to create internal service headers
const createInternalHeaders = () => ({
	'x-internal-secret': process.env.INTERNAL_HEADER_SECRET || 'test-secret',
	'Content-Type': 'application/json',
});

// 3. Test plugin that mirrors the real implementation but uses mocked services
const testPaymentsPlugin = (dependencies: { paymentService: typeof mockPaymentService }) =>
	new Elysia({ name: 'test-payments-plugin' })
		.decorate('paymentService', dependencies.paymentService)
		.group('/payments', (app) =>
			app.guard({}, (app) =>
				app
					.derive(({ headers }) => {
						const userId = headers['x-user-id'];
						const userRole = headers['x-user-role'];
						const internalSecret = headers['x-internal-secret'];

						if (
							internalSecret &&
							internalSecret === (process.env.INTERNAL_HEADER_SECRET || 'test-secret')
						) {
							return {
								user: {
									id: 'internal-service',
									email: '',
									role: 'operator',
								},
							};
						}

						if (!userId) {
							throw new UnauthorizedError('Missing Gateway Headers (x-user-id).');
						}

						return {
							user: {
								id: userId as string,
								email: '',
								role: (userRole as string) || 'user',
							},
						};
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
							body: t.Object({
								order_id: t.String(),
								amount: t.Integer({ minimum: 0 }),
								payment_gateway: t.String(),
							}),
						},
					)
					.patch(
						'/:id',
						async ({ params, body, user, paymentService }) => {
							if (user.role !== 'manager' && user.role !== 'operator') {
								throw new ForbiddenError('You do not have permission to update payment status.');
							}
							const apiResponse = await paymentService.updatePaymentStatus(
								String(params.id),
								body.status,
							);
							return apiResponse;
						},
						{
							params: t.Object({ id: t.String() }),
							body: t.Object({
								status: t.Union([
									t.Literal('paid'),
									t.Literal('failed'),
									t.Literal('cancelled'),
									t.Literal('pending'),
								]),
							}),
						},
					)
					.get(
						'/:id',
						async ({ params, user, paymentService }) => {
							if (user.role !== 'manager' && user.role !== 'operator') {
								throw new ForbiddenError(
									'You do not have permission to access payment information.',
								);
							}
							const apiResponse = await paymentService.getPaymentById(String(params.id));
							return apiResponse;
						},
						{
							params: t.Object({ id: t.String() }),
						},
					),
			),
		);

const testVnpayIpnHandler = (dependencies: { paymentIPN: typeof mockPaymentIPN }) =>
	new Elysia({ name: 'test-vnpay-ipn' })
		.decorate('paymentIPN', dependencies.paymentIPN)
		.get('/vnpay_ipn', async ({ query, paymentIPN }) => {
			const response = await paymentIPN.handleVnpayIpn(query);
			return response;
		});

const API_URL = 'http://localhost';

describe('Payments Plugin - Integration Tests', () => {
	let app: Elysia<any, any, any, any, any, any>;

	// Reset all mocks before each test to ensure test isolation
	beforeEach(() => {
		resetMocks();
		app = new Elysia()
			.use(errorHandler)
			.use(testPaymentsPlugin({ paymentService: mockPaymentService as any }))
			.use(testVnpayIpnHandler({ paymentIPN: mockPaymentIPN as any }));
	});

	// Feature Group: Create Payment
	describe('Create Payment', () => {
		it('TC-INT-PAY-01: should create a new payment ticket with valid data', async () => {
			const paymentInput = { order_id: 'order-101', amount: 150000, payment_gateway: 'vnpay' };
			mockPaymentService.createPayment.mockResolvedValue(MOCK_PAYMENT);

			const response = await app.handle(
				new Request(`${API_URL}/payments/`, {
					method: 'POST',
					headers: createAuthHeaders('user-123', 'operator'),
					body: JSON.stringify(paymentInput),
				}),
			);
			const body = await response.json();

			expect(response.status).toBe(201);
			expect(body.id).toBe(MOCK_PAYMENT.id);
		});

		it('TC-INT-PAY-02: should fail to create a payment with invalid data', async () => {
			const invalidInput = { order_id: 'order-101', amount: 'one-thousand-dollars' };

			const response = await app.handle(
				new Request(`${API_URL}/payments/`, {
					method: 'POST',
					headers: createAuthHeaders('user-123', 'operator'),
					body: JSON.stringify(invalidInput),
				}),
			);

			expect(response.status).toBe(422);
			expect(mockPaymentService.createPayment).not.toHaveBeenCalled();
		});

		it('TC-INT-PAY-03: should fail to create a payment when the service encounters an internal error', async () => {
			mockPaymentService.createPayment.mockRejectedValue(
				new InternalServerError('Database connection failed'),
			);
			const paymentInput = { order_id: 'order-101', amount: 1500, payment_gateway: 'vnpay' };

			const response = await app.handle(
				new Request(`${API_URL}/payments/`, {
					method: 'POST',
					headers: createAuthHeaders('user-123', 'operator'),
					body: JSON.stringify(paymentInput),
				}),
			);

			expect(response.status).toBe(500);
		});

		it('TC-INT-PAY-04: should return 401 without auth headers', async () => {
			const paymentInput = { order_id: 'order-101', amount: 150000, payment_gateway: 'vnpay' };

			const response = await app.handle(
				new Request(`${API_URL}/payments/`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(paymentInput),
				}),
			);

			expect(response.status).toBe(401);
		});

		it('TC-INT-PAY-05: should allow internal service calls with secret header', async () => {
			const paymentInput = { order_id: 'order-101', amount: 150000, payment_gateway: 'vnpay' };
			mockPaymentService.createPayment.mockResolvedValue(MOCK_PAYMENT);

			const response = await app.handle(
				new Request(`${API_URL}/payments/`, {
					method: 'POST',
					headers: createInternalHeaders(),
					body: JSON.stringify(paymentInput),
				}),
			);

			expect(response.status).toBe(201);
		});
	});

	// Feature Group: Update Payment Status
	describe('Update Payment Status', () => {
		it('TC-INT-PAY-06: should update the status for an existing payment (manager)', async () => {
			const updatedPayment = { ...MOCK_PAYMENT, status: 'paid' };
			mockPaymentService.updatePaymentStatus.mockResolvedValue(updatedPayment);

			const response = await app.handle(
				new Request(`${API_URL}/payments/payment-001`, {
					method: 'PATCH',
					headers: createAuthHeaders('admin-001', 'manager'),
					body: JSON.stringify({ status: 'paid' }),
				}),
			);
			const body = await response.json();

			expect(response.status).toBe(200);
			expect(body.status).toBe('paid');
		});

		it('TC-INT-PAY-07: should update the status for an existing payment (operator)', async () => {
			const updatedPayment = { ...MOCK_PAYMENT, status: 'cancelled' };
			mockPaymentService.updatePaymentStatus.mockResolvedValue(updatedPayment);

			const response = await app.handle(
				new Request(`${API_URL}/payments/payment-001`, {
					method: 'PATCH',
					headers: createAuthHeaders('operator-001', 'operator'),
					body: JSON.stringify({ status: 'cancelled' }),
				}),
			);
			const body = await response.json();

			expect(response.status).toBe(200);
			expect(body.status).toBe('cancelled');
		});

		it('TC-INT-PAY-08: should fail to update when the input ID does not exist', async () => {
			mockPaymentService.updatePaymentStatus.mockRejectedValue(
				new NotFoundError('Payment not found'),
			);

			const response = await app.handle(
				new Request(`${API_URL}/payments/non-existent`, {
					method: 'PATCH',
					headers: createAuthHeaders('admin-001', 'manager'),
					body: JSON.stringify({ status: 'paid' }),
				}),
			);

			expect(response.status).toBe(404);
		});

		it('TC-INT-PAY-09: should return 403 for regular user', async () => {
			const response = await app.handle(
				new Request(`${API_URL}/payments/payment-001`, {
					method: 'PATCH',
					headers: createAuthHeaders('user-123', 'user'),
					body: JSON.stringify({ status: 'paid' }),
				}),
			);

			expect(response.status).toBe(403);
		});

		it('TC-INT-PAY-10: should return 422 for invalid status value', async () => {
			const response = await app.handle(
				new Request(`${API_URL}/payments/payment-001`, {
					method: 'PATCH',
					headers: createAuthHeaders('admin-001', 'manager'),
					body: JSON.stringify({ status: 'completed' }), // Invalid status
				}),
			);

			expect(response.status).toBe(422);
		});
	});

	// Feature Group: Get Payment Information
	describe('Get Payment Information', () => {
		it('TC-INT-PAY-11: should retrieve information for an existing ID (manager)', async () => {
			mockPaymentService.getPaymentById.mockResolvedValue(MOCK_PAYMENT);

			const response = await app.handle(
				new Request(`${API_URL}/payments/payment-001`, {
					headers: createAuthHeaders('admin-001', 'manager'),
				}),
			);
			const body = await response.json();

			expect(response.status).toBe(200);
			expect(body.id).toBe('payment-001');
		});

		it('TC-INT-PAY-12: should retrieve information for an existing ID (operator)', async () => {
			mockPaymentService.getPaymentById.mockResolvedValue(MOCK_PAYMENT);

			const response = await app.handle(
				new Request(`${API_URL}/payments/payment-001`, {
					headers: createAuthHeaders('operator-001', 'operator'),
				}),
			);
			const body = await response.json();

			expect(response.status).toBe(200);
			expect(body.id).toBe('payment-001');
		});

		it('TC-INT-PAY-13: should fail to retrieve information for a non-existent ID', async () => {
			mockPaymentService.getPaymentById.mockRejectedValue(new NotFoundError('Payment not found'));

			const response = await app.handle(
				new Request(`${API_URL}/payments/non-existent`, {
					headers: createAuthHeaders('admin-001', 'manager'),
				}),
			);

			expect(response.status).toBe(404);
		});

		it('TC-INT-PAY-14: should return 403 for regular user', async () => {
			const response = await app.handle(
				new Request(`${API_URL}/payments/payment-001`, {
					headers: createAuthHeaders('user-123', 'user'),
				}),
			);

			expect(response.status).toBe(403);
		});

		it('TC-INT-PAY-15: should return 401 without auth headers', async () => {
			const response = await app.handle(new Request(`${API_URL}/payments/payment-001`));

			expect(response.status).toBe(401);
		});
	});

	// Feature Group: Handle VNPay IPN
	describe('Handle VNPay IPN', () => {
		it('TC-INT-PAY-16: should handle a valid IPN callback from VNPay to confirm a successful transaction', async () => {
			const successResponse = { RspCode: '00', Message: 'success', orderId: 'order-001' };
			mockPaymentIPN.handleVnpayIpn.mockResolvedValue(successResponse);

			const response = await app.handle(new Request(`${API_URL}/vnpay_ipn?vnp_TxnRef=payment-001`));
			const body = await response.json();

			expect(response.status).toBe(200);
			expect(body.RspCode).toBe('00');
		});

		it('TC-INT-PAY-17: should handle an IPN callback with order not found', async () => {
			const failResponse = { RspCode: '01', Message: 'Order not found' };
			mockPaymentIPN.handleVnpayIpn.mockResolvedValue(failResponse);

			const response = await app.handle(new Request(`${API_URL}/vnpay_ipn?vnp_TxnRef=unknown`));
			const body = await response.json();

			expect(response.status).toBe(200);
			expect(body).toEqual(failResponse);
		});

		it('TC-INT-PAY-18: should handle an IPN callback with invalid amount', async () => {
			const failResponse = { RspCode: '04', Message: 'Invalid amount' };
			mockPaymentIPN.handleVnpayIpn.mockResolvedValue(failResponse);

			const response = await app.handle(
				new Request(`${API_URL}/vnpay_ipn?vnp_TxnRef=payment-001&vnp_Amount=999`),
			);
			const body = await response.json();

			expect(response.status).toBe(200);
			expect(body).toEqual(failResponse);
		});

		it('TC-INT-PAY-19: should handle an IPN callback for already confirmed order', async () => {
			const failResponse = { RspCode: '02', Message: 'Order already confirmed' };
			mockPaymentIPN.handleVnpayIpn.mockResolvedValue(failResponse);

			const response = await app.handle(new Request(`${API_URL}/vnpay_ipn?vnp_TxnRef=payment-001`));
			const body = await response.json();

			expect(response.status).toBe(200);
			expect(body).toEqual(failResponse);
		});
	});
});
