import { redirect } from "next/navigation";

import { ChatShell } from "./chat-shell";
import { auth } from "nvn/server/auth";

export default async function ChatIndexPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return <ChatShell initialChatId={null} />;
}

