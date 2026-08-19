# TeamHub — 团队协作效能中台

TeamHub 是一个基于 React + Ant Design 的团队协作效能中台，覆盖 13 个核心业务页面，独立完成 5 项工程化改造，侧重权限体系、虚拟滚动、组件封装三大模块。关键指标均经浏览器实测验证。

## RBAC 权限体系（3 角色 × 10 权限）

从单一 canAdmin 布尔值升级为 3 角色（Admin / Lead / Member）× 10 语义化权限函数的策略模式。

- 角色: admin（管理员）、lead（Team Lead）、member（普通成员）
- 权限函数: canViewAdminPanel、canViewFullDashboard、canViewPersonalDashboard、canManageTeam、canCreate、canEdit、canDelete、canApprove、canExport、canUseChatbot
- 实现: 路由级菜单差异化（实测 Admin/Lead/Member 各 13/11/6 项菜单）+ 自研 AccessControl 按钮级权限组件
- 设计: 策略模式——权限函数由角色判断组合而成，不直接硬编码角色字符串
- 演示: Admin 页面可一键切换角色，菜单按钮实时变化
- 链路: routes.ts 声明 access 字段 → access.ts 计算权限 → Umi access 插件匹配 → ProLayout 过滤菜单

## 长列表虚拟滚动（react-window）

基于 react-window 封装 VirtualTable 通用组件，只渲染可视区约 15 行 DOM。

- 实测 10,000 行数据滚动帧率从普通全量渲染的 ~2 FPS 提升到 ~36-56 FPS
- DOM 节点减少 99%（10000 → ~15）
- 固定 48px 行高（O(1) 定位）、overscan=5 缓冲区防白屏
- RowRenderer memo 化 + rowProps useMemo 稳定引用，减少滚动时重复渲染
- 配套 FPS 实时监控与性能对比演示页

## 构建体积优化（bigVendors 分包）

配置 codeSplitting bigVendors 分包策略，大型依赖独立 chunk。

- 实测 JS 总包 5.44MB（77 个 chunk）
- 业务代码 1.75MB 与第三方依赖 3.68MB 物理分离
- 最大 chunk 1.32MB（含 @ant-design/plots）
- 自研 Bundle 分析脚本（analyze-bundle.js）量化产物分布
- 配合 content hash 实现浏览器长期缓存

## 渲染性能优化（React.memo）

5 个图表组件接入 React.memo，切换 Dashboard Tab 时未变化图表跳过重渲染（渲染计数实测验证）。封装零依赖 Web Vitals 监控（LCP/FCP/CLS）输出评分。

## 通用组件与 Hooks 封装

TypeScript 泛型封装 3 个 Hooks + 2 个通用组件：useAsyncData（四态管理+防竞态，复用 2 个详情页）、useFormModal（弹窗状态机）、usePermission（权限判断）、ResultCard（四态展示）、PageTemplate（标准页面壳）。新页面可开箱即用，减少大量 loading/error 样板代码。

## 技术栈

React + TypeScript（strict）+ Ant Design + Umi Max + TanStack React Query + Tailwind CSS + react-window + @ant-design/plots（图表）
