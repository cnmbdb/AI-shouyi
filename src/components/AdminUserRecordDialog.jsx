import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const today = () => new Date().toISOString().slice(0, 10);
const dateValue = (value) => value ? new Date(value).toISOString().slice(0, 10) : "";
const catalogLevels = (product) => Array.isArray(product?.specs?.levels)
  ? product.specs.levels.filter((level) => Array.isArray(level?.options) && level.options.length)
  : Array.isArray(product?.specs)
    ? product.specs.filter((level) => Array.isArray(level?.options) && level.options.length)
    : [];
const catalogVariants = (product) => Array.isArray(product?.specs?.variants) ? product.specs.variants : [];
const firstSelections = (product) => Object.fromEntries(catalogLevels(product).map((level) => [level.id, level.options[0]?.id ?? ""]));
const selectedVariant = (product, selections = {}) => {
  const levels = catalogLevels(product);
  const variants = catalogVariants(product);
  return variants.find((variant) => levels.every((level) => String((variant.selections ?? variant.optionIds ?? {})[level.id] ?? "") === String(selections[level.id] ?? ""))) ?? variants[0] ?? null;
};

const defaultsFor = (kind, record, detail, adjustmentDirection) => {
  if (kind === "order") {
    const firstProduct = detail?.catalogProducts?.[0];
    const initialType = record?.order_type ?? "rental";
    const initialPrice = Number(record?.unit_price ?? (initialType === "buyout" ? firstProduct?.buyout_price : firstProduct?.rental_price) ?? 0);
    return {
    productId: record?.product_id ?? firstProduct?.id ?? "",
    orderType: record?.order_type ?? "rental",
    quantity: String(record?.quantity ?? 1),
    periodCount: String(record?.period_count ?? record?.period_months ?? 1),
    unitPrice: String(initialPrice),
    totalAmount: String(record?.total_amount ?? record?.amount ?? initialPrice),
    status: record?.status ?? "completed",
    serviceExpiresAt: dateValue(record?.service_expires_at),
    product: record?.product ?? "",
    legacy: Boolean(record?.legacy),
    reason: "",
  };
  }
  if (kind === "device") {
    if (!record) {
      const product = detail?.catalogProducts?.find((item) => item.enabled !== false && catalogVariants(item).length) ?? detail?.catalogProducts?.find((item) => item.enabled !== false);
      const specSelections = firstSelections(product);
      const variant = selectedVariant(product, specSelections);
      return {
        productId: product?.id ?? "",
        variantId: variant?.id ?? "",
        specSelections,
        quantity: "1",
        status: "运行中",
        reason: "",
      };
    }
    return {
      deviceCode: record.device_code ?? "",
      name: record.name ?? "",
      compute: record.compute ?? "",
      status: record.status ?? "运行中",
      dailyYield: String(record.daily_yield ?? 0),
      expiresAt: dateValue(record.expires_at),
      reason: "",
    };
  }
  if (kind === "renewal") return {
    periodCount: "30",
    totalAmount: String(record?.product_snapshot?.monthlyRentalPrice ?? 0),
    reason: "",
  };
  if (kind === "transaction") return {
    transactionType: record?.transaction_type ?? (adjustmentDirection === "decrease" ? "管理员扣减" : "管理员入账"),
    reference: record?.reference ?? `ADJ-${today().replaceAll("-", "")}`,
    amount: String(Math.abs(Number(record?.amount ?? 0))),
    direction: record ? (Number(record.amount) < 0 ? "decrease" : "increase") : adjustmentDirection,
    status: record?.status ?? "已入账",
    reason: "",
  };
  return {
    identityStatus: detail?.verification?.identity_status ?? "pending",
    fundsStatus: detail?.verification?.funds_status ?? "pending",
    identityNote: detail?.verification?.identity_note ?? "",
    fundsNote: detail?.verification?.funds_note ?? "",
    reason: "",
  };
};

const titleByKind = {
  order: "订单",
  device: "设备",
  renewal: "设备续费",
  transaction: "资金记录",
  verification: "认证状态",
};

function FormField({ label, hint, children }) {
  return <label className="admin-record-field"><span>{label}</span>{children}{hint ? <small>{hint}</small> : null}</label>;
}

