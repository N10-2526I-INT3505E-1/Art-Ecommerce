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
		console.log('Refreshed access token:', newAccessToken);

		const cookieDomain = isProduction ? '.novus.io.vn' : 'localhost';

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
		console.error('Token refresh failed:', error);

		const cookieDomain = isProduction ? '.novus.io.vn' : 'localhost';
		const clearOptions = { path: '/', domain: cookieDomain };

		event.cookies.delete('auth', clearOptions);
		event.cookies.delete('refresh_token', clearOptions);
		return null;
	}
}

/**
 * Fetch and set user from /profile endpoint
 * @param token - Explicit token to use (overrides cookie)
 */
async function fetchUser(event: Parameters<Handle>[0]['event'], token?: string): Promise<boolean> {
	try {
		// Create client with explicit token if provided
		const client = api(event, { token });
		const responseData: unknown = await client.get('users/profile').json();

		if (
			responseData &&
			typeof responseData === 'object' &&
			'user' in responseData &&
			responseData.user
		) {
			event.locals.user = responseData.user as App.User;
			return true;
		}

		console.log('Invalid API response structure:', responseData);
		return false;
	} catch (error) {
		if (error instanceof HTTPError && error.response.status === 401) {
			return false; // Unauthorized
		}
		console.error('Error fetching user:', error);
		return false;
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
		const success = await fetchUser(event, token);

		// Step 3: If unauthorized (success is false), try to refresh and retry once
		if (!success) {
			const refreshedToken = await refreshAccessToken(event);

			if (refreshedToken) {
				const retrySuccess = await fetchUser(event, refreshedToken);
				if (!retrySuccess) {
					event.locals.user = null;
				}
			} else {
				event.locals.user = null;
			}
		}
	}

	// --- RESPONSE HANDLING ---

	// 1. Generate the response
	const response = await resolve(event);

	response.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');

	return response;
};
