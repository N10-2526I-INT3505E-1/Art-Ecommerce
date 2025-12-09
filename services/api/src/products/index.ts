import { insertProductBody, 
		selectProductSchema, 
		updateProductBody,
		reduceStockBody 
	} from '@product/product.model';
import { Elysia, t } from 'elysia';
import { db } from './db';
import { ProductService } from './product.service';

const ErrorSchema = t.Object({
	message: t.String(),
});

const productService = new ProductService(db);

export const productsPlugin = new Elysia({ prefix: '/products' })

	// 1. Crawler Upsert
	.post(
		'/',
		async ({ body, set }) => {
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

	// 2. AI Recommend
	.post(
		'/recommend',
		async ({ body }) => {
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

	// 3. List Products
	.get(
		'/',
		async ({ query }) => {
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
                    data: t.Array(selectProductSchema),
                    pagination: t.Object({
                        page: t.Number(),
                        limit: t.Number(),
                        total: t.Number(),
                        totalPages: t.Number()
                    }),
                }),
				500: ErrorSchema,
			},
			detail: { tags: ['Products'], summary: 'List Products' },
		},
	)

	// 4. Categories
	.get(
		'/categories',
		async () => {
			return await productService.getAllCategories();
		},
		{
			response: {
                200: t.Array(
                    t.Object({
                        id: t.String(),
                        name: t.String(),
                        slug: t.Union([t.String(), t.Null()]),
                        description: t.Union([t.String(), t.Null()])
                    })
                ),
                500: ErrorSchema
            },
			detail: { tags: ['Products'], summary: 'Get Categories' },
		},
	)

	// 5. Tags
	.get(
		'/tags',
		async () => {
			return await productService.getAllTags();
		},
		{
			response: {
                200: t.Array(
                    t.Object({
                        id: t.String(),
                        name: t.String(),
                        type: t.Union([t.String(), t.Null()])
                    })
                ),
                500: ErrorSchema
            },
			detail: { tags: ['Products'], summary: 'Get Tags' },
		},
	)

	// 7. Related
	.get(
		'/:id/related',
		async ({ params }) => {
			return await productService.getRelated(params.id);
		},
		{
			params: t.Object({ id: t.String() }),
			response: {
                200: t.Array(selectProductSchema),
                404: ErrorSchema, // Trường hợp ID gốc không tìm thấy
                500: ErrorSchema
            },
			detail: { tags: ['Products'], summary: 'Get Related' },
		},
	)

	// 6. Detail
	.get(
		'/:id',
		async ({ params }) => {
			return await productService.getById(params.id);
		},
		{
			params: t.Object({ id: t.String() }),
			response: {
                200: t.Composite([
                    selectProductSchema,
                    t.Object({ tags: t.Array(t.String()) }) // Trả về kèm mảng tags phẳng
                ]),
                404: ErrorSchema,
                500: ErrorSchema
            },
			detail: { tags: ['Products'], summary: 'Get Detail' }
		},
	)

	// 8. Update
	.patch('/', async({body}) => {
		if (body.action == 'reduce_stock') {
			return await productService.reduceStock(body.items);
		}
		return null; 
	}, {
		body: reduceStockBody,
		response: {
                200: t.Object({ message: t.String() }),
                400: ErrorSchema,
                404: ErrorSchema, // Lỗi không tìm thấy sản phẩm khi trừ kho
                500: ErrorSchema
            },
		detail: {tags: ["Products"], summary: 'Batch Actions'}
	})

	.patch(
		'/:id',
		async ({ params, body }) => {
			return await productService.update(params.id, body);
		},
		{
			params: t.Object({ id: t.String() }),
			body: updateProductBody,
			response: {
                200: t.Object({ message: t.String() }),
                404: ErrorSchema,
                500: ErrorSchema
            },
			detail: { tags: ['Products'], summary: 'Update Product' },
		},
	)

	// 9. Soft Delete
	.delete(
		'/:id',
		async ({ params, set }) => {
			await productService.delete(params.id);
			set.status = 204;
			return;
		},
		{
			params: t.Object({ id: t.String() }),
			response: {
                204: t.Void(), // Khai báo rõ ràng 204 trả về Null/Void
                404: ErrorSchema,
                500: ErrorSchema
            },
			detail: { tags: ['Products'], summary: 'Delete Product' },
		},
	);
