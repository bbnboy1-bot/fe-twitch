"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type RealmNamesState, saveRealmNamesAction } from "@/features/units/actions";
import { type ChannelNames, NAME_DISCLAIMER, OFFICIAL_LORD_NAMES, type UnitNameMode } from "@/features/units/names";
import { UnitPortrait } from "@/features/units/presentation";
import { LORDS } from "@/features/units/roster";

const INITIAL: RealmNamesState = { status: "idle" };

/** Streamer-side control for how lords are named in their chat and overlays. */
export function RealmNamesCard({ initial }: { initial: ChannelNames }) {
  const [mode, setMode] = useState<UnitNameMode>(initial.mode);
  const [state, action, pending] = useActionState(saveRealmNamesAction, INITIAL);

  return (
    <form action={action} className="grid gap-5">
      <div>
        <h2 className="font-heading text-xl font-bold">Realm names</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose how the 14 lords are named in your chat and on your overlays. Viewers pick one with{" "}
          <code>!fe start &lt;name&gt;</code>. You can also type your own name for any lord.
        </p>
      </div>

      <fieldset className="grid gap-2 tablet:grid-cols-2">
        <legend className="sr-only">Naming mode</legend>
        {(
          [
            ["official", "Community names", "Lyn, Hector, Ike, Claude and the rest - the names your viewers know."],
            ["original", "Veyra names", "The game's own original lords: Sable, Brannoc, Roark, Faelan..."],
          ] as const
        ).map(([value, title, blurb]) => (
          <label
            key={value}
            className={`cursor-pointer rounded-lg border p-3 transition ${mode === value ? "border-primary bg-primary/10" : "border-border bg-muted/30"}`}
          >
            <input type="radio" name="mode" value={value} checked={mode === value} onChange={() => setMode(value)} className="mr-2" />
            <span className="font-semibold">{title}</span>
            <span className="mt-1 block text-xs text-muted-foreground">{blurb}</span>
          </label>
        ))}
      </fieldset>

      <p className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-muted-foreground">{NAME_DISCLAIMER}</p>

      <div className="grid gap-2 tablet:grid-cols-2">
        {LORDS.map((lord) => (
          <label key={lord.id} className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-2">
            <UnitPortrait unit={lord} size={40} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">
                {mode === "official" ? OFFICIAL_LORD_NAMES[lord.id] : lord.name}
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  {mode === "official" ? `(${lord.name})` : ""} {lord.weapon}
                </span>
              </span>
              <Input
                name={`name:${lord.id}`}
                defaultValue={initial.custom[lord.id] ?? ""}
                placeholder="Custom name (optional)"
                maxLength={24}
                className="mt-1 h-8 text-sm"
              />
            </span>
          </label>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save realm names"}
        </Button>
        {state.status !== "idle" ? (
          <p className={`text-sm ${state.status === "error" ? "text-destructive" : "text-success"}`} role="status">
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
