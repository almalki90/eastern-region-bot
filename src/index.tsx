import { Hono } from 'hono'

type Bindings = {
  TELEGRAM_BOT_TOKEN: string
  TELEGRAM_CHAT_ID: string
}

const app = new Hono<{ Bindings: Bindings }>()

// ===== إعدادات المدن =====
const CITIES = [
  { name: 'الدمام',   lat: 26.4207, lon: 50.0888, radius: 8000 },
  { name: 'الخبر',    lat: 26.2172, lon: 50.1971, radius: 6000 },
  { name: 'الظهران',  lat: 26.2851, lon: 50.1521, radius: 5000 },
  { name: 'الجبيل',   lat: 27.0046, lon: 49.6580, radius: 7000 },
  { name: 'الاحساء',  lat: 25.3792, lon: 49.5868, radius: 10000 },
]

// ===== أنواع الأماكن =====
const PLACE_TYPES = [
  { osm: 'cafe',            label: '☕ كافيه',           ar: 'كافيه'         },
  { osm: 'restaurant',      label: '🍽️ مطعم',            ar: 'مطعم'          },
  { osm: 'fast_food',       label: '🍔 وجبات سريعة',     ar: 'مطعم وجبات'   },
  { osm: 'bakery',          label: '🥐 مخبز',            ar: 'مخبز'          },
  { osm: 'supermarket',     label: '🛒 سوبرماركت',       ar: 'سوبرماركت'    },
  { osm: 'convenience',     label: '🏪 بقالة',           ar: 'بقالة'         },
  { osm: 'pharmacy',        label: '💊 صيدلية',          ar: 'صيدلية'        },
  { osm: 'gym',             label: '🏋️ صالة رياضية',     ar: 'صالة رياضية'  },
  { osm: 'beauty_salon',    label: '💇 صالون تجميل',     ar: 'صالون'         },
  { osm: 'car_wash',        label: '🚗 غسيل سيارات',     ar: 'غسيل سيارات'  },
  { osm: 'laundry',         label: '👕 مغسلة',           ar: 'مغسلة'         },
  { osm: 'hairdresser',     label: '✂️ حلاق',            ar: 'حلاق'          },
  { osm: 'clothes',         label: '👗 ملابس',           ar: 'محل ملابس'    },
  { osm: 'electronics',     label: '📱 إلكترونيات',      ar: 'محل إلكترونيات'},
  { osm: 'hardware',        label: '🔧 أدوات',           ar: 'محل أدوات'    },
]

// ===== جلب الأماكن من Overpass API =====
async function fetchPlaceFromOverpass(): Promise<any | null> {
  // اختر مدينة عشوائية
  const city = CITIES[Math.floor(Math.random() * CITIES.length)]
  // اختر نوع عشوائي
  const type = PLACE_TYPES[Math.floor(Math.random() * PLACE_TYPES.length)]

  // بناء استعلام Overpass
  const isShop = ['supermarket','convenience','bakery','clothes','electronics','hardware','laundry'].includes(type.osm)
  const isLeisure = ['gym'].includes(type.osm)

  let query = ''
  if (isShop) {
    query = `
      [out:json][timeout:25];
      (
        node["shop"="${type.osm}"](around:${city.radius},${city.lat},${city.lon});
        way["shop"="${type.osm}"](around:${city.radius},${city.lat},${city.lon});
      );
      out center 50;
    `
  } else if (isLeisure) {
    query = `
      [out:json][timeout:25];
      (
        node["leisure"="${type.osm}"](around:${city.radius},${city.lat},${city.lon});
        way["leisure"="${type.osm}"](around:${city.radius},${city.lat},${city.lon});
      );
      out center 50;
    `
  } else {
    query = `
      [out:json][timeout:25];
      (
        node["amenity"="${type.osm}"](around:${city.radius},${city.lat},${city.lon});
        way["amenity"="${type.osm}"](around:${city.radius},${city.lat},${city.lon});
      );
      out center 50;
    `
  }

  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'data=' + encodeURIComponent(query),
    })

    const data: any = await res.json()
    if (!data.elements || data.elements.length === 0) return null

    // فلتر الأماكن اللي عندها اسم
    const named = data.elements.filter((e: any) => e.tags && e.tags.name)
    if (named.length === 0) return null

    const place = named[Math.floor(Math.random() * Math.min(named.length, 20))]

    return {
      ...place,
      cityName: city.name,
      categoryLabel: type.label,
      categoryAr: type.ar,
    }
  } catch (e) {
    return null
  }
}

