import { shouldActuallyRecord } from ".";
import { Player } from "./types";
import { log } from "./util";

type Play = {
  date: Date;
  length: string;
  players: Player[];
  incomplete: boolean;
  objectid: number;
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

  if (!shouldActuallyRecord) {
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

/**
 * Get plays from BGG for a particular user between two dates
 * @param start The year, month, and day to start the search (hour, minute, and second are ignored)
 * @param end The year, month, and day to end the search (hour, minute, and second are ignored)
 */
export const getBGGPlays = async (username: string, start: Date, end: Date) => {
  // Request plays logged by a particular user or for a particular item.
  // username=NAME	Name of the player you want to request play information for. Data is returned in backwards-chronological form. You must include either a username or an id and type to get results.
  // id=NNN	Id number of the item you want to request play information for. Data is returned in backwards-chronological form.
  // type=TYPE	Type of the item you want to request play information for. Valid types include: thing, family
  // mindate=YYYY-MM-DD	Returns only plays of the specified date or later.
  // maxdate=YYYY-MM-DD	Returns only plays of the specified date or earlier.
  // subtype=TYPE	Limits play results to the specified TYPE; boardgame is the default. Valid types include: boardgame, boardgameexpansion, boardgameaccessory, boardgameintegration, boardgamecompilation, boardgameimplementation, rpg, rpgitem, videogame
  // page=NNN	The page of information to request. Page size is 100 records.

  const queryParams = new URLSearchParams({
    username: username,
    type: "thing",
    mindate: start.toISOString().split("T")[0],
    maxdate: end.toISOString().split("T")[0],
  });

  const response = await GM.xmlHttpRequest({
    method: "GET",
    url: `https://boardgamegeek.com/xmlapi2/plays?${queryParams.toString()}`,
    headers: {
      "Content-Type": "application/json",
    },
  });

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(response.responseText, "text/xml");
  log(xmlDoc);
};
