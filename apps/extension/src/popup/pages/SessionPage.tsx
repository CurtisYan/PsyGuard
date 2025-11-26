import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useWalletStore } from '../../store/wallet'
import { apiClient } from '../../api/client'

interface SessionPageProps {
  onBack: () => void
}

interface SessionState {
  sessionId: string | null
  checkpoint: any | null
  txCount: number
  transactions: any[]
  isActive: boolean
}

export default function SessionPage({ onBack }: SessionPageProps) {
  const { t } = useTranslation()
  const { address, showToast } = useWalletStore()
  const [session, setSession] = useState<SessionState>({
    sessionId: null,
    checkpoint: null,
    txCount: 0,
    transactions: [],
    isActive: false,
  })
  const [loading, setLoading] = useState(false)
  const [showCfcDialog, setShowCfcDialog] = useState(false)
  const [endCapResult, setEndCapResult] = useState<any>(null)

  // CFC 表单状态
  const [cfcType, setCfcType] = useState<'transfer' | 'claim'>('transfer')
  const [toAddress, setToAddress] = useState('')
  const [token, setToken] = useState('USDC')
  const [amount, setAmount] = useState('')

  // 启动 UPS 会话
  const handleStartSession = async () => {
    if (!address) return
    
    try {
      setLoading(true)
      showToast(t('session.starting'), 'info')
      
      const response = await apiClient.sessionStart({
        user_id: address,
        init_nonce: 0,
      })
      
      setSession({
        sessionId: response.session_id,
        checkpoint: response.checkpoint,
        txCount: 0,
        transactions: [],
        isActive: true,
      })
      
      showToast(t('session.started'), 'success')
    } catch (error) {
      console.error('Failed to start session:', error)
      showToast(t('session.start_failed'), 'error')
    } finally {
      setLoading(false)
    }
  }

  // 添加 CFC 调用
  const handleAddCfc = async () => {
    if (!session.sessionId || !toAddress || !amount) {
      showToast(t('session.fill_required'), 'error')
      return
    }

    try {
      setLoading(true)
      
      const call = cfcType === 'transfer'
        ? { TransferIntent: { to: toAddress, token, amount: parseFloat(amount) } }
        : { ClaimFrom: { from: toAddress, token, amount: parseFloat(amount) } }

      const response = await apiClient.sessionAddTx({
        session_id: session.sessionId,
        call,
      })

      setSession(prev => ({
        ...prev,
        txCount: response.tx_count,
        transactions: [...prev.transactions, { type: cfcType, to: toAddress, token, amount, delta: response.delta }],
      }))

      setShowCfcDialog(false)
      setToAddress('')
      setAmount('')
      showToast(t('session.tx_added'), 'success')
    } catch (error) {
      console.error('Failed to add transaction:', error)
      showToast(t('session.tx_failed'), 'error')
    } finally {
      setLoading(false)
    }
  }

  // 结束会话并生成 End Cap
  const handleEndSession = async () => {
    if (!session.sessionId) return
    
    // 获取当前用户的私钥
    const { privateKey } = useWalletStore.getState()
    if (!privateKey) {
      showToast('未找到私钥，请重新登录', 'error')
      return
    }

    try {
      setLoading(true)
      showToast(t('session.ending'), 'info')

      const response = await apiClient.sessionEnd({
        session_id: session.sessionId,
        next_nonce: 1,
        private_key: privateKey,  // 传递私钥
      })

      setEndCapResult(response)
      setSession({
        sessionId: null,
        checkpoint: null,
        txCount: 0,
        transactions: [],
        isActive: false,
      })
      
      showToast(t('session.ended'), 'success')
    } catch (error) {
      console.error('Failed to end session:', error)
      showToast(t('session.end_failed'), 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <button onClick={onBack} className="text-xl text-gray-900 dark:text-gray-100">←</button>
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t('session.title')}</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Session 状态 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{t('session.status')}</h3>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              session.isActive 
                ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}>
              {session.isActive ? t('session.active') : t('session.inactive')}
            </div>
          </div>

          {session.isActive && session.checkpoint && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">{t('session.session_id')}:</span>
                <div className="relative group">
                  <span className="font-mono text-xs text-gray-900 dark:text-gray-100 cursor-pointer">
                    {session.sessionId?.slice(0, 8)}...
                  </span>
                  {/* 悬浮提示 */}
                  {session.sessionId && (
                    <div className="absolute right-0 top-full mt-1 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs font-mono rounded-lg shadow-xl border border-gray-200 dark:border-gray-600 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-[100]">
                      {session.sessionId}
                      <div className="absolute right-2 bottom-full w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-white dark:border-b-gray-700"></div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">{t('session.block')}:</span>
                <span className="font-mono text-gray-900 dark:text-gray-100">{session.checkpoint.block_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">{t('session.tx_count')}:</span>
                <span className="font-mono text-gray-900 dark:text-gray-100">{session.txCount}</span>
              </div>
            </div>
          )}

          {!session.isActive && (
            <button
              onClick={handleStartSession}
              disabled={loading}
              className="w-full mt-3 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 font-medium"
            >
              {loading ? t('session.starting') : t('session.start')}
            </button>
          )}
        </div>

        {/* CFC 操作 */}
        {session.isActive && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">{t('session.cfc_calls')}</h3>
            
            {session.transactions.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                {t('session.no_transactions')}
              </p>
            ) : (
              <div className="space-y-2 mb-3">
                {session.transactions.map((tx, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {tx.type === 'transfer' ? '→' : '←'} {tx.token}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                        {tx.amount}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                      {tx.to.slice(0, 6)}...{tx.to.slice(-4)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setShowCfcDialog(true)}
                disabled={loading}
                className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 text-sm font-medium"
              >
                {t('session.add_cfc')}
              </button>
              <button
                onClick={handleEndSession}
                disabled={loading || session.txCount === 0}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 text-sm font-medium"
              >
                {t('session.end')}
              </button>
            </div>
          </div>
        )}

        {/* End Cap 结果 */}
        {endCapResult && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {t('session.endcap_generated')}
            </h3>
            
            {/* 链上执行结果 */}
            {endCapResult.on_chain_executed && (
              <div className="mb-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-medium">链上转账成功</span>
                </div>
                {endCapResult.tx_hashes && endCapResult.tx_hashes.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-xs text-gray-600 dark:text-gray-400">交易哈希:</span>
                    {endCapResult.tx_hashes.map((hash: string, idx: number) => (
                      <div key={idx} className="text-xs font-mono bg-white dark:bg-gray-800 p-2 rounded break-all">
                        {idx + 1}. {hash}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* Realm Sink 结果 */}
            {endCapResult.realm_header_id && (
              <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 mb-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <span className="font-medium">Realm Sink 接收成功</span>
                </div>
                <div className="text-xs font-mono bg-white dark:bg-gray-800 p-2 rounded break-all">
                  {endCapResult.realm_header_id}
                </div>
              </div>
            )}
            
            {/* 错误信息 */}
            {endCapResult.on_chain_error && (
              <div className="mb-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-yellow-700 dark:text-yellow-400 text-xs flex items-start gap-2">
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="font-medium">链上执行失败: {endCapResult.on_chain_error}</span>
              </div>
            )}
            
            <div className="space-y-2 text-xs font-mono bg-gray-50 dark:bg-gray-900 p-3 rounded-lg overflow-x-auto">
              <div>
                <span className="text-gray-600 dark:text-gray-400">{t('session.endcap')}:</span>
                <pre className="text-gray-900 dark:text-gray-100 mt-1">{JSON.stringify(endCapResult.endcap, null, 2)}</pre>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CFC 对话框 */}
      {showCfcDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('session.add_cfc')}
            </h3>

            <div className="space-y-4">
              {/* CFC 类型 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('session.cfc_type')}
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCfcType('transfer')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                      cfcType === 'transfer'
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    Transfer Intent
                  </button>
                  <button
                    onClick={() => setCfcType('claim')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                      cfcType === 'claim'
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    Claim From
                  </button>
                </div>
              </div>

              {/* 地址 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {cfcType === 'transfer' ? t('session.to_address') : t('session.from_address')}
                </label>
                <input
                  type="text"
                  value={toAddress}
                  onChange={(e) => setToAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              {/* Token */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('session.token')}
                </label>
                <select
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option>USDC</option>
                  <option>ETH</option>
                  <option>BTC</option>
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('session.amount')}
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.0"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCfcDialog(false)}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-medium"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleAddCfc}
                disabled={loading || !toAddress || !amount}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 font-medium"
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
