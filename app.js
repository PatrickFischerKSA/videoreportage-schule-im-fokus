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
