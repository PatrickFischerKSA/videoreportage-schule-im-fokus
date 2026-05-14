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
const reviewChecklist = document.querySelector("#review-checklist");
const reviewSummary = document.querySelector("#review-summary");
let uploadObjectUrl = "";
let hasUpload = false;
const reviewCriteria = [
  {
    id: "axis",
    title: "Kein Achsensprung",
    help: "Blickrichtungen, Bewegungen und Raumlogik bleiben von Shot zu Shot nachvollziehbar."
  },
  {
    id: "audio-picture",
    title: "Keine Ton-Bild-Schere",
    help: "Gesagtes, Geräusche, Musik und Bild widersprechen sich nicht unbeabsichtigt."
  },
  {
    id: "audio",
    title: "Ton ist verständlich",
    help: "Stimmen sind klar hörbar, Nebengeräusche stören nicht, Musik überdeckt keine Aussagen."
  },
  {
    id: "cuts",
    title: "Schnitte stimmen",
    help: "Übergänge sind sauber, rhythmisch und inhaltlich verständlich."
  },
  {
    id: "camera",
    title: "Kamera ruhig, gerade und bewusst bewegt",
    help: "Die Kamera ist gerade; beim Umfilmen einer Person wird kontrolliert mitgedreht."
  },
  {
    id: "landscape",
    title: "Querformat auf Handy",
    help: "Der Film ist im Querformat angelegt und nutzt den Bildraum sinnvoll."
  },
  {
    id: "light",
    title: "Licht und goldene Stunde",
    help: "Gesichter sind sichtbar, Gegenlicht ist kontrolliert, schönes Licht wird bewusst genutzt."
  },
  {
    id: "composition",
    title: "Bildkomposition mit Tiefe",
    help: "Vordergrund, Hintergrund, Rahmen und Bildfüllung erzeugen Tiefe statt leerer Flächen."
  },
  {
    id: "shots",
    title: "Shots passen zur Szene",
    help: "Personen, Objekte, Einstellungsgrößen und Anschlussbilder unterstützen die Aussage."
  },
  {
    id: "credits",
    title: "Titel, Abspann und Quellen sind vorhanden",
    help: "Titel, Abspann sowie fremdes Bild-, Ton- oder Musikmaterial sind am Ende klar ausgewiesen."
  }
];
let reviewState = new Map();

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

function renderReviewChecklist() {
  if (!reviewChecklist || !reviewSummary) return;

  reviewChecklist.innerHTML = reviewCriteria.map((criterion) => {
    const state = reviewState.get(criterion.id) ?? {};
    const status = state.status ?? "open";
    const time = state.time;
    const statusLabel = status === "pass" ? "erfüllt" : status === "problem" ? "Problem" : "offen";
    return `
      <article class="review-item ${status}" data-review-item="${criterion.id}">
        <div>
          <span>${statusLabel}</span>
          <h4>${criterion.title}</h4>
          <p>${criterion.help}</p>
          <small>${time === undefined ? "Keine Zeitmarke gesetzt" : `Zeitmarke: ${formatTime(time)}`}</small>
        </div>
        <div class="review-actions">
          <button type="button" data-review="${criterion.id}" data-status="pass"${hasUpload ? "" : " disabled"}>Erfüllt</button>
          <button type="button" data-review="${criterion.id}" data-status="problem"${hasUpload ? "" : " disabled"}>Problem</button>
          <button type="button" data-review="${criterion.id}" data-time="current"${hasUpload ? "" : " disabled"}>Zeitmarke</button>
        </div>
      </article>
    `;
  }).join("");

  if (!hasUpload) {
    reviewSummary.textContent = "Noch kein Video ausgewählt.";
    return;
  }

  const checked = [...reviewState.values()].filter((item) => item.status === "pass" || item.status === "problem").length;
  const problems = [...reviewState.values()].filter((item) => item.status === "problem").length;
  reviewSummary.textContent = `${checked}/${reviewCriteria.length} Kriterien geprüft${problems ? `, ${problems} Problemstelle(n) markiert` : ""}.`;
}

function resetReview() {
  reviewState = new Map(reviewCriteria.map((criterion) => [criterion.id, { status: "open" }]));
  renderReviewChecklist();
}

mp4Upload?.addEventListener("change", () => {
  const file = mp4Upload.files?.[0];
  if (!file || !uploadPreview || !uploadMeta) return;

  if (uploadObjectUrl) URL.revokeObjectURL(uploadObjectUrl);
  uploadObjectUrl = URL.createObjectURL(file);
  uploadPreview.src = uploadObjectUrl;
  uploadPreview.hidden = false;
  uploadPlaceholder.hidden = true;
  hasUpload = true;

  const isMp4 = file.type === "video/mp4" || file.name.toLowerCase().endsWith(".mp4");
  uploadMeta.innerHTML = `
    <div><dt>Datei</dt><dd>${escapeHtml(file.name)}</dd></div>
    <div><dt>Typ</dt><dd>${isMp4 ? "MP4 erkannt" : file.type || "unbekannt"}</dd></div>
    <div><dt>Größe</dt><dd>${formatBytes(file.size)}</dd></div>
  `;
  resetReview();
  autoChecks.innerHTML = "<p>Metadaten werden gelesen...</p>";
  uploadPreview.addEventListener("loadedmetadata", () => renderAutoChecks(file, isMp4), { once: true });
});

reviewChecklist?.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-review]");
  if (!button || !uploadPreview) return;

  const id = button.dataset.review;
  const current = reviewState.get(id) ?? { status: "open" };
  if (button.dataset.time === "current") {
    current.time = uploadPreview.currentTime;
  }
  if (button.dataset.status) {
    current.status = button.dataset.status;
    current.time = uploadPreview.currentTime;
  }
  reviewState.set(id, current);
  renderReviewChecklist();
});

resetReview();
