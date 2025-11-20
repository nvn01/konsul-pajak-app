"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "next-auth/react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { status } = useSession();
  const popupRef = useRef<Window | null>(null);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/chat");
    }
  }, [status, router]);

  const popupCenter = useCallback(
    (url: string, title: string, w = 500, h = 600) => {
      if (typeof window === "undefined") return null;

      const dualScreenLeft = window.screenLeft ?? window.screenX ?? 0;
      const dualScreenTop = window.screenTop ?? window.screenY ?? 0;
      const width =
        window.innerWidth ??
        document.documentElement.clientWidth ??
        window.screen.width;
      const height =
        window.innerHeight ??
        document.documentElement.clientHeight ??
        window.screen.height;
      const systemZoom = width / window.screen.availWidth;
      const left = (width - w) / 2 / systemZoom + dualScreenLeft;
      const top = (height - h) / 2 / systemZoom + dualScreenTop;

      const newWindow = window.open(
        url,
        title,
        `width=${w / systemZoom},height=${h / systemZoom},top=${top},left=${left},scrollbars=yes`,
      );

      newWindow?.focus();
      return newWindow ?? null;
    },
    [],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      const { type, callbackUrl } = event.data ?? {};
      if (type === "NEXTAUTH_SIGNIN_SUCCESS") {
        popupRef.current?.close();
        popupRef.current = null;
        setIsLoading(false);
        router.replace(
          typeof callbackUrl === "string" && callbackUrl.length > 0
            ? callbackUrl
            : "/chat",
        );
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [router]);

  const handleGoogleLogin = useCallback(() => {
    setIsLoading(true);
    const popup = popupCenter(
      `/google-signin?redirectTo=${encodeURIComponent("/chat")}`,
      "Login Konsul Pajak",
    );

    if (popup) {
      popupRef.current = popup;
    } else {
      setIsLoading(false);
    }
  }, [popupCenter]);

  const handleEmailLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    // TODO: Implement Magic Link login
    console.log("Email login:", email);
    setTimeout(() => setIsLoading(false), 1000);
  };

  const handleEmailChange = (event: ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
  };

  return (
    <div className="from-primary/5 via-background to-accent/5 flex min-h-screen items-center justify-center bg-linear-to-br p-4">
      <div className="w-full max-w-md">
        <div className="bg-card border-border space-y-6 rounded-xl border p-8 shadow-lg">
          {/* Header */}
          <div className="space-y-2 text-center">
            <div className="bg-primary mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg">
              <span className="text-primary-foreground text-2xl font-bold">
                KP
              </span>
            </div>
            <h1 className="text-primary text-2xl font-bold">
              Login Konsul Pajak
            </h1>
            <p className="text-muted-foreground text-sm">
              Masuk untuk memulai konsultasi pajak
            </p>
          </div>

          {/* Google Login */}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleLogin}
            disabled={isLoading}
          >
            <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Masuk dengan Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="border-border w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card text-muted-foreground px-2">Atau</span>
            </div>
          </div>

          {/* Email Login Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="nama@email.com"
                value={email}
                onChange={handleEmailChange}
                required
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              className="bg-accent text-accent-foreground hover:bg-accent/90 w-full font-semibold"
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : "Login dengan Email"}
            </Button>
          </form>

          <div className="text-center">
            <Link href="/" className="text-primary text-sm hover:underline">
              Kembali ke Halaman Utama
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
