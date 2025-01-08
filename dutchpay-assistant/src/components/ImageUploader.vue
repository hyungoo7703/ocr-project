<template>
  <div class="image-uploader">
    <!-- 업로드 가이드 섹션 -->
    <div class="upload-guide">
      <h3>업로드 및 입력 가이드</h3>
      <p>업로드시 영수증 인식이 잘 되도록 아래 가이드를 참고해주세요:</p>
      <ul>
        <li>영수증 전체가 잘 보이도록 해주세요</li>
        <li>정면에서 촬영된 사진을 업로드해주세요</li>
        <li>빛 반사나 그림자가 없도록 해주세요</li>
      </ul>
      <p>입력시에는 총 금액을 입력한 후 다음 절차를 진행하면 됩니다.</p>
    </div>

    <!-- 파일 업로드 영역 -->
    <div class="upload-area">
      <div v-if="!previewUrl" class="upload-placeholder">
        <input
          type="file"
          ref="fileInput"
          accept="image/*"
          @change="handleFileSelect"
          class="file-input"
        />

        <div class="input-container">
          <button @click="triggerFileInput" class="upload-button">
            사진 업로드
          </button>
          <!-- <button
            v-if="isMobile && hasCamera"
            @click="startCamera"
            class="camera-button"
            >
              카메라로 촬영
            </button> -->

          <div class="divider">또는</div>

          <div class="manual-input">
            <input
              type="number"
              v-model="manualAmount"
              placeholder="금액을 직접 입력하세요"
              class="amount-field"
            />
            <button @click="handleManualAmount" class="submit-button">
              입력하기
            </button>
          </div>
        </div>
      </div>

      <!-- 미리보기 영역 -->
      <div v-else class="preview-container">
        <img :src="previewUrl" alt="Preview" class="preview-image" />
        <div class="preview-actions">
          <button
            @click="processImage"
            :disabled="isProcessing"
            class="process-button"
          >
            {{ isProcessing ? '처리중...' : '텍스트 추출하기' }}
          </button>
          <button @click="resetImage" class="reupload-button">
            다시 업로드
          </button>
        </div>
      </div>
    </div>

    <!-- 카메라 뷰 영역 -->
    <!-- <div v-if="showCamera" class="camera-view">
      <video 
        ref="videoElement"
        playsinline
        autoplay
        muted
        class="camera-video"
      ></video>
      <div class="camera-controls">
        <button @click="captureImage" class="capture-button">촬영하기</button>
        <button @click="stopCamera" class="cancel-button">취소</button>
      </div>
    </div> -->
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
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
const manualAmount = ref<number | null>(null)
// const videoElement = ref<HTMLVideoElement | null>(null)
const previewUrl = ref<string>('')
// const showCamera = ref(false)
const isProcessing = ref(false)
// const isMobile = ref(false)
// const hasCamera = ref(false)

// 카메라 스트림 저장
// let mediaStream: MediaStream | null = null

onMounted(() => {
  //모바일 체크
  // isMobile.value =
  //   /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
  //     navigator.userAgent,
  //   )
  // checkCamera()
})

onUnmounted(() => {
  // 컴포넌트 언마운트 시 카메라 정리
  // if (mediaStream) {
  //   mediaStream.getTracks().forEach(track => track.stop())
  // }
})

/**
 * 카메라 사용 가능 여부 체크
 */
// const checkCamera = async () => {
//   try {
//     const devices = await navigator.mediaDevices.enumerateDevices()
//     hasCamera.value = devices.some(device => device.kind === 'videoinput')
//   } catch (error) {
//     console.error('카메라 체크 중 에러:', error)
//     hasCamera.value = false
//   }
// }

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

