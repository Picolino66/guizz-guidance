export interface DurationSource {
  totalTimeMilliseconds?: number | null;
  totalTimeSeconds?: number | null;
}

export function formatClockMilliseconds(totalTimeMilliseconds: number) {
  const safeMilliseconds = Number.isFinite(totalTimeMilliseconds)
    ? Math.max(0, Math.floor(totalTimeMilliseconds))
    : 0;
  const totalSeconds = Math.floor(safeMilliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = safeMilliseconds % 1000;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}:${String(milliseconds).padStart(3, "0")}`;
}

export function formatElapsedTime(source: DurationSource) {
  if (
    typeof source.totalTimeMilliseconds === "number" &&
    Number.isFinite(source.totalTimeMilliseconds)
  ) {
    return formatClockMilliseconds(source.totalTimeMilliseconds);
  }

  if (typeof source.totalTimeSeconds === "number" && Number.isFinite(source.totalTimeSeconds)) {
    return formatClockMilliseconds(source.totalTimeSeconds * 1000);
  }

  return formatClockMilliseconds(0);
}
