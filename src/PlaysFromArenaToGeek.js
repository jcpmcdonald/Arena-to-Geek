// Include this file in a greasemonkey script:
// @name         Plays From Arena to Geek
// @namespace    http://jcpmcdonald.com
// @version      2025-03-12
// @description  Copy plays from Board Game Arena to Board Game Geek
// @author       John McDonald
// @match        https://boardgamearena.com/gamestats?player=14724293
// @icon         https://www.google.com/s2/favicons?sz=64&domain=boardgamearena.com
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @require      file://G:/My Drive/Greasemonkey/PlaysFromArenaToGeek.js

// Memory
let arenaToGeekPlayerNames = {};
let alreadyRecordedTables = {};
let arenaGameNameToBggId = {};

const DEBUG = true;
const actuallyRecord = true;

const log = (...data) => {
  if (DEBUG) {
    console.log(...data);
  }
};

const displayCopyPlayButtons = async () => {
  [...document.querySelectorAll("#gamelist_inner tr")].forEach((row, i) => {
    if (!row.getAttribute("bga2bgg")) {
      // Show the BGG alias in-line
      const playerNameCell = row.querySelectorAll("td:nth-child(3) .name");
      [...playerNameCell].forEach((cell, i) => {
        let arenaName = cell.querySelector("a").textContent;
        let geekAlias = getGeekAliasForArenaPlayer(arenaName);
        if (geekAlias !== arenaName) {
          const aliasDiv = document.createElement("span");
          aliasDiv.textContent = ` (${geekAlias})`;
          cell.appendChild(aliasDiv);
        }
      });

      let tableId = row.querySelector(".table_name.smalltext").textContent;

      const bggLink = isTableAlreadyRecorded(tableId);
      if (bggLink) {
        const cell = document.createElement("td");
        cell.innerHTML = bggLink;
        row.appendChild(cell);
      } else {
        const input = document.createElement("button");
        input.textContent = "Record Play";
        input.style.backgroundColor = "grey";
        input.style.color = "white";
        input.addEventListener("click", recordPlay);

        const cell = document.createElement("td");
        cell.appendChild(input);
        row.appendChild(cell);
      }

      row.setAttribute("bga2bgg", "true");
    }
  });
};

const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const waitForElementToDisplay = async (selector, time) => {
  let element = document.querySelector(selector);
  while (element === null) {
    await sleep(time);
    element = document.querySelector(selector);
  }
  return Promise.resolve();
};

const recordPlay = async (e) => {
  let row = e.target.parentElement.parentElement;
  let btnCell = e.target.parentElement;

  btnCell.innerHTML = "Recording...";

  let tableId = row.querySelector(".table_name.smalltext").textContent;
  let gameName = String(row.querySelector(".gamename").textContent);
  let date = parseDateAndTime(
    row.querySelector("td:nth-child(2) :first-child").textContent
  );
  let playdate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;

  let playData = {
    date: date.toISOString(),
    playdate: playdate,
    length: String(
      row.querySelector("td:nth-child(2) :nth-child(2)").textContent
    ).split(" mn")[0],
    players: parsePlayers(row.querySelector("td:nth-child(3)")),
    incomplete: isIncomplete(row.querySelector("td:nth-child(4)")),
    objecttype: "thing",
    objectid: await getBGGId(gameName),
    comments: `https://boardgamearena.com${row
      .querySelector("td:first-child a.table_name")
      .getAttribute("href")}`,
    location: "BoardGameArena",
    ajax: 1,
    action: "save",
  };

  if (!actuallyRecord) {
    console.log("Not actually recording play", playData);
    btnCell.innerHTML = "Not actually<br/>Recorded";
    return;
  }

  log("Recording play:", playData);
  GM_xmlhttpRequest({
    method: "POST",
    url: "https://boardgamegeek.com/geekplay.php",
    headers: {
      "Content-Type": "application/json",
    },
    data: JSON.stringify(playData),
    onload: function (response) {
      log(response.response);
      const data = JSON.parse(response.response);
      let correctedLinkToBGG = data.html.replace(
        /\"\/plays/,
        "http://boardgamegeek.com/plays"
      );
      btnCell.innerHTML = correctedLinkToBGG;
      setTableAsRecorded(tableId, correctedLinkToBGG);
    },
  });
};

