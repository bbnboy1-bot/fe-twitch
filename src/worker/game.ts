import type tmi from "tmi.js";

import { GOLD, STAFF_BONUS_HP, findShopItem, shopListing } from "@/features/economy/shop";
import { EncounterDirector, type Scheduler } from "@/features/encounters/director";
import { EncounterManager, type Fighter } from "@/features/encounters/manager";
import {
  ENCOUNTER,
  bossMaxHp,
  championMaxHp,
  enemyMaxHp,
  escapePayouts,
  rollEnemyStrike,
  rollPlayerStrike,
  splitBossGold,
} from "@/features/encounters/rules";
import { DuelManager, pickChampion, resolveDuel } from "@/features/units/duel";
import type { Unit } from "@/features/units/model";
import { type Boss, getUnitById, pickRandomBoss, recruitRandomUnit } from "@/features/units/roster";

function randomUnitId(): Promise<string> {
  return Promise.resolve(recruitRandomUnit().id);
}

function displayUnit(id: string): string {
  const unit = getUnitById(id);
  if (!unit) return id.charAt(0).toUpperCase() + id.slice(1);
  return `${unit.name} ${unit.epithet} [${unit.rarity}]`;
}

import type { PokeCommand } from "./commands";

export type GamePlayer = {
  twitchId: string;
  username: string;
  isMod?: boolean;
};

export type AttackInput = {
  twitchId: string;
  username: string;
  channel: string;
  damage: number;
};

export type SpawnInput = {
  channel: string;
  poke: string;
  maxHealth: number;
  kind: "foe" | "boss";
  durationSeconds: number | null;
};

export type AttackResult =
  | { outcome: "none" }
  | {
      outcome: "hit";
      damage: number;
      health: number;
      maxHealth: number;
      poke: string;
      kind: string;
    }
  | {
      outcome: "caught";
      damage: number;
      poke: string;
      kind: string;
      maxHealth: number;
      lastCatchPoke: string;
      lastCatchPlayer: string;
    };

export type WelcomePackInput = GamePlayer & {
  channel: string;
  poke: string;
};

export type EquippedWeapon = { kind: string; uses: number } | null;

// eslint-disable-next-line no-unused-vars
export type Announcer = (_channel: string, _message: string) => Promise<void>;

export interface GameStore {
  // eslint-disable-next-line no-unused-vars
  getUserUnitIds(_input: { channel: string; user: string }): Promise<string[]>;
  // eslint-disable-next-line no-unused-vars
  earnGold(_input: { channel: string; user: string; amount: number }): Promise<number>;
  // eslint-disable-next-line no-unused-vars
  getGold(_input: { channel: string; user: string }): Promise<number>;
  buyWeapon(
    // eslint-disable-next-line no-unused-vars
    _input: { channel: string; user: string; kind: string; price: number; uses: number },
  ): Promise<{ ok: boolean; gold: number }>;
  // eslint-disable-next-line no-unused-vars
  useEquippedWeapon(_input: { channel: string; user: string }): Promise<EquippedWeapon>;
  // eslint-disable-next-line no-unused-vars
  useStaff(_input: { channel: string; user: string }): Promise<EquippedWeapon>;
  // eslint-disable-next-line no-unused-vars
  spawnEncounter(_input: SpawnInput): Promise<void>;
  // eslint-disable-next-line no-unused-vars
  endEncounter(_channel: string): Promise<void>;
  // eslint-disable-next-line no-unused-vars
  logBattle(_channel: string, _line: string): Promise<void>;
  // eslint-disable-next-line no-unused-vars
  attack(_input: AttackInput): Promise<AttackResult>;
  claimWelcomePack(
    // eslint-disable-next-line no-unused-vars
    _input: WelcomePackInput,
  ): Promise<{ granted: boolean; poke?: string }>;
  // eslint-disable-next-line no-unused-vars
  // eslint-disable-next-line no-unused-vars
  getStatus(_channel: string): Promise<{ health: number; maxHealth: number; poke: string; kind: string } | null>;
  getLastCatch(
    // eslint-disable-next-line no-unused-vars
    _channel: string,
  ): Promise<{ poke: string; username: string } | null>;
}

