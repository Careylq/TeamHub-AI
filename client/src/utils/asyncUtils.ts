// ★ 手写防抖 / 节流工具（零依赖）
// 面试考点: 防抖(debounce) vs 节流(throttle) 的区别、闭包原理、场景选择

/**
 * ★ 防抖 (debounce): 连续触发时, 只在"最后一次触发后等待 delay 毫秒"执行一次
 * - 场景: 输入搜索、按钮防连点（本项目的"发送防抖"）
 * - 原理: 闭包保存 timer, 每次调用清除上一个 timer 并重新计时
 * - 类比: 电梯门 —— 有人进来就重置关门倒计时, 直到没人进才关门
 */
export function debounce<T extends (...args: never[]) => void>(
  fn: T,
  delay = 300,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, delay);
  };
}

/**
 * ★ rAF 节流 (throttle): 把高频回调合并到"下一帧"只执行一次
 * - 场景: AI 流式输出的高频 setState（本项目的"流式渲染节流"）
 * - 原理: requestAnimationFrame 每帧(约16.7ms)最多执行一次, 帧内多次调用只合并为一次
 * - 为什么用 rAF 不用时间戳: rAF 与浏览器渲染节奏同步, 不会白算不渲染的帧 (面经 105)
 */
export function throttleRaf<T extends (...args: never[]) => void>(
  fn: T,
): (...args: Parameters<T>) => void {
  let rafId: number | null = null;
  let lastArgs: Parameters<T> | null = null;
  return (...args: Parameters<T>) => {
    lastArgs = args;
    if (rafId !== null) return; // 本帧已安排, 只更新最新参数, 不重复调度
    rafId = requestAnimationFrame(() => {
      rafId = null;
      if (lastArgs) fn(...lastArgs);
      lastArgs = null;
    });
  };
}
