"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-3xl font-bold">Something went wrong</h1>
      <p className="max-w-lg text-muted-foreground">
        This screen could not load. Try again, or come back later.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
