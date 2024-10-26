<template>
  <div class="receipt-scanner">
    <div class="upload-section">
      <input
        type="file"
        @change="onFileChange"
        accept="image/*"
        ref="fileInput"
        class="hidden"
      />
      <button v-if="!imageUrl" @click="triggerFileInput" class="upload-btn">
        영수증 이미지 업로드
      </button>
    </div>

    <div v-if="imageUrl" class="preview-section">
      <button @click="extractText" :disabled="isLoading" class="extract-btn">
        텍스트 추출
      </button>
      <div v-if="isLoading" class="loading">텍스트 추출 중...</div>
      <div v-if="extractedText" class="result-section">
        <h3>추출된 정보</h3>
        <div class="extracted-data">
          <p>총액: {{ parsedData.totalAmount }}원</p>
          <p>부가세: {{ parsedData.tax }}원</p>
          <p>날짜: {{ parsedData.date }}</p>
        </div>
      </div>
      <br />
      <img :src="imageUrl" alt="영수증 이미지" class="preview-image" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
/**
 * 참고: https://github.com/naptha/tesseract.js#tesseractjs
 * 1. createWorker
 * tesseract.js의 핵심 함수로써, OCR 작업을 수행하는 워커(Worker) 인스턴스를 생성
 * 2, Worker
 * TypeScript 타입 정의를 위한 인터페이스
 */
import { createWorker, Worker } from 'tesseract.js'

interface ParsedData {
  totalAmount: string
  tax: string
  date: string
}

const fileInput = ref<HTMLInputElement | null>(null)
const imageUrl = ref<string | null>(null)
const extractedText = ref('')
const isLoading = ref(false)
const parsedData = ref<ParsedData>({
  totalAmount: '0',
  tax: '0',
  date: '',
})
let worker: Worker | null = null

/**
 * 이미지 업로드 트리거
 */
const triggerFileInput = () => {
  fileInput.value?.click()
}

/**
 * 이미지 업로드
 * @param e
 */
const onFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    preprocessImage(file)
  }
}

/**
 * 이미지 전처리
 * @param file
 */
const preprocessImage = async (file: File) => {
  try {
    const image = new Image()
    image.src = URL.createObjectURL(file)

    image.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // 이미지 크기 조정
      const MAX_WIDTH = 1000
      let width = image.width
      let height = image.height

      if (width > MAX_WIDTH) {
        height = (MAX_WIDTH * height) / width
        width = MAX_WIDTH
      }

      canvas.width = width
      canvas.height = height

      // 이미지 품질 개선
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, width, height)
      ctx.drawImage(image, 0, 0, width, height)

      // 대비 향상
      ctx.filter = 'contrast(1.2)'
      ctx.drawImage(canvas, 0, 0)

      imageUrl.value = canvas.toDataURL('image/jpeg', 0.9)
    }
  } catch (error) {
    console.error('이미지 전처리 실패:', error)
  }
}

/**
 * 텍스트 추출
 */
const extractText = async () => {
  if (!imageUrl.value || isLoading.value) return

  isLoading.value = true
  try {
    const workerInstance = await initializeWorker()
    const {
      data: { text },
    } = await workerInstance.recognize(imageUrl.value)
    extractedText.value = text
    parseReceiptData(text)
  } catch (error) {
    console.error('텍스트 추출 실패:', error)
  } finally {
    isLoading.value = false
  }
}

/**
 * Tesseract.js의 워커(Worker)를 초기화
 */
const initializeWorker = async (): Promise<Worker> => {
  if (!worker) {
    worker = await createWorker('kor+eng')
    await worker.loadLanguage('kor+eng')
    await worker.initialize('kor+eng')
  }
  return worker
}

/**
 * 필요 내용만 추출
 * @param text
 */
const parseReceiptData = (text: string) => {
  // 금액 패턴을 더 유연하게 수정
  const totalAmountPatterns = [
    /합계\s*금?\s*액\s*:?\s*(\d{1,3}(,\d{3})*)/,
    /합\s*계\s*:?\s*(\d{1,3}(,\d{3})*)/,
    /합계\s*:?\s*(\d{1,3}(,\d{3})*)/,
    /합계금액\s*:?\s*(\d{1,3}(,\d{3})*)/,
    /Total\s*:?\s*(\d{1,3}(,\d{3})*)/i,
  ]

  // 부가세 패턴도 더 유연하게 수정
  const taxPatterns = [
    /부\s*가\s*세\s*액?\s*:?\s*(\d{1,3}(,\d{3})*)/,
    /부가세\s*:?\s*(\d{1,3}(,\d{3})*)/,
    /VAT\s*:?\s*(\d{1,3}(,\d{3})*)/i,
  ]

  // 날짜 패턴도 더 다양한 형식 지원
  const datePatterns = [
    /(\d{2,4}[-/]\d{1,2}[-/]\d{1,2})/,
    /(\d{4}년\s*\d{1,2}월\s*\d{1,2}일)/,
    /(\d{2}\/\d{2}\/\d{2,4})/,
  ]

  let totalAmount = '0'
  let tax = '0'
  let date = ''

  // 각 패턴을 순차적으로 시도
  for (const pattern of totalAmountPatterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      totalAmount = match[1]
      break
    }
  }

  for (const pattern of taxPatterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      tax = match[1]
      break
    }
  }

  for (const pattern of datePatterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      date = match[1]
      break
    }
  }

  parsedData.value = {
    totalAmount,
    tax,
    date,
  }
}

onUnmounted(() => {
  if (worker) {
    worker.terminate()
  }
})
</script>

<style scoped>
.receipt-scanner {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.upload-section {
  margin-bottom: 20px;
}

.hidden {
  display: none;
}

.preview-image {
  max-width: 100%;
  margin: 20px 0;
}

.loading {
  text-align: center;
  padding: 20px;
  color: #666;
}

button {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  background-color: #4caf50;
  color: white;
  cursor: pointer;
}

button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.result-section {
  margin-top: 20px;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 4px;
}
</style>
