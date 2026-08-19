import {
  SYSTEMIC_LABELS,
  SYSTEMIC_COLORS,
  formatScaleValue,
  systemicBarDisplayValue,
  WORK_PROFILE_ROWS,
  RADAR_SCALE_ORDER,
  SCALE_LABELS,
  SCALE_TABLE_ORDER,
  interpretScaleValue,
} from "/js/psychotypes.js";

const SYSTEMIC_DISPLAY_MAX = 30;

function buildSystemicBars(systemic, root) {
  const barsRoot = root.querySelector("[data-analytics-systemic-bars]");
  if (!barsRoot) {
    return;
  }
  barsRoot.replaceChildren();

  for (const [index, key] of Object.keys(SYSTEMIC_LABELS).entries()) {
    const raw = Number(systemic[key] ?? 0);
    const display = systemicBarDisplayValue(raw);
    const barTarget = `${Math.max(0, Math.min(100, (display / SYSTEMIC_DISPLAY_MAX) * 100))}%`;
    const colors = SYSTEMIC_COLORS[key];

    const row = document.createElement("div");
    row.className = "systemic-row";
    row.style.setProperty("--systemic-row-delay", `${80 + index * 70}ms`);
    row.style.setProperty("--systemic-bar-target", barTarget);
    row.style.setProperty("--systemic-fill-from", colors.from);
    row.style.setProperty("--systemic-fill-to", colors.to);
    row.style.setProperty("--systemic-value-color", colors.value);

    const label = document.createElement("span");
    label.className = "systemic-label";
    label.textContent = SYSTEMIC_LABELS[key];

    const track = document.createElement("span");
    track.className = "systemic-track";
    track.setAttribute("aria-hidden", "true");
    const fill = document.createElement("span");
    fill.className = "systemic-fill";
    track.appendChild(fill);

    const value = document.createElement("span");
    value.className = "systemic-value";
    value.textContent = formatScaleValue(display);

    row.append(label, track, value);
    barsRoot.appendChild(row);
  }

  const systemicCard = root.querySelector("[data-analytics-systemic]");
  systemicCard?.classList.add("chart-card--in-view");
}

function renderThresholdWarnings(warnings, root) {
  const aside = root.querySelector("[data-analytics-threshold-warnings]");
  const list = root.querySelector("[data-analytics-threshold-warnings-list]");
  if (!aside || !list) {
    return;
  }

  list.replaceChildren();
  const items = Array.isArray(warnings)
    ? warnings.filter((item) => typeof item === "string" && item.trim())
    : [];

  aside.hidden = items.length === 0;
  for (const text of items) {
    const item = document.createElement("li");
    item.textContent = text;
    list.appendChild(item);
  }
}

function buildWorkProfile(systemic, root) {
  const section = root.querySelector("[data-analytics-work-profile]");
  const grid = root.querySelector("[data-analytics-work-profile-grid]");
  if (!section || !grid) {
    return;
  }

  grid.replaceChildren();
  const hasData = WORK_PROFILE_ROWS.some(
    (rowDef) => systemic[rowDef.labKey] != null || systemic[rowDef.rigKey] != null,
  );

  for (const [index, rowDef] of WORK_PROFILE_ROWS.entries()) {
    const lab = Number(systemic[rowDef.labKey] ?? 0);
    const rig = Number(systemic[rowDef.rigKey] ?? 0);
    const labDominant = lab >= rig;
    const dominantValue = labDominant ? lab : rig;
    const display = Math.round(dominantValue * 5);
    const barTarget = `${Math.max(0, Math.min(100, (display / 30) * 100))}%`;
    const sideLabel = labDominant ? rowDef.labLabel : rowDef.rigLabel;
    const sideCode = labDominant ? "LAB" : "RIG";

    const row = document.createElement("div");
    row.className = "work-profile-row";
    row.style.setProperty("--work-profile-row-delay", `${80 + index * 60}ms`);
    row.style.setProperty("--work-profile-bar-target", barTarget);

    const label = document.createElement("span");
    label.className = "work-profile-label";
    label.textContent = sideLabel;

    const meta = document.createElement("span");
    meta.className = "work-profile-meta";
    meta.textContent = sideCode;

    const track = document.createElement("span");
    track.className = "work-profile-track";
    track.setAttribute("aria-hidden", "true");
    const fill = document.createElement("span");
    fill.className = "work-profile-fill";
    track.appendChild(fill);

    const value = document.createElement("span");
    value.className = "work-profile-value";
    value.textContent = formatScaleValue(display);

    row.append(label, meta, track, value);
    grid.appendChild(row);
  }

  section.hidden = !hasData;
  if (hasData) {
    section.classList.add("motion-reveal", "is-visible");
  }
}

