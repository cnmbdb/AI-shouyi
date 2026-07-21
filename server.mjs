import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import { createServer as createViteServer, loadEnv } from "vite";

const root = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.argv.includes("--dev");
const mode = isDev ? "development" : "production";
const env = { ...loadEnv(mode, root, ""), ...process.env };
const port = Number(env.SERVER_PORT || 4173);

const requiredDatabaseVariables = ["MYSQL_HOST", "MYSQL_PORT", "MYSQL_DATABASE", "MYSQL_USER", "MYSQL_PASSWORD"];
const missingDatabaseVariables = requiredDatabaseVariables.filter((key) => !env[key]);

if (missingDatabaseVariables.length) {
  throw new Error(`Missing database configuration: ${missingDatabaseVariables.join(", ")}`);
}

const pool = mysql.createPool({
  host: env.MYSQL_HOST,
  port: Number(env.MYSQL_PORT),
  database: env.MYSQL_DATABASE,
  user: env.MYSQL_USER,
  password: env.MYSQL_PASSWORD,
  waitForConnections: true,
  connectionLimit: 6,
  queueLimit: 20,
  enableKeepAlive: true,
  dateStrings: true,
  charset: "utf8mb4",
});

const json = (response, status, payload) => {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(payload));
};

const readJsonBody = (request) => new Promise((resolve, reject) => {
  let body = "";
  request.setEncoding("utf8");
  request.on("data", (chunk) => {
    body += chunk;
    if (body.length > 16_384) reject(new Error("Request body too large"));
  });
  request.on("end", () => {
    try {
      resolve(body ? JSON.parse(body) : {});
    } catch {
      reject(new Error("Invalid JSON"));
    }
  });
  request.on("error", reject);
});

const requestBuckets = new Map();
const canSubscribe = (request) => {
  const forwarded = request.headers["x-forwarded-for"];
  const ip = String(forwarded || request.socket.remoteAddress || "unknown").split(",")[0].trim();
  const now = Date.now();
  const current = requestBuckets.get(ip);
  if (!current || now - current.startedAt > 60 * 60 * 1000) {
    requestBuckets.set(ip, { count: 1, startedAt: now });
    return true;
  }
  current.count += 1;
  return current.count <= 10;
};

async function handleApi(request, response) {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);

  if (request.method === "GET" && url.pathname === "/api/health") {
    await pool.query("select 1");
    json(response, 200, { ok: true, database: "connected" });
    return true;
  }

  if (request.method === "GET" && url.pathname === "/api/blog/posts") {
    const [rows] = await pool.query(`
      select slug, title, excerpt, category, author_name, author_avatar,
             image_url, image_position, published_at, read_time_minutes,
             featured, editors_pick, display_order
      from aether_blog_posts
      where published = 1
      order by display_order asc, published_at desc
    `);
    json(response, 200, {
      posts: rows.map((row) => ({
        ...row,
        featured: Boolean(row.featured),
        editors_pick: Boolean(row.editors_pick),
      })),
    });
    return true;
  }

  if (request.method === "POST" && url.pathname === "/api/blog/newsletter") {
    if (!canSubscribe(request)) {
      json(response, 429, { error: "Too many subscription attempts" });
      return true;
    }

    const body = await readJsonBody(request);
    const email = String(body.email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      json(response, 400, { error: "Invalid email address" });
      return true;
    }

    const [result] = await pool.execute(
      "insert ignore into aether_newsletter_subscriptions (email, source) values (?, 'blog')",
      [email],
    );
    json(response, result.affectedRows ? 201 : 200, {
      ok: true,
      alreadySubscribed: result.affectedRows === 0,
    });
    return true;
  }

  if (url.pathname.startsWith("/api/")) {
    json(response, 404, { error: "Not found" });
    return true;
  }

  return false;
}

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

async function serveProduction(request, response) {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  const pathname = decodeURIComponent(url.pathname);
  const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const candidate = path.resolve(root, "dist", relativePath);
  const distRoot = path.resolve(root, "dist");

  let filePath = candidate.startsWith(distRoot) ? candidate : path.join(distRoot, "index.html");
  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) filePath = path.join(distRoot, "index.html");
  } catch {
    filePath = path.join(distRoot, "index.html");
  }

  response.writeHead(200, {
    "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream",
    "X-Content-Type-Options": "nosniff",
  });
  createReadStream(filePath).pipe(response);
}

const vite = isDev
  ? await createViteServer({ root, server: { middlewareMode: true }, appType: "spa" })
  : null;

const server = http.createServer(async (request, response) => {
  try {
    if (await handleApi(request, response)) return;
    if (vite) {
      vite.middlewares(request, response);
      return;
    }
    await serveProduction(request, response);
  } catch (error) {
    console.error(error);
    if (!response.headersSent) json(response, 500, { error: "Internal server error" });
    else response.end();
  }
});

server.listen(port, "0.0.0.0", async () => {
  await pool.query("select 1");
  console.log(`Aether Lane ${isDev ? "development" : "production"} server listening on http://localhost:${port}`);
});

const shutdown = async () => {
  server.close();
  await pool.end();
  if (vite) await vite.close();
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

