import { useRef, useState } from "react";
import { Image as ImageIcon, LoaderCircle, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { assetUrl } from "@/lib/assets.js";
import { parseFocalPosition } from "@/lib/focalPosition.js";
import { uploadSiteImage } from "@/lib/platformData.js";

export function ImageControls({ prefix, image, position, onImage, onPosition, variant = "content", placeholder = null, label = "", previewAspect = "" }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploadError, setUploadError] = useState(false);
  const focalPosition = parseFocalPosition(position);
  const previewPosition = focalPosition.value;

  const updateFocalPosition = (axis, value) => {
    if (!onPosition || value === "") return;
    const nextValue = Math.min(100, Math.max(0, Number(value) || 0));
    onPosition(axis === "x"
      ? `${nextValue}% ${focalPosition.y}%`
      : `${focalPosition.x}% ${nextValue}%`);
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(false);
    setUploadStatus("正在上传...");

    try {
      const uploaded = await uploadSiteImage(file, prefix);
      onImage(uploaded.url);
      setUploadStatus("上传成功，请保存发布");
    } catch (error) {
      setUploadError(true);
      setUploadStatus(error.message || "图片上传失败");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  return (
    <div className={`home-image-fields${variant === "logo" ? " home-logo-image-fields" : ""}${previewAspect ? " home-image-fields-contextual" : ""}`}>
      {label ? <strong className="home-image-fields-label">{label}</strong> : null}
      <div className="home-image-preview" style={{ "--home-preview-aspect": previewAspect || "4 / 3" }}>
        {image ? <>
          <div className="home-image-source-preview">
            <img src={assetUrl(image, 768)} loading="lazy" decoding="async" alt="完整图片预览" />
            <span>完整原图</span>
          </div>
          {onPosition ? <div className="home-image-crop-row">
            <div className="home-image-preview-status"><span>裁剪预览</span><strong>{previewPosition}</strong></div>
            <div className="home-image-crop-preview" aria-hidden="true"><img src={assetUrl(image, 768)} loading="lazy" decoding="async" alt="" style={{ objectPosition: previewPosition }} /></div>
          </div> : null}
        </> : placeholder ?? <ImageIcon />}
      </div>
      <FieldGroup>
        <Field className="home-control">
          <FieldLabel htmlFor={`${prefix}-image`}>图片地址</FieldLabel>
          <Input id={`${prefix}-image`} value={image ?? ""} onChange={(event) => onImage(event.target.value)} />
          <FieldDescription>支持 /images/... 或完整 https:// 地址</FieldDescription>
        </Field>
        {onPosition ? <div className="home-focal-controls">
          <Field className="home-control">
            <FieldLabel htmlFor={`${prefix}-position-x`}>水平焦点（%）</FieldLabel>
            <Input id={`${prefix}-position-x`} type="number" min="0" max="100" step="1" value={focalPosition.x} onChange={(event) => updateFocalPosition("x", event.target.value)} />
          </Field>
          <Field className="home-control">
            <FieldLabel htmlFor={`${prefix}-position-y`}>垂直焦点（%）</FieldLabel>
            <Input id={`${prefix}-position-y`} type="number" min="0" max="100" step="1" value={focalPosition.y} onChange={(event) => updateFocalPosition("y", event.target.value)} />
          </Field>
          <FieldDescription>0% 对应左/上，100% 对应右/下；预览会实时更新。</FieldDescription>
        </div> : null}
        <Field className="home-control home-image-upload-control">
          <input ref={inputRef} id={`${prefix}-upload`} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" hidden onChange={handleUpload} />
          <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
            {uploading ? <LoaderCircle className="home-upload-spinner" /> : <Upload />}
            {uploading ? "上传中..." : "上传并替换"}
          </Button>
          <FieldDescription className={uploadError ? "home-image-upload-error" : undefined} aria-live="polite">
            {uploadStatus || "JPG、PNG、WebP、GIF 或 AVIF，最大 6 MB"}
          </FieldDescription>
        </Field>
      </FieldGroup>
    </div>
  );
}
