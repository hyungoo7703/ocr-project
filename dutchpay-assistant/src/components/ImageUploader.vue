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
/**
 * 참고: https://github.com/naptha/tesseract.js#tesseractjs
 * 1. createWorker
 * tesseract.js의 핵심 함수로써, OCR 작업을 수행하는 워커(Worker) 인스턴스를 생성
 * 2, Worker
 * TypeScript 타입 정의를 위한 인터페이스
 */
import { createWorker } from 'tesseract.js'

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
 * 이미지 처리 (Tesseract)
 */
const processImage = async () => {
  isProcessing.value = true
  try {
    const worker = await createWorker('kor')
    const result = await worker.recognize(previewUrl.value)
    
    // 전체 텍스트의 평균 신뢰도 계산
    const confidence = result.data.confidence
    const extractedText = result.data.text

    // 신뢰도에 따른 처리
    if (confidence < 65) {
      alert('텍스트 인식 품질이 좋지 않습니다. 다시 촬영해주세요.')
      return
    }

    // 영수증 관련 키워드 체크 (간단한 검증)
    const receiptKeywords = ['총액', '합계', '금액', '원', '부가세', 'VAT']
    const hasReceiptKeywords = receiptKeywords.some(keyword => 
      extractedText.includes(keyword)
    )

    if (!hasReceiptKeywords) {
      alert('영수증으로 인식되지 않았습니다. 다시 확인해주세요.')
      return
    }

    console.log('추출된 텍스트:', extractedText)
    console.log('인식 신뢰도:', confidence + '%')

    await worker.terminate()
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
