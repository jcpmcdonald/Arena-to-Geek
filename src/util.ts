export const log = (...data: any[]) => {
  if (process.env.NODE_ENV === "development") {
    // c-spell:disable-next-line
    console.log(...data);
  }
};

export const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const waitForElementToDisplay = async (
  selector: string,
  time: number
) => {
  log("Waiting for element to display:", selector, document);
  let element = document.querySelector(selector);
  while (element === null) {
    log("Element not found, waiting:", selector, document);
    await sleep(time);
    element = document.querySelector(selector);
  }
  log("Element found:", selector);
  return Promise.resolve();
};
