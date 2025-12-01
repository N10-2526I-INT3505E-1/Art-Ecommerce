import { Database } from 'bun:sqlite';
import { mock } from 'bun:test';
import * as orderSchema from '@order/order.model';
import * as itemSchema from '@order/order_item.model';
import { drizzle } from 'drizzle-orm/bun-sqlite';

// Mock the database module to use an in-memory SQLite database for all tests
mock.module('@order/db', () => {
    const sqlite = new Database(':memory:');
    const db = drizzle(sqlite, { schema: { ...orderSchema, ...itemSchema } });
    return { db };
});