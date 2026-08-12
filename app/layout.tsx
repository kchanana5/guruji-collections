import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Guruji Collections | GJC",
  description: "GJC — curated fashion and clothing from Guruji Collections.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
