// Returns a date object from a date and time string
// "11/01/2021 at 12:34" OR "2021/11/01 at 12:34", dependant on a setting in BGA
// "today at 12:37"
// "23 minutes ago"
export const parseDateAndTime = (dateAndTimeString: string) => {
  const MS_PER_MINUTE = 60000;
  const MS_PER_HOUR = MS_PER_MINUTE * 60;
  let [dateString, timeString] = String(dateAndTimeString).split(" at ");
  const xMinsAgoRegex = /(\d\d?) minutes? ago/i;
  const xHoursAgoRegex = /(\d) hours? ago/i;

  let year = "";
  let month = "";
  let day = "";
  if (dateString === "today") {
    let now = new Date();
    day = now.getDate().toString();
    month = (now.getMonth() + 1).toString();
    year = now.getFullYear().toString();
  } else if (dateString === "yesterday") {
    let yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    day = yesterday.getDate().toString();
    month = (yesterday.getMonth() + 1).toString();
    year = yesterday.getFullYear().toString();
  } else if (xMinsAgoRegex.exec(dateString)) {
    const minsAgo = Number(xMinsAgoRegex.exec(dateString)![1]);
    let now = new Date(new Date().valueOf() - minsAgo * MS_PER_MINUTE);
    return now;
  } else if (xHoursAgoRegex.exec(dateString)) {
    const hoursAgo = Number(xHoursAgoRegex.exec(dateString)![1]);
    let now = new Date(new Date().valueOf() - hoursAgo * MS_PER_HOUR);
    return now;
  } else if (dateString === "one hour ago") {
    let now = new Date(new Date().valueOf() - 1 * MS_PER_HOUR);
    return now;
  } else {
    //[month, day, year] = dateString.split("/");
    [year, month, day] = dateString.split("-");
  }

  let [hour, minute] = timeString.split(":");

  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute)
  );
};
