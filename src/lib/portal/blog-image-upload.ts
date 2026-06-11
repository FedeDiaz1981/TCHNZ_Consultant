import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

type UploadOptions = {
  slugHint?: string;
};

const MAX_BLOG_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;
const BLOG_IMAGE_PUBLIC_PREFIX = "/assets/blog/";
const mimeTypeToExtension = new Map<string, string>([
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"]
]);
const allowedExtensions = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);
const BLOG_UPLOAD_DIRS = [
  path.join(process.cwd(), "public", "assets", "blog"),
  path.join(process.cwd(), "dist", "client", "assets", "blog")
];

function sanitizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "");
}

async function pathExists(targetPath: string) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function getWritableUploadDirs() {
  const directories = [BLOG_UPLOAD_DIRS[0]];
  if (await pathExists(path.join(process.cwd(), "dist", "client"))) {
    directories.push(BLOG_UPLOAD_DIRS[1]);
  }
  return directories;
}

function resolveImageExtension(file: File) {
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

export async function storeBlogImageUpload(fileEntry: FormDataEntryValue | null, options: UploadOptions = {}) {
  if (!(fileEntry instanceof File) || fileEntry.size === 0) {
    return null;
  }

  const extension = resolveImageExtension(fileEntry);

  if (!extension) {
    throw new Error("Formato de imagen no permitido. Usa PNG, JPG, WEBP o GIF.");
  }

  if (fileEntry.size > MAX_BLOG_IMAGE_SIZE_BYTES) {
    throw new Error("La imagen supera el maximo de 8MB.");
  }

  const slugPrefix = sanitizeSlug(options.slugHint ?? "") || "blog";
  const fileName = `${slugPrefix}-${Date.now()}-${randomUUID().slice(0, 8)}${extension}`;

  const bytes = Buffer.from(await fileEntry.arrayBuffer());
  const uploadDirs = await getWritableUploadDirs();
  await Promise.all(
    uploadDirs.map(async (uploadDir) => {
      await mkdir(uploadDir, { recursive: true });
      await writeFile(path.join(uploadDir, fileName), bytes);
    })
  );

  return `${BLOG_IMAGE_PUBLIC_PREFIX}${fileName}`;
}
