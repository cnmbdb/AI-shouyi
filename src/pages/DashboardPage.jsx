import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import {
  ArrowRightIcon as ArrowRight,
  BellIcon as Bell,
  PanelTopIcon as Browser,
  ChevronDownIcon as CaretDown,
  ChartNoAxesCombinedIcon as ChartLineUp,
  CircleCheckIcon as CheckCircle,
  LayoutDashboardIcon as CirclesFour,
  CoinsIcon as Coins,
  CpuIcon as Cpu,
  CalculatorIcon as Calculator,
  CreditCardIcon as CreditCard,
  CircleDollarSignIcon as CurrencyCircleDollar,
  HouseIcon as House,
  HandshakeIcon as Handshake,
  HeadsetIcon as Headset,
  MenuIcon as List,
  NewspaperIcon as Newspaper,
  PackageIcon as Package,
  PackageSearchIcon as PackageSearch,
  ReceiptTextIcon as Receipt,
  LogOutIcon as SignOut,
  SlidersHorizontalIcon as SlidersHorizontal,
  TrendingDownIcon as TrendDown,
  TrendingUpIcon as TrendUp,
  UserRoundIcon as UserRound,
  UsersIcon as Users,
  WalletIcon as Wallet,
  RefreshCwIcon as RefreshCw,
  BadgeDollarSignIcon as BadgeDollarSign,
  XIcon as X,
} from "lucide-react";
import { BrandLogoMark } from "../components/BrandLogo.jsx";
import { createStorePayment, createWalletRecharge, getCachedSiteSettings, getPlatformOverview, getSiteSettings } from "../lib/platformData.js";
import { normalizeNavigationSettings } from "../data/siteSettings.js";
import { UserManagementPage } from "./UserManagementPage.jsx";
import { UserDetailPage } from "./UserDetailPage.jsx";
import { HomeSettingsPage } from "./HomeSettingsPage.jsx";
import { ContentSettingsPage } from "./ContentSettingsPage.jsx";
import { AccountSettingsPage } from "./AccountSettingsPage.jsx";
import { CommerceSettingsPage } from "./CommerceSettingsPage.jsx";
import { BlogPostsPage } from "./BlogPostsPage.jsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

const assetNavGroup = {
  label: "资产运营",
  items: [
    { path: "/console", label: "总览", icon: CirclesFour },
    { path: "/console/devices", label: "算力设备", icon: Cpu },
    { path: "/console/orders", label: "租用订单", icon: Receipt },
    { path: "/console/earnings", label: "跑算", icon: ChartLineUp },
    { path: "/console/transactions", label: "资金明细", icon: Wallet },
    { path: "/console/account", label: "账户设置", icon: UserRound },
  ],
};

const adminNavGroups = [
  { label: "平台管理", items: [{ path: "/console/users", label: "用户管理", icon: Users }] },
  { label: "内容总控", items: [{ path: "/console/content/articles", label: "文章管理", icon: Newspaper }] },
  {
    label: "商城",
    items: [
      { path: "/console/store/products", label: "商品列表", icon: PackageSearch },
      { path: "/console/store/payment", label: "支付设置", icon: CreditCard },
    ],
  },
  {
    label: "站点设置",
    items: [
      { path: "/console/settings/navigation", label: "顶部导航", icon: Browser },
      { path: "/console/settings/footer", label: "页脚设置", icon: List },
      { path: "/console/settings/home", label: "首页设置", icon: House },
      { path: "/console/settings/products", label: "产品浏览页", icon: Package },
      { path: "/console/settings/blog", label: "博客首页", icon: Newspaper },
      { path: "/console/settings/about", label: "关于我们", icon: Users },
      { path: "/console/settings/calculator", label: "收益计算", icon: Calculator },
      { path: "/console/settings/agency", label: "我要代理", icon: Handshake },
      { path: "/console/settings/contact", label: "联系我们", icon: Headset },
    ],
  },
];

