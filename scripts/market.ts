import { $ } from "bun";
import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { gt } from "semver";
import { validateArchive } from "../l8db/packages/extension-api/src/manifest.ts";
import { type MarketExtension, validateMarketCatalog } from "../l8db/src/lib/extensions/market.ts";

const PACKAGE_PATH = /^packages\/[^/]+\.l8db-extension$/;
const MAX_PACKAGE_BYTES = 8 * 1024 * 1024;
const RESERVED_PUBLISHERS = new Set(["l8db"]);

function parse(path: string, bytes: Uint8Array): MarketExtension {
  if (bytes.byteLength > MAX_PACKAGE_BYTES) throw new Error(`${path}: Paket ist größer als 8 MiB.`);
  const archive = validateArchive(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)));
  const { id, name, description, version, publisher } = archive.manifest;
  const expected = `packages/${id}-${version}.l8db-extension`;
  if (path !== expected) throw new Error(`${path}: Datei muss ${expected} heißen.`);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const entry = { id, name, description: description ?? "", version, publisher, package: path, sha256 };
  try {
    validateMarketCatalog({ schemaVersion: 1, extensions: [entry] });
  } catch {
    throw new Error(
      `${path}: Beschreibung fehlt oder ist zu lang (max. 1000 Zeichen), Name max. 120 Zeichen, Version ohne „+“.`,
    );
  }
  return entry;
}

async function packages(): Promise<MarketExtension[]> {
  const names = (await readdir("packages")).filter((name) => name.endsWith(".l8db-extension"));
  return Promise.all(
    names.map(async (name) => parse(`packages/${name}`, await readFile(`packages/${name}`))),
  );
}

function catalog(entries: MarketExtension[]) {
  const latest = new Map<string, MarketExtension>();
  for (const entry of entries) {
    const current = latest.get(entry.id);
    if (!current || gt(entry.version, current.version)) latest.set(entry.id, entry);
  }
  const extensions = [...latest.values()].sort((a, b) => a.id.localeCompare(b.id));
  return validateMarketCatalog({ schemaVersion: 1, extensions });
}

async function check(base: string, head: string, author: string) {
  const login = author.toLowerCase();
  const existing = await packages();
  const diff = (await $`git diff --name-status --no-renames ${base}...${head}`.text()).trim();
  if (!diff) throw new Error("Der Pull Request enthält keine Änderungen.");
  const added: MarketExtension[] = [];
  for (const line of diff.split("\n")) {
    const [status, path] = line.split("\t");
    if (status !== "A" || !PACKAGE_PATH.test(path))
      throw new Error(`${path}: Erlaubt sind nur neue Dateien unter packages/.`);
    const entry = parse(path, new Uint8Array(await $`git show ${`${head}:${path}`}`.arrayBuffer()));
    if (RESERVED_PUBLISHERS.has(entry.publisher))
      throw new Error(`${path}: Herausgeber „${entry.publisher}“ ist reserviert.`);
    if (entry.publisher !== login)
      throw new Error(
        `${path}: Herausgeber „${entry.publisher}“ muss deinem GitHub-Namen „${login}“ entsprechen.`,
      );
    const newer = existing.find((item) => item.id === entry.id && !gt(entry.version, item.version));
    if (newer) throw new Error(`${path}: Version muss höher als ${newer.version} sein.`);
    added.push(entry);
  }
  catalog([...existing, ...added]);
  for (const entry of added) console.log(`OK ${entry.id}@${entry.version} (${entry.sha256})`);
}

const [command, ...args] = process.argv.slice(2);
if (command === "catalog")
  await writeFile("catalog.json", `${JSON.stringify(catalog(await packages()), null, 2)}\n`);
else if (command === "check" && args.length === 3) await check(args[0], args[1], args[2]);
else throw new Error("Usage: bun scripts/market.ts catalog | check <base> <head> <github-login>");
