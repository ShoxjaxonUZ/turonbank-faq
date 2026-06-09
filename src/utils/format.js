export function fmt(n) {
  return n?.toLocaleString("uz-UZ") ?? "—";
}

export function trend(bosh, hozir) {
  if (bosh == null || hozir == null) return null;
  if (hozir < bosh) return { dir: "down", color: "#16a34a", arrow: "▼" };
  if (hozir > bosh) return { dir: "up", color: "#dc2626", arrow: "▲" };
  return { dir: "same", color: "#f59e0b", arrow: "=" };
}
