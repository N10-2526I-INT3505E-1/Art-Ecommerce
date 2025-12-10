// import { json } from '@sveltejs/kit';
// import type { RequestHandler } from './$types';

// export const POST: RequestHandler = async ({ cookies, locals }) => {
// 	const refreshToken = cookies.get('refresh_token');

// 	if (!refreshToken) {
// 		return json({ error: 'No refresh token' }, { status: 401 });
// 	}

// 	try {
// 		const response = await fetch('http://localhost:3000/api/auth/refresh', {
// 			method: 'POST',
// 			headers: { 'Content-Type': 'application/json' },
// 			body: JSON.stringify({ refreshToken }),
// 		});

// 		const { accessToken } = await response.json();

// 		cookies.set('auth', accessToken, {
// 			path: '/',
// 			httpOnly: true,
// 			sameSite: 'lax',
// 			maxAge: 30,
// 		});

// 		return json({ success: true });
// 	} catch {
// 		cookies.delete('auth', { path: '/' });
// 		cookies.delete('refresh_token', { path: '/' });
// 		return json({ error: 'Refresh failed' }, { status: 401 });
// 	}
// };
