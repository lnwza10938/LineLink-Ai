# LineLink AI

ผู้ช่วยข้อมูลสำหรับองค์กรที่ทำงานอยู่บน LINE ทั้งหมด: พนักงานพิมพ์คำสั่งหรือคำถามภาษาธรรมชาติในแชท LINE, AI จะตีความคำขอนั้น, ไปดึงข้อมูลที่เกี่ยวข้องผ่านกลไก tool-calling แล้วตอบกลับมาเป็นข้อความสรุปที่กระชับ

รีโปนี้เป็น **โครง (scaffold)** ยังไม่ใช่สินค้าที่เสร็จสมบูรณ์ ภายในมีฐานข้อมูลจำลอง (สินค้า, สต๊อก, ลูกค้า, คำสั่งซื้อ) ที่หน้าตาคล้ายระบบ POS จริง เพื่อพิสูจน์ให้เห็นว่า pipeline ทั้งสาย — LINE → AI → ฐานข้อมูล → LINE — ทำงานได้ครบวงจรก่อนที่จะมีข้อมูลธุรกิจจริง ชั้นข้อมูล (`src/db/`) ถูกแยกออกมาอยู่หลังฟังก์ชัน repository เพื่อให้ภายหลังสามารถชี้ไปที่ฐานข้อมูล POS จริงได้โดยไม่ต้องแตะชั้น LINE หรือชั้น AI เลย

## สถาปัตยกรรม

```
LINE chat → LINE webhook (Express + @line/bot-sdk ตรวจสอบลายเซ็น)
          → AI orchestrator (วนลูป tool-calling ผ่าน LlmProvider ที่สลับผู้ให้บริการได้)
          → ทะเบียนเครื่องมือ (list_products, check_stock, get_customer_orders, get_sales_summary)
          → Prisma repositories → PostgreSQL
          → ตอบกลับเป็นภาษาธรรมชาติ → LINE
```

ชั้น AI ถูกซ่อนอยู่หลัง interface ชื่อ `LlmProvider` (`src/ai/types.ts`) เพื่อไม่ให้โค้ดผูกติดกับผู้ให้บริการรายใดรายหนึ่ง ตอนนี้มีให้ใช้ 2 แบบ:
- `AnthropicProvider` — เรียก Claude API พร้อม tool-calling จริง
- `MockProvider` — จำลองการตอบโดยจับคำสำคัญแบบไม่ต้องต่อเน็ต ใช้สำหรับทดสอบในเครื่อง

สลับไปมาได้ด้วย environment variable `AI_PROVIDER` ถ้าในอนาคตอยากเปลี่ยนไปใช้ AI ค่ายอื่นหรือโมเดล local ก็แค่เพิ่มไฟล์ provider ใหม่อีกไฟล์เดียว ไม่ต้องเขียนแอปใหม่

## สิ่งที่ต้องมีก่อนเริ่ม

- Node.js 22 ขึ้นไป
- Docker (สำหรับรัน PostgreSQL ผ่าน `docker-compose.yml`) — หรือจะมี PostgreSQL 16 ติดตั้งอยู่แล้วในเครื่องก็ได้

## ติดตั้งและเริ่มใช้งาน

```bash
npm install
cp .env.example .env

docker compose up -d          # เปิด PostgreSQL
npm run prisma:migrate        # สร้างโครงสร้างตาราง (schema)
npm run prisma:seed           # ใส่ข้อมูลจำลอง (สินค้า/ลูกค้า/คำสั่งซื้อ)

npm run dev                   # เริ่มเซิร์ฟเวอร์ที่พอร์ต PORT (ค่าเริ่มต้น 3000)
```

## ทดสอบในเครื่องโดยไม่ต้องมี LINE channel หรือ Anthropic key จริง

ตั้งค่าใน `.env`:
```
AI_PROVIDER=mock
LINE_DRY_RUN=true
```

เมื่อเปิดเซิร์ฟเวอร์ dev ทิ้งไว้ ให้เปิดอีกเทอร์มินัลแล้วรัน:
```bash
npm run simulate -- "แสดงสินค้าทั้งหมด"
npm run simulate -- "check stock for <ชื่อสินค้า>"
npm run simulate -- "my orders"
npm run simulate -- "สรุปยอดขายสัปดาห์นี้"
```

