import { RefreshCw, Wifi, WifiOff } from "lucide-react";
import type { NetworkState } from "../hooks/useNetwork";

interface NetworkStatusProps {
  network: NetworkState;
  pendingCount: number;
  failedCount: number;
  onRetry: () => void;
  syncing: boolean;
}

export function NetworkStatus({
  network,
  pendingCount,
  failedCount,
  onRetry,
  syncing
}: NetworkStatusProps) {
  const hasQueue = pendingCount + failedCount > 0;
  const Icon = network.connected ? Wifi : WifiOff;

  return (
    <section
      className={`rounded-lg border px-4 py-3 ${
        network.connected
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-amber-200 bg-amber-50 text-amber-950"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3">
          <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold">
              {network.connected ? "Online" : "Offline"}
              <span className="font-normal opacity-80">
                {" "}
                via {network.source}
              </span>
            </p>
            <p className="mt-1 text-sm opacity-90">
              {network.connected
                ? hasQueue
                  ? `${pendingCount + failedCount} local item(s) can sync now.`
                  : "New submissions can sync with the API."
                : "Surveys are saved locally and will sync later."}
            </p>
          </div>
        </div>

        {hasQueue && network.connected ? (
          <button
            type="button"
            onClick={onRetry}
            disabled={syncing}
            title="Retry sync"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-slate-800 shadow-sm ring-1 ring-black/5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
          </button>
        ) : null}
      </div>
    </section>
  );
}
