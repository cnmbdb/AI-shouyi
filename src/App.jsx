import { useEffect, useState } from "react";
import { SiteFooter, SiteHeader } from "./components/SiteChrome.jsx";
import { EstatesPage } from "./pages/EstatesPage.jsx";
import { HomePage } from "./pages/HomePage.jsx";

function pageFromLocation() {
  return new URLSearchParams(window.location.search).get("view") === "estates" ? "estates" : "home";
}

export function App() {
  const [page, setPage] = useState(pageFromLocation);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const syncPage = () => {
      setPage(pageFromLocation());
      setMenuOpen(false);
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("popstate", syncPage);
    return () => window.removeEventListener("popstate", syncPage);
  }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const navigate = (nextPage) => {
    const url = new URL(window.location.href);
    url.hash = "";
    if (nextPage === "estates") url.searchParams.set("view", "estates");
    else url.searchParams.delete("view");
    window.history.pushState({ page: nextPage }, "", `${url.pathname}${url.search}`);
    setPage(nextPage);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const goToSection = (selector) => {
    const scroll = () => window.requestAnimationFrame(() => document.querySelector(selector)?.scrollIntoView({ behavior: "smooth", block: "start" }));
    if (page !== "home") {
      const url = new URL(window.location.href);
      url.searchParams.delete("view");
      url.hash = "";
      window.history.pushState({ page: "home" }, "", `${url.pathname}${url.search}`);
      setPage("home");
      window.setTimeout(scroll, 0);
    } else {
      scroll();
    }
    setMenuOpen(false);
  };

  return (
    <div className={`app-shell app-${page}`}>
      <SiteHeader page={page} menuOpen={menuOpen} onMenuToggle={() => setMenuOpen((value) => !value)} onNavigate={navigate} onSection={goToSection} />
      <main id="home">
        {page === "home" ? <HomePage onNavigate={navigate} onNotice={setNotice} /> : <EstatesPage onNavigate={navigate} onNotice={setNotice} />}
      </main>
      <SiteFooter onNavigate={navigate} onSection={goToSection} />
      {notice ? <div className="toast" role="status">{notice}</div> : null}
    </div>
  );
}
