import { createRouter, createWebHistory } from 'vue-router'
import { useReceiptStore } from '@/stores/receiptStore'
import ImageUploader from '@/components/ImageUploader.vue'
import DutchPayForm from '@/components/DutchPayForm.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: ImageUploader
    },
    {
      path: '/dutch-pay',
      name: 'dutchPay',
      component: DutchPayForm,
      beforeEnter: (to, from, next) => {
        const receiptStore = useReceiptStore()
        if (receiptStore.totalAmount === null) {
          next('/')
        } else {
          next()
        }
      }
    }
  ]
})

export default router
