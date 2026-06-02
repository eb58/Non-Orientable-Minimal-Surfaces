const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const escapeScriptText = text => text.replaceAll("</script", "<\\/script");
const blockList = (source, startsWith) => source
  .split(/\r?\n/)
  .reduce((state, line) => {
    if (state.collecting) {
      state.lines.push(line);
      state.collecting = !line.trimEnd().endsWith(";");
      return state;
    }
    if (line.startsWith(startsWith)) {
      state.lines.push(line);
      state.collecting = !line.trimEnd().endsWith(";");
    }
    return state;
  }, { lines: [], collecting: false })
  .lines.join("\n");
const removeBlocks = (source, startsWith) => source
  .split(/\r?\n/)
  .reduce((state, line) => {
    if (state.skipping) {
      state.skipping = !line.trimEnd().endsWith(";");
      return state;
    }
    if (line.startsWith(startsWith)) {
      state.skipping = !line.trimEnd().endsWith(";");
      return state;
    }
    state.lines.push(line);
    return state;
  }, { lines: [], skipping: false })
  .lines.join("\n");
const removeImport = source => removeBlocks(source, "import ");
const removeExports = source => removeBlocks(source, "export {");
const binding = value => value.trim().split(/\s+as\s+/);
const bindings = value => value
  .split(",")
  .map(item => item.trim())
  .filter(Boolean)
  .map(item => {
    const parts = binding(item);
    return { local: parts[0], exported: parts[1] || parts[0] };
  });
const exportBindings = (source, includeReexports = true) => [...source.matchAll(/export \{([\s\S]*?)\}( from [^;]+)?;/g)]
  .filter(match => includeReexports || !match[2])
  .flatMap(match => bindings(match[1]));
const importBindings = source => bindings(blockList(source, "import ").match(/\{([\s\S]*?)\}/)[1]);
const objectLiteral = exports => exports.map(item => item.local === item.exported ? item.local : `${item.exported}: ${item.local}`).join(", ");
const destructure = exports => exports.map(item => item.exported).join(", ");
const bundleThreeCore = source => [
  "const __threeCore = (() => {",
  removeExports(source),
  `return { ${objectLiteral(exportBindings(source))} };`,
  "})();"
].join("\n");
const bundleThree = source => [
  "const __threeModule = ((__core) => {",
  `const { ${destructure(importBindings(source))} } = __core;`,
  removeExports(removeImport(source)),
  `return { ${objectLiteral(exportBindings(source, false))} };`,
  "})(__threeCore);",
  "const THREE = { ...__threeCore, ...__threeModule };"
].join("\n");
const bundleOrbitControls = source => [
  "const __orbitControls = ((__three) => {",
  `const { ${destructure(importBindings(source))} } = __three;`,
  removeExports(removeImport(source)),
  "return { OrbitControls };",
  "})(THREE);",
  "const { OrbitControls } = __orbitControls;"
].join("\n");
const bundleComplex = source => source
  .replace("export const cops", "const cops")
  .replace("export const C$", "const C$");
const bundleMain = source => {
  const body = source.replace(/^import .*;\r?\n/gm, "");
  return body;
};
const bundle = () => [
  bundleThreeCore(read("vendor/three/three.core.js")),
  bundleThree(read("vendor/three/three.module.js")),
  bundleOrbitControls(read("vendor/three/addons/controls/OrbitControls.js")),
  bundleComplex(read("vendor/complex/c-dollar.js")),
  bundleMain(read("main.js"))
].join("\n\n");

const css = read("styles.css");
const html = read("index.html")
  .replace(/<link rel="stylesheet" href="styles\.css">\s*/, `<style>\n${css}\n</style>\n`)
  .replace(/<script type="importmap">[\s\S]*?<\/script>\s*/, "")
  .replace(
    /<script type="module" src="main\.js"><\/script>/,
    () => `<script type="module">\n${escapeScriptText(bundle())}\n</script>`
  );

fs.writeFileSync(path.join(root, "standalone.html"), html);
