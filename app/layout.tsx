import type { Metadata } from "next";
import { Roboto, Open_Sans } from "next/font/google";
import "./globals.css";

const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ["latin"],
  variable: '--font-roboto',
  display: 'swap',
});

const openSans = Open_Sans({
  weight: ['300', '400', '600', '700'],
  subsets: ["latin"],
  variable: '--font-open-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Zazi iZandi - Data-Driven Early Literacy Intervention",
  description: "Zazi iZandi is a data-driven early literacy intervention program supporting Foundation Phase learners in South African schools.",
  keywords: ["education", "literacy", "South Africa", "early learning", "foundation phase"],
  authors: [{ name: "Zazi iZandi" }],
  openGraph: {
    title: "Zazi iZandi - Data-Driven Early Literacy Intervention",
    description: "Supporting Foundation Phase learners with data-driven literacy interventions",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${roboto.variable} ${openSans.variable}`}>
      <body className={`${openSans.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}