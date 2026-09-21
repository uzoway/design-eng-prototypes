"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { useReducedMotion } from "framer-motion";

const websites = [
  {
    slug: "inductive-bio",
    href: "https://inductive.bio/",
    title: "Inductive Bio",
    description:
      "A science-led platform for an AI drug discovery company, bringing product, research, news, and technical content into one system.",
    disciplines: ["Web development", "Biotech"],
  },
  {
    slug: "hyperspectral-ai",
    href: "https://www.hyperspectral.ai/",
    title: "HyperSpectral AI",
    description:
      "A high-craft AI and life sciences site built around spectral intelligence, layered visual storytelling, and technical content.",
    disciplines: ["Interaction", "AI / Life sciences"],
  },
  {
    slug: "genyro",
    href: "https://www.genyro.com/",
    title: "Genyro",
    description:
      "A biotech site using editorial layouts, diagrams, and restrained motion to explain programmable DNA construction.",
    disciplines: ["Interaction", "Biotech"],
  },
  {
    slug: "oun-homes",
    href: "https://www.oun.homes/",
    title: "Oun Homes",
    description:
      "A product marketing site for AI transaction coordination, using product UI and clear sequencing to explain a complex workflow.",
    disciplines: ["Product marketing", "Proptech"],
  },
  {
    slug: "mailata-family-foundation",
    href: "https://www.mailatafamilyfoundation.org/",
    title: "Mailata Family Foundation",
    description:
      "A story-led nonprofit site built around photography, community, and creating pathways for young people.",
    disciplines: ["Storytelling", "Nonprofit"],
  },
  {
    slug: "dti-global",
    href: "https://dtiglobal.net/",
    title: "DTI Global",
    description:
      "A large CMS-driven site for an automotive tooling company, organizing technical capabilities, facilities, and services across a complex web system.",
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
    span: "wide",
  },
  {
    slug: "cellular-status-morph",
    title: "Cellular status morph",
    description:
      "A frame-tuned status icon animation that transforms cellular, Wi-Fi, and battery states through continuous SVG motion.",
    disciplines: ["Interaction", "Motion", "SVG"],
    span: "narrow",
  },
  {
    slug: "merchant-onboarding",
    title: "Merchant onboarding",
    description:
      "A verification review flow that keeps status, actions, and focus clear across mouse and keyboard interactions.",
    disciplines: ["Product UI", "Accessibility"],
    span: "narrow",
  },
  {
    slug: "morph-explorations",
    title: "Icon morph explorations",
    description:
      "A collection of responsive SVG icon morphs exploring path interpolation, spring motion, state transitions, and accessible interaction.",
    disciplines: ["Interaction", "Motion", "Accessibility"],
    span: "wide",
  },
  {
    slug: "reorder-queue",
    title: "Reorder queue",
    description:
      "A tactile playlist queue with spring reordering, boundary feedback, and accessible keyboard controls.",
    disciplines: ["Interaction", "Accessibility"],
    span: "wide",
  },
  {
    slug: "grid-to-detail",
    title: "Grid to detail",
    description:
      "A fluid transition from a responsive image grid into a focused detail view, tuned around motion and layout continuity.",
    disciplines: ["Prototyping", "Layout"],
    span: "narrow",
  },
  {
    slug: "photo-pager",
    title: "Photo pager",
    description:
      "A tactile photo browser with gesture-led navigation, predictable keyboard behaviour, and a clear sense of spatial position.",
    disciplines: ["Interaction", "Motion"],
    span: "narrow",
  },
  {
    slug: "currency-converter",
    title: "Currency converter",
    description:
      "A conversion flow that makes rates, fees, and the final amount clear before commitment across screen sizes and input states.",
    disciplines: ["Product UI", "Fintech"],
    span: "wide",
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

function StructuralGrid() {
  return <div data-structural-grid aria-hidden="true" />;
}

type SectionHeadingProps = {
  number: string;
  title: string;
  aside?: string;
};

function SectionHeading({ number, title, aside }: SectionHeadingProps) {
  return (
    <header className="grid grid-cols-12 gap-x-4 border-t border-black/15 py-4 sm:gap-x-6">
      <span className="col-span-2 font-mono text-[10px] tracking-[0.08em] text-black/32 sm:col-span-1">
        {number}
      </span>

      <h2 className="col-span-6 text-[13px] font-medium tracking-[-0.015em] text-black/70 sm:col-span-5">
        {title}
      </h2>

      {aside && (
        <p className="col-span-4 text-right text-[11px] leading-5 text-black/34 sm:col-span-6">
          {aside}
        </p>
      )}
    </header>
  );
}

type DisciplinesProps = {
  disciplines: string[];
};

function Disciplines({ disciplines }: DisciplinesProps) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[9px] uppercase tracking-[0.055em] text-black/34 sm:text-[10px]">
      {disciplines.map(function renderDiscipline(discipline) {
        return <span key={discipline}>{discipline}</span>;
      })}
    </div>
  );
}

