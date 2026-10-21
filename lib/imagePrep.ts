// Browser only. Shrinks a photo or screenshot before it is sent to be read: long side at most 1600 pixels,
// JPEG at 85%. That keeps the request well under Vercel's 4.5 MB limit and is still sharp enough to read.

export const IMAGE_EXT = /\.(jpe?g|png|gif|webp|heic|heif)$/i;

export function isImage(file: File): boolean {
  return file.type.startsWith("image/") || IMAGE_EXT.test(file.name);
}

export class ImageError extends Error {
  name = "ImageError";
}

const LONG_SIDE = 1600;

async function decode(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // fall through to an <img>, which some browsers decode when createImageBitmap will not
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function prepareImage(file: Blob): Promise<{ base64: string; mediaType: "image/jpeg" }> {
  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await decode(file);
  } catch {
    throw new ImageError("This browser cannot open that picture. Save it as a JPEG or PNG and try again.");
  }
  const w = "naturalWidth" in source ? source.naturalWidth : source.width;
  const h = "naturalHeight" in source ? source.naturalHeight : source.height;
  if (!w || !h) throw new ImageError("That picture appears to be empty.");
  const scale = Math.min(1, LONG_SIDE / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImageError("This browser cannot prepare that picture.");
  ctx.fillStyle = "#ffffff"; // screenshots with transparent areas read better on white
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  if ("close" in source) source.close();
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  return { base64: dataUrl.slice(dataUrl.indexOf(",") + 1), mediaType: "image/jpeg" };
}
