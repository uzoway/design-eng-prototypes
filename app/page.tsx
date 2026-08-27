"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

const websites = [
  {
    href: "https://www.oun.homes/",
    title: "Oun Homes",
    description:
      "A product marketing site for an AI real estate platform, turning a complex transaction workflow into a clear, focused story.",
    disciplines: ["Product marketing", "Proptech"],
  },
  {
    href: "https://www.genyro.com/",
    title: "Genyro",
    description:
      "A biotech site that explains programmable DNA construction through structured storytelling, restrained motion, and a clear visual hierarchy.",
    disciplines: ["Interaction", "Biotech"],
  },
  {
    href: "https://www.mailatafamilyfoundation.org/",
    title: "Mailata Family Foundation",
    description:
      "A story-led nonprofit site that brings the foundation's mission, programmes, and community work together in a responsive, media-rich experience.",
    disciplines: ["Storytelling", "Nonprofit"],
  },
  {
    href: "https://dtiglobal.net/",
    title: "DTI Global",
    description:
      "A CMS-driven B2B manufacturing site that organizes dense technical content into a clear, responsive experience for automotive tooling customers.",
    disciplines: ["Web systems", "Automotive"],
  },
  {
    href: "https://www.thaliatx.com/",
    title: "Thalia Therapeutics",
    description:
      "A responsive biotech site that presents RNA therapeutics, delivery technology, and pipeline information clearly for scientific and investor audiences.",
    disciplines: ["Web development", "Biotech"],
  },
];

const prototypes = [
  {
    slug: "merchant-onboarding",
    title: "Merchant onboarding",
    description:
      "A verification review flow that keeps status, actions, and focus clear across mouse and keyboard interactions.",
    disciplines: ["Product UI", "Accessibility"],
  },
  {
    slug: "currency-converter",
    title: "Currency converter",
    description:
      "A conversion flow that makes rates, fees, and the final amount clear before commitment, across screen sizes and input states.",
    disciplines: ["Product UI", "Fintech"],
  },
  {
    slug: "grid-to-detail",
    title: "Grid to detail",
    description:
      "A fluid transition from a responsive image grid into a focused detail view, tuned around motion and layout continuity.",
    disciplines: ["Prototyping", "Layout"],
  },
  {
    slug: "photo-pager",
    title: "Photo pager",
    description:
      "A tactile photo browser with gesture-led navigation, predictable keyboard behaviour, and a clear sense of spatial position.",
    disciplines: ["Interaction", "Motion"],
  },
];

const techStack = [
  "TypeScript",
  "React / Next.js",
  "JavaScript",
  "HTML / CSS",
  "Framer Motion",
  "GSAP",
  "Tailwind CSS",
  "Webflow",
  "Figma",
];

const externalLinks = [
  { label: "X", href: "https://x.com/uzodev" },
  { label: "Contra", href: "https://contra.com/uzochukwu_okafor/work" },
  { label: "GitHub", href: "https://github.com/uzoway" },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/uzochukwuokafor/",
  },
];

type ProjectRowProps = {
  href: string;
  title: string;
  description: string;
  disciplines: string[];
  external?: boolean;
};

function ProjectRow({
  href,
  title,
  description,
  disciplines,
  external = false,
}: ProjectRowProps) {
  const content = (
    <>
      <div className="relative z-10 flex flex-col justify-between gap-2 md:flex-row md:items-baseline md:gap-6">
        <h3 className="text-base font-medium text-neutral-200 transition-colors group-hover:text-white">
          {title}
          {external && (
            <>
              <span
                aria-hidden="true"
                className="ml-2 inline-block text-neutral-600 transition-colors group-hover:text-neutral-400"
              ></span>
              <span className="sr-only"> opens in a new tab</span>
            </>
          )}
        </h3>

        <div className="flex gap-3 font-mono text-xs font-medium text-neutral-600">
          {disciplines.map((discipline) => (
            <span key={discipline}>{discipline}</span>
          ))}
        </div>
      </div>

      <p className="relative z-10 mt-2 max-w-md text-sm text-neutral-500 transition-colors group-hover:text-neutral-400">
        {description}
      </p>
    </>
  );

  const className =
    "group block rounded-sm py-6 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-500 focus-visible:ring-offset-4 focus-visible:ring-offset-[#0a0a0a]";

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}

