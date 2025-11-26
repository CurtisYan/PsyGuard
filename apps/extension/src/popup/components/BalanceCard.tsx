interface BalanceCardProps {
  balance: string
  symbol: string
  usdValue: string
}

export default function BalanceCard({ balance, symbol, usdValue }: BalanceCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 text-center">
      <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
        {balance} {symbol}
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
        ≈ ${usdValue} USD
      </div>
    </div>
  )
}
