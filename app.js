const topics = [
  "Leistungsdruck",
  "Prüfungen und Noten",
  "KI und Schule",
  "Handynutzung",
  "Freundschaft und soziale Gruppen",
  "Pausenräume",
  "Schulwege",
  "Motivation",
  "Lehrpersonen",
  "Schulstress",
  "Müdigkeit",
  "Digitale Medien",
  "Konzentration",
  "Schulregeln",
  "Sprache im Schulalltag",
  "Mitsprache",
  "Zukunftsängste",
  "FMS-/Gymi-Alltag",
  "Unsichtbare Arbeit hinter Schule",
  "Was Schule verschweigt",
  "Ein Tag im Leben von ...",
  "Orte der Schule",
  "Rituale und Gewohnheiten",
  "Schule aus Sicht verschiedener Personen"
];

const topicOutput = document.querySelector("#topic-output");
const topicButton = document.querySelector("#topic-button");
let lastTopic = topicOutput?.textContent ?? "";

topicButton?.addEventListener("click", () => {
  const nextTopics = topics.filter((topic) => topic !== lastTopic);
  const topic = nextTopics[Math.floor(Math.random() * nextTopics.length)];
  lastTopic = topic;
  topicOutput.textContent = topic;
});

const filterButtons = document.querySelectorAll("[data-filter]");
const reports = document.querySelectorAll(".report-card");

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const filter = button.dataset.filter;

    filterButtons.forEach((item) => item.classList.toggle("is-active", item === button));
    reports.forEach((report) => {
      report.hidden = filter !== "all" && report.dataset.category !== filter;
    });
  });
});

const mp4Upload = document.querySelector("#mp4-upload");
const uploadPreview = document.querySelector("#upload-preview");
const uploadPlaceholder = document.querySelector("#upload-placeholder");
const uploadMeta = document.querySelector("#upload-meta");
const autoChecks = document.querySelector("#auto-checks");
const runAnalysis = document.querySelector("#run-analysis");
const analysisStatus = document.querySelector("#analysis-status");
const analysisResults = document.querySelector("#analysis-results");
let uploadObjectUrl = "";
let selectedFile = null;
let selectedIsMp4 = false;

function formatBytes(bytes = 0) {
  if (!bytes) return "0 MB";
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatTime(seconds = 0) {
  if (!Number.isFinite(seconds)) return "offen";
  const rounded = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(rounded / 60);
  const rest = String(rounded % 60).padStart(2, "0");
  return `${minutes}:${rest}`;
}

function escapeHtml(value = "") {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  })[char]);
}

function checkItem(label, status, detail) {
  return `
    <div class="auto-check ${status}">
      <span>${status === "pass" ? "OK" : status === "warn" ? "Prüfen" : "Offen"}</span>
      <div>
        <strong>${label}</strong>
        <small>${detail}</small>
      </div>
    </div>
  `;
}

function resultCard(title, status, metric, detail, times = []) {
  const label = status === "pass" ? "OK" : status === "warn" ? "Prüfen" : "Nicht messbar";
  const timeButtons = times.length ? `
    <div class="analysis-times">
      ${times.slice(0, 6).map((time) => `<button type="button" data-jump="${time}">${formatTime(time)}</button>`).join("")}
    </div>
  ` : "";

  return `
    <article class="analysis-card ${status}">
      <span>${label}</span>
      <div>
        <h4>${title}</h4>
        <strong>${metric}</strong>
        <p>${detail}</p>
        ${timeButtons}
      </div>
    </article>
  `;
}

function renderAutoChecks(file, isMp4) {
  if (!autoChecks || !uploadPreview) return;

  const duration = uploadPreview.duration;
  const width = uploadPreview.videoWidth;
  const height = uploadPreview.videoHeight;
  const ratio = width && height ? width / height : 0;
  const isLandscape = ratio > 1.2;
  const nearFiveMinutes = Number.isFinite(duration) && duration >= 240 && duration <= 360;

  autoChecks.innerHTML = [
    checkItem("Dateiformat", isMp4 ? "pass" : "warn", isMp4 ? "MP4 erkannt." : "Bitte als MP4 exportieren."),
    checkItem("Laufzeit", nearFiveMinutes ? "pass" : "warn", `${formatTime(duration)} erkannt; Zielwert: etwa 5 Minuten.`),
    checkItem("Querformat", isLandscape ? "pass" : "warn", width && height ? `${width} x ${height}px, Seitenverhältnis ${ratio.toFixed(2)}.` : "Auflösung konnte noch nicht gelesen werden."),
    checkItem("Dateigröße", file.size <= 500 * 1024 * 1024 ? "pass" : "warn", `${formatBytes(file.size)}; vor dem Upload bei sehr großen Dateien komprimieren.`)
  ].join("");
}

