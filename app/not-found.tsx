import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import { resolveRoute } from "./lib/resolve-route";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

// Pages served from this domain but built elsewhere (see the deploy workflow).
const externalRoutes = ["lunon-living-report"];

// Every top-level page, read from app/ when the 404 page is built.
function siteRoutes() {
  const app = join(process.cwd(), "app");
  const routes = readdirSync(app, { withFileTypes: true })
    .filter(function isPage(entry) {
      return (
        entry.isDirectory() &&
        ["page.tsx", "page.jsx", "page.ts", "page.js"].some(function hasPage(file) {
          return existsSync(join(app, entry.name, file));
        })
      );
    })
    .map(function slug(entry) {
      return entry.name;
    });

  return routes.concat(externalRoutes).sort();
}

const linkClass =
  "rounded-[3px] font-medium text-[#111] underline decoration-black/25 underline-offset-[3px] transition-[text-decoration-color] duration-200 hover:decoration-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black motion-reduce:transition-none";

export default function NotFound() {
  // GitHub Pages serves this page for any path it can't find. Before anything paints,
  // work out which page a mangled link meant ("/plurise)", "/Linkedin-nav") and go there.
  // The message stays hidden while that happens, so a redirect never flashes "not found".
  const redirect = `(function () {
  var resolveRoute = ${resolveRoute.toString()};
  var target = resolveRoute(location.pathname, ${JSON.stringify(siteRoutes())});
  if (target && target !== location.pathname) {
    document.documentElement.setAttribute("data-redirecting", "");
    location.replace(target + location.search + location.hash);
  }
})();`;

  return (
    <main className="min-h-screen bg-[#f4f4f1] font-sans text-[#111] selection:bg-black selection:text-white">
      <script dangerouslySetInnerHTML={{ __html: redirect }} />

      <section className="mx-auto flex min-h-screen max-w-[1200px] flex-col justify-center px-5 pb-24 sm:px-8 [[data-redirecting]_&]:invisible">
        <p className="mb-5 text-[12px] font-medium tracking-[-0.01em] text-[#60605c]">
          404
        </p>

        <h1 className="max-w-[680px] text-[clamp(2rem,4vw,3.25rem)] font-medium leading-[1.03] tracking-[-0.05em]">
          This page doesn&rsquo;t exist.
        </h1>

        <p className="mt-5 max-w-[580px] text-[14px] leading-[1.7] tracking-[-0.01em] text-[#5f5f5b]">
          The link may be mistyped or cut short. Everything I&rsquo;ve built is on
          the{" "}
          <Link href="/" className={linkClass}>
            home page
          </Link>{" "}
          and in the{" "}
          <Link href="/lab/" className={linkClass}>
            lab
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
