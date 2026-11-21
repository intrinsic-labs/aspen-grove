// Keeps the first words of the copied card text in output.chosen as a regex
// (words joined by [\s\S]*, punctuation dropped), so beta1-openrouter.yaml
// can find the chosen reply in the chat and after a relaunch, whatever the
// model wrote.
var words = String(maestro.copiedText)
  .replace(/[^A-Za-z0-9 ]+/g, ' ')
  .trim()
  .split(/\s+/)
  .slice(0, 4);
output.chosen = words.length ? '[\\s\\S]*' + words.join('[\\s\\S]*') + '[\\s\\S]*' : 'no text copied';
