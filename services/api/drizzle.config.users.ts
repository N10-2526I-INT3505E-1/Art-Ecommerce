import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({ path: '.env', override: true });

export default defineConfig({
	out: './drizzle',
	schema: ['./src/users/user.model.ts'],
	dialect: 'turso',
	dbCredentials: {
		url: process.env.TURSO_USERS_DATABASE_URL as string,
		authToken: process.env.TURSO_USERS_AUTH_TOKEN,
	},
});
