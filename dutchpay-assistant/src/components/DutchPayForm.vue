<!-- DutchPayForm.vue -->
<template>
  <div class="dutch-pay-form">
    <div v-if="!showResult">
      <!-- 가이드 섹션 -->
      <div class="guide-section">
        <h3>더치페이 가이드</h3>
        <ul>
          <li>인원 수를 선택하고 각 참여자의 이름을 입력해주세요</li>
          <li>비중 템플릿을 선택하거나 직접 비중을 조정할 수 있습니다</li>
          <li>참여자를 드래그하여 순서를 변경할 수 있습니다</li>
          <li>각 참여자의 +/- 버튼으로 비중을 조정할 수 있습니다</li>
        </ul>

        <div class="template-info">
          <h4>템플릿 설명</h4>
          <ul>
            <li>
              <strong>균등 분배:</strong> 모든 참여자가 동일한 금액을 분담
            </li>
            <li>
              <strong>위에서부터 많이내기:</strong> 위 순서일 수록 더 많은 비중
            </li>
            <li>
              <strong>아래에서부터 많이내기:</strong> 아래 순서일 수록 더 많은
              비중
            </li>
          </ul>
        </div>
      </div>
      <!-- 총액 및 신뢰도 표시 -->
      <div class="total-amount-display">
        <h3>총 금액: {{ formatAmount(receiptStore.totalAmount) }}원</h3>
        <p class="confidence">
          인식 신뢰도: {{ receiptStore.confidence.toFixed(1) }}%
        </p>
      </div>

      <!-- 인원 수 입력 -->
      <div class="participants-input">
        <label>인원 수</label>
        <div class="number-control">
          <button
            @click="decreaseParticipants"
            :disabled="participants.length <= 2"
          >
            -
          </button>
          <span>{{ participants.length }}명</span>
          <button
            @click="increaseParticipants"
            :disabled="participants.length >= 10"
          >
            +
          </button>
        </div>
      </div>

      <!-- 비중 설정 템플릿 -->
      <div class="weight-template">
        <label>비중 템플릿</label>
        <select v-model="selectedTemplate" @change="applyTemplate">
          <option value="equal">균등 분배</option>
          <option value="senior">위에서부터 많이내기</option>
          <option value="junior">아래서부터 많이내기</option>
        </select>
      </div>

      <!-- 참여자 비중 설정 -->
      <div class="participants-list">
        <draggable v-model="participants" item-key="id" handle=".handle">
          <template #item="{ element }">
            <div class="participant-item">
              <div class="handle">⋮⋮</div>
              <input
                v-model="element.name"
                placeholder="이름"
                class="name-input"
              />
              <div class="weight-control">
                <button
                  @click="decreaseWeight(element)"
                  :disabled="element.weight <= 1"
                >
                  -
                </button>
                <span>{{ element.weight }}</span>
                <button
                  @click="increaseWeight(element)"
                  :disabled="element.weight >= 5"
                >
                  +
                </button>
              </div>
              <div class="share-amount">
                {{ formatAmount(element.share) }}원
              </div>
            </div>
          </template>
        </draggable>
      </div>

      <!-- 계좌 정보 입력 -->
      <div class="account-info">
        <select v-model="bankName" class="bank-select">
          <option value="">은행 선택</option>
          <option v-for="bank in bankList" :key="bank" :value="bank">
            {{ bank }}
          </option>
        </select>
        <input
          v-model="accountNumber"
          placeholder="계좌번호 입력"
          class="account-input"
        />
      </div>

      <!-- 액션 버튼 -->
      <div class="action-buttons">
        <button @click="goBack" class="cancel-button">취소</button>
        <button @click="complete" class="complete-button">완료</button>
      </div>
    </div>

    <!-- 결과 화면 -->
    <div v-else class="result-view">
      <div class="result-card">
        <h3 class="result-title">더치페이 결과</h3>

        <div class="result-summary">
          <p class="total-amount">
            총 금액: {{ formatAmount(receiptStore.totalAmount) }}원
          </p>
          <p class="participant-count">
            참여자 수: {{ participants.length }}명
          </p>
        </div>

        <div class="shares-list">
          <h4>정산 금액</h4>
          <div v-for="p in participants" :key="p.id" class="share-item">
            <span class="name">{{ p.name }}</span>
            <span class="amount">{{ formatAmount(p.share) }}원</span>
          </div>
        </div>

        <div class="account-info">
          <p><strong>계좌 정보</strong></p>
          <p>{{ bankName }} {{ accountNumber }}</p>
        </div>

        <div class="result-actions">
          <button @click="copyToClipboard" class="copy-button">복사하기</button>
          <button @click="resetForm" class="reset-button">다시하기</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useReceiptStore } from '../stores/receiptStore'
