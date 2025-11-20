// src/lib/otp.ts
import crypto from "crypto";
import bcrypt from "bcryptjs";

/**
 * Generates a random 6-digit OTP code
 */
export function generateOTP(): string {
    // Generate a random 6-digit number
    const otp = crypto.randomInt(100000, 999999).toString();
    return otp;
}

/**
 * Hashes an OTP code for secure storage
 */
export async function hashOTP(code: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    const hashedCode = await bcrypt.hash(code, salt);
    return hashedCode;
}

/**
 * Verifies an OTP code against a hash
 */
export async function verifyOTP(code: string, hash: string): Promise<boolean> {
    const isValid = await bcrypt.compare(code, hash);
    return isValid;
}

/**
 * Get OTP expiration time (10 minutes from now)
 */
export function getOTPExpiration(): Date {
    const expiration = new Date();
    expiration.setMinutes(expiration.getMinutes() + 10);
    return expiration;
}
