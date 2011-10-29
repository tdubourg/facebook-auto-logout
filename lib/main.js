let tabs = require("tabs");
let {data} = require("self");
let timers = require("timers");
let pagemod = require("page-mod");
let {Cc, Ci} = require("chrome");

let obs = require("api-utils/observer-service");
let prefs = require("api-utils/preferences-service");
let {MatchPattern} = require("api-utils/match-pattern");

/* :::::::: Constants ::::::::::::::: */

const URL_PATTERN = "*.facebook.com";
const NOTIFY_TITLE = "Facebook Auto-Logout";
const NOTIFY_TEXT = "You have been logged out of Facebook";

/* :::::::: Preferences ::::::::::::::: */

const PREF_DELAY = "extensions.fbautologout.delay";
const PREF_DELAY_DEFAULT = 60;

const PREF_NOTIFY = "extensions.fbautologout.notify";
const PREF_NOTIFY_DEFAULT = true;

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
      worker.port.on("unload", startLogoutTimer);
      cancelLogoutTimer();
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

  if (!prefs.has(PREF_DELAY))
    prefs.set(PREF_DELAY, prefs.get(PREF_DELAY, PREF_DELAY_DEFAULT));

  if (!prefs.has(PREF_NOTIFY))
    prefs.set(PREF_NOTIFY, prefs.get(PREF_NOTIFY, PREF_NOTIFY_DEFAULT));
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

  let delay = Math.max(0, prefs.get(PREF_DELAY, PREF_DELAY_DEFAULT));
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

  if (wasLoggedIn && prefs.get(PREF_NOTIFY, PREF_NOTIFY_DEFAULT)) {
    let notifications = require("notifications");
    notifications.notify({title: NOTIFY_TITLE, text: NOTIFY_TEXT});
  }
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
