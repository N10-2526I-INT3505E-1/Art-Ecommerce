import { openapi } from "@elysiajs/openapi";
import { eq } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-typebox";
import { Elysia, t } from "elysia";
import { db, users } from "./db";

const _createUser = createInsertSchema(users, {
	id: t.Number({ minimum: 1 }),
	email: t.String({ format: "email" }),
	username: t.String({ minLength: 3, maxLength: 30 }),
	password: t.String({ minLength: 6 }),
	first_name: t.String({ minLength: 1, maxLength: 50 }),
	last_name: t.String({ minLength: 1, maxLength: 50 }),
	dob: t.String({ format: "date" }),
	role: t.String({ enum: ["admin", "user"], default: "user" }),
});

const _getUser = createSelectSchema(users, {
	id: t.Number({ minimum: 1 }),
});

const app = new Elysia()
	.use(openapi())
	.get("/", ({ path }) => path)
	.post(
		"/sign-up",
		async ({ body, set }) => {
			if (body.role === "admin") {
				set.status = 403;
				return { message: "Cannot create admin user with API request." };
			}

			const existingEmail = await db
				.select()
				.from(users)
				.where(eq(users.email, body.email));
			if (existingEmail.length > 0) {
				set.status = 409;
				return { message: "A user with this email already exists." };
			}

			const existingUsername = await db
				.select()
				.from(users)
				.where(eq(users.username, body.username));
			if (existingUsername.length > 0) {
				set.status = 409;
				return { message: "A user with this username already exists." };
			}

			const newUser = await db.insert(users).values(body).returning();
			return {
				user: newUser[0],
			};
		},
		{
			body: t.Omit(_createUser, ["id"]),
		},
	)
	.get(
		"/user/:id",
		async ({ params, set }) => {
			const uid = Number(params.id);
			const existingUser = await db
				.select()
				.from(users)
				.where(eq(users.id, uid));
			if (existingUser.length === 0) {
				set.status = 404;
				return { message: "User not found." };
			}
			return { user: existingUser[0] };
		},
		{
			params: t.Object({ id: t.Numeric() }),
		},
	)
	.listen(3000);

console.log(
	`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
