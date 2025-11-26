import { useRef, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ethers } from 'ethers'
import { useWalletStore } from '../../store/wallet'
import ConfirmDialog from './ConfirmDialog'

interface AccountMenuProps {
  onClose: () => void
}

export default function AccountMenu({ onClose }: AccountMenuProps) {
  const { t } = useTranslation()
  const { accounts, currentAccountId, switchAccount, renameAccount, deleteAccount, addAccount, showToast } = useWalletStore()
  const menuRef = useRef<HTMLDivElement>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteAccountId, setDeleteAccountId] = useState<string | null>(null)
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [renameAccountId, setRenameAccountId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [showOptionsMenu, setShowOptionsMenu] = useState<string | null>(null)
  const [showAddAccountDialog, setShowAddAccountDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importPrivateKey, setImportPrivateKey] = useState('')
  const [importError, setImportError] = useState('')

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // 如果正在显示任何对话框，不关闭
      if (showRenameDialog || showDeleteConfirm || showAddAccountDialog || showImportDialog) return
      
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose, showRenameDialog, showDeleteConfirm, showAddAccountDialog, showImportDialog])

  useEffect(() => {
    console.log('[AccountMenu] showImportDialog changed:', showImportDialog)
  }, [showImportDialog])

  useEffect(() => {
    console.log('[AccountMenu] showAddAccountDialog changed:', showAddAccountDialog)
  }, [showAddAccountDialog])

  const handleShowAddDialog = () => {
    setShowAddAccountDialog(true)
  }

  const handleCreateNewAccount = () => {
    const wallet = ethers.Wallet.createRandom()
    const accountNumber = accounts.length + 1
    addAccount(`Psy Account ${accountNumber}`, wallet.address, wallet.privateKey)
    showToast(t('account.account_added'), 'success')
    setShowAddAccountDialog(false)
    onClose()
  }

  const handleImportAccount = () => {
    setImportError('')
    
    try {
      const wallet = new ethers.Wallet(importPrivateKey.trim())
      const accountNumber = accounts.length + 1
      addAccount(`Imported Account ${accountNumber}`, wallet.address, wallet.privateKey)
      showToast(t('account.account_imported'), 'success')
      setImportPrivateKey('')
      setShowImportDialog(false)
      setShowAddAccountDialog(false)
      onClose()
    } catch (err) {
      setImportError('Invalid private key format')
    }
  }

  const handleSwitchAccount = (accountId: string) => {
    switchAccount(accountId)
    onClose()
  }

  const handleOpenRename = (accountId: string, currentName: string) => {
    setRenameAccountId(accountId)
    setNewName(currentName)
    setShowRenameDialog(true)
    setShowOptionsMenu(null)
  }

  const handleRename = () => {
    if (renameAccountId && newName.trim()) {
      renameAccount(renameAccountId, newName.trim())
      showToast(t('account.renamed'), 'success')
      setShowRenameDialog(false)
      setRenameAccountId(null)
      setNewName('')
    }
  }

  const handleOpenDelete = (accountId: string) => {
    setDeleteAccountId(accountId)
    setShowDeleteConfirm(true)
    setShowOptionsMenu(null)
  }

  const confirmDelete = () => {
    if (deleteAccountId) {
      console.log('[Delete] Before delete, accounts:', accounts.length, 'deleteAccountId:', deleteAccountId)
      const isLastAccount = accounts.length === 1
      
      // 执行删除
      deleteAccount(deleteAccountId)
      console.log('[Delete] After delete called')
      
      // 显示提示
      showToast(t('account.deleted'), 'success')
      
      // 清理状态
      setShowDeleteConfirm(false)
      setDeleteAccountId(null)
      
      // 关闭菜单
      setTimeout(() => {
        onClose()
      }, 100)
      
      // 如果删除的是最后一个账户，重新加载页面回到欢迎页
      if (isLastAccount) {
        setTimeout(() => {
          console.log('[Delete] Reloading page for last account')
          window.location.reload()
        }, 600)
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-black/20 z-50 flex items-start justify-center pt-16">
      <div 
        ref={menuRef}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-80 max-h-[500px] overflow-y-auto"
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{t('account.title')}</h3>
          <button 
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 账户列表 */}
        <div className="p-2 space-y-2">
          {accounts.map((account) => {
            const isCurrent = account.id === currentAccountId
            return (
              <div
                key={account.id}
                className={`rounded-lg p-3 cursor-pointer transition-colors ${
                  isCurrent
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 border-2 border-transparent'
                }`}
                onClick={() => handleSwitchAccount(account.id)}
              >
                <div className="flex items-start gap-3">
                  {/* 账户图标 */}
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                    Ψ
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-gray-100">{account.name}</span>
                      {isCurrent && (
                        <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="font-mono text-xs text-gray-600 dark:text-gray-400 truncate">
                      {account.address.slice(0, 10)}...{account.address.slice(-8)}
                    </div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">
                      {account.balance} USDC
                    </div>
                  </div>

                  {/* 更多选项按钮 */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowOptionsMenu(showOptionsMenu === account.id ? null : account.id)
                      }}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl font-bold leading-none p-1"
                    >
                      ⋮
                    </button>
                    
                    {/* 选项菜单 */}
                    {showOptionsMenu === account.id && (
                      <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenRename(account.id, account.name)
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-t-lg"
                        >
                          {t('account.rename')}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenDelete(account.id)
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-b-lg"
                        >
                          {t('account.delete')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* 添加账户按钮 */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleShowAddDialog}
            className="w-full px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors flex items-center justify-center gap-2 font-medium"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('account.add_account')}
          </button>
        </div>
      </div>
      
      {/* 删除确认对话框 */}
      {showDeleteConfirm && (
        <ConfirmDialog
          title={t('account.confirm_delete_title')}
          message={t('account.confirm_delete')}
          confirmText={t('account.delete')}
          cancelText={t('common.cancel')}
          type="danger"
          onConfirm={confirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
      
      {/* 重命名对话框 */}
      {showRenameDialog && (
        <div className="fixed inset-0 bg-black/50 z-[150] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('account.rename')}
            </h3>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 mb-4"
              placeholder={t('account.enter_name')}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename()
                if (e.key === 'Escape') {
                  setShowRenameDialog(false)
                  setNewName('')
                }
              }}
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRenameDialog(false)
                  setNewName('')
                }}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleRename}
                disabled={!newName.trim()}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 添加账户选择对话框 */}
      {showAddAccountDialog && (
        <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('account.add_account')}
            </h3>
            <div className="space-y-3">
              <button
                onClick={handleCreateNewAccount}
                className="w-full px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t('account.create_account')}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  console.log('[AccountMenu] Opening import dialog')
                  setShowAddAccountDialog(false)
                  setShowImportDialog(true)
                }}
                className="w-full px-4 py-3 border-2 border-primary text-primary rounded-lg hover:bg-primary/10 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {t('account.import_account')}
              </button>
              <button
                onClick={() => setShowAddAccountDialog(false)}
                className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 导入账户对话框 */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('account.import_title')}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('account.private_key')}
                </label>
                <textarea
                  value={importPrivateKey}
                  onChange={(e) => setImportPrivateKey(e.target.value)}
                  placeholder={t('account.private_key_placeholder')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono text-sm h-24"
                  autoFocus
                />
              </div>
              
              {importError && (
                <div className="text-red-600 dark:text-red-400 text-sm">
                  {t('account.invalid_private_key')}
                </div>
              )}
              
              <p className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {t('account.demo_warning')}
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowImportDialog(false)
                    setImportPrivateKey('')
                    setImportError('')
                    setShowAddAccountDialog(true)
                  }}
                  className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleImportAccount}
                  disabled={!importPrivateKey.trim()}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {t('account.import_button')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
