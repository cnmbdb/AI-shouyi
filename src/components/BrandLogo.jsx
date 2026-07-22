import { GpuIcon as Gpu } from "lucide-react";
import { assetUrl } from "@/lib/assets.js";

export function BrandLogoMark({ logo = "", imageClassName = "", fallbackClassName = "" }) {
  if (logo) return <img className={imageClassName} src={assetUrl(logo, 768)} alt="" />;
  return <Gpu className={fallbackClassName} strokeWidth={1.7} aria-hidden="true" />;
}
