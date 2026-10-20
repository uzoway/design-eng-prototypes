import type { Metadata } from "next";
import { LabProject } from "../components/portfolio/lab-project";
import { SiteFooter } from "../components/portfolio/site-footer";
import { SiteHeader } from "../components/portfolio/site-header";
import { prototypes } from "./prototypes";

const title = "Lab";

const description =
  "Every prototype by Uzo Okafor: small product ideas and interaction studies, built to production quality.";

export const metadata: Metadata = {
  title,
  description,

  alternates: {
    canonical: "/lab",
  },

  openGraph: {
    title: `${title} — Uzo Okafor`,
    description,
    type: "website",
    url: "/lab",
    siteName: "Uzo Okafor",
    locale: "en_US",
    images: [
      {
        url: "/og.png?v=2",
        width: 2400,
        height: 1260,
        alt: "Uzo Okafor — Design Engineer portfolio",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: `${title} — Uzo Okafor`,
    description,
    creator: "@uzodev",
    images: ["/og.png?v=2"],
  },
};

export default function LabPage() {
  return (
    <main className="min-h-screen bg-[#f4f4f1] font-sans text-[#111] selection:bg-black selection:text-white">
      <SiteHeader page="lab" />

      <div className="mx-auto max-w-[1200px] px-5 pb-8 pt-[68px] sm:px-8">
        <section className="flex min-h-[260px] max-w-[720px] flex-col justify-end pb-12 pt-16 sm:min-h-[320px] sm:pb-16">
          <p className="mb-5 text-[12px] font-medium tracking-[-0.01em] text-[#60605c]">
            Lab
          </p>

          <h1 className="max-w-[680px] text-[clamp(2rem,4vw,3.25rem)] font-medium leading-[1.03] tracking-[-0.05em]">
            Prototypes
          </h1>

          <p className="mt-5 max-w-[580px] text-[14px] leading-[1.7] tracking-[-0.01em] text-[#5f5f5b]">
            Small product ideas and interaction studies, built to production
            quality.
          </p>
        </section>

        <section
          aria-labelledby="all-prototypes-title"
          className="border-t border-black/10 pb-28 pt-6"
        >
          <div className="mb-12 flex items-center justify-between">
            <h2
              id="all-prototypes-title"
              className="text-[13px] font-medium tracking-[-0.015em]"
            >
              All prototypes
            </h2>

            <span className="text-[11px] text-[#686864]">
              {prototypes.length}, newest first
            </span>
          </div>

          <div className="grid gap-x-6 gap-y-14 md:grid-cols-2">
            {prototypes.map(function renderPrototype(prototype, index) {
              return (
                <LabProject
                  key={prototype.slug}
                  prototype={prototype}
                  index={index}
                />
              );
            })}
          </div>

          <p className="mt-20 text-center text-[12.5px] leading-[1.65] text-[#5f5f5b]">
            I share new ones on{" "}
            <a
              href="https://x.com/uzodev"
              target="_blank"
              rel="noopener noreferrer"
              className="mx-px rounded-[4px] px-[3px] font-medium text-[#111] underline decoration-black/25 underline-offset-[3px] transition-[text-decoration-color] duration-200 hover:decoration-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black motion-reduce:transition-none"
            >
              X<span className="sr-only"> (opens in a new tab)</span>
            </a>{" "}
            as I build them.
          </p>
        </section>

        <SiteFooter />
      </div>
    </main>
  );
}
