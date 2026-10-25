import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Literacy Verse — A Universe of Learning",
  description: "A welcoming global learning space for books, an AI tutor, community podcasts, and literacy projects.",
  applicationName: "Literacy Verse",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
