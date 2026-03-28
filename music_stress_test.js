const path = require("path");
const { chromium } = require("playwright");

async function readMusicState(page, label) {
  const state = await page.evaluate(() => {
    const music = document.getElementById("bgMusic");
    return {
      currentTime: Number(music.currentTime.toFixed(3)),
      duration: Number((music.duration || 0).toFixed(3)),
      paused: music.paused,
      volume: Number(music.volume.toFixed(3)),
      readyState: music.readyState,
      level: document.getElementById("lvlNum").textContent,
      overlayHidden: document.getElementById("overlay").classList.contains("hidden"),
    };
  });
  console.log(`${label}: ${JSON.stringify(state)}`);
  return state;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const fileUrl = "file:///" + path.resolve(__dirname, "Opre.html").replace(/\\/g, "/");

  await page.goto(fileUrl);
  await page.waitForLoadState("load");

  await page.click("#playBtn");
  await page.waitForTimeout(2000);
  const startState = await readMusicState(page, "after play");

  await page.evaluate(() => openLevelSelect());
  await page.waitForSelector("#levelSelect:not(.hidden)");
  await page.locator("#levelGrid .level-btn").nth(9).click();
  await page.waitForTimeout(600);
  const jumpState = await readMusicState(page, "after jump to level 10");

  await page.waitForTimeout(1500);
  const postJumpState = await readMusicState(page, "1.5s later on level 10");

  await page.evaluate(() => {
    const setSlider = (id, value) => {
      const el = document.getElementById(id);
      el.value = String(value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    };
    setSlider("masterVolume", 70);
    setSlider("musicVolume", 35);
    setSlider("sfxVolume", 55);
  });
  const sliderState = await page.evaluate(() => ({
    master: document.getElementById("masterVolumeValue").textContent,
    music: document.getElementById("musicVolumeValue").textContent,
    sfx: document.getElementById("sfxVolumeValue").textContent,
    bgVolume: document.getElementById("bgMusic").volume,
  }));
  console.log(`after sliders: ${JSON.stringify(sliderState)}`);

  await page.evaluate(() => winGame());
  await page.waitForTimeout(300);
  const winOverlay = await page.evaluate(() => ({
    playText: document.getElementById("playBtn").textContent,
    skipText: document.getElementById("skipBtn").textContent,
    overlayHidden: document.getElementById("overlay").classList.contains("hidden"),
  }));
  console.log(`win overlay: ${JSON.stringify(winOverlay)}`);

  await page.keyboard.press("Enter");
  await page.waitForTimeout(600);
  const restartState = await readMusicState(page, "after Enter on win screen");

  const failures = [];
  if (startState.paused) failures.push("music did not start on Play");
  if (jumpState.currentTime > 1.2) failures.push("music did not reset near start after level jump");
  if (postJumpState.currentTime <= jumpState.currentTime) failures.push("music did not keep advancing after level jump");
  if (sliderState.master !== "70%" || sliderState.music !== "35%" || sliderState.sfx !== "55%") failures.push("slider labels did not update");
  if (winOverlay.playText.indexOf("PLAY AGAIN") === -1) failures.push("win screen did not expose Play Again");
  if (winOverlay.skipText.indexOf("Choose Level") === -1) failures.push("win screen did not expose Choose Level");
  if (restartState.level !== "1") failures.push("Enter on win screen did not restart to level 1");
  if (restartState.paused) failures.push("music was paused after restart from win screen");

  await browser.close();

  if (failures.length) {
    console.error("FAILURES:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log("PASS: browser stress test passed.");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
