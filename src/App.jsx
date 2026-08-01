import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "./components/SiteChrome.jsx";
import { ConsoleLoader } from "./components/ConsoleLoader.jsx";
import { loadCurrentUser, logoutAccount, subscribeToAuthChanges } from "./lib/auth.js";
import { getCachedSiteSettings, getSiteSettings, subscribeToPublishedContent } from "./lib/platformData.js";
import { normalizeHomeSettings } from "./data/homeSettings.js";
import { normalizeBlogSettings, normalizeFooterSettings, normalizeNavigationSettings, normalizeProductSettings } from "./data/siteSettings.js";
import { marketingPageNormalizers } from "./data/marketingPages.js";

const AuthPage = lazy(() => import("./pages/AuthPage.jsx").then((module) => ({ default: module.AuthPage })));
const DashboardPage = lazy(() => import("./pages/DashboardPage.jsx").then((module) => ({ default: module.DashboardPage })));
const HomePage = lazy(() => import("./pages/HomePage.jsx").then((module) => ({ default: module.HomePage })));
const EstatesPage = lazy(() => import("./pages/EstatesPage.jsx").then((module) => ({ default: module.EstatesPage })));
const BlogPage = lazy(() => import("./pages/BlogPage.jsx").then((module) => ({ default: module.BlogPage })));
const BlogArticlePage = lazy(() => import("./pages/BlogArticlePage.jsx").then((module) => ({ default: module.BlogArticlePage })));
const StoreProductPage = lazy(() => import("./pages/StoreProductPage.jsx").then((module) => ({ default: module.StoreProductPage })));
const AboutPage = lazy(() => import("./pages/AboutPage.jsx").then((module) => ({ default: module.AboutPage })));
const YieldCalculatorPage = lazy(() => import("./pages/YieldCalculatorPage.jsx").then((module) => ({ default: module.YieldCalculatorPage })));
const AgencyPage = lazy(() => import("./pages/AgencyPage.jsx").then((module) => ({ default: module.AgencyPage })));
const ContactPage = lazy(() => import("./pages/ContactPage.jsx").then((module) => ({ default: module.ContactPage })));

const sitePath = {
  home: "/",
  estates: "/estates",
  blog: "/blog",
  about: "/about",
  calculator: "/calculator",
  agency: "/agency",
  contact: "/contact",
};

