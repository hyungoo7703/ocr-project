<!-- DutchPayForm.vue -->
<template>
  <div class="home-container">
    <header class="app-header">
      <button @click="handleBack" class="icon-button back-btn" v-if="!showResult">←</button>
      <h1 v-if="!showResult">정산하기</h1>
      <h1 v-else>정산 결과</h1>
    </header>

    <main class="main-content">
      <div v-if="!showResult" class="form-view">
        <!-- Total Amount Card -->
        <section class="amount-card">
          <span class="label">총 금액</span>
          <div class="amount-row">
            <span class="currency">₩</span>
            <span class="value">{{ formatAmount(receiptStore.totalAmount) }}</span>
          </div>
          <div class="confidence-badge" :class="{ low: receiptStore.confidence < 80 }">
            정확도 {{ receiptStore.confidence.toFixed(0) }}%
          </div>
        </section>

        <!-- Participants Section -->
        <section class="section-container">
          <div class="section-header">
            <h3>참여자 {{ participants.length }}명</h3>
            <div class="counter-control">
              <button @click="decreaseParticipants" :disabled="participants.length <= 2">-</button>
              <button @click="increaseParticipants" :disabled="participants.length >= 10">+</button>
            </div>
          </div>
          
          <div class="template-selector">
            <button 
              v-for="t in templates" 
              :key="t.value"
              :class="['chip', { active: selectedTemplate === t.value }]"
              @click="selectTemplate(t.value)"
            >
              {{ t.label }}
            </button>
          </div>

          <div class="participants-list">
            <draggable v-model="participants" item-key="id" handle=".handle">
              <template #item="{ element }">
                <div class="participant-row">
                  <div class="handle">⋮⋮</div>
                  <input v-model="element.name" class="name-input" />
                  <div class="weight-control">
                    <button @click="decreaseWeight(element)" :disabled="element.weight <= 1">-</button>
                    <span class="weight-val">x{{ element.weight }}</span>
                    <button @click="increaseWeight(element)" :disabled="element.weight >= 5">+</button>
                  </div>
                  <span class="share-val">{{ formatAmount(element.share) }}</span>
                </div>
              </template>
            </draggable>
          </div>
        </section>

        <!-- Account Info -->
        <section class="section-container">
          <h3>계좌 정보</h3>
          <div class="account-inputs">
            <select v-model="bankName" class="modern-select">
              <option value="" disabled>은행 선택</option>
              <option v-for="bank in bankList" :key="bank" :value="bank">{{ bank }}</option>
            </select>
            <input v-model="accountNumber" placeholder="1234-5678-..." class="modern-input" />
          </div>
        </section>

        <div class="bottom-action">
          <button @click="complete" class="action-button primary-button">
            정산 완료하기
          </button>
        </div>
      </div>

      <!-- Result View -->
      <div v-else class="result-view" ref="resultCard">
        <div class="receipt-paper">
          <div class="paper-top"></div>
          <div class="paper-content">
            <h3>정산 영수증</h3>
            <div class="date">{{ new Date().toLocaleDateString() }}</div>
            
            <div class="divider-dashed"></div>
            
            <div class="result-rows">
              <div v-for="p in participants" :key="p.id" class="result-row">
                <span class="name">{{ p.name }}</span>
                <span class="price">{{ formatAmount(p.share) }}원</span>
              </div>
            </div>

            <div class="divider-solid"></div>
            
            <div class="total-row">
              <span>총 금액</span>
              <span class="total-price">{{ formatAmount(receiptStore.totalAmount) }}원</span>
            </div>

            <div class="account-box">
              <p class="bank-label">{{ bankName }}</p>
              <p class="account-num">{{ accountNumber }}</p>
            </div>
          </div>
          <div class="paper-bottom"></div>
        </div>

        <div class="action-group">
          <button @click="copyToClipboard" class="action-button primary-button">
            복사해서 공유하기
          </button>
          <button @click="resetForm" class="text-button">
            처음으로 돌아가기
          </button>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useReceiptStore } from '../stores/receiptStore'
import draggable from 'vuedraggable'

interface Participant {
  id: number
  name: string
  weight: number
  share: number
}

const router = useRouter()
const receiptStore = useReceiptStore()

// State
const participants = ref<Participant[]>([])
const selectedTemplate = ref('equal')
const bankName = ref('')
const accountNumber = ref('')
const showResult = ref(false)

const templates = [
  { value: 'equal', label: '1/N' },
  { value: 'senior', label: '선배가 더' }, // "From top"
  { value: 'junior', label: '후배가 더' }, // "From bottom"
]

const bankList = ['국민', '신한', '우리', '하나', '농협', '카카오', '토스']

