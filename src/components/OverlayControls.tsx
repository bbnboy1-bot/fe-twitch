"use client";

import { Check, Copy, Eye, EyeOff, Heart, RotateCcw, Settings, Sparkles, Zap } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OverlayView } from "@/features/overlay/OverlayView";
import type { ActivePoke, OverlayCatch, OverlayEvent, OverlaySize } from "@/features/overlay/model";
import { OVERLAY_PRESETS } from "@/features/overlay/presets";
import { getUnitDisplayName } from "@/features/units/presentation";
import { recruitRandomUnit, ROSTER } from "@/features/units/roster";

const DEFAULT_SIM_UNIT = "kestrel";

const THEME_PRESETS = [
  { name: "Gilt", primary: "#e0b64a", card: "#161c2c", text: "#f3efe4" },
  { name: "Crimson banner", primary: "#d9453a", card: "#2a1010", text: "#fde8e5" },
  { name: "Steel", primary: "#6fa3e0", card: "#0e1626", text: "#dbe7f7" },
  { name: "Verdant", primary: "#5fbf7a", card: "#0c2118", text: "#dff5e6" },
  { name: "Twilight", primary: "#c77ddb", card: "#1e1030", text: "#f1e4f7" },
];

export default function OverlayControls({
  url,
  onCopied,
}: {
  url: string;
  onCopied?: () => void;
}) {
  const [showUrl, setShowUrl] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  // Customization state
  const [size, setSize] = useState<OverlaySize>("auto");
  const [showLastCatch, setShowLastCatch] = useState(true);
  const [showLastAttack, setShowLastAttack] = useState(true);
  const [theme, setTheme] = useState("default");
  const [showTicker, setShowTicker] = useState(true);

  // Color customization states (initialize to default colors)
  const [primaryColor, setPrimaryColor] = useState("#e0b64a");
  const [cardColor, setCardColor] = useState("#161c2c");
  const [textColor, setTextColor] = useState("#f3efe4");

  // Simulation states for interactive preview
  const [simPoke, setSimPoke] = useState(DEFAULT_SIM_UNIT);
  const [simHealth, setSimHealth] = useState(38);
  const [simEvent, setSimEvent] = useState<OverlayEvent>({
    kind: null,
    player: null,
    damage: null,
    at: null,
  });
  const [simCatch, setSimCatch] = useState<OverlayCatch>({
    poke: null,
    player: null,
    at: null,
  });

  // Calculate dynamic URL
  const queryParams = new URLSearchParams();
  if (size !== "auto") queryParams.set("size", size);
  if (!showLastCatch) queryParams.set("hideCatch", "true");
  if (!showLastAttack) queryParams.set("hideAttack", "true");
  if (theme !== "default") queryParams.set("theme", theme);
  if (!showTicker) queryParams.set("hideTicker", "true");

  const cleanHex = (hex: string) => hex.replace("#", "");
  if (primaryColor && primaryColor !== "#e0b64a") queryParams.set("primary", cleanHex(primaryColor));
  if (cardColor && cardColor !== "#161c2c") queryParams.set("card", cleanHex(cardColor));
  if (textColor && textColor !== "#f3efe4") queryParams.set("text", cleanHex(textColor));

  const queryString = queryParams.toString();
  const customizedUrl = queryString ? `${url}?${queryString}` : url;

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(customizedUrl);
      setCopied(true);
      setCopyError(false);
      onCopied?.();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      setCopyError(true);
      setShowUrl(true);
    }
  }

  // Simulation handlers
  function handleSimulateHit() {
    const damage = Math.floor(Math.random() * 8) + 5;
    setSimHealth((prev) => Math.max(0, prev - damage));
    setSimEvent({
      kind: "hit",
      player: "hudson",
      damage,
      at: Date.now().toString(),
    });
  }

  function handleSimulateCatch() {
    // The unit on screen is the one being recruited; a new challenger follows.
    const recruited = simPoke;
    const next = recruitRandomUnit().id;
    setSimEvent({
      kind: "caught",
      player: "viewer_42",
      damage: null,
      at: Date.now().toString(),
    });
    setSimCatch({
      poke: recruited,
      player: "viewer_42",
      at: Date.now().toString(),
    });
    setSimPoke(next);
    setSimHealth(50);
  }

  function handleResetSim() {
    setSimPoke(DEFAULT_SIM_UNIT);
    setSimHealth(38);
    setSimEvent({ kind: null, player: null, damage: null, at: null });
    setSimCatch({ poke: null, player: null, at: null });
  }

  const demoPoke: ActivePoke = {
    poke: simPoke,
    health: simHealth,
  };

  return (
    <div className="grid gap-6 laptop:grid-cols-[1.1fr_.9fr]">
      {/* Left Column: Customization Controls */}
      <div className="flex flex-col gap-5">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 font-semibold mb-4 text-primary">
            <Settings className="size-4" />
            <span>Style and layout</span>
          </div>

          {/* Color Presets */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Colour presets</p>
            <div className="flex flex-wrap gap-2">
              {THEME_PRESETS.map((theme) => (
                <button
                  key={theme.name}
                  type="button"
                  onClick={() => {
                    setPrimaryColor(theme.primary);
                    setCardColor(theme.card);
                    setTextColor(theme.text);
                  }}
                  className="flex items-center gap-1.5 rounded border border-border bg-muted/30 px-2 py-1 text-xs hover:bg-muted/70 transition"
                >
                  <span
                    className="size-3.5 rounded-full border border-border"
                    style={{
                      background: `linear-gradient(135deg, ${theme.primary} 50%, ${theme.card} 50%)`,
                    }}
                  />
                  <span>{theme.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Color Pickers */}
            <div className="grid gap-3">
              <Field>
                <FieldLabel htmlFor="color-primary">Accent and border</FieldLabel>
                <div className="flex gap-2">
                  <input
                    type="color"
                    id="color-primary-picker"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="size-8 cursor-pointer rounded border border-border bg-transparent p-0"
                  />
                  <input
                    type="text"
                    id="color-primary"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs font-mono"
                    placeholder="#e0b64a"
                  />
                </div>
              </Field>

              <Field>
                <FieldLabel htmlFor="color-card">Card background</FieldLabel>
                <div className="flex gap-2">
                  <input
                    type="color"
                    id="color-card-picker"
                    value={cardColor}
                    onChange={(e) => setCardColor(e.target.value)}
                    className="size-8 cursor-pointer rounded border border-border bg-transparent p-0"
                  />
                  <input
                    type="text"
                    id="color-card"
                    value={cardColor}
                    onChange={(e) => setCardColor(e.target.value)}
                    className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs font-mono"
                    placeholder="#161c2c"
                  />
                </div>
              </Field>

              <Field>
                <FieldLabel htmlFor="color-text">Text</FieldLabel>
                <div className="flex gap-2">
                  <input
                    type="color"
                    id="color-text-picker"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="size-8 cursor-pointer rounded border border-border bg-transparent p-0"
                  />
                  <input
                    type="text"
                    id="color-text"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs font-mono"
                    placeholder="#f3efe4"
                  />
                </div>
              </Field>
            </div>

            {/* Size, Theme & Badges */}
            <div className="grid gap-3">
              <Field>
                <FieldLabel htmlFor="overlay-size-select">Overlay size</FieldLabel>
                <Select
                  value={size}
                  onValueChange={(val) => setSize(val as OverlaySize)}
                >
                  <SelectTrigger id="overlay-size-select" className="w-full">
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {Object.entries(OVERLAY_PRESETS).map(([key, item]) => (
                      <SelectItem key={key} value={key}>
                        {item.label} ({item.dimensions})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel htmlFor="overlay-theme-select">Theme</FieldLabel>
                <Select
                  value={theme}
                  onValueChange={setTheme}
                >
                  <SelectTrigger id="overlay-theme-select" className="w-full">
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value="default">Glass (default)</SelectItem>
                    <SelectItem value="chronicle">Chronicle (parchment)</SelectItem>
                    <SelectItem value="retro">Retro handheld</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <div className="flex flex-col gap-2 mt-1">
                <Field className="flex-row items-center gap-2.5">
                  <Checkbox
                    id="toggle-last-catch"
                    checked={showLastCatch}
                    onCheckedChange={(checked) => setShowLastCatch(checked === true)}
                  />
                  <div className="grid gap-0.5">
                    <FieldLabel htmlFor="toggle-last-catch" className="text-xs">Show last recruit</FieldLabel>
                  </div>
                </Field>

                <Field className="flex-row items-center gap-2.5">
                  <Checkbox
                    id="toggle-last-attack"
                    checked={showLastAttack}
                    onCheckedChange={(checked) => setShowLastAttack(checked === true)}
                  />
                  <div className="grid gap-0.5">
                    <FieldLabel htmlFor="toggle-last-attack" className="text-xs">Show last attacker</FieldLabel>
                  </div>
                </Field>

                <Field className="flex-row items-center gap-2.5">
                  <Checkbox
                    id="toggle-ticker"
                    checked={showTicker}
                    onCheckedChange={(checked) => setShowTicker(checked === true)}
                  />
                  <div className="grid gap-0.5">
                    <FieldLabel htmlFor="toggle-ticker" className="text-xs">Show scrolling ticker</FieldLabel>
                  </div>
                </Field>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Live Preview & Copy Link */}
      <div className="flex flex-col gap-4">
        {/* Live Simulator Controls */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 font-semibold mb-4 text-primary">
            <Zap className="size-4" />
            <span>Simulator</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="sim-poke-select">Enemy unit</FieldLabel>
              <Select value={simPoke} onValueChange={(val) => { setSimPoke(val); setSimHealth(50); }}>
                <SelectTrigger id="sim-poke-select" className="w-full">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent position="popper">
                  {ROSTER.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {getUnitDisplayName(u.id)} {u.epithet}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <div className="flex justify-between items-center">
                <FieldLabel htmlFor="health-range">Enemy HP</FieldLabel>
                <span className="font-mono text-xs font-bold">{simHealth} / 50</span>
              </div>
              <input
                id="health-range"
                type="range"
                min="0"
                max="50"
                value={simHealth}
                onChange={(e) => setSimHealth(Number(e.target.value))}
                className="w-full accent-primary mt-1"
              />
            </Field>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <Button size="sm" onClick={handleSimulateHit} variant="outline" className="flex items-center gap-1 text-destructive hover:text-destructive">
              <Zap className="size-3" /> Simulate hit
            </Button>
            <Button size="sm" onClick={handleSimulateCatch} variant="outline" className="flex items-center gap-1 text-success hover:text-success">
              <Sparkles className="size-3" /> Simulate recruit
            </Button>
            <Button size="sm" onClick={handleResetSim} variant="secondary" className="flex items-center gap-1">
              <RotateCcw className="size-3" /> Reset
            </Button>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 flex-1 flex flex-col">
          <div className="flex items-center gap-2 font-semibold mb-4 text-primary">
            <Heart className="size-4" />
            <span>Preview</span>
          </div>

          {/* Container query wrapper to emulate overlay viewport */}
          <div className="flex-1 flex items-center justify-center p-4 bg-muted/20 border border-border border-dashed rounded-lg min-h-[180px]">
            <div
              className="relative w-full overflow-hidden flex items-center justify-center"
              style={{
                containerName: "overlay",
                containerType: "size",
                aspectRatio: size === "compact" ? "256/76" : size === "large" ? "640/180" : "300/130",
                maxWidth: size === "large" ? "460px" : size === "compact" ? "280px" : "360px",
              }}
            >
              <OverlayView
                poke={demoPoke}
                size={size}
                event={simEvent}
                catch={simCatch}
                hideCatch={!showLastCatch}
                hideAttack={!showLastAttack}
                primaryColor={primaryColor}
                cardColor={cardColor}
                textColor={textColor}
                theme={theme}
                hideTicker={!showTicker}
              />
            </div>
          </div>
        </div>

        {/* Dynamic Copy Link Panel */}
        <div className="flex flex-col gap-2">
          <div className="grid gap-2 tablet:grid-cols-2">
            <Button onClick={copyUrl} type="button">
              {copied ? (
                <Check data-icon="inline-start" />
              ) : (
                <Copy data-icon="inline-start" />
              )}
              {copied ? "Copied!" : "Copy overlay URL"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowUrl((visible) => !visible)}
              type="button"
            >
              {showUrl ? (
                <EyeOff data-icon="inline-start" />
              ) : (
                <Eye data-icon="inline-start" />
              )}
              {showUrl ? "Hide URL" : "Show URL"}
            </Button>
            {showUrl ? (
              <div className="select-all break-all rounded-lg border border-border bg-muted/40 p-3 text-xs font-mono tablet:col-span-2">
                {customizedUrl}
              </div>
            ) : null}
            {copyError ? (
              <p className="text-sm text-warning tablet:col-span-2" role="alert">
                Clipboard access was blocked. Select and copy the URL shown above.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
