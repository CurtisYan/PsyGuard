import { useTranslation } from 'react-i18next'
import { useWalletStore } from '../../store/wallet'

interface SettingsProps {
  onBack: () => void
}

export default function Settings({ onBack }: SettingsProps) {
  const { t, i18n } = useTranslation()
  const { theme, setTheme } = useWalletStore()

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <button onClick={onBack} className="text-xl text-gray-900 dark:text-gray-100">←</button>
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t('settings.title')}</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
          <h3 className="font-medium mb-3 text-gray-900 dark:text-gray-100">General</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">{t('settings.language')}</span>
              <select 
                value={i18n.language}
                onChange={(e) => i18n.changeLanguage(e.target.value)}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="en">English</option>
                <option value="zh">中文</option>
              </select>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">{t('settings.theme')}</span>
              <select 
                value={theme}
                onChange={(e) => setTheme(e.target.value as 'auto' | 'light' | 'dark')}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="auto">{t('settings.theme_auto')}</option>
                <option value="light">{t('settings.theme_light')}</option>
                <option value="dark">{t('settings.theme_dark')}</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
          <h3 className="font-medium mb-3 text-gray-900 dark:text-gray-100">{t('settings.network')}</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">RPC Endpoint</span>
              <select className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                <option>Sepolia</option>
                <option>Holesky</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
          <h3 className="font-medium mb-3 text-gray-900 dark:text-gray-100">{t('settings.sdkey')}</h3>
          <button className="text-primary text-sm">+ Add New Policy</button>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
          <h3 className="font-medium mb-3 text-gray-900 dark:text-gray-100">{t('settings.privacy')}</h3>
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
            <p>🔒 Your data stays local.</p>
            <p>Only proofs sent to network.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
