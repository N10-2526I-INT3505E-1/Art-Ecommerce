import type { Handle } from '@sveltejs/kit';
import { HTTPError } from 'ky';
import { api } from '$lib/server/http';

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
		// Send refresh token in request body (you'll need to update your API endpoint to accept this)
		const response = await client
			.post('sessions/refresh', {
				json: { refreshToken },
			})
			.json<{ accessToken: string }>();

		const newAccessToken = response.accessToken;
		console.log('Refreshed access token:', newAccessToken);

		// Set the new access token cookie
		event.cookies.set('auth', newAccessToken, {
			path: '/',
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			maxAge: 60 * 30, // 30 minutes
		});

		return newAccessToken;
	} catch (error) {
		console.error('Token refresh failed:', error);
		// Clear invalid cookies
		event.cookies.delete('auth', { path: '/' });
		event.cookies.delete('refresh_token', { path: '/' });
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

		throw new Error('Invalid API response structure');
	} catch (error) {
		if (error instanceof HTTPError && error.response.status === 401) {
			return false; // Unauthorized, but not an error
		}
		console.error('Error fetching user:', error);
		return false;
	}
}

export const handle: Handle = async ({ event, resolve }) => {
	const client = api(event);
	let token = event.cookies.get('auth');

	// Step 1: If no access token exists, try to refresh proactively
	if (!token) {
		token = await refreshAccessToken(event, client);
		if (!token) {
			event.locals.user = null;
			return resolve(event);
		}
	}

	// Step 2: Try to fetch user with current token
	const success = await fetchUser(event, client);

	if (success) {
		return resolve(event);
	}

	// Step 3: If unauthorized, try to refresh and retry once
	const refreshedToken = await refreshAccessToken(event, client);

	if (refreshedToken) {
		const retrySuccess = await fetchUser(event, client);
		if (!retrySuccess) {
			event.locals.user = null;
		}
	} else {
		event.locals.user = null;
	}

	return resolve(event);
};
