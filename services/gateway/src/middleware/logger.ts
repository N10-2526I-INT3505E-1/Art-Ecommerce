import type { Elysia } from "elysia";

// Logger Plugin cho Gateway
// Logs: Request/Response duration, Payment audits, System errors
export const loggerPlugin = (app: Elysia) =>
  app
    // Track start time cho mỗi request
    .derive(({ request }) => {
      return {
        startTime: Date.now(),
        requestId: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
      };
    })
    // Hook sau khi request xử lý xong
    .onAfterHandle(({ startTime, path, request, set }) => {
      const duration = Date.now() - (startTime as number);
      const method = request.method;
      const status = set.status || 200;

      // 1. Log cơ bản
      console.log(
        `[${new Date().toISOString()}] ${method} ${path} - ${status} - ${duration}ms`
      );

      // 2. Audit Log cho Thanh toán (FR-BUY-10)
      if (path.includes("/api/payments") && method === "POST") {
        const ip = request.headers.get("x-forwarded-for") || "unknown";
        console.log(
          `💰 AUDIT LOG [PAYMENT]: Giao dịch mới tại ${path} - IP: ${ip}`
        );
      }

      // 3. Log lỗi hệ thống (DR-LIFE-05)
      const statusCode = typeof status === "number" ? status : parseInt(String(status));
      if (statusCode >= 500) {
        console.error(
          `🚨 SYSTEM ERROR [${path}]: Status ${statusCode} after ${duration}ms`
        );
      }
    });