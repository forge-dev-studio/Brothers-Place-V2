#!/usr/bin/env node
/**
 * Brother's Place V2 - Hero reference image generation via gpt-image-2.
 * Generates 6 hero candidates spanning 3 aesthetic directions (2 each).
 * Output: c:/Users/corey/Desktop/Brothers-Place-V2/v2-references/
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

function loadEnv(p) {
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim().replace(/^"|"$/g, "");
    if (v && !process.env[k]) process.env[k] = v;
  }
}
loadEnv("C:/Users/corey/Desktop/Forge/studio/whatsapp/.env");
loadEnv("C:/Users/corey/Desktop/Forge/.env.shared");

if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY not found");
  process.exit(1);
}

const OUT_DIR = "C:/Users/corey/Desktop/Brothers-Place-V2/v2-references";
fs.mkdirSync(OUT_DIR, { recursive: true });

const COMMON = [
  "Award-winning documentary photography. Cinematic, hyper-realistic, indistinguishable from a professional photographer.",
  "Rich tonal range, deep but never crushed shadows, top of frame naturally lit and never dark.",
  "Strictly no text, typography, letters, numbers, logos, watermarks, or recognizable brand marks.",
  "Faces partially obscured, three-quarter, side profile, or back-of-head only - never identifiable individuals.",
  "Northwest Georgia, late summer, warm humid Southern atmosphere.",
].join(" ");

const IMAGES = [
  {
    file: "01-documentary-porch.png",
    direction: "Documentary / Editorial",
    prompt:
      "Wide cinematic 3:2 hero photograph of three working-class American men of mixed ages sitting close together on the wooden front porch of a modest white clapboard craftsman house at golden hour. One older man in a flannel shirt with weathered hands rests a hand on the shoulder of a younger man who is leaning forward, head down, listening. A third man, middle-aged in a faded blue work shirt, holds a coffee mug. Tall pines in the background, warm golden side light from the west, dust in the air. Quiet brotherhood, no posing. Garden and Gun magazine editorial quality.",
  },
  {
    file: "02-documentary-workshop.png",
    direction: "Documentary / Editorial",
    prompt:
      "Wide cinematic 3:2 hero photograph of two men working side by side at a wooden workbench in a sunlit garage workshop in small-town Georgia. Older man in canvas apron is teaching the younger man to chisel a piece of wood. Sawdust catches a shaft of warm afternoon sun coming through an open garage door. Tools hung on pegboard behind. Hands and forearms hero, faces partially obscured. Honest blue-collar dignity, restoration through labor, no staging.",
  },
  {
    file: "03-cathedral-bible.png",
    direction: "Cathedral / Gravitas",
    prompt:
      "Cinematic 3:2 photograph of a single middle-aged man with weathered hands and a bowed head, sitting alone in a simple wooden church pew, an open leather Bible resting in his lap. A single shaft of warm window light cuts diagonally across the dark interior, catching dust motes and falling on his hands and the page. The rest of the room recedes into deep navy shadow. Reverent, sermon-poster gravity. The man's face is in profile and shadowed, not clearly identifiable.",
  },
  {
    file: "04-cathedral-house-dusk.png",
    direction: "Cathedral / Gravitas",
    prompt:
      "Wide cinematic 3:2 architectural photograph of a modest two-story white wooden craftsman house in a Rome Georgia residential neighborhood at blue hour, just after sunset. Every window glows warm gold from inside as if every room is occupied and lived-in. A single oak tree in the front yard. The sky is deep navy with a band of warm sunset glow at the horizon. Quiet sanctuary feel, a refuge against the dark. No people, no signage, no street numbers visible.",
  },
  {
    file: "05-hopeful-street.png",
    direction: "Hopeful / Modern Nonprofit",
    prompt:
      "Wide cinematic 3:2 lifestyle photograph of a confident middle-aged American man walking on a tree-lined sidewalk in a small Southern downtown like Rome Georgia. Mid-stride, hands in jeans pockets, clean white t-shirt and an open denim shirt, slight smile, looking forward not at camera. Bright morning sun, brick storefronts behind softly out of focus. Optimistic forward momentum, second-chance energy. Charity Water or Compassion International editorial style. Face is three-quarter angle and not focused as the recognizable subject.",
  },
  {
    file: "06-hopeful-circle.png",
    direction: "Hopeful / Modern Nonprofit",
    prompt:
      "Wide cinematic 3:2 photograph of a small group of six American men of mixed ages and races sitting in a loose circle in folding chairs in a bright community room with large warehouse windows behind them. One man is mid-sentence, gesturing with open hands. The others lean in, listening. Coffee mugs, a worn Bible on the floor near someone's boot. Soft natural daylight floods from behind, no harsh artificial light. Authentic group recovery moment, hopeful but grounded. Faces are not the focus, captured from a low angle behind the listeners.",
  },
];

function generate(item) {
  const body = JSON.stringify({
    model: "gpt-image-2",
    prompt: item.prompt + " " + COMMON,
    size: "1536x1024",
    n: 1,
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.openai.com",
        path: "/v1/images/generations",
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
        timeout: 240000,
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          if (res.statusCode !== 200) {
            return reject(new Error(`${item.file} HTTP ${res.statusCode}: ${text.slice(0, 400)}`));
          }
          try {
            const j = JSON.parse(text);
            const b64 = j.data && j.data[0] && j.data[0].b64_json;
            if (!b64) return reject(new Error(`${item.file} no b64 in response: ${text.slice(0, 200)}`));
            const buf = Buffer.from(b64, "base64");
            const outPath = path.join(OUT_DIR, item.file);
            fs.writeFileSync(outPath, buf);
            console.log(`OK  ${item.file}  ${(buf.length / 1024).toFixed(0)}KB  [${item.direction}]`);
            resolve(outPath);
          } catch (e) {
            reject(new Error(`${item.file} parse: ${e.message}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.on("timeout", () => req.destroy(new Error(`${item.file} timeout`)));
    req.write(body);
    req.end();
  });
}

(async () => {
  console.log(`Generating ${IMAGES.length} hero candidates -> ${OUT_DIR}`);
  const t0 = Date.now();
  const results = await Promise.allSettled(IMAGES.map(generate));
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  let ok = 0;
  results.forEach((r, i) => {
    if (r.status === "fulfilled") ok++;
    else console.error(`FAIL ${IMAGES[i].file}: ${r.reason.message}`);
  });
  console.log(`\n${ok}/${IMAGES.length} succeeded in ${elapsed}s`);
  process.exit(ok === IMAGES.length ? 0 : 1);
})();
