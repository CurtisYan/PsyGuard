import { useTranslation } from 'react-i18next'

interface QuickActionsProps {
  onSendClick: () => void
  onReceiveClick: () => void
  onSessionClick: () => void
}

export default function QuickActions({ onSendClick, onReceiveClick, onSessionClick }: QuickActionsProps) {
  const { t } = useTranslation()

  return (
    <div className="grid grid-cols-3 gap-3">
      <button 
        onClick={onSendClick}
        className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow"
      >
        <span className="text-2xl">📤</span>
        <span className="text-sm font-medium dark:text-gray-200">{t('common.send')}</span>
      </button>
      
      <button 
        onClick={onReceiveClick}
        className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow"
      >
        <span className="text-2xl">📥</span>
        <span className="text-sm font-medium dark:text-gray-200">{t('common.receive')}</span>
      </button>
      
      <button 
        onClick={onSessionClick}
        className="flex flex-col items-center gap-2 p-4 bg-primary text-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
      >
        <span className="text-2xl">🔄</span>
        <span className="text-sm font-medium">{t('common.session')}</span>
      </button>
    </div>
  )
}
