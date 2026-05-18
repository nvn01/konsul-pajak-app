"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { LogOut, Menu, X, Send, Loader2, ClipboardList, History, MessageCircle, Info, Phone, Layers, Calculator, BookOpen } from "lucide-react";

import { ChatMessage } from "@/components/chat-message";
import { PublicHeader } from "@/components/public-header";
import { SignupPrompt } from "@/components/signup-prompt";
import { CreditsExhaustedModal } from "@/components/credits-exhausted-modal";
import { BrandText } from "@/components/brand-text";
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
function ThinkingIndicator() {
  const [textIndex, setTextIndex] = useState(0);
  const loadingTexts = [
    "Menganalisis pertanyaan...",
    "Mencari referensi peraturan...",
    "Memeriksa pasal dan ayat yang relevan...",
    "Menyusun analisis hukum...",
    "Menyiapkan jawaban akhir...",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setTextIndex((prev) => (prev + 1 < loadingTexts.length ? prev + 1 : prev));
    }, 5000); // Change text every 5 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex gap-3 justify-start">
      <div className="mt-0.5 grid h-7 w-7 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shrink-0">
        AI
      </div>
      <div className="max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm bg-card border border-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 shrink-0">
            <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]"></div>
            <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]"></div>
            <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground"></div>
          </div>
          <span className="text-sm text-muted-foreground transition-all duration-300 animate-in fade-in slide-in-from-bottom-1" key={textIndex}>
            {loadingTexts[textIndex]}
          </span>
        </div>
      </div>
    </div>
  );
}

interface ChatShellProps {
  initialChatId: string | null;
  isGuest?: boolean;
}

