import { useTranslation } from 'react-i18next'
import { useWalletStore } from '../../store/wallet'

interface ActivityFeedProps {
  onViewMore?: () => void
}

export default function ActivityFeed({ onViewMore }: ActivityFeedProps) {
  const { t } = useTranslation()
  const activities = useWalletStore((state) => state.activities)
  
  // 只显示最近3条
  const recentActivities = activities.slice(0, 3)
  const hasMore = activities.length > 3

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-base text-gray-900 dark:text-gray-100">{t('activity.title')}</h3>
      </div>
      
      <div className="space-y-2">
        {recentActivities.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center">
            <div className="text-4xl mb-2">📭</div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {t('activity.empty')}
            </p>
          </div>
        ) : (
          <>
            {recentActivities.map((activity) => (
              <div 
                key={activity.id}
                className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-1 text-lg ${
                    activity.status === 'success' ? 'text-green-500' : 
                    activity.status === 'pending' ? 'text-yellow-500' : 
                    'text-red-500'
                  }`}>
                    {activity.status === 'success' ? '✓' : activity.status === 'pending' ? '⏳' : '✕'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                      {activity.desc}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {activity.detail}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {hasMore && onViewMore && (
              <button
                onClick={onViewMore}
                className="w-full py-2 text-sm text-primary hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              >
                {t('activity.view_more')} ({activities.length})
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
