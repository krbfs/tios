/**
 * Reusable content block templates for results page.
 */

export function parseEfficiencyMap(contentText) {
  const text = contentText.trim();
  const match = text.match(
    /Пик эффективности:\s*(.*?)\s*Зона провала:\s*(.*)$/is,
  );

  if (match) {
    return {
      peak: match[1].trim(),
      failure: match[2].trim(),
    };
  }

  const parts = text.split(/Зона провала:/i);
  if (parts.length === 2) {
    return {
      peak: parts[0].replace(/^Пик эффективности:\s*/i, "").trim(),
      failure: parts[1].trim(),
    };
  }

  return { peak: text, failure: "" };
}

export function createEfficiencyCardBlock(contentText) {
  const { peak, failure } = parseEfficiencyMap(contentText);
  const grid = document.createElement("div");
  grid.className = "efficiency-cards";

  grid.appendChild(createEfficiencyCard("peak", "Пик эффективности", peak));
  grid.appendChild(
    createEfficiencyCard("failure", "Зона провала", failure || "—"),
  );

  return grid;
}

function createEfficiencyCard(variant, heading, text) {
  const card = document.createElement("section");
  card.className = `efficiency-card efficiency-card--${variant}`;

  const title = document.createElement("h3");
  title.className = "efficiency-card-title";
  title.textContent = heading;

  const body = document.createElement("p");
  body.className = "efficiency-card-text";
  body.textContent = text;

  card.append(title, body);
  return card;
}

function createListBlock(items) {
  const list = document.createElement("ul");
  list.className = "content-list";
  for (const item of items) {
    const li = document.createElement("li");
    li.textContent = item;
    list.appendChild(li);
  }
  return list;
}

/**
 * Parses bullet-like content:
 * - "— one.— two.— three."
 * - "– one.\n– two.\n– three."
 */
export function parseDashListItems(contentText) {
  const text = contentText.trim();
  if (!text || !/^[—–-]/.test(text)) {
    return null;
  }

  if (text.includes("\n")) {
    const items = text
      .split(/\n+/)
      .map((line) => line.replace(/^[—–-]\s*/, "").trim())
      .filter(Boolean);
    return items.length >= 2 ? items : null;
  }

  if (/\.\s*[—–-]/.test(text)) {
    const items = text
      .split(/\.\s*[—–-]\s*/)
      .map((item) => item.replace(/^[—–-]\s*/, "").trim())
      .filter(Boolean);
    return items.length >= 2 ? items : null;
  }

  return null;
}

const LABELED_SECTION_NAMES = [
  "Возможности",
  "Ограничения",
  "Идеальный партнер",
  "Пополнение",
  "Рациональное использование",
  "Профессионально",
  "Личностно",
];

/**
 * Parses inline sections like:
 * "Возможности: … . Ограничения: … . Идеальный партнер: …"
 */
export function parseLabeledSections(contentText) {
  const text = contentText.trim();
  const labelPattern = new RegExp(
    `(?:^|\\s)((${LABELED_SECTION_NAMES.join("|")}):)\\s*`,
    "g",
  );

  if (!labelPattern.test(text)) {
    return null;
  }

  labelPattern.lastIndex = 0;
  const sections = [];
  let currentLabel = null;
  let lastIndex = 0;
  let match;

  while ((match = labelPattern.exec(text)) !== null) {
    if (currentLabel) {
      sections.push({
        label: currentLabel,
        text: text.slice(lastIndex, match.index).trim(),
      });
    }
    currentLabel = match[1];
    lastIndex = labelPattern.lastIndex;
  }

  if (currentLabel) {
    sections.push({
      label: currentLabel,
      text: text.slice(lastIndex).trim(),
    });
  }

  return sections.length >= 2 ? sections : null;
}

function createLabeledSectionsBlock(sections) {
  const wrapper = document.createElement("div");
  wrapper.className = "content-sections";

  for (const section of sections) {
    const paragraph = document.createElement("p");
    paragraph.className = "content-section";

    const label = document.createElement("strong");
    label.textContent = section.label;

    paragraph.append(label, ` ${section.text}`);
    wrapper.appendChild(paragraph);
  }

  return wrapper;
}

function createAccordionBlock(title, contentText) {
  const details = document.createElement("details");
  details.className = "content-accordion";
  details.open = false;

  const summary = document.createElement("summary");
  summary.className = "content-accordion-summary";
  summary.textContent = title || "Подробнее";

  const body = document.createElement("div");
  body.className = "content-accordion-body";
  body.textContent = contentText;

  details.append(summary, body);
  return details;
}

function parseTableBlock(contentText) {
  const text = contentText.trim();
  if (!text) {
    return null;
  }

  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed.headers) && Array.isArray(parsed.rows)) {
      return parsed;
    }
  } catch {
    // plain-text table fallback below
  }

  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) {
    return null;
  }

  const delimiter = lines[0].includes("\t")
    ? "\t"
    : lines[0].includes("|")
      ? "|"
      : null;
  if (!delimiter) {
    return null;
  }

  const splitRow = (line) =>
    line
      .split(delimiter)
      .map((cell) => cell.trim())
      .filter((cell, index, arr) => !(delimiter === "|" && index === 0 && cell === ""))
      .filter((cell, index, arr) => !(delimiter === "|" && index === arr.length - 1 && cell === ""));

  const headers = splitRow(lines[0]);
  const rows = lines.slice(1).map(splitRow).filter((row) => row.length > 0);
  if (headers.length < 2 || rows.length === 0) {
    return null;
  }
  return { headers, rows };
}

function createTableBlock(contentText) {
  const parsed = parseTableBlock(contentText);
  if (!parsed) {
    const fallback = document.createElement("div");
    fallback.textContent = contentText;
    return fallback;
  }

  const table = document.createElement("table");
  table.className = "content-table";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  for (const header of parsed.headers) {
    const th = document.createElement("th");
    th.textContent = header;
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  for (const row of parsed.rows) {
    const tr = document.createElement("tr");
    for (const cell of row) {
      const td = document.createElement("td");
      td.textContent = cell;
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);

  const wrap = document.createElement("div");
  wrap.className = "content-table-wrap";
  wrap.appendChild(table);
  return wrap;
}

export function shouldRenderAsCardBlock(block) {
  return (
    block.block_template === "card_block" || block.block_key === "efficiency_map"
  );
}

export function renderBlockBody(block) {
  const contentText = block.content_text.replace(/^\?\s*/, "");

  if (block.block_template === "accordion_block") {
    return createAccordionBlock(block.title, contentText);
  }

  if (block.block_template === "table_block") {
    return createTableBlock(contentText);
  }

  if (block.block_template === "list_block") {
    const dashItems = parseDashListItems(contentText);
    if (dashItems) {
      return createListBlock(dashItems);
    }
    const splitItems = contentText
      .split(/(?=[–—-])/)
      .map((item) => item.replace(/^[–—-]\s*/, "").trim())
      .filter(Boolean);
    if (splitItems.length >= 2) {
      return createListBlock(splitItems);
    }
  }

  if (shouldRenderAsCardBlock(block)) {
    return createEfficiencyCardBlock(contentText);
  }

  const dashItems = parseDashListItems(contentText);
  if (dashItems) {
    return createListBlock(dashItems);
  }

  const labeledSections = parseLabeledSections(contentText);
  if (labeledSections) {
    return createLabeledSectionsBlock(labeledSections);
  }

  const text = document.createElement("div");
  text.textContent = contentText;
  return text;
}
