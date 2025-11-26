import { useTranslation } from 'react-i18next'
import { useWalletStore } from '../../store/wallet'

interface ActivityHistoryProps {
  onBack: () => void
}

export default function ActivityHistory({ onBack }: ActivityHistoryProps) {
  const { t } = useTranslation()
  const activities = useWalletStore((state) => state.activities)

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <button onClick={onBack} className="text-xl dark:text-gray-200">←</button>
        <h2 className="font-semibold dark:text-gray-100">{t('activity.all_activities')}</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-gray-600 dark:text-gray-400">{t('activity.empty')}</p>
          </div>
        ) : (
          activities.map((activity) => (
            <div 
              key={activity.id}
              className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className={`mt-1 text-xl ${activity.status === 'success' ? 'text-green-500' : activity.status === 'pending' ? 'text-yellow-500' : 'text-red-500'}`}>
                  {activity.status === 'success' ? '✓' : activity.status === 'pending' ? '⏳' : '✕'}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {activity.desc}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {activity.detail}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {activity.timestamp}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
