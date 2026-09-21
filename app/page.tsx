"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { useReducedMotion } from "framer-motion";

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
    slug: "hyperspectral-ai",
    href: "https://www.hyperspectral.ai/",
    title: "HyperSpectral AI",
    description:
      "A high-craft AI and life sciences site built around spectral intelligence, layered visuals, and technical storytelling.",
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
    slug: "oun-homes",
    href: "https://www.oun.homes/",
    title: "Oun Homes",
    description:
      "A product marketing site for an AI real estate platform, turning a complex transaction workflow into a focused story.",
    disciplines: ["Product marketing", "Proptech"],
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

type MediaFallbackProps = {
  label: string;
};

function MediaFallback({ label }: MediaFallbackProps) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-[#e9e9e6]">
      <span className="text-xs text-black/25">{label}</span>
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
    <div className="relative aspect-video overflow-hidden rounded-[18px] bg-[#e9e9e6]">
      {!failed && (
        <img
          src={`/portfolio/work/${slug}/cover.webp`}
          alt={`${title} website preview`}
          loading="lazy"
          decoding="async"
          onError={function handleError() {
            setFailed(true);
          }}
          className="h-full w-full object-contain"
        />
      )}

      {failed && <MediaFallback label={`${slug}/cover.webp`} />}
    </div>
  );
}

type PrototypeVideoProps = {
  slug: string;
  title: string;
};

function PrototypeVideo({ slug, title }: PrototypeVideoProps) {
  const reduceMotion = Boolean(useReducedMotion());

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

        setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.4);
      },
      {
        threshold: [0, 0.4, 0.8],
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

      if (reduceMotion || !visible || manualPauseRef.current) {
        video.pause();
        return;
      }

      video.play().catch(function handleError() {
        setPlaying(false);
      });
    },
    [failed, reduceMotion, visible],
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
      className="relative aspect-video overflow-hidden rounded-[16px] bg-[#e9e9e6]"
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
          aria-label={`${title} prototype preview`}
          onError={function handleError() {
            setFailed(true);
          }}
          onPlay={function handlePlay() {
            setPlaying(true);
          }}
          onPause={function handlePause() {
            setPlaying(false);
          }}
          className="h-full w-full object-contain"
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
          className="absolute bottom-3 right-3 grid size-8 place-items-center rounded-full border border-black/[0.06] bg-white/80 text-black/65 shadow-[0_1px_2px_rgba(0,0,0,.05),0_4px_16px_rgba(0,0,0,.05)] backdrop-blur-xl transition-[background,transform] duration-200 hover:bg-white active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/70"
        >
          {playing ? (
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
              <rect
                x="2"
                y="1.5"
                width="2"
                height="7"
                rx="0.7"
                fill="currentColor"
              />
              <rect
                x="6"
                y="1.5"
                width="2"
                height="7"
                rx="0.7"
                fill="currentColor"
              />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
              <path d="M2.5 1.7L8 5L2.5 8.3V1.7Z" fill="currentColor" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}

type MetadataProps = {
  disciplines: string[];
};

function Metadata({ disciplines }: MetadataProps) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-medium text-black/35">
      {disciplines.map(function renderDiscipline(discipline) {
        return <span key={discipline}>{discipline}</span>;
      })}
    </div>
  );
}

