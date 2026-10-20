"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { LabProject } from "./components/portfolio/lab-project";
import { MediaFallback, Metadata } from "./components/portfolio/project-meta";
import { SiteFooter } from "./components/portfolio/site-footer";
import { SiteHeader } from "./components/portfolio/site-header";
import { prototypes } from "./lab/prototypes";

const websites = [
  {
    slug: "inductive-bio",
    href: "https://inductive.bio/",
    title: "Inductive Bio",
    description:
      "A science-led website bringing product, research, news, and technical content into one clear system.",
    disciplines: ["Web development", "Biotech"],
  },
  {
    slug: "oun-homes",
    href: "https://www.oun.homes/",
    title: "Oun Homes",
    description:
      "A product marketing site for an AI real estate platform, turning a complex transaction workflow into a focused story.",
    disciplines: ["Product marketing", "Proptech"],
  },
  {
    slug: "hyperspectral-ai",
    href: "https://www.hyperspectral.ai/",
    title: "HyperSpectral AI",
    description:
      "An AI and life sciences site built around spectral intelligence, layered visuals, and technical storytelling.",
    disciplines: ["Interaction", "AI / Life sciences"],
  },
  {
    slug: "genyro",
    href: "https://www.genyro.com/",
    title: "Genyro",
    description:
      "A biotech site that explains programmable DNA construction through structured storytelling and restrained motion.",
    disciplines: ["Interaction", "Biotech"],
  },
  {
    slug: "mailata-family-foundation",
    href: "https://www.mailatafamilyfoundation.org/",
    title: "Mailata Family Foundation",
    description:
      "A story-led nonprofit site bringing the foundation's mission, programmes, and community work together.",
    disciplines: ["Storytelling", "Nonprofit"],
  },
  {
    slug: "dti-global",
    href: "https://dtiglobal.net/",
    title: "DTI Global",
    description:
      "A CMS-driven manufacturing site organizing dense technical content for automotive tooling customers.",
    disciplines: ["Web systems", "Automotive"],
  },
];

const techStack = [
  "TypeScript",
  "React / Next.js",
  "JavaScript",
  "HTML / CSS",
  "GSAP",
  "Framer Motion",
  "Webflow",
  "Figma",
];

type ProjectImageProps = {
  slug: string;
  title: string;
};

function ProjectImage({ slug, title }: ProjectImageProps) {
  const [failed, setFailed] = useState(false);

  const attachImage = useCallback(function attachImage(
    image: HTMLImageElement | null,
  ) {
    // A missing cover can fail before hydration attaches onError, so the
    // error event never reaches React. Catch that case here.
    if (image?.complete && image.naturalWidth === 0) {
      setFailed(true);
    }
  }, []);

  return (
    <div className="relative aspect-video overflow-hidden rounded-[11px] sm:rounded-[18px] border border-black/[0.045] bg-[#e9e9e6] transition-[box-shadow,border-color] duration-300 group-hover:border-black/[0.08] group-hover:shadow-[0_12px_40px_-28px_rgba(0,0,0,.32)]">
      {!failed && (
        <img
          ref={attachImage}
          src={`/portfolio/work/${slug}/cover.webp`}
          alt={`${title} website preview`}
          loading="lazy"
          decoding="async"
          onError={function handleError() {
            setFailed(true);
          }}
          className="block h-full w-full object-cover"
        />
      )}

      {failed && <MediaFallback label={`${slug}/cover.webp`} />}
    </div>
  );
}

type WorkProjectProps = {
  project: (typeof websites)[number];
  index: number;
};

