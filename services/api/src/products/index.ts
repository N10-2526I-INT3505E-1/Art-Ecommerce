// File: /services/api/src/products/index.ts

import { and, desc, eq, like, sql, gte, lte, inArray, ne, isNull } from 'drizzle-orm';
import { Elysia, t } from 'elysia';
import slugify from 'slugify'; // Nhớ cài: bun add slugify
import { db } from './db';
import { 
    products, categories, tags, product_tags, 
    insertProductBody, updateProductBody, selectProductSchema 
} from './products.schema';

export const productsAPI = new Elysia({ prefix: '/products' })

    /**
     * POST /products (Crawler Upsert)
     * Không try-catch -> Lỗi tự bay ra Global Handler
     */
    .post('/', async ({ body, set }) => {
        console.log(`📥 Nhận: ${body.name}`);

        // 1. Xử lý Category
        let categoryId = null;
        if (body.categoryName) {
            const existingCat = await db.query.categories.findFirst({
                where: (c, { eq }) => eq(c.name, body.categoryName!)
            });

            if (existingCat) {
                categoryId = existingCat.id;
            } else {
                // UUIDv7 tự sinh, không cần quan tâm ID
                const newCat = await db.insert(categories)
                    .values({ 
                        name: body.categoryName!,
                        slug: slugify(body.categoryName!, { lower: true, locale: 'vi' })
                    })
                    .returning();
                categoryId = newCat[0].id;
            }
        }

        // 2. Tạo Slug & Upsert Sản phẩm
        const uniqueSlug = slugify(body.name, { lower: true, locale: 'vi' }) + '-' + Date.now();

        const newProductResult = await db.insert(products)
            .values({
                name: body.name,
                price: body.price,
                imageUrl: body.imageUrl,
                description: body.description,
                categoryId: categoryId,
                sourceUrl: body.sourceUrl,
                slug: uniqueSlug,
                stock: body.stock ?? 10
            })
            .onConflictDoUpdate({
                target: products.sourceUrl,
                set: { 
                    price: body.price,      
                    imageUrl: body.imageUrl,
                }
            })
            .returning();
        
        const newProduct = newProductResult[0];

        // 3. Xử lý Tags
        if (body.tags && body.tags.length > 0) {
            for (const tagName of body.tags) {
                let tagId;
                const existingTag = await db.query.tags.findFirst({
                    where: (t, { eq }) => eq(t.name, tagName)
                });

                if (existingTag) {
                    tagId = existingTag.id;
                } else {
                    const newTag = await db.insert(tags)
                        .values({ name: tagName, type: 'auto' })
                        .returning();
                    tagId = newTag[0].id;
                }

                await db.insert(product_tags)
                    .values({ productId: newProduct.id, tagId: tagId })
                    .onConflictDoNothing();
            }
        }

        set.status = 201;
        return newProduct;
    }, {
        body: insertProductBody,
        detail: { tags: ["Products"], summary: 'Upsert Product (Crawler)' }
    })

    /** 
     * 1. API Recommend (Cho AI)
     * Gửi Tags -> Nhận danh sách sản phẩm phù hợp (Trừ sản phẩm đã xóa)
     */
    .post('/recommend', async ({body}) => {
        const inputTags = body.tags;
        if (!inputTags || inputTags.length == 0) return [];

        const tagRecords = await db.query.tags.findMany({
            where: (t, {inArray}) => inArray(t.name, inputTags)
        });

        const tagIds = tagRecords.map(t => t.id);
        if (tagIds.length == 0) return [];
        const matchedProducts = await db.query.product_tags.findMany({
            where: (pt, {inArray}) => inArray(pt.tagId, tagIds),
            with: {
                product: true
            },
            limit: 20
        });

        const uniqueProductsMap = new Map();
        matchedProducts.forEach(mp=> {
            if(mp.product && mp.product.deletedAt == null) {
                uniqueProductsMap.set(mp.product.id,mp.product)
            }
        });
        return Array.from(uniqueProductsMap.values());

    }, {
        body: t.Object({
            tags: t.Array(t.String())
        }),
        detail: {
            tags: ["Products"],
            summary: 'Get AI Recommentations'
        }
    })

    /**
     * 2. Related Products
     */
    .get('/:id/related', async({params}) => {
        const currentProduct = await db.query.products.findFirst({
            where: eq(products.id, params.id)
        });

        if (!currentProduct || !currentProduct.categoryId) return [];

        const related = await db.query.products.findMany({
            where: and(
                eq(products.categoryId, currentProduct.categoryId),
                ne(products.id, params.id),
                isNull(products.deletedAt)
            ),
            limit: 4,
            orderBy: [desc(products.createdAt)]
        });
        return related;
    }, {
        params: t.Object({id: t.String()}),
        detail: {tags: ["Products"], summary: 'Get Related Products'}
    })

    /**
     * GET /products (List + Filter)
     */
    .get('/', async ({ query }) => {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 12;
        const offset = (page - 1) * limit;

        const conditions = [];
        conditions.push(isNull(products.deletedAt));
        if (query.search) conditions.push(like(products.name, `%${query.search}%`));
        // ID là string, không cần Number()
        if (query.categoryId) conditions.push(eq(products.categoryId, query.categoryId)); 
        if (query.minPrice) conditions.push(gte(products.price, Number(query.minPrice)));
        if (query.maxPrice) conditions.push(lte(products.price, Number(query.maxPrice)));

        const data = await db.query.products.findMany({
            where: conditions.length > 0 ? and(...conditions) : undefined,
            limit: limit,
            offset: offset,
            orderBy: [desc(products.createdAt)],
            with: { category: true }
        });

        const allItems = await db
            .select({ count: sql<number>`count(*)` })
            .from(products)
            .where(conditions.length > 0 ? and(...conditions) : undefined);

        return {
            data,
            pagination: {
                page, limit, total: allItems[0]?.count ?? 0,
                totalPages: Math.ceil((allItems[0]?.count ?? 0) / limit)
            }
        };
    }, {
        query: t.Object({
            page: t.Optional(t.String()),
            limit: t.Optional(t.String()),
            search: t.Optional(t.String()),
            categoryId: t.Optional(t.String()), // String ID
            minPrice: t.Optional(t.String()),
            maxPrice: t.Optional(t.String())
        }),
        detail: { tags: ["Products"], summary: 'List Products' }
    })

    /**
     * GET /products/:id (Detail)
     */
    .get('/:id', async ({ params }) => {
        // ID là String, không ép kiểu Number
        const product = await db.query.products.findFirst({
            where: eq(products.id, params.id), 
            with: {
                category: true,
                productTags: { with: { tag: true } }
            }
        });

        if (!product) {
            // Ném lỗi object để Global Handler bắt
            throw { code: 'NOT_FOUND', message: 'Product not found' };
        }

        const flatTags = product.productTags.map(pt => pt.tag);
        return { ...product, tags: flatTags, productTags: undefined };
    }, {
        params: t.Object({ id: t.String() }),
        detail: { tags: ["Products"], summary: 'Get Product Detail' }
    })

    /**
     * PATCH /products/:id
     */
    .patch('/:id', async ({ params, body }) => {
        // 1. Update Category
        let categoryId;
        if (body.categoryName) {
            const existingCat = await db.query.categories.findFirst({
                where: (c, { eq }) => eq(c.name, body.categoryName!)
            });
            if (existingCat) {
                categoryId = existingCat.id;
            } else {
                const newCat = await db.insert(categories)
                    .values({ 
                        name: body.categoryName!,
                        slug: slugify(body.categoryName!, { lower: true, locale: 'vi' })
                    })
                    .returning();
                categoryId = newCat[0].id;
            }
        }

        // 2. Update Product
        const updateData: any = { ...body };
        if (categoryId) updateData.categoryId = categoryId;
        delete updateData.categoryName;
        delete updateData.tags;

        await db.update(products)
            .set(updateData)
            .where(eq(products.id, params.id));

        // 3. Update Tags
        if (body.tags) {
            await db.delete(product_tags).where(eq(product_tags.productId, params.id));
            for (const tagName of body.tags) {
                let tagId;
                const existingTag = await db.query.tags.findFirst({
                    where: (t, { eq }) => eq(t.name, tagName)
                });
                if (existingTag) {
                    tagId = existingTag.id;
                } else {
                    const newTag = await db.insert(tags).values({ name: tagName, type: 'auto' }).returning();
                    tagId = newTag[0].id;
                }
                await db.insert(product_tags)
                    .values({ productId: params.id, tagId: tagId })
                    .onConflictDoNothing();
            }
        }

        return { success: true, message: `Updated product ${params.id}` };
    }, {
        params: t.Object({ id: t.String() }),
        body: updateProductBody,
        detail: { tags: ["Products"], summary: 'Update Product' }
    })

    /**
     * DELETE /products/:id
     */
    .delete('/:id', async ({ params }) => {
        await db.update(products)
            .set({deletedAt: new Date()})
            .where(eq(products.id, params.id));
        return { success: true, message: `Deleted product ${params.id}` };
    }, {
        params: t.Object({ id: t.String() }),
        detail: { tags: ["Products"], summary: 'Delete Product' }
    })

    