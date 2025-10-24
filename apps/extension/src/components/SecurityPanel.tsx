import { useState } from 'react'
import { Shield, Lock, Clock, CheckCircle2 } from 'lucide-react'

export default function SecurityPanel() {
  const [dailyLimit, setDailyLimit] = useState('10000')
  const [trustedContracts, setTrustedContracts] = useState('token_contract, nft_contract')
  const [timeLock, setTimeLock] = useState('')
  const [require2FA, setRequire2FA] = useState(false)

  const savePolicy = () => {
    const policy = {
      daily_limit: dailyLimit ? parseInt(dailyLimit) : null,
      trusted_contracts: trustedContracts ? trustedContracts.split(',').map(s => s.trim()) : null,
      time_lock_until: timeLock ? new Date(timeLock).getTime() / 1000 : null,
      require_2fa: require2FA,
    }
    console.log('保存策略:', policy)
    alert('SDKey 策略已保存!')
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white flex items-center gap-2">
        <Shield className="w-6 h-6" />
        SDKey 安全策略
      </h2>

      <div className="bg-blue-500/20 border border-blue-500 rounded-lg p-4">
        <p className="text-blue-200 text-sm">
          <strong className="text-blue-100">SDKey (可编程钥)</strong> 是 Psy 的核心安全特性。
          您的"公钥"是签名电路验证器数据哈希，签名本身是 ZK 证明，可编程限额、白名单、时间锁等策略。
        </p>
      </div>

      <div className="space-y-4">
        {/* 日限额 */}
        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Lock className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold">日限额</h3>
              <p className="text-blue-200 text-sm">设置每日最大交易金额</p>
            </div>
          </div>
          <input
            type="number"
            value={dailyLimit}
            onChange={(e) => setDailyLimit(e.target.value)}
            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400"
            placeholder="输入日限额 (PSY)"
          />
        </div>

        {/* 合约白名单 */}
        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold">受信合约白名单</h3>
              <p className="text-blue-200 text-sm">只允许与这些合约交互</p>
            </div>
          </div>
          <input
            type="text"
            value={trustedContracts}
            onChange={(e) => setTrustedContracts(e.target.value)}
            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400"
            placeholder="合约 ID, 用逗号分隔"
          />
        </div>

        {/* 时间锁 */}
        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold">时间锁</h3>
              <p className="text-blue-200 text-sm">在指定时间前禁止交易</p>
            </div>
          </div>
          <input
            type="datetime-local"
            value={timeLock}
            onChange={(e) => setTimeLock(e.target.value)}
            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400"
          />
        </div>

        {/* 2FA */}
        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold">双因素认证 (2FA)</h3>
                <p className="text-blue-200 text-sm">要求额外验证步骤</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={require2FA}
                onChange={(e) => setRequire2FA(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
            </label>
          </div>
        </div>
      </div>

      <button
        onClick={savePolicy}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition"
      >
        <Shield className="w-5 h-5" />
        保存安全策略
      </button>

      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
        <h3 className="text-white font-semibold mb-2">CFT 指纹白名单</h3>
        <p className="text-blue-200 text-sm mb-3">
          每个合约函数都有唯一的指纹 (verifier data hash)，只有在 CFT (Contract Function Tree) 中的函数才能被调用。
        </p>
        <div className="bg-black/20 rounded p-3">
          <p className="text-green-400 text-xs font-mono">✓ transfer: 0x1a2b3c...</p>
          <p className="text-green-400 text-xs font-mono">✓ approve: 0x4d5e6f...</p>
          <p className="text-red-400 text-xs font-mono">✗ unauthorized_func: 未授权</p>
        </div>
      </div>
    </div>
  )
}