function WorkProject({ project, index }: WorkProjectProps) {
  return (
    <article className="border-t border-black/[0.07] py-10 first:border-t-0 first:pt-0 sm:py-14">
      <a
        href={project.href}
        target="_blank"
        rel="noopener noreferrer"
        className="group block rounded-[10px] sm:rounded-[16px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-5 focus-visible:ring-offset-[#f4f4f1]"
      >
        <ProjectImage slug={project.slug} title={project.title} />

        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
          <div>
            <div className="flex items-baseline gap-3">
              <span
                aria-hidden="true"
                className="text-[10px] tabular-nums text-[#747470]"
              >
                {String(index + 1).padStart(2, "0")}
              </span>

              <h3 className="text-[16px] font-medium tracking-[-0.025em] text-[#111]">
                {project.title}
              </h3>
            </div>

            <p className="ml-[29px] mt-2 max-w-[610px] text-[13px] leading-[1.65] text-[#5f5f5b]">
              {project.description}
            </p>
          </div>

          <Metadata disciplines={project.disciplines} />
        </div>
      </a>
    </article>
  );
}

export default function Home() {
  const reducedMotion = Boolean(useReducedMotion());

  const [showAllWork, setShowAllWork] = useState(false);

  const primaryWork = websites.slice(0, 3);

  const additionalWork = websites.slice(3);

  return (
    <main className="min-h-screen bg-[#f4f4f1] font-sans text-[#111] selection:bg-black selection:text-white">
      <SiteHeader />

      <div className="mx-auto max-w-[1200px] px-5 pb-8 pt-[68px] sm:px-8">
        <section className="flex min-h-[340px] max-w-[720px] flex-col justify-end pb-16 pt-20 sm:min-h-[430px] sm:pb-20">
          <p className="mb-5 text-[12px] font-medium tracking-[-0.01em] text-[#60605c]">
            Design Engineer
          </p>

          <h1 className="max-w-[680px] text-[clamp(2rem,4vw,3.25rem)] font-medium leading-[1.03] tracking-[-0.05em]">
            I design and build polished web interfaces, from interaction
            prototypes to production.
          </h1>

          <p className="mt-5 max-w-[580px] text-[14px] leading-[1.7] tracking-[-0.01em] text-[#5f5f5b]">
            I work across frontend engineering, interaction and motion, with a
            focus on responsive systems, accessibility, performance and the
            details that make an interface feel finished.
          </p>
        </section>

        <section
          id="work"
          aria-labelledby="work-title"
          className="scroll-mt-6 border-t border-black/10 pt-6"
        >
          <div className="mb-12 flex items-center justify-between">
            <h2
              id="work-title"
              className="text-[13px] font-medium tracking-[-0.015em]"
            >
              Selected Work
            </h2>

            <span className="text-[11px] text-[#686864]">6 projects</span>
          </div>

          <div>
            {primaryWork.map(function renderWebsite(project, index) {
              return (
                <WorkProject
                  key={project.slug}
                  project={project}
                  index={index}
                />
              );
            })}

            <AnimatePresence initial={false}>
              {showAllWork && (
                <motion.div
                  id="additional-work"
                  initial={
                    reducedMotion
                      ? false
                      : {
                          height: 0,
                          opacity: 0,
                        }
                  }
                  animate={{
                    height: "auto",
                    opacity: 1,
                  }}
                  exit={
                    reducedMotion
                      ? undefined
                      : {
                          height: 0,
                          opacity: 0,
                        }
                  }
                  transition={
                    reducedMotion
                      ? {
                          duration: 0,
                        }
                      : {
                          height: {
                            duration: 0.6,
                            ease: [0.22, 0.72, 0, 1],
                          },
                          opacity: {
                            duration: 0.28,
                            delay: 0.08,
                          },
                        }
                  }
                  className="overflow-hidden"
                >
                  {additionalWork.map(function renderWebsite(project, index) {
                    return (
                      <WorkProject
                        key={project.slug}
                        project={project}
                        index={index + 3}
                      />
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex justify-center border-t border-black/[0.07] py-8 sm:py-10">
              <button
                type="button"
                aria-expanded={showAllWork}
                aria-controls="additional-work"
                onClick={function toggleWork() {
                  setShowAllWork(function toggle(current) {
                    return !current;
                  });
                }}
                className="min-h-10 cursor-pointer rounded-[11px] border border-black/[0.065] bg-white/65 px-4 text-[11px] font-medium text-[#444440] shadow-[0_1px_2px_rgba(0,0,0,.025),0_4px_14px_rgba(0,0,0,.025)] backdrop-blur-xl transition-[background-color,box-shadow,transform] duration-200 hover:bg-white hover:shadow-[0_1px_2px_rgba(0,0,0,.04),0_6px_20px_rgba(0,0,0,.04)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-3 focus-visible:ring-offset-[#f4f4f1] motion-reduce:transition-none motion-reduce:active:scale-100"
              >
                {showAllWork ? "Show less" : "Show 3 more projects"}
              </button>
            </div>
          </div>
        </section>

        <section
          id="lab"
          aria-labelledby="lab-title"
          className="scroll-mt-6 border-t border-black/10 pb-28 pt-6"
        >
          <div className="mb-12 flex items-center justify-between">
            <h2
              id="lab-title"
              className="text-[13px] font-medium tracking-[-0.015em]"
            >
              Lab
            </h2>

            <span className="text-[11px] text-[#686864]">
              {prototypes.length} prototypes
            </span>
          </div>

          <div className="grid gap-x-6 gap-y-14 md:grid-cols-2">
            {prototypes.map(function renderPrototype(prototype, index) {
              if (!prototype.featured) {
                return null;
              }

              return (
                <LabProject
                  key={prototype.slug}
                  prototype={prototype}
                  index={index}
                />
              );
            })}
          </div>

          <div className="mt-16 flex justify-center">
            <Link
              href="/lab"
              className="group inline-flex min-h-10 items-center gap-1.5 rounded-[11px] border border-black/[0.065] bg-white/65 px-4 text-[11px] font-medium text-[#444440] shadow-[0_1px_2px_rgba(0,0,0,.025),0_4px_14px_rgba(0,0,0,.025)] backdrop-blur-xl transition-[background-color,box-shadow,transform] duration-200 hover:bg-white hover:shadow-[0_1px_2px_rgba(0,0,0,.04),0_6px_20px_rgba(0,0,0,.04)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-3 focus-visible:ring-offset-[#f4f4f1] motion-reduce:transition-none motion-reduce:active:scale-100"
            >
              See all prototypes
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                aria-hidden="true"
                className="transition-transform duration-200 ease-out group-hover:translate-x-[2px] motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
              >
                <path
                  d="M2.5 6h7M6.75 3.25 9.5 6 6.75 8.75"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </div>
        </section>

        <section
          id="about"
          aria-labelledby="about-title"
          className="scroll-mt-6 border-t border-black/10 py-20"
        >
          <div className="grid gap-12 sm:grid-cols-2 sm:gap-16">
            <div>
              <h2
                id="about-title"
                className="mb-5 text-[12px] font-medium text-[#666662]"
              >
                About
              </h2>

              <p className="max-w-[530px] text-[19px] font-medium leading-[1.5] tracking-[-0.025em]">
                I’m a design engineer working at the intersection of design and
                frontend development.
              </p>
            </div>

            <div className="sm:pt-[37px]">
              <p className="max-w-[510px] text-[13.5px] leading-[1.75] text-[#5f5f5b]">
                I prototype interactions, build responsive interfaces, and turn
                high-fidelity design into accessible, maintainable production
                code. I care about typography, layout, motion, performance and
                reusable systems.
              </p>

              <div className="mt-8 flex max-w-[500px] flex-wrap gap-x-5 gap-y-2 text-[12px] text-[#60605c]">
                {techStack.map(function renderTech(tech) {
                  return <span key={tech}>{tech}</span>;
                })}
              </div>
            </div>
          </div>
        </section>

        <SiteFooter />
      </div>
    </main>
  );
}
