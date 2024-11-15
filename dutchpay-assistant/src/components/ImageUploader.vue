<template>
  <div class="image-uploader">
    <!-- 업로드 가이드 섹션 -->
    <div class="upload-guide">
      <h3>영수증 촬영/업로드 가이드</h3>
      <p>더 정확한 인식을 위해 아래 가이드를 참고해주세요:</p>
      <ul>
        <li>영수증이 프레임 안에 완전히 들어오게 해주세요</li>
        <li>가능한 정면에서 촬영해주세요</li>
        <li>그림자가 생기지 않도록 해주세요</li>
      </ul>
    </div>

    <!-- 파일 업로드 영역 -->
    <div 
      class="upload-area"
      @dragover.prevent
      @drop.prevent="handleDrop"
    >
      <div v-if="!previewUrl" class="upload-placeholder">
        <input
          type="file"
          ref="fileInput"
          accept="image/*"
          @change="handleFileSelect"
          class="file-input"
        />
        
        <div class="upload-buttons">
          <button @click="triggerFileInput" class="upload-button">
            사진 업로드
          </button>
          <button 
            v-if="isMobile && hasCamera" 
            @click="startCamera" 
            class="camera-button"
          >
            카메라로 촬영
          </button>
        </div>
      </div>

      <!-- 미리보기 영역 -->
      <div v-else class="preview-container">
        <img :src="previewUrl" alt="Preview" class="preview-image" />
        <div class="preview-actions">
          <button @click="processImage" :disabled="isProcessing" class="process-button">
            {{ isProcessing ? '처리중...' : '텍스트 추출하기' }}
          </button>
          <button @click="resetImage" class="reupload-button">
            다시 업로드
          </button>
        </div>
      </div>
    </div>

    <!-- 카메라 뷰 영역 -->
    <div v-if="showCamera" class="camera-view">
      <video ref="videoElement" autoplay playsinline></video>
      <button @click="captureImage">촬영하기</button>
      <button @click="stopCamera">취소</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useReceiptStore } from '../stores/receiptStore'
/**
 * 참고: https://github.com/naptha/tesseract.js#tesseractjs
 * 1. createWorker
 * tesseract.js의 핵심 함수로써, OCR 작업을 수행하는 워커(Worker) 인스턴스를 생성
 * 2, Worker
 * TypeScript 타입 정의를 위한 인터페이스
 */
import { createWorker } from 'tesseract.js'

const router = useRouter()
const receiptStore = useReceiptStore()

// 상태 관리
const fileInput = ref<HTMLInputElement | null>(null)
const videoElement = ref<HTMLVideoElement | null>(null)
const previewUrl = ref<string>('')
const showCamera = ref(false)
const isProcessing = ref(false)
const isMobile = ref(false)
const hasCamera = ref(false)

// 카메라 스트림 저장
let mediaStream: MediaStream | null = null

onMounted(() => {
  //모바일 체크
  isMobile.value = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )
  checkCamera()
})

/**
 * 카메라 사용 가능 여부 체크
 */
const checkCamera = async () => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    hasCamera.value = devices.some(device => device.kind === 'videoinput')
  } catch (error) {
    console.error('카메라 체크 중 에러:', error)
    hasCamera.value = false
  }
}

/**
 * 파일 입력 트리거
 */
const triggerFileInput = () => {
  fileInput.value?.click()
}

/**
 * 파일 선택 처리
 * @param event 
 */
const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    const file = target.files[0]
    handleImage(file)
  }
}

/**
 * 드래그 앤 드롭 처리
 * @param event 
 */
const handleDrop = (event: DragEvent) => {
  const files = event.dataTransfer?.files
  if (files && files[0]) {
    handleImage(files[0])
  }
}

/**
 * 이미지 처리
 * @param file
 */
const handleImage = (file: File) => {
  if (!file.type.startsWith('image/')) {
    alert('이미지 파일만 업로드 가능합니다.')
    return
  }
  previewUrl.value = URL.createObjectURL(file)
}

/**
 * 카메라 시작
 */
const startCamera = async () => {
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    })
    if (videoElement.value) {
      videoElement.value.srcObject = mediaStream
      showCamera.value = true
    }
  } catch (error) {
    console.error('카메라 시작 중 에러:', error)
    alert('카메라를 시작할 수 없습니다.')
  }
}

