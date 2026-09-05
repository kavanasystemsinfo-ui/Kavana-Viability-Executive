export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: string[];
  chips?: {
    label: string;
    promotionId: string;
    route: string;
  }[];
}
