import { useEffect, useState } from "react";
import {
  browserNetworkSnapshot,
  getNetworkSnapshot,
  watchNetwork,
  type NetworkSnapshot
} from "../services/networkService";

export interface NetworkState extends NetworkSnapshot {
  initialized: boolean;
}

export function useNetwork(): NetworkState {
  const [state, setState] = useState<NetworkState>({
    ...browserNetworkSnapshot(),
    initialized: false
  });

  useEffect(() => {
    let active = true;

    void getNetworkSnapshot().then((snapshot) => {
      if (active) {
        setState({
          ...snapshot,
          initialized: true
        });
      }
    });

    const cleanup = watchNetwork((snapshot) => {
      setState({
        ...snapshot,
        initialized: true
      });
    });

    return () => {
      active = false;
      cleanup();
    };
  }, []);

  return state;
}
