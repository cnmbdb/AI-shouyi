import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  CreditCard,
  PackagePlus,
  Plus,
  RotateCcw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { commerceSettingNormalizers, defaultCommerceSettings } from "../data/commerceSettings.js";
import { getCommerceSettings, saveCommerceSetting } from "../lib/platformData.js";

const clone = (value) => structuredClone(value);
const uid = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const pageMeta = {
  products: { title: "商品列表", success: "商品列表已保存" },
  payment: { title: "支付设置", success: "支付设置已保存" },
};

function TextControl({ id, label, value, onChange, description, type = "text", textarea = false, min }) {
  const Control = textarea ? Textarea : Input;
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Control id={id} type={textarea ? undefined : type} min={min} value={value ?? ""} onChange={(event) => onChange(event.target.value)} />
      {description ? <FieldDescription>{description}</FieldDescription> : null}
    </Field>
  );
}

function InlineControl({ id, label, value, onChange, type = "text", min }) {
  return (
    <Field className="commerce-inline-control">
      <FieldLabel className="sr-only" htmlFor={id}>{label}</FieldLabel>
      <Input id={id} aria-label={label} type={type} min={min} value={value ?? ""} onChange={(event) => onChange(event.target.value)} />
    </Field>
  );
}

function ToggleControl({ id, label, description, checked, onChange }) {
  return (
    <Field className="toggle-field" orientation="horizontal">
      <div><FieldLabel htmlFor={id}>{label}</FieldLabel>{description ? <FieldDescription>{description}</FieldDescription> : null}</div>
      <Switch id={id} size="sm" checked={checked} onCheckedChange={onChange} />
    </Field>
  );
}

function SectionHeading({ title, description, count }) {
  return <div className="home-section-heading"><div><strong>{title}</strong><span>{description}</span></div>{Number.isInteger(count) ? <Badge variant="outline">{count} 项</Badge> : null}</div>;
}

function DeleteButton({ label, onConfirm }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild><Button variant="ghost" size="icon-xs" aria-label={`删除${label}`}><Trash2 /></Button></AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <AlertDialogHeader><AlertDialogTitle>删除“{label}”？</AlertDialogTitle><AlertDialogDescription>保存后该商品将从商城商品列表中移除。</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={onConfirm}>删除</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function PublishBar({ dirty, pending, onReset, onPublish }) {
  return (
    <Card className="home-settings-publish">
      <CardFooter>
        <div><strong>{dirty ? "有尚未保存的修改" : "当前配置已同步"}</strong><span>商城配置仅允许管理员读取和更新。</span></div>
        <div><Button variant="outline" size="sm" disabled={!dirty || pending} onClick={onReset}><RotateCcw />恢复默认</Button><Button size="sm" disabled={!dirty || pending} onClick={onPublish}><CheckCircle2 />{pending ? "保存中..." : "保存设置"}</Button></div>
      </CardFooter>
    </Card>
  );
}

export function CommerceSettingsPage({ section, onNotice }) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["commerce-settings"], queryFn: getCommerceSettings, staleTime: 30_000, refetchOnWindowFocus: false });
  const normalize = commerceSettingNormalizers[section];
  const [settings, setSettings] = useState(() => clone(defaultCommerceSettings[section]));
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!query.data?.settings || !normalize) return;
    setSettings(normalize(query.data.settings[section]));
    setDirty(false);
  }, [normalize, query.data, section]);

  const edit = (producer) => {
    setSettings((current) => {
      const next = clone(current);
      producer(next);
      return next;
    });
    setDirty(true);
  };

  const mutation = useMutation({
    mutationFn: (value) => saveCommerceSetting(section, value),
    onSuccess: (_, value) => {
      queryClient.setQueryData(["commerce-settings"], (current) => ({ ...current, settings: { ...(current?.settings ?? {}), [section]: value } }));
      queryClient.invalidateQueries({ queryKey: ["commerce-settings"] });
      setDirty(false);
      onNotice(pageMeta[section].success);
    },
    onError: (error) => onNotice(error.message),
  });

  if (query.isLoading) return <Card className="home-settings-loading"><CardContent>正在读取商城配置...</CardContent></Card>;
  if (query.isError) return <Card className="home-settings-loading"><CardContent>读取失败：{query.error.message}</CardContent></Card>;

  return (
    <div className="home-settings-page commerce-settings-page">
      {section === "products" ? <ProductListEditor settings={settings} edit={edit} /> : null}
      {section === "payment" ? <PaymentSettingsEditor settings={settings} edit={edit} /> : null}
      <PublishBar dirty={dirty} pending={mutation.isPending} onReset={() => { setSettings(clone(defaultCommerceSettings[section])); setDirty(true); }} onPublish={() => mutation.mutate(settings)} />
    </div>
  );
}

