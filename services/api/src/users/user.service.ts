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
import type { db as defaultDb } from '@user/db';
import type { LoginSchema, SignUpSchema, UserAddressSchema } from '@user/user.model';
import { refreshTokensTable, userAddressTable, usersTable } from '@user/user.model';
import { comparePassword, hashPassword } from '@user/utils/passwordHash';
import { and, desc, eq } from 'drizzle-orm';
import type { Static } from 'elysia';
import { OAuth2Client } from 'google-auth-library';

type DbClient = typeof defaultDb;
type JwtClient = {
	sign: (payload: Record<string, string | number>) => Promise<string>;
	verify: (token: string) => Promise<Record<string, string | number> | false>;
};

export class UserService {
	private db: DbClient;
	private jwt: JwtClient;
	private googleClient: OAuth2Client;
	private baziService: BaziService;

	constructor(db: DbClient, jwt: JwtClient, baziService: BaziService) {
		this.db = db;
		this.jwt = jwt;
		this.baziService = baziService;
		this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || '');
		if (!process.env.GOOGLE_CLIENT_ID) {
			console.warn('Warning: GOOGLE_CLIENT_ID is not defined');
		}
	}

	// Address Management

	async getUserAddresses(userId: string) {
		const addresses = await this.db
			.select()
			.from(userAddressTable)
			.where(eq(userAddressTable.user_id, userId))
			.orderBy(desc(userAddressTable.is_default)); // Default address first

		return { addresses };
	}

	async addUserAddress(
		userId: string,
		addressData: Omit<Static<typeof UserAddressSchema>, 'id' | 'user_id'>,
	) {
		// 1. Verify User Exists
		const [userFromDb] = await this.db.select().from(usersTable).where(eq(usersTable.id, userId));
		if (!userFromDb) {
			throw new NotFoundError('User not found.');
		}

		try {
			// 2. Use Transaction to handle "Default" toggle
			const [newAddress] = await this.db.transaction(async (tx) => {
				// If this new address is set as default, unset previous defaults
				if (addressData.is_default === 1) {
					await tx
						.update(userAddressTable)
						.set({ is_default: 0 })
						.where(eq(userAddressTable.user_id, userId));
				}

				// Insert the new address
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
		// 1. Verify User Exists
		const [userFromDb] = await this.db.select().from(usersTable).where(eq(usersTable.id, userId));
		if (!userFromDb) {
			throw new NotFoundError('User not found.');
		}

		try {
			const [updatedAddress] = await this.db.transaction(async (tx) => {
				// If setting as default, unset others
				if (addressData.is_default === 1) {
					await tx
						.update(userAddressTable)
						.set({ is_default: 0 })
						.where(eq(userAddressTable.user_id, userId));
				}

				// Update specific address
				const [result] = await tx
					.update(userAddressTable)
					.set({
						...addressData,
						updated_at: new Date().toISOString(), // Ensure timestamp update
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

	async refreshAccessToken(refreshToken: string) {
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
		const newAccessToken = await this.jwt.sign(userPayload);

		return { accessToken: newAccessToken };
	}

	async loginWithGoogle(token: string) {
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
				const accessToken = await this.jwt.sign(userPayload);
				const refreshToken = await this.createRefreshToken(userFromDb.id);
				return { status: 'login', accessToken, refreshToken };
			}

			// Auto-register logic
			const newPassword = Bun.randomUUIDv7();
			const funnyUsername = faker.internet.username() + Bun.randomUUIDv7().slice(0, 4);

			const newUser = await this.createUser({
				email: payload.email,
				username: funnyUsername,
				password: newPassword,
				first_name: payload.given_name || 'User',
				last_name: payload.family_name || 'Name',
			});

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

	async login(credentials: Static<typeof LoginSchema>) {
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
		const accessToken = await this.jwt.sign(userPayload);
		const refreshToken = await this.createRefreshToken(userFromDb.id);

		return { accessToken, refreshToken };
	}

	async logout(refreshToken: string) {
		await this.db.delete(refreshTokensTable).where(eq(refreshTokensTable.token, refreshToken));
		return { message: 'Logged out successfully' };
	}

	async createUser(
		userData: Omit<Static<typeof SignUpSchema>, 'id' | 'role' | 'created_at' | 'updated_at'>,
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

		return await this.db.transaction(async (tx) => {
			const [newUser] = await tx
				.insert(usersTable)
				.values({ ...userData, password: hashedPassword })
				.returning();

			if (!newUser) {
				throw new InternalServerError('Failed to create user account due to server error.');
			}

			const userPayload = { id: newUser.id, email: newUser.email, role: newUser.role };
			const accessToken = await this.jwt.sign(userPayload);

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

	/**
	 * Retrieves the Bazi profile for a given user.
	 * @param userId The ID of the user.
	 * @returns The user's Bazi profile.
	 */
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

	/**
	 * Creates or updates a Bazi profile for a user.
	 * It calculates the Bazi chart and then performs an "upsert" operation.
	 * @param userId The ID of the user.
	 * @param baziInput The birth information provided by the user.
	 * @returns The newly created or updated Bazi profile.
	 */
	async createOrUpdateBaziProfile(userId: string, baziInput: Omit<BaziInput, 'id' | 'user_id'>) {
		// 1. Verify user exists
		const [user] = await this.db
			.select({ id: usersTable.id })
			.from(usersTable)
			.where(eq(usersTable.id, userId));
		if (!user) {
			throw new NotFoundError('User not found.');
		}

		// 2. Calculate the full Bazi profile
		const fullProfileData = await this.baziService.calculateBazi(baziInput);

		// 3. Prepare data for insertion/update
		const dataToUpsert = {
			...fullProfileData,
			user_id: userId,
		};

		// 4. Perform an "upsert" operation
		// Drizzle for SQLite uses `onConflictDoUpdate`
		try {
			const [result] = await this.db
				.insert(baziProfilesTable)
				.values(dataToUpsert)
				.onConflictDoUpdate({
					target: baziProfilesTable.user_id, // conflict on the unique user_id

					// Explicitly list the fields to update.
					// This prevents issues with null/undefined values for JSON fields.
					set: {
						profile_name: dataToUpsert.profile_name,
						gender: dataToUpsert.gender,
						birth_day: dataToUpsert.birth_day,
						birth_month: dataToUpsert.birth_month,
						birth_year: dataToUpsert.birth_year,
						birth_hour: dataToUpsert.birth_hour,
						birth_minute: dataToUpsert.birth_minute,
						longitude: dataToUpsert.longitude,
						timezone_offset: dataToUpsert.timezone_offset,

						// Calculated fields
						year_stem: dataToUpsert.year_stem,
						year_branch: dataToUpsert.year_branch,
						month_stem: dataToUpsert.month_stem,
						month_branch: dataToUpsert.month_branch,
						day_stem: dataToUpsert.day_stem,
						day_branch: dataToUpsert.day_branch,
						hour_stem: dataToUpsert.hour_stem,
						hour_branch: dataToUpsert.hour_branch,

						// Analysis fields (handle potential nulls)
						day_master_status: dataToUpsert.day_master_status,
						structure_type: dataToUpsert.structure_type,
						structure_name: dataToUpsert.structure_name,
						analysis_reason: dataToUpsert.analysis_reason,
						favorable_elements: dataToUpsert.favorable_elements,
						element_scores: dataToUpsert.element_scores,
						god_scores: dataToUpsert.god_scores,
						interactions: dataToUpsert.interactions,
						score_details: dataToUpsert.score_details,
						shen_sha: dataToUpsert.shen_sha,
						party_score: dataToUpsert.party_score,
						enemy_score: dataToUpsert.enemy_score,
						percentage_self: dataToUpsert.percentage_self,
						luck_start_age: dataToUpsert.luck_start_age,

						// Manually set the updated_at timestamp
						updated_at: new Date().toISOString(),
					},
				})
				.returning();

			if (!result) {
				throw new InternalServerError('Failed to create or update Bazi profile.');
			}
			return result;
		} catch (error) {
			console.error('Database upsert error:', error);
			// Re-throw a more generic error to the client
			throw new InternalServerError('A database error occurred while saving the Bazi profile.');
		}
	}
}
