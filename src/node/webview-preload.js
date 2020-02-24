/* global $ */

const ipcRenderer = require('electron').ipcRenderer

const ORIGIN_WHITELIST = [
  'https://cdn.plaid.com',
  'https://sandbox-portal.anchorusd.com',
  'https://portal.anchorusd.com'
]

window.parent.addEventListener('message', function (event) {
  if (!ORIGIN_WHITELIST.includes(event.origin)) return
  const message = typeof event.data === 'string' ? event.data : JSON.stringify(event.data)
  ipcRenderer.sendToHost('message', message)
})

ipcRenderer.on('js:getSuccessText', function () {
  // see: https://stackoverflow.com/questions/3442394/using-text-to-retrieve-only-text-not-nested-in-child-tags
  const alertText = $('.cart-page-container .alert a')
    .clone() // clone the element
    .children() // select all the children
    .remove() // remove all the children
    .end() // again go back to selected element
    .text()

  ipcRenderer.sendToHost('js:getSuccessText', alertText)
})

ipcRenderer.on('js:isPaymentMethodLoading', function () {
  const $paymentMethodBtn = $('#add-payment-method .payment-method button')
  const paymentMethodErrors = $('#payment-method-errors').text().trim()

  if (!$paymentMethodBtn.length || paymentMethodErrors !== '') {
    ipcRenderer.sendToHost('js:isPaymentMethodLoading', false)
    return
  }

  ipcRenderer.sendToHost('js:isPaymentMethodLoading', true)
})

ipcRenderer.on('js:hideAnchorAmount', function () {
  const $anchorAmount = $('.cart-page-container')
  $anchorAmount.hide()
})

ipcRenderer.on('js:showAnchorAmount', function () {
  const $anchorAmount = $('.cart-page-container')
  $anchorAmount.show()
})

ipcRenderer.on('js:addErrorListener', function () {
  const target = document.querySelector('#deposit-form #purchase-errors')

  const observer = new MutationObserver(function (_mutations) {
    const error = $('#deposit-form #purchase-errors').text()
    if (error.length) {
      ipcRenderer.sendToHost('js:depositError', error)
    }
  })

  const config = { attributes: true, childList: true, subtree: true }
  observer.observe(target, config)
})