function ProductListEditor({ settings, edit }) {
  const addProduct = () => edit((next) => {
    next.items.push({
      id: uid("commerce-product"),
      sku: `GPU-${String(next.items.length + 1).padStart(3, "0")}`,
      name: "新算力商品",
      gpuModel: "NVIDIA GPU",
      vram: "24 GB",
      hostingTerm: "12 个月",
      price: "0",
      inventory: "0",
      enabled: false,
    });
  });

  return (
    <Accordion className="home-settings-accordion" type="multiple" defaultValue={["catalog"]}>
      <AccordionItem value="catalog">
        <AccordionTrigger><SectionHeading title="商品目录" description="管理算力商品、售价、库存与上架状态" count={settings.items.length} /></AccordionTrigger>
        <AccordionContent>
          <Card size="sm" className="commerce-table-card">
            <CardHeader>
              <CardTitle>全部商品</CardTitle>
              <CardDescription>修改后点击底部“保存设置”统一生效。</CardDescription>
              <CardAction><Button variant="outline" size="sm" onClick={addProduct}><PackagePlus />添加商品</Button></CardAction>
            </CardHeader>
            <CardContent className="commerce-table-content">
              <FieldGroup>
                <Table className="commerce-product-table">
                  <TableHeader><TableRow><TableHead>商品 / SKU</TableHead><TableHead>GPU / 显存</TableHead><TableHead>托管周期</TableHead><TableHead>售价（元）</TableHead><TableHead>库存</TableHead><TableHead>状态</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {settings.items.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell><div className="commerce-stacked-fields"><InlineControl id={`product-name-${item.id}`} label="商品名称" value={item.name} onChange={(value) => edit((next) => { next.items[index].name = value; })} /><InlineControl id={`product-sku-${item.id}`} label="SKU" value={item.sku} onChange={(value) => edit((next) => { next.items[index].sku = value; })} /></div></TableCell>
                        <TableCell><div className="commerce-stacked-fields"><InlineControl id={`product-gpu-${item.id}`} label="GPU 型号" value={item.gpuModel} onChange={(value) => edit((next) => { next.items[index].gpuModel = value; })} /><InlineControl id={`product-vram-${item.id}`} label="显存" value={item.vram} onChange={(value) => edit((next) => { next.items[index].vram = value; })} /></div></TableCell>
                        <TableCell><InlineControl id={`product-term-${item.id}`} label="托管周期" value={item.hostingTerm} onChange={(value) => edit((next) => { next.items[index].hostingTerm = value; })} /></TableCell>
                        <TableCell><InlineControl id={`product-price-${item.id}`} label="售价" type="number" min="0" value={item.price} onChange={(value) => edit((next) => { next.items[index].price = value; })} /></TableCell>
                        <TableCell><InlineControl id={`product-stock-${item.id}`} label="库存" type="number" min="0" value={item.inventory} onChange={(value) => edit((next) => { next.items[index].inventory = value; })} /></TableCell>
                        <TableCell><div className="commerce-status-control"><Switch size="sm" checked={item.enabled} onCheckedChange={(value) => edit((next) => { next.items[index].enabled = value; })} aria-label={`${item.name}上架状态`} /><Badge variant={item.enabled ? "secondary" : "outline"}>{item.enabled ? "已上架" : "已下架"}</Badge></div></TableCell>
                        <TableCell className="text-right"><DeleteButton label={item.name} onConfirm={() => edit((next) => { next.items.splice(index, 1); })} /></TableCell>
                      </TableRow>
                    ))}
                    {settings.items.length === 0 ? <TableRow><TableCell colSpan={7} className="commerce-empty-row">暂无商品，点击“添加商品”开始配置。</TableCell></TableRow> : null}
                  </TableBody>
                </Table>
              </FieldGroup>
            </CardContent>
          </Card>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function PaymentSettingsEditor({ settings, edit }) {
  return (
    <Accordion className="home-settings-accordion" type="multiple" defaultValue={["general", "methods", "checkout"]}>
      <AccordionItem value="general">
        <AccordionTrigger><SectionHeading title="支付与结算" description="配置商户名称、运行环境、币种和结算周期" /></AccordionTrigger>
        <AccordionContent><Card size="sm"><CardContent className="home-section-content"><ToggleControl id="payment-enabled" label="启用商城收款" description="关闭后新订单不再进入支付流程" checked={settings.enabled} onChange={(value) => edit((next) => { next.enabled = value; })} /><FieldGroup className="home-fields-grid"><TextControl id="payment-merchant" label="商户名称" value={settings.merchantName} onChange={(value) => edit((next) => { next.merchantName = value; })} /><Field><FieldLabel htmlFor="payment-environment">运行环境</FieldLabel><Select value={settings.environment} onValueChange={(value) => edit((next) => { next.environment = value; })}><SelectTrigger id="payment-environment"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="sandbox">沙箱测试</SelectItem><SelectItem value="live">正式环境</SelectItem></SelectGroup></SelectContent></Select></Field><Field><FieldLabel htmlFor="payment-currency">结算币种</FieldLabel><Select value={settings.currency} onValueChange={(value) => edit((next) => { next.currency = value; })}><SelectTrigger id="payment-currency"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="CNY">人民币 CNY</SelectItem><SelectItem value="USD">美元 USD</SelectItem></SelectGroup></SelectContent></Select></Field><TextControl id="payment-cycle" label="结算周期" value={settings.settlementCycle} onChange={(value) => edit((next) => { next.settlementCycle = value; })} /></FieldGroup><FieldGroup className="home-fields-grid"><TextControl id="payment-timeout" label="订单超时（分钟）" type="number" min="1" value={settings.orderTimeoutMinutes} onChange={(value) => edit((next) => { next.orderTimeoutMinutes = value; })} /><TextControl id="payment-callback" label="支付回调基础地址" value={settings.callbackBaseUrl} onChange={(value) => edit((next) => { next.callbackBaseUrl = value; })} description="此处仅保存回调地址；支付密钥必须放在受信任的服务端环境变量中。" /></FieldGroup></CardContent></Card></AccordionContent>
      </AccordionItem>

      <AccordionItem value="methods">
        <AccordionTrigger><SectionHeading title="支付方式" description="设置用户可选的收款渠道、费率与排序" count={settings.methods.length} /></AccordionTrigger>
        <AccordionContent><div className="payment-method-list">{settings.methods.map((method, index) => <Card size="sm" key={method.id}><CardHeader><CardTitle>{method.label}</CardTitle><CardDescription>{method.id === "bank" ? "线下审核到账" : "在线实时支付"}</CardDescription><CardAction><Switch size="sm" checked={method.enabled} onCheckedChange={(value) => edit((next) => { next.methods[index].enabled = value; })} aria-label={`${method.label}启用状态`} /></CardAction></CardHeader><CardContent><FieldGroup><TextControl id={`payment-label-${method.id}`} label="前台名称" value={method.label} onChange={(value) => edit((next) => { next.methods[index].label = value; })} /><div className="home-fields-grid"><TextControl id={`payment-fee-${method.id}`} label="手续费率（%）" type="number" min="0" value={method.feeRate} onChange={(value) => edit((next) => { next.methods[index].feeRate = value; })} /><TextControl id={`payment-order-${method.id}`} label="显示顺序" type="number" min="1" value={method.displayOrder} onChange={(value) => edit((next) => { next.methods[index].displayOrder = value; })} /></div></FieldGroup></CardContent></Card>)}</div><Button variant="outline" size="sm" onClick={() => edit((next) => { next.methods.push({ id: uid("payment-method"), label: "新支付方式", enabled: false, feeRate: "0", displayOrder: String(next.methods.length + 1) }); })}><Plus />添加支付方式</Button></AccordionContent>
      </AccordionItem>

      <AccordionItem value="checkout">
        <AccordionTrigger><SectionHeading title="收银台规则" description="设置金额边界、协议、发票和支付结果文案" /></AccordionTrigger>
        <AccordionContent><Card size="sm"><CardHeader><CardTitle><span className="commerce-card-title-icon"><CreditCard />收银台配置</span></CardTitle><CardDescription>支付页仅展示必要信息，密钥不进入浏览器配置。</CardDescription></CardHeader><CardContent className="home-section-content"><FieldGroup className="home-fields-grid"><TextControl id="payment-minimum" label="最低订单金额" type="number" min="0" value={settings.minimumAmount} onChange={(value) => edit((next) => { next.minimumAmount = value; })} /><TextControl id="payment-maximum" label="最高订单金额" type="number" min="0" value={settings.maximumAmount} onChange={(value) => edit((next) => { next.maximumAmount = value; })} /></FieldGroup><div className="commerce-rule-list"><ToggleControl id="payment-agreement" label="必须同意购买与托管协议" checked={settings.requireAgreement} onChange={(value) => edit((next) => { next.requireAgreement = value; })} /><ToggleControl id="payment-invoice" label="允许申请发票" checked={settings.invoiceEnabled} onChange={(value) => edit((next) => { next.invoiceEnabled = value; })} /></div><FieldGroup><TextControl id="payment-success-message" label="支付成功文案" textarea value={settings.successMessage} onChange={(value) => edit((next) => { next.successMessage = value; })} /><TextControl id="payment-failure-message" label="支付失败文案" textarea value={settings.failureMessage} onChange={(value) => edit((next) => { next.failureMessage = value; })} /></FieldGroup><div className="commerce-security-note"><ShieldCheck /><span>支付签名、私钥与交易验签始终由服务端处理。</span></div></CardContent></Card></AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
