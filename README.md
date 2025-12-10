# KIKICAL 🥗🏋️‍♂️

ระบบ Web Application สำหรับบันทึกการกินและการออกกำลังกาย พร้อมระบบคำนวณโภชนาการและเป้าหมายสุขภาพ  
พัฒนาขึ้นโดยใช้ Node.js (Hono Framework) และ SQLite พร้อมระบบ Gamification เพื่อสร้างแรงจูงใจในการดูแลสุขภาพ

## ✨ ฟีเจอร์หลัก (Features)

* **🔐 Authentication System**
  - ระบบสมัครสมาชิกและเข้าสู่ระบบด้วย JWT
  - Password Hashing ด้วย bcrypt
  - Token-based Authentication

* **📊 User Profile & Setup**
  - ตั้งค่าข้อมูลส่วนตัว (เพศ, อายุ, ส่วนสูง, น้ำหนัก)
  - คำนวณ BMR และ TDEE อัตโนมัติ
  - กำหนดเป้าหมาย (ลดน้ำหนัก/เพิ่มน้ำหนัก/คงที่)
  - คำนวณปริมาณ Macros ที่เหมาะสม (Protein, Carb, Fat)

* **🍎 Meal Logging**
  - ค้นหาและบันทึกอาหารจากฐานข้อมูล
  - ระบบ Portion Multiplier (0.1x - 10x)
  - คำนวณโภชนาการรวมต่อวัน
  - แบ่งประเภทมื้ออาหาร (เช้า, กลางวัน, เย็น, ของว่าง)

* **🏋️‍♀️ Workout Tracking**
  - บันทึกกิจกรรมการออกกำลังกาย
  - ติดตามแคลอรี่ที่เผาผลาญ
  - บันทึกระยะเวลาการออกกำลังกาย
  - สรุปยอดรวมต่อวัน

* **📈 Dashboard**
  - แสดงสรุป Net Calories (รับ - เผา)
  - Progress Bar แสดงผลเทียบกับเป้าหมาย
  - สรุปยอด Macros ทั้งหมด
  - อัพเดทแบบ Real-time

* **🏆 Achievement System**
  - **Badges**: ปลดล็อคตามเงื่อนไข (เช่น บันทึกครบ 7 วันติด, บันทึกมื้อแรก)
  - **Challenges**: ภารกิจที่ต้องทำให้สำเร็จ (เช่น โปรตีนครบเป้า 30 วัน, เผาผลาญ 10,000 cal)
  - ระบบแจ้งเตือนแบบ Toast Notification
  - Progress Tracking แบบ Real-time

* **🔔 Notification System**
  - Queue-based Toast Notifications
  - แสดงเมื่อปลดล็อค Badge หรือทำ Challenge สำเร็จ
  - Animation Slide-in จากมุมขวาล่าง

## 🛠️ Tech Stack

**Frontend:**
- HTML5, CSS3 (Bootstrap 5.3)
- Vanilla JavaScript (ES6+)
- Responsive Design

