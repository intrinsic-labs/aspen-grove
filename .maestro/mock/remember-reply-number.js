// Keeps the "Mock reply #n" that opens the copied card text in output.chosen,
// so parallel-continuations.yaml can find the chosen reply after a relaunch.
var found = String(maestro.copiedText).match(/Mock reply #\d+/);
output.chosen = found ? found[0] : 'no reply number in: ' + maestro.copiedText;