// ===== بناء رسالة تليجرام =====
function buildMessage(place: any): string {
  const tags = place.tags || {}
  const name = tags.name || tags['name:ar'] || 'بدون اسم'
  const nameEn = tags['name:en'] || ''

  const now = new Date()
  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'Asia/Riyadh',
  }
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Riyadh', hour12: true,
  }
  const dateStr = now.toLocaleDateString('ar-SA', dateOptions)
  const timeStr = now.toLocaleTimeString('ar-SA', timeOptions)

  let msg = ''
  msg += '🗓️ *' + dateStr + '* | ' + timeStr + '\n'
  msg += '━━━━━━━━━━━━━━━━━━\n\n'
  msg += place.categoryLabel + '\n\n'
  msg += '🏷️ *' + name + '*\n'
  if (nameEn) msg += '   _' + nameEn + '_\n'
  msg += '\n'

  // المدينة
  msg += '🏙️ *المدينة:* ' + place.cityName + '\n\n'

  // العنوان
  const street = tags['addr:street'] || tags['addr:full'] || ''
  const district = tags['addr:suburb'] || tags['addr:quarter'] || ''
  if (street || district) {
    msg += '📍 *العنوان:*\n'
    if (district) msg += '   ' + district + '، '
    if (street) msg += street
    msg += '\n\n'
  }

  // الهاتف
  const phone = tags.phone || tags['contact:phone'] || tags['phone:SA'] || ''
  if (phone) {
    msg += '📞 *الهاتف:* ' + phone + '\n\n'
  }

  // الموقع الإلكتروني
  const website = tags.website || tags['contact:website'] || ''
  if (website) {
    msg += '🌐 *الموقع:* ' + website + '\n\n'
  }

  // أوقات العمل
  const hours = tags.opening_hours || ''
  if (hours) {
    msg += '🕐 *أوقات العمل:* ' + hours + '\n\n'
  }

  // الوصف
  const desc = tags.description || tags['description:ar'] || ''
  if (desc) {
    msg += '📝 ' + desc + '\n\n'
  }

  // رابط خريطة
  const lat = place.lat || (place.center && place.center.lat)
  const lon = place.lon || (place.center && place.center.lon)
  if (lat && lon) {
    const mapsUrl = 'https://www.google.com/maps?q=' + lat + ',' + lon
    const osmUrl = 'https://www.openstreetmap.org/?mlat=' + lat + '&mlon=' + lon + '&zoom=17'
    msg += '🗺️ [خريطة جوجل](' + mapsUrl + ')  |  [OpenStreetMap](' + osmUrl + ')\n\n'
  }

  msg += '━━━━━━━━━━━━━━━━━━\n'
  msg += '📢 *خدمات المنطقة الشرقية*\n'
  msg += '_نكتشف معاً أفضل الأماكن في المنطقة_ 🌟'

  return msg
}

// ===== إرسال رسالة تليجرام =====
async function sendTelegram(token: string, chatId: string, text: string): Promise<boolean> {
  const res = await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
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

// ===== المنطق الرئيسي =====
async function runBot(env: Bindings): Promise<{ success: boolean; message: string }> {
  const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = env

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return { success: false, message: 'متغيرات البيئة ناقصة' }
  }

  // محاولة جلب مكان (حتى 3 محاولات)
  let place = null
  for (let i = 0; i < 3; i++) {
    place = await fetchPlaceFromOverpass()
    if (place) break
  }

  if (!place) {
    return { success: false, message: 'لم يتم العثور على أماكن من Overpass' }
  }

  const text = buildMessage(place)
  const sent = await sendTelegram(TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, text)

  return {
    success: sent,
    message: sent
      ? 'تم الإرسال: ' + (place.tags?.name || 'مكان جديد') + ' في ' + place.cityName
      : 'فشل إرسال الرسالة',
  }
}

// ===== Cloudflare Scheduled (Cron) =====
// crons: ["0 6 * * *", "0 10 * * *", "0 15 * * *"]
// 6 UTC = 9 صباحاً KSA | 10 UTC = 1 ظهراً KSA | 15 UTC = 6 مساءً KSA
export default {
  fetch: app.fetch,

  async scheduled(_event: ScheduledEvent, env: Bindings, _ctx: ExecutionContext) {
    console.log('🤖 بوت خدمات المنطقة الشرقية - إرسال تلقائي')
    const result = await runBot(env)
    console.log('النتيجة:', result.message)
  },
}

// ===== بناء HTML مسبقاً خارج الـ route handler =====
function buildCitiesHtml(): string {
  let h = ''
  for (let i = 0; i < CITIES.length; i++) {
    h += '<span style="background:rgba(255,255,255,0.1);padding:.3rem .8rem;border-radius:999px;font-size:.9rem;">'
      + CITIES[i].name + '</span> '
  }
  return h
}

