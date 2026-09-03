import type { PluginListenerHandle } from "@capacitor/core";
import { Capacitor } from "@capacitor/core";
import { Network } from "@capacitor/network";

export interface NetworkSnapshot {
  connected: boolean;
  connectionType: string;
  source: "browser" | "capacitor";
}

export function browserNetworkSnapshot(): NetworkSnapshot {
  return {
    connected: typeof navigator === "undefined" ? true : navigator.onLine,
    connectionType: "unknown",
    source: "browser"
  };
}

export async function getNetworkSnapshot(): Promise<NetworkSnapshot> {
  if (Capacitor.isNativePlatform()) {
    try {
      const status = await Network.getStatus();

      return {
        connected: status.connected,
        connectionType: status.connectionType,
        source: "capacitor"
      };
    } catch {
      return browserNetworkSnapshot();
    }
  }

  return browserNetworkSnapshot();
}

export function watchNetwork(
  callback: (snapshot: NetworkSnapshot) => void
): () => void {
  let nativeHandle: PluginListenerHandle | undefined;
  let cleanedUp = false;

  const emitBrowserStatus = (): void => {
    void getNetworkSnapshot().then(callback);
  };

  if (Capacitor.isNativePlatform()) {
    void Network.addListener("networkStatusChange", (status) => {
      callback({
        connected: status.connected,
        connectionType: status.connectionType,
        source: "capacitor"
      });
    }).then((handle) => {
      nativeHandle = handle;
      if (cleanedUp) {
        void nativeHandle.remove();
      }
    });
  }

  window.addEventListener("online", emitBrowserStatus);
  window.addEventListener("offline", emitBrowserStatus);

  return () => {
    cleanedUp = true;
    window.removeEventListener("online", emitBrowserStatus);
    window.removeEventListener("offline", emitBrowserStatus);

    if (nativeHandle) {
      void nativeHandle.remove();
    }
  };
}
