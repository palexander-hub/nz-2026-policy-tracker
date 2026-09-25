const state = {
  data: null,
  watch: null,
  activeParty: "all",
  activeTopic: ""
};

const ACTIVE_ELECTION_YEAR = 2026;
const PARTY_ORDER = ["all", "national", "labour", "act", "nz-first", "green", "te-pati-maori", "top"];

const TOPIC_COPY = {
  "Tax & Economy": {
    label: "Economy & costs",
    icon: "piggy",
    note: "Household costs, jobs, incomes, business, savings, trade, public spending and economic management.",
    question: "What would each party change about living costs, jobs, incomes, business or the wider economy?"
  },
  "Tax": {
    label: "Tax",
    icon: "receipt",
    note: "Income, company, capital, consumption and other tax settings.",
    question: "What taxes would each party introduce, remove or change?"
  },
  "Health": {
    label: "Health",
    icon: "heart",
    note: "Primary care, screening, medicines, workforce, hospitals, disability support and public health.",
    question: "What would change for health care, medicines, disability support and frontline services?"
  },
  "Housing": {
    label: "Housing",
    icon: "home",
    note: "Home ownership, renting, social housing, housing supply and retirement villages.",
    question: "What would each party change about housing supply, affordability, ownership, renting or social housing?"
  },
  "Education": {
    label: "Education",
    icon: "cap",
    note: "Schools, curriculum, tertiary study, apprenticeships, learning support and skills.",
    question: "What would change in classrooms, curriculum, tertiary study or skills training?"
  },
  "Climate & Environment": {
    label: "Environment",
    icon: "leaf",
    note: "Emissions, farming, freshwater, biodiversity, adaptation and energy transition.",
    question: "How would parties handle emissions, farming, freshwater, conservation and adaptation?"
  },
  "Law & Justice": {
    label: "Law & safety",
    icon: "shield",
    note: "Crime, policing, sentencing, courts, prisons, rehabilitation and public safety.",
    question: "What would change for policing, courts, sentencing, prisons and rehabilitation?"
  },
  "Infrastructure": {
    label: "Infrastructure",
    icon: "road",
    note: "Roads, public transport, planning, regional projects and long-term infrastructure investment.",
    question: "What would change in transport, planning, regional projects and infrastructure delivery?"
  },
  "Families & Social Support": {
    label: "Families",
    icon: "users",
    note: "Children, parents, income support, welfare, inclusion, community wellbeing and safeguarding.",
    question: "What support would change for children, parents, whānau and people who need assistance?"
  },
  "Immigration": {
    label: "Immigration",
    icon: "globe",
    note: "Visa rules, residency, citizenship pathways, workforce migration and migrant protections.",
    question: "What would each party change about visas, residency, migration and citizenship?"
  },
  "Public Service": {
    label: "Government",
    icon: "building",
    note: "Democratic rules, political integrity, government structure, public-sector delivery and digital regulation.",
    question: "What would change in elections, political influence, government structure and public-service delivery?"
  },
  "Te Tiriti & Constitution": {
    label: "Te Tiriti & Māori",
    icon: "forum",
    note: "Te Tiriti, rangatiratanga, Māori governance, language, culture and community development.",
    question: "What would change for Te Tiriti, rangatiratanga, Māori governance, language and culture?"
  },
  "Foreign Affairs & Defence": {
    label: "Foreign affairs",
    icon: "plane",
    note: "International relations, defence, military alignment, aid and New Zealand's place in the Pacific and world.",
    question: "What would each party change about foreign policy, defence, international law and overseas aid?"
  }
};

const els = {};

document.addEventListener("DOMContentLoaded", async () => {
  bindElements();
  await loadData();
});

function bindElements() {
  [
    "party-tabs",
    "topic-buttons",
    "policy-total",
    "dataset-date",
    "source-total",
    "active-topic-title",
    "active-topic-note",
    "active-topic-count",
    "policy-summary",
    "party-policy-list",
    "review-count",
    "review-list",
    "source-watch-list"
  ].forEach((id) => {
    els[toCamel(id)] = document.getElementById(id);
  });
}

async function loadData() {
  try {
    const [policiesResponse, watchResponse] = await Promise.all([
      fetch("data/policies.json", { cache: "no-store" }),
      fetch("data/source-watch.json", { cache: "no-store" })
    ]);

    if (!policiesResponse.ok) throw new Error(`Could not load policies.json (${policiesResponse.status})`);

    state.data = await policiesResponse.json();
    state.watch = watchResponse.ok ? await watchResponse.json() : { sources: [] };
    state.activeTopic = state.data.topics[0] || "";

    renderAll();
  } catch (error) {
    els.partyPolicyList.innerHTML = `<article class="empty">Unable to load policy data. ${escapeHtml(error.message)}</article>`;
  }
}

function renderAll() {
  els.policyTotal.textContent = currentPolicies().length;
  els.datasetDate.textContent = formatDate(state.data.metadata.lastUpdated);
  els.sourceTotal.textContent = (state.watch?.sources || []).length;

  renderPartyTabs();
  renderTopicButtons();
  renderPolicyPanel();
  renderSourceLedger();
}