const pageMeta = {
  "/console": ["控制台", "一站式查看算力资产、设备状态和收益表现"],
  "/console/devices": ["算力设备", "管理已租用并托管在平台的设备"],
  "/console/orders": ["租用订单", "跟踪设备租用订单、交付和到期时间"],
  "/console/earnings": ["跑算", "分析每台设备的跑算产出与结算趋势"],
  "/console/transactions": ["资金明细", "查看全部入账、结算与提现记录"],
  "/console/account": ["账户设置", "修改个人资料、头像和登录密码"],
  "/console/users": ["用户管理", "查看平台账号、验证状态并配置用户角色"],
  "/console/content/articles": ["文章管理", "统一管理网站与 Android APP 的文章、封面、正文和发布状态"],
  "/console/store/products": ["商品列表", "管理商品分类、规格、详情、租用买断价格与续费规则"],
  "/console/store/payment": ["支付设置", "管理支付提供方、渠道、费率、金额限制、密钥与回调"],
};

const settingMeta = {
  navigation: { title: "顶部导航", description: "管理全站导航名称、主按钮与展示方式", icon: Browser },
  footer: { title: "页脚设置", description: "配置品牌信息、联系方式和版权文案", icon: List },
  home: { title: "首页设置", description: "管理首页全部区块、图片、文案、图标与跳转链接", icon: House },
  products: { title: "产品浏览页", description: "设置算力产品列表的文案、筛选与默认排序", icon: Package },
  blog: { title: "博客首页", description: "管理博客首屏、精选文章与订阅模块", icon: Newspaper },
  about: { title: "关于我们", description: "管理平台故事、服务原则、运维能力与行动区", icon: Users },
  calculator: { title: "收益计算", description: "管理测算参数、计算说明、方法与行动区", icon: Calculator },
  agency: { title: "我要代理", description: "管理代理价值、合作流程、支持标准与申请入口", icon: Handshake },
  contact: { title: "联系我们", description: "管理联系渠道、服务说明、常见问题与联系表单", icon: Headset },
};

const fallbackOverview = {
  metrics: [
    { label: "托管总资产", value: "¥218,640", change: "+12.6%", trend: "up", icon: Cpu },
    { label: "本月收益", value: "¥8,426.52", change: "+8.2%", trend: "up", icon: CurrencyCircleDollar },
    { label: "设备在线率", value: "99.82%", change: "+0.14%", trend: "up", icon: CheckCircle },
    { label: "待结算", value: "¥2,184.20", change: "-3.4%", trend: "down", icon: Coins },
  ],
  earnings: [32, 36, 34, 42, 46, 44, 53, 57, 54, 61, 63, 68, 66, 74],
  devices: [
    { id: "A100-0427", name: "NVIDIA A100 80G", compute: "312 TFLOPS", status: "运行中", today: "¥96.84", expires: "2027-03-18" },
    { id: "H800-0186", name: "NVIDIA H800 80G", compute: "756 TFLOPS", status: "运行中", today: "¥188.26", expires: "2027-06-02" },
    { id: "4090-1108", name: "GeForce RTX 4090", compute: "82.6 TFLOPS", status: "维护中", today: "¥28.12", expires: "2026-11-28" },
    { id: "L40S-0631", name: "NVIDIA L40S 48G", compute: "362 TFLOPS", status: "运行中", today: "¥116.70", expires: "2027-01-09" },
  ],
  activity: [
    { title: "H800 跑算收益入账", time: "今天 09:42", value: "+¥188.26" },
    { title: "A100 日常巡检完成", time: "今天 08:15", value: "正常" },
    { title: "7 月第 3 周收益结算", time: "07-21 18:30", value: "+¥2,036.40" },
  ],
};

function Status({ value }) {
  const active = value === "运行中" || value === "已完成" || value === "已入账" || value === "已结算";
  return <Badge className="console-status" variant={active ? "secondary" : "outline"}><i />{value}</Badge>;
}

