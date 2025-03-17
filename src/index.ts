import { log } from "./util";
import { attachToGamesHistoryPage } from "./pages/gamesHistoryPage";
import { attachToPlayerPage } from "./pages/playerPage";
import { attachToGameEndPage } from "./pages/tablePage";

// Memory
export const arenaToGeekPlayerNames: { [key: string]: string } = JSON.parse(
  GM_getValue("arenaToGeekPlayerNames", "{}")
);
// export const alreadyRecordedTables: { [key: string]: string } = JSON.parse(
//   GM_getValue("alreadyRecordedTables", "{}")
// );
// export const arenaGameNameToBggId: { [key: string]: string } = JSON.parse(
//   GM_getValue("arenaGameNameToBggId", "{}")
// );

export const DEBUG = true;
export const shouldActuallyRecord = false;
const BGG_USERNAME = "jcpmcdonald";

// export const setBggIdForGame = (arenaGameName: string, bggId: string) => {
//   arenaGameNameToBggId[arenaGameName] = bggId.trim();
//   GM_setValue("arenaGameNameToBggId", JSON.stringify(arenaGameNameToBggId));
// };

// To clear out a specific play, clear it with this:
// const forgetTableAsRecorded = (tableNumber: string) => {
//   tableNumber = tableNumber.replace(/^#/, "");
//   delete alreadyRecordedTables[tableNumber];
//   GM_setValue("alreadyRecordedTables", JSON.stringify(alreadyRecordedTables));
// };

async function locationChanged(location: string) {
  log("location changed!", location);
  if (location.startsWith("https://boardgamearena.com/gamestats")) {
    await attachToGamesHistoryPage();
  } else if (location.startsWith("https://boardgamearena.com/player")) {
    await attachToPlayerPage();
  } else if (
    // https://boardgamearena.com/6/shutthebox?table=645021291
    /https:\/\/boardgamearena\.com\/\d+\/\w+\?table=\d+/.test(location)
  ) {
    await attachToGameEndPage();
  }
}

async function main() {
  "use strict";

  (() => {
    let oldPushState = history.pushState;
    history.pushState = function pushState() {
      log("pushstate", arguments);
      // @ts-expect-error
      let ret = oldPushState.apply(this, arguments);
      // window.dispatchEvent(new Event("pushstate"));
      window.dispatchEvent(new Event("locationchange"));
      return ret;
    };

    let oldReplaceState = history.replaceState;
    history.replaceState = function replaceState() {
      log("replacestate", arguments);
      // @ts-expect-error
      let ret = oldReplaceState.apply(this, arguments);
      // window.dispatchEvent(new Event("replacestate"));
      window.dispatchEvent(new Event("locationchange"));
      return ret;
    };

    window.addEventListener("popstate", () => {
      log("popstate");
      window.dispatchEvent(new Event("locationchange"));
    });
  })();

  window.addEventListener("locationchange", async function () {
    // log("location changed!", window.location.href);
    log("location changed!");
    await locationChanged(window.location.href);
  });

  // Only works in chrome
  // window.navigation.addEventListener("navigate", (event) => {
  //   console.log("location changed!");
  // });

  // Initial run
  await locationChanged(window.location.href);
}

main();
