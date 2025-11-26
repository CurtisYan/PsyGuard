// Background script for Chrome extension

console.log('Psy Wallet background script loaded')

// Listen for extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Psy Wallet installed')
})

// Message handler
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  console.log('Message received:', request)
  
  if (request.type === 'GET_BALANCE') {
    // TODO: Fetch balance from backend
    sendResponse({ balance: '1234.56', symbol: 'USDC' })
  }
  
  if (request.type === 'START_SESSION') {
    // TODO: Call backend API
    sendResponse({ sessionId: 'session_123', success: true })
  }
  
  return true
})