/**
 * 참고: https://github.com/SortableJS/vue.draggable.next
 */
import draggable from 'vuedraggable'

interface Participant {
  id: number
  name: string
  weight: number
  share: number
}

const router = useRouter()
const receiptStore = useReceiptStore()

// 상태 관리
const participants = ref<Participant[]>([])
const selectedTemplate = ref('equal')
const bankName = ref('')
const accountNumber = ref('')
const showResult = ref(false)

// 은행 목록
const bankList = [
  '국민은행',
  '신한은행',
  '우리은행',
  '하나은행',
  '농협은행',
  '카카오뱅크',
  '토스뱅크',
  // 필요시 추가..
]

// participants 변경 감지
watch(
  () => participants.value,
  newParticipants => {
    // 현재 템플릿에 따라 비중 재계산
    if (selectedTemplate.value === 'senior') {
      newParticipants.forEach((p, index) => {
        p.weight = newParticipants.length - index
      })
    } else if (selectedTemplate.value === 'junior') {
      newParticipants.forEach((p, index) => {
        p.weight = index + 1
      })
    }
    calculateShares()
  },
  { deep: true },
)

onMounted(() => {
  // 기본 2명으로 시작
  participants.value = [
    { id: 1, name: '참여자 1', weight: 1, share: 0 },
    { id: 2, name: '참여자 2', weight: 1, share: 0 },
  ]
  calculateShares()
})

/**
 * 참여자 추가/제거
 */
const increaseParticipants = () => {
  const newId = participants.value.length + 1
  participants.value.push({
    id: newId,
    name: `참여자 ${newId}`,
    weight: 1,
    share: 0,
  })
  calculateShares()
}

/**
 * 참여자 제거
 */
const decreaseParticipants = () => {
  participants.value.pop()
  calculateShares()
}

/**
 * 비중 조정(증가)
 * @param participant
 */
const increaseWeight = (participant: Participant) => {
  participant.weight++
  calculateShares()
}

/**
 * 비중 조정(감소)
 * @param participant
 */
const decreaseWeight = (participant: Participant) => {
  participant.weight--
  calculateShares()
}

/**
 * 금액 계산
 */
const calculateShares = () => {
  const totalWeight = participants.value.reduce((sum, p) => sum + p.weight, 0)
  const totalAmount = receiptStore.totalAmount || 0

  participants.value.forEach(p => {
    p.share = Math.floor((totalAmount * p.weight) / totalWeight)
  })
}

/**
 * 템플릿 적용
 */
const applyTemplate = () => {
  switch (selectedTemplate.value) {
    case 'senior':
      participants.value.forEach((p, i) => {
        p.weight = participants.value.length - i
      })
      break
    case 'junior':
      participants.value.forEach((p, i) => {
        p.weight = i + 1
      })
      break
    default:
      participants.value.forEach(p => {
        p.weight = 1
      })
  }
  calculateShares()
}

/**
 * 금액 포맷팅
 * @param amount
 */
const formatAmount = (amount: number | null): string => {
  if (amount === null) return '0'
  return amount.toLocaleString()
}

/**
 * 이전 페이지로 이동
 */
const goBack = () => {
  if (confirm('정말 취소하시겠습니까?')) {
    receiptStore.reset()
    router.push('/')
  }
}

/**
 * 더치페이 완료
 */
const complete = () => {
  // 입력 검증
  if (participants.value.some(p => !p.name.trim())) {
    alert('모든 참여자의 이름을 입력해주세요.')
    return
  }

  if (!bankName.value) {
    alert('은행을 선택해주세요.')
    return
  }

  if (!accountNumber.value) {
    alert('계좌번호를 입력해주세요.')
    return
  }

  // 결과 화면으로 전환
  showResult.value = true
}

/**
 * 클립보드에 복사
 */
const copyToClipboard = () => {
  const message = generateShareMessage()
  navigator.clipboard
    .writeText(message)
    .then(() => {
      alert('정산 정보가 클립보드에 복사되었습니다!')
    })
    .catch(() => {
      alert('클립보드 복사에 실패했습니다.')
    })
}

/**
 * 공유 메시지 생성
 */
const generateShareMessage = (): string => {
  const totalAmount = receiptStore.totalAmount
  const lines = [
    '[더치페이 정보]',
    `총 금액: ${formatAmount(totalAmount)}원`,
    `참여자 수: ${participants.value.length}명\n`,
    '■ 정산 금액',
    ...participants.value.map(p => `${p.name}: ${formatAmount(p.share)}원`),
    '\n■ 계좌 정보',
    `${bankName.value} ${accountNumber.value}`,
  ]

  return lines.join('\n')
}

