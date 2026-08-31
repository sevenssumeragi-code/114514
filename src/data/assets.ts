/**
 * アセット manifest。
 * ファイルが存在しなくてもゲームは止まらない。背景・立ち絵・CGは
 * CSSで描かれるプレースホルダへ、音は無音へフォールバックする。
 * 実ファイルを public/assets 以下に同名で置けば自動的に差し替わる。
 */

export interface BgDef {
  id: string;
  label: string;
  /** プレースホルダ用のグラデーション定義（素材が無いとき使う）。 */
  sky: [string, string];
  ground: string;
  /** 街灯の基本色。NOX によって上書きされる。 */
  lamp: string;
  file?: string;
}

export const BACKGROUNDS: Record<string, BgDef> = {
  black: { id: 'black', label: '暗転', sky: ['#000000', '#000000'], ground: '#000000', lamp: '#000000' },
  white: { id: 'white', label: '白', sky: ['#ffffff', '#f2f4f8'], ground: '#e9edf4', lamp: '#ffffff' },
  dorm_room: { id: 'dorm_room', label: '寮・居間', sky: ['#2a2018', '#3a2d20'], ground: '#4a382a', lamp: '#ffbc6b', file: 'dorm_room.jpg' },
  dorm_night: { id: 'dorm_night', label: '寮・夜', sky: ['#101828', '#1b2740'], ground: '#232f45', lamp: '#ffb45e', file: 'dorm_night.jpg' },
  dorm_hall: { id: 'dorm_hall', label: '寮・廊下', sky: ['#161c28', '#232b3a'], ground: '#2c3444', lamp: '#e8a95c', file: 'dorm_hall.jpg' },
  dorm_kitchen: { id: 'dorm_kitchen', label: '寮・台所', sky: ['#2b2418', '#3d3324'], ground: '#4d4030', lamp: '#ffc978', file: 'dorm_kitchen.jpg' },
  slope_night: { id: 'slope_night', label: '坂・夜', sky: ['#0a0f1e', '#132038'], ground: '#1d2a42', lamp: '#ff9f45', file: 'slope_night.jpg' },
  slope_morning: { id: 'slope_morning', label: '坂・朝', sky: ['#cfe0f5', '#f6f2e8'], ground: '#dfe6ee', lamp: '#ffffff', file: 'slope_morning.jpg' },
  slope_dark: { id: 'slope_dark', label: '坂・灯が消えた', sky: ['#04060c', '#080d16'], ground: '#0b111c', lamp: '#101010', file: 'slope_dark.jpg' },
  tunnel: { id: 'tunnel', label: 'トンネル', sky: ['#05070d', '#0d1119'], ground: '#141a24', lamp: '#c9a24a', file: 'tunnel.jpg' },
  school_class: { id: 'school_class', label: '教室', sky: ['#b9c9dd', '#dde6f0'], ground: '#c8cfd8', lamp: '#ffffff', file: 'school_class.jpg' },
  school_corridor: { id: 'school_corridor', label: '校舎廊下', sky: ['#8fa2ba', '#c3cedb'], ground: '#aab4c1', lamp: '#f0f4f8', file: 'school_corridor.jpg' },
  park_snow: { id: 'park_snow', label: '公園・雪', sky: ['#16223a', '#24334f'], ground: '#5c6b83', lamp: '#ffa851', file: 'park_snow.jpg' },
  convenience: { id: 'convenience', label: 'コンビニ', sky: ['#e9f2f6', '#ffffff'], ground: '#dfe8ec', lamp: '#f2fbff', file: 'convenience.jpg' },
  library: { id: 'library', label: '図書館', sky: ['#3b3225', '#544838'], ground: '#635543', lamp: '#e6c27e', file: 'library.jpg' },
  townhall: { id: 'townhall', label: '町役場', sky: ['#525a63', '#6e7681'], ground: '#7a828c', lamp: '#dfe4e8', file: 'townhall.jpg' },
  temple: { id: 'temple', label: '寺', sky: ['#1e2418', '#2d3524'], ground: '#3a4230', lamp: '#d9b467', file: 'temple.jpg' },
  geru_room: { id: 'geru_room', label: 'ゲルの部屋', sky: ['#1d1626', '#2b2136'], ground: '#352a43', lamp: '#c79bf0', file: 'geru_room.jpg' },
  boundary: { id: 'boundary', label: '境界', sky: ['#060a14', '#0e1830'], ground: '#0a1224', lamp: '#6f8fd8', file: 'boundary.jpg' },
  boundary_deep: { id: 'boundary_deep', label: '境界の底', sky: ['#020610', '#061024'], ground: '#03060f', lamp: '#3d6bb5', file: 'boundary_deep.jpg' },
  backside_ruin: { id: 'backside_ruin', label: '裏側・崩れた都', sky: ['#0d0716', '#1a0f2b'], ground: '#241638', lamp: '#7d4fc0', file: 'backside_ruin.jpg' },
  inverted_town: { id: 'inverted_town', label: '裏返った町', sky: ['#150a20', '#2a1338'], ground: '#3a1c4c', lamp: '#a259ff', file: 'inverted_town.jpg' },
  rooftop: { id: 'rooftop', label: '屋上', sky: ['#0c1424', '#182742'], ground: '#26364f', lamp: '#ffb45e', file: 'rooftop.jpg' },
  station: { id: 'station', label: '駅', sky: ['#161d2b', '#232d40'], ground: '#2e394c', lamp: '#ffbf72', file: 'station.jpg' },
  shrine_steps: { id: 'shrine_steps', label: '石段', sky: ['#101828', '#1d2b44'], ground: '#293751', lamp: '#ff9f45', file: 'shrine_steps.jpg' },
};

