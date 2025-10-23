import bcrypt from "bcryptjs";
import { nanoid, customAlphabet } from "nanoid";

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * Generate a unique project access code
 * Format: XXXXXX (uppercase alphanumeric)
 */
export function generateProjectCode(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const nanoidCustom = customAlphabet(alphabet, 6);
  return `${nanoidCustom()}`;
}

/**
 * Generate a unique invite code
 * Format: XXXX-XXXX-XXXX (uppercase alphanumeric)
 */
export function generateInviteCode(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const nanoidCustom = customAlphabet(alphabet, 4);
  return `${nanoidCustom()}-${nanoidCustom()}-${nanoidCustom()}`;
}

/**
 * Generate a random secure token
 */
export function generateSecureToken(): string {
  return nanoid(32);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 * Minimum 8 characters, at least one letter and one number
 */
export function isValidPassword(password: string): boolean {
  if (password.length < 8) return false;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  return hasLetter && hasNumber;
}
