import { createAsync, query, useParams } from "@solidjs/router";
import { createEffect, createSignal, For, onCleanup, Show, Suspense } from "solid-js";

import { getJobDetail } from "~/actions/jobs/queries";
import { Card } from "~/components/ui/card";
import { EmptyState } from "~/components/ui/empty-state";
import { ProgressBar } from "~/components/ui/progress-bar";
import { JobBadge } from "~/components/job-badge";
import { PageHeader } from "~/components/page-header";

const jobDetailQuery = query(getJobDetail, "jobDetail");

export const route = {
  preload: ({ params }: { params: { id?: string } }) => jobDetailQuery(params.id ?? ""),
};

function itemDotColor(status: string, isActive: number | null) {
  if (status === "pending") return "bg-gray-700";
  if (status === "processing") return "bg-amber-400";
  if (status === "done" && isActive === 1) return "bg-cyan";
  if (status === "done" && isActive === 0) return "bg-gray-700";
  if (status === "failed") return "bg-red-500";
  return "bg-gray-700";
}

export default function JobDetailPage() {
  const params = useParams();
  const data = createAsync(() => jobDetailQuery(params.id ?? ""));

  const [progress, setProgress] = createSignal(0);

  createEffect(() => {
    const d = data();
    if (!d) return;
    const { job } = d;
    const pct = job.total_rows > 0 ? Math.round((job.processed_rows / job.total_rows) * 100) : 0;
    setProgress(pct);

    if (job.status === "running") {
      const es = new EventSource(`/api/jobs/${params.id}/progress`);
      es.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data) as { processed: number; total: number };
          const p = msg.total > 0 ? Math.round((msg.processed / msg.total) * 100) : 0;
          setProgress(p);
        } catch {}
      };
      es.onerror = () => es.close();
      onCleanup(() => es.close());
    }
  });

  return (
    <div class="max-w-4xl mx-auto">
      <PageHeader
        eyebrow="Job detail"
        title={`Upload #${(params.id ?? "").slice(0, 8)}`}
        backHref="/dashboard"
        backLabel="Back"
      />

      <Suspense fallback={<EmptyState>Loading…</EmptyState>}>
        <Show when={data()} fallback={<EmptyState>Job not found</EmptyState>}>
          {(d) => (
            <>
              <div class="grid grid-cols-4 gap-3 mb-6">
                <Card class="p-4">
                  <p class="section-label mb-1">Total RUCs</p>
                  <p class="text-lg font-medium text-white font-sans">
                    {d().job.total_rows.toLocaleString()}
                  </p>
                </Card>
                <Card class="p-4">
                  <p class="section-label mb-1">Processed</p>
                  <p class="text-lg font-medium text-white font-sans">
                    {d().job.processed_rows.toLocaleString()}
                  </p>
                </Card>
                <Card class="p-4">
                  <p class="section-label mb-1">Active</p>
                  <p class="text-lg font-medium text-white font-sans">
                    {d().job.active_rows.toLocaleString()}
                  </p>
                </Card>
                <Card class="p-4">
                  <p class="section-label mb-1">Status</p>
                  <div class="mt-1">
                    <JobBadge status={d().job.status} />
                  </div>
                </Card>
              </div>

              <Card class="p-6 mb-6">
                <div class="flex items-center justify-between mb-4">
                  <span class="section-label">Progress</span>
                </div>
                <ProgressBar value={progress()} />
                <div class="flex justify-between mt-2">
                  <span class="text-xs text-gray-600">{d().job.processed_rows} processed</span>
                  <span class="text-xs text-gray-600">{progress()}%</span>
                </div>
                <Show when={d().job.error_message}>
                  <p class="text-xs text-red-400 mt-3">{d().job.error_message}</p>
                </Show>
              </Card>

              <div>
                <p class="section-label mb-4">Items ({d().items.length})</p>
                <Show when={d().items.length > 0} fallback={<EmptyState>No items</EmptyState>}>
                  <Card class="overflow-hidden">
                    <div class="grid grid-cols-[1fr_auto_auto_auto] gap-x-6 px-6 py-2 border-b border-gray-900">
                      <span class="table-header-cell">RUC</span>
                      <span class="table-header-cell">Status</span>
                      <span class="table-header-cell">Active</span>
                      <span class="table-header-cell">Carriers</span>
                    </div>
                    <For each={d().items}>
                      {(item, i) => (
                        <div
                          class="grid grid-cols-[1fr_auto_auto_auto] gap-x-6 px-6 py-3 items-center"
                          classList={{ "border-t border-gray-900": i() > 0 }}
                        >
                          <span class="text-sm font-mono text-gray-300">{item.ruc}</span>
                          <div class="flex items-center gap-2">
                            <div
                              class={`w-1.5 h-1.5 rounded-full ${itemDotColor(item.status, item.is_active)}`}
                            />
                            <span class="text-xs text-gray-500 capitalize">{item.status}</span>
                          </div>
                          <span class="text-xs text-gray-500">
                            {item.is_active === null ? "-" : item.is_active ? "Yes" : "No"}
                          </span>
                          <span class="text-xs text-gray-500">
                            {item.carrier_counts_json
                              ? (() => {
                                  try {
                                    const c = JSON.parse(item.carrier_counts_json!) as Record<
                                      string,
                                      number
                                    >;
                                    return Object.keys(c).length;
                                  } catch {
                                    return "-";
                                  }
                                })()
                              : "-"}
                          </span>
                        </div>
                      )}
                    </For>
                  </Card>
                </Show>
              </div>
            </>
          )}
        </Show>
      </Suspense>
    </div>
  );
}