type GameDependencies = {
  getRandomPokemon: () => Promise<string>;
  rollDamage: () => number;
  pickBoss?: () => Boss;
  rng?: () => number;
  now?: () => number;
  /** Timer factory; tests inject a manual one. `null` disables the clock entirely. */
  scheduler?: Scheduler | null;
  /** Serialises timer-driven work with chat commands per channel (the worker's ChannelQueue). */
  // eslint-disable-next-line no-unused-vars
  runInChannel?: <T>(_channel: string, _op: () => Promise<T>) => Promise<T>;
  /** Chat announcer for timer-driven events (spawns, raids, boss results). */
  // eslint-disable-next-line no-unused-vars
  say?: (_channel: string, _message: string) => Promise<void>;
};

const defaultDependencies: GameDependencies = {
  getRandomPokemon: randomUnitId,
  rollDamage: () => Math.floor(Math.random() * 10) + 5,
};

export class PokemonGame {
  private readonly store: GameStore;
  private readonly appUrl: string;
  private readonly dependencies: GameDependencies;
  private readonly duels = new DuelManager();
  private readonly field = new EncounterManager();
  private readonly director: EncounterDirector | null;
  private say: Announcer;

  constructor(
    store: GameStore,
    appUrl: string,
    dependencies: GameDependencies = defaultDependencies,
  ) {
    this.store = store;
    this.appUrl = appUrl;
    this.dependencies = { ...defaultDependencies, ...dependencies };
    this.say = this.dependencies.say ?? (async () => undefined);
    const run = this.dependencies.runInChannel ?? ((_c, op) => op());
    const hooks = {
      spawnFoe: (channel: string) => run(channel, () => this.spawnFoe(channel)),
      spawnBoss: (channel: string) => run(channel, () => this.spawnBoss(channel)),
      raid: (channel: string) => run(channel, () => this.raid(channel)),
      expireBoss: (channel: string) => run(channel, () => this.expireBoss(channel)),
    };
    this.director =
      this.dependencies.scheduler === null
        ? null
        : new EncounterDirector(hooks, this.dependencies.scheduler, this.dependencies.rng ?? Math.random);
  }

  /** Lets the worker route timer announcements through the live tmi client. */
  setAnnouncer(say: Announcer) {
    this.say = say;
  }

  private now() {
    return (this.dependencies.now ?? Date.now)();
  }

  /** Short line for the overlay battle feed. Never blocks the game on a logging failure. */
  private async log(channel: string, line: string) {
    try {
      await this.store.logBattle(channel, line);
    } catch (error) {
      console.error("Battle log failed:", error);
    }
  }

  /** Bot joined a channel: first foe arrives right away, boss clock starts. */
  async initialize(channel: string) {
    this.director?.start(channel);
    await this.spawnFoe(channel);
  }

  /** Bot left a channel: stop its timers. */
  release(channel: string) {
    this.director?.stop(channel);
    this.field.end(channel);
  }

  // ---------------- Battlefield events (timer-driven) ----------------

  async spawnFoe(channel: string) {
    if (this.field.current(channel)) return; // something already on the field
    const unit = getUnitById(await this.dependencies.getRandomPokemon()) ?? recruitRandomUnit();
    const maxHp = enemyMaxHp(unit);
    this.field.spawn(channel, "foe", unit, maxHp, this.now(), null);
    await this.store.spawnEncounter({ channel, poke: unit.id, maxHealth: maxHp, kind: "foe", durationSeconds: null });
    this.director?.enemySpawned(channel, "foe");
    await this.log(channel, `${unit.name} takes the field`);
    await this.say(channel, `⚠️ ${displayUnit(unit.id)} takes the field! ${maxHp} HP. Type !fe fight`);
  }

