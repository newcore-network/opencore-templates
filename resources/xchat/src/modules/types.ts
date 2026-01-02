export interface ChatMessage {
  author: string;
  message: string;
  color: { r: number; g: number; b: number };
  timestamp: number;
  type?: "chat" | "system" | "error" | "warning";
  trusted?: boolean; // If true, allow color codes from server
}
