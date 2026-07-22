import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  KeyRound,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { ImageControls } from "@/components/ImageControls.jsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

const clone = (value) => structuredClone(value);
const uid = () => `payment-channel-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const money = (value) => `¥${Number(value || 0).toLocaleString("zh-CN", { maximumFractionDigits: 2 })}`;

const providerOptions = [
  ["manual", "人工收款"],
  ["official", "官方支付"],
  ["epay", "易支付"],
  ["bepusdt", "BEPUSDT"],
  ["epusdt", "EPUSDT"],
  ["okpay", "OKPay"],
  ["tokenpay", "TokenPay"],
];

const allChannelOptions = [
  ["wechat", "微信支付"], ["alipay", "支付宝"], ["qqpay", "QQ 钱包"], ["paypal", "PayPal"], ["stripe", "Stripe"],
  ["bank", "对公转账"], ["usdt", "USDT"], ["usdt-trc20", "USDT-TRC20"], ["usdc-trc20", "USDC-TRC20"], ["trx", "TRX"],
];
const interactionOptions = [["qr", "二维码"], ["redirect", "跳转"], ["wap", "手机网页"], ["page", "电脑网页"]];
const providerLabels = new Map(providerOptions);
const channelLabels = new Map(allChannelOptions);
const interactionLabels = new Map(interactionOptions);

const channelOptionsFor = (provider) => {
  if (provider === "manual") return [["bank", "对公转账"]];
  if (provider === "epay") return [["wechat", "微信支付"], ["alipay", "支付宝"], ["qqpay", "QQ 钱包"]];
  if (provider === "official") return [["paypal", "PayPal"], ["stripe", "Stripe"], ["alipay", "支付宝"], ["wechat", "微信支付"]];
  if (provider === "bepusdt" || provider === "epusdt") return [["usdt-trc20", "USDT-TRC20"], ["usdc-trc20", "USDC-TRC20"], ["trx", "TRX"]];
  if (provider === "okpay") return [["usdt", "USDT"], ["trx", "TRX"]];
  return [["usdt", "USDT"]];
};

const interactionOptionsFor = (provider, channel) => {
  if (["bepusdt", "epusdt"].includes(provider)) return [["redirect", "跳转"]];
  if (provider === "official" && ["paypal", "stripe"].includes(channel)) return [["redirect", "跳转"]];
  if (provider === "official" && channel === "alipay") return [["qr", "二维码"], ["wap", "手机网页"], ["page", "电脑网页"]];
  if (provider === "manual") return [["page", "站内页面"]];
  return [["qr", "二维码"], ["redirect", "跳转"]];
};

const field = (key, label, group = "publicConfig", options = {}) => ({ key, label, group, ...options });
const selectField = (key, label, options, group = "publicConfig", settings = {}) => field(key, label, group, { type: "select", options, ...settings });

const configSchemas = {
  manual: {
    title: "人工收款配置",
    hint: "用户提交订单后在站内展示付款说明，由管理员线下核对到账。",
    fields: [field("instructions", "付款说明", "publicConfig", { type: "textarea", span: 2 })],
  },
  epay: {
    title: "易支付配置",
    hint: "v1 使用商户密钥 MD5 签名；v2 使用商户私钥和平台公钥。回调地址应指向 payment-webhook。",
    fields: [
      selectField("epay_version", "接口版本", [["v1", "v1"], ["v2", "v2"]], "publicConfig", { defaultValue: "v2" }),
      field("gateway_url", "网关地址", "publicConfig", { placeholder: "https://pay.example.com" }),
      field("merchant_id", "商户 ID"),
      field("merchant_key", "商户密钥", "secretConfig", { secret: true, visible: (draft) => (draft.publicConfig.epay_version || "v2") === "v1" }),
      field("private_key", "商户私钥", "secretConfig", { type: "textarea", secret: true, span: 2, visible: (draft) => (draft.publicConfig.epay_version || "v2") === "v2" }),
      field("platform_public_key", "平台公钥", "publicConfig", { type: "textarea", span: 2, visible: (draft) => (draft.publicConfig.epay_version || "v2") === "v2" }),
      field("notify_url", "异步回调地址"), field("return_url", "同步返回地址"),
      field("target_currency", "目标币种", "publicConfig", { placeholder: "USD / CNY" }), field("exchange_rate", "汇率", "publicConfig", { type: "number" }),
    ],
  },
  "official:paypal": {
    title: "PayPal 配置",
    hint: "生产环境 Base URL 使用 https://api-m.paypal.com；沙箱使用 https://api-m.sandbox.paypal.com。",
    fields: [
      field("client_id", "Client ID"), field("client_secret", "Client Secret", "secretConfig", { secret: true }),
      field("base_url", "API Base URL", "publicConfig", { defaultValue: "https://api-m.sandbox.paypal.com" }), field("webhook_id", "Webhook ID", "secretConfig", { secret: true }),
      field("return_url", "成功返回地址"), field("cancel_url", "取消返回地址"),
      field("brand_name", "品牌名称"), field("locale", "语言地区", "publicConfig", { placeholder: "zh-CN" }),
      field("target_currency", "目标币种"), field("exchange_rate", "汇率", "publicConfig", { type: "number" }),
    ],
  },
  "official:stripe": {
    title: "Stripe 配置",
    hint: "Webhook Secret 用于验签；支付方式可填写 card，多个类型用英文逗号分隔。",
    fields: [
      field("publishable_key", "Publishable Key"), field("secret_key", "Secret Key", "secretConfig", { secret: true }),
      field("webhook_secret", "Webhook Secret", "secretConfig", { secret: true }), field("api_base_url", "API Base URL", "publicConfig", { defaultValue: "https://api.stripe.com" }),
      field("success_url", "成功返回地址"), field("cancel_url", "取消返回地址"),
      field("payment_method_types", "支付方式", "publicConfig", { defaultValue: "card" }), field("target_currency", "目标币种"),
      field("exchange_rate", "汇率", "publicConfig", { type: "number" }),
    ],
  },
  "official:alipay": {
    title: "支付宝官方配置",
    hint: "支持普通公钥和证书模式，签名类型默认 RSA2。",
    fields: [
      field("app_id", "应用 App ID"), selectField("sign_type", "签名类型", [["RSA2", "RSA2"], ["RSA", "RSA"]], "publicConfig", { defaultValue: "RSA2" }),
      field("private_key", "应用私钥", "secretConfig", { type: "textarea", secret: true, span: 2 }), field("alipay_public_key", "支付宝公钥", "publicConfig", { type: "textarea", span: 2 }),
      field("gateway_url", "网关地址", "publicConfig", { defaultValue: "https://openapi.alipay.com/gateway.do" }), field("notify_url", "异步回调地址"),
      field("return_url", "同步返回地址"), field("app_cert_sn", "应用证书序列号"), field("alipay_root_cert_sn", "支付宝根证书序列号", "publicConfig", { span: 2 }),
      field("target_currency", "目标币种"), field("exchange_rate", "汇率", "publicConfig", { type: "number" }),
    ],
  },
  "official:wechat": {
    title: "微信支付官方配置",
    hint: "商户私钥、API v3 Key 只保存到私有配置；H5 支付可额外填写跳转域名信息。",
    fields: [
      field("appid", "App ID"), field("mchid", "商户号"), field("merchant_serial_no", "商户证书序列号"), field("api_v3_key", "API v3 Key", "secretConfig", { secret: true }),
      field("merchant_private_key", "商户私钥", "secretConfig", { type: "textarea", secret: true, span: 2 }), field("notify_url", "回调地址"), field("h5_redirect_url", "H5 跳转地址"),
      selectField("h5_type", "H5 场景类型", [["WAP", "WAP"], ["IOS", "iOS"], ["ANDROID", "Android"]], "publicConfig", { defaultValue: "WAP" }), field("h5_wap_url", "H5 站点地址"),
      field("h5_wap_name", "H5 站点名称"), field("target_currency", "目标币种"), field("exchange_rate", "汇率", "publicConfig", { type: "number" }),
    ],
  },
  bepusdt: {
    title: "BEPUSDT 配置",
    hint: "BEPUSDT 渠道固定使用链上跳转模式。",
    fields: [
      field("gateway_url", "网关地址", "publicConfig", { span: 2 }), field("auth_token", "认证 Token", "secretConfig", { secret: true, span: 2 }),
      field("trade_type", "交易类型", "publicConfig", { defaultValue: "usdt.trc20" }), field("fiat", "法币", "publicConfig", { defaultValue: "CNY" }),
      field("notify_url", "回调地址"), field("return_url", "返回地址"),
    ],
  },
  epusdt: {
    title: "EPUSDT 配置",
    hint: "填写 EPUSDT 服务地址、商户 PID 与密钥，并确认 Token、网络和结算币种。",
    fields: [
      field("gateway_url", "网关地址", "publicConfig", { span: 2 }), field("pid", "商户 PID"), field("secret_key", "Secret Key", "secretConfig", { secret: true }),
      field("token", "Token", "publicConfig", { defaultValue: "usdt" }), field("network", "网络", "publicConfig", { defaultValue: "tron" }), field("currency", "结算币种", "publicConfig", { defaultValue: "cny" }),
      field("notify_url", "回调地址"), field("return_url", "返回地址"),
    ],
  },
  tokenpay: {
    title: "TokenPay 配置",
    hint: "回调密钥只保存在私有配置中，币种由 TokenPay 服务端支持情况决定。",
    fields: [
      field("gateway_url", "网关地址", "publicConfig", { span: 2 }), field("notify_secret", "回调密钥", "secretConfig", { secret: true, span: 2 }),
      field("currency", "数字币种", "publicConfig", { defaultValue: "USDT" }), field("base_currency", "基础法币", "publicConfig", { defaultValue: "CNY" }),
      field("notify_url", "回调地址"), field("redirect_url", "返回地址"),
    ],
  },
  okpay: {
    title: "OKPay 配置",
    hint: "请从 OKPay 商户后台取得 Merchant ID 和 Merchant Token。",
    fields: [
      field("gateway_url", "网关地址", "publicConfig", { defaultValue: "https://api.okaypay.me/shop", span: 2 }),
      field("merchant_id", "Merchant ID"), field("merchant_token", "Merchant Token", "secretConfig", { secret: true }), field("exchange_rate", "汇率", "publicConfig", { type: "number", defaultValue: "1" }),
      field("callback_url", "回调地址"), field("return_url", "返回地址"), field("display_name", "显示名称", "publicConfig", { span: 2 }),
    ],
  },
};

const schemaFor = (draft) => draft.providerType === "official" ? configSchemas[`official:${draft.channelType}`] : configSchemas[draft.providerType];

function createChannel(order = 10) {
  return {
    id: uid(), name: "", icon: "", providerType: "epay", channelType: "alipay", interactionMode: "qr",
    feeRate: "0", fixedFee: "0", minAmount: "0", maxAmount: "0", hideAmountOutRange: false,
    paymentTypes: ["order"], paymentRoles: ["member"], memberLevels: [], isActive: true, sortOrder: String(order),
    publicConfig: { epay_version: "v2" }, secretConfig: {}, secretConfigured: false,
  };
}

function LabeledSelect({ id, label, value, options, onChange, description }) {
  return <Field className="home-control"><FieldLabel htmlFor={id}>{label}</FieldLabel><Select value={value} onValueChange={onChange}><SelectTrigger id={id}><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{options.map(([optionValue, optionLabel]) => <SelectItem key={optionValue} value={optionValue}>{optionLabel}</SelectItem>)}</SelectGroup></SelectContent></Select>{description ? <FieldDescription>{description}</FieldDescription> : null}</Field>;
}

function LabeledInput({ id, label, value, onChange, type = "text", min, max, step, placeholder, textarea = false, description, readOnly = false }) {
  const Control = textarea ? Textarea : Input;
  return <Field className="home-control"><FieldLabel htmlFor={id}>{label}</FieldLabel><Control id={id} type={textarea ? undefined : type} min={min} max={max} step={step} placeholder={placeholder} value={value ?? ""} readOnly={readOnly} onChange={(event) => onChange(event.target.value)} />{description ? <FieldDescription>{description}</FieldDescription> : null}</Field>;
}

function ToggleOption({ id, checked, label, onChange }) {
  return <label className="payment-checkbox-option" htmlFor={id}><Checkbox id={id} checked={checked} onCheckedChange={(value) => onChange(value === true)} /><span>{label}</span></label>;
}

function PaymentDeleteButton({ channel, onDelete }) {
  return <AlertDialog><AlertDialogTrigger asChild><Button size="xs" variant="destructive"><Trash2 data-icon="inline-start" />删除</Button></AlertDialogTrigger><AlertDialogContent size="sm"><AlertDialogHeader><AlertDialogTitle>删除“{channel.name}”？</AlertDialogTitle><AlertDialogDescription>已被支付记录引用的渠道无法删除，可以改为停用。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={onDelete}>删除渠道</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>;
}

function ConfigField({ definition, draft, setConfig }) {
  if (definition.visible && !definition.visible(draft)) return null;
  const group = definition.group;
  const value = draft[group]?.[definition.key] ?? definition.defaultValue ?? "";
  const id = `payment-config-${draft.id}-${definition.key}`;
  if (definition.type === "select") return <div className={definition.span === 2 ? "payment-field-span" : undefined}><LabeledSelect id={id} label={definition.label} value={String(value)} options={definition.options} onChange={(next) => setConfig(group, definition.key, next)} /></div>;
  return <div className={definition.span === 2 ? "payment-field-span" : undefined}><LabeledInput id={id} label={definition.label} type={definition.secret ? "password" : definition.type === "number" ? "number" : "text"} textarea={definition.type === "textarea"} placeholder={definition.secret && draft.secretConfigured ? "已配置；留空保持原值" : definition.placeholder} value={String(value)} onChange={(next) => setConfig(group, definition.key, next)} /></div>;
}

function PaymentChannelDialog({ open, channel, order, onOpenChange, onSave }) {
  const [draft, setDraft] = useState(() => createChannel(order));
  const [error, setError] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [publicJson, setPublicJson] = useState("{}");
  const [secretJson, setSecretJson] = useState("{}");

  useEffect(() => {
    if (!open) return;
    const next = channel ? clone(channel) : createChannel(order);
    setDraft(next);
    setError("");
    setShowAdvanced(false);
    setPublicJson(JSON.stringify(next.publicConfig ?? {}, null, 2));
    setSecretJson(JSON.stringify(next.secretConfig ?? {}, null, 2));
  }, [channel, open, order]);

  useEffect(() => {
    if (!open) return;
    const channels = channelOptionsFor(draft.providerType);
    const channelType = channels.some(([value]) => value === draft.channelType) ? draft.channelType : channels[0][0];
    const modes = interactionOptionsFor(draft.providerType, channelType);
    const interactionMode = modes.some(([value]) => value === draft.interactionMode) ? draft.interactionMode : modes[0][0];
    if (channelType === draft.channelType && interactionMode === draft.interactionMode) return;
    setDraft((current) => ({ ...current, channelType, interactionMode }));
  }, [draft.channelType, draft.interactionMode, draft.providerType, open]);

  const set = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  const setConfig = (group, key, value) => setDraft((current) => ({ ...current, [group]: { ...(current[group] ?? {}), [key]: value } }));
  const setArrayValue = (key, value, checked) => setDraft((current) => {
    const values = new Set(current[key] ?? []);
    if (checked) values.add(value); else values.delete(value);
    return { ...current, [key]: [...values] };
  });

  const changeProvider = (providerType) => {
    const channels = channelOptionsFor(providerType);
    const channelType = channels[0][0];
    const interactionMode = interactionOptionsFor(providerType, channelType)[0][0];
    setDraft((current) => ({ ...current, providerType, channelType, interactionMode }));
  };

  const changeChannel = (channelType) => {
    const modes = interactionOptionsFor(draft.providerType, channelType);
    setDraft((current) => ({ ...current, channelType, interactionMode: modes.some(([value]) => value === current.interactionMode) ? current.interactionMode : modes[0][0] }));
  };

  const toggleAdvanced = () => {
    if (!showAdvanced) {
      setPublicJson(JSON.stringify(draft.publicConfig ?? {}, null, 2));
      setSecretJson(JSON.stringify(draft.secretConfig ?? {}, null, 2));
    }
    setShowAdvanced((value) => !value);
  };

  const submit = (event) => {
    event.preventDefault();
    setError("");
    let next = clone(draft);
    if (!next.name.trim()) { setError("请输入渠道名称"); return; }
    if (Number(next.feeRate) < 0 || Number(next.feeRate) > 100) { setError("手续费率必须在 0–100% 之间"); return; }
    if (Number(next.maxAmount) > 0 && Number(next.maxAmount) < Number(next.minAmount)) { setError("最高金额不能低于最低金额"); return; }
    if (showAdvanced) {
      try {
        const parsedPublic = JSON.parse(publicJson || "{}");
        const parsedSecret = JSON.parse(secretJson || "{}");
        if (!parsedPublic || Array.isArray(parsedPublic) || typeof parsedPublic !== "object") throw new Error();
        if (!parsedSecret || Array.isArray(parsedSecret) || typeof parsedSecret !== "object") throw new Error();
        next.publicConfig = parsedPublic;
        next.secretConfig = parsedSecret;
      } catch {
        setError("高级配置必须是有效的 JSON 对象");
        return;
      }
    }
    const channels = channelOptionsFor(next.providerType);
    if (!channels.some(([value]) => value === next.channelType)) next.channelType = channels[0][0];
    const modes = interactionOptionsFor(next.providerType, next.channelType);
    if (!modes.some(([value]) => value === next.interactionMode)) next.interactionMode = modes[0][0];
    next.name = next.name.trim();
    next.memberLevels = (next.memberLevels ?? []).map(String).map((value) => value.trim()).filter(Boolean);
    next.secretConfigured = next.secretConfigured || Object.values(next.secretConfig ?? {}).some((value) => String(value ?? "").trim());
    onSave(next);
    onOpenChange(false);
  };

  const schema = schemaFor(draft) ?? configSchemas.manual;
  const channelOptions = channelOptionsFor(draft.providerType);
  const modeOptions = interactionOptionsFor(draft.providerType, draft.channelType);

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="payment-channel-dialog" onInteractOutside={(event) => event.preventDefault()}>
    <DialogHeader><DialogTitle>{channel ? "编辑支付渠道" : "新增支付渠道"}</DialogTitle><DialogDescription>配置渠道基础信息、金额范围、使用范围与支付凭据。</DialogDescription></DialogHeader>
    <ScrollArea className="payment-channel-dialog-scroll"><form id="payment-channel-form" className="payment-channel-form" onSubmit={submit}>
      <Card size="sm"><CardHeader><CardTitle>基础信息</CardTitle><CardDescription>渠道名称、类型、交互方式、排序与启用状态</CardDescription></CardHeader><CardContent className="payment-dialog-section"><FieldGroup className="payment-dialog-grid">
        <LabeledInput id={`payment-name-${draft.id}`} label="渠道名称" value={draft.name} placeholder="例如：支付宝扫码" onChange={(value) => set("name", value)} />
        <LabeledInput id={`payment-id-${draft.id}`} label="渠道 ID" value={draft.id} readOnly onChange={() => {}} description="创建后保持不变" />
        <LabeledSelect id={`payment-provider-${draft.id}`} label="提供方类型" value={draft.providerType} options={providerOptions} onChange={changeProvider} />
        <LabeledSelect id={`payment-channel-${draft.id}`} label="渠道类型" value={draft.channelType} options={channelOptions} onChange={changeChannel} />
        <LabeledSelect id={`payment-mode-${draft.id}`} label="交互方式" value={draft.interactionMode} options={modeOptions} onChange={(value) => set("interactionMode", value)} />
        <LabeledInput id={`payment-sort-${draft.id}`} label="显示顺序" type="number" value={draft.sortOrder} onChange={(value) => set("sortOrder", value)} />
      </FieldGroup><ImageControls prefix={`payment-icon-${draft.id}`} image={draft.icon} onImage={(value) => set("icon", value)} variant="logo" /><div className="payment-switch-row"><div><strong>启用该渠道</strong><span>停用后收银台不再展示或创建新支付单</span></div><Switch checked={draft.isActive} onCheckedChange={(value) => set("isActive", value)} /></div></CardContent></Card>

      <Card size="sm"><CardHeader><CardTitle>手续费与金额限制</CardTitle><CardDescription>手续费 = 订单金额 × 费率 + 固定手续费</CardDescription></CardHeader><CardContent className="payment-dialog-section"><FieldGroup className="payment-dialog-grid payment-dialog-grid-four">
        <LabeledInput id={`payment-fee-${draft.id}`} label="手续费率（%）" type="number" min="0" max="100" step="0.01" value={draft.feeRate} onChange={(value) => set("feeRate", value)} />
        <LabeledInput id={`payment-fixed-${draft.id}`} label="固定手续费" type="number" min="0" step="0.01" value={draft.fixedFee} onChange={(value) => set("fixedFee", value)} />
        <LabeledInput id={`payment-min-${draft.id}`} label="最低金额" type="number" min="0" step="0.01" value={draft.minAmount} onChange={(value) => set("minAmount", value)} description="0 表示不限" />
        <LabeledInput id={`payment-max-${draft.id}`} label="最高金额" type="number" min="0" step="0.01" value={draft.maxAmount} onChange={(value) => set("maxAmount", value)} description="0 表示不限" />
      </FieldGroup><div className="payment-switch-row"><div><strong>金额不在范围时隐藏</strong><span>关闭时渠道仍展示，但创建支付时会返回金额限制错误</span></div><Switch checked={draft.hideAmountOutRange} onCheckedChange={(value) => set("hideAmountOutRange", value)} /></div></CardContent></Card>

      <Card size="sm"><CardHeader><CardTitle>使用范围</CardTitle><CardDescription>限制支付场景、付款角色和会员等级</CardDescription></CardHeader><CardContent className="payment-scope-sections">
        <Field><FieldLabel>支付场景</FieldLabel><div className="payment-checkbox-grid"><ToggleOption id={`type-order-${draft.id}`} label="商品订单" checked={draft.paymentTypes.includes("order")} onChange={(checked) => setArrayValue("paymentTypes", "order", checked)} /><ToggleOption id={`type-renewal-${draft.id}`} label="租用续费" checked={draft.paymentTypes.includes("renewal")} onChange={(checked) => setArrayValue("paymentTypes", "renewal", checked)} /><ToggleOption id={`type-wallet-${draft.id}`} label="钱包充值" checked={draft.paymentTypes.includes("wallet")} onChange={(checked) => setArrayValue("paymentTypes", "wallet", checked)} /></div></Field>
        <Field><FieldLabel>付款角色</FieldLabel><div className="payment-checkbox-grid"><ToggleOption id={`role-guest-${draft.id}`} label="游客" checked={draft.paymentRoles.includes("guest")} onChange={(checked) => setArrayValue("paymentRoles", "guest", checked)} /><ToggleOption id={`role-member-${draft.id}`} label="登录用户" checked={draft.paymentRoles.includes("member")} onChange={(checked) => setArrayValue("paymentRoles", "member", checked)} /></div></Field>
        <LabeledInput id={`member-levels-${draft.id}`} label="会员等级 ID" value={(draft.memberLevels ?? []).join(", ")} placeholder="例如：1, 2, enterprise" onChange={(value) => set("memberLevels", value.split(","))} description="留空表示不限制会员等级" />
      </CardContent></Card>

      <Card size="sm" className="payment-provider-card"><CardHeader><CardTitle>{schema.title}</CardTitle><CardDescription>{schema.hint}</CardDescription><CardAction><Badge variant={draft.secretConfigured ? "secondary" : "outline"}><KeyRound />{draft.secretConfigured ? "凭据已配置" : "凭据未配置"}</Badge></CardAction></CardHeader><CardContent><FieldGroup className="payment-dialog-grid">{schema.fields.map((definition) => <ConfigField key={`${definition.group}-${definition.key}`} definition={definition} draft={draft} setConfig={setConfig} />)}</FieldGroup></CardContent></Card>

      <Card size="sm"><CardHeader><CardTitle>高级配置</CardTitle><CardDescription>公开配置和敏感配置分别保存，敏感内容不会通过普通浏览器接口返回。</CardDescription><CardAction><Button type="button" variant="ghost" size="xs" onClick={toggleAdvanced}>{showAdvanced ? "收起 JSON" : "显示 JSON"}</Button></CardAction></CardHeader>{showAdvanced ? <CardContent className="payment-advanced-grid"><LabeledInput id={`public-json-${draft.id}`} label="公开配置 JSON" textarea value={publicJson} onChange={setPublicJson} /><LabeledInput id={`secret-json-${draft.id}`} label="敏感配置 JSON" textarea value={secretJson} onChange={setSecretJson} description="保存后普通浏览器接口不会返回该对象" /></CardContent> : null}</Card>

      <div className="commerce-security-note"><ShieldCheck /><span>渠道密钥不会写入 commerce_settings 或浏览器 localStorage。订单金额由服务端根据商品与费率重新计算，外部回调必须完成提供方验签。</span></div>
      {error ? <div className="payment-form-error" role="alert">{error}</div> : null}
    </form></ScrollArea>
    <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>取消</Button><Button type="submit" form="payment-channel-form">保存渠道</Button></DialogFooter>
  </DialogContent></Dialog>;
}

export function PaymentSettingsEditor({ settings, edit, onRefresh }) {
  const [providerFilter, setProviderFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const filtered = useMemo(() => settings.channels
    .filter((item) => providerFilter === "all" || item.providerType === providerFilter)
    .filter((item) => channelFilter === "all" || item.channelType === channelFilter)
    .toSorted((left, right) => Number(left.sortOrder) - Number(right.sortOrder)), [channelFilter, providerFilter, settings.channels]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => { setPage(1); }, [channelFilter, pageSize, providerFilter]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const editingChannel = editingId ? settings.channels.find((item) => item.id === editingId) ?? null : null;
  const openCreate = () => { setEditingId(null); setDialogOpen(true); };
  const openEdit = (id) => { setEditingId(id); setDialogOpen(true); };
  const saveChannel = (channel) => edit((next) => {
    const index = next.channels.findIndex((item) => item.id === channel.id);
    if (index >= 0) next.channels[index] = channel; else next.channels.push(channel);
  });

  return <div className="payment-admin-page">
    <Card size="sm" className="payment-filter-card"><CardContent className="payment-filter-content"><div className="payment-filter-controls"><LabeledSelect id="payment-provider-filter" label="提供方" value={providerFilter} options={[["all", "全部提供方"], ...providerOptions]} onChange={setProviderFilter} /><LabeledSelect id="payment-channel-filter" label="渠道类型" value={channelFilter} options={[["all", "全部渠道"], ...allChannelOptions]} onChange={setChannelFilter} /></div><div className="payment-filter-actions"><Button variant="outline" size="sm" onClick={onRefresh}><RefreshCw data-icon="inline-start" />刷新</Button><Button size="sm" onClick={openCreate}><Plus data-icon="inline-start" />新增支付渠道</Button></div></CardContent></Card>

    <Card size="sm" className="payment-list-card"><CardHeader><CardTitle>支付渠道</CardTitle><CardDescription>共 {filtered.length} 个渠道，敏感凭据仅显示配置状态。</CardDescription></CardHeader><CardContent className="commerce-table-content"><div className="commerce-table-scroll"><Table className="payment-channel-table payment-channel-table-complete"><TableHeader><TableRow><TableHead>ID</TableHead><TableHead>渠道名称</TableHead><TableHead>提供方 / 类型</TableHead><TableHead>交互方式</TableHead><TableHead>手续费</TableHead><TableHead>状态</TableHead><TableHead>排序</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader><TableBody>
      {visible.map((channel) => <TableRow key={channel.id}><TableCell><code className="payment-channel-id">{channel.id}</code></TableCell><TableCell><div className="payment-channel-name">{channel.icon ? <img src={channel.icon} alt="" /> : <span>{channel.name.slice(0, 1)}</span>}<div><strong>{channel.name}</strong><small>{channel.secretConfigured ? "凭据已配置" : "凭据未配置"}</small></div></div></TableCell><TableCell><div className="commerce-product-summary"><strong>{providerLabels.get(channel.providerType) || channel.providerType}</strong><small>{channel.providerType === "tokenpay" ? String(channel.publicConfig?.currency || "USDT").toUpperCase() : channel.providerType === "epusdt" ? channel.publicConfig?.trade_type || channelLabels.get(channel.channelType) : channelLabels.get(channel.channelType) || channel.channelType}</small></div></TableCell><TableCell>{interactionLabels.get(channel.interactionMode) || channel.interactionMode}</TableCell><TableCell>{Number(channel.feeRate).toFixed(2)}%{Number(channel.fixedFee) > 0 ? ` + ${money(channel.fixedFee)}` : ""}</TableCell><TableCell><Badge variant={channel.isActive ? "secondary" : "outline"}>{channel.isActive ? "启用" : "停用"}</Badge></TableCell><TableCell>{channel.sortOrder}</TableCell><TableCell className="text-right"><div className="commerce-row-actions"><Button size="xs" variant="outline" onClick={() => openEdit(channel.id)}><Pencil data-icon="inline-start" />编辑</Button><PaymentDeleteButton channel={channel} onDelete={() => edit((next) => { const index = next.channels.findIndex((item) => item.id === channel.id); if (index >= 0) next.channels.splice(index, 1); })} /></div></TableCell></TableRow>)}
      {visible.length === 0 ? <TableRow><TableCell colSpan={8} className="commerce-empty-row">没有符合筛选条件的支付渠道。</TableCell></TableRow> : null}
    </TableBody></Table></div></CardContent><CardFooter className="payment-pagination"><span>第 {page} / {totalPages} 页 · 共 {filtered.length} 项</span><div><LabeledSelect id="payment-page-size" label="每页" value={String(pageSize)} options={[["10", "10 条"], ["20", "20 条"], ["50", "50 条"], ["100", "100 条"]]} onChange={(value) => setPageSize(Number(value))} /><Button variant="outline" size="icon-sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} aria-label="上一页"><ChevronLeft /></Button><Button variant="outline" size="icon-sm" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)} aria-label="下一页"><ChevronRight /></Button></div></CardFooter></Card>

    <PaymentChannelDialog open={dialogOpen} channel={editingChannel} order={settings.channels.length * 10 + 10} onOpenChange={setDialogOpen} onSave={saveChannel} />
  </div>;
}
