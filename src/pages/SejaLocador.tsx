import type { SVGProps } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import { Anchor, ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppVersionStamp } from "@/components/AppVersionStamp";
import { HeaderSettingsMenu } from "@/components/HeaderSettingsMenu";
import { getStoredUser } from "@/lib/auth";
import { cn } from "@/lib/utils";
import yacht from "@/assets/seja-locador-yacht.png";
import captain from "@/assets/seja-locador-captain.png";
import logoLight from "@/assets/logo-altomar-light.png";
import logoDark from "@/assets/logo-altomar-dark.png";

const MARINHEIRO_FROM = "/marinheiro" as const;

/** Revela ao entrar na viewport — só anima abaixo de `lg`; desktop usa `lg:` estático. */
function useScrollRevealMaxLg() {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRevealed(true);
      return;
    }
    if (window.matchMedia("(min-width: 1024px)").matches) return;

    const obs = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setRevealed(true);
          obs.disconnect();
        }
      },
      { root: null, rootMargin: "72px 0px -3% 0px", threshold: 0.02 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return { ref, revealed } as const;
}

function scrollRevealClasses(revealed: boolean, stagger = false) {
  return cn(
    "translate-y-2 opacity-0 transition-[opacity,transform] duration-reveal ease-reveal",
    stagger && "delay-150",
    "motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none motion-reduce:delay-0",
    revealed && "translate-y-0 opacity-100",
    "lg:translate-y-0 lg:opacity-100 lg:transition-none lg:delay-0"
  );
}

/** Ícone decorativo (sem link). */
function IconInstagram(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <path d="M17.5 6.5h.01" />
    </svg>
  );
}