export function AdminUserRecordDialog({ open, onOpenChange, kind, record, detail, adjustmentDirection = "increase", pending, onSubmit }) {
  const [form, setForm] = useState(() => defaultsFor(kind, record, detail, adjustmentDirection));
  useEffect(() => {
    if (open) setForm(defaultsFor(kind, record, detail, adjustmentDirection));
  }, [adjustmentDirection, detail, kind, open, record]);
  const isEditing = Boolean(record);
  const title = kind === "device" && !isEditing ? "从商城添加设备" : `${isEditing ? "调整" : "新增"}${titleByKind[kind] ?? "记录"}`;
  const selectedProduct = useMemo(() => detail?.catalogProducts?.find((item) => item.id === form.productId), [detail?.catalogProducts, form.productId]);
  const specificationLevels = useMemo(() => catalogLevels(selectedProduct), [selectedProduct]);
  const variant = useMemo(() => selectedVariant(selectedProduct, form.specSelections), [form.specSelections, selectedProduct]);
  const update = (key, value) => setForm((current) => {
    if (kind === "order" && !record && key === "productId") {
      const product = detail?.catalogProducts?.find((item) => item.id === value);
      const unitPrice = Number(current.orderType === "buyout" ? product?.buyout_price : product?.rental_price) || 0;
      return { ...current, productId: value, unitPrice: String(unitPrice), totalAmount: String(unitPrice * Math.max(1, Number(current.quantity) || 1)) };
    }
    if (kind === "order" && !record && key === "orderType") {
      const product = detail?.catalogProducts?.find((item) => item.id === current.productId);
      const unitPrice = Number(value === "buyout" ? product?.buyout_price : product?.rental_price) || 0;
      return { ...current, orderType: value, unitPrice: String(unitPrice), totalAmount: String(unitPrice * Math.max(1, Number(current.quantity) || 1)) };
    }
    if (kind === "order" && !record && key === "quantity") {
      return { ...current, quantity: value, totalAmount: String(Number(current.unitPrice || 0) * Math.max(1, Number(value) || 1)) };
    }
    if (kind === "device" && !record && key === "productId") {
      const product = detail?.catalogProducts?.find((item) => item.id === value);
      const specSelections = firstSelections(product);
      const nextVariant = selectedVariant(product, specSelections);
      return { ...current, productId: value, specSelections, variantId: nextVariant?.id ?? "", quantity: "1" };
    }
    return { ...current, [key]: value };
  });
  const updateSpecification = (levelId, optionId) => setForm((current) => {
    const specSelections = { ...(current.specSelections ?? {}), [levelId]: optionId };
    const nextVariant = selectedVariant(selectedProduct, specSelections);
    return { ...current, specSelections, variantId: nextVariant?.id ?? "", quantity: "1" };
  });

  const submit = (event) => {
    event.preventDefault();
    const payload = { ...form };
    if (kind === "transaction") payload.amount = (form.direction === "decrease" ? -1 : 1) * Math.abs(Number(form.amount));
    onSubmit(payload);
  };

  return (
    <Dialog open={open} onOpenChange={pending ? undefined : onOpenChange}>
      <DialogContent className="admin-record-dialog">
        <form onSubmit={submit}>
          <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{kind === "device" && !isEditing ? "选择真实商城商品与 SKU。保存后会同步扣减库存，生成注明“管理员添加”的已完成订单和关联设备。" : "保存后立即更新用户业务数据，并记录管理员、变更前后内容和调整原因。"}</DialogDescription></DialogHeader>

          <div className="admin-record-form">
            {kind === "order" && form.legacy ? <>
              <FormField label="产品名称"><Input value={form.product} onChange={(event) => update("product", event.target.value)} required /></FormField>
              <div className="admin-record-grid"><FormField label="租用月数"><Input type="number" min="1" max="120" value={form.periodCount} onChange={(event) => update("periodCount", event.target.value)} required /></FormField><FormField label="订单金额"><Input type="number" min="0" step="0.01" value={form.totalAmount} onChange={(event) => update("totalAmount", event.target.value)} required /></FormField></div>
              <FormField label="状态"><Input value={form.status} onChange={(event) => update("status", event.target.value)} required /></FormField>
            </> : null}

            {kind === "order" && !form.legacy ? <>
              {!isEditing ? <FormField label="关联商城商品" hint={selectedProduct ? `库存 ${selectedProduct.inventory} 台，SKU ${selectedProduct.sku}` : "只能选择商品列表中的真实商品"}><Select value={form.productId} onValueChange={(value) => update("productId", value)}><SelectTrigger><SelectValue placeholder="选择商品" /></SelectTrigger><SelectContent><SelectGroup>{(detail?.catalogProducts ?? []).map((product) => <SelectItem key={product.id} value={product.id}>{product.name} / {product.sku}</SelectItem>)}</SelectGroup></SelectContent></Select></FormField> : null}
              <div className="admin-record-grid">
                {!isEditing ? <FormField label="计费方式"><Select value={form.orderType} onValueChange={(value) => update("orderType", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="rental">租用</SelectItem><SelectItem value="buyout">买断</SelectItem></SelectGroup></SelectContent></Select></FormField> : null}
                {!isEditing ? <FormField label="数量"><Input type="number" min="1" max="100" value={form.quantity} onChange={(event) => update("quantity", event.target.value)} required /></FormField> : null}
                {form.orderType !== "buyout" ? <FormField label="周期数量"><Input type="number" min="1" max="120" value={form.periodCount} onChange={(event) => update("periodCount", event.target.value)} required /></FormField> : null}
                {!isEditing ? <FormField label="单价"><Input type="number" min="0" step="0.01" value={form.unitPrice} onChange={(event) => update("unitPrice", event.target.value)} required /></FormField> : null}
                <FormField label="订单总额"><Input type="number" min="0" step="0.01" value={form.totalAmount} onChange={(event) => update("totalAmount", event.target.value)} required /></FormField>
                <FormField label="订单状态"><Select value={form.status} onValueChange={(value) => update("status", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="pending_payment">待支付</SelectItem><SelectItem value="paid">已支付</SelectItem><SelectItem value="processing">处理中</SelectItem><SelectItem value="completed">已完成</SelectItem><SelectItem value="expired">已过期</SelectItem><SelectItem value="cancelled">已取消</SelectItem><SelectItem value="refunded">已退款</SelectItem></SelectGroup></SelectContent></Select></FormField>
                <FormField label="服务到期日"><Input type="date" value={form.serviceExpiresAt} onChange={(event) => update("serviceExpiresAt", event.target.value)} /></FormField>
              </div>
            </> : null}

            {kind === "device" && !isEditing ? <>
              <FormField label="商城商品" hint="只显示当前已上架商品，设备型号与图片沿用商品资料"><Select value={form.productId} onValueChange={(value) => update("productId", value)}><SelectTrigger><SelectValue placeholder="选择已上架商品" /></SelectTrigger><SelectContent><SelectGroup>{(detail?.catalogProducts ?? []).filter((product) => product.enabled !== false).map((product) => <SelectItem key={product.id} value={product.id}>{product.name} / {product.sku}</SelectItem>)}</SelectGroup></SelectContent></Select></FormField>
              <div className="admin-catalog-spec-grid">{specificationLevels.map((level) => <FormField key={level.id} label={level.name}><Select value={form.specSelections?.[level.id] ?? ""} onValueChange={(value) => updateSpecification(level.id, value)}><SelectTrigger><SelectValue placeholder={`选择${level.name}`} /></SelectTrigger><SelectContent><SelectGroup>{level.options.map((option) => <SelectItem key={option.id} value={option.id}>{option.value}{level.unit}</SelectItem>)}</SelectGroup></SelectContent></Select></FormField>)}</div>
              <div className="admin-catalog-variant-summary">
                <div><span>所选 SKU</span><strong>{variant?.id ?? "未匹配"}</strong></div>
                <div><span>月租价格</span><strong>¥{Number(variant?.price ?? 0).toLocaleString("zh-CN")}</strong></div>
                <div><span>可用库存</span><strong>{Number(variant?.inventory ?? selectedProduct?.inventory ?? 0)} 台</strong></div>
                <div><span>订单来源</span><strong>管理员添加</strong></div>
              </div>
              <div className="admin-record-grid"><FormField label="添加数量" hint="将生成相同数量的独立设备"><Input type="number" min="1" max={Math.max(1, Number(variant?.inventory ?? selectedProduct?.inventory ?? 1))} value={form.quantity} onChange={(event) => update("quantity", event.target.value)} required /></FormField><FormField label="初始设备状态"><Select value={form.status} onValueChange={(value) => update("status", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="运行中">启用 / 运行中</SelectItem><SelectItem value="已停用">停用</SelectItem><SelectItem value="维护中">维护中</SelectItem><SelectItem value="待交付">待交付</SelectItem><SelectItem value="已到期">已到期</SelectItem></SelectGroup></SelectContent></Select></FormField></div>
            </> : null}

            {kind === "device" && isEditing ? <>
              <div className="admin-record-grid"><FormField label="设备编号"><Input value={form.deviceCode} onChange={(event) => update("deviceCode", event.target.value)} required /></FormField><FormField label="设备名称"><Input value={form.name} onChange={(event) => update("name", event.target.value)} required /></FormField></div>
              <div className="admin-record-grid"><FormField label="算力规格"><Input value={form.compute} onChange={(event) => update("compute", event.target.value)} required /></FormField><FormField label="设备状态"><Select value={form.status} onValueChange={(value) => update("status", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="运行中">启用 / 运行中</SelectItem><SelectItem value="已停用">停用</SelectItem><SelectItem value="维护中">维护中</SelectItem><SelectItem value="待交付">待交付</SelectItem><SelectItem value="已到期">已到期</SelectItem></SelectGroup></SelectContent></Select></FormField></div>
              <div className="admin-record-grid"><FormField label="日跑算收益"><Input type="number" min="0" step="0.01" value={form.dailyYield} onChange={(event) => update("dailyYield", event.target.value)} required /></FormField><FormField label="到期日"><Input type="date" value={form.expiresAt} onChange={(event) => update("expiresAt", event.target.value)} /></FormField></div>
            </> : null}

            {kind === "renewal" ? <>
              <div className="admin-renewal-summary"><strong>{record?.name}</strong><span>设备编号 {record?.device_code}</span><span>当前到期 {dateValue(record?.expires_at) || "未设置"}</span></div>
              <div className="admin-record-grid"><FormField label="续费天数"><Input type="number" min="1" max="3650" value={form.periodCount} onChange={(event) => update("periodCount", event.target.value)} required /></FormField><FormField label="续费订单金额"><Input type="number" min="0" step="0.01" value={form.totalAmount} onChange={(event) => update("totalAmount", event.target.value)} required /></FormField></div>
            </> : null}

            {kind === "transaction" ? <>
              <div className="admin-record-grid"><FormField label="资金方向"><Select value={form.direction} onValueChange={(value) => update("direction", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="increase">增加资金</SelectItem><SelectItem value="decrease">扣减资金</SelectItem></SelectGroup></SelectContent></Select></FormField><FormField label="金额"><Input type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => update("amount", event.target.value)} required /></FormField></div>
              <div className="admin-record-grid"><FormField label="业务类型"><Input value={form.transactionType} onChange={(event) => update("transactionType", event.target.value)} required /></FormField><FormField label="关联编号"><Input value={form.reference} onChange={(event) => update("reference", event.target.value)} required /></FormField></div>
              <FormField label="处理状态"><Input value={form.status} onChange={(event) => update("status", event.target.value)} required /></FormField>
            </> : null}

            {kind === "verification" ? <>
              <div className="admin-record-grid"><FormField label="身份认证"><Select value={form.identityStatus} onValueChange={(value) => update("identityStatus", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="pending">待审核</SelectItem><SelectItem value="verified">已通过</SelectItem><SelectItem value="rejected">已拒绝</SelectItem></SelectGroup></SelectContent></Select></FormField><FormField label="资金认证"><Select value={form.fundsStatus} onValueChange={(value) => update("fundsStatus", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="pending">待审核</SelectItem><SelectItem value="verified">已通过</SelectItem><SelectItem value="rejected">已拒绝</SelectItem></SelectGroup></SelectContent></Select></FormField></div>
              <FormField label="身份认证说明"><Textarea rows={3} value={form.identityNote} onChange={(event) => update("identityNote", event.target.value)} /></FormField>
              <FormField label="资金认证说明"><Textarea rows={3} value={form.fundsNote} onChange={(event) => update("fundsNote", event.target.value)} /></FormField>
            </> : null}

            <FormField label="调整原因" hint="必填，保存到审计日志中"><Textarea rows={3} value={form.reason} onChange={(event) => update("reason", event.target.value)} placeholder="说明本次新增或调整的业务原因" required minLength={2} maxLength={500} /></FormField>
          </div>

          <DialogFooter><Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>取消</Button><Button type="submit" disabled={pending}>{pending ? "保存中..." : "确认保存"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
