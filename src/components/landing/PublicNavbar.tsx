import Link from "next/link";
import Image from "next/image";
import { BRANDING } from "@/lib/branding";
import type { Dictionary } from "@/lib/i18n/types";
import { LanguageToggle } from "@/components/ui/LanguageToggle";

interface PublicNavbarProps {
  t: Dictionary;
}

export function PublicNavbar({ t }: PublicNavbarProps) {
  return (
    <nav className="fixed top-5 left-5 right-5 z-50 mx-auto max-w-6xl">
      <div className="flex items-center justify-between rounded-2xl glass-strong px-5 py-3">
        <Link
          href="/"
          className="flex cursor-pointer items-center gap-2.5 transition-opacity duration-200 hover:opacity-80"
        >
          <Image
            src={BRANDING.logoDark}
            alt={BRANDING.appName}
            width={28}
            height={28}
            priority
          />
          <span className="font-semibold tracking-tight text-foreground">
            {BRANDING.appName}
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <Link
            href="/login"
            className="cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-foreground-muted transition-colors duration-200 hover:text-foreground"
          >
            {t.nav.signIn}
          </Link>
          <Link
            href="/signup"
            className="cursor-pointer rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:shadow-[0_0_20px_hsl(262_83%_65%/0.4)]"
          >
            {t.nav.getStarted}
          </Link>
        </div>
      </div>
    </nav>
  );
}
