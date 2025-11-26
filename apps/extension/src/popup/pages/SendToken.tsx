import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useWalletStore } from '../../store/wallet'

interface SendTokenProps {
  onBack: () => void
}

export default function SendToken({ onBack }: SendTokenProps) {
  const { t } = useTranslation()
  const { address, showToast, addActivity } = useWalletStore()
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSend = async () => {
    if (!recipient || !amount) {
      showToast(t('toast.fill_required'), 'error')
      return
    }

    setLoading(true)
    try {
      // 这里应该调用API发送交易
      // 暂时模拟发送
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      addActivity({
        type: 'send',
        desc: `发送 ${amount} USDC`,
        detail: `To: ${recipient.slice(0, 6)}...${recipient.slice(-4)}`,
        status: 'pending',
      })
      
      showToast(t('toast.tx_submitted'), 'success')
      onBack()
    } catch (error) {
      showToast(t('toast.send_failed'), 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <button onClick={onBack} className="text-xl dark:text-gray-200">←</button>
        <h2 className="font-semibold dark:text-gray-100">{t('send.title')}</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
            <label className="block text-sm font-medium mb-2 dark:text-gray-200">{t('send.from')}</label>
            <div className="text-xs text-gray-600 dark:text-gray-400 font-mono break-all">
              {address && (
                <span>
                  <span className="font-bold">{address.slice(0, 6)}</span>
                  {address.slice(6, -4)}
                  <span className="font-bold">{address.slice(-4)}</span>
                </span>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
            <label className="block text-sm font-medium mb-2 dark:text-gray-200">{t('send.to')}</label>
            <input 
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder={t('send.placeholder_address')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
            <label className="block text-sm font-medium mb-2 dark:text-gray-200">{t('send.token')}</label>
            <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
              <option>USDC</option>
              <option>ETH</option>
            </select>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
            <label className="block text-sm font-medium mb-2 dark:text-gray-200">{t('send.amount')}</label>
            <div className="flex gap-2">
              <input 
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={t('send.placeholder_amount')}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              />
              <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-200">
                {t('send.max')}
              </button>
            </div>
          </div>

          <button
            onClick={handleSend}
            disabled={loading}
            className="w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {loading ? t('send.sending') : t('send.title')}
          </button>
        </div>
      </div>
    </div>
  )
}
