import { checkAppointmentRateLimit } from "../src/lib/appointment-abuse";

async function main() {
  const ip = process.env.TEST_IP;
  const count = Number(process.env.TEST_COUNT ?? "0");
  if (!ip || !Number.isFinite(count) || count <= 0) {
    process.stderr.write("missing TEST_IP/TEST_COUNT\n");
    process.exit(1);
  }

  const opts = { nodeEnv: "production", storeEnv: "upstash" };
  const out: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const result = await checkAppointmentRateLimit(ip, opts);
    out.push(result.allowed ? "1" : "0");
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  process.stdout.write(out.join(","));
}

main().catch(() => {
  process.exit(1);
});
