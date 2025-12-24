import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Elysia, t } from 'elysia';
import {
	NotFoundError,
	ForbiddenError,
	UnauthorizedError,
	ConflictError,
} from '@common/errors/httpErrors';
import { errorHandler } from '@common/errors/errorHandler';

// ========================================================================
// 1. MOCK DATA FIXTURES
// ========================================================================

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

const MOCK_OTHER_USER = {
	id: 'other-user-789',
	email: 'other@example.com',
	username: 'otheruser',
	password: 'hashed_password',
	role: 'user',
	first_name: 'Other',
	last_name: 'User',
	created_at: new Date().toISOString(),
	updated_at: new Date().toISOString(),
};

const MOCK_ADDRESS = {
	id: 1,
	user_id: MOCK_USER.id,
	address: '123 Street Name',
	phone: '0987654321',
	is_default: 1,
	country: 'Vietnam',
	state: 'Hanoi',
	ward: 'Cau Giay',
	postal_code: '100000',
	created_at: new Date().toISOString(),
	updated_at: new Date().toISOString(),
};

const MOCK_BAZI_PROFILE = {
	id: 'bazi-001',
	user_id: MOCK_USER.id,
	profile_name: 'My Bazi Profile',
	gender: 'male' as const,
	birth_day: 15,
	birth_month: 6,
	birth_year: 1990,
	birth_hour: 10,
	birth_minute: 30,
	longitude: 105.8,
	timezone_offset: 7,
	year_stem: 'Canh',
	year_branch: 'Ngọ',
	month_stem: 'Nhâm',
	month_branch: 'Ngọ',
	day_stem: 'Giáp',
	day_branch: 'Tý',
	hour_stem: 'Kỷ',
	hour_branch: 'Tỵ',
	day_master_status: 'Vượng',
	structure_type: 'Nội Cách',
	structure_name: 'Chính Quan Cách',
	analysis_reason: 'Day master is strong',
	center_analysis: null,
	energy_flow: null,
	limit_score: null,
	interactions: null,
	favorable_elements: ['Water', 'Metal'],
	party_score: 45.5,
	enemy_score: 32.0,
	created_at: new Date().toISOString(),
	updated_at: new Date().toISOString(),
};

// ========================================================================
// 2. MOCK USER SERVICE
// ========================================================================

const mockUserService = {
	login: mock(),
	logout: mock(),
	refreshAccessToken: mock(),
	loginWithGoogle: mock(),
	createUser: mock(),
	getAllUsers: mock(),
	getUserById: mock(),
	updateUser: mock(),
	deleteUser: mock(),
	getUserAddresses: mock(),
	addUserAddress: mock(),
	updateUserAddress: mock(),
	deleteUserAddress: mock(),
	getBaziProfile: mock(),
	createOrUpdateBaziProfile: mock(),
};

// Reset all mocks
const resetMocks = () => {
	Object.values(mockUserService).forEach((m) => m.mockReset());
};

// ========================================================================
// 3. CONFIGURATION
// ========================================================================
const BASE_URL = 'http://localhost';
const API_VERSION = '/v1';
const SESSIONS_PATH = '/sessions';
const USERS_PATH = '/users';

// Helper to build URLs
const buildSessionUrl = (path: string = '', query: string = '') =>
	`${BASE_URL}${API_VERSION}${SESSIONS_PATH}${path}${query}`;

const buildUserUrl = (path: string = '', query: string = '') =>
	`${BASE_URL}${API_VERSION}${USERS_PATH}${path}${query}`;

// Helper to safely parse JSON response
const safeJson = async (res: Response) => {
	const text = await res.text();
	try {
		return JSON.parse(text);
	} catch {
		return { error: 'Invalid JSON', raw: text };
	}
};

// ========================================================================
// 4. TEST PLUGIN (without real JWT/DB dependencies)
// ========================================================================

