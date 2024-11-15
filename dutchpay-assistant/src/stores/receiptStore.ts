import { defineStore } from 'pinia'

interface ReceiptState {
  totalAmount: number | null
  confidence: number
  extractedText: string
}

export const useReceiptStore = defineStore('receipt', {
  state: (): ReceiptState => ({
    totalAmount: null,
    confidence: 0,
    extractedText: ''
  }),
  
  actions: {
    setReceiptData(amount: number, confidence: number, text: string) {
      this.totalAmount = amount
      this.confidence = confidence
      this.extractedText = text
    },
    
    reset() {
      this.totalAmount = null
      this.confidence = 0
      this.extractedText = ''
    }
  }
})
