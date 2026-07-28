const productionHostname = "ai.suxin.ai";
const localHostnames = new Set(["localhost", "127.0.0.1", "10.0.2.2"]);

const currentHref = () => {
  if (typeof window !== "undefined" && window.location?.href) return window.location.href;
  return `https://${productionHostname}/`;
};

const internalTarget = (url) => `${url.pathname || "/"}${url.search}${url.hash}`;

export function resolveManagedLink(value, baseHref = currentHref()) {
  const target = String(value || "").trim();
  if (!target) return { kind: "empty", target: "" };
  if (target.startsWith("#")) return { kind: "section", target };
  if (/^(mailto|tel):/i.test(target)) return { kind: "external", target };

  let url;
  let base;
  try {
    base = new URL(baseHref);
    url = new URL(target, base);
  } catch {
    return { kind: "invalid", target };
  }

  if (!["http:", "https:"].includes(url.protocol)) return { kind: "invalid", target };

  const isInternalHost = url.hostname === productionHostname
    || url.hostname === base.hostname
    || localHostnames.has(url.hostname);

  if (isInternalHost) return { kind: "internal", target: internalTarget(url) };
  if (url.protocol === "https:") return { kind: "external", target: url.toString() };
  return { kind: "invalid", target };
}

export function normalizeManagedLink(value, baseHref) {
  const resolved = resolveManagedLink(value, baseHref);
  return resolved.kind === "internal" ? resolved.target : String(value || "").trim();
}

export function prepareManagedLinkForPublish(value, label = "链接") {
  const resolved = resolveManagedLink(value);
  if (resolved.kind === "invalid") {
    throw new Error(`${label}只允许站内路径或完整 HTTPS 地址`);
  }
  return resolved.kind === "internal" ? resolved.target : resolved.target;
}
