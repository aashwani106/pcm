import { EventEmitter } from 'events';

export type LiveJoinRequestEvent =
  | {
      type: 'created';
      sessionId: string;
      request: {
        id: string;
        displayName: string;
        status: 'pending' | 'approved' | 'rejected';
        createdAt: string;
      };
    }
  | {
      type: 'updated';
      sessionId: string;
      request: {
        id: string;
        status: 'pending' | 'approved' | 'rejected';
        token?: string | null;
      };
    };

const liveJoinRequestEmitter = new EventEmitter();
liveJoinRequestEmitter.setMaxListeners(1000);

export function emitLiveJoinRequestEvent(event: LiveJoinRequestEvent) {
  liveJoinRequestEmitter.emit('event', event);
}

export function subscribeLiveJoinRequestEvents(
  listener: (event: LiveJoinRequestEvent) => void
) {
  liveJoinRequestEmitter.on('event', listener);
  return () => {
    liveJoinRequestEmitter.off('event', listener);
  };
}
