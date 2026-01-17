<template>
  <div class="home-container">
    <header class="app-header">
      <h1>더치페이(더드미)</h1>
      <span class="badget">Beta</span>
    </header>

    <main class="main-content">
      <!-- Welcome Section -->
      <section class="welcome-card">
        <h2>영수증만 찍으세요,<br>계산은 제가 할게요.</h2>
        <p>복잡한 n분의 1, 3초 만에 끝내드립니다.</p>
      </section>

      <!-- Action Area -->
      <div class="action-area">
        <!-- Default State: Buttons -->
        <div v-if="!previewUrl && !isCameraActive" class="upload-container">
          <input
            type="file"
            ref="fileInput"
            accept="image/*"
            @change="handleFileSelect"
            class="hidden-input"
          />
          
          <button @click="startCamera" class="action-button primary-button">
            <span class="icon">📸</span>
            <span class="label">카메라로 영수증 찍기</span>
          </button>

          <div class="divider">
            <span>또는</span>
          </div>

          <button @click="triggerFileInput" class="text-button small">
            앨범에서 가져오기
          </button>
          
          <button @click="openManualInput" class="action-button secondary-button" style="margin-top: 10px">
            <span class="icon">✏️</span>
            <span class="label">직접 입력하기</span>
          </button>
        </div>

        <!-- Camera View -->
        <div v-if="isCameraActive" class="camera-container">
          <video ref="videoElement" autoplay playsinline class="camera-video"></video>
          <div class="camera-controls">
            <button @click="stopCamera" class="icon-button close-camera">✕</button>
            <div class="shutter-wrapper">
              <button @click="captureImage" class="shutter-button"></button>
            </div>
          </div>
          <div class="camera-guide">
            <p>영수증 전체가 나오게 찍어주세요</p>
          </div>
        </div>

        <!-- Preview Area -->
        <div v-if="previewUrl" class="preview-container">
          <div class="image-wrapper">
            <img :src="previewUrl" alt="Receipt Preview" />
            <div class="overlay-actions">
              <button @click="resetImage" class="icon-button close-button">✕</button>
            </div>
          </div>
          
          <div class="preview-controls">
            <button 
              @click="processImage" 
              :disabled="isProcessing"
              class="action-button primary-button processing-btn"
            >
              <span v-if="isProcessing" class="spinner"></span>
              {{ isProcessing ? '금액 읽는 중...' : '이 영수증으로 정산하기' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Manual Input Modal (Simple implementation for now) -->
      <div v-if="showManualInput" class="modal-backdrop" @click.self="showManualInput = false">
        <div class="modal-card">
          <h3>금액 직접 입력</h3>
          <input
            type="number"
            v-model="manualAmount"
            placeholder="총 금액을 입력하세요"
            class="clean-input"
            autofocus
            @keyup.enter="handleManualAmount"
          />
          <div class="modal-actions">
            <button @click="showManualInput = false" class="text-button">취소</button>
            <button @click="handleManualAmount" class="text-button primary-text">확인</button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useReceiptStore } from '../stores/receiptStore'
import { createWorker } from 'tesseract.js'
import { processImageForOCR } from '../utils/imageProcessing'

const router = useRouter()
const receiptStore = useReceiptStore()

// DOM Refs
const fileInput = ref<HTMLInputElement | null>(null)
const videoElement = ref<HTMLVideoElement | null>(null)

// State
const manualAmount = ref<number | null>(null)
const previewUrl = ref<string>('')
const isProcessing = ref(false)
const showManualInput = ref(false)
const isCameraActive = ref(false)
const cameraError = ref('')

let mediaStream: MediaStream | null = null

onUnmounted(() => {
  stopCamera()
})

// Camera Functions
const startCamera = async () => {
  try {
    isCameraActive.value = true
    const constraints = {
      video: {
        facingMode: { ideal: 'environment' }, // Rear camera preferred
        width: { ideal: 1920 }, // High resolution for OCR
        height: { ideal: 1080 }
      }
    }
    mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
    
    if (videoElement.value) {
      videoElement.value.srcObject = mediaStream
    }
  } catch (err) {
    console.error('Camera Error:', err)
    cameraError.value = '카메라를 열 수 없습니다. 권한을 확인해주세요.'
    // Fallback to file input if camera fails
    triggerFileInput()
  }
}

const stopCamera = () => {
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop())
    mediaStream = null
  }
  isCameraActive.value = false
}

const captureImage = async () => {
  if (!videoElement.value) return

  // Create high-res capture
  const canvas = document.createElement('canvas')
  canvas.width = videoElement.value.videoWidth
  canvas.height = videoElement.value.videoHeight
  
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.drawImage(videoElement.value, 0, 0)
    // Original for preview
    previewUrl.value = canvas.toDataURL('image/jpeg', 0.9)
    stopCamera()
  }
}

// Actions
const triggerFileInput = () => {
  stopCamera() // Ensure camera is off
  fileInput.value?.click()
}
const openManualInput = () => showManualInput.value = true

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    previewUrl.value = URL.createObjectURL(target.files[0])
  }
}

const resetImage = () => {
  previewUrl.value = ''
  if (fileInput.value) fileInput.value.value = ''
  isCameraActive.value = false
}

const handleManualAmount = () => {
  if (!manualAmount.value || manualAmount.value <= 0) {
    alert('올바른 금액을 입력해주세요.')
    return
  }
  receiptStore.setReceiptData(manualAmount.value, 100, '수동 입력')
  router.push('/dutch-pay')
}

