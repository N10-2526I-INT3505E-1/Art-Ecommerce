import { and, desc, eq, like, sql, gte, lte, inArray, isNull, ne } from 'drizzle-orm';
import slugify from 'slugify';
import { db } from './db';
import { products, categories, tags, product_tags } from './products.schema';
// 👇 SỬA ĐƯỜNG DẪN IMPORT (Cùng thư mục)
import { HttpError } from './httpError'; 

export const ProductService = {
    
    // 1. TẠO SẢN PHẨM (Crawler Upsert)
    async createProduct(data: any) {
        // A. Xử lý Category
        let categoryId = null;
        if (data.categoryName) {
            const existingCat = await db.query.categories.findFirst({
                where: (c, { eq }) => eq(c.name, data.categoryName)
            });
            if (existingCat) categoryId = existingCat.id;
            else {
                const newCat = await db.insert(categories).values({ 
                    name: data.categoryName,
                    slug: slugify(data.categoryName, { lower: true, locale: 'vi' })
                }).returning();
                categoryId = newCat[0].id;
            }
        }

        // B. Upsert Product
        const uniqueSlug = slugify(data.name, { lower: true, locale: 'vi' }) + '-' + Date.now();
        
        try {
            const newProductResult = await db.insert(products)
                .values({
                    name: data.name,
                    price: data.price,
                    imageUrl: data.imageUrl,
                    description: data.description,
                    categoryId: categoryId,
                    sourceUrl: data.sourceUrl,
                    slug: uniqueSlug,
                    stock: data.stock ?? 10
                })
                .onConflictDoUpdate({
                    target: products.sourceUrl,
                    set: { price: data.price, imageUrl: data.imageUrl }
                })
                .returning();
            
            const newProduct = newProductResult[0];

            // C. Xử lý Tags
            if (data.tags && data.tags.length > 0) {
                for (const tagName of data.tags) {
                    let tagId;
                    const existingTag = await db.query.tags.findFirst({
                        where: (t, { eq }) => eq(t.name, tagName)
                    });

                    if (existingTag) tagId = existingTag.id;
                    else {
                        const newTag = await db.insert(tags)
                            .values({ name: tagName, type: 'auto' })
                            .returning();
                        tagId = newTag[0].id;
                    }

                    try {
                        await db.insert(product_tags)
                            .values({ productId: newProduct.id, tagId: tagId });
                    } catch (error: any) {
                        if (error.message && error.message.includes('UNIQUE constraint failed')) {
                            continue; 
                        }
                        throw new HttpError(500, `Lỗi khi gắn tag: ${error.message}`);
                    }
                }
            }
            return newProduct;

        } catch (error: any) {
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, `Database Error: ${error.message}`);
        }
    },

    // 2. GET RECOMMENDATIONS
    async getRecommendations(inputTags: string[]) {
        if (!inputTags || inputTags.length === 0) return [];

        const tagRecords = await db.query.tags.findMany({
            where: (t, { inArray }) => inArray(t.name, inputTags)
        });
        const tagIds = tagRecords.map(t => t.id);
        if (tagIds.length === 0) return [];

        const matchedProducts = await db.query.product_tags.findMany({
            where: (pt, { inArray }) => inArray(pt.tagId, tagIds),
            with: { product: true },
            limit: 20 
        });

        const uniqueProductsMap = new Map();
        matchedProducts.forEach(mp => {
            if (mp.product && mp.product.deletedAt === null) {
                uniqueProductsMap.set(mp.product.id, mp.product);
            }
        });
        return Array.from(uniqueProductsMap.values());
    },

    // 3. GET LIST
    async getAll(query: any) {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 12;
        const offset = (page - 1) * limit;

        const conditions = [isNull(products.deletedAt)];
        if (query.search) conditions.push(like(products.name, `%${query.search}%`));
        if (query.categoryId) conditions.push(eq(products.categoryId, query.categoryId));
        if (query.minPrice) conditions.push(gte(products.price, Number(query.minPrice)));
        if (query.maxPrice) conditions.push(lte(products.price, Number(query.maxPrice)));

        const data = await db.query.products.findMany({
            where: and(...conditions),
            limit: limit,
            offset: offset,
            orderBy: [desc(products.createdAt)],
            with: { category: true }
        });

        const allItems = await db.select({ count: sql<number>`count(*)` })
            .from(products).where(and(...conditions));

        return {
            data,
            pagination: {
                page, limit, 
                total: allItems[0]?.count ?? 0,
                totalPages: Math.ceil((allItems[0]?.count ?? 0) / limit)
            }
        };
    },

    // 4. GET DETAIL
    async getById(id: string) {
        const product = await db.query.products.findFirst({
            where: eq(products.id, id),
            with: { category: true, productTags: { with: { tag: true } } }
        });

        if (!product) {
            throw new HttpError(404, 'Sản phẩm không tồn tại', 'PRODUCT_NOT_FOUND');
        }

        const flatTags = product.productTags.map(pt => pt.tag);
        return { ...product, tags: flatTags, productTags: undefined };
    },

    // 5. RELATED
    async getRelated(id: string) {
        const currentProduct = await db.query.products.findFirst({ where: eq(products.id, id) });
        if (!currentProduct || !currentProduct.categoryId) return [];

        return await db.query.products.findMany({
            where: and(
                eq(products.categoryId, currentProduct.categoryId),
                ne(products.id, id),        
                isNull(products.deletedAt)  
            ),
            limit: 4,
            orderBy: [desc(products.createdAt)]
        });
    },

    // 6. UPDATE
    async update(id: string, body: any) {
        let categoryId;
        if (body.categoryName) {
             const existingCat = await db.query.categories.findFirst({ where: (c, { eq }) => eq(c.name, body.categoryName) });
             if(existingCat) categoryId = existingCat.id;
             else {
                 const newCat = await db.insert(categories).values({ name: body.categoryName, slug: slugify(body.categoryName, {lower:true, locale:'vi'}) }).returning();
                 categoryId = newCat[0].id;
             }
        }

        const updateData: any = { ...body };
        if (categoryId) updateData.categoryId = categoryId;
        delete updateData.categoryName;
        delete updateData.tags;

        const result = await db.update(products).set(updateData).where(eq(products.id, id)).returning();
        
        if (result.length === 0) {
            throw new HttpError(404, 'Không tìm thấy sản phẩm để cập nhật');
        }

        if (body.tags) {
            await db.delete(product_tags).where(eq(product_tags.productId, id));
            for (const tagName of body.tags) {
                let tagId;
                const existingTag = await db.query.tags.findFirst({ where: (t, { eq }) => eq(t.name, tagName) });
                if(existingTag) tagId = existingTag.id;
                else {
                    const newTag = await db.insert(tags).values({ name: tagName, type: 'auto' }).returning();
                    tagId = newTag[0].id;
                }
                try {
                    await db.insert(product_tags).values({ productId: id, tagId: tagId });
                } catch(e) {} 
            }
        }
        return { success: true, message: `Updated product ${id}` };
    },

    // 7. DELETE
    async delete(id: string) {
        const result = await db.update(products)
            .set({ deletedAt: new Date() })
            .where(eq(products.id, id))
            .returning();

        if (result.length === 0) {
            throw new HttpError(404, 'Không tìm thấy sản phẩm để xóa');
        }
        return { success: true, message: `Deleted product ${id}` };
    },

    // Helpers
    async getAllCategories() { return await db.select().from(categories); },
    async getAllTags() { return await db.select().from(tags); }
};