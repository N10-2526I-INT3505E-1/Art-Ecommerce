import { ForbiddenError, UnauthorizedError } from '@common/errors/httpErrors';
import { jwt } from '@elysiajs/jwt';
import { BaziProfileResponseSchema, CreateBaziProfileSchema } from '@user/bazi.model';
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
import type { UserService } from './user.service';

const ErrorSchema = t.Object({
	message: t.String(),
});

if (!process.env.JWT_SECRET) {
	console.error('FATAL ERROR: JWT_SECRET is not defined in .env');
	process.exit(1);
}

export const usersPlugin = (dependencies: { userService: UserService }) =>
	new Elysia({ name: 'users-plugin' })
		.decorate('userService', dependencies.userService)
		.use(jwt({ name: 'jwt', secret: process.env.JWT_SECRET as string, exp: '30m' }))

		// 3. Error Handling
		.onError(({ code, error, set }) => {
			if (code === 'NOT_FOUND') {
				set.status = 404;
				return { message: 'Not Found' };
			}
			if (error instanceof Error) {
				return { message: error.message };
			}
		})

		// GROUP 1: PUBLIC ROUTES (AUTH & SESSION)
		// Nhiệm vụ: Tạo Token (Sign) trả về cho Client
		.group('/sessions', (app) =>
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
						body: LoginSchema,
						response: {
							201: t.Object({ accessToken: t.String(), refreshToken: t.String() }),
							401: ErrorSchema,
						},
						detail: { tags: ['Sessions'], summary: 'Create session (login)' },
					},
				)

				// DELETE /sessions - Logout
				.delete(
					'/',
					async ({ body, userService, set }) => {
						const { refreshToken } = body;
						if (refreshToken) {
							await userService.logout(refreshToken);
						}
						set.status = 204;
					},
					{
						body: t.Object({ refreshToken: t.Optional(t.String()) }),
						detail: { tags: ['Sessions'], summary: 'Delete session (logout)' },
						response: { 204: t.Void(), 401: ErrorSchema },
					},
				)

				// POST /sessions/refresh - Refresh Token
				.post(
					'/refresh',
					async ({ body, userService, jwt }) => {
						const { refreshToken } = body;
						if (!refreshToken) throw new UnauthorizedError('No refresh token provided');
						// Truyền jwt vào service để ký token mới
						const { accessToken } = await userService.refreshAccessToken(refreshToken, jwt as any);
						return { accessToken };
					},
					{
						body: t.Object({ refreshToken: t.String() }),
						detail: { tags: ['Sessions'], summary: 'Refresh access token' },
						response: { 200: t.Object({ accessToken: t.String() }), 401: ErrorSchema },
					},
				)

				// POST /sessions/google - Google Login
				.post(
					'/google',
					async ({ body, set, userService, jwt, cookie }) => {
						// Thêm 'cookie' vào đây
						const result = await userService.loginWithGoogle(body.token, jwt as any);

						cookie.auth.set({
							value: result.accessToken,
							httpOnly: true,
							secure: process.env.NODE_ENV === 'production',
							path: '/',
							maxAge: 60 * 30, // 30 phút
							sameSite: 'lax',
						});

						cookie.refresh_token.set({
							value: result.refreshToken,
							httpOnly: true,
							secure: process.env.NODE_ENV === 'production',
							path: '/',
							maxAge: 7 * 86400, // 7 ngày
							sameSite: 'lax',
						});

						set.status = 201;
						return { accessToken: result.accessToken, refreshToken: result.refreshToken };
					},
					{
						body: GoogleLoginSchema,
						detail: { tags: ['Sessions'], summary: 'Create session with Google' },
						response: {
							201: t.Object({ accessToken: t.String(), refreshToken: t.String() }),
							401: ErrorSchema,
						},
					},
				),
		)

		// GROUP 2: USERS RESOURCES
		.group('/users', (app) =>
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
						detail: { tags: ['Users'], summary: 'Register a new user' },
					},
				)

				// PROTECTED ROUTES
				// Nhiệm vụ: Đọc Header từ Gateway, không verify token
				.guard(
					{}, // Không cần beforeHandle verify token nữa
					(app) =>
						app
							// Trích xuất thông tin User từ Header do Gateway gửi xuống
							.derive(({ headers }) => {
								const userId = headers['x-user-id'];
								const userRole = headers['x-user-role'];

								// Nếu không có header -> Ai đó đang gọi thẳng vào Service bỏ qua Gateway -> Chặn
								if (!userId) {
									throw new UnauthorizedError('Missing Gateway Headers (x-user-id)');
								}

								return {
									user: {
										id: userId as string,
										email: '', // Gateway thường không gửi email, service tự fetch nếu cần
										role: (userRole as string) || 'user',
									},
								};
							})

							// USER MANAGEMENT

							// GET /users - List all users (admin only)
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
									detail: { tags: ['Users'], summary: 'Get all users (Admin only)' },
								},
							)

							// GET /users/profile - Get current user profile
							.get(
								'/profile',
								async ({ user, userService }) => {
									// Lấy thông tin chi tiết từ DB dựa trên ID từ Header
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
									detail: { tags: ['Users'], summary: 'Get current user profile' },
								},
							)

							// PATCH /users/profile - Update current user profile
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
									detail: { tags: ['Users'], summary: 'Update current user profile' },
								},
							)

							// GET /users/:user_id - Get user by ID
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
									response: {
										200: t.Object({ user: SafeUserResponseSchema }),
										403: ErrorSchema,
										404: ErrorSchema,
									},
									detail: { tags: ['Users'], summary: 'Get user by ID' },
								},
							)

							// PATCH /users/:user_id - Update user
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
									detail: { tags: ['Users'], summary: 'Update user' },
								},
							)

							// DELETE /users/:user_id - Delete user
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
									detail: { tags: ['Users'], summary: 'Delete user' },
								},
							)

							// ADDRESS MANAGEMENT (Sub-resource of User)

							// GET /users/profile/addresses
							.get(
								'/profile/addresses',
								async ({ user, userService }) => {
									const { addresses } = await userService.getUserAddresses(user.id);
									return { addresses };
								},
								{
									response: {
										200: t.Object({ addresses: t.Array(UserAddressResponseSchema) }),
									},
									detail: { tags: ['Addresses'], summary: 'Get current user addresses' },
								},
							)

							// POST /users/profile/addresses
							.post(
								'/profile/addresses',
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
									detail: { tags: ['Addresses'], summary: 'Add address for current user' },
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
									body: t.Partial(UserAddressSchema),
									response: {
										200: t.Object({ address: UserAddressResponseSchema }),
										404: ErrorSchema,
										500: ErrorSchema,
									},
									detail: { tags: ['Addresses'], summary: 'Update current user address' },
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
									response: {
										204: t.Void(),
										404: ErrorSchema,
									},
									detail: { tags: ['Addresses'], summary: 'Delete current user address' },
								},
							)

							// GET /users/:user_id/addresses (Admin/Owner)
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
									detail: { tags: ['Addresses'], summary: 'Get user addresses (Admin/Owner)' },
								},
							)

							// POST /users/:user_id/addresses (Admin/Owner)
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
									detail: { tags: ['Addresses'], summary: 'Add address for user (Admin/Owner)' },
								},
							)

							// BAZI PROFILE (Sub-resource of User)
							// GET /users/profile/bazi
							.get(
								'/profile/bazi',
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
										summary: 'Get current user Bazi profile',
									},
								},
							)

							// POST /users/profile/bazi
							.post(
								'/profile/bazi',
								async ({ body, user, userService }) => {
									const profile = await userService.createOrUpdateBaziProfile(user.id, body);
									return profile;
								},
								{
									body: t.Omit(CreateBaziProfileSchema, ['id', 'user_id']),
									response: {
										200: BaziProfileResponseSchema,
									},
									detail: {
										tags: ['Bazi'],
										summary: 'Create or update current user Bazi profile',
									},
								},
							)

							// GET /users/:user_id/bazi (Admin/Owner)
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
									detail: {
										tags: ['Bazi'],
										summary: 'Get user Bazi profile (Admin/Owner)',
									},
								},
							),
				),
		);

export type App = typeof usersPlugin;