export interface BgmDef {
  id: string;
  label: string;
  file?: string;
  loop: boolean;
}

export const BGM: Record<string, BgmDef> = {
  daily_winter: { id: 'daily_winter', label: '冬の日常', file: 'daily_winter.ogg', loop: true },
  warm: { id: 'warm', label: 'ストーブ', file: 'warm.ogg', loop: true },
  unease: { id: 'unease', label: '不穏', file: 'unease.ogg', loop: true },
  mystery: { id: 'mystery', label: '調査', file: 'mystery.ogg', loop: true },
  battle: { id: 'battle', label: '襲来', file: 'battle.ogg', loop: true },
  sorrow: { id: 'sorrow', label: '喪失', file: 'sorrow.ogg', loop: true },
  neo_theme: { id: 'neo_theme', label: '記録されない国', file: 'neo_theme.ogg', loop: true },
  boundary: { id: 'boundary', label: '境界', file: 'boundary.ogg', loop: true },
  finale: { id: 'finale', label: '継ぎ足された夜', file: 'finale.ogg', loop: true },
  morning: { id: 'morning', label: '朝', file: 'morning.ogg', loop: true },
  title: { id: 'title', label: 'タイトル', file: 'title.ogg', loop: true },
  silence: { id: 'silence', label: '無音', loop: false },
};

export interface SeDef {
  id: string;
  label: string;
  file?: string;
}

export const SE: Record<string, SeDef> = {
  streetlight_off: { id: 'streetlight_off', label: '街灯が落ちる', file: 'streetlight_off.ogg' },
  streetlight_on: { id: 'streetlight_on', label: '街灯が点く', file: 'streetlight_on.ogg' },
  door: { id: 'door', label: '扉', file: 'door.ogg' },
  snow_step: { id: 'snow_step', label: '雪を踏む', file: 'snow_step.ogg' },
  sword: { id: 'sword', label: '抜刀', file: 'sword.ogg' },
  glass: { id: 'glass', label: '結界が割れる', file: 'glass.ogg' },
  heartbeat: { id: 'heartbeat', label: '鼓動', file: 'heartbeat.ogg' },
  page: { id: 'page', label: '頁をめくる', file: 'page.ogg' },
  clock: { id: 'clock', label: '時計', file: 'clock.ogg' },
  wind: { id: 'wind', label: '風', file: 'wind.ogg' },
  ui_select: { id: 'ui_select', label: 'UI決定', file: 'ui_select.ogg' },
  ui_hover: { id: 'ui_hover', label: 'UIカーソル', file: 'ui_hover.ogg' },
  ui_back: { id: 'ui_back', label: 'UI戻る', file: 'ui_back.ogg' },
};

export const ASSET_BASE = {
  bg: 'assets/backgrounds/',
  ch: 'assets/characters/',
  cg: 'assets/cg/',
  bgm: 'assets/bgm/',
  se: 'assets/se/',
};

export function bgUrl(def: BgDef): string | null {
  return def.file ? ASSET_BASE.bg + def.file : null;
}
export function cgUrl(id: string): string {
  return `${ASSET_BASE.cg}${id}.png`;
}
export function charUrl(id: string, expression: string): string {
  return `${ASSET_BASE.ch}${id.toLowerCase()}_${expression}.png`;
}
export function bgmUrl(def: BgmDef): string | null {
  return def.file ? ASSET_BASE.bgm + def.file : null;
}
export function seUrl(def: SeDef): string | null {
  return def.file ? ASSET_BASE.se + def.file : null;
}

export const BG_IDS = new Set(Object.keys(BACKGROUNDS));
export const BGM_IDS = new Set(Object.keys(BGM));
export const SE_IDS = new Set(Object.keys(SE));
