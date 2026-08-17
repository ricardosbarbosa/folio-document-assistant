import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Folio | Evidence first document assistant",
  description: "A retrieval augmented document assistant with visible sources and response quality inspection.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
