import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useWalletStore } from '../../store/wallet'
import { apiClient } from '../../api/client'

interface Token {
  symbol: string
  name: string
  balance: string
  price: number
  change24h: number
  valueUSD: number
  icon: string
  contractAddress?: string
  chain?: string
}

export default function TokenList() {
  const { t } = useTranslation()
  const { balance, symbol } = useWalletStore()
  const [tokens, setTokens] = useState<Token[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTokens()
  }, [balance, symbol])

  const loadTokens = async () => {
    try {
      setLoading(true)
      
      const usdcBalance = parseFloat(balance) || 0
      const tokenList: Token[] = []
      
      // 只获取 USDC 的价格（用户真实持有的代币）
      try {
        const prices = await apiClient.getPriceFromCoinGecko(['USDC'])
        
        const usdcData = prices.find(p => p.symbol === 'USDC')
        if (usdcData) {
          tokenList.push({
            symbol: 'USDC',
            name: 'USD Coin',
            balance: balance,
            price: usdcData.usd,
            change24h: usdcData.usd_24h_change || 0,
            valueUSD: usdcBalance * usdcData.usd,
            icon: 'usdc',
            contractAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            chain: 'ethereum'
          })
        } else {
          // 降级方案
          tokenList.push({
            symbol: 'USDC',
            name: 'USD Coin',
            balance: balance,
            price: 1.0,
            change24h: 0,
            valueUSD: usdcBalance,
            icon: 'usdc',
            contractAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            chain: 'ethereum'
          })
        }
      } catch (priceError) {
        console.error('[TokenList] Failed to load prices:', priceError)
        // 失败时使用默认值
        tokenList.push({
          symbol: 'USDC',
          name: 'USD Coin',
          balance: balance,
          price: 1.0,
          change24h: 0,
          valueUSD: usdcBalance,
          icon: 'usdc',
          contractAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          chain: 'ethereum'
        })
      }
      
      setTokens(tokenList)
    } catch (err) {
      console.error('[TokenList] Failed to load tokens:', err)
      // 失败时只显示 USDC
      setTokens([{
        symbol: 'USDC',
        name: 'USD Coin',
        balance: balance,
        price: 1.0,
        change24h: 0,
        valueUSD: parseFloat(balance) || 0,
        icon: 'usdc',
        contractAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        chain: 'ethereum'
      }])
    } finally {
      setLoading(false)
    }
  }

  const getTokenIcon = (token: Token) => {
    // 使用 Trust Wallet CDN 图标（免费）
    const iconUrl = token.contractAddress && token.chain 
      ? `https://assets-cdn.trustwallet.com/blockchains/${token.chain}/assets/${token.contractAddress}/logo.png`
      : null
    
    // 纯色背景（不用渐变）
    const colors: Record<string, string> = {
      'usdc': 'bg-blue-500',
      'eth': 'bg-purple-500',
      'bnb': 'bg-yellow-500',
    }
    
    const bgColor = colors[token.icon] || 'bg-gray-500'
    
    return (
      <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center">
        {iconUrl ? (
          <img 
            src={iconUrl} 
            alt={token.symbol}
            className="w-full h-full object-cover"
            onError={(e) => {
              // 图片加载失败时，显示纯色背景 + 字母
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
              target.parentElement!.classList.add(bgColor)
              target.parentElement!.innerHTML = `<span class="text-white font-bold text-sm">${token.symbol.slice(0, 2).toUpperCase()}</span>`
            }}
          />
        ) : (
          <div className={`w-full h-full ${bgColor} flex items-center justify-center`}>
            <span className="text-white font-bold text-sm">{token.symbol.slice(0, 2).toUpperCase()}</span>
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-gray-600 dark:text-gray-400">{t('common.assets')}</h3>
        </div>
        <p className="text-sm text-gray-500">{t('common.loading')}</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-sm text-gray-600 dark:text-gray-400">{t('common.assets')}</h3>
        <button 
          onClick={loadTokens}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
      
      {/* 代币列表 */}
      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {tokens.map((token) => (
          <div key={token.symbol} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              {/* 代币图标 */}
              {getTokenIcon(token)}
              
              {/* 代币信息 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">{token.symbol}</span>
                  {/* 涨跌百分比 */}
                  <span className={`text-xs font-medium ${token.change24h >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {token.change24h >= 0 ? '+' : ''}{token.change24h.toFixed(2)}%
                  </span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{token.name}</div>
              </div>
              
              {/* 持仓信息 */}
              <div className="text-right">
                <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                  ${token.valueUSD.toFixed(2)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {parseFloat(token.balance).toFixed(4)} {token.symbol}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
