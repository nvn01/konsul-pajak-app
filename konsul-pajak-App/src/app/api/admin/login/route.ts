import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import {
  ADMIN_COOKIE_NAME,
  ADMIN_COOKIE_OPTIONS,
  generateAdminToken,
} from "nvn/server/admin-auth";
import { db } from "nvn/server/db";

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "Username atau password salah." }, { status: 401 });
  }

  const admin = await db.admin.findUnique({ where: { username: parsed.data.username } });
  if (!admin) {
    return NextResponse.json({ error: "Username atau password salah." }, { status: 401 });
  }

  const valid = await bcrypt.compare(parsed.data.password, admin.password_hash);
  if (!valid) {
    return NextResponse.json({ error: "Username atau password salah." }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(ADMIN_COOKIE_NAME, generateAdminToken(admin.id), ADMIN_COOKIE_OPTIONS);

  return response;
}

