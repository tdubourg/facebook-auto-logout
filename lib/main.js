let {Cc, Ci} = require("chrome");
let tabs = require("tabs");
let {data} = require("self");
let timers = require("timers");
let pagemod = require("page-mod");
let notifications = require("notifications");

let obs = require("api-utils/observer-service");
let {MatchPattern} = require("api-utils/match-pattern");

// TODO make pref
const LOGOUT_DELAY = 5 * 1000;

const URL_PATTERN = "*.facebook.com";
const NOTIFY_TITLE = "Facebook Auto-Logout";
const NOTIFY_TEXT = "You have been logged out of Facebook.";

let timeout;
let pattern = new MatchPattern(URL_PATTERN);

// TODO
pagemod.PageMod({
  include: URL_PATTERN,
  contentScriptWhen: "start",
  contentScriptFile: data.url("pagemod.js"),
  onAttach: function onAttach(worker) {
    worker.port.on("unload", startLogoutTimer);
    cancelLogoutTimer();
  }
});

// TODO
tabs.on("close", function onClose(tab) {
  // a non-facebook tab got closed
  if (!pattern.test(tab.url))
    return;

  startLogoutTimer();
});

// TODO
obs.add("quit-application-granted", removeCookies);

// TODO
function cancelLogoutTimer() {
  if (timeout)
    timeout = timers.clearTimeout(timeout);
}

// TODO
function startLogoutTimer() {
  cancelLogoutTimer();
  timeout = timers.setTimeout(logout, LOGOUT_DELAY);
}

// TODO
function logout() {
  timeout = null;

  // don't logout if there's a tab still active
  for each (var tab in tabs)
    if (pattern.test(tab.url))
      return;

  removeCookies();

  // TODO pref to make this optional
  notifications.notify({title: NOTIFY_TITLE, text: NOTIFY_TEXT});
}

// TODO
function removeCookies() {
  let cm = Cc["@mozilla.org/cookiemanager;1"]
           .getService(Ci.nsICookieManager2);

  let cookies = cm.getCookiesFromHost("facebook.com");

  while (cookies.hasMoreElements()) {
    let cookie = cookies.getNext().QueryInterface(Ci.nsICookie);
    cm.remove(cookie.host, cookie.name, cookie.path, false);
  }
}
