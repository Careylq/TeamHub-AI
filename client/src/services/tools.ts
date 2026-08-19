// ★ 工具定义 + 执行（核心能力 3: Function Calling 的应用层）
// 原理: LLM 只输出结构化的工具调用参数（不执行）, 应用层执行后把结果回填给 LLM, 再生成最终回答
// 这就是 Agent 闭环: 用户问题 → LLM 判断要调工具 → 应用执行 → 结果回填 → LLM 组织回答

import type { ToolDef } from '../types';

/** 两个可调用的工具定义（OpenAI 兼容格式, 发给 LLM） */
export const tools: ToolDef[] = [
  {
    type: 'function',
    function: {
      name: 'search_knowledge',
      description: '检索本地知识库，回答关于 TeamHub 项目、前端面试考点、个人介绍的问题',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '检索关键词或问题' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_current_time',
      description: '获取当前时间',
      parameters: { type: 'object', properties: {} },
    },
  },
];

/**
 * 执行工具调用（应用层真正干活的地方）
 * @param name 工具名
 * @param args 工具参数（已解析的 JSON）
 * @returns 工具执行结果字符串, 回填给 LLM
 */
export async function executeTool(
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  if (name === 'search_knowledge') {
    const res = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: String(args.query ?? '') }),
    });
    const data = await res.json();
    return JSON.stringify(data.results ?? []);
  }
  if (name === 'get_current_time') {
    return new Date().toLocaleString('zh-CN');
  }
  return `未知工具: ${name}`;
}
