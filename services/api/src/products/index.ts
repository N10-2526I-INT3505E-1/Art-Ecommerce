// File: /services/api/src/products/index.ts

import { Elysia, t } from 'elysia';
import { ProductService } from './products.service';
import { insertProductBody, updateProductBody, selectProductSchema } from './products.schema';

export const productsAPI = new Elysia({ prefix: '/products' })

    // 1. Crawler Upsert
    .post('/', async ({ body, set }) => {
        const product = await ProductService.createProduct(body);
        set.status = 201;
        return product;
    }, {
        body: insertProductBody,
        detail: { tags: ["Products"], summary: 'Upsert Product (Crawler)' }
    })

    // 2. AI Recommend
    .post('/recommend', async ({ body }) => {
        return await ProductService.getRecommendations(body.tags || []);
    }, {
        body: t.Object({ tags: t.Array(t.String()) }),
        response: t.Array(selectProductSchema),
        detail: { tags: ["Products"], summary: 'Get AI Recommendations' }
    })

    // 3. List Products
    .get('/', async ({ query }) => {
        return await ProductService.getAll(query);
    }, {
        query: t.Object({
            page: t.Optional(t.String()),
            limit: t.Optional(t.String()),
            search: t.Optional(t.String()),
            categoryId: t.Optional(t.String()),
            minPrice: t.Optional(t.String()),
            maxPrice: t.Optional(t.String())
        }),
        detail: { tags: ["Products"], summary: 'List Products' }
    })

    // 4. Categories
    .get('/categories', async () => {
        return await ProductService.getAllCategories();
    }, {
        detail: { tags: ["Products"], summary: 'Get Categories' }
    })

    // 5. Tags
    .get('/tags', async () => {
        return await ProductService.getAllTags();
    }, {
        detail: { tags: ["Products"], summary: 'Get Tags' }
    })

    // 6. Detail
    .get('/:id', async ({ params }) => {
        return await ProductService.getById(params.id);
    }, {
        params: t.Object({ id: t.String() }),
        detail: { tags: ["Products"], summary: 'Get Detail' }
    })

    // 7. Related
    .get('/:id/related', async ({ params }) => {
        return await ProductService.getRelated(params.id);
    }, {
        params: t.Object({ id: t.String() }),
        response: t.Array(selectProductSchema),
        detail: { tags: ["Products"], summary: 'Get Related' }
    })

    // 8. Update
    .patch('/:id', async ({ params, body }) => {
        return await ProductService.update(params.id, body);
    }, {
        params: t.Object({ id: t.String() }),
        body: updateProductBody,
        detail: { tags: ["Products"], summary: 'Update Product' }
    })

    // 9. Soft Delete
    .delete('/:id', async ({ params }) => {
        return await ProductService.delete(params.id);
    }, {
        params: t.Object({ id: t.String() }),
        detail: { tags: ["Products"], summary: 'Delete Product' }
    });