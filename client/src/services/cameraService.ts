import { Capacitor } from "@capacitor/core";
import {
  Camera,
  CameraResultType,
  CameraSource,
  type ImageOptions
} from "@capacitor/camera";

const MAX_PHOTO_SIZE = 1280;
const PHOTO_QUALITY = 0.78;

export function canUseNativeCamera(): boolean {
  return Capacitor.isNativePlatform();
}

export async function captureNativePhoto(): Promise<string | undefined> {
  if (!canUseNativeCamera()) {
    return undefined;
  }

  const options: ImageOptions = {
    quality: 80,
    allowEditing: false,
    resultType: CameraResultType.DataUrl,
    source: CameraSource.Prompt,
    width: MAX_PHOTO_SIZE
  };

  const photo = await Camera.getPhoto(options);
  return photo.dataUrl;
}

export async function resizeImageFile(file: File): Promise<string> {
  const imageUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(imageUrl);
    const scale = Math.min(1, MAX_PHOTO_SIZE / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Cannot prepare photo canvas");
    }

    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", PHOTO_QUALITY);
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Cannot read selected photo"));
    image.src = src;
  });
}
