import type { ValidationError } from 'elysia';
import { Elysia } from 'elysia';
import {
    BadRequestError, // Added
    ConflictError,
    ForbiddenError,
    HttpError,
    InternalServerError, // Added
    NotFoundError,
    UnauthorizedError,
} from './httpErrors';

export const errorHandler = new Elysia({ name: 'errorHandler' })
    .error({
        HttpError,
        ForbiddenError,
        NotFoundError,
        ConflictError,
        UnauthorizedError,
        BadRequestError,
        InternalServerError,
    })
    .onError(({ code, error, set }) => {
        if (error instanceof HttpError) {
            if(error.status >= 500) {
                console.error(`[HttpError] Status: ${error.status}, Message: ${error.message}`);
            }
            set.status = error.status;
            return { message: error.message };
        }

        console.error(`[${code}] Path: ${error}`);
        
        switch (code) {
            case 'NOT_FOUND':
                set.status = 404;
                return { message: 'The requested route does not exist.' };

            case 'VALIDATION': {
                const validationError = error as ValidationError;
				set.status = 400;
				return {
					message: 'Validation failed.',
					errors: validationError.all.map((e) => ({
						field: (e as any).path.slice(1),
						message: e.summary,
					})),
				};
            }

            case 'PARSE': 
                set.status = 400;
                return { message: 'Failed to parse request body. Check your JSON syntax.' };

            case 'UNKNOWN':
            default:
                set.status = 500;
                return { message: 'An unexpected internal server error occurred.' };
        }
    });