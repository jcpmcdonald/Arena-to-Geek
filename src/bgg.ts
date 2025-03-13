import { arenaGameNameToBggId, setBggIdForGame, actuallyRecord, log } from ".";
import { Player } from "./types";

export const getBGGId = async (gameName: string): Promise<string> => {
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
    console.log("Not actually recording play", playData);
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
