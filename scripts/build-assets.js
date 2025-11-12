const { build } = require("esbuild");
const { transform } = require("lightningcss");
const fs = require("fs");

async function buildJS() {
  await build({
    entryPoints: ["script.source.js"],
    outfile: "script.js",
    bundle: false,
    minify: true,
    format: "iife",
    target: ["es2019"],
    legalComments: "none",
    banner: {
      js: "/* Build from script.source.js — execute npm run build:assets */",
    },
    platform: "browser",
  });
}

function buildCSS() {
  const source = fs.readFileSync("styles.source.css", "utf8");
  const { code } = transform({
    filename: "styles.source.css",
    code: Buffer.from(source),
    minify: true,
  });
  fs.writeFileSync("styles.css", code);
}

async function run() {
  await buildJS();
  buildCSS();
  console.log("Assets minificados gerados.");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
