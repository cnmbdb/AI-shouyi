import { useState } from "react";
import { ArrowLeftIcon, ArrowRightIcon, CheckCircle2Icon, CpuIcon, EyeIcon, EyeOffIcon, LockKeyholeIcon, ServerIcon, UserIcon, WalletCardsIcon } from "lucide-react";
import { Logo } from "../components/SiteChrome.jsx";
import { ThemeToggle } from "../components/ThemeProvider.jsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function AuthPage({ user, onSuccess, onNavigate }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!username.trim() || !password) {
      setError("请输入用户名和密码");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "操作失败");
      onSuccess(result.user);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (user) {
    return (
      <main className="auth-page">
        <section className="auth-return">
          <CheckCircle2Icon />
          <h1>你已登录</h1>
          <p>当前账号：{user.username}</p>
          <Button onClick={() => onNavigate("home")}>返回首页 <ArrowRightIcon data-icon="inline-end" /></Button>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <header className="auth-header">
        <Logo onNavigate={onNavigate} />
        <div className="auth-header-actions"><ThemeToggle /><Button className="auth-back" variant="ghost" size="sm" onClick={() => onNavigate("home")}><ArrowLeftIcon data-icon="inline-start" />返回首页</Button></div>
      </header>

      <section className="auth-intro">
        <h1>让每一份算力持续创造价值</h1>
        <p>租用高性能算力设备，托管至平台稳定运行，随时查看设备状态与收益明细。</p>
        <div className="auth-capabilities">
          <span><CpuIcon />算力设备租用</span>
          <span><ServerIcon />托管状态追踪</span>
          <span><WalletCardsIcon />收益结算明细</span>
        </div>
      </section>

      <Card className="auth-panel" aria-label={mode === "login" ? "登录" : "注册"}>
        <CardHeader>
          <Tabs value={mode} onValueChange={(value) => { setMode(value); setError(""); }}>
            <TabsList className="auth-tabs"><TabsTrigger value="login">登录</TabsTrigger><TabsTrigger value="register">注册</TabsTrigger></TabsList>
          </Tabs>
          <CardTitle>{mode === "login" ? "欢迎回来" : "创建账号"}</CardTitle>
          <CardDescription>{mode === "login" ? "登录后继续管理你的算力资产" : "无需验证，注册后即可登录"}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="auth-username">用户名</FieldLabel>
                <InputGroup><InputGroupAddon><UserIcon /></InputGroupAddon><InputGroupInput id="auth-username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="请输入用户名" /></InputGroup>
              </Field>
              <Field data-invalid={Boolean(error)}>
                <FieldLabel htmlFor="auth-password">密码</FieldLabel>
                <InputGroup><InputGroupAddon><LockKeyholeIcon /></InputGroupAddon><InputGroupInput id="auth-password" type={visible ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="请输入密码" aria-invalid={Boolean(error)} /><InputGroupAddon align="inline-end"><InputGroupButton size="icon-xs" onClick={() => setVisible((value) => !value)} aria-label={visible ? "隐藏密码" : "显示密码"}>{visible ? <EyeOffIcon /> : <EyeIcon />}</InputGroupButton></InputGroupAddon></InputGroup>
                {error ? <FieldError>{error}</FieldError> : null}
              </Field>
              <Button className="auth-submit" type="submit" disabled={submitting}>{submitting ? "正在处理..." : mode === "login" ? "登录" : "注册并登录"}<ArrowRightIcon data-icon="inline-end" /></Button>
            </FieldGroup>
          </form>
        </CardContent>
        <CardFooter className="auth-footer"><span>{mode === "login" ? "还没有账号？" : "已有账号？"}</span><Button variant="link" size="xs" type="button" onClick={() => setMode(mode === "login" ? "register" : "login")}>{mode === "login" ? "立即注册" : "直接登录"}</Button></CardFooter>
      </Card>
    </main>
  );
}
