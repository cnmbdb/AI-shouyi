const localImages = {
  "estate-coast": 1536,
  "estate-luna-ridge": 1536,
  "estate-palm-serenity": 1536,
  "estate-vista-mare": 1536,
  "estates-hero-game-cards": 1200,
  "estates-hero": 1981,
  "gpu-carousel-card": 1086,
  "hero-foreground": 1672,
  "hero-galaxy-home": 1672,
  "retreat-pool": 1672,
};

const isRemoteAsset = (path) => /^(?:https?:|data:|blob:)/i.test(path);

const localImage = (path) => {
  if (!path || isRemoteAsset(path)) return null;
  const match = path.match(/(?:^|\/)images\/([^/?]+?)\.(?:png|webp)(?:[?#].*)?$/i);
  if (!match || !localImages[match[1]]) return null;
  return { name: match[1], width: localImages[match[1]] };
};

const publicAsset = (path = "") => {
  if (!path || isRemoteAsset(path)) return path;
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;
};

export const assetUrl = (path = "", width) => {
  const image = localImage(path);
  if (!image) return publicAsset(path);
  const suffix = width ? `-${width}` : "";
  return publicAsset(`/images/${image.name}${suffix}.webp`);
};

export const responsiveImageProps = (path = "", sizes = "100vw") => {
  const image = localImage(path);
  if (!image) return { src: publicAsset(path) };
  return {
    src: assetUrl(path),
    srcSet: `${assetUrl(path, 768)} 768w, ${assetUrl(path, 1280)} 1280w, ${assetUrl(path)} ${image.width}w`,
    sizes,
  };
};

export const preloadImageUrl = (path = "") => assetUrl(path, 1280);
