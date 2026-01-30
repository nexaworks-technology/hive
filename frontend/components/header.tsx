'use client';

export function Header() {
  return (
    <div className="border-b border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Workflow overview</p>
        </div>
      </div>
    </div>
  );
}