function Header() {
  const reduceMotion = Boolean(useReducedMotion());

  function scrollToSection(
    event: MouseEvent<HTMLAnchorElement>,
    sectionId: string,
  ) {
    event.preventDefault();

    const section = document.getElementById(sectionId);

    if (!section) {
      return;
    }

    section.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
  }

  return (
    <>
      <div data-nav-backdrop aria-hidden="true" />

      <header className="fixed inset-x-0 top-0 z-50">
        <div className="mx-auto flex h-[68px] max-w-[1200px] items-center justify-between px-5 sm:px-8">
          <Link
            href="/"
            className="rounded-sm text-[13px] font-medium tracking-[-0.02em] text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
          >
            Uzo Okafor
          </Link>

          <div className="flex items-center gap-2">
            <nav
              aria-label="Portfolio sections"
              className="hidden items-center rounded-[11px] border border-black/[0.045] bg-white/55 p-[3px] text-[11px] font-medium text-black/45 shadow-[0_1px_2px_rgba(0,0,0,.025)] backdrop-blur-xl sm:flex"
            >
              {[
                ["work", "Work"],
                ["lab", "Lab"],
                ["about", "About"],
              ].map(function renderNavigation(item) {
                return (
                  <a
                    key={item[0]}
                    href={`#${item[0]}`}
                    onClick={function handleClick(event) {
                      scrollToSection(event, item[0]);
                    }}
                    className="rounded-[8px] px-3 py-2 transition-colors hover:bg-white/85 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
                  >
                    {item[1]}
                  </a>
                );
              })}
            </nav>

            <a
              href="mailto:uzochukwuokafor01@gmail.com"
              className="rounded-[10px] bg-black px-3.5 py-[9px] text-[10.5px] font-medium text-white transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-3 focus-visible:ring-offset-[#f4f4f1]"
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
  return (
    <main className="min-h-screen bg-[#f4f4f1] text-[#111] selection:bg-black selection:text-white">
      <Header />

      <div className="mx-auto max-w-[1200px] px-5 pb-8 pt-[68px] sm:px-8">
        <section className="flex min-h-[430px] max-w-[760px] flex-col justify-end pb-20 pt-20 sm:min-h-[500px] sm:pb-24">
          <p className="mb-5 text-[12px] font-medium tracking-[-0.01em] text-black/40">
            Web Design Engineer
          </p>

          <h1 className="max-w-[700px] text-[clamp(2rem,4vw,3.4rem)] font-medium leading-[1.04] tracking-[-0.045em]">
            I design and engineer interfaces for the web, with a focus on the
            details that make them feel right in production.
          </h1>

          <p className="mt-6 max-w-[620px] text-[14px] leading-[1.7] tracking-[-0.01em] text-black/48">
            My work sits between design and frontend engineering, from
            responsive behaviour and interaction to accessibility, component
            structure, performance, and the systems that keep a build useful
            after launch.
          </p>
        </section>

        <section
          id="work"
          className="scroll-mt-24 border-t border-black/10 pt-6"
        >
          <div className="mb-12 flex items-center justify-between">
            <h2 className="text-[13px] font-medium tracking-[-0.015em]">
              Selected Work
            </h2>

            <span className="text-[11px] text-black/30">6 projects</span>
          </div>

          <div>
            {websites.map(function renderWebsite(project, index) {
              return (
                <article
                  key={project.slug}
                  className="border-t border-black/[0.07] py-10 first:border-t-0 first:pt-0 sm:py-14"
                >
                  <a
                    href={project.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block rounded-[18px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-5 focus-visible:ring-offset-[#f4f4f1]"
                  >
                    <ProjectImage slug={project.slug} title={project.title} />

                    <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
                      <div>
                        <div className="flex items-baseline gap-3">
                          <span className="text-[10px] tabular-nums text-black/25">
                            {String(index + 1).padStart(2, "0")}
                          </span>

                          <h3 className="text-[16px] font-medium tracking-[-0.025em]">
                            {project.title}
                          </h3>
                        </div>

                        <p className="ml-[29px] mt-2 max-w-[610px] text-[13px] leading-[1.65] text-black/43">
                          {project.description}
                        </p>
                      </div>

                      <Metadata disciplines={project.disciplines} />
                    </div>
                  </a>
                </article>
              );
            })}
          </div>
        </section>

        <section
          id="lab"
          className="scroll-mt-24 border-t border-black/10 pb-28 pt-6"
        >
          <div className="mb-12 flex items-center justify-between">
            <h2 className="text-[13px] font-medium tracking-[-0.015em]">Lab</h2>

            <span className="text-[11px] text-black/30">Prototypes · 2026</span>
          </div>

          <div className="grid gap-x-6 gap-y-14 md:grid-cols-2">
            {prototypes.map(function renderPrototype(prototype, index) {
              return (
                <article key={prototype.slug}>
                  <PrototypeVideo
                    slug={prototype.slug}
                    title={prototype.title}
                  />

                  <div className="mt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-baseline gap-3">
                        <span className="text-[10px] tabular-nums text-black/25">
                          {String(index + 1).padStart(2, "0")}
                        </span>

                        <Link
                          href={`/${prototype.slug}`}
                          className="rounded-sm text-[15px] font-medium tracking-[-0.025em] transition-opacity hover:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
                        >
                          {prototype.title}
                        </Link>
                      </div>

                      <Metadata disciplines={prototype.disciplines} />
                    </div>

                    <p className="ml-[29px] mt-2 max-w-[470px] text-[12.5px] leading-[1.65] text-black/42">
                      {prototype.description}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section
          id="about"
          className="scroll-mt-24 border-t border-black/10 py-20"
        >
          <div className="grid gap-12 sm:grid-cols-2 sm:gap-16">
            <div>
              <p className="mb-5 text-[12px] font-medium text-black/35">
                About
              </p>

              <p className="max-w-[530px] text-[19px] font-medium leading-[1.5] tracking-[-0.025em]">
                I work between design and frontend engineering, turning visual
                ideas into responsive, accessible interfaces that hold up in
                production.
              </p>
            </div>

            <div className="sm:pt-[37px]">
              <p className="max-w-[510px] text-[13.5px] leading-[1.75] text-black/47">
                I care about responsive behaviour, interaction, accessibility,
                performance, component structure, and the small implementation
                details that shape how a product feels.
              </p>

              <div className="mt-8 flex max-w-[500px] flex-wrap gap-x-5 gap-y-2 text-[12px] text-black/40">
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
              <p className="text-[11px] text-black/32">Get in touch</p>

              <a
                href="mailto:uzochukwuokafor01@gmail.com"
                className="mt-2 inline-block rounded-sm text-[15px] font-medium tracking-[-0.02em] transition-opacity hover:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
              >
                uzochukwuokafor01@gmail.com
              </a>
            </div>

            <nav
              aria-label="Social links"
              className="flex flex-wrap gap-x-5 gap-y-2 text-[12px] font-medium text-black/40"
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
              rgba(244, 244, 241, 0.86) 0%,
              rgba(244, 244, 241, 0.56) 42%,
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

        @media (
          prefers-reduced-motion:
            reduce
        ) {
          *,
          *::before,
          *::after {
            scroll-behavior: auto !important;
          }
        }

        @media (
          forced-colors:
            active
        ) {
          [data-nav-backdrop] {
            display: none;
          }
        }
      `}</style>
    </main>
  );
}