function renderCorrespondence(result, root) {
  const section = root.querySelector("[data-analytics-correspondence]");
  const meta = root.querySelector("[data-analytics-correspondence-meta]");
  const typeEl = root.querySelector("[data-analytics-correspondence-type]");
  const coachingList = root.querySelector("[data-analytics-coaching]");
  if (!section || !meta || !typeEl || !coachingList) {
    return;
  }

  const systemic = result.scaled_systemic || {};
  if (systemic.delta_LAB == null && systemic.delta_RIG == null) {
    section.hidden = true;
    return;
  }

  const deltaLab = Number(systemic.delta_LAB ?? 0);
  const deltaRig = Number(systemic.delta_RIG ?? 0);
  const labWork = Number(systemic.LAB_work ?? 0);
  const rigWork = Number(systemic.RIG_work ?? 0);
  const labPers = Number(result.scaled_scores?.lability ?? 0);
  const rigPers = Number(result.scaled_scores?.rigidity ?? 0);

  meta.innerHTML = `
    <dt>LAB (личность / работа)</dt><dd>${labPers} / ${labWork}</dd>
    <dt>RIG (личность / работа)</dt><dd>${rigPers} / ${rigWork}</dd>
    <dt>ΔLAB</dt><dd>${deltaLab > 0 ? "+" : ""}${deltaLab}</dd>
    <dt>ΔRIG</dt><dd>${deltaRig > 0 ? "+" : ""}${deltaRig}</dd>
  `;

  if (systemic.tension_zone) {
    typeEl.textContent =
      systemic.correspondence_type ||
      "Выявлена зона напряжения между личным и рабочим профилем";
    typeEl.className = "correspondence-type correspondence-type--tension";
  } else {
    typeEl.textContent = systemic.correspondence_type || "Соответствие";
    typeEl.className = "correspondence-type";
  }

  section.hidden = false;
  section.classList.add("motion-reveal", "is-visible");

  coachingList.replaceChildren();
  const coaching = Array.isArray(result.coaching_recommendations)
    ? result.coaching_recommendations.filter(
        (item) => typeof item === "string" && item.trim(),
      )
    : [];

  coachingList.hidden = coaching.length === 0;
  for (const text of coaching) {
    const item = document.createElement("li");
    item.textContent = text;
    coachingList.appendChild(item);
  }
}

function renderLeaderScores(leaderScores, root) {
  const section = root.querySelector("[data-analytics-leader]");
  const list = root.querySelector("[data-analytics-leader-scores]");
  if (!section || !list) {
    return;
  }

  list.replaceChildren();
  const items = Array.isArray(leaderScores) ? leaderScores : [];

  if (!items.length) {
    section.hidden = true;
    return;
  }

  for (const item of items) {
    const row = document.createElement("li");
    row.className = item.is_leader
      ? "leader-scores__item leader-scores__item--active"
      : "leader-scores__item";
    const score = Math.round(Number(item.score ?? 0));
    row.innerHTML = `<span class="leader-scores__label">${item.label || item.code}</span><span class="leader-scores__score">${score}${item.is_leader ? " · лидер" : ""}</span>`;
    list.appendChild(row);
  }

  section.hidden = false;
  section.classList.add("motion-reveal", "is-visible");
}

let _radarChart = null;

