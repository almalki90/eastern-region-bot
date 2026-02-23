import { Hono } from 'hono'

type Bindings = {
  TELEGRAM_BOT_TOKEN: string
  TELEGRAM_CHAT_ID: string
  GOOGLE_PLACES_API_KEY: string
}

const app = new Hono<{ Bindings: Bindings }>()

// ---- إعدادات المنطقة الشرقية ----
const EASTERN_REGION_LOCATION = '26.4207,50.0888'
const SEARCH_RADIUS = 10000

const PLACE_TYPES = [
  { type: 'cafe', label: '☕ كافيه' },
  { type: 'restaurant', label: '🍽️ مطعم' },
  { type: 'store', label: '🏪 محل تجاري' },
  { type: 'bakery', label: '🥐 مخبز' },
  { type: 'gym', label: '🏋️ صالة رياضية' },
  { type: 'beauty_salon', label: '💇 صالون تجميل' },
  { type: 'supermarket', label: '🛒 سوبرماركت' },
  { type: 'pharmacy', label: '💊 صيدلية' },
  { type: 'laundry', label: '👕 مغسلة' },
  { type: 'car_wash', label: '🚗 غسيل سيارات' },
]

// ---- جلب مكان عشوائي من Google Places ----
async function fetchRandomPlace(apiKey: string): Promise<any | null> {
  const randomType = PLACE_TYPES[Math.floor(Math.random() * PLACE_TYPES.length)]

  const url =
    `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
    `?location=${EASTERN_REGION_LOCATION}` +
    `&radius=${SEARCH_RADIUS}` +
    `&type=${randomType.type}` +
    `&language=ar` +
    `&key=${apiKey}`

  const res = await fetch(url)
  const data: any = await res.json()

  if (!data.results || data.results.length === 0) return null

  const places = data.results.filter((p: any) => p.rating && p.rating >= 3.5)
  if (places.length === 0) return null

  const place = places[Math.floor(Math.random() * Math.min(places.length, 15))]
  return { ...place, categoryLabel: randomType.label }
}

// ---- جلب تفاصيل إضافية للمكان ----
async function fetchPlaceDetails(placeId: string, apiKey: string): Promise<any | null> {
  const url =
    `https://maps.googleapis.com/maps/api/place/details/json` +
    `?place_id=${placeId}` +
    `&fields=name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,opening_hours,photos,url` +
    `&language=ar` +
    `&key=${apiKey}`

  const res = await fetch(url)
  const data: any = await res.json()
  return data.result || null
}

// ---- بناء رسالة تليجرام ----
function buildMessage(place: any, details: any): string {
  const rating = details.rating || place.rating || 0
  const stars = '⭐'.repeat(Math.floor(rating))
  const reviewCount = details.user_ratings_total || place.user_ratings_total || 0

  const now = new Date()
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Riyadh',
  }
  const dateStr = now.toLocaleDateString('ar-SA', options)

  let message = `🗓️ *${dateStr}*\n`
  message += `━━━━━━━━━━━━━━━━━━\n\n`
  message += `${place.categoryLabel}\n\n`
  message += `🏷️ *${details.name || place.name}*\n\n`

  if (rating > 0) {
    message += `${stars}\n`
    message += `⭐ التقييم: *${rating}/5* (${reviewCount.toLocaleString('ar')} تقييم)\n\n`
  }

  if (details.formatted_address || place.vicinity) {
    message += `📍 *العنوان:*\n${details.formatted_address || place.vicinity}\n\n`
  }

  if (details.formatted_phone_number) {
    message += `📞 *الهاتف:* ${details.formatted_phone_number}\n\n`
  }

  if (details.website) {
    message += `🌐 *الموقع:* ${details.website}\n\n`
  }

  if (details.opening_hours && details.opening_hours.weekday_text) {
    message += `🕐 *أوقات العمل:*\n`
    const hours: string[] = details.opening_hours.weekday_text
    hours.slice(0, 3).forEach((line: string) => {
      message += `  • ${line}\n`
    })
    message += `\n`
  }

  const mapsUrl = details.url || `https://www.google.com/maps/place/?q=place_id:${place.place_id}`
  message += `🗺️ [عرض على خريطة جوجل](${mapsUrl})\n\n`

  message += `━━━━━━━━━━━━━━━━━━\n`
  message += `📢 *بوت أخبار المنطقة الشرقية*\n`
  message += `_نكتشف معاً أفضل الأماكن في المنطقة_`

  return message
}

