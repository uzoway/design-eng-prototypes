"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const prototypes = [
  {
    slug: "photo-pager",
    title: "Photo pager",
    description:
      "A tactile photo browser with gesture-led navigation, strict tab-trapping, and a precise sense of spatial position.",
    disciplines: ["Interaction", "Motion"],
  },
  {
    slug: "grid-to-detail",
    title: "Grid to detail",
    description:
      "A fluid layout projection from a responsive grid into a focused view, utilizing spring-based cubic-bezier easing curves.",
    disciplines: ["Prototyping", "Layout"],
  },
  {
    slug: "merchant-onboarding",
    title: "Merchant onboarding",
    description:
      "A review workflow that makes verification status clear. Built with clean DOM structures and ARIA-compliant state management.",
    disciplines: ["Product design", "Fintech"],
  },
  {
    slug: "currency-converter",
    title: "Currency converter",
    description:
      "A conversion flow designed to make rates and fees transparent before commitment. Fast, accessible, and responsive.",
    disciplines: ["Product design", "Fintech"],
  },
];

const techStack = [
  "TypeScript",
  "React & Next.js",
  "Framer Motion",
  "GSAP",
  "Tailwind CSS",
  "Figma",
  "Webflow",
];

const externalLinks = [
  { label: "X", href: "https://x.com/uzodev" },
  { label: "GitHub", href: "https://github.com/uzoway" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/uzochukwuokafor/" },
  { label: "Webflow Sites", href: "http://uzo-okafor.webflow.io/" },
];

export default function Home() {
  return (
    <motion.main
      initial={{ opacity: 0, filter: "blur(8px)", y: 10 }}
      animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="min-h-screen bg-[#0a0a0a] text-neutral-200 selection:bg-neutral-800 selection:text-white"
    >
      <div className="max-w-2xl mx-auto px-6 py-24 md:py-32 flex flex-col gap-24">
        <section className="space-y-8">
          <header className="flex justify-between items-center text-sm font-medium tracking-tight text-neutral-500">
            <Link
              href="/"
              className="text-white hover:text-neutral-300 transition-colors"
            >
              Uzo Okafor
            </Link>
            <span>Web Design Engineer</span>
          </header>

          <div className="space-y-6 text-lg leading-relaxed tracking-tight text-neutral-300">
            <p>
              I design and engineer interfaces for the web. Currently focused on
              building tactile, high-performance financial products where the
              micro-interactions matter as much as the architecture.
            </p>
            <p className="text-neutral-500">
              Whether I'm tuning spring animations, ensuring strict WCAG
              accessibility, or refining a component's state machine, my goal is
              to close the gap between design intent and production code. I
              leverage AI tools like Claude and ChatGPT to ship precise, fluid
              experiences at speed.
            </p>
          </div>
        </section>

        <section className="space-y-8">
          <div className="flex justify-between items-end border-b border-neutral-800 pb-4">
            <h2 className="text-sm font-medium tracking-tight text-neutral-500">
              Selected Work
            </h2>
            <span className="text-sm font-mono text-neutral-600">2026</span>
          </div>

          <div className="flex flex-col">
            {prototypes.map((prototype) => (
              <Link
                key={prototype.slug}
                href={`/${prototype.slug}`}
                className="group relative border-b border-neutral-800/50 py-6 last:border-0 block"
              >
                <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-2 md:gap-6 relative z-10">
                  <h3 className="text-base font-medium transition-colors text-neutral-200 group-hover:text-white">
                    {prototype.title}
                  </h3>
                  <div className="flex gap-3 text-xs font-medium font-mono text-neutral-600">
                    {prototype.disciplines.map((d) => (
                      <span key={d}>{d}</span>
                    ))}
                  </div>
                </div>
                <p className="mt-2 text-sm text-neutral-500 max-w-md relative z-10 transition-colors group-hover:text-neutral-400">
                  {prototype.description}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-sm font-medium tracking-tight text-neutral-500 border-b border-neutral-800 pb-4">
            Toolkit
          </h2>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-neutral-400 font-mono tracking-tight">
            {techStack.map((tech) => (
              <li key={tech}>{tech}</li>
            ))}
          </ul>
        </section>

        <footer className="space-y-8 pt-12">
          <h2 className="text-sm font-medium tracking-tight text-neutral-500">
            Let's talk
          </h2>

          <div className="flex flex-col md:flex-row justify-between gap-6 pt-8 border-t border-neutral-800 text-sm font-medium">
            <a
              href="mailto:uzochukwuokafor01@gmail.com"
              className="text-neutral-400 hover:text-white transition-colors"
            >
              uzochukwuokafor01@gmail.com
            </a>

            <nav className="flex flex-wrap gap-6">
              {externalLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-neutral-400 hover:text-white transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>
        </footer>
      </div>
    </motion.main>
  );
}
