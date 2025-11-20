import { ChatShell } from "../chat-shell";

interface ChatPageProps {
  params: Promise<{ chatId: string }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { chatId } = await params;
  return <ChatShell initialChatId={chatId} />;
}

