import { copyFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const indexPath = fileURLToPath(new URL("../dist/index.html", import.meta.url));
const fallbackPath = fileURLToPath(new URL("../dist/404.html", import.meta.url));
const distPath = fileURLToPath(new URL("../dist/", import.meta.url));

// GitHub Pages returns the SPA fallback with a 404 status for direct nested
// routes. Some mobile browsers cache or reject that response before the app can
// mount, so every stable entry point also gets a real directory index page.
const directEntryRoutes = [
  "about",
  "agency",
  "auth",
  "auth/update-password",
  "blog",
  "calculator",
  "console",
  "console/account",
  "console/content/articles",
  "console/devices",
  "console/earnings",
  "console/orders",
  "console/settings/about",
  "console/settings/agency",
  "console/settings/blog",
  "console/settings/calculator",
  "console/settings/contact",
  "console/settings/footer",
  "console/settings/home",
  "console/settings/navigation",
  "console/settings/products",
  "console/store/payment",
  "console/store/products",
  "console/transactions",
  "console/users",
  "contact",
  "estates",
];

await copyFile(indexPath, fallbackPath);

await Promise.all(directEntryRoutes.map(async (route) => {
  const routeDirectory = `${distPath}${route}`;
  await mkdir(routeDirectory, { recursive: true });
  await copyFile(indexPath, `${routeDirectory}/index.html`);
}));
