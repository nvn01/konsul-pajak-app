import { db } from "@/server/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const config = await db.quotaConfig.findFirst({ where: { id: 1 } });
    const defaultCredits = config?.defaultCredits ?? 20;

    // Reset credits back to defaultCredits if they are less than that
    const result = await db.user.updateMany({
      where: { credits: { lt: defaultCredits } },
      data: { credits: defaultCredits },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully refreshed quota for ${result.count} users.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
