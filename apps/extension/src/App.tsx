import { useState, useEffect } from 'react'
import { Shield, Wallet, Activity, Settings as SettingsIcon, Inbox } from 'lucide-react'
import WalletPanel from './components/WalletPanel'
import TransactionPanel from './components/TransactionPanel'
import SecurityPanel from './components/SecurityPanel'
import ParthTransferDemo from './components/ParthTransferDemo'
import { Settings } from './components/Settings'
import { initWalletMode } from './background/walletAdapter'
import { initWasm } from './lib/wasm'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState<'wallet' | 'transaction' | 'security' | 'parth' | 'settings'>('wallet')
  const [wasmReady, setWasmReady] = useState(false)
  const [wasmError, setWasmError] = useState<string | null>(null)

  useEffect(() => {
    initWasm()
      .then(() => {
        console.log('WASM 模块加载成功')
        setWasmReady(true)
      })
      .catch((err) => {
        console.error('WASM 加载失败:', err)
        setWasmError(err.message)
      })
  }, [])

  // 初始化钱包模式（Psy / EVM 兼容）
  useEffect(() => {
    initWalletMode().catch((e) => console.warn('initWalletMode failed', e))
  }, [])

  if (!wasmReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-900 to-purple-900">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 text-blue-400 animate-pulse" />
          <h2 className="text-2xl font-bold text-white mb-2">PsyGuard 初始化中...</h2>
          {wasmError && (
            <p className="text-red-400 mt-4">错误: {wasmError}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900">
      <div className="w-full px-3 py-4">
        {/* Header */}
        <header className="mb-4">
          <div className="flex items-center justify-between bg-white/10 backdrop-blur-lg rounded-xl p-4 shadow-2xl">
            <div className="flex items-center gap-2">
              <Shield className="w-8 h-8 text-blue-400" />
              <div>
                <h1 className="text-xl font-bold text-white">PsyGuard</h1>
                <p className="text-blue-200 text-xs">基于 Psy 协议的多链钱包</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-blue-200">UPS 本地证明</p>
                <p className="text-sm font-semibold text-green-400">● 已连接</p>
              </div>
              <SettingsIcon 
                className="w-6 h-6 text-blue-300 cursor-pointer hover:text-white transition" 
                onClick={() => setActiveTab('settings')}
              />
            </div>
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab('wallet')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap ${
              activeTab === 'wallet'
                ? 'bg-blue-500 text-white shadow-lg'
                : 'bg-white/10 text-blue-200 hover:bg-white/20'
            }`}
          >
            <Wallet className="w-5 h-5" />
            钱包
          </button>
          <button
            onClick={() => setActiveTab('transaction')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap ${
              activeTab === 'transaction'
                ? 'bg-blue-500 text-white shadow-lg'
                : 'bg-white/10 text-blue-200 hover:bg-white/20'
            }`}
          >
            <Activity className="w-4 h-4" />
            交易
          </button>
          <button
            onClick={() => setActiveTab('parth')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap ${
              activeTab === 'parth'
                ? 'bg-blue-500 text-white shadow-lg'
                : 'bg-white/10 text-blue-200 hover:bg-white/20'
            }`}
          >
            <Inbox className="w-4 h-4" />
            PARTH
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap ${
              activeTab === 'security'
                ? 'bg-blue-500 text-white shadow-lg'
                : 'bg-white/10 text-blue-200 hover:bg-white/20'
            }`}
          >
            <Shield className="w-4 h-4" />
            安全
          </button>
        </div>

        {/* Content */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 shadow-2xl">
          {activeTab === 'wallet' && <WalletPanel />}
          {activeTab === 'transaction' && <TransactionPanel />}
          {activeTab === 'parth' && <ParthTransferDemo />}
          {activeTab === 'security' && <SecurityPanel />}
          {activeTab === 'settings' && <Settings />}
        </div>

        {/* Footer */}
        <footer className="mt-4 text-center text-blue-200 text-xs space-y-0.5">
          <p className="font-semibold">Psy 协议钱包</p>
          <p className="text-[10px]">零知识证明 · UPS 本地证明</p>
        </footer>
      </div>
    </div>
  )
}

export default App
