// Poll-related interfaces
export interface Poll {
  id: string;
  title: string;
  options: PollOption[];
  status: 'active' | 'ended';
  createdAt: Date;
  createdBy: string; // 作成者ID
  totalVotes: number;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
  percentage: number;
}

export interface Vote {
  id: string;
  pollId: string;
  optionId: string;
  voterId: string;
  timestamp: Date;
}

// Request interfaces
export interface CreatePollRequest {
  title: string;
  options: string[];
}

export interface VoteRequest {
  optionId: string;
  voterId: string;
}

// WebSocket message interface
export interface WebSocketMessage {
  type: 'join-poll' | 'vote' | 'poll-updated' | 'vote-recorded' | 'poll-ended';
  payload: any;
}

// API response types
export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;