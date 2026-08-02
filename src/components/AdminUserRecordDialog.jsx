import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const today = () => new Date().toISOString().slice(0, 10);
const dateValue = (value) => value ? new Date(value).toISOString().slice(0, 10) : "";

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
  if (kind === "device") return {
    deviceCode: record?.device_code ?? "",
    name: record?.name ?? "",
    compute: record?.compute ?? "",
    status: record?.status ?? "运行中",
    dailyYield: String(record?.daily_yield ?? 0),
    expiresAt: dateValue(record?.expires_at),
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
  const title = `${isEditing ? "调整" : "新增"}${titleByKind[kind] ?? "记录"}`;
  const selectedProduct = useMemo(() => detail?.catalogProducts?.find((item) => item.id === form.productId), [detail?.catalogProducts, form.productId]);
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
    return { ...current, [key]: value };
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
          <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>保存后立即更新用户业务数据，并记录管理员、变更前后内容和调整原因。</DialogDescription></DialogHeader>

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

            {kind === "device" ? <>
              <div className="admin-record-grid"><FormField label="设备编号"><Input value={form.deviceCode} onChange={(event) => update("deviceCode", event.target.value)} required /></FormField><FormField label="设备名称"><Input value={form.name} onChange={(event) => update("name", event.target.value)} required /></FormField></div>
              <div className="admin-record-grid"><FormField label="算力规格"><Input value={form.compute} onChange={(event) => update("compute", event.target.value)} required /></FormField><FormField label="运行状态"><Input value={form.status} onChange={(event) => update("status", event.target.value)} required /></FormField></div>
              <div className="admin-record-grid"><FormField label="日跑算收益"><Input type="number" min="0" step="0.01" value={form.dailyYield} onChange={(event) => update("dailyYield", event.target.value)} required /></FormField><FormField label="到期日"><Input type="date" value={form.expiresAt} onChange={(event) => update("expiresAt", event.target.value)} /></FormField></div>
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
