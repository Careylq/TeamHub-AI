// ★ RAG 知识检索模块（手写，零依赖）
// 流程: 分块 → 向量化 → 存储 → 检索 Top-K → 注入 Prompt
// 向量化用本地字符 bigram 哈希（demo 可复现），生产可换 bge-m3，接口不变

const fs = require('node:fs');
const path = require('node:path');

const KB_DIR = path.join(__dirname, 'data', 'knowledge');
const CHUNK_SIZE = 500; // 每块字符数
const CHUNK_OVERLAP = 50; // ★ 重叠切片：防止语义被切断

/**
 * 文本分块：按 size 切分，相邻块重叠 overlap 字符
 * - 太长 → 信息混杂，检索不精准
 * - 太短 → 丢失上下文，回答碎片化
 * - 重叠 → 防止一句话被从中间切断导致语义丢失
 */
function chunkText(text, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const chunks = [];
  for (let i = 0; i < text.length; i += size - overlap) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks.filter((c) => c.trim().length > 0);
}

/**
 * ★ 本地字符 bigram 哈希向量（零依赖、可复现）
 * - 对文本每对相邻字符 (bigram) 做哈希，映射到 512 维向量
 * - 相同关键词 → 相同 bigram → 向量相似 → 余弦相似度高
 * - demo 用；生产换 bge-m3 embedding 模型，只需替换此函数
 */
function embedLocal(text) {
  const dim = 512;
  const vec = new Array(dim).fill(0);
  for (let i = 0; i < text.length - 1; i++) {
    const g = text.slice(i, i + 2);
    let h = 0;
    for (const ch of g) h = (h * 31 + ch.codePointAt(0)) >>> 0;
    vec[h % dim] += 1;
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

/** 余弦相似度（向量已归一化 → 点积即相似度） */
function cosine(a, b) {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

/**
 * 构建 RAG 索引（启动时执行一次）
 * - 读取 data/knowledge/*.md → 分块 → 向量化 → 存入内存
 * - search(query, k): 查询向量与所有块做余弦相似度，返回 Top-K
 */
function buildRag() {
  const entries = [];
  for (const file of fs.readdirSync(KB_DIR).filter((f) => f.endsWith('.md'))) {
    const text = fs.readFileSync(path.join(KB_DIR, file), 'utf8');
    for (const chunk of chunkText(text)) {
      entries.push({ file, text: chunk, vec: embedLocal(chunk) });
    }
  }
  console.log(`✅ RAG 知识库加载: ${entries.length} 个分块`);

  return {
    search(query, k = 3) {
      const qv = embedLocal(query);
      return entries
        .map((e) => ({ ...e, score: cosine(qv, e.vec) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, k)
        .map((e) => `[${e.file}] ${e.text}`);
    },
    count: () => entries.length,
  };
}

module.exports = { buildRag, chunkText, embedLocal, cosine };
