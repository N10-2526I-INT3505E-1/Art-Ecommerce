export const hashPassword = async (password: string) => {
	return await Bun.password.hash(password, "argon2id");
};

/**
 * Compare a plaintext password with an Argon2 hashed password.
 *
 * @param hashed - The Argon2 hashed password to verify against.
 * @param plain - The plaintext password provided by the user.
 * @returns Promise<boolean> - Resolves to true if the plaintext matches the hash, otherwise false.
 * @throws Error
 */
export async function comparePassword(plain: string, hash: string): Promise<boolean> {
    return await Bun.password.verify(plain, hash, 'argon2id');
}