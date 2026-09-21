"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";

const websites = [
  {
    href: "https://www.oun.homes/",
    title: "Oun Homes",
    description:
      "A product marketing site for an AI real estate platform, turning a complex transaction workflow into a clear, focused story.",
    disciplines: ["Product marketing", "Proptech"],
    image: "/portfolio/work/oun-homes.webp",
    featured: true,
  },
  {
    href: "https://www.hyperspectral.ai/",
    title: "HyperSpectral AI",
    description:
      "A high-craft AI and life sciences site that turns complex spectral intelligence into a clear story through layered visuals, motion, and technical content.",
    disciplines: ["Interaction", "AI / Life sciences"],
    image: "/portfolio/work/hyperspectral-ai.webp",
    featured: true,
  },
  {
    href: "https://www.mailatafamilyfoundation.org/",
    title: "Mailata Family Foundation",
    description:
      "A story-led nonprofit site that brings the foundation's mission, programmes, and community work together in a responsive, media-rich experience.",
    disciplines: ["Storytelling", "Nonprofit"],
    image: "/portfolio/work/mailata-family-foundation.webp",
  },
  {
    href: "https://dtiglobal.net/",
    title: "DTI Global",
    description:
      "A CMS-driven B2B manufacturing site that organizes dense technical content into a clear, responsive experience for automotive tooling customers.",
    disciplines: ["Web systems", "Automotive"],
    image: "/portfolio/work/dti-global.webp",
  },
  {
    href: "https://www.thaliatx.com/",
    title: "Thalia Therapeutics",
    description:
      "A responsive biotech site that presents RNA therapeutics, delivery technology, and pipeline information clearly for scientific and investor audiences.",
    disciplines: ["Web development", "Biotech"],
    image: "/portfolio/work/thalia-therapeutics.webp",
  },
  {
    href: "https://www.genyro.com/",
    title: "Genyro",
    description:
      "A biotech site that explains programmable DNA construction through structured storytelling, restrained motion, and a clear visual hierarchy.",
    disciplines: ["Interaction", "Biotech"],
    image: "/portfolio/work/genyro.webp",
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
    slug: "cellular-status-morph",
    title: "Cellular status morph",
    description:
      "A frame-tuned status icon animation that transforms cellular, Wi-Fi, and battery states through continuous SVG motion.",
    disciplines: ["Interaction", "Motion", "Prototyping"],
  },
  {
    slug: "unified-connection",
    title: "Unified Connection",
    description:
      "A what-if exploration for iPhone Duo that unifies Wi-Fi, cellular, weak signal, no-internet, and offline states through SVG geometry.",
    disciplines: ["Interaction", "Motion", "Prototyping"],
  },
  {
    slug: "morph-explorations",
    title: "Icon morph explorations",
    description:
      "A collection of responsive SVG icon morphs exploring path interpolation, spring motion, state transitions, and accessible interaction.",
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

type SectionHeaderProps = {
  label: string;
  aside?: string;
};

function SectionHeader({ label, aside }: SectionHeaderProps) {
  return (
    <div className="flex items-end justify-between border-b border-black/10 pb-4">
      <h2 className="text-[13px] font-medium tracking-[-0.01em] text-black/48">
        {label}
      </h2>

      {aside && <span className="text-[12px] text-black/32">{aside}</span>}
    </div>
  );
}

type DisciplineListProps = {
  disciplines: string[];
};

function DisciplineList({ disciplines }: DisciplineListProps) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[12px] font-medium text-black/38">
      {disciplines.map(function renderDiscipline(discipline) {
        return <span key={discipline}>{discipline}</span>;
      })}
    </div>
  );
}

type MediaFallbackProps = {
  children: ReactNode;
};

function MediaFallback({ children }: MediaFallbackProps) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-[#e9e9e5] px-6 text-center text-sm font-medium text-black/28">
      {children}
    </div>
  );
}

type WorkPreviewProps = {
  src: string;
  alt: string;
};

function WorkPreview({ src, alt }: WorkPreviewProps) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="relative aspect-[16/10] overflow-hidden rounded-[20px] bg-[#e9e9e5]">
      {!failed && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={function handleImageError() {
            setFailed(true);
          }}
          className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(.22,.72,0,1)] motion-reduce:transition-none group-hover:scale-[1.012]"
        />
      )}

      {failed && <MediaFallback>Preview coming soon</MediaFallback>}
    </div>
  );
}

type WorkCardProps = {
  href: string;
  title: string;
  description: string;
  disciplines: string[];
  image: string;
  featured?: boolean;
};

