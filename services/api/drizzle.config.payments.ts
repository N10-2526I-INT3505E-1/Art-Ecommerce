import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({ path: '.env' });

export default defineConfig({
	out: './drizzle',
	schema: ['./src/payments/payment.model.ts'],
	dialect: 'turso',
	dbCredentials: {
		url: process.env.TURSO_PAYMENTS_DATABASE_URL as string,
		authToken: process.env.TURSO_PAYMENTS_AUTH_TOKEN,
	},
});
