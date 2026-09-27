/**
 * Single source of truth for the viewer command reference. The homepage shows
 * the short list; /commands shows everything with the rules behind each one.
 */

export type CommandGroup = "start" | "battle" | "economy" | "duels" | "info";

export type CommandDoc = {
  cmd: string;
  alias?: string;
  note: string;
  /** Longer explanation for the /commands page. */
  detail?: string;
  group: CommandGroup;
};

export const COMMAND_GROUPS: Array<[CommandGroup, string]> = [
  ["start", "Getting started"],
  ["battle", "Fighting"],
  ["economy", "Gold and the market"],
  ["duels", "Duels"],
  ["info", "Information"],
];

export const COMMANDS: CommandDoc[] = [
  {
    group: "start",
    cmd: "!fe start",
    alias: "!fe recruit, !fe r",
    note: "List the 14 lords you can start with.",
    detail: "Lords are your hero: a strong unit you choose rather than find. The list shows each lord's weapon. Once you have a lord you can keep fighting to recruit more units from the field.",
  },
  {
    group: "start",
    cmd: "!fe start <name>",
    note: "Pick that lord. Run it again with a different name to swap.",
    detail: "Your lord joins your army and becomes your champion (the unit that fights for you). Swapping is free: your old lord leaves and the new one takes their place. Everything else you own stays.",
  },
  {
    group: "start",
    cmd: "!fe use <unit>",
    alias: "!fe u, !fe champion",
    note: "Choose which of your units fights for you. !fe use auto picks your strongest.",
    detail: "By default your strongest unit fights. If you'd rather field a favourite (or a unit whose weapon beats the current foe), name it here. Changes apply from the next foe if you're already in a fight.",
  },
  {
    group: "battle",
    cmd: "!fe fight",
    alias: "!fe f",
    note: "Strike the foe on the field. Once every 10 seconds.",
    detail: "Your base strike always lands for 5 to 14. Your champion adds a third of its attack, the weapon triangle adds or removes 3 (sword beats axe, axe beats lance, lance beats sword; bows and tomes are neutral), and a crit doubles it. Every hit pays 1 gold. The foe then strikes your champion back. Land the final blow and the foe joins your army for 25 gold; after that the field rests for 45 seconds.",
  },
  {
    group: "battle",
    cmd: "!fe heal",
    note: "Restore your champion to full HP using one heal-staff charge.",
    detail: "If your champion's HP reaches 0 it is routed and can't fight until the next foe appears, or until you heal. Buy a Heal Staff in the market (it also gives +8 max HP). Viewers with no units can't be hurt, but only deal base damage.",
  },
  {
    group: "battle",
    cmd: "!fe boss",
    alias: "mods and the streamer",
    note: "Summon a warlord now instead of waiting for the timer.",
    detail: "A warlord arrives on its own on the streamer's timer (30 to 45 minutes unless they change it) with a 5 minute timer and hundreds of HP. Beat it: the gold pool (200 to 320) is split by damage dealt (minimum 5), the finisher gets +40 and recruits the warlord. Timer runs out: it escapes and everyone who hit it gets 10 gold. Raids: every minute or two the enemy attacks a random viewer who has been fighting it. Lurkers are never targeted.",
  },
  {
    group: "battle",
    cmd: "(creatures)",
    alias: "no command - they just appear",
    note: "Wandering creatures drop in every few minutes if the streamer enables them. Hit them with !fe fight.",
    detail: "Bandits, pirates, skeletons, beasts and the like. They are smaller than regular foes and can't be recruited. Kill one and its gold pool (roughly 20 to 35) is split by damage, with +10 for the final blow. They wander off after 2 minutes if nobody finishes them, and they never interrupt a fight already under way.",
  },
  { group: "economy", cmd: "!fe gold", alias: "!fe g", note: "Your gold balance." },
  {
    group: "economy",
    cmd: "!fe shop",
    note: "What the market sells and prices.",
    detail: "Steel Sword, Lance, Axe and Bow: 100 gold. Ember Tome: 120. Heal Staff: 150. Each has 30 uses.",
  },
  {
    group: "economy",
    cmd: "!fe buy <item>",
    alias: "sword / lance / axe / bow / tome / staff",
    note: "Buy a weapon. It auto-equips and replaces your champion's default weapon.",
    detail: "A bought weapon changes the weapon type your champion fights with, so you can win the triangle against the current foe. Uses are spent one per fight or duel. The staff is different: it adds +8 HP and powers !fe heal instead of changing your weapon.",
  },
  {
    group: "duels",
    cmd: "!fe duel @name",
    alias: "!fe d @name",
    note: "Challenge another viewer. They have 60 seconds to answer.",
    detail: "Champions fight automatically: alternating strikes, and a unit that is much faster strikes twice. First to 0 HP loses. Winner +20 gold, loser +5. If the arena overlay is up, the duel plays out on stream.",
  },
  { group: "duels", cmd: "!fe accept", note: "Accept a duel challenge." },
  { group: "duels", cmd: "!fe decline", note: "Decline a duel challenge." },
  { group: "info", cmd: "!fe status", alias: "!fe s", note: "The foe's HP, the boss timer, and your champion's HP." },
  { group: "info", cmd: "!fe army", alias: "!fe i", note: "A link to your army on this site." },
  { group: "info", cmd: "!fe last", alias: "!fe l", note: "Who made the most recent recruit in this channel." },
  { group: "info", cmd: "!fe help", alias: "!fe h", note: "Print the command list in chat." },
];

const HOMEPAGE_SET = new Set(["!fe start", "!fe start <name>", "!fe fight", "!fe use <unit>", "!fe heal", "!fe status", "!fe boss", "!fe gold", "!fe shop", "!fe buy <item>", "!fe duel @name", "!fe help"]);

/** The short version shown on the homepage. */
export const HOMEPAGE_COMMANDS = COMMANDS.filter((c) => HOMEPAGE_SET.has(c.cmd));
