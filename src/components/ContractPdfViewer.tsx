import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Document, Page, pdfjs } from "react-pdf";
import { ExternalLink, FileWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

type ContractPdfViewerProps = {
  url: string;
  title: string;
  className?: string;
};

export function ContractPdfViewer({ url, title, className }: ContractPdfViewerProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageWidth, setPageWidth] = useState(0);
  const [numPages, setNumPages] = useState(0);

  const updateWidth = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const styles = getComputedStyle(el);
    const paddingX =
      parseFloat(styles.paddingLeft || "0") + parseFloat(styles.paddingRight || "0");
    setPageWidth(Math.max(280, Math.floor(el.clientWidth - paddingX)));
  }, []);

  useEffect(() => {
    updateWidth();
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(updateWidth);
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateWidth]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "rounded-2xl border border-border/50 bg-muted/25 px-3 py-4 sm:px-5 sm:py-6",
        className
      )}
    >
      <Document
        file={url}
        loading={
          <div className="flex min-h-[50vh] items-center justify-center">
            <p className="text-sm text-muted-foreground">{t("ajuda.pdfLoading")}</p>
          </div>
        }
        error={
          <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-4 text-center">
            <FileWarning className="h-8 w-8 text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">{t("ajuda.pdfError")}</p>
            <Button asChild size="sm" variant="outline">
              <a href={url} target="_blank" rel="noopener noreferrer">
                {t("ajuda.openPdf")}
                <ExternalLink className="ml-1.5 h-3.5 w-3.5" aria-hidden />
              </a>
            </Button>
          </div>
        }
        onLoadSuccess={({ numPages: total }) => setNumPages(total)}
      >
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4">
          {Array.from({ length: numPages }, (_, index) => (
            <div
              key={`page-${index + 1}`}
              className="w-full overflow-hidden rounded-lg bg-white shadow-[0_8px_30px_rgba(0,0,0,0.08)] ring-1 ring-black/5"
            >
              <Page
                pageNumber={index + 1}
                width={pageWidth || undefined}
                renderAnnotationLayer={false}
                renderTextLayer={false}
                loading={
                  <div
                    className="w-full animate-pulse bg-muted/40"
                    style={{ aspectRatio: "210 / 297", maxWidth: pageWidth || 320 }}
                  />
                }
              />
            </div>
          ))}
        </div>
      </Document>

      {numPages > 0 ? (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          {t("ajuda.pdfPages", { count: numPages })}
        </p>
      ) : null}
    </div>
  );
}
