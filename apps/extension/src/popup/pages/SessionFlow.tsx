import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface SessionFlowProps {
  onBack: () => void
}

export default function SessionFlow({ onBack }: SessionFlowProps) {
  const { t } = useTranslation()
  const [step, setStep] = useState<'start' | 'add' | 'summary'>('start')

  return (
    <div className="flex flex-col h-screen bg-background-light">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
        <button onClick={onBack} className="text-xl">←</button>
        <h2 className="font-semibold">{t('session.start')}</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        {step === 'start' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl p-4">
              <h3 className="font-medium mb-2">Current Network</h3>
              <p className="text-sm text-text-secondary">Sepolia Testnet</p>
              <p className="text-sm text-text-secondary">Block: #4,521,234</p>
            </div>
            
            <div className="bg-white rounded-xl p-4">
              <h3 className="font-medium mb-2">SDKey Policy</h3>
              <ul className="text-sm text-text-secondary space-y-1">
                <li>├ Daily Limit: 100 USDC</li>
                <li>├ Time: 08:00 - 20:00 UTC</li>
                <li>└ Multi-sig: Off</li>
              </ul>
              <button className="text-primary text-sm mt-2">Edit Policy</button>
            </div>
            
            <button 
              onClick={() => setStep('add')}
              className="w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-colors"
            >
              Initialize Session
            </button>
          </div>
        )}
        
        {step === 'add' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl p-4">
              <p className="text-sm text-success mb-4">✓ Session initialized</p>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Transaction Type</label>
                  <select className="w-full px-3 py-2 border rounded-lg">
                    <option>Transfer Intent</option>
                    <option>Claim From</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Recipient</label>
                  <input 
                    type="text" 
                    placeholder="0x... or ENS"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Token</label>
                  <select className="w-full px-3 py-2 border rounded-lg">
                    <option>USDC</option>
                    <option>ETH</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Amount</label>
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      placeholder="0.00"
                      className="flex-1 px-3 py-2 border rounded-lg"
                    />
                    <button className="px-4 py-2 border rounded-lg">Max</button>
                  </div>
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => setStep('summary')}
              className="w-full py-3 bg-primary text-white rounded-xl font-medium"
            >
              {t('session.add_transaction')}
            </button>
          </div>
        )}
        
        {step === 'summary' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl p-4">
              <h3 className="font-medium mb-3">Transactions (2)</h3>
              <ul className="text-sm space-y-2">
                <li>├ Transfer 100 USDC → 0xABC...</li>
                <li>└ Claim 25 USDC ← 0xGHI...</li>
              </ul>
            </div>
            
            <div className="bg-white rounded-xl p-4">
              <h3 className="font-medium mb-3">State Changes</h3>
              <div className="text-sm text-text-secondary space-y-1">
                <p>Nonce: 41 → 42</p>
                <p>UCON Root: 0x3f2a... → 0x9d4e...</p>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-4">
              <h3 className="font-medium mb-3">End Cap Status</h3>
              <div className="text-sm space-y-1">
                <p className="text-success">✓ Proof verified</p>
                <p className="text-success">✓ Policy constraints met</p>
              </div>
            </div>
            
            <button 
              onClick={onBack}
              className="w-full py-3 bg-primary text-white rounded-xl font-medium"
            >
              Submit to Realm
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
