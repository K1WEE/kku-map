# 🗺️ KKU Maps — แผนที่มหาวิทยาลัยขอนแก่นแบบโต้ตอบได้ (Interactive Campus Map)

**KKU Maps** คือแอปพลิเคชันแผนที่มหาวิทยาลัยขอนแก่นแบบ Interactive Interactive โต้ตอบได้ พัฒนาด้วย Next.js, Tailwind CSS v4 และ Leaflet ช่วยให้อาจารย์ นักศึกษา และบุคคลภายนอกสามารถค้นหาอาคาร คณะ ร้านอาหาร จุดสำคัญต่างๆ และดูขอบเขต (Zones) ของแต่ละคณะภายใน มข. ได้อย่างสะดวกและรวดเร็ว

---

## ✨ คุณสมบัติเด่น (Key Features)

* **🗺️ Interactive Map (Leaflet)**: แสดงผลแผนที่นำทางที่มีประสิทธิภาพสูง รองรับการซูมและเลื่อนอย่างลื่นไหล พร้อมระบบ Marker Clustering รวมกลุ่มจุดปักหมุดเมื่อซูมออก
* **🔍 ค้นหาแบบกึ่งอัจฉริยะ (Fuzzy Search)**: ค้นหาตึกเรียนหรือสถานที่ได้ทันทีผ่านระบบค้นหาด้วย **Fuse.js** รองรับการค้นหาผ่านชื่อภาษาไทย ชื่อภาษาอังกฤษ คำอธิบาย และ**ชื่อย่อ/ชื่อเล่นสะกดคำ** (เช่น พิมพ์ "EN01", "ตึกวิศวะ 1", "Civil" เพื่อหาตึกวิศวกรรมโยธา)
* **🎨 ขอบเขตคณะ (Campus Zones)**: แสดงผล Polygon สีสันตามขอบเขตพื้นที่จริงของคณะต่างๆ (เช่น คณะวิศวกรรมศาสตร์, คณะเกษตรศาสตร์) สามารถเปิด-ปิดเลเยอร์เขตพื้นที่ได้ตามความต้องการ
* **🏷️ คัดกรองหมวดหมู่ (Category Filters)**: กรองดูเฉพาะจุดที่ต้องการ เช่น ตึกเรียน, คณะ, หอพัก, ร้านอาหาร, ห้องสมุด และจุดสำคัญ (Landmarks)
* **⚙️ Admin Portal สำหรับนักพัฒนา (Dev Only)**: หน้าแอดมินพิเศษสำหรับแก้ไขข้อมูลแผนที่ได้จากบนหน้าจอ (เช่น วาดขอบเขตพื้นที่คณะใหม่, ปักหมุดย้ายตำแหน่งตึก) และอัปเดตไฟล์ JSON ท้องถิ่นโดยอัตโนมัติ

---

## 🛠️ Stack เทคโนโลยี (Tech Stack)

