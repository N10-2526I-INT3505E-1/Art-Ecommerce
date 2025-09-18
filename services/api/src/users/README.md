# User API Service

 - db.ts: Database connection and schema definitions using Drizzle ORM and TypeBox.
 - index.ts: Main server file setting up Elysia API
 - user.model.ts: User model schema

## Technologies

### Elysia
Elysia is a modern, high-performance web framework for Node.js, designed for building APIs with built-in TypeScript support. It offers features like automatic type inference, middleware chaining, and efficient routing, making it ideal for scalable server-side applications. In this project, Elysia handles all HTTP requests, responses, and route definitions.

### OpenAPI
OpenAPI is a specification for describing RESTful APIs in a machine-readable format. The `@elysiajs/openapi` plugin integrates with Elysia to auto-generate API documentation (e.g., via Swagger UI) based on route schemas and details. This allows developers to explore and test endpoints easily, ensuring clear API contracts.

### Drizzle ORM
Drizzle is a lightweight, type-safe Object-Relational Mapper (ORM) for SQL databases. It simplifies database interactions by providing a query builder and schema definitions that align with TypeScript types. In this API, Drizzle manages connections to the database (e.g., user queries, inserts, and updates) while ensuring type safety and preventing SQL injection.

### TypeBox
TypeBox is a TypeScript library for runtime type validation and schema generation. It's used here in conjunction with Drizzle to create and validate schemas for database tables and API request/response bodies. This ensures that incoming data conforms to expected types, reducing errors and improving reliability.

### CORS (Cross-Origin Resource Sharing)
CORS is a browser security mechanism that controls cross-origin requests. The `@elysiajs/cors` plugin configures the server to allow requests from specific origins (e.g., `http://localhost:5173` for the frontend), methods, and headers. This is crucial for web applications to securely communicate between the client and server.

### JWT (JSON Web Tokens)
JWT is a compact, self-contained standard for securely transmitting information as a JSON object. The `@elysiajs/jwt` plugin handles token generation and verification for authentication. Upon login, a JWT is created with user claims (e.g., ID, email, role) and signed with a secret key. Protected routes verify the token to authenticate users without server-side sessions.

### Cookies
Cookies are small data pieces stored by the browser and sent with HTTP requests. In this API, cookies store the JWT token (e.g., in an "auth" cookie) for session management. This enables stateless authentication, where the server reads the token from cookies to verify user identity on each request.

### Password Hashing
Password hashing involves transforming plaintext passwords into secure, irreversible hashes using algorithms like bcrypt. Custom utilities (`hashPassword` and `comparePassword`) are used to hash passwords during registration and verify them during login. This protects user credentials by storing only hashed versions in the database, mitigating risks from data breaches.
