import { A, createAsync, query } from "@solidjs/router";
import { For, Show, Suspense } from "solid-js";

import { getAllJobs } from "~/actions/jobs/queries";
import { Card } from "~/components/ui/card";
import { EmptyState } from "~/components/ui/empty-state";
import { JobBadge } from "~/components/job-badge";
import { PageHeader } from "~/components/page-header";

const allJobsQuery = query(getAllJobs, "allJobs");

export const route = {
  preload: () => allJobsQuery(),
};

export default function AdminJobsPage() {
  const jobs = createAsync(() => allJobsQuery());

  return (
    <div class="max-w-5xl mx-auto">
      <PageHeader eyebrow="Admin" title="All jobs" backHref="/admin" backLabel="Admin" />

      <Suspense fallback={<EmptyState>Loading…</EmptyState>}>
        <Show when={(jobs() ?? []).length > 0} fallback={<EmptyState>No jobs yet</EmptyState>}>
          <Card class="overflow-hidden">
            <div class="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-6 px-6 py-2 border-b border-gray-900">
              <span class="table-header-cell">File</span>
              <span class="table-header-cell">Total</span>
              <span class="table-header-cell">Active</span>
              <span class="table-header-cell">Status</span>
              <span class="table-header-cell">Date</span>
            </div>
            <For each={jobs()}>
              {(job, i) => (
                <A
                  href={`/jobs/${job.id}`}
                  class="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-6 px-6 py-4 items-center transition-colors hover:bg-white/[0.02]"
                  classList={{ "border-t border-gray-900": i() > 0 }}
                >
                  <div>
                    <p class="text-sm text-white truncate">{job.filename}</p>
                    <p class="text-xs text-gray-600 font-mono">{job.user_id.slice(0, 8)}</p>
                  </div>
                  <span class="text-sm text-gray-300 font-sans">
                    {job.total_rows.toLocaleString()}
                  </span>
                  <span class="text-sm text-gray-300 font-sans">
                    {job.active_rows.toLocaleString()}
                  </span>
                  <JobBadge status={job.status} />
                  <span class="text-xs text-gray-500">
                    {new Date(job.created_at).toLocaleDateString()}
                  </span>
                </A>
              )}
            </For>
          </Card>
        </Show>
      </Suspense>
    </div>
  );
}
