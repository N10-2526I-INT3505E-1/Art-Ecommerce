// Elysia API server

import { jwt } from '@elysiajs/jwt';
import { eq } from 'drizzle-orm';
import { Elysia, t } from 'elysia';
import { db } from './db';
import { LoginSchema, SignUpSchema, UserResponseSchema, usersTable } from './user.model';
import { comparePassword, hashPassword } from './utils/passwordHash';

const ErrorSchema = t.Object({
	message: t.String(),
});

if (!process.env.JWT_SECRET) {
	console.error('FATAL ERROR: JWT_SECRET is not defined in .env');
	process.exit(1);
}

export const usersPlugin = new Elysia({ prefix: '/api' })
	.decorate('db', db)
	.get('/', ({ path }) => path)
	.use(jwt({ name: 'jwt', secret: process.env.JWT_SECRET as string }))

	.group('/auth', (app) =>
		app
			.post(
				'/login',
				async ({ body, set, db, jwt, cookie }) => {
					const [userFromDb] = await db
						.select()
						.from(usersTable)
						.where(eq(usersTable.email, body.email));
					if (!userFromDb) {
						set.status = 401;
						return { message: 'Invalid email or password.' };
					}
					const passwordMatch = await comparePassword(userFromDb.password, body.password);
					if (!passwordMatch) {
						set.status = 401;
						return { message: 'Invalid email or password.' };
					}
					const userPayload = { id: userFromDb.id, email: userFromDb.email, role: userFromDb.role };
					const token = await jwt.sign(userPayload);

					cookie.auth?.set({
						value: token,
						path: '/',
						httpOnly: true,
						sameSite: 'lax',
						maxAge: 60 * 60 * 24 * 7, // 7 days
					});

					return { token };
				},
				{
					body: LoginSchema,
					response: {
						200: t.Object({ token: t.String() }),
						401: ErrorSchema,
					},
					detail: {
						tags: ['Authentication'],
						summary: 'Log in a user',
					},
				},
			)
			.post(
				'/logout',
				({ cookie, set }) => {
					const token = cookie?.auth?.value as string | undefined;

					if (!token) {
						set.status = 401;
						return { message: 'Unauthorized: No active session to log out from.' };
					}

					cookie.auth?.remove();
					return { ok: true };
				},
				{
					detail: {
						tags: ['Authentication'],
						summary: 'Log out the current user',
					},
					response: {
						200: t.Object({ ok: t.Boolean() }),
						401: ErrorSchema,
					},
				},
			),
	)

	.group('/users', (app) =>
		app
			.post(
				'/',
				async ({ body, set, db }) => {
					const existingEmail = await db
						.select()
						.from(usersTable)
						.where(eq(usersTable.email, body.email));
					if (existingEmail.length > 0) {
						set.status = 409;
						return { message: 'A user with this email already exists.' };
					}
					const existingUsername = await db
						.select()
						.from(usersTable)
						.where(eq(usersTable.username, body.username));
					if (existingUsername.length > 0) {
						set.status = 409;
						return { message: 'A user with this username already exists.' };
					}

					const hashedPassword = await hashPassword(body.password);
					const [newUser] = await db
						.insert(usersTable)
						.values({ ...body, password: hashedPassword })
						.returning();

					if (!newUser) {
						set.status = 500;
						return { message: 'Failed to create user account due to server error.' };
					}

					set.status = 201;
					return { user: newUser };
				},
				{
					body: t.Omit(SignUpSchema, ['id', 'role', 'created_at', 'updated_at']),
					response: {
						201: t.Object({ user: t.Omit(UserResponseSchema, ['password']) }),
						409: ErrorSchema,
						500: ErrorSchema,
					},
					detail: {
						tags: ['User Management'],
						summary: 'Register a new user',
					},
				},
			)

			.guard(
				{
					beforeHandle: async ({ jwt, set, cookie }) => {
						const token = cookie?.auth?.value as string | undefined;
						if (!token) {
							set.status = 401;
							return { message: 'Unauthorized: Missing token' };
						}
						const payload = await jwt.verify(token);
						if (!payload) {
							set.status = 401;
							return { message: 'Unauthorized: Invalid token' };
						}
					},
				},
				(app) =>
					app
						.resolve(async ({ jwt, cookie }) => {
							const token = cookie?.auth?.value as string | undefined;
							const userPayload = token
								? ((await jwt.verify(token)) as { id: number; email: string; role: string } | null)
								: null;
							return { user: userPayload };
						})

						.get(
							'/',
							async ({ db, set, user }) => {
								if (user?.role !== 'admin') {
									set.status = 403;
									return { message: 'Forbidden: Admins only' };
								}

								const allUsers = await db.select().from(usersTable);
								return { users: allUsers };
							},
							{
								response: {
									200: t.Object({ users: t.Array(UserResponseSchema) }),
									403: ErrorSchema,
								},

								detail: {
									tags: ['User Management'],
									summary: 'Get all users (Admin Only)',
								},
							},
						)

						.get(
							'/me',
							async ({ user, set, db }) => {
								if (!user || typeof user.id !== 'number') {
									set.status = 401;
									return { message: 'Unauthorized' };
								}
								const [userFromDb] = await db
									.select()
									.from(usersTable)
									.where(eq(usersTable.id, user.id));
								if (!userFromDb) {
									set.status = 404;
									return { message: 'User not found' };
								}
								const { password, ...userData } = userFromDb;
								return { user: userData };
							},
							{
								response: {
									200: t.Object({ user: t.Omit(UserResponseSchema, ['password']) }),
									401: ErrorSchema,
									404: ErrorSchema,
								},
								detail: {
									tags: ['User Management'],
									summary: 'Get current authenticated user',
								},
							},
						)

						.get(
							'/:id',
							async ({ params, set, db }) => {
								const uid = Number(params.id);
								const [existingUser] = await db
									.select()
									.from(usersTable)
									.where(eq(usersTable.id, uid));
								if (!existingUser) {
									set.status = 404;
									return { message: 'User not found.' };
								}
								return { user: existingUser };
							},
							{
								params: t.Object({ id: t.Numeric() }),
								response: {
									200: t.Object({ user: UserResponseSchema }),
									404: ErrorSchema,
								},
								detail: {
									tags: ['User Management'],
									summary: 'Get user by ID',
								},
							},
						)

						.patch(
							'/:id',
							async ({ params, body, set, db, user }) => {
								if (user?.role !== 'admin' && user?.id !== Number(params.id)) {
									set.status = 403;
									return {
										message:
											'Forbidden: Only admins or the user themselves can update this information',
									};
								}
								const uid = Number(params.id);
								const [updatedUser] = await db
									.update(usersTable)
									.set(body)
									.where(eq(usersTable.id, uid))
									.returning();
								if (!updatedUser) {
									set.status = 404;
									return { message: 'User not found.' };
								}
								return { user: updatedUser };
							},
							{
								params: t.Object({ id: t.Numeric() }),
								body: t.Partial(
									t.Omit(SignUpSchema, ['id', 'password', 'role', 'created_at', 'updated_at']),
								),
								response: {
									200: t.Object({ user: UserResponseSchema }),
									404: ErrorSchema,
								},
								detail: {
									tags: ['User Management'],
									summary: 'Partially update a user',
								},
							},
						)
						.delete(
							'/:id',
							async ({ params, set, db, user }) => {
								if (user?.role !== 'admin' && user?.id !== Number(params.id)) {
									set.status = 403;
									return {
										message:
											'Forbidden: Only admins or the user themselves can delete this account',
									};
								}

								const uid = Number(params.id);
								const [deletedUser] = await db
									.delete(usersTable)
									.where(eq(usersTable.id, uid))
									.returning();
								if (!deletedUser) {
									set.status = 404;
									return { message: 'User not found.' };
								}
								return { message: `User with ID ${uid} successfully deleted.` };
							},
							{
								params: t.Object({ id: t.Numeric() }),
								response: {
									200: t.Object({ message: t.String() }),
									404: ErrorSchema,
								},
								detail: {
									tags: ['User Management'],
									summary: 'Delete a user',
								},
							},
						),
			),
	);
