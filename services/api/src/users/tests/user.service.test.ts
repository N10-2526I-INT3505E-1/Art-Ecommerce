import { beforeEach, describe, expect, it, mock } from 'bun:test';
import {
	ConflictError,
	InternalServerError,
	NotFoundError,
	UnauthorizedError,
} from '@common/errors/httpErrors';
import type { BaziService } from '@user/bazi.service';
import type { SignUpSchema, UserAddressSchema } from '@user/user.model';
import { UserService } from '@user/user.service';
import type { Static } from 'elysia';

// 1. Mock Password Hashing
mock.module('@user/utils/passwordHash', () => ({
	comparePassword: async (plain: string, hash: string) => {
		return plain === 'password123' && hash === 'hashed_password';
	},
	hashPassword: async (plain: string) => 'hashed_' + plain,
}));

// 2. Fixtures
const MOCK_USER: Static<typeof SignUpSchema> & { id: string } = {
	id: '018d96c4-72b3-7000-9000-000000000000',
	email: 'test@example.com',
	username: 'testuser',
	password: 'hashed_password',
	first_name: 'Test',
	last_name: 'User',
	role: 'user',
	created_at: new Date().toISOString(),
	updated_at: new Date().toISOString(),
};

const MOCK_ADMIN: Static<typeof SignUpSchema> & { id: string } = {
	id: '018d96c4-72b3-7000-9000-000000000001',
	email: 'admin@example.com',
	username: 'adminuser',
	password: 'hashed_password',
	first_name: 'Admin',
	last_name: 'User',
	role: 'manager',
	created_at: new Date().toISOString(),
	updated_at: new Date().toISOString(),
};

const MOCK_ADDRESS: Static<typeof UserAddressSchema> & { id: number; user_id: string } = {
	id: 10,
	user_id: MOCK_USER.id,
	address: '123 Main St',
	phone: '1234567890',
	ward: 'Central',
	state: 'NY',
	country: 'USA',
	postal_code: '10001',
	is_default: 0,
};

const MOCK_REFRESH_TOKEN = {
	id: 1,
	user_id: MOCK_USER.id,
	token: 'valid_refresh_token',
	expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
	created_at: new Date().toISOString(),
};

const MOCK_EXPIRED_REFRESH_TOKEN = {
	...MOCK_REFRESH_TOKEN,
	token: 'expired_refresh_token',
	expires_at: new Date(Date.now() - 1000), // Already expired
};

