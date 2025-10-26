/**
 * Price Service - 实时价格获取服务
 * 使用 CoinGecko 免费 API
 */

export interface TokenPrice {
  symbol: string
  name: string
  currentPrice: number // USD
  priceChange24h: number // 百分比
  marketCap: number
  volume24h: number
  lastUpdated: string
}

interface CoinGeckoResponse {
  [key: string]: {
    usd: number
    usd_24h_change: number
    usd_market_cap: number
    usd_24h_vol: number
    last_updated_at: number
  }
}

// CoinGecko API 端点
const COINGECKO_API = 'https://api.coingecko.com/api/v3'

// 支持的代币 ID 映射
const TOKEN_IDS: Record<string, string> = {
  'ETH': 'ethereum',
  'BTC': 'bitcoin',
  'USDT': 'tether',
  'USDC': 'usd-coin',
  'BNB': 'binancecoin',
  'SOL': 'solana',
  'MATIC': 'matic-network',
  'AVAX': 'avalanche-2',
  'DOT': 'polkadot',
  'LINK': 'chainlink'
}

// 价格缓存
const priceCache = new Map<string, { price: TokenPrice; timestamp: number }>()
const CACHE_DURATION = 30 * 1000 // 30 秒缓存

/**
 * 获取单个代币价格
 */
export async function getTokenPrice(symbol: string, opts?: { force?: boolean }): Promise<TokenPrice | null> {
  const tokenId = TOKEN_IDS[symbol.toUpperCase()]
  
  if (!tokenId) {
    console.warn(`[Price Service] Unsupported token: ${symbol}`)
    return null
  }

  // 检查缓存
  const cached = priceCache.get(symbol)
  const fresh = cached && Date.now() - cached.timestamp < CACHE_DURATION
  if (fresh && !opts?.force) {
    return cached!.price
  }

  try {
    const response = await fetch(
      `${COINGECKO_API}/simple/price?ids=${tokenId}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24h_vol=true&include_last_updated_at=true`
    )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data: CoinGeckoResponse = await response.json()
    const tokenData = data[tokenId]

    if (!tokenData) {
      return null
    }

    const price: TokenPrice = {
      symbol: symbol.toUpperCase(),
      name: tokenId,
      currentPrice: tokenData.usd,
      priceChange24h: tokenData.usd_24h_change || 0,
      marketCap: tokenData.usd_market_cap || 0,
      volume24h: tokenData.usd_24h_vol || 0,
      lastUpdated: new Date(tokenData.last_updated_at * 1000).toISOString()
    }

    // 更新缓存
    priceCache.set(symbol, { price, timestamp: Date.now() })

    return price
  } catch (error) {
    console.error(`[Price Service] Failed to fetch price for ${symbol}:`, error)
    return null
  }
}

/**
 * 批量获取多个代币价格
 */
export async function getMultipleTokenPrices(
  symbols: string[],
  opts?: { force?: boolean }
): Promise<Record<string, TokenPrice | null>> {
  const prices: Record<string, TokenPrice | null> = {}

  // 过滤出支持的代币
  const supportedSymbols = symbols.filter(s => TOKEN_IDS[s.toUpperCase()])
  
  if (supportedSymbols.length === 0) {
    return prices
  }

  // 如果不强制刷新，且全部都有新鲜缓存，直接返回缓存
  if (!opts?.force) {
    const allFresh = supportedSymbols.every(s => {
      const c = priceCache.get(s)
      return c && Date.now() - c.timestamp < CACHE_DURATION
    })
    if (allFresh) {
      supportedSymbols.forEach(s => {
        prices[s] = priceCache.get(s)!.price
      })
      return prices
    }
  }

  // 准备 ID 列表
  const ids = supportedSymbols.map(s => TOKEN_IDS[s.toUpperCase()]).join(',')

  try {
    const response = await fetch(
      `${COINGECKO_API}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24h_vol=true&include_last_updated_at=true`
    )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data: CoinGeckoResponse = await response.json()

    // 解析每个代币的价格
    supportedSymbols.forEach(symbol => {
      const tokenId = TOKEN_IDS[symbol.toUpperCase()]
      const tokenData = data[tokenId]

      if (tokenData) {
        const price: TokenPrice = {
          symbol: symbol.toUpperCase(),
          name: tokenId,
          currentPrice: tokenData.usd,
          priceChange24h: tokenData.usd_24h_change || 0,
          marketCap: tokenData.usd_market_cap || 0,
          volume24h: tokenData.usd_24h_vol || 0,
          lastUpdated: new Date(tokenData.last_updated_at * 1000).toISOString()
        }

        prices[symbol] = price
        priceCache.set(symbol, { price, timestamp: Date.now() })
      } else {
        prices[symbol] = null
      }
    })

    return prices
  } catch (error) {
    console.error('[Price Service] Failed to fetch multiple prices:', error)
    // 返回空价格
    symbols.forEach(s => {
      prices[s] = null
    })
    return prices
  }
}

/**
 * 计算代币的 USD 价值
 */
export async function calculateTokenValue(
  symbol: string,
  amount: string
): Promise<number | null> {
  const price = await getTokenPrice(symbol)
  if (!price) {
    return null
  }

  const numAmount = parseFloat(amount)
  if (isNaN(numAmount)) {
    return null
  }

  return numAmount * price.currentPrice
}

/**
 * 格式化价格显示
 */
export function formatPrice(value: number | null | undefined): string {
  const num = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(num)) return '$-'
  if (num >= 1) {
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  } else {
    // 小数位价格显示更多位数
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`
  }
}

/**
 * 格式化价格变化百分比
 */
export function formatPriceChange(change: number): { text: string; color: string } {
  const isPositive = change >= 0
  const text = `${isPositive ? '+' : ''}${change.toFixed(2)}%`
  const color = isPositive ? '#22c55e' : '#ef4444' // green / red
  
  return { text, color }
}

/**
 * 清除价格缓存
 */
export function clearPriceCache(): void {
  priceCache.clear()
}

/**
 * 获取支持的代币列表
 */
export function getSupportedTokens(): string[] {
  return Object.keys(TOKEN_IDS)
}
