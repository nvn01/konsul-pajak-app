"use client";

/**
 * BrandText — Styled "Tanya Pajak AI" logo typography.
 * Font: Manrope ExtraBold (800)
 * "Tanya" → #042662, "Pajak" → #F4AA06, "AI" → #042662 (slightly smaller)
 */
export function BrandText({ className = "" }: { className?: string }) {
  return (
    <span
      className={`font-[var(--font-manrope)] font-extrabold leading-none tracking-tight ${className}`}
      style={{ fontFamily: "var(--font-manrope)" }}
    >
      <span style={{ color: "#042662" }}>Tanya</span>{" "}
      <span style={{ color: "#F4AA06" }}>Pajak</span>{" "}
      <span style={{ color: "#042662", fontSize: "0.84em" }}>AI</span>
    </span>
  );
}
