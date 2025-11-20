"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

import { ChatMessage } from "@/components/chat-message";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { api } from "nvn/trpc/react";

interface ChatShellProps {
  initialChatId: string | null;
}

export function ChatShell({ initialChatId }: ChatShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [message, setMessage] = useState("");

  const utils = api.useUtils();

  const historyQuery = api.chat.history.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const hasActiveChat = Boolean(initialChatId);

  const messagesQuery = api.chat.messages.useQuery(
    { chatId: initialChatId ?? "" },
    {
      enabled: hasActiveChat,
      refetchOnReconnect: true,
    },
  );

  const createChatMutation = api.chat.create.useMutation();

  const sendMessageMutation = api.chat.sendMessage.useMutation();

  const isComposerBusy =
    createChatMutation.isPending || sendMessageMutation.isPending;

  const handleSend = useCallback(async () => {
    if (!message.trim()) return;

    const text = message.trim();
    setMessage("");

    try {
      let targetChatId = initialChatId;

      if (!targetChatId) {
        const newChat = await createChatMutation.mutateAsync();
        targetChatId = newChat.id;
        router.replace(`/chat/${newChat.id}`);
      }

      if (!targetChatId) {
        throw new Error("Gagal menentukan chat ID untuk percakapan.");
      }

      await sendMessageMutation.mutateAsync({
        chatId: targetChatId,
        message: text,
      });

      await Promise.all([
        utils.chat.messages.invalidate({ chatId: targetChatId }),
        utils.chat.history.invalidate(),
      ]);
    } catch (error) {
      console.error("[Chat] Failed to send message", error);
      setMessage(text);
    }
  }, [message, initialChatId, createChatMutation, router, sendMessageMutation, utils]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void handleSend();
  };

  const handleCreateChat = () => {
    if (pathname !== "/chat") {
      router.push("/chat");
    }
    setMessage("");
  };

  const handleLogout = () => {
    void signOut({ callbackUrl: "/" });
  };

  const sidebarContent = useMemo(() => {
    if (historyQuery.isLoading) {
      return (
        <div className="text-sidebar-foreground/60 p-3 text-sm">
          Loading riwayat...
        </div>
      );
    }

    if (historyQuery.isError) {
      return (
        <div className="text-destructive p-3 text-xs">
          Gagal memuat riwayat chat.
        </div>
      );
    }

    if (historyQuery.isSuccess && historyQuery.data.length === 0) {
      return (
        <div className="text-sidebar-foreground/60 p-3 text-xs">
          Belum ada riwayat percakapan. Mulai percakapan baru untuk memulai.
        </div>
      );
    }

    return historyQuery.data?.map((chat) => (
      <Link key={chat.id} href={`/chat/${chat.id}`}>
        <div
          className={`hover:bg-sidebar-accent rounded-lg p-3 transition-colors ${
            initialChatId === chat.id ? "bg-sidebar-accent" : ""
          }`}
        >
          <div className="truncate text-sm font-medium">{chat.title}</div>
          <div className="text-sidebar-foreground/60 mt-1 text-xs">
            {new Date(chat.createdAt).toLocaleDateString("id-ID")}
          </div>
        </div>
      </Link>
    ));
  }, [historyQuery, initialChatId]);

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
              Percakapan Baru
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="space-y-1 p-3">{sidebarContent}</div>
          </ScrollArea>
        </aside>

        {/* Main Chat Area */}
        <main className="flex flex-1 flex-col">
          <ScrollArea className="flex-1 p-6">
            <div className="mx-auto max-w-4xl space-y-6">
              {!hasActiveChat && (
                <div className="text-muted-foreground py-8 text-center">
                  Mulai percakapan baru dengan mengetik pertanyaan pertama Anda.
                </div>
              )}

              {hasActiveChat && messagesQuery.isLoading && (
                <div className="text-muted-foreground py-8 text-center">
                  Loading pesan...
                </div>
              )}

              {hasActiveChat &&
                messagesQuery.isSuccess &&
                messagesQuery.data?.map((msg) => (
                  <ChatMessage key={msg.id} message={msg} />
                ))}

              {hasActiveChat && messagesQuery.isError && (
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
                      void handleSend();
                    }
                  }}
                  disabled={isComposerBusy}
                />
                <Button
                  type="submit"
                  size="lg"
                  className="bg-accent text-accent-foreground hover:bg-accent/90 px-8"
                  disabled={isComposerBusy || !message.trim()}
                >
                  {isComposerBusy ? "Mengirim..." : "Kirim"}
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


