import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "./components/theme-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://uzoway.github.io"),
  title: "Uzo Okafor — Design Engineer",
  description:
    "Design engineer building thoughtful interfaces, interaction prototypes, and financial product experiences with React and Next.js.",
  openGraph: {
    title: "Uzo Okafor — Design Engineer",
    description:
      "Thoughtful interfaces, interaction prototypes, and financial product experiences.",
    type: "website",
    url: "https://uzoway.github.io/design-eng-prototypes/",
    images: [
      {
        url: "/design-eng-prototypes/og.png",
        width: 1200,
        height: 630,
        alt: "Uzo Okafor — Design Engineer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Uzo Okafor — Design Engineer",
    description:
      "Thoughtful interfaces, interaction prototypes, and financial product experiences.",
    images: ["/design-eng-prototypes/og.png"],
  },
};

const themeInitializationScript = `
  (() => {
    try {
      const storedTheme = localStorage.getItem("merchant-theme");

      const theme =
        storedTheme === "light" || storedTheme === "dark"
          ? storedTheme
          : window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";

      document.documentElement.dataset.theme = theme;
    } catch {
      document.documentElement.dataset.theme =
        window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    }
  })();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
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

      <body data-theme-animate className="min-h-full flex flex-col">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
