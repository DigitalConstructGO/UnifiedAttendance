import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";

import "../index.css";
import Providers from "@/components/providers";
import { getBrand } from "@/lib/brand";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrand();
  return { title: brand.name, description: `${brand.name} — ${brand.tagline}` };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${plusJakartaSans.variable} ${spaceGrotesk.variable} antialiased`}>
        <Providers>
          <div className="h-svh">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
