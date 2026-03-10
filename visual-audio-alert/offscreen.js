/**
 * Visual Audio Alert — offscreen.js
 *
 * Bu dosya chrome.offscreen API ile açılan gizli sayfada çalışır.
 * Web Audio API'ye tam erişimi vardır.
 *
 * ════════════════════════════════════════════════════════════════════════════
 * SES ANALİZİ AKIŞI
 * ════════════════════════════════════════════════════════════════════════════
 *
 *  tabCapture StreamID
 *       │
 *       ▼
 *  getUserMedia({ audio: { mandatory: { chromeMediaSource: 'tab', ... } } })
 *       │
 *       ▼
 *  AudioContext.createMediaStreamSource(stream)
 *       │
 *       ▼
 *  AnalyserNode (FFT size: 256)
 *       │
 *       ▼
 *  getByteTimeDomainData() → RMS hesapla → volume (0–255)
 *       │
 *       ▼
 *  volume > threshold ? → background.js'e VAA_VOLUME_REPORT
 *
 * ════════════════════════════════════════════════════════════════════════════
 */

// ─── STATE ────────────────────────────────────────────────────────────────────
let audioContext = null;
let analyser     = null;
let source       = null;
let stream       = null;
let rafId        = null;
let threshold    = 25;   // varsayılan orta hassasiyet

// ─── WEB AUDIO ANALİZİ ───────────────────────────────────────────────────────

/**
 * RMS (Root Mean Square) hesaplama.
 * Zaman domenindeki dalga verilerinden anlık ses seviyesini ölçer.
 * Sonuç: 0 (sessiz) – 255 (maksimum ses)
 */
function calculateRMS(dataArray) {
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    // 128 center point (signed → unsigned conversion)
    const val = (dataArray[i] - 128) / 128;
    sum += val * val;
  }
  return Math.sqrt(sum / dataArray.length) * 255;
}

/**
 * Ses seviyesini threshold ile karşılaştırarak background'a rapor et.
 * requestAnimationFrame döngüsünde çalışır (~60fps).
 *
 * Throttle: Her frame'de mesaj göndermek yerine sadece durum DEĞİŞİMİNDE
 * veya her 4 frame'de bir gönder (performans optimizasyonu).
 */
let frameCount       = 0;
let lastTriggered    = false;
const REPORT_EVERY   = 3; // kaç frame'de bir rapor

function analysisLoop() {
  if (!analyser) return;

  frameCount++;

  const dataArray = new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(dataArray);

  const volume    = calculateRMS(dataArray);
  const triggered = volume > threshold;

  // Durum değiştiyse veya belirli aralıklarla gönder
  if (triggered !== lastTriggered || (triggered && frameCount % REPORT_EVERY === 0)) {
    lastTriggered = triggered;

    // Yoğunluğu 0.0–1.0 arasında normalize et
    // threshold üzerindeki fazlalık, maksimum 3x threshold'a göre ölçeklenir
    const excess    = Math.max(0, volume - threshold);
    const maxExcess = threshold * 3;
    const intensity = Math.min(1, excess / maxExcess);

    chrome.runtime.sendMessage({
      type:      'VAA_VOLUME_REPORT',
      volume:    Math.round(volume),
      threshold,
      triggered,
      intensity: parseFloat(intensity.toFixed(3)),
    });
  }

  rafId = requestAnimationFrame(analysisLoop);
}

// ─── BAŞLAT ───────────────────────────────────────────────────────────────────

async function startAnalysis(streamId, newThreshold) {
  // Önceki analizi temizle
  await stopAnalysis();

  threshold = newThreshold;

  try {
    // tabCapture StreamID'den MediaStream elde et
    // Bu yöntem Chrome'un tabCapture ID'sini gerçek akışa dönüştürür
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId,
        },
      },
      video: false,
    });

    // AudioContext ve AnalyserNode kur
    audioContext = new AudioContext();
    analyser     = audioContext.createAnalyser();

    // FFT boyutu: 256 → yeterli çözünürlük, düşük gecikme
    analyser.fftSize          = 256;
    analyser.smoothingTimeConstant = 0.5; // yumuşatma (ani spike'ları azalt)

    source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    // NOT: analyser.connect(audioContext.destination) YAPILMAZ
    // — kullanıcının sesini tekrar çalarız. Sadece analiz istiyoruz.

    // Analiz döngüsünü başlat
    rafId = requestAnimationFrame(analysisLoop);

    console.log('[VAA Offscreen] Audio analysis started. Threshold:', threshold);

  } catch (err) {
    console.error('[VAA Offscreen] Failed to start audio analysis:', err);
    chrome.runtime.sendMessage({ type: 'VAA_CAPTURE_ERROR', error: err.message });
  }
}

// ─── DURDUR ───────────────────────────────────────────────────────────────────

async function stopAnalysis() {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  if (source) {
    source.disconnect();
    source = null;
  }

  if (analyser) {
    analyser = null;
  }

  if (audioContext) {
    try { await audioContext.close(); } catch (_) {}
    audioContext = null;
  }

  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    stream = null;
  }

  lastTriggered = false;
  frameCount    = 0;

  console.log('[VAA Offscreen] Audio analysis stopped.');
}

// ─── MESAJ DİNLEYİCİ ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'VAA_START_ANALYSIS') {
    startAnalysis(msg.streamId, msg.threshold);
  }

  if (msg.type === 'VAA_STOP_ANALYSIS') {
    stopAnalysis();
  }

  if (msg.type === 'VAA_UPDATE_THRESHOLD') {
    threshold = msg.threshold;
    console.log('[VAA Offscreen] Threshold updated:', threshold);
  }
});
