/**
 * Seed Demo Accounts
 *
 * Creates 3 demo accounts for the demo version:
 * - demo_user (role: user)
 * - demo_manager (role: manager)
 * - demo_operator (role: operator)
 *
 * All accounts use password: demo123456
 *
 * Usage: bun run src/scripts/seed_demo_accounts.ts
 */

import { createClient } from '@libsql/client';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { usersTable } from '../users/user.model';
import { hashPassword } from '../users/utils/passwordHash';

const client = createClient({
	url: process.env.TURSO_USERS_DATABASE_URL as string,
	authToken: process.env.TURSO_USERS_AUTH_TOKEN,
});

const db = drizzle(client);

const DEMO_PASSWORD = 'demo123456';

const DEMO_ACCOUNTS = [
	{
		username: 'demo_user',
		email: 'demo_user@novus.io.vn',
		first_name: 'Demo',
		last_name: 'User',
		role: 'user' as const,
	},
	{
		username: 'demo_manager',
		email: 'demo_manager@novus.io.vn',
		first_name: 'Demo',
		last_name: 'Manager',
		role: 'manager' as const,
	},
	{
		username: 'demo_operator',
		email: 'demo_operator@novus.io.vn',
		first_name: 'Demo',
		last_name: 'Operator',
		role: 'operator' as const,
	},
];

async function seedDemoAccounts() {
	console.log('🌱 Seeding demo accounts...\n');

	const hashedPassword = await hashPassword(DEMO_PASSWORD);

	for (const account of DEMO_ACCOUNTS) {
		try {
			// Check if user already exists
			const [existing] = await db
				.select()
				.from(usersTable)
				.where(eq(usersTable.username, account.username));

			if (existing) {
				// Update existing account to ensure correct role and password
				await db
					.update(usersTable)
					.set({
						password: hashedPassword,
						role: account.role,
						first_name: account.first_name,
						last_name: account.last_name,
						email: account.email,
					})
					.where(eq(usersTable.username, account.username));

				console.log(`  ✅ Updated existing: ${account.username} (${account.role})`);
			} else {
				// Create new account
				await db.insert(usersTable).values({
					...account,
					password: hashedPassword,
				});

				console.log(`  ✅ Created: ${account.username} (${account.role})`);
			}
		} catch (error) {
			console.error(`  ❌ Failed for ${account.username}:`, error);
		}
	}

	console.log('\n🎉 Demo accounts seeded successfully!');
	console.log('\nCredentials:');
	console.log('  Username: demo_user      | Password: demo123456 | Role: user');
	console.log('  Username: demo_manager   | Password: demo123456 | Role: manager');
	console.log('  Username: demo_operator  | Password: demo123456 | Role: operator');

	process.exit(0);
}

seedDemoAccounts().catch((err) => {
	console.error('Fatal error seeding demo accounts:', err);
	process.exit(1);
});
