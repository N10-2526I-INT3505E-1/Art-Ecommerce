import { ForbiddenError, UnauthorizedError } from '@common/errors/httpErrors';
import { jwt } from '@elysiajs/jwt';
import type { BaziService } from '@user/bazi.service';
import { BaziProfileResponseSchema, CreateBaziProfileSchema } from '@user/bazi.model';
import type { db as DbClient } from '@user/db';
import { Elysia, t } from 'elysia';
import {
	GoogleLoginSchema,
	LoginSchema,
	SafeUserResponseSchema,
	SignUpSchema,
	UserAddressResponseSchema,
	UserAddressSchema,
	UserResponseSchema,
} from './user.model';
import { UserService } from './user.service';

const ErrorSchema = t.Object({
	message: t.String(),
});

if (!process.env.JWT_SECRET) {
	console.error('FATAL ERROR: JWT_SECRET is not defined in .env');
	process.exit(1);
}

export const usersPlugin = (dependencies: { db: typeof DbClient; baziService: BaziService }) =>
	new Elysia({ name: 'users-plugin' })
		.decorate('db', dependencies.db)
		.decorate('baziService', dependencies.baziService)
		.use(jwt({ name: 'jwt', secret: process.env.JWT_SECRET as string, exp: '30m' }))
		.resolve(({ db, jwt, baziService }) => ({
			userService: new UserService(db, jwt as any, baziService),
		}))
		.onError(({ code, error, set }) => {
			if (code === 'NOT_FOUND') {
				set.status = 404;
				return { message: 'Not Found' };
			}
			if (error instanceof Error) {
				return { message: error.message };
			}
		})

		// ========================================================================
		// 1. AUTHENTICATION ROUTES (Public)
		// ========================================================================
		.group('/auth', (app) =>
			app
				.post(
					'/login',
					async ({ body, set, userService }) => {
						const { accessToken, refreshToken } = await userService.login(body);
						set.status = 200;
						return { accessToken, refreshToken };
					},
					{
						body: LoginSchema,
						response: {
							200: t.Object({ accessToken: t.String(), refreshToken: t.String() }),
							401: ErrorSchema,
						},
						detail: { tags: ['Authentication'], summary: 'Log in a user' },
					},
				)
				.post(
					'/logout',
					async ({ body, userService }) => {
						const { refreshToken } = body;
						if (refreshToken) {
							await userService.logout(refreshToken);
						}
						return { ok: true };
					},
					{
						body: t.Object({ refreshToken: t.Optional(t.String()) }),
						detail: { tags: ['Authentication'], summary: 'Log out' },
						response: { 200: t.Object({ ok: t.Boolean() }), 401: ErrorSchema },
					},
				)
				.post(
					'/google',
					async ({ body, set, userService }) => {
						const result = await userService.loginWithGoogle(body.token);
						set.status = 200;
						return result;
					},
					{
						body: GoogleLoginSchema,
						detail: { tags: ['Authentication'], summary: 'Log in with Google' },
					},
				)
				.post(
					'/refresh',
					async ({ body, userService }) => {
						const { refreshToken } = body;
						if (!refreshToken) throw new UnauthorizedError('No refresh token provided');
						const { accessToken } = await userService.refreshAccessToken(refreshToken);
						return { accessToken };
					},
					{
						body: t.Object({ refreshToken: t.String() }),
						detail: { tags: ['Authentication'], summary: 'Refresh access token' },
						response: { 200: t.Object({ accessToken: t.String() }), 401: ErrorSchema },
					},
				),
		)

		// 2. USER MANAGEMENT ROUTES

		// 2.1 Public User Routes
		.post(
			'/',
			async ({ body, set, userService }) => {
				const result = await userService.createUser(body);
				set.status = 201;
				return result;
			},
			{
				body: t.Omit(SignUpSchema, ['id', 'role', 'created_at', 'updated_at']),
				response: {
					201: t.Object({
						user: t.Omit(UserResponseSchema, ['password']),
						accessToken: t.String(),
						refreshToken: t.String(),
					}),
					409: ErrorSchema,
					500: ErrorSchema,
				},
				detail: { tags: ['User Management'], summary: 'Register a new user' },
			},
		)

		// 2.2 Protected User Routes (Require Auth)
		.guard(
			{
				// Auth Middleware: Check Header & Cookie
				beforeHandle: async ({ jwt, cookie, headers }) => {
					let token = headers['authorization']?.split(' ')[1];
					if (!token) token = cookie?.auth?.value;

					if (!token) throw new UnauthorizedError('Missing token');

					const payload = await jwt.verify(token);
					if (!payload) throw new UnauthorizedError('Invalid or expired token');
				},
			},
			(app) =>
				app
					// Resolve User Context
					.resolve(async ({ jwt, cookie, headers }) => {
						let token = headers['authorization']?.split(' ')[1];
						if (!token) token = cookie?.auth?.value;

						const userPayload = token
							? ((await jwt.verify(token)) as {
									id: string;
									email: string;
									role: string;
								} | null)
							: null;

						if (!userPayload) throw new UnauthorizedError('Invalid token payload');
						return { user: userPayload };
					})

					// --- A. USER INFO ---

					// 1. Get All Users (Admin Only) - GET /
					.get(
						'/',
						async ({ user, userService }) => {
							if (user.role !== 'manager') throw new ForbiddenError('Admins only');
							const { users } = await userService.getAllUsers();
							return { users };
						},
						{
							response: {
								200: t.Object({ users: t.Array(SafeUserResponseSchema) }),
								403: ErrorSchema,
							},
							detail: { tags: ['User Management'], summary: 'Get all users (Admin Only)' },
						},
					)

					// 2. Get Me (Profile) - GET /profile
					.get(
						'/profile',
						async ({ user, userService }) => {
							const currentUser = await userService.getUserById(user.id);
							const { password, ...safeUser } = currentUser;
							return safeUser;
						},
						{
							response: {
								200: t.Omit(UserResponseSchema, ['password']),
								401: ErrorSchema,
								404: ErrorSchema,
							},
							detail: { tags: ['User Management'], summary: 'Get current authenticated user' },
						},
					)

					//2.1 Patch profile - PATCH /profile
					.patch(
						'/profile',
						async ({ body, user, userService }) => {
							const updatedUser = await userService.updateUser(user.id, body);
							return { user: updatedUser };
						},
						{
							response: {
								200: t.Object({ user: SafeUserResponseSchema }),
								404: ErrorSchema,
							},
							body: t.Partial(t.Omit(SignUpSchema, ['email', 'password'])),
							detail: { tags: ['User Management'], summary: 'Update my profile' },
						},
					)

					// 3. Get User By ID - GET /:user_id
					.get(
						'/:user_id',
						async ({ params, user, userService }) => {
							// Chỉ Admin hoặc chính chủ mới được xem chi tiết
							if (user.role !== 'manager' && user.id !== params.user_id) {
								throw new ForbiddenError('Access denied');
							}
							const foundUser = await userService.getUserById(params.user_id);
							return { user: foundUser };
						},
						{
							params: t.Object({ user_id: t.String() }),
							response: {
								200: t.Object({ user: SafeUserResponseSchema }),
								403: ErrorSchema,
								404: ErrorSchema,
							},
							detail: { tags: ['User Management'], summary: 'Get user by ID' },
						},
					)

					// 4. Update User - PATCH /:user_id
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
								t.Omit(SignUpSchema, ['id', 'password', 'role', 'created_at', 'updated_at']),
							),
							response: {
								200: t.Object({ user: SafeUserResponseSchema }),
								404: ErrorSchema,
							},
							detail: { tags: ['User Management'], summary: 'Update user' },
						},
					)

					// 5. Delete User - DELETE /:user_id
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
							response: { 200: t.Object({ message: t.String() }), 404: ErrorSchema },
							detail: { tags: ['User Management'], summary: 'Delete user' },
						},
					)

					// --- B. ADDRESS MANAGEMENT ---
					// Hỗ trợ 2 kiểu:
					// 1. Contextual (User hiện tại): /addresses
					// 2. Explicit (Admin quản lý): /:user_id/addresses

					// 6. Get My Addresses - GET /addresses
					.get(
						'/addresses',
						async ({ user, userService }) => {
							const { addresses } = await userService.getUserAddresses(user.id);
							return { addresses };
						},
						{
							response: {
								200: t.Object({ addresses: t.Array(UserAddressResponseSchema) }),
							},
							detail: { tags: ['Address Management'], summary: 'Get my addresses' },
						},
					)

					// 7. Get User Addresses (Admin/Explicit) - GET /:user_id/addresses
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
							response: {
								200: t.Object({ addresses: t.Array(UserAddressResponseSchema) }),
								403: ErrorSchema,
							},
							detail: { tags: ['Address Management'], summary: 'Get user addresses' },
						},
					)

					// 8. Add My Address - POST /addresses
					.post(
						'/addresses',
						async ({ body, set, user, userService }) => {
							const newAddress = await userService.addUserAddress(user.id, body);
							set.status = 201;
							return { address: newAddress };
						},
						{
							body: t.Omit(UserAddressSchema, ['id', 'user_id']),
							response: {
								201: t.Object({ address: UserAddressResponseSchema }),
								404: ErrorSchema,
								500: ErrorSchema,
							},
							detail: { tags: ['Address Management'], summary: 'Add a new address' },
						},
					)

					// 9. Add User Address - POST /:user_id/addresses
					.post(
						'/:user_id/addresses',
						async ({ params, body, set, user, userService }) => {
							if (user.role !== 'manager' && user.id !== params.user_id) {
								throw new ForbiddenError('Access denied');
							}
							const newAddress = await userService.addUserAddress(params.user_id, body);
							set.status = 201;
							return { address: newAddress };
						},
						{
							params: t.Object({ user_id: t.String() }),
							body: t.Omit(UserAddressSchema, ['id', 'user_id']),
							response: {
								201: t.Object({ address: UserAddressResponseSchema }),
								403: ErrorSchema,
								404: ErrorSchema,
								500: ErrorSchema,
							},
						},
					)

					// 10. Update Address - PATCH /addresses/:address_id
					.patch(
						'/addresses/:address_id',
						async ({ params, body, user, userService }) => {
							// Ở đây mặc định update cho user hiện tại
							const updatedAddress = await userService.updateUserAddress(
								user.id,
								params.address_id,
								body,
							);
							return { address: updatedAddress };
						},
						{
							params: t.Object({ address_id: t.Numeric() }),
							body: t.Partial(UserAddressSchema),
							response: {
								200: t.Object({ address: UserAddressResponseSchema }),
								404: ErrorSchema,
								500: ErrorSchema,
							},
							detail: { tags: ['Address Management'], summary: 'Update an address' },
						},
					)

					// 11. Delete Address - DELETE /addresses/:address_id
					.delete(
						'/addresses/:address_id',
						async ({ set, params, user, userService }) => {
							await userService.deleteUserAddress(user.id, params.address_id);
							set.status = 204;
						},
						{
							params: t.Object({ address_id: t.Numeric() }),
							response: {
								204: t.Void(),
								404: ErrorSchema,
							},
							detail: { tags: ['Address Management'], summary: 'Delete an address' },
						},
					)

					// --- C. BAZI PROFILE ---

					// 12. Get My Bazi - GET /bazi
					.get(
						'/bazi',
						async ({ user, userService }) => {
							const profile = await userService.getBaziProfile(user.id);
							return { profile };
						},
						{
							response: {
								200: t.Object({ profile: BaziProfileResponseSchema }),
								404: ErrorSchema,
							},
							detail: {
								tags: ['Bazi'],
								summary: 'Get my Bazi profile',
							},
						},
					)

					// 13. Get User Bazi (Explicit) - GET /:user_id/bazi
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
							response: {
								200: t.Object({ profile: BaziProfileResponseSchema }),
								403: ErrorSchema,
								404: ErrorSchema,
							},
						},
					)

					// 14. Upsert My Bazi - POST /bazi
					.post(
						'/bazi',
						async ({ body, user, userService }) => {
							const profile = await userService.createOrUpdateBaziProfile(user.id, body);
							return profile; // Trả về object profile trực tiếp để khớp test case mong đợi
						},
						{
							body: t.Omit(CreateBaziProfileSchema, ['id', 'user_id']),
							response: {
								200: BaziProfileResponseSchema,
							},
							detail: {
								tags: ['Bazi'],
								summary: 'Create or update my Bazi profile',
							},
						},
					),
		);

export type App = typeof usersPlugin;
