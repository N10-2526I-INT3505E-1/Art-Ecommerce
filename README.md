# Novus E-commerce Website

[![Test](https://github.com/N10-2526I-INT3505E-1/Art-Ecommerce/actions/workflows/test.yml/badge.svg)](https://github.com/N10-2526I-INT3505E-1/Art-Ecommerce/actions/workflows/test.yml)
[![codecov](https://codecov.io/gh/N10-2526I-INT3505E-1/Art-Ecommerce/graph/badge.svg)](https://codecov.io/gh/N10-2526I-INT3505E-1/Art-Ecommerce)

The source code of the 2526I_INT3505E_1 course project.

An e-commerce demo that uses AI to recommend products tailored to users' Bazi (Chinese astrology) profiles and interior design styles.

### Tech-stack

- **Web-app:** SvelteKit, TailwindCSS, DaisyUI, ky, D3.js
- **Backend:** ElysiaJS, Drizzle ORM, Qdrant,...
- **Database:** Turso (LibSQL)
- **Runtime:** Bun
- **Language:** TypeScript

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

- Run `bun install` at the root folder.
- Run `bun dev` at the root folder.
- Open `http://localhost:3000/openapi` for API docs. `http://localhost:5173` for front-end.
