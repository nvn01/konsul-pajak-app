// src/app/api/auth/send-otp/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "nvn/server/db";
import { generateOTP, hashOTP, getOTPExpiration } from "nvn/lib/otp";
import { sendOTPEmail } from "nvn/lib/email";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email } = body;

        // Validate email
        if (!email || typeof email !== "string") {
            return NextResponse.json(
                { error: "Email is required" },
                { status: 400 }
            );
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: "Invalid email format" },
                { status: 400 }
            );
        }

        // Generate OTP
        const otpCode = generateOTP();
        const hashedOTP = await hashOTP(otpCode);
        const expires = getOTPExpiration();

        // Delete any existing OTP for this email
        await db.verificationToken.deleteMany({
            where: { identifier: email },
        });

        // Store hashed OTP in database
        await db.verificationToken.create({
            data: {
                identifier: email,
                token: hashedOTP,
                expires: expires,
            },
        });

        // Send OTP email
        try {
            await sendOTPEmail(email, otpCode);
        } catch (emailError) {
            console.error("Error sending email:", emailError);
            // Delete the token if email fails
            await db.verificationToken.deleteMany({
                where: { identifier: email },
            });
            return NextResponse.json(
                { error: "Failed to send verification email. Please check your email service configuration." },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Kode verifikasi telah dikirim ke email Anda",
        });

    } catch (error) {
        console.error("Error in send-otp:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
