// File: /services/api/src/products/product.service.ts

import { and, desc, eq, like, sql, gte, lte, inArray, isNull, ne } from 'drizzle-orm';
import slugify from 'slugify';
import { db } from './db';
import { products, categories, tags, product_tags } from './products.schema';

export const ProductService = {
    
    /**
     * 1. TẠO SẢN PHẨM (UPSERT)
     * Dùng cho Crawler: Tự động tạo Category, Tags, và update giá nếu trùng link
     */
    async createProduct(data: any) {
        // A. Xử lý Category (Tìm hoặc Tạo mới)
        let categoryId = null;
        if (data.categoryName) {
            const existingCat = await db.query.categories.findFirst({
                where: (c, { eq }) => eq(c.name, data.categoryName)
            });

            if (existingCat) {
                categoryId = existingCat.id;
            } else {
                const newCat = await db.insert(categories)
                    .values({ 
                        name: data.categoryName,
                        // Tạo slug tiếng Việt không dấu: "Tranh Vùng Cao" -> "tranh-vung-cao"
                        slug: slugify(data.categoryName, { lower: true, locale: 'vi' })
                    })
                    .returning();
                categoryId = newCat[0].id;
            }
        }

        // B. Tạo Slug & Upsert Sản phẩm
        // Thêm timestamp để đảm bảo slug luôn duy nhất
        const uniqueSlug = slugify(data.name, { lower: true, locale: 'vi' }) + '-' + Date.now();

        const newProductResult = await db.insert(products)
            .values({
                name: data.name,
                price: data.price,
                imageUrl: data.imageUrl,
                description: data.description,
                categoryId: categoryId,
                sourceUrl: data.sourceUrl, // Link gốc để check trùng
                slug: uniqueSlug,
                stock: data.stock ?? 10    // Mặc định tồn kho là 10
            })
            // Chống trùng lặp: Nếu trùng sourceUrl -> Cập nhật giá & ảnh mới nhất
            .onConflictDoUpdate({
                target: products.sourceUrl,
                set: { 
                    price: data.price,      
                    imageUrl: data.imageUrl,
                }
            })
            .returning();
        
        const newProduct = newProductResult[0];

        // C. Xử lý Tags (Tìm hoặc Tạo mới -> Gắn vào sản phẩm)
        if (data.tags && data.tags.length > 0) {
            for (const tagName of data.tags) {
                let tagId;
                // Tìm tag có sẵn
                const existingTag = await db.query.tags.findFirst({
                    where: (t, { eq }) => eq(t.name, tagName)
                });

                if (existingTag) {
                    tagId = existingTag.id;
                } else {
                    // Tạo tag mới
                    const newTag = await db.insert(tags)
                        .values({ name: tagName, type: 'auto' })
                        .returning();
                    tagId = newTag[0].id;
                }

                // Gắn vào bảng nối (Ignore nếu đã gắn rồi)
                await db.insert(product_tags)
                    .values({ productId: newProduct.id, tagId: tagId })
                    .onConflictDoNothing();
            }
        }

        return newProduct;
    },

    /**
     * 2. GỢI Ý SẢN PHẨM (AI RECOMMEND)
     * Input: Danh sách tags (ví dụ từ Computer Vision)
     * Output: Danh sách sản phẩm phù hợp nhất
     */
    async getRecommendations(inputTags: string[]) {
        if (!inputTags || inputTags.length === 0) return [];

        // Tìm ID của các tags này trong DB
        const tagRecords = await db.query.tags.findMany({
            where: (t, { inArray }) => inArray(t.name, inputTags)
        });
        
        const tagIds = tagRecords.map(t => t.id);
        if (tagIds.length === 0) return [];

        // Tìm sản phẩm có chứa các tagId này
        const matchedProducts = await db.query.product_tags.findMany({
            where: (pt, { inArray }) => inArray(pt.tagId, tagIds),
            with: {
                product: true // Lấy kèm thông tin sản phẩm
            },
            limit: 20 
        });

        // Lọc trùng lặp & Lọc sản phẩm đã bị xóa mềm
        const uniqueProductsMap = new Map();
        matchedProducts.forEach(mp => {
            if (mp.product && mp.product.deletedAt === null) {
                uniqueProductsMap.set(mp.product.id, mp.product);
            }
        });

        return Array.from(uniqueProductsMap.values());
    },

    /**
     * 3. LẤY DANH SÁCH (FILTER + PAGINATION)
     * Hỗ trợ: Tìm kiếm, Lọc danh mục, Lọc giá, Phân trang
     */
    async getAll(query: any) {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 12;
        const offset = (page - 1) * limit;

        // Xây dựng điều kiện lọc
        const conditions = [];
        conditions.push(isNull(products.deletedAt)); // Luôn lọc bỏ sản phẩm đã xóa

        if (query.search) conditions.push(like(products.name, `%${query.search}%`));
        if (query.categoryId) conditions.push(eq(products.categoryId, query.categoryId));
        if (query.minPrice) conditions.push(gte(products.price, Number(query.minPrice)));
        if (query.maxPrice) conditions.push(lte(products.price, Number(query.maxPrice)));

        // Query dữ liệu chính
        const data = await db.query.products.findMany({
            where: and(...conditions),
            limit: limit,
            offset: offset,
            orderBy: [desc(products.createdAt)], // Mới nhất lên đầu
            with: { category: true }             // Lấy kèm tên danh mục
        });

        // Query tổng số lượng (để Frontend chia trang)
        const allItems = await db
            .select({ count: sql<number>`count(*)` })
            .from(products)
            .where(and(...conditions));

        return {
            data,
            pagination: {
                page,
                limit,
                total: allItems[0]?.count ?? 0,
                totalPages: Math.ceil((allItems[0]?.count ?? 0) / limit)
            }
        };
    },

    /**
     * 4. LẤY CHI TIẾT SẢN PHẨM
     * Kèm theo: Category info và danh sách Tags
     */
    async getById(id: string) {
        const product = await db.query.products.findFirst({
            where: eq(products.id, id),
            with: {
                category: true,
                productTags: { with: { tag: true } } // Lấy tags lồng nhau
            }
        });

        // Nếu không thấy -> Ném lỗi (Global Handler sẽ bắt)
        if (!product) throw { code: 'NOT_FOUND', message: 'Product not found' };

        // Làm đẹp dữ liệu Tags (làm phẳng mảng)
        const flatTags = product.productTags.map(pt => pt.tag);
        
        return { ...product, tags: flatTags, productTags: undefined };
    },

    /**
     * 5. LẤY SẢN PHẨM LIÊN QUAN (RELATED PRODUCTS)
     * Logic: Cùng Category, trừ chính nó
     */
    async getRelated(id: string) {
        // Lấy category của sản phẩm hiện tại
        const currentProduct = await db.query.products.findFirst({
            where: eq(products.id, id)
        });
        
        if (!currentProduct || !currentProduct.categoryId) return [];

        return await db.query.products.findMany({
            where: and(
                eq(products.categoryId, currentProduct.categoryId),
                ne(products.id, id),        // Khác ID hiện tại
                isNull(products.deletedAt)  // Chưa xóa
            ),
            limit: 4,
            orderBy: [desc(products.createdAt)]
        });
    },

    /**
     * 6. CẬP NHẬT SẢN PHẨM (PATCH)
     * Hỗ trợ cập nhật cả Category và Tags
     */
    async update(id: string, body: any) {
        // A. Cập nhật Category nếu có thay đổi
        let categoryId;
        if (body.categoryName) {
            const existingCat = await db.query.categories.findFirst({
                where: (c, { eq }) => eq(c.name, body.categoryName)
            });
            if (existingCat) {
                categoryId = existingCat.id;
            } else {
                const newCat = await db.insert(categories)
                    .values({ 
                        name: body.categoryName,
                        slug: slugify(body.categoryName, { lower: true, locale: 'vi' })
                    }).returning();
                categoryId = newCat[0].id;
            }
        }

        // B. Cập nhật thông tin cơ bản
        const updateData: any = { ...body };
        if (categoryId) updateData.categoryId = categoryId;
        // Xóa các trường đặc biệt không lưu trực tiếp vào bảng products
        delete updateData.categoryName;
        delete updateData.tags;

        await db.update(products)
            .set(updateData)
            .where(eq(products.id, id));

        // C. Cập nhật Tags (Xóa hết cũ -> Thêm mới)
        if (body.tags) {
            // Xóa liên kết cũ
            await db.delete(product_tags).where(eq(product_tags.productId, id));
            
            // Thêm lại tags mới
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
                    .values({ productId: id, tagId: tagId })
                    .onConflictDoNothing();
            }
        }

        return { success: true, message: `Updated product ${id}` };
    },

    /**
     * 7. XÓA MỀM (SOFT DELETE)
     * Chỉ đánh dấu thời gian xóa, không xóa dữ liệu thật
     */
    async delete(id: string) {
        await db.update(products)
            .set({ deletedAt: new Date() })
            .where(eq(products.id, id));
            
        return { success: true, message: `Soft deleted product ${id}` };
    },

    // Các hàm phụ trợ khác (nếu cần)
    async getAllCategories() {
        return await db.select().from(categories);
    },

    async getAllTags() {
        return await db.select().from(tags);
    }
};