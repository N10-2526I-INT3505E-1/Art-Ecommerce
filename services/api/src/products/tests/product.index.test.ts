import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Elysia } from 'elysia';
import { productsPlugin } from '../index';
import { ConflictError, InternalServerError, NotFoundError } from '@common/errors/httpErrors';
import { errorHandler } from '@common/errors/errorHandler';

// 1. Mock the service layer
const mockProductService = {
	createProduct: mock(),
	getAll: mock(),
	getById: mock(),
	update: mock(),
	delete: mock(),
};

// 2. Mock data
const MOCK_PRODUCT = {
	id: 'a7e7a3e7-9a8c-4c6e-8e4a-5b1e1a9b2b8c',
	name: 'Vintage Artwork',
	price: 150.75,
	imageUrl: 'http://example.com/image.png',
	description: 'A beautiful piece of art.',
	slug: 'vintage-artwork',
	stock: 10,
	categoryId: 'cat-123',
	sourceUrl: 'http://source.com/art',
	createdAt: new Date(),
	deletedAt: null,
};

// 3. Initialize the Elysia app for testing, injecting the mock service
const app = new Elysia()
	.use(errorHandler)
	.use(productsPlugin({ productService: mockProductService as any }));

const API_URL = 'http://localhost';

describe('Products Plugin - Integration Tests', () => {
	beforeEach(() => {
		// Reset all mocks before each test
		Object.values(mockProductService).forEach((fn) => fn.mockReset());
	});

	// Feature Group: Create Product
	describe('Create Product', () => {
		it('TC-INT-PD-01: should create a new product with valid data', async () => {
			// Arrange: Prepare valid input data and configure the mock service to return a successful result.
			const inputData = { name: 'New Art', price: 200, imageUrl: 'url' };
			mockProductService.createProduct.mockResolvedValue({ id: 'new-id', ...inputData });

			// Act: Send a POST request to create the product.
			const response = await app.handle(
				new Request(`${API_URL}/`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(inputData),
				}),
			);
			const body = await response.json();

			// Assert: Check for a 201 status and that the response body contains the new ID.
			expect(response.status).toBe(201);
			expect(body.id).toBe('new-id');
		});

		it('TC-INT-PD-02: should fail to create a product with invalid data (missing required field)', async () => {
			// Arrange: Prepare input data missing the required 'name' field.
			const invalidInput = { price: 200, imageUrl: 'url' };

			// Act: Send a POST request with the invalid data.
			const response = await app.handle(
				new Request(`${API_URL}/`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(invalidInput),
				}),
			);

			// Assert: Check for a 422 status and ensure the service was never called.
			expect(response.status).toBe(422);
			expect(mockProductService.createProduct).not.toHaveBeenCalled();
		});

		it('TC-INT-PD-03: should fail to create a product with a sourceUrl that already exists', async () => {
			// Arrange: Configure the mock service to throw a ConflictError.
			const inputData = {
				name: 'Duplicate Art',
				price: 200,
				imageUrl: 'url',
				sourceUrl: 'duplicate-url',
			};
			mockProductService.createProduct.mockRejectedValue(
				new ConflictError('Product with this source URL already exists.'),
			);

			// Act: Send the POST request.
			const response = await app.handle(
				new Request(`${API_URL}/`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(inputData),
				}),
			);

			// Assert: Check that the API returns a 409 status.
			expect(response.status).toBe(409);
		});
	});

	// Feature Group: Get Product Information and List
	describe('Get Product Information and List', () => {
		it('TC-INT-PD-04: should get a list of products with valid pagination parameters', async () => {
			// Arrange: Configure the mock service to return a paginated response.
			const mockResponse = { data: [MOCK_PRODUCT], pagination: { total: 1, page: 1, limit: 10 } };
			mockProductService.getAll.mockResolvedValue(mockResponse);

			// Act: Send a GET request with query parameters.
			const response = await app.handle(new Request(`${API_URL}/?page=1&limit=10`));
			const body = await response.json();

			// Assert: Check for a 200 status and the correct paginated structure.
			expect(response.status).toBe(200);
			expect(body.data).toBeInstanceOf(Array);
			expect(body.pagination.total).toBe(1);
		});

		it('TC-INT-PD-06: should get the details of an existing, non-deleted product by its ID', async () => {
			// Arrange: Configure the mock service to return a specific product.
			mockProductService.getById.mockResolvedValue(MOCK_PRODUCT);

			// Act: Send a GET request to a specific ID.
			const response = await app.handle(new Request(`${API_URL}/${MOCK_PRODUCT.id}`));
			const body = await response.json();

			// Assert: Check for a 200 status and that the correct product ID is returned.
			expect(response.status).toBe(200);
			expect(body.id).toBe(MOCK_PRODUCT.id);
		});

		it('TC-INT-PD-07: should fail to get a product with a non-existent ID', async () => {
			// Arrange: Configure the mock service to throw a NotFoundError.
			mockProductService.getById.mockRejectedValue(new NotFoundError('Product not found.'));

			// Act: Send a GET request to a non-existent ID.
			const response = await app.handle(new Request(`${API_URL}/non-existent-id`));

			// Assert: Check that the API returns a 404 status.
			expect(response.status).toBe(404);
		});

		it('TC-INT-PD-08: should fail to get a product that has been soft-deleted', async () => {
			// Arrange: The service logic should throw a NotFoundError for soft-deleted items. We simulate this behavior.
			mockProductService.getById.mockRejectedValue(new NotFoundError('Product not found.'));

			// Act: Send a GET request for an ID that is presumed to be soft-deleted.
			const response = await app.handle(new Request(`${API_URL}/soft-deleted-id`));

			// Assert: Check that the API returns a 404 status, hiding the resource from the user.
			expect(response.status).toBe(404);
		});
	});

	// Feature Group: Update Product
	describe('Update Product', () => {
		it('TC-INT-PD-09: should update an existing product with valid data', async () => {
			// Arrange: Prepare update data and configure the mock service to return the updated product.
			const updateData = { name: 'Updated Name' };
			const updatedProduct = { ...MOCK_PRODUCT, ...updateData };
			mockProductService.update.mockResolvedValue(updatedProduct);

			// Act: Send a PATCH request.
			const response = await app.handle(
				new Request(`${API_URL}/${MOCK_PRODUCT.id}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(updateData),
				}),
			);
			const body = await response.json();

			// Assert: Check for a 200 status and that the product name was changed.
			expect(response.status).toBe(200);
			expect(body.name).toBe('Updated Name');
		});

		it('TC-INT-PD-10: should fail to update a non-existent product', async () => {
			// Arrange: Configure the mock service to throw a NotFoundError.
			mockProductService.update.mockRejectedValue(new NotFoundError('Product not found.'));

			// Act: Send a PATCH request to a non-existent ID.
			const response = await app.handle(
				new Request(`${API_URL}/non-existent-id`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name: 'Does not matter' }),
				}),
			);
			// Assert: Check that the API returns a 404 status.
			expect(response.status).toBe(404);
		});
	});

	// Feature Group: Delete Product
	describe('Delete Product', () => {
		it('TC-INT-PD-11: should delete an existing product', async () => {
			// Arrange: Configure the mock service to resolve successfully (void return is fine).
			mockProductService.delete.mockResolvedValue({ message: 'Success' });

			// Act: Send a DELETE request to an existing ID.
			const response = await app.handle(
				new Request(`${API_URL}/${MOCK_PRODUCT.id}`, {
					method: 'DELETE',
				}),
			);

			// Assert: Check that the API returns a 204 No Content status and an empty body.
			expect(response.status).toBe(204);
			expect(response.body).toBe(null);
		});

		it('TC-INT-PD-12: should fail to delete a non-existent product', async () => {
			// Arrange: Configure the mock service to throw a NotFoundError.
			mockProductService.delete.mockRejectedValue(new NotFoundError('Product not found.'));

			// Act: Send a DELETE request to a non-existent ID.
			const response = await app.handle(
				new Request(`${API_URL}/non-existent-id`, {
					method: 'DELETE',
				}),
			);

			// Assert: Check that the API returns a 404 status.
			expect(response.status).toBe(404);
		});
	});
});
