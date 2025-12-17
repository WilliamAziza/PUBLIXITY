import type { Metadata } from "next";
import Navbar from "../components/Navbar";
import Providers from "../components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Publixity - Bulk SMS Platform",
  description: "Powerful bulk SMS platform for businesses. Reach thousands of customers instantly with our reliable messaging service.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">
        <Navbar />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
