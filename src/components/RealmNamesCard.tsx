"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type RealmNamesState, saveRealmNamesAction } from "@/features/units/actions";
import { type ChannelNames, NAME_DISCLAIMER, OFFICIAL_NAMES, type UnitNameMode } from "@/features/units/names";
import { UnitPortrait } from "@/features/units/presentation";
import type { Unit } from "@/features/units/model";
import { BOSSES, CREATURES, LORDS, ROSTER } from "@/features/units/roster";

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
          Choose how units are named in your chat, overlays and on this site: the 14 lords, the 6 warlords and the
          22 field recruits and 16 wandering creatures. Viewers pick a lord with <code>!fe start &lt;name&gt;</code>. You can also type your own
          name for any unit.
        </p>
      </div>

      <fieldset className="grid gap-2 tablet:grid-cols-2">
        <legend className="sr-only">Naming mode</legend>
        {(
          [
            ["official", "Community names", "Lyn, Hector, Ike, Claude, Zephiel, Nergal, Oswin and the rest - the names your viewers know."],
            ["original", "Veyra names", "The game's own original cast: Wren, Hadrian, Roark, Vaelen, Bram..."],
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

      {(
        [
          ["Lords", LORDS, true],
          ["Warlords (bosses)", BOSSES, false],
          ["Field recruits", ROSTER, false],
          ["Wandering creatures", CREATURES, false],
        ] as const
      ).map(([title, units, open]) => (
        <details key={title} open={open} className="rounded-lg border border-border">
          <summary className="cursor-pointer px-3 py-2 font-heading font-bold">
            {title} <span className="text-xs font-normal text-muted-foreground">({units.length})</span>
          </summary>
          <div className="grid gap-2 p-3 tablet:grid-cols-2">
            {(units as readonly Unit[]).map((unit) => (
              <label key={unit.id} className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-2">
                <UnitPortrait unit={unit} size={40} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {mode === "official" ? OFFICIAL_NAMES[unit.id] ?? unit.name : unit.name}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      {mode === "official" ? `(${unit.name})` : ""} {unit.weapon}
                    </span>
                  </span>
                  <Input
                    name={`name:${unit.id}`}
                    defaultValue={initial.custom[unit.id] ?? ""}
                    placeholder="Custom name (optional)"
                    maxLength={24}
                    className="mt-1 h-8 text-sm"
                  />
                </span>
              </label>
            ))}
          </div>
        </details>
      ))}

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
