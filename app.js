let bpm = 120, playing = false, timer = null, beat = 0, audio = null, beatsPerBar = 4, soundMode = "both";
const $ = id => document.getElementById(id);

function announce(t) { $("status").textContent = t; }

function ctx() {
  if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
  if (audio.state === "suspended") audio.resume();
  return audio;
}

function osc(freq, type, dur, vol, delay) {
  if (delay === undefined) delay = 0;
  const c = ctx(), n = c.currentTime + delay;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, n);
  g.gain.setValueAtTime(vol, n);
  g.gain.exponentialRampToValueAtTime(0.001, n + dur);
  o.connect(g).connect(c.destination);
  o.start(n);
  o.stop(n + dur);
}

// 合成語音音檔（1-6）
function playCountSound(num) {
  const c = ctx();
  const n = c.currentTime;
  // 降低頻率，聲音更柔和
  const freqMap = { 1: 440, 2: 494, 3: 523, 4: 587, 5: 659, 6: 698 };
  const freq = freqMap[num] || 500;
  // 主音（更飽滿的 envelope）
  const o1 = c.createOscillator(), g1 = c.createGain();
  o1.type = "triangle";
  o1.frequency.setValueAtTime(freq, n);
  g1.gain.setValueAtTime(0.01, n);
  g1.gain.linearRampToValueAtTime(0.75, n + 0.03);
  g1.gain.exponentialRampToValueAtTime(0.001, n + 0.35);
  o1.connect(g1).connect(c.destination);
  o1.start(n);
  o1.stop(n + 0.35);
  // 泛音（暖色）
  const o2 = c.createOscillator(), g2 = c.createGain();
  o2.type = "sine";
  o2.frequency.setValueAtTime(freq * 1.5, n);
  g2.gain.setValueAtTime(0.35, n);
  g2.gain.exponentialRampToValueAtTime(0.001, n + 0.25);
  o2.connect(g2).connect(c.destination);
  o2.start(n);
  o2.stop(n + 0.25);
  // 提示音在數字音之後 20ms
  osc(880, "sine", 0.08, 0.35, 0.02);
  osc(1320, "sine", 0.05, 0.18, 0.02);
}

function playBeatSound() {
  osc(880, "sine", 0.08, 0.35);
  osc(1320, "sine", 0.05, 0.18);
}

function speakNumber(num) {
  if (!('speechSynthesis' in window)) return;
  // 真正的國語語音
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(String(num));
  utt.lang = "zh-TW";
  utt.rate = 1.5;
  utt.pitch = 1.0;
  utt.volume = 1.0;
  window.speechSynthesis.speak(utt);
}

function flash(i) {
  const btns = document.querySelectorAll(".beat");
  btns.forEach(function(b) { b.classList.remove("active"); });
  const b = document.getElementById("b" + i);
  if (b) b.classList.add("active");
  $("beatStatus").textContent = "目前第 " + (i + 1) + " 拍。";
}

function tick() {
  const count = beat + 1;
  flash(beat);
  if (soundMode === "both" || soundMode === "click") playBeatSound();
  if (soundMode === "both" || soundMode === "voice") speakNumber(count);
  beat = (beat + 1) % beatsPerBar;
}

function start() {
  if (playing) return;
  ctx();
  playing = true;
  beat = 0;
  const btn = $("playBtn");
  btn.textContent = "■ 停止播放";
  btn.setAttribute("aria-label", "停止播放");
  btn.classList.add("playing");
  announce("語音數拍已開始，" + bpm + " BPM，" + beatsPerBar + "拍。每一拍都會報讀數字。");
  tick();
  timer = setInterval(tick, 60000 / bpm);
}

function stop() {
  playing = false;
  clearInterval(timer);
  timer = null;
  const btn = $("playBtn");
  btn.textContent = "▶ 開始播放";
  btn.setAttribute("aria-label", "開始節拍器");
  btn.classList.remove("playing");
  // 停止時取消任何正在說的語音
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  announce("語音數拍已停止，目前 " + bpm + " BPM，" + beatsPerBar + "拍。");
}

// 播放按鈕
$("playBtn").onclick = function() {
  if (playing) { stop(); } else { start(); }
};

// 拍號下拉選單
var meterMenuVisible = false;
$("meterBtn").onclick = function() {
  meterMenuVisible = !meterMenuVisible;
  var menu = $("meterMenu");
  if (meterMenuVisible) {
    menu.style.display = "block";
    this.setAttribute("aria-expanded", "true");
  } else {
    menu.style.display = "none";
    this.setAttribute("aria-expanded", "false");
  }
};

