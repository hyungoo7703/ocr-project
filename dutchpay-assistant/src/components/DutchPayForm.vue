<template>
    <div class="dutch-pay-container">
      <!-- 금액 확인 및 입력 폼 -->
      <div v-if="!showResult" class="input-form">
        <div class="amount-confirm">
          <h3>추출된 금액 확인</h3>
          <p class="amount">{{ formatAmount(receiptStore.totalAmount) }}원</p>
          <p class="confidence">인식 신뢰도: {{ receiptStore.confidence.toFixed(1) }}%</p>
        </div>
  
        <form @submit.prevent="calculateDutchPay" class="dutch-pay-form">
          <div class="form-group">
            <label for="people">인원 수</label>
            <input
              type="number"
              id="people"
              v-model="numberOfPeople"
              min="2"
              required
              placeholder="2명 이상 입력해주세요"
            >
          </div>
  
          <div class="form-group">
            <label for="account">계좌번호</label>
            <input
              type="text"
              id="account"
              v-model="accountNumber"
              required
              placeholder="계좌번호를 입력해주세요"
            >
          </div>
  
          <div class="form-group">
            <label for="bank">은행명</label>
            <select id="bank" v-model="bankName" required>
              <option value="">은행을 선택하세요</option>
              <option v-for="bank in bankList" :key="bank" :value="bank">
                {{ bank }}
              </option>
            </select>
          </div>
  
          <div class="button-group">
            <button type="button" @click="cancelProcess" class="cancel-button">
              취소
            </button>
            <button type="submit" class="submit-button">
              더치페이 계산하기
            </button>
          </div>
        </form>
      </div>
  
      <!-- 결과 화면 -->
      <div v-else class="result-view">
        <h3>더치페이 결과</h3>
        
        <div class="result-details">
          <p class="total-amount">총 금액: {{ formatAmount(receiptStore.totalAmount) }}원</p>
          <p class="per-person">1인당 금액: {{ formatAmount(amountPerPerson) }}원</p>
          <div class="account-info">
            <p>{{ bankName }} {{ accountNumber }}</p>
          </div>
        </div>
  
        <div class="share-message" ref="messageRef">
          {{ generateMessage() }}
        </div>
  
        <div class="action-buttons">
          <button @click="copyToClipboard" class="copy-button">
            복사하기
          </button>
          <button @click="shareResult" class="share-button">
            공유하기
          </button>
          <button @click="resetForm" class="reset-button">
            다시하기
          </button>
        </div>
      </div>
    </div>
</template>
  
<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { useRouter } from 'vue-router'
  import { useReceiptStore } from '@/stores/receiptStore'
  
  const receiptStore = useReceiptStore()
  const showResult = ref(false)
  const numberOfPeople = ref<number>(2)
  const accountNumber = ref('')
  const bankName = ref('')
  const messageRef = ref<HTMLDivElement | null>(null)
  
  const router = useRouter()

  // 은행 목록
  const bankList = [
    '국민은행',
    '신한은행',
    '우리은행',
    '하나은행',
    '농협은행',
    '카카오뱅크',
    '토스뱅크',
    // ... 필요한 은행 추가
  ]
  
  // 1인당 금액 계산
  const amountPerPerson = computed(() => {
    const totalAmount = receiptStore.totalAmount
    if (totalAmount === null || !numberOfPeople.value) return 0
    return Math.ceil(totalAmount / numberOfPeople.value)
  })
  
  /**
   * 금액 포맷팅
   * @param amount 
   * @returns 포맷팅된 금액
   */
  const formatAmount = (amount: number | null): string => {
    if (amount === null) return '0'
    return amount.toLocaleString()
  }
  
  /**
   * 공유 메세지 생성
   * @returns 공유할 메세지
   */
  const generateMessage = (): string => {
    return `[더치페이 정보]
            총 금액: ${formatAmount(receiptStore.totalAmount)}원
            인원: ${numberOfPeople.value}명
            1인당: ${formatAmount(amountPerPerson.value)}원
            계좌정보: ${bankName.value} ${accountNumber.value}`
  }
  
  /**
   * 더치페이 계산
   */
  const calculateDutchPay = () => {
    if (numberOfPeople.value < 2) {
      alert('2명 이상 입력해주세요')
      return
    }
    showResult.value = true
  }
  
  /**
   * 클립보드 복사
   */
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generateMessage())
      alert('클립보드에 복사되었습니다!')
    } catch (err) {
      alert('복사에 실패했습니다.')
    }
  }
  
  /**
   * 공유하기
   * (우선은 navigator의 share → 추후 카카오톡 공유하기로 변경.)
   */
  const shareResult = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: '더치페이 정보',
          text: generateMessage()
        })
      } catch (err) {
        console.error('공유 실패:', err)
      }
    } else {
      alert('공유하기가 지원되지 않는 브라우저입니다.')
    }
  }
  
  /**
   * 취소
   */
  const cancelProcess = () => {
    receiptStore.reset()
    router.push('/');
  }
  
  /**
   * 폼 초기화
   */
  const resetForm = () => {
    showResult.value = false
    numberOfPeople.value = 2
    accountNumber.value = ''
    bankName.value = ''
    router.push('/');
  }
</script>
  
<style scoped>
  .dutch-pay-container {
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
  }
  
  .amount-confirm {
    background-color: #f8f9fa;
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 20px;
  }
  
  .amount {
    font-size: 24px;
    font-weight: bold;
    color: #2c3e50;
  }
  
  .confidence {
    color: #666;
    font-size: 14px;
  }
  
  .dutch-pay-form {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  
  .form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .form-group label {
    font-weight: bold;
    color: #2c3e50;
  }
  
  .form-group input,
  .form-group select {
    padding: 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 16px;
  }
  
  .button-group {
    display: flex;
    gap: 10px;
    margin-top: 20px;
  }
  
  .cancel-button,
  .submit-button,
  .copy-button,
  .share-button,
  .reset-button {
    padding: 12px 24px;
    border: none;
    border-radius: 4px;
    font-weight: bold;
    cursor: pointer;
    flex: 1;
  }
  
  .cancel-button {
    background-color: #6c757d;
    color: white;
  }
  
  .submit-button {
    background-color: #4CAF50;
    color: white;
  }
  
  .result-view {
    text-align: center;
  }
  
  .result-details {
    background-color: #f8f9fa;
    padding: 20px;
    border-radius: 8px;
    margin: 20px 0;
  }
  
  .share-message {
    background-color: #fff;
    padding: 20px;
    border: 1px solid #ddd;
    border-radius: 8px;
    margin: 20px 0;
    white-space: pre-line;
    text-align: left;
  }
  
  .action-buttons {
    display: flex;
    gap: 10px;
  }
  
  .copy-button {
    background-color: #2196F3;
    color: white;
  }
  
  .share-button {
    background-color: #4CAF50;
    color: white;
  }
  
  .reset-button {
    background-color: #6c757d;
    color: white;
  }
  
  @media (max-width: 480px) {
    .button-group,
    .action-buttons {
      flex-direction: column;
    }
  }
</style>
