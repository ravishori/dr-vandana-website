import { hashPassword } from "../src/lib/question-portal/password";

async function main() {
  const password = process.argv[2];
  if (!password || password.length < 12) {
    console.error("Usage: npx tsx scripts/hash-psychologist-password.ts '<password>'");
    console.error("Use a password of at least 12 characters. Do not commit the password.");
    process.exit(1);
  }
  const hash = await hashPassword(password);
  console.log(hash);
}

void main();
