export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const dns = await import("node:dns");
    try {
      dns.setDefaultResultOrder("ipv4first");
    } catch {
      // Ignored
    }
  }
}
