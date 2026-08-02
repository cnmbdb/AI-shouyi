import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeftIcon,
  BadgeCheckIcon,
  CalendarClockIcon,
  CircleDollarSignIcon,
  CpuIcon,
  ExternalLinkIcon,
  MailCheckIcon,
  PackageIcon,
  ReceiptTextIcon,
  ShieldCheckIcon,
  WalletCardsIcon,
} from "lucide-react";
import { getAdminUserDetail } from "../lib/adminUsers.js";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const money = (value) => `¥${Number(value || 0).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dateTime = (value) => value ? new Date(value).toLocaleString("zh-CN", { dateStyle: "short", timeStyle: "short", hour12: false }) : "—";
const dateOnly = (value) => value ? new Date(value).toLocaleDateString("zh-CN") : "—";
const orderTypeLabel = { rental: "租用", buyout: "买断", renewal: "续费" };
const orderStatusLabel = { pending_payment: "待支付", paid: "已支付", processing: "处理中", completed: "已完成", expired: "已过期", cancelled: "已取消", refunded: "已退款" };
const paymentStatusLabel = { pending: "待支付", paid: "已支付", failed: "失败", expired: "已过期", cancelled: "已取消", refunded: "已退款" };
const periodUnitLabel = { day: "天", month: "个月", year: "年" };
const providerLabel = { email: "邮箱密码", phone: "手机", google: "Google", github: "GitHub" };
const completedStatuses = new Set(["paid", "processing", "completed"]);

function StatusBadge({ value, label }) {
  const positive = completedStatuses.has(value) || value === "已结算" || value === "已入账";
  return <Badge variant={positive ? "secondary" : "outline"}>{label ?? orderStatusLabel[value] ?? paymentStatusLabel[value] ?? value}</Badge>;
}

function EmptyState({ children }) {
  return <div className="admin-user-detail-empty"><PackageIcon /><span>{children}</span></div>;
}

export function UserDetailPage({ userId, currentUser, onNavigate }) {
  const detailQuery = useQuery({
    queryKey: ["admin-user-detail", userId],
    queryFn: () => getAdminUserDetail(userId),
    enabled: Boolean(userId),
    staleTime: 20_000,
  });
  const detail = detailQuery.data;
  const user = detail?.user;
  const productMap = useMemo(() => new Map((detail?.products ?? []).map((product) => [product.id, product])), [detail?.products]);
  const paymentByOrder = useMemo(() => {
    const result = new Map();
    (detail?.payments ?? []).forEach((payment) => {
      if (!result.has(payment.order_id)) result.set(payment.order_id, payment);
    });
    return result;
  }, [detail?.payments]);
  const activeProductOrders = useMemo(() => (detail?.orders ?? []).filter((order) => completedStatuses.has(order.status) && order.order_type !== "renewal"), [detail?.orders]);
  const paidTotal = (detail?.orders ?? []).filter((order) => completedStatuses.has(order.status)).reduce((sum, order) => sum + Number(order.total_amount), 0);
  const earningsTotal = (detail?.earnings ?? []).reduce((sum, earning) => sum + Number(earning.amount), 0);
  const transactionBalance = (detail?.transactions ?? []).reduce((sum, transaction) => sum + Number(transaction.amount), 0);

  if (detailQuery.isLoading) {
    return <div className="admin-user-detail-page"><Skeleton className="h-28 w-full" /><div className="admin-user-detail-metrics">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-24 w-full" />)}</div><Skeleton className="h-80 w-full" /></div>;
  }

  if (detailQuery.isError || !user) {
    return <Card className="admin-user-detail-error"><CardHeader><CardTitle>无法打开用户资料</CardTitle><CardDescription>{detailQuery.error?.message ?? "用户不存在或已删除"}</CardDescription></CardHeader><CardContent><Button variant="outline" onClick={() => onNavigate("/console/users")}><ArrowLeftIcon />返回用户列表</Button></CardContent></Card>;
  }

  const openProduct = (order) => {
    const product = productMap.get(order.product_id);
    if (!product) return;
    onNavigate(`/estates/${encodeURIComponent(product.category_id || "uncategorized")}/${encodeURIComponent(product.id)}`);
  };

  return (
    <div className="admin-user-detail-page">
      <Card className="admin-user-profile-card">
        <CardHeader>
          <div className="admin-user-detail-heading">
            <Button variant="outline" size="icon-sm" onClick={() => onNavigate("/console/users")} aria-label="返回用户列表"><ArrowLeftIcon /></Button>
            <Avatar className="admin-user-detail-avatar"><AvatarImage src={user.avatarUrl} alt="" /><AvatarFallback style={{ backgroundColor: user.avatarColor, color: "white" }}>{user.username.slice(0, 1).toUpperCase()}</AvatarFallback></Avatar>
            <div><div><CardTitle>{user.displayName || user.username}</CardTitle><Badge variant={user.role === "admin" ? "default" : "outline"}>{user.role === "admin" ? "管理员" : "普通用户"}</Badge>{user.id === currentUser.id ? <Badge variant="secondary">当前账号</Badge> : null}</div><CardDescription>@{user.username} · {user.email}</CardDescription></div>
          </div>
          <CardAction><span className="admin-user-detail-id">用户 ID<br /><code>{user.id}</code></span></CardAction>
        </CardHeader>
      </Card>

      <section className="admin-user-detail-metrics" aria-label="用户业务统计">
        <Card size="sm"><CardHeader><CardDescription>商城订单</CardDescription><CardTitle>{(detail.orders ?? []).length}</CardTitle><CardAction><ReceiptTextIcon /></CardAction></CardHeader></Card>
        <Card size="sm"><CardHeader><CardDescription>已购产品</CardDescription><CardTitle>{activeProductOrders.length}</CardTitle><CardAction><PackageIcon /></CardAction></CardHeader></Card>
        <Card size="sm"><CardHeader><CardDescription>累计支付</CardDescription><CardTitle>{money(paidTotal)}</CardTitle><CardAction><WalletCardsIcon /></CardAction></CardHeader></Card>
        <Card size="sm"><CardHeader><CardDescription>跑算收益</CardDescription><CardTitle>{money(earningsTotal)}</CardTitle><CardAction><CircleDollarSignIcon /></CardAction></CardHeader></Card>
      </section>

      <Tabs defaultValue="orders" className="admin-user-detail-tabs">
        <TabsList variant="line" aria-label="用户资料分类">
          <TabsTrigger value="orders"><ReceiptTextIcon />订单</TabsTrigger>
          <TabsTrigger value="products"><CpuIcon />产品与设备</TabsTrigger>
          <TabsTrigger value="finance"><WalletCardsIcon />资金</TabsTrigger>
          <TabsTrigger value="verification"><BadgeCheckIcon />认证</TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <Card><CardHeader className="border-b"><CardTitle>商城订单</CardTitle><CardDescription>订单直接关联商城商品和支付记录；历史商品快照不会随商品改名而丢失。</CardDescription></CardHeader><CardContent className="admin-user-detail-table"><Table><TableHeader><TableRow><TableHead>订单号</TableHead><TableHead>商品</TableHead><TableHead>方式</TableHead><TableHead>金额</TableHead><TableHead>支付</TableHead><TableHead>状态</TableHead><TableHead>下单时间</TableHead><TableHead /></TableRow></TableHeader><TableBody>
            {(detail.orders ?? []).map((order) => { const product = productMap.get(order.product_id); const payment = paymentByOrder.get(order.id); return <TableRow key={order.id}><TableCell><strong>{order.order_no}</strong></TableCell><TableCell><div className="admin-order-product"><span>{product?.name ?? order.product_snapshot?.name ?? "已删除商品"}</span><small>{product?.sku ?? order.product_snapshot?.sku ?? order.product_id}</small></div></TableCell><TableCell>{orderTypeLabel[order.order_type] ?? order.order_type}{order.period_count ? <small className="admin-order-period">{order.period_count} {periodUnitLabel[order.period_unit] ?? order.period_unit}</small> : null}</TableCell><TableCell>{money(order.total_amount)}</TableCell><TableCell>{payment ? <><StatusBadge value={payment.status} /><small className="admin-order-period">{payment.payment_no}</small></> : "—"}</TableCell><TableCell><StatusBadge value={order.status} /></TableCell><TableCell>{dateTime(order.created_at)}</TableCell><TableCell>{product ? <Button variant="ghost" size="xs" onClick={() => openProduct(order)}>商品 <ExternalLinkIcon /></Button> : null}</TableCell></TableRow>; })}
            {!(detail.orders ?? []).length ? <TableRow><TableCell colSpan={8}><EmptyState>暂无商城订单</EmptyState></TableCell></TableRow> : null}
          </TableBody></Table></CardContent></Card>
        </TabsContent>

        <TabsContent value="products">
          <div className="admin-user-product-grid">
            {activeProductOrders.map((order) => { const product = productMap.get(order.product_id); const snapshot = order.product_snapshot ?? {}; return <Card key={order.id} size="sm" className="admin-user-product-card"><div className="admin-user-product-media">{(product?.image_url || snapshot.image) ? <img src={product?.image_url || snapshot.image} alt="" /> : <CpuIcon />}</div><CardHeader><CardTitle>{product?.name ?? snapshot.name ?? "商城商品"}</CardTitle><CardDescription>{product?.gpu_model ?? snapshot.gpuModel ?? "GPU 待补充"} · {product?.vram ?? snapshot.vram ?? "显存待补充"}</CardDescription><CardAction><StatusBadge value={order.status} /></CardAction></CardHeader><CardContent><dl><div><dt>关联订单</dt><dd>{order.order_no}</dd></div><div><dt>服务到期</dt><dd>{order.order_type === "buyout" ? "买断" : dateOnly(order.service_expires_at)}</dd></div><div><dt>数量</dt><dd>{order.quantity} 台</dd></div></dl>{product ? <Button variant="outline" size="sm" onClick={() => openProduct(order)}>查看商城商品 <ExternalLinkIcon /></Button> : null}</CardContent></Card>; })}
            {!activeProductOrders.length ? <Card><EmptyState>暂无已支付或已交付产品</EmptyState></Card> : null}
          </div>
          <Card className="admin-user-device-card"><CardHeader className="border-b"><CardTitle>名下算力设备</CardTitle><CardDescription>设备资产与商城商品订单并列展示，便于核对交付结果。</CardDescription></CardHeader><CardContent className="admin-user-detail-table"><Table><TableHeader><TableRow><TableHead>设备编号</TableHead><TableHead>设备</TableHead><TableHead>算力</TableHead><TableHead>状态</TableHead><TableHead>日收益</TableHead><TableHead>到期日</TableHead></TableRow></TableHeader><TableBody>{(detail.devices ?? []).map((device) => <TableRow key={device.id}><TableCell>{device.device_code}</TableCell><TableCell>{device.name}</TableCell><TableCell>{device.compute}</TableCell><TableCell><StatusBadge value={device.status} /></TableCell><TableCell>{money(device.daily_yield)}</TableCell><TableCell>{dateOnly(device.expires_at)}</TableCell></TableRow>)}{!(detail.devices ?? []).length ? <TableRow><TableCell colSpan={6}><EmptyState>暂无设备资产</EmptyState></TableCell></TableRow> : null}</TableBody></Table></CardContent></Card>
        </TabsContent>

        <TabsContent value="finance">
          <section className="admin-user-finance-summary"><Card size="sm"><CardHeader><CardDescription>订单累计支付</CardDescription><CardTitle>{money(paidTotal)}</CardTitle></CardHeader></Card><Card size="sm"><CardHeader><CardDescription>累计跑算收益</CardDescription><CardTitle>{money(earningsTotal)}</CardTitle></CardHeader></Card><Card size="sm"><CardHeader><CardDescription>资金流水净额</CardDescription><CardTitle>{money(transactionBalance)}</CardTitle></CardHeader></Card></section>
          <Card><CardHeader className="border-b"><CardTitle>资金流水</CardTitle><CardDescription>资金流水保留业务类型、关联单号与处理状态。</CardDescription></CardHeader><CardContent className="admin-user-detail-table"><Table><TableHeader><TableRow><TableHead>时间</TableHead><TableHead>类型</TableHead><TableHead>关联记录</TableHead><TableHead>金额</TableHead><TableHead>状态</TableHead></TableRow></TableHeader><TableBody>{(detail.transactions ?? []).map((transaction) => <TableRow key={transaction.id}><TableCell>{dateTime(transaction.occurred_at)}</TableCell><TableCell>{transaction.transaction_type === "托管收益" ? "跑算收益" : transaction.transaction_type}</TableCell><TableCell>{transaction.reference}</TableCell><TableCell className={Number(transaction.amount) >= 0 ? "admin-money-positive" : ""}>{Number(transaction.amount) >= 0 ? "+" : ""}{money(transaction.amount)}</TableCell><TableCell><StatusBadge value={transaction.status} /></TableCell></TableRow>)}{!(detail.transactions ?? []).length ? <TableRow><TableCell colSpan={5}><EmptyState>暂无资金流水</EmptyState></TableCell></TableRow> : null}</TableBody></Table></CardContent></Card>
        </TabsContent>

        <TabsContent value="verification">
          <div className="admin-user-verification-grid">
            <Card><CardHeader><CardTitle><MailCheckIcon />邮箱认证</CardTitle><CardDescription>注册邮箱及验证结果</CardDescription><CardAction><StatusBadge value={user.emailConfirmedAt ? "completed" : "pending"} label={user.emailConfirmedAt ? "已认证" : "未认证"} /></CardAction></CardHeader><CardContent><strong>{user.email}</strong><small>认证时间：{dateTime(user.emailConfirmedAt)}</small></CardContent></Card>
            <Card><CardHeader><CardTitle><ShieldCheckIcon />登录身份</CardTitle><CardDescription>账户已绑定的认证提供方</CardDescription><CardAction><Badge variant="outline">{user.providers.length || 1} 种</Badge></CardAction></CardHeader><CardContent><strong>{user.providers.length ? user.providers.map((provider) => providerLabel[provider] ?? provider).join("、") : "邮箱密码"}</strong><small>最近登录：{dateTime(user.lastSignInAt)}</small></CardContent></Card>
            <Card><CardHeader><CardTitle><CalendarClockIcon />账户状态</CardTitle><CardDescription>账户建立与资料更新时间</CardDescription><CardAction><StatusBadge value="completed" label="正常" /></CardAction></CardHeader><CardContent><strong>注册于 {dateTime(user.createdAt)}</strong><small>资料更新：{dateTime(user.updatedAt)}</small></CardContent></Card>
            <Card><CardHeader><CardTitle><WalletCardsIcon />交易认证</CardTitle><CardDescription>以可信支付回调确认的商城支付</CardDescription><CardAction><StatusBadge value={(detail.payments ?? []).some((payment) => payment.status === "paid") ? "completed" : "pending"} label={(detail.payments ?? []).some((payment) => payment.status === "paid") ? "已有认证支付" : "暂无认证支付"} /></CardAction></CardHeader><CardContent><strong>{(detail.payments ?? []).filter((payment) => payment.status === "paid").length} 笔已支付</strong><small>资金状态来自服务端支付记录，不读取浏览器声明。</small></CardContent></Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
