import { useEffect, useRef, useState } from "react";
import { Camera, KeyRound, LoaderCircle, Trash2, UserRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { changeAccountPassword, deleteAccountAvatar, updateAccountProfile, uploadAccountAvatar } from "@/lib/auth.js";

export function AccountSettingsPage({ user, onUserUpdated, onNotice }) {
  const avatarInputRef = useRef(null);
  const localPreviewRef = useRef("");
  const [displayName, setDisplayName] = useState(user.display_name || user.username);
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url || "");
  const [avatarColor, setAvatarColor] = useState(user.avatar_color || "#525252");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(user.avatar_url || "");
  const [profileError, setProfileError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => () => {
    if (localPreviewRef.current) URL.revokeObjectURL(localPreviewRef.current);
  }, []);

  const selectAvatar = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (localPreviewRef.current) URL.revokeObjectURL(localPreviewRef.current);
    localPreviewRef.current = URL.createObjectURL(file);
    setAvatarFile(file);
    setAvatarRemoved(false);
    setAvatarPreview(localPreviewRef.current);
    setProfileError("");
    event.target.value = "";
  };

  const removeAvatar = () => {
    if (localPreviewRef.current) URL.revokeObjectURL(localPreviewRef.current);
    localPreviewRef.current = "";
    setAvatarFile(null);
    setAvatarUrl("");
    setAvatarPreview("");
    setAvatarRemoved(true);
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setProfileError("");
    setSavingProfile(true);
    try {
      const nextAvatarUrl = avatarFile ? await uploadAccountAvatar(avatarFile) : avatarUrl;
      if (avatarRemoved && !avatarFile) await deleteAccountAvatar();
      const result = await updateAccountProfile({ displayName, avatarUrl: nextAvatarUrl, avatarColor });
      setAvatarFile(null);
      setAvatarRemoved(false);
      setAvatarUrl(result.user.avatar_url || "");
      setAvatarPreview(result.user.avatar_url || "");
      onUserUpdated(result.user);
      onNotice("账户资料已更新");
    } catch (error) {
      setProfileError(error.message || "账户资料保存失败");
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (event) => {
    event.preventDefault();
    setPasswordError("");
    if (!currentPassword) return setPasswordError("请输入当前密码");
    if (newPassword.length < 6) return setPasswordError("新密码至少需要 6 个字符");
    if (newPassword !== confirmPassword) return setPasswordError("两次输入的新密码不一致");

    setSavingPassword(true);
    try {
      await changeAccountPassword({ email: user.email, currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onNotice("密码已更新");
    } catch (error) {
      setPasswordError(error.message || "密码更新失败");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="account-settings-page">
      <Card className="account-card">
        <CardHeader>
          <CardTitle><UserRound />个人资料</CardTitle>
          <CardDescription>修改公开显示名称、头像和头像背景色。</CardDescription>
        </CardHeader>
        <form onSubmit={saveProfile}>
          <CardContent className="account-card-content">
            <div className="account-avatar-row">
              <Avatar className="account-avatar-preview">
                {avatarPreview ? <AvatarImage src={avatarPreview} alt={`${displayName || user.username} 的头像`} /> : null}
                <AvatarFallback style={{ backgroundColor: avatarColor, color: "white" }}>{user.username.slice(0, 1).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="account-avatar-actions">
                <input ref={avatarInputRef} className="account-avatar-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" tabIndex={-1} aria-hidden="true" onChange={selectAvatar} />
                <div><Button type="button" variant="outline" size="sm" onClick={() => avatarInputRef.current?.click()}><Camera />选择头像</Button><Button type="button" variant="ghost" size="sm" disabled={!avatarPreview} onClick={removeAvatar}><Trash2 />移除</Button></div>
                <small>JPG、PNG、WebP、GIF 或 AVIF，最大 3 MB</small>
              </div>
            </div>
            <FieldGroup>
              <div className="account-field-grid">
                <Field><FieldLabel htmlFor="account-username">登录用户名</FieldLabel><Input id="account-username" value={user.username} readOnly disabled /><FieldDescription>用户名用于登录，当前不可自行修改。</FieldDescription></Field>
                <Field><FieldLabel htmlFor="account-email">验证邮箱</FieldLabel><Input id="account-email" type="email" value={user.email || ""} readOnly disabled /><FieldDescription>邮箱由 Supabase Auth 验证。</FieldDescription></Field>
              </div>
              <div className="account-field-grid account-field-grid-profile">
                <Field><FieldLabel htmlFor="account-display-name">显示名称</FieldLabel><Input id="account-display-name" value={displayName} maxLength={80} onChange={(event) => setDisplayName(event.target.value)} placeholder="请输入显示名称" /></Field>
                <Field><FieldLabel htmlFor="account-avatar-color">头像背景色</FieldLabel><div className="account-color-control"><Input id="account-avatar-color" type="color" value={avatarColor} onChange={(event) => setAvatarColor(event.target.value)} /><Input value={avatarColor} maxLength={7} onChange={(event) => setAvatarColor(event.target.value)} aria-label="头像背景色值" /></div></Field>
              </div>
              {profileError ? <FieldError>{profileError}</FieldError> : null}
            </FieldGroup>
          </CardContent>
          <CardFooter className="account-card-footer"><span>更新后会同步显示在控制台和公开页头像菜单。</span><Button type="submit" size="sm" disabled={savingProfile}>{savingProfile ? <LoaderCircle className="account-spinner" /> : null}{savingProfile ? "保存中..." : "保存资料"}</Button></CardFooter>
        </form>
      </Card>

      <Card className="account-card account-security-card">
        <CardHeader>
          <CardTitle><KeyRound />修改密码</CardTitle>
          <CardDescription>验证当前密码后设置新的登录密码。</CardDescription>
        </CardHeader>
        <form onSubmit={savePassword}>
          <CardContent className="account-card-content">
            <FieldGroup>
              <Field><FieldLabel htmlFor="account-current-password">当前密码</FieldLabel><Input id="account-current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></Field>
              <Field><FieldLabel htmlFor="account-new-password">新密码</FieldLabel><Input id="account-new-password" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="至少 6 个字符" /></Field>
              <Field><FieldLabel htmlFor="account-confirm-password">确认新密码</FieldLabel><Input id="account-confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></Field>
              {passwordError ? <FieldError>{passwordError}</FieldError> : null}
            </FieldGroup>
          </CardContent>
          <CardFooter className="account-card-footer"><span>密码不会显示或保存在站点数据库中。</span><Button type="submit" size="sm" disabled={savingPassword}>{savingPassword ? <LoaderCircle className="account-spinner" /> : null}{savingPassword ? "更新中..." : "更新密码"}</Button></CardFooter>
        </form>
      </Card>
    </div>
  );
}