/**
 * 카메라 정지
 */
const stopCamera = () => {
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop())
    mediaStream = null
  }
  showCamera.value = false
}
/**
 * 이미지 캡처
 */
const captureImage = () => {
  if (!videoElement.value) return

  const canvas = document.createElement('canvas')
  canvas.width = videoElement.value.videoWidth
  canvas.height = videoElement.value.videoHeight
  
  const context = canvas.getContext('2d')
  if (context) {
    context.drawImage(videoElement.value, 0, 0, canvas.width, canvas.height)
    previewUrl.value = canvas.toDataURL('image/jpeg')
    stopCamera()
  }
}

/**
 * 금액 추출
 * @param text OCR로 추출된 텍스트
 * @returns 추출된 최대 금액
 */
 const extractAmount = (text: string): number => {
  // 금액 관련 키워드 (오인식 케이스 포함)
  const amountKeywords = [
    '금액',
    '합계',
    '함계', // OCR 오인식 케이스
    '총액',
    '승인',
    '결제',
    '판매',
    'Sub Total',  // 영어로 표기된 경우
    '소계',
    '받은 돈',
    '결제금액',
    '청구금액',
    '최종금액',
    '할인후금액',
    '과세금액',
    '면세금액',
    '부가세'
  ]

  // 금액이 아닌 것으로 예상되는 패턴
  const excludePatterns = [
    /\d{2,4}-\d{2,4}-\d{2,4}/,    // 전화번호, 카드번호 패턴
    /\d{4}-\d{2}-\d{2}/,          // 날짜 패턴
    /\d{3}-\d{2}-\d{5}/,          // 사업자번호 패턴
    /^\d{8,}$/,                    // 8자리 이상의 긴 숫자
    /^\d{1,2}$/,                   // 1-2자리 숫자 (수량 등)
    /\d{2}:\d{2}(?::\d{2})?/,     // 시간 패턴 (15:30 또는 15:30:00)
    /\d{6}-\d{2}-\d{6}/,          // 사업자등록번호 패턴
    /주문번호.*\d+/,               // 주문번호
    /\d+개/,                       // 수량 표시
    /^\d{4}년/,                    // 연도 표시
    /가맹점\s*번호.*\d+/           // 가맹점 번호
  ]

  // 숫자를 정제하는 헬퍼 함수
  const cleanNumber = (str: string): number => {
    // 숫자와 쉼표만 추출
    const cleaned = str.replace(/[^0-9,\.]/g, '')
    
    // 소수점이 있는 경우 처리
    if (cleaned.includes('.')) {
      const parts = cleaned.split('.')
      if (parts[1].match(/^0+$/)) {
        return parseInt(parts[0].replace(/,/g, '') + parts[1])
      }
    }
    
    // 끝이 쉼표나 점으로 끝나는 경우
    if (cleaned.endsWith(',') || cleaned.endsWith('.')) {
      return parseInt(cleaned.replace(/[,\.]/g, '') + '000')
    }
    
    const number = parseInt(cleaned.replace(/,/g, ''))
    
    // 1000 미만의 숫자가 나온 경우, 이전 라인들의 숫자들을 확인
    if (number < 1000) {
      const lines = text.split('\n')
      const currentLineIndex = lines.findIndex(line => line.includes(str))
      if (currentLineIndex > 0) {
        // 이전 3개 라인 내에서 숫자 찾기
        for (let i = 1; i <= 3; i++) {
          if (currentLineIndex - i >= 0) {
            const prevLine = lines[currentLineIndex - i]
            const prevNumbers = prevLine.match(/[\d,\.]{3,}/g)
            if (prevNumbers) {
              const lastPrevNumber = parseInt(prevNumbers[prevNumbers.length - 1].replace(/[,\.]/g, ''))
              if (lastPrevNumber >= 1000) {
                // 이전 라인의 천단위 숫자를 현재 숫자의 천단위로 사용
                return lastPrevNumber - (lastPrevNumber % 1000) + number
              }
            }
          }
        }
      }
    }
    
    return number
  }

  const amounts: number[] = []
  const amountSources: string[] = []

  // 각 줄별로 처리
  const lines = text.split('\n').map(line => line.trim())
  
  // 명확한 금액 키워드가 있는 라인 처리
  lines.forEach((line) => {
    if (amountKeywords.some(keyword => line.includes(keyword))) {
      // 금액 패턴 매칭
      const matches = line.match(/[\d,\.]{1,}/g) // 1자리 숫자부터 매칭
      if (matches) {
        const number = cleanNumber(matches[matches.length - 1]) // 라인의 마지막 숫자 사용
        if (!isNaN(number) && number > 0 && number < 10000000 &&
            !excludePatterns.some(pattern => pattern.test(String(number)))) {
          amounts.push(number)
          amountSources.push(line)
        }
      }
    }
  })

  // 디버깅을 위한 상세 로그
  console.log('=== 금액 추출 결과 ===')
  amounts.forEach((amount, index) => {
    console.log(`${amount.toLocaleString()}원 (출처: ${amountSources[index]})`)
  })
  console.log('=====================')
  
  return amounts.length > 0 ? Math.max(...amounts) : 0
}

