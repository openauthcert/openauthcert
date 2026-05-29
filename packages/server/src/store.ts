/** Filesystem-backed registry store using the nested layout. */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import type { Badge } from "@openauthcert/core";

// A single path segment: lowercase alnum start, then alnum/dot/dash/underscore.
// Blocks "/", "..", and other traversal vectors that the old Python lacked.
const SEGMENT = /^[a-z0-9][a-z0-9._-]*$/;

export class RegistryStore {
  constructor(private readonly root: string) {}

  /** Validate a path segment, throwing on anything unsafe. */
  static assertSegment(value: string, field: string): void {
    if (!SEGMENT.test(value)) {
      throw new Error(`invalid ${field}: ${JSON.stringify(value)}`);
    }
  }

  private ensureWithinRoot(...parts: string[]): string {
    const root = resolve(this.root);
    const target = resolve(root, ...parts);
    const rel = relative(root, target);
    if (rel === ".." || rel.startsWith(`..${"/"}`) || rel.startsWith(`..${"\\"}`)) {
      throw new Error("invalid path: outside registry root");
    }
    return target;
  }

  private pathFor(vendor: string, application: string, version: string): string {
    RegistryStore.assertSegment(vendor, "vendor");
    RegistryStore.assertSegment(application, "application");
    RegistryStore.assertSegment(version, "version");
    return this.ensureWithinRoot(vendor, application, `${version}.json`);
  }

  listAll(): Badge[] {
    const items: Badge[] = [];
    if (!existsSync(this.root)) return items;
    const visit = (dir: string): void => {
      for (const name of readdirSync(dir).sort()) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) visit(full);
        else if (name.endsWith(".json"))
          items.push(JSON.parse(readFileSync(full, "utf8")) as Badge);
      }
    };
    visit(this.root);
    return items;
  }

  listApp(vendor: string, application: string): Badge[] {
    RegistryStore.assertSegment(vendor, "vendor");
    RegistryStore.assertSegment(application, "application");
    const dir = this.ensureWithinRoot(vendor, application);
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
      .filter((n) => n.endsWith(".json"))
      .sort()
      .map((n) => JSON.parse(readFileSync(join(dir, n), "utf8")) as Badge);
  }

  read(vendor: string, application: string, version: string): Badge | null {
    const path = this.pathFor(vendor, application, version);
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, "utf8")) as Badge;
  }

  write(badge: Badge): string {
    const path = this.pathFor(badge.vendor, badge.application, badge.version);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(badge, null, 2) + "\n");
    return path;
  }
}
