import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './order.model';

const client = createClient({
  url: process.env.TURSO_ORDERS_DATABASE_URL as string,
  authToken: process.env.TURSO_ORDERS_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
