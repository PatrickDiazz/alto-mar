import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  OWNER_PANEL_BODY_LAYOUT,
  ownerPanelMaxWidthClass,
  ownerPanelPageClass,
  ownerPanelPageHeaderClass,
  ownerPanelSubtitleClass,
  ownerPanelTitleClass,
  ownerPanelTitleFromPath,
  ownerPanelTitleRowClass,
  ownerPanelToolbarRowClass,
  ownerPanelWidthFromPath,
  type OwnerPanelBodyLayout,
  type OwnerPanelWidth,
} from "@/lib/ownerPanelLayout";

export function OwnerPanelPage({
  title,
  subtitle,
  meta,
  toolbar,
  actions,
  bodyLayout = "stack",
  bodyClassName,
  width,
  className,
  children,
}: {
  title?: string;
  subtitle?: ReactNode;
  meta?: ReactNode;
  toolbar?: ReactNode;
  actions?: ReactNode;
  bodyLayout?: OwnerPanelBodyLayout;
  bodyClassName?: string;
  width?: OwnerPanelWidth;
  className?: string;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const resolvedWidth = width ?? ownerPanelWidthFromPath(pathname);
  const resolvedTitle = title ?? ownerPanelTitleFromPath(pathname, t);
  const actionsInTitleRow = Boolean(actions && !toolbar);

  return (
    <div className={cn(ownerPanelPageClass, ownerPanelMaxWidthClass(resolvedWidth), className)}>
      <header className={ownerPanelPageHeaderClass}>
        <div className={ownerPanelTitleRowClass}>
          <h1 className={ownerPanelTitleClass}>{resolvedTitle}</h1>
          {actionsInTitleRow ? <div className="shrink-0">{actions}</div> : null}
        </div>

        {subtitle ? (
          typeof subtitle === "string" ? (
            <p className={ownerPanelSubtitleClass}>{subtitle}</p>
          ) : (
            subtitle
          )
        ) : null}

        {meta}

        {toolbar || (actions && toolbar) ? (
          <div className={ownerPanelToolbarRowClass}>
            {toolbar ? <div className="min-w-0 flex-1">{toolbar}</div> : null}
            {actions && toolbar ? <div className="shrink-0">{actions}</div> : null}
          </div>
        ) : null}
      </header>

      <div className={cn(OWNER_PANEL_BODY_LAYOUT[bodyLayout], bodyClassName)}>{children}</div>
    </div>
  );
}
