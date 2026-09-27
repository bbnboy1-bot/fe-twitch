"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveGameTimingAction, type TimingState } from "@/features/encounters/actions";
import { type GameTiming, TIMING_LIMITS } from "@/features/encounters/timing";

const INITIAL: TimingState = { status: "idle" };

/** Streamer control for how often warlords and wandering creatures turn up. */
export function GameTimingCard({ initial }: { initial: GameTiming }) {
  const [state, action, pending] = useActionState(saveGameTimingAction, INITIAL);
  const [creatures, setCreatures] = useState(initial.creaturesEnabled);
  const b = TIMING_LIMITS.boss;
  const c = TIMING_LIMITS.creature;

  return (
    <form action={action} className="grid gap-5">
      <div>
        <h2 className="font-heading text-xl font-bold">Encounter timing</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Regular foes keep coming as they fall. On top of that, a warlord (boss) arrives at a random time inside the
          window below, and wandering creatures can drop in between fights. Mods can still summon a boss any time with{" "}
          <code>!fe boss</code>.
        </p>
      </div>

      <fieldset className="grid gap-2">
        <legend className="font-semibold">Warlord every</legend>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Input type="number" name="bossMin" min={b.min} max={b.max} defaultValue={initial.bossMinMinutes} className="w-24" aria-label="Boss minimum minutes" />
          <span>to</span>
          <Input type="number" name="bossMax" min={b.min} max={b.max} defaultValue={initial.bossMaxMinutes} className="w-24" aria-label="Boss maximum minutes" />
          <span className="text-muted-foreground">minutes ({b.min} to {b.max})</span>
        </div>
      </fieldset>

      <fieldset className="grid gap-2">
        <legend className="font-semibold">Wandering creatures</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="creatures" checked={creatures} onChange={(e) => setCreatures(e.target.checked)} />
          Let creatures (bandits, pirates, skeletons, beasts) drop in. They can&apos;t be recruited; killing one splits a
          small gold pool by damage. If nobody finishes it in 2 minutes it wanders off.
        </label>
        <div className={`flex flex-wrap items-center gap-2 text-sm ${creatures ? "" : "opacity-50"}`}>
          <span>Every</span>
          <Input type="number" name="creatureMin" min={c.min} max={c.max} defaultValue={initial.creatureMinMinutes} className="w-24" readOnly={!creatures} aria-label="Creature minimum minutes" />
          <span>to</span>
          <Input type="number" name="creatureMax" min={c.min} max={c.max} defaultValue={initial.creatureMaxMinutes} className="w-24" readOnly={!creatures} aria-label="Creature maximum minutes" />
          <span className="text-muted-foreground">minutes ({c.min} to {c.max})</span>
        </div>
        <p className="text-xs text-muted-foreground">
          A creature never interrupts a fight: if chat is already battling a foe, it waits and arrives once the field clears.
        </p>
      </fieldset>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save timing"}
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
