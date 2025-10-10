import type { GangerClient } from '../types';

export function createGangerStub(): GangerClient {
  const listeners = new Set<(phone: string) => void>();

  function onCallAnswered(handler: (phone: string) => void) {
    listeners.add(handler);
    // emit a fake call once for local testing
    setTimeout(() => handler('+15551234567'), 800);
  }

  function notifyScreenpopReady() {
    console.info('[screenpop-ts] runtime ready; waiting for GangerAPI events');
  }

  return {
    onCallAnswered,
    notifyScreenpopReady
  };
}
