import { afterAll, beforeAll, beforeEach, describe, expect, mock, test } from 'bun:test';
import { Elysia } from 'elysia';

// ========================================================================
// 1. MOCKING & SETUP
// ========================================================================

process.env.JWT_SECRET = 'test-secret';
process.env.GOOGLE_CLIENT_ID = 'mock-google-client-id';

// 1.1. Mock Password Hashing
mock.module('@user/utils/passwordHash', () => ({
	comparePassword: async (plain: string, hash: string) =>
		plain === 'password123' && hash === 'hashed_password',
	hashPassword: async (plain: string) => 'hashed_' + plain,
}));

// 1.2. Mock Google Auth Library
mock.module('google-auth-library', () => ({
	OAuth2Client: class {
		verifyIdToken = mock(async () => ({
			getPayload: () => ({
				email: 'google@example.com',
				given_name: 'Google',
				family_name: 'User',
			}),
		}));
	},
}));

// 1.3. Mock DB Executor & Client
const dbExecutor = mock();
const mockDb = {
	select: mock().mockReturnThis(),
	from: mock().mockReturnThis(),
	where: mock().mockReturnThis(),
	orderBy: mock().mockReturnThis(),
	insert: mock().mockReturnThis(),
	values: mock().mockReturnThis(),
	update: mock().mockReturnThis(),
	set: mock().mockReturnThis(),
	delete: mock().mockReturnThis(),
	onConflictDoUpdate: mock().mockReturnThis(),
	transaction: mock(async (cb: any) => cb(mockDb)),
	returning: dbExecutor,
	then: async function (resolve: any, reject: any) {
		try {
			const result = await dbExecutor();
			resolve(result);
		} catch (err) {
			reject(err);
		}
	},
};

// 1.4. Mock Bazi Service
const mockBaziService = {
	calculateBazi: mock(async (input) => ({
		...input,
		id: 'bazi-mock-id',
		user_id: 'user-123',
		profile_name: input.profile_name || 'Bazi Profile',
		day_master_status: 'Strong',
		structure_type: 'Wood',
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
		birth_minute: 0,
	})),
};

// 1.5. Mock Elysia JWT Plugin
mock.module('@elysiajs/jwt', () => ({
	jwt: () => (app: any) =>
		app.decorate('jwt', {
			sign: async (payload: any) => 'mock_token',
			verify: async (token: string) => {
				if (token === 'mock_admin_token') return { id: 'admin-456', role: 'manager' };
				if (token === 'mock_user_token') return { id: 'user-123', role: 'user' };
				if (token === 'mock_token') return { id: 'user-123', role: 'user' };
				return false;
			},
		}),
}));

// 2. APP INITIALIZATION

import { errorHandler } from '@common/errors/errorHandler';
import { usersPlugin } from '../index';
import type { Static } from 'elysia';

// Fixtures chuẩn (Full required fields)
const MOCK_USER = {
	id: 'user-123',
	email: 'user@example.com',
	username: 'normaluser',
	password: 'hashed_password',
	role: 'user',
	first_name: 'Normal',
	last_name: 'User',
	created_at: new Date().toISOString(),
	updated_at: new Date().toISOString(),
};

const MOCK_ADMIN = {
	id: 'admin-456',
	email: 'admin@example.com',
	username: 'admin',
	password: 'hashed_password',
	role: 'manager',
	first_name: 'Admin',
	last_name: 'User',
	created_at: new Date().toISOString(),
	updated_at: new Date().toISOString(),
};

const app = new Elysia({ prefix: '/users' }).use(errorHandler).use(
	usersPlugin({
		db: mockDb as any,
		baziService: mockBaziService as any,
	}),
);

const API_URL = 'http://localhost/users';

const safeJson = async (res: Response) => {
	const text = await res.text();
	try {
		return JSON.parse(text);
	} catch {
		return { error: 'Invalid JSON', raw: text };
	}
};

// ========================================================================
// 3. TEST SUITES
// ========================================================================

