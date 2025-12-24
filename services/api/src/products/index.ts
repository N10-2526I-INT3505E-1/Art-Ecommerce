import {
	insertProductBody,
	selectProductSchema,
	updateProductBody,
	reduceStockBody,
} from '@product/product.model';
import { Elysia, t } from 'elysia';
import { db } from './db';
import { ProductService } from './product.service';
import { UnauthorizedError, ForbiddenError } from '@common/errors/httpErrors';
import { rabbitPlugin, QUEUES } from './rabbitmq';

const ErrorSchema = t.Object({ message: t.String() });

// ====================================================================================================
// AUTH HELPERS
// ====================================================================================================
export const authDerive = ({ headers }: any) => {
	const rawUserId = headers['x-user-id'];
	const rawUserRole = headers['x-user-role'];

	const userId = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId;
	const userRole = Array.isArray(rawUserRole) ? rawUserRole[0] : rawUserRole;

	if (!userId) {
		throw new UnauthorizedError('Missing Gateway Headers (x-user-id)');
	}

	return {
		user: {
			id: String(userId),
			role: (userRole as string) ?? 'user',
		},
	};
};

export const ensureRole = (user: any, role: string) => {
	if (!user || user.role !== role) {
		throw new ForbiddenError(`Requires role: ${role}`);
	}
};

