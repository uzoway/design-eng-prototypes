import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
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

  alternates: {
    canonical: "/",
  },

  openGraph: {
    title,
    description,
    type: "website",
    url: "/",
    siteName: "Uzo Okafor",
    locale: "en_US",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Uzo Okafor — Design Engineer portfolio",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title,
    description,
    creator: "@uzodev",
    images: ["/og.png"],
  },

  robots: {
    index: true,
    follow: true,
  },
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
      </head>

      <body data-theme-animate className="min-h-full bg-[#f4f4f1] text-[#111]">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
