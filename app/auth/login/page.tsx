import { LoginForm } from "@/components/login-form";
import Link from "next/link";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm />
        <p className="mt-6 text-center text-sm text-[var(--taste-text-muted)]">
          <Link href="/install" className="text-[var(--taste-amber-bright)] underline underline-offset-4">Nainstalovat Pivník do telefonu</Link>
        </p>
      </div>
    </div>
  );
}
