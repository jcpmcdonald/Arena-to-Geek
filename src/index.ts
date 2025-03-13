import { parsePlayers } from "./gamesHistoryPage";
import { parseDateAndTime } from "./parseBGADate";
import { recordBGGPlay } from "./recordBGGPlay";

// Memory
let arenaToGeekPlayerNames: { [key: string]: string } = {};
let alreadyRecordedTables: { [key: string]: string } = {};
let arenaGameNameToBggId: { [key: string]: string } = {};

export const DEBUG = true;
export const actuallyRecord = true;

export const log = (...data: any[]) => {
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
        let arenaName = cell.querySelector("a")!.textContent!;
        let geekAlias = getGeekAliasForArenaPlayer(arenaName);
        if (geekAlias !== arenaName) {
          const aliasDiv = document.createElement("span");
          aliasDiv.textContent = ` (${geekAlias})`;
          cell.appendChild(aliasDiv);
        }
      });

      let tableId = row.querySelector(".table_name.smalltext")!.textContent!;

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

const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const waitForElementToDisplay = async (selector: string, time: number) => {
  let element = document.querySelector(selector);
  while (element === null) {
    await sleep(time);
    element = document.querySelector(selector);
  }
  return Promise.resolve();
};

const recordPlay = async (e: any) => {
  const row = e.target.parentElement.parentElement;
  const btnCell = e.target.parentElement;

  btnCell.innerHTML = "Recording...";

  const tableId = row.querySelector(".table_name.smalltext").textContent;
  const gameName = String(row.querySelector(".gamename").textContent);

  const playLink = await recordBGGPlay({
    date: parseDateAndTime(
      row.querySelector("td:nth-child(2) :first-child").textContent
    ),
    length: String(
      row.querySelector("td:nth-child(2) :nth-child(2)").textContent
    ).split(" mn")[0],
    players: parsePlayers(row.querySelector("td:nth-child(3)")),
    incomplete: isIncomplete(row.querySelector("td:nth-child(4)")),
    objectid: await getBGGId(gameName),
    comments: `https://boardgamearena.com${row
      .querySelector("td:first-child a.table_name")
      .getAttribute("href")}`,
  });

  btnCell.innerHTML = playLink;
  setTableAsRecorded(tableId, playLink);
};

const getBGGId = async (gameName: string): Promise<string> => {
  if (arenaGameNameToBggId[gameName] && arenaGameNameToBggId[gameName] !== "") {
    return arenaGameNameToBggId[gameName];
  }

  return new Promise((resolve, reject) => {
    GM.xmlHttpRequest({
      method: "GET",
      url: `https://boardgamegeek.com/xmlapi2/search?type=boardgame&exact=1&query=${gameName}`,
      headers: {
        "Content-Type": "application/json",
      },
      onload: function (response) {
        try {
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(
            response.responseText,
            "text/xml"
          );
          const bggId = xmlDoc
            .querySelector("item")!
            .attributes.getNamedItem("id")!.value;
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

const isIncomplete = (completedStatus: any) => {
  if (
    completedStatus.querySelector("div.smalltext span.smalltext")
      ?.textContent === "(Game abandoned)"
  ) {
    return true;
  }
  return false;
};

const showBggAliasOnProfile = () => {
  let playerHeader = document.querySelector("#player_header")!;

  const arenaName = playerHeader
    .querySelector("#player_name")!
    .textContent!.trimEnd();
  log(arenaName);

  const input = document.createElement("input");
  input.value = getGeekAliasForArenaPlayer(arenaName);
  input.addEventListener("keyup", (e: any) => {
    setGeekAliasForArenaPlayer(arenaName, e.target?.value);
  });

  const label = document.createElement("strong");
  label.textContent = "BGG Alias: ";

  const cell = document.createElement("div");
  cell.appendChild(label);
  cell.appendChild(input);
  playerHeader.appendChild(cell);
};

export const getGeekAliasForArenaPlayer = (arenaPlayerName: string) => {
  if (arenaToGeekPlayerNames[arenaPlayerName]) {
    return arenaToGeekPlayerNames[arenaPlayerName];
  }
  return arenaPlayerName;
};

const setGeekAliasForArenaPlayer = (
  arenaPlayerName: string,
  geekAlias: string
) => {
  arenaToGeekPlayerNames[arenaPlayerName] = geekAlias.trim();
  log(arenaToGeekPlayerNames);
  GM_setValue("arenaToGeekPlayerNames", JSON.stringify(arenaToGeekPlayerNames));
};

const showBggIdOnGamePanel = () => {
  let gameNameElement = document.querySelector("#game_name")!;
  let gameName = gameNameElement.textContent!.trimEnd();

  const input = document.createElement("input");
  input.value = getBggIdForGame(gameName);
  input.addEventListener("keyup", (e: any) => {
    setBggIdForGame(gameName, e.target.value);
  });

  const label = document.createElement("strong");
  label.textContent = "BGG ID: ";

  const cell = document.createElement("div");
  cell.appendChild(label);
  cell.appendChild(input);
  gameNameElement.parentElement!.appendChild(cell);
};

const showBggIdOnTableSummary = () => {
  let gameNameElement = document.querySelector("#table_name")!;
  let gameName = gameNameElement.textContent!.trimEnd();

  log(gameName);

  const input = document.createElement("input");
  input.value = getBggIdForGame(gameName);
  input.addEventListener("keyup", (e: any) => {
    setBggIdForGame(gameName, e.target.value);
  });

  const label = document.createElement("strong");
  label.textContent = "BGG ID: ";

  const cell = document.createElement("div");
  cell.appendChild(label);
  cell.appendChild(input);
  gameNameElement.appendChild(cell);
};

const getBggIdForGame = (arenaGameName: string) => {
  if (arenaGameNameToBggId[arenaGameName]) {
    return arenaGameNameToBggId[arenaGameName];
  }
  return "";
};

const setBggIdForGame = (arenaGameName: string, bggId: string) => {
  arenaGameNameToBggId[arenaGameName] = bggId.trim();
  GM_setValue("arenaGameNameToBggId", JSON.stringify(arenaGameNameToBggId));
};

const isTableAlreadyRecorded = (tableNumber: string) => {
  tableNumber = tableNumber.replace(/^#/, "");
  return alreadyRecordedTables[tableNumber];
};

export const setTableAsRecorded = (
  tableNumber: string,
  bggPlaysLink: string
) => {
  tableNumber = tableNumber.replace(/^#/, "");
  alreadyRecordedTables[tableNumber] = bggPlaysLink;
  GM_setValue("alreadyRecordedTables", JSON.stringify(alreadyRecordedTables));
};

// To clear out a specific play, clear it with this:
const forgetTableAsRecorded = (tableNumber: string) => {
  tableNumber = tableNumber.replace(/^#/, "");
  delete alreadyRecordedTables[tableNumber];
  GM_setValue("alreadyRecordedTables", JSON.stringify(alreadyRecordedTables));
};

async function main() {
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
    let pageNumber = 0;
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
}

main();
