/**
 * GUTA Sync - GUTA 聚合同步模块
 * 负责与 Aggregator 通信，提交 UPS 并同步全局根
 */

import { UPS, GutaRoot, SubmitResponse, CheckUpsResponse } from './types'

// Aggregator API 端点
// Demo 模式使用 Mock API
// 真实模式替换为实际的 Aggregator 地址
const AGGREGATOR_BASE_URL = import.meta.env.VITE_AGGREGATOR_URL || 'http://localhost:3000/api'

// 读取 Demo 模式开关（优先从 storage 读取，其次使用环境变量/开发模式）
async function isDemoModeEnabled(): Promise<boolean> {
  try {
    const result = await chrome.storage.local.get('demo_mode')
    if (typeof result.demo_mode === 'boolean') return result.demo_mode
  } catch (_) {
    // ignore
  }
  return import.meta.env.VITE_DEMO_MODE === 'true' || import.meta.env.MODE === 'development'
}

/**
 * 获取最新的 GUTA 根
 */
export async function fetchLatestGutaRoot(): Promise<GutaRoot> {
  if (await isDemoModeEnabled()) {
    // Demo 模式：返回 Mock 数据
    return {
      root: '0x' + '0'.repeat(64),
      blockNumber: Math.floor(Date.now() / 1000),
      timestamp: new Date().toISOString(),
      totalUsers: 1000
    }
  }

  try {
    const response = await fetch(`${AGGREGATOR_BASE_URL}/guta/latest`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error('[GUTA Sync] Failed to fetch latest root:', error)
    throw error
  }
}

/**
 * 提交 UPS 到 Aggregator
 */
export async function submitUPS(ups: UPS): Promise<SubmitResponse> {
  if (await isDemoModeEnabled()) {
    // Demo 模式：模拟成功提交
    console.log('[GUTA Sync] Demo mode: Simulating UPS submission', ups)
    return {
      status: 'ok',
      id: `ups_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      acceptedRoot: ups.stateRoot
    }
  }

  try {
    const response = await fetch(`${AGGREGATOR_BASE_URL}/guta/submitUps`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(ups)
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('[GUTA Sync] Failed to submit UPS:', error)
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * 检查 UPS 是否已包含在 GUTA 根中
 */
export async function isUPSInRoot(ups: UPS): Promise<boolean> {
  if (await isDemoModeEnabled()) {
    // Demo 模式：总是返回 true（模拟已同步）
    return true
  }

  try {
    const response = await fetch(`${AGGREGATOR_BASE_URL}/guta/checkUps/${ups.userID}_${ups.nonce}`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const result: CheckUpsResponse = await response.json()
    return result.found
  } catch (error) {
    console.error('[GUTA Sync] Failed to check UPS:', error)
    return false
  }
}

/**
 * 检查用户是否已同步
 */
export async function isSynced(userID: string): Promise<boolean> {
  if (await isDemoModeEnabled()) {
    // Demo 模式：总是返回 true
    return true
  }

  try {
    const response = await fetch(`${AGGREGATOR_BASE_URL}/guta/syncStatus/${userID}`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const result = await response.json()
    return result.synced === true
  } catch (error) {
    console.error('[GUTA Sync] Failed to check sync status:', error)
    return false
  }
}

/**
 * 批量提交多个 UPS（用于恢复或批量操作）
 */
export async function submitBatchUPS(upsList: UPS[]): Promise<SubmitResponse[]> {
  if (await isDemoModeEnabled()) {
    // Demo 模式：模拟批量成功
    return upsList.map((ups, index) => ({
      status: 'ok' as const,
      id: `ups_batch_${Date.now()}_${index}`,
      acceptedRoot: ups.stateRoot
    }))
  }

  // 顺序提交（真实实现可能支持批量 API）
  const results: SubmitResponse[] = []
  for (const ups of upsList) {
    const result = await submitUPS(ups)
    results.push(result)
    
    // 如果有一个失败，可以选择继续或中止
    if (result.status === 'error') {
      console.warn('[GUTA Sync] UPS submission failed:', result.message)
    }
  }
  
  return results
}

/**
 * 获取用户的同步统计信息
 */
export async function getSyncStats(userID: string): Promise<{
  totalUPS: number
  syncedUPS: number
  pendingUPS: number
  lastSyncedAt?: string
}> {
  if (await isDemoModeEnabled()) {
    return {
      totalUPS: 10,
      syncedUPS: 10,
      pendingUPS: 0,
      lastSyncedAt: new Date().toISOString()
    }
  }

  try {
    const response = await fetch(`${AGGREGATOR_BASE_URL}/guta/stats/${userID}`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error('[GUTA Sync] Failed to fetch sync stats:', error)
    return {
      totalUPS: 0,
      syncedUPS: 0,
      pendingUPS: 0
    }
  }
}
