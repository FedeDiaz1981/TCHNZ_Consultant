import { randomUUID } from "node:crypto";
import { access, mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const CLIENT_LOGO_PUBLIC_PREFIX = "/assets/client-logos/";
const MAX_CLIENT_LOGO_SIZE_BYTES = 5 * 1024 * 1024;

const mimeTypeToExtension = new Map<string, string>([
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/webp", ".webp"]
]);

const allowedExtensions = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const CLIENT_LOGO_UPLOAD_DIRS = [
  path.join(process.cwd(), "public", "assets", "client-logos"),
  path.join(process.cwd(), "dist", "client", "assets", "client-logos")
];

async function pathExists(targetPath: string) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function getWritableUploadDirs() {
  const directories = [CLIENT_LOGO_UPLOAD_DIRS[0]];

  if (await pathExists(path.join(process.cwd(), "dist", "client"))) {
    directories.push(CLIENT_LOGO_UPLOAD_DIRS[1]);
  }

  return directories;
}

function sanitizeSegment(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "");

  return normalized || "consultor";
}

function resolveLogoExtension(file: File) {
  const mimeType = file.type.trim().toLowerCase();

  if (mimeTypeToExtension.has(mimeType)) {
    return mimeTypeToExtension.get(mimeType) ?? null;
  }

  const extension = path.extname(file.name).toLowerCase();

  if (allowedExtensions.has(extension)) {
    return extension === ".jpeg" ? ".jpg" : extension;
  }

  return null;
}

export function isManagedClientLogo(url: string | null | undefined) {
  return typeof url === "string" && url.startsWith(CLIENT_LOGO_PUBLIC_PREFIX);
}

export async function removeManagedClientLogo(url: string | null | undefined) {
  if (!isManagedClientLogo(url)) return;

  const filename = path.basename(url);

  for (const uploadDir of await getWritableUploadDirs()) {
    const resolvedUploadsDir = path.resolve(uploadDir);
    const resolvedFile = path.resolve(resolvedUploadsDir, filename);

    if (resolvedFile !== path.join(resolvedUploadsDir, filename)) {
      continue;
    }

    try {
      await unlink(resolvedFile);
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        continue;
      }

      console.error("No pudimos eliminar el logo anterior del consultor.", error);
    }
  }
}

export async function storeClientLogoUpload(
  entry: FormDataEntryValue | null,
  {
    slug,
    clientId
  }: {
    slug: string;
    clientId?: string | null;
  }
) {
  if (!(entry instanceof File) || entry.size === 0) {
    return null;
  }

  const extension = resolveLogoExtension(entry);

  if (!extension) {
    throw new Error("El logo debe ser una imagen PNG, JPG o WEBP.");
  }

  if (entry.size > MAX_CLIENT_LOGO_SIZE_BYTES) {
    throw new Error("El logo supera el limite de 5 MB permitido.");
  }

  const baseName = sanitizeSegment(clientId ?? slug);
  const fileName = `${baseName}-${Date.now()}-${randomUUID().slice(0, 8)}${extension}`;
  const fileBuffer = Buffer.from(await entry.arrayBuffer());
  const uploadDirs = await getWritableUploadDirs();

  await Promise.all(
    uploadDirs.map(async (uploadDir) => {
      await mkdir(uploadDir, { recursive: true });
      const filePath = path.join(uploadDir, fileName);
      await writeFile(filePath, fileBuffer);
    })
  );

  return `${CLIENT_LOGO_PUBLIC_PREFIX}${fileName}`;
}
