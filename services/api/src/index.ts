// Elysia API server

import { openapi } from '@elysiajs/openapi';
import { eq } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-typebox';
import { Elysia, t } from 'elysia';
import { db, users } from './db';

const SignUpSchema = createInsertSchema(users, {
	email: t.String({ format: 'email' }),
	username: t.String({ minLength: 5, maxLength: 30 }),
	password: t.String({ minLength: 6 }),
	first_name: t.String({ minLength: 1, maxLength: 50 }),
	last_name: t.String({ minLength: 1, maxLength: 50 }),
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

const UserResponseSchema = createSelectSchema(users);

const ErrorSchema = t.Object({
	message: t.String(),
});

const app = new Elysia()
	.use(
		openapi({
			documentation: {
				info: {
					title: 'Arttori API',
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
					{
						name: 'Admin',
						description: 'Administrative operations (admin only)',
					},
				],
			},
		}),
	)

	// Make the db instance available in all route handlers
	.decorate('db', db)
	.get('/', ({ path }) => path)

	//// Authentication routes
	// Short explanation:
	// .post("/url", handler, { body: schema }) -> POST request to /url
	// where handler is async function (wait for db operations), body is request body (in the {body:schema})
	// and schema is kinda a pre-defined format to validate the request body.
	.post(
		'/api/sign-up',
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

			const [newUser] = await db.insert(users).values(body).returning();

			if (!newUser) {
				set.status = 500;
				return {
					message: 'Failed to create user account due to server error.',
				};
			}

			return {
				user: newUser,
			};
		},
		{
			// Validate request body against CreateUserSchema, except 'id' and 'role'
			body: t.Omit(SignUpSchema, ['id', 'role']),
			response: {
				200: t.Object({ user: UserResponseSchema }),
				403: ErrorSchema,
				409: ErrorSchema,
			},
			detail: {
				tags: ['Authentication'],
				summary: 'Sign up a new user',
			},
		},
	)

	// User management routes
	.group('/api/user', (app) =>
		app
			.get(
				'/:id',
				async ({ params, set, db }) => {
					const uid = Number(params.id);
					const existingUser = await db.select().from(users).where(eq(users.id, uid));
					if (existingUser.length === 0) {
						set.status = 404;
						return { message: 'User not found.' };
					}
					return { user: existingUser[0] };
				},
				{
					params: t.Object({ id: t.Numeric() }),
					detail: {
						tags: ['User Management'],
						summary: 'Get user by ID',
					},
				},
			)

			.patch(
				'/update-email/:id',
				async ({ params, body, set, db }) => {
					const uid = Number(params.id);

					const [updatedUser] = await db
						.update(users)
						.set({ email: body.email })
						.where(eq(users.id, Number(uid)))
						.returning();

					if (!updatedUser) {
						set.status = 404;
						return { message: 'User not found.' };
					}

					return {
						user: updatedUser,
					};
				},
				{
					params: t.Object({ id: t.Numeric() }),
					body: t.Object({ email: t.String({ format: 'email' }) }),
					response: {
						200: t.Object({ user: UserResponseSchema }),
						404: ErrorSchema,
					},
					detail: {
						tags: ['User Management'],
						summary: 'Change user email',
					},
				},
			),
	)

	.get(
		'/api/admin/user-list',
		async ({ db }) => {
			const allUsers = await db.select().from(users);
			return { users: allUsers };
		},
		{
			response: {
				200: t.Object({ users: t.Array(UserResponseSchema) }),
			},
			detail: {
				tags: ['Admin'],
				summary: 'Get all users',
			},
		},
	)
	.listen(3000);

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
