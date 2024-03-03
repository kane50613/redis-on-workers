export type Command = [string, ...(string | number | Uint8Array)[]];

export interface CreateRedisOptions {
  url: string;
  tls?: boolean;
  logger?: (...message: string[]) => void;
}
