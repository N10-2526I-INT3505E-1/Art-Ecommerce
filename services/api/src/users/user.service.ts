// src/users/user.service.ts
import {
	ConflictError,
	InternalServerError,
	NotFoundError,
	UnauthorizedError,
} from '@common/errors/httpErrors';
import { faker } from '@faker-js/faker';
import type { BaziInput } from '@user/bazi.model';
import { baziProfilesTable } from '@user/bazi.model';
import type { BaziService } from '@user/bazi.service';
import type { LoginSchema, SignUpSchema, UserAddressSchema } from '@user/user.model';
import { refreshTokensTable, userAddressTable, usersTable } from '@user/user.model';
import { comparePassword, hashPassword } from '@user/utils/passwordHash';
import { and, desc, eq } from 'drizzle-orm';
import type { Static } from 'elysia';
import { OAuth2Client } from 'google-auth-library';

export type JwtClient = {
	sign: (payload: Record<string, string | number>) => Promise<string>;
	verify: (token: string) => Promise<Record<string, string | number> | false>;
};

type DbClient = any;

export class UserService {
	private db: DbClient;
	private googleClient: OAuth2Client;
	private baziService: BaziService;

	constructor(db: DbClient, baziService: BaziService) {
		this.db = db;
		this.baziService = baziService;
		this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || '');

