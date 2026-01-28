export interface PhotoEntry {
  uri: string;
  timestamp: number;
  date: string;
  filename: string;
  dateString: string; // YYYY-MM-DD format
  tags?: string[];
  note?: string;
}

export interface PhotoMetadata {
  tags?: string[];
  note?: string;
}
