import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { useLang } from '../lib/i18n.js'
import { getLang } from '../lib/i18n-core.js'
import { DEMO } from '../lib/demo.js'
import { EXIDX } from '../lib/exercises.js'
import { MACHINE_CATALOG, MACHINE_BY_ID, machineText, machinePrescription, calibrateNextLoad, roundLoad } from '../lib/machine-scan.js'
import { analyzeMachinePhoto } from '../lib/machine-scan-api.js'
import { exerciseDetailSheet } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'

const copy = ar => ar ? {
  title: 'صوّر الجهاز',
  subtitle: 'اعرف الجهاز، اضبطه بشكل صحيح، وابدأ بجرعة تدريب مناسبة.',
  camera: 'التقط صورة للجهاز',
  change: 'تغيير الصورة',
  analyse: 'تحليل الجهاز',
  analysing: 'جارٍ التعرّف على الجهاز…',
  privacy: 'تُستخدم نسخة مصغّرة للتحليل فقط ولا يحفظ PT650 الصورة الخام.',
  demo: 'النسخة التجريبية لا ترسل الصور إلى مزود ذكاء اصطناعي. اختر الجهاز يدويًا.',
  uncertain: 'لم نتأكد من الجهاز بما يكفي. اختره يدويًا بدل التخمين.',
  failed: 'تعذر التحليل الآلي الآن. يمكنك متابعة الإعداد يدويًا.',
  manual: 'اختر الجهاز',
  result: 'تم التعرّف على الجهاز',
  confidence: 'الثقة',
  setup: 'ضبط الجهاز',
  technique: 'التكنيك الصحيح',
  mistakes: 'تجنب هذه الأخطاء',
  prescription: 'اقتراح البداية',
  sets: 'مجموعات',
  reps: 'عدات',
  rest: 'راحة',
  seconds: 'ث',
  load: 'الحمل المقترح',
  historyLoad: 'بناءً على آخر حمل مسجل لك على هذا التمرين.',
  calibrationLoad: 'لا يمكن تحديد حمل آمن من وزن الجسم وحده لأن مقاومة الأجهزة تختلف. ابدأ بحمل خفيف ثم عايره من أول مجموعة.',
  bodyWeightContext: 'وزنك المسجل',
  firstSet: 'عاير الحمل من أول مجموعة',
  weight: 'الوزن',
  completedReps: 'العدات المنفذة',
  rir: 'عدات احتياطية RIR',
  calculate: 'احسب الحمل التالي',
  keep: 'الحمل مناسب — استمر عليه.',
  increase: 'سهل بوضوح — زد الحمل تقريبًا 10%.',
  increaseSmall: 'لديك احتياط جيد — زد الحمل خطوة صغيرة.',
  reduce: 'الحمل ثقيل — خفّضه تقريبًا 10%.',
  retry: 'أدخل وزنًا وعدد عدات فعليًا أولًا.',
  nextLoad: 'اقتراح الحمل التالي',
  openExercise: 'فتح شرح التمرين',
  retake: 'صورة أخرى',
  startOver: 'مسح جديد',
  back: 'رجوع',
  captureHint: 'صوّر الجهاز كاملًا قدر الإمكان، مع المقعد والمقابض ومسار الأوزان.',
  lowConfidence: 'مطابقة غير مؤكدة',
  noPhoto: 'اختر صورة واضحة للجهاز أولًا.'
} : {
  title: 'Scan a machine',
  subtitle: 'Identify it, set it up correctly, and start with an appropriate training dose.',
  camera: 'Take a photo of the machine',
  change: 'Change photo',
  analyse: 'Analyze machine',
  analysing: 'Identifying the machine…',
  privacy: 'Only a downsized copy is used for recognition; PT650 does not store the raw photo.',
  demo: 'The demo does not send photos to an AI provider. Choose the machine manually.',
  uncertain: 'PT650 is not confident enough. Choose the machine manually instead of guessing.',
  failed: 'Automatic recognition is unavailable right now. You can continue manually.',
  manual: 'Choose the machine',
  result: 'Machine identified',
  confidence: 'Confidence',
  setup: 'Machine setup',
  technique: 'Correct technique',
  mistakes: 'Avoid these mistakes',
  prescription: 'Starting prescription',
  sets: 'sets',
  reps: 'reps',
  rest: 'rest',
  seconds: 's',
  load: 'Suggested load',
  historyLoad: 'Based on your most recent logged load for this exercise.',
  calibrationLoad: 'Body weight alone cannot define a safe machine load because machine resistance varies. Start light and calibrate from your first set.',
  bodyWeightContext: 'Logged body weight',
  firstSet: 'Calibrate from the first set',
  weight: 'Weight',
  completedReps: 'Completed reps',
  rir: 'Reps in reserve (RIR)',
  calculate: 'Calculate next load',
  keep: 'The load is appropriate — keep it.',
  increase: 'Clearly easy — increase the load by about 10%.',
  increaseSmall: 'You have useful reserve — increase one small step.',
  reduce: 'The load is too heavy — reduce it by about 10%.',
  retry: 'Enter an actual load and rep count first.',
  nextLoad: 'Suggested next load',
  openExercise: 'Open exercise guide',
  retake: 'Take another photo',
  startOver: 'New scan',
  back: 'Back',
  captureHint: 'Fit the whole machine in frame when possible, including the seat, handles and weight path.',
  lowConfidence: 'Uncertain match',
  noPhoto: 'Choose a clear machine photo first.'
}

