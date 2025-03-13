import { displayCopyPlayButtons } from "./pages/gamesHistoryPage";

// Memory
export const arenaToGeekPlayerNames: { [key: string]: string } = JSON.parse(
  GM_getValue("arenaToGeekPlayerNames", "{}")
);
export const alreadyRecordedTables: { [key: string]: string } = JSON.parse(
  GM_getValue("alreadyRecordedTables", "{}")
);
export const arenaGameNameToBggId: { [key: string]: string } = JSON.parse(
  GM_getValue("arenaGameNameToBggId", "{}")
);

export const DEBUG = true;
export const actuallyRecord = true;

export const log = (...data: any[]) => {
  if (DEBUG) {
    console.log(...data);
  }
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

export const setBggIdForGame = (arenaGameName: string, bggId: string) => {
  arenaGameNameToBggId[arenaGameName] = bggId.trim();
  GM_setValue("arenaGameNameToBggId", JSON.stringify(arenaGameNameToBggId));
};

export const isTableAlreadyRecorded = (tableNumber: string) => {
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

  (() => {
    let oldPushState = history.pushState;
    history.pushState = function pushState() {
      // @ts-expect-error
      let ret = oldPushState.apply(this, arguments);
      // window.dispatchEvent(new Event("pushstate"));
      window.dispatchEvent(new Event("locationchange"));
      return ret;
    };

    let oldReplaceState = history.replaceState;
    history.replaceState = function replaceState() {
      // @ts-expect-error
      let ret = oldReplaceState.apply(this, arguments);
      // window.dispatchEvent(new Event("replacestate"));
      window.dispatchEvent(new Event("locationchange"));
      return ret;
    };

    window.addEventListener("popstate", () => {
      window.dispatchEvent(new Event("locationchange"));
    });
  })();

  window.addEventListener("locationchange", function () {
    console.log("location changed!");
  });

  // Only works in chrome
  // window.navigation.addEventListener("navigate", (event) => {
  //   console.log("location changed!");
  // });

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
