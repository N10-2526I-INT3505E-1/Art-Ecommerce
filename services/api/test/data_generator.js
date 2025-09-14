import { faker } from '@faker-js/faker';

export function createRandomUser() {
	return {
		email: faker.internet.email(),
		username: faker.internet.username(),
		password: faker.internet.password(),
		first_name: faker.person.firstName(),
		last_name: faker.person.lastName(),
		dob: faker.date.birthdate().toDateString(),
		role: 'user',
	};
}
