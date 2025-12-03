// 输入验证工具

import { ethers } from 'ethers'

/**
 * 验证以太坊地址
 */
export function isValidAddress(address: string): boolean {
  try {
    return ethers.isAddress(address)
  } catch {
    return false
  }
}

/**
 * 验证私钥格式
 */
export function isValidPrivateKey(privateKey: string): boolean {
  try {
    new ethers.Wallet(privateKey.trim())
    return true
  } catch {
    return false
  }
}

/**
 * 验证金额
 */
export function isValidAmount(amount: string, balance: string): { valid: boolean; error?: string } {
  const numAmount = parseFloat(amount)
  const numBalance = parseFloat(balance)
  
  if (isNaN(numAmount) || numAmount <= 0) {
    return { valid: false, error: 'Invalid amount' }
  }
  
  if (numAmount > numBalance) {
    return { valid: false, error: 'Insufficient balance' }
  }
  
  return { valid: true }
}

/**
 * 验证密码强度
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters' }
  }
  
  // 可以添加更多规则，如必须包含数字、特殊字符等
  // if (!/\d/.test(password)) {
  //   return { valid: false, error: 'Password must contain at least one number' }
  // }
  
  return { valid: true }
}

/**
 * 格式化地址显示（省略中间部分）
 */
export function formatAddress(address: string, startChars = 6, endChars = 4): string {
  if (!address) return ''
  if (address.length <= startChars + endChars) return address
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`
}

/**
 * 格式化金额显示
 */
export function formatAmount(amount: string | number, decimals = 4): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return '0'
  
  // 如果小于 0.0001，显示科学计数法
  if (num > 0 && num < 0.0001) {
    return num.toExponential(2)
  }
  
  return num.toFixed(decimals)
}
