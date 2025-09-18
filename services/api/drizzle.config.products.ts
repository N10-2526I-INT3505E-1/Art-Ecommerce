import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({ path: '.env' });

export default defineConfig({
	out: './drizzle',
	schema: ['./src/users/products.model.ts'],
	dialect: 'turso',
	dbCredentials: {
		url: process.env.TURSO_PRODUCTS_DATABASE_URL as string,
		authToken: process.env.TURSO_PRODUCTS_AUTH_TOKEN,
	},
});
