// FILE: src/server/auth/config.ts

import { PrismaAdapter } from "@auth/prisma-adapter";
import type { DefaultSession, NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

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
      },
      async authorize(credentials) {
        if (!credentials?.email) {
          return null;
        }

        // Find user by email
        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user) {
          return null;
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