  async spawnBoss(channel: string) {
    const current = this.field.current(channel);
    if (current?.kind === "boss") return; // one boss at a time
    const boss = (this.dependencies.pickBoss ?? pickRandomBoss)();
    const maxHp = bossMaxHp(boss);
    const driven = current ? ` ${current.unit.name} flees before them.` : "";
    this.field.spawn(channel, "boss", boss, maxHp, this.now(), ENCOUNTER.bossDurationMs);
    await this.store.spawnEncounter({
      channel,
      poke: boss.id,
      maxHealth: maxHp,
      kind: "boss",
      durationSeconds: Math.round(ENCOUNTER.bossDurationMs / 1000),
    });
    this.director?.enemySpawned(channel, "boss");
    await this.log(channel, `BOSS ${boss.name} ${boss.epithet} arrives`);
    const minutes = Math.round(ENCOUNTER.bossDurationMs / 60_000);
    await this.say(
      channel,
      `💀 BOSS: ${boss.name} ${boss.epithet} ${boss.arrival}!${driven} ${maxHp} HP, ${minutes} minutes. Everyone !fe fight - gold is split by damage, and whoever lands the final blow recruits them!`,
    );
  }

  /** The enemy picks on someone who has been fighting it. Lurkers are safe. */
  async raid(channel: string) {
    const e = this.field.current(channel);
    if (!e) return;
    const target = this.field.pickRaidTarget(channel, this.dependencies.rng);
    if (!target?.unitId) return;
    const champion = getUnitById(target.unitId);
    if (!champion) return;
    const weapon = await this.store.useEquippedWeapon({ channel, user: target.username });
    const strike = rollEnemyStrike(
      e.unit,
      { stats: champion.base, weapon: attackWeapon(champion, weapon) },
      this.dependencies.rng,
    );
    const label = e.kind === "boss" ? `${e.unit.name} ${e.unit.epithet}` : e.unit.name;
    if (!strike.hit) {
      await this.log(channel, `${e.unit.name} charges ${target.username} and misses`);
      await this.say(channel, `${label} charges @${target.username}'s ${champion.name} - and misses!`);
      return;
    }
    const f = this.field.damageFighter(channel, target.username, strike.damage);
    await this.log(
      channel,
      `${e.unit.name} ${strike.crit ? "CRITS" : "raids"} ${target.username} for ${strike.damage}${f?.routed ? " - routed!" : ""}`,
    );
    await this.say(channel, raidLine(label, target.username, champion, strike.damage, strike.crit, f));
  }

  /** Boss timer ran out: consolation gold, field clears. */
  async expireBoss(channel: string) {
    const e = this.field.current(channel);
    if (!e || e.kind !== "boss") return;
    this.field.end(channel);
    await this.store.endEncounter(channel);
    const payouts = escapePayouts(e.contributions);
    await Promise.all(payouts.map((p) => this.store.earnGold({ channel, user: p.user, amount: p.gold })));
    await this.log(channel, `${e.unit.name} escapes with ${e.hp} HP`);
    await this.say(
      channel,
      `${e.unit.name} ${e.unit.epithet} escapes with ${e.hp}/${e.maxHp} HP left!` +
        (payouts.length ? ` ${payouts.length} fighters each take ${ENCOUNTER.bossEscapeGold}g for the effort.` : ""),
    );
    this.director?.fieldCleared(channel);
  }

  async handle(
    command: PokeCommand,
    client: tmi.Client,
    channel: string,
    player: GamePlayer,
    arg: string | null = null,
  ) {
    if (command === "help") {
      await client.say(
        channel,
        "Emblem: !fe fight | heal | duel @user | accept | gold | shop | buy <item> | army | recruit | status | last (mods: !fe boss)",
      );
      return;
    }
    if (command === "gold") {
      const gold = await this.store.getGold({ channel, user: player.username });
      await client.say(channel, `@${player.username} has ${gold} gold.`);
      return;
    }
    if (command === "shop") {
      await client.say(channel, `Market (30 uses each): ${shopListing()} - !fe buy <item>`);
      return;
    }
    if (command === "buy") {
      return this.buy(client, channel, player, arg);
    }
    if (command === "duel") {
      return this.challenge(client, channel, player, arg);
    }
    if (command === "accept") {
      return this.acceptDuel(client, channel, player);
    }
    if (command === "decline") {
      const challenger = this.duels.decline(channel, player.username);
      await client.say(
        channel,
        challenger
          ? `@${player.username} declined @${challenger}'s challenge.`
          : `@${player.username}, no one has challenged you.`,
      );
      return;
    }
    if (command === "status") {
      return this.status(client, channel, player);
    }
    if (command === "heal") {
      return this.heal(client, channel, player);
    }
    if (command === "boss") {
      if (!player.isMod) {
        await client.say(channel, `@${player.username}, only mods can summon a boss.`);
        return;
      }
      if (this.field.current(channel)?.kind === "boss") {
        await client.say(channel, "A boss is already on the field!");
        return;
      }
      await this.spawnBoss(channel);
      this.director?.resetBossClock(channel);
      return;
    }
    if (command === "last") {
      const caught = await this.store.getLastCatch(channel);
      await client.say(
        channel,
        caught
          ? `Latest recruit: @${caught.username} recruited ${displayUnit(caught.poke)}.`
          : "No recruits have joined in this channel yet.",
      );
      return;
    }
    if (command === "welcome-pack") {
      return this.welcomePack(client, channel, player);
    }
    if (command === "inventory") {
      return this.inventory(client, channel, player);
    }
    return this.attack(client, channel, player);
  }

