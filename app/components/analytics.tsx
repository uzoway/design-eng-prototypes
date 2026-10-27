"use client";

import { GoogleAnalytics } from "@next/third-parties/google";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export const GA_ID = "G-B5TC8LLC20";

// Routes that promise visitors nothing is collected. They must never load or
// fire analytics, including after a client-side navigation from another page.
const UNTRACKED_ROUTES = ["/plurise"];

export function isUntrackedRoute(pathname: string | null) {
  return UNTRACKED_ROUTES.some(
    (route) => pathname === route || pathname?.startsWith(route + "/"),
  );
}

export function Analytics() {
  const pathname = usePathname();
  // Local interaction reviews must never contribute to the live analytics.
  // The flag below also silences a tag loaded before a development HMR update.
  const untracked = process.env.NODE_ENV !== "production" || isUntrackedRoute(pathname);

  useEffect(() => {
    // gtag checks this flag before every hit, so it also silences a tag that
    // was already loaded by an earlier page.
    (window as unknown as Record<string, boolean>)[`ga-disable-${GA_ID}`] = untracked;
  }, [untracked]);

  return untracked ? null : <GoogleAnalytics gaId={GA_ID} />;
}
