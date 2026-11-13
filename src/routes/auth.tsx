import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { sendPhoneCode, verifyPhoneCode } from "@/lib/phone-auth.functions";
import { PhoneInput } from "@/components/PhoneInput";
import { requestEmailSignupCode, verifyEmailSignupCode } from "@/lib/email-signup.functions";
import { useEffect, useState } from "react";
import { Languages, Loader2, PhoneCall, MessageSquare } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { POST_AUTH_KEY } from "@/lib/post-auth";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AUTH_COPY } from "@/lib/auth-i18n";
import {
  AUTH_LANGS as LANDING_LANGS,
  AUTH_LANG_LABELS as LANDING_LANG_LABELS,
  detectAuthLang as detectLandingLang,
  saveAuthLang as saveLandingLang,
  type AuthLang as LandingLang,
} from "@/lib/auth-i18n";

/** Apple logo, inline SVG (Lucide doesn't ship it). */
function AppleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08ZM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25Z" />
    </svg>
  );
}

/** Microsoft logo, four squares, inline SVG (Lucide doesn't ship it). */
function MicrosoftIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 21 21" className={className} aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#f35325" />
      <rect x="11" y="1" width="9" height="9" fill="#81bc06" />
      <rect x="1" y="11" width="9" height="9" fill="#05a6f0" />
      <rect x="11" y="11" width="9" height="9" fill="#ffba08" />
    </svg>
  );
}

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Accedi — TraduChat" },
      {
        name: "description",
        content:
          "Accedi a TraduChat per ritrovare le tue conversazioni tradotte e lo storico delle tue traduzioni.",
      },
      { property: "og:title", content: "Accedi — TraduChat" },
      {
        property: "og:description",
        content:
          "Entra con il tuo numero di telefono e un codice via SMS: ritrovi conversazioni e traduzioni salvate.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

type Mode = "phone" | "signup" | "password" | "reset";

function AuthPage() {
  const navigate = useNavigate();
  const sendSmsFn = useServerFn(sendPhoneCode);
  const verifySmsFn = useServerFn(verifyPhoneCode);
  const signupCodeFn = useServerFn(requestEmailSignupCode);
  const verifySignupCodeFn = useServerFn(verifyEmailSignupCode);
  const [mode, setMode] = useState<Mode>("phone");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [phoneChannel, setPhoneChannel] = useState<"sms" | "call">("sms");
  const [resetStep, setResetStep] = useState<"email" | "code" | "phone" | "password">("email");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [lang, setLang] = useState<LandingLang>("it");
  useEffect(() => {
    setLang(detectLandingLang());
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const t = AUTH_COPY[lang];

  useEffect(() => {
    // Recovery links return here with a session in the URL. Handle them before
    // the ordinary signed-in redirect can take the person away from this form.
    const isRecoveryLink = new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery"
      || new URLSearchParams(window.location.search).get("type") === "recovery";
    if (isRecoveryLink) {
      setMode("reset");
    }
    /** After login, resume a pending QR connection when one was stored. */
    const goAfterLogin = () => {
      const pending = sessionStorage.getItem(POST_AUTH_KEY);
      if (pending && (pending.startsWith("/connetti/") || pending.startsWith("/community-join?"))) {
        sessionStorage.removeItem(POST_AUTH_KEY);
        window.location.replace(pending);
        return;
      }
      void navigate({ to: "/app", replace: true });
    };
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active || !data.session) return;
      if (isRecoveryLink) setResetStep("password");
      else if (mode !== "reset") goAfterLogin();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("reset");
        setResetStep("password");
      } else if (event === "SIGNED_IN" && session) {
        if (isRecoveryLink) setResetStep("password");
        else if (mode !== "reset") goAfterLogin();
      }
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate, mode]);

  function switchMode(m: Mode) {
    setMode(m);
    setCodeSent(false);
    setCode("");
    setPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setResetStep("email");
  }

  /** Sends a 6-digit code by email so the person can set a new password. */
  async function sendResetCode() {
    if (busy) return;
    if (!email.trim()) {
      toast.error(t.errEmail);
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) throw error;
      setResetStep("code");
      setCode("");
      toast.success(t.okEmailCode);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.errSend);
    } finally {
      setBusy(false);
    }
  }

  async function verifyResetCode() {
    if (busy) return;
    const token = code.trim();
    if (!/^\d{6}$/.test(token)) {
      toast.error(t.errEmailCode);
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token,
        type: "recovery",
      });
      if (error) throw error;
      setResetStep("password");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.errCode);
    } finally {
      setBusy(false);
    }
  }

  async function saveNewPassword() {
    if (busy) return;
    if (newPassword.length < 8) {
      toast.error(t.errNew8);
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t.errMatch);
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success(t.okPassword);
      void navigate({ to: "/app", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.errChange);
    } finally {
      setBusy(false);
    }
  }

  /** Sends a code by SMS or automated voice call to the phone number typed above. */
  async function sendPhone(channel: "sms" | "call") {
    if (busy) return;
    if (phone.trim().length < 6) {
      toast.error(t.errPhone);
      return;
    }
    setBusy(true);
    try {
      const result = await sendSmsFn({ data: { phone: phone.trim(), channel, locale: lang } });
      setPhone(result.phone);
      setPhoneChannel(channel);
      setCodeSent(true);
      setCode("");
      toast.success(channel === "call" ? t.okCall : t.okSms);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.errSend);
    } finally {
      setBusy(false);
    }
  }

  /** Recovers the password through a voice-call code for an existing phone account. */
  async function verifyResetPhone() {
    if (busy) return;
    const token = code.trim();
    if (!/^\d{6}$/.test(token)) {
      toast.error(t.errPhoneCode);
      return;
    }
    setBusy(true);
    try {
      const creds = await verifySmsFn({ data: { phone: phone.trim(), code: token, recoverOnly: true } });
      const { error } = await supabase.auth.signInWithPassword(creds);
      if (error) throw error;
      setCodeSent(false);
      setResetStep("password");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.errCode);
    } finally {
      setBusy(false);
    }
  }

  /** Checks the phone code and opens the session for that phone number. */
  async function verifyPhone() {
    if (busy) return;
    const token = code.trim();
    if (!/^\d{6}$/.test(token)) {
      toast.error(t.errPhoneCode);
      return;
    }
    setBusy(true);
    try {
      const { email: loginEmail, password: loginPassword } = await verifySmsFn({
        data: { phone: phone.trim(), code: token },
      });
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });
      if (error) throw error;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.errCode);
    } finally {
      setBusy(false);
    }
  }

  /** Sends an 8-digit code by email so the person can confirm the new account. */
  async function submitSignup() {
    if (busy) return;
    if (phone.replace(/\D/g, "").length < 6) {
      toast.error(t.errPhone);
      return;
    }
    if (!email.trim() || password.length < 8) {
      toast.error(t.errSignup);
      return;
    }
    setBusy(true);
    try {
      await signupCodeFn({ data: { email: email.trim(), password, phone: phone.trim() } });
      setCodeSent(true);
      setCode("");
      toast.success(t.okSignup);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.errSignupFail);
    } finally {
      setBusy(false);
    }
  }

  /** Checks the 8-digit code, creates the account and opens the session. */
  async function verifySignup() {
    if (busy) return;
    const token = code.trim();
    if (!/^\d{6}$/.test(token)) {
      toast.error(t.errSignupCode);
      return;
    }
    setBusy(true);
    try {
      await verifySignupCodeFn({
        data: { email: email.trim(), code: token, password, phone: phone.trim() },
      });
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.errCode);
    } finally {
      setBusy(false);
    }
  }

  async function submitPassword() {
    if (busy) return;
    if (!email.trim() || password.length < 6) {
      toast.error(t.errLogin6);
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.errLogin);
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw result.error;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.errGoogle);
    }
  }

  async function apple() {
    try {
      const result = await lovable.auth.signInWithOAuth("apple", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(
          result.error instanceof Error ? result.error.message : t.errApple,
        );
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.errApple);
    }
  }

  async function microsoft() {
    try {
      const result = await lovable.auth.signInWithOAuth("microsoft", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(
          result.error instanceof Error
            ? result.error.message
            : t.errMicrosoft,
        );
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.errMicrosoft);
    }
  }

  return (
    <main translate="no" dir={lang === "ar" ? "rtl" : "ltr"} className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-10">
      <Toaster position="top-center" />

      <header className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground bubble-shadow">
          <Languages className="size-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl">TraduChat</h1>
          <p className="text-sm text-muted-foreground">
            {t.subtitle}
          </p>
        </div>
        <label className="ms-auto flex shrink-0 items-center gap-1 rounded-full border border-border bg-card px-2">
          <Languages className="size-4 text-muted-foreground" aria-hidden />
          <select
            aria-label="Lingua / Language"
            value={lang}
            onChange={(e) => {
              const next = e.target.value as LandingLang;
              setLang(next);
              saveLandingLang(next);
            }}
            className="h-9 bg-transparent pr-1 text-sm text-foreground outline-none"
          >
            {LANDING_LANGS.map((l) => (
              <option key={l} value={l}>
                {LANDING_LANG_LABELS[l]}
              </option>
            ))}
          </select>
        </label>
      </header>

      <section className="mt-6 rounded-3xl surface-card p-5">
        <div className="grid grid-cols-2 gap-2">
          {(["phone", "signup", "password", "reset"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              className={cn(
                "rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                mode === m
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-secondary",
              )}
            >
              {m === "phone"
                ? t.tabPhone
                : m === "signup"
                  ? t.tabSignup
                  : m === "password"
                    ? t.tabPassword
                    : t.tabReset}
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-4">
          {mode !== "phone" && mode !== "reset" && (
            <div className="space-y-1.5">
              <Label htmlFor="email">{lang === "ar" ? "البريد الإلكتروني" : "Email"}</Label>
              <Input
                id="email"
                type="email"
                dir="ltr"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@esempio.it"
              />
            </div>
          )}

          {mode === "phone" ? (
            <>
              {!codeSent ? (
                <div className="space-y-1.5">
                  <Label htmlFor="phone">{t.phoneLabel}</Label>
                  <PhoneInput id="phone" lang={lang} value={phone} onChange={setPhone} onEnter={() => void sendPhone("sms")} />
                  <p className="text-xs text-muted-foreground">
                     {t.phoneHint}
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                   <Label htmlFor="code">{phoneChannel === "call" ? t.codeByCall : t.codeBySms}</Label>
                  <Input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    onKeyDown={(e) => {
                       if (e.key === "Enter") void verifyPhone();
                    }}
                    placeholder="123456"
                  />
                  <p className="text-xs text-muted-foreground">
                     {phoneChannel === "call" ? t.willCall : t.smsSent} <strong>{phone}</strong>.
                  </p>
                </div>
              )}

              <Button
                 onClick={() => void (codeSent ? verifyPhone() : sendPhone("sms"))}
                disabled={busy}
                className="w-full"
              >
                {busy && <Loader2 className="size-4 animate-spin" />}
                {codeSent ? t.verifyLogin : t.sendSms}
              </Button>

              <Button
                type="button"
                variant="secondary"
                onClick={() => void sendPhone("call")}
                disabled={busy}
                className="w-full"
              >
                <PhoneCall className="size-4" />
                {codeSent ? t.codeViaCall : t.getCall}
              </Button>

              {codeSent && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => void sendPhone("sms")}
                  disabled={busy}
                  className="w-full"
                >
                  <MessageSquare className="size-4" />
                  {t.resendSms}
                </Button>
              )}
            </>
          ) : mode === "signup" ? (
            <>
              {!codeSent && (
                <div className="space-y-1.5">
                  <Label htmlFor="signup-phone">{t.phoneLabel}</Label>
                  <PhoneInput id="signup-phone" lang={lang} value={phone} onChange={setPhone} />
                </div>
              )}
              {!codeSent ? (
                <div className="space-y-1.5">
                  <Label htmlFor="signup-password">{t.choosePassword}</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void submitSignup();
                    }}
                    placeholder={t.min8}
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="signup-code">{t.code6}</Label>
                  <Input
                    id="signup-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void verifySignup();
                    }}
                    placeholder="123456"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t.codeSentTo6} <strong>{email}</strong>.
                  </p>
                </div>
              )}
              <Button
                onClick={() => void (codeSent ? verifySignup() : submitSignup())}
                disabled={busy}
                className="w-full"
              >
                {busy && <Loader2 className="size-4 animate-spin" />}
                {codeSent ? t.confirmLogin : t.createAccount}
              </Button>
              {codeSent && (
                <button
                  type="button"
                  onClick={() => void submitSignup()}
                  disabled={busy}
                  className="w-full text-center text-sm text-accent underline-offset-4 hover:underline disabled:opacity-50"
                >
                  {t.resend}
                </button>
              )}
            </>
          ) : mode === "password" ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void submitPassword();
                  }}
                  placeholder={t.yourPassword}
                />
              </div>

              <Button onClick={() => void submitPassword()} disabled={busy} className="w-full">
                {busy && <Loader2 className="size-4 animate-spin" />}
                {t.login}
              </Button>

              <button
                type="button"
                onClick={() => switchMode("reset")}
                className="w-full text-center text-sm text-accent underline-offset-4 hover:underline"
              >
                {t.forgot}
              </button>
            </>
          ) : (
            <>
              {resetStep === "email" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="reset-email">{lang === "ar" ? "البريد الإلكتروني" : "Email"}</Label>
                    <Input id="reset-email" type="email" dir="ltr" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@esempio.it" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t.resetIntro}
                  </p>
                  <Button onClick={() => void sendResetCode()} disabled={busy} className="w-full">
                    {busy && <Loader2 className="size-4 animate-spin" />}
                    {t.sendCode}
                  </Button>
                  <p className="text-sm text-muted-foreground">{t.noPassword}</p>
                  <Button type="button" variant="secondary" className="w-full" onClick={() => { setCodeSent(false); setCode(""); setResetStep("phone"); }}>
                    <PhoneCall className="size-4" />
                    {t.getCall}
                  </Button>
                </>
              )}

              {resetStep === "code" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="reset-code">{t.emailCode}</Label>
                    <Input
                      id="reset-code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      onPaste={(e) => {
                        e.preventDefault();
                        setCode(e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void verifyResetCode();
                      }}
                      placeholder="123456"
                    />
                    <p className="text-xs text-muted-foreground">
                      {t.codeSentTo} <strong>{email}</strong>.
                    </p>
                  </div>
                  <Button onClick={() => void verifyResetCode()} disabled={busy} className="w-full">
                    {busy && <Loader2 className="size-4 animate-spin" />}
                    {t.verifyCode}
                  </Button>
                  <button
                    type="button"
                    onClick={() => void sendResetCode()}
                    disabled={busy}
                    className="w-full text-center text-sm text-accent underline-offset-4 hover:underline disabled:opacity-50"
                  >
                    {t.resend}
                  </button>
                </>
              )}

              {resetStep === "phone" && (
                <>
                  {!codeSent ? (
                    <div className="space-y-1.5">
                      <Label htmlFor="reset-phone">{t.phoneLabel}</Label>
                      <PhoneInput id="reset-phone" lang={lang} value={phone} onChange={setPhone} />
                      <p className="text-xs text-muted-foreground">{t.phoneHint}</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label htmlFor="reset-phone-code">{t.codeByCall}</Label>
                      <Input id="reset-phone-code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        onKeyDown={(e) => { if (e.key === "Enter") void verifyResetPhone(); }} placeholder="123456" />
                      <p className="text-xs text-muted-foreground">{t.willCall} <strong>{phone}</strong>.</p>
                    </div>
                  )}
                  <Button onClick={() => void (codeSent ? verifyResetPhone() : sendPhone("call"))} disabled={busy} className="w-full">
                    {busy ? <Loader2 className="size-4 animate-spin" /> : <PhoneCall className="size-4" />}
                    {codeSent ? t.verifyCode : t.getCall}
                  </Button>
                  {codeSent && (
                    <button type="button" onClick={() => void sendPhone("call")} disabled={busy}
                      className="w-full text-center text-sm text-accent underline-offset-4 hover:underline disabled:opacity-50">
                      {t.codeViaCall}
                    </button>
                  )}
                  <button type="button" onClick={() => { setCodeSent(false); setResetStep("email"); }}
                    className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline">
                    {lang === "ar" ? "البريد الإلكتروني" : "Email"}
                  </button>
                </>
              )}

              {resetStep === "password" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="new-password">{t.newPassword}</Label>
                    <Input
                      id="new-password"
                      type="password"
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={t.min8}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirm-password">{t.repeatNew}</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void saveNewPassword();
                      }}
                      placeholder={t.repeat}
                    />
                  </div>
                  <Button onClick={() => void saveNewPassword()} disabled={busy} className="w-full">
                    {busy && <Loader2 className="size-4 animate-spin" />}
                    {t.savePassword}
                  </Button>
                </>
              )}
            </>
          )}

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> {t.or}{" "}
            <span className="h-px flex-1 bg-border" />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="secondary" className="w-full" onClick={() => void google()}>
              {t.google}
            </Button>
            <Button variant="secondary" className="w-full" onClick={() => void apple()}>
              <AppleIcon className="size-4" />
              {t.apple}
            </Button>
            <Button
              variant="secondary"
              className="w-full sm:col-span-2"
              onClick={() => void microsoft()}
            >
              <MicrosoftIcon className="size-4" />
              {t.microsoft}
            </Button>
          </div>
        </div>
      </section>

      <p className="mt-6 text-center text-sm">
        <Link to="/" className="text-accent underline-offset-4 hover:underline">
          {t.back}
        </Link>
      </p>
    </main>
  );
}
