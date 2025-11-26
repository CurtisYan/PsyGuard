interface ErrorRetryProps {
  message: string
  onRetry: () => void
  onBack?: () => void
}

export default function ErrorRetry({ message, onRetry, onBack }: ErrorRetryProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 bg-background-light">
      <div className="text-6xl mb-4">⚠️</div>
      <h2 className="text-xl font-bold text-text-primary mb-2">连接失败</h2>
      <p className="text-text-secondary text-center mb-6">
        {message || '无法连接到服务器，请检查后端是否运行'}
      </p>
      
      <div className="space-y-3 w-full max-w-sm">
        <button
          onClick={onRetry}
          className="w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-colors"
        >
          重试
        </button>
        
        {onBack && (
          <button
            onClick={onBack}
            className="w-full py-3 border-2 border-gray-300 text-text-primary rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            返回
          </button>
        )}
      </div>
      
      <div className="mt-6 text-xs text-text-secondary text-center">
        <p>提示：请确保后端 API 服务已启动</p>
        <p className="mt-1">运行: cargo run -p agent-api</p>
      </div>
    </div>
  )
}
