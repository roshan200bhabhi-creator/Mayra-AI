
export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'mayra';
  isFinal: boolean;
  groundingChunks?: GroundingChunk[];
}

export enum AssistantMode {
  DEFAULT = 'DEFAULT',
  LAWYER = 'LAWYER',
  TEACHER = 'TEACHER',
  INTERVIEW_COACH = 'INTERVIEW_COACH',
  MOTIVATIONAL_COACH = 'MOTIVATIONAL_COACH',
  LIFE_ASSISTANT = 'LIFE_ASSISTANT',
}