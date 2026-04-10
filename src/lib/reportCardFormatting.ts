export function formatReportAverage(periodAverage: number | null) {
  return typeof periodAverage === "number" ? periodAverage.toFixed(2) : "-";
}

export function formatReportRank(rank: number | null, totalStudents: number) {
  if (!rank || totalStudents <= 0) {
    return "-";
  }

  return `${rank} de ${totalStudents}`;
}
