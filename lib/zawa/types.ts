export type ZawaMessageType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'location'
  | 'contact';

export interface ZawaSessionCredentials {
  zawaId: string;
  sessionId: string;
}

export interface ZawaCreatedSession {
  id: string;
  sessionId: string;
}

export interface ZawaRemoteSession extends ZawaCreatedSession {
  isConnected: boolean;
  qrcode: string;
}

export interface ZawaMessagePayload {
  phone?: string;
  group?: string;
  newsletter?: string;
  type: ZawaMessageType;
  text?: string;
  image?: Record<string, unknown>;
  video?: Record<string, unknown>;
  audio?: Record<string, unknown>;
  document?: Record<string, unknown>;
  location?: Record<string, unknown>;
  contact?: Record<string, unknown>;
}
