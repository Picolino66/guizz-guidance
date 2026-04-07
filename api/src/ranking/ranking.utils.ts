import { Participant, User } from "@prisma/client";

type RankingParticipant = Pick<
  Participant,
  "id" | "score" | "totalTimeSeconds" | "startedAt" | "finishedAt" | "createdAt"
> & {
  user: Pick<User, "email" | "name">;
};

export type RankingSnapshotItem = {
  position: number;
  participantId: string;
  name: string;
  score: number;
  totalTimeSeconds: number;
  totalTimeMilliseconds: number;
};

export function capitalizeName(name: string): string {
  return name.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())
}

export function getRankingTimeMilliseconds(
  participant: Pick<RankingParticipant, "finishedAt" | "startedAt" | "totalTimeSeconds">
) {
  if (participant.finishedAt) {
    return Math.max(1, participant.finishedAt.getTime() - participant.startedAt.getTime());
  }

  return Math.max(1, participant.totalTimeSeconds * 1000);
}

export function buildRankingSnapshot(participants: RankingParticipant[]): RankingSnapshotItem[] {
  return [...participants]
    .sort(
      (left, right) =>
        right.score - left.score ||
        getRankingTimeMilliseconds(left) - getRankingTimeMilliseconds(right) ||
        left.createdAt.getTime() - right.createdAt.getTime() ||
        left.id.localeCompare(right.id)
    )
    .map((participant, index) => ({
      position: index + 1,
      participantId: participant.id,
      name: participant.user.name ? capitalizeName(participant.user.name) : participant.user.email,
      score: participant.score,
      totalTimeSeconds: participant.totalTimeSeconds,
      totalTimeMilliseconds: getRankingTimeMilliseconds(participant)
    }));
}
