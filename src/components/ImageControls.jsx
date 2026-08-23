import { useRef, useState } from "react";
import { Check, Image as ImageIcon, Images, LoaderCircle, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { assetUrl } from "@/lib/assets.js";
import { parseFocalPosition } from "@/lib/focalPosition.js";
import { listSiteImages, uploadSiteImage } from "@/lib/platformData.js";

const mediaIdentity = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw, window.location.origin);
    const path = decodeURIComponent(url.pathname).replace(/\/+$/, "");
    const storageMarker = "/storage/v1/object/public/site-media/";
    const markerIndex = path.indexOf(storageMarker);
    return markerIndex >= 0 ? path.slice(markerIndex + storageMarker.length) : path;
  } catch {
    return decodeURIComponent(raw.split(/[?#]/)[0]).replace(/\/+$/, "");
  }
};

const isSameMedia = (item, value) => {
  const target = mediaIdentity(value);
  return Boolean(target) && [item?.path, item?.url].some((candidate) => mediaIdentity(candidate) === target);
};

const pinCurrentMedia = (items, currentImage, prefix) => {
  const normalizedItems = items.map((item) => ({ ...item, current: false }));
  if (!currentImage) return normalizedItems;
  const currentIndex = normalizedItems.findIndex((item) => isSameMedia(item, currentImage));
  if (currentIndex >= 0) {
    const [currentItem] = normalizedItems.splice(currentIndex, 1);
    return [{ ...currentItem, current: true }, ...normalizedItems];
  }
  return [{ id: `current-${prefix}`, name: "当前已使用图片", path: currentImage, url: assetUrl(currentImage, 768), current: true }, ...normalizedItems];
};

export function ImageControls({ prefix, image, fallbackImage = "", position, zoom = 100, onImage, onPosition, onZoom, variant = "content", placeholder = null, label = "", previewAspect = "" }) {
  const inputRef = useRef(null);
  const cropDraggingRef = useRef(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploadError, setUploadError] = useState(false);
  const [chooserOpen, setChooserOpen] = useState(false);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState("");
  const [libraryItems, setLibraryItems] = useState([]);
  const focalPosition = parseFocalPosition(position);
  const previewPosition = focalPosition.value;
  const displayImage = image || fallbackImage;
  const normalizedZoom = Math.max(100, Math.min(250, Number(zoom) || 100));

  const updateFocalPosition = (axis, value) => {
    if (!onPosition || value === "") return;
    const nextValue = Math.min(100, Math.max(0, Number(value) || 0));
    onPosition(axis === "x"
      ? `${nextValue}% ${focalPosition.y}%`
      : `${focalPosition.x}% ${nextValue}%`);
  };

  const updateCropFromPointer = (event) => {
    if (!onPosition) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100));
    onPosition(`${Math.round(x)}% ${Math.round(y)}%`);
  };

  const beginCropDrag = (event) => {
    cropDraggingRef.current = true;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    updateCropFromPointer(event);
  };

  const moveCropDrag = (event) => {
    if (cropDraggingRef.current) updateCropFromPointer(event);
  };

  const endCropDrag = () => {
    cropDraggingRef.current = false;
  };

  const moveCropWithKeyboard = (event) => {
    if (!onPosition || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const step = event.shiftKey ? 10 : 2;
    const x = event.key === "ArrowLeft" ? focalPosition.x - step : event.key === "ArrowRight" ? focalPosition.x + step : focalPosition.x;
    const y = event.key === "ArrowUp" ? focalPosition.y - step : event.key === "ArrowDown" ? focalPosition.y + step : focalPosition.y;
    onPosition(`${Math.min(100, Math.max(0, x))}% ${Math.min(100, Math.max(0, y))}%`);
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
      setLibraryItems((current) => pinCurrentMedia([
        { id: uploaded.path || uploaded.url, name: uploaded.path?.split("/").pop() || file.name, path: uploaded.path, url: uploaded.url },
        ...current.filter((item) => !isSameMedia(item, uploaded.url)),
      ], uploaded.url, prefix));
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
      const currentImage = image || fallbackImage;
      setLibraryItems(pinCurrentMedia(items, currentImage, prefix));
    } catch (error) {
      const currentImage = image || fallbackImage;
      setLibraryItems(pinCurrentMedia([], currentImage, prefix));
      setLibraryError(currentImage ? "已显示当前图片；其他已上传图片暂时无法同步" : (error.message || "媒体库暂时无法读取"));
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
        {displayImage ? <>
          <div className="home-image-source-preview">
            <img src={assetUrl(displayImage, 768)} loading="lazy" decoding="async" alt="完整图片预览" />
            <span>{!image && fallbackImage ? "沿用电脑端图片" : "完整原图"}</span>
          </div>
          {onPosition ? <div className="home-image-crop-row">
            <div className="home-image-preview-status"><span>拖动裁剪 · 缩放 {normalizedZoom}%</span><strong>{previewPosition}</strong></div>
            <button
              type="button"
              className="home-image-crop-preview"
              aria-label={`拖动设置裁剪焦点，当前 ${previewPosition}，缩放 ${normalizedZoom}%`}
              onPointerDown={beginCropDrag}
              onPointerMove={moveCropDrag}
              onPointerUp={endCropDrag}
              onPointerCancel={endCropDrag}
              onKeyDown={moveCropWithKeyboard}
            >
              <img src={assetUrl(displayImage, 768)} loading="lazy" decoding="async" alt="" style={{ objectPosition: previewPosition, transform: `scale(${normalizedZoom / 100})`, transformOrigin: previewPosition }} />
              <i className="home-image-crop-focus" style={{ left: `${focalPosition.x}%`, top: `${focalPosition.y}%` }} />
            </button>
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
        {onZoom ? <Field className="home-control home-crop-zoom-control">
          <FieldLabel htmlFor={`${prefix}-zoom`}>裁剪缩放（{normalizedZoom}%）</FieldLabel>
          <div>
            <Input id={`${prefix}-zoom`} type="range" min="100" max="250" step="1" value={normalizedZoom} onChange={(event) => onZoom(Number(event.target.value))} />
            <Input type="number" min="100" max="250" step="1" value={normalizedZoom} aria-label="裁剪缩放百分比" onChange={(event) => onZoom(Math.min(250, Math.max(100, Number(event.target.value) || 100)))} />
          </div>
          <FieldDescription>100% 为默认；放大后拖动预览选择保留区域。</FieldDescription>
        </Field> : null}
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
              <strong>同步媒体库</strong>
              <span>刷新全部已上传图片、当前使用图片和项目内置素材</span>
            </button>
          </div>
          <div className="site-media-library" aria-live="polite">
            {libraryLoading ? <div className="site-media-empty"><LoaderCircle className="home-upload-spinner" />正在读取媒体库...</div> : null}
            {!libraryLoading && libraryError && !libraryItems.length ? <div className="site-media-empty site-media-error">{libraryError}</div> : null}
            {!libraryLoading && libraryError && libraryItems.length ? <div className="site-media-sync-warning">{libraryError}</div> : null}
            {!libraryLoading && !libraryError && !libraryItems.length ? <div className="site-media-empty"><Images />媒体库暂时没有可用图片</div> : null}
            {!libraryLoading && libraryItems.length ? <div className="site-media-grid">
              {libraryItems.map((item) => { const selected = isSameMedia(item, displayImage); return <button type="button" className={`site-media-item${selected ? " selected" : ""}`} key={item.id} onClick={() => chooseLibraryImage(item)}>
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
