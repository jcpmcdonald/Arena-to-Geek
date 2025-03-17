import { shouldActuallyRecord } from ".";
import { GeekPlayer } from "./types";
import { log } from "./util";

export type Play = {
  date: Date;
  length: string;
  players: GeekPlayer[];
  incomplete: boolean;
  objectid: number;
  comments: string;
};

export const recordBGGPlay = async (play: Play): Promise<string | null> => {
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
    location: "Board Game Arena",
    ajax: 1,
    action: "save",
  };

  if (!shouldActuallyRecord) {
    log("Not actually recording play", playData);
    // btnCell.innerHTML = "Not actually<br/>Recorded";
    return null;
  }

  log("Recording play:", playData);
  const response = await GM.xmlHttpRequest<{ arst: string }>({
    method: "POST",
    url: "https://boardgamegeek.com/geekplay.php",
    headers: {
      "Content-Type": "application/json",
    },
    data: JSON.stringify(playData),
  });

  log(response.response);
  // TODO: Just return the whole play
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
export const getBGAPlaysFromBGG = async (
  username: string,
  start: Date,
  end: Date
) => {
  // Request plays logged by a particular user or for a particular item.
  // username=NAME	Name of the player you want to request play information for. Data is returned in backwards-chronological form. You must include either a username or an id and type to get results.
  // id=NNN	Id number of the item you want to request play information for. Data is returned in backwards-chronological form.
  // type=TYPE	Type of the item you want to request play information for. Valid types include: thing, family
  // mindate=YYYY-MM-DD	Returns only plays of the specified date or later.
  // maxdate=YYYY-MM-DD	Returns only plays of the specified date or earlier.
  // subtype=TYPE	Limits play results to the specified TYPE; boardgame is the default. Valid types include: boardgame, boardgameexpansion, boardgameaccessory, boardgameintegration, boardgamecompilation, boardgameimplementation, rpg, rpgitem, videogame
  // page=NNN	The page of information to request. Page size is 100 records.

  // Move the dates out a bit to allow for timezone crap
  let minDate = new Date(start);
  minDate.setDate(start.getDate() - 1);
  const maxDate = new Date(end);
  maxDate.setDate(end.getDate() + 1);

  const queryParams = new URLSearchParams({
    username: username,
    type: "thing",
    mindate: minDate.toISOString().split("T")[0],
    maxdate: maxDate.toISOString().split("T")[0],
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
  // log(xmlDoc);

  // <plays username="jcpmcdonald" userid="589830" total="1" page="1" termsofuse="https://boardgamegeek.com/xmlapi/termsofuse">
  //   <play id="96466596" date="2025-03-11" quantity="1" length="18" incomplete="0" nowinstats="0" location="BoardGameArena">
  // 		<item name="Pixies" objecttype="thing" objectid="411875">
  // 			<subtypes><subtype value="boardgame"/></subtypes>
  // 		</item>
  // 		<comments>https://boardgamearena.com/table?table=642468163</comments>
  // 		<players>
  // 		  <player username="jcpmcdonald" userid="589830" name="jcpmcdonald" startposition="" color="" score="125  " new="0" rating="0" win="1"/>
  // 			<player username="" userid="0" name="madmuc" startposition="" color="" score="123  " new="0" rating="0" win="0"/>
  // 			<player username="" userid="0" name="shlfung" startposition="" color="" score="115  " new="0" rating="0" win="0"/>
  // 		</players>
  // 	</play>
  // </plays>

  const plays: Play[] = [];
  const playElements = xmlDoc.getElementsByTagName("play");
  for (const play of playElements) {
    // Skip plays whose location is not Board Game Arena
    if (
      play.getAttribute("location") !== "Board Game Arena" &&
      play.getAttribute("location") !== "BoardGameArena" // Legacy support
    ) {
      continue;
    }

    const date = new Date(play.getAttribute("date")!);
    const length = play.getAttribute("length")!;
    const incomplete = play.getAttribute("incomplete") === "1";
    const comments = play.getElementsByTagName("comments")[0].textContent!;
    const objectid = play
      .getElementsByTagName("item")[0]
      .getAttribute("objectid")!;

    const players = play.getElementsByTagName("player");
    const playerList: GeekPlayer[] = [];
    for (const element of players) {
      const player = element;
      playerList.push({
        name: player.getAttribute("name")!,
        username: player.getAttribute("username")!,
        score: player.getAttribute("score")!,
        win: player.getAttribute("win") === "1",
      });
    }

    const playData: Play = {
      date,
      length,
      players: playerList,
      incomplete,
      objectid: parseInt(objectid),
      comments,
    };

    plays.push(playData);
  }

  return plays;
};
