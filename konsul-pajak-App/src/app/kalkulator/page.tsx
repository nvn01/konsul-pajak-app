import { KalkulatorShell } from "./kalkulator-shell";
import { auth } from "nvn/server/auth";

/**
 * Kalkulator Pajak page — accessible to both guests and authenticated users.
 * Passes isGuest flag to KalkulatorShell for conditional UI rendering.
 */
export default async function KalkulatorPage() {
  const session = await auth();

  return <KalkulatorShell isGuest={!session?.user} />;
}
