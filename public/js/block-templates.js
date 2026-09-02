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

const PORTRAIT_LIST_CONTINUATION_START =
  /^(?:могут?|может|если|когда|не|любое|все|это|он|она|они|при|в\s|для|чтобы|так\s|из-за|поскольку|пока|где|кто|что)\b/i;

function isPortraitListHeader(sentence) {
  const body = sentence.replace(/[.!?]+$/, "").trim();
  if (!body || body.length > 70) {
    return false;
  }
  const words = body.split(/\s+/);
  if (words.length > 6) {
    return false;
  }
  if (body.includes(",")) {
    return false;
  }
  if (PORTRAIT_LIST_CONTINUATION_START.test(body)) {
    return false;
  }
  return /^[А-ЯЁ«]/.test(body);
}

/**
 * Portrait list blocks use "Header. Details." paragraphs, not dash bullets.
 * Example: "Поверхностность. Из-за лабильности может быстро переключаться…"
 */
export function parsePortraitListItems(contentText) {
  const sentences =
    contentText.match(/[^.!?]+[.!?]+/g)?.map((part) => part.trim()).filter(Boolean) ??
    [];

  if (sentences.length < 2) {
    return null;
  }

  const items = [];
  let current = sentences[0];

  for (let index = 1; index < sentences.length; index += 1) {
    const sentence = sentences[index];
    if (isPortraitListHeader(sentence)) {
      items.push(current.trim());
      current = sentence;
    } else {
      current += ` ${sentence}`;
    }
  }

  items.push(current.trim());
  return items.length >= 2 ? items : null;
}

function isOrphanListHeader(item) {
  return /^[А-ЯЁ«][а-яёА-ЯЁ«»]{0,25}[.!?]$/.test(item.trim());
}

/**
 * Fallback for list blocks where each sentence is one bullet.
 */
