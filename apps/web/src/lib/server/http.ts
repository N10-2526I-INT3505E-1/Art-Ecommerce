import type { Cookies } from '@sveltejs/kit';
import ky, { type KyInstance, type Options } from 'ky';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';

interface ApiOptions extends Options {
	token?: string;
}

/**
 * Create an API client. Accepts any object containing at least { fetch }.
 * If { cookies } is present, the auth cookie is read and sent as Authorization header.
 * Falls back to parsing the auth cookie from the request Cookie header.
 * An explicit `token` in options always takes priority.
 */
export function api(
	event: {
		fetch: typeof globalThis.fetch;
		cookies?: Cookies;
		request?: Request;
		[key: string]: any;
	},
	options: ApiOptions = {},
): KyInstance {
	const DEFAULT_PROD_API = 'https://api.novus.io.vn/';

	// 1. Determine Base URL
	const rawUrl =
		(env.PRIVATE_API_URL as string | undefined) ??
		(dev ? 'http://localhost:3000' : DEFAULT_PROD_API);

	const ensureTrailingSlash = (u: string) => (u.endsWith('/') ? u : `${u}/`);
	const defaultPrefix = ensureTrailingSlash(rawUrl) + 'v1/';

	if (dev) console.log('API Prefix URL:', defaultPrefix);

	// 2. Resolve auth token: explicit option > cookies helper > request cookie header
	const { token: explicitToken, ...kyOptions } = options;
	let authToken = explicitToken;
	if (!authToken && event.cookies) {
		authToken = event.cookies.get('auth');
	}
	if (!authToken && event.request) {
		const cookieHeader = event.request.headers?.get('cookie') || '';
		const match = cookieHeader.match(/(?:^|;\s*)auth=([^;]*)/);
		if (match) authToken = match[1];
	}

	// 3. Build headers with Authorization
	const headers: Record<string, string> = {};
	if (authToken) {
		headers['Authorization'] = `Bearer ${authToken}`;
	}

	const defaultOptions: Options = {
		prefixUrl: defaultPrefix,
		credentials: 'include',
		fetch: event.fetch as typeof globalThis.fetch,
		timeout: 10000,
		retry: { limit: 2 },
		headers,
		hooks: {
			afterResponse: [
				async (_request, _options, response) => {
					if (!response.ok) {
						const errBody = await response.clone().text();
						console.error(`API Error [${response.status}]: ${response.url}`, errBody);
					}
				},
			],
		},
	};

	return ky.create({ ...defaultOptions, ...kyOptions });
}
