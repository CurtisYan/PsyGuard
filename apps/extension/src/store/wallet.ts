// 钱包状态管理
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { encryptPrivateKey, decryptPrivateKey, hashPassword, verifyPassword } from '../utils/crypto'

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
  encryptedPrivateKey: string  // 加密后的私钥
  balance: string
  createdAt: number
}

interface WalletState {
  // 钱包状态
  isInitialized: boolean
  isLocked: boolean
  passwordHash: string | null  // 密码哈希
  
  // 多账户管理
  accounts: Account[]
  currentAccountId: string | null
  
  // 当前账户快捷访问（从 accounts 中派生，运行时解密）
  address: string | null
  privateKey: string | null  // 解密后的私钥，仅在内存中
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
  initialize: (address: string, privateKey: string, password: string) => Promise<void>
  addAccount: (name: string, address: string, privateKey: string, password: string) => Promise<void>
  switchAccount: (accountId: string) => Promise<void>
  renameAccount: (accountId: string, newName: string) => void
  deleteAccount: (accountId: string) => void
  lock: () => void
  unlock: (password: string) => Promise<boolean>
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
    (set, get) => ({
      isInitialized: false,
      isLocked: true,
      passwordHash: null,
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
      
      initialize: async (address: string, privateKey: string, password: string) => {
        try {
          // 加密私钥
          const encryptedPrivateKey = await encryptPrivateKey(privateKey, password)
          const passHash = await hashPassword(password)
          
          const account: Account = {
            id: Date.now().toString(),
            name: 'Psy Account',
            address,
            encryptedPrivateKey,
            balance: '0',
            createdAt: Date.now(),
          }
          
          set({
            isInitialized: true,
            isLocked: false,
            passwordHash: passHash,
            accounts: [account],
            currentAccountId: account.id,
            address,
            privateKey,  // 解密后的私钥保存在内存中
          })
        } catch (error) {
          console.error('Failed to initialize wallet:', error)
          throw error
        }
      },
      
      addAccount: async (name: string, address: string, privateKey: string, password: string) => {
        try {
          const state = get()
          if (!state.passwordHash) throw new Error('No password set')
          
          // 验证密码
          const isValid = await verifyPassword(password, state.passwordHash)
          if (!isValid) throw new Error('Invalid password')
          
          // 使用用户密码加密新账户的私钥
          const encryptedPrivateKey = await encryptPrivateKey(privateKey, password)
          
          const newAccount: Account = {
            id: Date.now().toString(),
            name,
            address,
            encryptedPrivateKey,
            balance: '0',
            createdAt: Date.now(),
          }
          
          set((state) => ({
            accounts: [...state.accounts, newAccount],
            currentAccountId: newAccount.id,
            address: newAccount.address,
            privateKey: privateKey,  // 内存中保存明文
            balance: newAccount.balance,
          }))
        } catch (error) {
          console.error('Failed to add account:', error)
          throw error
        }
      },
      
      switchAccount: async (accountId: string) => {
        // 切换账户时需要解密私钥
        // 简化版：假设已解锁，稍后完善
        set((state) => {
          const account = state.accounts.find(acc => acc.id === accountId)
          if (!account) return state
          
          // TODO: 需要密码来解密私钥
          return {
            currentAccountId: accountId,
            address: account.address,
            privateKey: null,  // 需要解密
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
              privateKey: null,  // 需要重新解密
              balance: firstAccount.balance,
            }
          }
          return { accounts: newAccounts }
        })
      },
      
      lock: () => {
        // 锁定时清除内存中的私钥
        set({ 
          isLocked: true,
          privateKey: null
        })
      },
      
      unlock: async (password: string) => {
        const state = get()
        if (!state.passwordHash) {
          // 没有设置密码（旧数据），允许解锁
          set({ isLocked: false })
          return true
        }
        
        try {
          // 验证密码
          const isValid = await verifyPassword(password, state.passwordHash)
          if (!isValid) return false
          
          // 解密当前账户的私钥
          const currentAccount = state.accounts.find(acc => acc.id === state.currentAccountId)
          if (currentAccount) {
            const decryptedKey = await decryptPrivateKey(currentAccount.encryptedPrivateKey, password)
            set({ 
              isLocked: false,
              privateKey: decryptedKey
            })
          } else {
            set({ isLocked: false })
          }
          
          return true
        } catch (error) {
          console.error('Failed to unlock:', error)
          return false
        }
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
      
      addActivity: (activity: Omit<Activity, 'id' | 'timestamp'>) =>
      set((state) => {
        // 从 localStorage 读取当前语言设置
        const currentLang = localStorage.getItem('psy-language') || 'en'
        const locale = currentLang === 'zh' ? 'zh-CN' : 'en-US'
        
        return {
          activities: [
            {
              ...activity,
              id: Date.now().toString(),
              timestamp: new Date().toLocaleString(locale),
            },
            ...state.activities,
          ],
        }
      }),
      
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
        passwordHash: state.passwordHash,
        accounts: state.accounts,  // 包含加密后的私钥
        currentAccountId: state.currentAccountId,
        address: state.address,
        // 不持久化明文私钥
        activities: state.activities,
        theme: state.theme,
      }),
      // 迁移旧数据到新的多账户格式
      migrate: (persistedState: any, _version: number) => {
        // 旧数据没有加密，清除它们，让用户重新初始化
        if (persistedState.address && persistedState.privateKey && !persistedState.passwordHash) {
          return {
            isInitialized: false,
            isLocked: true,
            passwordHash: null,
            accounts: [],
            currentAccountId: null,
            address: null,
            activities: persistedState.activities || [],
            theme: persistedState.theme || 'auto',
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

  root.classList.toggle('dark', isDark)
  if (body) body.classList.toggle('dark', isDark)
  if (appRoot) appRoot.classList.toggle('dark', isDark)
}

// 运行时迁移检查（防止用户已经打开扩展的情况）
if (typeof window !== 'undefined') {
  const state = useWalletStore.getState()
  // 如果有旧数据且没有密码哈希，清除它
  if (state.address && state.privateKey && !state.passwordHash) {
    useWalletStore.setState({
      isInitialized: false,
      isLocked: true,
      passwordHash: null,
      accounts: [],
      currentAccountId: null,
      address: null,
      privateKey: null,
      balance: '0',
    })
  }
}

// 初始化时应用主题
if (typeof window !== 'undefined') {
  // 等待DOM准备好
  const initTheme = () => {
    const store = useWalletStore.getState()
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
      previousTheme = state.theme
      applyTheme(state.theme)
    }
  })
}
