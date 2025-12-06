import { Elysia } from "elysia";
import { authPlugin, getAuthUser, requireAuth } from "./middleware/auth";
import { proxyHandler } from "./proxy";
import { PORT } from "./config";

const app = new Elysia()
  // 1. Cài đặt JWT Plugin
  .use(authPlugin)
  
  // 2. Global Derive: Kiểm tra user ở mọi request (nhưng chưa chặn)
  .derive(getAuthUser)

  // 3. Health Check
  .get("/health", () => ({ status: "ok", gateway: true }))

  // 4. Protected Routes (Ví dụ: Orders cần login)
  // Logic: Các route bắt đầu bằng /api/orders sẽ đi qua guard requireAuth trước
  .guard(
    {
      beforeHandle: [requireAuth], // Chặn nếu không có user
    },
    (app) => app
      .all("/api/orders/*", proxyHandler)
      .all("/api/users/me", proxyHandler) // Ví dụ thêm route cần bảo vệ
  )

  // 5. Public Routes (Login, Register, Products...)
  // Các route này vẫn đi qua proxy nhưng không check auth bắt buộc
  .all("/api/*", proxyHandler)

  .listen(PORT);

console.log(`🚀 Gateway running at http://localhost:${PORT}`);