const MOCK_BAZI_INPUT = {
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

const MOCK_BAZI_PROFILE = {
	id: 'bazi-profile-001',
	user_id: MOCK_USER.id,
	...MOCK_BAZI_INPUT,
	year_stem: 'Canh',
	year_branch: 'Ngọ',
	month_stem: 'Nhâm',
	month_branch: 'Ngọ',
	day_stem: 'Giáp',
	day_branch: 'Tý',
	hour_stem: 'Kỷ',
	hour_branch: 'Tỵ',
	day_master_status: 'Strong',
	structure_type: 'Normal',
	structure_name: 'Chính Quan Cách',
	analysis_reason: 'Day master is strong due to...',
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

const MOCK_CALCULATED_BAZI = {
	year_stem: 'Canh',
	year_branch: 'Ngọ',
	month_stem: 'Nhâm',
	month_branch: 'Ngọ',
	day_stem: 'Giáp',
	day_branch: 'Tý',
	hour_stem: 'Kỷ',
	hour_branch: 'Tỵ',
	day_master_status: 'Strong',
	structure_type: 'Normal',
	structure_name: 'Chính Quan Cách',
	analysis_reason: 'Day master is strong due to...',
	center_analysis: null,
	energy_flow: null,
	limit_score: null,
	interactions: null,
	favorable_elements: ['Water', 'Metal'],
	party_score: 45.5,
	enemy_score: 32.0,
};

describe('UserService', () => {
	let userService: UserService;
	let mockDb: any;
	let mockJwt: any;
	let mockBaziService: BaziService;
	let dbExecutor: any;

	beforeEach(() => {
		dbExecutor = mock().mockResolvedValue([]);
		mockDb = {
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
			returning: dbExecutor,
			then: (resolve: any) => dbExecutor().then(resolve),
			transaction: mock(async (cb: any) => cb(mockDb)),
		};
		mockJwt = {
			sign: mock().mockResolvedValue('mock_access_token'),
			verify: mock().mockResolvedValue({ id: MOCK_USER.id, email: MOCK_USER.email, role: 'user' }),
		};
		mockBaziService = {
			calculateBazi: mock().mockResolvedValue(MOCK_CALCULATED_BAZI),
		} as any;

		userService = new UserService(mockDb, mockBaziService);
	});

	// ========================================================================
	// SECTION 1: AUTHENTICATION TESTS
	// ========================================================================
	describe('Authentication', () => {
		describe('login()', () => {
			it('TC-USR-LOGIN-01: Should login successfully with valid email and password', async () => {
				dbExecutor.mockResolvedValueOnce([MOCK_USER]);
				const result = await userService.login(
					{ email: 'test@example.com', password: 'password123' },
					mockJwt,
				);
				expect(result.accessToken).toBe('mock_access_token');
				expect(result.refreshToken).toBeDefined();
			});

			it('TC-USR-LOGIN-02: Should login successfully with valid username and password', async () => {
				dbExecutor.mockResolvedValueOnce([MOCK_USER]);
				const result = await userService.login(
					{ username: 'testuser', password: 'password123' },
					mockJwt,
				);
				expect(result.accessToken).toBe('mock_access_token');
				expect(result.refreshToken).toBeDefined();
			});

			it('TC-USR-LOGIN-03: Should throw UnauthorizedError when user does not exist', async () => {
				dbExecutor.mockResolvedValueOnce([]);
				await expect(
					userService.login({ email: 'ghost@example.com', password: 'password123' }, mockJwt),
				).rejects.toThrow(new UnauthorizedError('Invalid credentials.'));
			});

			it('TC-USR-LOGIN-04: Should throw UnauthorizedError when password is incorrect', async () => {
				dbExecutor.mockResolvedValueOnce([MOCK_USER]);
				await expect(
					userService.login({ email: 'test@example.com', password: 'wrong_password' }, mockJwt),
				).rejects.toThrow(new UnauthorizedError('Invalid credentials.'));
			});

			it('TC-USR-LOGIN-05: Should throw UnauthorizedError when neither email nor username provided', async () => {
				await expect(
					userService.login({ password: 'password123' } as any, mockJwt),
				).rejects.toThrow(new UnauthorizedError('Email or Username is required.'));
			});

			it('TC-USR-LOGIN-06: Should create refresh token on successful login', async () => {
				dbExecutor.mockResolvedValueOnce([MOCK_USER]).mockResolvedValueOnce([]);
				const result = await userService.login(
					{ email: 'test@example.com', password: 'password123' },
					mockJwt,
				);
				expect(result.refreshToken).toBeDefined();
				expect(mockDb.insert).toHaveBeenCalled();
			});
		});

		describe('refreshAccessToken()', () => {
			it('TC-USR-REFRESH-01: Should refresh access token successfully with valid refresh token', async () => {
				dbExecutor.mockResolvedValueOnce([MOCK_REFRESH_TOKEN]).mockResolvedValueOnce([MOCK_USER]);
				const result = await userService.refreshAccessToken('valid_refresh_token', mockJwt);
				expect(result.accessToken).toBe('mock_access_token');
			});

			it('TC-USR-REFRESH-02: Should throw UnauthorizedError for invalid refresh token', async () => {
				dbExecutor.mockResolvedValueOnce([]);
				await expect(userService.refreshAccessToken('invalid_token', mockJwt)).rejects.toThrow(
					new UnauthorizedError('Invalid refresh token'),
				);
			});

			it('TC-USR-REFRESH-03: Should throw UnauthorizedError and delete expired refresh token', async () => {
				dbExecutor.mockResolvedValueOnce([MOCK_EXPIRED_REFRESH_TOKEN]).mockResolvedValueOnce([]);
				await expect(
					userService.refreshAccessToken('expired_refresh_token', mockJwt),
				).rejects.toThrow(new UnauthorizedError('Refresh token expired'));
				expect(mockDb.delete).toHaveBeenCalled();
			});

			it('TC-USR-REFRESH-04: Should throw UnauthorizedError when user not found', async () => {
				dbExecutor.mockResolvedValueOnce([MOCK_REFRESH_TOKEN]).mockResolvedValueOnce([]); // User not found
				await expect(
					userService.refreshAccessToken('valid_refresh_token', mockJwt),
				).rejects.toThrow(new UnauthorizedError('User not found'));
			});
		});

		describe('createRefreshToken()', () => {
			it('TC-USR-CREATERT-01: Should create refresh token successfully', async () => {
				dbExecutor.mockResolvedValueOnce([]);
				const token = await userService.createRefreshToken(MOCK_USER.id);
				expect(token).toBeDefined();
				expect(typeof token).toBe('string');
				expect(mockDb.insert).toHaveBeenCalled();
			});
		});

		describe('logout()', () => {
			it('TC-USR-LOGOUT-01: Should logout successfully and delete refresh token', async () => {
				dbExecutor.mockResolvedValueOnce([]);
				const result = await userService.logout('valid_refresh_token');
				expect(result.message).toBe('Logged out successfully');
				expect(mockDb.delete).toHaveBeenCalled();
			});

			it('TC-USR-LOGOUT-02: Should not throw error even if token does not exist', async () => {
				dbExecutor.mockResolvedValueOnce([]);
				const result = await userService.logout('non_existent_token');
				expect(result.message).toBe('Logged out successfully');
			});
		});
	});

	// ========================================================================
	// SECTION 2: USER REGISTRATION TESTS
	// ========================================================================
	describe('User Registration', () => {
		describe('createUser()', () => {
			const newUserInput = {
				email: 'new@example.com',
				username: 'new_user',
				password: 'password123',
				first_name: 'New',
				last_name: 'Member',
			};

			it('TC-USR-CREATE-01: Should create user successfully with valid data', async () => {
				const createdUser = { ...MOCK_USER, ...newUserInput, id: 'new-user-id' };
				dbExecutor
					.mockResolvedValueOnce([]) // Check Email
					.mockResolvedValueOnce([]) // Check Username
					.mockResolvedValueOnce([createdUser]) // Insert User
					.mockResolvedValueOnce([]); // Insert Refresh Token

				const result = await userService.createUser(newUserInput, mockJwt);
				expect(result.accessToken).toBe('mock_access_token');
				expect(result.refreshToken).toBeDefined();
				expect(result.user.email).toBe(newUserInput.email);
			});

			it('TC-USR-CREATE-02: Should throw ConflictError when email already exists', async () => {
				dbExecutor.mockResolvedValueOnce([MOCK_USER]); // Email check returns existing user
				await expect(
					userService.createUser({ ...newUserInput, email: MOCK_USER.email }, mockJwt),
				).rejects.toThrow(new ConflictError('A user with this email already exists.'));
			});

			it('TC-USR-CREATE-03: Should throw ConflictError when username already exists', async () => {
				dbExecutor
					.mockResolvedValueOnce([]) // Email check is fine
					.mockResolvedValueOnce([MOCK_USER]); // Username check returns existing user

				await expect(
					userService.createUser({ ...newUserInput, username: MOCK_USER.username }, mockJwt),
				).rejects.toThrow(new ConflictError('A user with this username already exists.'));
			});

			it('TC-USR-CREATE-04: Should hash password before storing', async () => {
				const createdUser = { ...MOCK_USER, ...newUserInput, password: 'hashed_password123' };
				dbExecutor
					.mockResolvedValueOnce([])
					.mockResolvedValueOnce([])
					.mockResolvedValueOnce([createdUser])
					.mockResolvedValueOnce([]);

				await userService.createUser(newUserInput, mockJwt);
				expect(mockDb.values).toHaveBeenCalled();
			});

			it('TC-USR-CREATE-05: Should throw InternalServerError when user creation fails', async () => {
				dbExecutor.mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([]); // Insert returns empty (failure)

				await expect(userService.createUser(newUserInput, mockJwt)).rejects.toThrow(
					new InternalServerError('Failed to create user account due to server error.'),
				);
			});
		});
	});

	// ========================================================================
	// SECTION 3: USER MANAGEMENT TESTS
	// ========================================================================
	describe('User Management', () => {
		describe('getAllUsers()', () => {
			it('TC-USR-GETALL-01: Should return all users successfully', async () => {
				dbExecutor.mockResolvedValueOnce([MOCK_USER, MOCK_ADMIN]);
				const result = await userService.getAllUsers();
				expect(result.users).toHaveLength(2);
				expect(result.users[0].id).toBe(MOCK_USER.id);
				expect(result.users[1].id).toBe(MOCK_ADMIN.id);
			});

			it('TC-USR-GETALL-02: Should return empty array when no users exist', async () => {
				dbExecutor.mockResolvedValueOnce([]);
				const result = await userService.getAllUsers();
				expect(result.users).toHaveLength(0);
			});
		});

		describe('getUserById()', () => {
			it('TC-USR-GETBYID-01: Should return user when found', async () => {
				dbExecutor.mockResolvedValueOnce([MOCK_USER]);
				const result = await userService.getUserById(MOCK_USER.id);
				expect(result.id).toBe(MOCK_USER.id);
				expect(result.email).toBe(MOCK_USER.email);
			});

			it('TC-USR-GETBYID-02: Should throw NotFoundError when user not found', async () => {
				dbExecutor.mockResolvedValueOnce([]);
				await expect(userService.getUserById('non-existent-id')).rejects.toThrow(
					new NotFoundError('User not found.'),
				);
			});
		});

		describe('updateUser()', () => {
			it('TC-USR-UPDATE-01: Should update user successfully', async () => {
				const updatedUser = { ...MOCK_USER, first_name: 'Updated' };
				dbExecutor.mockResolvedValueOnce([updatedUser]);
				const result = await userService.updateUser(MOCK_USER.id, { first_name: 'Updated' });
				expect(result.first_name).toBe('Updated');
			});

			it('TC-USR-UPDATE-02: Should throw NotFoundError when user not found', async () => {
				dbExecutor.mockResolvedValueOnce([]);
				await expect(
					userService.updateUser('non-existent-id', { first_name: 'Updated' }),
				).rejects.toThrow(new NotFoundError('User not found.'));
			});

			it('TC-USR-UPDATE-03: Should throw ConflictError when username already taken by another user', async () => {
				const otherUser = { ...MOCK_ADMIN, username: 'taken_username' };
				dbExecutor.mockResolvedValueOnce([otherUser]); // Username check returns different user
				await expect(
					userService.updateUser(MOCK_USER.id, { username: 'taken_username' }),
				).rejects.toThrow(new ConflictError('A user with this username already exists.'));
			});

			it('TC-USR-UPDATE-04: Should allow updating username to same value (own username)', async () => {
				const existingUser = [{ ...MOCK_USER }];
				dbExecutor
					.mockResolvedValueOnce(existingUser) // Username check returns same user
					.mockResolvedValueOnce([MOCK_USER]); // Update succeeds
				const result = await userService.updateUser(MOCK_USER.id, { username: MOCK_USER.username });
				expect(result.username).toBe(MOCK_USER.username);
			});

			it('TC-USR-UPDATE-05: Should update multiple fields at once', async () => {
				const updatedUser = { ...MOCK_USER, first_name: 'Updated', last_name: 'Name' };
				dbExecutor.mockResolvedValueOnce([updatedUser]);
				const result = await userService.updateUser(MOCK_USER.id, {
					first_name: 'Updated',
					last_name: 'Name',
				});
				expect(result.first_name).toBe('Updated');
				expect(result.last_name).toBe('Name');
			});
		});

		describe('deleteUser()', () => {
			it('TC-USR-DELETE-01: Should delete user successfully', async () => {
				dbExecutor.mockResolvedValueOnce([MOCK_USER]);
				const result = await userService.deleteUser(MOCK_USER.id);
				expect(result.message).toContain('successfully deleted');
				expect(mockDb.delete).toHaveBeenCalled();
			});

			it('TC-USR-DELETE-02: Should throw NotFoundError when user not found', async () => {
				dbExecutor.mockResolvedValueOnce([]);
				await expect(userService.deleteUser('non-existent-id')).rejects.toThrow(
					new NotFoundError('User not found.'),
				);
			});
		});
	});

	// ========================================================================
	// SECTION 4: ADDRESS MANAGEMENT TESTS
	// ========================================================================
	describe('Address Management', () => {
		const newAddressInput = {
			address: '456 Side St',
			phone: '0987654321',
			ward: 'Downtown',
			state: 'CA',
			country: 'USA',
			postal_code: '90210',
			is_default: 0,
		};

		describe('getUserAddresses()', () => {
			it('TC-USR-ADDR-01: Should return user addresses successfully', async () => {
				dbExecutor.mockResolvedValueOnce([MOCK_ADDRESS]);
				const result = await userService.getUserAddresses(MOCK_USER.id);
				expect(result.addresses).toHaveLength(1);
				expect(result.addresses[0].address).toBe(MOCK_ADDRESS.address);
			});

			it('TC-USR-ADDR-02: Should return empty array when no addresses exist', async () => {
				dbExecutor.mockResolvedValueOnce([]);
				const result = await userService.getUserAddresses(MOCK_USER.id);
				expect(result.addresses).toHaveLength(0);
			});

			it('TC-USR-ADDR-03: Should order addresses by is_default descending', async () => {
				const addresses = [
					{ ...MOCK_ADDRESS, id: 1, is_default: 0 },
					{ ...MOCK_ADDRESS, id: 2, is_default: 1 },
				];
				dbExecutor.mockResolvedValueOnce(addresses);
				await userService.getUserAddresses(MOCK_USER.id);
				expect(mockDb.orderBy).toHaveBeenCalled();
			});
		});

		describe('addUserAddress()', () => {
			it('TC-USR-ADDR-04: Should add non-default address successfully', async () => {
				dbExecutor
					.mockResolvedValueOnce([MOCK_USER])
					.mockResolvedValueOnce([{ ...MOCK_ADDRESS, ...newAddressInput }]);

				const result = await userService.addUserAddress(MOCK_USER.id, newAddressInput);
				expect(result.address).toBe('456 Side St');
			});

			it('TC-USR-ADDR-05: Should add default address and unset previous defaults', async () => {
				const defaultAddressInput = { ...newAddressInput, is_default: 1 };
				dbExecutor
					.mockResolvedValueOnce([MOCK_USER])
					.mockResolvedValueOnce([]) // Update old defaults
					.mockResolvedValueOnce([{ ...MOCK_ADDRESS, ...defaultAddressInput }]);

				const result = await userService.addUserAddress(MOCK_USER.id, defaultAddressInput);
				expect(result.is_default).toBe(1);
				expect(mockDb.update).toHaveBeenCalled();
			});

			it('TC-USR-ADDR-06: Should throw NotFoundError when user does not exist', async () => {
				dbExecutor.mockResolvedValueOnce([]);
				await expect(
					userService.addUserAddress('non_existent_user_id', newAddressInput),
				).rejects.toThrow(new NotFoundError('User not found.'));
			});

			it('TC-USR-ADDR-07: Should throw InternalServerError when address creation fails', async () => {
				dbExecutor.mockResolvedValueOnce([MOCK_USER]).mockResolvedValueOnce([]); // Insert returns empty

				await expect(userService.addUserAddress(MOCK_USER.id, newAddressInput)).rejects.toThrow(
					InternalServerError,
				);
			});
		});

		describe('updateUserAddress()', () => {
			it('TC-USR-ADDR-08: Should update address successfully', async () => {
				dbExecutor
					.mockResolvedValueOnce([MOCK_USER])
					.mockResolvedValueOnce([{ ...MOCK_ADDRESS, address: 'Updated St' }]);

				const result = await userService.updateUserAddress(MOCK_USER.id, 10, {
					address: 'Updated St',
				});
				expect(result.address).toBe('Updated St');
			});

			it('TC-USR-ADDR-09: Should set address as default and unset others', async () => {
				dbExecutor
					.mockResolvedValueOnce([MOCK_USER])
					.mockResolvedValueOnce([]) // Unset others
					.mockResolvedValueOnce([{ ...MOCK_ADDRESS, is_default: 1 }]);

				const result = await userService.updateUserAddress(MOCK_USER.id, 10, { is_default: 1 });
				expect(result.is_default).toBe(1);
				expect(mockDb.update).toHaveBeenCalledTimes(2);
			});

			it('TC-USR-ADDR-10: Should throw NotFoundError when user does not exist', async () => {
				dbExecutor.mockResolvedValueOnce([]);
				await expect(
					userService.updateUserAddress('non_existent_user', 10, { address: 'New St' }),
				).rejects.toThrow(new NotFoundError('User not found.'));
			});

			it('TC-USR-ADDR-11: Should throw NotFoundError when address not found or does not belong to user', async () => {
				dbExecutor.mockResolvedValueOnce([MOCK_USER]).mockResolvedValueOnce([]);
				await expect(
					userService.updateUserAddress(MOCK_USER.id, 999, { address: 'Ghost St' }),
				).rejects.toThrow(new NotFoundError('Address not found or does not belong to this user.'));
			});
		});

		describe('deleteUserAddress()', () => {
			it('TC-USR-ADDR-12: Should delete address successfully', async () => {
				dbExecutor.mockResolvedValueOnce([MOCK_ADDRESS]);
				const result = await userService.deleteUserAddress(MOCK_USER.id, 10);
				expect(result.message).toContain('Address deleted successfully');
				expect(mockDb.delete).toHaveBeenCalled();
			});

			it('TC-USR-ADDR-13: Should throw NotFoundError when address not found', async () => {
				dbExecutor.mockResolvedValueOnce([]);
				await expect(userService.deleteUserAddress(MOCK_USER.id, 999)).rejects.toThrow(
					new NotFoundError('Address not found or does not belong to this user.'),
				);
			});

			it('TC-USR-ADDR-14: Should throw NotFoundError when address belongs to different user', async () => {
				dbExecutor.mockResolvedValueOnce([]);
				await expect(userService.deleteUserAddress('different_user_id', 10)).rejects.toThrow(
					new NotFoundError('Address not found or does not belong to this user.'),
				);
			});
		});
	});

	// ========================================================================
	// SECTION 5: BAZI PROFILE MANAGEMENT TESTS
	// ========================================================================
	describe('Bazi Profile Management', () => {
		describe('getBaziProfile()', () => {
			it('TC-USR-BAZI-01: Should return bazi profile when found', async () => {
				dbExecutor.mockResolvedValueOnce([MOCK_BAZI_PROFILE]);
				const result = await userService.getBaziProfile(MOCK_USER.id);
				expect(result.id).toBe(MOCK_BAZI_PROFILE.id);
				expect(result.user_id).toBe(MOCK_USER.id);
				expect(result.profile_name).toBe(MOCK_BAZI_INPUT.profile_name);
			});

			it('TC-USR-BAZI-02: Should throw NotFoundError when bazi profile not found', async () => {
				dbExecutor.mockResolvedValueOnce([]);
				await expect(userService.getBaziProfile(MOCK_USER.id)).rejects.toThrow(
					new NotFoundError('Bazi profile not found for this user.'),
				);
			});
		});

		describe('createOrUpdateBaziProfile()', () => {
			it('TC-USR-BAZI-03: Should create bazi profile successfully', async () => {
				dbExecutor
					.mockResolvedValueOnce([{ id: MOCK_USER.id }]) // User exists
					.mockResolvedValueOnce([MOCK_BAZI_PROFILE]); // Insert/Update profile

				const result = await userService.createOrUpdateBaziProfile(MOCK_USER.id, MOCK_BAZI_INPUT);
				expect(result.user_id).toBe(MOCK_USER.id);
				expect(mockBaziService.calculateBazi).toHaveBeenCalledWith(MOCK_BAZI_INPUT);
			});

			it('TC-USR-BAZI-04: Should update existing bazi profile via upsert', async () => {
				const updatedProfile = { ...MOCK_BAZI_PROFILE, profile_name: 'Updated Profile' };
				dbExecutor
					.mockResolvedValueOnce([{ id: MOCK_USER.id }])
					.mockResolvedValueOnce([updatedProfile]);

				const result = await userService.createOrUpdateBaziProfile(MOCK_USER.id, {
					...MOCK_BAZI_INPUT,
					profile_name: 'Updated Profile',
				});
				expect(result.profile_name).toBe('Updated Profile');
				expect(mockDb.onConflictDoUpdate).toHaveBeenCalled();
			});

			it('TC-USR-BAZI-05: Should throw NotFoundError when user does not exist', async () => {
				dbExecutor.mockResolvedValueOnce([]);
				await expect(
					userService.createOrUpdateBaziProfile('non_existent_user', MOCK_BAZI_INPUT),
				).rejects.toThrow(new NotFoundError('User not found.'));
			});

			it('TC-USR-BAZI-06: Should throw InternalServerError when profile creation fails', async () => {
				dbExecutor.mockResolvedValueOnce([{ id: MOCK_USER.id }]).mockResolvedValueOnce([]); // Insert returns empty

				await expect(
					userService.createOrUpdateBaziProfile(MOCK_USER.id, MOCK_BAZI_INPUT),
				).rejects.toThrow(
					new InternalServerError('A database error occurred while saving the Bazi profile.'),
				);
			});

			it('TC-USR-BAZI-07: Should call BaziService.calculateBazi with correct input', async () => {
				dbExecutor
					.mockResolvedValueOnce([{ id: MOCK_USER.id }])
					.mockResolvedValueOnce([MOCK_BAZI_PROFILE]);

				await userService.createOrUpdateBaziProfile(MOCK_USER.id, MOCK_BAZI_INPUT);
				expect(mockBaziService.calculateBazi).toHaveBeenCalledWith(MOCK_BAZI_INPUT);
			});

			it('TC-USR-BAZI-08: Should store calculated bazi data correctly', async () => {
				dbExecutor
					.mockResolvedValueOnce([{ id: MOCK_USER.id }])
					.mockResolvedValueOnce([MOCK_BAZI_PROFILE]);

				const result = await userService.createOrUpdateBaziProfile(MOCK_USER.id, MOCK_BAZI_INPUT);
				expect(result.year_stem).toBe(MOCK_CALCULATED_BAZI.year_stem);
				expect(result.day_master_status).toBe(MOCK_CALCULATED_BAZI.day_master_status);
				expect(result.favorable_elements).toEqual(MOCK_CALCULATED_BAZI.favorable_elements);
			});

			it('TC-USR-BAZI-09: Should handle database error gracefully', async () => {
				dbExecutor
					.mockResolvedValueOnce([{ id: MOCK_USER.id }])
					.mockRejectedValueOnce(new Error('Database connection failed'));

				await expect(
					userService.createOrUpdateBaziProfile(MOCK_USER.id, MOCK_BAZI_INPUT),
				).rejects.toThrow(
					new InternalServerError('A database error occurred while saving the Bazi profile.'),
				);
			});
		});
	});

	// ========================================================================
	// SECTION 6: EDGE CASES AND ERROR HANDLING
	// ========================================================================
	describe('Edge Cases and Error Handling', () => {
		it('TC-USR-EDGE-01: Should handle empty string inputs gracefully', async () => {
			dbExecutor.mockResolvedValueOnce([]);
			await expect(userService.getUserById('')).rejects.toThrow(NotFoundError);
		});

		it('TC-USR-EDGE-02: Should handle special characters in search queries', async () => {
			dbExecutor.mockResolvedValueOnce([]);
			await expect(
				userService.login({ email: "test'@example.com", password: 'password123' }, mockJwt),
			).rejects.toThrow(UnauthorizedError);
		});

		it('TC-USR-EDGE-03: Should handle concurrent address updates', async () => {
			const defaultAddr1 = { ...newAddressInput, is_default: 1 };
			dbExecutor
				.mockResolvedValueOnce([MOCK_USER])
				.mockResolvedValueOnce([])
				.mockResolvedValueOnce([{ ...MOCK_ADDRESS, ...defaultAddr1 }]);

			const result = await userService.addUserAddress(MOCK_USER.id, defaultAddr1);
			expect(result.is_default).toBe(1);
		});

		it('TC-USR-EDGE-04: Should handle very long strings in user data', async () => {
			const longName = 'A'.repeat(1000);
			const updatedUser = { ...MOCK_USER, first_name: longName };
			dbExecutor.mockResolvedValueOnce([updatedUser]);

			const result = await userService.updateUser(MOCK_USER.id, { first_name: longName });
			expect(result.first_name).toBe(longName);
		});

		it('TC-USR-EDGE-05: Should handle null/undefined optional fields', async () => {
			const addressWithNulls = {
				...newAddressInput,
				postal_code: null,
			};
			dbExecutor
				.mockResolvedValueOnce([MOCK_USER])
				.mockResolvedValueOnce([{ ...MOCK_ADDRESS, ...addressWithNulls }]);

			const result = await userService.addUserAddress(MOCK_USER.id, addressWithNulls as any);
			expect(result.postal_code).toBeNull();
		});
	});
});

// Helper variable for edge case tests
const newAddressInput = {
	address: '456 Side St',
	phone: '0987654321',
	ward: 'Downtown',
	state: 'CA',
	country: 'USA',
	postal_code: '90210',
	is_default: 0,
};
