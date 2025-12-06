import { Elysia } from "elysia";
import { authPlugin, getAuthUser, requireAuth } from "./middleware/auth";
import { loggerPlugin } from "./middleware/logger";
import { proxyHandler } from "./proxy";
import { getOrderDetail } from "./controllers/order.controller";
import { PORT } from "./config";

const app = new Elysia()
  .use(loggerPlugin)
  .use(authPlugin)
  .derive(getAuthUser)
  .get("/health", () => ({ status: "ok" }))

  // --- PROTECTED ROUTES ---
  .guard(
    { beforeHandle: [requireAuth] },
    (app) => app
      // ✅ 1. User Order Item: Gateway VẪN điều phối để ghép ảnh/tên cho đẹp
      .get("/api/orders/:id", getOrderDetail)

      .post("/api/payments/create", proxyHandler) 

      // Các route khác giữ nguyên Proxy
      .all("/api/orders", proxyHandler)
      .all("/api/orders/*", proxyHandler)
      .all("/api/users/*", proxyHandler)
      .all("/api/payments/*", proxyHandler) 
  )

  // --- PUBLIC ROUTES ---
  .group("/api", (app) => app
      .post("/auth/*", proxyHandler)
      .get("/products", proxyHandler)
      .get("/products/*", proxyHandler)
      // Webhook VNPay (Quan trọng)
      .get("/vnpay_ipn", proxyHandler) 
  )
  .listen(PORT);

console.log(`🚀 Gateway running at http://localhost:${PORT}`);