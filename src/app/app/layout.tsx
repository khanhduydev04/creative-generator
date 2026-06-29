import type { ReactNode } from "react";
import { JetBrains_Mono } from "next/font/google";
import { redirect } from "next/navigation";
import { AuthProvider } from "@/features/auth/context";
import { createClient } from "@/lib/supabase/server";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "latin-ext", "vietnamese"],
  variable: "--font-mono",
  display: "swap",
});

interface AppLayoutProps {
  children: ReactNode;
}

export default async function AppLayout({ children }: AppLayoutProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className={jetbrainsMono.variable}>
      <AuthProvider>{children}</AuthProvider>
    </div>
  );
}
