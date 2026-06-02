import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";

import { env } from "nvn/env";
import { appRouter } from "nvn/server/api/root";
import { createTRPCContext } from "nvn/server/api/trpc";

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a HTTP request (e.g. when you make requests from Client Components).
 */
const handler = async (req: NextRequest) => {
  const setCookies: { name: string; value: string; options?: any }[] = [];

  const response = await fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: async () => {
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                 req.headers.get("x-real-ip") || 
                 (req as any).ip || 
                 undefined;
      const ctx = await createTRPCContext({
        headers: req.headers,
        ip,
      });
      ctx.setCookies = setCookies;
      return ctx;
    },
    onError:
      env.NODE_ENV === "development"
        ? ({ path, error }: { path: string | undefined; error: any }) => {
            console.error(
              `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`,
            );
          }
        : undefined,
  });

  if (setCookies.length > 0) {
    const { cookies: nextCookies } = await import("next/headers");
    const cookieStore = await nextCookies();
    for (const cookie of setCookies) {
      cookieStore.set(cookie.name, cookie.value, cookie.options);
    }
  }

  return response;
};

export { handler as GET, handler as POST };
