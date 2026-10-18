export async function compressImage(file: File): Promise<File> {
  if (file.size > 20 * 1024 * 1024)
    throw new Error("Choose a photo smaller than 20 MB.");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error(
      "Use a JPEG, PNG or WebP photo. Export HEIC/HEIF as JPEG first.",
    );
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("This image could not be opened. Try another photo.");
  });
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Your browser could not prepare this image.");
  }
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not compress photo."))),
      "image/jpeg",
      0.84,
    ),
  );
  if (blob.size > 3_000_000)
    throw new Error("Photo is still too large. Try a smaller image.");
  return new File([blob], "listing.jpg", { type: "image/jpeg" });
}
