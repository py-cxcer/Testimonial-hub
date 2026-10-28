export const PROFILE_PHOTO_BUCKET = "profile-photos";
export const MAX_PROFILE_PHOTO_BYTES = 2 * 1024 * 1024;

export type PhotoType = { mime: "image/jpeg" | "image/png" | "image/webp"; ext: "jpg" | "png" | "webp" };

/**
 * Detects the real image type from the file's leading bytes. The client-supplied
 * Content-Type and file name are never trusted, and SVG (script-capable) is not
 * accepted.
 */
export function detectPhotoType(bytes: Uint8Array): PhotoType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg" };
  }
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length >= 8 && png.every((b, i) => bytes[i] === b)) {
    return { mime: "image/png", ext: "png" };
  }
  // "RIFF" .... "WEBP"
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return { mime: "image/webp", ext: "webp" };
  }
  return null;
}

/** Public URL prefix for photos uploaded for one space. */
export function photoUrlPrefix(supabaseUrl: string, spaceId: string): string {
  return `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/${PROFILE_PHOTO_BUCKET}/${spaceId}/`;
}

/**
 * A submitted photo URL is only accepted when it points at a file this app
 * stored for this very space (no arbitrary hotlinks, trackers or other hosts).
 */
export function isOwnedPhotoUrl(url: string, supabaseUrl: string, spaceId: string): boolean {
  const prefix = photoUrlPrefix(supabaseUrl, spaceId);
  if (!url.startsWith(prefix)) return false;
  const name = url.slice(prefix.length);
  return /^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(name);
}
