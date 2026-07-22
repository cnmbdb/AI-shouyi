import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "./components/SiteChrome.jsx";
import { ConsoleLoader } from "./components/ConsoleLoader.jsx";
import { loadCurrentUser, logoutAccount, subscribeToAuthChanges } from "./lib/auth.js";
import { getSiteSettings } from "./lib/platformData.js";
import { normalizeHomeSettings } from "./data/homeSettings.js";
import { normalizeBlogSettings, normalizeFooterSettings, normalizeNavigationSettings, normalizeProductSettings } from "./data/siteSettings.js";

const AuthPage = lazy(() => import("./pages/AuthPage.jsx").then((module) => ({ default: module.AuthPage })));
const DashboardPage = lazy(() => import("./pages/DashboardPage.jsx").then((module) => ({ default: module.DashboardPage })));
const HomePage = lazy(() => import("./pages/HomePage.jsx").then((module) => ({ default: module.HomePage })));
const EstatesPage = lazy(() => import("./pages/EstatesPage.jsx").then((module) => ({ default: module.EstatesPage })));
const BlogPage = lazy(() => import("./pages/BlogPage.jsx").then((module) => ({ default: module.BlogPage })));

const sitePath = {
  home: "/",
  estates: "/estates",
  blog: "/blog",
};

export function App() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const session = useQuery({ queryKey: ["session"], queryFn: loadCurrentUser, retry: false, staleTime: 60_000 });

  const isConsole = pathname.startsWith("/console");
  const isAuth = pathname.startsWith("/auth");
  const isAdminPath = pathname === "/console/users" || pathname.startsWith("/console/settings/");
  const page = pathname === "/estates" ? "estates" : pathname === "/blog" ? "blog" : "home";
  const publicSettings = useQuery({
    queryKey: ["public-settings"],
    queryFn: getSiteSettings,
    retry: false,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    enabled: !isConsole && !isAuth,
  });
  const publishedSettings = publicSettings.data?.settings;
  const navigationSettings = useMemo(() => normalizeNavigationSettings(publishedSettings?.navigation), [publishedSettings?.navigation]);
  const footerSettings = useMemo(() => normalizeFooterSettings(publishedSettings?.footer), [publishedSettings?.footer]);
  const homeSettings = useMemo(() => normalizeHomeSettings(publishedSettings?.home), [publishedSettings?.home]);
  const productSettings = useMemo(() => normalizeProductSettings(publishedSettings?.products), [publishedSettings?.products]);
  const blogSettings = useMemo(() => normalizeBlogSettings(publishedSettings?.blog), [publishedSettings?.blog]);

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo({ top: 0 });
  }, [pathname]);

  useEffect(() => subscribeToAuthChanges(() => {
    window.setTimeout(() => queryClient.invalidateQueries({ queryKey: ["session"] }), 0);
  }), [queryClient]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 2800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!isConsole || !session.isSuccess) return;
    if (!session.data.user) {
      router.navigate({ to: "/auth", search: { next: pathname }, replace: true });
      return;
    }
    if (isAdminPath && session.data.user.role !== "admin") {
      setNotice("该页面仅管理员可访问");
      router.navigate({ to: "/console", replace: true });
    }
  }, [isAdminPath, isConsole, pathname, router, session.data, session.isSuccess]);

  const navigate = (target) => {
    const to = sitePath[target] ?? target;
    router.navigate({ to });
  };

  const goToSection = (selector) => {
    const scroll = () => window.requestAnimationFrame(() => document.querySelector(selector)?.scrollIntoView({ behavior: "smooth", block: "start" }));
    if (pathname !== "/") {
      router.navigate({ to: "/" }).then(() => window.setTimeout(scroll, 0));
    } else {
      scroll();
    }
    setMenuOpen(false);
  };

  const logout = async () => {
    await logoutAccount();
    queryClient.setQueryData(["session"], { user: null });
    setNotice("已退出登录");
    router.navigate({ to: "/" });
  };

  if (isAuth) {
    if (session.isLoading) return <div className="route-loader">正在确认登录状态...</div>;
    return <Suspense fallback={<div className="route-loader">正在加载账户入口...</div>}><AuthPage pathname={pathname} user={session.data?.user} onSuccess={(user) => {
        queryClient.setQueryData(["session"], { user });
        router.navigate({ to: "/" });
      }} onNavigate={navigate} /></Suspense>;
  }

  if (isConsole) {
    if (session.isLoading || !session.data?.user) return <ConsoleLoader message="正在验证账户并读取算力资产" />;
    return <Suspense fallback={<ConsoleLoader message="正在准备控制台组件" />}><DashboardPage pathname={pathname} user={session.data.user} onNavigate={navigate} onLogout={logout} onNotice={setNotice} onUserUpdated={(user) => queryClient.setQueryData(["session"], { user })} notice={notice} /></Suspense>;
  }

  return (
    <div className={`app-shell app-${page}`}>
      <SiteHeader
        page={page}
        menuOpen={menuOpen}
        onMenuToggle={() => setMenuOpen((value) => !value)}
        onNavigate={navigate}
        onSection={goToSection}
        user={session.data?.user}
        onLogout={logout}
        settings={navigationSettings}
      />
      <main id="home">
        <Suspense fallback={<div className="route-loader">正在加载页面...</div>}>
          {page === "home" ? <HomePage settings={homeSettings} onNavigate={navigate} onNotice={setNotice} /> : null}
          {page === "estates" ? <EstatesPage settings={productSettings} onNavigate={navigate} onNotice={setNotice} /> : null}
          {page === "blog" ? <BlogPage settings={blogSettings} onNotice={setNotice} /> : null}
        </Suspense>
      </main>
      <SiteFooter onNavigate={navigate} onSection={goToSection} settings={footerSettings} />
      {notice ? <div className="toast" role="status">{notice}</div> : null}
    </div>
  );
}
