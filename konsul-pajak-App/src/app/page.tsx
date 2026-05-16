import { redirect } from "next/navigation";

/**
 * Root page — always redirects to /chat.
 * Both guests and authenticated users go to /chat.
 * The /chat page handles guest vs. authenticated UI internally.
 */
export default function RootPage() {
  redirect("/chat");
}
