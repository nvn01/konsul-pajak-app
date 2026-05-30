export function GET() {
  return new Response("google-site-verification: googledd7ee73a5c8f8c60.html", {
    headers: {
      "Content-Type": "text/html",
    },
  });
}