// Logic (Keeping original calculation logic)
watch(() => participants.value, (newParticipants) => {
  if (selectedTemplate.value === 'senior') {
    newParticipants.forEach((p, index) => p.weight = newParticipants.length - index)
  } else if (selectedTemplate.value === 'junior') {
    newParticipants.forEach((p, index) => p.weight = index + 1)
  }
  calculateShares()
  saveSettings()
}, { deep: true })

watch([bankName, accountNumber], () => {
  saveSettings()
})

onMounted(() => {
  loadSettings()
  // Ensure at least 2 participants exist if storage was empty or weird
  if (participants.value.length < 2) {
    participants.value = [
      { id: 1, name: '나', weight: 1, share: 0 },
      { id: 2, name: '친구1', weight: 1, share: 0 },
    ]
  }
  calculateShares()
})

const saveSettings = () => {
  const settings = {
    bankName: bankName.value,
    accountNumber: accountNumber.value,
    participants: participants.value.map(p => ({ 
      id: p.id, 
      name: p.name, 
      weight: p.weight // Also save weights preference
    }))
  }
  localStorage.setItem('dutchpay_settings', JSON.stringify(settings))
}

const loadSettings = () => {
  const saved = localStorage.getItem('dutchpay_settings')
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      if (parsed.bankName) bankName.value = parsed.bankName
      if (parsed.accountNumber) accountNumber.value = parsed.accountNumber
      if (parsed.participants && Array.isArray(parsed.participants)) {
         // Restore participants, but verify structure
         participants.value = parsed.participants.map((p: any) => ({
           id: p.id,
           name: p.name || '이름없음',
           weight: p.weight || 1,
           share: 0 // Will be recalculated
         }))
      }
    } catch (e) {
      console.error('Failed to load settings', e)
    }
  }
}


const increaseParticipants = () => {
  const newId = participants.value.length + 1
  participants.value.push({
    id: newId,
    name: `친구${newId - 1}`,
    weight: 1,
    share: 0,
  })
  calculateShares()
}

const decreaseParticipants = () => {
  participants.value.pop()
  calculateShares()
}

const increaseWeight = (p: Participant) => {
  p.weight++
  calculateShares()
}

const decreaseWeight = (p: Participant) => {
  p.weight--
  calculateShares()
}

const calculateShares = () => {
  const totalWeight = participants.value.reduce((sum, p) => sum + p.weight, 0)
  const totalAmount = receiptStore.totalAmount || 0
  participants.value.forEach(p => {
    p.share = Math.floor((totalAmount * p.weight) / totalWeight)
  })
}

const selectTemplate = (val: string) => {
  selectedTemplate.value = val
  if (val === 'equal') participants.value.forEach(p => p.weight = 1)
  else if (val === 'senior') participants.value.forEach((p, i) => p.weight = participants.value.length - i)
  else if (val === 'junior') participants.value.forEach((p, i) => p.weight = i + 1)
  calculateShares()
}

const formatAmount = (amount: number | null) => amount?.toLocaleString() || '0'

const handleBack = () => {
  if(confirm('정산을 취소하고 돌아갈까요?')) {
    receiptStore.reset()
    router.push('/')
  }
}

const complete = () => {
  if (participants.value.some(p => !p.name.trim())) return alert('이름을 모두 입력해주세요.')
  if (!bankName.value || !accountNumber.value) return alert('계좌 정보를 입력해주세요.')
  showResult.value = true
}

const copyToClipboard = async () => {
  const message = `[더치페이 정산]\n\n총 금액: ${formatAmount(receiptStore.totalAmount)}원\n` +
    `------------------\n` +
    participants.value.map(p => `${p.name}: ${formatAmount(p.share)}원`).join('\n') +
    `\n------------------\n` +
    `입금계좌:\n${bankName.value} ${accountNumber.value}`
  
  // Use Web Share API if available (Mobile Native Share)
  if (navigator.share) {
    try {
      await navigator.share({
        title: '더치페이 정산 결과',
        text: message,
      })
      return
    } catch (err) {
      console.log('Share canceled or failed', err)
    }
  }

  // Fallback to Clipboard
  navigator.clipboard.writeText(message)
    .then(() => alert('정산 내용이 복사되었습니다! 카톡방에 붙여넣기 하세요.'))
    .catch(() => alert('복사 실패 😭 직접 캡처해서 공유해주세요.'))
}

const resetForm = () => {
  showResult.value = false
  participants.value = [{ id: 1, name: '나', weight: 1, share: 0 }, { id: 2, name: '친구1', weight: 1, share: 0 }]
  selectedTemplate.value = 'equal'
  calculateShares()
}
</script>

<style scoped>
.home-container {
  padding: var(--spacing-md);
  min-height: 100vh;
  background-color: var(--bg-color);
  display: flex;
  flex-direction: column;
}

