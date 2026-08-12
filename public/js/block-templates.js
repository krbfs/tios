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

export function shouldRenderAsCardBlock(block) {
  return (
    block.block_template === "card_block" || block.block_key === "efficiency_map"
  );
}

export function renderBlockBody(block) {
  if (shouldRenderAsCardBlock(block)) {
    return createEfficiencyCardBlock(block.content_text);
  }

  if (block.block_template === "list_block") {
    const list = document.createElement("ul");
    list.className = "content-list";
    block.content_text
      .split(/—|-\s/)
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((item) => {
        const li = document.createElement("li");
        li.textContent = item.replace(/^—\s*/, "");
        list.appendChild(li);
      });
    return list;
  }

  const text = document.createElement("div");
  text.textContent = block.content_text;
  return text;
}
