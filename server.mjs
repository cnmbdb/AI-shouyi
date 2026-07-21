import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import { createClient as createRedisClient } from "redis";
import { createServer as createViteServer, loadEnv } from "vite";

const root = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.argv.includes("--dev");
const mode = isDev ? "development" : "production";
const env = { ...loadEnv(mode, root, ""), ...process.env };
const port = Number(env.SERVER_PORT || 4173);

const requiredDatabaseVariables = ["MYSQL_HOST", "MYSQL_PORT", "MYSQL_DATABASE", "MYSQL_USER", "MYSQL_PASSWORD"];
const missingDatabaseVariables = requiredDatabaseVariables.filter((key) => !env[key]);
const databaseAvailable = missingDatabaseVariables.length === 0;

if (!databaseAvailable && !isDev) {
  throw new Error(`Missing database configuration: ${missingDatabaseVariables.join(", ")}`);
}

const pool = databaseAvailable ? mysql.createPool({
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
}) : null;

const redisConfigured = ["REDIS_HOST", "REDIS_PORT", "REDIS_PASSWORD"].every((key) => env[key]);
const redis = redisConfigured ? createRedisClient({
  password: env.REDIS_PASSWORD,
  database: Number(env.REDIS_DATABASE || 0),
  disableOfflineQueue: true,
  pingInterval: 30_000,
  socket: {
    host: env.REDIS_HOST,
    port: Number(env.REDIS_PORT || 6379),
    connectTimeout: 5_000,
    reconnectStrategy: (retries) => Math.min(250 * (2 ** Math.min(retries, 4)), 5_000),
  },
}) : null;

let redisAvailable = false;
if (redis) {
  redis.on("ready", () => {
    redisAvailable = true;
  });
  redis.on("end", () => {
    redisAvailable = false;
  });
  redis.on("error", (error) => {
    redisAvailable = false;
    console.warn(`Redis cache unavailable: ${error.message}`);
  });
  redis.connect().catch((error) => {
    console.warn(`Starting without Redis cache: ${error.message}`);
  });
}

const blogCacheKey = "aether:blog:posts:v1";
const blogCacheTtlSeconds = Number(env.REDIS_CACHE_TTL_SECONDS || 300);

