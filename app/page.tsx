"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

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

const prototypes = [
  {
    slug: "unified-connection",
    title: "Unified Connection",
    description:
      "A what-if exploration for iPhone Duo that unifies Wi-Fi, cellular, weak signal, no-internet, and offline states through SVG geometry.",
    disciplines: ["Interaction", "Motion", "SVG"],
  },
  {
    slug: "cellular-status-morph",
    title: "Cellular status morph",
    description:
      "A frame-tuned status icon animation that transforms cellular, Wi-Fi, and battery states through continuous SVG motion.",
    disciplines: ["Interaction", "Motion", "SVG"],
  },
  {
    slug: "reliable-upload",
    title: "Reliable upload",
    description:
      "A file upload that stays clear and recoverable through slow networks, offline pauses, and failed transfers, with motion tuned to every state change.",
    disciplines: ["Interaction", "Motion"],
  },
  {
    slug: "merchant-onboarding",
    title: "Merchant onboarding",
    description:
      "A verification review flow that keeps status, actions, and focus clear across mouse and keyboard interactions.",
    disciplines: ["Product UI", "Accessibility"],
  },
  {
    slug: "morph-explorations",
    title: "Icon morph explorations",
    description:
      "Responsive SVG icon morphs exploring path interpolation, spring motion, state transitions, and accessible interaction.",
    disciplines: ["Interaction", "Motion", "Accessibility"],
  },
  {
    slug: "reorder-queue",
    title: "Reorder queue",
    description:
      "A tactile playlist queue with spring reordering, boundary feedback, and accessible keyboard controls.",
    disciplines: ["Interaction", "Accessibility"],
  },
  {
    slug: "grid-to-detail",
    title: "Grid to detail",
    description:
      "A fluid transition from a responsive image grid into a focused detail view, tuned around layout continuity.",
    disciplines: ["Prototyping", "Layout"],
  },
  {
    slug: "photo-pager",
    title: "Photo pager",
    description:
      "A tactile photo browser with gesture-led navigation, predictable keyboard behaviour, and clear spatial position.",
    disciplines: ["Interaction", "Motion"],
  },
  {
    slug: "currency-converter",
    title: "Currency converter",
    description:
      "A conversion flow that makes rates, fees, and the final amount clear before commitment.",
    disciplines: ["Product UI", "Fintech"],
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

const externalLinks = [
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/uzochukwuokafor/",
  },
  {
    label: "GitHub",
    href: "https://github.com/uzoway",
  },
  {
    label: "X",
    href: "https://x.com/uzodev",
  },
  {
    label: "Contra",
    href: "https://contra.com/uzochukwu_okafor/work",
  },
];

const NAV_ITEMS = [
  {
    id: "work",
    label: "Work",
  },
  {
    id: "lab",
    label: "Lab",
  },
  {
    id: "about",
    label: "About",
  },
];

const PLAY_LINES = [
  {
    x1: 6,
    y1: 4,
    x2: 6,
    y2: 16,
  },
  {
    x1: 6,
    y1: 4,
    x2: 15.5,
    y2: 10,
  },
  {
    x1: 15.5,
    y1: 10,
    x2: 6,
    y2: 16,
  },
  {
    x1: 10,
    y1: 10,
    x2: 10,
    y2: 10,
    opacity: 0,
  },
];

const PAUSE_LINES = [
  {
    x1: 7,
    y1: 5,
    x2: 7,
    y2: 15,
  },
  {
    x1: 13,
    y1: 5,
    x2: 13,
    y2: 15,
  },
  {
    x1: 10,
    y1: 10,
    x2: 10,
    y2: 10,
    opacity: 0,
  },
  {
    x1: 10,
    y1: 10,
    x2: 10,
    y2: 10,
    opacity: 0,
  },
];

type MediaFallbackProps = {
  label: string;
};

function MediaFallback({ label }: MediaFallbackProps) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-[#e9e9e6]">
      <span className="text-xs text-[#666663]">{label}</span>
    </div>
  );
}

type MetadataProps = {
  disciplines: string[];
};

function Metadata({ disciplines }: MetadataProps) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-medium text-[#686864]">
      {disciplines.map(function renderDiscipline(discipline) {
        return <span key={discipline}>{discipline}</span>;
      })}
    </div>
  );
}

