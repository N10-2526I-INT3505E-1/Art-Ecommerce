import type { Handle } from '@sveltejs/kit';
import { HTTPError } from 'ky';
import { api } from '$lib/server/http';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Helper function to refresh access token and update cookies
 */
async function refreshAccessToken(event: Parameters<Handle>[0]['event']): Promise<string | null> {
	const refreshToken = event.cookies.get('refresh_token');

	if (!refreshToken) {
		return null;
	}

	try {
		const client = api(event);
		const response = await client
			.post('sessions/refresh', {
				json: { refreshToken },
			})
			.json<{ accessToken: string }>();

		const newAccessToken = response.accessToken;

		const cookieDomain = isProduction ? '.novus.io.vn' : undefined;

		event.cookies.set('auth', newAccessToken, {
			path: '/',
			domain: cookieDomain,
			httpOnly: true,
			secure: isProduction,
			sameSite: 'lax',
			maxAge: 60 * 30, // 30 minutes
		});

		return newAccessToken;
	} catch (error) {
		// Distinguish a rejected token from an unreachable API. A timeout or 5xx
		// (e.g. a free-tier cold start) does NOT mean the refresh token is invalid,
		// so keep the cookies — only clear them when the API explicitly rejects it.
		const rejected = error instanceof HTTPError && [401, 403].includes(error.response.status);
		const cookieDomain = isProduction ? '.novus.io.vn' : undefined;

		if (rejected) {
			console.error(
				`Token refresh rejected (${error.response.status}), clearing session cookies`,
			);
			const clearOptions = { path: '/', domain: cookieDomain };
			event.cookies.delete('auth', clearOptions);
			event.cookies.delete('refresh_token', clearOptions);
		} else {
			console.error('Token refresh failed (transient, keeping session):', error);
		}

		return null;
	}
}

type FetchUserResult = 'ok' | 'unauthorized' | 'error';

/**
 * Fetch and set user from /profile endpoint
 * @param token - Explicit token to use (overrides cookie)
 */
async function fetchUser(
	event: Parameters<Handle>[0]['event'],
	token?: string,
): Promise<FetchUserResult> {
	try {
		const client = api(event, token ? { token } : {});
		const responseData: unknown = await client.get('users/profile').json();

		if (
			responseData &&
			typeof responseData === 'object' &&
			'user' in responseData &&
			responseData.user
		) {
			event.locals.user = responseData.user as App.User;
			return 'ok';
		}

		console.log('Invalid API response structure:', responseData);
		return 'error';
	} catch (error) {
		if (error instanceof HTTPError && error.response.status === 401) {
			return 'unauthorized';
		}
		console.error('Error fetching user:', error);
		return 'error';
	}
}

export const handle: Handle = async ({ event, resolve }) => {
	let token = event.cookies.get('auth');

	// --- AUTHENTICATION FLOW ---

	// Step 1: If no access token exists, try to refresh proactively
	if (!token) {
		token = await refreshAccessToken(event);
		if (!token) {
			event.locals.user = null;
		}
	}

	// Step 2: If we have a token (existing or just refreshed), try to fetch user
	if (token) {
		// Pass the token explicitly to ensure we use the current token
		const result = await fetchUser(event, token);

		// Step 3: Only a definitive 401 means the access token is stale, so refresh
		// once and retry. A transient failure (timeout, 5xx, network) must not trigger
		// a refresh cascade — that just piles more doomed requests onto a struggling
		// API and can end up clearing a perfectly valid session.
		if (result === 'unauthorized') {
			const refreshedToken = await refreshAccessToken(event);

			if (refreshedToken) {
				const retryResult = await fetchUser(event, refreshedToken);
				if (retryResult !== 'ok') {
					event.locals.user = null;
				}
			} else {
				event.locals.user = null;
			}
		} else if (result === 'error') {
			// API unreachable — keep the session cookies for the next request.
			event.locals.user = null;
		}
	}

	// --- RESPONSE HANDLING ---

	// 1. Generate the response
	const response = await resolve(event);

	response.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');

	return response;
};
