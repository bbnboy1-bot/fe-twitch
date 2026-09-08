import type { WeaponType } from "@/features/units/model";

export type ShopItem = {
  kind: WeaponType;
  label: string;
  price: number;
  uses: number;
};

/** Hudson's market: Sword, Lance, Axe, Tome, Heal Staff — 30 uses each. */
export const SHOP: ShopItem[] = [
  { kind: "sword", label: "Steel Sword", price: 100, uses: 30 },
  { kind: "lance", label: "Steel Lance", price: 100, uses: 30 },
  { kind: "axe", label: "Steel Axe", price: 100, uses: 30 },
  { kind: "tome", label: "Ember Tome", price: 120, uses: 30 },
  { kind: "staff", label: "Heal Staff", price: 150, uses: 30 },
];

export const GOLD = {
  duelWin: 20,
  duelLoss: 5,
  recruit: 25,
  bossHit: 1,
};

export function findShopItem(name: string): ShopItem | undefined {
  const q = name.trim().toLowerCase();
  return SHOP.find((i) => i.kind === q || i.label.toLowerCase().includes(q));
}

export function shopListing(): string {
  return SHOP.map((i) => `${i.kind} ${i.price}g`).join(" | ");
}

/** Heal staff blesses its owner with bonus HP instead of overriding attack weapon. */
export const STAFF_BONUS_HP = 8;
