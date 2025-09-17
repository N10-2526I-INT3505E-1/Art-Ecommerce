// Elysia API server
import { openapi } from '@elysiajs/openapi';
import { eq } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-typebox';
import { Elysia, t } from 'elysia';
import { cors } from '@elysiajs/cors';
import { db, users } from './db';
// Auth deps
import { jwt } from '@elysiajs/jwt';
import { hashPassword, comparePassword } from './utils/passwordHash';

const SignUpSchema = createInsertSchema(users, {
	email: t.String({ format: 'email' }),
	username: t.String({ minLength: 5, maxLength: 30 }),
	password: t.String({ minLength: 6 }),
	first_name: t.String({ minLength: 1, maxLength: 50 }),
	last_name: t.String({ minLength: 1, maxLength: 50 }),
	dob: t.Optional(
		t.Union([t.String({ format: 'date' }), t.Null(), t.String({ minLength: 0 })], {
			default: null,
		}),
	),
	role: t.Optional(
		t.Enum(
			{
				user: 'user',
				admin: 'admin',
			},
			{ default: 'user' },
		),
	),
});

const LoginSchema = t.Object({
	email: t.String({ format: 'email' }),
	password: t.String({ minLength: 6 }),
});

const UserResponseSchema = createSelectSchema(users);
const ErrorSchema = t.Object({
	message: t.String(),
});

if (!process.env.JWT_SECRET) {
	console.error('FATAL ERROR: JWT_SECRET is not defined in .env');
	process.exit(1);
}

const app = new Elysia()
	.use(
		openapi({
			documentation: {
				info: {
					title: "L'Artelier API",
					version: '0.1.0',
				},
				tags: [
					{
						name: 'Authentication',
						description: 'Authentication related endpoints',
					},
					{
						name: 'User Management',
						description: 'User operations and management',
					},
				],
			},
		}),
	)
	.use(
		cors({
			origin: 'http://localhost:5173',
			credentials: true,
			methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
			allowedHeaders: ['Content-Type', 'Authorization'],
		}),
	)
	.decorate('db', db)
	.get('/', ({ path }) => path)
	.use(jwt({ name: 'jwt', secret: process.env.JWT_SECRET }))

	.group('/api/auth', (app) =>
		app
			.post(
				'/login',
				async ({ body, set, db, jwt }) => {
					const [userFromDb] = await db.select().from(users).where(eq(users.email, body.email));
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
				({ cookie }) => {
					cookie?.auth?.remove();
					return { ok: true };
				},
				{
					detail: {
						tags: ['Authentication'],
						summary: 'Log out the current user',
					},
				},
			),
	)

	.group('/api/users', (app) =>
		app
			.post(
				'/',
				async ({ body, set, db }) => {
					const existingEmail = await db.select().from(users).where(eq(users.email, body.email));
					if (existingEmail.length > 0) {
						set.status = 409;
						return { message: 'A user with this email already exists.' };
					}
					const existingUsername = await db
						.select()
						.from(users)
						.where(eq(users.username, body.username));
					if (existingUsername.length > 0) {
						set.status = 409;
						return { message: 'A user with this username already exists.' };
					}

					const hashedPassword = await hashPassword(body.password);
					const [newUser] = await db
						.insert(users)
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
					body: t.Omit(SignUpSchema, ['id', 'role']),
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

			.get(
				'/',
				async ({ db }) => {
					// NOTE: You should add an authorization guard here to check if the user has an 'admin' role.
					const allUsers = await db.select().from(users);
					return { users: allUsers };
				},
				{
					response: { 200: t.Object({ users: t.Array(UserResponseSchema) }) },
					detail: {
						tags: ['User Management'],
						summary: 'Get all users (Admin Only)',
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
							'/me',
							async ({ user, set, db }) => {
								if (!user || typeof user.id !== 'number') {
									set.status = 401;
									return { message: 'Unauthorized' };
								}
								const [userFromDb] = await db.select().from(users).where(eq(users.id, user.id));
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
								const [existingUser] = await db.select().from(users).where(eq(users.id, uid));
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
									.update(users)
									.set(body)
									.where(eq(users.id, uid))
									.returning();
								if (!updatedUser) {
									set.status = 404;
									return { message: 'User not found.' };
								}
								return { user: updatedUser };
							},
							{
								params: t.Object({ id: t.Numeric() }),
								body: t.Partial(t.Omit(SignUpSchema, ['id', 'password', 'email'])), // More flexible body
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
								const [deletedUser] = await db.delete(users).where(eq(users.id, uid)).returning();
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
	)
	.listen(3000);

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
