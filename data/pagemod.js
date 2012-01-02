addEventListener("DOMContentLoaded", function onLoad() {
  removeEventListener("DOMContentLoaded", onLoad, false);

  if (location != parent.location)
    self.port.emit("load");
});

addEventListener("unload", function onUnload() {
  removeEventListener("unload", onUnload, false);
  self.port.emit("unload");
}, false);
