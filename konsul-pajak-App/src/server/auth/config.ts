// FILE: src/server/auth/config.ts

import { PrismaAdapter } from "@auth/prisma-adapter";
import type { DefaultSession, NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

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
  session: {
    strategy: "jwt",
  },
  providers: [
    GoogleProvider({
      clientId: String(env.GOOGLE_CLIENT_ID),
      clientSecret: String(env.GOOGLE_CLIENT_SECRET),
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