function IconFacebook(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

/** Logo X (Twitter) — marca preenchida oficial. */
function IconX(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export default function SejaLocador() {
  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();
  const navigate = useNavigate();
  const user = getStoredUser();
  const footerLogo = resolvedTheme === "dark" ? logoDark : logoLight;

  const year = useMemo(() => new Date().getFullYear(), []);

  const goPrimary = useCallback(() => {
    if (user?.role === "locatario") {
      navigate(MARINHEIRO_FROM);
      return;
    }
    navigate("/signup", { state: { from: MARINHEIRO_FROM } });
  }, [navigate, user]);

  const goLogin = useCallback(() => {
    navigate("/login", { state: { from: MARINHEIRO_FROM } });
  }, [navigate]);

  const bullets = [
    t("sejaLocador.bulletCrew"),
    t("sejaLocador.bulletDocs"),
    t("sejaLocador.bulletEarn"),
  ] as const;

  const inactiveTitle = t("sejaLocador.footerInactiveHint");

  const revealCard = useScrollRevealMaxLg();
  const revealFooterA = useScrollRevealMaxLg();
  const revealFooterB = useScrollRevealMaxLg();

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-background">
      <div className="absolute right-4 top-4 z-50 sm:right-6 sm:top-6">
        <HeaderSettingsMenu />
      </div>

      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-4 pb-12 pt-[max(4.75rem,env(safe-area-inset-top,0px)+3.25rem)] sm:pb-16 sm:pt-24 lg:pb-20 lg:pt-24">
        {/* Iate decorativo — centro da hero (só md+), atrás do texto e do cartão. */}
        <div
          className="pointer-events-none absolute left-[10%] top-[60%] z-[1] hidden md:block"
          aria-hidden
        >
          <div
            className={cn(
              "h-[clamp(15rem,34vmin,26rem)] w-[min(58vw,600px)] lg:h-[clamp(17rem,32vmin,30rem)] lg:w-[min(50vw,680px)]",
              "motion-safe:animate-seja-locador-boat-float motion-reduce:animate-none"
            )}
          >
            <img
              src={yacht}
              alt=""
              width={1024}
              height={1024}
              className={cn(
                "h-full w-full object-contain object-center [backface-visibility:hidden]",
                "drop-shadow-[0_28px_48px_rgba(15,23,42,0.22)] dark:drop-shadow-[0_32px_56px_rgba(0,0,0,0.55)]",
                "contrast-[1.06] saturate-[1.08] dark:brightness-[1.12]"
              )}
              decoding="async"
              draggable={false}
            />
          </div>
        </div>

        <div className="relative z-[2] grid w-full grid-cols-1 gap-12 lg:grid-cols-2 lg:items-start lg:gap-14 xl:gap-16">
          <div className="flex min-w-0 flex-col">
            <Button variant="ghost" size="sm" className="-ml-2 mb-5 w-fit gap-2 text-muted-foreground" asChild>
              <Link to="/explorar">
                <ArrowLeft className="h-4 w-4" aria-hidden />
                {t("sejaLocador.backExplorar")}
              </Link>
            </Button>

            <h1 className="font-heading text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-[2.25rem] lg:leading-tight">
              {t("sejaLocador.heroTitle")}
            </h1>
            <p className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t("sejaLocador.heroLead")}
            </p>
          </div>

          <div
            ref={revealCard.ref}
            className={cn(
              "flex justify-center lg:sticky lg:top-24 lg:justify-end lg:self-start",
              scrollRevealClasses(revealCard.revealed)
            )}
          >
            <Card className="w-full max-w-md border border-primary/12 bg-card shadow-elevated dark:border-primary/20">
              <CardHeader className="space-y-3 pb-2">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/12 text-primary">
                  <Anchor className="h-5 w-5" strokeWidth={2.25} aria-hidden />
                </div>
                <CardTitle className="font-heading text-xl sm:text-2xl">{t("sejaLocador.cardTitle")}</CardTitle>
                <CardDescription className="text-base leading-relaxed">{t("sejaLocador.cardIntro")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-2">
                <ul className="space-y-4">
                  {bullets.map((text) => (
                    <li key={text} className="flex gap-3 text-sm leading-relaxed text-foreground sm:text-[15px]">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                        <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
                      </span>
                      <span className="text-pretty">{text}</span>
                    </li>
                  ))}
                </ul>

                <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap">
                  <Button className="w-full sm:flex-1" type="button" onClick={goPrimary}>
                    {user?.role === "locatario" ? t("sejaLocador.ctaPanel") : t("sejaLocador.ctaSignup")}
                  </Button>
                  {user?.role !== "locatario" ? (
                    <Button type="button" variant="outline" className="w-full sm:flex-1" onClick={goLogin}>
                      {t("sejaLocador.ctaLogin")}
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <footer className="relative z-20 mt-auto border-t border-border/80 bg-muted/25 backdrop-blur-[1px] dark:bg-muted/15">
        <div className="relative z-[1] mx-auto max-w-6xl px-4 pb-6 pt-[max(2.75rem,env(safe-area-inset-bottom,0px)+1rem)] md:pb-10 md:pt-10">
          <img
            src={captain}
            alt=""
            width={1024}
            height={1024}
            className={cn(
              "pointer-events-none absolute bottom-full left-4 z-10 hidden h-44 w-auto max-w-[min(88vw,260px)] translate-y-px select-none object-contain object-bottom [backface-visibility:hidden] lg:block",
              "sm:h-52 sm:max-w-[min(80vw,280px)]",
              "md:left-4 md:h-[min(19rem,min(36vh,22rem))] md:max-w-[min(46vw,300px)]"
            )}
            decoding="async"
            draggable={false}
            aria-hidden
          />
          <div className="grid gap-8 sm:gap-10 md:grid-cols-2 md:items-start">
            <div ref={revealFooterA.ref} className={cn("min-w-0", scrollRevealClasses(revealFooterA.revealed))}>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <img
                  src={footerLogo}
                  alt=""
                  width={320}
                  height={96}
                  className="h-9 w-auto max-w-[min(100%,200px)] shrink-0 object-contain object-left sm:h-10 sm:max-w-[min(100%,240px)]"
                  decoding="async"
                  draggable={false}
                  aria-hidden
                />
                <p className="font-heading text-lg font-semibold tracking-tight text-foreground">Alto Mar</p>
              </div>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">{t("sejaLocador.footerTagline")}</p>
            </div>
            <div
              ref={revealFooterB.ref}
              className={cn("flex flex-col gap-4 md:items-end md:text-right", scrollRevealClasses(revealFooterB.revealed, true))}
            >
              <Link to="/explorar" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
                {t("sejaLocador.footerExploreLink")}
              </Link>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end md:flex-col md:items-end">
                <div
                  role="group"
                  className="flex items-center gap-3 text-muted-foreground/75"
                  title={inactiveTitle}
                  aria-label={t("sejaLocador.footerSocialAria")}
                >
                  <span className="sr-only">{t("sejaLocador.footerInactiveHint")}</span>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background/80">
                    <IconInstagram className="h-[1.125rem] w-[1.125rem]" />
                  </span>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background/80">
                    <IconFacebook className="h-[1.125rem] w-[1.125rem]" />
                  </span>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background/80">
                    <IconX className="h-[1.05rem] w-[1.05rem]" />
                  </span>
                </div>

                <span
                  role="presentation"
                  className="inline-flex cursor-default rounded-md border border-dashed border-border/70 bg-muted/20 px-2.5 py-1 text-sm text-muted-foreground"
                  title={inactiveTitle}
                >
                  {t("sejaLocador.footerFaqDecorative")}
                </span>
              </div>

              <p className="text-xs leading-relaxed text-muted-foreground">{t("sejaLocador.footerRights", { year })}</p>
              <AppVersionStamp className="md:ml-auto" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
