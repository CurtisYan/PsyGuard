import { useState, useEffect } from 'react'
import { Wallet, Copy, RefreshCw, ChevronRight } from 'lucide-react'
import { createSession } from '../lib/wasm'
import { getMultipleTokenPrices, formatPrice, type TokenPrice } from '../services/priceService'

// 多链资产类型
interface Asset {
  chain: string
  symbol: string
  balance: string
  usdValue: number
  logo: string
}

export default function WalletPanel() {
  const [userId] = useState('alice')
  const [sessionInfo, setSessionInfo] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [prices, setPrices] = useState<Record<string, TokenPrice | null>>({})
  const [priceLoading, setPriceLoading] = useState(false)
  
  // 模拟多链资产数据（实际应从链上获取）
  const [assets] = useState<Asset[]>([
    { chain: 'Ethereum', symbol: 'ETH', balance: '2.5', usdValue: 0, logo: '⟠' },
    { chain: 'Bitcoin', symbol: 'BTC', balance: '0.15', usdValue: 0, logo: '₿' },
    { chain: 'Ethereum', symbol: 'USDT', balance: '10000', usdValue: 0, logo: '₮' },
    { chain: 'Polygon', symbol: 'MATIC', balance: '5000', usdValue: 0, logo: '◬' },
  ])
  
  // 使用实时价格计算总价值
  const calculateAssetValue = (asset: Asset) => {
    const price = prices[asset.symbol]
    if (!price) return 0
    return parseFloat(asset.balance) * price.currentPrice
  }
  
  const totalUsdValue = assets.reduce((sum, asset) => sum + calculateAssetValue(asset), 0)

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

  const loadPrices = async (force = false) => {
    setPriceLoading(true)
    try {
      const symbols = assets.map(a => a.symbol)
      const priceData = await getMultipleTokenPrices(symbols, { force })
      setPrices(priceData)
    } catch (error) {
      console.error('获取价格失败:', error)
    } finally {
      setPriceLoading(false)
    }
  }

  useEffect(() => {
    loadSession()
    loadPrices()
    
    // 每 30 秒刷新价格
    const interval = setInterval(loadPrices, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-6">
      {/* 钱包头部 */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Wallet className="w-6 h-6" />
          多链统一钱包
        </h2>
        <button
          onClick={() => {
            loadSession()
            loadPrices(true)
          }}
          disabled={loading || priceLoading}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${(loading || priceLoading) ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>
      
      {/* Psy 协议说明 */}
      <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/50 rounded-lg p-4">
        <p className="text-blue-200 text-sm leading-relaxed">
          ⚡ <strong className="text-blue-100">基于 Psy 区块链协议</strong>：通过零知识证明实现跨链统一账户体验，
          一个账户管理所有链上的资产，支持一键签名/授权多链交易。
        </p>
      </div>
      
      {/* 总资产卡片 */}
      <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-xl p-4 shadow-lg">
        <p className="text-blue-200 text-xs mb-1">总资产价值 (USD)</p>
        <p className="text-white font-bold text-3xl">
          {priceLoading ? (
            <span className="animate-pulse">加载中...</span>
          ) : (
            formatPrice(totalUsdValue)
          )}
        </p>
        {!priceLoading && (
          <p className="text-green-400 text-xs mt-1">实时价格</p>
        )}
      </div>

      {/* 多链资产列表 */}
      <div className="space-y-3">
        <h3 className="text-white font-semibold text-lg flex items-center gap-2">
          资产列表
          <span className="text-blue-300 text-sm">({assets.length} 种资产)</span>
        </h3>
        
        {assets.map((asset, index) => (
          <div 
            key={index}
            className="bg-white/5 hover:bg-white/10 rounded-xl p-4 border border-white/10 cursor-pointer transition group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-3xl">{asset.logo}</div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-white font-bold">{asset.symbol}</p>
                    <span className="text-xs text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded">{asset.chain}</span>
                  </div>
                  <p className="text-blue-200 text-sm">{asset.balance} {asset.symbol}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white font-semibold">
                  {prices[asset.symbol] ? (
                    formatPrice(calculateAssetValue(asset))
                  ) : (
                    <span className="text-gray-400 text-sm">-</span>
                  )}
                </p>
                {prices[asset.symbol] && (
                  <p className="text-blue-300 text-xs">
                    @ {formatPrice(prices[asset.symbol]!.currentPrice)}
                  </p>
                )}
                <ChevronRight className="w-4 h-4 text-blue-300 group-hover:text-white transition ml-auto mt-1" />
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* 账户信息 */}
      {sessionInfo ? (
        <div className="space-y-3">
          <h3 className="text-white font-semibold text-lg">账户信息</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <p className="text-blue-200 text-xs mb-1">用户 ID</p>
              <div className="flex items-center gap-2">
                <p className="text-white font-mono text-sm">{sessionInfo.user_id}</p>
                <Copy className="w-3 h-3 text-blue-300 cursor-pointer hover:text-white" />
              </div>
            </div>

            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <p className="text-blue-200 text-xs mb-1">Nonce</p>
              <p className="text-white font-semibold">{sessionInfo.nonce}</p>
            </div>

            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <p className="text-blue-200 text-xs mb-1">UPS 会话</p>
              <p className="text-white font-mono text-xs truncate">{sessionInfo.session_id}</p>
            </div>

            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <p className="text-blue-200 text-xs mb-1">UPS 步骤</p>
              <p className="text-white font-semibold">{sessionInfo.step_count}</p>
            </div>
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
