import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "SkillX - Career Development Platform",
  description: "India's first all-in-one, domain-agnostic career development platform for students and early-career professionals. Connect with internships, mentors, and industry opportunities.",
  keywords: "career development, internships, mentorship, skill development, job opportunities, students, professionals",
  authors: [{ name: "INNO-TECH" }],
  openGraph: {
    title: "SkillX - Career Development Platform",
    description: "India's first all-in-one, domain-agnostic career development platform",
    type: "website",
    locale: "en_US",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
