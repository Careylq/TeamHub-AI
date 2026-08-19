// 共享类型定义

/** OpenAI 兼容消息 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  name?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

/** 工具调用（LLM 输出的结构化指令，应用层执行） */
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON 字符串
  };
}

/** 工具定义（OpenAI 兼容格式） */
export interface ToolDef {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

/** UI 层的对话条目 */
export interface UiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** 工具调用展示（正在调用/已执行） */
  toolCalls?: {
    name: string;
    args: Record<string, unknown>;
    status: 'running' | 'done';
    result?: string;
  }[];
  error?: boolean;
}
