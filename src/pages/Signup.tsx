import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation, Link, useMatch } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { HeaderSettingsMenu } from "@/components/HeaderSettingsMenu";
import { SocialLoginButtons } from "@/components/SocialLoginButtons";
import {
  SignupContractCheckboxes,
  allContractsAccepted,
  contractAcceptPayload,
  emptyContractAcceptance,
} from "@/components/auth/SignupContractCheckboxes";
import { apiUrl } from "@/lib/auth";
import { readJsonOrThrow } from "@/lib/apiResponse";
import { guestSignupContracts, ownerSignupContracts } from "@/lib/appContracts";
import type { AppContractSlug } from "@/lib/appContracts";
import {
  brPhoneErrorKey,
  formatBrPhoneInput,
  validateBrPhone,
} from "@/lib/brPhone";

const Signup = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const isOwnerSignup = Boolean(useMatch("/signup/locador"));
  const from = (location.state as { from?: string } | null)?.from;
  const role = isOwnerSignup ? "locatario" : "banhista";
  const contracts = useMemo(
    () => (isOwnerSignup ? ownerSignupContracts() : guestSignupContracts()),
    [isOwnerSignup]
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [accepted, setAccepted] = useState(() => emptyContractAcceptance(contracts));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setAccepted(emptyContractAcceptance(contracts));
  }, [isOwnerSignup, contracts]);

  const contractsOk = allContractsAccepted(contracts, accepted);
  const canSubmit = contractsOk && !loading;

  const onContractChange = (slug: AppContractSlug, checked: boolean) => {
    setAccepted((prev) => ({ ...prev, [slug]: checked }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractsOk) {
      toast.error(t("signup.acceptRequired"));
      return;
    }
    const trimmedName = name.trim();
    if (trimmedName.split(/\s+/).filter(Boolean).length < 2) {
      toast.error(t("signup.fullNameRequired"));
      return;
    }
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast.error(t("signup.emailInvalid"));
      return;
    }
    const phoneResult = validateBrPhone(phone);
    if (!phoneResult.ok) {
      toast.error(t(brPhoneErrorKey(phoneResult.reason)));
      return;
    }
    if (password !== confirmPassword) {
      toast.error(t("signup.passwordMismatch"));
      return;
    }
    if (password.length < 6) {
      toast.error(t("signup.passwordShort"));
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch(apiUrl("/api/auth/signup"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          phone: phoneResult.digits,
          password,
          confirmPassword,
          role,
          ...contractAcceptPayload(contracts, accepted),
        }),
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new Error(text || t("signup.toastFail"));
      }
      const data = await readJsonOrThrow<{
        ok?: boolean;
        emailVerificationRequired?: boolean;
        email?: string;
      }>(resp, t("login.failUnavailable"));
      if (data.emailVerificationRequired) {
        toast.success(t("signup.toastVerify"));
        navigate(`/confirmar-email?email=${encodeURIComponent(data.email || trimmedEmail)}`, { replace: true });
        return;
      }
      toast.success(t("signup.toastOk"));
      navigate("/login", { replace: true, state: { from } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("signup.toastFail"));
    } finally {
      setLoading(false);
    }
  };

  const alternateSignupPath = isOwnerSignup ? "/signup" : "/signup/locador";
  const alternateSignupLabel = isOwnerSignup ? t("signup.switchToGuest") : t("signup.switchToOwner");

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="absolute top-4 right-4">
        <HeaderSettingsMenu />
      </div>
      <div className="surface-elevated w-full max-w-md rounded-xl p-6 space-y-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {isOwnerSignup ? t("signup.titleOwner") : t("signup.titleGuest")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isOwnerSignup ? t("signup.subtitleOwner") : t("signup.subtitleGuest")}
          </p>
        </div>

        <SocialLoginButtons
          from={from || (isOwnerSignup ? "/marinheiro" : "/")}
          role={role}
          disabled={loading || !contractsOk}
        />

        <form className="space-y-3" onSubmit={onSubmit}>
          <div className="space-y-1">
            <Label htmlFor="name">{t("signup.fullName")}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("signup.fullNamePh")}
              autoComplete="name"
              required
              minLength={3}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">{t("common.email")}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setEmail((v) => v.trim().toLowerCase())}
              placeholder="voce@exemplo.com"
              autoComplete="email"
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="phone">{t("signup.phone")}</Label>
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(formatBrPhoneInput(e.target.value))}
              placeholder={t("signup.phonePh")}
              autoComplete="tel"
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">{t("common.password")}</Label>
            <PasswordInput
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("signup.passwordPh")}
              autoComplete="new-password"
              visible={showPassword}
              onVisibleChange={setShowPassword}
              required
              minLength={6}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="confirmPassword">{t("signup.confirmPassword")}</Label>
            <PasswordInput
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t("signup.confirmPasswordPh")}
              autoComplete="new-password"
              visible={showPassword}
              onVisibleChange={setShowPassword}
              required
              minLength={6}
            />
          </div>

          <SignupContractCheckboxes
            contracts={contracts}
            accepted={accepted}
            onChange={onContractChange}
            disabled={loading}
          />

          <Button type="submit" className="w-full" disabled={!canSubmit}>
            {loading ? t("signup.submitting") : t("signup.submit")}
          </Button>
        </form>

        <p className="text-sm text-muted-foreground">
          {t("signup.hasAccount")}{" "}
          <Link
            className="text-primary font-semibold hover:underline"
            to="/login"
            state={isOwnerSignup ? { from: "/marinheiro" } : location.state}
          >
            {t("signup.login")}
          </Link>
        </p>

        <p className="text-sm text-center text-muted-foreground">
          <Link
            className="text-primary font-semibold hover:underline"
            to={alternateSignupPath}
            state={location.state}
          >
            {alternateSignupLabel}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
