export function formatReportAverage(periodAverage: number | null) {
  if (typeof periodAverage !== "number") {
    return "-";
  }

  const roundedAverage = Math.round((periodAverage + Number.EPSILON) * 10) / 10;
  return roundedAverage.toFixed(1);
}

export function formatReportRank(rank: number | null, totalStudents: number) {
  if (!rank || totalStudents <= 0) {
    return "-";
  }

  return `${rank} de ${totalStudents}`;
}
