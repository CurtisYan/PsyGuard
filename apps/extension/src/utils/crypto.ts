// 加密工具
// 使用浏览器原生 Crypto API 进行加密

/**
 * 从密码派生加密密钥
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const passwordBuffer = encoder.encode(password)
  
  // 导入密码作为密钥材料
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  )
  
  // 使用 PBKDF2 派生密钥
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: 100000, // 100k iterations
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * 加密私钥
 * @param privateKey 明文私钥
 * @param password 用户密码
 * @returns Base64 编码的加密数据 (salt:iv:ciphertext)
 */
export async function encryptPrivateKey(privateKey: string, password: string): Promise<string> {
  // 生成随机 salt 和 iv
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  
  // 派生加密密钥
  const key = await deriveKey(password, salt)
  
  // 加密私钥
  const encoder = new TextEncoder()
  const data = encoder.encode(privateKey)
  
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  )
  
  // 组合 salt:iv:ciphertext 并转为 Base64
  const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength)
  combined.set(salt, 0)
  combined.set(iv, salt.length)
  combined.set(new Uint8Array(ciphertext), salt.length + iv.length)
  
  return btoa(String.fromCharCode(...combined))
}

/**
 * 解密私钥
 * @param encryptedData Base64 编码的加密数据
 * @param password 用户密码
 * @returns 明文私钥
 */
export async function decryptPrivateKey(encryptedData: string, password: string): Promise<string> {
  try {
    // 从 Base64 解码
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0))
    
    // 提取 salt, iv, ciphertext
    const salt = combined.slice(0, 16)
    const iv = combined.slice(16, 28)
    const ciphertext = combined.slice(28)
    
    // 派生解密密钥
    const key = await deriveKey(password, salt)
    
    // 解密
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    )
    
    const decoder = new TextDecoder()
    return decoder.decode(decrypted)
  } catch (error) {
    throw new Error('Decryption failed - wrong password or corrupted data')
  }
}

/**
 * 生成密码哈希用于验证
 * @param password 密码
 * @returns Base64 编码的哈希值
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
}

/**
 * 验证密码
 * @param password 输入的密码
 * @param storedHash 存储的哈希值
 * @returns 是否匹配
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const inputHash = await hashPassword(password)
  return inputHash === storedHash
}
