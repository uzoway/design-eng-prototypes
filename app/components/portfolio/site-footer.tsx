export const EMAIL = "uzochukwuokafor01@gmail.com";

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

export function SiteFooter() {
  return (
    <footer className="border-t border-black/10 py-8">
      <div className="flex flex-col justify-between gap-10 sm:flex-row sm:items-end">
        <div>
          <p className="text-[11px] text-[#686864]">Get in touch</p>

          <a
            href={`mailto:${EMAIL}`}
            className="mt-2 inline-block rounded-sm text-[15px] font-medium tracking-[-0.02em] transition-opacity hover:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-3 focus-visible:ring-offset-[#f4f4f1]"
          >
            {EMAIL}
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
  );
}
