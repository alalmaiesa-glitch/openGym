// Arabic exercise-title generator for the built-in catalogue.
//
// openGym's catalogue contains 1,324 English titles and changes upstream. Keeping a second,
// hand-copied catalogue would drift quickly, so Arabic uses a reviewed terminology layer:
// common training phrases first, then individual modifiers/equipment. Manual exceptions live
// in ar.js. The canonical English title remains searchable and can be shown beside Arabic.

const PHRASES = [
  ['romanian deadlift', 'رفعة ميتة رومانية'],
  ['stiff leg deadlift', 'رفعة ميتة بساقين شبه مستقيمتين'],
  ['straight leg deadlift', 'رفعة ميتة بساقين مستقيمتين'],
  ['sumo deadlift', 'رفعة ميتة سومو'],
  ['bench press', 'ضغط الصدر'],
  ['chest press', 'ضغط الصدر'],
  ['shoulder press', 'ضغط الكتف'],
  ['military press', 'ضغط عسكري'],
  ['leg press', 'ضغط الأرجل'],
  ['incline press', 'ضغط مائل لأعلى'],
  ['decline press', 'ضغط مائل لأسفل'],
  ['overhead press', 'ضغط فوق الرأس'],
  ['biceps curl', 'ثني البايسبس'],
  ['bicep curl', 'ثني البايسبس'],
  ['hammer curl', 'ثني المطرقة'],
  ['preacher curl', 'ثني على مقعد الواعظ'],
  ['concentration curl', 'ثني تركيز'],
  ['wrist curl', 'ثني المعصم'],
  ['triceps extension', 'تمديد الترايسبس'],
  ['tricep extension', 'تمديد الترايسبس'],
  ['triceps pushdown', 'دفع الترايسبس لأسفل'],
  ['tricep pushdown', 'دفع الترايسبس لأسفل'],
  ['lateral raise', 'رفع جانبي'],
  ['front raise', 'رفع أمامي'],
  ['calf raise', 'رفع السمانة'],
  ['bent over row', 'تجديف منحني للأمام'],
  ['seated row', 'تجديف جالس'],
  ['upright row', 'تجديف قائم'],
  ['inverted row', 'تجديف مقلوب'],
  ['lat pulldown', 'سحب علوي للظهر'],
  ['lateral pulldown', 'سحب جانبي علوي'],
  ['pull up', 'عقلة'],
  ['pull-up', 'عقلة'],
  ['chin up', 'عقلة بقبضة عكسية'],
  ['chin-up', 'عقلة بقبضة عكسية'],
  ['push up', 'ضغط أرضي'],
  ['push-up', 'ضغط أرضي'],
  ['hip thrust', 'دفع الورك'],
  ['glute bridge', 'جسر المؤخرة'],
  ['leg extension', 'تمديد الأرجل'],
  ['leg curl', 'ثني الأرجل'],
  ['split squat', 'سكوات منقسم'],
  ['front squat', 'سكوات أمامي'],
  ['hack squat', 'سكوات هاك'],
  ['goblet squat', 'سكوات الكأس'],
  ['sissy squat', 'سكوات سيسي'],
  ['russian twist', 'لف روسي'],
  ['sit up', 'نهوض للبطن'],
  ['sit-up', 'نهوض للبطن'],
  ['face pull', 'سحب نحو الوجه'],
  ['rear delt fly', 'تفتيح الكتف الخلفي'],
  ['rear deltoid fly', 'تفتيح الكتف الخلفي'],
  ['good morning', 'انحناء صباح الخير'],
  ['chest fly', 'تفتيح الصدر'],
  ['chest dip', 'متوازي للصدر'],
  ['triceps dip', 'متوازي للترايسبس'],
  ['tricep dip', 'متوازي للترايسبس'],
  ['skull crusher', 'تمديد ترايسبس خلف الرأس'],
  ['farmer walk', 'مشي المزارع'],
  ['farmers walk', 'مشي المزارع'],
  ['mountain climber', 'تسلق الجبل'],
  ['jumping jack', 'قفز فتح وضم'],
  ['high knees', 'رفع الركبتين عاليًا'],
  ['battle rope', 'حبل قتالي'],
  ['bodyweight', 'وزن الجسم'],
  ['body weight', 'وزن الجسم'],
  ['stability ball', 'كرة ثبات'],
  ['medicine ball', 'كرة طبية'],
  ['resistance band', 'شريط مقاومة'],
  ['olympic barbell', 'بار أولمبي'],
  ['ez barbell', 'بار EZ'],
  ['trap bar', 'بار سداسي'],
  ['smith machine', 'جهاز سميث'],
  ['leverage machine', 'جهاز مقاومة'],
  ['sled machine', 'جهاز الزلاجة'],
  ['elliptical machine', 'جهاز إليبتيكال'],
  ['stationary bike', 'دراجة ثابتة'],
  ['stepmill machine', 'جهاز صعود الدرج'],
  ['skierg machine', 'جهاز SkiErg'],
  ['upper body ergometer', 'جهاز إرجوميتر للجزء العلوي'],
  ['bosu ball', 'كرة بوسو'],
  ['wheel roller', 'عجلة البطن'],
  ['one arm', 'بذراع واحدة'],
  ['one-arm', 'بذراع واحدة'],
  ['single arm', 'بذراع واحدة'],
  ['single-arm', 'بذراع واحدة'],
  ['one leg', 'بساق واحدة'],
  ['one-leg', 'بساق واحدة'],
  ['single leg', 'بساق واحدة'],
  ['single-leg', 'بساق واحدة'],
  ['close grip', 'بقبضة ضيقة'],
  ['close-grip', 'بقبضة ضيقة'],
  ['wide grip', 'بقبضة واسعة'],
  ['wide-grip', 'بقبضة واسعة'],
  ['neutral grip', 'بقبضة محايدة'],
  ['reverse grip', 'بقبضة عكسية'],
  ['overhand grip', 'بقبضة علوية'],
  ['underhand grip', 'بقبضة سفلية'],
  ['behind the neck', 'خلف الرقبة'],
  ['behind neck', 'خلف الرقبة'],
  ['over head', 'فوق الرأس']
]

