import { LoginForm } from "@/components/admin/login-form";
import { Card } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <div className="page-shell flex min-h-[100svh] items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="relative overflow-hidden rounded-3xl border border-[var(--border-soft)] bg-[linear-gradient(135deg,rgba(39,193,165,0.07),rgba(79,116,217,0.04),rgba(255,255,255,0.96))] p-8 md:p-10 shadow-[var(--shadow-card)]">
          <div className="absolute -right-16 top-10 h-48 w-48 rounded-full bg-[rgba(39,193,165,0.14)] blur-3xl" />
          <div className="relative max-w-xl">
            <p className="text-xs uppercase tracking-[0.24em] text-text-muted">
              WashAndWow
            </p>
            <h1 className="mt-6 font-display text-5xl font-semibold leading-[1.02] tracking-[-0.05em] text-foreground md:text-6xl">
              Everything you need to run the business in one place.
            </h1>
            <p className="mt-6 text-lg leading-8 text-text-secondary">
              See orders, manage branches, update your staff, and change the
              services customers can book.
            </p>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {[
                ["Orders", "Check progress, payments, staff, and timing"],
                [
                  "Branches",
                  "Manage where work is handled and when slots are open",
                ],
                [
                  "Services",
                  "Update what customers can choose and how it is priced",
                ],
              ].map(([title, copy]) => (
                <div
                  key={title}
                  className="rounded-[24px] border border-[var(--border-soft)] bg-surface/85 p-4"
                >
                  <p className="font-semibold text-foreground">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">
                    {copy}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="rounded-3xl p-8 md:p-10 shadow-[var(--shadow-card)]">
          <p className="text-xs uppercase tracking-[0.24em] text-text-muted">
            Sign in
          </p>
          <h2 className="mt-4 font-display text-4xl font-semibold tracking-[-0.04em] text-foreground">
            Welcome back
          </h2>
          <p className="mt-3 text-sm leading-7 text-text-secondary">
            Sign in to open the admin area and continue managing the day-to-day
            work.
          </p>
          <div className="mt-8">
            <div className="mb-6 rounded-[16px] bg-surface-muted p-4 border border-[var(--border-soft)]">
              <p className="text-sm font-semibold text-foreground">Developer Login Hint:</p>
              <p className="mt-1 text-sm text-text-secondary">Email: admin@gmail.com</p>
              <p className="text-sm text-text-secondary">Password: admin123</p>
            </div>
            <LoginForm />
          </div>
        </Card>
      </div>
    </div>
  );
}