/**
 * 이미지 처리 (Tesseract)
 */
 const processImage = async () => {
  isProcessing.value = true
  try {
    const worker = await createWorker('kor')
    const result = await worker.recognize(previewUrl.value)
    
    const confidence = result.data.confidence
    const extractedText = result.data.text

    // 신뢰도 검증
    if (confidence < 65) {
      alert(`텍스트 인식 품질이 좋지 않습니다. (신뢰도: ${confidence.toFixed(1)}%)\n다시 촬영해주세요.`)
      return
    }

    // 영수증 키워드 검증
    const receiptKeywords = ['총액', '합계', '금액', '원', '부가세', 'VAT']
    const hasReceiptKeywords = receiptKeywords.some(keyword => 
      extractedText.toLowerCase().includes(keyword.toLowerCase())
    )

    if (!hasReceiptKeywords) {
      alert('영수증으로 인식되지 않았습니다. 다시 확인해주세요.')
      return
    }

    // 금액 추출
    const maxAmount = extractAmount(extractedText)
    if (maxAmount === 0) {
      alert('금액을 찾을 수 없습니다. 다시 시도해주세요.')
      return
    }

    // 스토어에 데이터 저장
    receiptStore.setReceiptData(maxAmount, confidence, extractedText)
    
    await worker.terminate()

    // 더치페이 폼으로 라우팅
    router.push('/dutch-pay')
  } catch (error) {
    console.error('텍스트 추출 중 에러:', error)
    alert('텍스트 추출에 실패했습니다.')
  } finally {
    isProcessing.value = false
  }
}

/**
 * 이미지 초기화 함수
 */
const resetImage = () => {
  previewUrl.value = ''
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}
</script>

<style scoped>
.image-uploader {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.upload-guide {
  margin-bottom: 20px;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 8px;
  text-align: left;
}

.upload-guide ul {
  padding-left: 20px;
}

.upload-area {
  border: 2px dashed #ddd;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  cursor: pointer;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.file-input {
  display: none;
}

.upload-buttons {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.preview-container {
  position: relative;
  width: 100%;
}

.preview-image {
  width: 100%;
  height: auto;
  object-fit: contain;
  border-radius: 8px;
}

.preview-actions {
  position: sticky;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: rgba(255, 255, 255, 0.9);
  padding: 10px;
  display: flex;
  gap: 10px;
  justify-content: center;
  z-index: 1;
}

.upload-button,
.camera-button,
.process-button,
.reupload-button {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: background-color 0.3s;
}

.upload-button {
  background-color: #4CAF50;
  color: white;
}

.camera-button {
  background-color: #2196F3;
  color: white;
}

.process-button {
  background-color: #FF5722;
  color: white;
}

.reupload-button {
  background-color: #9E9E9E;
  color: white;
}

.camera-view {
  margin: 20px 0;
}

.camera-view video {
  width: 100%;
  max-width: 500px;
  border-radius: 8px;
}

button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

button:hover:not(:disabled) {
  opacity: 0.9;
}

.camera-view button {
  margin: 10px;
  padding: 10px 20px;
  background-color: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>
