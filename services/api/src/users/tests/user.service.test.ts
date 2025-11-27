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
            expect(result.token).toBe('mock_jwt_token');
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
            expect(result).toHaveProperty('id', 2);
            expect(result).toHaveProperty('password', 'new_hashed_password');
            expect(result).toMatchObject({
                email: 'new@example.com',
                username: 'newuser',
                first_name: 'New',
            });
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