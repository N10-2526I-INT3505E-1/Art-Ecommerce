import ky from 'ky';
import { env } from '$env/dynamic/private';

const DEFAULT_PROD_API = 'https://api.novus.io.vn/';
const ensureTrailingSlash = (u: string) => (u.endsWith('/') ? u : `${u}/`);
const defaultPrefix = ensureTrailingSlash(
	(env.PRIVATE_API_URL as string | undefined) ??
		(import.meta.env.DEV ? 'http://localhost:3000' : DEFAULT_PROD_API),
);

export const api = ky.create({
	prefixUrl: BASE_URL,
	credentials: 'include',
	timeout: 5000,
	retry: 0,
});