type FallbackProps = {
  children: ReactNode;
};

function MediaFallback({ children }: FallbackProps) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-[#e8e8e2] p-6">
      <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-black/28">
        {children}
      </span>
    </div>
  );
}

type WorkImageProps = {
  slug: string;
  title: string;
};

function WorkImage({ slug, title }: WorkImageProps) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="relative aspect-[16/10] overflow-hidden bg-[#e7e7e1]">
      {!failed && (
        <img
          src={`/portfolio/work/${slug}/cover.webp`}
          alt={`${title} website preview`}
          loading="lazy"
          decoding="async"
          onError={function handleError() {
            setFailed(true);
          }}
          className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(.22,.72,0,1)] motion-reduce:transition-none group-hover:scale-[1.008]"
        />
      )}

      {failed && <MediaFallback>{slug}/cover.webp</MediaFallback>}
    </div>
  );
}

type WorkProjectProps = {
  project: (typeof websites)[number];
  index: number;
};

function WorkProject({ project, index }: WorkProjectProps) {
  const projectNumber = String(index + 1).padStart(2, "0");

  return (
    <article className="group border-t border-black/[0.075] py-8 first:border-t-0 sm:py-12">
      <a
        href={project.href}
        target="_blank"
        rel="noopener noreferrer"
        className="grid grid-cols-12 gap-x-4 gap-y-6 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-6 focus-visible:ring-offset-[#f3f3ed] sm:gap-x-6"
      >
        <div className="col-span-12 flex flex-col justify-between gap-8 sm:col-span-4 lg:col-span-3 lg:min-h-[280px]">
          <div>
            <span className="font-mono text-[9px] tracking-[0.1em] text-black/28">
              W{projectNumber}
            </span>

            <h3 className="mt-4 max-w-[240px] text-[clamp(1.4rem,2.25vw,2rem)] font-medium leading-[1.05] tracking-[-0.045em] text-black">
              {project.title}
            </h3>

            <p className="mt-4 max-w-[290px] text-[13px] leading-[1.7] tracking-[-0.01em] text-black/48">
              {project.description}
            </p>
          </div>

          <Disciplines disciplines={project.disciplines} />
        </div>

        <div className="col-span-12 sm:col-span-8 lg:col-span-9">
          <WorkImage slug={project.slug} title={project.title} />
        </div>
      </a>
    </article>
  );
}

type PrototypeVideoProps = {
  slug: string;
  title: string;
};

