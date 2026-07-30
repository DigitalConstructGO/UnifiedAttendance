import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Stands in until a module has real content. */
export function ModulePlaceholder({
  title,
  description,
  role,
}: {
  title: string;
  description: string;
  role: string | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        You are viewing this as <span className="font-medium text-foreground">{role}</span>.
      </CardContent>
    </Card>
  );
}
