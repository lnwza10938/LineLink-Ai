export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; toolUseId: string; content: string; isError?: boolean };

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: ContentBlock[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export type StopReason = 'end_turn' | 'tool_use' | 'max_tokens' | 'other';

export interface LlmResponse {
  message: ChatMessage;
  stopReason: StopReason;
}

export interface LlmProvider {
  readonly name: string;
  chat(params: {
    system: string;
    messages: ChatMessage[];
    tools: ToolDefinition[];
  }): Promise<LlmResponse>;
}

export interface ToolContext {
  lineUserId: string;
  sourceType: 'user' | 'group' | 'room';
}

export interface ToolResult {
  content: string;
  isError?: boolean;
}
