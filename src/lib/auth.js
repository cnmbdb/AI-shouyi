import { authRedirect, requireSupabase, supabasePublishableKey, supabaseUrl } from "./supabase.js";

const authErrorMessages = {
  "Email not confirmed": "请先打开验证邮件完成邮箱验证",
  "Invalid login credentials": "用户名、邮箱或密码不正确",
  "User already registered": "该邮箱已经注册",
  "Password should be at least 6 characters": "密码至少需要 6 个字符",
  "email rate limit exceeded": "验证邮件发送频率已达上限，请稍后再试",
  "Email address not authorized": "当前测试邮件服务仅允许项目成员邮箱，请配置自定义 SMTP 后再开放注册",
  "Email address invalid": "请输入可接收邮件的有效邮箱地址",
};

function readableAuthError(error, fallback = "认证操作失败") {
  if (!error) return fallback;
  const message = error.message ?? "";
  const translated = Object.entries(authErrorMessages).find(([source]) => message.toLowerCase().includes(source.toLowerCase()))?.[1];
  return translated ?? message ?? fallback;
}

function avatarColumnUnavailable(error) {
  const message = error?.message?.toLowerCase() ?? "";
  return error?.code === "42703" || error?.code === "PGRST204" || message.includes("avatar_url");
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
    avatar_url: profile?.avatar_url || authUser.user_metadata?.avatar_url || "",
    avatar_color: profile?.avatar_color || "#525252",
    role: profile?.role === "admin" ? "admin" : "user",
  };
}

export async function loadCurrentUser() {
  const client = requireSupabase();
  const { data: { session }, error } = await client.auth.getSession();
  if (error) throw new Error(readableAuthError(error, "无法读取登录状态"));
  if (!session?.user) return { user: null };

  let { data: profile, error: profileError } = await client
    .from("profiles")
    .select("id, username, display_name, avatar_url, avatar_color, role")
    .eq("id", session.user.id)
    .single();

  if (avatarColumnUnavailable(profileError)) {
    const legacyProfile = await client
      .from("profiles")
      .select("id, username, display_name, avatar_color, role")
      .eq("id", session.user.id)
      .single();
    profile = legacyProfile.data;
    profileError = legacyProfile.error;
  }

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

const accountAvatarTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);
const accountAvatarPath = (userId) => `${userId}/avatar`;

export async function uploadAccountAvatar(file) {
  if (!file || !accountAvatarTypes.has(file.type)) throw new Error("请选择 JPG、PNG、WebP、GIF 或 AVIF 图片");
  if (file.size > 3 * 1024 * 1024) throw new Error("头像图片不能超过 3 MB");

  const client = requireSupabase();
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError) throw new Error(readableAuthError(userError, "无法读取当前账号"));
  if (!user) throw new Error("请先登录");

  const path = accountAvatarPath(user.id);
  const { error } = await client.storage.from("user-avatars").upload(path, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: true,
  });
  if (error) throw new Error(error.message || "头像上传失败");

  const { data } = client.storage.from("user-avatars").getPublicUrl(path);
  if (!data.publicUrl) throw new Error("头像公开地址生成失败");
  return `${data.publicUrl}?v=${Date.now()}`;
}

export async function deleteAccountAvatar() {
  const client = requireSupabase();
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError) throw new Error(readableAuthError(userError, "无法读取当前账号"));
  if (!user) throw new Error("请先登录");
  const { error } = await client.storage.from("user-avatars").remove([accountAvatarPath(user.id)]);
  if (error) throw new Error(error.message || "头像删除失败");
}

export async function updateAccountProfile({ displayName, avatarUrl, avatarColor }) {
  const client = requireSupabase();
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError) throw new Error(readableAuthError(userError, "无法读取当前账号"));
  if (!user) throw new Error("请先登录");

  const normalizedName = displayName.trim();
  if (!normalizedName || normalizedName.length > 80) throw new Error("显示名称需要 1 至 80 个字符");

  const normalizedAvatar = avatarUrl?.trim() || null;
  const { error: metadataError } = await client.auth.updateUser({
    data: { display_name: normalizedName, avatar_url: normalizedAvatar },
  });
  if (metadataError) throw new Error(readableAuthError(metadataError, "账户资料更新失败"));

  let { error: profileError } = await client
    .from("profiles")
    .update({ display_name: normalizedName, avatar_url: normalizedAvatar, avatar_color: avatarColor })
    .eq("id", user.id);

  if (avatarColumnUnavailable(profileError)) {
    const legacyUpdate = await client
      .from("profiles")
      .update({ display_name: normalizedName, avatar_color: avatarColor })
      .eq("id", user.id);
    profileError = legacyUpdate.error;
  }
  if (profileError) throw new Error(profileError.message || "账户资料更新失败");
  return loadCurrentUser();
}

export async function changeAccountPassword({ email, currentPassword, newPassword }) {
  const { error } = await requireSupabase().auth.updateUser({
    email,
    current_password: currentPassword,
    password: newPassword,
  });
  if (error) throw new Error(readableAuthError(error, "密码更新失败"));
}
