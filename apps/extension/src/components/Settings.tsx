/**
 * Settings - 设置页面
 */

import { useState, useEffect } from 'react'
import { Settings as SettingsIcon, Shield, Globe, Info, Key, Download } from 'lucide-react'
import { setWalletMode, getWalletMode, type WalletMode } from '../background/walletAdapter'
import { exportMnemonic, exportPrivateKey } from '../wallet/keyImport'
import { clearPriceCache } from '../services/priceService'

export function Settings() {
  const [currentMode, setCurrentMode] = useState<WalletMode>('psy')
  const [showMnemonic, setShowMnemonic] = useState(false)
  const [showPrivateKey, setShowPrivateKey] = useState(false)
  const [password, setPassword] = useState('')
  const [exportedMnemonic, setExportedMnemonic] = useState('')
  const [exportedPrivateKey, setExportedPrivateKey] = useState('')
  const [error, setError] = useState('')
  const [demoMode, setDemoMode] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    const mode = await getWalletMode()
    setCurrentMode(mode)
    try {
      const r = await chrome.storage.local.get('demo_mode')
      if (typeof r.demo_mode === 'boolean') {
        setDemoMode(r.demo_mode)
      } else {
        setDemoMode(import.meta.env.VITE_DEMO_MODE === 'true' || import.meta.env.MODE === 'development')
      }
    } catch (_) {
      setDemoMode(import.meta.env.VITE_DEMO_MODE === 'true' || import.meta.env.MODE === 'development')
    }
  }

  const handleModeChange = async (mode: WalletMode) => {
    setWalletMode(mode)
    setCurrentMode(mode)
  }

  const handleDemoToggle = async (value: boolean) => {
    setDemoMode(value)
    try {
      await chrome.storage.local.set({ demo_mode: value })
    } catch (_) {
      // ignore
    }
  }

  const handleExportMnemonic = async () => {
    if (!password) {
      setError('请输入密码')
      return
    }

    const mnemonic = await exportMnemonic(password)
    if (mnemonic) {
      setExportedMnemonic(mnemonic)
      setShowMnemonic(true)
      setError('')
    } else {
      setError('密码错误或助记词不存在')
    }
    setPassword('')
  }

  const handleExportPrivateKey = async () => {
    if (!password) {
      setError('请输入密码')
      return
    }

    const privateKey = await exportPrivateKey(password)
    if (privateKey) {
      setExportedPrivateKey(privateKey)
      setShowPrivateKey(true)
      setError('')
    } else {
      setError('密码错误或私钥不存在')
    }
    setPassword('')
  }

  const handleClearCache = () => {
    clearPriceCache()
    alert('价格缓存已清除')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <SettingsIcon className="w-5 h-5 text-white" />
        <h1 className="text-xl font-bold text-white">设置</h1>
      </div>

      {/* 钱包模式 */}
      <section className="mb-6 bg-white/5 border border-white/10 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-blue-300" />
          <h2 className="text-base font-semibold text-white">钱包模式</h2>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-3 p-3 border border-white/20 rounded-lg cursor-pointer hover:bg-white/5 text-white">
            <input
              type="radio"
              name="mode"
              value="psy"
              checked={currentMode === 'psy'}
              onChange={() => handleModeChange('psy')}
              className="w-4 h-4"
            />
            <div>
              <div className="font-medium text-sm">Psy 模式（推荐）</div>
              <div className="text-xs text-blue-200">
                使用本地证明和 GUTA 同步，更安全
              </div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 border border-white/20 rounded-lg cursor-pointer hover:bg-white/5 text-white">
            <input
              type="radio"
              name="mode"
              value="evm_compat"
              checked={currentMode === 'evm_compat'}
              onChange={() => handleModeChange('evm_compat')}
              className="w-4 h-4"
            />
            <div>
              <div className="font-medium text-sm">EVM 兼容模式</div>
              <div className="text-xs text-blue-200">
                传统签名模式（需要授权）
              </div>
            </div>
          </label>
        </div>
      </section>

      {/* Demo 模式 */}
      <section className="mb-6 bg-white/5 border border-white/10 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-4 h-4 text-blue-300" />
          <h2 className="text-base font-semibold text-white">Demo 模式</h2>
        </div>
        <label className="flex items-center justify-between p-3 border border-white/20 rounded-lg text-white">
          <div>
            <div className="font-medium text-sm">启用 Demo（使用本地 Mock 与聚合器模拟）</div>
            <div className="text-xs text-blue-200">关闭后将使用真实 Aggregator API（需配置）</div>
          </div>
          <input
            type="checkbox"
            checked={demoMode}
            onChange={(e) => handleDemoToggle(e.target.checked)}
            className="w-4 h-4"
          />
        </label>
      </section>

      {/* 导出密钥 */}
      <section className="mb-6 bg-white/5 border border-white/10 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Key className="w-4 h-4 text-blue-300" />
          <h2 className="text-base font-semibold text-white">导出密钥</h2>
        </div>

        <div className="space-y-4">
          <div>
            <input
              type="password"
              placeholder="输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white/10 border border-white/20 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-blue-200/50"
            />
          </div>

          {error && (
            <div className="text-red-400 text-xs">{error}</div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleExportMnemonic}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              <Download className="w-3 h-3" />
              助记词
            </button>
            <button
              onClick={handleExportPrivateKey}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs bg-purple-500 text-white rounded-lg hover:bg-purple-600"
            >
              <Download className="w-3 h-3" />
              私钥
            </button>
          </div>

          {showMnemonic && exportedMnemonic && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <div className="font-semibold mb-2 text-yellow-300 text-xs">⚠️ 助记词（请妥善保管）</div>
              <div className="font-mono text-xs break-all select-all bg-black/30 p-2 rounded border border-white/10 text-white">
                {exportedMnemonic}
              </div>
              <button
                onClick={() => setShowMnemonic(false)}
                className="mt-2 text-xs text-blue-400 hover:underline"
              >
                隐藏
              </button>
            </div>
          )}

          {showPrivateKey && exportedPrivateKey && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div className="font-semibold mb-2 text-red-300 text-xs">⚠️ 私钥（切勿分享）</div>
              <div className="font-mono text-xs break-all select-all bg-black/30 p-2 rounded border border-white/10 text-white">
                {exportedPrivateKey}
              </div>
              <button
                onClick={() => setShowPrivateKey(false)}
                className="mt-2 text-xs text-blue-400 hover:underline"
              >
                隐藏
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 网络设置 */}
      <section className="mb-6 bg-white/5 border border-white/10 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Globe className="w-4 h-4 text-blue-300" />
          <h2 className="text-base font-semibold text-white">网络设置</h2>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-blue-200 text-sm">当前网络</span>
            <span className="font-medium text-white text-sm">Psy Testnet</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-blue-200 text-sm">Aggregator URL</span>
            <span className="text-xs text-blue-300">localhost:3000</span>
          </div>
          <button
            onClick={handleClearCache}
            className="w-full px-3 py-2 text-sm border border-white/20 text-white rounded-lg hover:bg-white/5"
          >
            清除价格缓存
          </button>
        </div>
      </section>

      {/* 关于 */}
      <section className="mb-4 bg-white/5 border border-white/10 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-4 h-4 text-blue-300" />
          <h2 className="text-base font-semibold text-white">关于</h2>
        </div>

        <div className="space-y-2 text-sm text-blue-200">
          <div className="flex justify-between">
            <span>版本</span>
            <span className="font-medium text-white">v0.2.0-psy</span>
          </div>
          <div className="flex justify-between">
            <span>协议</span>
            <span className="font-medium text-white">Psy Protocol</span>
          </div>
          <div className="flex justify-between">
            <span>模式</span>
            <span className="font-medium text-white">Demo Mode</span>
          </div>
          <div className="mt-3 pt-3 border-t border-white/10">
            <p className="text-xs text-blue-300">
              PsyGuard 是基于 Psy 协议的多链钱包，使用零知识证明技术保护您的隐私和安全。
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
