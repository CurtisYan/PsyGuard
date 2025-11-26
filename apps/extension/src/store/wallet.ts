// 钱包状态管理
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Activity {
  id: string
  type: 'session' | 'transfer' | 'receive' | 'send'
  desc: string
  detail: string
  status: 'success' | 'pending' | 'failed'
  timestamp: string
}

export interface ToastMessage {
  message: string
  type: 'success' | 'error' | 'info'
}

export type ThemeMode = 'auto' | 'light' | 'dark'

export interface Account {
  id: string
  name: string
  address: string
  privateKey: string
  balance: string
  createdAt: number
}

interface WalletState {
  // 钱包状态
  isInitialized: boolean
  isLocked: boolean
  
  // 多账户管理
  accounts: Account[]
  currentAccountId: string | null
  
  // 当前账户快捷访问（从 accounts 中派生）
  address: string | null
  privateKey: string | null
  balance: string
  symbol: string
  
  // 活动记录
  activities: Activity[]
  
  // Toast提示
  toast: ToastMessage | null
  
  // 错误状态
  hasError: boolean
  errorMessage: string
  
  // 主题
  theme: ThemeMode
  
  // 操作
  initialize: (address: string, privateKey: string) => void
  addAccount: (name: string, address: string, privateKey: string) => void
  switchAccount: (accountId: string) => void
  renameAccount: (accountId: string, newName: string) => void
  deleteAccount: (accountId: string) => void
  lock: () => void
  unlock: (password: string) => boolean
  reset: () => void
  setBalance: (balance: string, symbol: string) => void
  addActivity: (activity: Omit<Activity, 'id' | 'timestamp'>) => void
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void
  hideToast: () => void
  setError: (message: string) => void
  clearError: () => void
  setTheme: (theme: ThemeMode) => void
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      isInitialized: false,
      isLocked: true,
      accounts: [],
      currentAccountId: null,
      address: null,
      privateKey: null,
      balance: '0',
      symbol: 'USDC',
      activities: [],
      toast: null,
      hasError: false,
      errorMessage: '',
      theme: 'auto',
      
      initialize: (address: string, privateKey: string) => {
        const account: Account = {
          id: Date.now().toString(),
          name: 'Psy Account',
          address,
          privateKey,
          balance: '0',
          createdAt: Date.now(),
        }
        set({
          isInitialized: true,
          isLocked: false,
          accounts: [account],
          currentAccountId: account.id,
          address,
          privateKey,
        })
      },
      
      addAccount: (name: string, address: string, privateKey: string) => {
        set((state) => {
          const newAccount: Account = {
            id: Date.now().toString(),
            name,
            address,
            privateKey,
            balance: '0',
            createdAt: Date.now(),
          }
          return {
            accounts: [...state.accounts, newAccount],
            currentAccountId: newAccount.id,
            address: newAccount.address,
            privateKey: newAccount.privateKey,
            balance: newAccount.balance,
          }
        })
      },
      
      switchAccount: (accountId: string) => {
        set((state) => {
          const account = state.accounts.find(acc => acc.id === accountId)
          if (!account) return state
          return {
            currentAccountId: accountId,
            address: account.address,
            privateKey: account.privateKey,
            balance: account.balance,
          }
        })
      },
      
      renameAccount: (accountId: string, newName: string) => {
        set((state) => ({
          accounts: state.accounts.map(acc =>
            acc.id === accountId ? { ...acc, name: newName } : acc
          ),
        }))
      },
      
      deleteAccount: (accountId: string) => {
        set((state) => {
          const newAccounts = state.accounts.filter(acc => acc.id !== accountId)
          if (newAccounts.length === 0) {
            return {
              accounts: [],
              currentAccountId: null,
              address: null,
              privateKey: null,
              balance: '0',
              isInitialized: false,
            }
          }
          const isCurrent = state.currentAccountId === accountId
          if (isCurrent) {
            const firstAccount = newAccounts[0]
            return {
              accounts: newAccounts,
              currentAccountId: firstAccount.id,
              address: firstAccount.address,
              privateKey: firstAccount.privateKey,
              balance: firstAccount.balance,
            }
          }
          return { accounts: newAccounts }
        })
      },
      
      lock: () => {
        set({ isLocked: true })
      },
      
      unlock: (password: string) => {
        // 简化版：检查密码（实际应该加密存储）
        if (password === 'demo123') {
          set({ isLocked: false })
          return true
        }
        return false
      },
      
