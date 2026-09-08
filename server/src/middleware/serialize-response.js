import { Prisma } from "@prisma/client";

function serializeDecimals(value) {
  if (value instanceof Prisma.Decimal) {
    return Number(value);
  }

  if (Array.isArray(value)) {
    return value.map(serializeDecimals);
  }

  if (value !== null && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, serializeDecimals(val)]),
    );
  }

  return value;
}

export function serializeResponse(req, res, next) {
  const originalJson = res.json.bind(res);
  res.json = (body) => originalJson(serializeDecimals(body));
  next();
}