**Backend:**
- Runtime: Node.js v20+
- Framework: [Hono.js](https://hono.dev/) (Fast & Lightweight)
- Language: TypeScript
- Authentication: JWT (jsonwebtoken) + bcrypt
- Database: SQLite3 (better-sqlite3)
- Database Mode: WAL (Write-Ahead Logging) for better concurrency

**Database Schema:**
- Users, Targets, Meal Logs, Workout Logs
- Food Database (1000+ items)
- Badges, Challenges, Progress Tracking Tables

---

## 📁 โครงสร้างโปรเจกต์ (Project Structure)

```
KIKICAL/
├── backend/
│   ├── src/
│   │   ├── database/
│   │   │   ├── db.ts              # Database initialization (WAL mode)
│   │   │   └── kikical.db         # SQLite database file
│   │   ├── routes/
│   │   │   ├── auth.ts            # Authentication routes
│   │   │   ├── user.ts            # User profile & setup
│   │   │   ├── meals.ts           # Meal logging endpoints
│   │   │   ├── workouts.ts        # Workout tracking endpoints
│   │   │   └── achievements.ts    # Badges & challenges
│   │   ├── utils/
│   │   │   ├── achievements.ts    # Badge/challenge logic
│   │   │   └── time.ts            # Datetime utilities
│   │   ├── scripts/
│   │   │   └── init-db.ts         # Database seeding script
│   │   └── index.ts               # Main server entry point
│   ├── package.json
│   └── tsconfig.json
│
└── Frontend/
    ├── html/
    │   ├── login.html             # Login page
    │   ├── register.html          # Register page
    │   ├── predashboard.html      # Setup wizard (4 steps)
    │   ├── dashboard.html         # Main dashboard
    │   ├── meals.html             # Meal logging page
    │   ├── workouts.html          # Workout tracking page
    │   └── achievements.html      # Badges & challenges page
    ├── javascript/
    │   ├── auth.js                # Authentication logic
    │   ├── logout.js              # Logout dropdown handler
    │   ├── predashboard.js        # Setup wizard logic
    │   ├── dashboard.js           # Dashboard calculations
    │   ├── meals.js               # Meal search & logging
    │   ├── workouts.js            # Workout logging
    │   ├── achievements.js        # Achievement display
    │   └── notifications.js       # Toast notification system
    └── style/
        ├── styles.css             # Global styles
        ├── predashboard.css       # Setup wizard styles
        └── kikical.css            # Additional component styles
```

---

## ⚙️ วิธีการติดตั้งและรันโปรเจกต์ (Installation & Setup)

### Prerequisites
- Node.js v20 หรือสูงกว่า
- npm หรือ yarn

### 1. Clone Repository
```bash
git clone https://github.com/FrameItMe/KIKICAL.git
cd KIKICAL
```

### 2. ติดตั้ง Backend Dependencies
```bash
cd backend
npm install
```

### 3. Initialize Database
```bash
npm run init-db
```
คำสั่งนี้จะสร้างตารางและ seed ข้อมูลเริ่มต้น:
- ฐานข้อมูลอาหาร 1000+ รายการ
- Badges 10 ชนิด
- Challenges 6 ภารกิจ

### 4. รัน Backend Server
```bash
npm run dev
```
Server จะรันที่ `http://localhost:8000`

### 5. เปิด Frontend
เปิดไฟล์ HTML ในโฟลเดอร์ `Frontend/html/` ด้วย Live Server หรือเปิดไฟล์โดยตรง:
- เริ่มต้นที่ `login.html` หรือ `register.html`

---

## 🚀 การใช้งาน (Usage)

### 1. สมัครสมาชิกและเข้าสู่ระบบ
- ไปที่ `register.html` เพื่อสร้างบัญชี
- Login ที่ `login.html`

### 2. Setup Profile (ครั้งแรก)
- หลัง Login จะถูกนำไปหน้า Setup Wizard (4 ขั้นตอน)
  1. **Step 1**: เลือกเพศ, กรอกวันเกิด, ส่วนสูง, น้ำหนัก
  2. **Step 2**: เลือกระดับกิจกรรม (Sedentary → Very Active)
  3. **Step 3**: เลือกเป้าหมาย (ลด/เพิ่ม/คงที่น้ำหนัก)
  4. **Step 4**: ดูสรุปและยืนยัน
- ระบบจะคำนวณ BMR, TDEE, และ Macros ให้อัตโนมัติ

### 3. บันทึกอาหาร (Meals)
- ไปที่หน้า Meals
- ค้นหาอาหารที่ต้องการ
- เลือก Portion Multiplier
- เลือกประเภทมื้อ (เช้า/กลางวัน/เย็น/ของว่าง)
- กด Log Meal

### 4. บันทึกการออกกำลังกาย (Workouts)
- ไปที่หน้า Workouts
- กรอกชื่อกิจกรรม
- กรอกแคลอรี่ที่เผาผลาญและระยะเวลา
- กด Log Workout

### 5. ดู Dashboard
- แสดง Net Calories (Consumed - Burned)
- แสดงเปอร์เซ็นต์เทียบกับเป้าหมาย
- สรุป Macros ทั้งหมด

### 6. ดู Achievements
- ตรวจสอบ Badges ที่ปลดล็อคแล้ว
- ติดตามความคืบหน้า Challenges
- รับ Notification เมื่อปลดล็อคสำเร็จ

---

## 🗄️ Database Schema

### Core Tables
- **users**: ข้อมูลผู้ใช้ + setup values
- **targets**: เป้าหมายโภชนาการรายวัน
- **food**: ฐานข้อมูลอาหาร (1000+ items)
- **meal_log**: บันทึกการกินอาหาร
- **workout_log**: บันทึกการออกกำลังกาย

### Achievement Tables
- **badges**: ตาราง Badge (10 ชนิด)
- **user_badges**: บันทึกว่าใครปลดล็อค Badge ไหนแล้ว
- **challenges**: ตาราง Challenge (6 ภารกิจ)
- **challenge_progress**: ติดตามความคืบหน้า Challenge

---

## 🔧 API Endpoints

### Authentication
- `POST /auth/register` - สมัครสมาชิก
- `POST /auth/login` - เข้าสู่ระบบ
- `GET /auth/me` - ดึงข้อมูลผู้ใช้ปัจจุบัน

### User Profile
- `POST /user/setup` - ตั้งค่า profile และคำนวณเป้าหมาย
- `GET /user/setup-status` - เช็คว่าทำ setup แล้วหรือยัง
- `GET /user/:id/targets` - ดึงเป้าหมายโภชนาการ

### Meals
- `GET /meals/:userId?date=YYYY-MM-DD` - ดึงรายการอาหารตามวัน
- `POST /meals` - บันทึกอาหาร
- `DELETE /meals/:id` - ลบรายการอาหาร
- `GET /food/search?q=query` - ค้นหาอาหาร

### Workouts
- `GET /workouts/:userId?date=YYYY-MM-DD` - ดึงรายการออกกำลังกาย
- `POST /workouts` - บันทึกการออกกำลังกาย
- `DELETE /workouts/:id` - ลบรายการออกกำลังกาย

### Achievements
- `GET /achievements/:userId` - ดึง Badges และ Challenges พร้อม progress

---

## 🎯 Achievement System Details

### Badges (10 ชนิด)
1. **First Meal** - บันทึกมื้ออาหารครั้งแรก
2. **First Workout** - บันทึกการออกกำลังกายครั้งแรก
3. **Calorie Master** - กินครบเป้าแคลอรี่ 1 วัน (±50 cal)
4. **Protein King** - โปรตีนครบเป้า 1 วัน (±5g)
5. **Carb Champion** - คาร์บครบเป้า 1 วัน (±10g)
6. **Fat Wizard** - ไขมันครบเป้า 1 วัน (±5g)
7. **7-Day Streak** - บันทึกอาหารครบ 7 วันติด
8. **Perfect Week** - Macros ครบทุกตัว 7 วัน
9. **Macro Master** - ทุก Macro ครบเป้าในวันเดียว
10. **Dedicated Logger** - บันทึกครบ 30 วันติด

### Challenges (6 ภารกิจ)
1. **Protein Goal 30** - โปรตีนครบเป้า 30 วัน
2. **Carb Balance 30** - คาร์บครบเป้า 30 วัน
3. **Fat Balance 30** - ไขมันครบเป้า 30 วัน
4. **100 Meals** - บันทึกอาหารครบ 100 มื้อ
5. **50 Workouts** - ออกกำลังกายครบ 50 ครั้ง
6. **Burn 10k** - เผาผลาญครบ 10,000 แคลอรี่สะสม

---

## 🔒 Security Features

- Password Hashing ด้วย bcrypt (10 rounds)
- JWT Token Authentication (1-day expiration)
- Authorization Middleware ทุก protected routes
- User ownership validation (ไม่สามารถแก้ไขข้อมูลคนอื่นได้)

---

## 📝 Development Notes

### Database Configuration
- ใช้ **WAL mode** (Write-Ahead Logging) แทน DELETE mode
- ตั้ง `busy_timeout = 5000ms` เพื่อป้องกัน lock conflicts
- `synchronous = NORMAL` เพื่อ balance ระหว่าง performance และ safety

### Error Handling
- Achievement checking wrapped in try-catch (ไม่ block meal/workout logging)
- Comprehensive error messages ทั้ง frontend และ backend
- CORS enabled for development

---

## 👨‍💻 Author

**FrameItMe & Pangpond**  
GitHub: [@FrameItMe](https://github.com/FrameItMe)
GitHub: [@Pang-pond](https://github.com/Pang-pond)

---

## 📄 License

MIT License - Feel free to use for educational purposes

---

## 🙏 Acknowledgments

- Bootstrap 5.3 for UI components
- Hono.js for lightweight backend framework
- Better-sqlite3 for fast SQLite operations