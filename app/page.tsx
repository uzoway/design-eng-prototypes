import Link from "next/link";

const prototypes = [
  {
    slug: "photo-pager",
    title: "Photo pager",
    description:
      "A tactile photo browser with gesture-led navigation and a precise sense of position.",
    disciplines: ["Interaction", "Motion"],
  },
  {
    slug: "grid-to-detail",
    title: "Grid to detail",
    description:
      "A fluid transition from a responsive image grid into a focused, full-screen view.",
    disciplines: ["Prototyping", "Motion"],
  },
  {
    slug: "merchant-onboarding",
    title: "Merchant onboarding",
    description:
      "A review workflow that makes verification status, progress, and decisions easy to follow.",
    disciplines: ["Product design", "Fintech"],
  },
  {
    slug: "currency-converter",
    title: "Currency converter",
    description:
      "A conversion flow designed to make balances, rates, and fees clear before you commit.",
    disciplines: ["Product design", "Fintech"],
  },
];

const externalLinks = [
  { label: "X", href: "https://x.com/uzodev" },
  { label: "GitHub", href: "https://github.com/uzoway" },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/uzochukwuokafor/",
  },
];

export default function Home() {
  return (
    <main className="portfolio-shell">
      <div className="portfolio-page">
        <header className="portfolio-header portfolio-reveal">
          <Link className="portfolio-name" href="/" aria-label="Uzo Okafor, home">
            Uzo Okafor
          </Link>

          <div className="portfolio-role">
            <span className="portfolio-status" aria-hidden="true" />
            Design engineer · Nigeria
          </div>
        </header>

        <section className="portfolio-intro portfolio-reveal" aria-labelledby="intro-heading">
          <p className="portfolio-kicker">Hello, I’m Uzo.</p>
          <h1 className="portfolio-lede" id="intro-heading">
            I turn rough ideas into clear, thoughtful interfaces, then stay with
            the details until they feel right.
          </h1>
          <p className="portfolio-supporting">
            Lately, I’ve been building small React and Next.js prototypes around
            motion, transitions, and financial product experiences.
          </p>
        </section>

        <section className="portfolio-work portfolio-reveal" aria-labelledby="work-heading">
          <div className="portfolio-section-heading">
            <h2 id="work-heading">Selected work</h2>
            <span>2026</span>
          </div>

          <ol className="portfolio-projects">
            {prototypes.map((prototype, index) => (
              <li key={prototype.slug}>
                <Link className="portfolio-project" href={`/${prototype.slug}`}>
                  <span className="portfolio-index" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="portfolio-project-copy">
                    <span className="portfolio-project-title">
                      {prototype.title}
                    </span>
                    <span className="portfolio-project-description">
                      {prototype.description}
                    </span>
                    <span className="portfolio-tags" aria-label="Disciplines">
                      {prototype.disciplines.map((discipline) => (
                        <span key={discipline}>{discipline}</span>
                      ))}
                    </span>
                  </span>
                  <span className="portfolio-arrow" aria-hidden="true">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>

        <footer className="portfolio-footer portfolio-reveal">
          <div>
            <p className="portfolio-kicker">Let’s talk</p>
            <p className="portfolio-footer-copy">
              I’m looking for a team that cares about craft and ships with
              purpose. If that sounds like yours, I’d like to hear from you.
            </p>
          </div>

          <div className="portfolio-contact">
            <a href="mailto:uzochukwuokafor01@gmail.com">
              uzochukwuokafor01@gmail.com <span aria-hidden="true">↗</span>
            </a>
            <nav aria-label="Social links">
              {externalLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {link.label} <span aria-hidden="true">↗</span>
                </a>
              ))}
            </nav>
          </div>
        </footer>
      </div>
    </main>
  );
}
