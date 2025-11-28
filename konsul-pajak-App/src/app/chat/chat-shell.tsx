"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { LogOut, Menu, X, Send, Loader2 } from "lucide-react";

import { ChatMessage } from "@/components/chat-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { api } from "nvn/trpc/react";

interface ChatShellProps {
  initialChatId: string | null;
}

export function ChatShell({ initialChatId }: ChatShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [message, setMessage] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [optimisticMessages, setOptimisticMessages] = useState<Array<{
    id: string | number;
    role: "user" | "assistant";
    content: string;
    createdAt: Date;
    sources: any[] | undefined;
    feedback: { rating: "suka" | "tidak_suka" } | null;
  }>>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // Auto-scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Scroll when messages update
  useEffect(() => {
    scrollToBottom();
  }, [messagesQuery.data, optimisticMessages, scrollToBottom]);

  const handleSend = useCallback(async () => {
    if (!message.trim()) return;

    const text = message.trim();
    const tempId = `temp-${Date.now()}`;

    // Optimistic UI: Add user message immediately
    setOptimisticMessages(prev => [...prev, {
      id: tempId,
      role: "user",
      content: text,
      createdAt: new Date(),
      sources: undefined,
      feedback: null
    }]);
    setMessage("");

    // Scroll to bottom after adding optimistic message
    setTimeout(() => scrollToBottom(), 100);

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

      // Clear optimistic message after successful send
      setOptimisticMessages(prev => prev.filter(m => m.id !== tempId));
    } catch (error) {
      console.error("[Chat] Failed to send message", error);
      setMessage(text);
      // Remove optimistic message on error
      setOptimisticMessages(prev => prev.filter(m => m.id !== tempId));
    }
  }, [message, initialChatId, createChatMutation, router, sendMessageMutation, utils, scrollToBottom]);

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

  const handleCloseSidebar = () => {
    setIsSidebarOpen(false);
  };

  const [renamingChatId, setRenamingChatId] = useState<string | null>(null);
  const [newChatTitle, setNewChatTitle] = useState("");
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null);

  const deleteChatMutation = api.chat.deleteChat.useMutation({
    onSuccess: () => {
      void utils.chat.history.invalidate();
      setDeletingChatId(null);
      // If deleting current chat, redirect to main chat
      if (deletingChatId === initialChatId) {
        router.push("/chat");
      }
    },
  });

  const renameChatMutation = api.chat.renameChat.useMutation({
    onSuccess: () => {
      void utils.chat.history.invalidate();
      setRenamingChatId(null);
      setNewChatTitle("");
    },
  });

  const handleRenameClick = (chatId: string, currentTitle: string) => {
    setRenamingChatId(chatId);
    setNewChatTitle(currentTitle);
  };

  const handleRenameSubmit = () => {
    if (renamingChatId && newChatTitle.trim()) {
      renameChatMutation.mutate({
        chatId: renamingChatId,
        title: newChatTitle.trim(),
      });
    }
  };

  const handleDeleteClick = (chatId: string) => {
    setDeletingChatId(chatId);
  };

  const handleDeleteConfirm = () => {
    if (deletingChatId) {
      deleteChatMutation.mutate({ chatId: deletingChatId });
    }
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

    return historyQuery.data?.map((chat) => {
      const isSelected = initialChatId === chat.id;

      return (
        <div key={chat.id} className="group relative">
          <Link href={`/chat/${chat.id}`} className="block" onClick={handleCloseSidebar}>
            <div
              className={`rounded-lg p-3 transition-all ${isSelected
                ? "bg-sidebar-accent/50 group-hover:bg-sidebar-accent"
                : "hover:bg-sidebar-accent"
                }`}
            >
              <div className="truncate text-sm font-medium pr-8">{chat.title}</div>
              <div className="text-sidebar-foreground/60 mt-1 text-xs">
                {new Date(chat.createdAt).toLocaleDateString("id-ID")}
              </div>
            </div>
          </Link>

          {/* Three-dot menu - appears on hover */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={(e) => e.preventDefault()}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="1" />
                    <circle cx="19" cy="12" r="1" />
                    <circle cx="5" cy="12" r="1" />
                  </svg>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleRenameClick(chat.id, chat.title)}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                    <path d="m15 5 4 4" />
                  </svg>
                  Ubah Judul
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleDeleteClick(chat.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                  Hapus Chat
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      );
    });
  }, [historyQuery, initialChatId, handleRenameClick, handleDeleteClick]);

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="bg-primary text-primary-foreground border-primary-foreground/10 border-b px-4 md:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Hamburger menu button - visible on mobile and tablet */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-8 w-8 p-0"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              {isSidebarOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
            <Link href="/" className="flex items-center gap-2">
              <div className="bg-accent text-accent-foreground flex h-8 w-8 items-center justify-center rounded-md font-bold">
                KP
              </div>
              <h1 className="text-lg font-bold">Konsul Pajak</h1>
            </Link>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-10 w-10 rounded-full p-0 cursor-pointer"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage
                    src={session?.user?.image ?? ""}
                    alt={session?.user?.name ?? "User"}
                  />
                  <AvatarFallback className="bg-accent text-accent-foreground">
                    {session?.user?.name?.charAt(0)?.toUpperCase() ?? "U"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {session?.user?.name}
                  </p>
                  <p className="text-muted-foreground text-xs leading-none">
                    {session?.user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={handleCloseSidebar}
          />
        )}

        {/* Sidebar */}
        <aside className={`
          bg-sidebar text-sidebar-foreground border-sidebar-border
          flex flex-col border-r
          fixed md:static
          inset-y-0 left-0
          z-50
          w-64 md:w-64
          transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          mt-[65px] md:mt-0
        `}>
          <div className="border-sidebar-border border-b p-4">
            <Button
              type="button"
              onClick={() => {
                handleCreateChat();
                handleCloseSidebar();
              }}
              className="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 w-full cursor-pointer"
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
        <main className="flex flex-1 flex-col overflow-hidden w-full">
          <div ref={scrollAreaRef} className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="mx-auto max-w-4xl space-y-6">
              {!hasActiveChat && (
                <div className="flex items-center justify-center min-h-[calc(100vh-300px)]">
                  <div className="text-center">
                    <h2 className="text-2xl md:text-3xl font-semibold mb-8">
                      Ada yang bisa saya bantu hari ini?
                    </h2>
                  </div>
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

              {/* Optimistic messages */}
              {optimisticMessages.map((msg) => (
                <ChatMessage key={msg.id} message={msg as any} />
              ))}

              {hasActiveChat && messagesQuery.isError && (
                <div className="text-destructive py-8 text-center">
                  Gagal memuat pesan. Silakan muat ulang halaman.
                </div>
              )}

              {/* Scroll anchor */}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <div className="border-border bg-card border-t p-4">
            <form onSubmit={handleSubmit} className="mx-auto max-w-4xl">
              <div className="relative">
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tanyakan tentang perpajakan..."
                  className="min-h-[60px] resize-none pr-14"
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
                  size="icon"
                  className="absolute right-2 bottom-2 h-9 w-9 bg-accent text-accent-foreground hover:bg-accent/90 rounded-lg cursor-pointer"
                  disabled={isComposerBusy || !message.trim()}
                >
                  {isComposerBusy ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </Button>
              </div>
              <p className="text-muted-foreground mt-2 text-xs">
                Tekan Enter untuk kirim, Shift+Enter untuk baris baru
              </p>
            </form>
          </div>
        </main>
      </div>

      {/* Rename Chat Modal */}
      {renamingChatId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Ubah Judul Chat</h3>
            <Input
              value={newChatTitle}
              onChange={(e) => setNewChatTitle(e.target.value)}
              placeholder="Masukkan judul baru..."
              className="mb-4"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleRenameSubmit();
                }
              }}
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setRenamingChatId(null);
                  setNewChatTitle("");
                }}
              >
                Batal
              </Button>
              <Button
                onClick={handleRenameSubmit}
                disabled={!newChatTitle.trim() || renameChatMutation.isPending}
              >
                {renameChatMutation.isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Chat Confirmation */}
      {deletingChatId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Hapus Chat</h3>
            <p className="text-muted-foreground mb-6">
              Apakah Anda yakin ingin menghapus chat ini? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setDeletingChatId(null)}
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={deleteChatMutation.isPending}
              >
                {deleteChatMutation.isPending ? "Menghapus..." : "Hapus"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
