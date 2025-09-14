## Tech Stack

-   **Framework**: [ElysiaJS](https://elysiajs.com/)
-   **Runtime**: [Bun](https://bun.sh/)
-   **Database**: [Turso](https://turso.tech/)
-   **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
-   **API Documentation**: OpenAPI (via `@elysiajs/openapi`)

### Set Up Environment Variables

Create a `.env` file in the `services/api` directory by creating it from scratch. It should contain the following variables for database connection:

```env
TURSO_DATABASE_URL="your_turso_db_url"
TURSO_AUTH_TOKEN="your_turso_auth_token"
```

### Run Database Migrations

Apply the latest database schema to your Turso database.

```bash
bunx drizzle-kit push
```

## API Documentation

This project uses `@elysiajs/openapi` to automatically generate a Swagger UI for the API. Once the development server is running,` access the interactive API documentation at:

[http://localhost:3000/openapi](http://localhost:3000/openapi)

## Database Management

-   **Schema**: The database schema is defined in `src/db/schema.ts`.
-   **Generate Migrations**: After changing the schema, generate a new migration file:
    ```bash
    bunx drizzle-kit generate
    ```
-   **Apply Migrations**: To apply migrations to the database:
    ```bash
    bunx drizzle-kit migrate
    ```
-   **Push Schema (for development)**: To quickly sync database with the schema without generating migration files:
    ```bash
    bunx drizzle-kit push
    ```