function buildRadarChart(scores, root) {
  const canvas = root.querySelector("[data-analytics-radar]");
  const avgEl = root.querySelector("[data-analytics-radar-average]");
  if (!canvas) return;

  const labels = RADAR_SCALE_ORDER.map((key) => SCALE_LABELS[key]);
  const values = RADAR_SCALE_ORDER.map((key) => Math.round(Number(scores[key] ?? 0)));
  const avg = Math.round(values.reduce((s, v) => s + v, 0) / values.length);

  if (avgEl) {
    avgEl.textContent = `Среднее по 8 шкалам: ${avg} (${interpretScaleValue(avg)})`;
  }

  if (_radarChart) {
    _radarChart.destroy();
    _radarChart = null;
  }

  _radarChart = new Chart(canvas, {
    type: "radar",
    data: {
      labels,
      datasets: [
        {
          label: "Профиль",
          data: values,
          borderColor: "#1a54d8",
          backgroundColor: "rgba(26, 84, 216, 0.22)",
          borderWidth: 2,
          pointRadius: 3,
          order: 1,
        },
        {
          label: `Среднее (${avg})`,
          data: labels.map(() => avg),
          borderColor: "#5b8df7",
          borderDash: [8, 5],
          borderWidth: 2,
          backgroundColor: "transparent",
          pointRadius: 0,
          fill: false,
          order: 2,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        r: { min: 0, max: 30, ticks: { display: false, stepSize: 6 }, pointLabels: { font: { size: 12 } } },
      },
      plugins: { legend: { position: "bottom" } },
    },
  });
}

function buildScaleTable(scores, root) {
  const tbody = root.querySelector("[data-analytics-scale-table]");
  if (!tbody) return;
  tbody.replaceChildren();

  for (const key of SCALE_TABLE_ORDER) {
    const row = document.createElement("tr");
    const th = document.createElement("th");
    th.scope = "row";
    th.textContent = (SCALE_LABELS[key] || key).toLowerCase();
    const td = document.createElement("td");
    td.textContent = formatScaleValue(scores[key]);
    row.append(th, td);
    tbody.appendChild(row);
  }
}

export function renderResultAnalytics(result, root) {
  if (!root || !result) {
    return;
  }

  const scores = result.scaled_scores || {};
  const systemic = result.scaled_systemic || {};

  buildRadarChart(scores, root);
  buildScaleTable(scores, root);
  buildSystemicBars(systemic, root);
  renderThresholdWarnings(result.warnings, root);
  buildWorkProfile(systemic, root);
  renderCorrespondence(result, root);
  renderLeaderScores(result.leader_scores, root);

  root.classList.add("result-loaded");
}

export const RESULT_ANALYTICS_HTML = `
  <div class="chart-card chart-card--radar">
    <h2>8 шкал личности</h2>
    <p data-analytics-radar-average class="muted" style="margin:0 0 12px"></p>
    <div class="radar-chart-layout">
      <div class="radar-chart-panel">
        <canvas data-analytics-radar height="360"></canvas>
      </div>
      <table class="scale-table" aria-label="Значения 8 шкал личности">
        <tbody data-analytics-scale-table></tbody>
      </table>
    </div>
  </div>
  <div class="chart-card chart-card--systemic" data-analytics-systemic>
    <h2>5 системных свойств</h2>
    <p class="muted systemic-scale-note">Шкала 0–30 (сумма LAB+RIG по подшкале, как в ТЗ)</p>
    <div class="systemic-layout">
      <div data-analytics-systemic-bars class="systemic-bars" aria-label="5 системных свойств"></div>
      <aside
        data-analytics-threshold-warnings
        class="threshold-warnings"
        hidden
        aria-label="Предупреждения"
      >
        <ul data-analytics-threshold-warnings-list class="threshold-warnings__list"></ul>
      </aside>
    </div>
  </div>
  <section data-analytics-work-profile class="chart-card work-profile-card" hidden>
    <h2>Рабочий профиль</h2>
    <p class="muted">Доминантная сторона по каждой из 5 подшкал (LAB / RIG, 0–6 → 0–30)</p>
    <div data-analytics-work-profile-grid class="work-profile-grid" aria-label="Рабочий профиль"></div>
  </section>
  <section data-analytics-correspondence class="chart-card correspondence-card" hidden>
    <h2>Анализ соответствия личности и работы</h2>
    <dl class="correspondence-meta" data-analytics-correspondence-meta></dl>
    <p data-analytics-correspondence-type class="correspondence-type"></p>
    <ul data-analytics-coaching class="coaching-recommendations" hidden></ul>
  </section>
  <section data-analytics-leader class="chart-card leader-card" hidden>
    <h2>Лидерский потенциал</h2>
    <p class="muted">4 типа по формулам ТЗ §3.5 (порог 21 из 30)</p>
    <ul data-analytics-leader-scores class="leader-scores" aria-label="Типы лидерства"></ul>
  </section>
`;
