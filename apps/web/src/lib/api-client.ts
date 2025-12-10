import ky from 'ky';

const BASE_URL = import.meta.env.PRIVATE_API_URL || 'http://localhost:3000';

export const api = ky.create({
	prefixUrl: BASE_URL,
	credentials: 'include',
	timeout: 5000,
	retry: 0,
});