// 수동 입력 처리
const handleManualAmount = () => {
  if (!manualAmount.value) {
    alert('금액을 입력해주세요.')
    return
  }

  if (manualAmount.value <= 0) {
    alert('0원 이상의 금액을 입력해주세요.')
    return
  }

  if (manualAmount.value >= 10000000) {
    alert('1천만원 미만의 금액만 입력 가능합니다.')
    return
  }

  // 스토어에 데이터 저장 (수동 입력은 100% 신뢰도로 저장)
  receiptStore.setReceiptData(manualAmount.value, 100, '수동 입력')

  // 더치페이 폼으로 라우팅
  router.push('/dutch-pay')
}

/**
 * 카메라 권한 확인
 */
// const checkCameraPermission = async () => {
//   try {
//     // 권한 상태 확인
//     const permissionStatus = await navigator.permissions.query({
//       name: 'camera' as PermissionName,
//     })

//     console.log('카메라 권한 상태:', permissionStatus.state)
//     return permissionStatus.state === 'granted'
//   } catch (error) {
//     console.log('권한 확인 실패:', error)
//     return false
//   }
// }

/**
 * 카메라 시작
 */
// const startCamera = async () => {
//   try {
//     // 먼저 권한 상태 확인
//     const hasPermission = await checkCameraPermission()
//     if (!hasPermission) {
//       console.log('카메라 권한 요청 필요')
//     }

//     // 기존 스트림 정리
//     if (mediaStream) {
//       mediaStream.getTracks().forEach(track => track.stop())
//       mediaStream = null
//     }

//     // 모바일 환경에 맞는 제약 조건
//     const constraints = {
//       audio: false,
//       video: {
//         facingMode: { ideal: 'environment' }, // environment로 변경
//         width: { ideal: 1280 },
//         height: { ideal: 720 },
//       },
//     }

//     try {
//       mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
//       console.log('카메라 스트림 획득 성공')
//     } catch (err) {
//       console.log('후면 카메라 실패, 기본 카메라로 시도')
//       // 기본 설정으로 재시도
//       mediaStream = await navigator.mediaDevices.getUserMedia({
//         video: true,
//         audio: false,
//       })
//     }

//     if (!videoElement.value) {
//       throw new Error('비디오 엘리먼트를 찾을 수 없습니다')
//     }

//     videoElement.value.srcObject = mediaStream
//     videoElement.value.setAttribute('playsinline', 'true')

//     // iOS Safari를 위한 설정
//     await videoElement.value
//       .play()
//       .then(() => {
//         console.log('비디오 재생 시작')
//         showCamera.value = true
//       })
//       .catch(error => {
//         console.error('비디오 재생 실패:', error)
//         throw error
//       })
//   } catch (error) {
//     console.error('카메라 시작 중 에러:', error)
//     let errorMessage = '카메라를 시작할 수 없습니다.'

//     if (error instanceof DOMException) {
//       switch (error.name) {
//         case 'NotAllowedError':
//           errorMessage =
//             '카메라 접근이 거부되었습니다. 브라우저 설정에서 카메라 권한을 허용해주세요.'
//           break
//         case 'NotFoundError':
//           errorMessage = '카메라를 찾을 수 없습니다.'
//           break
//         case 'NotReadableError':
//           errorMessage =
//             '카메라에 접근할 수 없습니다. 다른 앱에서 카메라를 사용 중인지 확인해주세요.'
//           break
//         default:
//           errorMessage = `카메라 오류: ${error.message}`
//       }
//     }

//     alert(errorMessage)
//     showCamera.value = false
//   }
// }

/**
 * 카메라 정지
 */
// const stopCamera = () => {
//   if (mediaStream) {
//     mediaStream.getTracks().forEach(track => track.stop())
//     mediaStream = null
//   }
//   showCamera.value = false
// }

/**
 * 이미지 캡처
 */
// const captureImage = () => {
//   if (!videoElement.value) return

//   const canvas = document.createElement('canvas')
//   canvas.width = videoElement.value.videoWidth
//   canvas.height = videoElement.value.videoHeight