const json = (response, status, payload, extraHeaders = {}) => {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...extraHeaders,
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

const sessionCookieName = "aether_session";
const sessionDurationSeconds = 60 * 60 * 24 * 30;
const settingSections = new Set(["navigation", "footer", "home", "products", "blog"]);
const memoryStore = {
  nextUserId: 1,
  users: [],
  sessions: new Map(),
  settings: new Map(),
};

const hashToken = (token) => createHash("sha256").update(token).digest("hex");

const hashPassword = (password) => {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
};

const verifyPassword = (password, stored) => {
  const [algorithm, salt, expectedHex] = String(stored || "").split("$");
  if (algorithm !== "scrypt" || !salt || !expectedHex) return false;
  const expected = Buffer.from(expectedHex, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
};

const parseCookies = (request) => Object.fromEntries(String(request.headers.cookie || "").split(";").map((part) => part.trim()).filter(Boolean).map((part) => {
  const index = part.indexOf("=");
  return index < 0 ? [part, ""] : [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
}));

const sessionCookie = (request, token, maxAge = sessionDurationSeconds) => {
  const secure = String(request.headers["x-forwarded-proto"] || "").split(",")[0].trim() === "https";
  return `${sessionCookieName}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
};

const publicUser = (row) => ({
  id: row.id,
  username: row.username,
  display_name: row.display_name || row.username,
  avatar_color: row.avatar_color || "#6657d3",
});

async function createSession(request, response, userId) {
  const token = randomBytes(32).toString("base64url");
  if (pool) {
    await pool.execute(
      "insert into aether_sessions (token_hash, user_id, expires_at) values (?, ?, date_add(now(), interval 30 day))",
      [hashToken(token), userId],
    );
  } else {
    memoryStore.sessions.set(hashToken(token), { userId, expiresAt: Date.now() + sessionDurationSeconds * 1000 });
  }
  response.setHeader("Set-Cookie", sessionCookie(request, token));
}

async function authenticatedUser(request) {
  const token = parseCookies(request)[sessionCookieName];
  if (!token) return null;
  if (!pool) {
    const session = memoryStore.sessions.get(hashToken(token));
    if (!session || session.expiresAt <= Date.now()) return null;
    const user = memoryStore.users.find((item) => item.id === session.userId);
    return user ? publicUser(user) : null;
  }
  const [rows] = await pool.execute(`
    select u.id, u.username, u.display_name, u.avatar_color
    from aether_sessions s
    join aether_users u on u.id = s.user_id
    where s.token_hash = ? and s.expires_at > now()
    limit 1
  `, [hashToken(token)]);
  return rows[0] ? publicUser(rows[0]) : null;
}

async function requireUser(request, response) {
  const user = await authenticatedUser(request);
  if (!user) json(response, 401, { error: "请先登录" });
  return user;
}

async function ensurePlatformSchema() {
  if (!pool) return;
  await pool.query(`
    create table if not exists aether_users (
      id bigint unsigned not null auto_increment,
      username varchar(64) not null,
      password_hash varchar(255) not null,
      display_name varchar(80) null,
      avatar_color varchar(16) not null default '#6657d3',
      created_at timestamp not null default current_timestamp,
      updated_at timestamp not null default current_timestamp on update current_timestamp,
      primary key (id),
      unique key uq_aether_users_username (username)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci
  `);
  await pool.query(`
    create table if not exists aether_sessions (
      id bigint unsigned not null auto_increment,
      token_hash char(64) not null,
      user_id bigint unsigned not null,
      expires_at timestamp not null,
      created_at timestamp not null default current_timestamp,
      primary key (id),
      unique key uq_aether_sessions_token (token_hash),
      key idx_aether_sessions_user (user_id),
      key idx_aether_sessions_expiry (expires_at),
      constraint fk_aether_sessions_user foreign key (user_id) references aether_users (id) on delete cascade
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci
  `);
  await pool.query(`
    create table if not exists aether_site_settings (
      section_key varchar(32) not null,
      value_json longtext not null,
      updated_by bigint unsigned null,
      updated_at timestamp not null default current_timestamp on update current_timestamp,
      primary key (section_key),
      key idx_aether_site_settings_user (updated_by),
      constraint fk_aether_site_settings_user foreign key (updated_by) references aether_users (id) on delete set null
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci
  `);
}

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

  if (request.method === "GET" && url.pathname === "/api/auth/session") {
    json(response, 200, { user: await authenticatedUser(request) });
    return true;
  }

  if (request.method === "POST" && (url.pathname === "/api/auth/register" || url.pathname === "/api/auth/login")) {
    const body = await readJsonBody(request);
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    if (username.length < 2 || username.length > 64 || password.length < 4 || password.length > 200) {
      json(response, 400, { error: "用户名至少 2 个字符，密码至少 4 个字符" });
      return true;
    }

    if (url.pathname.endsWith("/register")) {
      if (!pool) {
        if (memoryStore.users.some((user) => user.username.toLowerCase() === username.toLowerCase())) {
          json(response, 409, { error: "该用户名已被注册" });
          return true;
        }
        const colors = ["#6657d3", "#3a76b7", "#3b8c78", "#a45f75", "#8055b8"];
        const user = { id: memoryStore.nextUserId++, username, password_hash: hashPassword(password), display_name: username, avatar_color: colors[username.length % colors.length] };
        memoryStore.users.push(user);
        await createSession(request, response, user.id);
        json(response, 201, { user: publicUser(user) });
        return true;
      }
      try {
        const colors = ["#6657d3", "#3a76b7", "#3b8c78", "#a45f75", "#8055b8"];
        const [result] = await pool.execute(
          "insert into aether_users (username, password_hash, display_name, avatar_color) values (?, ?, ?, ?)",
          [username, hashPassword(password), username, colors[username.length % colors.length]],
        );
        const user = { id: result.insertId, username, display_name: username, avatar_color: colors[username.length % colors.length] };
        await createSession(request, response, user.id);
        json(response, 201, { user });
      } catch (error) {
        if (error.code === "ER_DUP_ENTRY") json(response, 409, { error: "该用户名已被注册" });
        else throw error;
      }
      return true;
    }

    const rows = pool
      ? (await pool.execute("select id, username, password_hash, display_name, avatar_color from aether_users where username = ? limit 1", [username]))[0]
      : memoryStore.users.filter((user) => user.username.toLowerCase() === username.toLowerCase());
    if (!rows[0] || !verifyPassword(password, rows[0].password_hash)) {
      json(response, 401, { error: "用户名或密码不正确" });
      return true;
    }
    await createSession(request, response, rows[0].id);
    json(response, 200, { user: publicUser(rows[0]) });
    return true;
  }

  if (request.method === "POST" && url.pathname === "/api/auth/logout") {
    const token = parseCookies(request)[sessionCookieName];
    if (token && pool) await pool.execute("delete from aether_sessions where token_hash = ?", [hashToken(token)]);
    if (token && !pool) memoryStore.sessions.delete(hashToken(token));
    response.setHeader("Set-Cookie", sessionCookie(request, "", 0));
    json(response, 200, { ok: true });
    return true;
  }

  if (request.method === "GET" && url.pathname === "/api/platform/overview") {
    if (!await requireUser(request, response)) return true;
    json(response, 200, {
      metrics: [
        { value: "¥218,640", change: "+12.6%" },
        { value: "¥8,426.52", change: "+8.2%" },
        { value: "99.82%", change: "+0.14%" },
        { value: "¥2,184.20", change: "-3.4%" },
      ],
      earnings: [32, 36, 34, 42, 46, 44, 53, 57, 54, 61, 63, 68, 66, 74],
    });
    return true;
  }

  if (request.method === "GET" && url.pathname === "/api/site-settings") {
    if (!await requireUser(request, response)) return true;
    if (!pool) {
      json(response, 200, { settings: Object.fromEntries(memoryStore.settings) });
      return true;
    }
    const [rows] = await pool.query("select section_key, value_json from aether_site_settings");
    const settings = {};
    for (const row of rows) {
      try { settings[row.section_key] = JSON.parse(row.value_json); } catch { settings[row.section_key] = {}; }
    }
    json(response, 200, { settings });
    return true;
  }

  if (request.method === "PUT" && url.pathname === "/api/site-settings") {
    const user = await requireUser(request, response);
    if (!user) return true;
    const body = await readJsonBody(request);
    const section = String(body.section || "");
    if (!settingSections.has(section) || !body.value || typeof body.value !== "object" || Array.isArray(body.value)) {
      json(response, 400, { error: "无效的设置内容" });
      return true;
    }
    const value = JSON.stringify(body.value);
    if (value.length > 16_384) {
      json(response, 413, { error: "设置内容过大" });
      return true;
    }
    if (pool) {
      await pool.execute(`
        insert into aether_site_settings (section_key, value_json, updated_by)
        values (?, ?, ?)
        on duplicate key update value_json = values(value_json), updated_by = values(updated_by)
      `, [section, value, user.id]);
    } else {
      memoryStore.settings.set(section, body.value);
    }
    json(response, 200, { ok: true, section, value: body.value });
    return true;
  }

  if (request.method === "GET" && url.pathname === "/api/health") {
    if (pool) await pool.query("select 1");
    let cache = "disabled";
    if (redisAvailable && redis.isReady) {
      try {
        cache = await redis.ping() === "PONG" ? "connected" : "unavailable";
      } catch {
        cache = "unavailable";
      }
    }
    json(response, 200, { ok: true, database: pool ? "connected" : "development-memory", cache });
    return true;
  }

  if (request.method === "GET" && url.pathname === "/api/blog/posts") {
    if (!pool) {
      json(response, 200, { posts: [] }, { "X-Cache": "DEV-FALLBACK" });
      return true;
    }
    if (redisAvailable && redis.isReady) {
      try {
        const cachedPosts = await redis.get(blogCacheKey);
        if (cachedPosts) {
          json(response, 200, JSON.parse(cachedPosts), { "X-Cache": "HIT" });
          return true;
        }
      } catch (error) {
        console.warn(`Redis read failed, using MySQL: ${error.message}`);
      }
    }

    const [rows] = await pool.query(`
      select slug, title, excerpt, category, author_name, author_avatar,
             image_url, image_position, published_at, read_time_minutes,
             featured, editors_pick, display_order
      from aether_blog_posts
      where published = 1
      order by display_order asc, published_at desc
    `);
    const payload = {
      posts: rows.map((row) => ({
        ...row,
        featured: Boolean(row.featured),
        editors_pick: Boolean(row.editors_pick),
      })),
    };

    if (redisAvailable && redis.isReady) {
      try {
        await redis.setEx(blogCacheKey, blogCacheTtlSeconds, JSON.stringify(payload));
      } catch (error) {
        console.warn(`Redis write failed, response still served from MySQL: ${error.message}`);
      }
    }

    json(response, 200, payload, { "X-Cache": "MISS" });
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

    if (!pool) {
      json(response, 201, { ok: true, alreadySubscribed: false, developmentFallback: true });
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
  if (pool) await pool.query("select 1");
  await ensurePlatformSchema();
  if (!pool) console.warn("MySQL is not configured; using development-only in-memory auth and settings.");
  console.log(`Aether Lane ${isDev ? "development" : "production"} server listening on http://localhost:${port}`);
});

const shutdown = async () => {
  server.close();
  if (pool) await pool.end();
  if (redis?.isOpen) await redis.quit();
  if (vite) await vite.close();
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
