import type { ReactNode } from "react";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildTeamNameRegex(teamNames: string[]): RegExp | null {
  const uniqueNames = Array.from(
    new Set(teamNames.map((name) => name.trim()).filter((name) => name.length > 0))
  ).sort((left, right) => right.length - left.length);

  if (uniqueNames.length === 0) return null;

  const alternation = uniqueNames.map(escapeRegex).join("|");
  return new RegExp(`(^|[^A-Za-z0-9])(${alternation})(?=$|[^A-Za-z0-9])`, "gi");
}

export function renderRecapTextWithTeamBadges(text: string, teamNames: string[]): ReactNode {
  if (text.trim().length === 0) return text;

  const teamNameRegex = buildTeamNameRegex(teamNames);
  if (!teamNameRegex) return text;

  const matcher = new RegExp(teamNameRegex.source, teamNameRegex.flags);
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let matchIndex = 0;

  for (let match = matcher.exec(text); match; match = matcher.exec(text)) {
    const fullMatch = match[0];
    const leading = match[1] ?? "";
    const teamName = match[2];
    const fullStart = match.index;
    const teamStart = fullStart + leading.length;

    if (cursor < fullStart) {
      nodes.push(text.slice(cursor, fullStart));
    }

    if (leading.length > 0) {
      nodes.push(leading);
    }

    nodes.push(
      <span
        key={`${teamStart}-${matchIndex}`}
        className="inline-flex items-center gap-1 rounded border border-[#2a2a2a] bg-[#111] px-1.5 py-[1px] align-baseline"
      >
        <span className="text-[8px] uppercase tracking-widest text-text-secondary">Team</span>
        <span className="text-[11px] text-text-primary/95">{teamName}</span>
      </span>
    );

    cursor = fullStart + fullMatch.length;
    matchIndex += 1;
  }

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return nodes.length > 0 ? nodes : text;
}