export default function Home() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.main
      initial={
        shouldReduceMotion
          ? false
          : {
              opacity: 0,
              filter: "blur(8px)",
              y: 10,
            }
      }
      animate={{
        opacity: 1,
        filter: "blur(0px)",
        y: 0,
      }}
      transition={{
        duration: shouldReduceMotion ? 0 : 0.7,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="min-h-screen bg-[#0a0a0a] text-neutral-200 selection:bg-neutral-800 selection:text-white"
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-24 px-6 py-24 md:py-32">
        <section className="space-y-8">
          <header className="flex items-center justify-between text-sm font-medium tracking-tight text-neutral-500">
            <Link
              href="/"
              className="rounded-sm text-white transition-colors hover:text-neutral-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-500 focus-visible:ring-offset-4 focus-visible:ring-offset-[#0a0a0a]"
            >
              Uzo Okafor
            </Link>

            <span>Web Design Engineer</span>
          </header>

          <div className="space-y-6 text-lg leading-relaxed tracking-tight text-neutral-300">
            <p>
              I design and engineer interfaces for the web, with a focus on the
              details that make them feel right in production.
            </p>

            <p className="text-neutral-500">
              My work sits between design and frontend engineering, from
              responsive behaviour and interaction to accessibility, component
              structure, performance, and the systems that keep a build useful
              after launch.
            </p>
          </div>
        </section>

        <section className="space-y-8">
          <div className="flex items-end justify-between border-b border-neutral-800 pb-4">
            <h2 className="text-sm font-medium tracking-tight text-neutral-500">
              Selected Work
            </h2>
          </div>

          <ul>
            {websites.map((website) => (
              <li
                key={website.href}
                className="border-b border-neutral-800/50 last:border-0"
              >
                <ProjectRow
                  href={website.href}
                  title={website.title}
                  description={website.description}
                  disciplines={website.disciplines}
                  external
                />
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-8">
          <div className="flex items-end justify-between border-b border-neutral-800 pb-4">
            <h2 className="text-sm font-medium tracking-tight text-neutral-500">
              Lab
            </h2>

            <span className="font-mono text-sm text-neutral-600">2026</span>
          </div>

          <ul>
            {prototypes.map((prototype) => (
              <li
                key={prototype.slug}
                className="border-b border-neutral-800/50 last:border-0"
              >
                <ProjectRow
                  href={`/${prototype.slug}`}
                  title={prototype.title}
                  description={prototype.description}
                  disciplines={prototype.disciplines}
                />
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-6">
          <h2 className="border-b border-neutral-800 pb-4 text-sm font-medium tracking-tight text-neutral-500">
            Toolkit
          </h2>

          <ul className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-sm tracking-tight text-neutral-400">
            {techStack.map((tech) => (
              <li key={tech}>{tech}</li>
            ))}
          </ul>
        </section>

        <footer className="space-y-8 pt-12">
          <h2 className="text-sm font-medium tracking-tight text-neutral-500">
            Let&apos;s talk
          </h2>

          <div className="flex flex-col justify-between gap-6 border-t border-neutral-800 pt-8 text-sm font-medium md:flex-row">
            <a
              href="mailto:uzochukwuokafor01@gmail.com"
              className="rounded-sm text-neutral-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-500 focus-visible:ring-offset-4 focus-visible:ring-offset-[#0a0a0a]"
            >
              Email
            </a>

            <nav aria-label="Social links" className="flex flex-wrap gap-6">
              {externalLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-sm text-neutral-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-500 focus-visible:ring-offset-4 focus-visible:ring-offset-[#0a0a0a]"
                >
                  {link.label}
                  <span className="sr-only"> opens in a new tab</span>
                </a>
              ))}
            </nav>
          </div>
        </footer>
      </div>
    </motion.main>
  );
}
