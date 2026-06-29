import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata: Metadata = {
  title: "Sign Up",
  description:
    "Create a free Adlance account and start generating professional ads with AI.",
};

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-background pt-20 text-foreground">
      <SignupForm />
    </main>
  );
}
