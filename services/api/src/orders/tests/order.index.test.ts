import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Elysia } from 'elysia';
import { ordersPlugin } from '../index';
import { NotFoundError } from '@common/errors/httpErrors';
import { errorHandler } from '@common/errors/errorHandler';

// Mock the entire OrderService module
const mockOrderService = {
	createOrder: mock(),
	getOrders: mock(),
	getOrderById: mock(),
	updateOrder: mock(),
	deleteOrder: mock(),
};

// Setup mock data
const MOCK_ORDER = {
	id: 1,
	user_id: 'user-123',
	total_amount: '150.5',
	status: 'pending',
	shipping_address: '123 Test St',
	created_at: new Date().toISOString(),
	updated_at: new Date().toISOString(),
};

// Initialize the Elysia app with the plugin and an error handler
const app = new Elysia()
	.use(errorHandler)
	.use(ordersPlugin({ orderService: mockOrderService as any }));
const API_URL = 'http://localhost';

describe('Orders Plugin - Integration Tests', () => {
	// Reset all mocks before each test
	beforeEach(() => {
		for (const key in mockOrderService) {
			mockOrderService[key as keyof typeof mockOrderService].mockReset();
		}
	});

	// Test suite for Order Creation
	describe('Create Order (POST /orders)', () => {
		it('TC-INT-OD-01: should return 201 Created for a valid order', async () => {
			// Arrange: Define valid input and mock the service to return a successful creation.
			const orderInput = {
				user_id: 'user-123',
				total_amount: 150.5,
				status: 'pending',
				shipping_address: '123 Test St',
			};
			mockOrderService.createOrder.mockResolvedValue(MOCK_ORDER);

			// Act: Send a POST request to the /orders endpoint.
			const response = await app.handle(
				new Request(`${API_URL}/`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(orderInput),
				}),
			);

			// Assert: Check for 201 status, the correct response body, and that the service was called.
			const body = await response.json();
			expect(response.status).toBe(201);
			expect(body.order.id).toBe(MOCK_ORDER.id);
			expect(mockOrderService.createOrder).toHaveBeenCalledWith(orderInput);
		});

		it('TC-INT-OD-02: should return 422 Unprocessable Content for an invalid order', async () => {
			// Arrange: Define invalid input data (missing required fields).
			const invalidInput = { total_amount: 100, status: 'pending' };

			// Act: Send a POST request with the invalid data.
			const response = await app.handle(
				new Request(`${API_URL}/`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(invalidInput),
				}),
			);

			// Assert: Check for a 422 status due to validation failure.
			expect(response.status).toBe(422);
		});
	});

	// Test suite for Getting Orders
	describe('Get Order Information (GET /orders)', () => {
		it('TC-INT-OD-03: should return 200 with a list of all orders', async () => {
			// Arrange: Mock the service to return an array of orders.
			mockOrderService.getOrders.mockResolvedValue([MOCK_ORDER, { ...MOCK_ORDER, id: 2 }]);

			// Act: Send a GET request to the /orders endpoint.
			const response = await app.handle(new Request(`${API_URL}/`));

			// Assert: Check for 200 status and that the response body contains the array.
			const body = await response.json();
			expect(response.status).toBe(200);
			expect(body.orders).toHaveLength(2);
			expect(mockOrderService.getOrders).toHaveBeenCalledWith(undefined);
		});

		it('TC-INT-OD-04: should return 200 with orders for a specific user', async () => {
			// Arrange: Mock the service to return a filtered list of orders.
			mockOrderService.getOrders.mockResolvedValue([MOCK_ORDER]);

			// Act: Send a GET request with a user_id query parameter.
			const response = await app.handle(new Request(`${API_URL}/?user_id=user-123`));

			// Assert: Check for 200 status and that the service was called with the correct user ID.
			const body = await response.json();
			expect(response.status).toBe(200);
			expect(body.orders[0].user_id).toBe('user-123');
			expect(mockOrderService.getOrders).toHaveBeenCalledWith('user-123');
		});

		it('TC-INT-OD-05: should return 200 with a specific order for a valid ID', async () => {
			// Arrange: Mock the service to return a single order object.
			mockOrderService.getOrderById.mockResolvedValue(MOCK_ORDER);

			// Act: Send a GET request to /orders/:id with a valid ID.
			const response = await app.handle(new Request(`${API_URL}/1`));

			// Assert: Check for 200 status and the correct order data in the response.
			const body = await response.json();
			expect(response.status).toBe(200);
			expect(body.order.id).toBe(1);
			expect(mockOrderService.getOrderById).toHaveBeenCalledWith(1);
		});

		it('TC-INT-OD-06: should return 404 Not Found for a non-existent order ID', async () => {
			// Arrange: Mock the service to throw a NotFoundError.
			mockOrderService.getOrderById.mockRejectedValue(new NotFoundError('Order not found'));

			// Act: Send a GET request with an ID that does not exist.
			const response = await app.handle(new Request(`${API_URL}/999`));

			// Assert: Check for a 404 status.
			expect(response.status).toBe(404);
		});
	});

	// Test suite for Updating Orders
	describe('Update Order (PATCH /orders/:id)', () => {
		it('TC-INT-OD-07: should return 200 with the updated order for valid data', async () => {
			// Arrange: Define the update payload and mock the service to return the updated object.
			const updatePayload = { status: 'shipped' };
			const updatedOrder = { ...MOCK_ORDER, status: 'shipped' };
			mockOrderService.updateOrder.mockResolvedValue(updatedOrder);

			// Act: Send a PATCH request with the update payload.
			const response = await app.handle(
				new Request(`${API_URL}/1`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(updatePayload),
				}),
			);

			// Assert: Check for 200 status and that the response body reflects the change.
			const body = await response.json();
			expect(response.status).toBe(200);
			expect(body.order.status).toBe('shipped');
			expect(mockOrderService.updateOrder).toHaveBeenCalledWith(1, updatePayload);
		});

		it('TC-INT-OD-08: should return 404 Not Found when updating a non-existent order', async () => {
			// Arrange: Mock the service to throw a NotFoundError on update.
			const updatePayload = { status: 'shipped' };
			mockOrderService.updateOrder.mockRejectedValue(new NotFoundError('Order not found'));

			// Act: Send a PATCH request for an ID that does not exist.
			const response = await app.handle(
				new Request(`${API_URL}/999`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(updatePayload),
				}),
			);

			// Assert: Check for a 404 status.
			expect(response.status).toBe(404);
		});
	});

	// Test suite for Deleting Orders
	describe('Delete Order (DELETE /orders/:id)', () => {
		it('TC-INT-OD-09: should return 204 No Content when deleting an existing order', async () => {
			// Arrange: Mock the service to resolve successfully (void return).
			mockOrderService.deleteOrder.mockResolvedValue(undefined);

			// Act: Send a DELETE request for an existing ID.
			const response = await app.handle(new Request(`${API_URL}/1`, { method: 'DELETE' }));

			// Assert: Check for 204 status, a null body, and that the service was called.
			expect(response.status).toBe(204);
			const bodyText = await response.text();
			expect(bodyText).toBe('');
			expect(mockOrderService.deleteOrder).toHaveBeenCalledWith(1);
		});

		it('TC-INT-OD-10: should return 404 Not Found when deleting a non-existent order', async () => {
			// Arrange: Mock the service to throw a NotFoundError on delete.
			mockOrderService.deleteOrder.mockRejectedValue(new NotFoundError('Order not found'));

			// Act: Send a DELETE request for an ID that does not exist.
			const response = await app.handle(new Request(`${API_URL}/999`, { method: 'DELETE' }));

			// Assert: Check for a 404 status.
			expect(response.status).toBe(404);
		});
	});
});
