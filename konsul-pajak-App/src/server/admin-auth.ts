export const ADMIN_COOKIE_NAME =
  process.env.NODE_ENV === "production" ? "__Secure-admin_session" : "admin_session";

export const ADMIN_COOKIE_OPTIONS = {
  path: "/",
  maxAge: 86400,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
};

export function generateAdminToken(adminId: number): string {
  return Buffer.from(`admin:${adminId}:${Date.now()}`).toString("base64");
}

