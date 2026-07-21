import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  PencilIcon as PencilSimple,
  ReceiptTextIcon as Receipt,
  LogOutIcon as SignOut,
  SlidersHorizontalIcon as SlidersHorizontal,
  TrendingDownIcon as TrendDown,
  TrendingUpIcon as TrendUp,
  WalletIcon as Wallet,
  XIcon as X,
} from "lucide-react";
import { ThemeToggle } from "../components/ThemeProvider.jsx";
import { getPlatformOverview, getSiteSettings, saveSiteSetting } from "../lib/platformData.js";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

const navGroups = [
  {
    label: "资产运营",
    items: [
      { path: "/console", label: "总览", icon: CirclesFour },
      { path: "/console/devices", label: "算力设备", icon: Cpu },
      { path: "/console/orders", label: "租用订单", icon: Receipt },
      { path: "/console/earnings", label: "托管收益", icon: ChartLineUp },
      { path: "/console/transactions", label: "资金明细", icon: Wallet },
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
    ],
  },
];

const pageMeta = {
  "/console": ["控制台", "一站式查看算力资产、设备状态和收益表现"],
  "/console/devices": ["算力设备", "管理已租用并托管在平台的设备"],
  "/console/orders": ["租用订单", "跟踪设备租用订单、交付和到期时间"],
  "/console/earnings": ["托管收益", "分析每台设备的产出与结算趋势"],
  "/console/transactions": ["资金明细", "查看全部入账、结算与提现记录"],
};

const settingMeta = {
  navigation: { title: "顶部导航", description: "管理全站导航名称、主按钮与展示方式", icon: Browser },
  footer: { title: "页脚设置", description: "配置品牌信息、联系方式和版权文案", icon: List },
  home: { title: "首页设置", description: "调整首屏标题、介绍和主行动按钮", icon: House },
  products: { title: "产品浏览页", description: "设置算力产品列表的文案、筛选与默认排序", icon: Package },
  blog: { title: "博客首页", description: "管理博客首屏、精选文章与订阅模块", icon: Newspaper },
};

const defaultSettings = {
  navigation: { siteName: "Aether Lane", ctaText: "租用算力", ctaLink: "/estates", sticky: true, showBlog: true },
  footer: { description: "稳定的算力托管，透明的收益管理。", email: "hello@aetherlane.com", phone: "+86 400 800 2026", copyright: "© 2026 Aether Lane" },
  home: { title: "Galaxy Compute", subtitle: "让算力成为持续运行的数字资产", primaryAction: "浏览算力设备", secondaryAction: "了解托管收益", showStats: true },
  products: { title: "选择适合你的算力", subtitle: "按算力、周期和预期产出进行对比", defaultSort: "recommended", showAvailability: true, showEstimatedYield: true },
  blog: { title: "算力与收益洞察", subtitle: "了解设备、能效、托管和行业趋势", featuredLabel: "精选", newsletterTitle: "订阅算力周报", showNewsletter: true },
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
    { title: "H800 托管收益入账", time: "今天 09:42", value: "+¥188.26" },
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
          <div className="panel-heading"><div><h2>30 天收益</h2><p>已结算收益与每日托管产出</p></div><Button variant="outline" size="xs">2026 年 7 月 <CaretDown data-icon="inline-end" /></Button></div>
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
    ["2026-07-22 09:42", "托管收益", "H800-0186", "+¥188.26", "已入账"],
    ["2026-07-22 09:40", "托管收益", "L40S-0631", "+¥116.70", "已入账"],
    ["2026-07-21 18:30", "周度结算", "SET-0721", "+¥2,036.40", "已结算"],
    ["2026-07-18 14:32", "设备租用", "CO202607180086", "-¥128,800.00", "已完成"],
  ];
  return (
    <>
      <section className="finance-summary">
        <article><p>{kind === "earnings" ? "累计托管收益" : "可用余额"}</p><strong>{kind === "earnings" ? "¥42,680.18" : "¥16,420.36"}</strong><span><TrendUp /> 本月 +8.2%</span></article>
        <article><p>本月已结算</p><strong>¥6,242.32</strong><small>下次结算 07-28</small></article>
        <article><p>待结算收益</p><strong>¥2,184.20</strong><small>预计 6 天后入账</small></article>
      </section>
      <section className="console-panel finance-panel">
        <div className="panel-heading"><div><h2>{kind === "earnings" ? "收益明细" : "最近资金流水"}</h2><p>数据更新于 2026-07-22 10:00</p></div><Button variant="outline" size="xs">全部类型 <CaretDown data-icon="inline-end" /></Button></div>
        <div className="transaction-list">{transactions.map(([time, type, ref, amount, status]) => <article key={`${time}-${ref}`}><span className={amount.startsWith("+") ? "income" : "expense"}>{amount.startsWith("+") ? <ChartLineUp /> : <Receipt />}</span><div><strong>{type}</strong><small>{time} / {ref}</small></div><b className={amount.startsWith("+") ? "positive" : ""}>{amount}</b><Status value={status} /></article>)}</div>
      </section>
    </>
  );
}

