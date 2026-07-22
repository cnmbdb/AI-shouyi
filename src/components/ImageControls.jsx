import { useRef, useState } from "react";
import { Image as ImageIcon, LoaderCircle, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { assetUrl } from "@/lib/assets.js";
import { uploadSiteImage } from "@/lib/platformData.js";

export function ImageControls({ prefix, image, position, onImage, onPosition, variant = "content", placeholder = null }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploadError, setUploadError] = useState(false);

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
    <div className={`home-image-fields${variant === "logo" ? " home-logo-image-fields" : ""}`}>
      <div className="home-image-preview">{image ? <img src={assetUrl(image, 768)} loading="lazy" decoding="async" alt="图片预览" /> : placeholder ?? <ImageIcon />}</div>
      <FieldGroup>
        <Field className="home-control">
          <FieldLabel htmlFor={`${prefix}-image`}>图片地址</FieldLabel>
          <Input id={`${prefix}-image`} value={image ?? ""} onChange={(event) => onImage(event.target.value)} />
          <FieldDescription>支持 /images/... 或完整 https:// 地址</FieldDescription>
        </Field>
        {onPosition ? <Field className="home-control">
          <FieldLabel htmlFor={`${prefix}-position`}>图片焦点</FieldLabel>
          <Input id={`${prefix}-position`} value={position ?? ""} placeholder="center center" onChange={(event) => onPosition(event.target.value)} />
        </Field> : null}
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
