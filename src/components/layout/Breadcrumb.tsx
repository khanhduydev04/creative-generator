// Client Component: renders a breadcrumb trail with linkable ancestor segments
"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <div key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1.5">
            {index > 0 && (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-foreground-subtle" />
            )}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="truncate text-foreground-muted transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={`truncate ${isLast ? "font-medium text-foreground" : "text-foreground-muted"}`}
              >
                {item.label}
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
}
