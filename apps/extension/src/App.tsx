import { useState, useEffect } from 'react'
import { Shield, Wallet, Activity, Settings } from 'lucide-react'
import WalletPanel from './components/WalletPanel'
import TransactionPanel from './components/TransactionPanel'
import SecurityPanel from './components/SecurityPanel'
import { initWasm } from './lib/wasm'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState<'wallet' | 'transaction' | 'security'>('wallet')
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
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <Shield className="w-10 h-10 text-blue-400" />
              <div>
                <h1 className="text-3xl font-bold text-white">PsyGuard</h1>
                <p className="text-blue-200 text-sm">Psy 协议钱包插件</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-blue-200">UPS 本地证明</p>
                <p className="text-sm font-semibold text-green-400">● 已连接</p>
              </div>
              <Settings className="w-6 h-6 text-blue-300 cursor-pointer hover:text-white transition" />
            </div>
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('wallet')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition ${
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
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition ${
              activeTab === 'transaction'
                ? 'bg-blue-500 text-white shadow-lg'
                : 'bg-white/10 text-blue-200 hover:bg-white/20'
            }`}
          >
            <Activity className="w-5 h-5" />
            交易
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition ${
              activeTab === 'security'
                ? 'bg-blue-500 text-white shadow-lg'
                : 'bg-white/10 text-blue-200 hover:bg-white/20'
            }`}
          >
            <Shield className="w-5 h-5" />
            安全策略
          </button>
        </div>

        {/* Content */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl">
          {activeTab === 'wallet' && <WalletPanel />}
          {activeTab === 'transaction' && <TransactionPanel />}
          {activeTab === 'security' && <SecurityPanel />}
        </div>

        {/* Footer */}
        <footer className="mt-8 text-center text-blue-200 text-sm">
          <p>基于 Psy 协议 | UPS 本地证明 + End Cap 提交 + GUTA 聚合</p>
        </footer>
      </div>
    </div>
  )
}

export default App
