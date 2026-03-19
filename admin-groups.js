const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyst3tVguSlIySk3tDXf7SHXLrdWtmZirLMBovBozroAL7PW-VwNeUHgB-4ru09ZP8/exec";

const generateGroupsBtn = document.getElementById("generateGroupsBtn");
const refreshGroupsBtn = document.getElementById("refreshGroupsBtn");
const groupsStandingsContainer = document.getElementById("groupsStandingsContainer");
const groupMatchesTableBody = document.getElementById("groupMatchesTableBody");
const adminGroupsStatus = document.getElementById("adminGroupsStatus");
const groupFilter = document.getElementById("groupFilter");

const groupsCountEl = document.getElementById("groupsCount");
const playersAssignedEl = document.getElementById("playersAssigned");
const playedMatchesEl = document.getElementById("playedMatches");
const remainingMatchesEl = document.getElementById("remainingMatches");

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

async function loadAllGroupData() {
  try {
    adminGroupsStatus.textContent = "Chargement des données...";

    const [groupsRes, standingsRes, matchesRes] = await Promise.all([
      postToApi({ action: "get_groups" }),
      postToApi({ action: "get_group_standings" }),
      postToApi({ action: "get_group_matches" })
    ]);

    groupsData = groupsRes.groups || [];
    standingsData = standingsRes.standings || [];
    matchesData = matchesRes.matches || [];

    renderStats();
    renderGroupsAndStandings();
    renderMatches();

    adminGroupsStatus.textContent = "Données chargées.";
  } catch (error) {
    console.error(error);
    adminGroupsStatus.textContent = error.message;
    groupsStandingsContainer.innerHTML = `<div class="empty-cell">${escapeHtml(error.message)}</div>`;
    groupMatchesTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-cell">${escapeHtml(error.message)}</td>
      </tr>
    `;
  }
}

function renderStats() {
  const groupNames = [...new Set(groupsData.map(row => row.group_name))];
  const played = matchesData.filter(m => String(m.status).toLowerCase() === "played").length;
  const remaining = matchesData.length - played;

  groupsCountEl.textContent = groupNames.length;
  playersAssignedEl.textContent = groupsData.length;
  playedMatchesEl.textContent = played;
  remainingMatchesEl.textContent = remaining;
}

function renderGroupsAndStandings() {
  const groupNames = ["A", "B", "C", "D", "E", "F", "G", "H"];
  const existingGroups = new Set(groupsData.map(g => g.group_name));

  if (!groupsData.length) {
    groupsStandingsContainer.innerHTML = `<div class="empty-cell">Aucune poule générée pour le moment.</div>`;
    return;
  }

  groupsStandingsContainer.innerHTML = groupNames
    .filter(name => existingGroups.has(name))
    .map(groupName => {
      const players = groupsData
        .filter(g => g.group_name === groupName)
        .sort((a, b) => Number(a.slot) - Number(b.slot));

      const standings = standingsData
        .filter(s => s.group_name === groupName)
        .sort((a, b) => Number(a.rank || 999) - Number(b.rank || 999));

      return `
        <div class="group-card">
          <div class="group-card-head">
            <h3>Poule ${groupName}</h3>
          </div>

          <div class="group-section">
            <div class="mini-title">Joueurs</div>
            <ul class="group-player-list">
              ${players.map(player => `
                <li>
                  <span>${escapeHtml(player.pseudo || player.nom_prenom || "Joueur")}</span>
                  <small>${escapeHtml(player.console || "")}</small>
                </li>
              `).join("")}
            </ul>
          </div>

          <div class="group-section">
            <div class="mini-title">Classement</div>
            <div class="group-table-wrap">
              <table class="group-standings-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Joueur</th>
                    <th>Pts</th>
                    <th>J</th>
                    <th>Diff</th>
                    <th>BP</th>
                  </tr>
                </thead>
                <tbody>
                  ${standings.map(row => `
                    <tr>
                      <td>${escapeHtml(row.rank || "-")}</td>
                      <td>${escapeHtml(row.player_name || "")}</td>
                      <td>${escapeHtml(row.points || 0)}</td>
                      <td>${escapeHtml(row.played || 0)}</td>
                      <td>${escapeHtml(row.goal_diff || 0)}</td>
                      <td>${escapeHtml(row.goals_for || 0)}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    }).join("");
}

function renderMatches() {
  let filteredMatches = [...matchesData];

  if (groupFilter.value) {
    filteredMatches = filteredMatches.filter(match => match.group_name === groupFilter.value);
  }

  filteredMatches.sort((a, b) => {
    if (a.group_name !== b.group_name) {
      return String(a.group_name).localeCompare(String(b.group_name));
    }
    return String(a.match_id).localeCompare(String(b.match_id));
  });

  if (!filteredMatches.length) {
    groupMatchesTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-cell">Aucun match trouvé.</td>
      </tr>
    `;
    return;
  }

  groupMatchesTableBody.innerHTML = filteredMatches.map(match => {
    const isPlayed = String(match.status).toLowerCase() === "played";

    return `
      <tr>
        <td>Poule ${escapeHtml(match.group_name || "")}</td>
        <td>${escapeHtml(match.match_id || "")}</td>
        <td>${escapeHtml(match.home_player || "")}</td>
        <td>
          <div class="score-editor">
            <input
              type="number"
              min="0"
              value="${isPlayed ? escapeHtml(match.home_score) : ""}"
              id="home-${escapeHtml(match.match_id)}"
              class="score-input"
            />
            <span>-</span>
            <input
              type="number"
              min="0"
              value="${isPlayed ? escapeHtml(match.away_score) : ""}"
              id="away-${escapeHtml(match.match_id)}"
              class="score-input"
            />
          </div>
        </td>
        <td>${escapeHtml(match.away_player || "")}</td>
        <td>
          <span class="status-pill ${isPlayed ? "status-paid" : "status-pending"}">
            ${escapeHtml(match.status || "pending")}
          </span>
        </td>
        <td>
          <button class="mini-btn" onclick="saveMatchScore('${escapeJs(match.match_id)}')">
            💾 Enregistrer
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

async function saveMatchScore(matchId) {
  const homeInput = document.getElementById(`home-${matchId}`);
  const awayInput = document.getElementById(`away-${matchId}`);

  const homeScore = homeInput.value;
  const awayScore = awayInput.value;

  if (homeScore === "" || awayScore === "") {
    adminGroupsStatus.textContent = "Merci de renseigner les deux scores.";
    return;
  }

  try {
    adminGroupsStatus.textContent = `Enregistrement du match ${matchId}...`;

    await postToApi({
      action: "update_group_match",
      match_id: matchId,
      home_score: Number(homeScore),
      away_score: Number(awayScore)
    });

    await loadAllGroupData();
    adminGroupsStatus.textContent = `Score du match ${matchId} enregistré.`;
  } catch (error) {
    console.error(error);
    adminGroupsStatus.textContent = error.message;
  }
}

async function generateGroups() {
  const confirmed = window.confirm(
    "Cette action va générer les 8 poules de 5 et réinitialiser les matchs/classements de poules. Continuer ?"
  );

  if (!confirmed) return;

  try {
    adminGroupsStatus.textContent = "Génération des poules...";
    await postToApi({ action: "generate_groups" });
    await loadAllGroupData();
    adminGroupsStatus.textContent = "Poules générées avec succès.";
  } catch (error) {
    console.error(error);
    adminGroupsStatus.textContent = error.message;
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeJs(value) {
  return String(value ?? "").replaceAll("'", "\\'");
}

generateGroupsBtn.addEventListener("click", generateGroups);
refreshGroupsBtn.addEventListener("click", loadAllGroupData);
groupFilter.addEventListener("change", renderMatches);

window.saveMatchScore = saveMatchScore;

loadAllGroupData();