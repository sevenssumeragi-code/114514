/** 既読判定・バックログ用の安定キー。本文が変われば別の行として扱われる。 */
export function textKey(sceneId: string, pc: number, text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return `${sceneId}:${pc}:${(h >>> 0).toString(36)}`;
}
