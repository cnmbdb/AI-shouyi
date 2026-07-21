import { authRedirect, requireSupabase, supabasePublishableKey, supabaseUrl } from "./supabase.js";

const authErrorMessages = {
  "Email not confirmed": "请先打开验证邮件完成邮箱验证",
  "Invalid login credentials": "用户名、邮箱或密码不正确",
  "User already registered": "该邮箱已经注册",
  "Password should be at least 6 characters": "密码至少需要 6 个字符",
};

function readableAuthError(error, fallback = "认证操作失败") {
  if (!error) return fallback;
  return authErrorMessages[error.message] ?? error.message ?? fallback;
}

export function publicUser(authUser, profile) {
  if (!authUser) return null;
  const fallbackName = authUser.user_metadata?.username || authUser.email?.split("@")[0] || "user";
  return {
    id: authUser.id,
    email: authUser.email,
    email_confirmed_at: authUser.email_confirmed_at,
    username: profile?.username || fallbackName,
    display_name: profile?.display_name || fallbackName,
    avatar_color: profile?.avatar_color || "#525252",
  };
}

export async function loadCurrentUser() {
  const client = requireSupabase();
  const { data: { session }, error } = await client.auth.getSession();
  if (error) throw new Error(readableAuthError(error, "无法读取登录状态"));
  if (!session?.user) return { user: null };

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("id, username, display_name, avatar_color")
    .eq("id", session.user.id)
    .single();

  if (profileError) throw new Error(profileError.message);
  return { user: publicUser(session.user, profile) };
}

export function subscribeToAuthChanges(callback) {
  const client = requireSupabase();
  const { data } = client.auth.onAuthStateChange((event) => callback(event));
  return () => data.subscription.unsubscribe();
}

export async function registerAccount({ username, email, password }) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: { username: username.trim(), display_name: username.trim() },
      emailRedirectTo: authRedirect("/auth?verified=1"),
    },
  });
  if (error) {
    const message = error.message === "Database error saving new user"
      ? "用户名或邮箱已被使用"
      : readableAuthError(error, "注册失败");
    throw new Error(message);
  }
  return data;
}

export async function loginAccount({ identifier, password }) {
  const response = await fetch(`${supabaseUrl}/functions/v1/username-login`, {
    method: "POST",
    headers: {
      apikey: supabasePublishableKey,
      Authorization: `Bearer ${supabasePublishableKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ identifier: identifier.trim(), password }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "用户名、邮箱或密码不正确");

  const client = requireSupabase();
  const { error } = await client.auth.setSession({
    access_token: result.session.access_token,
    refresh_token: result.session.refresh_token,
  });
  if (error) throw new Error(readableAuthError(error, "无法建立登录会话"));
  return loadCurrentUser();
}

export async function logoutAccount() {
  const { error } = await requireSupabase().auth.signOut();
  if (error) throw new Error(readableAuthError(error, "退出登录失败"));
}

export async function sendPasswordReset(email) {
  const { error } = await requireSupabase().auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: authRedirect("/auth/update-password"),
  });
  if (error) throw new Error(readableAuthError(error, "无法发送重置邮件"));
}

export async function updatePassword(password) {
  const { error } = await requireSupabase().auth.updateUser({ password });
  if (error) throw new Error(readableAuthError(error, "密码更新失败"));
}
