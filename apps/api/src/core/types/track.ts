export interface Track {
  title: string;
  artists: string[];
  album?: string;
  duration?: number;
  isrc?: string;
  sourceId?: string;
  sourceUri?: string;
}
