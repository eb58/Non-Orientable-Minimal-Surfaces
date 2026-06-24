const raw = "https://raw.githubusercontent.com/eb58/algorithms-js/master/src/complex";

const blobImport = async url => {
  const text = await fetch(url).then(r => r.text());
  return import(URL.createObjectURL(new Blob([text], { type: "text/javascript" })));
};

await blobImport(`${raw}/cops.js`);
await blobImport(`${raw}/tokenizer.js`);

const complexText = await fetch(`${raw}/complex.js`).then(r => r.text());
const { C$ } = await import(
  URL.createObjectURL(new Blob([`${complexText}\nexport { C$ }`], { type: "text/javascript" }))
);

export { C$ };
export const cops = globalThis.cops;