const getBGGId = async (gameName) => {
  if (arenaGameNameToBggId[gameName] && arenaGameNameToBggId[gameName] !== "") {
    return arenaGameNameToBggId[gameName];
  }

  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: "GET",
      url: `https://boardgamegeek.com/xmlapi2/search?type=boardgame&exact=1&query=${gameName}`,
      headers: {
        "Content-Type": "application/json",
      },
      onload: function (response) {
        try {
          let parser = new DOMParser();
          let xmlDoc = parser.parseFromString(
            response.responseText,
            "text/xml"
          );
          var bggId = xmlDoc
            .querySelector("item")
            .attributes.getNamedItem("id").value;
          setBggIdForGame(gameName, bggId);
          resolve(bggId);
        } catch (e) {
          let bggId = prompt(
            "Could not find BGG ID for " +
              gameName +
              ". Please provide it manually."
          );
          if (bggId != null) {
            setBggIdForGame(gameName, bggId);
            resolve(bggId);
          } else {
            reject();
          }
        }
      },
      onerror: function () {
        reject();
      },
    });
  });
};

// Returns a date object from a date and time string
// "11/01/2021 at 12:34" OR "2021/11/01 at 12:34", dependant on a setting in BGA
// "today at 12:37"
// "23 minutes ago"
const parseDateAndTime = (dateAndTimeString) => {
  const MS_PER_MINUTE = 60000;
  const MS_PER_HOUR = MS_PER_MINUTE * 60;
  let [dateString, timeString] = String(dateAndTimeString).split(" at ");
  const xMinsAgoRegex = /(\d\d?) minutes? ago/i;
  const xHoursAgoRegex = /(\d) hours? ago/i;

  let [month, day, year] = [];
  if (dateString === "today") {
    let now = new Date();
    day = now.getDate();
    month = now.getMonth() + 1;
    year = now.getFullYear();
  } else if (dateString === "yesterday") {
    let yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    day = yesterday.getDate();
    month = yesterday.getMonth() + 1;
    year = yesterday.getFullYear();
  } else if (dateString.match(xMinsAgoRegex)) {
    const minsAgo = dateString.match(xMinsAgoRegex)[1];
    let now = new Date(new Date().valueOf() - minsAgo * MS_PER_MINUTE);
    return now;
  } else if (dateString.match(xHoursAgoRegex)) {
    const hoursAgo = dateString.match(xHoursAgoRegex)[1];
    let now = new Date(new Date().valueOf() - hoursAgo * MS_PER_HOUR);
    return now;
  } else if (dateString === "one hour ago") {
    let now = new Date(new Date().valueOf() - 1 * MS_PER_HOUR);
    return now;
  } else {
    //[month, day, year] = dateString.split("/");
    [year, month, day] = dateString.split("-");
  }

  let [hour, minute] = timeString.split(":");

  return new Date(year, month - 1, day, hour, minute);
};

const parsePlayers = (playersCell) => {
  let playerCells = playersCell.querySelectorAll("div .simple-score-entry");
  let players = [];
  [...playerCells].forEach((playerCell, i) => {
    let player = {
      rank: playerCell.querySelector("div .rank").textContent,
      name: getGeekAliasForArenaPlayer(
        playerCell.querySelector("div a").textContent
      ),
      username: getGeekUsername(playerCell.querySelector("div a").textContent),
      score: playerCell.querySelector("div .score").textContent,
      win: false,
    };
    player.win = player.rank === "1st";
    players.push(player);
  });

  return players;
};

const getGeekUsername = (arenaPlayerName) => {
  // TODO: Lookup BGG usernames
  if (arenaPlayerName === "jcpmcdonald") {
    return "jcpmcdonald";
  }
  return "";
};

const isIncomplete = (completedStatus) => {
  if (
    completedStatus.querySelector("div.smalltext span.smalltext")
      ?.textContent === "(Game abandoned)"
  ) {
    return true;
  }
  return false;
};

const showBggAliasOnProfile = () => {
  let playerHeader = document.querySelector("#player_header");

  const arenaName = playerHeader
    .querySelector("#player_name")
    .textContent.trimEnd();
  log(arenaName);

  const input = document.createElement("input");
  input.value = getGeekAliasForArenaPlayer(arenaName);
  input.addEventListener("keyup", (e) => {
    setGeekAliasForArenaPlayer(arenaName, e.target.value);
  });

  const label = document.createElement("strong");
  label.textContent = "BGG Alias: ";

  const cell = document.createElement("div");
  cell.appendChild(label);
  cell.appendChild(input);
  playerHeader.appendChild(cell);
};

