import { Badge } from "~/components/ui/badge";

type JobBadgeProps = {
  status: string;
  phase?: string;
};

function badgeVariant(status: string) {
  if (status === "completed") return "cyan" as const;
  if (status === "failed") return "red" as const;
  if (status === "running") return "amber" as const;
  return "muted" as const;
}

function badgeLabel(status: string, phase?: string) {
  if (status === "completed") return "Completed";
  if (status === "failed") return "Failed";
  if (phase === "phase1") return "Filtering";
  if (phase === "phase2") return "Enriching";
  return status;
}

export function JobBadge(props: JobBadgeProps) {
  return (
    <Badge variant={badgeVariant(props.status)}>{badgeLabel(props.status, props.phase)}</Badge>
  );
}
