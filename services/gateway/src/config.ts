// config.ts
export const SERVICES = {
  USERS: process.env.USERS_SERVICE_URL || "http://localhost:4000",
  ORDERS: process.env.ORDERS_SERVICE_URL || "http://localhost:4001",
  PRODUCTS: process.env.PRODUCTS_SERVICE_URL || "http://localhost:4002",
  PAYMENTS: process.env.PAYMENTS_SERVICE_URL || "http://localhost:4003",
};

export const JWT_SECRET = process.env.JWT_SECRET || "";
export const PORT = Number(process.env.PORT) || 3000;
