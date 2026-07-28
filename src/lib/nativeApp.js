import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { requireSupabase } from "./supabase.js";

function parseNativeUrl(rawUrl) {
  try {
    return new URL(rawUrl);
  } catch {
    return null;
  }
}

function readHashParams(url) {
  return new URLSearchParams(url.hash.replace(/^#/, ""));
}

async function consumeAuthCallback(url, router) {
  const query = url.searchParams;
  const hash = readHashParams(url);
  const code = query.get("code");
  const accessToken = hash.get("access_token");
  const refreshToken = hash.get("refresh_token");

  if (code) {
    const { error } = await requireSupabase().auth.exchangeCodeForSession(code);
    if (error) throw error;
  } else if (accessToken && refreshToken) {
    const { error } = await requireSupabase().auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
  } else {
    return false;
  }

  const recovery = url.pathname.endsWith("/update-password");
  await router.navigate(recovery ? { to: "/auth/update-password" } : { to: "/auth", search: { verified: "1" } });
  return true;
}

async function handleAppUrl(rawUrl, router) {
  const url = parseNativeUrl(rawUrl);
  if (!url) return;

  try {
    if (await consumeAuthCallback(url, router)) return;
  } catch (error) {
    console.warn("无法处理 Android 认证回调", error);
    await router.navigate({ to: "/auth", search: { error: "callback" } });
    return;
  }

  if (url.origin === window.location.origin || url.origin === "https://ai.suxin.ai") {
    await router.navigate({ to: `${url.pathname}${url.search}` });
  }
}

export async function initializeNativeApp(router) {
  if (!Capacitor.isNativePlatform()) return;

  const backButton = await App.addListener("backButton", ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back();
    } else {
      void App.exitApp();
    }
  });

  const appUrlOpen = await App.addListener("appUrlOpen", ({ url }) => {
    void handleAppUrl(url, router);
  });

  const launchUrl = await App.getLaunchUrl();
  if (launchUrl?.url) await handleAppUrl(launchUrl.url, router);

  return () => {
    void backButton.remove();
    void appUrlOpen.remove();
  };
}
