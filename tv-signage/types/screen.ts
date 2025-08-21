export interface Screen {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  lastSeen: number;
  currentContent?: string;
  isRepeating?: boolean;
  muted?: boolean;
}

export interface ScreenStatus {
  id: string;
  isConnected: boolean;
  lastSeen: number;
  currentContent?: string;
}
