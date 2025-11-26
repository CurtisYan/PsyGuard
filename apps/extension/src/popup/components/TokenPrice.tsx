import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { apiClient, PriceFeed } from '../../api/client'

interface TokenPriceInfo extends PriceFeed {}

export default function TokenPrice() {
  const { t } = useTranslation()
  const [prices, setPrices] = useState<TokenPriceInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    loadPrices()
  }, [])

  const loadPrices = async () => {
    try {
      setLoading(true)
      setError(false)
      
      // 使用 CoinGecko 免费 API 直接获取价格（不需要后端运行）
      // 主流币种：BTC, ETH, BNB, SOL, ADA
      const priceList = await apiClient.getPriceFromCoinGecko(['BTC', 'ETH', 'BNB', 'SOL', 'ADA'])
      setPrices(priceList)
    } catch (err) {
      console.error('Failed to load prices:', err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
        <h3 className="font-semibold text-base text-gray-900 dark:text-gray-100 mb-3">{t('price.title')}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">{t('price.loading')}</p>
      </div>
    )
  }

  // 即使加载失败也显示空状态，而不是隐藏
  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
        <h3 className="font-semibold text-base text-gray-900 dark:text-gray-100 mb-3">{t('price.title')}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-500">{t('price.error')}</p>
      </div>
    )
  }
  
  if (prices.length === 0) {
    return null
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-base text-gray-900 dark:text-gray-100">{t('price.title')}</h3>
        <button 
          onClick={loadPrices}
          className="text-xs text-primary hover:underline"
        >
          {t('price.refresh')}
        </button>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
        <div className="space-y-2">
          {prices.map((price) => (
            <div key={price.symbol} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">
                  {{
                    'BTC': '₿',
                    'ETH': '⟠',
                    'BNB': '🔶',
                    'SOL': '☀️',
                    'ADA': '♥️',
                  }[price.symbol] || '💰'}
                </span>
                <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{price.symbol}</span>
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                ${price.usd >= 1000 
                  ? price.usd.toLocaleString('en-US', { maximumFractionDigits: 0 })
                  : price.usd >= 1
                  ? price.usd.toFixed(2)
                  : price.usd.toFixed(4)
                }
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
