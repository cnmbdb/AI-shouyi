import { useEffect, useState } from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  CpuIcon,
  EyeIcon,
  EyeOffIcon,
  LockKeyholeIcon,
  MailIcon,
  ServerIcon,
  UserIcon,
  WalletCardsIcon,
} from "lucide-react";
import { Logo } from "../components/SiteChrome.jsx";
import { ThemeToggle } from "../components/ThemeProvider.jsx";
import {
  loadCurrentUser,
  loginAccount,
  logoutAccount,
  registerAccount,
  sendPasswordReset,
  updatePassword,
} from "../lib/auth.js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const modeCopy = {
  login: ["欢迎回来", "使用用户名或邮箱管理你的算力资产"],
  register: ["创建账号", "验证邮箱后即可登录并使用控制台"],
  forgot: ["找回密码", "输入注册邮箱，我们会发送重置链接"],
  update: ["设置新密码", "请输入新的登录密码"],
  verify: ["检查你的邮箱", "验证链接已发送，完成验证后即可登录"],
  resetSent: ["邮件已发送", "请打开邮件中的链接设置新密码"],
};

export function AuthPage({ pathname = "/auth", user, onSuccess, onNavigate }) {
  const recoveryRoute = pathname === "/auth/update-password";
  const [mode, setMode] = useState(recoveryRoute ? "update" : "login");
  const [identifier, setIdentifier] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (recoveryRoute) setMode("update");
  }, [recoveryRoute]);

  const changeMode = (value) => {
    setMode(value);
    setError("");
    setPassword("");
    setConfirmPassword("");
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      if (mode === "login") {
        if (!identifier.trim() || !password) throw new Error("请输入用户名或邮箱和密码");
        const result = await loginAccount({ identifier, password });
        onSuccess(result.user);
      }

      if (mode === "register") {
        if (!username.trim() || !email.trim() || !password) throw new Error("请填写用户名、邮箱和密码");
        if (username.trim().length < 2) throw new Error("用户名至少需要 2 个字符");
        if (username.trim().length > 32) throw new Error("用户名最多 32 个字符");
        if (/[\s@/]/.test(username.trim())) throw new Error("用户名不能包含空格、@ 或 /");
        if (!/^\S+@\S+\.\S+$/.test(email.trim())) throw new Error("请输入有效的邮箱地址");
        if (password.length < 6) throw new Error("密码至少需要 6 个字符");
        const data = await registerAccount({ username, email, password });
        if (data.session) {
          const result = await loadCurrentUser();
          onSuccess(result.user);
        } else {
          changeMode("verify");
        }
      }

      if (mode === "forgot") {
        if (!/^\S+@\S+\.\S+$/.test(email.trim())) throw new Error("请输入注册时使用的邮箱");
        await sendPasswordReset(email);
        changeMode("resetSent");
      }

      if (mode === "update") {
        if (password.length < 6) throw new Error("新密码至少需要 6 个字符");
        if (password !== confirmPassword) throw new Error("两次输入的密码不一致");
        await updatePassword(password);
        await logoutAccount();
        onNavigate("/auth");
        changeMode("login");
      }
    } catch (requestError) {
      setError(typeof requestError?.message === "string" && requestError.message.trim()
        ? requestError.message
        : "操作失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  };

  if (user && mode !== "update") {
    return (
      <main className="auth-page">
        <div className="auth-backdrop" aria-hidden="true" />
        <section className="auth-return">
          <CheckCircle2Icon />
          <h1>{new URLSearchParams(window.location.search).get("verified") === "1" ? "邮箱验证完成" : "你已登录"}</h1>
          <p>当前账号：{user.username}</p>
          <Button onClick={() => onNavigate("home")}>返回首页 <ArrowRightIcon data-icon="inline-end" /></Button>
        </section>
      </main>
    );
  }

  const [title, description] = modeCopy[mode] ?? modeCopy.login;
  const showTabs = mode === "login" || mode === "register";
  const showForm = ["login", "register", "forgot", "update"].includes(mode);

  return (
    <main className="auth-page">
      <div className="auth-backdrop" aria-hidden="true" />
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

      <Card className="auth-panel" aria-label={title}>
        <CardHeader>
          {showTabs ? (
            <Tabs value={mode} onValueChange={changeMode}>
              <TabsList className="auth-tabs"><TabsTrigger value="login">登录</TabsTrigger><TabsTrigger value="register">注册</TabsTrigger></TabsList>
            </Tabs>
          ) : null}
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>

        <CardContent>
          {showForm ? (
            <form onSubmit={submit}>
              <FieldGroup>
                {mode === "login" ? (
                  <Field>
                    <FieldLabel htmlFor="auth-identifier">用户名或邮箱</FieldLabel>
                    <InputGroup><InputGroupAddon><UserIcon /></InputGroupAddon><InputGroupInput id="auth-identifier" autoComplete="username" value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder="请输入用户名或邮箱" /></InputGroup>
                  </Field>
                ) : null}

                {mode === "register" ? (
                  <Field>
                    <FieldLabel htmlFor="auth-username">用户名</FieldLabel>
                    <InputGroup><InputGroupAddon><UserIcon /></InputGroupAddon><InputGroupInput id="auth-username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="例如 txsw，请勿填写邮箱" /></InputGroup>
                  </Field>
                ) : null}

                {mode === "register" || mode === "forgot" ? (
                  <Field>
                    <FieldLabel htmlFor="auth-email">邮箱</FieldLabel>
                    <InputGroup><InputGroupAddon><MailIcon /></InputGroupAddon><InputGroupInput id="auth-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" /></InputGroup>
                  </Field>
                ) : null}

                {mode === "login" || mode === "register" || mode === "update" ? (
                  <Field data-invalid={Boolean(error)}>
                    <FieldLabel htmlFor="auth-password">{mode === "update" ? "新密码" : "密码"}</FieldLabel>
                    <InputGroup><InputGroupAddon><LockKeyholeIcon /></InputGroupAddon><InputGroupInput id="auth-password" type={visible ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="至少 6 个字符" aria-invalid={Boolean(error)} /><InputGroupAddon align="inline-end"><InputGroupButton size="icon-xs" type="button" onClick={() => setVisible((value) => !value)} aria-label={visible ? "隐藏密码" : "显示密码"}>{visible ? <EyeOffIcon /> : <EyeIcon />}</InputGroupButton></InputGroupAddon></InputGroup>
                  </Field>
                ) : null}

                {mode === "update" ? (
                  <Field data-invalid={Boolean(error)}>
                    <FieldLabel htmlFor="auth-confirm-password">确认新密码</FieldLabel>
                    <InputGroup><InputGroupAddon><LockKeyholeIcon /></InputGroupAddon><InputGroupInput id="auth-confirm-password" type={visible ? "text" : "password"} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="再次输入新密码" aria-invalid={Boolean(error)} /></InputGroup>
                  </Field>
                ) : null}

                {error ? <FieldError>{error}</FieldError> : null}
                <Button className="auth-submit" type="submit" disabled={submitting}>
                  {submitting ? "正在处理..." : mode === "login" ? "登录" : mode === "register" ? "注册并发送验证邮件" : mode === "forgot" ? "发送重置邮件" : "更新密码"}
                  <ArrowRightIcon data-icon="inline-end" />
                </Button>
              </FieldGroup>
            </form>
          ) : (
            <div className="auth-email-state"><MailIcon /><p>邮件可能需要几分钟送达，请同时检查垃圾邮件文件夹。</p></div>
          )}
        </CardContent>

        <CardFooter className="auth-footer">
          {mode === "login" ? <><Button variant="link" size="xs" type="button" onClick={() => changeMode("forgot")}>忘记密码？</Button><span>还没有账号？</span><Button variant="link" size="xs" type="button" onClick={() => changeMode("register")}>立即注册</Button></> : null}
          {mode === "register" ? <><span>已有账号？</span><Button variant="link" size="xs" type="button" onClick={() => changeMode("login")}>直接登录</Button></> : null}
          {mode === "forgot" || mode === "verify" || mode === "resetSent" ? <Button variant="link" size="xs" type="button" onClick={() => changeMode("login")}>返回登录</Button> : null}
        </CardFooter>
      </Card>
    </main>
  );
}
