// WASM 模块加载器
let wasmModule: any = null

export async function initWasm() {
  if (wasmModule) {
    return wasmModule
  }

  try {
    // 动态导入 WASM 模块
    const wasm = await import('../../public/wasm/psyguard_wasm.js')
    await wasm.default() // 初始化 WASM
    wasmModule = wasm
    console.log('WASM 版本:', wasm.version())
    console.log('连接测试:', wasm.test_connection())
    return wasm
  } catch (error) {
    console.error('WASM 加载失败:', error)
    throw new Error('无法加载 WASM 模块，请确保已构建 WASM')
  }
}

export function getWasm() {
  if (!wasmModule) {
    throw new Error('WASM 模块未初始化，请先调用 initWasm()')
  }
  return wasmModule
}

export async function createSession(userId: string) {
  const wasm = getWasm()
  return new wasm.WasmUpsSession(userId)
}
