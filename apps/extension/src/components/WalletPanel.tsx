import { useState, useEffect } from 'react'
import { Wallet, Copy, RefreshCw } from 'lucide-react'
import { createSession } from '../lib/wasm'

export default function WalletPanel() {
  const [userId] = useState('alice')
  const [sessionInfo, setSessionInfo] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const loadSession = async () => {
    setLoading(true)
    try {
      const session = await createSession(userId)
      const info = await session.get_session_info()
      setSessionInfo(info)
      console.log('会话信息:', info)
    } catch (error: any) {
      console.error('加载会话失败:', error)
      alert('加载会话失败: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSession()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Wallet className="w-6 h-6" />
          我的钱包
        </h2>
        <button
          onClick={loadSession}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>

      {sessionInfo ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <p className="text-blue-200 text-sm mb-2">用户 ID</p>
            <div className="flex items-center gap-2">
              <p className="text-white font-mono text-lg">{sessionInfo.user_id}</p>
              <Copy className="w-4 h-4 text-blue-300 cursor-pointer hover:text-white" />
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <p className="text-blue-200 text-sm mb-2">余额</p>
            <p className="text-white font-bold text-2xl">{sessionInfo.balance} PSY</p>
          </div>

          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <p className="text-blue-200 text-sm mb-2">会话 ID</p>
            <p className="text-white font-mono text-sm truncate">{sessionInfo.session_id}</p>
          </div>

          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <p className="text-blue-200 text-sm mb-2">Nonce</p>
            <p className="text-white font-bold text-xl">{sessionInfo.nonce}</p>
          </div>

          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <p className="text-blue-200 text-sm mb-2">区块高度</p>
            <p className="text-white font-bold text-xl">{sessionInfo.block_number}</p>
          </div>

          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <p className="text-blue-200 text-sm mb-2">UPS 步骤</p>
            <p className="text-white font-bold text-xl">{sessionInfo.step_count}</p>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="animate-pulse text-blue-300">加载中...</div>
        </div>
      )}
    </div>
  )
}
