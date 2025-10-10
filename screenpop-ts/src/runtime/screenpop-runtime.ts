import { ScreenpopRuntime, ScreenpopRuntimeOptions } from './types';

export function createScreenpopRuntime(options: ScreenpopRuntimeOptions): ScreenpopRuntime {
  function handleCallAnswered(phone: string) {
    try {
      options.host.ScreenpopAPI?.handleIncomingCall?.(phone);
    } catch (error) {
      console.warn('[screenpop-ts] failed to handle call event', error);
    }
  }

  function boot() {
    options.integrations.ganger.onCallAnswered(handleCallAnswered);
    options.integrations.ganger.notifyScreenpopReady();
  }

  return { boot };
}