export function ChatShell({ initialChatId, isGuest = false }: ChatShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [message, setMessage] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Guest mode state — persist in localStorage so refresh doesn't reset
  const [guestMessageSent, setGuestMessageSent] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("kp_guest_sent") === "1";
    }
    return false;
  });
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  const [showCreditsExhausted, setShowCreditsExhausted] = useState(false);

  // Track the current chat ID independently from the prop
  const [currentChatId, setCurrentChatId] = useState<string | null>(initialChatId);

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

  // Track the latest AI message ID for typewriter animation
  const [newAssistantMessageId, setNewAssistantMessageId] = useState<number | null>(null);

  // Track if we're in the process of creating a new chat (to avoid showing "Loading pesan...")
  const isCreatingNewChat = useRef(false);

  const utils = api.useUtils();

  // Sync currentChatId with initialChatId when it changes (e.g., navigation via sidebar)
  useEffect(() => {
    setCurrentChatId(initialChatId);
  }, [initialChatId]);

  // Only fetch history/messages when logged in
  const historyQuery = api.chat.history.useQuery(undefined, {
    refetchOnWindowFocus: false,
    enabled: !isGuest,
  });

  // Credit info for logged-in users
  const creditsQuery = api.chat.getCredits.useQuery(undefined, {
    enabled: !isGuest,
  });

  const hasActiveChat = Boolean(currentChatId);

  const messagesQuery = api.chat.messages.useQuery(
    { chatId: currentChatId ?? "" },
    {
      enabled: hasActiveChat && !isGuest,
      refetchOnReconnect: true,
    },
  );

  const createChatMutation = api.chat.create.useMutation();
  const sendMessageMutation = api.chat.sendMessage.useMutation();
  const guestMessageMutation = api.chat.guestMessage.useMutation();

  const isComposerBusy =
    createChatMutation.isPending || sendMessageMutation.isPending || guestMessageMutation.isPending;

  const isAIThinking = sendMessageMutation.isPending || guestMessageMutation.isPending;

  // Auto-scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Scroll when messages update
  useEffect(() => {
    scrollToBottom();
  }, [messagesQuery.data, optimisticMessages, scrollToBottom]);

  // Clear optimistic messages when chat changes
  useEffect(() => {
    // Only clear if we're NOT creating a new chat (e.g. switching via sidebar)
    if (!isCreatingNewChat.current) {
      setOptimisticMessages([]);
    }
  }, [currentChatId]);

  // Clear optimistic messages when real messages are loaded
  useEffect(() => {
    if (messagesQuery.isSuccess && messagesQuery.data && messagesQuery.data.length > 0) {
      setOptimisticMessages([]);
      // Reset the flag once messages are loaded
      isCreatingNewChat.current = false;
    }
  }, [messagesQuery.isSuccess, messagesQuery.data]);

  const handleSend = useCallback(async () => {
    if (!message.trim()) return;

    // Guest: block if already sent 1 message
    if (isGuest && guestMessageSent) {
      setShowSignupPrompt(true);
      return;
    }

    // Logged in: check credits
    if (!isGuest && creditsQuery.data && creditsQuery.data.credits <= 0) {
      setShowCreditsExhausted(true);
      return;
    }

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
      // ── GUEST MODE ──────────────────────────────────
      if (isGuest) {
        const result = await guestMessageMutation.mutateAsync({ message: text });

        // Add AI response as optimistic message
        setOptimisticMessages(prev => [...prev, {
          id: `guest-ai-${Date.now()}`,
          role: "assistant",
          content: result.answer,
          createdAt: new Date(),
          sources: result.sources as any,
          feedback: null
        }]);

        setGuestMessageSent(true);
        localStorage.setItem("kp_guest_sent", "1");
        // Show signup prompt after a short delay
        setTimeout(() => setShowSignupPrompt(true), 1500);
        return;
      }

      // ── AUTHENTICATED MODE ──────────────────────────
      let targetChatId = currentChatId;

      if (!targetChatId) {
        isCreatingNewChat.current = true;

        const newChat = await createChatMutation.mutateAsync();
        targetChatId = newChat.id;
        setCurrentChatId(targetChatId);
        window.history.replaceState(null, '', `/chat/${newChat.id}`);
      }

      if (!targetChatId) {
        throw new Error("Gagal menentukan chat ID untuk percakapan.");
      }

      const result = await sendMessageMutation.mutateAsync({
        chatId: targetChatId,
        message: text,
      });

      if (result.assistantMessage?.id) {
        setNewAssistantMessageId(result.assistantMessage.id);
      }

      await Promise.all([
        utils.chat.messages.invalidate({ chatId: targetChatId }),
        utils.chat.history.invalidate(),
        utils.chat.getCredits.invalidate(),
      ]);

    } catch (error: any) {
      console.error("[Chat] Failed to send message", error);
      // Show credits exhausted if that's the error
      if (error?.message?.includes?.("Kredit") || error?.data?.code === "FORBIDDEN") {
        setShowCreditsExhausted(true);
      }
      setMessage(text);
      setOptimisticMessages(prev => prev.filter(m => m.id !== tempId));
      isCreatingNewChat.current = false;
    }
  }, [message, currentChatId, isGuest, guestMessageSent, creditsQuery.data, createChatMutation, sendMessageMutation, guestMessageMutation, utils, scrollToBottom]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void handleSend();
  };

  const handleCreateChat = () => {
    // Reset to new chat state
    setCurrentChatId(null);
    setOptimisticMessages([]);
    setNewAssistantMessageId(null);
    setMessage("");
    // Use window.history to avoid page reload
    if (pathname !== "/chat") {
      window.history.pushState(null, '', '/chat');
    }
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
      if (deletingChatId === currentChatId) {
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
      const isSelected = currentChatId === chat.id;

      return (
        <div key={chat.id} className="group relative">
          <Link href={`/chat/${chat.id}`} className="block" onClick={handleCloseSidebar}>
            <div
              className={`rounded-lg p-3 transition-all ${isSelected
                ? "bg-sidebar-accent/50 group-hover:bg-sidebar-accent"
                : "hover:bg-sidebar-accent"
                }`}
            >
              <div className="truncate text-sm font-medium pr-8 max-w-[180px]">{chat.title}</div>
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
  }, [historyQuery, currentChatId, handleRenameClick, handleDeleteClick]);

  return (
    <div className="flex h-screen flex-col">
      {/* Header — Guest vs Authenticated */}
      {isGuest ? (
        <PublicHeader />
      ) : (
      <header className="bg-primary text-primary-foreground border-primary-foreground/10 border-b px-4 md:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
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
              <img src="/logo-header.png" alt="KP" className="h-8 w-8 object-contain" />
              <BrandText className="text-lg hidden sm:block" />
            </Link>
          </div>

          {/* Toggle Tabs */}
          <div className="flex items-center bg-white rounded-full p-1 shadow-sm">
            <div className="px-5 py-2 rounded-full text-sm font-medium text-sidebar-primary-foreground bg-sidebar-primary">
              Tanya Pajak AI
            </div>
            <Link
              href="/direktori"
              className="px-5 py-2 rounded-full text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Direktori
            </Link>
          </div>

          <div className="flex items-center gap-3">

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
              <DropdownMenuItem className="cursor-pointer" asChild>
                <Link href="/about">
                  <Info className="mr-2 h-4 w-4" />
                  <span>Tentang Aplikasi</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" asChild>
                <Link href="/contact">
                  <Phone className="mr-2 h-4 w-4" />
                  <span>Kontak</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground font-medium px-2 py-1.5">Fitur</DropdownMenuLabel>
              <DropdownMenuItem className="cursor-pointer" asChild>
                <Link href="/chat">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  <span>Konsultasi AI</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" asChild>
                <Link href="/direktori">
                  <BookOpen className="mr-2 h-4 w-4" />
                  <span>Direktori Peraturan</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem disabled className="opacity-50">
                <Calculator className="mr-2 h-4 w-4" />
                <span>Kalkulator Pajak</span>
                <span className="ml-auto text-[10px] rounded-full bg-muted px-1.5 py-0.5 text-muted-foreground">Segera</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </div>
      </header>
      )}

      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={handleCloseSidebar}
          />
        )}

        {/* Sidebar */}
        {isGuest ? (
          /* Guest sidebar — info panel */
          <aside className={`
            bg-sidebar text-sidebar-foreground border-sidebar-border
            flex flex-col border-r
            fixed md:static
            top-[65px] md:top-0 bottom-0 left-0
            z-50
            w-64 md:w-64
            transform transition-transform duration-300 ease-in-out
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          `}>
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sidebar-primary/20 text-sidebar-primary mb-4">
                <LogOut className="h-6 w-6 rotate-180" />
              </div>
              <h3 className="text-sm font-bold text-sidebar-foreground mb-2">Masuk untuk fitur lengkap</h3>
              <ul className="text-xs text-sidebar-foreground/70 space-y-3 mb-6 text-left">
                <li className="flex items-center gap-2.5">
                  <ClipboardList className="h-3.5 w-3.5 shrink-0 text-sidebar-primary" />
                  <span>Simpan riwayat percakapan</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <History className="h-3.5 w-3.5 shrink-0 text-sidebar-primary" />
                  <span>Akses riwayat chat kapan saja</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <MessageCircle className="h-3.5 w-3.5 shrink-0 text-sidebar-primary" />
                  <span>Beri feedback pada jawaban AI</span>
                </li>
              </ul>
              <Link
                href="/login"
                className="flex w-full items-center justify-center gap-2 rounded-full bg-sidebar-primary px-4 py-2.5 text-sm font-medium text-sidebar-primary-foreground shadow-sm transition-all hover:bg-sidebar-primary/90"
              >
                Masuk Sekarang
              </Link>
            </div>
          </aside>
        ) : (
          /* Authenticated sidebar — chat history */
          <aside className={`
            bg-sidebar text-sidebar-foreground border-sidebar-border
            flex flex-col border-r
            fixed md:static
            top-[65px] md:top-0 bottom-0 left-0
            z-50
            w-64 md:w-64
            transform transition-transform duration-300 ease-in-out
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          `}>
            <div className="border-sidebar-border border-b p-3">
              <button
                type="button"
                onClick={() => {
                  handleCreateChat();
                  handleCloseSidebar();
                }}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-sidebar-primary px-4 py-2.5 text-sm font-medium text-sidebar-primary-foreground shadow-sm transition-all hover:bg-sidebar-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Percakapan Baru
              </button>
            </div>

            <ScrollArea className="flex-1 min-h-0">
              <div className="space-y-1 p-3">{sidebarContent}</div>
            </ScrollArea>
          </aside>
        )}

        {/* Main Chat Area */}
        <main className="flex flex-1 flex-col overflow-hidden w-full">
          <div ref={scrollAreaRef} className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="mx-auto max-w-4xl space-y-6">
              {!hasActiveChat && (
                <div className="flex items-center justify-center min-h-[calc(100vh-300px)]">
                  <div className="text-center max-w-2xl mx-auto px-4">
                    {/* Collab Logos */}
                    <div className="flex items-center justify-center gap-5 mb-6">
                      <img
                        src="/logo-login.png"
                        alt="Tanya Pajak AI"
                        className="h-16 w-16 md:h-20 md:w-20 object-contain rounded-xl shadow-sm"
                      />
                      <span className="text-muted-foreground/40 text-2xl font-light select-none">×</span>
                      <img
                        src="/logo-unpam.png"
                        alt="Universitas Pamulang"
                        className="h-[67px] w-[67px] md:h-[83px] md:w-[83px] object-contain"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mb-6">
                      Bekerja sama dengan Prodi Akuntansi Perpajakan UNPAM
                    </p>
                    <h2 className="text-3xl md:text-4xl font-semibold">
                      Ada yang bisa dibantu terkait perpajakan hari ini?
                    </h2>
                  </div>
                </div>
              )}

              {/* Only show loading if we're switching chats (not creating a new one) */}
              {hasActiveChat && messagesQuery.isLoading && !isCreatingNewChat.current && (
                <div className="text-muted-foreground py-8 text-center">
                  Loading pesan...
                </div>
              )}

              {hasActiveChat &&
                messagesQuery.isSuccess &&
                messagesQuery.data?.map((msg) => (
                  <ChatMessage
                    key={msg.id}
                    message={msg}
                    isNew={msg.id === newAssistantMessageId}
                  />
                ))}

              {/* Optimistic messages */}
              {optimisticMessages.map((msg) => (
                <ChatMessage key={msg.id} message={msg as any} hideActions={isGuest} />
              ))}

              {/* AI Thinking Indicator */}
              {isAIThinking && <ThinkingIndicator />}

              {/* Guest signup banner (inline, after first message response) */}
              {isGuest && guestMessageSent && !isAIThinking && (
                <SignupPrompt variant="banner" />
              )}

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
              <div className="flex flex-col rounded-2xl border border-border bg-card shadow-sm transition-all duration-200 p-3">
                <div className="flex-1 relative">
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tanyakan tentang perpajakan..."
                    className="min-h-[40px] resize-none border-0 bg-transparent px-0 py-2 text-sm outline-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void handleSend();
                      }
                    }}
                    disabled={isComposerBusy || (isGuest && guestMessageSent)}
                  />
                </div>
                <div className="flex items-center justify-end mt-2">
                  <button
                    type="submit"
                    disabled={isComposerBusy || !message.trim() || (isGuest && guestMessageSent)}
                    className="inline-flex shrink-0 items-center gap-2 rounded-full bg-accent px-3 py-2 text-sm font-medium text-accent-foreground shadow-sm transition-all hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isComposerBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="mt-2 px-1 text-[11px] text-muted-foreground">
                Tekan{" "}
                <kbd className="rounded border border-border bg-muted px-1 text-[10px]">Enter</kbd>{" "}
                untuk kirim ·{" "}
                <kbd className="rounded border border-border bg-muted px-1 text-[10px]">Shift</kbd>
                +
                <kbd className="rounded border border-border bg-muted px-1 text-[10px]">Enter</kbd>{" "}
                untuk baris baru
              </div>
            </form>
          </div>
        </main>
      </div>

      {/* Rename Chat Modal */}
      {
        renamingChatId && (
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
        )
      }

      {/* Delete Chat Confirmation */}
      {
        deletingChatId && (
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
        )
      }

      {/* Guest signup prompt modal */}
      {showSignupPrompt && isGuest && (
        <SignupPrompt variant="modal" onDismiss={() => setShowSignupPrompt(false)} />
      )}

      {/* Credits exhausted modal */}
      {showCreditsExhausted && (
        <CreditsExhaustedModal onClose={() => setShowCreditsExhausted(false)} />
      )}
    </div>
  );
}
