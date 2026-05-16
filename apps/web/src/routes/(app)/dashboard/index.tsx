import { A, createAsync, query, useAction } from "@solidjs/router";
import { For, Show, Suspense } from "solid-js";

import { getMyJobs } from "~/actions/jobs/queries";
import { uploadCsvMutation } from "~/lib/mutations/jobs";
import { Card } from "~/components/ui/card";
import { EmptyState } from "~/components/ui/empty-state";
import { JobBadge } from "~/components/job-badge";
import { PageHeader } from "~/components/page-header";

const myJobsQuery = query(getMyJobs, "myJobs");

export const route = {
  preload: () => myJobsQuery(),
};

export default function DashboardPage() {
  const jobs = createAsync(() => myJobsQuery());
  const upload = useAction(uploadCsvMutation);

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    void upload(fd);
  }

  function handleBrowse(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    void upload(fd);
  }

  return (
    <div class="max-w-4xl mx-auto">
      <PageHeader eyebrow="Dashboard" title="Your uploads" />

      <label
        class="block card border-dashed border-gray-700 p-12 flex flex-col items-center justify-center gap-4 mb-8 hover:border-gray-500 transition-colors cursor-pointer"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <div class="w-10 h-10 flex items-center justify-center text-cyan">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
          >
            <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M12 12V4M8 8l4-4 4 4" />
          </svg>
        </div>
        <div class="text-center">
          <p class="text-sm text-white mb-1">Drop your CSV here</p>
          <p class="section-label">One RUC per row - no headers</p>
        </div>
        <span class="inline-flex items-center justify-center px-6 py-2.5 text-xs font-medium uppercase tracking-[0.1em] rounded-sm bg-cyan text-black whitespace-nowrap mt-2">
          Browse file
        </span>
        <input type="file" accept=".csv" class="sr-only" onChange={handleBrowse} />
      </label>

      <div>
        <p class="section-label mb-4">Recent jobs</p>
        <Suspense fallback={<EmptyState>Loading…</EmptyState>}>
          <Show when={(jobs() ?? []).length > 0} fallback={<EmptyState>No uploads yet</EmptyState>}>
            <Card class="overflow-hidden">
              <For each={jobs()}>
                {(job, i) => (
                  <A
                    href={`/jobs/${job.id}`}
                    class="flex items-center justify-between px-6 py-4 transition-colors hover:bg-white/[0.02]"
                    classList={{ "border-t border-gray-900": i() > 0 }}
                  >
                    <div class="flex flex-col gap-1 min-w-0">
                      <span class="text-sm text-white truncate">{job.filename}</span>
                      <span class="text-xs text-gray-500">
                        {job.total_rows.toLocaleString()} RUCs ·{" "}
                        {new Date(job.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div class="flex items-center gap-6 flex-shrink-0 ml-6">
                      <div class="text-right">
                        <p class="section-label">Active</p>
                        <p class="text-sm font-medium text-white font-sans">{job.active_rows}</p>
                      </div>
                      <div class="text-right">
                        <p class="section-label">Progress</p>
                        <p class="text-sm font-medium text-white font-sans">
                          {job.total_rows > 0
                            ? Math.round((job.processed_rows / job.total_rows) * 100)
                            : 0}
                          %
                        </p>
                      </div>
                      <JobBadge status={job.status} />
                    </div>
                  </A>
                )}
              </For>
            </Card>
          </Show>
        </Suspense>
      </div>
    </div>
  );
}
