import { UnauthorizedError } from '@common/errors/httpErrors';

/**
 * Shared JWT auth derive for protected routes.
 * Verifies the Bearer token from the Authorization header
 * and returns user info ({ id, email, role }).
 *
 * Usage in a plugin:
 *   .derive(jwtAuthDerive(jwtInstance))
 *
 * For plugins that don't have their own jwt instance,
 * use the standalone derive that accepts headers + jwt from context.
 */

export const jwtAuthDerive = async ({
	headers,
	jwt,
}: {
	headers: Record<string, string | string[] | undefined>;
	jwt: { verify: (token: string) => Promise<Record<string, string | number> | false> };
}) => {
	const authHeader = headers['authorization'];
	const headerValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;

	if (!headerValue || !headerValue.startsWith('Bearer ')) {
		throw new UnauthorizedError('Missing or invalid Authorization header');
	}

	const token = headerValue.slice(7);
	const payload = await jwt.verify(token);

	if (!payload || !payload.id) {
		throw new UnauthorizedError('Invalid or expired token');
	}

	return {
		user: {
			id: payload.id as string,
			email: (payload.email as string) || '',
			role: (payload.role as string) || 'user',
		},
	};
};
