import { alreadyRecordedTables, shouldActuallyRecord } from "..";
import { getBGGId } from "../bga";
import { recordBGGPlay } from "../bgg";
import { parseDateAndTime } from "../parseBGADate";
import { Player } from "../types";
import { log, waitForElementToDisplay } from "../util";
import { getGeekAliasForArenaPlayer } from "./playerPage";

export type Table = {
  tableId: number;
  gameName: string;
  date: Date;
  length: string;
  players: Player[];
  incomplete: boolean;
  bggId: number;
};

export const attachToGamesHistoryPage = async () => {
  GM_addStyle("#gamestats-module .simple-score-entry { width: 280px }");
  GM_addStyle(".record-play-button { background-color: grey; color: white; }");

  const gameListRow = "#gamelist tr";
  await waitForElementToDisplay(gameListRow, 100);
  await waitForElementToDisplay("#see_more_tables", 100);

  document
    .querySelector("#see_more_tables")!
    .addEventListener("click", async () => {
      const currentItemCount = document.querySelectorAll(gameListRow).length;
      await waitForElementToDisplay(
        `${gameListRow}:nth-child(${currentItemCount + 1})`,
        100
      );

      await onGameListRowChange();
    });

  // Render the buttons for the first page
  await onGameListRowChange();
};

const onGameListRowChange = async () => {
  // Look up plays for the last 10 games

  // Display the "Copy Play" buttons
  await displayCopyPlayButtons();
};

const displayCopyPlayButtons = async () => {
  // await getBGGPlays(new Date("2025-03-11"), new Date("2025-03-11"));

  [...document.querySelectorAll("#gamelist_inner tr")].forEach((row, i) => {
    if (!row.getAttribute("bga2bgg")) {
      displayCopyPlayButton(row);
      row.setAttribute("bga2bgg", "true");
    }
  });
};

const displayCopyPlayButton = async (row: Element) => {
  // Show the BGG alias in-line
  const playerNameCell = row.querySelectorAll("td:nth-child(3) .name");
  [...playerNameCell].forEach((cell, i) => {
    const arenaName = cell.querySelector("a")!.textContent!;
    const geekAlias = getGeekAliasForArenaPlayer(arenaName);
    if (geekAlias !== arenaName) {
      const aliasDiv = document.createElement("span");
      aliasDiv.textContent = ` (${geekAlias})`;
      cell.appendChild(aliasDiv);
    }
  });

  const table = await tableFromRow(row);

  const bggLink = isTableAlreadyRecorded(table.tableId);
  const cell = document.createElement("td");
  if (bggLink) {
    // Already recorded
    cell.innerHTML = bggLink;
  } else {
    // Add the button to record the play
    const input = document.createElement("button");
    input.textContent = shouldActuallyRecord
      ? "Record Play"
      : "Fake Record Play";
    input.classList.add("record-play-button");
    input.onclick = () => recordPlay(table, cell);
    cell.appendChild(input);
  }
  row.appendChild(cell);
};

const getGeekUsername = (arenaPlayerName: string) => {
  // TODO: Lookup BGG usernames
  if (arenaPlayerName === "jcpmcdonald") {
    return "jcpmcdonald";
  }
  return "";
};

const tableFromRow = async (row: Element): Promise<Table> => {
  const gameName = String(row.querySelector(".gamename")!.textContent);

  return {
    tableId: Number(
      row.querySelector(".table_name.smalltext")!.textContent!.replace(/^#/, "")
    ),
    date: parseDateAndTime(
      row.querySelector("td:nth-child(2) :first-child")!.textContent!
    ),
    length: String(
      row.querySelector("td:nth-child(2) :nth-child(2)")!.textContent
    ).split(" mn")[0],
    players: parsePlayers(row.querySelector("td:nth-child(3)")!),
    incomplete: isIncomplete(row.querySelector("td:nth-child(4)")!),
    gameName: gameName,
    bggId: await getBGGId(gameName),
  };
};

const parsePlayers = (playersCell: Element) => {
  const playerCells = playersCell.querySelectorAll("div .simple-score-entry");
  const players: Player[] = [];
  [...playerCells].forEach((playerCell, i) => {
    const player = {
      rank: playerCell.querySelector("div .rank")!.textContent!,
      name: getGeekAliasForArenaPlayer(
        playerCell.querySelector("div a")!.textContent!
      ),
      username: getGeekUsername(
        playerCell.querySelector("div a")!.textContent!
      ),
      score: playerCell.querySelector("div .score")!.textContent!.trim(),
      win: false,
    };
    player.win = player.rank === "1st";
    players.push(player);
  });

  return players;
};

const recordPlay = async (table: Table, btnCell: Element) => {
  btnCell.innerHTML = "Recording...";

  const playLink = await recordBGGPlay({
    date: table.date,
    length: table.length,
    players: table.players,
    incomplete: table.incomplete,
    objectid: table.bggId,
    comments: `https://boardgamearena.com/table?table=${table.tableId}`,
  });

  if (!playLink) {
    btnCell.innerHTML = "Faked!";
    return;
  }

  btnCell.innerHTML = playLink;
  setTableAsRecorded(table.tableId, playLink);
};

const isIncomplete = (completedStatus: Element) => {
  if (
    completedStatus.querySelector("div.smalltext span.smalltext")
      ?.textContent === "(Game abandoned)"
  ) {
    return true;
  }
  return false;
};

const isTableAlreadyRecorded = (tableNumber: number) => {
  log("Checking if table is already recorded", tableNumber);
  return alreadyRecordedTables[tableNumber];
};

const setTableAsRecorded = (tableNumber: number, bggPlaysLink: string) => {
  alreadyRecordedTables[tableNumber] = bggPlaysLink;
  GM_setValue("alreadyRecordedTables", JSON.stringify(alreadyRecordedTables));
};
