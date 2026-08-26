export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-svh items-center justify-center bg-[var(--surface-subtle)] px-5 py-10 sm:px-10">
      <div className="absolute inset-x-0 top-0 h-1 bg-primary" aria-hidden="true" />
      <div className="w-full max-w-[27rem]">{children}</div>
    </main>
  );
}
