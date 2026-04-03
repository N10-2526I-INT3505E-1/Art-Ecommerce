import ky from 'ky';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/public';

const DEFAULT_PROD_API = 'https://api.novus.io.vn/';

const ensureTrailingSlash = (u: string) => (u.endsWith('/') ? u : `${u}/`);

const defaultPrefix =
	ensureTrailingSlash(
		(env.PUBLIC_API_URL as string | undefined) ??
			(dev ? 'http://localhost:3000' : DEFAULT_PROD_API),
	) + 'v1/';

export const api = ky.create({
	prefixUrl: defaultPrefix,
	credentials: 'include',
	timeout: 10000,
	retry: 0,
});
