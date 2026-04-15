import Link from "next/link";

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground p-8 max-w-lg mx-auto">
      <Link
        href="/"
        className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
      >
        ← Back to workflow
      </Link>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">Profile & resume</h1>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
        Your resume and parsed profile should be added when you create an account so
        this workflow never stops to ask for uploads. That flow is not wired yet; the
        pipeline still loads a local profile file in development.
      </p>
      <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
        Next: sign-up, resume upload, OCR/parser, and a stored profile served from the
        API for the Profile step.
      </p>
    </div>
  );
}