function WorkCard({
  href,
  title,
  description,
  disciplines,
  image,
  featured = false,
}: WorkCardProps) {
  return (
    <article className={featured ? "group lg:col-span-2" : "group"}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-[22px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/70 focus-visible:ring-offset-4 focus-visible:ring-offset-[#f3f3f0]"
      >
        <WorkPreview src={image} alt={`${title} website preview`} />

        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto] md:items-start md:gap-8">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[17px] font-medium tracking-[-0.025em] text-black">
                {title}
              </h3>

              <span
                aria-hidden="true"
                className="text-[14px] text-black/35 transition-transform duration-300 ease-out motion-reduce:transition-none group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              >
                ↗
              </span>

              <span className="sr-only">opens in a new tab</span>
            </div>

            <p className="mt-2 max-w-xl text-[14px] leading-6 tracking-[-0.01em] text-black/48">
              {description}
            </p>
          </div>

          <DisciplineList disciplines={disciplines} />
        </div>
      </a>
    </article>
  );
}

type PrototypeVideoProps = {
  src: string;
  poster: string;
  title: string;
};

function PrototypeVideo({ src, poster, title }: PrototypeVideoProps) {
  const shouldReduceMotion = useReducedMotion();

  const wrapperRef = useRef<HTMLDivElement>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  const [isVisible, setIsVisible] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);

  const [failed, setFailed] = useState(false);

  const manualPauseRef = useRef(false);

  useEffect(function observePreview() {
    const wrapper = wrapperRef.current;

    if (!wrapper) {
      return;
    }

    const observer = new IntersectionObserver(
      function handleIntersection(entries) {
        const [entry] = entries;

        setIsVisible(entry.isIntersecting && entry.intersectionRatio >= 0.45);
      },
      {
        threshold: [0, 0.45, 0.75],
      },
    );

    observer.observe(wrapper);

    return function disconnectObserver() {
      observer.disconnect();
    };
  }, []);

  useEffect(
    function synchronisePlayback() {
      const video = videoRef.current;

      if (!video || failed) {
        return;
      }

      if (shouldReduceMotion || !isVisible || manualPauseRef.current) {
        video.pause();
        setIsPlaying(false);

        return;
      }

      const playPromise = video.play();

      if (playPromise) {
        playPromise
          .then(function handlePlayback() {
            setIsPlaying(true);
          })
          .catch(function handlePlaybackError() {
            setIsPlaying(false);
          });
      }
    },
    [failed, isVisible, shouldReduceMotion],
  );

  function togglePlayback() {
    const video = videoRef.current;

    if (!video || failed) {
      return;
    }

    if (video.paused) {
      manualPauseRef.current = false;

      video
        .play()
        .then(function handlePlayback() {
          setIsPlaying(true);
        })
        .catch(function handlePlaybackError() {
          setIsPlaying(false);
        });

      return;
    }

    manualPauseRef.current = true;

    video.pause();
    setIsPlaying(false);
  }

  return (
    <div
      ref={wrapperRef}
      className="relative aspect-[4/3] overflow-hidden rounded-[18px] bg-[#e6e6e2]"
    >
      {!failed && (
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          muted
          loop
          playsInline
          preload="metadata"
          aria-label={`${title} prototype preview`}
          onError={function handleVideoError() {
            setFailed(true);
          }}
          onPlay={function handlePlay() {
            setIsPlaying(true);
          }}
          onPause={function handlePause() {
            setIsPlaying(false);
          }}
          className="h-full w-full object-cover"
        />
      )}

      {failed && <MediaFallback>Add the prototype recording</MediaFallback>}

      {!failed && (
        <button
          type="button"
          onClick={togglePlayback}
          aria-label={
            isPlaying ? `Pause ${title} preview` : `Play ${title} preview`
          }
          className="absolute bottom-3 right-3 grid h-8 min-w-8 place-items-center rounded-full border border-black/[0.06] bg-white/80 px-2 text-[10px] font-medium text-black/58 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_5px_18px_rgba(0,0,0,0.06)] backdrop-blur-xl transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
        >
          {isPlaying ? "Pause" : "Play"}
        </button>
      )}
    </div>
  );
}

type LabCardProps = {
  slug: string;
  title: string;
  description: string;
  disciplines: string[];
};

