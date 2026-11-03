import { Logo } from "@/components/site/logo";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="container-x py-6">
        <Logo />
      </div>
      <div className="container-x flex flex-1 flex-col items-start justify-center pb-32">
        <p className="tabular text-sm font-semibold text-brand-600">404</p>
        <h1 className="mt-3 text-4xl sm:text-5xl">We couldn’t find that page.</h1>
        <p className="mt-4 max-w-lg text-lg text-muted">The link may be old, or the page may have moved.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/" size="lg">
            Go to the homepage
          </ButtonLink>
          <ButtonLink href="/services" variant="outline" size="lg">
            Browse services
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
