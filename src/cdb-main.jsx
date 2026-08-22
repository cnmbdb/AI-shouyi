import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "./components/ui/tooltip.jsx";
import { SiteFooter, SiteHeader } from "./components/SiteChrome.jsx";
import { defaultBlogSettings, defaultFooterSettings, defaultNavigationSettings, defaultProductSettings } from "./data/siteSettings.js";
import { defaultMarketingPageSettings } from "./data/marketingPages.js";
import { AboutPage } from "./pages/AboutPage.jsx";
import { EstatesPage } from "./pages/EstatesPage.jsx";
import { YieldCalculatorPage } from "./pages/YieldCalculatorPage.jsx";
import { AgencyPage } from "./pages/AgencyPage.jsx";
import { BlogPage } from "./pages/BlogPage.jsx";
import { ContactPage } from "./pages/ContactPage.jsx";
import "./styles.css";

document.documentElement.classList.remove("dark");
document.documentElement.style.colorScheme = "light";

const queryClient = new QueryClient({
  defaultOptions: { queries: { enabled: false, retry: false } },
});

const page = new URLSearchParams(window.location.search).get("page") || "about";
const noop = () => {};

const content = {
  about: <AboutPage settings={defaultMarketingPageSettings.about} onNavigate={noop} onNotice={noop} />,
  estates: <EstatesPage settings={defaultProductSettings} onNavigate={noop} onNotice={noop} />,
  calculator: <YieldCalculatorPage settings={defaultMarketingPageSettings.calculator} onNavigate={noop} onNotice={noop} />,
  agency: <AgencyPage settings={defaultMarketingPageSettings.agency} onNavigate={noop} onNotice={noop} />,
  blog: <BlogPage settings={defaultBlogSettings} onNavigate={noop} onNotice={noop} captureMode />,
  contact: <ContactPage settings={defaultMarketingPageSettings.contact} onNavigate={noop} onNotice={noop} />,
}[page] ?? null;

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <TooltipProvider>
      <QueryClientProvider client={queryClient}>
        <div className={`app-shell app-${page}`}>
          <SiteHeader
            page={page}
            menuOpen={false}
            onMenuToggle={noop}
            onNavigate={noop}
            onSection={noop}
            user={null}
            onLogout={noop}
            settings={defaultNavigationSettings}
          />
          <main id="home">{content}</main>
          <SiteFooter onNavigate={noop} onSection={noop} settings={defaultFooterSettings} />
        </div>
      </QueryClientProvider>
    </TooltipProvider>
  </React.StrictMode>,
);
