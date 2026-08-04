const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const virtualConsole = new jsdom.VirtualConsole();
virtualConsole.on("error", () => { console.log("Error:", ...arguments); });
virtualConsole.on("warn", () => { console.log("Warn:", ...arguments); });
virtualConsole.on("info", () => { console.log("Info:", ...arguments); });
virtualConsole.on("dir", () => { console.log("Dir:", ...arguments); });
virtualConsole.on("log", () => { console.log("Log:", ...arguments); });
virtualConsole.on("jsdomError", (e) => { console.log("JSDOM Error:", e); });

JSDOM.fromURL("http://localhost:3000/", {
  runScripts: "dangerously",
  resources: "usable",
  virtualConsole
}).then(dom => {
  setTimeout(() => {
    console.log("HTML length after 3s:", dom.window.document.body.innerHTML.length);
    process.exit(0);
  }, 3000);
}).catch(console.error);
