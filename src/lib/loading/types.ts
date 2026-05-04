export type BlockingLoadSource =
  | "auth"
  | "route"
  | "mutation"
  | "upload"
  | "custom";

export interface LoadingEntry {
  id: string;
  source: BlockingLoadSource;
  label?: string;
  startedAt: number;
}
