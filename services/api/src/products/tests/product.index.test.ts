import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Elysia } from 'elysia';
import { productsPlugin } from '../index';
import {
	BadRequestError,
	ConflictError,
	InternalServerError,
	NotFoundError,
} from '@common/errors/httpErrors';
import { errorHandler } from '@common/errors/errorHandler';

// ========================================================================
// 1. CONFIGURATION - Change API_VERSION to update all tests at once
// ========================================================================
const BASE_URL = 'http://localhost';
const API_VERSION = '/v1';
const PRODUCTS_PATH = '/products';

// Helper to build URLs - centralizes path construction
const buildUrl = (path: string = '', query: string = '') =>
	`${BASE_URL}${API_VERSION}${PRODUCTS_PATH}${path}${query}`;

// ========================================================================
// 2. MOCK SERVICE SETUP
// ========================================================================
const mockProductService = {
	createProduct: mock(),
	getAll: mock(),
	getById: mock(),
	getRelated: mock(),
	getRecommendations: mock(),
	getAllCategories: mock(),
	getAllTags: mock(),
	update: mock(),
	delete: mock(),
	reduceStock: mock(),
	restoreStock: mock(),
};

// Mock RabbitMQ plugin
mock.module('../rabbitmq', () => ({
	rabbitPlugin: () => new Elysia().decorate('rabbitChannel', { consume: mock() }),
	QUEUES: { PRODUCT_UPDATES: 'product_updates' },
}));

// ========================================================================
// 3. MOCK DATA FIXTURES
// ========================================================================
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
	tags: ['art', 'vintage'],
};

const MOCK_CATEGORY = {
	id: 'cat-123',
	name: 'Paintings',
	slug: 'paintings',
	description: 'Beautiful paintings',
};

const MOCK_TAG = {
	id: 'tag-123',
	name: 'vintage',
	type: 'auto',
};

const AUTH_HEADERS = {
	'Content-Type': 'application/json',
	'x-user-id': 'user-123',
	'x-user-role': 'admin',
};

// ========================================================================
// 4. TEST APP INITIALIZATION
// ========================================================================
let app: Elysia;

const initApp = async () => {
	return new Elysia()
		.use(errorHandler)
		.use(await productsPlugin({ productService: mockProductService as any }));
};