// ---- إرسال رسالة نصية عبر تليجرام ----
async function sendTelegramMessage(token: string, chatId: string, text: string): Promise<boolean> {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
      disable_web_page_preview: false,
    }),
  })
  const data: any = await res.json()
  return data.ok === true
}

// ---- إرسال صورة عبر تليجرام ----
async function sendTelegramPhoto(
  token: string,
  chatId: string,
  photoUrl: string,
  caption: string
): Promise<boolean> {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      photo: photoUrl,
      caption,
      parse_mode: 'Markdown',
    }),
  })
  const data: any = await res.json()
  return data.ok === true
}

// ---- المنطق الرئيسي للبوت ----
async function runDailyBot(env: Bindings): Promise<{ success: boolean; message: string }> {
  const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, GOOGLE_PLACES_API_KEY } = env

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID || !GOOGLE_PLACES_API_KEY) {
    return { success: false, message: 'متغيرات البيئة غير مكتملة' }
  }

  const place = await fetchRandomPlace(GOOGLE_PLACES_API_KEY)
  if (!place) {
    return { success: false, message: 'لم يتم العثور على أماكن' }
  }

  const details = await fetchPlaceDetails(place.place_id, GOOGLE_PLACES_API_KEY)
  if (!details) {
    return { success: false, message: 'فشل جلب تفاصيل المكان' }
  }

  const messageText = buildMessage(place, details)

  let sent = false

  if (details.photos && details.photos.length > 0) {
    const photoRef = details.photos[0].photo_reference
    const photoUrl =
      `https://maps.googleapis.com/maps/api/place/photo` +
      `?maxwidth=800&photo_reference=${photoRef}&key=${GOOGLE_PLACES_API_KEY}`
    sent = await sendTelegramPhoto(TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, photoUrl, messageText)
  }

  if (!sent) {
    sent = await sendTelegramMessage(TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, messageText)
  }

  return {
    success: sent,
    message: sent ? `تم إرسال: ${details.name || place.name}` : 'فشل الإرسال',
  }
}

// ---- HTTP Routes ----

function buildCategoryItems(): string {
  let html = ''
  for (let i = 0; i < PLACE_TYPES.length; i++) {
    html += '<div class="cat-item">' + PLACE_TYPES[i].label + '</div>\n'
  }
  return html
}

app.get('/', (c) => {
  const catItems = buildCategoryItems()
  const pageHtml = buildPageHtml(catItems)
  return c.html(pageHtml)
})

