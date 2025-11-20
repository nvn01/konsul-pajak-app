"use client";

import { use, useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChatMessage } from "@/components/chat-message";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "nvn/trpc/react";

interface ChatPageProps {
  params: Promise<{ chatId: string }>;
}

export default function ChatPage({ params }: ChatPageProps) {
  const { chatId } = use(params);
  const router = useRouter();
  const [message, setMessage] = useState("");
  const numericChatId = Number(chatId);
  const invalidChatId = !Number.isInteger(numericChatId) || numericChatId <= 0;

  const utils = api.useUtils();

  const historyQuery = api.chat.history.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const messagesQuery = api.chat.messages.useQuery(
    { chatId: numericChatId },
    {
      enabled: !invalidChatId,
      refetchOnReconnect: true,
    },
  );

  const createChatMutation = api.chat.create.useMutation({
    onSuccess: async (chat) => {
      await utils.chat.history.invalidate();
      router.push(`/chat/${chat.id}`);
    },
  });

  const sendMessageMutation = api.chat.sendMessage.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.chat.messages.invalidate({ chatId: numericChatId }),
        utils.chat.history.invalidate(),
      ]);
    },
  });

  const handleSend = useCallback(() => {
    if (invalidChatId || !message.trim()) return;

    const text = message.trim();
    setMessage("");

    sendMessageMutation.mutate(
      { chatId: numericChatId, message: text },
      {
        onError: (error) => {
          console.error("[Chat] Failed to send message", error);
          setMessage(text);
        },
      },
    );
  }, [invalidChatId, message, sendMessageMutation, numericChatId]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleSend();
  };

  const handleCreateChat = () => {
    createChatMutation.mutate(undefined, {
      onError: (error) => {
        console.error("[Chat] Failed to create chat", error);
      },
    });
  };

  const handleLogout = () => {
    void signOut({ callbackUrl: "/" });
  };

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="bg-primary text-primary-foreground border-primary-foreground/10 border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="bg-accent text-accent-foreground flex h-8 w-8 items-center justify-center rounded-md font-bold">
                KP
              </div>
              <h1 className="text-lg font-bold">Konsul Pajak</h1>
            </Link>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary-foreground hover:bg-primary-foreground/10"
            type="button"
            onClick={handleLogout}
          >
            Logout
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="bg-sidebar text-sidebar-foreground border-sidebar-border flex w-64 flex-col border-r">
          <div className="border-sidebar-border border-b p-4">
            <Button
              type="button"
              onClick={handleCreateChat}
              disabled={createChatMutation.isPending}
              className="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 w-full"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-2"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              {createChatMutation.isPending ? "Membuat..." : "Percakapan Baru"}
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="space-y-1 p-3">
              {historyQuery.isLoading && (
                <div className="text-sidebar-foreground/60 p-3 text-sm">
                  Loading riwayat...
                </div>
              )}

              {historyQuery.isSuccess && historyQuery.data?.length === 0 && (
                <div className="text-sidebar-foreground/60 p-3 text-xs">
                  Belum ada riwayat percakapan. Buat percakapan baru untuk
                  memulai.
                </div>
              )}

              {historyQuery.isSuccess &&
                historyQuery.data?.map((chat) => (
                  <Link key={chat.id} href={`/chat/${chat.id}`}>
                    <div
                      className={`hover:bg-sidebar-accent rounded-lg p-3 transition-colors ${
                        numericChatId === chat.id ? "bg-sidebar-accent" : ""
                      }`}
                    >
                      <div className="truncate text-sm font-medium">
                        {chat.title}
                      </div>
                      <div className="text-sidebar-foreground/60 mt-1 text-xs">
                        {chat.createdAt.toLocaleDateString("id-ID")}
                      </div>
                    </div>
                  </Link>
                ))}

              {historyQuery.isError && (
                <div className="text-destructive p-3 text-xs">
                  Gagal memuat riwayat chat.
                </div>
              )}
            </div>
          </ScrollArea>
        </aside>

        {/* Main Chat Area */}
        <main className="flex flex-1 flex-col">
          <ScrollArea className="flex-1 p-6">
            <div className="mx-auto max-w-4xl space-y-6">
              {invalidChatId && (
                <div className="text-destructive py-8 text-center">
                  Chat ID tidak valid. Silakan pilih percakapan dari sidebar
                  atau buat baru.
                </div>
              )}

              {messagesQuery.isLoading && !invalidChatId && (
                <div className="text-muted-foreground py-8 text-center">
                  Loading pesan...
                </div>
              )}

              {messagesQuery.isSuccess &&
                messagesQuery.data?.map((msg) => (
                  <ChatMessage key={msg.id} message={msg} />
                ))}

              {messagesQuery.isError && (
                <div className="text-destructive py-8 text-center">
                  Gagal memuat pesan. Silakan muat ulang halaman.
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="border-border bg-card border-t p-4">
            <form onSubmit={handleSubmit} className="mx-auto max-w-4xl">
              <div className="flex gap-3">
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tanyakan tentang perpajakan..."
                  className="min-h-[60px] resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={sendMessageMutation.isPending || invalidChatId}
                />
                <Button
                  type="submit"
                  size="lg"
                  className="bg-accent text-accent-foreground hover:bg-accent/90 px-8"
                  disabled={
                    sendMessageMutation.isPending ||
                    !message.trim() ||
                    invalidChatId
                  }
                >
                  {sendMessageMutation.isPending ? "Mengirim..." : "Kirim"}
                </Button>
              </div>
              <p className="text-muted-foreground mt-2 text-xs">
                Tekan Enter untuk kirim, Shift+Enter untuk baris baru
              </p>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
