"use strict";
/**
 * zip.js — 依存ライブラリ無しの最小ZIP書き出し(無圧縮/store)。
 * AviUtl用書き出しで .exo と素材画像をひとつのZIPにまとめるために使う。
 */
const Zip = (() => {

  const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[n] = c >>> 0;
    }
    return table;
  })();

  function crc32(data) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < data.length; i++) {
      crc = CRC_TABLE[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function dosDateTime(d = new Date()) {
    const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    const date = (((d.getFullYear() - 1980) & 0x7F) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    return { time, date };
  }

  class Writer {
    constructor() { this.parts = []; this.len = 0; }
    u16(v) { this.parts.push(new Uint8Array([v & 0xFF, (v >> 8) & 0xFF])); this.len += 2; }
    u32(v) {
      this.parts.push(new Uint8Array([v & 0xFF, (v >> 8) & 0xFF, (v >> 16) & 0xFF, (v >>> 24) & 0xFF]));
      this.len += 4;
    }
    bytes(b) { this.parts.push(b); this.len += b.length; }
    blob(type) { return new Blob(this.parts, { type }); }
  }

  /**
   * @param {Array<{name: string, data: Uint8Array}>} entries ファイル名はASCII推奨
   * @returns {Blob} zipファイル
   */
  function make(entries) {
    const w = new Writer();
    const { time, date } = dosDateTime();
    const central = [];
    const enc = new TextEncoder();

    for (const e of entries) {
      const nameBytes = enc.encode(e.name);
      const crc = crc32(e.data);
      const offset = w.len;

      // Local file header
      w.u32(0x04034B50);
      w.u16(20);          // version needed
      w.u16(0x0800);      // flags: UTF-8 names
      w.u16(0);           // method: store
      w.u16(time); w.u16(date);
      w.u32(crc);
      w.u32(e.data.length);
      w.u32(e.data.length);
      w.u16(nameBytes.length);
      w.u16(0);           // extra len
      w.bytes(nameBytes);
      w.bytes(e.data);

      central.push({ nameBytes, crc, size: e.data.length, offset });
    }

    const cdStart = w.len;
    for (const c of central) {
      w.u32(0x02014B50);
      w.u16(20); w.u16(20);
      w.u16(0x0800);
      w.u16(0);
      w.u16(time); w.u16(date);
      w.u32(c.crc);
      w.u32(c.size); w.u32(c.size);
      w.u16(c.nameBytes.length);
      w.u16(0); w.u16(0);   // extra, comment
      w.u16(0);             // disk
      w.u16(0);             // internal attrs
      w.u32(0);             // external attrs
      w.u32(c.offset);
      w.bytes(c.nameBytes);
    }
    const cdSize = w.len - cdStart;

    // End of central directory
    w.u32(0x06054B50);
    w.u16(0); w.u16(0);
    w.u16(central.length); w.u16(central.length);
    w.u32(cdSize);
    w.u32(cdStart);
    w.u16(0);

    return w.blob("application/zip");
  }

  return { make };
})();
