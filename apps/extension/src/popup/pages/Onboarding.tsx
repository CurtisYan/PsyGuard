import { useState } from 'react'
import { ethers } from 'ethers'
import { useTranslation } from 'react-i18next'
import { useWalletStore } from '../../store/wallet'

interface OnboardingProps {
  onComplete: () => void
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const { t } = useTranslation()
  const { initialize, showToast } = useWalletStore()
  const [step, setStep] = useState<'welcome' | 'import' | 'create' | 'confirm'>('welcome')
  const [privateKey, setPrivateKey] = useState('')
  const [newAddress, setNewAddress] = useState('')
  const [error, setError] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  const handleImport = () => {
    setError('')
    
    try {
      // 使用 ethers.js 验证并导入私钥
      const wallet = new ethers.Wallet(privateKey.trim())
      initialize(wallet.address, wallet.privateKey)
      onComplete()
    } catch (err) {
      setError('Invalid private key format')
    }
  }

  const handleCreateNew = () => {
    // 使用 ethers.js 生成真实钱包
    const wallet = ethers.Wallet.createRandom()
    
    setPrivateKey(wallet.privateKey)
    setNewAddress(wallet.address)
    setStep('confirm')
  }
  
  const handleConfirmPrivateKey = () => {
    if (!confirmed) {
      setError('请确认已保存私钥')
      return
    }
    
    initialize(newAddress, privateKey)
    onComplete()
  }

  if (step === 'welcome') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background-light p-6">
        <div className="text-6xl mb-4">ψ</div>
        <h1 className="text-2xl font-bold text-text-primary mb-2">欢迎使用 Psy Wallet</h1>
        <p className="text-text-secondary text-center mb-8">
          ZK-Native 钱包，保护您的隐私
        </p>
        
        <div className="space-y-3 w-full max-w-sm">
          <button
            onClick={() => setStep('create')}
            className="w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-colors"
          >
            创建新钱包
          </button>
          
          <button
            onClick={() => setStep('import')}
            className="w-full py-3 border-2 border-primary text-primary rounded-xl font-medium hover:bg-primary-light transition-colors"
          >
            导入现有钱包
          </button>
        </div>
      </div>
    )
  }

  if (step === 'import') {
    return (
      <div className="flex flex-col h-screen bg-background-light p-6">
        <button 
          onClick={() => setStep('welcome')}
          className="text-xl mb-4"
        >
          ←
        </button>
        
        <h2 className="text-xl font-bold text-text-primary mb-4">导入钱包</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">私钥</label>
            <textarea
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              placeholder="输入您的私钥（0x...）"
              className="w-full px-3 py-2 border rounded-lg h-24 font-mono text-sm"
            />
          </div>
          
          {error && (
            <div className="text-error text-sm">{error}</div>
          )}
          
          <button
            onClick={handleImport}
            className="w-full py-3 bg-primary text-white rounded-xl font-medium"
          >
            导入
          </button>
          
          <p className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            演示版本：请勿使用真实私钥
          </p>
        </div>
      </div>
    )
  }

  if (step === 'create') {
    return (
      <div className="flex flex-col h-screen bg-background-light p-6">
        <button 
          onClick={() => setStep('welcome')}
          className="text-xl mb-4"
        >
          ←
        </button>
        
        <h2 className="text-xl font-bold text-text-primary mb-4">创建新钱包</h2>
        
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-4">
            <p className="text-sm text-text-secondary mb-4">
              我们将为您生成一个新的钱包地址和私钥。
            </p>
            <p className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              请妥善保管您的私钥，一旦丢失无法恢复！
            </p>
          </div>
          
          <button
            onClick={handleCreateNew}
            className="w-full py-3 bg-primary text-white rounded-xl font-medium"
          >
            生成钱包
          </button>
        </div>
      </div>
    )
  }
  
  // step === 'confirm'
  return (
    <div className="flex flex-col h-screen bg-background-light p-6">
      <button 
        onClick={() => setStep('create')}
        className="text-xl mb-4"
      >
        ←
      </button>
      
      <h2 className="text-xl font-bold text-text-primary mb-4">保存私钥</h2>
      
      <div className="space-y-4">
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-red-600 mb-2 flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            重要提示
          </p>
          <p className="text-xs text-red-600">
            请将以下私钥保存在安全的地方。一旦丢失，您将无法恢复钱包！
          </p>
        </div>
        
        <div className="bg-white rounded-xl p-4">
          <label className="block text-sm font-medium mb-2">您的地址</label>
          <div className="px-3 py-2 bg-gray-50 rounded-lg font-mono text-xs break-all">
            {newAddress}
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-4">
          <label className="block text-sm font-medium mb-2">您的私钥</label>
          <div className="px-3 py-2 bg-gray-50 rounded-lg font-mono text-xs break-all">
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
            复制私钥
          </button>
        </div>
        
        <label className="flex items-start gap-2 cursor-pointer">
          <input 
            type="checkbox" 
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-1"
          />
          <span className="text-sm text-text-primary">
            我已将私钥保存在安全的地方，并理解一旦丢失无法找回
          </span>
        </label>
        
        {error && (
          <div className="text-error text-sm">{error}</div>
        )}
        
        <button
          onClick={handleConfirmPrivateKey}
          className="w-full py-3 bg-primary text-white rounded-xl font-medium"
        >
          我已保存，继续
        </button>
      </div>
    </div>
  )
}
