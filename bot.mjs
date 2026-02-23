// سكريبت إرسال البوت - يشتغل من GitHub Actions
// لا يحتاج أي مكتبات خارجية - Node.js فقط

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_CHAT_ID   = process.env.TELEGRAM_CHAT_ID

// ===== المدن =====
const CITIES = [
  { name: 'الدمام',  lat: 26.4207, lon: 50.0888, radius: 8000  },
  { name: 'الخبر',   lat: 26.2172, lon: 50.1971, radius: 6000  },
  { name: 'الظهران', lat: 26.2851, lon: 50.1521, radius: 5000  },
  { name: 'الجبيل',  lat: 27.0046, lon: 49.6580, radius: 7000  },
  { name: 'الاحساء', lat: 25.3792, lon: 49.5868, radius: 10000 },
]

// ===== أنواع الأماكن =====
const PLACE_TYPES = [
  { osm: 'cafe',         tag: 'amenity', label: '☕ كافيه'          },
  { osm: 'restaurant',   tag: 'amenity', label: '🍽️ مطعم'           },
  { osm: 'fast_food',    tag: 'amenity', label: '🍔 وجبات سريعة'    },
  { osm: 'bakery',       tag: 'shop',    label: '🥐 مخبز'           },
  { osm: 'supermarket',  tag: 'shop',    label: '🛒 سوبرماركت'      },
  { osm: 'convenience',  tag: 'shop',    label: '🏪 بقالة'          },
  { osm: 'pharmacy',     tag: 'amenity', label: '💊 صيدلية'         },
  { osm: 'gym',          tag: 'leisure', label: '🏋️ صالة رياضية'    },
  { osm: 'beauty_salon', tag: 'shop',    label: '💇 صالون تجميل'    },
  { osm: 'car_wash',     tag: 'amenity', label: '🚗 غسيل سيارات'    },
  { osm: 'laundry',      tag: 'shop',    label: '👕 مغسلة'          },
  { osm: 'hairdresser',  tag: 'shop',    label: '✂️ حلاق'           },
  { osm: 'clothes',      tag: 'shop',    label: '👗 ملابس'          },
  { osm: 'electronics',  tag: 'shop',    label: '📱 إلكترونيات'     },
  { osm: 'hardware',     tag: 'shop',    label: '🔧 أدوات'          },
]

// ===== جلب مكان من Overpass =====
async function fetchFromOverpass(query, mirror = 'main') {
  const urls = {
    main:    'https://overpass-api.de/api/interpreter',
    mirror1: 'https://overpass.kumi.systems/api/interpreter',
    mirror2: 'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  }
  const url = urls[mirror] || urls.main

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'data=' + encodeURIComponent(query),
  })

  const text = await res.text()
  if (!text.trim().startsWith('{')) return null
  return JSON.parse(text)
}

async function fetchPlace() {
  const city = CITIES[Math.floor(Math.random() * CITIES.length)]
  const type = PLACE_TYPES[Math.floor(Math.random() * PLACE_TYPES.length)]

  const query = `
    [out:json][timeout:30];
    (
      node["${type.tag}"="${type.osm}"](around:${city.radius},${city.lat},${city.lon});
      way["${type.tag}"="${type.osm}"](around:${city.radius},${city.lat},${city.lon});
    );
    out center 60;
  `

  // جرب المرايا الثلاثة
  const mirrors = ['main', 'mirror1', 'mirror2']
  let data = null
  for (const mirror of mirrors) {
    console.log(`  🌐 جارٍ الاتصال بـ Overpass (${mirror})...`)
    data = await fetchFromOverpass(query, mirror)
    if (data && data.elements) break
    await new Promise(r => setTimeout(r, 1500))
  }
  if (!data.elements || data.elements.length === 0) return null

  const named = data.elements.filter(e => e.tags && e.tags.name)
  if (named.length === 0) return null

  const place = named[Math.floor(Math.random() * Math.min(named.length, 20))]
  return { ...place, cityName: city.name, categoryLabel: type.label }
}

// ===== بناء الرسالة =====
function buildMessage(place) {
  const tags = place.tags || {}
  const name   = tags['name:ar'] || tags.name || 'بدون اسم'
  const nameEn = tags['name:en'] || ''

  const now = new Date()
  const dateStr = now.toLocaleDateString('ar-SA', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'Asia/Riyadh',
  })
  const timeStr = now.toLocaleTimeString('ar-SA', {
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Riyadh', hour12: true,
  })

  let msg = ''
  msg += `🗓️ *${dateStr}*  |  ${timeStr}\n`
  msg += `━━━━━━━━━━━━━━━━━━\n\n`
  msg += `${place.categoryLabel}\n\n`
  msg += `🏷️ *${name}*\n`
  if (nameEn) msg += `   _${nameEn}_\n`
  msg += `\n`
  msg += `🏙️ *المدينة:* ${place.cityName}\n\n`

  const street   = tags['addr:street'] || tags['addr:full'] || ''
  const district = tags['addr:suburb'] || tags['addr:quarter'] || ''
  if (street || district) {
    msg += `📍 *العنوان:*\n`
    if (district) msg += `   ${district}، `
    if (street)   msg += street
    msg += `\n\n`
  }

  const phone = tags.phone || tags['contact:phone'] || ''
  if (phone) msg += `📞 *الهاتف:* ${phone}\n\n`

  const website = tags.website || tags['contact:website'] || ''
  if (website) msg += `🌐 *الموقع:* ${website}\n\n`

  const hours = tags.opening_hours || ''
  if (hours) msg += `🕐 *أوقات العمل:* ${hours}\n\n`

  const lat = place.lat || (place.center && place.center.lat)
  const lon = place.lon || (place.center && place.center.lon)
  if (lat && lon) {
    const gmap = `https://www.google.com/maps?q=${lat},${lon}`
    const osm  = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}&zoom=17`
    msg += `🗺️ [خريطة جوجل](${gmap})  |  [OpenStreetMap](${osm})\n\n`
  }

  msg += `━━━━━━━━━━━━━━━━━━\n`
  msg += `📢 *خدمات المنطقة الشرقية*\n`
  msg += `_نكتشف معاً أفضل الأماكن في المنطقة_ 🌟`

  return msg
}

// ===== إرسال لتليجرام =====
async function sendTelegram(text) {
  const res = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: 'Markdown',
        disable_web_page_preview: false,
      }),
    }
  )
  const data = await res.json()
  return data
}

// ===== التنفيذ الرئيسي =====
async function main() {
  console.log('🤖 بوت خدمات المنطقة الشرقية - بدء التشغيل')
  console.log('⏰ الوقت:', new Date().toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' }))

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error('❌ متغيرات البيئة ناقصة!')
    process.exit(1)
  }

  // محاولة جلب مكان (3 محاولات)
  let place = null
  for (let i = 0; i < 3; i++) {
    console.log(`🔍 محاولة جلب مكان ${i + 1}/3...`)
    place = await fetchPlace()
    if (place) break
    await new Promise(r => setTimeout(r, 2000))
  }

  if (!place) {
    console.error('❌ لم يتم العثور على أي مكان')
    process.exit(1)
  }

  const name = place.tags?.name || 'مكان جديد'
  console.log(`✅ تم جلب: ${name} في ${place.cityName}`)

  const text = buildMessage(place)
  const result = await sendTelegram(text)

  if (result.ok) {
    console.log('✅ تم الإرسال بنجاح إلى تليجرام!')
  } else {
    console.error('❌ فشل الإرسال:', result.description)
    process.exit(1)
  }
}

main().catch(err => {
  console.error('❌ خطأ:', err)
  process.exit(1)
})