function LabCard({ slug, title, description, disciplines }: LabCardProps) {
  const video = `/portfolio/lab/${slug}.mp4`;

  const poster = `/portfolio/lab/${slug}.webp`;

  return (
    <article className="group">
      <PrototypeVideo src={video} poster={poster} title={title} />

      <div className="mt-4">
        <div className="flex items-center justify-between gap-4">
          <Link
            href={`/${slug}`}
            className="inline-flex items-center gap-2 rounded-sm text-[15px] font-medium tracking-[-0.02em] text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/70 focus-visible:ring-offset-4 focus-visible:ring-offset-[#f3f3f0]"
          >
            {title}

            <span
              aria-hidden="true"
              className="text-black/32 transition-transform duration-300 ease-out motion-reduce:transition-none group-hover:translate-x-0.5"
            >
              →
            </span>
          </Link>

          <DisciplineList disciplines={disciplines.slice(0, 2)} />
        </div>

        <p className="mt-2 max-w-md text-[13px] leading-[1.65] tracking-[-0.005em] text-black/45">
          {description}
        </p>
      </div>
    </article>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-10">
        <Link
          href="/"
          className="rounded-sm text-[14px] font-medium tracking-[-0.02em] text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/70 focus-visible:ring-offset-4 focus-visible:ring-offset-[#f3f3f0]"
        >
          Uzo Okafor
        </Link>

        <nav
          aria-label="Portfolio sections"
          className="flex items-center rounded-[12px] border border-black/[0.05] bg-white/70 p-1 text-[12px] font-medium text-black/46 shadow-[0_1px_2px_rgba(0,0,0,0.025),0_6px_20px_rgba(0,0,0,0.035)] backdrop-blur-xl"
        >
          <a
            href="#work"
            className="rounded-[9px] px-3 py-2 transition-colors hover:bg-white hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/70"
          >
            Work
          </a>

          <a
            href="#lab"
            className="rounded-[9px] px-3 py-2 transition-colors hover:bg-white hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/70"
          >
            Lab
          </a>

          <a
            href="#about"
            className="rounded-[9px] px-3 py-2 transition-colors hover:bg-white hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/70"
          >
            About
          </a>
        </nav>
      </div>
    </header>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f3f3f0] text-black selection:bg-black selection:text-white">
      <Header />

      <div className="mx-auto max-w-[1280px] px-5 pb-10 pt-16 sm:px-8 sm:pt-24 lg:px-10 lg:pt-28">
        <section
          aria-labelledby="intro-title"
          className="pb-32 sm:pb-40 lg:pb-48"
        >
          <div className="max-w-[820px]">
            <p className="mb-6 text-[13px] font-medium tracking-[-0.01em] text-black/42">
              Web Design Engineer
            </p>

            <h1
              id="intro-title"
              className="text-[clamp(2.5rem,6vw,5.4rem)] font-medium leading-[0.98] tracking-[-0.055em]"
            >
              I design and engineer interfaces for the web, with a focus on the
              details that make them feel right in production.
            </h1>

            <p className="mt-8 max-w-xl text-[16px] leading-7 tracking-[-0.015em] text-black/48">
              Interaction, frontend engineering, accessibility, motion, and the
              systems behind polished digital experiences.
            </p>
          </div>
        </section>

        <section
          id="work"
          aria-labelledby="work-title"
          className="scroll-mt-24 pb-32 sm:pb-40"
        >
          <div className="mb-10">
            <SectionHeader label="Selected Work" aside="Shipped work" />
          </div>

          <div className="grid grid-cols-1 gap-x-7 gap-y-16 lg:grid-cols-2 lg:gap-y-20">
            {websites.map(function renderWebsite(website) {
              return <WorkCard key={website.href} {...website} />;
            })}
          </div>
        </section>

        <section
          id="lab"
          aria-labelledby="lab-title"
          className="scroll-mt-24 pb-32 sm:pb-40"
        >
          <div className="mb-10">
            <SectionHeader label="Lab" aside="Interaction studies · 2026" />
          </div>

          <div className="grid grid-cols-1 gap-x-7 gap-y-14 md:grid-cols-2 lg:gap-y-16">
            {prototypes.map(function renderPrototype(prototype) {
              return <LabCard key={prototype.slug} {...prototype} />;
            })}
          </div>
        </section>

        <section
          id="about"
          aria-labelledby="about-title"
          className="scroll-mt-24 pb-28"
        >
          <div className="mb-10">
            <SectionHeader label="About" />
          </div>

          <div className="grid gap-12 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,.75fr)] lg:gap-24">
            <div className="max-w-2xl space-y-6 text-[18px] leading-[1.65] tracking-[-0.02em] text-black/68">
              <p>
                I work between design and frontend engineering, turning visual
                ideas into responsive, accessible interfaces that hold up in
                production.
              </p>

              <p className="text-black/42">
                I care about the parts people notice when they are right and
                immediately feel when they are not: interaction, motion,
                hierarchy, performance, accessibility, and the small
                implementation decisions behind them.
              </p>
            </div>

            <div>
              <p className="mb-5 text-[12px] font-medium text-black/35">
                Working with
              </p>

              <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[14px] leading-6 text-black/58">
                {techStack.map(function renderTech(tech) {
                  return <li key={tech}>{tech}</li>;
                })}
              </ul>
            </div>
          </div>
        </section>

        <footer className="border-t border-black/10 py-8">
          <div className="flex flex-col justify-between gap-8 sm:flex-row sm:items-end">
            <div>
              <p className="text-[12px] font-medium text-black/35">
                Get in touch
              </p>

              <a
                href="mailto:uzochukwuokafor01@gmail.com"
                className="mt-2 inline-block rounded-sm text-[16px] font-medium tracking-[-0.02em] text-black transition-opacity hover:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/70 focus-visible:ring-offset-4 focus-visible:ring-offset-[#f3f3f0]"
              >
                Email me
              </a>
            </div>

            <nav
              aria-label="Social links"
              className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] font-medium text-black/45"
            >
              {externalLinks.map(function renderExternalLink(link) {
                return (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-sm transition-colors hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/70 focus-visible:ring-offset-4 focus-visible:ring-offset-[#f3f3f0]"
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
    </main>
  );
}
