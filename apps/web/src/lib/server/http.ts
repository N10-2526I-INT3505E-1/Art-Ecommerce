import type { RequestEvent } from '@sveltejs/kit';
import ky, { type KyInstance, type Options } from 'ky';

export function api({ fetch }: Pick<RequestEvent, 'fetch'>, options: Options = {}): KyInstance {
	const defaultOptions: Options = {
		prefixUrl: 'http://localhost:3000/',
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
