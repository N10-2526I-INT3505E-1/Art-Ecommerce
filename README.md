# Art E-commerce Website
The source code of the 2526I_INT3505E_1 course project

## Source Code Description

- Use [TypeScript](https://www.typescriptlang.org/) as default instead of JavaScript.
- `/apps/web/`: Folder of the front-end. With SvelteKit as Web Framework, TailwindCSS + DaisyUI for UI. (**Leave untouched for now**)
- `/services/api/`: Folder of the back-end. With [ElysiaJS](https://elysiajs.com/) as API framework. [Drizzle ORM](https://orm.drizzle.team/) and libSQL (similar to SQLite) client for database interaction. (Not fully implemented)
- API Flow: Request to URL -> ElysiaJS (Handle request) -> Drizzle ORM (Query to database) -> libSQL (Execute query to Turso database) -> Drizzle ORM (Return data) -> ElysiaJS (Return response)
- Code linter & formatter: BiomeJS (similar to ESLint + Prettier)


#### Notes:
- Use `bun lint` which is [BiomeJS](https://biomejs.dev/) to format & lint the code.

### Prerequisite

- [Bun](https://bun.com/) installed.
- [Turso](https://turso.tech/) account for database.

### Installation

- Clone the repo.
- Create and fill in the `.env` file in `/services/api/` folder with your Turso database credentials.
```
TURSO_DATABASE_URL=PUT_YOUR_DATABASE_URL_HERE
TURSO_AUTH_TOKEN=PUT_YOUR_AUTH_TOKEN_HERE
```

- Run `bun install`
- Run `bun dev`
- Open `http://localhost:3000/openapi` for API docs. `http://localhost:5173` for (front-end) and `http://localhost:3000` (back-end).
