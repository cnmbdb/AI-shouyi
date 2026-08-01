import { useRef, useState } from "react";
import { Check, Image as ImageIcon, Images, LoaderCircle, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { assetUrl } from "@/lib/assets.js";
import { parseFocalPosition } from "@/lib/focalPosition.js";
import { listSiteImages, uploadSiteImage } from "@/lib/platformData.js";

export function ImageControls({ prefix, image, position, onImage, onPosition, variant = "content", placeholder = null, label = "", previewAspect = "" }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploadError, setUploadError] = useState(false);
  const [chooserOpen, setChooserOpen] = useState(false);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState("");
  const [libraryItems, setLibraryItems] = useState([]);
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

  const openChooser = async () => {
    setChooserOpen(true);
    setLibraryLoading(true);
    setLibraryError("");
    try {
      const items = await listSiteImages(prefix);
      const currentIndex = items.findIndex((item) => item.url === image || item.path === image);
      if (image && currentIndex >= 0) {
        const [currentItem] = items.splice(currentIndex, 1);
        items.unshift({ ...currentItem, current: true });
      } else if (image) {
        items.unshift({ id: `current-${prefix}`, name: "当前已使用图片", path: image, url: assetUrl(image, 768), current: true });
      }
      setLibraryItems(items);
    } catch (error) {
      setLibraryItems([]);
      setLibraryError(error.message || "媒体库暂时无法读取");
    } finally {
      setLibraryLoading(false);
    }
  };

  const chooseLibraryImage = (item) => {
    onImage(item.url);
    setUploadError(false);
    setUploadStatus("已选择媒体库图片，请保存发布");
    setChooserOpen(false);
  };

  const chooseLocalUpload = () => {
    setChooserOpen(false);
    inputRef.current?.click();
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
          <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={openChooser}>
            {uploading ? <LoaderCircle className="home-upload-spinner" /> : <Upload />}
            {uploading ? "上传中..." : "选择图片"}
          </Button>
          <FieldDescription className={uploadError ? "home-image-upload-error" : undefined} aria-live="polite">
            {uploadStatus || "JPG、PNG、WebP、GIF 或 AVIF，最大 6 MB"}
          </FieldDescription>
        </Field>
      </FieldGroup>
      <Dialog open={chooserOpen} onOpenChange={setChooserOpen}>
        <DialogContent className="site-media-dialog">
          <DialogHeader>
            <DialogTitle>选择图片</DialogTitle>
            <DialogDescription>从项目媒体库选择，或从本地上传一张新图片。</DialogDescription>
          </DialogHeader>
          <div className="site-media-choice-grid">
            <button type="button" className="site-media-choice" onClick={chooseLocalUpload}>
              <Upload />
              <strong>本地上传</strong>
              <span>JPG、PNG、WebP、GIF 或 AVIF，最大 6 MB</span>
            </button>
            <button type="button" className="site-media-choice" onClick={openChooser}>
              <Images />
              <strong>项目媒体库</strong>
              <span>查看当前设置范围已上传的图片</span>
            </button>
          </div>
          <div className="site-media-library" aria-live="polite">
            {libraryLoading ? <div className="site-media-empty"><LoaderCircle className="home-upload-spinner" />正在读取媒体库...</div> : null}
            {!libraryLoading && libraryError ? <div className="site-media-empty site-media-error">{libraryError}</div> : null}
            {!libraryLoading && !libraryError && !libraryItems.length ? <div className="site-media-empty"><Images />当前范围还没有上传图片</div> : null}
            {!libraryLoading && !libraryError && libraryItems.length ? <div className="site-media-grid">
              {libraryItems.map((item) => { const selected = item.url === image || item.path === image; return <button type="button" className={`site-media-item${selected ? " selected" : ""}`} key={item.id} onClick={() => chooseLibraryImage(item)}>
                <img src={item.url} loading="lazy" alt={item.name} />
                <span>{item.current ? `当前使用 · ${item.name}` : item.bundled ? `项目内置 · ${item.name}` : `已上传 · ${item.name}`}</span>
                {selected ? <Check /> : null}
              </button>; })}
            </div> : null}
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setChooserOpen(false)}>取消</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
