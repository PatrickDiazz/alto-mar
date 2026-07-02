import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { PageLoader } from "@/components/PageLoader";
import { getStoredUser } from "@/lib/auth";
import { ownerRequiresStripeOnboarding } from "@/lib/ownerStripeConnect";

export function RequireOwnerStripeConnect() {
  const { pathname } = useLocation();
  const user = getStoredUser();
  const [checking, setChecking] = useState(user?.role === "locatario");
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    if (user?.role !== "locatario") {
      setChecking(false);
      return;
    }
    let active = true;
    void (async () => {
      try {
        const required = await ownerRequiresStripeOnboarding();
        if (active) setNeedsOnboarding(required);
      } finally {
        if (active) setChecking(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user?.role, pathname]);

  if (user?.role !== "locatario") {
    return <Outlet />;
  }

  if (checking) {
    return <PageLoader />;
  }

  if (needsOnboarding) {
    return <Navigate to="/marinheiro/stripe" replace state={{ from: pathname }} />;
  }

  return <Outlet />;
}