.app-header {
  display: flex;
  align-items: center;
  margin-bottom: var(--spacing-lg);
  position: relative;
  height: 40px;
}
.app-header h1 {
  font-size: 18px;
  flex: 1;
  text-align: center;
}
.back-btn {
  position: absolute;
  left: 0;
  background: none;
  font-size: 24px;
  padding: 0 10px;
}

/* Amount Card */
.amount-card {
  background: white;
  padding: 24px;
  border-radius: var(--radius-lg);
  text-align: center;
  margin-bottom: var(--spacing-lg);
  box-shadow: var(--shadow-sm);
}
.amount-card .label { font-size: 14px; color: var(--text-secondary); }
.amount-row {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  margin: 10px 0;
  color: var(--primary-color);
}
.amount-row .currency { font-size: 20px; margin-top: 6px; margin-right: 4px; }
.amount-row .value { font-size: 36px; font-weight: 800; }
.confidence-badge {
  display: inline-block;
  background: #e8f5e9;
  color: #2e7d32;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
}
.confidence-badge.low { background: #ffebee; color: #c62828; }

/* Sections */
.section-container {
  background: white;
  border-radius: var(--radius-lg);
  padding: 20px;
  margin-bottom: var(--spacing-lg);
  box-shadow: var(--shadow-sm);
}
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.counter-control button {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--bg-color);
  font-weight: bold;
}

.template-selector {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  overflow-x: auto;
}
.chip {
  padding: 8px 16px;
  border-radius: 20px;
  background: var(--bg-color);
  color: var(--text-secondary);
  font-size: 14px;
  white-space: nowrap;
}
.chip.active {
  background: var(--text-primary);
  color: white;
}

.participant-row {
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-color);
  gap: 8px;
}
.handle { color: var(--text-tertiary); cursor: grab; }
.name-input {
  width: 80px;
  border: none;
  font-weight: 500;
  font-size: 16px;
}
.weight-control {
  background: var(--bg-color);
  padding: 4px;
  border-radius: 8px;
  display: flex;
  align-items: center;
}
.weight-control button {
  width: 24px;
  height: 24px;
  background: white;
  border-radius: 4px;
  font-size: 12px;
}
.weight-val { font-size: 12px; margin: 0 8px; color: var(--text-secondary); }
.share-val { margin-left: auto; font-weight: 700; color: var(--text-primary); }

.account-inputs {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.modern-input, .modern-select {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 16px;
}

.bottom-action { margin-top: 20px; margin-bottom: 40px; }
.action-button {
  width: 100%;
  padding: 16px;
  border-radius: var(--radius-md);
  font-weight: 700;
  font-size: 16px;
}
.primary-button { background: var(--primary-color); color: white; }

/* Receipt Paper Style */
.receipt-paper {
  background: white;
  margin: 20px 0 40px; /* More bottom margin for the jagged edge */
  filter: drop-shadow(0 4px 15px rgba(0,0,0,0.08));
  position: relative;
  /* Remove buggy mask */
}

/* Jagged Edge using Pseudo-element (Safer) */
.receipt-paper::after {
  content: "";
  position: absolute;
  left: 0;
  bottom: -10px;
  width: 100%;
  height: 20px;
  background-image: linear-gradient(135deg, white 50%, transparent 50%),
                    linear-gradient(45deg, transparent 50%, white 50%);
  background-position: top left, top left;
  background-size: 20px 20px;
  background-repeat: repeat-x;
}

.paper-content { padding: 40px 30px 20px; text-align: center; }
.paper-content h3 { margin-bottom: 8px; font-size: 20px; font-weight: 800; }
.paper-content .date { color: var(--text-tertiary); font-size: 13px; margin-bottom: 24px; letter-spacing: 0.5px; }

.divider-dashed { border-top: 2px dashed #e5e8eb; margin: 24px 0; }
.divider-solid { border-top: 2px solid var(--text-primary); margin: 24px 0; }

.result-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 16px;
  color: var(--text-secondary);
}
.result-row .name { font-weight: 500; }
.result-row .price { font-weight: 600; color: var(--text-primary); }

.total-row {
  display: flex;
  justify-content: space-between;
  font-weight: 800;
  font-size: 20px;
  color: var(--primary-color);
  margin-top: 10px;
}
.account-box {
  margin-top: 32px;
  background: var(--bg-color);
  padding: 20px;
  border-radius: 12px;
  text-align: center;
}
.bank-label { font-size: 13px; color: var(--text-tertiary); margin-bottom: 6px; }
.account-num { 
  font-size: 18px; 
  font-weight: 700; 
  letter-spacing: 0.5px; 
  color: var(--text-primary);
  user-select: all; /* Make it easy to copy manually */
}

.action-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 20px;
}

.text-button {
  width: 100%;
  padding: 16px;
  background: none;
  border: none;
  font-size: 14px;
  color: var(--text-secondary);
  text-decoration: underline;
  cursor: pointer;
}
</style>
