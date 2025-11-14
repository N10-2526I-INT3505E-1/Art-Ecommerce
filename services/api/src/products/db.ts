// /services/api/src/products/db.ts

import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';

// 1. Import schema CHỈ của products
import { products, categories } from './products.schema';

// 2. Tự tạo kết nối đến Turso (đọc từ file .env)
const client = createClient({
  url: process.env.TURSO_PRODUCTS_DATABASE_URL!,
  authToken: process.env.TURSO_PRODUCTS_AUTH_TOKEN!,
});

// 3. Gộp schema CHỈ của products
export const schema = {
  products,
  categories,
};

// 4. Khởi tạo và export 'db' object CHỈ cho products
// Drizzle sẽ dùng schema này để biết về bảng products/categories
export const db = drizzle(client, { schema });