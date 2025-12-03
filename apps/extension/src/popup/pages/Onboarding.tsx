import { useState } from 'react'
import { ethers } from 'ethers'
import { useTranslation } from 'react-i18next'
import { useWalletStore } from '../../store/wallet'

interface OnboardingProps {
  onComplete: () => void
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const { t, i18n } = useTranslation()
  const { initialize, showToast } = useWalletStore()
  const [step, setStep] = useState<'welcome' | 'import' | 'create' | 'setPassword' | 'confirm'>('welcome')
  const [privateKey, setPrivateKey] = useState('')
  const [newAddress, setNewAddress] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  
  // 切换语言
  const toggleLanguage = () => {
    const newLang = i18n.language === 'zh' ? 'en' : 'zh'
    i18n.changeLanguage(newLang)
  }

  const handleImport = () => {
    setError('')
    
    try {
      // 使用 ethers.js 验证私钥格式
      const wallet = new ethers.Wallet(privateKey.trim())
      setNewAddress(wallet.address)
      // 跳转到设置密码页面
      setStep('setPassword')
    } catch (err) {
      setError(t('onboarding.error_invalid_key'))
    }
  }

  const handleCreateNew = () => {
    // 使用 ethers.js 生成真实钱包
    const wallet = ethers.Wallet.createRandom()
    
    setPrivateKey(wallet.privateKey)
    setNewAddress(wallet.address)
    setStep('setPassword')
  }
  
  const handleSetPassword = () => {
    setError('')
    
    // 验证密码
    if (password.length < 6) {
      setError(t('onboarding.error_password_too_short'))
      return
    }
    
    if (password !== confirmPassword) {
      setError(t('onboarding.error_password_mismatch'))
      return
    }
    
    // 如果是创建新钱包，显示私钥确认页
    if (privateKey) {
      setStep('confirm')
    } else {
      // 如果是导入，直接初始化
      handleFinish()
    }
  }
  
  const handleConfirmPrivateKey = () => {
    if (!confirmed) {
      setError(t('onboarding.error_confirm_saved'))
      return
    }
    
    handleFinish()
  }
  
  const handleFinish = async () => {
    try {
      await initialize(newAddress, privateKey, password)
      onComplete()
    } catch (error) {
      setError(t('onboarding.error_initialize_failed'))
    }
  }

  if (step === 'welcome') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 dark:bg-gray-900 p-6 relative">
        {/* 语言切换按钮 - 右上角 */}
        <button 
          onClick={toggleLanguage}
          className="absolute top-6 right-6 p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
          title={i18n.language === 'zh' ? 'Switch to English' : '切换为中文'}
        >
          <svg className="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
          </svg>
        </button>
        
        <div className="text-6xl mb-4 text-gray-800 dark:text-gray-200">ψ</div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('onboarding.welcome_title')}</h1>
        <p className="text-gray-600 dark:text-gray-400 text-center mb-8">
          {t('onboarding.welcome_subtitle')}
        </p>
        
        <div className="space-y-3 w-full max-w-sm">
          <button
            onClick={() => setStep('create')}
            className="w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-colors"
          >
            {t('onboarding.create_new')}
          </button>
          
          <button
            onClick={() => setStep('import')}
            className="w-full py-3 border-2 border-primary text-primary rounded-xl font-medium hover:bg-primary-light transition-colors"
          >
            {t('onboarding.import_existing')}
          </button>
        </div>
      </div>
    )
  }

  if (step === 'import') {
    return (
      <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <button 
          onClick={() => setStep('welcome')}
          className="text-xl mb-4 text-gray-800 dark:text-gray-200"
        >
          ←
        </button>
        
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">{t('onboarding.import_title')}</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">{t('onboarding.private_key')}</label>
            <textarea
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              placeholder={t('onboarding.private_key_placeholder')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg h-24 font-mono text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
          
          {error && (
            <div className="text-error text-sm">{error}</div>
          )}
          
          <button
            onClick={handleImport}
            className="w-full py-3 bg-primary text-white rounded-xl font-medium"
          >
            {t('onboarding.import_button')}
          </button>
          
          <p className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {t('onboarding.demo_warning')}
          </p>
        </div>
      </div>
    )
  }

  if (step === 'create') {
    return (
      <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <button 
          onClick={() => setStep('welcome')}
          className="text-xl mb-4 text-gray-800 dark:text-gray-200"
        >
          ←
        </button>
        
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">{t('onboarding.create_title')}</h2>
        
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t('onboarding.create_description')}
            </p>
            <p className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {t('onboarding.key_warning')}
            </p>
          </div>
          
          <button
            onClick={handleCreateNew}
            className="w-full py-3 bg-primary text-white rounded-xl font-medium"
          >
            {t('onboarding.generate_wallet')}
          </button>
        </div>
      </div>
    )
  }

  if (step === 'setPassword') {
    return (
      <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <button 
          onClick={() => setStep(privateKey ? 'create' : 'import')}
          className="text-xl mb-4 text-gray-800 dark:text-gray-200"
        >
          ←
        </button>
        
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">{t('onboarding.set_password')}</h2>
        
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('onboarding.password_description')}
          </p>
          
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">{t('onboarding.password')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('onboarding.password_placeholder')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">{t('onboarding.confirm_password')}</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('onboarding.confirm_password_placeholder')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
          
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('onboarding.password_requirement')}
          </p>
          
          {error && (
            <div className="text-error text-sm">{error}</div>
          )}
          
          <button
            onClick={handleSetPassword}
            className="w-full py-3 bg-primary text-white rounded-xl font-medium"
          >
            {t('onboarding.continue')}
          </button>
        </div>
      </div>
    )
  }
  
  // step === 'confirm'
  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <button 
        onClick={() => setStep('create')}
        className="text-xl mb-4 text-gray-800 dark:text-gray-200"
      >
        ←
      </button>
      
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">{t('onboarding.save_key_title')}</h2>
      
      <div className="space-y-4">
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-red-600 mb-2 flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {t('onboarding.important_notice')}
          </p>
          <p className="text-xs text-red-600">
            {t('onboarding.save_key_warning')}
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
          <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">{t('onboarding.your_address')}</label>
          <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg font-mono text-xs break-all text-gray-900 dark:text-gray-100">
            {newAddress}
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
          <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">{t('onboarding.your_private_key')}</label>
          <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg font-mono text-xs break-all text-gray-900 dark:text-gray-100">
            {privateKey}
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(privateKey)
              showToast(t('onboarding.key_copied'), 'success')
            }}
            className="mt-2 text-xs text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            {t('onboarding.copy_key')}
          </button>
        </div>
        
        <label className="flex items-start gap-2 cursor-pointer">
          <input 
            type="checkbox" 
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-1"
          />
          <span className="text-sm text-gray-900 dark:text-gray-100">
            {t('onboarding.confirm_saved')}
          </span>
        </label>
        
        {error && (
          <div className="text-error text-sm">{error}</div>
        )}
        
        <button
          onClick={handleConfirmPrivateKey}
          className="w-full py-3 bg-primary text-white rounded-xl font-medium"
        >
          {t('onboarding.continue')}
        </button>
      </div>
    </div>
  )
}
