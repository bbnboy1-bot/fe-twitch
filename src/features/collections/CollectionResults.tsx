import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CLASS_META,
  formatRecruitDate,
  getUnitDisplayName,
  UnitPortraitById,
} from "@/features/units/presentation";
import { getUnitById } from "@/features/units/roster";

import type { CollectionRow } from "./types";

export function CollectionResults({
  rows,
  view,
  offset,
}: {
  rows: CollectionRow[];
  view: "grid" | "table";
  offset: number;
}) {
  return view === "grid" ? (
    <CollectionGrid rows={rows} />
  ) : (
    <CollectionTable rows={rows} offset={offset} />
  );
}

import { Calendar, Tv, User } from "lucide-react";

function CollectionGrid({ rows }: { rows: CollectionRow[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2 laptop:grid-cols-3 desktop:grid-cols-4">
      {rows.map((row) => (
        <Card
          key={row.id}
          className="game-panel overflow-hidden shadow-none"
        >
          <CardContent className="flex h-28 items-center gap-4 p-3">
            <Link
              href={`/units/${encodeURIComponent(row.poke)}`}
              aria-label={`View ${getUnitDisplayName(row.poke)} details`}
              className="shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <UnitPortraitById id={row.poke} size={76} />
            </Link>

            <div className="flex flex-1 flex-col justify-between min-w-0 h-full py-0.5">
              <div className="min-w-0">
                <Link
                  href={`/units/${encodeURIComponent(row.poke)}`}
                  className="block truncate font-heading text-base font-bold text-foreground transition hover:text-primary"
                >
                  {getUnitDisplayName(row.poke)}
                  {getUnitById(row.poke) ? (
                    <span className="ml-1.5 font-sans text-xs font-normal text-muted-foreground">
                      {CLASS_META[getUnitById(row.poke)!.unitClass].label}
                    </span>
                  ) : null}
                </Link>
                <div className="truncate text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <User className="size-3 text-muted-foreground/70 shrink-0" />
                  <span>by</span>
                  <Link
                    href={`/collections?mode=user&q=${encodeURIComponent(row.user)}`}
                    className="hover:text-foreground font-semibold text-primary transition"
                  >
                    {row.user}
                  </Link>
                </div>
              </div>

              <div className="flex flex-col gap-0.5 border-t border-border/40 pt-1.5 mt-1.5">
                <div className="truncate font-mono text-[9px] uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1">
                  <Tv className="size-2.5 text-primary shrink-0" />
                  <a
                    href={`https://twitch.tv/${row.channel}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-foreground underline decoration-dotted underline-offset-2 transition font-bold"
                  >
                    {row.channel}
                  </a>
                </div>
                <div className="truncate font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 flex items-center gap-1">
                  <Calendar className="size-2.5 text-muted-foreground/70 shrink-0" />
                  <span>{formatRecruitDate(row.created_at)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CollectionTable({
  rows,
  offset,
}: {
  rows: CollectionRow[];
  offset: number;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">#</TableHead>
            <TableHead>Unit</TableHead>
            <TableHead>Commander</TableHead>
            <TableHead className="hidden tablet:table-cell">Channel</TableHead>
            <TableHead className="hidden text-right tablet:table-cell">
              Recruited
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={row.id}>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {offset + index + 1}
              </TableCell>
              <TableCell>
                <Link
                  className="inline-flex items-center gap-2 font-semibold hover:text-primary"
                  href={`/units/${encodeURIComponent(row.poke)}`}
                >
                  <UnitPortraitById id={row.poke} size={36} />
                  {getUnitDisplayName(row.poke)}
                </Link>
              </TableCell>
              <TableCell>
                <Link
                  href={`/collections?mode=user&q=${encodeURIComponent(row.user)}`}
                  className="hover:text-primary"
                >
                  {row.user}
                </Link>
              </TableCell>
              <TableCell className="hidden tablet:table-cell">
                <a
                  href={`https://twitch.tv/${row.channel}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary underline decoration-dotted underline-offset-4"
                >
                  {row.channel}
                </a>
              </TableCell>
              <TableCell className="hidden text-right text-xs text-muted-foreground tablet:table-cell">
                {formatRecruitDate(row.created_at)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

