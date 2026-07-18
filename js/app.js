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
  };

  const state = {
    settings: { ...DEFAULT_SETTINGS },
    chars: [
      { name: "キャラ1", color: "#7ec4ff", flip: false, sprites: [] },
      { name: "キャラ2", color: "#ffb36e", flip: true, sprites: [] },
    ],
    bgs: [null, null, null],
    scriptText: "",
    timeline: null,
  };

  let player = null;
  let scriptDirty = true;
  let compileTimer = null;

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
    tl.lines.forEach((line, i) => {
      const char = state.chars[line.charIndex];
      const sprite = line.spriteIndex >= 0 ? char.sprites[line.spriteIndex] : null;
      const row = document.createElement("div");
      row.className = "tl-row";
      row.dataset.index = i;
      row.innerHTML = `
        <span class="tl-time">${fmtTime(line.start)}</span>
        <span class="tl-name" style="background:${char.color}">${escapeHtml(char.name)}</span>
        <span class="tl-emo ${line.auto ? "auto" : "manual"}"
              title="${line.auto ? "自動選択" : "手動指定"}">${escapeHtml(line.emotion)}</span>
        ${sprite ? `<img class="tl-thumb" src="${sprite.dataURL}" alt="">` : ""}
        <span class="tl-text">${escapeHtml(line.text)}</span>
        <span class="tl-dur">${(line.end - line.start).toFixed(1)}s</span>`;
      row.addEventListener("click", () => {
        player.pause();
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

  function wireTransport() {
    $("#btnPlay").addEventListener("click", () => {
      ensureCompiled();
      if (player.playing) player.pause();
      else player.play();
    });
    $("#seek").addEventListener("input", (e) => {
      const ratio = Number(e.target.value) / 1000; // pause()がスライダー値を上書きする前に取得
      ensureCompiled();
      const tl = state.timeline;
      if (!tl) return;
      player.pause();
      player.seek(ratio * tl.duration);
    });
    player.onTick = (t) => {
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
    player.pause();
    const token = { cancelled: false };
    showModal(
      "動画を書き出し中…",
      `<p>実時間キャプチャのため約${Math.ceil(tl.duration)}秒かかります。タブは開いたままにしてください。</p>
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
      const { blob, ext } = await Exporter.exportVideo(state, tl, setProgress, token);
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
        ["書き出す", "primary", () => {
          const dir = $("#exoDir").value.trim() || "C:\\bb_theater\\assets";
          hideModal();
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

    const readme = [
      "﻿■ AviUtlへの取り込み方",
      "",
      `1. このZIPの assets フォルダの中身を「${assetDir}」に置く`,
      "   (別の場所に置いた場合は、AviUtl上で画像オブジェクトのファイルパスを直してください)",
      "2. AviUtl + 拡張編集プラグインを起動し、新規プロジェクトを作成",
      `   (サイズ ${tl.width}x${tl.height} / ${tl.fps}fps)`,
      "3. 拡張編集のタイムラインに bb_theater.exo をドラッグ&ドロップ",
      "",
      "レイヤー構成: 1=背景 / 2=左キャラ / 3=右キャラ / 4=字幕",
      "字幕は縁取り文字(キャラ色)で出力されています。",
      "BGM・SE・音声はAviUtl側で自由に追加してください。",
    ].join("\r\n");
    entries.push({ name: "README_AVIUTL.txt", data: new TextEncoder().encode(readme) });

    Exporter.downloadBlob(Zip.make(entries), "bb_theater_aviutl.zip");
  }

  // ---------- プロジェクト保存/読込 ----------

  function saveProject() {
    ensureCompiled();
    const data = {
      app: "bb-theater-maker",
      version: 1,
      settings: state.settings,
      chars: state.chars.map(c => ({
        name: c.name, color: c.color, flip: c.flip,
        sprites: c.sprites.map(sp => ({ label: sp.label, tags: sp.tags, dataURL: sp.dataURL })),
      })),
      bgs: state.bgs.map(b => (b ? b.dataURL : null)),
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
    $("#script").value = data.script || "";
    renderCharPanels();
    renderBgPanel();
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
    const sample = Samples.build();
    state.chars = await Promise.all(sample.chars.map(async c => ({
      ...c,
      sprites: await Promise.all(c.sprites.map(async sp => ({ ...sp, img: await makeImg(sp.dataURL) }))),
    })));
    state.bgs = await Promise.all(sample.bgs.map(async b => ({ ...b, img: await makeImg(b.dataURL) })));
    $("#script").value = sample.script;
    renderCharPanels();
    renderBgPanel();
    compile();
  }

  // ---------- 初期化 ----------

  async function init() {
    const canvas = $("#preview");
    player = new Player(canvas, () => state, () => state.timeline);

    renderSettings();
    wireSettings();
    wireTransport();
    wireProjectButtons();

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
