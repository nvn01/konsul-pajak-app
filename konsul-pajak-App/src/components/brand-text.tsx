"use client";

/**
 * BrandText — Styled "Tanya Pajak AI" logo typography.
 * Font: Manrope ExtraBold (800)
 * Default: "Tanya" → #042662, "Pajak" → #F4AA06, "AI" → #042662 (slightly smaller)
 * Light variant (for dark backgrounds): "Tanya" → white, "AI" → white
 */
export function BrandText({ className = "", variant = "light" }: { className?: string; variant?: "light" | "dark" }) {
  const blueOrWhite = variant === "light" ? "#ffffff" : "#042662";

  return (
    <span
      className={`font-[var(--font-manrope)] font-extrabold leading-none tracking-tight ${className}`}
      style={{ fontFamily: "var(--font-manrope)" }}
    >
      <span style={{ color: blueOrWhite }}>Tanya</span>{" "}
      <span style={{ color: "#F4AA06" }}>Pajak</span>{" "}
      <span style={{ color: blueOrWhite, fontSize: "0.84em" }}>AI</span>
    </span>
  );
}