function PrototypeVideo({ slug, title }: PrototypeVideoProps) {
  const shouldReduceMotion = useReducedMotion();

  const containerRef = useRef<HTMLDivElement>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  const manualPauseRef = useRef(false);

  const [visible, setVisible] = useState(false);

  const [playing, setPlaying] = useState(false);

  const [failed, setFailed] = useState(false);

  useEffect(function observeVideo() {
    const element = containerRef.current;

    if (!element) {
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

    observer.observe(element);

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

      if (shouldReduceMotion || !visible || manualPauseRef.current) {
        video.pause();

        return;
      }

      video.play().catch(function ignoreAutoplayFailure() {
        setPlaying(false);
      });
    },
    [failed, shouldReduceMotion, visible],
  );

  function togglePlayback() {
    const video = videoRef.current;

    if (!video || failed) {
      return;
    }

    if (video.paused) {
      manualPauseRef.current = false;

      video.play().catch(function ignorePlaybackFailure() {
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
      className="relative aspect-[4/3] overflow-hidden bg-[#e7e7e1]"
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
          className="h-full w-full object-cover"
        />
      )}

      {failed && <MediaFallback>{slug}/preview.mp4</MediaFallback>}

      {!failed && (
        <button
          type="button"
          onClick={togglePlayback}
          aria-label={
            playing ? `Pause ${title} preview` : `Play ${title} preview`
          }
          className="absolute bottom-3 right-3 min-w-[44px] border border-black/10 bg-[#f7f7f2]/85 px-2.5 py-2 font-mono text-[9px] uppercase tracking-[0.055em] text-black/60 backdrop-blur-md transition-colors hover:bg-[#f7f7f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
        >
          {playing ? "Pause" : "Play"}
        </button>
      )}
    </div>
  );
}

type LabProjectProps = {
  prototype: (typeof prototypes)[number];
  index: number;
};

function LabProject({ prototype, index }: LabProjectProps) {
  const number = String(index + 1).padStart(2, "0");

  const width = prototype.span === "wide" ? "lg:col-span-7" : "lg:col-span-5";

  return (
    <article className={`col-span-12 md:col-span-6 ${width}`}>
      <PrototypeVideo slug={prototype.slug} title={prototype.title} />

      <div className="grid grid-cols-[auto_1fr] gap-x-4 border-t border-black/10 pt-3">
        <span className="pt-1 font-mono text-[9px] tracking-[0.08em] text-black/28">
          L{number}
        </span>

        <div>
          <Link
            href={`/${prototype.slug}`}
            className="rounded-sm text-[15px] font-medium tracking-[-0.025em] text-black transition-opacity hover:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-4 focus-visible:ring-offset-[#f3f3ed]"
          >
            {prototype.title}
          </Link>

          <p className="mt-2 max-w-[470px] text-[12.5px] leading-[1.65] tracking-[-0.005em] text-black/44">
            {prototype.description}
          </p>

          <div className="mt-3">
            <Disciplines disciplines={prototype.disciplines} />
          </div>
        </div>
      </div>
    </article>
  );
}

type HeaderProps = {
  reducedMotion: boolean;
};

function Header({ reducedMotion }: HeaderProps) {
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
      behavior: reducedMotion ? "auto" : "smooth",
      block: "start",
    });

    window.history.replaceState(null, "", `#${sectionId}`);
  }

  return (
    <>
      <div data-nav-blur aria-hidden="true" />

      <header className="fixed inset-x-0 top-0 z-50">
        <div className="mx-auto grid h-[72px] max-w-[1280px] grid-cols-[1fr_auto] items-center gap-5 px-5 sm:grid-cols-[1fr_auto_1fr] sm:px-8 lg:px-10">
          <Link
            href="/"
            className="justify-self-start rounded-sm text-[13px] font-medium tracking-[-0.02em] text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
          >
            Uzo Okafor
          </Link>

          <nav
            aria-label="Portfolio sections"
            className="hidden items-center gap-1 text-[11px] font-medium text-black/45 sm:flex"
          >
            {[
              ["work", "Work"],
              ["lab", "Lab"],
              ["about", "About"],
            ].map(function renderLink(item) {
              return (
                <a
                  key={item[0]}
                  href={`#${item[0]}`}
                  onClick={function handleClick(event) {
                    scrollToSection(event, item[0]);
                  }}
                  className="rounded-[8px] px-3 py-2 transition-colors hover:bg-black/[0.045] hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
                >
                  {item[1]}
                </a>
              );
            })}
          </nav>

          <a
            href="mailto:uzochukwuokafor01@gmail.com"
            className="justify-self-end bg-black px-3.5 py-2 text-[10px] font-medium tracking-[-0.005em] text-white transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-3 focus-visible:ring-offset-[#f3f3ed]"
          >
            Email me
          </a>
        </div>
      </header>
    </>
  );
}

