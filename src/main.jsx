import React, { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, createRoute, createRouter, RouterProvider } from "@tanstack/react-router";
import { App } from "./App.jsx";
import { ThemeProvider } from "./components/ThemeProvider.jsx";
import { TooltipProvider } from "./components/ui/tooltip.jsx";
import "./styles.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1 },
  },
});

const rootRoute = createRootRoute({ component: App });
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component: () => null });
const catchAllRoute = createRoute({ getParentRoute: () => rootRoute, path: "$", component: () => null });
const router = createRouter({ routeTree: rootRoute.addChildren([indexRoute, catchAllRoute]) });

const TanStackDevtools = import.meta.env.DEV
  ? lazy(async () => {
    const [{ ReactQueryDevtools }, { TanStackRouterDevtools }] = await Promise.all([
      import("@tanstack/react-query-devtools"),
      import("@tanstack/react-router-devtools"),
    ]);
    return {
      default: () => (
        <>
          <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
          <TanStackRouterDevtools router={router} initialIsOpen={false} position="bottom-right" />
        </>
      ),
    };
  })
  : () => null;

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <TooltipProvider>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
          <Suspense fallback={null}><TanStackDevtools /></Suspense>
        </QueryClientProvider>
      </TooltipProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
