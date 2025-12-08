import { insertProductBody, selectProductSchema, updateProductBody } from '@product/product.model';
import { Elysia, t } from 'elysia';
import { db } from './db';
import { ProductService } from './product.service';
import { rabbitPlugin, QUEUES } from './rabbitmq';
const productService = new ProductService(db);

export const productsPlugin = (dependencies: { productService: ProductService }) =>
	new Elysia()
	.decorate('productService', dependencies.productService)
	.use(rabbitPlugin())
	.onStart(async (app) => {
		const rabbitChannel = app.decorator.rabbitChannel;
		console.log("Product Service listening...");
		rabbitChannel.consume(QUEUES.PRODUCT_UPDATES, async (msg) => {
		  if (!msg) return;
	
		  try {
			const data = JSON.parse(msg.content.toString());
			
			// Update the Order Status in Database
			if (data.type === 'PRODUCT_STOCK_UPDATE') {
				console.log(`Received PRODUCT_STOCK_UPDATE, updating product stocks accordingly`);
			  	const orderItems = data.orderItems;
				//console.log(orderItems);
			 	// Mock to update product stock based on order items
				// ====================================
				// Acknowledge the message (tell RabbitMQ we are done)
				rabbitChannel.ack(msg);
			}
			
		  } catch (err) {
			console.error("Error processing RabbitMQ message:", err);
			// Ack to prevent infinite loops if data is bad
			rabbitChannel.ack(msg); 
		  }
		});
	  })

	// 1. Crawler Upsert
	.post(
		'/',
		async ({ body, set, productService }) => {
			const product = await productService.createProduct(body);
			set.status = 201;
			return product;
		},
		{
			body: insertProductBody,
			detail: { tags: ['Products'], summary: 'Upsert Product (Crawler)' },
		},
	)

		// 2. AI Recommend
		.post(
			'/recommend',
			async ({ body, productService }) => {
				return await productService.getRecommendations(body.tags || []);
			},
			{
				body: t.Object({ tags: t.Array(t.String()) }),
				response: t.Array(selectProductSchema),
				detail: { tags: ['Products'], summary: 'Get AI Recommendations' },
			},
		)

		// 3. List Products
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
				detail: { tags: ['Products'], summary: 'List Products' },
			},
		)

		// 4. Categories
		.get(
			'/categories',
			async ({ productService }) => {
				return await productService.getAllCategories();
			},
			{
				detail: { tags: ['Products'], summary: 'Get Categories' },
			},
		)

		// 5. Tags
		.get(
			'/tags',
			async ({ productService }) => {
				return await productService.getAllTags();
			},
			{
				detail: { tags: ['Products'], summary: 'Get Tags' },
			},
		)

		// 6. Detail
		.get(
			'/:id',
			async ({ params, productService }) => {
				return await productService.getById(params.id);
			},
			{
				params: t.Object({ id: t.String() }),
				detail: { tags: ['Products'], summary: 'Get Detail' },
			},
		)

		// 7. Related
		.get(
			'/:id/related',
			async ({ params, productService }) => {
				return await productService.getRelated(params.id);
			},
			{
				params: t.Object({ id: t.String() }),
				response: t.Array(selectProductSchema),
				detail: { tags: ['Products'], summary: 'Get Related' },
			},
		)

		// 8. Update
		.patch(
			'/:id',
			async ({ params, body, productService }) => {
				return await productService.update(params.id, body);
			},
			{
				params: t.Object({ id: t.String() }),
				body: updateProductBody,
				detail: { tags: ['Products'], summary: 'Update Product' },
			},
		)

		// 9. Soft Delete
		.delete(
			'/:id',
			async ({ params, productService }) => {
				return await productService.delete(params.id);
			},
			{
				params: t.Object({ id: t.String() }),
				detail: { tags: ['Products'], summary: 'Delete Product' },
			},
		);
