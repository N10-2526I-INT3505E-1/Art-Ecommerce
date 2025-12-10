import type { RequestEvent } from '@sveltejs/kit';
import ky, { type KyInstance, type Options } from 'ky';
import { env } from '$env/dynamic/private';

export function api(
	{ fetch, request }: Pick<RequestEvent, 'fetch' | 'request'>,
	options: Options = {},
): KyInstance {
	const DEFAULT_PROD_API = 'https://api.novus.io.vn/';
	const ensureTrailingSlash = (u: string) => (u.endsWith('/') ? u : `${u}/`);
	const defaultPrefix = ensureTrailingSlash(
		(env.PRIVATE_API_URL as string | undefined) ??
			(import.meta.env.DEV ? 'http://localhost:3000' : DEFAULT_PROD_API),
	);

	console.log('API Prefix URL:', defaultPrefix);

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
						const body = await response.text();
						console.error(
							`API request to ${response.url} failed: ${response.status} ${response.statusText}`,
							body,
						);
					}
				},
			],
		},
	};

	return ky.create({ ...defaultOptions, ...options });
}
