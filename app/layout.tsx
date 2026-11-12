import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "./components/analytics";
import { ThemeProvider } from "./components/theme-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = "https://uzookafor.com";

const title = "Uzo Okafor — Design Engineer";

const description =
  "Design engineer building responsive web interfaces, interaction prototypes, and production experiences with React, Next.js, Webflow, and GSAP, with a focus on accessibility, motion, and performance.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  title: {
    default: title,
    template: "%s — Uzo Okafor",
  },

  description,

  authors: [
    {
      name: "Uzo Okafor",
      url: siteUrl,
    },
  ],

  creator: "Uzo Okafor",

  /*
   * No canonical or og:url here: every page inherits the layout's metadata, so
   * "/" would tell search engines and link previews that each prototype is the
   * home page. Without them, a page counts as its own canonical.
   */

  openGraph: {
    title,
    description,
    type: "website",
    siteName: "Uzo Okafor",
    locale: "en_US",
    images: [
      {
        url: "/og.png?v=2",
        width: 2400,
        height: 1260,
        alt: "Uzo Okafor — Design Engineer portfolio",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title,
    description,
    creator: "@uzodev",
    images: ["/og.png?v=2"],
  },

  robots: {
    index: true,
    follow: true,
  },
};

// Tells search engines and answer engines who the site belongs to and where else that
// person lives online, so "Uzo Okafor", the Contra profile and the work resolve to one entity.
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": `${siteUrl}/#person`,
      name: "Uzo Okafor",
      alternateName: "Uzochukwu Okafor",
      jobTitle: "Design Engineer",
      description,
      url: siteUrl,
      image: `${siteUrl}/og.png?v=2`,
      email: "mailto:uzochukwuokafor01@gmail.com",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Abuja",
        addressCountry: "NG",
      },
      knowsAbout: [
        "Design engineering",
        "Interaction design",
        "Prototyping",
        "Motion design",
        "React",
        "Next.js",
        "TypeScript",
        "Motion for React",
        "Webflow",
        "GSAP",
        "Web accessibility",
      ],
      sameAs: [
        "https://contra.com/uzochukwu_okafor",
        "https://www.linkedin.com/in/uzochukwuokafor/",
        "https://github.com/uzoway",
        "https://x.com/uzodev",
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: "Uzo Okafor",
      description,
      publisher: { "@id": `${siteUrl}/#person` },
    },
  ],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f4f4f1",
  colorScheme: "light",
};

const themeInitializationScript = `
  (() => {
    try {
      const storedTheme = localStorage.getItem("merchant-theme");

      const theme =
        storedTheme === "light" ||
        storedTheme === "dark"
          ? storedTheme
          : window.matchMedia(
              "(prefers-color-scheme: dark)"
            ).matches
            ? "dark"
            : "light";

      document.documentElement.dataset.theme =
        theme;
    } catch {
      document.documentElement.dataset.theme =
        window.matchMedia(
          "(prefers-color-scheme: dark)"
        ).matches
          ? "dark"
          : "light";
    }
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: themeInitializationScript,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
      </head>

      <body data-theme-animate className="min-h-full bg-[#f4f4f1] text-[#111]">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
      <Analytics />
    </html>
  );
}
