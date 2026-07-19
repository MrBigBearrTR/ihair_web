import axios from "axios";

import { api, publicApi } from "@/api/client";

export const MAX_LOGO_BYTES = 1024 * 1024;

async function getLogoBlob(url: string, isPublic = false): Promise<Blob | null> {
  try {
    const client = isPublic ? publicApi : api;
    const response = await client.get<Blob>(url, { responseType: "blob" });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
}

async function uploadLogo(url: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  await api.put(url, formData, {
    // Axios instance'ındaki JSON varsayılanını kaldır; boundary'yi tarayıcı üretir.
    headers: { "Content-Type": undefined },
  });
}

export function getSalonLogo(salonId: number) {
  return getLogoBlob(`/api/salons/${salonId}/logo`);
}

export function uploadSalonLogo(salonId: number, file: File) {
  return uploadLogo(`/api/salons/${salonId}/logo`, file);
}

export async function deleteSalonLogo(salonId: number) {
  await api.delete(`/api/salons/${salonId}/logo`);
}

export function getGlobalLogo() {
  return getLogoBlob("/api/branding/logo", true);
}

export function uploadGlobalLogo(file: File) {
  return uploadLogo("/api/branding/logo", file);
}

export async function deleteGlobalLogo() {
  await api.delete("/api/branding/logo");
}

export async function validateLogoFile(file: File) {
  if (file.type !== "image/png") {
    throw new Error("Yalnızca PNG dosyası yükleyebilirsiniz.");
  }
  if (file.size > MAX_LOGO_BYTES) {
    throw new Error("Logo en fazla 1 MB olabilir.");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("PNG dosyası okunamadı veya bozuk.");
  }

  try {
    if (bitmap.width > 4096 || bitmap.height > 4096) {
      throw new Error("Logo boyutları en fazla 4096 × 4096 piksel olabilir.");
    }

    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Logo doğrulanamadı.");

    context.drawImage(bitmap, 0, 0);
    const pixels = context.getImageData(0, 0, bitmap.width, bitmap.height).data;
    let hasTransparency = false;
    for (let index = 3; index < pixels.length; index += 4) {
      if (pixels[index] < 255) {
        hasTransparency = true;
        break;
      }
    }
    if (!hasTransparency) {
      throw new Error("Logo en az bir saydam piksel içermelidir.");
    }
  } finally {
    bitmap.close();
  }
}