function DataTable({ data, kind = "devices", onRenew }) {
  const columns = useMemo(() => kind === "devices" ? [
    { accessorKey: "name", header: "设备", cell: ({ row }) => <div className="device-name"><span><Cpu /></span><div><strong>{row.original.name}</strong><small>{row.original.id}{row.original.productSnapshot?.source === "admin" ? " · 管理员添加" : ""}</small></div></div> },
    { accessorKey: "compute", header: "算力" },
    { accessorKey: "status", header: "状态", cell: ({ getValue }) => <Status value={getValue()} /> },
    { accessorKey: "today", header: "今日收益" },
    { accessorKey: "expires", header: "到期日" },
    { id: "actions", header: "操作", cell: ({ row }) => <div className="console-row-actions">{onRenew && row.original.storeOrderId && row.original.productId ? <Button size="xs" variant="outline" onClick={() => onRenew(row.original)}><RefreshCw />续费</Button> : <span className="console-muted-action">{row.original.storeOrderId ? "商城设备" : "管理员录入"}</span>}</div> },
  ] : [
    { accessorKey: "id", header: "订单号" },
    { accessorKey: "product", header: "租用产品", cell: ({ row }) => <div className="console-order-product"><strong>{row.original.product}</strong>{row.original.source === "admin" ? <small>管理员添加</small> : null}</div> },
    { accessorKey: "period", header: "租用周期" },
    { accessorKey: "amount", header: "订单金额" },
    { accessorKey: "status", header: "状态", cell: ({ getValue }) => <Status value={getValue()} /> },
    { accessorKey: "created", header: "下单时间" },
    { id: "actions", header: "操作", cell: ({ row }) => <div className="console-row-actions">{onRenew && row.original.orderType === "rental" && row.original.productId && ["paid", "processing", "completed"].includes(row.original.rawStatus) ? <Button size="xs" variant="outline" onClick={() => onRenew(row.original)}><RefreshCw />续费</Button> : <span className="console-muted-action">{row.original.orderType === "buyout" ? "已买断" : "-"}</span>}</div> },
  ], [kind, onRenew]);
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });

  return (
    <div className="console-table-wrap">
      <Table className="console-table">
        <TableHeader>{table.getHeaderGroups().map((group) => <TableRow key={group.id}>{group.headers.map((header) => <TableHead key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</TableHead>)}</TableRow>)}</TableHeader>
        <TableBody>{table.getRowModel().rows.map((row) => <TableRow key={row.id}>{row.getVisibleCells().map((cell) => <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}</TableRow>)}</TableBody>
      </Table>
    </div>
  );
}

function EarningsChart({ values }) {
  const width = 720;
  const height = 210;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = Math.max(1, max - min);
  const divisor = Math.max(1, values.length - 1);
  const points = values.map((value, index) => `${(index / divisor) * width},${height - ((value - min) / range) * (height - 36) - 18}`).join(" ");
  const area = `0,${height} ${points} ${width},${height}`;
  return (
    <div className="earnings-chart">
      <div className="chart-y"><span>¥10k</span><span>¥7.5k</span><span>¥5k</span><span>¥2.5k</span><span>¥0</span></div>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-label="30 天收益趋势">
        <defs><linearGradient id="earningsFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--foreground)" stopOpacity=".12" /><stop offset="1" stopColor="var(--foreground)" stopOpacity="0" /></linearGradient></defs>
        <g className="chart-grid">{[18, 61, 104, 147, 190].map((y) => <line key={y} x1="0" x2={width} y1={y} y2={y} />)}</g>
        <polygon points={area} fill="url(#earningsFill)" />
        <polyline points={points} fill="none" stroke="var(--foreground)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="chart-x"><span>06-23</span><span>06-30</span><span>07-07</span><span>07-14</span><span>07-22</span></div>
    </div>
  );
}