export function App() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [cachedPublicSettings] = useState(() => getCachedSiteSettings());
  const session = useQuery({ queryKey: ["session"], queryFn: loadCurrentUser, retry: false, staleTime: 60_000 });

  const isConsole = pathname.startsWith("/console");
  const isAuth = pathname.startsWith("/auth");
  const isAdminPath = pathname === "/console/users" || pathname.startsWith("/console/settings/") || pathname.startsWith("/console/store/") || pathname.startsWith("/console/content/");
  const isBlogArticle = pathname.startsWith("/blog/");
  const blogSlug = isBlogArticle ? decodeURIComponent(pathname.slice("/blog/".length)) : "";
  const isStoreProduct = pathname.startsWith("/estates/") || pathname.startsWith("/products/");
  const productRoutePrefix = pathname.startsWith("/estates/") ? "/estates/" : "/products/";
  const productSegments = isStoreProduct ? pathname.slice(productRoutePrefix.length).split("/").filter(Boolean).map(decodeURIComponent) : [];
  const productCategoryId = productSegments.length >= 2 ? productSegments[0] : "";
  const productId = productSegments.length >= 2 ? productSegments[1] : "";
  const legacyProductSlug = productSegments.length === 1 ? productSegments[0] : "";
  const publicPageByPath = { "/": "home", "/estates": "estates", "/blog": "blog", "/about": "about", "/calculator": "calculator", "/agency": "agency", "/contact": "contact" };
  const page = isBlogArticle ? "blog" : isStoreProduct ? "product" : publicPageByPath[pathname] ?? "home";
  const publicSettings = useQuery({
    queryKey: ["public-settings"],
    queryFn: getSiteSettings,
    retry: false,
    initialData: cachedPublicSettings,
    initialDataUpdatedAt: 0,
    staleTime: 30_000,
    gcTime: 30 * 60_000,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    refetchOnReconnect: "always",
    enabled: !isConsole,
  });
  const publishedSettings = publicSettings.data?.settings;
  const navigationSettings = useMemo(() => normalizeNavigationSettings(publishedSettings?.navigation), [publishedSettings?.navigation]);
  const footerSettings = useMemo(() => normalizeFooterSettings(publishedSettings?.footer), [publishedSettings?.footer]);
  const homeSettings = useMemo(() => normalizeHomeSettings(publishedSettings?.home), [publishedSettings?.home]);
  const productSettings = useMemo(() => normalizeProductSettings(publishedSettings?.products), [publishedSettings?.products]);
  const blogSettings = useMemo(() => normalizeBlogSettings(publishedSettings?.blog), [publishedSettings?.blog]);
  const aboutSettings = useMemo(() => marketingPageNormalizers.about(publishedSettings?.about), [publishedSettings?.about]);
  const calculatorSettings = useMemo(() => marketingPageNormalizers.calculator(publishedSettings?.calculator), [publishedSettings?.calculator]);
  const agencySettings = useMemo(() => marketingPageNormalizers.agency(publishedSettings?.agency), [publishedSettings?.agency]);
  const contactSettings = useMemo(() => marketingPageNormalizers.contact(publishedSettings?.contact), [publishedSettings?.contact]);

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo({ top: 0 });
  }, [pathname]);

  useEffect(() => subscribeToAuthChanges(() => {
    window.setTimeout(() => queryClient.invalidateQueries({ queryKey: ["session"] }), 0);
  }), [queryClient]);

  useEffect(() => {
    if (isConsole) return undefined;
    const refreshPublishedContent = () => {
      void queryClient.invalidateQueries({ queryKey: ["public-settings"] });
      void queryClient.invalidateQueries({ queryKey: ["blog-posts"] });
      void queryClient.invalidateQueries({ queryKey: ["blog-post"] });
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refreshPublishedContent();
    };
    const unsubscribe = subscribeToPublishedContent({
      onSiteSettings: () => void queryClient.invalidateQueries({ queryKey: ["public-settings"] }),
      onBlogPosts: () => {
        void queryClient.invalidateQueries({ queryKey: ["blog-posts"] });
        void queryClient.invalidateQueries({ queryKey: ["blog-post"] });
      },
    });
    window.addEventListener("online", refreshPublishedContent);
    window.addEventListener("aether:app-resume", refreshPublishedContent);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      unsubscribe();
      window.removeEventListener("online", refreshPublishedContent);
      window.removeEventListener("aether:app-resume", refreshPublishedContent);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [isConsole, queryClient]);

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

  if (!isConsole && !publicSettings.data && publicSettings.isPending) {
    return <div className="route-loader">正在同步 ai.suxin.ai 最新配置...</div>;
  }

  if (!isConsole && !publicSettings.data && publicSettings.isError) {
    return <div className="route-loader route-loader-error"><div><strong>暂时无法连接内容总控</strong><span>请检查网络后重试，应用不会用内置内容覆盖线上数据。</span><button type="button" onClick={() => publicSettings.refetch()}>重新同步</button></div></div>;
  }

  if (isAuth) {
    if (session.isLoading) return <div className="route-loader">正在确认登录状态...</div>;
    return <Suspense fallback={<div className="route-loader">正在加载账户入口...</div>}><AuthPage pathname={pathname} user={session.data?.user} onSuccess={(user) => {
        queryClient.setQueryData(["session"], { user });
        router.navigate({ to: "/" });
      }} onNavigate={navigate} navigationSettings={navigationSettings} /></Suspense>;
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
          {page === "blog" && !isBlogArticle ? <BlogPage settings={blogSettings} onNotice={setNotice} onNavigate={navigate} /> : null}
          {page === "about" ? <AboutPage settings={aboutSettings} onNavigate={navigate} onNotice={setNotice} /> : null}
          {page === "calculator" ? <YieldCalculatorPage settings={calculatorSettings} onNavigate={navigate} onNotice={setNotice} /> : null}
          {page === "agency" ? <AgencyPage settings={agencySettings} onNavigate={navigate} onNotice={setNotice} /> : null}
          {page === "contact" ? <ContactPage settings={contactSettings} onNavigate={navigate} onNotice={setNotice} /> : null}
          {isBlogArticle ? <BlogArticlePage slug={blogSlug} onNavigate={navigate} /> : null}
          {page === "product" ? <StoreProductPage categoryId={productCategoryId} productId={productId} legacySlug={legacyProductSlug} user={session.data?.user} onNavigate={navigate} onNotice={setNotice} /> : null}
        </Suspense>
      </main>
      <SiteFooter onNavigate={navigate} onSection={goToSection} settings={footerSettings} />
      {notice ? <div className="toast" role="status">{notice}</div> : null}
    </div>
  );
}
