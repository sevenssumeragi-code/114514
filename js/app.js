"use strict";
/**
 * app.js — UIの組み立てと状態管理(アプリ本体)。
 */
(() => {

  const $ = (sel) => document.querySelector(sel);

  const DEFAULT_SETTINGS = {
    width: 1280, height: 720, fps: 30,
    subtitleSize: 40,
    timeBase: 0.9, timePerChar: 0.085, timeMin: 1.2, timeMax: 8.0,
    lineGap: 0.15,
    bgmVolume: 0.45, seVolume: 0.7,
  };

  const state = {
    settings: { ...DEFAULT_SETTINGS },
    chars: [
      { name: "キャラ1", color: "#7ec4ff", flip: false, sprites: [] },
      { name: "キャラ2", color: "#ffb36e", flip: true, sprites: [] },
    ],
    bgs: [null, null, null],
    bgms: [],   // {label, tags, dataURL, buffer?}
    ses: [],
    profile: null, // 動画解析プロファイル(テンポ模倣)
    scriptText: "",
    timeline: null,
  };

  const audioEngine = new AudioLib.Engine();
  let player = null;
  let scriptDirty = true;
  let compileTimer = null;
  let wasPlaying = false;

  // ---------- ユーティリティ ----------

  function makeImg(dataURL) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
      img.src = dataURL;
    });
  }

  function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(new Error("ファイルの読み込みに失敗しました"));
      r.readAsDataURL(file);
    });
  }

  function dataURLToBytes(dataURL) {
    const bin = atob(dataURL.split(",")[1]);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function fmtTime(t) {
    const m = Math.floor(t / 60);
    const s = (t % 60).toFixed(1).padStart(4, "0");
    return `${m}:${s}`;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // ---------- コンパイル ----------

  function compile() {
    state.scriptText = $("#script").value;
    state.timeline = Timeline.compile(state);
    scriptDirty = false;
    renderWarnings();
    renderLineList();
    if (player.t > state.timeline.duration) player.t = 0;
    player.render();
    updateTransport();
  }

  function scheduleCompile() {
    scriptDirty = true;
    clearTimeout(compileTimer);
    compileTimer = setTimeout(compile, 400);
  }

  function ensureCompiled() {
    if (scriptDirty || !state.timeline) compile();
  }

  // ---------- 素材パネル ----------

  function renderCharPanels() {
    const root = $("#charPanels");
    root.innerHTML = "";
    state.chars.forEach((char, ci) => {
      const box = document.createElement("div");
      box.className = "char-box";
      box.innerHTML = `
        <div class="char-head">
          <span class="char-side">${ci === 0 ? "左" : "右"}</span>
          <input class="char-name" value="${escapeHtml(char.name)}" title="キャラ名(台本の名前と一致させる)">
          <input type="color" class="char-color" value="${char.color}" title="字幕の縁取り色">
          <label class="flip-label" title="立ち絵を左右反転して表示">
            <input type="checkbox" class="char-flip" ${char.flip ? "checked" : ""}>反転
          </label>
        </div>
        <div class="sprite-list"></div>
        <label class="btn add-sprite">+ 立ち絵を追加(複数可)
          <input type="file" accept="image/*" multiple hidden>
        </label>`;

      const list = box.querySelector(".sprite-list");
      char.sprites.forEach((sp, si) => {
        const row = document.createElement("div");
        row.className = "sprite-row";
        row.innerHTML = `
          <img class="thumb" src="${sp.dataURL}" alt="">
          <div class="sprite-info">
            <input class="sprite-tags" list="tagOptions" value="${escapeHtml(sp.tags.join(","))}"
                   title="表情タグ(カンマ区切り)。自動表情選択に使われます">
            <div class="sprite-label" title="${escapeHtml(sp.label)}">${escapeHtml(sp.label)}</div>
          </div>
          <button class="del" title="削除">×</button>`;
        row.querySelector(".sprite-tags").addEventListener("change", (e) => {
          sp.tags = e.target.value.split(/[,、\s]+/).filter(Boolean);
          if (!sp.tags.length) sp.tags = ["通常"];
          compile();
        });
        row.querySelector(".del").addEventListener("click", () => {
          char.sprites.splice(si, 1);
          renderCharPanels();
          compile();
        });
        list.appendChild(row);
      });

      box.querySelector(".char-name").addEventListener("change", (e) => {
        char.name = e.target.value.trim() || `キャラ${ci + 1}`;
        compile();
      });
      box.querySelector(".char-color").addEventListener("change", (e) => {
        char.color = e.target.value;
        compile();
      });
      box.querySelector(".char-flip").addEventListener("change", (e) => {
        char.flip = e.target.checked;
        player.render();
      });
      box.querySelector('input[type="file"]').addEventListener("change", async (e) => {
        for (const file of e.target.files) {
          try {
            const dataURL = await fileToDataURL(file);
            const img = await makeImg(dataURL);
            char.sprites.push({
              label: file.name,
              tags: Emotion.inferTagsFromName(file.name),
              dataURL, img,
            });
          } catch (err) {
            alert(`${file.name}: ${err.message}`);
          }
        }
        e.target.value = "";
        renderCharPanels();
        compile();
      });

      root.appendChild(box);
    });
  }

  function renderBgPanel() {
    const root = $("#bgPanel");
    root.innerHTML = "";
    state.bgs.forEach((bg, bi) => {
      const slot = document.createElement("div");
      slot.className = "bg-slot";
      slot.innerHTML = `
        <span class="bg-num">${bi + 1}</span>
        ${bg ? `<img class="thumb wide" src="${bg.dataURL}" alt="">` : `<span class="bg-empty">未設定</span>`}
        <label class="btn small">選択<input type="file" accept="image/*" hidden></label>
        ${bg ? `<button class="del" title="削除">×</button>` : ""}`;
      slot.querySelector('input[type="file"]').addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          const dataURL = await fileToDataURL(file);
          const img = await makeImg(dataURL);
          state.bgs[bi] = { dataURL, img };
          renderBgPanel();
          compile();
        } catch (err) {
          alert(err.message);
        }
      });
      const del = slot.querySelector(".del");
      if (del) del.addEventListener("click", () => {
        state.bgs[bi] = null;
        renderBgPanel();
        compile();
      });
      root.appendChild(slot);
    });
  }

  // ---------- BGM/SEパネル ----------

  function inferAudioTags(name, isBgm) {
    const n = (name || "").toLowerCase();
    if (isBgm) {
      const rules = [
        [/コミカル|comic|comedy|funny/, "コミカル"], [/緊張|tension|suspense|horror/, "緊張"],
        [/激し|battle|rock|intense/, "激しい"], [/悲し|sad|kanashi/, "悲しい"],
        [/感動|emotional|kando/, "感動"], [/静か|quiet|calm|shizuka/, "静か"],
      ];
      for (const [re, tag] of rules) if (re.test(n)) return [tag];
      return ["日常"];
    }
    const rules = [
      [/ドーン|衝撃|don|impact|shock/, "衝撃"], [/スパーン|ツッコミ|harisen|slap/, "ツッコミ"],
      [/笑|warai|laugh/, "笑い"], [/きゅん|kyun|heart/, "きゅん"], [/ズコ|zuko|悲/, "悲しい"],
    ];
    for (const [re, tag] of rules) if (re.test(n)) return [tag];
    return ["汎用"];
  }

  function auditionAsset(asset) {
    audioEngine.stop();
    audioEngine.decode(asset).then(() => {
      const ctx = audioEngine.ensureCtx();
      const src = ctx.createBufferSource();
      src.buffer = asset.buffer;
      const gain = ctx.createGain();
      gain.gain.value = 0.6;
      src.connect(gain).connect(ctx.destination);
      src.start();
      src.stop(ctx.currentTime + Math.min(4, asset.buffer.duration));
      audioEngine.nodes.push(src, gain);
    }).catch(() => alert("この音声は再生できませんでした"));
  }

  function renderAudioPanel(listSel, assets, datalistId, isBgm) {
    const root = $(listSel);
    root.innerHTML = "";
    if (!assets.length) {
      root.innerHTML = `<div class="empty-note">未登録(サンプル読込で内蔵音源が入ります)</div>`;
      return;
    }
    assets.forEach((a, i) => {
      const row = document.createElement("div");
      row.className = "sprite-row";
      row.innerHTML = `
        <button class="audition" title="試聴">🔊</button>
        <div class="sprite-info">
          <input class="sprite-tags" list="${datalistId}" value="${escapeHtml(a.tags.join(","))}"
                 title="タグ(カンマ区切り)。自動割当に使われます">
          <div class="sprite-label" title="${escapeHtml(a.label)}">${escapeHtml(a.label)}</div>
        </div>
        <button class="del" title="削除">×</button>`;
      row.querySelector(".audition").addEventListener("click", () => auditionAsset(a));
      row.querySelector(".sprite-tags").addEventListener("change", (e) => {
        a.tags = e.target.value.split(/[,、\s]+/).filter(Boolean);
        if (!a.tags.length) a.tags = [isBgm ? "日常" : "汎用"];
        compile();
      });
      row.querySelector(".del").addEventListener("click", () => {
        assets.splice(i, 1);
        renderAudioPanel(listSel, assets, datalistId, isBgm);
        compile();
      });
      root.appendChild(row);
    });
  }

  function renderAudioPanels() {
    renderAudioPanel("#bgmPanel", state.bgms, "moodOptions", true);
    renderAudioPanel("#sePanel", state.ses, "seTagOptions", false);
  }

  function wireAudioUploads() {
    const wire = (inputSel, assets, isBgm) => {
      $(inputSel).addEventListener("change", async (e) => {
        for (const file of e.target.files) {
          try {
            const dataURL = await fileToDataURL(file);
            assets.push({ label: file.name, tags: inferAudioTags(file.name, isBgm), dataURL });
          } catch (err) {
            alert(`${file.name}: ${err.message}`);
          }
        }
        e.target.value = "";
        renderAudioPanels();
        compile();
      });
    };
    wire("#bgmFiles", state.bgms, true);
    wire("#seFiles", state.ses, false);
  }

  // ---------- 設定 ----------

  function renderSettings() {
    $("#setRes").value = `${state.settings.width}x${state.settings.height}`;
    $("#setFps").value = state.settings.fps;
    $("#setSubSize").value = state.settings.subtitleSize;
    $("#setBase").value = state.settings.timeBase;
    $("#setPerChar").value = state.settings.timePerChar;
    $("#setMin").value = state.settings.timeMin;
    $("#setMax").value = state.settings.timeMax;
    $("#setGap").value = state.settings.lineGap;
    $("#setBgmVol").value = state.settings.bgmVolume;
    $("#setSeVol").value = state.settings.seVolume;
  }

  function wireSettings() {
    $("#setRes").addEventListener("change", (e) => {
      const [w, h] = e.target.value.split("x").map(Number);
      state.settings.width = w;
      state.settings.height = h;
      compile();
    });
    const numeric = [
      ["#setFps", "fps", parseInt],
      ["#setSubSize", "subtitleSize", parseInt],
      ["#setBase", "timeBase", parseFloat],
      ["#setPerChar", "timePerChar", parseFloat],
      ["#setMin", "timeMin", parseFloat],
      ["#setMax", "timeMax", parseFloat],
      ["#setGap", "lineGap", parseFloat],
      ["#setBgmVol", "bgmVolume", parseFloat],
      ["#setSeVol", "seVolume", parseFloat],
    ];
    for (const [sel, key, parse] of numeric) {
      $(sel).addEventListener("change", (e) => {
        const v = parse(e.target.value, 10);
        if (!Number.isNaN(v) && v >= 0) state.settings[key] = v;
        compile();
      });
    }
  }

  // ---------- タイムライン表示 ----------

  function renderWarnings() {
    const el = $("#warnings");
    const ws = state.timeline ? state.timeline.warnings : [];
    el.innerHTML = ws.length
      ? `<div class="warn-title">⚠ ${ws.length}件の注意</div>` +
        ws.map(w => `<div class="warn-item">${escapeHtml(w)}</div>`).join("")
      : "";
  }

  function renderLineList() {
    const root = $("#lineList");
    const tl = state.timeline;
    root.innerHTML = "";
    if (!tl || !tl.lines.length) {
      root.innerHTML = `<div class="empty-note">台本を書いて「台本を反映」を押すとここにタイムラインが表示されます</div>`;
      return;
    }
    let segIdx = 0;
    const pushBgmHeader = (seg) => {
      const bgm = seg.bgmIndex >= 0 ? state.bgms[seg.bgmIndex] : null;
      const head = document.createElement("div");
      head.className = "tl-scene";
      head.innerHTML = `♪ ${fmtTime(seg.start)} <b>${escapeHtml(seg.mood)}</b> — ${bgm ? escapeHtml(bgm.label) : "BGMなし"}`;
      root.appendChild(head);
    };
    tl.lines.forEach((line, i) => {
      while (segIdx < (tl.bgmSegs || []).length && tl.bgmSegs[segIdx].start <= line.start + 0.001) {
        pushBgmHeader(tl.bgmSegs[segIdx]);
        segIdx++;
      }
      const char = state.chars[line.charIndex];
      const sprite = line.spriteIndex >= 0 ? char.sprites[line.spriteIndex] : null;
      const se = (tl.seEvents || []).find(ev => Math.abs(ev.t - line.start) < 0.15);
      const row = document.createElement("div");
      row.className = "tl-row";
      row.dataset.index = i;
      row.innerHTML = `
        <span class="tl-time">${fmtTime(line.start)}</span>
        <span class="tl-name" style="background:${char.color}">${escapeHtml(char.name)}</span>
        <span class="tl-emo ${line.auto ? "auto" : "manual"}"
              title="${line.auto ? "自動選択" : "手動指定"}">${escapeHtml(line.emotion)}</span>
        ${sprite ? `<img class="tl-thumb" src="${sprite.dataURL}" alt="">` : ""}
        ${se ? `<span class="tl-se" title="SE: ${escapeHtml(se.tag)}">🔊</span>` : ""}
        <span class="tl-text">${escapeHtml(line.text)}</span>
        <span class="tl-dur">${(line.end - line.start).toFixed(1)}s</span>`;
      row.addEventListener("click", () => {
        pausePlayback();
        player.seek(line.start + 0.01);
      });
      root.appendChild(row);
    });
  }

  function highlightLine(t) {
    const tl = state.timeline;
    if (!tl) return;
    const active = Timeline.lineAt(tl, t);
    const idx = active ? tl.lines.indexOf(active) : -1;
    document.querySelectorAll(".tl-row").forEach((row) => {
      row.classList.toggle("active", Number(row.dataset.index) === idx);
    });
  }

  // ---------- トランスポート ----------

  function updateTransport() {
    const tl = state.timeline;
    const dur = tl ? tl.duration : 0;
    $("#timeLabel").textContent = `${fmtTime(player.t)} / ${fmtTime(dur)}`;
    $("#seek").value = dur ? Math.round((player.t / dur) * 1000) : 0;
    $("#btnPlay").textContent = player.playing ? "⏸ 停止" : "▶ 再生";
  }

  function pausePlayback() {
    player.pause();
    audioEngine.stop();
  }

  async function startPlayback() {
    ensureCompiled();
    await audioEngine.prepare(state);
    if (player.t >= state.timeline.duration - 0.01) player.t = 0;
    player.play();
    audioEngine.start(player.t, state, state.timeline);
  }

  function wireTransport() {
    $("#btnPlay").addEventListener("click", () => {
      if (player.playing) pausePlayback();
      else startPlayback();
    });
    $("#seek").addEventListener("input", (e) => {
      const ratio = Number(e.target.value) / 1000; // pause()がスライダー値を上書きする前に取得
      ensureCompiled();
      const tl = state.timeline;
      if (!tl) return;
      pausePlayback();
      player.seek(ratio * tl.duration);
    });
    player.onTick = (t, playing) => {
      if (wasPlaying && !playing) audioEngine.stop(); // 末尾到達などの自動停止
      wasPlaying = playing;
      updateTransport();
      highlightLine(t);
    };
  }

  // ---------- モーダル ----------

  function showModal(title, bodyHtml, buttons) {
    $("#modalTitle").textContent = title;
    $("#modalBody").innerHTML = bodyHtml;
    const btns = $("#modalBtns");
    btns.innerHTML = "";
    for (const [label, cls, fn] of buttons) {
      const btn = document.createElement("button");
      btn.className = `btn ${cls}`;
      btn.textContent = label;
      btn.addEventListener("click", fn);
      btns.appendChild(btn);
    }
    $("#modal").classList.remove("hidden");
  }

  function hideModal() {
    $("#modal").classList.add("hidden");
  }

  // ---------- 書き出し ----------

  async function doExportVideo() {
    ensureCompiled();
    const tl = state.timeline;
    if (!tl || !tl.lines.length) {
      alert("台本にセリフがありません。先に台本を書いてください。");
      return;
    }
    if (!Exporter.pickMime()) {
      alert("このブラウザは動画書き出しに対応していません。Chrome/Edgeをお試しください。");
      return;
    }
    pausePlayback();
    const token = { cancelled: false };
    showModal(
      "動画を書き出し中…",
      `<p>実時間キャプチャのため約${Math.ceil(tl.duration)}秒かかります。タブは開いたままにしてください(BGM/SEも動画に合成されます)。</p>
       <div class="progressbar"><div id="progressFill"></div></div>
       <div id="progressText">0%</div>`,
      [["キャンセル", "danger", () => { token.cancelled = true; }]]
    );
    const setProgress = (r) => {
      const el = $("#progressFill");
      if (el) el.style.width = `${Math.round(r * 100)}%`;
      const tx = $("#progressText");
      if (tx) tx.textContent = `${Math.round(r * 100)}%`;
    };
    try {
      const { blob, ext } = await Exporter.exportVideo(state, tl, setProgress, token, audioEngine);
      Exporter.downloadBlob(blob, `bb_theater.${ext}`);
      if (ext === "webm") {
        hideModal();
        alert("このブラウザはMP4録画非対応のためWebMで保存しました。\nMP4が必要な場合はChrome/Edgeを使うか、AviUtl用データ書き出しをご利用ください。");
        return;
      }
    } catch (e) {
      if (!token.cancelled) alert(`書き出しに失敗しました: ${e.message}`);
    }
    hideModal();
  }

  async function doExportExo() {
    ensureCompiled();
    const tl = state.timeline;
    if (!tl || !tl.lines.length) {
      alert("台本にセリフがありません。先に台本を書いてください。");
      return;
    }
    showModal(
      "AviUtl用データを書き出し",
      `<p>.exo(タイムライン) + 素材画像をZIPにまとめます。<br>
        素材を配置するWindows側のフォルダパスを指定してください(半角英数字推奨)。</p>
       <input id="exoDir" class="text-input" value="C:\\bb_theater\\assets">`,
      [
        ["書き出す", "primary", async () => {
          const dir = $("#exoDir").value.trim() || "C:\\bb_theater\\assets";
          hideModal();
          await audioEngine.prepare(state); // SEの長さ算出用にデコードしておく
          buildExoZip(dir);
        }],
        ["キャンセル", "", hideModal],
      ]
    );
  }

  function buildExoZip(assetDir) {
    const tl = state.timeline;
    const exoBytes = Exo.build(state, tl, assetDir);
    const plan = Exo.planAssets(state);
    const entries = [{ name: "bb_theater.exo", data: exoBytes }];

    plan.bg.forEach((file, i) => {
      if (file) entries.push({ name: `assets/${file}`, data: dataURLToBytes(state.bgs[i].dataURL) });
    });
    plan.sprites.forEach((files, ci) => {
      files.forEach((file, si) => {
        entries.push({ name: `assets/${file}`, data: dataURLToBytes(state.chars[ci].sprites[si].dataURL) });
      });
    });
    plan.bgms.forEach((file, i) => {
      entries.push({ name: `assets/${file}`, data: dataURLToBytes(state.bgms[i].dataURL) });
    });
    plan.ses.forEach((file, i) => {
      entries.push({ name: `assets/${file}`, data: dataURLToBytes(state.ses[i].dataURL) });
    });

    const readme = [
      "﻿■ AviUtlへの取り込み方",
      "",
      `1. このZIPの assets フォルダの中身を「${assetDir}」に置く`,
      "   (別の場所に置いた場合は、AviUtl上でオブジェクトのファイルパスを直してください)",
      "2. AviUtl + 拡張編集プラグインを起動し、新規プロジェクトを作成",
      `   (サイズ ${tl.width}x${tl.height} / ${tl.fps}fps)`,
      "3. 拡張編集のタイムラインに bb_theater.exo をドラッグ&ドロップ",
      "",
      "レイヤー構成: 1=背景 / 2=左キャラ / 3=右キャラ / 4=字幕 / 5=BGM / 6=SE",
      "字幕は縁取り文字(キャラ色)で出力されています。",
      "BGM/SEは自動割当の結果がそのまま配置されています。差し替え・微調整はAviUtl側でどうぞ。",
    ].join("\r\n");
    entries.push({ name: "README_AVIUTL.txt", data: new TextEncoder().encode(readme) });

    Exporter.downloadBlob(Zip.make(entries), "bb_theater_aviutl.zip");
  }

  // ---------- プロジェクト保存/読込 ----------

  function saveProject() {
    ensureCompiled();
    const data = {
      app: "bb-theater-maker",
      version: 2,
      settings: state.settings,
      chars: state.chars.map(c => ({
        name: c.name, color: c.color, flip: c.flip,
        sprites: c.sprites.map(sp => ({ label: sp.label, tags: sp.tags, dataURL: sp.dataURL })),
      })),
      bgs: state.bgs.map(b => (b ? b.dataURL : null)),
      bgms: state.bgms.map(a => ({ label: a.label, tags: a.tags, dataURL: a.dataURL })),
      ses: state.ses.map(a => ({ label: a.label, tags: a.tags, dataURL: a.dataURL })),
      profile: state.profile,
      script: $("#script").value,
    };
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    Exporter.downloadBlob(blob, "bb_theater_project.json");
  }

  async function loadProjectData(data) {
    if (!data || data.app !== "bb-theater-maker") {
      throw new Error("BB劇場メーカーのプロジェクトファイルではありません");
    }
    state.settings = { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
    state.chars = await Promise.all((data.chars || []).slice(0, 2).map(async (c, i) => ({
      name: c.name || `キャラ${i + 1}`,
      color: c.color || "#ffffff",
      flip: !!c.flip,
      sprites: await Promise.all((c.sprites || []).map(async sp => ({
        label: sp.label || "", tags: sp.tags && sp.tags.length ? sp.tags : ["通常"],
        dataURL: sp.dataURL, img: await makeImg(sp.dataURL),
      }))),
    })));
    while (state.chars.length < 2) {
      state.chars.push({ name: `キャラ${state.chars.length + 1}`, color: "#cccccc", flip: false, sprites: [] });
    }
    state.bgs = await Promise.all([0, 1, 2].map(async i => {
      const d = (data.bgs || [])[i];
      return d ? { dataURL: d, img: await makeImg(d) } : null;
    }));
    state.bgms = (data.bgms || []).map(a => ({ label: a.label || "BGM", tags: a.tags || ["日常"], dataURL: a.dataURL }));
    state.ses = (data.ses || []).map(a => ({ label: a.label || "SE", tags: a.tags || ["汎用"], dataURL: a.dataURL }));
    state.profile = data.profile || null;
    renderProfileUI();
    $("#script").value = data.script || "";
    renderCharPanels();
    renderBgPanel();
    renderAudioPanels();
    renderSettings();
    compile();
  }

  function wireProjectButtons() {
    $("#btnSaveProj").addEventListener("click", saveProject);
    $("#btnLoadProj").addEventListener("click", () => $("#fileLoadProj").click());
    $("#fileLoadProj").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      e.target.value = "";
      if (!file) return;
      try {
        const text = await file.text();
        await loadProjectData(JSON.parse(text));
      } catch (err) {
        alert(`読み込みに失敗しました: ${err.message}`);
      }
    });
    $("#btnSample").addEventListener("click", async () => {
      if (!confirm("現在の内容を破棄してサンプルを読み込みます。よろしいですか?")) return;
      await loadSample();
    });
  }

  // ---------- サンプル ----------

  async function loadSample() {
    const sample = await Samples.build();
    state.chars = await Promise.all(sample.chars.map(async c => ({
      ...c,
      sprites: await Promise.all(c.sprites.map(async sp => ({ ...sp, img: await makeImg(sp.dataURL) }))),
    })));
    state.bgs = await Promise.all(sample.bgs.map(async b => ({ ...b, img: await makeImg(b.dataURL) })));
    state.bgms = sample.bgms;
    state.ses = sample.ses;
    $("#script").value = sample.script;
    renderCharPanels();
    renderBgPanel();
    renderAudioPanels();
    compile();
  }

  // ---------- シナリオ自動生成 ----------

  function currentNames() {
    return [state.chars[0].name, state.chars[1].name];
  }

  function activeProfile() {
    return (state.profile && $("#useProfile").checked) ? state.profile : null;
  }

  function setGeneratedScript(script) {
    $("#script").value = script;
    compile();
    player.seek(0);
  }

  function wireScenario() {
    const tasteSel = $("#genTaste");
    for (const t of Scenario.TASTES) {
      tasteSel.insertAdjacentHTML("beforeend", `<option value="${t}">${t}</option>`);
    }
    const lenSel = $("#genLength");
    for (const l of Scenario.LENGTHS) {
      lenSel.insertAdjacentHTML("beforeend", `<option value="${l}"${l === "中編" ? " selected" : ""}>${l}</option>`);
    }
    const modelSel = $("#apiModel");
    for (const m of Scenario.API_MODELS) {
      modelSel.insertAdjacentHTML("beforeend", `<option value="${m.id}">${m.label}</option>`);
    }
    try { $("#apiKey").value = localStorage.getItem("bbtm_apikey") || ""; } catch (_) { /* 保存不可環境 */ }

    $("#btnGenLocal").addEventListener("click", () => {
      const script = Scenario.generateLocal({
        prompt: $("#genPrompt").value,
        taste: tasteSel.value,
        length: lenSel.value,
        names: currentNames(),
        profile: activeProfile(),
      });
      setGeneratedScript(script);
    });

    $("#btnGenAPI").addEventListener("click", async () => {
      const apiKey = $("#apiKey").value.trim();
      if (!apiKey) { alert("APIキーを入力してください"); return; }
      try { localStorage.setItem("bbtm_apikey", apiKey); } catch (_) { /* 保存不可環境 */ }
      const btn = $("#btnGenAPI");
      btn.disabled = true;
      btn.textContent = "生成中…(数十秒かかることがあります)";
      try {
        const script = await Scenario.generateAPI({
          prompt: $("#genPrompt").value,
          taste: tasteSel.value,
          length: lenSel.value,
          names: currentNames(),
          apiKey,
          model: modelSel.value,
          profile: activeProfile(),
        });
        setGeneratedScript(script);
      } catch (e) {
        alert(e.message);
      } finally {
        btn.disabled = false;
        btn.textContent = "Claudeでシナリオ生成";
      }
    });
  }

  // ---------- 動画模倣(テンポ解析) ----------

  function renderProfileUI() {
    const has = !!state.profile;
    $("#profileSummary").classList.toggle("hidden", !has);
    $("#useProfileWrap").classList.toggle("hidden", !has);
    if (has) $("#profileSummary").textContent = Analyzer.summarize(state.profile);
  }

  function wireAnalyzer() {
    let selectedFile = null;
    $("#videoFile").addEventListener("change", (e) => {
      selectedFile = e.target.files[0] || null;
      $("#btnAnalyze").disabled = !selectedFile;
      if (selectedFile) $("#btnAnalyze").textContent = `「${selectedFile.name}」を解析する`;
    });
    $("#btnAnalyze").addEventListener("click", async () => {
      if (!selectedFile) return;
      const btn = $("#btnAnalyze");
      btn.disabled = true;
      try {
        state.profile = await Analyzer.analyze(selectedFile, (r) => {
          btn.textContent = `解析中… ${Math.round(r * 100)}%`;
        });
        renderProfileUI();
        btn.textContent = "解析完了(再解析する)";
      } catch (e) {
        alert(`解析に失敗しました: ${e.message}`);
        btn.textContent = "解析する";
      } finally {
        btn.disabled = false;
      }
    });
  }

  // ---------- 初期化 ----------

  async function init() {
    const canvas = $("#preview");
    player = new Player(canvas, () => state, () => state.timeline);

    renderSettings();
    wireSettings();
    wireTransport();
    wireProjectButtons();
    wireAudioUploads();
    wireScenario();
    wireAnalyzer();

    $("#btnCompile").addEventListener("click", compile);
    $("#script").addEventListener("input", scheduleCompile);
    $("#btnExportVideo").addEventListener("click", doExportVideo);
    $("#btnExportExo").addEventListener("click", doExportExo);

    await loadSample(); // 初回はサンプルで即プレビューできる状態にする
  }

  window.addEventListener("DOMContentLoaded", () => {
    init().catch(e => alert(`初期化に失敗しました: ${e.message}`));
  });

})();
