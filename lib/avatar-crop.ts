export type AvatarImage = { bitmap: ImageBitmap; url: string };
export async function decodeAvatar(file: File): Promise<AvatarImage> {
  if (file.size > 2 * 1024 * 1024) throw new Error("图片不能超过2MB。");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("仅支持JPEG、PNG、WebP图片。");
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const signature =
    bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
      ? "image/jpeg"
      : bytes[0] === 137 && String.fromCharCode(...bytes.slice(1, 4)) === "PNG"
        ? "image/png"
        : String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
            String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
          ? "image/webp"
          : "";
  if (signature !== file.type) throw new Error("图片内容与文件格式不匹配。");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("图片无法解码，请换一张图片。");
  }
  if (
    Math.max(bitmap.width, bitmap.height) > 4096 ||
    Math.min(bitmap.width, bitmap.height) < 32
  ) {
    bitmap.close();
    throw new Error("图片边长需在32至4096像素之间。");
  }
  return { bitmap, url: URL.createObjectURL(file) };
}
export function drawAvatar(
  canvas: HTMLCanvasElement,
  image: AvatarImage,
  zoom: number,
  x: number,
  y: number,
) {
  const { bitmap } = image;
  const crop = Math.min(bitmap.width, bitmap.height) / zoom;
  const sx = ((bitmap.width - crop) * x) / 100,
    sy = ((bitmap.height - crop) * y) / 100;
  canvas.width = 128;
  canvas.height = 128;
  canvas
    .getContext("2d")
    ?.drawImage(bitmap, sx, sy, crop, crop, 0, 0, 128, 128);
}
export function encodeAvatar(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => {
        if (blob && blob.type === "image/webp" && blob.size <= 40 * 1024)
          resolve(blob);
        else reject(new Error("头像压缩失败，请换一张图片。"));
      },
      "image/webp",
      0.82,
    ),
  );
}
