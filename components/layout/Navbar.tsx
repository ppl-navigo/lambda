import { AlertCircle, Menu, Plus, Settings, User } from "lucide-react";
import { Button } from "../ui/button";
import Link from "next/link";
import Image from "next/image";

export function Navbar() {
  return (
    <header className="sticky top-0 z-10 border-b border-zinc-800 bg-black/90 backdrop-blur-sm">
      <div className="flex h-14 items-center px-4 lg:px-8">
        <div className="flex items-center gap-2">
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
        </div>
        <nav className="ml-6 hidden md:flex gap-4">
          <Button variant="ghost" className="text-white h-8 px-2">
            <Link href="/">
              Dashboard
            </Link>
          </Button>
          <Button variant="ghost" className="text-zinc-400 h-8 px-2">
            Documents
          </Button>
          <Button variant="ghost" className="text-zinc-400 h-8 px-2">
            Contracts
          </Button>
          <Button variant="ghost" className="text-zinc-400 h-8 px-2">
            <Link href="/chat">
              Assistant
            </Link>
          </Button>
          <Button variant="ghost" className="text-zinc-400 h-8 px-2">
            <Link href="/search">
              Search
            </Link>
          </Button>
        </nav>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 md:hidden">
          <Menu className="h-4 w-4" />
          <span className="sr-only">Menu</span>
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 relative">
            <div className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500"></div>
            <AlertCircle className="h-4 w-4" />
            <span className="sr-only">Notifications</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            <Plus className="h-4 w-4 mr-1" /> New
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400">
            <User className="h-4 w-4" />
            <span className="sr-only">Account</span>
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400">
            <Settings className="h-4 w-4" />
            <span className="sr-only">Settings</span>
          </Button>
        </div>
      </div>
    </header>
  )
}