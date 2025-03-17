import { ArenaPlayer } from "../types";
import { log, waitForElementToDisplay } from "../util";
import { Table } from "./gamesHistoryPage";

export const attachToGameEndPage = async () => {
  log("Game end page loading");
  await waitForElementToDisplay("#pagesection_gameresult", 1000);
  await recordGameFromGameEndPage();
};

const recordGameFromGameEndPage = async () => {
  log("Recording game from game end page");

  // I need to know when the game is over, and it's nowhere in the DOM
  // https://boardgamearena.com/table/table/tableinfos.html?id=645021291&nosuggest=true&table=645021291&noerrortracking=true&dojo.preventCache=1742181709316
  // const response = await GM.xmlHttpRequest({
  //   method: "GET",
  //   url:
  //     "https://boardgamearena.com/table/table/tableinfos.html?id=645021291&nosuggest=true&table=645021291&noerrortracking=true&dojo.preventCache=" +
  //     Date.now().valueOf(),
  // });

  // log(response.response);
  // return;

  const tableId = Number(RegExp(/table=(\d+)/).exec(window.location.href)![1]);
  const gameName = document
    .querySelector("meta[property='og:title']")!
    .getAttribute("content")!;

  const table: Table = {
    tableId: tableId,
    gameName: gameName,
    date: new Date(),
    length: "",
    players: parsePlayers(),
    incomplete: false,
    bggId: 0,
  };

  log("Recording play:", table);
};

const parsePlayers = () => {
  const playerRows = document.querySelectorAll(".score-entry");
  const players = [];

  for (const row of playerRows) {
    const rank = row.querySelector(".rank")!.textContent!.trim();
    const player: ArenaPlayer = {
      name: row.querySelector(".name a")!.textContent!.trim(),
      score: row.querySelector(".score")!.textContent!.trim(),
      win: rank === "1st",
    };
    players.push(player);
  }

  return players;
};
