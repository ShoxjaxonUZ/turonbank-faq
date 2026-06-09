export async function fetchTumanlar() {
  const res = await fetch("/data/tumanlar.json");
  if (!res.ok) throw new Error("Ma'lumotlar yuklanmadi");
  return res.json();
}