function buildTypesHtml(): string {
  let h = ''
  for (let i = 0; i < PLACE_TYPES.length; i++) {
    h += '<div style="background:rgba(255,255,255,0.05);border-radius:.75rem;padding:.6rem;text-align:center;font-size:.9rem;">'
      + PLACE_TYPES[i].label + '</div>'
  }
  return h
}

// ===== HTTP Routes =====

// الصفحة الرئيسية
app.get('/', (c) => {
  const citiesHtml = buildCitiesHtml()
  const typesHtml = buildTypesHtml()

  const html = '<!DOCTYPE html><html lang="ar" dir="rtl">'
    + '<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>خدمات المنطقة الشرقية</title>'
    + '<link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">'
    + '<style>'
    + '*{box-sizing:border-box;margin:0;padding:0}'
    + 'body{font-family:"Segoe UI",Tahoma,sans-serif;background:linear-gradient(135deg,#0f0c29,#302b63,#24243e);min-height:100vh;color:#fff;padding:1.5rem}'
    + '.wrap{max-width:820px;margin:0 auto}'
    + '.header{text-align:center;padding:2rem 0 1.5rem}'
    + '.header .icon{font-size:4rem;margin-bottom:.75rem}'
    + '.header h1{font-size:2rem;font-weight:700;margin-bottom:.4rem}'
    + '.header p{color:#93c5fd;font-size:1.05rem}'
    + '.card{background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:1rem;padding:1.5rem;margin-bottom:1.2rem}'
    + '.card h2{font-size:1.1rem;font-weight:600;margin-bottom:1rem}'
    + '.stats{display:grid;grid-template-columns:repeat(2,1fr);gap:.75rem}'
    + '@media(min-width:500px){.stats{grid-template-columns:repeat(4,1fr)}}'
    + '.stat{text-align:center;padding:.5rem}'
    + '.stat .icon2{font-size:1.6rem;margin-bottom:.3rem}'
    + '.stat .label{font-size:.75rem;color:#9ca3af;margin-bottom:.2rem}'
    + '.stat .val{font-weight:700;color:#93c5fd}'
    + '.cities{display:flex;flex-wrap:wrap;gap:.5rem}'
    + '.types{display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem}'
    + '@media(min-width:600px){.types{grid-template-columns:repeat(5,1fr)}}'
    + '.actions{display:grid;grid-template-columns:1fr 1fr;gap:.75rem}'
    + 'button{padding:.9rem;border:none;border-radius:.75rem;font-size:1rem;font-weight:700;cursor:pointer;width:100%;transition:.2s}'
    + '.btn-blue{background:#2563eb;color:#fff}'
    + '.btn-blue:hover{background:#1d4ed8}'
    + '.btn-green{background:#16a34a;color:#fff}'
    + '.btn-green:hover{background:#15803d}'
    + 'button:disabled{opacity:.5;cursor:not-allowed}'
    + '.result{margin-top:1rem;padding:1rem;border-radius:.75rem;background:rgba(0,0,0,.3);display:none}'
    + '.pulse{animation:pulse 2s infinite}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}'
    + '.schedule{display:flex;flex-direction:column;gap:.5rem}'
    + '.sched-item{display:flex;align-items:center;gap:.75rem;padding:.6rem .9rem;background:rgba(255,255,255,.05);border-radius:.5rem}'
    + '.sched-time{font-weight:700;color:#fbbf24;min-width:80px}'
    + '.footer{text-align:center;color:#6b7280;font-size:.8rem;margin-top:1.5rem;padding-top:1rem}'
    + '</style></head><body><div class="wrap">'

    // Header
    + '<div class="header">'
    + '<div class="icon">🤖</div>'
    + '<h1>خدمات المنطقة الشرقية</h1>'
    + '<p>بوت تليجرام يرسل يومياً أفضل الأنشطة التجارية</p>'
    + '</div>'

    // Stats
    + '<div class="card"><h2>📊 إحصائيات البوت</h2><div class="stats">'
    + '<div class="stat"><div class="icon2">🏙️</div><div class="label">المدن</div><div class="val">5 مدن</div></div>'
    + '<div class="stat"><div class="icon2">🏪</div><div class="label">الأنشطة</div><div class="val">15 نوع</div></div>'
    + '<div class="stat"><div class="icon2">📩</div><div class="label">الإرسال</div><div class="val">3 مرات</div></div>'
    + '<div class="stat"><div class="icon2"><span class="pulse" style="display:inline-block;width:10px;height:10px;background:#4ade80;border-radius:50%;"></span></div><div class="label">الحالة</div><div class="val" style="color:#4ade80">نشط</div></div>'
    + '</div></div>'

    // Cities
    + '<div class="card"><h2>🏙️ المدن المغطاة</h2><div class="cities">'
    + citiesHtml
    + '</div></div>'

    // Schedule
    + '<div class="card"><h2>⏰ جدول الإرسال اليومي</h2><div class="schedule">'
    + '<div class="sched-item"><span class="sched-time">9:00 صباحاً</span><span>أول رسالة - نشاط تجاري عشوائي</span></div>'
    + '<div class="sched-item"><span class="sched-time">1:00 ظهراً</span><span>ثاني رسالة - نشاط تجاري عشوائي</span></div>'
    + '<div class="sched-item"><span class="sched-time">6:00 مساءً</span><span>ثالث رسالة - نشاط تجاري عشوائي</span></div>'
    + '</div></div>'

    // Types
    + '<div class="card"><h2>🗂️ أنواع الأنشطة</h2><div class="types">'
    + typesHtml
    + '</div></div>'

    // Actions
    + '<div class="card"><h2>🚀 إجراءات</h2><div class="actions">'
    + '<button class="btn-blue" onclick="sendNow()"><i class="fas fa-paper-plane" style="margin-left:.4rem"></i>إرسال الآن</button>'
    + '<button class="btn-green" onclick="checkStatus()"><i class="fas fa-check-circle" style="margin-left:.4rem"></i>فحص الإعدادات</button>'
    + '</div><div class="result" id="result"></div></div>'

    // Footer
    + '<div class="footer">📢 خدمات المنطقة الشرقية | مدعوم بـ Overpass API & OpenStreetMap</div>'

    + '</div>'
    + '<script>'
    + 'async function sendNow(){'
    + 'const btn=document.querySelectorAll("button")[0];'
    + 'btn.disabled=true;btn.innerHTML="<i class=\'fas fa-spinner fa-spin\' style=\'margin-left:.4rem\'></i>جاري الإرسال...";'
    + 'try{const r=await fetch("/api/send",{method:"POST"});const d=await r.json();showResult(d);}catch(e){showResult({success:false,message:e.message});}'
    + 'btn.disabled=false;btn.innerHTML="<i class=\'fas fa-paper-plane\' style=\'margin-left:.4rem\'></i>إرسال الآن";'
    + '}'
    + 'async function checkStatus(){'
    + 'const btn=document.querySelectorAll("button")[1];'
    + 'btn.disabled=true;btn.innerHTML="<i class=\'fas fa-spinner fa-spin\' style=\'margin-left:.4rem\'></i>جاري الفحص...";'
    + 'try{const r=await fetch("/api/status");const d=await r.json();showResult(d);}catch(e){showResult({success:false,message:e.message});}'
    + 'btn.disabled=false;btn.innerHTML="<i class=\'fas fa-check-circle\' style=\'margin-left:.4rem\'></i>فحص الإعدادات";'
    + '}'
    + 'function showResult(d){'
    + 'const el=document.getElementById("result");'
    + 'el.style.display="block";'
    + 'const c=d.success?"#4ade80":"#f87171";'
    + 'const i=d.success?"✅":"❌";'
    + 'el.innerHTML="<div style=\'color:"+c+";font-weight:700;font-size:1.05rem\'>"+i+" "+d.message+"</div>"'
    + '+(d.details?"<pre style=\'margin-top:.75rem;font-size:.75rem;overflow:auto\'>"+JSON.stringify(d.details,null,2)+"</pre>":"");'
    + 'el.scrollIntoView({behavior:"smooth"});}'
    + '<\/script></body></html>'

  return c.html(html)
})

