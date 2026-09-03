type Listener = () => void;

const listeners = new Set<Listener>();

export const surveyStore = {
  notify(): void {
    listeners.forEach((listener) => listener());
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  }
};