function MachineChoice({ machine, lang, selected, onClick }) {
  const x = machineText(machine, lang)
  return (
    <button className={'machine-choice' + (selected ? ' on' : '')} onClick={onClick}>
      <span className="machine-choice-icon"><Icon name="dumbbell" /></span>
      <span className="machine-choice-copy">
        <strong>{x.name}</strong>
        <small>{x.muscles}</small>
      </span>
      <Icon name={selected ? 'checkCircle' : 'chevronRight'} />
    </button>
  )
}

export default function MachineScan() {
  useLang()
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const toast = useUI(s => s.toast)
  const lang = getLang()
  const ar = String(lang).toLowerCase().startsWith('ar')
  const C = copy(ar)
  const inputRef = useRef(null)

  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [recognition, setRecognition] = useState(null)
  const [selectedId, setSelectedId] = useState('')
  const [manual, setManual] = useState(false)
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [rir, setRir] = useState('3')
  const [calibration, setCalibration] = useState(null)

  const machine = selectedId ? MACHINE_BY_ID[selectedId] : null
  const text = machine ? machineText(machine, lang) : null
  const prescription = useMemo(() => machine ? machinePrescription(S, machine) : null, [S, machine])

  useEffect(() => {
    if (!prescription) return
    setWeight(prescription.load.mode === 'history' ? String(prescription.load.value) : '')
    setReps('')
    setRir(String(prescription.targetRir))
    setCalibration(null)
  }, [machine?.id])

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  const pick = e => {
    const next = e.target.files?.[0] || null
    e.target.value = ''
    if (!next) return
    if (!/^image\/(jpeg|png|webp)$/i.test(next.type || '') || next.size > 12 * 1024 * 1024) {
      toast(ar ? 'استخدم صورة JPG أو PNG أو WebP بحجم أقل من 12 MB.' : 'Use a JPG, PNG or WebP image smaller than 12 MB.')
      return
    }
    if (preview) URL.revokeObjectURL(preview)
    setFile(next)
    setPreview(URL.createObjectURL(next))
    setRecognition(null)
    setSelectedId('')
    setManual(false)
    setMessage('')
    setCalibration(null)
  }

  const analyze = async () => {
    if (!file) { toast(C.noPhoto); return }
    if (DEMO || !user) {
      setManual(true)
      setMessage(C.demo)
      return
    }
    setBusy(true)
    setMessage('')
    setRecognition(null)
    try {
      const result = await analyzeMachinePhoto(file)
      const rec = result?.recognition || null
      setRecognition(rec)
      if (rec?.machineId && MACHINE_BY_ID[rec.machineId]) {
        setSelectedId(rec.machineId)
        setManual(false)
      } else {
        setSelectedId('')
        setManual(true)
        setMessage(C.uncertain)
      }
    } catch (e) {
      setManual(true)
      setMessage(C.failed)
    } finally {
      setBusy(false)
    }
  }

  const reset = () => {
    if (preview) URL.revokeObjectURL(preview)
    setFile(null)
    setPreview('')
    setRecognition(null)
    setSelectedId('')
    setManual(false)
    setMessage('')
    setCalibration(null)
  }

  const calibrate = () => {
    if (!prescription) return
    const result = calibrateNextLoad({
      weight,
      reps,
      rir,
      repsMin: prescription.repsMin,
      repsMax: prescription.repsMax
    })
    const next = result.action === 'retry' ? null : roundLoad((Number(weight) || 0) * result.factor, S.unit)
    setCalibration({ ...result, next })
  }

  const calibrationText = calibration
    ? calibration.action === 'increase' ? C.increase
      : calibration.action === 'increase-small' ? C.increaseSmall
        : calibration.action === 'reduce' ? C.reduce
          : calibration.action === 'keep' ? C.keep : C.retry
    : ''

  return (
    <div className="machine-scan-page">
      <header className="machine-scan-head">
        <button className="iconbtn" onClick={() => nav('/home')} aria-label={C.back}><Icon name="chevronLeft" /></button>
        <div className="grow">
          <div className="machine-scan-kicker">PT650 · Machine Scan</div>
          <h1>{C.title}</h1>
          <p>{C.subtitle}</p>
        </div>
      </header>

      <section className="machine-capture-card">
        <input ref={inputRef} className="machine-file-input" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={pick} />
        {!preview ? (
          <button className="machine-capture-empty" onClick={() => inputRef.current?.click()}>
            <span className="machine-camera-orb"><Icon name="camera" /></span>
            <strong>{C.camera}</strong>
            <span>{C.captureHint}</span>
          </button>
        ) : (
          <>
            <div className="machine-photo-wrap">
              <img src={preview} alt="" className="machine-photo" />
              <button className="machine-photo-change" onClick={() => inputRef.current?.click()}><Icon name="camera" />{C.change}</button>
            </div>
            <div className="machine-capture-actions">
              <Button variant="primary" icon="sparkles" onClick={analyze} disabled={busy}>{busy ? C.analysing : C.analyse}</Button>
              <Button icon="reset" onClick={reset}>{C.retake}</Button>
            </div>
          </>
        )}
        <div className="machine-privacy"><Icon name="lock" /><span>{C.privacy}</span></div>
      </section>

      {!!message && <div className="machine-scan-message"><Icon name="info" /><span>{message}</span></div>}

      {manual && (
        <section className="machine-section">
          <div className="machine-section-title">
            <span className="machine-section-num">1</span>
            <div><h2>{C.manual}</h2><p>{C.lowConfidence}</p></div>
          </div>
          <div className="machine-choice-list">
            {MACHINE_CATALOG.map(item => (
              <MachineChoice key={item.id} machine={item} lang={lang} selected={item.id === selectedId} onClick={() => setSelectedId(item.id)} />
            ))}
          </div>
        </section>
      )}

      {machine && text && prescription && (
        <div className="machine-result">
          <section className="machine-result-hero">
            <div className="machine-result-mark"><Icon name="checkCircle" /></div>
            <div className="grow">
              <span>{C.result}</span>
              <h2>{text.name}</h2>
              <p>{text.muscles}</p>
            </div>
            {recognition?.machineId === machine.id && (
              <div className="machine-confidence">
                <strong>{Math.round((recognition.confidence || 0) * 100)}%</strong>
                <span>{C.confidence}</span>
              </div>
            )}
          </section>

          <div className="machine-guide-grid">
            <section className="machine-guide-card">
              <div className="machine-guide-head"><Icon name="gear" /><h3>{C.setup}</h3></div>
              <ol>{text.setup.map((line, i) => <li key={i}>{line}</li>)}</ol>
            </section>
            <section className="machine-guide-card">
              <div className="machine-guide-head"><Icon name="checkCircle" /><h3>{C.technique}</h3></div>
              <ol>{text.technique.map((line, i) => <li key={i}>{line}</li>)}</ol>
            </section>
          </div>

          <section className="machine-guide-card machine-mistakes">
            <div className="machine-guide-head"><Icon name="warning" /><h3>{C.mistakes}</h3></div>
            <ul>{text.mistakes.map((line, i) => <li key={i}>{line}</li>)}</ul>
          </section>

          <section className="machine-prescription">
            <div className="machine-section-title">
              <span className="machine-section-num">2</span>
              <div><h2>{C.prescription}</h2><p>{text.short}</p></div>
            </div>
            <div className="machine-dose-grid">
              <div><strong>{prescription.sets}</strong><span>{C.sets}</span></div>
              <div><strong>{prescription.repsMin}–{prescription.repsMax}</strong><span>{C.reps}</span></div>
              <div><strong>{prescription.restSec}{C.seconds}</strong><span>{C.rest}</span></div>
              <div><strong>RIR {prescription.targetRir}</strong><span>Target</span></div>
            </div>

            <div className="machine-load-card">
              <div className="machine-load-head">
                <span className="machine-load-icon"><Icon name="dumbbell" /></span>
                <div>
                  <span>{C.load}</span>
                  {prescription.load.mode === 'history'
                    ? <strong>{prescription.load.value} {prescription.load.unit}</strong>
                    : <strong>{ar ? 'معايرة أول مجموعة' : 'First-set calibration'}</strong>}
                </div>
              </div>
              <p>{prescription.load.mode === 'history' ? C.historyLoad : C.calibrationLoad}</p>
              {prescription.load.bodyWeight && prescription.load.mode !== 'history' && (
                <div className="machine-body-context">{C.bodyWeightContext}: <strong>{prescription.load.bodyWeight} {prescription.load.unit}</strong></div>
              )}
            </div>
          </section>

          <section className="machine-calibration">
            <div className="machine-section-title">
              <span className="machine-section-num">3</span>
              <div><h2>{C.firstSet}</h2><p>RIR 2–3</p></div>
            </div>
            <div className="machine-calibration-fields">
              <label><span>{C.weight} ({S.unit})</span><input inputMode="decimal" value={weight} onChange={e => setWeight(e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.'))} /></label>
              <label><span>{C.completedReps}</span><input inputMode="numeric" value={reps} onChange={e => setReps(e.target.value.replace(/\D/g, '').slice(0, 2))} /></label>
              <label><span>{C.rir}</span><select value={rir} onChange={e => setRir(e.target.value)}>{[0,1,2,3,4,5].map(v => <option key={v} value={v}>{v}</option>)}</select></label>
            </div>
            <Button variant="primary" onClick={calibrate}>{C.calculate}</Button>
            {calibration && (
              <div className={'machine-calibration-result ' + calibration.action}>
                <Icon name={calibration.action === 'reduce' ? 'arrowDown' : calibration.action.startsWith('increase') ? 'arrowUp' : 'checkCircle'} />
                <div>
                  <strong>{calibrationText}</strong>
                  {calibration.next && <span>{C.nextLoad}: {calibration.next} {S.unit}</span>}
                </div>
              </div>
            )}
          </section>

          <section className="machine-demo-card">
            <div className="machine-demo-icon"><Icon name="dumbbell" /></div>
            <div className="grow"><h3>{C.openExercise}</h3></div>
            <Button size="sm" variant="tinted" onClick={() => {
              const ex = EXIDX[machine.exerciseId]
              if (ex) exerciseDetailSheet(ex)
            }}>{C.openExercise}</Button>
          </section>

          <Button variant="ghost" icon="camera" onClick={reset}>{C.startOver}</Button>
        </div>
      )}
    </div>
  )
}