function waitForMedia(video, eventName) {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error(`${eventName} dauerte zu lange.`)), 7000);
    video.addEventListener(eventName, () => {
      window.clearTimeout(timeout);
      resolve();
    }, { once: true });
  });
}

async function seekVideo(video, time) {
  const target = Math.min(Math.max(time, 0), Math.max(video.duration - 0.05, 0));
  const promise = waitForMedia(video, "seeked").catch(() => {});
  video.currentTime = target;
  await promise;
}

function sampleImage(video, canvas, context) {
  const width = 160;
  const height = Math.max(90, Math.round(width / (video.videoWidth / video.videoHeight || 16 / 9)));
  canvas.width = width;
  canvas.height = height;
  context.drawImage(video, 0, 0, width, height);
  const { data } = context.getImageData(0, 0, width, height);
  const gray = new Float32Array(width * height);
  let sum = 0;
  let sumSq = 0;
  let dark = 0;
  let bright = 0;

  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    const value = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    gray[p] = value;
    sum += value;
    sumSq += value * value;
    if (value < 35) dark += 1;
    if (value > 225) bright += 1;
  }

  const count = gray.length;
  const mean = sum / count;
  const contrast = Math.sqrt(Math.max(sumSq / count - mean * mean, 0));
  return {
    width,
    height,
    gray,
    brightness: mean,
    contrast,
    darkRatio: dark / count,
    brightRatio: bright / count,
    tilt: estimateTilt(gray, width, height)
  };
}

function estimateTilt(gray, width, height) {
  const bins = new Array(181).fill(0);

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const p = y * width + x;
      const gx = -gray[p - width - 1] - 2 * gray[p - 1] - gray[p + width - 1]
        + gray[p - width + 1] + 2 * gray[p + 1] + gray[p + width + 1];
      const gy = -gray[p - width - 1] - 2 * gray[p - width] - gray[p - width + 1]
        + gray[p + width - 1] + 2 * gray[p + width] + gray[p + width + 1];
      const mag = Math.hypot(gx, gy);
      if (mag < 80) continue;

      let lineAngle = Math.atan2(gy, gx) * 180 / Math.PI + 90;
      while (lineAngle < -90) lineAngle += 180;
      while (lineAngle > 90) lineAngle -= 180;
      const nearAxis = Math.min(Math.abs(lineAngle), Math.abs(Math.abs(lineAngle) - 90));
      if (nearAxis <= 18) bins[Math.round(lineAngle + 90)] += mag;
    }
  }

  const maxWeight = Math.max(...bins);
  if (maxWeight < 12000) return null;
  const bestAngle = bins.indexOf(maxWeight) - 90;
  return Math.min(Math.abs(bestAngle), Math.abs(Math.abs(bestAngle) - 90));
}

