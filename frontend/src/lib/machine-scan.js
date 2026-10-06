import { lastEntryFor, lastBW } from './history.js'

export const MACHINE_CATALOG = Object.freeze([
  Object.freeze({
    id: 'chest_press',
    exerciseId: '0577',
    name: { ar: 'جهاز ضغط الصدر', en: 'Chest Press Machine' },
    short: { ar: 'ضغط الصدر على الجهاز', en: 'Machine chest press' },
    muscles: { ar: 'الصدر · الترايسبس · الكتف الأمامي', en: 'Chest · triceps · front delts' },
    visual: 'seated press machine with back pad and two forward handles around chest height',
    setup: {
      ar: [
        'اضبط المقعد بحيث تكون المقابض بمحاذاة منتصف الصدر تقريبًا.',
        'ألصق الظهر بالمسند وثبّت القدمين على الأرض.',
        'اجعل الرسغ مستقيمًا والمرفقين أسفل مستوى الكتفين قليلًا.'
      ],
      en: [
        'Set the seat so the handles are roughly level with mid-chest.',
        'Keep your back against the pad and both feet planted.',
        'Keep wrists neutral and elbows slightly below shoulder height.'
      ]
    },
    technique: {
      ar: [
        'ابدأ والكتفان للخلف ولأسفل دون مبالغة في تقويس الظهر.',
        'ادفع المقابض للأمام حتى قرب مد الذراعين دون قفل المرفقين بعنف.',
        'ارجع ببطء حتى تشعر بتمدد مريح في الصدر مع بقاء الكتفين تحت السيطرة.'
      ],
      en: [
        'Start with shoulders gently back and down without over-arching your back.',
        'Press forward until the arms are nearly straight without forcefully locking the elbows.',
        'Return under control to a comfortable chest stretch while keeping the shoulders stable.'
      ]
    },
    mistakes: {
      ar: ['رفع الكتفين نحو الأذنين', 'ارتداد الوزن بسرعة', 'نزول المقابض خلف مدى مريح للكتف'],
      en: ['Shrugging the shoulders', 'Bouncing the stack', 'Letting the handles travel past a comfortable shoulder range']
    },
    prescription: { sets: 3, repsMin: 8, repsMax: 12, restSec: 90, targetRir: 3 }
  }),
  Object.freeze({
    id: 'lat_pulldown',
    exerciseId: '2330',
    name: { ar: 'جهاز السحب العلوي', en: 'Lat Pulldown' },
    short: { ar: 'السحب العلوي للظهر', en: 'Lat pulldown' },
    muscles: { ar: 'الظهر الجانبي · البايسبس · أعلى الظهر', en: 'Lats · biceps · upper back' },
    visual: 'lat pulldown station with overhead cable, long bar and thigh restraint pads',
    setup: {
      ar: [
        'اضبط وسادة الفخذ لتثبت ساقيك دون ضغط مؤلم.',
        'اجلس والصدر مرفوع مع ميل بسيط فقط للخلف.',
        'اختر قبضة مريحة أعرض قليلًا من الكتفين عند استخدام البار الطويل.'
      ],
      en: [
        'Set the thigh pad so it holds your legs without painful pressure.',
        'Sit tall with only a slight lean back.',
        'Use a comfortable grip slightly wider than shoulder width on a long bar.'
      ]
    },
    technique: {
      ar: [
        'ابدأ بخفض لوحي الكتف قبل ثني المرفقين.',
        'اسحب المقبض نحو أعلى الصدر مع توجيه المرفقين لأسفل.',
        'ارفع الوزن ببطء حتى تمد الذراعين مع بقاء الجذع ثابتًا.'
      ],
      en: [
        'Begin by depressing the shoulder blades before bending the elbows.',
        'Pull toward the upper chest while driving the elbows down.',
        'Return slowly to full arm length without swinging the torso.'
      ]
    },
    mistakes: {
      ar: ['السحب خلف الرقبة', 'التأرجح بالجذع', 'ترك الوزن يسحب الكتفين بعنف للأعلى'],
      en: ['Pulling behind the neck', 'Swinging the torso', 'Letting the stack yank the shoulders upward']
    },
    prescription: { sets: 3, repsMin: 8, repsMax: 12, restSec: 90, targetRir: 3 }
  }),
  Object.freeze({
    id: 'leg_press_45',
    exerciseId: '0739',
    name: { ar: 'جهاز ضغط الأرجل 45°', en: '45° Leg Press' },
    short: { ar: 'ضغط الأرجل', en: 'Leg press' },
    muscles: { ar: 'المؤخرة · العضلات الرباعية · أوتار الركبة', en: 'Glutes · quads · hamstrings' },
    visual: '45 degree sled leg press with inclined backrest and large foot platform',
    setup: {
      ar: [
        'ضع القدمين بعرض قريب من الكتفين على منتصف المنصة.',
        'ثبت الرأس والظهر والحوض على المسند.',
        'ابدأ بمدى يسمح للركبتين بالانثناء دون التفاف الحوض عن المسند.'
      ],
      en: [
        'Place the feet around shoulder width near the middle of the platform.',
        'Keep head, back and pelvis supported.',
        'Use a depth that lets the knees bend without the pelvis rolling off the pad.'
      ]
    },
    technique: {
      ar: [
        'حرر الأمان ثم اخفض المنصة ببطء مع تتبع الركبتين اتجاه أصابع القدم.',
        'توقف قبل أن يبدأ أسفل الظهر أو الحوض بالانفصال عن المسند.',
        'ادفع عبر كامل القدم للعودة دون قفل الركبتين بعنف.'
      ],
      en: [
        'Release the safeties and lower under control with knees tracking over the toes.',
        'Stop before the lower back or pelvis rolls away from the pad.',
        'Drive through the whole foot and return without forcefully locking the knees.'
      ]
    },
    mistakes: {
      ar: ['رفع الحوض عن المسند', 'انهيار الركبتين للداخل', 'قفل الركبتين بعنف'],
      en: ['Pelvis lifting from the pad', 'Knees collapsing inward', 'Hard knee lockout']
    },
    prescription: { sets: 3, repsMin: 10, repsMax: 15, restSec: 120, targetRir: 3 }
  }),
  Object.freeze({
    id: 'leg_extension',
    exerciseId: '0585',
    name: { ar: 'جهاز تمديد الأرجل', en: 'Leg Extension' },
    short: { ar: 'تمديد الأرجل على الجهاز', en: 'Machine leg extension' },
    muscles: { ar: 'العضلات الرباعية', en: 'Quadriceps' },
    visual: 'seated leg extension machine with shin roller pad in front of lower legs',
    setup: {
      ar: [
        'حاذِ محور دوران الجهاز تقريبًا مع مفصل الركبة.',
        'ضع الوسادة فوق أسفل الساق مباشرة وليس على الكاحل.',
        'اضبط مسند الظهر بحيث يبقى الحوض ثابتًا.'
      ],
      en: [
        'Align the machine pivot roughly with the knee joint.',
        'Place the roller on the lower shin rather than directly on the ankle.',
        'Set the back pad so the pelvis stays stable.'
      ]
    },
    technique: {
      ar: [
        'مد الركبتين بسلاسة مع بقاء الفخذين على المقعد.',
        'توقف لحظة قرب أعلى الحركة دون ركل الوزن.',
        'اخفض الوزن ببطء حتى زاوية مريحة للركبة.'
      ],
      en: [
        'Extend the knees smoothly while keeping the thighs on the seat.',
        'Pause briefly near the top without kicking the weight.',
        'Lower slowly to a comfortable knee angle.'
      ]
    },
    mistakes: {
      ar: ['ركل الوزن بسرعة', 'رفع الحوض من المقعد', 'استخدام مدى يسبب ألمًا في الركبة'],
      en: ['Kicking the weight', 'Lifting the hips off the seat', 'Using a range that causes knee pain']
    },
    prescription: { sets: 3, repsMin: 10, repsMax: 15, restSec: 75, targetRir: 3 }
  }),
  Object.freeze({
    id: 'seated_leg_curl',
    exerciseId: '0599',
    name: { ar: 'جهاز ثني الأرجل جلوسًا', en: 'Seated Leg Curl' },
    short: { ar: 'ثني الأرجل جلوسًا', en: 'Seated leg curl' },
    muscles: { ar: 'أوتار الركبة', en: 'Hamstrings' },
    visual: 'seated leg curl machine with thigh restraint and lower leg roller',
    setup: {
      ar: [
        'حاذِ الركبة مع محور دوران الجهاز.',
        'ثبت وسادة الفخذ فوق الركبتين لتمنع ارتفاعهما.',
        'ضع وسادة الساق فوق الكاحل بقليل واضبط البداية على مدى مريح.'
      ],
      en: [
        'Align the knee with the machine pivot.',
        'Secure the thigh pad so the thighs cannot lift.',
        'Set the lower-leg pad just above the ankle and choose a comfortable start angle.'
      ]
    },
    technique: {
      ar: [
        'اثنِ الركبتين واسحب الوسادة لأسفل وخلفك دون تحريك الجذع.',
        'اعصر أوتار الركبة لحظة في نهاية الحركة.',
        'ارجع ببطء حتى تقترب الركبتان من المد دون فقدان السيطرة.'
      ],
      en: [
        'Curl the pad down and back without moving the torso.',
        'Briefly squeeze the hamstrings at the end of the curl.',
        'Return slowly toward knee extension while staying in control.'
      ]
    },
    mistakes: {
      ar: ['ارتفاع الفخذين عن المقعد', 'التقوس أو التأرجح بالجذع', 'ترك الوزن يرتد في العودة'],
      en: ['Thighs lifting from the seat', 'Arching or swinging the torso', 'Letting the stack bounce on the return']
    },
    prescription: { sets: 3, repsMin: 10, repsMax: 15, restSec: 75, targetRir: 3 }
  }),
  Object.freeze({
    id: 'shoulder_press',
    exerciseId: '0603',
    name: { ar: 'جهاز ضغط الكتف', en: 'Shoulder Press Machine' },
    short: { ar: 'ضغط الكتف على الجهاز', en: 'Machine shoulder press' },
    muscles: { ar: 'الكتف · الترايسبس', en: 'Shoulders · triceps' },
    visual: 'seated shoulder press machine with back pad and handles starting around shoulder level',
    setup: {
      ar: [
        'اضبط المقعد بحيث تبدأ المقابض قرب مستوى الكتفين.',
        'ثبت الظهر والرأس براحة على المسند.',
        'اختر قبضة لا تجبر المرفقين على الرجوع خلف الجسم.'
      ],
      en: [
        'Set the seat so the handles start around shoulder level.',
        'Keep your back and head comfortably supported.',
        'Choose a grip that does not force the elbows far behind the torso.'
      ]
    },
    technique: {
      ar: [
        'شد الجذع وحافظ على الأضلاع تحت السيطرة.',
        'ادفع المقابض لأعلى بسلاسة دون رفع الكتفين نحو الأذنين.',
        'اخفضها ببطء إلى مدى مريح للكتف.'
      ],
      en: [
        'Brace the torso and keep the ribs controlled.',
        'Press smoothly without shrugging toward the ears.',
        'Lower under control to a comfortable shoulder range.'
      ]
    },
    mistakes: {
      ar: ['تقوس أسفل الظهر بشدة', 'رفع الكتفين', 'النزول إلى مدى مؤلم'],
      en: ['Excessive lower-back arch', 'Shrugging the shoulders', 'Lowering into a painful range']
    },
    prescription: { sets: 3, repsMin: 8, repsMax: 12, restSec: 90, targetRir: 3 }
  }),
  Object.freeze({
    id: 'seated_row',
    exerciseId: '1350',
    name: { ar: 'جهاز التجديف جلوسًا', en: 'Seated Row Machine' },
    short: { ar: 'تجديف جالس على الجهاز', en: 'Machine seated row' },
    muscles: { ar: 'أعلى الظهر · الظهر الجانبي · البايسبس', en: 'Upper back · lats · biceps' },
    visual: 'seated row machine with chest support or seated lever handles pulled toward torso',
    setup: {
      ar: [
        'اضبط المقعد بحيث تصل للمقابض دون تدوير الكتفين للأمام بقوة.',
        'ثبت القدمين، وإذا وُجد مسند صدر فاضبطه ليسمح بسحب كامل.',
        'ابدأ بذراعين ممدودتين وكتفين في وضع مريح.'
      ],
      en: [
        'Set the seat so you can reach the handles without aggressively rounding the shoulders.',
        'Plant the feet and, if present, set the chest pad to allow a full pull.',
        'Begin with long arms and the shoulders in a comfortable position.'
      ]
    },
    technique: {
      ar: [
        'ابدأ بسحب لوحي الكتف ثم حرّك المرفقين للخلف.',
        'اسحب المقابض نحو الجذع دون رفع الكتفين.',
        'ارجع ببطء حتى تمتد الذراعان مع بقاء الجذع ثابتًا.'
      ],
      en: [
        'Initiate with the shoulder blades, then drive the elbows back.',
        'Pull the handles toward the torso without shrugging.',
        'Return slowly to long arms while keeping the torso stable.'
      ]
    },
    mistakes: {
      ar: ['التأرجح للخلف', 'رفع الكتفين', 'سحب المرفقين لمسافة مبالغ فيها خلف الجسم'],
      en: ['Rocking the torso back', 'Shrugging the shoulders', 'Pulling the elbows excessively behind the torso']
    },
    prescription: { sets: 3, repsMin: 8, repsMax: 12, restSec: 90, targetRir: 3 }
  })
])

