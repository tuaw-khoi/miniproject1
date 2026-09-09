type Listener = () => void;

const listeners = new Set<Listener>();

export const contextStore = {
  notify(): void {
    listeners.forEach((listener) => listener());
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
};
