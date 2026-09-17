/**
 * Applied before/after `npx cap sync ios`. Safe to re-run. Does not contain secrets.
 * Also sets Podfile `platform :ios` to 15.0 so Capacitor 8 CocoaPods resolve.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const infoPlist = path.join(root, "ios", "App", "App", "Info.plist");
const podfilePath = path.join(root, "ios", "App", "Podfile");
const IOS_MIN = "15.0";
const privacySrc = path.join(root, "native", "ios", "PrivacyInfo.xcprivacy");
const privacyDest = path.join(root, "ios", "App", "App", "PrivacyInfo.xcprivacy");
const contentsJsonDest = path.join(
  root,
  "ios",
  "App",
  "App",
  "Assets.xcassets",
  "AppIcon.appiconset",
  "Contents.json",
);
const iconDest = path.join(
  root,
  "ios",
  "App",
  "App",
  "Assets.xcassets",
  "AppIcon.appiconset",
  "AppIcon-1024.png",
);
const iconSrc = path.join(root, "native", "ios", "AppIcon-1024.png");
const pluginSrc = path.join(root, "native", "ios", "PlusStorePlugin.swift");
const pluginDest = path.join(root, "ios", "App", "App", "PlusStorePlugin.swift");

const USAGE = {
  NSCameraUsageDescription:
    "Last Storyteller uses the camera so you can record a video story.",
  NSMicrophoneUsageDescription:
    "Last Storyteller uses the microphone so you can record video stories and use voice typing.",
  NSPhotoLibraryUsageDescription:
    "Last Storyteller lets you attach photos and videos you already have to a story.",
  NSPhotoLibraryAddUsageDescription:
    "Last Storyteller only reads photos and videos you choose to attach. It does not save to your library.",
};

function upsertPlistString(plist, key, value) {
  const entry = `\t<key>${key}</key>\n\t<string>${value}</string>\n`;
  const re = new RegExp(
    `\\t<key>${key}</key>\\s*<string>[\\s\\S]*?<\\/string>\\n`,
  );
  if (re.test(plist)) return plist.replace(re, entry);
  return plist.replace("</dict>\n</plist>", `${entry}</dict>\n</plist>`);
}

function assertAppStoreIcon(filePath) {
  const buf = fs.readFileSync(filePath);
  const isPng = buf.length >= 26 && buf[0] === 0x89 && buf[1] === 0x50;
  if (!isPng) {
    console.error(`App Store icon is not a PNG: ${filePath}`);
    process.exit(1);
  }
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const colorType = buf[25];
  if (width !== 1024 || height !== 1024) {
    console.error(
      `App Store icon must be 1024x1024, got ${width}x${height}: ${filePath}`,
    );
    process.exit(1);
  }
  // PNG color type 2 = RGB. Type 6 = RGBA; Apple drops/rejects that 1024 slot.
  if (colorType !== 2) {
    console.error(
      `App Store icon must be RGB with no alpha channel (PNG color type 2). Got ${colorType}: ${filePath}`,
    );
    process.exit(1);
  }
}

function installAppIcon() {
  if (!fs.existsSync(iconSrc)) {
    console.error(
      `Missing ${iconSrc}. App Store Connect will not show an icon without a 1024x1024 RGB PNG.`,
    );
    process.exit(1);
  }
  assertAppStoreIcon(iconSrc);
  fs.mkdirSync(path.dirname(iconDest), { recursive: true });
  fs.copyFileSync(iconSrc, iconDest);
  const placeholder = path.join(path.dirname(iconDest), "AppIcon-512@2x.png");
  if (fs.existsSync(placeholder)) fs.unlinkSync(placeholder);
  fs.writeFileSync(
    contentsJsonDest,
    `${JSON.stringify(
      {
        images: [
          {
            filename: "AppIcon-1024.png",
            idiom: "universal",
            platform: "ios",
            size: "1024x1024",
          },
        ],
        info: { author: "xcode", version: 1 },
      },
      null,
      2,
    )}\n`,
  );
}

function upsertPlistFalse(plist, key) {
  const entry = `\t<key>${key}</key>\n\t<false/>\n`;
  const re = new RegExp(`\\t<key>${key}</key>\\s*<(true|false)/>\\n`);
  if (re.test(plist)) return plist.replace(re, entry);
  return plist.replace("</dict>\n</plist>", `${entry}</dict>\n</plist>`);
}

function ensurePodfileIosMin() {
  if (!fs.existsSync(podfilePath)) return;
  const text = fs.readFileSync(podfilePath, "utf8");
  const next = text.replace(
    /platform :ios, ['"][\d.]+['"]/,
    `platform :ios, '${IOS_MIN}'`,
  );
  if (next !== text) {
    fs.writeFileSync(podfilePath, next);
    console.log(`Set Podfile platform to iOS ${IOS_MIN} (required by Capacitor 8).`);
  }
}

ensurePodfileIosMin();

if (!fs.existsSync(infoPlist)) {
  console.error("ios/App/App/Info.plist not found. Run npx cap add ios first (Codemagic does this).");
  process.exit(1);
}

let plist = fs.readFileSync(infoPlist, "utf8");
for (const [key, value] of Object.entries(USAGE)) {
  plist = upsertPlistString(plist, key, value);
}
plist = upsertPlistFalse(plist, "ITSAppUsesNonExemptEncryption");
plist = upsertPlistString(plist, "CFBundleIconName", "AppIcon");
fs.writeFileSync(infoPlist, plist);

if (fs.existsSync(privacySrc)) {
  fs.copyFileSync(privacySrc, privacyDest);
}

if (fs.existsSync(pluginSrc)) {
  fs.copyFileSync(pluginSrc, pluginDest);
}

installAppIcon();

console.log("Patched iOS Info.plist, PrivacyInfo.xcprivacy, PlusStore plugin, and AppIcon.");