export const MACHINE_BY_ID = Object.freeze(Object.fromEntries(MACHINE_CATALOG.map(m => [m.id, m])))

export function machineText(machine, lang = 'en') {
  const key = String(lang || '').toLowerCase().startsWith('ar') ? 'ar' : 'en'
  return {
    name: machine?.name?.[key] || machine?.name?.en || '',
    short: machine?.short?.[key] || machine?.short?.en || '',
    muscles: machine?.muscles?.[key] || machine?.muscles?.en || '',
    setup: machine?.setup?.[key] || machine?.setup?.en || [],
    technique: machine?.technique?.[key] || machine?.technique?.en || [],
    mistakes: machine?.mistakes?.[key] || machine?.mistakes?.en || []
  }
}

const median = values => {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const i = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[i] : (sorted[i - 1] + sorted[i]) / 2
}

export function machinePrescription(S, machine) {
  const p = machine?.prescription || { sets: 3, repsMin: 8, repsMax: 12, restSec: 90, targetRir: 3 }
  const last = machine?.exerciseId ? lastEntryFor(S || {}, machine.exerciseId) : null
  const loads = (last?.sets || [])
    .flatMap(set => set?.sides ? [set.sides.L?.w, set.sides.R?.w] : [set?.w])
    .map(Number)
    .filter(w => Number.isFinite(w) && w > 0)
  const previous = median(loads)
  const bw = lastBW(S || {})

  return {
    ...p,
    load: previous > 0
      ? { mode: 'history', value: previous, unit: S?.unit || 'kg', date: last?.d || null }
      : { mode: 'calibrate', value: null, unit: S?.unit || 'kg', bodyWeight: bw?.w || null, date: null }
  }
}

export function calibrateNextLoad({ weight, reps, rir, repsMin = 8, repsMax = 12 }) {
  const w = Math.max(0, Number(weight) || 0)
  const r = Math.max(0, Math.round(Number(reps) || 0))
  const reserve = Math.max(0, Math.round(Number(rir) || 0))
  if (!w || !r) return { action: 'retry', factor: 1 }

  if (r < repsMin || reserve <= 1) return { action: 'reduce', factor: 0.9 }
  if (r >= repsMax && reserve >= 4) return { action: 'increase', factor: 1.1 }
  if (r >= repsMax && reserve >= 3) return { action: 'increase-small', factor: 1.05 }
  if (reserve >= 2 && reserve <= 3 && r >= repsMin && r <= repsMax) return { action: 'keep', factor: 1 }
  if (reserve >= 4 && r < repsMax) return { action: 'increase-small', factor: 1.05 }
  return { action: 'keep', factor: 1 }
}

export function roundLoad(value, unit = 'kg') {
  const step = unit === 'lb' ? 5 : 2.5
  return Math.max(step, Math.round((Number(value) || 0) / step) * step)
}
