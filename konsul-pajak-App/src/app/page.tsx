import { redirect } from "next/navigation";

/**
 * Root page — always redirects to /kalkulator.
 * Both guests and authenticated users go to /kalkulator.
 * The /kalkulator page handles guest vs. authenticated UI internally.
 */
export default function RootPage() {
  redirect("/kalkulator");
}