const WORDS = {
  dumbbell:'دمبل', dumbbells:'دمبل', barbell:'بار', cable:'كابل', kettlebell:'كيتل بيل',
  band:'شريط مقاومة', bands:'أشرطة مقاومة', rope:'حبل', roller:'أسطوانة', wheel:'عجلة',
  weighted:'بوزن إضافي', assisted:'بمساعدة', lever:'جهاز', machine:'جهاز', smith:'سميث',
  sled:'زلاجة', hammer:'مطرقة', tire:'إطار', olympic:'أولمبي', stability:'ثبات',
  medicine:'طبية', ball:'كرة', bosu:'بوسو', ez:'EZ',
  seated:'جالس', standing:'واقف', lying:'مستلقٍ', kneeling:'راكع', hanging:'معلّق',
  prone:'منبطح', supine:'مستلقٍ على الظهر', incline:'مائل لأعلى', decline:'مائل لأسفل',
  bent:'منحني', upright:'قائم', horizontal:'أفقي', vertical:'عمودي',
  alternate:'بالتبادل', alternating:'بالتبادل', reverse:'عكسي', inverse:'معكوس',
  front:'أمامي', rear:'خلفي', lateral:'جانبي', side:'جانبي', inner:'داخلي', outer:'خارجي',
  high:'عالٍ', low:'منخفض', straight:'مستقيم', stiff:'شبه مستقيم', full:'كامل',
  close:'ضيق', narrow:'ضيق', wide:'واسع', neutral:'محايد', parallel:'متوازٍ',
  single:'واحد', double:'مزدوج', two:'اثنان', one:'واحد',
  arm:'الذراع', arms:'الذراعين', leg:'الساق', legs:'الساقين', chest:'الصدر',
  shoulder:'الكتف', shoulders:'الأكتاف', back:'الظهر', hip:'الورك', hips:'الوركين',
  glute:'المؤخرة', glutes:'المؤخرة', calf:'السمانة', calves:'السمانة',
  hamstring:'أوتار الركبة', hamstrings:'أوتار الركبة', quad:'العضلات الرباعية',
  quads:'العضلات الرباعية', quadriceps:'العضلات الرباعية', biceps:'البايسبس',
  bicep:'البايسبس', triceps:'الترايسبس', tricep:'الترايسبس', wrist:'المعصم',
  wrists:'المعصمين', forearm:'الساعد', forearms:'الساعدين', neck:'الرقبة',
  abs:'البطن', abdominal:'البطن', abdominals:'البطن', core:'الجذع', lat:'الظهر الجانبي',
  lats:'الظهر الجانبي', delt:'الدالية', delts:'الدالية', deltoid:'الدالية',
  press:'ضغط', push:'دفع', pull:'سحب', row:'تجديف', curl:'ثني', curls:'ثني',
  extension:'تمديد', flexion:'ثني', raise:'رفع', lift:'رفع', fly:'تفتيح',
  pulldown:'سحب علوي', pullover:'سحب خلف الرأس', pushdown:'دفع لأسفل',
  squat:'سكوات', lunge:'اندفاع', deadlift:'رفعة ميتة', dip:'متوازي', dips:'متوازي',
  crunch:'كرنش', plank:'بلانك', bridge:'جسر', twist:'لف', rotation:'دوران',
  adduction:'تقريب', abduction:'إبعاد', stretch:'إطالة', shrug:'هز الكتفين',
  kickback:'ركل خلفي', step:'خطوة', jump:'قفز', run:'جري', walk:'مشي',
  clean:'كلين', snatch:'خطف', throw:'رمي', touch:'لمس', tap:'لمس',
  hold:'ثبات', swing:'تأرجح', rollout:'دحرجة', rollerout:'دحرجة',
  climb:'تسلق', climbing:'تسلق', bike:'دراجة', cycling:'دراجة',
  concentration:'تركيز', preacher:'على مقعد الواعظ', military:'عسكري',
  russian:'روسي', sumo:'سومو', archer:'الرامي', spider:'سبايدر', donkey:'دونكي',
  muscle:'عضلي', good:'جيد', morning:'صباح', floor:'أرضي', wall:'حائط',
  bench:'مقعد', support:'بدعم', suspended:'معلّق', body:'الجسم',
  knee:'الركبة', knees:'الركبتين', ankle:'الكاحل', ankles:'الكاحلين',
  elbow:'المرفق', elbows:'المرفقين', head:'الرأس', toe:'أصابع القدم', toes:'أصابع القدم',
  hand:'اليد', hands:'اليدين', palms:'راحتي اليدين', palm:'راحة اليد',
  grip:'قبضة', stance:'وقفة', attachment:'ملحق', blaster:'بلاستر',
  male:'للرجال', female:'للنساء', exercise:'تمرين', cardio:'هوائي',
  with:'مع', without:'دون', on:'على', off:'عن', to:'إلى', from:'من', and:'و',
  in:'في', at:'عند', against:'مقابل', through:'عبر', over:'فوق', under:'تحت',
  behind:'خلف', forward:'للأمام', down:'لأسفل', up:'لأعلى', lower:'سفلي',
  upper:'علوي', middle:'أوسط', around:'حول', using:'باستخدام', plus:'مع'
}

