export async function fetchAllBankData() {
  const [tumanlar, kreditlar, omonatlar, kartalar] = await Promise.allSettled([
    fetch("/data/tumanlar.json").then((r) => r.json()),
    fetch("/data/kreditlar.json").then((r) => r.json()),
    fetch("/data/omonatlar.json").then((r) => r.json()),
    fetch("/data/kartalar.json").then((r) => r.json()),
  ]);

  return {
    tumanlar: tumanlar.status === "fulfilled" ? tumanlar.value : [],
    kreditlar: kreditlar.status === "fulfilled" ? kreditlar.value : [],
    omonatlar: omonatlar.status === "fulfilled" ? omonatlar.value : [],
    kartalar: kartalar.status === "fulfilled" ? kartalar.value : [],
  };
}
