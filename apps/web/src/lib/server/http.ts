import type { RequestEvent } from '@sveltejs/kit';
import ky, { type KyInstance, type Options } from 'ky';
import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';

// const headers = new Headers(options.headers);
// if (env.INTERNAL_API_SECRET) {
// 	headers.set('X-Internal-Secret', env.INTERNAL_API_SECRET);
// }

export function api({ fetch }: Pick<RequestEvent, 'fetch'>, options: Options = {}): KyInstance {
	const DEFAULT_PROD_API = 'https://api.novus.io.vn/';

	// 1. Determine Base URL
	const rawUrl =
		(env.PRIVATE_API_URL as string | undefined) ??
		(dev ? 'http://localhost:3000' : DEFAULT_PROD_API);

	const ensureTrailingSlash = (u: string) => (u.endsWith('/') ? u : `${u}/`);
	const defaultPrefix = ensureTrailingSlash(rawUrl);

	// Optional: Log only in dev to keep Vercel logs clean
	if (dev) console.log('API Prefix URL:', defaultPrefix);

	const defaultOptions: Options = {
		prefixUrl: defaultPrefix,
		credentials: 'include',
		fetch: fetch as typeof globalThis.fetch,
		timeout: 10000,
		retry: { limit: 2 },
		hooks: {
			afterResponse: [
				async (_request, _options, response) => {
					if (!response.ok) {
						// Cloning response is safer if you plan to read the body later elsewhere
						const errBody = await response.clone().text();
						console.error(`API Error [${response.status}]: ${response.url}`, errBody);
					}
				},
			],
		},
	};

	return ky.create({ ...defaultOptions, ...options });
}