//   const context = canvas.getContext('2d')
//   if (context) {
//     context.drawImage(videoElement.value, 0, 0, canvas.width, canvas.height)
//     previewUrl.value = canvas.toDataURL('image/jpeg')
//     stopCamera()
//   }
// }

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
    'Sub Total', // 영어로 표기된 경우
    '소계',
    '받은 돈',
    '결제금액',
    '청구금액',
    '최종금액',
    '할인후금액',
    '과세금액',
    '면세금액',
    '부가세',
  ]

  // 금액이 아닌 것으로 예상되는 패턴
  const excludePatterns = [
    /\d{2,4}-\d{2,4}-\d{2,4}/, // 전화번호, 카드번호 패턴
    /\d{4}-\d{2}-\d{2}/, // 날짜 패턴
    /\d{3}-\d{2}-\d{5}/, // 사업자번호 패턴
    /^\d{8,}$/, // 8자리 이상의 긴 숫자
    /^\d{1,2}$/, // 1-2자리 숫자 (수량 등)
    /\d{2}:\d{2}(?::\d{2})?/, // 시간 패턴 (15:30 또는 15:30:00)
    /\d{6}-\d{2}-\d{6}/, // 사업자등록번호 패턴
    /주문번호.*\d+/, // 주문번호
    /\d+개/, // 수량 표시
    /^\d{4}년/, // 연도 표시
    /가맹점\s*번호.*\d+/, // 가맹점 번호
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
              const lastPrevNumber = parseInt(
                prevNumbers[prevNumbers.length - 1].replace(/[,\.]/g, ''),
              )
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
  lines.forEach(line => {
    if (amountKeywords.some(keyword => line.includes(keyword))) {
      // 금액 패턴 매칭
      const matches = line.match(/[\d,\.]{1,}/g) // 1자리 숫자부터 매칭
      if (matches) {
        const number = cleanNumber(matches[matches.length - 1]) // 라인의 마지막 숫자 사용
        if (
          !isNaN(number) &&
          number > 0 &&
          number < 10000000 &&
          !excludePatterns.some(pattern => pattern.test(String(number)))
        ) {
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
      alert(
        `텍스트 인식 품질이 좋지 않습니다. (신뢰도: ${confidence.toFixed(1)}%)\n다시 촬영해주세요.`,
      )
      return
    }

    // 영수증 키워드 검증
    const receiptKeywords = ['총액', '합계', '금액', '원', '부가세', 'VAT']
    const hasReceiptKeywords = receiptKeywords.some(keyword =>
      extractedText.toLowerCase().includes(keyword.toLowerCase()),
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
}

.upload-placeholder {
  width: 100%;
  min-height: 200px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.file-input {
  display: none;
}

.input-container {
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.divider {
  color: #666;
  font-size: 14px;
  text-align: center;
  margin: 10px 0;
}

.manual-input {
  width: 100%;
  display: flex;
  gap: 10px;
}

.amount-field {
  flex: 1;
  height: 48px;
  padding: 0 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  box-sizing: border-box;
}

.upload-button,
.submit-button {
  height: 48px;
  padding: 0 24px;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
}

.upload-button {
  width: 100%;
  background-color: #4caf50;
  color: white;
}

.submit-button {
  background-color: #2196f3;
  color: white;
  white-space: nowrap;
}

.preview-container {
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.preview-image {
  width: 100%;
  height: auto;
  object-fit: contain;
  border-radius: 8px;
}

.preview-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: rgba(255, 255, 255, 0.95);
  padding: 15px;
  display: flex;
  gap: 10px;
  justify-content: center;
  z-index: 1;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
}

.process-button,
.reupload-button {
  padding: 12px 24px;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  transition: opacity 0.2s;
}

.process-button {
  background-color: #ff5722;
  color: white;
}

.reupload-button {
  background-color: #9e9e9e;
  color: white;
}
</style>
