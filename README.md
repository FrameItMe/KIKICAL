# KIKICAL 🥗💪

> **Calorie & Fitness Tracker with Gamification**  
> เว็บแอปบันทึกอาหารและออกกำลังกาย พร้อมระบบคำนวณโภชนาการ เป้าหมายส่วนบุคคล และ Achievement System

---

## 📖 Overview

**KIKICAL** คือแอปพลิเคชันเว็บสำหรับติดตามการกินและการออกกำลังกาย โดยมีระบบคำนวณแคลอรีและโภชนาการอัตโนมัติ พร้อมระบบ Gamification ที่ช่วยให้การดูแลสุขภาพสนุกและมีแรงจูงใจมากขึ้น

### ✨ Features

- **🔐 Authentication System**  
  ระบบสมัครสมาชิกและเข้าสู่ระบบที่ปลอดภัยด้วย JWT และ bcrypt password hashing

- **📊 Smart Profile & Targets**  
  คำนวณค่า BMR, TDEE และ Macros (โปรตีน/คาร์บ/ไขมัน) อัตโนมัติตามข้อมูลส่วนบุคคล

- **🍎 Meal Tracking**  
  - ค้นหาอาหารจากฐานข้อมูล (Food Search)
  - ปรับขนาด portion และคำนวณแคลอรีอัตโนมัติ
  - บันทึก แก้ไข และลบรายการอาหารประจำวัน
  - คำนวณรวมแคลอรีและโภชนาการต่อวัน

- **🏋️ Workout Logging**  
  บันทึกกิจกรรมออกกำลังกาย พร้อมคำนวณแคลอรีที่เผาผลาญ

- **📈 Dashboard**  
  แสดงสถิติรายวัน: Net Calories, เป้าหมาย, Macros breakdown, Streak และ Badges ล่าสุด

- **🏆 Achievement System**  
  - ระบบ Badges และ Challenges
  - Toast Notifications เมื่อปลดล็อก Achievement
  - Streak tracking เพื่อกระตุ้นการใช้งานต่อเนื่อง

- **🎨 Modern UI/UX**  
  - Responsive Design (Mobile / Tablet / Desktop)
  - Dark Mode Toggle
  - Hamburger Navigation Drawer
  - Clean และใช้งานง่าย

---

## 🛠 Tech Stack

### Frontend
- **HTML5** - โครงสร้างหน้าเว็บ
- **CSS3** - Custom responsive styling
- **Vanilla JavaScript** - Logic และ DOM manipulation (ไม่ใช้ Framework)

### Backend
- **Node.js** v20+ - Runtime environment
- **Hono** - Fast, lightweight web framework (TypeScript)
- **SQLite** (better-sqlite3) - Database with WAL mode
- **JWT** - Token-based authentication
- **bcrypt** - Password hashing

### Database Schema (หลัก)
- `users` - ข้อมูลผู้ใช้
- `targets` - เป้าหมายแคลอรีและโภชนาการ
- `food` - ฐานข้อมูลอาหาร
- `meal_log` - บันทึกมื้ออาหาร
- `workouts` - บันทึกการออกกำลังกาย
- `badges` / `challenges` - Achievement definitions
- `user_earned_badges` / `user_challenge_progress` - Achievement tracking

---

## 📁 Project Structure

