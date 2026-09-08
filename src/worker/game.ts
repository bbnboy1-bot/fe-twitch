import type tmi from "tmi.js";

import { GOLD, STAFF_BONUS_HP, findShopItem, shopListing } from "@/features/economy/shop";
import { DuelManager, pickChampion, resolveDuel } from "@/features/units/duel";
import type { Unit } from "@/features/units/model";
import { recruitRandomUnit, getUnitById } from "@/features/units/roster";

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
};

export type AttackInput = GamePlayer & {
  channel: string;
  damage: number;
  nextPoke: string;
};

export type AttackResult =
  | {
      outcome: "hit";
      damage: number;
      health: number;
      poke: string;
      lastEventKind: "hit";
      lastEventPlayer: string;
      lastEventDamage: number;
      lastEventAt: string;
    }
  | {
      outcome: "caught";
      nextPoke: string;
      poke: string;
      lastEventKind: "caught";
      lastEventPlayer: string;
      lastEventAt: string;
      lastCatchPoke: string;
      lastCatchPlayer: string;
    };

export type WelcomePackInput = GamePlayer & {
  channel: string;
  poke: string;
};

export type EquippedWeapon = { kind: string; uses: number } | null;

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
  ensureEncounter(_input: { channel: string; poke: string }): Promise<void>;
  // eslint-disable-next-line no-unused-vars
  attack(_input: AttackInput): Promise<AttackResult>;
  claimWelcomePack(
    // eslint-disable-next-line no-unused-vars
    _input: WelcomePackInput,
  ): Promise<{ granted: boolean; poke?: string }>;
  // eslint-disable-next-line no-unused-vars
  getStatus(_channel: string): Promise<{ health: number; poke: string } | null>;
  getLastCatch(
    // eslint-disable-next-line no-unused-vars
    _channel: string,
  ): Promise<{ poke: string; username: string } | null>;
}

type GameDependencies = {
  getRandomPokemon: () => Promise<string>;
  rollDamage: () => number;
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

  constructor(
    store: GameStore,
    appUrl: string,
    dependencies: GameDependencies = defaultDependencies,
  ) {
    this.store = store;
    this.appUrl = appUrl;
    this.dependencies = dependencies;
  }

  async initialize(channel: string) {
    await this.store.ensureEncounter({
      channel,
      poke: await this.dependencies.getRandomPokemon(),
    });
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
        "Emblem: !fe fight | duel @user | accept | gold | shop | buy <item> | army | muster | status | last",
      );
      return;
    }
    if (command === "gold") {
      const gold = await this.store.getGold({ channel, user: player.username });
      await client.say(channel, `@${player.username} has ${gold} gold.`);
      return;
    }
    if (command === "shop") {
      await client.say(channel, `Market (30 uses each): ${shopListing()} — !fe buy <item>`);
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
      const status = await this.store.getStatus(channel);
      await client.say(
        channel,
        status
          ? `${displayUnit(status.poke)} stands at ${status.health}/50 HP.`
          : "There is no active encounter right now.",
      );
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
      `@${player.username} mustered ${displayUnit(result.poke ?? poke)} into their army!`,
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

  private async attack(
    client: tmi.Client,
    channel: string,
    player: GamePlayer,
  ) {
    const damage = this.dependencies.rollDamage();
    // Combat outcomes (hit damage) are silent in chat and rendered on the OBS overlay,
    // but successful catches are announced to celebrate the capture.
    const result = await this.store.attack({
      channel,
      damage,
      nextPoke: await this.dependencies.getRandomPokemon(),
      twitchId: player.twitchId,
      username: player.username,
    });

    if (result.outcome === "hit") {
      await this.store.earnGold({ channel, user: player.username, amount: GOLD.bossHit });
    }
    if (result.outcome === "caught") {
      await this.store.earnGold({ channel, user: player.username, amount: GOLD.recruit });
      await client.say(
        channel,
        `⚔️ @${player.username} bested and recruited ${displayUnit(result.poke)}! ${displayUnit(result.nextPoke)} approaches...`
      );
    }
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
      await client.say(channel, `@${missing} has no units yet — grab one with !fe muster.`);
      return;
    }
    const [weaponA, weaponB] = await Promise.all([
      this.store.useEquippedWeapon({ channel, user: challenger }),
      this.store.useEquippedWeapon({ channel, user: player.username }),
    ]);
    const fighter = (username: string, unit: Unit, w: EquippedWeapon) => ({
      username,
      unit,
      weapon: w && w.kind !== "staff" ? (w.kind as Unit["weapon"]) : undefined,
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