/**
 * 다시하기
 */
const resetForm = () => {
  showResult.value = false
  participants.value = [
    { id: 1, name: '참여자 1', weight: 1, share: 0 },
    { id: 2, name: '참여자 2', weight: 1, share: 0 },
  ]
  selectedTemplate.value = 'equal'
  bankName.value = ''
  accountNumber.value = ''
  calculateShares()
}
</script>

<style scoped>
.dutch-pay-form {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.guide-section {
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 30px;
}

.guide-section h3 {
  color: #2c3e50;
  margin-bottom: 15px;
}

.guide-section ul {
  padding-left: 20px;
  margin-bottom: 20px;
}

.guide-section li {
  margin-bottom: 8px;
  color: #666;
}

.template-info {
  background-color: white;
  border-radius: 6px;
  padding: 15px;
  margin-top: 15px;
}

.template-info h4 {
  color: #2c3e50;
  margin-bottom: 10px;
}

.template-info strong {
  color: #2196f3;
}

.total-amount-display {
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 30px;
  text-align: center;
}

.total-amount-display h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 24px;
}

.confidence {
  margin: 10px 0 0;
  color: #666;
  font-size: 14px;
}

.participants-input,
.weight-template {
  margin-bottom: 20px;
}

.participants-input label,
.weight-template label {
  display: block;
  margin-bottom: 10px;
  font-weight: bold;
  color: #2c3e50;
}

.number-control {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
}

.number-control button {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 20px;
  background-color: #4caf50;
  color: white;
  font-size: 20px;
  cursor: pointer;
}

.number-control span {
  font-size: 18px;
  min-width: 60px;
  text-align: center;
}

select {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  background-color: white;
}

.participants-list {
  margin: 20px 0;
  background-color: white;
  border-radius: 8px;
  overflow: hidden;
}

.participant-item {
  display: flex;
  align-items: center;
  padding: 15px;
  gap: 15px;
  border-bottom: 1px solid #eee;
  background-color: white;
}

.handle {
  cursor: move;
  color: #999;
  padding: 0 10px;
}

.name-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.weight-control {
  display: flex;
  align-items: center;
  gap: 10px;
}

.weight-control button {
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 15px;
  background-color: #2196f3;
  color: white;
  cursor: pointer;
}

.share-amount {
  min-width: 100px;
  text-align: right;
  font-weight: bold;
  color: #2c3e50;
}

.account-info {
  margin: 20px 0;
  margin-bottom: 30px;
  display: flex;
  gap: 10px;
}

.bank-select {
  width: 150px;
}

.account-input {
  flex: 1;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.action-buttons {
  display: flex;
  gap: 10px;
  margin-top: 30px;
}

.cancel-button,
.complete-button {
  flex: 1;
  padding: 15px;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: opacity 0.2s;
}

.cancel-button {
  background-color: #6c757d;
  color: white;
}

.complete-button {
  background-color: #4caf50;
  color: white;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

button:not(:disabled):hover {
  opacity: 0.9;
}

@media (max-width: 480px) {
  .participant-item {
    flex-wrap: wrap;
  }

  .share-amount {
    width: 100%;
    text-align: left;
    margin-top: 10px;
  }

  .account-info {
    flex-direction: column;
  }

  .bank-select {
    width: 100%;
  }
}

.result-view {
  padding: 20px;
}

.result-card {
  background: white;
  border-radius: 8px;
  padding: 30px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.result-title {
  text-align: center;
  margin-bottom: 20px;
  color: #2c3e50;
}

.result-summary {
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 30px;
}

.shares-list,
.account-info {
  margin-bottom: 30px;
}

.shares-list h4,
.account-info h4 {
  margin-bottom: 15px;
  color: #2c3e50;
}

.share-item {
  display: flex;
  justify-content: space-between;
  padding: 10px;
  border-bottom: 1px solid #eee;
}

.share-item .amount {
  font-weight: bold;
  color: #2196f3;
}

.share-item .weight {
  color: #666;
  font-size: 0.9em;
}

.result-actions {
  display: flex;
  gap: 10px;
  margin-top: 30px;
}

.copy-button,
.reset-button {
  flex: 1;
  padding: 15px;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
}

.copy-button {
  background-color: #2196f3;
  color: white;
}

.reset-button {
  background-color: #6c757d;
  color: white;
}
</style>