function buildPageHtml(catItems: string): string {
  const part1 = '<!DOCTYPE html><html lang="ar" dir="rtl"><head>'
    + '<meta charset="UTF-8">'
    + '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
    + '<title>بوت أخبار المنطقة الشرقية</title>'
    + '<script src="https://cdn.tailwindcss.com"><\/script>'
    + '<link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">'
    + '<style>'
    + 'body{font-family:"Segoe UI",Tahoma,Geneva,Verdana,sans-serif;background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);min-height:100vh;color:white;}'
    + '.card{backdrop-filter:blur(10px);background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:1rem;padding:1.5rem;margin-bottom:1.5rem;}'
    + '.cat-item{background:rgba(255,255,255,0.05);border-radius:.75rem;padding:.75rem;text-align:center;font-size:1rem;}'
    + '.grid-4{display:grid;grid-template-columns:repeat(2,1fr);gap:.75rem;}'
    + '@media(min-width:768px){.grid-4{grid-template-columns:repeat(3,1fr);}}'
    + '.grid-stat{display:grid;grid-template-columns:repeat(2,1fr);gap:1rem;}'
    + '@media(min-width:768px){.grid-stat{grid-template-columns:repeat(4,1fr);}}'
    + '.btn{font-weight:bold;padding:1rem 1.5rem;border-radius:.75rem;font-size:1rem;cursor:pointer;border:none;width:100%;transition:all .3s;margin-bottom:.75rem;}'
    + '.btn-blue{background:#2563eb;color:white;}.btn-blue:hover{background:#1d4ed8;}'
    + '.btn-green{background:#16a34a;color:white;}.btn-green:hover{background:#15803d;}'
    + '.btn:disabled{opacity:.6;cursor:not-allowed;}'
    + '.pulse{animation:pulse 2s infinite;}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}'
    + 'pre{background:rgba(255,255,255,0.05);padding:1rem;border-radius:.5rem;overflow:auto;font-size:.8rem;}'
    + 'code{background:rgba(255,255,255,0.1);padding:.1rem .4rem;border-radius:.25rem;}'
    + '.text-blue{color:#93c5fd;}.text-yellow{color:#fde047;}.text-green-b{color:#4ade80;}'
    + '</style></head><body>'
    + '<div style="max-width:800px;margin:0 auto;padding:2rem 1rem;">'
    + '<div style="text-align:center;margin-bottom:2.5rem;">'
    + '<div style="font-size:4rem;margin-bottom:1rem;">🤖</div>'
    + '<h1 style="font-size:2rem;font-weight:bold;margin-bottom:.5rem;">بوت أخبار المنطقة الشرقية</h1>'
    + '<p class="text-blue" style="font-size:1.1rem;">يرسل يومياً أفضل الأنشطة التجارية من Google Maps</p>'
    + '</div>'
    + '<div class="card">'
    + '<div style="display:flex;align-items:center;gap:.75rem;margin-bottom:1rem;">'
    + '<div style="width:12px;height:12px;background:#4ade80;border-radius:50%;" class="pulse"></div>'
    + '<h2 style="font-size:1.25rem;font-weight:bold;">حالة البوت</h2></div>'
    + '<div class="grid-stat">'
    + '<div style="text-align:center"><div style="font-size:1.5rem">📍</div><div style="font-size:.85rem;color:#9ca3af">المنطقة</div><div style="font-weight:bold" class="text-blue">الشرقية</div></div>'
    + '<div style="text-align:center"><div style="font-size:1.5rem">⏰</div><div style="font-size:.85rem;color:#9ca3af">التوقيت</div><div style="font-weight:bold" class="text-blue">يومي 9 صباحاً</div></div>'
    + '<div style="text-align:center"><div style="font-size:1.5rem">🏪</div><div style="font-size:.85rem;color:#9ca3af">الأنشطة</div><div style="font-weight:bold" class="text-blue">10 أنواع</div></div>'
    + '<div style="text-align:center"><div style="font-size:1.5rem">🗺️</div><div style="font-size:.85rem;color:#9ca3af">المصدر</div><div style="font-weight:bold" class="text-blue">Google Maps</div></div>'
    + '</div></div>'
    + '<div class="card">'
    + '<h2 style="font-size:1.25rem;font-weight:bold;margin-bottom:1rem;">📋 الأنشطة التجارية المغطاة</h2>'
    + '<div class="grid-4">'

  const part2 = '</div></div>'
    + '<div class="card">'
    + '<h2 style="font-size:1.25rem;font-weight:bold;margin-bottom:1rem;">🚀 إجراءات</h2>'
    + '<button class="btn btn-blue" onclick="triggerNow()">'
    + '<i class="fas fa-paper-plane" style="margin-left:.5rem"></i> إرسال الآن (اختبار)'
    + '</button>'
    + '<button class="btn btn-green" onclick="checkStatus()">'
    + '<i class="fas fa-check-circle" style="margin-left:.5rem"></i> فحص الإعدادات'
    + '</button></div>'
    + '<div id="result" class="card" style="display:none;">'
    + '<h2 style="font-size:1.25rem;font-weight:bold;margin-bottom:.75rem;">📊 النتيجة</h2>'
    + '<div id="result-content"></div></div>'
    + '<div class="card">'
    + '<h2 style="font-size:1.25rem;font-weight:bold;margin-bottom:1rem;">⚙️ دليل الإعداد</h2>'
    + '<div style="display:flex;flex-direction:column;gap:.75rem;color:#d1d5db;">'
    + '<div><span class="text-blue" style="font-weight:bold">1. </span>أضف <code class="text-yellow">TELEGRAM_BOT_TOKEN</code> كـ Secret في Cloudflare Pages</div>'
    + '<div><span class="text-blue" style="font-weight:bold">2. </span>أضف <code class="text-yellow">TELEGRAM_CHAT_ID</code> = <code class="text-green-b">-1002818140662</code></div>'
    + '<div><span class="text-blue" style="font-weight:bold">3. </span>أضف <code class="text-yellow">GOOGLE_PLACES_API_KEY</code> من Google Cloud Console</div>'
    + '<div><span class="text-blue" style="font-weight:bold">4. </span>فعّل Places API في Google Cloud Console</div>'
    + '<div><span class="text-blue" style="font-weight:bold">5. </span>Cron Job يعمل تلقائياً كل يوم الساعة 6 صباحاً UTC (9 صباحاً بتوقيت السعودية)</div>'
    + '</div></div></div>'
    + '<script>'
    + 'async function triggerNow(){'
    + 'const btn=event.target.closest("button");btn.disabled=true;'
    + 'btn.innerHTML="<i class=\\"fas fa-spinner fa-spin\\" style=\\"margin-left:.5rem\\"></i> جاري الإرسال...";'
    + 'try{const res=await fetch("/api/send-now",{method:"POST"});const data=await res.json();showResult(data);}'
    + 'catch(e){showResult({success:false,message:"خطأ: "+e.message});}'
    + 'btn.disabled=false;btn.innerHTML="<i class=\\"fas fa-paper-plane\\" style=\\"margin-left:.5rem\\"></i> إرسال الآن (اختبار)";'
    + '}'
    + 'async function checkStatus(){'
    + 'const btn=event.target.closest("button");btn.disabled=true;'
    + 'btn.innerHTML="<i class=\\"fas fa-spinner fa-spin\\" style=\\"margin-left:.5rem\\"></i> جاري الفحص...";'
    + 'try{const res=await fetch("/api/status");const data=await res.json();showResult(data);}'
    + 'catch(e){showResult({success:false,message:"خطأ: "+e.message});}'
    + 'btn.disabled=false;btn.innerHTML="<i class=\\"fas fa-check-circle\\" style=\\"margin-left:.5rem\\"></i> فحص الإعدادات";'
    + '}'
    + 'function showResult(data){'
    + 'const el=document.getElementById("result");const content=document.getElementById("result-content");'
    + 'el.style.display="block";'
    + 'const icon=data.success?"✅":"❌";const color=data.success?"#4ade80":"#f87171";'
    + 'let h="<div style=\\"font-size:1.1rem;font-weight:bold;color:"+color+"\\">"+icon+" "+data.message+"</div>";'
    + 'if(data.details){h+="<pre>"+JSON.stringify(data.details,null,2)+"</pre>";}'
    + 'content.innerHTML=h;el.scrollIntoView({behavior:"smooth"});'
    + '}'
    + '<\/script></body></html>'

  return part1 + catItems + part2
}