* **Framework**: Next.js 16 (React 19, App Router)
* **Styling**: Tailwind CSS v4 (พร้อมดีไซน์ Modern HSL/OKLCH, Glassmorphism, Micro-animations)
* **Mapping Library**: Leaflet & [React-Leaflet](https://react-leaflet.js.org/)
* **Fuzzy Search Engine**: [Fuse.js](https://www.fusejs.io/)
* **Data Validation**: Zod (ใช้ตรวจสอบข้อมูลสำหรับ Admin API)

---

## 📂 โครงสร้างของโปรเจกต์ (Project Structure)

```text
├── app/                  # Next.js App Router (Pages & API Routes)
│   ├── admin/            # หน้าสำหรับผู้ดูแลระบบ (Admin Dashboard)
│   ├── api/admin/        # API สำหรับดึง แก้ไข และบันทึกข้อมูล Places/Zones (เฉพาะ Dev Mode)
│   └── globals.css       # การตั้งค่า CSS และดีไซน์ Tokens (Tailwind v4)
├── components/           # React Components
│   ├── admin/            # UI Components สำหรับระบบ Admin
│   ├── FilterChips.tsx   # แท็บปุ่มกดคัดกรองหมวดหมู่สถานที่
│   ├── Map.tsx           # คอมโพเนนต์หลักที่แสดง Leaflet Map
│   ├── PlaceSheet.tsx    # การ์ดแสดงข้อมูลรายละเอียดสถานที่ (Bottom Sheet)
│   └── SearchBar.tsx     # ช่องค้นหา (Fuzzy Search)
├── data/                 # แหล่งจัดเก็บข้อมูล JSON
│   ├── places.json       # พิกัดอาคาร สถานที่จัดเรียงตามหมวดหมู่
│   └── zones.json        # พิกัด Polygon เขตพื้นที่ของแต่ละคณะ
├── lib/                  # ฟังก์ชันตัวช่วย, Types และ Schemas
│   ├── admin/            # โค้ด Backend สื่อสารฐานข้อมูล/Validation
│   ├── icons.ts          # ตัวจัดการไอคอนหมุดแผนที่
│   └── types.ts          # ไทป์ TypeScript (Place, Zone, Category)
```

---

## 🚀 เริ่มต้นใช้งานโปรเจกต์ (Getting Started)

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. รันโปรเจกต์ในโหมด Development
```bash
npm run dev
```
เปิดบราวเซอร์ไปที่ [http://localhost:3000](http://localhost:3000) เพื่อดูผลลัพธ์การทำงานของแผนที่

### 3. Build สำหรับใช้งานจริง (Production Build)
```bash
npm run build
npm start
```

---

## 🧑‍💻 วิธีอัปเดตและเพิ่มข้อมูลสถานที่ (Managing Map Data)

โปรเจกต์นี้เก็บข้อมูลทั้งหมดในรูปแบบไฟล์ JSON ในโฟลเดอร์ `/data` เพื่อให้แก้ไขได้ง่ายและยืดหยุ่น

### ช่องทางที่ 1: ผ่านหน้าจอผู้ดูแลระบบ (Admin Portal)
เมื่อรันโปรเจกต์ในโหมดพัฒนา (`NODE_ENV=development`) คุณสามารถเข้าใช้งาน Admin Map ได้ผ่าน URL:
👉 **[http://localhost:3000/admin](http://localhost:3000/admin)**
* **การปักหมุดสถานที่ใหม่**: คลิก `+ เพิ่มจุดใหม่` -> คลิกเลือกตำแหน่งบนแผนที่ -> กรอกข้อมูล -> กดบันทึก
* **การวาดโซนใหม่**: คลิก `+ เพิ่มโซนใหม่` -> คลิกจุดบนแผนที่ทีละจุดเพื่อเชื่อมต่อ Polygon -> กด `เสร็จ` และกรอกชื่อ/สีโซน -> กดบันทึก
* *ระบบจะบันทึกข้อมูลลงไฟล์ `places.json` หรือ `zones.json` โดยอัตโนมัติทันที*

### ช่องทางที่ 2: แก้ไขไฟล์ JSON โดยตรง
คุณสามารถเพิ่ม/แก้ไขสถานที่ได้โดยเข้าแก้ไขที่ไฟล์:
* **ไฟล์สถานที่**: [data/places.json](file:///Users/kawin/COE%20/Project/Kku-maps/data/places.json)
* **ไฟล์โซนพื้นที่**: [data/zones.json](file:///Users/kawin/COE%20/Project/Kku-maps/data/zones.json)

#### โครงสร้างข้อมูลสถานที่ (`Place` Schema)
```json
{
  "id": "EN04",
  "name": "ภาควิชาวิศวกรรมคอมพิวเตอร์ (EN04)",
  "nameEn": "Computer Engineering Department",
  "faculty": "engineering",
  "category": "building",
  "lat": 16.472414001477887,
  "lng": 102.82298744046162,
  "description": "อาคารเรียน 4 คณะวิศวกรรมศาสตร์ มหาวิทยาลัยขอนแก่น",
  "aliases": [
    "EN04",
    "คอม",
    "วิศวะคอม",
    "ตึก 4"
  ]
}
```

---

## 🌟 ใบอนุญาต (License)

ลิขสิทธิ์ของซอฟต์แวร์นี้เป็นส่วนหนึ่งของคณะวิศวกรรมศาสตร์ มหาวิทยาลัยขอนแก่น (KKU)