function Overview({ data, onNavigate }) {
  return (
    <>
      <section className="metric-strip">
        {data.metrics.map(({ label, value, change, trend, icon: Icon }) => <article key={label}><span className="metric-icon"><Icon /></span><div><p>{label}</p><strong>{value}</strong><small className={trend}>{trend === "up" ? <TrendUp /> : <TrendDown />}{change}<span>较上月</span></small></div></article>)}
      </section>
      <div className="console-grid-main">
        <section className="console-panel chart-panel">
          <div className="panel-heading"><div><h2>30 天收益</h2><p>已结算收益与每日跑算产出</p></div><Button variant="outline" size="xs">2026 年 7 月 <CaretDown data-icon="inline-end" /></Button></div>
          <div className="chart-total"><strong>¥8,426.52</strong><span><TrendUp /> 8.2%</span></div>
          <EarningsChart values={data.earnings} />
        </section>
        <section className="console-panel activity-panel">
          <div className="panel-heading"><div><h2>最近动态</h2><p>资产与结算通知</p></div></div>
          <div className="activity-list">{data.activity.map((item) => <article key={item.title}><span><CheckCircle /></span><div><strong>{item.title}</strong><small>{item.time}</small></div><b>{item.value}</b></article>)}</div>
          <Button className="text-button" variant="link" size="xs" onClick={() => onNavigate("/console/transactions")}>查看全部明细 <ArrowRight data-icon="inline-end" /></Button>
        </section>
      </div>
      <section className="console-panel device-panel">
        <div className="panel-heading"><div><h2>设备运行状态</h2><p>当前托管设备的实时概览</p></div><Button className="text-button" variant="link" size="xs" onClick={() => onNavigate("/console/devices")}>查看全部 <ArrowRight data-icon="inline-end" /></Button></div>
        <DataTable data={data.devices} />
      </section>
    </>
  );
}

function RechargeDialog({ open, onOpenChange, onNotice, onCompleted }) {
  const [amount, setAmount] = useState("1000");
  const mutation = useMutation({
    mutationFn: () => createWalletRecharge(Number(amount)),
    onSuccess: (result) => {
      if (result.checkout?.checkout_url) {
        window.location.assign(result.checkout.checkout_url);
        return;
      }
      onNotice?.(result.checkout?.instructions || `充值单 ${result.recharge?.recharge_no ?? ""} 已创建`);
      onOpenChange(false);
      onCompleted?.();
    },
    onError: (error) => onNotice?.(error.message || "充值单创建失败"),
  });
  return <Dialog open={open} onOpenChange={mutation.isPending ? undefined : onOpenChange}><DialogContent className="wallet-recharge-dialog"><DialogHeader><DialogTitle>账户充值</DialogTitle><DialogDescription>充值成功后将写入资金流水，可在资金明细中核对。</DialogDescription></DialogHeader><div className="wallet-recharge-presets">{[500, 1000, 5000, 10000].map((value) => <Button key={value} type="button" variant={Number(amount) === value ? "default" : "outline"} onClick={() => setAmount(String(value))}>¥{value.toLocaleString("zh-CN")}</Button>)}</div><label className="wallet-recharge-field"><span>自定义充值金额</span><Input type="number" min="10" max="1000000" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /><small>单笔 10–1,000,000 元，实际可用范围以支付渠道为准。</small></label><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>取消</Button><Button onClick={() => mutation.mutate()} disabled={mutation.isPending || Number(amount) < 10}>{mutation.isPending ? "正在创建充值单..." : "前往支付"}</Button></DialogFooter></DialogContent></Dialog>;
}

