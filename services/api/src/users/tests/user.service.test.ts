import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { ConflictError, NotFoundError, UnauthorizedError } from '@common/errors/httpErrors';
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
	id: '018d96c4-72b3-7000-9000-000000000000', // Consistent UUID
	email: 'test@example.com',
	username: 'testuser',
	password: 'hashed_password',
	first_name: 'Test',
	last_name: 'User',
	role: 'user',
	created_at: new Date().toISOString(),
	updated_at: new Date().toISOString(),
};

const MOCK_ADDRESS: Static<typeof UserAddressSchema> & { id: number; user_id: string } = {
	id: 10,
	user_id: MOCK_USER.id, // Use consistent UUID
	address: '123 Main St',
	phone: '1234567890',
	ward: 'Central',
	state: 'NY',
	country: 'USA',
	postal_code: '10001',
	is_default: 0,
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
			returning: dbExecutor,
			then: (resolve: any) => dbExecutor().then(resolve),
			transaction: mock(async (cb: any) => cb(mockDb)),
		};
		mockJwt = {
			sign: mock().mockResolvedValue('mock_access_token'),
		};
		mockBaziService = {} as any;

		userService = new UserService(mockDb, mockJwt, mockBaziService);
	});

	/* Nhóm chức năng: Đăng nhập */
	describe('Đăng nhập (Login)', () => {
		it('TC-USR-01: Đăng nhập thành công với email và mật khẩu hợp lệ', async () => {
			dbExecutor.mockResolvedValue([MOCK_USER]);
			const result = await userService.login({
				email: 'test@example.com',
				password: 'password123',
			});
			expect(result.accessToken).toBe('mock_access_token');
		});

		it('TC-USR-01: Đăng nhập thành công với username và mật khẩu hợp lệ', async () => {
			dbExecutor.mockResolvedValue([MOCK_USER]);
			const result = await userService.login({ username: 'testuser', password: 'password123' });
			expect(result.accessToken).toBe('mock_access_token');
		});

		it('TC-USR-02: Đăng nhập thất bại khi user không tồn tại', async () => {
			dbExecutor.mockResolvedValue([]);
			await expect(
				userService.login({ email: 'ghost@example.com', password: 'password123' }),
			).rejects.toThrow(new UnauthorizedError('Invalid credentials.'));
		});

		it('TC-USR-02: Đăng nhập thất bại khi user tồn tại nhưng sai mật khẩu', async () => {
			dbExecutor.mockResolvedValue([MOCK_USER]); // User found
			// Password "wrong_password" will fail the comparePassword mock
			await expect(
				userService.login({ email: 'test@example.com', password: 'wrong_password' }),
			).rejects.toThrow(new UnauthorizedError('Invalid credentials.'));
		});
	});

	/* Nhóm chức năng: Tạo tài khoản */
	describe('Tạo tài khoản (Create User)', () => {
		const newUserInput = {
			email: 'new@example.com',
			username: 'new_user',
			password: 'password123',
			first_name: 'New',
			last_name: 'Member',
		};

		it('TC-USR-03: Tạo tài khoản thành công với thông tin hợp lệ', async () => {
			dbExecutor
				.mockResolvedValueOnce([]) // Check Email
				.mockResolvedValueOnce([]) // Check Username
				.mockResolvedValueOnce([{ ...MOCK_USER, ...newUserInput }]); // Insert User

			const result = await userService.createUser(newUserInput);
			expect(result.accessToken).toBe('mock_access_token');
			expect(mockDb.insert).toHaveBeenCalled();
		});

		it('TC-USR-04: Tạo tài khoản thất bại khi email đã tồn tại', async () => {
			dbExecutor.mockResolvedValueOnce([MOCK_USER]); // Email check returns an existing user
			await expect(
				userService.createUser({ ...newUserInput, email: MOCK_USER.email }),
			).rejects.toThrow(new ConflictError('A user with this email already exists.'));
		});

		it('TC-USR-04: Tạo tài khoản thất bại khi username đã tồn tại', async () => {
			dbExecutor
				.mockResolvedValueOnce([]) // Email check is fine
				.mockResolvedValueOnce([MOCK_USER]); // Username check returns an existing user

			await expect(
				userService.createUser({ ...newUserInput, username: MOCK_USER.username }),
			).rejects.toThrow(new ConflictError('A user with this username already exists.'));
		});
	});

	/* Nhóm chức năng: Quản lí địa chỉ */
	describe('Quản lí địa chỉ (Address Management)', () => {
		const newAddressInput = {
			address: '456 Side St',
			phone: '0987654321',
			ward: 'Downtown',
			state: 'CA',
			country: 'USA',
			postal_code: '90210',
			is_default: 0,
		};

		it('TC-USR-05: Lấy danh sách địa chỉ của người dùng thành công', async () => {
			dbExecutor.mockResolvedValue([MOCK_ADDRESS]);
			const result = await userService.getUserAddresses(MOCK_USER.id); // Use consistent ID
			expect(result.addresses).toHaveLength(1);
			expect(mockDb.orderBy).toHaveBeenCalled();
		});

		it('TC-USR-06: Thêm địa chỉ thường (không mặc định) thành công', async () => {
			dbExecutor
				.mockResolvedValueOnce([MOCK_USER]) // Check User exists
				.mockResolvedValueOnce([{ ...MOCK_ADDRESS, ...newAddressInput }]); // Insert Address

			const result = await userService.addUserAddress(MOCK_USER.id, newAddressInput);
			expect(result.address).toBe('456 Side St');
			expect(mockDb.update).not.toHaveBeenCalled(); // No update needed
		});

		it('TC-USR-07: Thêm địa chỉ mặc định thành công (và vô hiệu hóa các địa chỉ mặc định cũ)', async () => {
			const defaultAddressInput = { ...newAddressInput, is_default: 1 };
			dbExecutor
				.mockResolvedValueOnce([MOCK_USER]) // Check User
				.mockResolvedValueOnce([]) // Update old defaults
				.mockResolvedValueOnce([{ ...MOCK_ADDRESS, ...defaultAddressInput }]); // Insert new

			const result = await userService.addUserAddress(MOCK_USER.id, defaultAddressInput);
			expect(result.is_default).toBe(1);
			expect(mockDb.update).toHaveBeenCalledTimes(1); // Must call update
		});

		it('TC-USR-08: Thêm địa chỉ thất bại khi User không tồn tại', async () => {
			dbExecutor.mockResolvedValueOnce([]); // User check returns empty
			await expect(
				userService.addUserAddress('non_existent_user_id', newAddressInput),
			).rejects.toThrow(new NotFoundError('User not found.'));
		});

		it('TC-USR-09: Cập nhật thông tin địa chỉ hợp lệ', async () => {
			dbExecutor
				.mockResolvedValueOnce([MOCK_USER])
				.mockResolvedValueOnce([{ ...MOCK_ADDRESS, address: 'Updated St' }]);

			const result = await userService.updateUserAddress(MOCK_USER.id, 10, {
				address: 'Updated St',
			});
			expect(result.address).toBe('Updated St');
		});

		it('TC-USR-10: Cập nhật một địa chỉ thành địa chỉ mặc định', async () => {
			dbExecutor
				.mockResolvedValueOnce([MOCK_USER]) // Check User
				.mockResolvedValueOnce([]) // Transaction: Unset others
				.mockResolvedValueOnce([{ ...MOCK_ADDRESS, is_default: 1 }]); // Transaction: Set target

			const result = await userService.updateUserAddress(MOCK_USER.id, 10, { is_default: 1 });
			expect(result.is_default).toBe(1);
			expect(mockDb.update).toHaveBeenCalledTimes(2);
		});

		it('TC-USR-11: Cập nhật thất bại khi địa chỉ không tồn tại hoặc không thuộc về user', async () => {
			dbExecutor
				.mockResolvedValueOnce([MOCK_USER]) // User exists
				.mockResolvedValueOnce([]); // Update returns empty
			await expect(
				userService.updateUserAddress(MOCK_USER.id, 999, { address: 'Ghost St' }),
			).rejects.toThrow(new NotFoundError('Address not found or does not belong to this user.'));
		});

		it('TC-USR-12: Xóa địa chỉ thành công', async () => {
			dbExecutor.mockResolvedValueOnce([MOCK_ADDRESS]);
			const result = await userService.deleteUserAddress(MOCK_USER.id, 10);
			expect(result.message).toContain('Address deleted successfully');
			expect(mockDb.delete).toHaveBeenCalled();
		});

		it('TC-USR-13: Xóa địa chỉ thất bại khi địa chỉ không tồn tại', async () => {
			dbExecutor.mockResolvedValueOnce([]); // Delete returns empty
			await expect(userService.deleteUserAddress(MOCK_USER.id, 999)).rejects.toThrow(
				new NotFoundError('Address not found or does not belong to this user.'),
			);
		});
	});
});
