let fallbackSequence = 0;

function randomHex(bytes: number) {
  const values = new Uint8Array(bytes);

  try {
    globalThis.crypto?.getRandomValues?.(values);
    return Array.from(values, (value) => value.toString(16).padStart(2, "0")).join("");
  } catch {
    return Array.from(
      { length: bytes },
      () => Math.floor(Math.random() * 256).toString(16).padStart(2, "0"),
    ).join("");
  }
}

export function createClientId() {
  try {
    if (typeof globalThis.crypto?.randomUUID === "function") {
      return globalThis.crypto.randomUUID();
    }
  } catch {
    // Insecure LAN origins and older Safari versions may expose crypto incompletely.
  }

  fallbackSequence += 1;
  return [
    Date.now().toString(36),
    fallbackSequence.toString(36),
    randomHex(8),
  ].join("-");
}
