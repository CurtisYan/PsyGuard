# Psy Wallet - Browser Extension

浏览器扩展钱包，支持 Chrome 和 Firefox。

## 🚀 快速开始

### 安装依赖

```bash
cd apps/extension
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

构建产物在 `dist/` 目录。

## 📦 加载到浏览器

### Chrome

1. 打开 `chrome://extensions/`
2. 开启"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择 `dist/` 目录

### Firefox

1. 打开 `about:debugging#/runtime/this-firefox`
2. 点击"临时加载附加组件"
3. 选择 `dist/manifest.json`

## 🎨 功能特性

- ✅ 账户管理和余额显示
- ✅ UPS 会话流程（开始 → 添加交易 → 提交）
- ✅ SDKey 策略配置
- ✅ 多语言支持（英文/中文）
- ✅ 活动记录展示
- ✅ 设置页面

## 🛠️ 技术栈

- React 18
- TypeScript
- Tailwind CSS
- Vite
- react-i18next
- Zustand

## 📁 项目结构

```
src/
├── popup/              # 主界面
│   ├── components/     # UI 组件
│   ├── pages/          # 页面（会话流程、设置等）
│   ├── App.tsx         # 根组件
│   └── main.tsx        # 入口文件
├── background/         # 后台脚本
├── locales/            # 多语言资源
│   ├── en.json
│   └── zh.json
└── styles/
```

## 🌍 多语言

在设置页面切换语言，或通过代码：

```typescript
import { useTranslation } from 'react-i18next'

const { t, i18n } = useTranslation()
i18n.changeLanguage('zh') // 切换到中文
```

## 🔗 后端集成

后端 API 地址配置在代码中，默认为：
- Realm Sink: `http://localhost:8080`

## 📝 待办事项

- [ ] 连接真实后端 API
- [ ] 实现 WASM 证明集成
- [ ] 添加交易签名功能
- [ ] 完善错误处理
- [ ] 添加单元测试

## 🐛 调试

打开浏览器控制台查看日志：
- 右键扩展图标 → "检查弹出窗口"
- 在扩展管理页面点击"背景页"查看后台日志
