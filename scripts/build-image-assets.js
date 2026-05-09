#!/usr/bin/env node
/**
 * Brother's Place V2 - build the full image asset set.
 *
 * Steps:
 *  1. Generate 6 supplemental hero candidates via gpt-image-2 (1536x1024).
 *  2. Copy + crop the 6 locked v2-references into named hero JPEGs.
 *  3. Compose the 1200x630 OG image from the dusk-house hero.
 *
 * Output: c:/Users/corey/Desktop/Brothers-Place-V2/images/
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const sharp = require("sharp");

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
  console.error("OPENAI_API_KEY missing");
  process.exit(1);
}

const ROOT = "C:/Users/corey/Desktop/Brothers-Place";
const IMAGES_DIR = path.join(ROOT, "images");
const REFS_DIR = path.join(ROOT, "v2-references");
fs.mkdirSync(IMAGES_DIR, { recursive: true });

const COMMON = [
  "Award-winning documentary photography. Cinematic, hyper-realistic, indistinguishable from a professional photographer.",
  "Rich tonal range, deep but never crushed shadows, top of frame naturally lit and never dark.",
  "Strictly no text, typography, letters, numbers, logos, watermarks, or recognizable brand marks.",
  "Faces partially obscured, three-quarter, side profile, or back-of-head only - never identifiable individuals.",
  "Northwest Georgia, late summer, warm humid Southern atmosphere.",
].join(" ");

const SUPPLEMENTAL = [
  {
    file: "raw-hero-about-our-story.png",
    prompt:
      "Wide cinematic 3:2 architectural photograph of the same modest two-story white wooden craftsman house in a Rome Georgia residential neighborhood, but in late afternoon golden hour daylight. Single oak tree in the front yard, hydrangeas blooming along the porch, an American flag hanging by the door. Welcoming, dignified, lived-in. No people, no signage.",
  },
  {
    file: "raw-hero-case-management.png",
    prompt:
      "Wide cinematic 3:2 photograph of two pairs of hands across a wooden desk in a sunlit office. The case manager's hands are gesturing toward a file folder, pen in hand, while the client's hands rest folded on the desk in front of him. Soft window light from the left. Warm, professional, supportive. Hands and papers only, no faces visible. Documentary style.",
  },
  {
    file: "raw-hero-get-help.png",
    prompt:
      "Wide cinematic 3:2 interior photograph of a warm modest living room in the Maple Street home: a worn leather sofa, a side table with a Bible and a coffee mug, light streaming through gauzy curtains in late afternoon. A man's silhouette is barely visible in profile sitting on the sofa, looking out the window. Quiet refuge feel. Faces not visible.",
  },
  {
    file: "raw-hero-volunteer.png",
    prompt:
      "Wide cinematic 3:2 photograph of three pairs of hands serving food in a bright community kitchen: spooning casserole onto a plate, ladling soup, slicing bread on a wooden cutting board. Aprons, flour-dusted forearms, warm overhead light. Hands and forearms only, no faces. Honest service, joyful labor.",
  },
  {
    file: "raw-hero-church-partners.png",
    prompt:
      "Wide cinematic 3:2 photograph of a small white wooden Southern Baptist style church with a simple steeple, set in rolling Northwest Georgia countryside at golden hour. Soft golden side light, long shadows from a single oak in the churchyard, gravel parking lot empty. Reverent, welcoming, small-town. No people, no signage that names a denomination.",
  },
  {
    file: "raw-hero-events.png",
    prompt:
      "Wide cinematic 3:2 photograph of a small outdoor gathering on a grassy lawn in front of a Southern home: folding tables draped with linen, a cooler, a plate of barbecue, lawn chairs in a loose ring, string lights strung between trees, warm late afternoon light. A few backs of people visible from a distance, none identifiable. Hopeful community gathering.",
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
            if (!b64) return reject(new Error(`${item.file} no b64`));
            const buf = Buffer.from(b64, "base64");
            const outPath = path.join(REFS_DIR, item.file);
            fs.writeFileSync(outPath, buf);
            console.log(`OK  generate ${item.file}  ${(buf.length / 1024).toFixed(0)}KB`);
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

// hero output JPEGs (1920x1280, q82)
async function writeHero(srcPath, outName) {
  const outPath = path.join(IMAGES_DIR, outName);
  await sharp(srcPath)
    .resize({ width: 1920, height: 1280, fit: "cover", position: "center" })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(outPath);
  const stats = fs.statSync(outPath);
  console.log(`OK  hero    ${outName}  ${(stats.size / 1024).toFixed(0)}KB`);
}

// 1200x630 OG image, cropped intelligently from any source. Targets ratio 1.905.
async function writeOG(srcPath, outName) {
  const outPath = path.join(IMAGES_DIR, outName);
  const meta = await sharp(srcPath).metadata();
  const targetRatio = 1200 / 630; // ~1.9048
  const srcRatio = meta.width / meta.height;
  let cropW, cropH, cropL, cropT;
  if (srcRatio > targetRatio) {
    // source is wider than target -> crop horizontally
    cropH = meta.height;
    cropW = Math.floor(meta.height * targetRatio);
    cropT = 0;
    cropL = Math.floor((meta.width - cropW) / 2);
  } else {
    // source is taller than target -> crop vertically (keep top 60% so sky + house stay)
    cropW = meta.width;
    cropH = Math.floor(meta.width / targetRatio);
    cropL = 0;
    cropT = Math.floor((meta.height - cropH) * 0.4); // keep more of the upper portion
  }
  await sharp(srcPath)
    .extract({ left: cropL, top: cropT, width: cropW, height: cropH })
    .resize({ width: 1200, height: 630 })
    .jpeg({ quality: 85, mozjpeg: true })
    .toFile(outPath);
  const stats = fs.statSync(outPath);
  console.log(`OK  og      ${outName}  ${(stats.size / 1024).toFixed(0)}KB  (src ${meta.width}x${meta.height} -> crop ${cropW}x${cropH})`);
}

(async () => {
  const t0 = Date.now();

  // Step 1: generate 6 supplemental in parallel
  console.log("[1/3] Generating 6 supplemental heroes via gpt-image-2 ...");
  const genResults = await Promise.allSettled(SUPPLEMENTAL.map(generate));
  let genOk = 0;
  genResults.forEach((r, i) => {
    if (r.status === "fulfilled") genOk++;
    else console.error(`FAIL gen ${SUPPLEMENTAL[i].file}: ${r.reason.message}`);
  });
  if (genOk !== SUPPLEMENTAL.length) {
    console.error(`\n${genOk}/${SUPPLEMENTAL.length} generated. Aborting.`);
    process.exit(1);
  }

  // Step 2: build named hero JPEGs from sources
  console.log("\n[2/3] Composing optimized hero JPEGs ...");
  const heroMap = [
    // home hero is the locked dusk house
    { src: "04-cathedral-house-dusk.png",     out: "hero-home.jpg" },
    // supplemental heroes (just generated)
    { src: "raw-hero-about-our-story.png",    out: "hero-about-our-story.jpg" },
    { src: "raw-hero-case-management.png",    out: "hero-case-management.jpg" },
    { src: "raw-hero-get-help.png",           out: "hero-get-help.jpg" },
    { src: "raw-hero-volunteer.png",          out: "hero-volunteer.jpg" },
    { src: "raw-hero-church-partners.png",    out: "hero-church-partners.jpg" },
    { src: "raw-hero-events.png",             out: "hero-events.jpg" },
    // reused references
    { src: "06-hopeful-circle.png",           out: "hero-supportive-housing.jpg" },
    { src: "03-cathedral-bible.png",          out: "hero-spiritual-formation.jpg" },
    { src: "03-cathedral-bible.png",          out: "hero-faith-foundation.jpg" },
    { src: "02-documentary-workshop.png",     out: "hero-reintegration-and-jobs.jpg" },
    { src: "01-documentary-porch.png",        out: "hero-donate.jpg" },
    { src: "01-documentary-porch.png",        out: "hero-stories.jpg" },
  ];
  for (const m of heroMap) {
    const srcPath = path.join(REFS_DIR, m.src);
    if (!fs.existsSync(srcPath)) {
      console.error(`MISSING source: ${srcPath}`);
      process.exit(1);
    }
    await writeHero(srcPath, m.out);
  }

  // Step 3: OG image
  console.log("\n[3/3] Composing 1200x630 OG ...");
  await writeOG(path.join(REFS_DIR, "04-cathedral-house-dusk.png"), "og-default.jpg");

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\nDone in ${elapsed}s. Output: ${IMAGES_DIR}`);
})();