describe('Products Plugin - Integration Tests', () => {
	beforeEach(async () => {
		// Reset all mocks before each test
		Object.values(mockProductService).forEach((fn) => fn.mockReset());
		app = await initApp();
	});

	// ========================================================================
	// SECTION 1: CREATE PRODUCT
	// ========================================================================
	describe('Create Product - POST /products', () => {
		it('TC-INT-PD-01: should create a new product with valid data', async () => {
			const inputData = { name: 'New Art', price: 200, imageUrl: 'http://example.com/new.png' };
			const mockCreatedProduct = {
				id: 'new-id',
				name: 'New Art',
				price: 200,
				imageUrl: 'http://example.com/new.png',
				description: null,
				slug: 'new-art-123456',
				stock: 10,
				categoryId: null,
				sourceUrl: null,
				createdAt: new Date(),
				deletedAt: null,
			};
			mockProductService.createProduct.mockResolvedValue(mockCreatedProduct);

			const response = await app.handle(
				new Request(buildUrl('/'), {
					method: 'POST',
					headers: AUTH_HEADERS,
					body: JSON.stringify(inputData),
				}),
			);
			const body = await response.json();

			expect(response.status).toBe(201);
			expect(body.id).toBe('new-id');
		});

		it('TC-INT-PD-02: should fail to create a product with invalid data (missing required field)', async () => {
			const invalidInput = { price: 200, imageUrl: 'url' }; // missing name

			const response = await app.handle(
				new Request(buildUrl('/'), {
					method: 'POST',
					headers: AUTH_HEADERS,
					body: JSON.stringify(invalidInput),
				}),
			);

			expect(response.status).toBe(422);
			expect(mockProductService.createProduct).not.toHaveBeenCalled();
		});

		it('TC-INT-PD-03: should fail to create a product with a sourceUrl that already exists', async () => {
			const inputData = {
				name: 'Duplicate Art',
				price: 200,
				imageUrl: 'http://example.com/dup.png',
				sourceUrl: 'duplicate-url',
			};
			mockProductService.createProduct.mockRejectedValue(
				new ConflictError('Product with this source URL already exists.'),
			);

			const response = await app.handle(
				new Request(buildUrl('/'), {
					method: 'POST',
					headers: AUTH_HEADERS,
					body: JSON.stringify(inputData),
				}),
			);

			expect(response.status).toBe(409);
		});

		it('TC-INT-PD-04: should fail to create product without auth headers', async () => {
			const inputData = { name: 'New Art', price: 200, imageUrl: 'http://example.com/new.png' };

			const response = await app.handle(
				new Request(buildUrl('/'), {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(inputData),
				}),
			);

			expect(response.status).toBe(401);
		});
	});

	// ========================================================================
	// SECTION 2: GET PRODUCTS LIST
	// ========================================================================
	describe('Get Products List - GET /products', () => {
		it('TC-INT-PD-05: should get a list of products with valid pagination parameters', async () => {
			const mockResponse = {
				data: [MOCK_PRODUCT],
				pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
			};
			mockProductService.getAll.mockResolvedValue(mockResponse);

			const response = await app.handle(new Request(buildUrl('/', '?page=1&limit=10')));
			const body = await response.json();

			expect(response.status).toBe(200);
			expect(body.data).toBeInstanceOf(Array);
			expect(body.pagination.total).toBe(1);
		});

		it('TC-INT-PD-06: should get products with search filter', async () => {
			const mockResponse = {
				data: [MOCK_PRODUCT],
				pagination: { total: 1, page: 1, limit: 12, totalPages: 1 },
			};
			mockProductService.getAll.mockResolvedValue(mockResponse);

			const response = await app.handle(new Request(buildUrl('/', '?search=vintage')));
			const body = await response.json();

			expect(response.status).toBe(200);
			expect(mockProductService.getAll).toHaveBeenCalledWith(
				expect.objectContaining({ search: 'vintage' }),
			);
		});

		it('TC-INT-PD-07: should get products with category and price filters', async () => {
			const mockResponse = {
				data: [MOCK_PRODUCT],
				pagination: { total: 1, page: 1, limit: 12, totalPages: 1 },
			};
			mockProductService.getAll.mockResolvedValue(mockResponse);

			const response = await app.handle(
				new Request(buildUrl('/', '?categoryId=cat-123&minPrice=100&maxPrice=500')),
			);
			const body = await response.json();

			expect(response.status).toBe(200);
			expect(mockProductService.getAll).toHaveBeenCalledWith(
				expect.objectContaining({
					categoryId: 'cat-123',
					minPrice: '100',
					maxPrice: '500',
				}),
			);
		});

		it('TC-INT-PD-08: should return empty list when no products match', async () => {
			const mockResponse = {
				data: [],
				pagination: { total: 0, page: 1, limit: 12, totalPages: 0 },
			};
			mockProductService.getAll.mockResolvedValue(mockResponse);

			const response = await app.handle(new Request(buildUrl('/', '?search=nonexistent')));
			const body = await response.json();

			expect(response.status).toBe(200);
			expect(body.data).toEqual([]);
			expect(body.pagination.total).toBe(0);
		});
	});

	// ========================================================================
	// SECTION 3: GET PRODUCT BY ID
	// ========================================================================
	describe('Get Product by ID - GET /products/:id', () => {
		it('TC-INT-PD-09: should get the details of an existing product', async () => {
			mockProductService.getById.mockResolvedValue(MOCK_PRODUCT);

			const response = await app.handle(new Request(buildUrl(`/${MOCK_PRODUCT.id}`)));
			const body = await response.json();

			expect(response.status).toBe(200);
			expect(body.id).toBe(MOCK_PRODUCT.id);
			expect(body.name).toBe(MOCK_PRODUCT.name);
		});

		it('TC-INT-PD-10: should fail to get a product with a non-existent ID', async () => {
			mockProductService.getById.mockRejectedValue(new NotFoundError('Product not found.'));

			const response = await app.handle(new Request(buildUrl('/non-existent-id')));

			expect(response.status).toBe(404);
		});

		it('TC-INT-PD-11: should fail to get a product that has been soft-deleted', async () => {
			mockProductService.getById.mockRejectedValue(new NotFoundError('Product not found.'));

			const response = await app.handle(new Request(buildUrl('/soft-deleted-id')));

			expect(response.status).toBe(404);
		});
	});

	// ========================================================================
	// SECTION 4: GET RELATED PRODUCTS
	// ========================================================================
	describe('Get Related Products - GET /products/:id/related', () => {
		it('TC-INT-PD-12: should get related products for an existing product', async () => {
			const relatedProducts = [
				{ ...MOCK_PRODUCT, id: 'related-1', name: 'Related Art 1' },
				{ ...MOCK_PRODUCT, id: 'related-2', name: 'Related Art 2' },
			];
			mockProductService.getRelated.mockResolvedValue(relatedProducts);

			const response = await app.handle(new Request(buildUrl(`/${MOCK_PRODUCT.id}/related`)));
			const body = await response.json();

			expect(response.status).toBe(200);
			expect(body).toHaveLength(2);
		});

		it('TC-INT-PD-13: should return 404 for non-existent product', async () => {
			mockProductService.getRelated.mockRejectedValue(new NotFoundError('Product not found.'));

			const response = await app.handle(new Request(buildUrl('/non-existent/related')));

			expect(response.status).toBe(404);
		});

		it('TC-INT-PD-14: should return empty array when no related products', async () => {
			mockProductService.getRelated.mockResolvedValue([]);

			const response = await app.handle(new Request(buildUrl(`/${MOCK_PRODUCT.id}/related`)));
			const body = await response.json();

			expect(response.status).toBe(200);
			expect(body).toEqual([]);
		});
	});

	// ========================================================================
	// SECTION 5: GET CATEGORIES
	// ========================================================================
	describe('Get Categories - GET /products/categories', () => {
		it('TC-INT-PD-15: should get all categories', async () => {
			const categories = [MOCK_CATEGORY, { ...MOCK_CATEGORY, id: 'cat-456', name: 'Sculptures' }];
			mockProductService.getAllCategories.mockResolvedValue(categories);

			const response = await app.handle(new Request(buildUrl('/categories')));
			const body = await response.json();

			expect(response.status).toBe(200);
			expect(body).toHaveLength(2);
		});

		it('TC-INT-PD-16: should return empty array when no categories', async () => {
			mockProductService.getAllCategories.mockResolvedValue([]);

			const response = await app.handle(new Request(buildUrl('/categories')));
			const body = await response.json();

			expect(response.status).toBe(200);
			expect(body).toEqual([]);
		});

		it('TC-INT-PD-17: should return 500 when service fails', async () => {
			mockProductService.getAllCategories.mockRejectedValue(new InternalServerError('DB Error'));

			const response = await app.handle(new Request(buildUrl('/categories')));

			expect(response.status).toBe(500);
		});
	});

	// ========================================================================
	// SECTION 6: GET TAGS
	// ========================================================================
	describe('Get Tags - GET /products/tags', () => {
		it('TC-INT-PD-18: should get all tags', async () => {
			const tags = [MOCK_TAG, { ...MOCK_TAG, id: 'tag-456', name: 'modern' }];
			mockProductService.getAllTags.mockResolvedValue(tags);

			const response = await app.handle(new Request(buildUrl('/tags')));
			const body = await response.json();

			expect(response.status).toBe(200);
			expect(body).toHaveLength(2);
		});

		it('TC-INT-PD-19: should return empty array when no tags', async () => {
			mockProductService.getAllTags.mockResolvedValue([]);

			const response = await app.handle(new Request(buildUrl('/tags')));
			const body = await response.json();

			expect(response.status).toBe(200);
			expect(body).toEqual([]);
		});
	});

	// ========================================================================
	// SECTION 7: UPDATE PRODUCT
	// ========================================================================
	describe('Update Product - PATCH /products/:id', () => {
		it('TC-INT-PD-20: should update an existing product with valid data', async () => {
			const updateData = { name: 'Updated Name' };
			mockProductService.update.mockResolvedValue({ message: 'Product updated successfully' });

			const response = await app.handle(
				new Request(buildUrl(`/${MOCK_PRODUCT.id}`), {
					method: 'PATCH',
					headers: AUTH_HEADERS,
					body: JSON.stringify(updateData),
				}),
			);
			const body = await response.json();

			expect(response.status).toBe(200);
			expect(body.message).toBeDefined();
		});

		it('TC-INT-PD-21: should fail to update a non-existent product', async () => {
			mockProductService.update.mockRejectedValue(new NotFoundError('Product not found.'));

			const response = await app.handle(
				new Request(buildUrl('/non-existent-id'), {
					method: 'PATCH',
					headers: AUTH_HEADERS,
					body: JSON.stringify({ name: 'Does not matter' }),
				}),
			);

			expect(response.status).toBe(404);
		});

		it('TC-INT-PD-22: should fail to update without auth headers', async () => {
			const response = await app.handle(
				new Request(buildUrl(`/${MOCK_PRODUCT.id}`), {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name: 'Updated' }),
				}),
			);

			expect(response.status).toBe(401);
		});
	});

	// ========================================================================
	// SECTION 8: DELETE PRODUCT
	// ========================================================================
	describe('Delete Product - DELETE /products/:id', () => {
		it('TC-INT-PD-23: should delete an existing product', async () => {
			mockProductService.delete.mockResolvedValue({ message: 'Soft deleted product' });

			const response = await app.handle(
				new Request(buildUrl(`/${MOCK_PRODUCT.id}`), {
					method: 'DELETE',
					headers: AUTH_HEADERS,
				}),
			);

			expect(response.status).toBe(204);
		});

		it('TC-INT-PD-24: should fail to delete a non-existent product', async () => {
			mockProductService.delete.mockRejectedValue(new NotFoundError('Product not found.'));

			const response = await app.handle(
				new Request(buildUrl('/non-existent-id'), {
					method: 'DELETE',
					headers: AUTH_HEADERS,
				}),
			);

			expect(response.status).toBe(404);
		});

		it('TC-INT-PD-25: should fail to delete without auth headers', async () => {
			const response = await app.handle(
				new Request(buildUrl(`/${MOCK_PRODUCT.id}`), {
					method: 'DELETE',
				}),
			);

			expect(response.status).toBe(401);
		});
	});

	// ========================================================================
	// SECTION 9: AI RECOMMENDATIONS
	// ========================================================================
	describe('AI Recommendations - POST /products/recommend', () => {
		it('TC-INT-PD-26: should get recommendations based on tags', async () => {
			const recommendedProducts = [MOCK_PRODUCT, { ...MOCK_PRODUCT, id: 'rec-2' }];
			mockProductService.getRecommendations.mockResolvedValue(recommendedProducts);

			const response = await app.handle(
				new Request(buildUrl('/recommend'), {
					method: 'POST',
					headers: AUTH_HEADERS,
					body: JSON.stringify({ tags: ['art', 'vintage'] }),
				}),
			);
			const body = await response.json();

			expect(response.status).toBe(200);
			expect(body).toHaveLength(2);
		});

		it('TC-INT-PD-27: should return empty array for empty tags', async () => {
			mockProductService.getRecommendations.mockResolvedValue([]);

			const response = await app.handle(
				new Request(buildUrl('/recommend'), {
					method: 'POST',
					headers: AUTH_HEADERS,
					body: JSON.stringify({ tags: [] }),
				}),
			);
			const body = await response.json();

			expect(response.status).toBe(200);
			expect(body).toEqual([]);
		});

		it('TC-INT-PD-28: should fail without auth headers', async () => {
			const response = await app.handle(
				new Request(buildUrl('/recommend'), {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ tags: ['art'] }),
				}),
			);

			expect(response.status).toBe(401);
		});
	});

	// ========================================================================
	// SECTION 10: BATCH STOCK ACTIONS
	// ========================================================================
	describe('Batch Stock Actions - PATCH /products', () => {
		it('TC-INT-PD-29: should reduce stock successfully', async () => {
			mockProductService.reduceStock.mockResolvedValue({ message: 'Stock reduced successfully' });

			const response = await app.handle(
				new Request(buildUrl('/'), {
					method: 'PATCH',
					headers: AUTH_HEADERS,
					body: JSON.stringify({
						action: 'reduce_stock',
						items: [{ productId: 'prod-1', quantity: 2 }],
					}),
				}),
			);
			const body = await response.json();

			expect(response.status).toBe(200);
			expect(body.message).toBe('Stock reduced successfully');
		});

		it('TC-INT-PD-30: should fail reduce stock with invalid items', async () => {
			mockProductService.reduceStock.mockRejectedValue(
				new BadRequestError('No items provided for stock reduction.'),
			);

			const response = await app.handle(
				new Request(buildUrl('/'), {
					method: 'PATCH',
					headers: AUTH_HEADERS,
					body: JSON.stringify({
						action: 'reduce_stock',
						items: [],
					}),
				}),
			);

			expect(response.status).toBe(400);
		});

		it('TC-INT-PD-31: should fail reduce stock when product not found', async () => {
			mockProductService.reduceStock.mockRejectedValue(
				new NotFoundError('Product ID non-existent not found.'),
			);

			const response = await app.handle(
				new Request(buildUrl('/'), {
					method: 'PATCH',
					headers: AUTH_HEADERS,
					body: JSON.stringify({
						action: 'reduce_stock',
						items: [{ productId: 'non-existent', quantity: 2 }],
					}),
				}),
			);

			expect(response.status).toBe(404);
		});

		it('TC-INT-PD-32: should fail reduce stock when insufficient stock', async () => {
			mockProductService.reduceStock.mockRejectedValue(
				new BadRequestError('Product has insufficient stock'),
			);

			const response = await app.handle(
				new Request(buildUrl('/'), {
					method: 'PATCH',
					headers: AUTH_HEADERS,
					body: JSON.stringify({
						action: 'reduce_stock',
						items: [{ productId: 'prod-1', quantity: 1000 }],
					}),
				}),
			);

			expect(response.status).toBe(400);
		});

		it('TC-INT-PD-33: should fail batch actions without auth headers', async () => {
			const response = await app.handle(
				new Request(buildUrl('/'), {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						action: 'reduce_stock',
						items: [{ productId: 'prod-1', quantity: 2 }],
					}),
				}),
			);

			expect(response.status).toBe(401);
		});
	});

	// ========================================================================
	// SECTION 11: ERROR HANDLING
	// ========================================================================
	describe('Error Handling', () => {
		it('TC-INT-PD-34: should return 500 for internal server errors', async () => {
			mockProductService.getAll.mockRejectedValue(
				new InternalServerError('Database connection failed'),
			);

			const response = await app.handle(new Request(buildUrl('/')));

			expect(response.status).toBe(500);
		});

		it('TC-INT-PD-35: should handle unexpected errors gracefully', async () => {
			mockProductService.getById.mockRejectedValue(new Error('Unexpected error'));

			const response = await app.handle(new Request(buildUrl('/some-id')));

			expect(response.status).toBe(500);
		});
	});
});
