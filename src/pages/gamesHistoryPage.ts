import { alreadyRecordedTables } from "..";
import { getBGGId } from "../bga";
import { recordBGGPlay } from "../bgg";
import { parseDateAndTime } from "../parseBGADate";
import { Player } from "../types";
import { waitForElementToDisplay } from "../util";
import { getGeekAliasForArenaPlayer } from "./playerPage";

export const attachToGamesHistoryPage = async () => {
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
};

const displayCopyPlayButtons = async () => {
  // await getBGGPlays(new Date("2025-03-11"), new Date("2025-03-11"));

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
        // Already recorded
        const cell = document.createElement("td");
        cell.innerHTML = bggLink;
        row.appendChild(cell);
      } else {
        // Add the button to record the play
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

const parsePlayers = (playersCell: any) => {
  const playerCells = playersCell.querySelectorAll("div .simple-score-entry");
  const players: Player[] = [];
  [...playerCells].forEach((playerCell, i) => {
    const player = {
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

const getGeekUsername = (arenaPlayerName: string) => {
  // TODO: Lookup BGG usernames
  if (arenaPlayerName === "jcpmcdonald") {
    return "jcpmcdonald";
  }
  return "";
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

const isIncomplete = (completedStatus: any) => {
  if (
    completedStatus.querySelector("div.smalltext span.smalltext")
      ?.textContent === "(Game abandoned)"
  ) {
    return true;
  }
  return false;
};

const isTableAlreadyRecorded = (tableNumber: string) => {
  tableNumber = tableNumber.replace(/^#/, "");
  return alreadyRecordedTables[tableNumber];
};

const setTableAsRecorded = (tableNumber: string, bggPlaysLink: string) => {
  tableNumber = tableNumber.replace(/^#/, "");
  alreadyRecordedTables[tableNumber] = bggPlaysLink;
  GM_setValue("alreadyRecordedTables", JSON.stringify(alreadyRecordedTables));
};
