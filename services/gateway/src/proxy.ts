// services/gateway/proxy.ts
import { SERVICES } from "./config";

export const routeMap = [
  { match: /^\/api\/auth/, target: SERVICES.USERS },
  { match: /^\/api\/users/, target: SERVICES.USERS },
  { match: /^\/api\/orders/, target: SERVICES.ORDERS },
  { match: /^\/api\/products/, target: SERVICES.PRODUCTS },
  { match: /^\/api\/payments/, target: SERVICES.PAYMENTS },
  // Thêm AI service nếu sau này triển khai
  // { match: /^\/api\/ai/, target: SERVICES.AI }, 
];

export const proxyHandler = async (ctx: any) => {
  // ... (Giữ nguyên code cũ của bạn)
  const { request, user } = ctx;
  const url = new URL(request.url);

  const route = routeMap.find((r) => r.match.test(url.pathname));
  if (!route) return ctx.error(404, "Service not found");

  const targetUrl = `${route.target}${url.pathname}${url.search}`;

  try {
    const headers = new Headers(request.headers);
    headers.delete("host");

    if (user) {
      headers.set("X-User-Id", user.id.toString());
      headers.set("X-User-Role", user.role || "user");
    }

    const response = await fetch(targetUrl, {
      method: request.method,
      headers: headers,
      body: request.body,
      duplex: "half", 
    } as any);

    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });

  } catch (err) {
    console.error(`Proxy Error [${targetUrl}]:`, err);
    return ctx.error(502, "Bad Gateway");
  }
};