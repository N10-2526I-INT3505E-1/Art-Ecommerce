import { SERVICES } from "./config";

export const routeMap = [
  // ... các route cũ
  { match: /^\/api\/orders/, target: SERVICES.ORDERS },
];

export const proxyHandler = async (ctx: any) => {
  const { request, user } = ctx; // Lấy user từ context (đã được middleware giải mã)
  const url = new URL(request.url);

  // 1. Tìm route
  const route = routeMap.find((r) => r.match.test(url.pathname));
  if (!route) return ctx.error(404, "Service not found");

  const targetUrl = `${route.target}${url.pathname}${url.search}`;

  try {
    // 2. Chuẩn bị Headers
    const headers = new Headers(request.headers);
    headers.delete("host");

    // Nếu đã xác thực được user, gửi ID của họ sang Microservice
    if (user) {
      headers.set("X-User-Id", user.id.toString());
      headers.set("X-User-Role", user.role || "user");
    }

    // 3. Forward request
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
    // ... xử lý lỗi
    return ctx.error(502, "Bad Gateway");
  }
};