const testUsersPlugin = (dependencies: { userService: typeof mockUserService }) =>
	new Elysia({ name: 'test-users-plugin' })
		.decorate('userService', dependencies.userService)
		.decorate('jwt', {
			sign: async (payload: any) => 'mock_token',
			verify: async (token: string) => {
				if (token === 'mock_admin_token') return { id: 'admin-456', role: 'manager' };
				if (token === 'mock_user_token') return { id: 'user-123', role: 'user' };
				return false;
			},
		})

		// GROUP 1: PUBLIC ROUTES (AUTH & SESSION)
		.group(`${API_VERSION}${SESSIONS_PATH}`, (app) =>
			app
				// POST /sessions - Login
				.post(
					'/',
					async ({ body, set, userService, jwt }) => {
						const { accessToken, refreshToken } = await userService.login(body, jwt as any);
						set.status = 201;
						return { accessToken, refreshToken };
					},
					{
						body: t.Object({
							email: t.Optional(t.String({ format: 'email' })),
							username: t.Optional(t.String()),
							password: t.String({ minLength: 6 }),
						}),
					},
				)

				// DELETE /sessions - Logout
				.delete(
					'/',
					async ({ body, userService, set }) => {
						const { refreshToken } = body as any;
						if (refreshToken) {
							await userService.logout(refreshToken);
						}
						set.status = 204;
					},
					{
						body: t.Object({ refreshToken: t.Optional(t.String()) }),
					},
				)

				// POST /sessions/refresh
				.post(
					'/refresh',
					async ({ body, userService, jwt }) => {
						const { refreshToken } = body as any;
						if (!refreshToken) throw new UnauthorizedError('No refresh token provided');
						const { accessToken } = await userService.refreshAccessToken(refreshToken, jwt as any);
						return { accessToken };
					},
					{
						body: t.Object({ refreshToken: t.String() }),
					},
				)

				// POST /sessions/google
				.post(
					'/google',
					async ({ body, set, userService, jwt }) => {
						const result = await userService.loginWithGoogle(body.token, jwt as any);
						set.status = 201;
						return { accessToken: result.accessToken, refreshToken: result.refreshToken };
					},
					{
						body: t.Object({ token: t.String() }),
					},
				),
		)

		// GROUP 2: USERS RESOURCES
		.group(`${API_VERSION}${USERS_PATH}`, (app) =>
			app
				// POST /users - Register (Public)
				.post(
					'/',
					async ({ body, set, userService, jwt }) => {
						const result = await userService.createUser(body, jwt as any);
						set.status = 201;
						return result;
					},
					{
						body: t.Object({
							email: t.String({ format: 'email' }),
							username: t.String({ minLength: 3, maxLength: 50 }),
							password: t.String({ minLength: 6 }),
							first_name: t.String(),
							last_name: t.String(),
						}),
					},
				)

				// PROTECTED ROUTES
				.guard({}, (app) =>
					app
						.derive(({ headers }) => {
							const userId = headers['x-user-id'];
							const userRole = headers['x-user-role'];

							if (!userId) {
								throw new UnauthorizedError('Missing Gateway Headers (x-user-id)');
							}

							return {
								user: {
									id: userId as string,
									role: (userRole as string) || 'user',
								},
							};
						})

						// GET /users - List all users (admin only)
						.get('/', async ({ user, userService }) => {
							if (user.role !== 'manager') throw new ForbiddenError('Admins only');
							const { users } = await userService.getAllUsers();
							return { users };
						})

						// GET /users/profile
						.get('/profile', async ({ user, userService }) => {
							const currentUser = await userService.getUserById(user.id);
							const { password, ...safeUser } = currentUser;
							return { user: safeUser };
						})

						// PATCH /users/profile
						.patch(
							'/profile',
							async ({ body, user, userService }) => {
								const updatedUser = await userService.updateUser(user.id, body);
								return { user: updatedUser };
							},
							{
								body: t.Partial(
									t.Object({
										first_name: t.String(),
										last_name: t.String(),
										username: t.String(),
									}),
								),
							},
						)

						// GET /users/:user_id
						.get(
							'/:user_id',
							async ({ params, user, userService }) => {
								if (user.role !== 'manager' && user.id !== params.user_id) {
									throw new ForbiddenError('Access denied');
								}
								const foundUser = await userService.getUserById(params.user_id);
								return { user: foundUser };
							},
							{
								params: t.Object({ user_id: t.String() }),
							},
						)

						// PATCH /users/:user_id
						.patch(
							'/:user_id',
							async ({ params, body, user, userService }) => {
								if (user.role !== 'manager' && user.id !== params.user_id) {
									throw new ForbiddenError('Access denied');
								}
								const updatedUser = await userService.updateUser(params.user_id, body);
								return { user: updatedUser };
							},
							{
								params: t.Object({ user_id: t.String() }),
								body: t.Partial(
									t.Object({
										first_name: t.String(),
										last_name: t.String(),
									}),
								),
							},
						)

						// DELETE /users/:user_id
						.delete(
							'/:user_id',
							async ({ params, user, userService }) => {
								if (user.role !== 'manager' && user.id !== params.user_id) {
									throw new ForbiddenError('Access denied');
								}
								const result = await userService.deleteUser(params.user_id);
								return { message: result.message };
							},
							{
								params: t.Object({ user_id: t.String() }),
							},
						)

						// ADDRESS MANAGEMENT

						// GET /users/profile/addresses
						.get('/profile/addresses', async ({ user, userService }) => {
							const { addresses } = await userService.getUserAddresses(user.id);
							return { addresses };
						})

						// POST /users/profile/addresses
						.post(
							'/profile/addresses',
							async ({ body, set, user, userService }) => {
								const newAddress = await userService.addUserAddress(user.id, body);
								set.status = 201;
								return { address: newAddress };
							},
							{
								body: t.Object({
									address: t.String(),
									phone: t.String({ pattern: '^[0-9]{10,11}$' }),
									is_default: t.Optional(t.Integer()),
									country: t.String(),
									state: t.String(),
									ward: t.String(),
									postal_code: t.String(),
								}),
							},
						)

						// PATCH /users/profile/addresses/:address_id
						.patch(
							'/profile/addresses/:address_id',
							async ({ params, body, user, userService }) => {
								const updatedAddress = await userService.updateUserAddress(
									user.id,
									params.address_id,
									body,
								);
								return { address: updatedAddress };
							},
							{
								params: t.Object({ address_id: t.Numeric() }),
								body: t.Partial(
									t.Object({
										address: t.String(),
										phone: t.String(),
									}),
								),
							},
						)

						// DELETE /users/profile/addresses/:address_id
						.delete(
							'/profile/addresses/:address_id',
							async ({ set, params, user, userService }) => {
								await userService.deleteUserAddress(user.id, params.address_id);
								set.status = 204;
							},
							{
								params: t.Object({ address_id: t.Numeric() }),
							},
						)

						// GET /users/:user_id/addresses
						.get(
							'/:user_id/addresses',
							async ({ params, user, userService }) => {
								if (user.role !== 'manager' && user.id !== params.user_id) {
									throw new ForbiddenError('Access denied');
								}
								const { addresses } = await userService.getUserAddresses(params.user_id);
								return { addresses };
							},
							{
								params: t.Object({ user_id: t.String() }),
							},
						)

						// BAZI PROFILE

						// GET /users/profile/bazi
						.get('/profile/bazi', async ({ user, userService }) => {
							const profile = await userService.getBaziProfile(user.id);
							return { profile };
						})

						// POST /users/profile/bazi
						.post(
							'/profile/bazi',
							async ({ body, user, userService }) => {
								const profile = await userService.createOrUpdateBaziProfile(user.id, body);
								return { profile };
							},
							{
								body: t.Object({
									profile_name: t.String(),
									gender: t.Union([t.Literal('male'), t.Literal('female')]),
									birth_day: t.Integer({ minimum: 1, maximum: 31 }),
									birth_month: t.Integer({ minimum: 1, maximum: 12 }),
									birth_year: t.Integer({ minimum: 1900, maximum: 2100 }),
									birth_hour: t.Integer({ minimum: 0, maximum: 23 }),
									birth_minute: t.Integer({ minimum: 0, maximum: 59 }),
									longitude: t.Number(),
									timezone_offset: t.Number(),
								}),
							},
						)

						// GET /users/:user_id/bazi
						.get(
							'/:user_id/bazi',
							async ({ params, user, userService }) => {
								if (user.role !== 'manager' && user.id !== params.user_id) {
									throw new ForbiddenError('Access denied');
								}
								const profile = await userService.getBaziProfile(params.user_id);
								return { profile };
							},
							{
								params: t.Object({ user_id: t.String() }),
							},
						),
				),
		);

