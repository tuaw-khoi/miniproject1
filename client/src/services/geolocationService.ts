import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import type { GpsEvidence } from "../types/survey";

export interface GpsCaptureResult {
  status: "captured" | "unavailable";
  evidence?: GpsEvidence;
  error?: string;
}

export async function captureCurrentGps(): Promise<GpsCaptureResult> {
  try {
    const position = Capacitor.isNativePlatform()
      ? await captureNativePosition()
      : await captureBrowserPosition();

    return {
      status: "captured",
      evidence: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        capturedAt: new Date(position.timestamp).toISOString()
      }
    };
  } catch (error) {
    return {
      status: "unavailable",
      error: error instanceof Error ? error.message : "GPS is unavailable."
    };
  }
}

async function captureNativePosition() {
  const permissions = await Geolocation.checkPermissions();
  if (
    permissions.location === "prompt" ||
    permissions.coarseLocation === "prompt"
  ) {
    await Geolocation.requestPermissions();
  }

  return Geolocation.getCurrentPosition({
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 0
  });
}

function captureBrowserPosition(): Promise<GeolocationPosition> {
  if (!("geolocation" in navigator)) {
    return Promise.reject(new Error("Geolocation is not supported."));
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    });
  });
}
