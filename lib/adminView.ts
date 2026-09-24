import { cookies } from "next/headers";

export const CATALOG_ADMIN_USER_ID = "17be5dc3-a3f9-4fd2-ae90-dee7692034fc";
const COOKIE_NAME = "pivnik_catalog_view";

export function isCatalogAdminUser(userId: string) {
  return userId === CATALOG_ADMIN_USER_ID;
}

export async function isAdminView(userId: string) {
  if (!isCatalogAdminUser(userId)) return false;
  // Keep the existing editor's working view until they explicitly switch it.
  return (await cookies()).get(COOKIE_NAME)?.value !== "normal";
}

export async function setAdminViewCookie(mode: "normal" | "admin") {
  (await cookies()).set(COOKIE_NAME, mode, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
