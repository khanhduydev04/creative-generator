import Link from "next/link";
import Image from "next/image";
import { BRANDING } from "@/lib/branding";
import type { Dictionary } from "@/lib/i18n/types";

interface FooterProps {
  t: Dictionary;
}

export function Footer({ t }: FooterProps) {
  return (
    <footer className="border-t border-border/50 px-4 py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
        <Link
          href="/"
          className="flex cursor-pointer items-center gap-2 opacity-60 transition-opacity hover:opacity-100"
        >
          <Image
            src={BRANDING.logoDark}
            alt={BRANDING.appName}
            width={20}
            height={20}
          />
          <span className="text-sm font-medium text-foreground-muted">
            {BRANDING.appName}
          </span>
        </Link>

        <p className="text-sm text-foreground-subtle">
          &copy; 2026 Adlance. {t.footer.rights}
        </p>

        <div className="flex items-center gap-1.5 text-sm text-foreground-subtle">
          <span>{t.footer.madeBy}</span>
          <a
            href="https://vokhanhduy.site"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text font-semibold text-transparent transition-opacity hover:opacity-80"
          >
            KhanhDuyDev
          </a>
        </div>
      </div>
    </footer>
  );
}
