import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Elysia } from 'elysia';
import { paymentsPlugin, vnpayIpnHandler } from '../index';
import { InternalServerError, NotFoundError } from '@common/errors/httpErrors';
import { errorHandler } from '@common/errors/errorHandler';
import { tr } from '@faker-js/faker';

// 1. Mock the business logic services
const mockPaymentService = {
	createPayment: mock(),
	updatePaymentStatus: mock(),
	getPaymentById: mock(),
};

const mockPaymentIPN = {
	handleVnpayIpn: mock(),
};

// 2. Mock data to be returned by the mock services
const MOCK_PAYMENT = {
	id: 1,
	order_id: 101,
	amount: '1500',
	payment_gateway: 'vnpay',
	status: 'pending',
	paymentUrl: 'https://payment-gateway.com/pay/1',
	created_at: new Date().toISOString(),
	updated_at: new Date().toISOString(),
};

// 3. Initialize the Elysia app for testing, injecting the mock services
const app = new Elysia()
	.use(errorHandler) // Use the real errorHandler to test the error handling flow
	.use(paymentsPlugin({ paymentService: mockPaymentService as any }))
	.use(vnpayIpnHandler({ paymentIPN: mockPaymentIPN as any }));

const API_URL = 'http://localhost';

describe('Payments Plugin - Integration Tests', () => {
	// Reset all mocks before each test to ensure test isolation
	beforeEach(() => {
		Object.values(mockPaymentService).forEach((fn) => fn.mockReset());
		Object.values(mockPaymentIPN).forEach((fn) => fn.mockReset());
	});

	// Feature Group: Create Payment
	describe('Create Payment', () => {
		it('TC-INT-PAY-01: should create a new payment ticket with valid data', async () => {
			// Arrange: Prepare valid input data and configure the mock service to return a successful result.
			const paymentInput = { order_id: 101, amount: 150000, payment_gateway: 'vnpay' };
			mockPaymentService.createPayment.mockResolvedValue(MOCK_PAYMENT);

			// Act: Send a POST request to the payment creation endpoint.
			const response = await app.handle(
				new Request(`${API_URL}/`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(paymentInput),
				}),
			);
			const body = await response.json();

			// Assert: Check for a 201 status code and that the response body contains the expected data.
			expect(response.status).toBe(201);
			expect(body.id).toBe(MOCK_PAYMENT.id);
		});

		it('TC-INT-PAY-02: should fail to create a payment with invalid data', async () => {
			// Arrange: Prepare invalid input data (amount is a string).
			const invalidInput = { order_id: 101, amount: 'one-thousand-dollars' };

			// Act: Send a POST request with the invalid data.
			const response = await app.handle(
				new Request(`${API_URL}/`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(invalidInput),
				}),
			);

			// Assert: Check for a 422 status code and ensure the service was never called.
			expect(response.status).toBe(422);
			expect(mockPaymentService.createPayment).not.toHaveBeenCalled();
		});

		it('TC-INT-PAY-03: should fail to create a payment when the service encounters an internal error', async () => {
			// Arrange: Configure the mock service to throw an error.
			mockPaymentService.createPayment.mockRejectedValue(
				new InternalServerError('Database connection failed'),
			);
			const paymentInput = { order_id: 101, amount: 1500.0, payment_gateway: 'vnpay' };

			// Act: Send a POST request with valid data.
			const response = await app.handle(
				new Request(`${API_URL}/`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(paymentInput),
				}),
			);

			// Assert: Check for a 500 status code. This will now pass.
			expect(response.status).toBe(500);
		});
	});

	// Feature Group: Update Payment Status
	describe('Update Payment Status', () => {
		it('TC-INT-PAY-04: should update the status for an existing payment', async () => {
			// Arrange: Configure the mock service to return the updated payment object.
			const updatedPayment = { ...MOCK_PAYMENT, status: 'completed' };
			mockPaymentService.updatePaymentStatus.mockResolvedValue(updatedPayment);

			// Act: Send a PATCH request to update the status.
			const response = await app.handle(
				new Request(`${API_URL}/1`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ status: 'completed' }),
				}),
			);
			const body = await response.json();

			// Assert: Check for a 200 status and that the response body reflects the new status.
			expect(response.status).toBe(200);
			expect(body.status).toBe('completed');
		});

		it('TC-INT-PAY-05: should fail to update when the input ID does not exist', async () => {
			// Arrange: Configure the mock service to throw a NotFoundError.
			mockPaymentService.updatePaymentStatus.mockRejectedValue(
				new NotFoundError('Payment not found'),
			);

			// Act: Send a PATCH request to a non-existent ID.
			const response = await app.handle(
				new Request(`${API_URL}/999`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ status: 'completed' }),
				}),
			);

			// Assert: Check that the API returns a 404 status.
			expect(response.status).toBe(404);
		});
	});

	// Feature Group: Get Payment Information
	describe('Get Payment Information', () => {
		it('TC-INT-PAY-06: should retrieve information for an existing ID', async () => {
			// Arrange: Configure the mock service to return a specific payment.
			mockPaymentService.getPaymentById.mockResolvedValue(MOCK_PAYMENT);

			// Act: Send a GET request to an existing ID.
			const response = await app.handle(new Request(`${API_URL}/1`));
			const body = await response.json();

			// Assert: Check for a 200 status and that the body contains the correct data.
			expect(response.status).toBe(200);
			expect(body.id).toBe(1);
		});

		it('TC-INT-PAY-07: should fail to retrieve information for a non-existent ID', async () => {
			// Arrange: Configure the mock service to throw a NotFoundError.
			mockPaymentService.getPaymentById.mockRejectedValue(new NotFoundError('Payment not found'));

			// Act: Send a GET request to a non-existent ID.
			const response = await app.handle(new Request(`${API_URL}/999`));

			// Assert: Check that the API returns a 404 status.
			expect(response.status).toBe(404);
		});
	});

	// Feature Group: Handle VNPay IPN
	describe('Handle VNPay IPN', () => {
		it('TC-INT-PAY-08: should handle a valid IPN callback from VNPay to confirm a successful transaction', async () => {
			// Arrange: Configure the mock IPN service to return a successful response object.
			const successResponse = { RspCode: '00', Message: 'success' };
			mockPaymentIPN.handleVnpayIpn.mockResolvedValue(successResponse);

			// Act: Send a GET request simulating a callback from VNPay.
			const response = await app.handle(new Request(`${API_URL}/vnpay_ipn?vnp_TxnRef=1`));
			const body = await response.json();

			// Assert: Check for a 200 status and the correct success response body.
			expect(response.status).toBe(200);
			expect(body).toEqual(successResponse);
		});

		it('TC-INT-PAY-09: should handle an IPN callback with an invalid checksum', async () => {
			// Arrange: Configure the mock IPN service to return a checksum failure response.
			const failResponse = { RspCode: '97', Message: 'Fail checksum' };
			mockPaymentIPN.handleVnpayIpn.mockResolvedValue(failResponse);

			// Act: Send a GET request simulating a failed callback.
			const response = await app.handle(new Request(`${API_URL}/vnpay_ipn?vnp_SecureHash=invalid`));
			const body = await response.json();

			// Assert: Check for a 200 status and the correct failure response body.
			expect(response.status).toBe(200);
			expect(body).toEqual(failResponse);
		});
	});
});
