const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyst3tVguSlIySk3tDXf7SHXLrdWtmZirLMBovBozroAL7PW-VwNeUHgB-4ru09ZP8/exec";

const publicGroupsContainer = document.getElementById("publicGroupsContainer");
const publicMatchesTableBody = document.getElementById("publicMatchesTableBody");
const publicStatus = document.getElementById("publicStatus");
const refreshPublicBtn = document.getElementById("refreshPublicBtn");
const publicGroupFilter = document.getElementById("publicGroupFilter");

const publicGroupsCount = document.getElementById("publicGroupsCount");
const publicPlayersCount = document.getElementById("publicPlayersCount");
const publicPlayedMatches = document.getElementById("publicPlayedMatches");
const publicRemainingMatches = document.getElementById("publicRemainingMatches");

let groupsData = [];
let standingsData = [];
let matchesData = [];

async function postToApi(payload) {
  const response = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  const data = JSON.parse(text);

  if (!data.ok) {
    throw new Error(data.error || "Erreur API.");
  }

  return data;
}

async function loadPublicData() {
  try {
    publicStatus.textContent = "Chargement des données...";

    const [groupsRes, standingsRes, matchesRes] = await Promise.all([
      postToApi({ action: "get_groups" }),
      postToApi({ action: "get_group_standings" }),
      postToApi({ action: "get_group_matches" })
    ]);

    groupsData = groupsRes.groups || [];
    standingsData = standingsRes.standings || [];
    matchesData = matchesRes.matches || [];

    renderPublicStats();
    renderPublicGroups();
    renderPublicMatches();

    publicStatus.textContent = "Données mises à jour.";
  } catch (error) {
    console.error(error);
    publicStatus.textContent = error.message;
    publicGroupsContainer.innerHTML = `<div class="empty-cell">${escapeHtml(error.message)}</div>`;
    publicMatchesTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-cell">${escapeHtml(error.message)}</td>
      </tr>
    `;
  }
}

function renderPublicStats() {
  const groupNames = [...new Set(groupsData.map(row => row.group_name))];
  const played = matchesData.filter(m => String(m.status).toLowerCase() === "played").length;
  const remaining = matchesData.length - played;

  publicGroupsCount.textContent = groupNames.length;
  publicPlayersCount.textContent = groupsData.length;
  publicPlayedMatches.textContent = played;
  publicRemainingMatches.textContent = remaining;
}

function renderPublicGroups() {
  const groupNames = [...new Set(groupsData.map(g => g.group_name))].sort();

  if (!groupNames.length) {
    publicGroupsContainer.innerHTML = `<div class="empty-cell">Aucune poule n’a encore été générée.</div>`;
    return;
  }

  publicGroupsContainer.innerHTML = groupNames.map(groupName => {
    const standings = standingsData
      .filter(s => s.group_name === groupName)
      .sort((a, b) => Number(a.rank || 999) - Number(b.rank || 999));

    return `
      <div class="group-card">
        <div class="group-card-head">
          <h3>Poule ${groupName}</h3>
        </div>

        <div class="group-table-wrap">
          <table class="group-standings-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Joueur</th>
                <th>Pts</th>
                <th>J</th>
                <th>V</th>
                <th>N</th>
                <th>D</th>
                <th>BP</th>
                <th>BC</th>
                <th>Diff</th>
              </tr>
            </thead>
            <tbody>
              ${standings.map(row => `
                <tr>
                  <td>${escapeHtml(row.rank || "-")}</td>
                  <td>${escapeHtml(row.player_name || "")}</td>
                  <td>${escapeHtml(row.points || 0)}</td>
                  <td>${escapeHtml(row.played || 0)}</td>
                  <td>${escapeHtml(row.wins || 0)}</td>
                  <td>${escapeHtml(row.draws || 0)}</td>
                  <td>${escapeHtml(row.losses || 0)}</td>
                  <td>${escapeHtml(row.goals_for || 0)}</td>
                  <td>${escapeHtml(row.goals_against || 0)}</td>
                  <td>${escapeHtml(row.goal_diff || 0)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }).join("");
}

function renderPublicMatches() {
  let filteredMatches = [...matchesData];

  if (publicGroupFilter.value) {
    filteredMatches = filteredMatches.filter(match => match.group_name === publicGroupFilter.value);
  }

  filteredMatches.sort((a, b) => {
    if (a.group_name !== b.group_name) {
      return String(a.group_name).localeCompare(String(b.group_name));
    }
    return String(a.match_id).localeCompare(String(b.match_id));
  });

  if (!filteredMatches.length) {
    publicMatchesTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-cell">Aucun match trouvé.</td>
      </tr>
    `;
    return;
  }

  publicMatchesTableBody.innerHTML = filteredMatches.map(match => {
    const isPlayed = String(match.status).toLowerCase() === "played";
    const scoreText = isPlayed
      ? `${escapeHtml(match.home_score)} - ${escapeHtml(match.away_score)}`
      : "À jouer";

    return `
      <tr>
        <td>Poule ${escapeHtml(match.group_name || "")}</td>
        <td>${escapeHtml(match.match_id || "")}</td>
        <td>${escapeHtml(match.home_player || "")}</td>
        <td>${scoreText}</td>
        <td>${escapeHtml(match.away_player || "")}</td>
        <td>
          <span class="status-pill ${isPlayed ? "status-paid" : "status-pending"}">
            ${isPlayed ? "joué" : "à jouer"}
          </span>
        </td>
      </tr>
    `;
  }).join("");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

refreshPublicBtn.addEventListener("click", loadPublicData);
publicGroupFilter.addEventListener("change", renderPublicMatches);

loadPublicData();