export function parseSentenceListItems(contentText) {
  const items = contentText
    .split(/(?<=[.!?])\s+(?=[А-ЯЁ«])/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (items.length < 2 || items.some(isOrphanListHeader)) {
    return null;
  }

  return items;
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
  "Как пополнять",
  "Как рационально тратить",
  "Пополнение",
  "Рациональное использование",
  "Профессионально",
  "Личностно",
];

const SUBTITLE_LEAK_PATTERNS = [
  /^:\s*как пополнять и рационально тратить:?\s*/i,
  /^:\s*возможности и ограничения\s*/i,
  /^в профессиональном и личностном плане\?\s*/i,
];

/**
 * Fixes docx subtitle leakage and glued section labels in portrait blocks.
 */
export function normalizePortraitContentText(contentText) {
  let text = contentText.replace(/^\?\s*/, "").trim();
  text = text.replace(/^:\s+/, "");

  for (const pattern of SUBTITLE_LEAK_PATTERNS) {
    text = text.replace(pattern, "");
  }

  const labelAlt = LABELED_SECTION_NAMES.join("|");
  text = text.replace(new RegExp(`([а-яё»])(${labelAlt}):`, "g"), "$1 $2:");
  text = text.replace(/([а-яё»])(Конкретные проявления:)/gi, "$1 $2");
  text = text.replace(/([а-яё»])(Важно:)/gi, "$1 $2");

  return text.trim();
}

const DESCRIPTION_SECTION_SPLIT =
  /(?=\.\s+(?:В общении|В работе|В конфликтах|Конфликт для|В принятии решений|Внешние проявления)(?:\s|:|[-–—]))/i;

const DESCRIPTION_LABEL_RE =
  /^(В общении|В работе|В конфликтах|Конфликт для(?: него)?|В принятии решений|Внешние проявления)\s*(?::|[-–—]\s*)?\s*(.*)$/is;

const STRESS_MANIFESTATION_SPLIT =
  /(?<=\.)\s+(?=(?:При|Если|В\s+(?:ситуации|конфликте|личных|стрессе)|Под\s|Когда)\b)/i;

function createParagraphsBlock(items) {
  const wrapper = document.createElement("div");
  wrapper.className = "content-paragraphs";

  for (const item of items) {
    if (item.lead) {
      const lead = document.createElement("p");
      lead.className = "content-section-lead";
      const strong = document.createElement("strong");
      strong.textContent = item.lead;
      lead.appendChild(strong);
      wrapper.appendChild(lead);
      continue;
    }

    const paragraph = document.createElement("p");
    paragraph.className = item.label ? "content-section" : "content-paragraph";

    if (item.label) {
      const label = document.createElement("strong");
      const labelText = item.label.endsWith(":") ? item.label : `${item.label}:`;
      label.textContent = labelText;
      paragraph.append(label, ` ${item.text}`);
    } else {
      paragraph.textContent = item.text;
    }

    wrapper.appendChild(paragraph);
  }

  return wrapper;
}

function parseDescriptionMainParagraphs(contentText) {
  const text = contentText.trim();
  const parts = text
    .split(DESCRIPTION_SECTION_SPLIT)
    .map((part) => part.replace(/^\.\s*/, "").trim())
    .filter(Boolean);

  if (parts.length < 2) {
    return null;
  }

  return parts.map((part) => {
    const match = part.match(DESCRIPTION_LABEL_RE);
    if (!match) {
      return { text: part };
    }

    const label = match[1].trim();
    const body = match[2].trim();
    return body ? { label, text: body } : { label, text: "" };
  });
}

function parseStressBehaviorParagraphs(contentText) {
  const text = contentText.trim();
  const concreteParts = text.split(/Конкретные проявления:\s*/i);
  if (concreteParts.length < 2) {
    return null;
  }

  const items = [];
  const lead = concreteParts[0].trim();
  const leadMatch = lead.match(/^(Доминирующая реакция:)\s*(.*)$/is);

  if (leadMatch) {
    items.push({ label: leadMatch[1].trim(), text: leadMatch[2].trim() });
  } else {
    items.push({ text: lead });
  }

  let manifestations = concreteParts[1].trim();
  let importantText = "";

  const importantParts = manifestations.split(/Важно:\s*/i);
  if (importantParts.length >= 2) {
    manifestations = importantParts[0].trim();
    importantText = importantParts.slice(1).join("Важно: ").trim();
  }

  items.push({ lead: "Конкретные проявления" });

  const manifestationItems = manifestations
    .split(STRESS_MANIFESTATION_SPLIT)
    .map((part) => part.trim())
    .filter(Boolean);

  if (manifestationItems.length >= 2) {
    for (const part of manifestationItems) {
      items.push({ text: part });
    }
  } else if (manifestations) {
    items.push({ text: manifestations });
  }

  if (importantText) {
    items.push({ label: "Важно", text: importantText });
  }

  return items.length >= 2 ? items : null;
}

function parseDecisionChannelParagraphs(contentText) {
  const text = contentText.trim();
  const parts = text.split(/Критерий:\s*/i);
  if (parts.length < 2) {
    return null;
  }

  const items = [];
  const intro = parts[0].trim();
  if (intro) {
    items.push({ text: intro });
  }

  let remainder = parts[1].trim();
  const quotedCriterion = remainder.match(/^(?:«[^»]+»\s*)+/);
  if (quotedCriterion) {
    items.push({ label: "Критерий", text: quotedCriterion[0].trim() });
    remainder = remainder.slice(quotedCriterion[0].length).replace(/^\.\s*/, "").trim();
  } else {
    const firstSentence = remainder.match(/^([^.]+\.)/);
    if (firstSentence) {
      items.push({ label: "Критерий", text: firstSentence[1].trim() });
      remainder = remainder.slice(firstSentence[0].length).trim();
    }
  }

  if (!remainder) {
    return items.length >= 2 ? items : null;
  }

  const tailParts = remainder
    .split(/(?<=\.)\s+(?=Если\b|Примечание:)/i)
    .map((part) => part.trim())
    .filter(Boolean);

  for (const part of tailParts.length ? tailParts : [remainder]) {
    const note = part.match(/^Примечание:\s*(.*)$/is);
    if (note) {
      items.push({ label: "Примечание", text: note[1].trim() });
    } else {
      items.push({ text: part });
    }
  }

  return items.length >= 2 ? items : null;
}

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

/**
 * Moves "Триада N: …" from body into title for legacy rows.
 */
export function resolveTriadBlock(block) {
  const isTriad =
    block.block_key === "triad_addition_left" ||
    block.block_key === "triad_addition_right" ||
    block.triad_variant === "left" ||
    block.triad_variant === "right";

  if (!isTriad) {
    return block;
  }

  if (/^Уточнение:\s*Триада\s+\d+:/i.test(block.title ?? "")) {
    return block;
  }

  const headerMatch = block.content_text?.match(/^Триада\s+\d+:[^\n]*/i);
  if (!headerMatch) {
    return block;
  }

  const header = headerMatch[0].trim();
  const body = block.content_text
    .slice(headerMatch[0].length)
    .replace(/^\n+/, "")
    .trim();

  return {
    ...block,
    title: `Уточнение: ${header}`,
    content_text: body,
  };
}

export function renderBlockBody(block) {
  const contentText = normalizePortraitContentText(block.content_text);

  if (block.block_template === "accordion_block") {
    return createAccordionBlock(block.title, contentText);
  }

  if (block.block_key === "key_formula") {
    const quote = document.createElement("p");
    quote.className = "key-formula-quote";
    quote.textContent = contentText;
    return quote;
  }

  if (block.block_key === "description_main") {
    const paragraphs = parseDescriptionMainParagraphs(contentText);
    if (paragraphs) {
      return createParagraphsBlock(paragraphs);
    }
  }

  if (block.block_key === "stress_behavior") {
    const paragraphs = parseStressBehaviorParagraphs(contentText);
    if (paragraphs) {
      return createParagraphsBlock(paragraphs);
    }
  }

  if (block.block_key === "decision_making_channel") {
    const paragraphs = parseDecisionChannelParagraphs(contentText);
    if (paragraphs) {
      return createParagraphsBlock(paragraphs);
    }
  }

  if (block.block_template === "table_block") {
    return createTableBlock(contentText);
  }

  if (block.block_template === "list_block") {
    const dashItems = parseDashListItems(contentText);
    if (dashItems) {
      return createListBlock(dashItems);
    }
    const portraitItems = parsePortraitListItems(contentText);
    if (portraitItems) {
      return createListBlock(portraitItems);
    }
    const sentenceItems = parseSentenceListItems(contentText);
    if (sentenceItems) {
      return createListBlock(sentenceItems);
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
