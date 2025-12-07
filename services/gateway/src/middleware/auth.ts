// services/gateway/middlewares/auth.ts

import { jwt } from "@elysiajs/jwt";
import type { Elysia } from "elysia";
import { JWT_SECRET } from "../config";

// 1. Setup Plugin
export const authPlugin = (app: Elysia) =>
  app.use(
    jwt({
      name: "jwt",
      secret: JWT_SECRET,
      exp: "15m", // Thời gian này chỉ để verify, không quan trọng bằng exp trong token
    })
  );

// 2. Logic lấy User từ Token (Hỗ trợ cả Header và Cookie)
export const getAuthUser = async ({ jwt, request, cookie: { auth } }: any) => {
  let token;

  // Ưu tiên 1: Lấy từ Header (Authorization: Bearer <token>)
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } 
  // Ưu tiên 2: Lấy từ Cookie (nếu header không có)
  else if (auth && auth.value) {
    token = auth.value;
  }

  if (!token) {
    return { user: null };
  }

  // Verify token
  const payload = await jwt.verify(token);

  if (!payload) {
    return { user: null };
  }

  return { user: payload };
};

// 3. Guard chặn request (không thay đổi)
export const requireAuth = ({ user, error }: any) => {
  if (!user) {
    return error(401, {
        message: "Unauthorized",
        detail: "Token missing in both Header and Cookie"
    });
  }
};