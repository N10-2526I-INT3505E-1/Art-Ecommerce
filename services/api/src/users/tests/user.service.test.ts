import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { ConflictError, UnauthorizedError } from '@common/errors/httpErrors';
import type { SignUpSchema } from '@user/user.model';
import { UserService } from '@user/user.service';
import type { Static } from 'elysia';

// Mock the password utility functions
mock.module('@user/utils/passwordHash', () => ({
    comparePassword: async (plain: string, hash: string) => plain === 'password123' && hash === 'hashed_password',
    hashPassword: async (plain: string) => 'new_hashed_password',
}));

// Create a complete, type-safe mock user that matches the database schema
const mockFullUser: Static<typeof SignUpSchema> = {
    id: 1,
    email: 'test@example.com',
    username: 'testuser',
    password: 'hashed_password',
    first_name: 'Test',
    last_name: 'User',
    dob: null,
    role: 'user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
};

describe('UserService', () => {
    let userService: UserService;
    let mockDb: any;
    let mockJwt: any;

    beforeEach(() => {
        // Arrange for all test
        mockDb = {
            select: mock().mockReturnThis(),
            from: mock().mockReturnThis(),
            where: mock().mockResolvedValue([]),
            insert: mock().mockReturnThis(),
            values: mock().mockReturnThis(),
            returning: mock().mockResolvedValue([]),
            delete: mock().mockReturnThis(),
        };

        mockJwt = {
            sign: mock().mockResolvedValue('mock_jwt_token'),
        };

        userService = new UserService(mockDb, mockJwt);
    });

    describe('login', () => {
        it('should return a token for a user with valid credentials', async () => {
            // Arrange
            mockDb.where.mockResolvedValue([mockFullUser]);

            // Act
            const result = await userService.login({ email: 'test@example.com', password: 'password123' });

            // Assert
            expect(result.accessToken).toBe('mock_jwt_token');
            expect(result.refreshToken).toBeDefined();
            expect(mockJwt.sign).toHaveBeenCalledWith({
                id: mockFullUser.id,
                email: mockFullUser.email,
                role: mockFullUser.role,
            });
        });

        it('should throw UnauthorizedError if the user is not found', async () => {
            // Arrange
            mockDb.where.mockResolvedValue([]);

            // Act & Assert
            expect(
                userService.login({ email: 'nouser@example.com', password: 'password123' }),
            ).rejects.toThrow(new UnauthorizedError('Invalid email or password.'));
        });

        it('should throw UnauthorizedError for an incorrect password', async () => {
            // Arrange
            mockDb.where.mockResolvedValue([mockFullUser]);

            // Act & Assert
            expect(
                userService.login({ email: 'test@example.com', password: 'wrong_password' }),
            ).rejects.toThrow(new UnauthorizedError('Invalid email or password.'));
        });
    });

    describe('refreshAccessToken', () => {
        it('should return a new access token for a valid refresh token', async () => {
            // Arrange
            const validRefreshToken = {
                user_id: 1,
                token: 'valid_refresh_token',
                expires_at: new Date(Date.now() + 10000), // Future date
            };
            mockDb.where
                .mockResolvedValueOnce([validRefreshToken]) // For finding the token
                .mockResolvedValueOnce([mockFullUser]); // For finding the user

            // Act
            const result = await userService.refreshAccessToken('valid_refresh_token');

            // Assert
            expect(result.accessToken).toBe('mock_jwt_token');
        });

        it('should throw UnauthorizedError if refresh token is invalid', async () => {
            // Arrange
            mockDb.where.mockResolvedValue([]);

            // Act & Assert
            expect(userService.refreshAccessToken('invalid_token')).rejects.toThrow(
                new UnauthorizedError('Invalid refresh token'),
            );
        });

        it('should throw UnauthorizedError if refresh token is expired', async () => {
            // Arrange
            const expiredRefreshToken = {
                user_id: 1,
                token: 'expired_token',
                expires_at: new Date(Date.now() - 10000), // Past date
            };
            mockDb.where.mockResolvedValue([expiredRefreshToken]);

            // Act & Assert
            expect(userService.refreshAccessToken('expired_token')).rejects.toThrow(
                new UnauthorizedError('Refresh token expired'),
            );
        });
    });

    describe('logout', () => {
        it('should delete the refresh token', async () => {
            // Act
            await userService.logout('some_refresh_token');

            // Assert
            expect(mockDb.delete).toHaveBeenCalled();
        });
    });

    describe('createUser', () => {
        it('should create and return a new user if email and username are unique', async () => {
            // Arrange
            const newUserPayload = {
                email: 'new@example.com',
                username: 'newuser',
                password: 'password123',
                first_name: 'New',
                last_name: 'User',
            };
            const createdUserInDb = {
                ...mockFullUser,
                ...newUserPayload,
                id: 2,
                password: 'new_hashed_password',
            } as Static<typeof SignUpSchema>;

            mockDb.where.mockResolvedValue([]);
            mockDb.returning.mockResolvedValue([createdUserInDb]);

            // Act
            const result = await userService.createUser(newUserPayload);

            // Assert
            expect(result).toBeInstanceOf(Object);
            expect(result.accessToken).toBe('mock_jwt_token');
            expect(result.refreshToken).toBeDefined();
        });

        it('should throw ConflictError if the email already exists', async () => {
            // Arrange
            mockDb.where.mockResolvedValue([mockFullUser]);

            // Act & Assert
            expect(
                userService.createUser({
                    email: 'test@example.com',
                    username: 'newuser',
                    password: 'password123',
                    first_name: 'Test',
                    last_name: 'User',
                }),
            ).rejects.toThrow(new ConflictError('A user with this email already exists.'));
        });
    });
});