// API: إرسال فوري
app.post('/api/send', async (c) => {
  const result = await runBot(c.env)
  return c.json(result)
})

// API: فحص الإعدادات
app.get('/api/status', async (c) => {
  const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = c.env

  const checks = {
    TELEGRAM_BOT_TOKEN: !!TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHAT_ID: !!TELEGRAM_CHAT_ID,
  }
  const allOk = Object.values(checks).every(Boolean)

  let botInfo = null
  if (TELEGRAM_BOT_TOKEN) {
    try {
      const r = await fetch('https://api.telegram.org/bot' + TELEGRAM_BOT_TOKEN + '/getMe')
      const d: any = await r.json()
      botInfo = d.result
    } catch (_) {}
  }

  // اختبار Overpass
  let overpassOk = false
  try {
    const r = await fetch('https://overpass-api.de/api/status')
    overpassOk = r.ok
  } catch (_) {}

  return c.json({
    success: allOk && overpassOk,
    message: allOk && overpassOk ? 'كل الإعدادات صحيحة ✅' : 'يوجد مشكلة في الإعدادات ❌',
    details: {
      environment_variables: checks,
      bot_info: botInfo,
      overpass_api: overpassOk ? 'يعمل ✅' : 'لا يعمل ❌',
      cities_covered: CITIES.map(c => c.name),
      chat_id: TELEGRAM_CHAT_ID || 'غير محدد',
    },
  })
})