function ListPage({ kind, data, onNavigate, onNotice, onRefresh }) {
  const isDevices = kind === "devices";
  const rows = isDevices ? data.devices : data.orders ?? [];
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const renewMutation = useMutation({
    mutationFn: (row) => createStorePayment({ productId: row.productId, orderType: "renewal", parentOrderId: row.storeOrderId ?? row.recordId, deviceId: row.storeOrderId ? row.recordId : undefined, quantity: row.quantity ?? 1, cycles: 1 }),
    onSuccess: (result) => {
      if (result.checkout?.checkout_url) { window.location.assign(result.checkout.checkout_url); return; }
      onNotice?.(result.checkout?.instructions || `续费订单 ${result.order?.order_no ?? ""} 已创建`);
      onRefresh?.();
    },
    onError: (error) => onNotice?.(error.message || "续费订单创建失败"),
  });
  const renew = (row) => {
    if (renewMutation.isPending) return;
    renewMutation.mutate(row);
  };
  return (
    <section className="console-panel list-page-panel">
      <div className="list-toolbar">
        <InputGroup className="console-search"><InputGroupAddon><SlidersHorizontal /></InputGroupAddon><InputGroupInput aria-label={isDevices ? "搜索设备" : "搜索订单"} placeholder={isDevices ? "搜索设备名称或编号" : "搜索订单号或产品"} /></InputGroup>
        <div className="list-toolbar-actions"><Button variant="outline" size="sm" onClick={() => setRechargeOpen(true)}><BadgeDollarSign data-icon="inline-start" />账户充值</Button><Button size="sm" onClick={() => onNavigate("/estates")}><Package data-icon="inline-start" />租用新设备</Button></div>
      </div>
      <DataTable data={rows} kind={isDevices ? "devices" : "orders"} onRenew={renew} />
      {!rows.length ? <div className="console-list-empty"><Package /><strong>{isDevices ? "暂无自有算力设备" : "暂无租用订单"}</strong><span>{isDevices ? "支付完成后的设备会自动出现在这里。" : "可前往产品商城选择真实 GPU 规格。"}</span><Button size="sm" onClick={() => onNavigate("/estates")}>浏览算力商品</Button></div> : null}
      <div className="table-footer"><span>共 {rows.length} 条记录</span><div><Button variant="outline" size="xs" disabled>上一页</Button><Button size="xs">1</Button><Button variant="outline" size="xs" disabled>下一页</Button></div></div>
      <RechargeDialog open={rechargeOpen} onOpenChange={setRechargeOpen} onNotice={onNotice} onCompleted={onRefresh} />
    </section>
  );
}