// Logic copied from original but simplified for readability
const extractAmount = (text: string): number => {
  const cleanNumber = (str: string) => parseInt(str.replace(/[^0-9]/g, ''))
  let maxAmount = 0
  
  // Heuristic: Look for numbers with currency symbol or typical receipt layout
  // Matching number + '원', or just comma separated numbers at end of lines
  const lines = text.split('\n')
  
  lines.forEach(line => {
    // Remove dates to avoid confusion (2023-01-01)
    const lineWithoutDate = line.replace(/\d{4}-\d{2}-\d{2}/g, '').replace(/\d{2}:\d{2}/g, '')
    
    const numbers = lineWithoutDate.match(/[\d,]+/g)
    if (numbers) {
      numbers.forEach(numStr => {
        const num = cleanNumber(numStr)
        // Reasonable range for receipt total
        if (num > maxAmount && num < 10000000 && num > 100) {
           maxAmount = num
        }
      })
    }
  })
  
  return maxAmount
}

const processImage = async () => {
  isProcessing.value = true
  try {
    // PRE-PROCESS IMAGE HERE
    // Create an image element to pass to pre-processor
    const img = new Image()
    img.src = previewUrl.value
    await new Promise(r => img.onload = r)
    
    // Get enhanced image (Contrast/Grayscale)
    const processedImageDataUrl = await processImageForOCR(img)
    
    const worker = await createWorker('kor') // Use Korean + English trained data
    const result = await worker.recognize(processedImageDataUrl)
    
    console.log('Recognized Text:', result.data.text)
    
    const amount = extractAmount(result.data.text)
    
    if (amount === 0) {
      alert('금액을 찾지 못했어요 😭\n직접 입력해주세요.')
      isProcessing.value = false
      return
    }

    receiptStore.setReceiptData(amount, result.data.confidence, result.data.text)
    await worker.terminate()
    router.push('/dutch-pay')
  } catch (error) {
    console.error(error)
    alert('텍스트 인식 중 오류가 발생했습니다.')
  } finally {
    isProcessing.value = false
  }
}
</script>

<style scoped>
.home-container {
  padding: var(--spacing-lg);
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: var(--spacing-xl);
}

.badget {
  background: var(--primary-color);
  color: white;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: var(--radius-full);
  font-weight: bold;
}

.welcome-card h2 {
  font-size: 28px;
  font-weight: 800;
  margin-bottom: var(--spacing-sm);
  line-height: 1.3;
}

.welcome-card p {
  font-size: 16px;
  color: var(--text-secondary);
  margin-bottom: 40px;
}

.action-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end; /* Bottom alignment for ease of reach */
  gap: var(--spacing-lg);
  padding-bottom: var(--spacing-xl);
}

.upload-container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.action-button {
  width: 100%;
  height: 56px;
  border-radius: var(--radius-md);
  font-size: 16px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  transition: transform 0.1s ease, box-shadow 0.2s ease;
}

.action-button:active {
  transform: scale(0.98);
}

.primary-button {
  background-color: var(--primary-color);
  color: white;
  box-shadow: var(--shadow-md);
}

.secondary-button {
  background-color: var(--surface-color);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.divider {
  text-align: center;
  position: relative;
  margin: 10px 0;
}
.divider span {
  background: var(--surface-color); /* Matches bg to verify visual break */
  padding: 0 10px;
  color: var(--text-tertiary);
  font-size: 12px;
}

.hidden-input { display: none; }

/* Preview */
.image-wrapper {
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-lg);
  position: relative;
  margin-bottom: var(--spacing-lg);
}
.image-wrapper img {
  width: 100%;
  display: block;
}
.overlay-actions {
  position: absolute;
  top: 10px;
  right: 10px;
}
.close-button {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(0,0,0,0.5);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* Modal */
/* Camera Styles */
.camera-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: black;
  z-index: 50; /* Above everything */
  display: flex;
  flex-direction: column;
}

.camera-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.camera-controls {
  position: absolute;
  bottom: 0;
  width: 100%;
  height: 120px;
  background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
  display: flex;
  justify-content: center;
  align-items: center;
}

.close-camera {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(0,0,0,0.5);
  color: white;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  font-size: 20px;
  z-index: 60;
}

.shutter-wrapper {
  padding: 4px;
  border: 4px solid white;
  border-radius: 50%;
}

.shutter-button {
  width: 64px;
  height: 64px;
  background: white;
  border-radius: 50%;
  transition: transform 0.1s;
}
.shutter-button:active {
  transform: scale(0.9);
  background: #eee;
}

.camera-guide {
  position: absolute;
  top: 100px;
  width: 100%;
  text-align: center;
}
.camera-guide p {
  color: white;
  background: rgba(0,0,0,0.6);
  display: inline-block;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.modal-card {
  background: white;
  width: 80%;
  max-width: 320px;
  padding: 24px;
  border-radius: var(--radius-lg);
  text-align: center;
}
.clean-input {
  width: 100%;
  font-size: 24px;
  font-weight: 700;
  text-align: center;
  border: none;
  border-bottom: 2px solid var(--border-color);
  padding: 10px;
  margin: 20px 0;
  color: var(--primary-color);
}
.clean-input:focus {
  border-color: var(--primary-color);
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
}
.text-button {
  background: none;
  font-size: 16px;
  color: var(--text-secondary);
}

.text-button.small {
  font-size: 14px;
  text-decoration: underline;
  margin-top: 10px;
}

.primary-text {
  color: var(--primary-color);
  font-weight: bold;
}
</style>
