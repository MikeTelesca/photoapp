// One-off: apply prisma/migrations/manual-catchup.sql against Neon.
// Uses DATABASE_URL_UNPOOLED from .env.production. Idempotent.
import fs from "node:fs";
import { neon } from "@neondatabase/serverless";

const envFile = fs.readFileSync(".env.production", "utf8");
const m = envFile.match(/^DATABASE_URL_UNPOOLED="?([^"\n]+)"?/m);
if (!m) { console.error("No DATABASE_URL_UNPOOLED"); process.exit(1); }
const sql = neon(m[1]);

let file = fs.readFileSync("prisma/migrations/manual-catchup.sql", "utf8");

// Strip -- line comments (but NOT inside $$..$$)
let cleaned = "";
let inDollar = false;
const lines = file.split("\n");
for (const line of lines) {
  // Track $$ toggles on the full line
  const dollarCount = (line.match(/\$\$/g) || []).length;
  if (!inDollar) {
    // Remove everything after -- on this line
    const idx = line.indexOf("--");
    cleaned += (idx === -1 ? line : line.slice(0, idx)) + "\n";
  } else {
    cleaned += line + "\n";
  }
  if (dollarCount % 2 === 1) inDollar = !inDollar;
}

// Split by semicolons, respecting $$ blocks and parentheses depth
const stmts = [];
let buf = "";
inDollar = false;
let parenDepth = 0;
for (let i = 0; i < cleaned.length; i++) {
  if (cleaned.slice(i, i + 2) === "$$") { inDollar = !inDollar; buf += "$$"; i++; continue; }
  const ch = cleaned[i];
  if (!inDollar) {
    if (ch === "(") parenDepth++;
    else if (ch === ")") parenDepth--;
  }
  if (ch === ";" && !inDollar && parenDepth === 0) {
    if (buf.trim()) stmts.push(buf.trim());
    buf = "";
    continue;
  }
  buf += ch;
}
if (buf.trim()) stmts.push(buf.trim());

console.log(`Parsed ${stmts.length} statements.`);
let ok = 0, err = 0;
const failures = [];
for (const s of stmts) {
  try { await sql.query(s); ok++; }
  catch (e) { err++; failures.push({ stmt: s.slice(0, 140), msg: e.message }); }
}
console.log(`\nDone. ok=${ok} errors=${err}`);
if (failures.length) {
  console.log("\nFailures:");
  failures.forEach(f => console.log(` - ${f.stmt.replace(/\s+/g, " ")}...\n     ${f.msg}`));
}
process.exit(err ? 1 : 0);