function renderPartyTabs() {
  const parties = [
    { id: "all", name: "All", color: "#ffffff" },
    ...PARTY_ORDER.slice(1).map((id) => getParty(id)).filter(Boolean)
  ];

  els.partyTabs.innerHTML = parties.map((party) => {
    const active = party.id === state.activeParty;
    return `
      <button
        class="party-tab ${active ? "is-active" : ""}"
        type="button"
        data-party="${escapeAttr(party.id)}"
        style="--party:${escapeAttr(party.color)}"
        aria-pressed="${active}"
      >
        ${escapeHtml(shortPartyName(party.name))}
      </button>
    `;
  }).join("");

  els.partyTabs.querySelectorAll("[data-party]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeParty = button.dataset.party;
      renderPartyTabs();
      renderTopicButtons();
      renderPolicyPanel();
    });
  });
}

function renderTopicButtons() {
  const activeTopics = state.data.topics.filter((topic) => policiesForTopic(topic).length);

  els.topicButtons.innerHTML = activeTopics.map((topic) => {
    const policies = policiesForTopic(topic);
    const filtered = filteredPoliciesForTopic(topic);
    const active = topic === state.activeTopic;
    const copy = topicCopy(topic);

    return `
      <button
        class="topic-button ${active ? "is-active" : ""}"
        type="button"
        data-topic="${escapeAttr(topic)}"
        aria-pressed="${active}"
      >
        ${topicIcon(copy.icon)}
        <span>${escapeHtml(copy.label)}</span>
        <b>${escapeHtml(filtered.length || policies.length)}</b>
      </button>
    `;
  }).join("");

  els.topicButtons.querySelectorAll("[data-topic]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeTopic = button.dataset.topic;
      renderTopicButtons();
      renderPolicyPanel(true);
    });
  });
}

