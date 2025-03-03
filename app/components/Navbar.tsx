"use client" // This is a Client Component

import { useState } from "react"
import Link from "next/link"
import { FiMenu, FiX } from "react-icons/fi" // Icons for mobile menu
import Image from "next/image"

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <nav className="bg-[#1E1E1E] text-white h-[84px] flex items-center px-10 border-b border-[#27272A]">
      <div className="container mx-auto flex justify-between items-center">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <Image
            src="/logonavigo.png"
            alt="Navigo Logo"
            width={600} // Base width
            height={300} // Base height
            className="w-[20%] h-auto"
            priority
          />
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex space-x-8 text-lg">
          <Link href="/" className="hover:text-orange-400">
            Home
          </Link>
          <Link href="/about" className="hover:text-orange-400">
            About Us
          </Link>
          <Link href="/services" className="hover:text-orange-400">
            Services
          </Link>
          <Link href="/testimonials" className="hover:text-orange-400">
            Testimonials
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button onClick={() => setIsOpen(!isOpen)} className="md:hidden">
          {isOpen ? <FiX size={28} /> : <FiMenu size={28} />}
          aria-label={isOpen ? "Close menu" : "Open menu"}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden absolute top-[84px] left-0 w-full bg-[#27272A] p-5 space-y-4 shadow-lg">
          <Link href="/" className="block text-lg hover:text-orange-400">
            Home
          </Link>
          <Link href="/about" className="block text-lg hover:text-orange-400">
            About Us
          </Link>
          <Link
            href="/services"
            className="block text-lg hover:text-orange-400"
          >
            Services
          </Link>
          <Link
            href="/testimonials"
            className="block text-lg hover:text-orange-400"
          >
            Testimonials
          </Link>
        </div>
      )}
    </nav>
  )
}

export default Navbar
