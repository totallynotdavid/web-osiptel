import { A, createAsync, query, useAction } from "@solidjs/router";
import { createSignal, For, Show, Suspense } from "solid-js";

import { getAdminStats, getAdminUsers } from "~/actions/admin/queries";
import { createUserMutation, toggleUserActiveMutation } from "~/lib/mutations/admin";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { EmptyState } from "~/components/ui/empty-state";
import { Input } from "~/components/ui/input";
import { Select } from "~/components/ui/select";
import { PageHeader } from "~/components/page-header";

const adminStatsQuery = query(getAdminStats, "adminStats");
const adminUsersQuery = query(getAdminUsers, "adminUsers");

export const route = {
  preload: () => Promise.all([adminStatsQuery(), adminUsersQuery()]),
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  sales_manager: "Manager",
  client: "Client",
};

export default function AdminPage() {
  const stats = createAsync(() => adminStatsQuery());
  const users = createAsync(() => adminUsersQuery());
  const createUser = useAction(createUserMutation);
  const toggleActive = useAction(toggleUserActiveMutation);

  const [showForm, setShowForm] = createSignal(false);
  const [formError, setFormError] = createSignal<string | null>(null);

  async function handleCreate(e: SubmitEvent) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    const result = await createUser(fd);
    if (result.ok) {
      setShowForm(false);
      setFormError(null);
      (e.currentTarget as HTMLFormElement).reset();
    } else {
      setFormError(result.error);
    }
  }

  async function handleToggle(userId: string, isActive: number) {
    const fd = new FormData();
    fd.append("user_id", userId);
    fd.append("is_active", String(isActive));
    await toggleActive(fd);
  }

  return (
    <div class="max-w-5xl mx-auto">
      <PageHeader eyebrow="Admin" title="Administration" />

      <Suspense>
        <div class="grid grid-cols-2 gap-3 mb-8">
          <Card class="p-6">
            <p class="section-label mb-3">Users</p>
            <p class="text-3xl font-medium text-white font-sans">{stats()?.totalUsers ?? "-"}</p>
          </Card>
          <Card class="p-6">
            <p class="section-label mb-3">All jobs</p>
            <p class="text-3xl font-medium text-white font-sans mb-4">
              {stats()?.totalJobs ?? "-"}
            </p>
            <A href="/admin/jobs" class="link-accent">
              View all →
            </A>
          </Card>
        </div>

        <div class="mb-6">
          <div class="flex items-center justify-between mb-4">
            <p class="section-label">Users</p>
            <Button onClick={() => setShowForm(!showForm())}>+ Create user</Button>
          </div>

          <Show when={showForm()}>
            <Card class="p-6 mb-4">
              <p class="section-label mb-4">New user</p>
              <form onSubmit={handleCreate} class="grid grid-cols-2 gap-4">
                <Input
                  label="Full name"
                  type="text"
                  name="full_name"
                  required
                  placeholder="Jane Doe"
                />
                <Input
                  label="Email"
                  type="email"
                  name="email"
                  required
                  placeholder="jane@example.com"
                />
                <Input
                  label="Password"
                  type="password"
                  name="password"
                  required
                  minlength="8"
                  placeholder="••••••••"
                />
                <Select label="Role" name="role">
                  <option value="client">Client</option>
                  <option value="sales_manager">Manager</option>
                  <option value="admin">Admin</option>
                </Select>
                <Show when={formError()}>
                  <p class="col-span-2 text-xs text-red-400">{formError()}</p>
                </Show>
                <div class="col-span-2 flex gap-3">
                  <Button type="submit">Create</Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      setFormError(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>
          </Show>

          <Show when={(users() ?? []).length > 0} fallback={<EmptyState>No users</EmptyState>}>
            <Card class="overflow-hidden">
              <div class="grid grid-cols-[1fr_auto_auto_auto] gap-x-6 px-6 py-2 border-b border-gray-900">
                <span class="table-header-cell">User</span>
                <span class="table-header-cell">Role</span>
                <span class="table-header-cell">Status</span>
                <span class="table-header-cell">Actions</span>
              </div>
              <For each={users()}>
                {(user, i) => (
                  <div
                    class="grid grid-cols-[1fr_auto_auto_auto] gap-x-6 px-6 py-4 items-center"
                    classList={{ "border-t border-gray-900": i() > 0 }}
                  >
                    <div>
                      <p class="text-sm text-white">{user.full_name}</p>
                      <p class="text-xs text-gray-500">{user.email}</p>
                    </div>
                    <span class="text-xs text-gray-400">{ROLE_LABELS[user.role] ?? user.role}</span>
                    <Badge variant={user.is_active ? "cyan" : "muted"}>
                      {user.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Button variant="ghost" onClick={() => handleToggle(user.id, user.is_active)}>
                      {user.is_active ? "Disable" : "Enable"}
                    </Button>
                  </div>
                )}
              </For>
            </Card>
          </Show>
        </div>
      </Suspense>
    </div>
  );
}
