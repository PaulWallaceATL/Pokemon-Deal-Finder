"use client";

import Link from "next/link";
import { Zap, Search, LayoutDashboard, Bookmark } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <Zap className="h-5 w-5 text-yellow-500" />
            <span>PokeDeal</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            <Link
              href="/"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              <LayoutDashboard className="mr-1.5 h-4 w-4" />
              Deals
            </Link>
            <Link
              href="/tracked"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              <Bookmark className="mr-1.5 h-4 w-4" />
              Tracked
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="md:hidden">
            <Search className="h-5 w-5" />
          </Button>
          <ThemeToggle />
          <Link
            href="/login"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Sign in
          </Link>
          <Avatar className="h-8 w-8 cursor-pointer">
            <AvatarFallback className="text-xs">PD</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
