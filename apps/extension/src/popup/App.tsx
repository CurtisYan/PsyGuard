import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useWalletStore } from '../store/wallet'
import { apiClient } from '../api/client'
import Header from './components/Header'
import BalanceCard from './components/BalanceCard'
import QuickActions from './components/QuickActions'
import ActivityFeed from './components/ActivityFeed'
import TokenPrice from './components/TokenPrice'
import Toast from './components/Toast'
import ErrorRetry from './components/ErrorRetry'
import SessionPage from './pages/SessionPage'
import Settings from './pages/Settings'
import Onboarding from './pages/Onboarding'
import ActivityHistory from './pages/ActivityHistory'
import SendToken from './pages/SendToken'
import ReceiveToken from './pages/ReceiveToken'

function App() {
  const { t } = useTranslation()
  const { isInitialized, address, balance, symbol, setBalance, toast, hideToast, hasError, errorMessage, clearError, showToast } = useWalletStore()
  const [currentView, setCurrentView] = useState<'home' | 'session' | 'settings' | 'activity' | 'send' | 'receive'>('home')

  // 加载余额
  useEffect(() => {
    if (isInitialized && address) {
      loadBalance()
    }
  }, [isInitialized, address])

  const loadBalance = async () => {
    if (!address) return
    
    try {
      clearError()
      const result = await apiClient.getBalance({
        address,
        // USDC on Sepolia: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
        token_address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
      })
      setBalance(result.balance, result.symbol)
    } catch (error) {
      console.error('Failed to load balance:', error)
      // API失败时设置错误状态，不使用模拟数据
      useWalletStore.getState().setError('无法加载余额，请检查后端是否运行')
    }
  }

  const handleCopyAddress = async () => {
    if (!address) return
    
    try {
      await navigator.clipboard.writeText(address)
      showToast(t('toast.copy_success'), 'success')
    } catch (error) {
      console.error('Failed to copy:', error)
      showToast(t('toast.copy_failed'), 'error')
    }
  }

  // 如果未初始化，显示引导页
  if (!isInitialized) {
    return <Onboarding onComplete={() => window.location.reload()} />
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Toast提示 */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={hideToast}
        />
      )}
      
      {/* 错误重试页面 */}
      {hasError && currentView === 'home' ? (
        <ErrorRetry 
          message={errorMessage}
          onRetry={() => {
            clearError()
            loadBalance()
          }}
        />
      ) : (
        <>
          {currentView === 'home' && (
            <>
              <Header onSettingsClick={() => setCurrentView('settings')} />
              
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
                {/* 地址栏 */}
                <div className="flex items-center justify-center">
                  <div className="relative group">
                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-lg">
                      <span className="text-sm text-gray-900 dark:text-gray-100 font-mono cursor-pointer">
                        {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''}
                      </span>
                      <button 
                        onClick={handleCopyAddress}
                        className="hover:bg-gray-200 dark:hover:bg-gray-700 p-1 rounded transition-colors"
                        title={t('common.copy')}
                      >
                        <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                    {/* 悬浮提示框 */}
                    {address && (
                      <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs font-mono rounded-lg shadow-xl border border-gray-200 dark:border-gray-600 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-[100]">
                        {address}
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-white dark:border-b-gray-700"></div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 余额卡片 */}
                <BalanceCard 
                  balance={balance}
                  symbol={symbol}
                  usdValue={balance}
                />

                {/* 快速操作 */}
                <QuickActions 
                  onSendClick={() => setCurrentView('send')}
                  onReceiveClick={() => setCurrentView('receive')}
                  onSessionClick={() => setCurrentView('session')}
                />

                {/* 活动记录 */}
                <ActivityFeed 
                  onViewMore={() => setCurrentView('activity')}
                />
                
                {/* 币价 */}
                <TokenPrice />
              </div>
            </>
          )}
        </>
      )}

      {currentView === 'session' && (
        <SessionPage onBack={() => setCurrentView('home')} />
      )}

      {currentView === 'settings' && (
        <Settings onBack={() => setCurrentView('home')} />
      )}
      
      {currentView === 'activity' && (
        <ActivityHistory onBack={() => setCurrentView('home')} />
      )}
      
      {currentView === 'send' && (
        <SendToken onBack={() => setCurrentView('home')} />
      )}
      
      {currentView === 'receive' && (
        <ReceiveToken onBack={() => setCurrentView('home')} />
      )}
    </div>
  )
}

export default App