const getGeekAliasForArenaPlayer = (arenaPlayerName) => {
  if (arenaToGeekPlayerNames[arenaPlayerName]) {
    return arenaToGeekPlayerNames[arenaPlayerName];
  }
  return arenaPlayerName;
};

const setGeekAliasForArenaPlayer = (arenaPlayerName, geekAlias) => {
  arenaToGeekPlayerNames[arenaPlayerName] = geekAlias.trim();
  log(arenaToGeekPlayerNames);
  GM_setValue("arenaToGeekPlayerNames", JSON.stringify(arenaToGeekPlayerNames));
};

const showBggIdOnGamePanel = () => {
  let gameNameElement = document.querySelector("#game_name");
  let gameName = gameNameElement.textContent.trimEnd();

  const input = document.createElement("input");
  input.value = getBggIdForGame(gameName);
  input.addEventListener("keyup", (e) => {
    setBggIdForGame(gameName, e.target.value);
  });

  const label = document.createElement("strong");
  label.textContent = "BGG ID: ";

  const cell = document.createElement("div");
  cell.appendChild(label);
  cell.appendChild(input);
  gameNameElement.parentElement.appendChild(cell);
};

const showBggIdOnTableSummary = () => {
  let gameNameElement = document.querySelector("#table_name");
  let gameName = gameNameElement.textContent.trimEnd();

  log(gameName);

  const input = document.createElement("input");
  input.value = getBggIdForGame(gameName);
  input.addEventListener("keyup", (e) => {
    setBggIdForGame(gameName, e.target.value);
  });

  const label = document.createElement("strong");
  label.textContent = "BGG ID: ";

  const cell = document.createElement("div");
  cell.appendChild(label);
  cell.appendChild(input);
  gameNameElement.appendChild(cell);
};

const getBggIdForGame = (arenaGameName) => {
  if (arenaGameNameToBggId[arenaGameName]) {
    return arenaGameNameToBggId[arenaGameName];
  }
  return "";
};

const setBggIdForGame = (arenaGameName, bggId) => {
  arenaGameNameToBggId[arenaGameName] = bggId.trim();
  GM_setValue("arenaGameNameToBggId", JSON.stringify(arenaGameNameToBggId));
};

const isTableAlreadyRecorded = (tableNumber) => {
  tableNumber = tableNumber.replace(/^#/, "");
  return alreadyRecordedTables[tableNumber];
};

const setTableAsRecorded = (tableNumber, bggPlaysLink) => {
  tableNumber = tableNumber.replace(/^#/, "");
  alreadyRecordedTables[tableNumber] = bggPlaysLink;
  GM_setValue("alreadyRecordedTables", JSON.stringify(alreadyRecordedTables));
};

// To clear out a specific play, clear it with this:
const forgetTableAsRecorded = (tableNumber) => {
  tableNumber = tableNumber.replace(/^#/, "");
  alreadyRecordedTables[tableNumber] = undefined;
  GM_setValue("alreadyRecordedTables", JSON.stringify(alreadyRecordedTables));
};

(async function () {
  "use strict";

  arenaToGeekPlayerNames = JSON.parse(
    GM_getValue("arenaToGeekPlayerNames", "{}")
  );

  alreadyRecordedTables = JSON.parse(
    GM_getValue("alreadyRecordedTables", "{}")
  );

  arenaGameNameToBggId = JSON.parse(GM_getValue("arenaGameNameToBggId", "{}"));

  const location = window.location.href;
  if (location.startsWith("https://boardgamearena.com/gamestats")) {
    GM_addStyle("#gamestats-module .simple-score-entry { width: 280px }");

    // Wait for the gamelist table to show the next page of game records
    var pageNumber = 0;
    while (true) {
      if (pageNumber === 0) {
        await waitForElementToDisplay("#gamelist tr", 1000);
      } else {
        await waitForElementToDisplay(
          `#gamelist tr:nth-child(${10 * pageNumber + 1})`,
          1000
        );
      }
      await displayCopyPlayButtons();

      pageNumber++;
    }
  } else if (location.startsWith("https://boardgamearena.com/player")) {
    showBggAliasOnProfile();
  } else if (location.startsWith("https://boardgamearena.com/gamepanel")) {
    showBggIdOnGamePanel();
  } else if (location.startsWith("https://boardgamearena.com/table")) {
    showBggIdOnTableSummary();
  }
})();
