export function makeSlug(title: string): string {
  const base =
    title
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 45) || "space";

  // Slug regex check: ^[a-z0-9][a-z0-9-]{2,79}$
  const randomSuffix = crypto.randomUUID().slice(0, 8);
  return `${base}-${randomSuffix}`;
}
