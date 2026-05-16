import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { EmptyState } from "~/components/ui/empty-state";
import { PageHeader } from "~/components/page-header";

export default function ManagerPage() {
  return (
    <div class="max-w-5xl mx-auto">
      <PageHeader eyebrow="Manager" title="Client overview" />

      <div class="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: "Total clients", value: "-" },
          { label: "Active jobs", value: "-" },
          { label: "Completed this week", value: "-" },
        ].map((stat) => (
          <Card class="p-5">
            <p class="section-label mb-2">{stat.label}</p>
            <p class="text-2xl font-medium text-white font-sans">{stat.value}</p>
          </Card>
        ))}
      </div>

      <div>
        <div class="flex items-center justify-between mb-4">
          <p class="section-label">Clients</p>
          <Button>+ Add client</Button>
        </div>
        <EmptyState>No clients yet</EmptyState>
      </div>
    </div>
  );
}
