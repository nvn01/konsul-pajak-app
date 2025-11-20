import { redirect } from "next/navigation";

import { auth } from "nvn/server/auth";
import { db } from "nvn/server/db";

export default async function ChatIndexPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const latestChat = await db.chat.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  if (latestChat) {
    redirect(`/chat/${latestChat.id}`);
  }

  const newChat = await db.chat.create({
    data: {
      userId: session.user.id,
    },
  });

  redirect(`/chat/${newChat.id}`);
}