document.querySelectorAll(".meterOpt").forEach(function(btn) {
  btn.onclick = function() {
    var wasPlaying = playing;
    if (playing) { clearInterval(timer); timer = null; playing = false; }
    document.querySelectorAll(".meterOpt").forEach(function(x) { x.classList.remove("selected"); });
    btn.classList.add("selected");
    beatsPerBar = parseInt(btn.dataset.beats);
    renderBeats();
    var names2 = { 2: "2/4", 3: "3/4", 4: "4/4", 5: "5/8", 6: "6/8" };
    $("meterBtn").textContent = names2[beatsPerBar] + " 拍 ▾";
    $("meterBtn").setAttribute("aria-label", names2[beatsPerBar] + " 拍");
    meterMenuVisible = false;
    $("meterMenu").style.display = "none";
    $("meterBtn").setAttribute("aria-expanded", "false");
    announce("已選擇" + names2[beatsPerBar] + "拍。每一拍都會報讀數字。");
    if (wasPlaying) {
      beat = 0;
      playing = true;
      var btn2 = $("playBtn");
      btn2.textContent = "■ 停止播放";
      btn2.setAttribute("aria-label", "停止播放");
      btn2.classList.add("playing");
      tick();
      timer = setInterval(tick, 60000 / bpm);
    }
  };
});

// 語音輸入 BPM
$("voice").onclick = function() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    announce("此瀏覽器不支援語音辨識，請使用 Android Chrome。");
    return;
  }
  const r = new SR();
  r.lang = "zh-TW";
  r.interimResults = false;
  r.maxAlternatives = 3;
  announce("正在聆聽。請說出 BPM，例如一百二十 BPM。");
  r.onresult = function(e) {
    const text = e.results[0][0].transcript;
    const n = parseNumber(text);
    if (n) {
      bpm = Math.max(30, Math.min(240, Math.round(n)));
      $("bpm").textContent = bpm + " BPM";
      announce("已辨識：" + text + "。目前速度 " + bpm + " BPM。");
      if (playing) { stop(); start(); }
    } else {
      announce("聽到：" + text + "。沒有辨識出有效的 BPM，請再說一次。");
    }
  };
  r.onerror = function() {
    announce("語音辨識失敗，請再試一次。");
  };
  r.start();
};

function parseNumber(s) {
  const m = s.match(/\d{2,3}/);
  if (m) return Number(m[0]);
  const d = { "零": 0, "〇": 0, "一": 1, "二": 2, "兩": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9 };
  let total = 0, num = 0, found = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (d[c] !== undefined) { num = d[c]; found = true; }
    else if (c === "十") { total += (num || 1) * 10; num = 0; }
    else if (c === "百") { total += (num || 1) * 100; num = 0; }
  }
  total += num;
  return found ? total : null;
}

function renderBeats() {
  const container = $("beatsContainer");
  const labels = { 2: "1|2", 3: "1|2|3", 4: "1|2|3|4", 5: "1|2|3|4|5", 6: "1|2|3|4|5|6" };
  const parts = (labels[beatsPerBar] || "1|2|3|4").split("|");
  let html = "";
  for (let i = 0; i < parts.length; i++) {
    const cls = "beat" + (i === 0 ? " active" : "");
    html += '<div id="b' + i + '" class="' + cls + '">' + parts[i] + '</div>';
  }
  container.innerHTML = html;
  const meterNames = { 2: "2/4", 3: "3/4", 4: "4/4", 5: "5/8", 6: "6/8" };
  $("beatStatus").textContent = meterNames[beatsPerBar] + " 拍。尚未開始。會用國語數字語音報讀每一拍。";
}

// 聲音模式切換
document.querySelectorAll(".modeOpt").forEach(function(btn) {
  btn.onclick = function() {
    document.querySelectorAll(".modeOpt").forEach(function(x) {
      x.classList.remove("selected");
      x.setAttribute("aria-checked", "false");
    });
    btn.classList.add("selected");
    btn.setAttribute("aria-checked", "true");
    soundMode = btn.dataset.mode;
    var names = { both: "兩者合一", click: "僅節拍器", voice: "僅人聲" };
    announce("已切換為" + names[soundMode] + "模式。");
  };
});

// 初始化
renderBeats();
