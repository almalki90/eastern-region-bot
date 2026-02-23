// ====================================================
// بوت خدمات المنطقة الشرقية - نظام احترافي
// 5 أماكن لكل رسالة + هاشتاقات للبحث السهل
// ====================================================

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_CHAT_ID   = process.env.TELEGRAM_CHAT_ID

// ===== المدن =====
const CITIES = [
  { name: 'الدمام',  nameSlug: 'الدمام',  lat: 26.4207, lon: 50.0888, radius: 8000  },
  { name: 'الخبر',   nameSlug: 'الخبر',   lat: 26.2172, lon: 50.1971, radius: 6000  },
  { name: 'الظهران', nameSlug: 'الظهران', lat: 26.2851, lon: 50.1521, radius: 5000  },
  { name: 'الجبيل',  nameSlug: 'الجبيل',  lat: 27.0046, lon: 49.6580, radius: 7000  },
  { name: 'الاحساء', nameSlug: 'الاحساء', lat: 25.3792, lon: 49.5868, radius: 10000 },
]

// ===== التصنيفات مع الهاشتاقات =====
const CATEGORIES = [
  {
    osm: 'restaurant', tag: 'amenity',
    emoji: '🍽️', label: 'مطاعم',
    hashtags: ['#مطاعم', '#طعام', '#اكل', '#وجبات'],
    intro: 'مطعمنا',
    service: 'يقدّم وجبات شهية ومتنوعة',
  },
  {
    osm: 'cafe', tag: 'amenity',
    emoji: '☕', label: 'كافيهات',
    hashtags: ['#كافيهات', '#قهوة', '#كافيه'],
    intro: 'كافيهنا',
    service: 'يقدّم القهوة والمشروبات والحلويات',
  },
  {
    osm: 'fast_food', tag: 'amenity',
    emoji: '🍔', label: 'وجبات سريعة',
    hashtags: ['#وجبات_سريعة', '#فاست_فود', '#وجبات'],
    intro: 'مطعم الوجبات السريعة',
    service: 'يقدّم وجبات سريعة ولذيذة',
  },
  {
    osm: 'bakery', tag: 'shop',
    emoji: '🥐', label: 'مخابز',
    hashtags: ['#مخابز', '#خبز', '#معجنات'],
    intro: 'مخبزنا',
    service: 'يقدّم المخبوزات الطازجة والمعجنات',
  },
  {
    osm: 'supermarket', tag: 'shop',
    emoji: '🛒', label: 'أسواق',
    hashtags: ['#أسواق', '#سوبرماركت', '#تسوق'],
    intro: 'السوق',
    service: 'يوفّر جميع احتياجاتك اليومية',
  },
  {
    osm: 'convenience', tag: 'shop',
    emoji: '🏪', label: 'بقاليات',
    hashtags: ['#بقاليات', '#بقالة', '#محلات'],
    intro: 'البقالة',
    service: 'يوفّر المواد الغذائية والاحتياجات الأساسية',
  },
  {
    osm: 'pharmacy', tag: 'amenity',
    emoji: '💊', label: 'صيدليات',
    hashtags: ['#صيدليات', '#صيدلية', '#دواء', '#صحة'],
    intro: 'الصيدلية',
    service: 'تقدّم الأدوية ومنتجات الصحة والعناية',
  },
  {
    osm: 'gym', tag: 'leisure',
    emoji: '🏋️', label: 'صالات رياضية',
    hashtags: ['#صالات_رياضية', '#جيم', '#رياضة', '#لياقة'],
    intro: 'الصالة الرياضية',
    service: 'تقدّم خدمات اللياقة البدنية والتمارين',
  },
  {
    osm: 'beauty_salon', tag: 'shop',
    emoji: '💇', label: 'صالونات تجميل',
    hashtags: ['#صالونات_تجميل', '#تجميل', '#صالون'],
    intro: 'صالون التجميل',
    service: 'يقدّم خدمات التجميل والعناية بالبشرة',
  },
  {
    osm: 'car_wash', tag: 'amenity',
    emoji: '🚗', label: 'غسيل سيارات',
    hashtags: ['#غسيل_سيارات', '#سيارات', '#غسيل'],
    intro: 'محل الغسيل',
    service: 'يقدّم خدمات غسيل وتلميع السيارات',
  },
  {
    osm: 'laundry', tag: 'shop',
    emoji: '👕', label: 'مغاسل',
    hashtags: ['#مغاسل', '#مغسلة', '#كوي'],
    intro: 'المغسلة',
    service: 'تقدّم خدمات الغسيل والكوي',
  },
  {
    osm: 'hairdresser', tag: 'shop',
    emoji: '✂️', label: 'حلاقة',
    hashtags: ['#حلاقة', '#صالون_حلاقة', '#حلاق'],
    intro: 'صالون الحلاقة',
    service: 'يقدّم خدمات الحلاقة والعناية بالشعر',
  },
  {
    osm: 'clothes', tag: 'shop',
    emoji: '👗', label: 'ملابس',
    hashtags: ['#ملابس', '#أزياء', '#موضة'],
    intro: 'محل الملابس',
    service: 'يوفّر أحدث تشكيلات الملابس والأزياء',
  },
  {
    osm: 'electronics', tag: 'shop',
    emoji: '📱', label: 'إلكترونيات',
    hashtags: ['#إلكترونيات', '#تقنية', '#أجهزة'],
    intro: 'محل الإلكترونيات',
    service: 'يوفّر الأجهزة الإلكترونية والاكسسوارات',
  },
  {
    osm: 'hardware', tag: 'shop',
    emoji: '🔧', label: 'أدوات ومعدات',
    hashtags: ['#أدوات', '#معدات', '#صيانة'],
    intro: 'محل الأدوات',
    service: 'يوفّر أدوات البناء والصيانة',
  },
]