describe('User Service - Integration Tests', () => {
	beforeEach(() => {
		dbExecutor.mockReset();
		dbExecutor.mockResolvedValue([]);
	});

	describe('Authentication (/auth)', () => {
		test('TC-INT-USR-01: Login Success', async () => {
			dbExecutor.mockResolvedValueOnce([MOCK_USER]).mockResolvedValueOnce([]);

			const response = await app.handle(
				new Request(`${API_URL}/auth/login`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ email: MOCK_USER.email, password: 'password123' }),
				}),
			);
			const body = await safeJson(response);

			expect(response.status).toBe(200);
			expect(body).toHaveProperty('accessToken');
		});

		test('TC-INT-USR-02: Login Fail (Wrong Password)', async () => {
			dbExecutor.mockResolvedValueOnce([MOCK_USER]);

			const response = await app.handle(
				new Request(`${API_URL}/auth/login`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ email: MOCK_USER.email, password: 'wrong_password' }),
				}),
			);

			expect(response.status).toBe(401);
		});

		test('TC-INT-USR-03: Register Success', async () => {
			const newUserInput = {
				email: 'new@test.com',
				username: 'newbie',
				password: 'password123',
				first_name: 'New',
				last_name: 'Member',
			};

			const createdUser = {
				...newUserInput,
				id: 'new-id',
				role: 'user',
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			};

			dbExecutor
				.mockResolvedValueOnce([]) // Check Email
				.mockResolvedValueOnce([]) // Check Username
				.mockResolvedValueOnce([createdUser]) // Insert User -> Return full object
				.mockResolvedValueOnce([]); // Insert Token

			const response = await app.handle(
				new Request(`${API_URL}/`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(newUserInput),
				}),
			);

			const body = await safeJson(response);
			if (response.status === 422)
				console.error('Validation Error Register:', JSON.stringify(body, null, 2));

			expect(response.status).toBe(201);
			expect(body.user?.email).toBe(newUserInput.email);
		});

		test('TC-INT-USR-04: Register Fail (Duplicate Email)', async () => {
			dbExecutor.mockResolvedValueOnce([MOCK_USER]);

			const response = await app.handle(
				new Request(`${API_URL}/`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ ...MOCK_USER, password: 'password123', username: 'validuser' }),
				}),
			);

			expect(response.status).toBe(409);
		});

		test('TC-INT-USR-05-1: Refresh Token Success', async () => {
			dbExecutor
				.mockResolvedValueOnce([{ user_id: MOCK_USER.id }])
				.mockResolvedValueOnce([MOCK_USER]);

			const response = await app.handle(
				new Request(`${API_URL}/auth/refresh`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ refreshToken: 'valid_refresh_token' }),
				}),
			);
			const body = await safeJson(response);
			expect(response.status).toBe(200);
			expect(body).toHaveProperty('accessToken');
		});

		test('TC-INT-USR-05-2: Refresh Token Fail (Invalid Token)', async () => {
			dbExecutor.mockResolvedValueOnce([]);
			const response = await app.handle(
				new Request(`${API_URL}/auth/refresh`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ refreshToken: 'invalid_token' }),
				}),
			);
			expect(response.status).toBe(401);
		});

		test('TC-INT-USR-06: Logout', async () => {
			dbExecutor.mockResolvedValueOnce([]);
			const response = await app.handle(
				new Request(`${API_URL}/auth/logout`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ refreshToken: 'valid_refresh_token' }),
				}),
			);
			expect(response.status).toBe(200);
			expect(dbExecutor).toHaveBeenCalled();
		});

		test('TC-INT-USR-16: Login Google', async () => {
			dbExecutor
				.mockResolvedValueOnce([]) // Find
				.mockResolvedValueOnce([]) // Check email
				.mockResolvedValueOnce([]) // Check username
				.mockResolvedValueOnce([{ ...MOCK_USER, id: 'google-id' }])
				.mockResolvedValueOnce([]); // Token

			const response = await app.handle(
				new Request(`${API_URL}/auth/google`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ token: 'fake_google_token' }),
				}),
			);

			expect(response.status).toBe(200);
		});
	});

	describe('User Management', () => {
		test('TC-INT-USR-07: Get All Users (Admin)', async () => {
			// Trả về danh sách user đầy đủ trường
			dbExecutor.mockResolvedValueOnce([MOCK_USER, MOCK_ADMIN]);

			const response = await app.handle(
				new Request(`${API_URL}/`, {
					headers: { Authorization: 'Bearer mock_admin_token' },
				}),
			);

			const body = await safeJson(response);
			if (response.status === 422)
				console.error('Validation Error GetAll:', JSON.stringify(body, null, 2));

			expect(response.status).toBe(200);
			expect(body.users).toHaveLength(2);
		});

		test('TC-INT-USR-08: Get All Users (Non-Admin)', async () => {
			const response = await app.handle(
				new Request(`${API_URL}/`, {
					headers: { Authorization: 'Bearer mock_user_token' },
				}),
			);
			expect(response.status).toBe(403);
		});

		test('TC-INT-USR-09: Get Profile', async () => {
			dbExecutor.mockResolvedValueOnce([MOCK_USER]);

			const response = await app.handle(
				new Request(`${API_URL}/profile`, {
					headers: { Authorization: 'Bearer mock_user_token' },
				}),
			);

			const body = await safeJson(response);
			if (response.status === 422)
				console.error('Validation Error Profile:', JSON.stringify(body, null, 2));

			expect(response.status).toBe(200);
			expect(body.id).toBe(MOCK_USER.id);
		});

		test('TC-INT-USR-10: Update Profile', async () => {
			const updateData = { first_name: 'Updated', last_name: 'Name' };
			const updatedUser = { ...MOCK_USER, ...updateData };
			dbExecutor.mockResolvedValueOnce([updatedUser]);

			const response = await app.handle(
				new Request(`${API_URL}/profile`, {
					method: 'PATCH',
					headers: {
						'Content-Type': 'application/json',
						Authorization: 'Bearer mock_user_token',
					},
					body: JSON.stringify(updateData),
				}),
			);

			const body = await safeJson(response);

			expect(response.status).toBe(200);
			expect(body.user.first_name).toBe('Updated');
		});
	});

	describe('Address Management', () => {
		const addressInput = {
			address: '123 Street Name',
			phone: '0987654321',
			is_default: 1,
			country: 'Vietnam',
			state: 'Hanoi',
			ward: 'Cau Giay',
			postal_code: '100000',
		};

		const mockAddressDB = {
			id: 1,
			user_id: MOCK_USER.id,
			...addressInput,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};

		test('TC-INT-USR-11: Add Address', async () => {
			dbExecutor
				.mockResolvedValueOnce([MOCK_USER])
				.mockResolvedValueOnce([])
				.mockResolvedValueOnce([mockAddressDB]);

			const response = await app.handle(
				new Request(`${API_URL}/addresses`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: 'Bearer mock_user_token',
					},
					body: JSON.stringify(addressInput),
				}),
			);

			const body = await safeJson(response);
			if (response.status === 422)
				console.error('Validation Error AddAddr:', JSON.stringify(body, null, 2));

			expect(response.status).toBe(201);
			expect(body.address.address).toBe(addressInput.address);
		});

		test('TC-INT-USR-12: Get Addresses', async () => {
			dbExecutor.mockResolvedValueOnce([mockAddressDB]);

			const response = await app.handle(
				new Request(`${API_URL}/addresses`, {
					headers: { Authorization: 'Bearer mock_user_token' },
				}),
			);

			const body = await safeJson(response);
			if (response.status === 422)
				console.error('Validation Error GetAddr:', JSON.stringify(body, null, 2));

			expect(response.status).toBe(200);
			expect(body.addresses).toBeDefined();
		});

		test('TC-INT-USR-13-1: Update Address (Has permission)', async () => {
			const updateData = { address: '456 New Street' };
			const updatedAddress = { ...mockAddressDB, ...updateData };
			dbExecutor.mockResolvedValueOnce([mockAddressDB]).mockResolvedValueOnce([updatedAddress]);

			const response = await app.handle(
				new Request(`${API_URL}/addresses/1`, {
					method: 'PATCH',
					headers: {
						'Content-Type': 'application/json',
						Authorization: 'Bearer mock_user_token',
					},
					body: JSON.stringify(updateData),
				}),
			);
			const body = await safeJson(response);
			expect(response.status).toBe(200);
			expect(body.address.address).toBe('456 New Street');
		});

		test('TC-INT-USR-13-2: Update Address (Not Found)', async () => {
			const updateData = { address: '456 New Street' };

			dbExecutor.mockResolvedValueOnce([]);

			const response = await app.handle(
				new Request(`${API_URL}/addresses/999`, {
					method: 'PATCH',
					headers: {
						'Content-Type': 'application/json',
						Authorization: 'Bearer mock_user_token',
					},
					body: JSON.stringify(updateData),
				}),
			);

			expect(response.status).toBe(404);
		});

		test('TC-INT-USR-14: Delete Address (Has permission)', async () => {
			dbExecutor.mockResolvedValueOnce([mockAddressDB]).mockResolvedValueOnce([]);
			const response = await app.handle(
				new Request(`${API_URL}/addresses/1`, {
					method: 'DELETE',
					headers: { Authorization: 'Bearer mock_user_token' },
				}),
			);

			expect(response.status).toBe(204);
		});

		test('TC-INT-USR-15: Delete Address (No permission)', async () => {
			dbExecutor.mockResolvedValueOnce([]);

			const response = await app.handle(
				new Request(`${API_URL}/addresses/1`, {
					method: 'DELETE',
					headers: { Authorization: 'Bearer mock_user_token' },
				}),
			);

			expect(response.status).toBe(404);
		});

		test('TC-INT-USR-16: Delete Address Not Found', async () => {
			dbExecutor.mockResolvedValueOnce([]);

			const response = await app.handle(
				new Request(`${API_URL}/addresses/999`, {
					method: 'DELETE',
					headers: { Authorization: 'Bearer mock_user_token' },
				}),
			);

			expect(response.status).toBe(404);
		});
	});
});
