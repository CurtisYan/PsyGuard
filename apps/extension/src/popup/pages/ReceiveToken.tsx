import { useTranslation } from 'react-i18next'
import { useWalletStore } from '../../store/wallet'
import QRCode from '../components/QRCode'

interface ReceiveTokenProps {
  onBack: () => void
}

export default function ReceiveToken({ onBack }: ReceiveTokenProps) {
  const { t } = useTranslation()
  const { address, showToast } = useWalletStore()

  const handleCopy = async () => {
    if (!address) return
    
    try {
      await navigator.clipboard.writeText(address)
      showToast(t('toast.copy_success'), 'success')
    } catch (error) {
      showToast(t('toast.copy_failed'), 'error')
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <button onClick={onBack} className="text-xl dark:text-gray-200">←</button>
        <h2 className="font-semibold dark:text-gray-100">{t('receive.title')}</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t('receive.description')}
            </p>
            
            {/* 二维码 */}
            <div className="bg-white p-4 mx-auto rounded-lg inline-block mb-4">
              {address && <QRCode value={address} size={200} />}
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-4">
              <p className="font-mono text-xs break-all text-gray-900 dark:text-gray-100">
                {address}
              </p>
            </div>
            
            <button
              onClick={handleCopy}
              className="w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-colors"
            >
              📋 {t('receive.copy_address')}
            </button>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
            <p className="text-xs text-blue-600 dark:text-blue-300">
              💡 {t('receive.network_tip')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
