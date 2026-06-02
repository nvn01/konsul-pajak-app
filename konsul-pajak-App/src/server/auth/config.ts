// FILE: src/server/auth/config.ts

import { PrismaAdapter } from "@auth/prisma-adapter";
import type { DefaultSession, NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { verifyOTP } from "nvn/lib/otp";

import { db } from "../db";
import { env } from "../../env";

/**
 * Module augmentation untuk `next-auth`. Mengizinkan kita menambah properti custom
 * ke objek `session` (seperti user.id) agar tetap type-safe.
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      // ...properti lain misal: role: UserRole;
    } & DefaultSession["user"];
  }
}

/**
 * Opsi konfigurasi NextAuth.js
 */
export const authConfig: NextAuthConfig = {
  trustHost: true,
  session: {
    strategy: "jwt",
  },
  providers: [
    GoogleProvider({
      clientId: String(env.GOOGLE_CLIENT_ID),
      clientSecret: String(env.GOOGLE_CLIENT_SECRET),
    }),
    CredentialsProvider({
      id: "credentials",
      name: "Email OTP",
      credentials: {
        email: { label: "Email", type: "email" },
        code: { label: "Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.code) {
          return null;
        }

        const email = credentials.email as string;
        const code = credentials.code as string;

        // Find tokens for this email
        const tokens = await db.verificationToken.findMany({
          where: { identifier: email },
        });

        if (tokens.length === 0) {
          return null; // No tokens found
        }

        let verified = false;
        let validToken = null;

        for (const token of tokens) {
          if (new Date() > token.expires) continue;

          const isValid = await verifyOTP(code, token.token);
          if (isValid) {
            verified = true;
            validToken = token;
            break;
          }
        }

        if (!verified) {
          return null; // Invalid code
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

        // Find or create user
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
          user = await db.user.update({
            where: { email },
            data: { emailVerified: new Date() },
          });
        }

        // Return user object for session
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  adapter: PrismaAdapter(db),
  callbacks: {
    session: async ({ session, token, user }) => {
      if (session.user) {
        session.user.id = user?.id ?? token?.sub ?? session.user.id ?? "";
      }
      return session;
    },
  },
};
