"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState, type MouseEvent } from "react";
import { flushSync } from "react-dom";
import { useReducedMotion } from "framer-motion";
import { EMAIL } from "./site-footer";

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

// Keys that scroll the page. Pressing one during a nav click's smooth scroll
// hands control back to the reader.
const SCROLL_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "PageUp",
  "PageDown",
  "Home",
  "End",
  " ",
]);

// The section whose top has passed 40% of the viewport. At the very bottom of
// the page the last section wins, even if it's too short to reach that line.
function sectionAtReadingLine(sections: HTMLElement[]) {
  const atEnd =
    window.innerHeight + window.scrollY >=
    document.documentElement.scrollHeight - 2;

  if (atEnd) {
    return sections[sections.length - 1].id;
  }

  const line = window.innerHeight * 0.4;

  let current = sections[0].id;

  sections.forEach(function checkSection(section) {
    if (section.getBoundingClientRect().top <= line) {
      current = section.id;
    }
  });

  return current;
}

const navLinkClass =
  "relative z-10 grid h-8 w-14 place-items-center rounded-[8px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black";

type SiteHeaderProps = {
  // On the homepage the nav follows the section in view. On /lab, Lab is the
  // current page and the other items link back to their homepage sections.
  page?: "home" | "lab";
};

export function SiteHeader({ page = "home" }: SiteHeaderProps) {
  const reducedMotion = Boolean(useReducedMotion());

  const onLab = page === "lab";

  const [activeSection, setActiveSection] = useState(onLab ? "lab" : "work");

  const [indicatorSettled, setIndicatorSettled] = useState(false);

  // Set while a nav click smooth-scrolls to its section, so the sections it
  // passes on the way don't pull the indicator back and forth.
  const lockToTargetRef = useRef(function lockToTarget() {});

  const activeIndex = NAV_ITEMS.findIndex(function findActive(item) {
    return item.id === activeSection;
  });

  // A layout effect, so the indicator is in place before the first paint.
  useLayoutEffect(
    function followSections() {
      if (onLab) {
        return;
      }

      const sections = NAV_ITEMS.map(function getSection(item) {
        return document.getElementById(item.id);
      }).filter(Boolean) as HTMLElement[];

      if (sections.length === 0) {
        return;
      }

      let frame = 0;

      let settleFrame = 0;

      let locked = false;

      let releaseTimer = 0;

      let settled = false;

      function update() {
        frame = 0;

        if (!locked) {
          setActiveSection(sectionAtReadingLine(sections));
        }
      }

      function scheduleUpdate() {
        if (frame === 0) {
          frame = requestAnimationFrame(update);
        }
      }

      function release() {
        window.clearTimeout(releaseTimer);

        locked = false;

        scheduleUpdate();
      }

      // The smooth scroll has ended once scroll events stop for 150ms.
      function holdUntilScrollStops() {
        window.clearTimeout(releaseTimer);

        releaseTimer = window.setTimeout(release, 150);
      }

      lockToTargetRef.current = function lockToTarget() {
        locked = true;

        holdUntilScrollStops();
      };

      function handleScroll() {
        if (locked) {
          holdUntilScrollStops();

          return;
        }

        // Back restores the scroll position just after the page mounts. Move
        // the indicator before that frame paints, so it never shows the top
        // section first.
        if (!settled) {
          flushSync(update);

          return;
        }

        scheduleUpdate();
      }

      function handleReaderScroll() {
        if (locked) {
          release();
        }
      }

      function handleKeyDown(event: KeyboardEvent) {
        if (SCROLL_KEYS.has(event.key)) {
          handleReaderScroll();
        }
      }

      // Place the indicator wherever the page opened, including a scroll
      // position restored by Back, without sliding. Slide only after that.
      update();

      settleFrame = requestAnimationFrame(function waitForPaint() {
        settleFrame = requestAnimationFrame(function settle() {
          settled = true;

          setIndicatorSettled(true);
        });
      });

      window.addEventListener("scroll", handleScroll, {
        passive: true,
      });

      window.addEventListener("resize", scheduleUpdate);

      window.addEventListener("wheel", handleReaderScroll, {
        passive: true,
      });

      window.addEventListener("touchstart", handleReaderScroll, {
        passive: true,
      });

      window.addEventListener("keydown", handleKeyDown);

      return function cleanup() {
        cancelAnimationFrame(frame);

        cancelAnimationFrame(settleFrame);

        window.clearTimeout(releaseTimer);

        window.removeEventListener("scroll", handleScroll);

        window.removeEventListener("resize", scheduleUpdate);

        window.removeEventListener("wheel", handleReaderScroll);

        window.removeEventListener("touchstart", handleReaderScroll);

        window.removeEventListener("keydown", handleKeyDown);
      };
    },
    [onLab],
  );

  function scrollToSection(
    event: MouseEvent<HTMLAnchorElement>,
    sectionId: string,
  ) {
    event.preventDefault();

    const section = document.getElementById(sectionId);

    if (!section) {
      return;
    }

    lockToTargetRef.current();

    setActiveSection(sectionId);

    section.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "start",
    });

    window.history.replaceState(null, "", `#${sectionId}`);
  }

  function scrollToTop(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();

    window.scrollTo({
      top: 0,
      behavior: reducedMotion ? "auto" : "smooth",
    });
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
                className={`absolute bottom-[3px] left-[3px] top-[3px] w-[56px] rounded-[8px] bg-white shadow-[0_1px_2px_rgba(0,0,0,.055),0_3px_9px_rgba(0,0,0,.025)] motion-reduce:transition-none ${
                  indicatorSettled
                    ? "transition-transform duration-[420ms] ease-[cubic-bezier(.22,.72,0,1)]"
                    : ""
                }`}
                style={{
                  transform: `translateX(${activeIndex * 56}px)`,
                }}
              />

              {NAV_ITEMS.map(function renderNavigation(item) {
                const active = activeSection === item.id;

                const className = `${navLinkClass} ${
                  active ? "text-[#111]" : "text-[#646460] hover:text-[#111]"
                }`;

                if (onLab && item.id === "lab") {
                  return (
                    <Link
                      key={item.id}
                      href="/lab"
                      aria-current="page"
                      onClick={scrollToTop}
                      className={className}
                    >
                      {item.label}
                    </Link>
                  );
                }

                if (onLab) {
                  return (
                    <Link
                      key={item.id}
                      href={`/#${item.id}`}
                      className={className}
                    >
                      {item.label}
                    </Link>
                  );
                }

                return (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    aria-current={active ? "location" : undefined}
                    onClick={function handleClick(event) {
                      scrollToSection(event, item.id);
                    }}
                    className={className}
                  >
                    {item.label}
                  </a>
                );
              })}
            </nav>

            <a
              href={`mailto:${EMAIL}`}
              className="grid min-h-9 place-items-center rounded-[10px] bg-[#111] px-3.5 text-[10.5px] font-medium text-white transition-[opacity,transform] duration-200 hover:opacity-75 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-3 focus-visible:ring-offset-[#f4f4f1] motion-reduce:transition-none motion-reduce:active:scale-100"
            >
              Email me
            </a>
          </div>
        </div>
      </header>

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
    </>
  );
}
