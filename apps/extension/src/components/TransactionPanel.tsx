import { useState } from 'react'
import { Send, CheckCircle, AlertCircle } from 'lucide-react'
import { createSession } from '../lib/wasm'

export default function TransactionPanel() {
  const [userId] = useState('alice')
  const [contractId, setContractId] = useState('token_contract')
  const [functionName, setFunctionName] = useState('transfer')
  const [args, setArgs] = useState('{"to": "bob", "amount": 100}')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const executeCfc = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const session = await createSession(userId)
      const txResult = await session.exec_cfc(contractId, functionName, args)
      setResult(txResult)
      console.log('交易结果:', txResult)
    } catch (err: any) {
      console.error('交易失败:', err)
      setError(err.message || '交易执行失败')
    } finally {
      setLoading(false)
    }
  }

  const submitEndCap = async () => {
    setLoading(true)
    setError(null)

    try {
      const session = await createSession(userId)
      const policy = JSON.stringify({
        daily_limit: 10000,
        trusted_contracts: [contractId],
        time_lock_until: null,
        require_2fa: false,
      })
      
      const receipt = await session.submit_endcap(policy)
      setResult(receipt)
      console.log('提交收据:', receipt)
    } catch (err: any) {
      console.error('提交失败:', err)
      setError(err.message || '提交失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white flex items-center gap-2">
        <Send className="w-6 h-6" />
        执行交易 (CFC)
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block text-blue-200 text-sm mb-2">合约 ID</label>
          <input
            type="text"
            value={contractId}
            onChange={(e) => setContractId(e.target.value)}
            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400"
            placeholder="输入合约 ID"
          />
        </div>

        <div>
          <label className="block text-blue-200 text-sm mb-2">函数名</label>
          <input
            type="text"
            value={functionName}
            onChange={(e) => setFunctionName(e.target.value)}
            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400"
            placeholder="输入函数名"
          />
        </div>

        <div>
          <label className="block text-blue-200 text-sm mb-2">参数 (JSON)</label>
          <textarea
            value={args}
            onChange={(e) => setArgs(e.target.value)}
            rows={4}
            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-blue-400"
            placeholder='{"to": "bob", "amount": 100}'
          />
        </div>

        <div className="flex gap-4">
          <button
            onClick={executeCfc}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
            {loading ? '执行中...' : '执行 CFC'}
          </button>

          <button
            onClick={submitEndCap}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition disabled:opacity-50"
          >
            <CheckCircle className="w-5 h-5" />
            {loading ? '提交中...' : '提交 End Cap'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 font-semibold">错误</p>
            <p className="text-red-300 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {result && (
        <div className="bg-green-500/20 border border-green-500 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-green-400 font-semibold mb-2">执行成功</p>
              <pre className="text-green-300 text-xs font-mono bg-black/20 p-3 rounded overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
        <h3 className="text-white font-semibold mb-2">说明</h3>
        <ul className="text-blue-200 text-sm space-y-1">
          <li>• 执行 CFC: 在 UPS 会话中执行合约函数调用</li>
          <li>• 提交 End Cap: 终结会话并提交到 Realm</li>
          <li>• 所有操作都经过 CFT 指纹校验和 SDKey 策略验证</li>
        </ul>
      </div>
    </div>
  )
}
