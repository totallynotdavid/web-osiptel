import { type JSX, Show } from "solid-js";
import { A, action, useLocation } from "@solidjs/router";
import { getRequestEvent } from "solid-js/web";

import { logoutAction } from "~/actions/auth/logout";
import { Logo } from "~/components/logo";
import { Button } from "~/components/ui/button";

const logout = action(logoutAction, "logout");

function NavLink(props: { href: string; children: JSX.Element }) {
  const location = useLocation();
  const active = () => location.pathname.startsWith(props.href);
  return (
    <A href={props.href} class="nav-link" classList={{ active: active() }}>
      {props.children}
    </A>
  );
}

export default function AppLayout(props: { children: JSX.Element }) {
  const event = getRequestEvent();
  const session = event?.locals?.session;

  return (
    <div class="min-h-screen flex flex-col bg-ink text-white font-mono">
      <nav class="flex items-center justify-between px-6 py-5 md:px-10 border-b border-gray-900">
        <div class="flex items-center gap-6">
          <A href="/dashboard" class="flex items-center gap-2">
            <Logo size={20} />
            <span class="label text-white">Vulf</span>
          </A>
          <div class="flex items-center gap-4">
            <NavLink href="/dashboard">Dashboard</NavLink>
            <Show when={session?.role === "sales_manager" || session?.role === "admin"}>
              <NavLink href="/manager">Manager</NavLink>
            </Show>
            <Show when={session?.role === "admin"}>
              <NavLink href="/admin">Admin</NavLink>
            </Show>
          </div>
        </div>
        <div class="flex items-center gap-4">
          <NavLink href="/settings">Settings</NavLink>
          <form action={logout} method="post">
            <Button variant="ghost" type="submit">
              Sign Out
            </Button>
          </form>
        </div>
      </nav>
      <main class="flex-grow px-6 py-8 md:px-10">{props.children}</main>
    </div>
  );
}
