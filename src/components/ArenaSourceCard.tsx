"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

/** Second OBS browser source: the arena strip. Kept separate from the HP card overlay. */
export function ArenaSourceCard({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setCopyError(false);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError(true);
    }
  }

  return (
    <div className="grid gap-4">
      <div>
        <h2 className="font-heading text-xl font-bold">Arena source (optional)</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A second browser source that shows your viewers&apos; champions on the field: they wander between fights,
          line up when a foe appears, and swing when their owner types !fe fight. Bosses and duels play out here too.
          Add it as its own Browser Source, about <strong>1200 x 100</strong> (any size works - it scales to fit).
        </p>
      </div>
      <div className="grid gap-2 tablet:grid-cols-[auto_1fr] tablet:items-center">
        <Button onClick={copyUrl} type="button">
          {copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
          {copied ? "Copied!" : "Copy arena URL"}
        </Button>
        <div className="select-all break-all rounded-lg border border-border bg-muted/40 p-3 text-xs font-mono">{url}</div>
        {copyError ? (
          <p className="text-sm text-warning tablet:col-span-2" role="alert">
            Clipboard access was blocked. Select and copy the URL shown above.
          </p>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        Options you can add to the URL: <code>?names=fighters</code> (labels only on active fighters),{" "}
        <code>?max=80</code> (how many recent recruits wander, default 40), <code>?scale=1.3</code> (bigger sprites).
      </p>
    </div>
  );
}
