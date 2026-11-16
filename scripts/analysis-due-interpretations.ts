// Analysis helper (not part of the application): prints due times for the
// alternative readings of the proposed one-business-day target (OD-H1c).
import { INTERPRETATIONS } from "@/lib/practice-schedule/due-time-interpretations";

const ist = (s: string) => new Date(`${s}:00+05:30`);
const show = (d: Date) =>
  new Date(d.getTime() + 330 * 60_000).toISOString().slice(5, 16).replace("T", " ");

const samples = ["08:59", "09:00", "09:01", "12:00", "17:59", "18:00", "20:00", "23:59"];
console.log("SAMPLES (submitted Tue 2026-11-17 IST -> due)");
console.log(["time", ...Object.keys(INTERPRETATIONS)].join("\t"));
for (const s of samples) {
  const t = ist(`2026-11-17T${s}`);
  console.log([s, ...Object.values(INTERPRETATIONS).map((f) => show(f(t)))].join("\t"));
}

console.log("\nSWEEP (every minute of Tue 2026-11-17): turnaround hours and cliffs");
for (const [name, f] of Object.entries(INTERPRETATIONS)) {
  let minTurn = Infinity;
  let maxTurn = 0;
  let prevDue: number | null = null;
  const cliffs: string[] = [];
  let decreasing = 0;
  for (let m = 0; m < 24 * 60; m += 1) {
    const hh = String(Math.floor(m / 60)).padStart(2, "0");
    const mm = String(m % 60).padStart(2, "0");
    const t = ist(`2026-11-17T${hh}:${mm}`);
    const due = f(t).getTime();
    const turn = (due - t.getTime()) / 3_600_000;
    minTurn = Math.min(minTurn, turn);
    maxTurn = Math.max(maxTurn, turn);
    if (prevDue !== null) {
      const jump = (due - prevDue) / 3_600_000;
      if (jump < 0) decreasing += 1;
      if (jump > 1) cliffs.push(`${hh}:${mm} (+${jump.toFixed(1)}h)`);
    }
    prevDue = due;
  }
  console.log(
    `${name}: turnaround ${minTurn.toFixed(2)}h..${maxTurn.toFixed(2)}h; decreasing steps ${decreasing}; cliffs >1h: ${cliffs.join(", ") || "none"}`,
  );
}

console.log("\nHOLIDAY/WEEKEND (Wed 2026-11-18 14:00; holiday Thu 2026-11-19)");
const hol = new Set(["2026-11-19"]);
for (const [name, f] of Object.entries(INTERPRETATIONS)) {
  console.log(name, show(f(ist("2026-11-18T14:00"), undefined, hol)), "| Sat 21 14:00 ->", show(f(ist("2026-11-21T14:00"))));
}
