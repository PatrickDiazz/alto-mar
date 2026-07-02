import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { authFetch } from "@/lib/auth";
import { readResponseErrorMessage } from "@/lib/responseError";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { HeaderSettingsMenu } from "@/components/HeaderSettingsMenu";
import type { MarinheiroRecord } from "@/lib/marinheiroTypes";
import { marinheiroStatusLabel, marinheiroStatusVariant } from "@/lib/marinheiroLabels";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function TripulanteProfilePage() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<MarinheiroRecord | null>(null);
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [identityDocUrl, setIdentityDocUrl] = useState("");
  const [nauticalCertUrl, setNauticalCertUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    authFetch("/api/marinheiro/me")
      .then(async (resp) => {
        if (!resp.ok) throw new Error(await readResponseErrorMessage(resp, t("crew.loadFail")));
        const data = (await resp.json()) as { marinheiro: MarinheiroRecord };
        if (!active) return;
        const m = data.marinheiro;
        setProfile(m);
        setPhone(m.phone);
        setBio(m.bio ?? "");
        setPhotoUrl(m.photoUrl);
        setIdentityDocUrl(m.identityDocUrl);
        setNauticalCertUrl(m.nauticalCertUrl);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : t("crew.loadFail")))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [t]);

  const save = async () => {
    setSaving(true);
    try {
      const resp = await authFetch("/api/marinheiro/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, bio, photoUrl, identityDocUrl, nauticalCertUrl }),
      });
      if (!resp.ok) throw new Error(await readResponseErrorMessage(resp, t("crew.saveFail")));
      const data = (await resp.json()) as { marinheiro: MarinheiroRecord };
      setProfile(data.marinheiro);
      toast.success(t("crew.saveOk"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("crew.saveFail"));
    } finally {
      setSaving(false);
    }
  };

  const onFile = async (file: File | undefined, setter: (v: string) => void) => {
    if (!file) return;
    try {
      setter(await fileToDataUrl(file));
    } catch {
      toast.error(t("crew.fileReadFail"));
    }
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <Button asChild variant="ghost" size="sm">
          <Link to="/tripulante">{t("common.back")}</Link>
        </Button>
        <h1 className="text-lg font-bold text-foreground">{t("crew.portalProfile")}</h1>
        <HeaderSettingsMenu />
      </header>
      <main className="mx-auto max-w-lg space-y-4 px-4 py-4">
        {loading || !profile ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : (
          <>
            <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", marinheiroStatusVariant(profile.approvalStatus))}>
              {marinheiroStatusLabel(t, profile.approvalStatus)}
            </span>
            <div className="space-y-2">
              <Label>{t("crew.phone")}</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("crew.bio")}</Label>
              <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>{t("crew.photo")}</Label>
              <Input type="file" accept="image/*" onChange={(e) => void onFile(e.target.files?.[0], setPhotoUrl)} />
            </div>
            <div className="space-y-2">
              <Label>{t("crew.identityDoc")}</Label>
              <Input type="file" accept="image/*,application/pdf" onChange={(e) => void onFile(e.target.files?.[0], setIdentityDocUrl)} />
            </div>
            <div className="space-y-2">
              <Label>{t("crew.nauticalCert")}</Label>
              <Input type="file" accept="image/*,application/pdf" onChange={(e) => void onFile(e.target.files?.[0], setNauticalCertUrl)} />
            </div>
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? t("common.loading") : t("common.save")}
            </Button>
          </>
        )}
      </main>
    </div>
  );
}
