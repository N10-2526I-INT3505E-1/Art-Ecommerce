import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({ path: '.env' });

export default defineConfig({
	out: './drizzle',
	schema: ['./src/users/orders.model.ts'],
	dialect: 'turso',
	dbCredentials: {
		url: process.env.TURSO_ORDERS_DATABASE_URL as string,
		authToken: process.env.TURSO_ORDERS_AUTH_TOKEN,
	},
});
