import type { Scene, SceneMap } from '@/engine/types';

import { night1 } from './common/night1';
import { night2 } from './common/night2';
import { night3 } from './common/night3';
import { night4 } from './common/night4';
import { night5 } from './common/night5';
import { night6 } from './common/night6';

import { factionA } from './faction/factionA';
import { factionB } from './faction/factionB';
import { factionC } from './faction/factionC';

import { routeLenny } from './character/lenny';
import { routeHugh } from './character/hugh';
import { routeJinpachi } from './character/jinpachi';
import { routeMuni } from './character/muni';
import { routeGeru } from './character/geru';
import { routeNeo } from './character/neo';

import { trueRoute } from './true/trueRoute';
import { badEndings } from './bad/badEndings';
import { normalEndings } from './normal/normalEndings';

export const ALL_SCENE_LISTS: Scene[][] = [
  night1, night2, night3, night4, night5, night6,
  factionA, factionB, factionC,
  routeLenny, routeHugh, routeJinpachi, routeMuni, routeGeru, routeNeo,
  trueRoute,
  badEndings,
  normalEndings,
];

export const ALL_SCENES: Scene[] = ALL_SCENE_LISTS.flat();

export const SCENES: SceneMap = (() => {
  const map: SceneMap = {};
  for (const s of ALL_SCENES) {
    if (map[s.id]) {
      throw new Error(`シーンIDが重複しています: ${s.id}`);
    }
    map[s.id] = s;
  }
  return map;
})();

export const START_SCENE = 'n1_open';