function FinancePage({ kind, data, onNotice, onRefresh }) {
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const transactions = data?.transactions?.map((item) => [item.time, item.type, item.reference, item.amount, item.status]) ?? [];
  const finance = data?.finance ?? {};
  const formatMoney = (value) => `¥${Number(value || 0).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return (
    <>
      <section className="finance-summary">
        <article><p>{kind === "earnings" ? "累计跑算收益" : "可用余额"}</p><strong>{formatMoney(kind === "earnings" ? finance.totalEarnings : finance.availableBalance)}</strong><span><TrendUp /> 实时账户数据</span></article>
        <article><p>已结算收益</p><strong>{formatMoney(finance.settledEarnings)}</strong><small>以已入账流水为准</small></article>
        <article><p>待结算收益</p><strong>{formatMoney(finance.pendingEarnings)}</strong><small>结算后自动进入资金流水</small></article>
      </section>
      <section className="console-panel finance-panel">
        <div className="panel-heading"><div><h2>{kind === "earnings" ? "跑算收益明细" : "最近资金流水"}</h2><p>订单、充值和跑算收益统一记录</p></div><div className="finance-heading-actions">{kind === "transactions" ? <Button size="xs" onClick={() => setRechargeOpen(true)}><BadgeDollarSign />账户充值</Button> : null}<Button variant="outline" size="xs">全部类型 <CaretDown data-icon="inline-end" /></Button></div></div>
        <div className="transaction-list">{transactions.map(([time, type, ref, amount, status]) => <article key={`${time}-${ref}`}><span className={amount.startsWith("+") ? "income" : "expense"}>{amount.startsWith("+") ? <ChartLineUp /> : <Receipt />}</span><div><strong>{type}</strong><small>{time} / {ref}</small></div><b className={amount.startsWith("+") ? "positive" : ""}>{amount}</b><Status value={status} /></article>)}</div>
        {!transactions.length ? <div className="console-list-empty"><Wallet /><strong>暂无资金流水</strong><span>充值、购买和跑算结算完成后会显示在这里。</span></div> : null}
      </section>
      <RechargeDialog open={rechargeOpen} onOpenChange={setRechargeOpen} onNotice={onNotice} onCompleted={onRefresh} />
    </>
  );
}

export function DashboardPage({ pathname, user, onNavigate, onLogout, onNotice, onUserUpdated, notice }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const mainRef = useRef(null);
  const isAdmin = user.role === "admin";
  const navGroups = isAdmin ? [assetNavGroup, ...adminNavGroups] : [assetNavGroup];
  const needsOverview = ["/console", "/console/devices", "/console/orders"].includes(pathname);
  const overview = useQuery({ queryKey: ["platform-overview"], queryFn: getPlatformOverview, staleTime: 60_000, enabled: needsOverview });
  const siteSettings = useQuery({ queryKey: ["site-settings"], queryFn: getSiteSettings, initialData: getCachedSiteSettings, initialDataUpdatedAt: 0, staleTime: 30_000 });
  const navigationSettings = useMemo(() => normalizeNavigationSettings(siteSettings.data?.settings?.navigation), [siteSettings.data?.settings?.navigation]);
  const data = overview.data ? {
    ...fallbackOverview,
    ...overview.data,
    metrics: fallbackOverview.metrics.map((metric, index) => ({ ...metric, ...overview.data.metrics?.[index] })),
    earnings: overview.data.earnings?.length ? overview.data.earnings : [0, 0],
    devices: overview.data.devices ?? [],
    orders: overview.data.orders ?? [],
    transactions: overview.data.transactions ?? [],
    activity: overview.data.activity ?? [],
  } : {
    ...fallbackOverview,
    metrics: fallbackOverview.metrics.map((metric) => ({ ...metric, value: "—", change: "" })),
    earnings: [0, 0],
    devices: [],
    orders: [],
    transactions: [],
    activity: [],
  };
  const settingSection = isAdmin && pathname.startsWith("/console/settings/") ? pathname.split("/").pop() : null;
  const userDetailId = isAdmin && pathname.startsWith("/console/users/") ? decodeURIComponent(pathname.slice("/console/users/".length)) : "";
  const [title, description] = userDetailId ? ["用户详情", "核对用户的商城订单、持有产品、资金流水与认证状态"] : pageMeta[pathname] ?? (settingSection ? [settingMeta[settingSection]?.title, settingMeta[settingSection]?.description] : ["控制台", ""]);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className="console-shell">
      <aside className={cn("console-sidebar", sidebarOpen && "open")}>
        <button className="console-brand" type="button" style={{ "--shared-logo-size": `${navigationSettings.logoSize}px` }} onClick={() => onNavigate("/")} aria-label={`${navigationSettings.siteName} 返回首页`}><BrandLogoMark logo={navigationSettings.logo} imageClassName="console-brand-logo" fallbackClassName="console-brand-gpu" /><strong>{navigationSettings.siteName}</strong></button>
        <Button className="console-sidebar-close" variant="ghost" size="icon-sm" onClick={() => setSidebarOpen(false)} aria-label="关闭菜单"><X /></Button>
        <nav>{navGroups.map((group) => <section key={group.label}><h2>{group.label}</h2>{group.items.map(({ path, label, icon: Icon }) => <Button variant="ghost" size="sm" className={cn((pathname === path || (path === "/console/users" && pathname.startsWith("/console/users/"))) && "active")} key={path} onClick={() => { onNavigate(path); setSidebarOpen(false); }}><Icon data-icon="inline-start" /><span>{label}</span></Button>)}</section>)}</nav>
      </aside>

      <main ref={mainRef} className="console-main">
        <header className="console-topbar">
          <Button className="console-menu-button" variant="outline" size="icon-sm" onClick={() => setSidebarOpen(true)} aria-label="打开菜单"><List /></Button>
          <div><h1>{title}</h1><p>{description}</p></div>
          <div className="console-top-actions">
            <Button className="notification-button" variant="outline" size="icon-sm" aria-label="通知"><Bell /><i /></Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button className="console-profile" variant="ghost"><Avatar size="sm">{user.avatar_url ? <AvatarImage src={user.avatar_url} alt="" /> : null}<AvatarFallback style={{ backgroundColor: user.avatar_color, color: "white" }}>{user.username.slice(0, 1).toUpperCase()}</AvatarFallback></Avatar><div><strong>{user.display_name || user.username}</strong><small>{isAdmin ? "管理员" : "普通用户"}</small></div><CaretDown data-icon="inline-end" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44"><DropdownMenuGroup><DropdownMenuItem onSelect={() => onNavigate("/console/account")}><UserRound />账户设置</DropdownMenuItem><DropdownMenuItem onSelect={() => onNavigate("/")}><House />返回首页</DropdownMenuItem></DropdownMenuGroup><DropdownMenuSeparator /><DropdownMenuGroup><DropdownMenuItem variant="destructive" onSelect={onLogout}><SignOut />退出登录</DropdownMenuItem></DropdownMenuGroup></DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="console-content">
          {pathname === "/console" ? <Overview data={data} onNavigate={onNavigate} /> : null}
          {pathname === "/console/devices" ? <ListPage kind="devices" data={data} onNavigate={onNavigate} onNotice={onNotice} onRefresh={() => overview.refetch()} /> : null}
          {pathname === "/console/orders" ? <ListPage kind="orders" data={data} onNavigate={onNavigate} onNotice={onNotice} onRefresh={() => overview.refetch()} /> : null}
          {pathname === "/console/earnings" ? <FinancePage kind="earnings" data={data} onNotice={onNotice} onRefresh={() => overview.refetch()} /> : null}
          {pathname === "/console/transactions" ? <FinancePage kind="transactions" data={data} onNotice={onNotice} onRefresh={() => overview.refetch()} /> : null}
          {pathname === "/console/account" ? <AccountSettingsPage user={user} onUserUpdated={onUserUpdated} onNotice={onNotice} /> : null}
          {pathname === "/console/users" && isAdmin ? <UserManagementPage currentUser={user} onNotice={onNotice} onNavigate={onNavigate} /> : null}
          {userDetailId ? <UserDetailPage userId={userDetailId} currentUser={user} onNavigate={onNavigate} onNotice={onNotice} /> : null}
          {pathname === "/console/content/articles" && isAdmin ? <BlogPostsPage onNotice={onNotice} /> : null}
          {pathname === "/console/store/products" && isAdmin ? <CommerceSettingsPage section="products" onNotice={onNotice} /> : null}
          {pathname === "/console/store/payment" && isAdmin ? <CommerceSettingsPage section="payment" onNotice={onNotice} /> : null}
          {settingSection === "home" ? <HomeSettingsPage onNotice={onNotice} /> : null}
          {settingSection && settingSection !== "home" ? <ContentSettingsPage key={settingSection} section={settingSection} onNotice={onNotice} /> : null}
        </div>
      </main>
      {sidebarOpen ? <button className="console-overlay" onClick={() => setSidebarOpen(false)} aria-label="关闭菜单" /> : null}
      {notice ? <div className="toast" role="status">{notice}</div> : null}
    </div>
  );
}
