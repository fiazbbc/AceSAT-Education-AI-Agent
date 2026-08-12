import type { Metadata } from "next";
import "./globals.css";
import "./student-theme.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://acepath-sat-demo.vercel.app"),
  title: "AcePath AI — Your adaptive SAT study path",
  description:
    "A free adaptive SAT tutor that learns how you learn and builds the next best step.",
  icons: { icon: "/acepath.svg", shortcut: "/acepath.svg", apple: "/acepath.svg" },
  openGraph: {
    title: "AcePath AI — Free adaptive SAT tutoring",
    description: "A free SAT tutor that notices, remembers, and adapts.",
    images: [
      {
        url: "/og.png",
        width: 1672,
        height: 941,
        alt: "AcePath AI adaptive learning path",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AcePath AI",
    description: "A free SAT tutor that notices, remembers, and adapts.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