		if (!this.db) {
			console.error('FATAL: Database instance passed to UserService is undefined');
		}
	}

	// SECTION 1: AUTHENTICATION (Cần JWT để Sign Token)

	async login(credentials: Static<typeof LoginSchema>, jwt: JwtClient) {
		let userFromDb;

		if (credentials.email) {
			[userFromDb] = await this.db
				.select()
				.from(usersTable)
				.where(eq(usersTable.email, credentials.email));
		} else if (credentials.username) {
			[userFromDb] = await this.db
				.select()
				.from(usersTable)
				.where(eq(usersTable.username, credentials.username));
		} else {
			throw new UnauthorizedError('Email or Username is required.');
		}

		if (!userFromDb) {
			throw new UnauthorizedError('Invalid credentials.');
		}

		const passwordMatch = await comparePassword(credentials.password, userFromDb.password);
		if (!passwordMatch) {
			throw new UnauthorizedError('Invalid credentials.');
		}

		const userPayload = { id: userFromDb.id, email: userFromDb.email, role: userFromDb.role };

		// Sử dụng instance jwt được truyền vào để ký token
		const accessToken = await jwt.sign(userPayload);
		const refreshToken = await this.createRefreshToken(userFromDb.id);

		return { accessToken, refreshToken };
	}

	async loginWithGoogle(token: string, jwt: JwtClient) {
		try {
			const ticket = await this.googleClient.verifyIdToken({
				idToken: token,
				audience: process.env.GOOGLE_CLIENT_ID,
			});
			const payload = ticket.getPayload();
			if (!payload || !payload.email) {
				throw new UnauthorizedError('Invalid Google Token');
			}

			const [userFromDb] = await this.db
				.select()
				.from(usersTable)
				.where(eq(usersTable.email, payload.email));

			if (userFromDb) {
				const userPayload = {
					id: userFromDb.id,
					email: userFromDb.email,
					role: userFromDb.role,
				};
				const accessToken = await jwt.sign(userPayload);
				const refreshToken = await this.createRefreshToken(userFromDb.id);
				return { status: 'login', accessToken, refreshToken };
			}

			// Auto-register logic
			const newPassword = Bun.randomUUIDv7();
			const funnyUsername = faker.internet.username() + Bun.randomUUIDv7().slice(0, 4);

			const newUser = await this.createUser(
				{
					email: payload.email,
					username: funnyUsername,
					password: newPassword,
					first_name: payload.given_name || 'User',
					last_name: payload.family_name || 'Name',
				},
				jwt,
			);

			return {
				status: 'login',
				accessToken: newUser.accessToken,
				refreshToken: newUser.refreshToken,
			};
		} catch (error) {
			console.error('Google login error:', error);
			throw new UnauthorizedError('Google authentication failed');
		}
	}

	async createUser(
		userData: Omit<Static<typeof SignUpSchema>, 'id' | 'role' | 'created_at' | 'updated_at'>,
		jwt: JwtClient,
	) {
		const existingEmail = await this.db
			.select()
			.from(usersTable)
			.where(eq(usersTable.email, userData.email));
		if (existingEmail.length > 0) {
			throw new ConflictError('A user with this email already exists.');
		}

		const existingUsername = await this.db
			.select()
			.from(usersTable)
			.where(eq(usersTable.username, userData.username));
		if (existingUsername.length > 0) {
			throw new ConflictError('A user with this username already exists.');
		}

		const hashedPassword = await hashPassword(userData.password);

		return await this.db.transaction(async (tx: any) => {
			const [newUser] = await tx
				.insert(usersTable)
				.values({ ...userData, password: hashedPassword })
				.returning();

			if (!newUser) {
				throw new InternalServerError('Failed to create user account due to server error.');
			}

			const userPayload = { id: newUser.id, email: newUser.email, role: newUser.role };
			const accessToken = await jwt.sign(userPayload);

			// Create refresh token within the same transaction
			const refreshToken = Bun.randomUUIDv7();
			const time_ms = 7 * 24 * 60 * 60 * 1000;
			const expiresAt = new Date(Date.now() + time_ms);

			await tx.insert(refreshTokensTable).values({
				user_id: newUser.id,
				token: refreshToken,
				expires_at: expiresAt,
			});

			return { user: newUser, accessToken, refreshToken };
		});
	}

	async refreshAccessToken(refreshToken: string, jwt: JwtClient) {
		const [storedToken] = await this.db
			.select()
			.from(refreshTokensTable)
			.where(eq(refreshTokensTable.token, refreshToken));

		if (!storedToken) {
			throw new UnauthorizedError('Invalid refresh token');
		}

		if (storedToken.expires_at < new Date()) {
			await this.db.delete(refreshTokensTable).where(eq(refreshTokensTable.token, refreshToken));
			throw new UnauthorizedError('Refresh token expired');
		}

		const [user] = await this.db
			.select()
			.from(usersTable)
			.where(eq(usersTable.id, storedToken.user_id));

		if (!user) {
			throw new UnauthorizedError('User not found');
		}

		const userPayload = { id: user.id, email: user.email, role: user.role };
		const newAccessToken = await jwt.sign(userPayload);

		return { accessToken: newAccessToken };
	}

	async createRefreshToken(userId: string) {
		const refreshToken = Bun.randomUUIDv7();
		const time_ms = 7 * 24 * 60 * 60 * 1000;
		const expiresAt = new Date(Date.now() + time_ms);

		await this.db.insert(refreshTokensTable).values({
			user_id: userId,
			token: refreshToken,
			expires_at: expiresAt,
		});

		return refreshToken;
	}

	async logout(refreshToken: string) {
		await this.db.delete(refreshTokensTable).where(eq(refreshTokensTable.token, refreshToken));
		return { message: 'Logged out successfully' };
	}

	// SECTION 2: USER MANAGEMENT (Không cần JWT)

	async getAllUsers() {
		const allUsers = await this.db.select().from(usersTable);
		return { users: allUsers };
	}

	async getUserById(id: string) {
		const [user] = await this.db.select().from(usersTable).where(eq(usersTable.id, id));
		if (!user) {
			throw new NotFoundError('User not found.');
		}
		return user;
	}

	async updateUser(id: string, userData: Partial<Static<typeof SignUpSchema>>) {
		if (userData.username) {
			const existingUsername = await this.db
				.select()
				.from(usersTable)
				.where(eq(usersTable.username, userData.username));
			if (existingUsername.length > 0 && existingUsername[0].id !== id) {
				throw new ConflictError('A user with this username already exists.');
			}
		}

		const [updatedUser] = await this.db
			.update(usersTable)
			.set(userData)
			.where(eq(usersTable.id, id))
			.returning();

		if (!updatedUser) {
			throw new NotFoundError('User not found.');
		}
		return updatedUser;
	}

	async deleteUser(id: string) {
		const [deletedUser] = await this.db.delete(usersTable).where(eq(usersTable.id, id)).returning();
		if (!deletedUser) {
			throw new NotFoundError('User not found.');
		}
		return { message: `User with ID ${id} successfully deleted.` };
	}

	// SECTION 3: ADDRESS MANAGEMENT

	async getUserAddresses(userId: string) {
		const addresses = await this.db
			.select()
			.from(userAddressTable)
			.where(eq(userAddressTable.user_id, userId))
			.orderBy(desc(userAddressTable.is_default));

		return { addresses };
	}

	async addUserAddress(
		userId: string,
		addressData: Omit<Static<typeof UserAddressSchema>, 'id' | 'user_id'>,
	) {
		const [userFromDb] = await this.db.select().from(usersTable).where(eq(usersTable.id, userId));
		if (!userFromDb) {
			throw new NotFoundError('User not found.');
		}

		try {
			const [newAddress] = await this.db.transaction(async (tx: any) => {
				if (addressData.is_default === 1) {
					await tx
						.update(userAddressTable)
						.set({ is_default: 0 })
						.where(eq(userAddressTable.user_id, userId));
				}

				const [inserted] = await tx
					.insert(userAddressTable)
					.values({ ...addressData, user_id: userId })
					.returning();

				return [inserted];
			});

			if (!newAddress) {
				throw new InternalServerError('Failed to create address.');
			}

			return newAddress;
		} catch (error) {
			console.error('Add Address Error:', error);
			throw new InternalServerError('Failed to add address due to a server error.');
		}
	}

	async updateUserAddress(
		userId: string,
		addressId: number,
		addressData: Partial<Static<typeof UserAddressSchema>>,
	) {
		const [userFromDb] = await this.db.select().from(usersTable).where(eq(usersTable.id, userId));
		if (!userFromDb) {
			throw new NotFoundError('User not found.');
		}

		try {
			const [updatedAddress] = await this.db.transaction(async (tx: any) => {
				if (addressData.is_default === 1) {
					await tx
						.update(userAddressTable)
						.set({ is_default: 0 })
						.where(eq(userAddressTable.user_id, userId));
				}

				const [result] = await tx
					.update(userAddressTable)
					.set({
						...addressData,
						updated_at: new Date().toISOString(),
					})
					.where(and(eq(userAddressTable.id, addressId), eq(userAddressTable.user_id, userId)))
					.returning();

				return [result];
			});

			if (!updatedAddress) {
				throw new NotFoundError('Address not found or does not belong to this user.');
			}

			return updatedAddress;
		} catch (error) {
			if (error instanceof NotFoundError) throw error;
			console.error('Update Address Error:', error);
			throw new InternalServerError('Failed to update address.');
		}
	}

	async deleteUserAddress(userId: string, addressId: number) {
		const [deletedAddress] = await this.db
			.delete(userAddressTable)
			.where(and(eq(userAddressTable.id, addressId), eq(userAddressTable.user_id, userId)))
			.returning();

		if (!deletedAddress) {
			throw new NotFoundError('Address not found or does not belong to this user.');
		}

		return { message: 'Address deleted successfully.' };
	}

	// SECTION 4: BAZI PROFILE MANAGEMENT

	async getBaziProfile(userId: string) {
		const [profile] = await this.db
			.select()
			.from(baziProfilesTable)
			.where(eq(baziProfilesTable.user_id, userId));

		if (!profile) {
			throw new NotFoundError('Bazi profile not found for this user.');
		}
		return profile;
	}

	async createOrUpdateBaziProfile(userId: string, baziInput: Omit<BaziInput, 'id' | 'user_id'>) {
		const [user] = await this.db
			.select({ id: usersTable.id })
			.from(usersTable)
			.where(eq(usersTable.id, userId));

		if (!user) {
			throw new NotFoundError('User not found.');
		}

		// 1. Gọi BaziService để tính toán
		const calculatedData = await this.baziService.calculateBazi(baziInput);

		// 2. Chuẩn bị dữ liệu để lưu vào DB
		// Lưu ý: Các trường JSON (center_analysis, energy_flow...) sẽ được Drizzle tự động stringify
		const dataToUpsert = {
			user_id: userId,
			// Input data
			profile_name: baziInput.profile_name,
			gender: baziInput.gender,
			birth_day: baziInput.birth_day,
			birth_month: baziInput.birth_month,
			birth_year: baziInput.birth_year,
			birth_hour: baziInput.birth_hour,
			birth_minute: baziInput.birth_minute,
			longitude: baziInput.longitude,
			timezone_offset: baziInput.timezone_offset,

			// Pillars (Text)
			year_stem: calculatedData.year_stem,
			year_branch: calculatedData.year_branch,
			month_stem: calculatedData.month_stem,
			month_branch: calculatedData.month_branch,
			day_stem: calculatedData.day_stem,
			day_branch: calculatedData.day_branch,
			hour_stem: calculatedData.hour_stem,
			hour_branch: calculatedData.hour_branch,

			// Analysis Info
			day_master_status: calculatedData.day_master_status,
			structure_type: calculatedData.structure_type,
			structure_name: calculatedData.structure_name,
			analysis_reason: calculatedData.analysis_reason,

			// Complex JSON Data
			center_analysis: calculatedData.center_analysis,
			energy_flow: calculatedData.energy_flow,
			limit_score: calculatedData.limit_score,
			interactions: calculatedData.interactions,

			// Legacy/Extra fields (Map từ kết quả mới sang)
			favorable_elements: calculatedData.favorable_elements,
			party_score: calculatedData.party_score,
			enemy_score: calculatedData.enemy_score,

			updated_at: new Date().toISOString(),
		};

		try {
			const [result] = await this.db
				.insert(baziProfilesTable)
				.values(dataToUpsert)
				.onConflictDoUpdate({
					target: baziProfilesTable.user_id,
					set: dataToUpsert, // Update toàn bộ field nếu đã tồn tại
				})
				.returning();

			if (!result) {
				throw new InternalServerError('Failed to create or update Bazi profile.');
			}
			return result;
		} catch (error) {
			console.error('Database upsert error:', error);
			throw new InternalServerError('A database error occurred while saving the Bazi profile.');
		}
	}
}
