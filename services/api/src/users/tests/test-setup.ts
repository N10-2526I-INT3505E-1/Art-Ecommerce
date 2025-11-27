import { Database } from 'bun:sqlite';
import { mock } from 'bun:test';
import * as schema from '@user/user.model';
import { drizzle } from 'drizzle-orm/bun-sqlite';

// Mock the database module to use an in-memory SQLite database for all tests
mock.module('@user/db', () => {
    const sqlite = new Database(':memory:');
    const db = drizzle(sqlite, { schema });
    return { db };
});