function renderPolicyPanel(shouldFocus) {
  const topic = state.activeTopic;
  const copy = topicCopy(topic);
  const filtered = filteredPoliciesForTopic(topic);
  const allTopicPolicies = policiesForTopic(topic);
  const visibleParties = groupBy(filtered, (policy) => policy.partyId);
  const dates = filtered.map((policy) => policy.lastChecked);
  const sourceCount = new Set(filtered.map((policy) => policy.officialSource?.url).filter(Boolean)).size;

  els.activeTopicTitle.textContent = copy.label;
  els.activeTopicNote.textContent = copy.note;
  els.activeTopicCount.textContent = `${filtered.length || allTopicPolicies.length}`;

  els.policySummary.innerHTML = `
    <article>
      <span>Policy question</span>
      <strong>${escapeHtml(copy.question)}</strong>
    </article>
    <article>
      <span>Coverage</span>
      <strong>${escapeHtml(filtered.length)} entries from ${escapeHtml(visibleParties.length)} parties</strong>
    </article>
    <article>
      <span>Evidence</span>
      <strong>${escapeHtml(sourceCount)} official links</strong>
      <em>Latest check: ${escapeHtml(formatDate(latestDate(dates)) || "Not checked")}</em>
    </article>
  `;

  if (!filtered.length) {
    const party = state.activeParty === "all" ? "No party" : getParty(state.activeParty)?.name || "This party";
    els.partyPolicyList.innerHTML = `<article class="empty">${escapeHtml(party)} has no official entry for ${escapeHtml(copy.label)} yet.</article>`;
  } else {
    els.partyPolicyList.innerHTML = visibleParties.map(([partyId, policies]) => partySection(partyId, policies)).join("");
  }

  if (shouldFocus) {
    document.getElementById("policy-panel").scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function partySection(partyId, policies) {
  const party = getParty(partyId);
  return `
    <section class="party-block" style="--party:${escapeAttr(party.color)}">
      <h3>${escapeHtml(party.name)}</h3>
      <ul>
        ${policies.map(policyListItem).join("")}
      </ul>
    </section>
  `;
}

function policyListItem(policy) {
  return `
    <li>
      <strong>${escapeHtml(policy.title)}:</strong>
      ${escapeHtml(policy.summary)}
      <span class="policy-meta">
        ${statusPill(policy.status)}
        <a href="${escapeAttr(policy.officialSource.url)}" target="_blank" rel="noopener">${escapeHtml(policy.officialSource.label)}</a>
        <em>Checked ${escapeHtml(formatDate(policy.lastChecked))}</em>
      </span>
    </li>
  `;
}

function renderSourceLedger() {
  const rows = state.watch?.sources || [];
  const errorRows = rows.filter((row) => row.status && row.status !== "ok");

  els.reviewCount.textContent = errorRows.length ? `${errorRows.length} unavailable` : "Automatic";
  els.reviewList.innerHTML = errorRows.length
    ? errorRows.slice(0, 10).map(sourceErrorItem).join("")
    : '<article class="empty">All official policy sources were reachable in the latest automatic check.</article>';

  els.sourceWatchList.innerHTML = rows.map((row) => `
    <article class="source-item">
      <div>
        <span>${escapeHtml(row.party)}</span>
        <strong>${escapeHtml(row.pageTitle || "Untitled source")}</strong>
        <a href="${escapeAttr(row.sourceUrl)}" target="_blank" rel="noopener">${escapeHtml(shortUrl(row.sourceUrl))}</a>
      </div>
      <div>
        ${changePill(row.contentChanged)}
        <small>${escapeHtml(row.status || "unknown")}</small>
        <small>${escapeHtml(formatDateTime(row.lastChecked))}</small>
      </div>
    </article>
  `).join("");
}

function sourceErrorItem(row) {
  return `
    <article class="review-item">
      <span>Source unavailable</span>
      <strong>${escapeHtml(row.party)}</strong>
      <a href="${escapeAttr(row.sourceUrl)}" target="_blank" rel="noopener">${escapeHtml(row.pageTitle || shortUrl(row.sourceUrl))}</a>
    </article>
  `;
}

function currentPolicies() {
  return state.data.policies.filter((policy) => policy.electionYear === ACTIVE_ELECTION_YEAR);
}

function policiesForTopic(topic) {
  return currentPolicies().filter((policy) => policy.topic === topic);
}

function filteredPoliciesForTopic(topic) {
  return policiesForTopic(topic).filter((policy) => {
    return state.activeParty === "all" || policy.partyId === state.activeParty;
  });
}

function groupBy(rows, getter) {
  const map = new Map();
  rows.forEach((row) => {
    const key = getter(row);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  });

  return [...map.entries()].sort((a, b) => {
    return partySortIndex(a[0]) - partySortIndex(b[0]);
  });
}

function partySortIndex(partyId) {
  const index = PARTY_ORDER.indexOf(partyId);
  return index === -1 ? 999 : index;
}

function getParty(id) {
  return state.data.parties.find((party) => party.id === id);
}

function topicCopy(topic) {
  return TOPIC_COPY[topic] || {
    label: topic,
    icon: "forum",
    note: "Official policy entries grouped by issue.",
    question: "What do official party sources say in this area?"
  };
}

function shortPartyName(name) {
  if (name === "New Zealand First") return "NZ First";
  if (name === "Green Party") return "Greens";
  if (name === "Te Pāti Māori") return "Te Pāti Māori";
  if (name === "The Opportunity Party (TOP)") return "TOP";
  return name;
}

function statusPill(status) {
  return `<span class="status status-${slug(status)}">${escapeHtml(status)}</span>`;
}

function changePill(changed) {
  if (changed === true) return '<span class="change changed">Changed</span>';
  if (changed === false) return '<span class="change unchanged">No change</span>';
  return '<span class="change review">Not checked</span>';
}

function topicIcon(name) {
  const paths = {
    heart: '<path d="M20.8 5.8a5.4 5.4 0 0 0-7.6 0L12 7 10.8 5.8a5.4 5.4 0 0 0-7.6 7.6L12 22l8.8-8.6a5.4 5.4 0 0 0 0-7.6Z"/><path d="M3 12h4l2-4 4 8 2-4h6"/>',
    piggy: '<path d="M19 7h1a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-1"/><path d="M6 10h.01"/><path d="M10 17v3h3v-3"/><path d="M16 17v3h3v-4"/><path d="M18 8a7 7 0 0 0-13.8 2H2v5h3.3A7 7 0 0 0 12 19h4a5 5 0 0 0 5-5v-1a5 5 0 0 0-3-5Z"/>',
    receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 8h6"/><path d="M9 12h6"/><path d="M9 16h3"/>',
    cap: '<path d="m22 10-10-5-10 5 10 5 10-5Z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/><path d="M22 10v6"/>',
    leaf: '<path d="M11 20A7 7 0 0 1 4 13C4 6 12 4 21 4c0 9-2 17-9 17Z"/><path d="M4 20c5-5 9-7 16-8"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="M9 12h6"/>',
    home: '<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18"/><path d="M12 3a14 14 0 0 0 0 18"/>',
    plane: '<path d="M22 2 9 15"/><path d="m22 2-7 20-4-9-9-4 20-7Z"/>',
    road: '<path d="M6 21 9 3"/><path d="m18 21-3-18"/><path d="M12 8v2"/><path d="M12 14v2"/><path d="M12 20v1"/>',
    building: '<path d="M4 21V7l8-4 8 4v14"/><path d="M9 21v-8h6v8"/><path d="M8 9h.01"/><path d="M12 9h.01"/><path d="M16 9h.01"/>',
    forum: '<path d="M4 6h16v10H7l-3 3V6Z"/><path d="M8 10h8"/><path d="M8 13h5"/>'
  };

  return `
    <svg class="topic-icon" viewBox="0 0 24 24" aria-hidden="true">
      ${paths[name] || paths.forum}
    </svg>
  `;
}

function latestDate(values) {
  return values.filter(Boolean).sort().at(-1) || "";
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return date.toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(value) {
  if (!value) return "not checked";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return date.toLocaleString("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function shortUrl(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.pathname}`;
  } catch {
    return url;
  }
}

function slug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function toCamel(value) {
  return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}