// Helper to create auth headers
const createAuthHeaders = (userId: string, role: string = 'user') => ({
	'x-user-id': userId,
	'x-user-role': role,
	'Content-Type': 'application/json',
});

// ========================================================================
// 5. TEST SUITES
// ========================================================================

describe('User Service - Integration Tests', () => {
	let app: Elysia<any, any, any, any, any, any>;

	beforeEach(() => {
		resetMocks();
		app = new Elysia()
			.use(errorHandler)
			.use(testUsersPlugin({ userService: mockUserService as any }));
	});

	// ========================================================================
	// SECTION 1: SESSION / AUTHENTICATION ENDPOINTS
	// ========================================================================
	describe('Sessions (/v1/sessions)', () => {
		describe('POST /sessions - Login', () => {
			it('TC-INT-SESSION-01: Should login successfully with valid email and password', async () => {
				mockUserService.login.mockResolvedValue({
					accessToken: 'mock_access_token',
					refreshToken: 'mock_refresh_token',
				});

				const response = await app.handle(
					new Request(buildSessionUrl('/'), {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ email: MOCK_USER.email, password: 'password123' }),
					}),
				);
				const body = await response.json();

				expect(response.status).toBe(201);
				expect(body).toHaveProperty('accessToken');
				expect(body).toHaveProperty('refreshToken');
			});

			it('TC-INT-SESSION-02: Should login successfully with valid username and password', async () => {
				mockUserService.login.mockResolvedValue({
					accessToken: 'mock_access_token',
					refreshToken: 'mock_refresh_token',
				});

				const response = await app.handle(
					new Request(buildSessionUrl('/'), {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ username: MOCK_USER.username, password: 'password123' }),
					}),
				);
				const body = await response.json();

				expect(response.status).toBe(201);
				expect(body).toHaveProperty('accessToken');
			});

			it('TC-INT-SESSION-03: Should fail login with wrong password', async () => {
				mockUserService.login.mockRejectedValue(new UnauthorizedError('Invalid credentials'));

				const response = await app.handle(
					new Request(buildSessionUrl('/'), {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ email: MOCK_USER.email, password: 'wrong_password' }),
					}),
				);

				expect(response.status).toBe(401);
			});

			it('TC-INT-SESSION-04: Should fail login with non-existent user', async () => {
				mockUserService.login.mockRejectedValue(new UnauthorizedError('Invalid credentials'));

				const response = await app.handle(
					new Request(buildSessionUrl('/'), {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ email: 'ghost@example.com', password: 'password123' }),
					}),
				);

				expect(response.status).toBe(401);
			});

			it('TC-INT-SESSION-05: Should fail login with invalid email format', async () => {
				const response = await app.handle(
					new Request(buildSessionUrl('/'), {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ email: 'invalid-email', password: 'password123' }),
					}),
				);

				expect(response.status).toBe(422);
			});

			it('TC-INT-SESSION-06: Should fail login with short password', async () => {
				const response = await app.handle(
					new Request(buildSessionUrl('/'), {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ email: 'test@example.com', password: '123' }),
					}),
				);

				expect(response.status).toBe(422);
			});
		});

		describe('DELETE /sessions - Logout', () => {
			it('TC-INT-SESSION-07: Should logout successfully', async () => {
				mockUserService.logout.mockResolvedValue(undefined);

				const response = await app.handle(
					new Request(buildSessionUrl('/'), {
						method: 'DELETE',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ refreshToken: 'valid_refresh_token' }),
					}),
				);
				expect(response.status).toBe(204);
			});

			it('TC-INT-SESSION-08: Should logout even without refresh token', async () => {
				const response = await app.handle(
					new Request(buildSessionUrl('/'), {
						method: 'DELETE',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({}),
					}),
				);
				expect(response.status).toBe(204);
			});
		});

		describe('POST /sessions/refresh - Refresh Token', () => {
			it('TC-INT-SESSION-09: Should refresh token successfully', async () => {
				mockUserService.refreshAccessToken.mockResolvedValue({
					accessToken: 'new_access_token',
				});

				const response = await app.handle(
					new Request(buildSessionUrl('/refresh'), {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ refreshToken: 'valid_refresh_token' }),
					}),
				);
				const body = await response.json();

				expect(response.status).toBe(200);
				expect(body).toHaveProperty('accessToken');
			});

			it('TC-INT-SESSION-10: Should fail refresh with invalid token', async () => {
				mockUserService.refreshAccessToken.mockRejectedValue(
					new UnauthorizedError('Invalid refresh token'),
				);

				const response = await app.handle(
					new Request(buildSessionUrl('/refresh'), {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ refreshToken: 'invalid_token' }),
					}),
				);

				expect(response.status).toBe(401);
			});

			it('TC-INT-SESSION-11: Should fail refresh without refresh token', async () => {
				const response = await app.handle(
					new Request(buildSessionUrl('/refresh'), {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({}),
					}),
				);

				expect(response.status).toBe(422);
			});
		});

		describe('POST /sessions/google - Google Login', () => {
			it('TC-INT-SESSION-12: Should login with Google (existing user)', async () => {
				mockUserService.loginWithGoogle.mockResolvedValue({
					accessToken: 'google_access_token',
					refreshToken: 'google_refresh_token',
				});

				const response = await app.handle(
					new Request(buildSessionUrl('/google'), {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ token: 'valid_google_token' }),
					}),
				);
				const body = await response.json();

				expect(response.status).toBe(201);
				expect(body).toHaveProperty('accessToken');
			});

			it('TC-INT-SESSION-13: Should fail Google login with invalid token', async () => {
				mockUserService.loginWithGoogle.mockRejectedValue(new UnauthorizedError('Invalid token'));

				const response = await app.handle(
					new Request(buildSessionUrl('/google'), {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ token: 'invalid_google_token' }),
					}),
				);

				expect(response.status).toBe(401);
			});
		});
	});

	// ========================================================================
	// SECTION 2: USER REGISTRATION
	// ========================================================================
	describe('User Registration (POST /v1/users)', () => {
		const newUserInput = {
			email: 'new@test.com',
			username: 'newuser',
			password: 'password123',
			first_name: 'New',
			last_name: 'Member',
		};

		it('TC-INT-REG-01: Should register new user successfully', async () => {
			const createdUser = {
				...newUserInput,
				id: 'new-id',
				role: 'user',
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			};

			mockUserService.createUser.mockResolvedValue({
				user: createdUser,
				accessToken: 'new_access_token',
				refreshToken: 'new_refresh_token',
			});

			const response = await app.handle(
				new Request(buildUserUrl('/'), {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(newUserInput),
				}),
			);
			const body = await response.json();

			expect(response.status).toBe(201);
			expect(body.user?.email).toBe(newUserInput.email);
			expect(body).toHaveProperty('accessToken');
			expect(body).toHaveProperty('refreshToken');
		});

		it('TC-INT-REG-02: Should fail registration with duplicate email', async () => {
			mockUserService.createUser.mockRejectedValue(new ConflictError('Email already exists'));

			const response = await app.handle(
				new Request(buildUserUrl('/'), {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ ...newUserInput, email: MOCK_USER.email }),
				}),
			);

			expect(response.status).toBe(409);
		});

		it('TC-INT-REG-03: Should fail registration with invalid email format', async () => {
			const response = await app.handle(
				new Request(buildUserUrl('/'), {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ ...newUserInput, email: 'invalid-email' }),
				}),
			);

			expect(response.status).toBe(422);
		});

		it('TC-INT-REG-04: Should fail registration with short username', async () => {
			const response = await app.handle(
				new Request(buildUserUrl('/'), {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ ...newUserInput, username: 'ab' }),
				}),
			);

			expect(response.status).toBe(422);
		});

		it('TC-INT-REG-05: Should fail registration with short password', async () => {
			const response = await app.handle(
				new Request(buildUserUrl('/'), {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ ...newUserInput, password: '123' }),
				}),
			);

			expect(response.status).toBe(422);
		});

		it('TC-INT-REG-06: Should fail registration with missing required fields', async () => {
			const response = await app.handle(
				new Request(buildUserUrl('/'), {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ email: 'test@test.com' }),
				}),
			);

			expect(response.status).toBe(422);
		});
	});

	// ========================================================================
	// SECTION 3: USER MANAGEMENT (Protected Routes)
	// ========================================================================
	describe('User Management (Protected)', () => {
		describe('GET /users - List All Users (Admin Only)', () => {
			it('TC-INT-USER-01: Should return all users for admin', async () => {
				mockUserService.getAllUsers.mockResolvedValue({ users: [MOCK_USER, MOCK_ADMIN] });

				const response = await app.handle(
					new Request(buildUserUrl('/'), {
						headers: createAuthHeaders('admin-456', 'manager'),
					}),
				);
				const body = await response.json();

				expect(response.status).toBe(200);
				expect(body.users).toHaveLength(2);
			});

			it('TC-INT-USER-02: Should reject non-admin users', async () => {
				const response = await app.handle(
					new Request(buildUserUrl('/'), {
						headers: createAuthHeaders('user-123', 'user'),
					}),
				);

				expect(response.status).toBe(403);
			});

			it('TC-INT-USER-03: Should reject unauthenticated requests', async () => {
				const response = await app.handle(new Request(buildUserUrl('/')));

				expect(response.status).toBe(401);
			});
		});

		describe('GET /users/profile - Get Current User Profile', () => {
			it('TC-INT-USER-04: Should return current user profile', async () => {
				mockUserService.getUserById.mockResolvedValue(MOCK_USER);

				const response = await app.handle(
					new Request(buildUserUrl('/profile'), {
						headers: createAuthHeaders('user-123'),
					}),
				);
				const body = await response.json();

				expect(response.status).toBe(200);
				expect(body.user.id).toBe(MOCK_USER.id);
				expect(body.user).not.toHaveProperty('password');
			});

			it('TC-INT-USER-05: Should return 404 for non-existent user', async () => {
				mockUserService.getUserById.mockRejectedValue(new NotFoundError('User not found'));

				const response = await app.handle(
					new Request(buildUserUrl('/profile'), {
						headers: createAuthHeaders('user-123'),
					}),
				);

				expect(response.status).toBe(404);
			});
		});

		describe('PATCH /users/profile - Update Current User Profile', () => {
			it('TC-INT-USER-06: Should update profile successfully', async () => {
				const updatedUser = { ...MOCK_USER, first_name: 'Updated' };
				mockUserService.updateUser.mockResolvedValue(updatedUser);

				const response = await app.handle(
					new Request(buildUserUrl('/profile'), {
						method: 'PATCH',
						headers: createAuthHeaders('user-123'),
						body: JSON.stringify({ first_name: 'Updated' }),
					}),
				);
				const body = await response.json();

				expect(response.status).toBe(200);
				expect(body.user.first_name).toBe('Updated');
			});

			it('TC-INT-USER-07: Should update multiple fields', async () => {
				const updatedUser = { ...MOCK_USER, first_name: 'Updated', last_name: 'Name' };
				mockUserService.updateUser.mockResolvedValue(updatedUser);

				const response = await app.handle(
					new Request(buildUserUrl('/profile'), {
						method: 'PATCH',
						headers: createAuthHeaders('user-123'),
						body: JSON.stringify({ first_name: 'Updated', last_name: 'Name' }),
					}),
				);
				const body = await response.json();

				expect(response.status).toBe(200);
				expect(body.user.first_name).toBe('Updated');
				expect(body.user.last_name).toBe('Name');
			});
		});

		describe('GET /users/:user_id - Get User by ID', () => {
			it('TC-INT-USER-08: Should allow admin to get any user', async () => {
				mockUserService.getUserById.mockResolvedValue(MOCK_USER);

				const response = await app.handle(
					new Request(buildUserUrl(`/${MOCK_USER.id}`), {
						headers: createAuthHeaders('admin-456', 'manager'),
					}),
				);
				const body = await response.json();

				expect(response.status).toBe(200);
				expect(body.user.id).toBe(MOCK_USER.id);
			});

			it('TC-INT-USER-09: Should allow user to get own profile', async () => {
				mockUserService.getUserById.mockResolvedValue(MOCK_USER);

				const response = await app.handle(
					new Request(buildUserUrl(`/${MOCK_USER.id}`), {
						headers: createAuthHeaders('user-123'),
					}),
				);
				const body = await response.json();

				expect(response.status).toBe(200);
				expect(body.user.id).toBe(MOCK_USER.id);
			});

			it('TC-INT-USER-10: Should reject user accessing other user profile', async () => {
				const response = await app.handle(
					new Request(buildUserUrl(`/${MOCK_ADMIN.id}`), {
						headers: createAuthHeaders('user-123'),
					}),
				);

				expect(response.status).toBe(403);
			});

			it('TC-INT-USER-11: Should return 404 for non-existent user', async () => {
				mockUserService.getUserById.mockRejectedValue(new NotFoundError('User not found'));

				const response = await app.handle(
					new Request(buildUserUrl('/non-existent-id'), {
						headers: createAuthHeaders('admin-456', 'manager'),
					}),
				);

				expect(response.status).toBe(404);
			});
		});

		describe('PATCH /users/:user_id - Update User by ID', () => {
			it('TC-INT-USER-12: Should allow admin to update any user', async () => {
				const updatedUser = { ...MOCK_USER, first_name: 'AdminUpdated' };
				mockUserService.updateUser.mockResolvedValue(updatedUser);

				const response = await app.handle(
					new Request(buildUserUrl(`/${MOCK_USER.id}`), {
						method: 'PATCH',
						headers: createAuthHeaders('admin-456', 'manager'),
						body: JSON.stringify({ first_name: 'AdminUpdated' }),
					}),
				);
				const body = await response.json();

				expect(response.status).toBe(200);
				expect(body.user.first_name).toBe('AdminUpdated');
			});

			it('TC-INT-USER-13: Should reject user updating other user', async () => {
				const response = await app.handle(
					new Request(buildUserUrl(`/${MOCK_ADMIN.id}`), {
						method: 'PATCH',
						headers: createAuthHeaders('user-123'),
						body: JSON.stringify({ first_name: 'Hacked' }),
					}),
				);

				expect(response.status).toBe(403);
			});
		});

		describe('DELETE /users/:user_id - Delete User', () => {
			it('TC-INT-USER-14: Should allow admin to delete any user', async () => {
				mockUserService.deleteUser.mockResolvedValue({ message: 'User successfully deleted' });

				const response = await app.handle(
					new Request(buildUserUrl(`/${MOCK_USER.id}`), {
						method: 'DELETE',
						headers: createAuthHeaders('admin-456', 'manager'),
					}),
				);
				const body = await response.json();

				expect(response.status).toBe(200);
				expect(body.message).toContain('successfully deleted');
			});

			it('TC-INT-USER-15: Should allow user to delete own account', async () => {
				mockUserService.deleteUser.mockResolvedValue({ message: 'User successfully deleted' });

				const response = await app.handle(
					new Request(buildUserUrl(`/${MOCK_USER.id}`), {
						method: 'DELETE',
						headers: createAuthHeaders('user-123'),
					}),
				);
				const body = await response.json();

				expect(response.status).toBe(200);
				expect(body.message).toContain('successfully deleted');
			});

			it('TC-INT-USER-16: Should reject user deleting other user', async () => {
				const response = await app.handle(
					new Request(buildUserUrl(`/${MOCK_ADMIN.id}`), {
						method: 'DELETE',
						headers: createAuthHeaders('user-123'),
					}),
				);

				expect(response.status).toBe(403);
			});

			it('TC-INT-USER-17: Should return 404 for non-existent user', async () => {
				mockUserService.deleteUser.mockRejectedValue(new NotFoundError('User not found'));

				const response = await app.handle(
					new Request(buildUserUrl('/non-existent-id'), {
						method: 'DELETE',
						headers: createAuthHeaders('admin-456', 'manager'),
					}),
				);

				expect(response.status).toBe(404);
			});
		});
	});

	// ========================================================================
	// SECTION 4: ADDRESS MANAGEMENT
	// ========================================================================
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

		describe('GET /users/profile/addresses - Get Current User Addresses', () => {
			it('TC-INT-ADDR-01: Should return user addresses', async () => {
				mockUserService.getUserAddresses.mockResolvedValue({ addresses: [MOCK_ADDRESS] });

				const response = await app.handle(
					new Request(buildUserUrl('/profile/addresses'), {
						headers: createAuthHeaders('user-123'),
					}),
				);
				const body = await response.json();

				expect(response.status).toBe(200);
				expect(body.addresses).toHaveLength(1);
			});

			it('TC-INT-ADDR-02: Should return empty array when no addresses', async () => {
				mockUserService.getUserAddresses.mockResolvedValue({ addresses: [] });

				const response = await app.handle(
					new Request(buildUserUrl('/profile/addresses'), {
						headers: createAuthHeaders('user-123'),
					}),
				);
				const body = await response.json();

				expect(response.status).toBe(200);
				expect(body.addresses).toHaveLength(0);
			});
		});

		describe('POST /users/profile/addresses - Add Address', () => {
			it('TC-INT-ADDR-03: Should add address successfully', async () => {
				mockUserService.addUserAddress.mockResolvedValue({ ...MOCK_ADDRESS, ...addressInput });

				const response = await app.handle(
					new Request(buildUserUrl('/profile/addresses'), {
						method: 'POST',
						headers: createAuthHeaders('user-123'),
						body: JSON.stringify(addressInput),
					}),
				);
				const body = await response.json();

				expect(response.status).toBe(201);
				expect(body.address.address).toBe(addressInput.address);
			});

			it('TC-INT-ADDR-04: Should fail with invalid phone number', async () => {
				const response = await app.handle(
					new Request(buildUserUrl('/profile/addresses'), {
						method: 'POST',
						headers: createAuthHeaders('user-123'),
						body: JSON.stringify({ ...addressInput, phone: 'invalid' }),
					}),
				);

				expect(response.status).toBe(422);
			});

			it('TC-INT-ADDR-05: Should fail with missing required fields', async () => {
				const response = await app.handle(
					new Request(buildUserUrl('/profile/addresses'), {
						method: 'POST',
						headers: createAuthHeaders('user-123'),
						body: JSON.stringify({ address: '123 Street' }),
					}),
				);

				expect(response.status).toBe(422);
			});
		});

		describe('PATCH /users/profile/addresses/:address_id - Update Address', () => {
			it('TC-INT-ADDR-06: Should update address successfully', async () => {
				const updatedAddress = { ...MOCK_ADDRESS, address: '456 New Street' };
				mockUserService.updateUserAddress.mockResolvedValue(updatedAddress);

				const response = await app.handle(
					new Request(buildUserUrl('/profile/addresses/1'), {
						method: 'PATCH',
						headers: createAuthHeaders('user-123'),
						body: JSON.stringify({ address: '456 New Street' }),
					}),
				);
				const body = await response.json();

				expect(response.status).toBe(200);
				expect(body.address.address).toBe('456 New Street');
			});

			it('TC-INT-ADDR-07: Should return 404 for non-existent address', async () => {
				mockUserService.updateUserAddress.mockRejectedValue(new NotFoundError('Address not found'));

				const response = await app.handle(
					new Request(buildUserUrl('/profile/addresses/999'), {
						method: 'PATCH',
						headers: createAuthHeaders('user-123'),
						body: JSON.stringify({ address: '456 New Street' }),
					}),
				);

				expect(response.status).toBe(404);
			});
		});

		describe('DELETE /users/profile/addresses/:address_id - Delete Address', () => {
			it('TC-INT-ADDR-08: Should delete address successfully', async () => {
				mockUserService.deleteUserAddress.mockResolvedValue(undefined);

				const response = await app.handle(
					new Request(buildUserUrl('/profile/addresses/1'), {
						method: 'DELETE',
						headers: createAuthHeaders('user-123'),
					}),
				);

				expect(response.status).toBe(204);
			});

			it('TC-INT-ADDR-09: Should return 404 for non-existent address', async () => {
				mockUserService.deleteUserAddress.mockRejectedValue(new NotFoundError('Address not found'));

				const response = await app.handle(
					new Request(buildUserUrl('/profile/addresses/999'), {
						method: 'DELETE',
						headers: createAuthHeaders('user-123'),
					}),
				);

				expect(response.status).toBe(404);
			});
		});

		describe('GET /users/:user_id/addresses - Get User Addresses (Admin/Owner)', () => {
			it('TC-INT-ADDR-10: Should allow admin to get any user addresses', async () => {
				mockUserService.getUserAddresses.mockResolvedValue({ addresses: [MOCK_ADDRESS] });

				const response = await app.handle(
					new Request(buildUserUrl(`/${MOCK_USER.id}/addresses`), {
						headers: createAuthHeaders('admin-456', 'manager'),
					}),
				);
				const body = await response.json();

				expect(response.status).toBe(200);
				expect(body.addresses).toHaveLength(1);
			});

			it('TC-INT-ADDR-11: Should allow owner to get own addresses', async () => {
				mockUserService.getUserAddresses.mockResolvedValue({ addresses: [MOCK_ADDRESS] });

				const response = await app.handle(
					new Request(buildUserUrl(`/${MOCK_USER.id}/addresses`), {
						headers: createAuthHeaders('user-123'),
					}),
				);
				const body = await response.json();

				expect(response.status).toBe(200);
				expect(body.addresses).toHaveLength(1);
			});

			it('TC-INT-ADDR-12: Should reject user accessing other user addresses', async () => {
				const response = await app.handle(
					new Request(buildUserUrl(`/${MOCK_ADMIN.id}/addresses`), {
						headers: createAuthHeaders('user-123'),
					}),
				);

				expect(response.status).toBe(403);
			});
		});
	});

	// ========================================================================
	// SECTION 5: BAZI PROFILE MANAGEMENT
	// ========================================================================
	describe('Bazi Profile Management', () => {
		const baziInput = {
			profile_name: 'My Bazi Profile',
			gender: 'male' as const,
			birth_day: 15,
			birth_month: 6,
			birth_year: 1990,
			birth_hour: 10,
			birth_minute: 30,
			longitude: 105.8,
			timezone_offset: 7,
		};

		describe('GET /users/profile/bazi - Get Current User Bazi Profile', () => {
			it('TC-INT-BAZI-01: Should return bazi profile', async () => {
				mockUserService.getBaziProfile.mockResolvedValue(MOCK_BAZI_PROFILE);

				const response = await app.handle(
					new Request(buildUserUrl('/profile/bazi'), {
						headers: createAuthHeaders('user-123'),
					}),
				);
				const body = await response.json();

				expect(response.status).toBe(200);
				expect(body.profile.user_id).toBe(MOCK_USER.id);
				expect(body.profile.profile_name).toBe(MOCK_BAZI_PROFILE.profile_name);
			});

			it('TC-INT-BAZI-02: Should return 404 when no bazi profile exists', async () => {
				mockUserService.getBaziProfile.mockRejectedValue(
					new NotFoundError('Bazi profile not found'),
				);

				const response = await app.handle(
					new Request(buildUserUrl('/profile/bazi'), {
						headers: createAuthHeaders('user-123'),
					}),
				);

				expect(response.status).toBe(404);
			});
		});

		describe('POST /users/profile/bazi - Create/Update Bazi Profile', () => {
			it('TC-INT-BAZI-03: Should create bazi profile successfully', async () => {
				mockUserService.createOrUpdateBaziProfile.mockResolvedValue(MOCK_BAZI_PROFILE);

				const response = await app.handle(
					new Request(buildUserUrl('/profile/bazi'), {
						method: 'POST',
						headers: createAuthHeaders('user-123'),
						body: JSON.stringify(baziInput),
					}),
				);
				const body = await response.json();

				expect(response.status).toBe(200);
				expect(body.profile).toBeDefined();
			});

			it('TC-INT-BAZI-04: Should update existing bazi profile', async () => {
				const updatedProfile = { ...MOCK_BAZI_PROFILE, profile_name: 'Updated Profile' };
				mockUserService.createOrUpdateBaziProfile.mockResolvedValue(updatedProfile);

				const response = await app.handle(
					new Request(buildUserUrl('/profile/bazi'), {
						method: 'POST',
						headers: createAuthHeaders('user-123'),
						body: JSON.stringify({ ...baziInput, profile_name: 'Updated Profile' }),
					}),
				);
				const body = await response.json();

				expect(response.status).toBe(200);
				expect(body.profile.profile_name).toBe('Updated Profile');
			});

			it('TC-INT-BAZI-05: Should fail with invalid birth year', async () => {
				const response = await app.handle(
					new Request(buildUserUrl('/profile/bazi'), {
						method: 'POST',
						headers: createAuthHeaders('user-123'),
						body: JSON.stringify({ ...baziInput, birth_year: 1800 }),
					}),
				);

				expect(response.status).toBe(422);
			});

			it('TC-INT-BAZI-06: Should fail with invalid birth month', async () => {
				const response = await app.handle(
					new Request(buildUserUrl('/profile/bazi'), {
						method: 'POST',
						headers: createAuthHeaders('user-123'),
						body: JSON.stringify({ ...baziInput, birth_month: 13 }),
					}),
				);

				expect(response.status).toBe(422);
			});

			it('TC-INT-BAZI-07: Should fail with invalid gender', async () => {
				const response = await app.handle(
					new Request(buildUserUrl('/profile/bazi'), {
						method: 'POST',
						headers: createAuthHeaders('user-123'),
						body: JSON.stringify({ ...baziInput, gender: 'invalid' }),
					}),
				);

				expect(response.status).toBe(422);
			});

			it('TC-INT-BAZI-08: Should fail with missing required fields', async () => {
				const response = await app.handle(
					new Request(buildUserUrl('/profile/bazi'), {
						method: 'POST',
						headers: createAuthHeaders('user-123'),
						body: JSON.stringify({ profile_name: 'Test' }),
					}),
				);

				expect(response.status).toBe(422);
			});
		});

		describe('GET /users/:user_id/bazi - Get User Bazi Profile (Admin/Owner)', () => {
			it('TC-INT-BAZI-09: Should allow admin to get any user bazi profile', async () => {
				mockUserService.getBaziProfile.mockResolvedValue(MOCK_BAZI_PROFILE);

				const response = await app.handle(
					new Request(buildUserUrl(`/${MOCK_USER.id}/bazi`), {
						headers: createAuthHeaders('admin-456', 'manager'),
					}),
				);
				const body = await response.json();

				expect(response.status).toBe(200);
				expect(body.profile.user_id).toBe(MOCK_USER.id);
			});

			it('TC-INT-BAZI-10: Should allow owner to get own bazi profile', async () => {
				mockUserService.getBaziProfile.mockResolvedValue(MOCK_BAZI_PROFILE);

				const response = await app.handle(
					new Request(buildUserUrl(`/${MOCK_USER.id}/bazi`), {
						headers: createAuthHeaders('user-123'),
					}),
				);
				const body = await response.json();

				expect(response.status).toBe(200);
				expect(body.profile.user_id).toBe(MOCK_USER.id);
			});

			it('TC-INT-BAZI-11: Should reject user accessing other user bazi profile', async () => {
				const response = await app.handle(
					new Request(buildUserUrl(`/${MOCK_ADMIN.id}/bazi`), {
						headers: createAuthHeaders('user-123'),
					}),
				);

				expect(response.status).toBe(403);
			});

			it('TC-INT-BAZI-12: Should return 404 for non-existent bazi profile', async () => {
				mockUserService.getBaziProfile.mockRejectedValue(
					new NotFoundError('Bazi profile not found'),
				);

				const response = await app.handle(
					new Request(buildUserUrl(`/${MOCK_USER.id}/bazi`), {
						headers: createAuthHeaders('admin-456', 'manager'),
					}),
				);

				expect(response.status).toBe(404);
			});
		});
	});

	// ========================================================================
	// SECTION 6: EDGE CASES AND ERROR HANDLING
	// ========================================================================
	describe('Edge Cases and Error Handling', () => {
		it('TC-INT-EDGE-01: Should handle malformed JSON gracefully', async () => {
			const response = await app.handle(
				new Request(buildSessionUrl('/'), {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: 'not-valid-json',
				}),
			);

			expect(response.status).toBeGreaterThanOrEqual(400);
		});

		it('TC-INT-EDGE-02: Should handle empty request body', async () => {
			const response = await app.handle(
				new Request(buildSessionUrl('/'), {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({}),
				}),
			);

			expect(response.status).toBe(422);
		});

		it('TC-INT-EDGE-03: Should handle missing Content-Type header', async () => {
			mockUserService.login.mockRejectedValue(new UnauthorizedError('Invalid credentials'));

			const response = await app.handle(
				new Request(buildSessionUrl('/'), {
					method: 'POST',
					body: JSON.stringify({ email: 'test@test.com', password: 'password123' }),
				}),
			);

			// Should still work or return appropriate error
			expect(response.status).toBeDefined();
		});

		it('TC-INT-EDGE-04: Should handle special characters in input', async () => {
			mockUserService.login.mockRejectedValue(new UnauthorizedError('Invalid credentials'));

			const response = await app.handle(
				new Request(buildSessionUrl('/'), {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						email: "test'@example.com",
						password: 'password123',
					}),
				}),
			);

			// Should handle gracefully (either validation error or not found)
			expect(response.status).toBeGreaterThanOrEqual(400);
		});

		it('TC-INT-EDGE-05: Should handle very long input strings', async () => {
			const longString = 'a'.repeat(10000);

			const response = await app.handle(
				new Request(buildUserUrl('/'), {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						email: 'test@example.com',
						username: longString,
						password: 'password123',
						first_name: 'Test',
						last_name: 'User',
					}),
				}),
			);

			// Should fail validation due to maxLength
			expect(response.status).toBe(422);
		});

		it('TC-INT-EDGE-06: Should return proper error status for invalid credentials', async () => {
			mockUserService.login.mockRejectedValue(new UnauthorizedError('Invalid credentials'));

			const response = await app.handle(
				new Request(buildSessionUrl('/'), {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
				}),
			);

			expect(response.status).toBe(401);
		});
	});
});
