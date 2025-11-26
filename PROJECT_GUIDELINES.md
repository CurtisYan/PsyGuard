# PsyGuard 项目规范

## 1. SVG 图标

**禁止使用 Emoji 和 Unicode 符号**

```tsx
// ❌ 错误
<button>🆕 创建账户</button>

// ✅ 正确
<button className="flex items-center gap-2">
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
  {t('account.create_account')}
</button>
```

**图标来源**: [Heroicons](https://heroicons.com/)

---

## 2. TypeScript

**必须使用类型，禁止 any**

```typescript
// ✅ 正确
interface Props {
  onClose: () => void
  data: UserData
}

// ❌ 错误
const fn = (data: any) => { }
```

---

## 3. 错误处理

**所有用户输入必须验证**

```typescript
// ✅ 正确
try {
  const wallet = new ethers.Wallet(key.trim())
  addAccount(wallet.address, wallet.privateKey)
} catch (err) {
  setError(t('account.invalid_private_key'))
}
```

---

## 4. 多语言

**禁止硬编码文本，必须使用 i18n**

```tsx
// ❌ 错误
<button>导入账户</button>
<h3>添加账户</h3>
<p>选择您想要的方式：</p>

// ✅ 正确
<button>{t('account.import_account')}</button>
<h3>{t('account.add_account')}</h3>
<label>{t('account.private_key')}</label>
```

**翻译文件**: `src/locales/zh.json`, `src/locales/en.json`

---

**更新**: 2025-11-26
