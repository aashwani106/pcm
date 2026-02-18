type LiveKitRole = 'teacher' | 'student' | 'admin';

interface GenerateTokenParams {
  userId: string;
  roomName: string;
  role: LiveKitRole;
}

export async function generateLiveKitToken({
  userId,
  roomName,
  role,
}: GenerateTokenParams) {
  const apiKey = process.env.LIVEKIT_API_KEY!;
  const apiSecret = process.env.LIVEKIT_API_SECRET!;

  if (!apiKey || !apiSecret) {
    throw new Error('LiveKit credentials not configured');
  }

  // Keep SDK import runtime-only so backend still compiles before package install.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { AccessToken } = require('livekit-server-sdk') as {
    AccessToken: new (
      key: string,
      secret: string,
      options: { identity: string }
    ) => {
      addGrant: (grant: {
        room: string;
        roomJoin: boolean;
        canPublish: boolean;
        canSubscribe: boolean;
      }) => void;
      toJwt: () => string;
    };
  };

  const token = new AccessToken(apiKey, apiSecret, {
    identity: userId,
  });

  const canPublish = role === 'teacher';

  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish,
    canSubscribe: true,
  });

  return await token.toJwt();
}
