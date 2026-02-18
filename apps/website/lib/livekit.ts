import { Room } from "livekit-client";

export async function connectToRoom(token: string) {
  const url = process.env.NEXT_PUBLIC_LIVEKIT_URL!;

  // Prefer helper when present; fallback keeps compatibility across SDK variants.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const runtimeModule = require("livekit-client") as { connect?: (u: string, t: string) => Promise<Room> };
  const maybeConnect = runtimeModule.connect;
  if (typeof maybeConnect === "function") {
    return await maybeConnect(url, token);
  }

  const room = new Room();
  await room.connect(url, token);
  return room;
}
