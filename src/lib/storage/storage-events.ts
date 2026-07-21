type Listener = () => void;

const listenersByKey = new Map<string, Set<Listener>>();

export function subscribeStorageKey(key: string, listener: Listener): () => void {
  const listeners = listenersByKey.get(key) ?? new Set<Listener>();
  listeners.add(listener);
  listenersByKey.set(key, listeners);
  const onStorage = (event: StorageEvent) => {
    if (event.key === key) listener();
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

export function notifyStorageKey(key: string): void {
  listenersByKey.get(key)?.forEach((listener) => listener());
}
