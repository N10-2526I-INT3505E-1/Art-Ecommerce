import { ForbiddenError, UnauthorizedError } from '@common/errors/httpErrors';
import { jwt } from '@elysiajs/jwt';
import { BaziProfileResponseSchema, CreateBaziProfileSchema } from '@user/bazi.model';
import { BaziService } from '@user/bazi.service';
import { db } from '@user/db';
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

export const usersPlugin = new Elysia({})
	.decorate('db', db)
	.decorate('baziService', new BaziService())
	.get('/', ({ path }) => path)
	.use(jwt({ name: 'jwt', secret: process.env.JWT_SECRET as string, exp: '30m' }))
	.resolve(({ db, jwt, baziService }) => ({
		userService: new UserService(db, jwt as any, baziService),
	}))

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

	// --- USER ROUTES ---
	.group('/users', (app) =>
		app
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

			// --- PROTECTED USER ROUTES ---
			.guard(
				{
					beforeHandle: async ({ jwt, cookie }) => {
						const token = cookie?.auth?.value as string | undefined;
						if (!token) throw new UnauthorizedError('Missing token');
						const payload = await jwt.verify(token);
						if (!payload) throw new UnauthorizedError('Invalid or expired token');
					},
				},
				(app) =>
					app
						.resolve(async ({ jwt, cookie }) => {
							const token = cookie?.auth?.value as string | undefined;
							const userPayload = token
								? ((await jwt.verify(token)) as { id: string; email: string; role: string } | null)
								: null;
							return { user: userPayload };
						})

						// 1. Get All Users (Admin)
						.get(
							'/',
							async ({ user, userService }) => {
								if (user?.role !== 'manager') throw new ForbiddenError('Admins only');
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

						// 2. Get Me
						.get(
							'/me',
							async ({ user, userService }) => {
								if (!user || typeof user.id !== 'string')
									throw new UnauthorizedError('Invalid user payload');
								const currentUser = await userService.getUserById(user.id);
								return { user: currentUser };
							},
							{
								response: {
									200: t.Object({ user: t.Omit(UserResponseSchema, ['password']) }),
									401: ErrorSchema,
									404: ErrorSchema,
								},
								detail: { tags: ['User Management'], summary: 'Get current authenticated user' },
							},
						)

						// 3. Get User By ID
						.get(
							'/:user_id',
							async ({ params, user, userService }) => {
								if (user?.role !== 'manager' && user?.id !== params.user_id) {
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

						// 4. Update User
						.patch(
							'/:user_id',
							async ({ params, body, user, userService }) => {
								if (user?.role !== 'manager' && user?.id !== params.user_id) {
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

						// 5. Delete User
						.delete(
							'/:user_id',
							async ({ params, user, userService }) => {
								if (user?.role !== 'manager' && user?.id !== params.user_id) {
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

						// 6. Get Addresses
						.get(
							'/:user_id/addresses',
							async ({ params, user, userService }) => {
								if (user?.role !== 'manager' && user?.id !== params.user_id) {
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
								detail: { tags: ['User Management'], summary: 'Get user addresses' },
							},
						)

						// 7. Add Address
						.post(
							'/:user_id/addresses',
							async ({ params, body, set, user, userService }) => {
								if (user?.role !== 'manager' && user?.id !== params.user_id) {
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
								detail: { tags: ['User Management'], summary: 'Add a new address' },
							},
						)

						// 8. Update Address
						.patch(
							'/:user_id/addresses/:address_id',
							async ({ params, body, user, userService }) => {
								if (user?.role !== 'manager' && user?.id !== params.user_id) {
									throw new ForbiddenError('Access denied');
								}
								const updatedAddress = await userService.updateUserAddress(
									params.user_id,
									params.address_id,
									body,
								);
								return { address: updatedAddress };
							},
							{
								params: t.Object({ user_id: t.String(), address_id: t.Numeric() }),
								body: t.Partial(UserAddressSchema),
								response: {
									200: t.Object({ address: UserAddressResponseSchema }),
									403: ErrorSchema,
									404: ErrorSchema,
									500: ErrorSchema,
								},
								detail: { tags: ['User Management'], summary: 'Update an address' },
							},
						)

						// 9. Delete Address
						.delete(
							'/:user_id/addresses/:address_id',
							async ({ params, user, userService }) => {
								if (user?.role !== 'manager' && user?.id !== params.user_id) {
									throw new ForbiddenError('Access denied');
								}
								const result = await userService.deleteUserAddress(
									params.user_id,
									params.address_id,
								);
								return result;
							},
							{
								params: t.Object({ user_id: t.String(), address_id: t.Numeric() }),
								response: {
									200: t.Object({ message: t.String() }),
									403: ErrorSchema,
									404: ErrorSchema,
								},
								detail: { tags: ['User Management'], summary: 'Delete an address' },
							},
						)

						// 10. Get Bazi Profile
						.get(
							'/:user_id/bazi',
							async ({ params, user, userService }) => {
								if (user?.role !== 'manager' && user?.id !== params.user_id) {
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
								detail: {
									tags: ['User Management', 'Bazi'],
									summary: "Get a user's Bazi profile",
								},
							},
						)

						// 11. Create or Update Bazi Profile
						.put(
							'/:user_id/bazi',
							async ({ params, body, user, userService }) => {
								if (user?.role !== 'manager' && user?.id !== params.user_id) {
									throw new ForbiddenError('Access denied');
								}
								const profile = await userService.createOrUpdateBaziProfile(params.user_id, body);
								return { profile };
							},
							{
								params: t.Object({ user_id: t.String() }),
								body: t.Omit(CreateBaziProfileSchema, ['id', 'user_id']),
								response: {
									200: t.Object({ profile: BaziProfileResponseSchema }),
									403: ErrorSchema,
									404: ErrorSchema, // For user not found
									500: ErrorSchema,
								},
								detail: {
									tags: ['User Management', 'Bazi'],
									summary: "Create or update a user's Bazi profile",
								},
							},
						),
			),
	);

export type App = typeof usersPlugin;