// ===== جلب من Overpass =====
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

// ===== جلب 5 أماكن لمدينة وتصنيف محددين =====
async function fetchPlaces(city, category, count = 5) {
  const query = `
    [out:json][timeout:40];
    (
      node["${category.tag}"="${category.osm}"](around:${city.radius},${city.lat},${city.lon});
      way["${category.tag}"="${category.osm}"](around:${city.radius},${city.lat},${city.lon});
    );
    out center 100;
  `

  const mirrors = ['main', 'mirror1', 'mirror2']
  let data = null
  for (const mirror of mirrors) {
    console.log(`  🌐 Overpass (${mirror}) - ${category.label} في ${city.name}...`)
    data = await fetchFromOverpass(query, mirror)
    if (data && data.elements && data.elements.length > 0) break
    await new Promise(r => setTimeout(r, 1500))
  }

  if (!data || !data.elements) return []

  // فلتر الأماكن التي عندها اسم
  const named = data.elements.filter(e => e.tags && e.tags.name)
  if (named.length === 0) return []

  // اختيار عشوائي بدون تكرار
  const shuffled = named.sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count).map(p => ({ ...p, cityName: city.name, category }))
}

// ===== تنسيق بيانات مكان واحد =====
function formatPlace(place, index) {
  const tags     = place.tags || {}
  const name     = tags['name:ar'] || tags.name || 'بدون اسم'
  const street   = tags['addr:street']  || tags['addr:full']    || ''
  const district = tags['addr:suburb']  || tags['addr:quarter'] || ''
  const phone    = tags.phone           || tags['contact:phone']|| tags['contact:mobile'] || ''
  const hours    = tags.opening_hours   || ''

  let line = `${index}️⃣ *${name}*\n`

  if (district && street) {
    line += `   📍 حي ${district}، شارع ${street}\n`
  } else if (district) {
    line += `   📍 حي ${district}\n`
  } else if (street) {
    line += `   📍 شارع ${street}\n`
  }

  if (hours)  line += `   🕐 ${hours}\n`
  if (phone)  line += `   📞 ${phone}\n`

  return line
}

// ===== بناء الرسالة الكاملة =====
function buildMessage(city, category, places) {
  const cityHashtag = `#${city.nameSlug}`
  const catHashtags = category.hashtags.map(h => `${h}_${city.nameSlug}`).join(' ')
  const generalHashtags = category.hashtags.join(' ')

  let msg = ''

  // العنوان الرئيسي
  msg += `${category.emoji} *${category.label} ${city.name}*\n`
  msg += `━━━━━━━━━━━━━━━━━━━━━━\n\n`

  // الأماكن
  places.forEach((place, i) => {
    msg += formatPlace(place, i + 1)
    if (i < places.length - 1) msg += `\n`
  })

  // الفاصل
  msg += `\n━━━━━━━━━━━━━━━━━━━━━━\n`

  // الهاشتاقات - السطر الأول: تصنيف + مدينة (للبحث الدقيق)
  msg += `${catHashtags}\n`
  // الهاشتاق الثاني: عام للتصنيف + المدينة
  msg += `${generalHashtags} ${cityHashtag} #المنطقة_الشرقية\n\n`

  // التوقيع
  msg += `📢 *خدمات المنطقة الشرقية* 🌟`

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
        chat_id:    TELEGRAM_CHAT_ID,
        text,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
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

  // اختيار مدينة عشوائية
  const city     = CITIES[Math.floor(Math.random() * CITIES.length)]
  // اختيار تصنيف عشوائي
  const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)]

  console.log(`🏙️ المدينة: ${city.name}`)
  console.log(`📂 التصنيف: ${category.label}`)

  // جلب 5 أماكن
  let places = []
  for (let attempt = 1; attempt <= 3; attempt++) {
    console.log(`🔍 محاولة ${attempt}/3 لجلب الأماكن...`)
    places = await fetchPlaces(city, category, 5)
    if (places.length >= 1) break
    // إذا فشل جرّب تصنيف آخر
    const fallback = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)]
    console.log(`⚠️ لا نتائج، تجربة تصنيف بديل: ${fallback.label}`)
    places = await fetchPlaces(city, fallback, 5)
    if (places.length >= 1) {
      Object.assign(category, fallback)
      break
    }
    await new Promise(r => setTimeout(r, 2000))
  }

  if (places.length === 0) {
    console.error('❌ لم يتم العثور على أي أماكن')
    process.exit(1)
  }

  console.log(`✅ تم جلب ${places.length} مكان`)

  const text   = buildMessage(city, category, places)
  const result = await sendTelegram(text)

  if (result.ok) {
    console.log('✅ تم الإرسال بنجاح إلى تليجرام!')
    console.log(`📊 الملخص: ${category.label} في ${city.name} - ${places.length} أماكن`)
  } else {
    console.error('❌ فشل الإرسال:', result.description)
    // طباعة الرسالة للتشخيص
    console.log('--- نص الرسالة ---')
    console.log(text)
    process.exit(1)
  }
}

main().catch(err => {
  console.error('❌ خطأ:', err)
  process.exit(1)
})