```
KIKICAL/
├── backend/
│   ├── src/
│   │   ├── database/
│   │   │   └── db.ts              # SQLite initialization, WAL mode
│   │   ├── routes/
│   │   │   ├── auth.ts            # Authentication endpoints
│   │   │   ├── user.ts            # User profile & dashboard
│   │   │   ├── food.ts            # Food search API
│   │   │   ├── meals.ts           # Meal CRUD operations
│   │   │   ├── workouts.ts        # Workout CRUD operations
│   │   │   └── achievements.ts    # Badges & challenges
│   │   ├── utils/
│   │   │   ├── achievements.ts    # Achievement logic
│   │   │   ├── dateTime.ts        # Date utilities
│   │   │   └── userCalculations.ts# BMR/TDEE/Macros calculations
│   │   ├── scripts/
│   │   │   ├── init-db.ts         # Database initialization
│   │   │   ├── seed-food.ts       # Seed food database
│   │   │   └── seed-achievements.ts# Seed achievements
│   │   └── index.ts               # Server entry point
│   ├── package.json
│   └── tsconfig.json
│
└── Frontend/
    ├── html/
    │   ├── login.html             # Login page
    │   ├── register.html          # Registration page
    │   ├── predashboard.html      # Welcome/intro page
    │   ├── dashboard.html         # Main dashboard
    │   ├── meals.html             # Meal tracking page
    │   ├── workouts.html          # Workout logging page
    │   ├── achievements.html      # Achievements showcase
    │   └── profile.html           # User profile & targets
    │
    ├── javascript/
    │   ├── auth.js                # Login/Register logic
    │   ├── logout.js              # Logout functionality
    │   ├── predashboard.js        # Pre-dashboard interactions
    │   ├── dashboard.js           # Dashboard data & charts
    │   ├── meals.js               # Meal tracking logic
    │   ├── workouts.js            # Workout logging logic
    │   ├── achievements.js        # Achievement display
    │   ├── profile.js             # Profile management
    │   ├── notifications.js       # Toast notification system
    │   └── theme.js               # Dark mode toggle
    │
    └── style/
        └── kikical.css            # Main stylesheet (responsive)
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v20 or higher
- **npm** (มากับ Node.js)

### Installation & Setup

#### 1️⃣ Clone the repository
```bash
git clone <repository-url>
cd KIKICAL
```

#### 2️⃣ Install backend dependencies
```bash
cd backend
npm install
```

#### 3️⃣ Initialize database
```bash
npm run db:init
```

#### 4️⃣ (Optional) Seed sample data
```bash
npm run db:seed:food
npm run db:seed:achievements
```

#### 5️⃣ Start the backend server
```bash
npm run dev
```
Backend จะรันที่ `http://localhost:8000`

#### 6️⃣ Open the frontend
- ใช้ **Live Server extension** ใน VS Code
- เปิดไฟล์ `Frontend/html/login.html`
- หรือรัน: `npm run start_F` (จาก backend folder)

---

## 🔌 API Endpoints

### 🔐 Authentication
```http
POST   /auth/register          # สมัครสมาชิก
POST   /auth/login             # เข้าสู่ระบบ
GET    /auth/me                # ดึงข้อมูลผู้ใช้ปัจจุบัน
```

### 👤 User & Dashboard
```http
GET    /user/dashboard         # Dashboard data (daily summary)
```

### 🍽️ Meals
```http
GET    /meals/:userId?date=    # ดึงรายการมื้ออาหารตามวัน
POST   /meals                  # เพิ่มมื้ออาหาร
PUT    /meals/:id              # แก้ไขมื้ออาหาร
DELETE /meals/:id              # ลบมื้ออาหาร
```

### 🔍 Food Search
```http
GET    /food/search?q=         # ค้นหาอาหาร (exact/prefix priority)
```

### 💪 Workouts
```http
GET    /workouts?date=         # ดึงรายการออกกำลังกายตามวัน
POST   /workouts               # เพิ่มการออกกำลังกาย
PUT    /workouts/:id           # แก้ไขการออกกำลังกาย
DELETE /workouts/:id           # ลบการออกกำลังกาย
```

### 🏆 Achievements
```http
GET    /achievements           # ดึงรายการ badges และ challenges
```

---

## 📝 Development Notes

### UI/UX Design
- ออกแบบ Responsive สำหรับทุก Screen Size
- Hamburger Navigation Drawer บน Mobile/Tablet
- Dark Mode Toggle พร้อม localStorage persistence
- Logout button อยู่ด้านล่างสุดของ Drawer

### Food Search Algorithm
- จัดลำดับผลลัพธ์: Exact Match → Prefix Match → Contains
- ช่วยให้ผู้ใช้หาอาหารได้รวดเร็วและแม่นยำ

### Achievement System
- ห่อ try-catch เพื่อไม่ให้การ check achievements บล็อกการบันทึกข้อมูล
- Toast notifications แสดงทันทีเมื่อได้รับ badge ใหม่

### CORS & Security
- CORS เปิดไว้สำหรับ development
- JWT authentication ทุก protected routes
- Password hashing ด้วย bcrypt

---

## 👨‍💻 Authors

- **FrameItMe**
- **Pangpond**

---

## 📄 License

MIT License - โปรเจกต์นี้พัฒนาเพื่อการศึกษา

---

**Happy Tracking! 🎯**