function ToggleField({ label, hint, checked, onChange }) {
  const id = `setting-${label}`;
  return <Field className="toggle-field" orientation="horizontal"><div><FieldLabel htmlFor={id}>{label}</FieldLabel><FieldDescription>{hint}</FieldDescription></div><Switch id={id} size="sm" checked={checked} onCheckedChange={onChange} /></Field>;
}

function TextField({ label, value, onChange, placeholder, multiline = false }) {
  const id = `setting-${label}`;
  return <Field className="setting-field"><FieldLabel htmlFor={id}>{label}</FieldLabel>{multiline ? <Textarea id={id} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /> : <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />}</Field>;
}

function SettingsPage({ section, onNotice }) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["site-settings"], queryFn: getSiteSettings, staleTime: 30_000 });
  const [settings, setSettings] = useState(defaultSettings);
  const meta = settingMeta[section] ?? settingMeta.navigation;
  const Icon = meta.icon;

  useEffect(() => {
    if (query.data?.settings) setSettings({ ...defaultSettings, ...query.data.settings });
  }, [query.data]);

  const mutation = useMutation({
    mutationFn: (payload) => saveSiteSetting(section, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      queryClient.invalidateQueries({ queryKey: ["public-settings"] });
      onNotice("设置已保存并发布");
    },
    onError: (error) => onNotice(error.message),
  });

  const values = settings[section] ?? defaultSettings[section];
  const setValue = (key, value) => setSettings((current) => ({ ...current, [section]: { ...current[section], [key]: value } }));

  return (
    <div className="settings-layout">
      <section className="console-panel settings-form-panel">
        <div className="settings-title"><span><Icon /></span><div><h2>{meta.title}</h2><p>{meta.description}</p></div></div>
        <div className="settings-form">
          {section === "navigation" ? <>
            <div className="field-row"><TextField label="站点名称" value={values.siteName} onChange={(value) => setValue("siteName", value)} /><TextField label="主按钮文案" value={values.ctaText} onChange={(value) => setValue("ctaText", value)} /></div>
            <TextField label="主按钮链接" value={values.ctaLink} onChange={(value) => setValue("ctaLink", value)} />
            <div className="toggle-group"><ToggleField label="吸顶导航" hint="页面滚动时始终保持导航可见" checked={values.sticky} onChange={(value) => setValue("sticky", value)} /><ToggleField label="显示博客入口" hint="在顶部导航和移动菜单中显示" checked={values.showBlog} onChange={(value) => setValue("showBlog", value)} /></div>
          </> : null}
          {section === "footer" ? <>
            <TextField label="品牌简介" value={values.description} onChange={(value) => setValue("description", value)} multiline />
            <div className="field-row"><TextField label="联系邮箱" value={values.email} onChange={(value) => setValue("email", value)} /><TextField label="联系电话" value={values.phone} onChange={(value) => setValue("phone", value)} /></div>
            <TextField label="版权文案" value={values.copyright} onChange={(value) => setValue("copyright", value)} />
          </> : null}
          {section === "home" ? <>
            <TextField label="首屏标题" value={values.title} onChange={(value) => setValue("title", value)} />
            <TextField label="首屏介绍" value={values.subtitle} onChange={(value) => setValue("subtitle", value)} multiline />
            <div className="field-row"><TextField label="主行动按钮" value={values.primaryAction} onChange={(value) => setValue("primaryAction", value)} /><TextField label="次行动按钮" value={values.secondaryAction} onChange={(value) => setValue("secondaryAction", value)} /></div>
            <ToggleField label="显示运营数据" hint="在首页展示设备、客户与平台在线率" checked={values.showStats} onChange={(value) => setValue("showStats", value)} />
          </> : null}
          {section === "products" ? <>
            <TextField label="页面标题" value={values.title} onChange={(value) => setValue("title", value)} />
            <TextField label="页面介绍" value={values.subtitle} onChange={(value) => setValue("subtitle", value)} multiline />
            <Field className="setting-field"><FieldLabel>默认排序</FieldLabel><Select value={values.defaultSort} onValueChange={(value) => setValue("defaultSort", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="recommended">综合推荐</SelectItem><SelectItem value="yield">预期收益率</SelectItem><SelectItem value="price">租用价格</SelectItem><SelectItem value="compute">算力性能</SelectItem></SelectGroup></SelectContent></Select></Field>
            <div className="toggle-group"><ToggleField label="显示库存状态" hint="产品列表显示可租数量" checked={values.showAvailability} onChange={(value) => setValue("showAvailability", value)} /><ToggleField label="显示预估收益" hint="根据历史产出展示参考范围" checked={values.showEstimatedYield} onChange={(value) => setValue("showEstimatedYield", value)} /></div>
          </> : null}
          {section === "blog" ? <>
            <TextField label="首屏标题" value={values.title} onChange={(value) => setValue("title", value)} />
            <TextField label="首屏介绍" value={values.subtitle} onChange={(value) => setValue("subtitle", value)} multiline />
            <div className="field-row"><TextField label="精选标签" value={values.featuredLabel} onChange={(value) => setValue("featuredLabel", value)} /><TextField label="订阅标题" value={values.newsletterTitle} onChange={(value) => setValue("newsletterTitle", value)} /></div>
            <ToggleField label="显示邮件订阅" hint="在博客首页底部展示订阅表单" checked={values.showNewsletter} onChange={(value) => setValue("showNewsletter", value)} />
          </> : null}
        </div>
        <div className="settings-actions"><span>修改将保存到全站页面配置</span><Button size="sm" onClick={() => mutation.mutate(values)} disabled={mutation.isPending}><CheckCircle data-icon="inline-start" />{mutation.isPending ? "保存中..." : "保存并发布"}</Button></div>
      </section>
      <aside className="settings-preview">
        <div className="preview-heading"><span>桌面端预览</span><Badge variant="outline"><PencilSimple />实时</Badge></div>
        <div className={`preview-canvas preview-${section}`}>
          <div className="preview-browser"><i /><i /><i /><span>aetherlane.com</span></div>
          <div className="preview-content">
            {section === "navigation" ? <><div className="mini-nav"><b>◆ {values.siteName}</b><span>Home &nbsp; Products &nbsp; {values.showBlog ? "Blog" : ""}</span><button>{values.ctaText}</button></div><div className="mini-hero"><strong>Galaxy Compute</strong><small>Infrastructure that keeps earning.</small></div></> : null}
            {section === "footer" ? <><div className="mini-space" /><div className="mini-footer"><b>◆ Aether Lane</b><p>{values.description}</p><span>{values.email}</span><small>{values.copyright}</small></div></> : null}
            {section === "home" ? <div className="mini-home"><span>AETHER COMPUTE</span><strong>{values.title}</strong><p>{values.subtitle}</p><button>{values.primaryAction}</button></div> : null}
            {section === "products" ? <div className="mini-products"><strong>{values.title}</strong><p>{values.subtitle}</p><div>{["H800 80G", "A100 80G", "L40S 48G"].map((item) => <span key={item}><Cpu /><b>{item}</b><small>Available now</small></span>)}</div></div> : null}
            {section === "blog" ? <div className="mini-blog"><strong>{values.title}</strong><p>{values.subtitle}</p><div><span>{values.featuredLabel}</span><b>如何选择适合长期托管的 GPU？</b></div>{values.showNewsletter ? <button>{values.newsletterTitle}</button> : null}</div> : null}
          </div>
        </div>
      </aside>
    </div>
  );
}

export function DashboardPage({ pathname, user, onNavigate, onLogout, onNotice, notice }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const overview = useQuery({ queryKey: ["platform-overview"], queryFn: getPlatformOverview, staleTime: 60_000 });
  const data = overview.data ? {
    ...fallbackOverview,
    ...overview.data,
    metrics: fallbackOverview.metrics.map((metric, index) => ({ ...metric, ...overview.data.metrics?.[index] })),
    earnings: overview.data.earnings?.length ? overview.data.earnings : fallbackOverview.earnings,
    devices: overview.data.devices?.length ? overview.data.devices : fallbackOverview.devices,
    activity: overview.data.activity?.length ? overview.data.activity : fallbackOverview.activity,
  } : fallbackOverview;
  const settingSection = pathname.startsWith("/console/settings/") ? pathname.split("/").pop() : null;
  const [title, description] = pageMeta[pathname] ?? (settingSection ? [settingMeta[settingSection]?.title, settingMeta[settingSection]?.description] : ["控制台", ""]);

  return (
    <div className="console-shell">
      <aside className={`console-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="console-brand" onClick={() => onNavigate("/")}><span className="brand-mark"><i /><i /><i /><i /></span><strong>Aether Lane</strong></div>
        <Button className="console-sidebar-close" variant="ghost" size="icon-sm" onClick={() => setSidebarOpen(false)} aria-label="关闭菜单"><X /></Button>
        <nav>{navGroups.map((group) => <section key={group.label}><h2>{group.label}</h2>{group.items.map(({ path, label, icon: Icon }) => <Button variant="ghost" size="sm" className={pathname === path ? "active" : ""} key={path} onClick={() => { onNavigate(path); setSidebarOpen(false); }}><Icon data-icon="inline-start" /><span>{label}</span></Button>)}</section>)}</nav>
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
              <DropdownMenuTrigger asChild><Button className="console-profile" variant="ghost"><Avatar size="sm"><AvatarFallback>{user.username.slice(0, 1).toUpperCase()}</AvatarFallback></Avatar><div><strong>{user.username}</strong><small>算力资产用户</small></div><CaretDown data-icon="inline-end" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44"><DropdownMenuGroup><DropdownMenuItem onSelect={() => onNavigate("/")}><House />返回首页</DropdownMenuItem></DropdownMenuGroup><DropdownMenuSeparator /><DropdownMenuGroup><DropdownMenuItem variant="destructive" onSelect={onLogout}><SignOut />退出登录</DropdownMenuItem></DropdownMenuGroup></DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="console-content">
          {pathname === "/console" ? <Overview data={data} onNavigate={onNavigate} /> : null}
          {pathname === "/console/devices" ? <ListPage kind="devices" data={data} onNavigate={onNavigate} /> : null}
          {pathname === "/console/orders" ? <ListPage kind="orders" data={data} onNavigate={onNavigate} /> : null}
          {pathname === "/console/earnings" ? <FinancePage kind="earnings" /> : null}
          {pathname === "/console/transactions" ? <FinancePage kind="transactions" /> : null}
          {settingSection ? <SettingsPage section={settingSection} onNotice={onNotice} /> : null}
        </div>
      </main>
      {sidebarOpen ? <button className="console-overlay" onClick={() => setSidebarOpen(false)} aria-label="关闭菜单" /> : null}
      {notice ? <div className="toast" role="status">{notice}</div> : null}
    </div>
  );
}
