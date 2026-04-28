import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here.
   * This way you can ensure the app isn't built with invalid env vars.
   */
  server: {
    DATABASE_URL: z.string().url(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    NEXTAUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string()
        : z.string().optional(),
    NEXTAUTH_URL: z.preprocess(
      (str) =>
        process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : str,
      z.string().url(),
    ),

    // --- Google OAuth ---
    GOOGLE_CLIENT_ID: z.string(),
    GOOGLE_CLIENT_SECRET: z.string(),

    // --- Google Cloud / Vertex AI ---
    GCP_PROJECT_ID: z.string(),
    GCP_LOCATION: z.string().default("asia-southeast2"),
    GCP_DATA_STORE_ID: z.string(),
    GOOGLE_APPLICATION_CREDENTIALS: z.string(),

    // --- Admin ---
    ADMIN_USERNAME: z.string(),
    ADMIN_PASSWORD: z.string(),
    // -----------------------------
  },

  /**
   * Specify your client-side environment variables schema here.
   * To expose them to the client, prefix them with `NEXT_PUBLIC_`.
   */
  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,

    // --- Google OAuth ---
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,

    // --- Google Cloud / Vertex AI ---
    GCP_PROJECT_ID: process.env.GCP_PROJECT_ID,
    GCP_LOCATION: process.env.GCP_LOCATION,
    GCP_DATA_STORE_ID: process.env.GCP_DATA_STORE_ID,
    GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS,

    // --- Admin ---
    ADMIN_USERNAME: process.env.ADMIN_USERNAME,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    // -----------------------------
  },

  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
