import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  CircleDollarSignIcon as CurrencyCircleDollar,
  LifeBuoyIcon as Gear,
  HouseIcon as House,
  MenuIcon as List,
  NewspaperIcon as Newspaper,
  PackageIcon as Package,
  ReceiptTextIcon as Receipt,
  LogOutIcon as SignOut,
  SlidersHorizontalIcon as SlidersHorizontal,
  TrendingDownIcon as TrendDown,
  TrendingUpIcon as TrendUp,
  UserRoundIcon as UserRound,
  UsersIcon as Users,
  WalletIcon as Wallet,
  XIcon as X,
} from "lucide-react";
import { ThemeToggle } from "../components/ThemeProvider.jsx";
import { BrandLogoMark } from "../components/BrandLogo.jsx";
import { getPlatformOverview, getSiteSettings } from "../lib/platformData.js";
import { normalizeNavigationSettings } from "../data/siteSettings.js";
import { UserManagementPage } from "./UserManagementPage.jsx";
import { HomeSettingsPage } from "./HomeSettingsPage.jsx";
import { ContentSettingsPage } from "./ContentSettingsPage.jsx";
import { AccountSettingsPage } from "./AccountSettingsPage.jsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
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
  {
    label: "站点设置",
    items: [
      { path: "/console/settings/navigation", label: "顶部导航", icon: Browser },
      { path: "/console/settings/footer", label: "页脚设置", icon: List },
      { path: "/console/settings/home", label: "首页设置", icon: House },
      { path: "/console/settings/products", label: "产品浏览页", icon: Package },
      { path: "/console/settings/blog", label: "博客首页", icon: Newspaper },
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
};

const settingMeta = {
  navigation: { title: "顶部导航", description: "管理全站导航名称、主按钮与展示方式", icon: Browser },
  footer: { title: "页脚设置", description: "配置品牌信息、联系方式和版权文案", icon: List },
  home: { title: "首页设置", description: "管理首页全部区块、图片、文案、图标与跳转链接", icon: House },
  products: { title: "产品浏览页", description: "设置算力产品列表的文案、筛选与默认排序", icon: Package },
  blog: { title: "博客首页", description: "管理博客首屏、精选文章与订阅模块", icon: Newspaper },
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

function DataTable({ data, kind = "devices" }) {
  const columns = useMemo(() => kind === "devices" ? [
    { accessorKey: "name", header: "设备", cell: ({ row }) => <div className="device-name"><span><Cpu /></span><div><strong>{row.original.name}</strong><small>{row.original.id}</small></div></div> },
    { accessorKey: "compute", header: "算力" },
    { accessorKey: "status", header: "状态", cell: ({ getValue }) => <Status value={getValue()} /> },
    { accessorKey: "today", header: "今日收益" },
    { accessorKey: "expires", header: "到期日" },
  ] : [
    { accessorKey: "id", header: "订单号" },
    { accessorKey: "product", header: "租用产品" },
    { accessorKey: "period", header: "租用周期" },
    { accessorKey: "amount", header: "订单金额" },
    { accessorKey: "status", header: "状态", cell: ({ getValue }) => <Status value={getValue()} /> },
    { accessorKey: "created", header: "下单时间" },
  ], [kind]);
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
  const points = values.map((value, index) => `${(index / (values.length - 1)) * width},${height - ((value - min) / (max - min)) * (height - 36) - 18}`).join(" ");
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

const orderRows = [
  { id: "CO202607180086", product: "NVIDIA H800 80G", period: "12 个月", amount: "¥128,800", status: "已完成", created: "2026-07-18 14:32" },
  { id: "CO202606020041", product: "NVIDIA L40S 48G", period: "12 个月", amount: "¥68,600", status: "已完成", created: "2026-06-02 10:18" },
  { id: "CO202603180019", product: "NVIDIA A100 80G", period: "12 个月", amount: "¥96,800", status: "已完成", created: "2026-03-18 09:05" },
];

function ListPage({ kind, data, onNavigate }) {
  const isDevices = kind === "devices";
  const rows = isDevices ? data.devices : data.orders?.length ? data.orders : orderRows;
  return (
    <section className="console-panel list-page-panel">
      <div className="list-toolbar">
        <InputGroup className="console-search"><InputGroupAddon><SlidersHorizontal /></InputGroupAddon><InputGroupInput aria-label={isDevices ? "搜索设备" : "搜索订单"} placeholder={isDevices ? "搜索设备名称或编号" : "搜索订单号或产品"} /></InputGroup>
        <Button size="sm" onClick={() => onNavigate("/estates")}><Package data-icon="inline-start" />租用新设备</Button>
      </div>
      <DataTable data={rows} kind={isDevices ? "devices" : "orders"} />
      <div className="table-footer"><span>共 {rows.length} 条记录</span><div><Button variant="outline" size="xs" disabled>上一页</Button><Button size="xs">1</Button><Button variant="outline" size="xs" disabled>下一页</Button></div></div>
    </section>
  );
}

function FinancePage({ kind }) {
  const transactions = [
    ["2026-07-22 09:42", "跑算收益", "H800-0186", "+¥188.26", "已入账"],
    ["2026-07-22 09:40", "跑算收益", "L40S-0631", "+¥116.70", "已入账"],
    ["2026-07-21 18:30", "周度结算", "SET-0721", "+¥2,036.40", "已结算"],
    ["2026-07-18 14:32", "设备租用", "CO202607180086", "-¥128,800.00", "已完成"],
  ];
  return (
    <>
      <section className="finance-summary">
        <article><p>{kind === "earnings" ? "累计跑算收益" : "可用余额"}</p><strong>{kind === "earnings" ? "¥42,680.18" : "¥16,420.36"}</strong><span><TrendUp /> 本月 +8.2%</span></article>
        <article><p>本月已结算</p><strong>¥6,242.32</strong><small>下次结算 07-28</small></article>
        <article><p>待结算收益</p><strong>¥2,184.20</strong><small>预计 6 天后入账</small></article>
      </section>
      <section className="console-panel finance-panel">
        <div className="panel-heading"><div><h2>{kind === "earnings" ? "跑算收益明细" : "最近资金流水"}</h2><p>数据更新于 2026-07-22 10:00</p></div><Button variant="outline" size="xs">全部类型 <CaretDown data-icon="inline-end" /></Button></div>
        <div className="transaction-list">{transactions.map(([time, type, ref, amount, status]) => <article key={`${time}-${ref}`}><span className={amount.startsWith("+") ? "income" : "expense"}>{amount.startsWith("+") ? <ChartLineUp /> : <Receipt />}</span><div><strong>{type}</strong><small>{time} / {ref}</small></div><b className={amount.startsWith("+") ? "positive" : ""}>{amount}</b><Status value={status} /></article>)}</div>
      </section>
    </>
  );
}

export function DashboardPage({ pathname, user, onNavigate, onLogout, onNotice, onUserUpdated, notice }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isAdmin = user.role === "admin";
  const navGroups = isAdmin ? [assetNavGroup, ...adminNavGroups] : [assetNavGroup];
  const needsOverview = ["/console", "/console/devices", "/console/orders"].includes(pathname);
  const overview = useQuery({ queryKey: ["platform-overview"], queryFn: getPlatformOverview, staleTime: 60_000, enabled: needsOverview });
  const siteSettings = useQuery({ queryKey: ["site-settings"], queryFn: getSiteSettings, staleTime: 30_000, refetchOnWindowFocus: false });
  const navigationSettings = useMemo(() => normalizeNavigationSettings(siteSettings.data?.settings?.navigation), [siteSettings.data?.settings?.navigation]);
  const data = overview.data ? {
    ...fallbackOverview,
    ...overview.data,
    metrics: fallbackOverview.metrics.map((metric, index) => ({ ...metric, ...overview.data.metrics?.[index] })),
    earnings: overview.data.earnings?.length ? overview.data.earnings : fallbackOverview.earnings,
    devices: overview.data.devices?.length ? overview.data.devices : fallbackOverview.devices,
    activity: overview.data.activity?.length ? overview.data.activity : fallbackOverview.activity,
  } : fallbackOverview;
  const settingSection = isAdmin && pathname.startsWith("/console/settings/") ? pathname.split("/").pop() : null;
  const [title, description] = pageMeta[pathname] ?? (settingSection ? [settingMeta[settingSection]?.title, settingMeta[settingSection]?.description] : ["控制台", ""]);

  return (
    <div className="console-shell">
      <aside className={cn("console-sidebar", sidebarOpen && "open")}>
        <button className="console-brand" type="button" onClick={() => onNavigate("/")} aria-label={`${navigationSettings.siteName} 返回首页`}><BrandLogoMark logo={navigationSettings.logo} imageClassName="console-brand-logo" fallbackClassName="console-brand-gpu" /><strong>{navigationSettings.siteName}</strong></button>
        <Button className="console-sidebar-close" variant="ghost" size="icon-sm" onClick={() => setSidebarOpen(false)} aria-label="关闭菜单"><X /></Button>
        <nav>{navGroups.map((group) => <section key={group.label}><h2>{group.label}</h2>{group.items.map(({ path, label, icon: Icon }) => <Button variant="ghost" size="sm" className={cn(pathname === path && "active")} key={path} onClick={() => { onNavigate(path); setSidebarOpen(false); }}><Icon data-icon="inline-start" /><span>{label}</span></Button>)}</section>)}</nav>
        <div className="console-help"><Gear /><div><strong>需要帮助？</strong><span>工单平均 10 分钟响应</span></div><Button variant="outline" size="xs" onClick={() => onNotice("已为你打开在线支持工单")}>联系支持</Button></div>
      </aside>

      <main className="console-main">
        <header className="console-topbar">
          <Button className="console-menu-button" variant="outline" size="icon-sm" onClick={() => setSidebarOpen(true)} aria-label="打开菜单"><List /></Button>
          <div><h1>{title}</h1><p>{description}</p></div>
          <div className="console-top-actions">
            <ThemeToggle />
            <Button className="notification-button" variant="outline" size="icon-sm" aria-label="通知"><Bell /><i /></Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button className="console-profile" variant="ghost"><Avatar size="sm">{user.avatar_url ? <AvatarImage src={user.avatar_url} alt="" /> : null}<AvatarFallback style={{ backgroundColor: user.avatar_color, color: "white" }}>{user.username.slice(0, 1).toUpperCase()}</AvatarFallback></Avatar><div><strong>{user.display_name || user.username}</strong><small>{isAdmin ? "管理员" : "普通用户"}</small></div><CaretDown data-icon="inline-end" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44"><DropdownMenuGroup><DropdownMenuItem onSelect={() => onNavigate("/console/account")}><UserRound />账户设置</DropdownMenuItem><DropdownMenuItem onSelect={() => onNavigate("/")}><House />返回首页</DropdownMenuItem></DropdownMenuGroup><DropdownMenuSeparator /><DropdownMenuGroup><DropdownMenuItem variant="destructive" onSelect={onLogout}><SignOut />退出登录</DropdownMenuItem></DropdownMenuGroup></DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="console-content">
          {pathname === "/console" ? <Overview data={data} onNavigate={onNavigate} /> : null}
          {pathname === "/console/devices" ? <ListPage kind="devices" data={data} onNavigate={onNavigate} /> : null}
          {pathname === "/console/orders" ? <ListPage kind="orders" data={data} onNavigate={onNavigate} /> : null}
          {pathname === "/console/earnings" ? <FinancePage kind="earnings" /> : null}
          {pathname === "/console/transactions" ? <FinancePage kind="transactions" /> : null}
          {pathname === "/console/account" ? <AccountSettingsPage user={user} onUserUpdated={onUserUpdated} onNotice={onNotice} /> : null}
          {pathname === "/console/users" && isAdmin ? <UserManagementPage currentUser={user} onNotice={onNotice} /> : null}
          {settingSection === "home" ? <HomeSettingsPage onNotice={onNotice} /> : null}
          {settingSection && settingSection !== "home" ? <ContentSettingsPage section={settingSection} onNotice={onNotice} /> : null}
        </div>
      </main>
      {sidebarOpen ? <button className="console-overlay" onClick={() => setSidebarOpen(false)} aria-label="关闭菜单" /> : null}
      {notice ? <div className="toast" role="status">{notice}</div> : null}
    </div>
  );
}
