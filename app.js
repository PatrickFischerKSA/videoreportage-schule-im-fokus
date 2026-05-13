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
let uploadObjectUrl = "";

function formatBytes(bytes = 0) {
  if (!bytes) return "0 MB";
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
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
  uploadMeta.innerHTML = `
    <div><dt>Datei</dt><dd>${file.name}</dd></div>
    <div><dt>Typ</dt><dd>${isMp4 ? "MP4 erkannt" : file.type || "unbekannt"}</dd></div>
    <div><dt>Größe</dt><dd>${formatBytes(file.size)}</dd></div>
  `;
});
