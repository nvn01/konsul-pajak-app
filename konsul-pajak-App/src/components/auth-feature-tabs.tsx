"use client";

import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type AuthFeature = "chat" | "direktori" | "kalkulator";

const features: Array<{
  key: AuthFeature;
  href: string;
  label: string;
  shortLabel: string;
}> = [
  {
    key: "chat",
    href: "/chat",
    label: "Tanya Pajak AI",
    shortLabel: "Tanya AI",
  },
  {
    key: "direktori",
    href: "/direktori",
    label: "Direktori",
    shortLabel: "Direktori",
  },
  {
    key: "kalkulator",
    href: "/kalkulator",
    label: "Kalkulator",
    shortLabel: "Kalkulator",
  },
];

export function AuthFeatureTabs({ active }: { active?: AuthFeature }) {
  const activeFeature = features.find((feature) => feature.key === active);

  return (
    <>
      <nav
        aria-label="Navigasi fitur"
        className="hidden items-center rounded-full bg-white p-1 shadow-sm min-[400px]:flex"
      >
        {features.map((feature) => {
          const className =
            "rounded-full px-2.5 py-1.5 text-xs font-semibold transition-colors sm:px-4 sm:py-2 sm:text-sm";

          if (feature.key === active) {
            return (
              <div
                key={feature.key}
                className={`${className} bg-sidebar-primary text-sidebar-primary-foreground`}
                aria-current="page"
              >
                <span className="hidden sm:inline">{feature.label}</span>
                <span className="sm:hidden">{feature.shortLabel}</span>
              </div>
            );
          }

          return (
            <Link
              key={feature.key}
              href={feature.href}
              className={`${className} text-gray-600 hover:text-gray-900`}
            >
              <span className="hidden sm:inline">{feature.label}</span>
              <span className="sm:hidden">{feature.shortLabel}</span>
            </Link>
          );
        })}
      </nav>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-full bg-white p-1 shadow-sm min-[400px]:hidden"
            aria-label="Pilih fitur"
          >
            <span
              className="bg-sidebar-primary text-sidebar-primary-foreground rounded-full px-3 py-1.5 text-xs font-semibold"
              aria-current="page"
            >
              {activeFeature?.shortLabel ?? "Fitur"}
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-1 text-gray-500"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" sideOffset={8} className="w-44">
          {features.map((feature) => {
            if (feature.key === active) {
              return (
                <DropdownMenuItem key={feature.key} disabled>
                  {feature.label}
                </DropdownMenuItem>
              );
            }

            return (
              <DropdownMenuItem key={feature.key} asChild>
                <Link href={feature.href}>{feature.label}</Link>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
