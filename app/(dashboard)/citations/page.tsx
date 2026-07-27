import { Card } from "@/components/ui/Card";

export default function CitationsPage() {
  return (
    <Card className="flex flex-col gap-2">
      <h1 className="text-h2 font-semibold text-fg">Citation Manager</h1>
      <p className="text-body-sm text-fg-muted">
        Reference library, formatting across CSL styles, and smart citation
        suggestions — coming in a later phase.
      </p>
    </Card>
  );
}