function frameDifference(previous, next) {
  if (!previous || !next) return 0;
  let diff = 0;
  for (let i = 0; i < previous.gray.length; i += 1) {
    diff += Math.abs(previous.gray[i] - next.gray[i]);
  }
  return diff / previous.gray.length;
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

async function analyzeFrames(file) {
  if (!uploadObjectUrl) throw new Error("Kein Video geladen.");
  const video = document.createElement("video");
  video.src = uploadObjectUrl;
  video.muted = true;
  video.playsInline = true;
  video.preload = "metadata";
  await waitForMedia(video, "loadedmetadata");

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const duration = video.duration || 0;
  const sampleCount = Math.min(18, Math.max(8, Math.round(duration / 20)));
  const times = Array.from({ length: sampleCount }, (_, index) => (
    duration <= 2 ? 0 : 1 + (duration - 2) * (index / Math.max(sampleCount - 1, 1))
  ));
  const frames = [];

  for (const time of times) {
    await seekVideo(video, time);
    frames.push({ time, ...sampleImage(video, canvas, context) });
  }

  const diffs = frames.slice(1).map((frame, index) => ({
    time: frame.time,
    value: frameDifference(frames[index], frame)
  }));
  const cutCandidates = diffs.filter((item) => item.value > 38).map((item) => item.time);
  const motionWarnings = diffs.filter((item) => item.value > 24 && item.value <= 38).map((item) => item.time);
  const brightness = frames.map((frame) => frame.brightness);
  const contrasts = frames.map((frame) => frame.contrast);
  const darkFrames = frames.filter((frame) => frame.brightness < 45 || frame.darkRatio > 0.48).map((frame) => frame.time);
  const brightFrames = frames.filter((frame) => frame.brightness > 215 || frame.brightRatio > 0.38).map((frame) => frame.time);
  const lowContrastFrames = frames.filter((frame) => frame.contrast < 26).map((frame) => frame.time);
  const tiltValues = frames.map((frame) => frame.tilt).filter((value) => value !== null);
  const tiltAverage = average(tiltValues);

  return {
    file,
    duration,
    width: video.videoWidth,
    height: video.videoHeight,
    brightnessAverage: average(brightness),
    contrastAverage: average(contrasts),
    darkFrames,
    brightFrames,
    lowContrastFrames,
    cutCandidates,
    motionWarnings,
    cutRate: duration ? cutCandidates.length / (duration / 60) : 0,
    motionRate: duration ? motionWarnings.length / (duration / 60) : 0,
    tiltAverage,
    tiltMeasured: tiltValues.length
  };
}

async function analyzeAudio(file) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return { supported: false, reason: "Web Audio API wird in diesem Browser nicht unterstützt." };
  }

  try {
    const audioContext = new AudioContextClass();
    const audioBuffer = await audioContext.decodeAudioData(await file.arrayBuffer());
    await audioContext.close?.();
    const channel = audioBuffer.getChannelData(0);
    const windowSize = Math.max(1024, Math.round(audioBuffer.sampleRate * 0.25));
    const rmsValues = [];
    let clipped = 0;

    for (let start = 0; start < channel.length; start += windowSize) {
      let sum = 0;
      let samples = 0;
      for (let index = start; index < Math.min(start + windowSize, channel.length); index += 1) {
        const sample = channel[index];
        sum += sample * sample;
        samples += 1;
        if (Math.abs(sample) > 0.98) clipped += 1;
      }
      const rms = Math.sqrt(sum / Math.max(samples, 1));
      rmsValues.push(20 * Math.log10(Math.max(rms, 0.00001)));
    }

    const audible = rmsValues.filter((value) => value > -45);
    return {
      supported: true,
      channels: audioBuffer.numberOfChannels,
      duration: audioBuffer.duration,
      averageDb: average(audible.length ? audible : rmsValues),
      peakDb: Math.max(...rmsValues),
      silenceRatio: rmsValues.filter((value) => value < -45).length / Math.max(rmsValues.length, 1),
      clippingRatio: clipped / Math.max(channel.length, 1)
    };
  } catch (error) {
    return { supported: false, reason: "Tonspur konnte aus dieser MP4 im Browser nicht decodiert werden." };
  }
}

function renderAnalysis(frameData, audioData) {
  if (!analysisResults) return;

  const ratio = frameData.width && frameData.height ? frameData.width / frameData.height : 0;
  const durationOk = frameData.duration >= 240 && frameData.duration <= 360;
  const landscapeOk = ratio > 1.2;
  const lightWarnings = [...frameData.darkFrames, ...frameData.brightFrames];
  const emptyWarnings = frameData.lowContrastFrames;
  const tiltStatus = frameData.tiltMeasured < 3 ? "unknown" : frameData.tiltAverage <= 5 ? "pass" : "warn";
  const audioStatus = !audioData.supported ? "unknown"
    : audioData.peakDb < -28 || audioData.silenceRatio > 0.55 || audioData.clippingRatio > 0.002 ? "warn" : "pass";

  analysisResults.innerHTML = [
    resultCard(
      "Exportformat und Laufzeit",
      selectedIsMp4 && durationOk ? "pass" : "warn",
      `${formatTime(frameData.duration)} · ${formatBytes(frameData.file.size)}`,
      selectedIsMp4 ? "MP4 erkannt; Laufzeit wird technisch aus den Videometadaten geprüft." : "Datei ist nicht eindeutig als MP4 erkennbar."
    ),
    resultCard(
      "Querformat und Auflösung",
      landscapeOk ? "pass" : "warn",
      `${frameData.width} x ${frameData.height}px · Verhältnis ${ratio.toFixed(2)}`,
      landscapeOk ? "Querformat erkannt." : "Die Datei wirkt hochkant oder quadratisch; für Handyaufnahmen Querformat verlangen."
    ),
    resultCard(
      "Tonpegel, Stille und Übersteuerung",
      audioStatus,
      audioData.supported ? `Ø ${audioData.averageDb.toFixed(1)} dB · Stille ${(audioData.silenceRatio * 100).toFixed(0)}% · Clipping ${(audioData.clippingRatio * 100).toFixed(2)}%` : "nicht messbar",
      audioData.supported ? "Web Audio misst Lautheit, längere Stille und Übersteuerungen. Eine Ton-Bild-Schere im Sinn von falschem Inhalt braucht Transkript/Objekterkennung." : audioData.reason
    ),
    resultCard(
      "Licht und Belichtung",
      lightWarnings.length ? "warn" : "pass",
      `Helligkeit Ø ${frameData.brightnessAverage.toFixed(0)} / 255`,
      lightWarnings.length ? "Einzelne Frames wirken sehr dunkel oder sehr hell; bitte an den markierten Stellen prüfen." : "Keine auffällige Unter- oder Überbelichtung in den Stichproben.",
      lightWarnings
    ),
    resultCard(
      "Bildkomposition und Rahmenfüllung",
      emptyWarnings.length ? "warn" : "pass",
      `Kontrast Ø ${frameData.contrastAverage.toFixed(0)}`,
      emptyWarnings.length ? "Sehr kontrastarme Frames können auf leere Flächen, Nebel/Gegenlicht oder schlecht gefüllte Bilder hinweisen." : "Die Stichproben zeigen genügend visuelle Struktur.",
      emptyWarnings
    ),
    resultCard(
      "Kamera gerade halten",
      tiltStatus,
      frameData.tiltMeasured ? `Kantenabweichung Ø ${frameData.tiltAverage.toFixed(1)}°` : "zu wenige Kanten",
      frameData.tiltMeasured < 3 ? "Der Browser fand zu wenige klare horizontale/vertikale Linien für eine technische Aussage." : "Aus dominanten Bildkanten wird grob geschätzt, ob die Kamera kippt."
    ),
    resultCard(
      "Schnitte und harte Anschlusswechsel",
      frameData.cutRate > 8 ? "warn" : "pass",
      `${frameData.cutCandidates.length} harte Wechsel · ${frameData.cutRate.toFixed(1)}/Min.`,
      frameData.cutCandidates.length ? "Hohe Frame-Differenzen markieren mögliche harte Schnitte, Achsensprünge oder Sprunganschlüsse." : "Keine auffällig harten visuellen Wechsel in den Stichproben.",
      frameData.cutCandidates
    ),
    resultCard(
      "Kamerabewegung und Umfilmen",
      frameData.motionRate > 10 ? "warn" : "pass",
      `${frameData.motionWarnings.length} Bewegungswarnungen · ${frameData.motionRate.toFixed(1)}/Min.`,
      frameData.motionWarnings.length ? "Starke Bildänderungen ohne klaren Schnitt können auf Schwenks, Umfilmen oder Verwacklung hindeuten." : "Keine auffällige Häufung starker Bewegungswechsel in den Stichproben.",
      frameData.motionWarnings
    )
  ].join("");
}