type ProjectImageProps = {
  slug: string;
  title: string;
};

function ProjectImage({ slug, title }: ProjectImageProps) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="relative aspect-video overflow-hidden rounded-[11px] sm:rounded-[18px] border border-black/[0.045] bg-[#e9e9e6] transition-[box-shadow,border-color] duration-300 group-hover:border-black/[0.08] group-hover:shadow-[0_12px_40px_-28px_rgba(0,0,0,.32)]">
      {!failed && (
        <img
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

type MorphPlayPauseProps = {
  playing: boolean;
  reducedMotion: boolean;
};

function MorphPlayPause({ playing, reducedMotion }: MorphPlayPauseProps) {
  const lines = playing ? PAUSE_LINES : PLAY_LINES;

  const transition = reducedMotion
    ? {
        duration: 0,
      }
    : {
        type: "spring" as const,
        duration: 0.34,
        bounce: 0,
      };

  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      {lines.map(function renderLine(line, index) {
        return (
          <motion.line
            key={index}
            initial={false}
            animate={{
              x1: line.x1,
              y1: line.y1,
              x2: line.x2,
              y2: line.y2,
              opacity: line.opacity ?? 1,
            }}
            transition={transition}
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })}
    </svg>
  );
}

type PrototypeVideoProps = {
  slug: string;
  title: string;
};

function PrototypeVideo({ slug, title }: PrototypeVideoProps) {
  const reducedMotion = Boolean(useReducedMotion());

  const containerRef = useRef<HTMLDivElement>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  const manualPauseRef = useRef(false);

  const [visible, setVisible] = useState(false);

  const [playing, setPlaying] = useState(false);

  const [failed, setFailed] = useState(false);

  useEffect(function observeVideo() {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const observer = new IntersectionObserver(
      function handleIntersection(entries) {
        const [entry] = entries;

        setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.45);
      },
      {
        threshold: [0, 0.45, 0.8],
      },
    );

    observer.observe(container);

    return function cleanup() {
      observer.disconnect();
    };
  }, []);

  useEffect(
    function syncPlayback() {
      const video = videoRef.current;

      if (!video || failed) {
        return;
      }

      if (reducedMotion || !visible || manualPauseRef.current) {
        video.pause();

        return;
      }

      video.play().catch(function handleError() {
        setPlaying(false);
      });
    },
    [failed, reducedMotion, visible],
  );

  function togglePlayback() {
    const video = videoRef.current;

    if (!video || failed) {
      return;
    }

    if (video.paused) {
      manualPauseRef.current = false;

      video.play().catch(function handleError() {
        setPlaying(false);
      });

      return;
    }

    manualPauseRef.current = true;

    video.pause();
  }

  return (
    <div
      ref={containerRef}
      className="group/video relative aspect-video overflow-hidden rounded-[16px] border border-black/[0.045] bg-[#e9e9e6] transition-[box-shadow,border-color] duration-300 hover:border-black/[0.08] hover:shadow-[0_12px_40px_-28px_rgba(0,0,0,.32)]"
    >
      {!failed && (
        <video
          ref={videoRef}
          src={`/portfolio/lab/${slug}/preview.mp4`}
          poster={`/portfolio/lab/${slug}/poster.webp`}
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          tabIndex={-1}
          onError={function handleError() {
            setFailed(true);
          }}
          onPlay={function handlePlay() {
            setPlaying(true);
          }}
          onPause={function handlePause() {
            setPlaying(false);
          }}
          className="block h-full w-full object-cover"
        />
      )}

      {failed && <MediaFallback label={`${slug}/preview.mp4`} />}

      {!failed && (
        <button
          type="button"
          onClick={togglePlayback}
          aria-label={
            playing ? `Pause ${title} preview` : `Play ${title} preview`
          }
          className="absolute bottom-3 right-3 grid size-11 cursor-pointer place-items-center rounded-full border border-black/[0.07] bg-white/82 text-black/65 shadow-[0_2px_5px_rgba(0,0,0,.06),0_8px_24px_rgba(0,0,0,.08)] backdrop-blur-xl transition-[background-color,box-shadow,transform] duration-200 hover:bg-white hover:shadow-[0_3px_8px_rgba(0,0,0,.08),0_10px_28px_rgba(0,0,0,.1)] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-[#e9e9e6] motion-reduce:transition-none motion-reduce:active:scale-100"
        >
          <MorphPlayPause playing={playing} reducedMotion={reducedMotion} />
        </button>
      )}
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

type LabProjectProps = {
  prototype: (typeof prototypes)[number];
  index: number;
};

function LabProject({ prototype, index }: LabProjectProps) {
  return (
    <article>
      <PrototypeVideo slug={prototype.slug} title={prototype.title} />

      <div className="mt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-baseline gap-3">
            <span
              aria-hidden="true"
              className="text-[10px] tabular-nums text-[#747470]"
            >
              {String(index + 1).padStart(2, "0")}
            </span>

            <Link
              href={`/${prototype.slug}`}
              className="rounded-sm text-[15px] font-medium tracking-[-0.025em] text-[#111] transition-opacity hover:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-3 focus-visible:ring-offset-[#f4f4f1]"
            >
              {prototype.title}
            </Link>
          </div>

          <Metadata disciplines={prototype.disciplines} />
        </div>

        <p className="ml-[29px] mt-2 max-w-[470px] text-[12.5px] leading-[1.65] text-[#5f5f5b]">
          {prototype.description}
        </p>
      </div>
    </article>
  );
}

function Header() {
  const reducedMotion = Boolean(useReducedMotion());

  const [activeSection, setActiveSection] = useState("work");

  const activeIndex = NAV_ITEMS.findIndex(function findActive(item) {
    return item.id === activeSection;
  });

  useEffect(function observeSections() {
    const sections = NAV_ITEMS.map(function getSection(item) {
      return document.getElementById(item.id);
    }).filter(Boolean) as HTMLElement[];

    if (sections.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      function handleIntersection(entries) {
        const visible = entries
          .filter(function filterEntry(entry) {
            return entry.isIntersecting;
          })
          .sort(function sortEntries(first, second) {
            return second.intersectionRatio - first.intersectionRatio;
          });

        if (visible.length > 0) {
          setActiveSection(visible[0].target.id);
        }
      },
      {
        rootMargin: "-20% 0px -55% 0px",
        threshold: [0, 0.25, 0.5, 0.75],
      },
    );

    sections.forEach(function observeSection(section) {
      observer.observe(section);
    });

    return function cleanup() {
      observer.disconnect();
    };
  }, []);

  function scrollToSection(
    event: MouseEvent<HTMLAnchorElement>,
    sectionId: string,
  ) {
    event.preventDefault();

    const section = document.getElementById(sectionId);

    if (!section) {
      return;
    }

    setActiveSection(sectionId);

    section.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "start",
    });

    window.history.replaceState(null, "", `#${sectionId}`);
  }

  return (
    <>
      <div data-nav-backdrop aria-hidden="true" />

      <header className="fixed inset-x-0 top-0 z-50">
        <div className="mx-auto flex h-[68px] max-w-[1200px] items-center justify-between px-5 sm:px-8">
          <Link
            href="/"
            className="rounded-sm text-[13px] font-medium tracking-[-0.02em] text-[#111] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
          >
            Uzo Okafor
          </Link>

          <div className="flex items-center gap-2">
            <nav
              aria-label="Portfolio sections"
              className="relative hidden grid-cols-3 items-center rounded-[11px] border border-black/[0.055] bg-white/58 p-[3px] text-[11px] font-medium text-[#646460] shadow-[0_1px_2px_rgba(0,0,0,.025)] backdrop-blur-xl sm:grid"
            >
              <span
                aria-hidden="true"
                className="absolute bottom-[3px] left-[3px] top-[3px] w-[56px] rounded-[8px] bg-white shadow-[0_1px_2px_rgba(0,0,0,.055),0_3px_9px_rgba(0,0,0,.025)] transition-transform duration-[420ms] ease-[cubic-bezier(.22,.72,0,1)] motion-reduce:transition-none"
                style={{
                  transform: `translateX(${activeIndex * 56}px)`,
                }}
              />

              {NAV_ITEMS.map(function renderNavigation(item) {
                const active = activeSection === item.id;

                return (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    aria-current={active ? "location" : undefined}
                    onClick={function handleClick(event) {
                      scrollToSection(event, item.id);
                    }}
                    className={`relative z-10 grid h-8 w-14 place-items-center rounded-[8px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${
                      active
                        ? "text-[#111]"
                        : "text-[#646460] hover:text-[#111]"
                    }`}
                  >
                    {item.label}
                  </a>
                );
              })}
            </nav>

            <a
              href="mailto:uzochukwuokafor01@gmail.com"
              className="grid min-h-9 place-items-center rounded-[10px] bg-[#111] px-3.5 text-[10.5px] font-medium text-white transition-[opacity,transform] duration-200 hover:opacity-75 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-3 focus-visible:ring-offset-[#f4f4f1] motion-reduce:transition-none motion-reduce:active:scale-100"
            >
              Email me
            </a>
          </div>
        </div>
      </header>
    </>
  );
}

export default function Home() {
  const reducedMotion = Boolean(useReducedMotion());

  const [showAllWork, setShowAllWork] = useState(false);

  const primaryWork = websites.slice(0, 3);

  const additionalWork = websites.slice(3);

  return (
    <main className="min-h-screen bg-[#f4f4f1] text-[#111] selection:bg-black selection:text-white">
      <Header />

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
          className="scroll-mt-24 border-t border-black/10 pt-6"
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
          className="scroll-mt-24 border-t border-black/10 pb-28 pt-6"
        >
          <div className="mb-12 flex items-center justify-between">
            <h2
              id="lab-title"
              className="text-[13px] font-medium tracking-[-0.015em]"
            >
              Lab
            </h2>

            <span className="text-[11px] text-[#686864]">
              Prototypes · 2026
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
        </section>

        <section
          id="about"
          aria-labelledby="about-title"
          className="scroll-mt-24 border-t border-black/10 py-20"
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

        <footer className="border-t border-black/10 py-8">
          <div className="flex flex-col justify-between gap-10 sm:flex-row sm:items-end">
            <div>
              <p className="text-[11px] text-[#686864]">Get in touch</p>

              <a
                href="mailto:uzochukwuokafor01@gmail.com"
                className="mt-2 inline-block rounded-sm text-[15px] font-medium tracking-[-0.02em] transition-opacity hover:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-3 focus-visible:ring-offset-[#f4f4f1]"
              >
                uzochukwuokafor01@gmail.com
              </a>
            </div>

            <nav
              aria-label="Social links"
              className="flex flex-wrap gap-x-5 gap-y-2 text-[12px] font-medium text-[#5f5f5b]"
            >
              {externalLinks.map(function renderLink(link) {
                return (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-sm transition-colors hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
                  >
                    {link.label}

                    <span className="sr-only"> opens in a new tab</span>
                  </a>
                );
              })}
            </nav>
          </div>
        </footer>
      </div>

      <style>{`
        html {
          scroll-padding-top: 88px;
        }

        [data-nav-backdrop] {
          position: fixed;
          z-index: 40;
          inset: 0 0 auto;
          height: 110px;
          pointer-events: none;

          background:
            linear-gradient(
              to bottom,
              rgba(244, 244, 241, 0.88) 0%,
              rgba(244, 244, 241, 0.58) 42%,
              rgba(244, 244, 241, 0.18) 70%,
              rgba(244, 244, 241, 0) 100%
            );

          backdrop-filter:
            blur(18px);
          -webkit-backdrop-filter:
            blur(18px);

          mask-image:
            linear-gradient(
              to bottom,
              #000 0%,
              #000 38%,
              rgba(0, 0, 0, 0.72) 58%,
              rgba(0, 0, 0, 0.22) 82%,
              transparent 100%
            );

          -webkit-mask-image:
            linear-gradient(
              to bottom,
              #000 0%,
              #000 38%,
              rgba(0, 0, 0, 0.72) 58%,
              rgba(0, 0, 0, 0.22) 82%,
              transparent 100%
            );
        }

        @media (prefers-reduced-motion: reduce) {
          html {
            scroll-behavior: auto;
          }
        }

        @media (forced-colors: active) {
          [data-nav-backdrop] {
            display: none;
          }
        }
      `}</style>
    </main>
  );
}
