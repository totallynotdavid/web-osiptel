import { createSignal, Show } from "solid-js";
import { action, useAction } from "@solidjs/router";

import { loginAction } from "~/actions/auth/login";
import { Logo } from "~/components/logo";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

const login = action(loginAction, "login");

export default function LoginPage() {
  const submit = useAction(login);
  const [error, setError] = createSignal<string | null>(null);
  const [loading, setLoading] = createSignal(false);

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await submit(new FormData(e.target as HTMLFormElement));
      if (result && !result.ok) {
        setError(
          result.error === "account_disabled"
            ? "Your account is disabled."
            : "Invalid email or password.",
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div class="min-h-screen flex items-center justify-center px-6 bg-ink font-mono">
      <div class="w-full max-w-sm">
        <div class="flex items-center gap-3 mb-12">
          <Logo size={24} detail />
          <span class="label text-white">Vulf</span>
        </div>

        <h1 class="page-title mb-2">Sign in</h1>
        <p class="section-label mb-8">Enter your credentials to continue</p>

        <form onSubmit={handleSubmit} class="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            name="email"
            required
            autocomplete="email"
            placeholder="you@example.com"
          />
          <Input
            label="Password"
            type="password"
            name="password"
            required
            autocomplete="current-password"
            placeholder="••••••••"
          />

          <Show when={error()}>
            <p class="text-xs text-red-400">{error()}</p>
          </Show>

          <Button type="submit" loading={loading()} class="w-full mt-2">
            {loading() ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