async function runTechnicalAnalysis() {
  if (!selectedFile || !analysisStatus || !runAnalysis) return;
  runAnalysis.disabled = true;
  analysisStatus.textContent = "Analysiere Video: Metadaten, Frames und Tonspur...";
  analysisResults.innerHTML = "";

  try {
    const [frameData, audioData] = await Promise.all([
      analyzeFrames(selectedFile),
      analyzeAudio(selectedFile)
    ]);
    renderAnalysis(frameData, audioData);
    analysisStatus.textContent = "Technische Analyse abgeschlossen. Zeitmarken springen direkt zur verdächtigen Stelle im Video.";
  } catch (error) {
    analysisStatus.textContent = `Analyse fehlgeschlagen: ${error.message}`;
  } finally {
    runAnalysis.disabled = false;
  }
}

mp4Upload?.addEventListener("change", () => {
  const file = mp4Upload.files?.[0];
  if (!file || !uploadPreview || !uploadMeta) return;

  if (uploadObjectUrl) URL.revokeObjectURL(uploadObjectUrl);
  uploadObjectUrl = URL.createObjectURL(file);
  uploadPreview.src = uploadObjectUrl;
  uploadPreview.hidden = false;
  uploadPlaceholder.hidden = true;

  const isMp4 = file.type === "video/mp4" || file.name.toLowerCase().endsWith(".mp4");
  selectedFile = file;
  selectedIsMp4 = isMp4;
  uploadMeta.innerHTML = `
    <div><dt>Datei</dt><dd>${escapeHtml(file.name)}</dd></div>
    <div><dt>Typ</dt><dd>${isMp4 ? "MP4 erkannt" : escapeHtml(file.type || "unbekannt")}</dd></div>
    <div><dt>Größe</dt><dd>${formatBytes(file.size)}</dd></div>
  `;
  autoChecks.innerHTML = "<p>Metadaten werden gelesen...</p>";
  analysisResults.innerHTML = "";
  analysisStatus.textContent = "Bereit für technische Analyse.";
  runAnalysis.disabled = false;
  if (uploadPreview.readyState >= 1) {
    renderAutoChecks(file, isMp4);
  } else {
    uploadPreview.addEventListener("loadedmetadata", () => renderAutoChecks(file, isMp4), { once: true });
  }
});

runAnalysis?.addEventListener("click", runTechnicalAnalysis);

analysisResults?.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-jump]");
  if (!button || !uploadPreview) return;
  uploadPreview.currentTime = Number(button.dataset.jump);
  uploadPreview.play().catch(() => {});
});
