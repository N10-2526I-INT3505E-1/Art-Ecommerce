// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: User | null;
		}
		// interface PageData {}
		// interface Platform {}

		interface User {
			id: string;
			username: string;
			email: string;
			first_name: string;
			last_name: string;
			role: 'user' | 'operator' | 'manager';
			dob?: string | null;
		}
	}
}

export {};
