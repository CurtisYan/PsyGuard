import { useState, useRef, useEffect } from 'react'
import { useWalletStore } from '../../store/wallet'
import AccountMenu from './AccountMenu'

interface HeaderProps {
  onSettingsClick: () => void
}

export default function Header({ onSettingsClick }: HeaderProps) {
  const { address, accounts, currentAccountId } = useWalletStore()
  const [selectedNetwork, setSelectedNetwork] = useState('Sepolia')
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const [showNetworkMenu, setShowNetworkMenu] = useState(false)
  const networkMenuRef = useRef<HTMLDivElement>(null)
  
  // 获取当前账户信息
  const currentAccount = accounts.find(acc => acc.id === currentAccountId)

  // 点击外部关闭网络菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (networkMenuRef.current && !networkMenuRef.current.contains(event.target as Node)) {
        setShowNetworkMenu(false)
      }
    }

    if (showNetworkMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showNetworkMenu])

  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        {/* 左侧：账户信息 */}
        <button
          onClick={() => setShowAccountMenu(true)}
          className="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg px-2 py-1 transition-colors"
        >
          {/* 账户图标 */}
          <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
            Ψ
          </div>
          
          {/* 账户名称和地址 */}
          <div className="text-left">
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {currentAccount?.name || 'Psy Account'}
              </span>
              <span className="text-gray-500 dark:text-gray-400">▼</span>
            </div>
            <div 
              className="text-xs font-mono text-gray-500 dark:text-gray-400"
              title={address || ''}
            >
              {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''}
            </div>
          </div>
        </button>
        
        {/* 右侧：网络和设置 */}
        <div className="flex items-center gap-2">
          {/* 网络切换按钮 */}
          <div className="relative" ref={networkMenuRef}>
            <button 
              onClick={() => setShowNetworkMenu(!showNetworkMenu)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              title={selectedNetwork}
            >
              <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </button>
            
            {/* 网络下拉菜单 */}
            {showNetworkMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                <div className="p-2">
                  <button
                    onClick={() => {
                      setSelectedNetwork('Sepolia')
                      setShowNetworkMenu(false)
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${selectedNetwork === 'Sepolia' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span>Sepolia</span>
                      {selectedNetwork === 'Sepolia' && <span>✓</span>}
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedNetwork('Holesky')
                      setShowNetworkMenu(false)
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${selectedNetwork === 'Holesky' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span>Holesky</span>
                      {selectedNetwork === 'Holesky' && <span>✓</span>}
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* 设置按钮 */}
          <button 
            onClick={onSettingsClick}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* 账户菜单弹窗 */}
      {showAccountMenu && (
        <AccountMenu onClose={() => setShowAccountMenu(false)} />
      )}
    </>
  )
}
