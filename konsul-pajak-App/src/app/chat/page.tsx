import { ChatShell } from "./chat-shell";
import { auth } from "nvn/server/auth";

/**
 * Chat index page — accessible to both guests and authenticated users.
 * Passes isGuest flag to ChatShell for conditional UI rendering.
 */
export default async function ChatIndexPage() {
  const session = await auth();

  return <ChatShell initialChatId={null} isGuest={!session?.user} />;
}
