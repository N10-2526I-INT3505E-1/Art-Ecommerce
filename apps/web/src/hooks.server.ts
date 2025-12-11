import type { Handle } from '@sveltejs/kit';
import { HTTPError } from 'ky';
import { api } from '$lib/server/http';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Helper function to refresh access token and update cookies
 */
async function refreshAccessToken(
	event: Parameters<Handle>[0]['event'],
	client: ReturnType<typeof api>,
): Promise<string | null> {
	const refreshToken = event.cookies.get('refresh_token');

	if (!refreshToken) {
		return null;
	}

	try {
		const response = await client
			.post('sessions/refresh', {
				json: { refreshToken },
			})
			.json<{ accessToken: string }>();

		const newAccessToken = response.accessToken;
		console.log('Refreshed access token:', newAccessToken);

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
		console.error('Token refresh failed:', error);

		const cookieDomain = isProduction ? '.novus.io.vn' : undefined;
		const clearOptions = { path: '/', domain: cookieDomain };

		event.cookies.delete('auth', clearOptions);
		event.cookies.delete('refresh_token', clearOptions);
		return null;
	}
}

/**
 * Fetch and set user from /profile endpoint
 */
async function fetchUser(
	event: Parameters<Handle>[0]['event'],
	client: ReturnType<typeof api>,
): Promise<boolean> {
	try {
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
	const client = api(event);
	let token = event.cookies.get('auth');

	// --- AUTHENTICATION FLOW ---

	// Step 1: If no access token exists, try to refresh proactively
	if (!token) {
		token = await refreshAccessToken(event, client);
		if (!token) {
			event.locals.user = null;
		}
	}

	// Step 2: If we have a token (existing or just refreshed), try to fetch user
	// We use an 'if' here because Step 1 might have failed to get a token.
	if (token) {
		const success = await fetchUser(event, client);

		// Step 3: If unauthorized (success is false), try to refresh and retry once
		if (!success) {
			const refreshedToken = await refreshAccessToken(event, client);

			if (refreshedToken) {
				const retrySuccess = await fetchUser(event, client);
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