  private async welcomePack(
    client: tmi.Client,
    channel: string,
    player: GamePlayer,
  ) {
    const poke = await this.dependencies.getRandomPokemon();
    const result = await this.store.claimWelcomePack({
      channel,
      poke,
      twitchId: player.twitchId,
      username: player.username,
    });

    if (!result.granted) {
      await client.say(
        channel,
        `@${player.username}, you already received a welcome pack.`,
      );
      return;
    }

    await client.say(
      channel,
      `@${player.username} recruited ${displayUnit(result.poke ?? poke)} into their army!`,
    );
  }

  private async inventory(
    client: tmi.Client,
    channel: string,
    player: GamePlayer,
  ) {
    const url = new URL("/collections", this.appUrl);
    url.searchParams.set("mode", "user");
    url.searchParams.set("q", player.username);
    await client.say(
      channel,
      `@${player.username}'s collection: ${url.toString()}`,
    );
  }

  private async status(client: tmi.Client, channel: string, player: GamePlayer) {
    const e = this.field.current(channel);
    if (!e) {
      await client.say(channel, "The field is quiet - the next foe is on its way.");
      return;
    }
    const left = e.expiresAt ? ` ${Math.max(0, Math.ceil((e.expiresAt - this.now()) / 1000))}s left.` : "";
    const me = this.field.getFighter(channel, player.username);
    const mine = me?.unitId
      ? ` Your ${getUnitById(me.unitId)?.name ?? "champion"}: ${me.routed ? "routed" : `${me.hp}/${me.maxHp} HP`}.`
      : "";
    await client.say(
      channel,
      `${e.kind === "boss" ? "💀 BOSS " : ""}${displayUnit(e.unit.id)} stands at ${e.hp}/${e.maxHp} HP.${left}${mine}`,
    );
  }

  private async heal(client: tmi.Client, channel: string, player: GamePlayer) {
    const f = this.field.getFighter(channel, player.username);
    if (!f?.unitId) {
      await client.say(channel, `@${player.username}, nothing to heal - you haven't fought this enemy yet.`);
      return;
    }
    if (!f.routed && f.hp === f.maxHp) {
      await client.say(channel, `@${player.username}, your champion is at full HP.`);
      return;
    }
    const staff = await this.store.useStaff({ channel, user: player.username });
    if (!staff) {
      await client.say(channel, `@${player.username}, you need a heal staff (!fe buy staff). Routed units return next spawn.`);
      return;
    }
    const healed = this.field.heal(channel, player.username);
    await this.log(channel, `${player.username} heals ${getUnitById(f.unitId)?.name ?? "their champion"}`);
    await client.say(
      channel,
      `✨ @${player.username}'s ${getUnitById(f.unitId)?.name ?? "champion"} is restored to ${healed?.maxHp} HP (${staff.uses} staff uses left).`,
    );
  }

