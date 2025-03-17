import { shouldActuallyRecord } from "..";
import { getBGGId } from "../bga";
import { getBGAPlaysFromBGG, Play, recordBGGPlay } from "../bgg";
import { parseDateAndTime } from "../parseBGADate";
import { ArenaPlayer } from "../types";
import { waitForElementToDisplay } from "../util";
import { getGeekAliasForArenaPlayer } from "./playerPage";

export type Table = {
  tableId: number;
  gameName: string;
  date: Date;
  length: string;
  players: ArenaPlayer[];
  incomplete: boolean;
  bggId: number;
};

type TableRow = Table & {
  row: Element;
};

// const alreadyRecordedTables: { [key: string]: string } = [];

const bggPlays: Play[] = [];

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
  // Gather the table data
  const newTableRows: TableRow[] = [];
  const rows = document.querySelectorAll("#gamelist_inner tr");
  for (const row of rows) {
    // Skip rows that have already been processed
    if (!row.getAttribute("bga2bgg")) {
      const table = await tableFromRow(row);
      newTableRows.push({ ...table, row });
    }
  }

  // Look up plays for the recent page
  const newBgaPlays = await getBGAPlaysFromBGG(
    "jcpmcdonald",
    newTableRows[newTableRows.length - 1].date,
    newTableRows[0].date
  );

  // There will be some overlap between the new plays and the existing plays
  bggPlays.push(...newBgaPlays);

  for (const tableRow of newTableRows) {
    showBggAliasInLine(tableRow.row);
    const cell = await getCopyPlayCellForTable(tableRow);
    tableRow.row.appendChild(cell);
    tableRow.row.setAttribute("bga2bgg", "true");
  }
};

const showBggAliasInLine = (row: Element) => {
  // Show the BGG alias in-line
  const playerNameCell = row.querySelectorAll("td:nth-child(3) .name");
  for (const cell of playerNameCell) {
    const arenaName = cell.querySelector("a")!.textContent!;
    const geekAlias = getGeekAliasForArenaPlayer(arenaName);
    if (geekAlias) {
      // if (geekAlias !== arenaName) {
      const aliasDiv = document.createElement("span");
      aliasDiv.textContent = ` (${geekAlias})`;
      cell.appendChild(aliasDiv);
      // } else {
      //   const aliasDiv = document.createElement("span");
      //   aliasDiv.textContent = ` (*)`;
      //   cell.appendChild(aliasDiv);
      // }
    }
  }
};

const getCopyPlayCellForTable = async (table: Table) => {
  const cell = document.createElement("td");
  if (isTableAlreadyRecorded(table.tableId)) {
    // Already recorded
    cell.innerHTML = "Already Recorded";
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
  // row.appendChild(cell);
  return cell;
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
  const players: ArenaPlayer[] = [];

  for (const playerCell of playerCells) {
    const rank = playerCell.querySelector("div .rank")!.textContent!.trim();
    const player: ArenaPlayer = {
      name: getGeekAliasForArenaPlayer(
        playerCell.querySelector("div a")!.textContent!
      ),
      score: playerCell.querySelector("div .score")!.textContent!.trim(),
      win: rank === "1st",
    };

    players.push(player);
  }

  return players;
};

const recordPlay = async (table: Table, btnCell: Element) => {
  btnCell.innerHTML = "Recording...";

  const geekPlayers = table.players.map((player) => ({
    name: player.name,
    username: getGeekUsername(player.name),
    score: player.score,
    win: player.win,
  }));

  const playLink = await recordBGGPlay({
    date: table.date,
    length: table.length,
    players: geekPlayers,
    incomplete: table.incomplete,
    objectid: table.bggId,
    comments: `https://boardgamearena.com/table?table=${table.tableId}`,
  });

  if (!playLink) {
    btnCell.innerHTML = "Faked!";
    return;
  }

  btnCell.innerHTML = playLink;
  // TODO: add the play to the list of BGG plays
  // setTableAsRecorded(table.tableId, playLink);
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
  // log("Checking if table is already recorded", tableNumber);
  if (bggPlays.find((play) => play.comments.includes(`table=${tableNumber}`))) {
    return true;
  }
  return false;
};

// const setTableAsRecorded = (tableNumber: number, bggPlaysLink: string) => {
//   alreadyRecordedTables[tableNumber] = bggPlaysLink;
//   // GM_setValue("alreadyRecordedTables", JSON.stringify(alreadyRecordedTables));
// };
