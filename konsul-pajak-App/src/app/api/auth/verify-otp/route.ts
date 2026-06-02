// src/app/api/auth/verify-otp/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "nvn/server/db";
import { verifyOTP } from "nvn/lib/otp";

// In-memory rate limiter for OTP verification attempts
const verifyAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_VERIFY_ATTEMPTS = 5;
const VERIFY_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkVerifyRateLimit(key: string): boolean {
    const now = Date.now();
    const entry = verifyAttempts.get(key);
    if (!entry || now > entry.resetAt) {
        verifyAttempts.set(key, { count: 1, resetAt: now + VERIFY_WINDOW_MS });
        return true;
    }
    if (entry.count >= MAX_VERIFY_ATTEMPTS) {
        return false;
    }
    entry.count++;
    return true;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, code } = body;

        // Validate inputs
        if (!email || typeof email !== "string") {
            return NextResponse.json(
                { error: "Email is required" },
                { status: 400 }
            );
        }

        if (!code || typeof code !== "string") {
            return NextResponse.json(
                { error: "Verification code is required" },
                { status: 400 }
            );
        }

        // Rate limit: max 5 verification attempts per email per 15 minutes
        const normalizedEmail = email.toLowerCase().trim();
        if (!checkVerifyRateLimit(normalizedEmail)) {
            // Delete all tokens for this email on lockout
            await db.verificationToken.deleteMany({
                where: { identifier: email },
            });
            return NextResponse.json(
                { error: "Terlalu banyak percobaan verifikasi. Silakan minta kode baru setelah beberapa menit." },
                { status: 429 }
            );
        }

        // Find all verification tokens for this email
        const tokens = await db.verificationToken.findMany({
            where: { identifier: email },
        });

        if (tokens.length === 0) {
            return NextResponse.json(
                { error: "Kode verifikasi tidak ditemukan atau telah kedaluwarsa" },
                { status: 400 }
            );
        }

        // Try to verify against each token (there should only be one, but check all to be safe)
        let verified = false;
        let validToken = null;

        for (const token of tokens) {
            // Check if token has expired
            if (new Date() > token.expires) {
                continue;
            }

            // Verify OTP
            const isValid = await verifyOTP(code, token.token);
            if (isValid) {
                verified = true;
                validToken = token;
                break;
            }
        }

        if (!verified) {
            return NextResponse.json(
                { error: "Kode verifikasi salah atau telah kedaluwarsa" },
                { status: 400 }
            );
        }

        // Delete the used token
        if (validToken) {
            await db.verificationToken.delete({
                where: {
                    identifier_token: {
                        identifier: validToken.identifier,
                        token: validToken.token,
                    },
                },
            });
        }

        // Check if user exists, create if not
        let user = await db.user.findUnique({
            where: { email },
        });

        if (!user) {
            user = await db.user.create({
                data: {
                    email,
                    emailVerified: new Date(),
                },
            });
        } else {
            // Update emailVerified timestamp (used by CredentialsProvider authorize check)
            user = await db.user.update({
                where: { email },
                data: { emailVerified: new Date() },
            });
        }

        // Reset verify attempts on successful verification
        verifyAttempts.delete(normalizedEmail);

        // Return success with user data
        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                image: user.image,
            },
        });

    } catch (error) {
        console.error("Error in verify-otp:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
