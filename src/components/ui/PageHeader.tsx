import { Container } from "@/components/ui/Container";

export function PageHeader({
  eyebrow,
  titel,
  intro,
}: {
  eyebrow?: string;
  titel: string;
  intro?: string;
}) {
  return (
    <div className="border-b border-line bg-surface">
      <Container className="max-w-3xl py-12 sm:py-16">
        {eyebrow && (
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">{eyebrow}</p>
        )}
        <h1 className="mt-2 text-4xl font-bold text-ink sm:text-5xl">{titel}</h1>
        {intro && <p className="mt-4 text-lg text-ink-soft">{intro}</p>}
      </Container>
    </div>
  );
}
