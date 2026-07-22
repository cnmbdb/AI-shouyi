import { lazy, Suspense, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "./components/SiteChrome.jsx";
import { BlogPage } from "./pages/BlogPage.jsx";
import { EstatesPage } from "./pages/EstatesPage.jsx";
import { HomePage } from "./pages/HomePage.jsx";
import { loadCurrentUser, logoutAccount, subscribeToAuthChanges } from "./lib/auth.js";
import { getSiteSettings } from "./lib/platformData.js";
import { normalizeHomeSettings } from "./data/homeSettings.js";

const AuthPage = lazy(() => import("./pages/AuthPage.jsx").then((module) => ({ default: module.AuthPage })));
const DashboardPage = lazy(() => import("./pages/DashboardPage.jsx").then((module) => ({ default: module.DashboardPage })));

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
  const publicSettings = useQuery({ queryKey: ["public-settings"], queryFn: getSiteSettings, retry: false, staleTime: 30_000, enabled: !isConsole && !isAuth });

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
    if (session.isLoading || !session.data?.user) return <div className="route-loader">正在进入控制台...</div>;
    return <Suspense fallback={<div className="route-loader">正在加载控制台...</div>}><DashboardPage pathname={pathname} user={session.data.user} onNavigate={navigate} onLogout={logout} onNotice={setNotice} notice={notice} /></Suspense>;
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
      />
      <main id="home">
        {page === "home" ? <HomePage settings={normalizeHomeSettings(publicSettings.data?.settings?.home)} onNavigate={navigate} onNotice={setNotice} /> : null}
        {page === "estates" ? <EstatesPage onNavigate={navigate} onNotice={setNotice} /> : null}
        {page === "blog" ? <BlogPage onNotice={setNotice} /> : null}
      </main>
      <SiteFooter onNavigate={navigate} onSection={goToSection} />
      {notice ? <div className="toast" role="status">{notice}</div> : null}
    </div>
  );
}
