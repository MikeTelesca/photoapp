// Diffs prisma/schema.prisma scalar fields vs actual Neon columns and
// applies ALTER TABLE ADD COLUMN IF NOT EXISTS for anything missing.
// Idempotent, safe. Does not drop or alter existing columns.
import fs from "node:fs";
import { neon } from "@neondatabase/serverless";

const m = fs.readFileSync(".env.production", "utf8").match(/^DATABASE_URL_UNPOOLED="?([^"\n]+)/m);
const sql = neon(m[1]);
const schema = fs.readFileSync("prisma/schema.prisma", "utf8");

const PRISMA_TO_PG = {
  String: "TEXT",
  Int: "INTEGER",
  BigInt: "BIGINT",
  Float: "DOUBLE PRECISION",
  Boolean: "BOOLEAN",
  DateTime: "TIMESTAMP(3)",
  Json: "JSONB",
  Bytes: "BYTEA",
  Decimal: "DECIMAL(65,30)",
};

function parseModels(src) {
  const models = {};
  const re = /^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm;
  let match;
  while ((match = re.exec(src))) {
    const [, name, body] = match;
    const fields = [];
    for (const line of body.split("\n")) {
      const s = line.trim();
      if (!s || s.startsWith("//") || s.startsWith("@@")) continue;
      // field: name Type modifiers
      const fm = s.match(/^(\w+)\s+(\w+)(\?|\[\])?\s*(.*)$/);
      if (!fm) continue;
      const [, fname, ftype, suffix, rest] = fm;
      // skip relations — they reference another model, have @relation or no db column
      if (rest.includes("@relation")) continue;
      // skip enums we don't know (treat as scalar strings if they're pure [A-Z])
      if (!PRISMA_TO_PG[ftype]) continue;
      if (suffix === "[]") continue; // arrays of scalars need special handling; skip for now
      const nullable = suffix === "?";
      // default
      const defMatch = rest.match(/@default\(([^)]+)\)/);
      let defaultClause = "";
      if (defMatch) {
        let d = defMatch[1];
        if (d === "now()") defaultClause = "DEFAULT CURRENT_TIMESTAMP";
        else if (d === "cuid()" || d === "uuid()") defaultClause = ""; // generated, only relevant at insert, skip for ADD
        else if (d === "true" || d === "false") defaultClause = `DEFAULT ${d}`;
        else if (/^-?\d+(\.\d+)?$/.test(d)) defaultClause = `DEFAULT ${d}`;
        else if (d.startsWith('"') && d.endsWith('"')) defaultClause = `DEFAULT '${d.slice(1, -1).replace(/'/g, "''")}'`;
      }
      const pgType = PRISMA_TO_PG[ftype];
      fields.push({ name: fname, type: pgType, nullable, defaultClause });
    }
    models[name] = fields;
  }
  return models;
}

const models = parseModels(schema);
console.log(`Parsed ${Object.keys(models).length} models from schema.`);

let totalAdded = 0;
for (const [model, fields] of Object.entries(models)) {
  let dbCols;
  try {
    const rows = await sql.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name=$1`,
      [model]
    );
    dbCols = new Set(rows.map((r) => r.column_name));
  } catch (e) {
    console.error(`  ${model}: cannot query columns — ${e.message}`);
    continue;
  }
  if (dbCols.size === 0) {
    console.log(`  ${model}: table does not exist in DB — skipping (use manual CREATE TABLE)`);
    continue;
  }
  const missing = fields.filter((f) => !dbCols.has(f.name));
  if (missing.length === 0) continue;
  console.log(`\n${model}: ${missing.length} missing columns`);
  for (const f of missing) {
    const nullClause = f.nullable ? "" : (f.defaultClause ? " NOT NULL" : ""); // if non-nullable and no default, leave nullable to avoid failure
    const ddl = `ALTER TABLE "${model}" ADD COLUMN IF NOT EXISTS "${f.name}" ${f.type}${nullClause} ${f.defaultClause}`.trim();
    try {
      await sql.query(ddl);
      console.log(`  + ${f.name} ${f.type}${f.nullable ? "?" : ""}${f.defaultClause ? " " + f.defaultClause : ""}`);
      totalAdded++;
    } catch (e) {
      console.error(`  ! ${f.name}: ${e.message}`);
    }
  }
}
console.log(`\nDone. Added ${totalAdded} column(s).`);
