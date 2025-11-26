// API 客户端

const API_BASE_URL = 'http://localhost:3000'

export interface BalanceRequest {
  address: string
  token_address?: string
}

export interface BalanceResponse {
  balance: string
  symbol: string
}

export interface Checkpoint {
  chain_id: number
  block_number: number
  block_hash: string
  state_root: string
  timestamp: number
}

export interface PriceFeed {
  symbol: string
  usd: number
  updated_at?: number
}

export interface SessionStartRequest {
  user_id: string
  init_nonce: number
}

export interface SessionStartResponse {
  session_id: string
  checkpoint: Checkpoint
}

export interface CfcCall {
  TransferIntent?: {
    to: string
    token: string
    amount: number
  }
  ClaimFrom?: {
    from: string
    token: string
    amount: number
  }
}

export interface SessionAddTxRequest {
  session_id: string
  call: CfcCall
}

export interface SessionAddTxResponse {
  success: boolean
  tx_count: number
  delta: any
}

export interface SessionEndRequest {
  session_id: string
  next_nonce: number
}

export interface SessionEndResponse {
  endcap: any
  deltas: any[]
  success: boolean
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  async getBalance(req: BalanceRequest): Promise<BalanceResponse> {
    const response = await fetch(`${this.baseUrl}/balance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    })
    if (!response.ok) throw new Error('Failed to get balance')
    return response.json()
  }

  async getCheckpoint(): Promise<Checkpoint> {
    const response = await fetch(`${this.baseUrl}/checkpoint`)
    if (!response.ok) throw new Error('Failed to get checkpoint')
    return response.json()
  }

  async getPrice(symbol: string): Promise<PriceFeed> {
    const response = await fetch(`${this.baseUrl}/price/${symbol}`)
    if (!response.ok) throw new Error('Failed to get price')
    return response.json()
  }

  // 使用 CoinGecko 免费 API 直接获取价格（不依赖后端）
  async getPriceFromCoinGecko(symbols: string[]): Promise<PriceFeed[]> {
    // CoinGecko ID 映射
    const coinGeckoIds: Record<string, string> = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'BNB': 'binancecoin',
      'SOL': 'solana',
      'XRP': 'ripple',
      'ADA': 'cardano',
      'DOGE': 'dogecoin',
      'MATIC': 'matic-network',
      'DOT': 'polkadot',
      'USDC': 'usd-coin',
      'USDT': 'tether',
    }

    const ids = symbols.map(s => coinGeckoIds[s]).filter(Boolean).join(',')
    
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    )
    
    if (!response.ok) throw new Error('Failed to fetch from CoinGecko')
    const data = await response.json()

    const results: PriceFeed[] = []
    for (const symbol of symbols) {
      const id = coinGeckoIds[symbol]
      if (id && data[id]) {
        results.push({
          symbol,
          usd: data[id].usd,
          updated_at: Date.now(),
        })
      }
    }

    return results
  }

  async sessionStart(req: SessionStartRequest): Promise<SessionStartResponse> {
    const response = await fetch(`${this.baseUrl}/session/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    })
    if (!response.ok) throw new Error('Failed to start session')
    return response.json()
  }

  async sessionAddTx(req: SessionAddTxRequest): Promise<SessionAddTxResponse> {
    const response = await fetch(`${this.baseUrl}/session/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    })
    if (!response.ok) throw new Error('Failed to add transaction')
    return response.json()
  }

  async sessionEnd(req: SessionEndRequest): Promise<SessionEndResponse> {
    const response = await fetch(`${this.baseUrl}/session/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    })
    if (!response.ok) throw new Error('Failed to end session')
    return response.json()
  }

  async health(): Promise<{ status: string }> {
    const response = await fetch(`${this.baseUrl}/health`)
    if (!response.ok) throw new Error('Health check failed')
    return response.json()
  }
}

export const apiClient = new ApiClient()
