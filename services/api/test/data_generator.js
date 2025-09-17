import { faker } from '@faker-js/faker';

export function createRandomUser() {
	return {
		email: faker.internet.email(),
		username: faker.internet.username(),
		password: faker.internet.password(),
		first_name: faker.person.firstName(),
		last_name: faker.person.lastName(),
		role: 'user',
	};
}

export async function registerUsers(numUsers) {
	for (let i = 0; i < numUsers; i++) {
		const user = createRandomUser();
		await fetch('/api/register', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(user),
		});
	}
}
