"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Zap, LayoutDashboard, Bookmark, GitBranch, LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : "PD";

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
            <Link
              href="/pricing-pipeline"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              <GitBranch className="mr-1.5 h-4 w-4" />
              Pricing
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <>
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {user.email}
              </span>
              <Avatar className="h-8 w-8 cursor-pointer">
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="mr-1 h-4 w-4" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </>
          ) : (
            <Link
              href="/login"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
