export interface ScreenpopCallContext {
  sessionId: string;
  callerPhone: string | null;
  callFor: 'self' | 'proxy';
}

export interface GangerClient {
  onCallAnswered(handler: (phone: string) => void): void;
  notifyScreenpopReady(): void;
}

export interface ScreenpopIntegrations {
  ganger: GangerClient;
}

export type ScreenpopHost = Window & {
  ScreenpopAPI?: {
    handleIncomingCall?: (phone: string) => unknown;
  };
};

export interface ScreenpopRuntimeOptions {
  host: ScreenpopHost;
  integrations: ScreenpopIntegrations;
}

export interface ScreenpopRuntime {
  boot(): void;
}
