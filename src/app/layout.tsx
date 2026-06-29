import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/features/app/context";
import { LocaleProvider } from "@/lib/i18n/context";
import { QueryProvider } from "@/lib/query/provider";
import { BRANDING } from "@/lib/branding";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";
import { VercelAnalytics } from "@/components/analytics/VercelAnalytics";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin", "latin-ext", "vietnamese"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: BRANDING.appName, template: `%s | ${BRANDING.appName}` },
  description: BRANDING.appDescription,
  openGraph: {
    title: BRANDING.appName,
    description: BRANDING.appDescription,
    type: "website",
    images: [
      {
        url: BRANDING.socialPreview,
        width: 1200,
        height: 630,
        alt: BRANDING.appName,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: BRANDING.appName,
    description: BRANDING.appDescription,
    images: [BRANDING.socialPreview],
  },
  icons: {
    icon: BRANDING.favicon,
  },
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="vi"
      className={inter.variable}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background font-sans antialiased">
        <QueryProvider>
          <LocaleProvider>
            <AppProvider>
              {children}
              <PageViewTracker />
              <Toaster richColors position="top-right" />
              <VercelAnalytics />
            </AppProvider>
          </LocaleProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
