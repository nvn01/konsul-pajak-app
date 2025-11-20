// src/app/api/auth/verify-otp/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "nvn/server/db";
import { verifyOTP } from "nvn/lib/otp";

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
            // Update emailVerified if not set
            if (!user.emailVerified) {
                user = await db.user.update({
                    where: { email },
                    data: { emailVerified: new Date() },
                });
            }
        }

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