  /** Returns the viewer's fighter for this encounter, creating it with champion HP on first fight. */
  private async enlist(channel: string, player: GamePlayer): Promise<{ fighter: Fighter; champion: Unit | null; weapon: EquippedWeapon }> {
    const existing = this.field.getFighter(channel, player.username);
    const champion = existing?.unitId ? (getUnitById(existing.unitId) ?? null) : await this.championFor(channel, player.username);
    const weapon = champion ? await this.store.useEquippedWeapon({ channel, user: player.username }) : null;
    const fighter =
      existing ??
      this.field.fighter(
        channel,
        player.username,
        champion?.id ?? null,
        champion ? championMaxHp(champion, weapon?.kind === "staff") : 0,
      );
    return { fighter, champion, weapon };
  }

  private async attack(client: tmi.Client, channel: string, player: GamePlayer) {
    const e = this.field.current(channel);
    if (!e) {
      await client.say(channel, `@${player.username}, the field is quiet - the next foe arrives soon.`);
      return;
    }
    const { fighter, champion, weapon } = await this.enlist(channel, player);
    if (fighter.routed) {
      await client.say(channel, `@${player.username}, your champion is routed! !fe heal with a staff, or wait for the next foe.`);
      return;
    }
    const rng = this.dependencies.rng ?? Math.random;
    const side = champion ? { stats: champion.base, weapon: attackWeapon(champion, weapon) } : null;
    const strike = rollPlayerStrike(this.dependencies.rollDamage(), side, e.unit, rng);

    const result = await this.store.attack({ channel, damage: strike.damage, twitchId: player.twitchId, username: player.username });
    if (result.outcome === "none") {
      // DB and memory disagree (e.g. worker restarted); resync by clearing the field.
      this.field.end(channel);
      this.director?.fieldCleared(channel);
      return;
    }
    const remaining = this.field.damageEnemy(channel, player.username, strike.damage);
    await this.store.earnGold({ channel, user: player.username, amount: GOLD.bossHit });

    if (result.outcome === "caught" || remaining <= 0) {
      return this.defeated(client, channel, player);
    }

    // Enemy counterattacks the champion (viewers without a unit can't be hurt).
    if (champion && side) {
      const counter = rollEnemyStrike(e.unit, side, rng);
      if (counter.hit) {
        const f = this.field.damageFighter(channel, player.username, counter.damage);
        if (f?.routed) {
          await this.log(channel, `${e.unit.name} routs ${player.username}'s ${champion.name}`);
          await client.say(
            channel,
            `${strike.crit ? "💥 CRIT! " : ""}@${player.username} hits ${e.unit.name} for ${strike.damage} (${remaining}/${e.maxHp}) - but ${e.unit.name} strikes back for ${counter.damage} and ${champion.name} is routed!`,
          );
          return;
        }
      }
    }
    // Ordinary hits stay silent in chat (the overlay shows them); crits get a shout.
    if (strike.crit) {
      await this.log(channel, `${player.username} CRITS ${e.unit.name} for ${strike.damage}`);
      await client.say(channel, `💥 CRIT! @${player.username} hits ${e.unit.name} for ${strike.damage}! (${remaining}/${e.maxHp} HP)`);
    }
  }

  private async defeated(client: tmi.Client, channel: string, player: GamePlayer) {
    const e = this.field.end(channel);
    if (!e) return;
    await this.store.earnGold({ channel, user: player.username, amount: GOLD.recruit });
    if (e.kind === "boss") {
      const payouts = splitBossGold(e.unit.rarity === "legendary" && "goldPool" in e.unit ? (e.unit as Boss).goldPool : 200, e.contributions, player.username);
      await Promise.all(payouts.map((p) => this.store.earnGold({ channel, user: p.user, amount: p.gold })));
      const top = payouts.slice(0, 3).map((p) => `@${p.user} +${p.gold}g`).join(", ");
      await this.log(channel, `${player.username} slays ${e.unit.name}! ${top.replace(/@/g, "")}`);
      await client.say(
        channel,
        `🏆 ${e.unit.name} ${e.unit.epithet} falls! @${player.username} lands the final blow and recruits them! ${payouts.length} fighters share the spoils: ${top}${payouts.length > 3 ? "…" : ""}`,
      );
    } else {
      await this.log(channel, `${player.username} recruits ${e.unit.name}`);
      await client.say(channel, `⚔️ @${player.username} bested and recruited ${displayUnit(e.unit.id)}! +${GOLD.recruit}g. The field is quiet...`);
    }
    this.director?.fieldCleared(channel);
  }