export default function Home() {
  const shouldReduceMotion = Boolean(useReducedMotion());

  return (
    <main className="relative min-h-screen overflow-clip bg-[#f3f3ed] text-[#11110f] selection:bg-[#11110f] selection:text-[#f3f3ed]">
      <StructuralGrid />

      <Header reducedMotion={shouldReduceMotion} />

      <div className="relative z-10 mx-auto max-w-[1280px] px-5 pb-8 pt-[72px] sm:px-8 lg:px-10">
        <section className="grid min-h-[58svh] grid-cols-12 content-end gap-x-4 border-b border-black/15 pb-10 pt-20 sm:gap-x-6 sm:pb-14 sm:pt-28 lg:min-h-[64svh]">
          <div className="col-span-12 sm:col-span-8 lg:col-span-7">
            <p className="mb-5 font-mono text-[9px] uppercase tracking-[0.09em] text-black/35">
              Web Design Engineer
            </p>

            <h1 className="max-w-[760px] text-[clamp(2.25rem,5vw,4rem)] font-medium leading-[0.98] tracking-[-0.055em]">
              I design and build interfaces that hold up in production.
            </h1>
          </div>

          <div className="col-span-12 mt-10 sm:col-span-4 sm:mt-0 lg:col-start-9 lg:col-span-4">
            <p className="max-w-[360px] text-[13.5px] leading-[1.75] tracking-[-0.012em] text-black/53">
              I started in civil engineering, with a particular interest in
              structures. These days I work between design and frontend
              engineering, building websites, interaction systems, and
              prototypes.
            </p>

            <div className="mt-8 flex items-center gap-3">
              <span
                aria-hidden="true"
                className="block h-px w-10 bg-black/20"
              />

              <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-black/30">
                Structure → Interface
              </span>
            </div>
          </div>
        </section>

        <section
          id="work"
          aria-labelledby="work-heading"
          className="scroll-mt-24 py-24 sm:py-32"
        >
          <div id="work-heading">
            <SectionHeading
              number="01"
              title="Selected work"
              aside="Production websites"
            />
          </div>

          <div className="mt-3">
            {websites.map(function renderProject(project, index) {
              return (
                <WorkProject
                  key={project.slug}
                  project={project}
                  index={index}
                />
              );
            })}
          </div>
        </section>

        <section
          id="lab"
          aria-labelledby="lab-heading"
          className="scroll-mt-24 pb-24 sm:pb-32"
        >
          <div id="lab-heading">
            <SectionHeading
              number="02"
              title="Lab"
              aside="Interaction studies · 2026"
            />
          </div>

          <div className="mt-10 grid grid-cols-12 gap-x-4 gap-y-14 sm:gap-x-6 sm:gap-y-20">
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
          aria-labelledby="about-heading"
          className="scroll-mt-24 pb-28"
        >
          <div id="about-heading">
            <SectionHeading number="03" title="About" />
          </div>

          <div className="mt-10 grid grid-cols-12 gap-x-4 gap-y-12 sm:gap-x-6">
            <div className="col-span-12 sm:col-span-7 lg:col-span-6">
              <p className="max-w-[610px] text-[clamp(1.35rem,2.1vw,1.8rem)] font-medium leading-[1.35] tracking-[-0.035em]">
                Before the web, I studied Civil Engineering and worked briefly
                as a site engineer.
              </p>

              <div className="mt-6 max-w-[600px] space-y-4 text-[13.5px] leading-[1.75] tracking-[-0.01em] text-black/50">
                <p>
                  Structural engineering was the part I was most drawn to:
                  understanding how individual pieces work together, where
                  things carry load, and why small decisions can affect the
                  whole system.
                </p>

                <p>
                  I think about the web in a similar way now. The visual layer
                  matters, but so do the systems underneath it: responsive
                  behaviour, accessibility, performance, interaction, and code
                  that stays useful after launch.
                </p>
              </div>
            </div>

            <div className="col-span-12 sm:col-start-9 sm:col-span-4 lg:col-start-9">
              <p className="font-mono text-[9px] uppercase tracking-[0.08em] text-black/30">
                Tools I work with
              </p>

              <ul className="mt-5 border-t border-black/10">
                {techStack.map(function renderTech(tech, index) {
                  return (
                    <li
                      key={tech}
                      className="grid grid-cols-[32px_1fr] border-b border-black/[0.075] py-2.5 text-[12px]"
                    >
                      <span className="font-mono text-[9px] text-black/22">
                        {String(index + 1).padStart(2, "0")}
                      </span>

                      <span className="text-black/55">{tech}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </section>

        <footer className="border-t border-black/15 py-7">
          <div className="grid grid-cols-12 items-end gap-x-4 gap-y-8 sm:gap-x-6">
            <div className="col-span-12 sm:col-span-6">
              <p className="font-mono text-[9px] uppercase tracking-[0.08em] text-black/30">
                Have something in mind?
              </p>

              <a
                href="mailto:uzochukwuokafor01@gmail.com"
                className="mt-3 inline-block rounded-sm text-[18px] font-medium tracking-[-0.03em] transition-opacity hover:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-4 focus-visible:ring-offset-[#f3f3ed]"
              >
                uzokafor01@gmail.com
              </a>
            </div>

            <nav
              aria-label="Social links"
              className="col-span-12 flex flex-wrap gap-x-5 gap-y-2 text-[11px] font-medium text-black/42 sm:col-span-6 sm:justify-end"
            >
              {externalLinks.map(function renderExternalLink(link) {
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
          scroll-padding-top: 96px;
        }

        [data-structural-grid] {
          position: fixed;
          z-index: 0;
          top: 0;
          bottom: 0;
          left: 50%;
          width: min(
            calc(100% - 40px),
            1280px
          );
          pointer-events: none;
          transform: translateX(-50%);
          background-image:
            linear-gradient(
              to right,
              rgba(17, 17, 15, 0.032) 1px,
              transparent 1px
            );
          background-size:
            calc(100% / 12)
            100%;
          border-right:
            1px solid
            rgba(17, 17, 15, 0.032);
          -webkit-mask-image:
            linear-gradient(
              to bottom,
              transparent 0,
              black 9rem,
              black calc(100% - 9rem),
              transparent 100%
            );
          mask-image:
            linear-gradient(
              to bottom,
              transparent 0,
              black 9rem,
              black calc(100% - 9rem),
              transparent 100%
            );
        }

        [data-nav-blur] {
          position: fixed;
          z-index: 40;
          top: 0;
          left: 0;
          right: 0;
          height: 116px;
          pointer-events: none;
          background:
            linear-gradient(
              to bottom,
              rgba(243, 243, 237, 0.76) 0%,
              rgba(243, 243, 237, 0.38) 48%,
              rgba(243, 243, 237, 0) 100%
            );
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter:
            blur(18px);
          -webkit-mask-image:
            linear-gradient(
              to bottom,
              black 0%,
              black 42%,
              rgba(0, 0, 0, 0.72) 62%,
              transparent 100%
            );
          mask-image:
            linear-gradient(
              to bottom,
              black 0%,
              black 42%,
              rgba(0, 0, 0, 0.72) 62%,
              transparent 100%
            );
        }

        @media (
          max-width: 639px
        ) {
          [data-structural-grid] {
            width:
              calc(100% - 40px);
            background-size:
              25% 100%;
          }
        }

        @media (
          prefers-reduced-motion:
            reduce
        ) {
          html {
            scroll-behavior: auto;
          }
        }

        @media (
          forced-colors:
            active
        ) {
          [data-structural-grid],
          [data-nav-blur] {
            display: none;
          }
        }
      `}</style>
    </main>
  );
}
