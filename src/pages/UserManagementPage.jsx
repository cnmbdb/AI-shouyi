import { useDeferredValue, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { SearchIcon, ShieldCheckIcon, UserRoundCheckIcon, UsersIcon } from "lucide-react";
import { getAdminUsers, updateAdminUserRole } from "../lib/adminUsers.js";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const roleLabel = { admin: "管理员", user: "普通用户" };

const formatDate = (value) => value
  ? new Date(value).toLocaleString("zh-CN", { dateStyle: "short", timeStyle: "short", hour12: false })
  : "—";

export function UserManagementPage({ currentUser, onNotice }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const usersQuery = useQuery({
    queryKey: ["admin-users"],
    queryFn: getAdminUsers,
    staleTime: 30_000,
  });

  const roleMutation = useMutation({
    mutationFn: updateAdminUserRole,
    onSuccess: (_, variables) => {
      queryClient.setQueryData(["admin-users"], (current) => current ? {
        ...current,
        users: current.users.map((user) => user.id === variables.userId ? { ...user, role: variables.role } : user),
      } : current);
      onNotice("用户角色已更新");
    },
    onError: (error) => onNotice(error.message),
  });
  const pendingUserId = roleMutation.isPending ? roleMutation.variables?.userId : null;

  const users = usersQuery.data?.users ?? [];
  const filteredUsers = useMemo(() => {
    if (!deferredSearch) return users;
    return users.filter((user) => [user.username, user.displayName, user.email]
      .some((value) => value?.toLowerCase().includes(deferredSearch)));
  }, [deferredSearch, users]);

  const columns = useMemo(() => [
    {
      accessorKey: "username",
      header: "用户",
      cell: ({ row }) => (
        <div className="admin-user-identity">
          <Avatar size="sm"><AvatarFallback>{row.original.username.slice(0, 1).toUpperCase()}</AvatarFallback></Avatar>
          <div><strong>{row.original.displayName || row.original.username}</strong><small>{row.original.email}</small></div>
          {row.original.id === currentUser.id ? <Badge variant="outline">当前账号</Badge> : null}
        </div>
      ),
    },
    {
      accessorKey: "role",
      header: "角色",
      cell: ({ row }) => {
        const pending = pendingUserId === row.original.id;
        return (
          <Select
            value={row.original.role}
            disabled={pending || row.original.id === currentUser.id}
            onValueChange={(role) => roleMutation.mutate({ userId: row.original.id, role })}
          >
            <SelectTrigger size="sm" aria-label={`设置 ${row.original.username} 的角色`}><SelectValue /></SelectTrigger>
            <SelectContent><SelectGroup><SelectItem value="user">普通用户</SelectItem><SelectItem value="admin">管理员</SelectItem></SelectGroup></SelectContent>
          </Select>
        );
      },
    },
    {
      accessorKey: "emailConfirmed",
      header: "邮箱状态",
      cell: ({ getValue }) => <Badge variant={getValue() ? "secondary" : "outline"}>{getValue() ? "已验证" : "待验证"}</Badge>,
    },
    { accessorKey: "createdAt", header: "注册时间", cell: ({ getValue }) => formatDate(getValue()) },
    { accessorKey: "lastSignInAt", header: "最近登录", cell: ({ getValue }) => formatDate(getValue()) },
  ], [currentUser.id, pendingUserId, roleMutation.mutate]);

  const table = useReactTable({ data: filteredUsers, columns, getCoreRowModel: getCoreRowModel() });
  const adminCount = users.filter((user) => user.role === "admin").length;
  const confirmedCount = users.filter((user) => user.emailConfirmed).length;

  return (
    <div className="admin-users-page">
      <section className="admin-user-metrics" aria-label="用户统计">
        <Card size="sm"><CardHeader><CardDescription>全部用户</CardDescription><CardTitle>{users.length}</CardTitle><CardAction><UsersIcon /></CardAction></CardHeader></Card>
        <Card size="sm"><CardHeader><CardDescription>管理员</CardDescription><CardTitle>{adminCount}</CardTitle><CardAction><ShieldCheckIcon /></CardAction></CardHeader></Card>
        <Card size="sm"><CardHeader><CardDescription>已验证邮箱</CardDescription><CardTitle>{confirmedCount}</CardTitle><CardAction><UserRoundCheckIcon /></CardAction></CardHeader></Card>
      </section>

      <Card className="admin-users-card">
        <CardHeader className="border-b">
          <CardTitle>用户列表</CardTitle>
          <CardDescription>查看平台账号并管理用户角色</CardDescription>
          <CardAction>
            <InputGroup className="admin-user-search"><InputGroupAddon><SearchIcon /></InputGroupAddon><InputGroupInput aria-label="搜索用户" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索用户名或邮箱" /></InputGroup>
          </CardAction>
        </CardHeader>
        <CardContent className="admin-users-table-wrap">
          <Table>
            <TableHeader>{table.getHeaderGroups().map((group) => <TableRow key={group.id}>{group.headers.map((header) => <TableHead key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</TableHead>)}</TableRow>)}</TableHeader>
            <TableBody>
              {usersQuery.isLoading ? Array.from({ length: 3 }, (_, index) => <TableRow key={index}>{columns.map((column, cellIndex) => <TableCell key={`${column.accessorKey}-${cellIndex}`}><Skeleton className="h-6 w-full" /></TableCell>)}</TableRow>) : null}
              {usersQuery.isError ? <TableRow><TableCell colSpan={columns.length}><p className="admin-users-message" role="alert">{usersQuery.error.message}</p></TableCell></TableRow> : null}
              {!usersQuery.isLoading && !usersQuery.isError ? table.getRowModel().rows.map((row) => <TableRow key={row.id}>{row.getVisibleCells().map((cell) => <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}</TableRow>) : null}
              {!usersQuery.isLoading && !usersQuery.isError && !table.getRowModel().rows.length ? <TableRow><TableCell colSpan={columns.length}><p className="admin-users-message">没有匹配的用户</p></TableCell></TableRow> : null}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter><span>共 {users.length} 个账号，当前显示 {filteredUsers.length} 个</span><span>当前管理员不能取消自己的权限</span></CardFooter>
      </Card>
    </div>
  );
}
