import { useEffect, useState } from "react";

const RENTER_MOBILE_BREAKPOINT = 1024;

/** Mobile layout for renter bookings — matches `lg:` desktop split (1024px). */
export function useRenterMobileLayout() {
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth < RENTER_MOBILE_BREAKPOINT : false
  );

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${RENTER_MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => setIsMobile(window.innerWidth < RENTER_MOBILE_BREAKPOINT);
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < RENTER_MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