      reset: () => {
        set({
          isInitialized: false,
          isLocked: true,
          accounts: [],
          currentAccountId: null,
          address: null,
          privateKey: null,
          balance: '0',
          symbol: 'USDC',
          activities: [],
        })
      },
      
      setBalance: (balance: string, symbol: string) => {
        set({ balance, symbol })
      },
      
      addActivity: (activity) => {
        set((state) => ({
          activities: [
            {
              ...activity,
              id: Date.now().toString(),
              timestamp: new Date().toLocaleString('zh-CN'),
            },
            ...state.activities,
          ],
        }))
      },
      
      showToast: (message, type = 'success') => {
        set({ toast: { message, type } })
      },
      
      hideToast: () => {
        set({ toast: null })
      },
      
      setError: (message) => {
        set({ hasError: true, errorMessage: message })
      },
      
      clearError: () => {
        set({ hasError: false, errorMessage: '' })
      },
      
      setTheme: (theme) => {
        set({ theme })
        // 应用主题到DOM - 延迟确保DOM准备好
        setTimeout(() => applyTheme(theme), 0)
      },
    }),
    {
      name: 'psy-wallet-storage',
      partialize: (state) => ({
        isInitialized: state.isInitialized,
        accounts: state.accounts,
        currentAccountId: state.currentAccountId,
        address: state.address,
        // 注意：privateKey 应该加密存储，这里简化处理
        privateKey: state.privateKey,
        activities: state.activities,
        theme: state.theme,
      }),
      // 迁移旧数据到新的多账户格式
      migrate: (persistedState: any, _version: number) => {
        // 如果旧状态有 address 和 privateKey，但没有 accounts，则迁移
        if (persistedState.address && persistedState.privateKey && !persistedState.accounts) {
          console.log('[Migration] Migrating old wallet format to multi-account format')
          const account: Account = {
            id: Date.now().toString(),
            name: 'Psy Account',
            address: persistedState.address,
            privateKey: persistedState.privateKey,
            balance: '0',
            createdAt: Date.now(),
          }
          return {
            ...persistedState,
            accounts: [account],
            currentAccountId: account.id,
          }
        }
        return persistedState
      },
      version: 1,
    }
  )
)

// 应用主题到DOM
function applyTheme(theme: ThemeMode) {
  const root = document.documentElement
  const body = document.body
  const appRoot = document.getElementById('root')

  const isDark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  console.log('[Theme] Applying theme:', theme, 'isDark:', isDark)
  console.log('[Theme] Elements:', { root: !!root, body: !!body, appRoot: !!appRoot })

  root.classList.toggle('dark', isDark)
  if (body) body.classList.toggle('dark', isDark)
  if (appRoot) appRoot.classList.toggle('dark', isDark)
  
  console.log('[Theme] Applied. documentElement classes:', root.className)
}

// 运行时迁移检查（防止用户已经打开扩展的情况）
if (typeof window !== 'undefined') {
  const state = useWalletStore.getState()
  // 如果有地址和私钥但没有 accounts，立即迁移
  if (state.address && state.privateKey && (!state.accounts || state.accounts.length === 0)) {
    console.log('[Runtime Migration] Detected old wallet format, migrating...')
    const account: Account = {
      id: Date.now().toString(),
      name: 'Psy Account',
      address: state.address,
      privateKey: state.privateKey,
      balance: state.balance || '0',
      createdAt: Date.now(),
    }
    useWalletStore.setState({
      accounts: [account],
      currentAccountId: account.id,
    })
    console.log('[Runtime Migration] Migration complete, accounts:', [account])
  }
}

// 初始化时应用主题
if (typeof window !== 'undefined') {
  // 等待DOM准备好
  const initTheme = () => {
    const store = useWalletStore.getState()
    console.log('[Theme] Initializing theme:', store.theme)
    applyTheme(store.theme)
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTheme)
  } else {
    // DOM已经准备好
    initTheme()
  }
  
  // 监听系统主题变化
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const currentTheme = useWalletStore.getState().theme
    if (currentTheme === 'auto') {
      applyTheme('auto')
    }
  })
  
  // 订阅store变化，当theme改变时自动应用
  let previousTheme: ThemeMode | null = null
  useWalletStore.subscribe((state) => {
    if (state.theme !== previousTheme) {
      console.log('[Theme] Store theme changed:', previousTheme, '->', state.theme)
      previousTheme = state.theme
      applyTheme(state.theme)
    }
  })
}
