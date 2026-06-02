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
    const newResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: new Headers(response.headers),
    });
    
    for (const cookie of setCookies) {
      const cookieParts = [`${encodeURIComponent(cookie.name)}=${encodeURIComponent(cookie.value)}`];
      if (cookie.options) {
        const opt = cookie.options;
        if (opt.maxAge !== undefined) cookieParts.push(`Max-Age=${opt.maxAge}`);
        if (opt.domain) cookieParts.push(`Domain=${opt.domain}`);
        if (opt.path) cookieParts.push(`Path=${opt.path}`);
        if (opt.expires) {
          const exp = opt.expires instanceof Date ? opt.expires.toUTCString() : opt.expires;
          cookieParts.push(`Expires=${exp}`);
        }
        if (opt.httpOnly) cookieParts.push("HttpOnly");
        if (opt.secure) cookieParts.push("Secure");
        if (opt.sameSite) cookieParts.push(`SameSite=${opt.sameSite}`);
      }
      newResponse.headers.append("Set-Cookie", cookieParts.join("; "));
    }
    return newResponse;
  }

  return response;
};

export { handler as GET, handler as POST };
