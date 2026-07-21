import { requireSupabase } from "./supabase.js";

async function invokeAdminUsers(body) {
  const { data, error } = await requireSupabase().functions.invoke("admin-users", { body });
  if (!error) return data;

  let message = data?.error || error.message || "用户管理请求失败";
  if (error.context instanceof Response) {
    const payload = await error.context.clone().json().catch(() => null);
    message = payload?.error || message;
  }
  throw new Error(message);
}

export function getAdminUsers() {
  return invokeAdminUsers({ action: "list", page: 1, perPage: 200 });
}

export function updateAdminUserRole({ userId, role }) {
  return invokeAdminUsers({ action: "update-role", userId, role });
}