`scripts/simulateWebhook.ts` จะสร้าง payload แบบเดียวกับที่ LINE ส่งมาจริง แล้วเซ็นลายเซ็นด้วย HMAC-SHA256 จริง (โดยใช้ `LINE_CHANNEL_SECRET`) ก่อนยิงไปที่ `/webhook` — เท่ากับทดสอบเส้นทางตรวจสอบลายเซ็นแบบเดียวกับที่ LINE จริงใช้ทุกประการ เมื่อ `LINE_DRY_RUN=true` ระบบจะแค่ log ข้อความที่จะตอบกลับแทนการยิงไปที่ LINE API จริง ทำให้ตรวจสอบ pipeline ทั้งสาย (webhook → AI orchestrator → tool-calling → Prisma → ตอบกลับ) ได้โดยไม่ต้องพึ่งบริการภายนอกเลย

ถ้าอยากทดสอบกับ Claude จริง ให้ตั้ง `AI_PROVIDER=anthropic` และใส่ `ANTHROPIC_API_KEY=...`

รันชุดทดสอบอัตโนมัติ (ทดสอบเครื่องมือหนึ่งตัวโดยตรงกับฐานข้อมูลที่ seed ไว้ ไม่ต้องต่อเน็ต):
```bash
npm test
```

## เชื่อมต่อกับ LINE channel จริง

1. สร้าง Messaging API channel ใน [LINE Developers Console](https://developers.line.biz/console/)
2. คัดลอก **Channel secret** ไปใส่ใน `LINE_CHANNEL_SECRET` และออก **Channel access token** แบบระยะยาวไปใส่ใน `LINE_CHANNEL_ACCESS_TOKEN`
3. เปิดเซิร์ฟเวอร์ในเครื่องให้เข้าถึงจากอินเทอร์เน็ตได้ เช่นใช้ `ngrok http 3000`
4. ในหน้าตั้งค่า Messaging API ของ channel ให้ใส่ webhook URL เป็น `https://<โดเมนของคุณ>/webhook`, เปิด "Use webhook" และปิดข้อความตอบกลับอัตโนมัติเริ่มต้นของ LINE
5. ตั้ง `LINE_DRY_RUN=false` แล้วลองพิมพ์คุยกับบอทจาก LINE จริง

## โครงสร้างไฟล์ในโปรเจกต์

```
prisma/schema.prisma   โครงสร้างข้อมูล (Customer, Product, InventoryStock, Order, OrderItem)
prisma/seed.ts          สคริปต์ใส่ข้อมูลจำลองแบบ POS
src/config/env.ts       ตรวจสอบและรวบรวมค่า environment config
src/db/                 Prisma client + repositories (ชั้นเดียวที่รู้จัก Postgres)
src/ai/types.ts         ชนิดข้อมูลกลางที่ไม่ผูกกับผู้ให้บริการ AI รายใดรายหนึ่ง (LlmProvider / ChatMessage / tool)
src/ai/providers/       AnthropicProvider, MockProvider และตัวเลือก provider ที่จะใช้งาน
src/ai/tools/           นิยามและตัวจัดการของแต่ละเครื่องมือ (list_products, check_stock, get_customer_orders, get_sales_summary)
src/ai/orchestrator.ts  ตัววนลูป tool-calling
src/line/               การตรวจสอบลายเซ็น webhook ของ LINE, การจัดการอีเวนต์ และตัวส่งข้อความตอบกลับ
scripts/simulateWebhook.ts  จำลอง LINE webhook ที่เซ็นลายเซ็นจริง สำหรับทดสอบในเครื่อง
tests/                  ชุดทดสอบอัตโนมัติ (Vitest)
```

## ต่อยอดไปสู่ระบบ POS จริง

- แก้เฉพาะ `src/db/repositories/*` (และ `prisma/schema.prisma` ถ้าจำเป็น) ให้ไปดึงข้อมูลจากฐานข้อมูล POS จริงแทน — ชั้น `src/ai/` และ `src/line/` ไม่ต้องแก้อะไรเลย
- ถ้าต้องการเพิ่มความสามารถใหม่ ให้เพิ่มเครื่องมือใหม่ในโฟลเดอร์ `src/ai/tools/` แล้วไปลงทะเบียนไว้ที่ `src/ai/tools/index.ts`
- ถ้าการตอบกลับของ AI เริ่มช้าลงเมื่อต้องทำงานกับข้อมูลจริงจำนวนมาก ให้เปลี่ยนจากการใช้ `replyMessage` (ที่ต้องตอบกลับภายในเวลาของ webhook request เดียว โดยใช้ reply token) ไปเป็นการตอบรับ webhook ทันทีแล้วส่งคำตอบภายหลังด้วย `pushMessage` แทน — ดูตัวอย่างได้ที่ `src/line/webhook.ts`
