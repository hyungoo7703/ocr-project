# 💰 더드미 (Dutch Pay Assistant)

> **"영수증만 찍으세요, 복잡한 정산은 제가 할게요."**  
> 웹에서도 네이티브 앱처럼 동작하는 **OCR 기반 더치페이 서비스**입니다.

![Project Preview](./public/preview-placeholder.png) 
<!-- 👆 여기에 캡처한 이미지를 넣어주세요! (예: public 폴더에 넣고 경로 연결) -->

## ✨ Key Features (핵심 기능)

이 프로젝트는 **"웹의 한계를 넘는 사용자 경험(UX)"**을 목표로 개발되었습니다.

### 1. 📸 Native-like Camera Experience
- **웹 브라우저(Web API)**만으로 네이티브 카메라 UI를 완벽하게 구현했습니다.
- **전체 화면 뷰파인더**, 셔터 버튼, 앨범 선택 등 직관적인 인터페이스를 제공합니다.
- 모바일 환경(`facingMode: environment`)에 최적화되어 있습니다.

### 2. ⚡️ Smart OCR & Image Processing
- **Tesseract.js**를 활용하여 서버 없이 **클라이언트 측에서 실시간**으로 텍스트를 인식합니다.
- **Canvas Image Processing**: OCR 인식률을 높이기 위해 촬영된 이미지를 **고대비/흑백(Grayscale & High Contrast)**으로 자동 보정합니다.

### 3. 📱 Progressive Web App (PWA)
- **설치 가능한 웹앱**: 홈 화면에 추가하여 앱처럼 사용할 수 있습니다.
- 스플래시 스크린, 테마 컬러, 모바일 뷰포트 최적화(`user-scalable=no`)가 적용되어 있습니다.

### 4. 🎨 Modern Design System
- **Mobile-First**: 모바일 사용성을 최우선으로 고려한 레이아웃.
- **Micro-Interactions**: 부드러운 화면 전환(Transition)과 정산 결과 영수증 효과.
- **Web Share API**: 카카오톡/문자 등 기본 공유 기능과 연동됩니다.

---

## 🛠 Tech Stack

| Category | Technology |
|----------|------------|
| **Core** | Vue 3, TypeScript, Vite |
| **State** | Pinia |
| **Styling** | Modern CSS Variables (Design System) |
| **OCR** | Tesseract.js |
| **PWA** | Vite-Plugin-PWA |

---

## 🚀 Getting Started

### Installation
```bash
# 1. Clone the repository
git clone [repository-url]

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

### Mobile Test
1. `npm run dev -- --host` 명령어로 실행하세요.
2. 같은 와이파이에 연결된 휴대폰으로 `http://[PC-IP]:5173`에 접속하세요.
3. 카메라 권한을 허용하면 바로 테스트 가능합니다.

---

## 📝 License
This project is licensed under the MIT License.
