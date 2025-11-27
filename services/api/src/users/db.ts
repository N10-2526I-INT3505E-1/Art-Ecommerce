import { createClient } from '@libsql/client';
import { schema } from '@user/user.model';
import { drizzle } from 'drizzle-orm/libsql';

const client = createClient({
	url: process.env.TURSO_USERS_DATABASE_URL as string,
	authToken: process.env.TURSO_USERS_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
