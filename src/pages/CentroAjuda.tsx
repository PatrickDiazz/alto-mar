import { lazy, Suspense } from "react";
import { Link, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ChevronRight, Download, ExternalLink, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeaderSettingsMenu } from "@/components/HeaderSettingsMenu";
import { AppVersionStamp } from "@/components/AppVersionStamp";
import {
  getAppContract,
  helpIndexContracts,
  isAppContractSlug,
  ownerHelpContracts,
  type AppContractSlug,
} from "@/lib/appContracts";
import { APP_SUPPORT_EMAIL, APP_SUPPORT_MAILTO } from "@/lib/appContact";

const ContractPdfViewer = lazy(() =>
  import("@/components/ContractPdfViewer").then((m) => ({ default: m.ContractPdfViewer }))
);

function ContractListItem({ contract, to }: { contract: ReturnType<typeof getAppContract>; to: string }) {
  const { t } = useTranslation();
  if (!contract) return null;

  return (
    <Link
      to={to}
      className="flex items-center gap-3 py-3.5 -mx-1 px-1 hover:bg-muted/40 transition-colors rounded-md"
    >
      <FileText className="w-4 h-4 shrink-0 text-primary" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{t(contract.titleKey)}</p>
        <p className="text-xs text-muted-foreground">{t(contract.updatedKey)}</p>
      </div>
      <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  );
}

function HelpIndex() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const ownerContracts = ownerHelpContracts();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="text-foreground hover:text-primary transition-colors shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-foreground truncate">{t("ajuda.title")}</h1>
          </div>
          <HeaderSettingsMenu />
        </div>
      </header>

      <div className="max-w-2xl mx-auto w-full flex-1 px-4 py-5 space-y-6">
        <p className="text-sm text-muted-foreground leading-relaxed">{t("ajuda.intro")}</p>

        <nav aria-label={t("ajuda.title")} className="border-y border-border divide-y divide-border">
          {helpIndexContracts().map((contract) => (
            <ContractListItem key={contract.slug} contract={contract} to={`/ajuda/${contract.slug}`} />
          ))}
          {ownerContracts.length > 0 ? (
            <>
              <div className="py-3.5">
                <h2 className="text-sm font-semibold text-foreground">{t("ajuda.ownerSectionTitle")}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{t("ajuda.ownerSectionDesc")}</p>
              </div>
              {ownerContracts.map((contract) => (
                <ContractListItem key={contract.slug} contract={contract} to={`/ajuda/${contract.slug}`} />
              ))}
            </>
          ) : null}
        </nav>

        <div className="border-t border-border pt-5 space-y-2">
          <h2 className="text-sm font-semibold text-foreground">{t("ajuda.contactTitle")}</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">{t("ajuda.contactDesc")}</p>
          <a
            href={APP_SUPPORT_MAILTO}
            className="inline-flex text-sm font-medium text-primary hover:underline"
          >
            {APP_SUPPORT_EMAIL}
          </a>
        </div>
      </div>

      <div className="flex shrink-0 justify-center pb-4 pt-2">
        <AppVersionStamp />
      </div>
    </div>
  );
}

function HelpContractDetail({ slug }: { slug: AppContractSlug }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const contract = getAppContract(slug);
  if (!contract) return <Navigate to="/ajuda" replace />;

  const title = t(contract.titleKey);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate("/ajuda")}
              className="text-foreground hover:text-primary transition-colors shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-foreground truncate">{title}</h1>
          </div>
          <HeaderSettingsMenu />
        </div>
      </header>

      <article className="max-w-3xl mx-auto w-full flex-1 px-4 py-5 space-y-5">
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{t(contract.updatedKey)}</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{t(contract.descKey)}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button asChild size="sm" variant="outline">
              <a href={contract.pdfUrl} target="_blank" rel="noopener noreferrer">
                {t("ajuda.openPdf")}
                <ExternalLink className="ml-1.5 h-3.5 w-3.5" aria-hidden />
              </a>
            </Button>
            <Button asChild size="sm" variant="ghost">
              <a href={contract.pdfUrl} download>
                <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                {t("ajuda.downloadPdf")}
              </a>
            </Button>
          </div>
        </div>

        <Suspense
          fallback={
            <div className="flex min-h-[50vh] items-center justify-center rounded-2xl border border-border/50 bg-muted/25">
              <p className="text-sm text-muted-foreground">{t("ajuda.pdfLoading")}</p>
            </div>
          }
        >
          <ContractPdfViewer url={contract.pdfUrl} title={title} />
        </Suspense>
      </article>

      <div className="flex shrink-0 justify-center pb-4 pt-2">
        <AppVersionStamp />
      </div>
    </div>
  );
}

function HelpContractRoute() {
  const { slug } = useParams<{ slug: string }>();
  if (!isAppContractSlug(slug)) return <Navigate to="/ajuda" replace />;
  return <HelpContractDetail slug={slug} />;
}

const CentroAjuda = () => (
  <Routes>
    <Route index element={<HelpIndex />} />
    <Route path=":slug" element={<HelpContractRoute />} />
  </Routes>
);

export default CentroAjuda;
