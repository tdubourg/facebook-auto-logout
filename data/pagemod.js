addEventListener("unload", function onUnload() {
  removeEventListener("unload", onUnload, false);
  self.port.emit("unload");
}, false);
