export function getAnomalyCount(run, sourceType) {
  return Number(
    run?.source_breakdown?.[sourceType]?.anomaly_count ??
    run?.[`${sourceType}_anomalies`] ??
    0
  );
}
