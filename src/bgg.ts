import { start } from "node:repl";
import { arenaGameNameToBggId, setBggIdForGame, actuallyRecord } from ".";
import { Player } from "./types";
import { log } from "./util";

export const getBGGId = async (gameName: string): Promise<string> => {
  // TODO: Replace this by looking up the BGG ID in the BGA game list
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

type Play = {
  date: Date;
  length: string;
  players: Player[];
  incomplete: boolean;
  objectid: string;
  comments: string;
};

export const recordBGGPlay = async (play: Play) => {
  const playDate = `${play.date.getFullYear()}-${String(
    play.date.getMonth() + 1
  ).padStart(2, "0")}-${String(play.date.getDate()).padStart(2, "0")}`;

  let playData = {
    date: play.date.toISOString(), // "2021-11-01T12:34:00.000Z",
    playdate: playDate, // "2021-11-01",
    length: play.length, // "22",
    players: play.players,
    incomplete: play.incomplete,
    objecttype: "thing",
    objectid: play.objectid, // The BGG ID of the game
    comments: play.comments,
    location: "BoardGameArena",
    ajax: 1,
    action: "save",
  };

  if (!actuallyRecord) {
    log("Not actually recording play", playData);
    // btnCell.innerHTML = "Not actually<br/>Recorded";
    return;
  }

  log("Recording play:", playData);
  const response = await GM.xmlHttpRequest({
    method: "POST",
    url: "https://boardgamegeek.com/geekplay.php",
    headers: {
      "Content-Type": "application/json",
    },
    data: JSON.stringify(playData),
  });

  log(response.response);
  const data = JSON.parse(response.response);
  let correctedLinkToBGG = data.html.replace(
    /\"\/plays/,
    "http://boardgamegeek.com/plays"
  );

  return correctedLinkToBGG;
};

export const getBGGPlays = async (start: Date, end: Date) => {
  // Plays
  // Request plays logged by a particular user or for a particular item.
  // Base URI: /xmlapi2/plays?parameters
  // Parameter	Description
  // username=NAME	Name of the player you want to request play information for. Data is returned in backwards-chronological form. You must include either a username or an id and type to get results.
  // id=NNN	Id number of the item you want to request play information for. Data is returned in backwards-chronological form.
  // type=TYPE	Type of the item you want to request play information for. Valid types include:
  //    thing
  //    family
  // mindate=YYYY-MM-DD	Returns only plays of the specified date or later.
  // maxdate=YYYY-MM-DD	Returns only plays of the specified date or earlier.
  // subtype=TYPE	Limits play results to the specified TYPE; boardgame is the default. Valid types include:
  //    boardgame
  //    boardgameexpansion
  //    boardgameaccessory
  //    boardgameintegration
  //    boardgamecompilation
  //    boardgameimplementation
  //    rpg
  //    rpgitem
  //    videogame
  // page=NNN	The page of information to request. Page size is 100 records.

  await GM.xmlHttpRequest({
    method: "GET",
    url: `https://boardgamegeek.com/xmlapi2/plays?username=jcpmcdonald&type=thing&mindate=${
      start.toISOString().split("T")[0]
    }&maxdate=${end.toISOString().split("T")[0]}`,
    headers: {
      "Content-Type": "application/json",
    },
    onload: function (response) {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(response.responseText, "text/xml");
      log(xmlDoc);
    },
  });
};