// API: إرسال فوري للاختبار
app.post('/api/send-now', async (c) => {
  const result = await runDailyBot(c.env)
  return c.json(result)
})

// API: فحص الإعدادات
app.get('/api/status', async (c) => {
  const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, GOOGLE_PLACES_API_KEY } = c.env

  const checks: Record<string, boolean> = {
    TELEGRAM_BOT_TOKEN: !!TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHAT_ID: !!TELEGRAM_CHAT_ID,
    GOOGLE_PLACES_API_KEY: !!GOOGLE_PLACES_API_KEY,
  }
  const allOk = Object.values(checks).every(Boolean)

  let botInfo = null
  if (TELEGRAM_BOT_TOKEN) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`)
      const d: any = await res.json()
      botInfo = d.result
    } catch (_) {}
  }

  return c.json({
    success: allOk,
    message: allOk ? 'جميع الإعدادات صحيحة ✅' : 'بعض الإعدادات ناقصة ❌',
    details: {
      environment_variables: checks,
      bot_info: botInfo,
      chat_id: TELEGRAM_CHAT_ID || 'غير محدد',
      location: 'المنطقة الشرقية - الدمام',
    },
  })
})

// ---- Cloudflare Scheduled (Cron) + HTTP export ----
// wrangler pages dev يتوقع Hono app مباشرة كـ default export
// لإضافة scheduled handler، نستخدم نهج مختلف:
// نجعل app يتعامل مع /cdn-cgi/handler/scheduled يدوياً أيضاً

app.get('/cdn-cgi/handler/scheduled', async (c) => {
  const result = await runDailyBot(c.env)
  return c.json({ triggered: true, ...result })
})

export default app