const protect = []

function escapeRe(s) {
  return s.replace(/[.*+?^$()|[\]\\{}]/g, '\\$&')
}

function protectPhrases(input) {
  let s = input.toLowerCase().trim()
  for (const [en, ar] of PHRASES) {
    const re = new RegExp('(^|[^a-z])' + escapeRe(en) + '(?=$|[^a-z])', 'g')
    s = s.replace(re, (_, lead) => {
      const token = '§' + protect.length + '§'
      protect.push(ar)
      return lead + token
    })
  }
  return s
}

export function arabicExerciseName(english) {
  protect.length = 0
  let s = protectPhrases(String(english || ''))
  s = s.replace(/([a-z]+(?:-[a-z]+)?)/g, raw => {
    const direct = WORDS[raw]
    if (direct) return direct
    if (raw.includes('-')) return raw.split('-').map(x => WORDS[x] || x).join(' ')
    return raw
  })
  s = s.replace(/§(\d+)§/g, (_, i) => protect[Number(i)] || '')
  s = s
    .replace(/\s+/g, ' ')
    .replace(/\s+([,;)])/g, '$1')
    .replace(/([(])\s+/g, '$1')
    .trim()

  if (!/[\u0600-\u06FF]/.test(s)) s = 'تمرين ' + s
  return s
}
