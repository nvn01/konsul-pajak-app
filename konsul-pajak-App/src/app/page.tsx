import { redirect } from "next/navigation";
import { auth } from "nvn/server/auth";

/**
 * Root page - redirects users based on authentication status.
 * - Authenticated users → /chat
 * - Unauthenticated users → /login
 * 
 * This effectively disables the landing page.
 */
export default async function RootPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/chat");
  } else {
    redirect("/login");
  }
}