  private async buy(
    client: tmi.Client,
    channel: string,
    player: GamePlayer,
    arg: string | null,
  ) {
    const item = arg ? findShopItem(arg) : undefined;
    if (!item) {
      await client.say(channel, `@${player.username}, choose an item: ${shopListing()}`);
      return;
    }
    const result = await this.store.buyWeapon({
      channel,
      user: player.username,
      kind: item.kind,
      price: item.price,
      uses: item.uses,
    });
    await client.say(
      channel,
      result.ok
        ? `@${player.username} bought a ${item.label} (${item.uses} uses). ${result.gold}g left.`
        : `@${player.username}, not enough gold (${item.price}g needed, you have ${result.gold}g).`,
    );
  }

  private async challenge(
    client: tmi.Client,
    channel: string,
    player: GamePlayer,
    arg: string | null,
  ) {
    if (!arg || arg === player.username) {
      await client.say(channel, `@${player.username}, use: !fe duel @rival`);
      return;
    }
    this.duels.challenge(channel, player.username, arg);
    await client.say(
      channel,
      `⚔️ @${player.username} challenges @${arg} to a duel! Type "!fe accept" within 60s.`,
    );
  }

  private async championFor(channel: string, user: string): Promise<Unit | null> {
    const ids = await this.store.getUserUnitIds({ channel, user });
    const units = ids
      .map((id) => getUnitById(id))
      .filter((x): x is Unit => Boolean(x));
    return pickChampion(units);
  }

  private async acceptDuel(client: tmi.Client, channel: string, player: GamePlayer) {
    const challenger = this.duels.accept(channel, player.username);
    if (!challenger) {
      await client.say(channel, `@${player.username}, no live challenge (they expire after 60s).`);
      return;
    }
    const [unitA, unitB] = await Promise.all([
      this.championFor(channel, challenger),
      this.championFor(channel, player.username),
    ]);
    if (!unitA || !unitB) {
      const missing = !unitA ? challenger : player.username;
      await client.say(channel, `@${missing} has no units yet - grab one with !fe recruit.`);
      return;
    }
    const [weaponA, weaponB] = await Promise.all([
      this.store.useEquippedWeapon({ channel, user: challenger }),
      this.store.useEquippedWeapon({ channel, user: player.username }),
    ]);
    const fighter = (username: string, unit: Unit, w: EquippedWeapon) => ({
      username,
      unit,
      weapon: attackWeapon(unit, w),
      bonusHp: w?.kind === "staff" ? STAFF_BONUS_HP : 0,
    });
    const result = resolveDuel(
      fighter(challenger, unitA, weaponA),
      fighter(player.username, unitB, weaponB),
    );
    await Promise.all([
      this.store.earnGold({ channel, user: result.winner, amount: GOLD.duelWin }),
      this.store.earnGold({ channel, user: result.loser, amount: GOLD.duelLoss }),
    ]);
    const winnerUnit = result.winner === challenger ? unitA : unitB;
    await client.say(
      channel,
      `🏆 @${result.winner}'s ${winnerUnit.name} ${winnerUnit.epithet} wins the duel against @${result.loser} in ${result.rounds} rounds! +${GOLD.duelWin}g (loser +${GOLD.duelLoss}g).`,
    );
  }
}

/** Equipped non-staff weapon overrides the class weapon. */
function attackWeapon(unit: Unit, w: EquippedWeapon): Unit["weapon"] {
  return w && w.kind !== "staff" ? (w.kind as Unit["weapon"]) : unit.weapon;
}

function raidLine(enemy: string, user: string, champion: Unit, damage: number, crit: boolean, f: Fighter | null): string {
  const hit = `${enemy} ${crit ? "CRITS" : "charges"} @${user}'s ${champion.name} for ${damage}!`;
  if (!f) return hit;
  return f.routed ? `${hit} ${champion.name} is routed!` : `${hit} (${f.hp}/${f.maxHp} HP left)`;
}
