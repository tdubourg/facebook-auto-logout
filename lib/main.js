let tabs = require("tabs");
let {data} = require("self");
let timers = require("timers");
let {prefs} = require("simple-prefs");
let pagemod = require("page-mod");
let {Cc, Ci} = require("chrome");
let notifications = require("notifications");

let obs = require("api-utils/observer-service");
let {MatchPattern} = require("api-utils/match-pattern");

/* :::::::: Constants ::::::::::::::: */

const URL_PATTERN = "*.facebook.com";
const NOTIFY_TITLE = "Facebook Auto-Logout";
const NOTIFY_TEXT = "You have been logged out of Facebook";

/* :::::::: Load + Unload ::::::::::::::: */

let timeout;
let pattern;
let cookieManager;

exports.main = function () {
  pagemod.PageMod({
    include: URL_PATTERN,
    contentScriptWhen: "start",
    contentScriptFile: data.url("pagemod.js"),
    onAttach: function onAttach(worker) {
      worker.port.on("load", function () {
        cancelLogoutTimer();
        worker.port.on("unload", startLogoutTimer);
      });
    }
  });

  tabs.on("close", function onClose(tab) {
    if (pattern.test(tab.url))
      startLogoutTimer();
  });

  obs.add("quit-application-granted", removeCookies);

  pattern = new MatchPattern(URL_PATTERN);
  cookieManager = Cc["@mozilla.org/cookiemanager;1"]
                  .getService(Ci.nsICookieManager2);
};

exports.onUnload = function () {
  obs.remove("quit-application-granted", removeCookies);
}

/* :::::::: Functions ::::::::::::::: */

function cancelLogoutTimer() {
  if (timeout)
    timeout = timers.clearTimeout(timeout);
}

function startLogoutTimer() {
  cancelLogoutTimer();

  let delay = Math.max(0, prefs.delay);
  timeout = timers.setTimeout(logout, delay * 1000);
}

function logout() {
  timeout = null;

  // don't logout if there's a fb tab still active
  for each (var tab in tabs)
    if (pattern.test(tab.url))
      return;

  let wasLoggedIn = isLoggedIn();
  removeCookies();

  if (wasLoggedIn && prefs.notify)
    notifications.notify({title: NOTIFY_TITLE, text: NOTIFY_TEXT});
}

function isLoggedIn() {
  return getCookies().some(function (c) c.name == "c_user");
}

function removeCookies() {
  getCookies().forEach(removeCookie);
}

function removeCookie(aCookie) {
  cookieManager.remove(aCookie.host, aCookie.name, aCookie.path, false);
}

function getCookies() {
  let cookies = cookieManager.getCookiesFromHost("facebook.com");
  let retval = [];

  while (cookies.hasMoreElements())
    retval.push(cookies.getNext().QueryInterface(Ci.nsICookie));

  return retval;
}
