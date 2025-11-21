// /services/api/src/products/db.ts

import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';

// 1. Import schema CHỈ của products
import * as schema from './products.schema';

// 2. Tự tạo kết nối đến Turso (đọc từ file .env)
const client = createClient({
  url: process.env.TURSO_PRODUCTS_DATABASE_URL!,
  authToken: process.env.TURSO_PRODUCTS_AUTH_TOKEN!,
});

export const db = drizzle(client, { schema });