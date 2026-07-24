const horizontalKeywords = { left: 0, center: 50, right: 100 };
const verticalKeywords = { top: 0, center: 50, bottom: 100 };

const clamp = (value) => Math.min(100, Math.max(0, value));
const rounded = (value) => Math.round(value * 100) / 100;

function tokenValue(token, axis) {
  const normalized = String(token ?? "").trim().toLowerCase();
  const keywords = axis === "x" ? horizontalKeywords : verticalKeywords;
  if (normalized in keywords) return keywords[normalized];
  const numeric = Number.parseFloat(normalized.replace(/%$/, ""));
  return Number.isFinite(numeric) ? clamp(numeric) : 50;
}

export function parseFocalPosition(value) {
  const tokens = String(value ?? "").trim().toLowerCase().split(/\s+/).filter(Boolean);
  let x = 50;
  let y = 50;

  if (tokens.length === 1) {
    if (["top", "bottom"].includes(tokens[0])) y = tokenValue(tokens[0], "y");
    else x = tokenValue(tokens[0], "x");
  } else if (tokens.length >= 2) {
    const [first, second] = tokens;
    if (["top", "bottom"].includes(first) || ["left", "right"].includes(second)) {
      x = tokenValue(second, "x");
      y = tokenValue(first, "y");
    } else {
      x = tokenValue(first, "x");
      y = tokenValue(second, "y");
    }
  }

  x = rounded(x);
  y = rounded(y);
  return { x, y, value: `${x}% ${y}%` };
}

export const normalizeFocalPosition = (value) => parseFocalPosition(value).value;
