import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import Navbar from "./components/Navbar"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Navigo - Legal Document Generator",
  description: "Easily create legal documents with AI assistance.",
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#09090B] text-white`}
      >
        {/* ✅ Navbar with proper padding */}
        <Navbar />

        {/* ✅ Main Container to match shadcn layout */}
        <main className="container mx-auto px-8 py-10 min-h-screen border border-[#27272A] rounded-md shadow-md">
          {children}
        </main>
      </body>
    </html>
  )
}
