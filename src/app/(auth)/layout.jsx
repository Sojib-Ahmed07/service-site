import { Check } from "lucide-react";
import { images } from "@/lib/data";
import { Logo } from "@/components/site/logo";
import { Photo } from "@/components/ui/photo";

export default function AuthLayout({ children }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.05fr]">
      <div className="flex flex-col px-4 py-6 sm:px-10">
        <Logo />
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">{children}</div>
      </div>
      <div className="relative hidden p-3 lg:block">
        <Photo src={images.livingRoom} alt="" sizes={1200} className="h-full rounded-[28px]" />
        <div className="absolute inset-x-10 bottom-10 rounded-2xl bg-white/95 p-6 shadow-[var(--shadow-float)] backdrop-blur">
          <p className="text-xl font-semibold tracking-[-0.02em]">Your home jobs, in one place.</p>
          <ul className="mt-4 space-y-2 text-[15px] text-muted">
            {[
              "Track every booking and arrival window",
              "Rebook a favourite service in two taps",
              "Download tax invoices any time",
            ].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <Check className="size-4 text-success" strokeWidth={3} /> {t}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