// ====================================================================================================
// PRODUCTS PLUGIN
// ====================================================================================================
export const productsPlugin = async (dependencies: { productService: ProductService }) =>
	new Elysia()
		.decorate('productService', dependencies.productService)
		.use(await rabbitPlugin())

		// ====================================================================================================
		// RABBITMQ MESSAGE CONSUMER
		// ====================================================================================================
		.onStart(async (app) => {
			const rabbitChannel = app.decorator.rabbitChannel;
			const productService = app.decorator.productService;

			console.log('Product Service listening for RabbitMQ messages...');

			rabbitChannel.consume(QUEUES.PRODUCT_UPDATES, async (msg) => {
				if (!msg) return;

				try {
					const data = JSON.parse(msg.content.toString());

					switch (data.type) {
						case 'PRODUCT_STOCK_UPDATE':
							console.log('Processing PRODUCT_STOCK_UPDATE');
							await productService.reduceStock(data.orderItems);
							break;

						case 'PRODUCT_STOCK_RESTORE':
							console.log('Processing PRODUCT_STOCK_RESTORE');
							await productService.restoreStock(data.orderItems);
							break;

						default:
							console.warn(`Unknown message type: ${data.type}`);
					}

					rabbitChannel.ack(msg);
				} catch (err) {
					console.error('Error processing RabbitMQ message:', err);
					// Optionally: nack and requeue for retriable errors
					// rabbitChannel.nack(msg, false, true);
					rabbitChannel.ack(msg);
				}
			});
		})

		.group('/v1/products', (app) =>
			app
				// ====================================================================================================
				// GROUP 1: PUBLIC ROUTES
				// ====================================================================================================

				// List Products
				.get(
					'/',
					async ({ query, productService }) => {
						return await productService.getAll(query);
					},
					{
						query: t.Object({
							page: t.Optional(t.String()),
							limit: t.Optional(t.String()),
							search: t.Optional(t.String()),
							categoryId: t.Optional(t.String()),
							minPrice: t.Optional(t.String()),
							maxPrice: t.Optional(t.String()),
						}),
						response: {
							200: t.Object({
								data: t.Array(
									t.Composite([selectProductSchema, t.Object({ tags: t.Array(t.String()) })]),
								),
								pagination: t.Object({
									page: t.Number(),
									limit: t.Number(),
									total: t.Number(),
									totalPages: t.Number(),
								}),
							}),
							500: ErrorSchema,
						},
						detail: { tags: ['Products'], summary: 'List Products' },
					},
				)

				// Get Categories
				.get(
					'/categories',
					async ({ productService }) => {
						return await productService.getAllCategories();
					},
					{
						response: {
							200: t.Array(
								t.Object({
									id: t.String(),
									name: t.String(),
									slug: t.Union([t.String(), t.Null()]),
									description: t.Union([t.String(), t.Null()]),
								}),
							),
							500: ErrorSchema,
						},
						detail: { tags: ['Products'], summary: 'Get Categories' },
					},
				)

				// Get Tags
				.get(
					'/tags',
					async ({ productService }) => {
						return await productService.getAllTags();
					},
					{
						response: {
							200: t.Array(
								t.Object({
									id: t.String(),
									name: t.String(),
									type: t.Union([t.String(), t.Null()]),
								}),
							),
							500: ErrorSchema,
						},
						detail: { tags: ['Products'], summary: 'Get Tags' },
					},
				)

				// Get Product Detail
				.get(
					'/:id',
					async ({ params, productService }) => {
						return await productService.getById(params.id);
					},
					{
						params: t.Object({ id: t.String() }),
						response: {
							200: t.Composite([selectProductSchema, t.Object({ tags: t.Array(t.String()) })]),
							404: ErrorSchema,
							500: ErrorSchema,
						},
						detail: { tags: ['Products'], summary: 'Get Detail' },
					},
				)

				// Get Related Products
				.get(
					'/:id/related',
					async ({ params, productService }) => {
						return await productService.getRelated(params.id);
					},
					{
						params: t.Object({ id: t.String() }),
						response: {
							200: t.Array(selectProductSchema),
							404: ErrorSchema,
							500: ErrorSchema,
						},
						detail: { tags: ['Products'], summary: 'Get Related' },
					},
				)

				// ====================================================================================================
				// GROUP 2: PROTECTED ROUTES (Requires Authentication)
				// ====================================================================================================
				.guard({}, (protectedApp) =>
					protectedApp
						.derive(authDerive)

						// Create/Upsert Product (Crawler)
						.post(
							'/',
							async ({ body, set, user, productService }) => {
								// ensureRole(user, 'admin');
								const product = await productService.createProduct(body);
								set.status = 201;
								return product;
							},
							{
								body: insertProductBody,
								response: {
									201: selectProductSchema,
									500: ErrorSchema,
								},
								detail: { tags: ['Products'], summary: 'Upsert Product (Crawler)' },
							},
						)

						// AI Recommendations
						.post(
							'/recommend',
							async ({ body, user, productService }) => {
								return await productService.getRecommendations(body.tags || []);
							},
							{
								body: t.Object({ tags: t.Array(t.String()) }),
								response: {
									200: t.Array(selectProductSchema),
									500: ErrorSchema,
								},
								detail: { tags: ['Products'], summary: 'Get AI Recommendations' },
							},
						)

						// Batch Actions (e.g., Reduce Stock)
						.patch(
							'/',
							async ({ body, user, productService }) => {
								if (body.action === 'reduce_stock') {
									return await productService.reduceStock(body.items);
								}
								return { message: 'Unknown action' };
							},
							{
								body: reduceStockBody,
								response: {
									200: t.Object({ message: t.String() }),
									400: ErrorSchema,
									404: ErrorSchema,
									500: ErrorSchema,
								},
								detail: { tags: ['Products'], summary: 'Batch Actions' },
							},
						)

						// Update Product
						.patch(
							'/:id',
							async ({ params, body, user, productService }) => {
								return await productService.update(params.id, body);
							},
							{
								params: t.Object({ id: t.String() }),
								body: updateProductBody,
								response: {
									200: t.Object({ message: t.String() }),
									404: ErrorSchema,
									500: ErrorSchema,
								},
								detail: { tags: ['Products'], summary: 'Update Product' },
							},
						)

						// Soft Delete Product
						.delete(
							'/:id',
							async ({ params, set, user, productService }) => {
								await productService.delete(params.id);
								set.status = 204;
								return;
							},
							{
								params: t.Object({ id: t.String() }),
								response: {
									204: t.Void(),
									404: ErrorSchema,
									500: ErrorSchema,
								},
								detail: { tags: ['Products'], summary: 'Delete Product' },
							},
						),
				),
		);
