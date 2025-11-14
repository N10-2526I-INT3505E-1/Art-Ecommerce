import { Elysia, NotFoundError, t } from 'elysia';

import { eq } from 'drizzle-orm';

// Import 'db' TỪ FILE CÙNG THƯ MỤC
import { db } from './db'; 

// Import schema và schema cho OpenAPI
import { 
    products, 
    selectProductSchema, 
    insertProductSchema 
} from './products.schema';

// Đặt tên cho export, Elysia sẽ dùng tên này làm "Tag" trong OpenAPI
export const productsAPI = new Elysia({ prefix: '/products' })
  
  /**
   * Endpoint: GET /products
   * Lấy tất cả sản phẩm
   */
  .get(
    '/', 
    async () => {
      const allProducts = await db.select().from(products);
      return allProducts;
    },
    {
      // Khai báo cho OpenAPI:
      response: t.Array(selectProductSchema), // Trả về 1 mảng các sản phẩm
      detail: {
        summary: 'Get All Products',
        tags: ['Products'], // Gom nhóm API trong OpenAPI
      },
    }
  )

  /**
   * Endpoint: GET /products/:id
   * Lấy 1 sản phẩm theo ID
   */
  .get(
    '/:id',
    async ({ params, set }) => {
      const { id } = params;
      const product = await db.query.products.findFirst({
        where: (products, { eq }) => eq(products.id, id),
        // Ví dụ nếu bạn muốn join thêm category:
        // with: {
        //   category: true 
        // }
      });

      if (!product) {
        set.status = 404;
        return { error: 'Product not found' };
      }
      return product;
    },
    {
      // Khai báo cho OpenAPI:
      params: t.Object({
        id: t.Numeric(), // Yêu cầu 'id' phải là số
      }),
      response: {
        200: selectProductSchema, // Nếu thành công (200) thì trả về 1 sản phẩm
        404: t.Object({ error: t.String() }) // Nếu lỗi (404)
      },
      detail: {
        summary: 'Get Product by ID',
        tags: ['Products'],
      },
    }
  )

  .post(
    '/',
    async ({body, set}) => {
        const newProduct = await db.insert(products).values(body).returning();
        set.status = 201;
        return newProduct[0];
    },
    {
        body: insertProductSchema,
        response: {
            201: selectProductSchema,
        },
        detail: {
            summary: 'Create a New Product',
            tags: ['Products'],
        },
    }
  )
  
// Bạn có thể thêm .post(), .put(), .delete() ở đây