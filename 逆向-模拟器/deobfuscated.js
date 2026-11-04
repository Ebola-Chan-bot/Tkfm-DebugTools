const COEF = 3.25;
const all = 0;
const allNotMe = 1;
const myCurAtk = "a";
const myCurShd = "b";
const always = 100;
let comp = [];
let GLOBAL_TURN = 1;
let lastDmg = 0;
let lastAddDmg = 0;
let lastAtvDmg = 0;
let lastDotDmg = 0;
let lastRefDmg = 0;
const command = [];
let dmg13 = 0;
const overflowDmg = 2147483647;
let hitAll = true;
let whoActed = -1;
let consoleOn = false;
const bossHitTarget = {
  id: 0,
  name: "타깃"
};
const alltimeFunc = [];
let BUFF_CACHE = true;
let BUFF_VER = 0;
function bumpBuff(_0x3e2361) {
  if (_0x3e2361 && typeof _0x3e2361 === "object") {
    _0x3e2361._bv = (_0x3e2361._bv || 0) + 1;
  } else {
    BUFF_VER++;
  }
}
class Boss {
  constructor() {
    this.hp = 10854389981;
    this.maxHp = 10854389981;
    this.def = false;
    this.name = "타깃";
    this.buff = [];
    this.li = [];
    this._bv = 0;
    this._ownCache = null;
    this._fullCache = null;
    this._actCache = null;
  }
  getCurAtk() {
    return 0;
  }
  getArmor() {
    return 0;
  }
  hit() {
    addBuff(this, ["피격"], "추가");
    addBuff(this, ["피격"], "발동");
  }
  setBuff() {
    this.li = getBossBuffSizeList(this);
  }
}
const boss = new Boss();
class Champ {
  constructor(_0x13956a, _0x5ae040, _0x3f6077, _0x2012db, _0x5c4125, _0x4ea0c1, _0x16ba66, _0x55e6a4, _0x1ae389, _0x4fdbcc = COEF, _0x5c5187 = COEF) {
    this.id = _0x13956a;
    this.name = _0x5ae040;
    this.hp = Math.floor(_0x3f6077 * _0x4fdbcc);
    this.curHp = this.hp;
    this.atk = Math.floor(_0x2012db * _0x5c5187);
    this.cd = _0x5c4125;
    this.curCd = _0x5c4125;
    this.element = _0x4ea0c1;
    this.role = _0x16ba66;
    this.coef_hp = _0x4fdbcc;
    this.coef_atk = _0x5c5187;
    this.buff = [];
    this._bv = 0;
    this._ownCache = null;
    this._fullCache = null;
    this._actCache = null;
    this.atkMag = _0x55e6a4;
    this.ultMag = _0x1ae389;
    this.stopCd = false;
    this.canCDChange = true;
    this.isLeader = false;
    this.isActed = false;
    this.hpAtkDmg = 0;
    this.hpUltDmg = 0;
  }
  getArmor() {
    let _0x10fc2c = 0;
    for (let _0x14d99c of this.buff) {
      if (isTurn(_0x14d99c) && _0x14d99c.type == "아머") {
        _0x10fc2c += _0x14d99c.size / 100;
      }
    }
    return _0x10fc2c;
  }
  getCurAtk(_0x4cbdc4 = null) {
    const _0x11133e = _0x4cbdc4 || getBuffSizeList(this);
    const _0xcc5bb7 = Math.floor(this.atk * (1 + _0x11133e[0]) + _0x11133e[1]);
    if (_0xcc5bb7 > 0) {
      return _0xcc5bb7;
    } else {
      return 0;
    }
  }
  _coefAtk(_0x288533) {
    const _0x51ba5e = boss.def ? _0x288533[22] : 0;
    const _0x5e4b78 = 1 + _0x288533[2];
    const _0x41171f = 1 + _0x288533[3] + _0x288533[4] + _0x288533[13] + _0x288533[14] + _0x51ba5e;
    const _0x437d92 = 1 + _0x288533[9];
    const _0x1f0764 = 1 + _0x288533[10] + _0x288533[11];
    if (_0x5e4b78 < 0 || _0x41171f < 0 || _0x437d92 < 0 || _0x1f0764 < 0) {
      return null;
    }
    return _0x5e4b78 * _0x41171f * _0x437d92 * _0x1f0764;
  }
  _coefUlt(_0x32829d) {
    const _0x528659 = boss.def ? _0x32829d[22] : 0;
    const _0x2ed49a = 1 + _0x32829d[2];
    const _0x27b5e5 = 1 + _0x32829d[5] + _0x32829d[6] + _0x32829d[13] + _0x32829d[14] + _0x528659;
    const _0x15ef53 = 1 + _0x32829d[9];
    const _0x342522 = 1 + _0x32829d[10] + _0x32829d[11];
    if (_0x2ed49a < 0 || _0x27b5e5 < 0 || _0x15ef53 < 0 || _0x342522 < 0) {
      return null;
    }
    return _0x2ed49a * _0x27b5e5 * _0x15ef53 * _0x342522;
  }
  _coefAtv(_0x1c5d79) {
    const _0x20739c = boss.def ? _0x1c5d79[22] : 0;
    const _0x38779f = 1 + _0x1c5d79[2];
    const _0x604e2 = 1 + _0x1c5d79[12] + _0x1c5d79[5] + _0x1c5d79[6] + _0x1c5d79[7] + _0x1c5d79[8] + _0x1c5d79[13] + _0x1c5d79[14] + _0x20739c;
    const _0x28e805 = 1 + _0x1c5d79[9];
    const _0x58ab70 = 1 + _0x1c5d79[10] + _0x1c5d79[11];
    if (_0x38779f < 0 || _0x604e2 < 0 || _0x28e805 < 0 || _0x58ab70 < 0) {
      return null;
    }
    return _0x38779f * _0x604e2 * _0x28e805 * _0x58ab70;
  }
  getAtkDmg(_0x2d7677 = null) {
    const _0x493e6e = _0x2d7677 || getBuffSizeList(this);
    const _0x1de94e = this._coefAtk(_0x493e6e);
    if (_0x1de94e === null) {
      return 0;
    }
    return this.getCurAtk(_0x493e6e) * this.atkMag / 100 * _0x1de94e;
  }
  getHpAtkDmg(_0x51420b = null) {
    const _0x30e0ef = _0x51420b || getBuffSizeList(this);
    const _0x32cda7 = this._coefAtk(_0x30e0ef);
    if (_0x32cda7 === null) {
      return 0;
    }
    return this.hpAtkDmg / 100 * _0x32cda7;
  }
  atkAddCoef(_0x533fef = null) {
    const _0x1003fb = this._coefAtk(_0x533fef || getBuffSizeList(this));
    if (_0x1003fb === null) {
      return 0;
    } else {
      return _0x1003fb;
    }
  }
  atkAtvCoef(_0x300334 = null) {
    const _0x44ad9a = this._coefAtv(_0x300334 || getBuffSizeList(this));
    if (_0x44ad9a === null) {
      return 0;
    } else {
      return _0x44ad9a;
    }
  }
  getUltDmg(_0x1ed2ba = null) {
    const _0x121b38 = _0x1ed2ba || getBuffSizeList(this);
    const _0x2159bc = this._coefUlt(_0x121b38);
    if (_0x2159bc === null) {
      return 0;
    }
    return this.getCurAtk(_0x121b38) * this.ultMag / 100 * _0x2159bc;
  }
  getHpUltDmg(_0x137885 = null) {
    const _0x189ad5 = _0x137885 || getBuffSizeList(this);
    const _0x1fb0b1 = this._coefUlt(_0x189ad5);
    if (_0x1fb0b1 === null) {
      return 0;
    }
    return this.hpUltDmg / 100 * _0x1fb0b1;
  }
  ultAddCoef(_0x17c720 = null) {
    const _0x355227 = this._coefUlt(_0x17c720 || getBuffSizeList(this));
    if (_0x355227 === null) {
      return 0;
    } else {
      return _0x355227;
    }
  }
  ultAtvCoef(_0x3d055c = null) {
    const _0x4ee1ee = this._coefAtv(_0x3d055c || getBuffSizeList(this));
    if (_0x4ee1ee === null) {
      return 0;
    } else {
      return _0x4ee1ee;
    }
  }
  act_attack() {
    addBuff(this, ["평", "행동", "공격"], "추가");
    addBuff(this, ["평"], "발동");
    addBuff(this, ["공격"], "발동");
    addBuff(this, ["행동"], "발동");
    this.isActed = true;
  }
  act_ultimate() {
    addBuff(this, ["궁", "행동", "공격"], "추가");
    addBuff(this, ["궁"], "발동");
    addBuff(this, ["공격"], "발동");
    addBuff(this, ["행동"], "발동");
    this.isActed = true;
  }
  act_defense() {
    whoActed = this.id;
    lastDmg = 0;
    lastAddDmg = 0;
    lastAtvDmg = 0;
    lastDotDmg = 0;
    lastRefDmg = 0;
    addBuff(this, ["방", "행동"], "추가");
    addBuff(this, ["방"], "발동");
    addBuff(this, ["행동"], "발동");
    this.isActed = true;
  }
  heal() {
    if (this.isHealed) {
      return;
    }
    addBuff(this, ["힐"], "추가");
    addBuff(this, ["힐"], "발동");
    this.curHp = this.hp;
    this.isHealed = true;
  }
  heal2() {
    if (this.isHealed2) {
      return;
    }
    addBuff(this, ["힐"], "추가");
    addBuff(this, ["힐"], "발동");
    this.curHp = this.hp;
    this.isHealed2 = true;
  }
  heal3() {
    if (this.isHealed3) {
      return;
    }
    addBuff(this, ["힐"], "추가");
    addBuff(this, ["힐"], "발동");
    this.curHp = this.hp;
    this.isHealed3 = true;
  }
  bless(_0x2f5097) {
    addBuff(this, [_0x2f5097], "추가");
    addBuff(this, [_0x2f5097], "발동");
  }
  hit() {
    if (this.isHit) {
      return;
    }
    addBuff(this, ["피격"], "추가");
    addBuff(this, ["피격"], "발동");
    this.isHit = true;
  }
  getNest(_0x43f7b5) {
    const _0x3b0180 = this.buff.find(_0x42a366 => isNest(_0x42a366) && _0x42a366.type == _0x43f7b5);
    if (_0x3b0180) {
      return _0x3b0180.nest;
    } else {
      return 0;
    }
  }
}
function getInt(_0x1f65ae, _0x5709ca, _0x4baf9a = null) {
  const _0x41bce1 = _0x1f65ae.element;
  const _0x38a3a2 = _0x5709ca.element;
  if (_0x38a3a2 == undefined || _0x38a3a2 == -1 || _0x41bce1 == undefined || _0x41bce1 == -1) {
    return 1;
  }
  const _0x471841 = _0x4baf9a || getBuffSizeList(_0x1f65ae);
  let _0x969e9e = _0x471841[19];
  if (_0x969e9e > 1) {
    _0x969e9e = 1;
  }
  function _0x1fa057(_0x5decf1, _0x440c57) {
    if (_0x440c57 == 0) {
      if (_0x5decf1 == 1) {
        return -0.25;
      } else if (_0x5decf1 == 2) {
        return 0.5;
      } else {
        return 0;
      }
    }
    if (_0x440c57 == 1) {
      if (_0x5decf1 == 2) {
        return -0.25;
      } else if (_0x5decf1 == 0) {
        return 0.5;
      } else {
        return 0;
      }
    }
    if (_0x440c57 == 2) {
      if (_0x5decf1 == 0) {
        return -0.25;
      } else if (_0x5decf1 == 1) {
        return 0.5;
      } else {
        return 0;
      }
    }
    if (_0x440c57 == 3) {
      if (_0x5decf1 == 4) {
        return 0.5;
      } else {
        return 0;
      }
    }
    if (_0x440c57 == 4) {
      if (_0x5decf1 == 3) {
        return 0.5;
      } else {
        return 0;
      }
    }
    return 0;
  }
  return 1 + _0x1fa057(_0x38a3a2, _0x41bce1) * (1 - _0x969e9e);
}
function isExpired(_0xb6dbab) {
  let _0x3656f9 = _0xb6dbab.ex == undefined && _0xb6dbab.turn <= GLOBAL_TURN;
  let _0xfdf3ba = _0xb6dbab.ex != undefined && _0xb6dbab.ex <= GLOBAL_TURN;
  return _0x3656f9 || _0xfdf3ba;
}
function _notExpired(_0x41a67e) {
  return !(_0x41a67e.ex == undefined ? _0x41a67e.turn <= GLOBAL_TURN : _0x41a67e.ex <= GLOBAL_TURN);
}
function nextTurn() {
  const _0x5e5940 = boss.buff.filter(_0x39fa37 => _0x39fa37.type == "도트뎀");
  const _0x8178b6 = getBossBuffSizeList(boss);
  lastDotDmg = 0;
  for (let _0x4d9ca9 of _0x5e5940) {
    applyDotDmg(Math.floor(_0x4d9ca9.size / 100) * (1 + _0x8178b6[2] + _0x8178b6[18]), _0x4d9ca9.from);
  }
  GLOBAL_TURN += 1;
  for (let _0x4818a6 = 0; _0x4818a6 < comp.length; _0x4818a6++) {
    if (!comp[_0x4818a6].stopCd) {
      comp[_0x4818a6].curCd = comp[_0x4818a6].curCd <= 0 ? 0 : comp[_0x4818a6].curCd - 1;
    }
    comp[_0x4818a6].buff = comp[_0x4818a6].buff.filter(_notExpired);
    comp[_0x4818a6].isActed = false;
  }
  boss.buff = boss.buff.filter(_notExpired);
  bumpBuff();
  if (GLOBAL_TURN == 14) {
    dmg13 = Math.floor(boss.maxHp - boss.hp);
  }
  boss.def = false;
}
const _sizeStrCache = new Map();
function getSize(_0x1969d4) {
  let _0x1ba60a = _sizeStrCache.get(_0x1969d4);
  if (_0x1ba60a === undefined) {
    const _0x4ceea1 = _0x1969d4.slice(1);
    _0x1ba60a = {
      c: _0x1969d4.charAt(0),
      id: Number(_0x4ceea1.slice(0, 5)),
      per: Number(_0x4ceea1.slice(5))
    };
    _sizeStrCache.set(_0x1969d4, _0x1ba60a);
  }
  const _0x4a025f = _0x1ba60a.id;
  let _0x1c92e4 = comp.find(_0x2cda2b => _0x2cda2b.id == _0x4a025f);
  if (_0x1ba60a.c == myCurAtk) {
    return {
      size: _0x1ba60a.per * _0x1c92e4.getCurAtk(),
      from: _0x4a025f
    };
  } else if (_0x1ba60a.c == myCurShd) {
    return {
      size: _0x1ba60a.per * _0x1c92e4.getArmor(),
      from: _0x4a025f
    };
  } else {
    alert("버프 오류 발견");
    return 0;
  }
}
function mkBuff(_0x461b85, _0x40e0ee, _0x4f8c2c, _0x144de5, _0x1a1d54, _0x13668b, _0x5e73ee, _0x57d25d, _0x5cb499, _0x4c11eb, _0x13e46e, _0x1bd28c) {
  return {
    div: _0x461b85,
    act: _0x40e0ee,
    who: _0x4f8c2c,
    type: _0x144de5,
    size: _0x1a1d54,
    name: _0x13668b,
    turn: _0x5e73ee,
    nest: _0x57d25d,
    maxNest: _0x5cb499,
    ex: _0x4c11eb,
    on: _0x13e46e,
    from: _0x1bd28c
  };
}
function buff(..._0x1cb360) {
  if (_0x1cb360[0] === all) {
    for (let _0x254997 of comp) {
      _0x1cb360[0] = _0x254997;
      buff(..._0x1cb360);
    }
    return;
  }
  bumpBuff(_0x1cb360[0]);
  if (_0x1cb360.length == 6) {
    let _0x4150ff = null;
    if (typeof _0x1cb360[2] == "string") {
      const _0x1ffb70 = getSize(_0x1cb360[2]);
      if (_0x1cb360[1] == "도트뎀") {
        _0x4150ff = _0x1ffb70.from;
      }
      _0x1cb360[2] = _0x1ffb70.size;
    }
    if (_0x1cb360[1] == "아머") {
      _0x1cb360[0].buff.push(mkBuff("기본", undefined, undefined, _0x1cb360[1], _0x1cb360[2] * (1 + buffSizeByType(_0x1cb360[0], "받아증")), _0x1cb360[3], _0x1cb360[4] + GLOBAL_TURN, undefined, undefined, undefined, _0x1cb360[5], undefined));
    } else if (_0x1cb360[1] == "도트뎀") {
      const _0x1605f6 = comp.find(_0x253de0 => _0x253de0.id == _0x4150ff);
      _0x1cb360[0].buff.push(mkBuff("기본", undefined, undefined, _0x1cb360[1], _0x1cb360[2] * (1 + buffSizeByType(_0x1605f6, "가지증")), _0x1cb360[3], _0x1cb360[4] + GLOBAL_TURN, undefined, undefined, undefined, _0x1cb360[5], _0x1605f6));
    } else if (_0x1cb360[1] == "방어") {
      _0x1cb360[0].def = true;
    } else {
      _0x1cb360[0].buff.push(mkBuff("기본", undefined, undefined, _0x1cb360[1], _0x1cb360[2], _0x1cb360[3], _0x1cb360[4] + GLOBAL_TURN, undefined, undefined, undefined, _0x1cb360[5], undefined));
    }
  } else if (_0x1cb360.length == 7) {
    if (typeof _0x1cb360[2] == "string") {
      _0x1cb360[2] = getSize(_0x1cb360[2]).size;
    }
    const _0x1645b1 = _0x1cb360[0].buff.find(_0x26ece0 => _0x26ece0.div == "기본" && isNest(_0x26ece0) && _0x26ece0.name == _0x1cb360[3]);
    if (_0x1645b1) {
      _0x1645b1.nest += _0x1cb360[4];
      if (_0x1645b1.nest > _0x1645b1.maxNest) {
        _0x1645b1.nest = _0x1645b1.maxNest;
      }
      if (_0x1645b1.nest < 0) {
        _0x1645b1.nest = 0;
      }
      bumpBuff(_0x1cb360[0]);
    } else {
      _0x1cb360[0].buff.push(mkBuff("기본", undefined, undefined, _0x1cb360[1], _0x1cb360[2], _0x1cb360[3], undefined, _0x1cb360[4] < 0 ? 0 : _0x1cb360[4], _0x1cb360[5], undefined, _0x1cb360[6], undefined));
    }
  } else if (_0x1cb360.length == 10) {
    _0x1cb360[0].buff.push(mkBuff(_0x1cb360[8], _0x1cb360[1], _0x1cb360[2], _0x1cb360[3], _0x1cb360[4], _0x1cb360[5], _0x1cb360[6], undefined, undefined, _0x1cb360[7] + GLOBAL_TURN, _0x1cb360[9], undefined));
  } else if (_0x1cb360.length == 11) {
    _0x1cb360[0].buff.push(mkBuff(_0x1cb360[9], _0x1cb360[1], _0x1cb360[2], _0x1cb360[3], _0x1cb360[4], _0x1cb360[5], undefined, _0x1cb360[6], _0x1cb360[7], _0x1cb360[8] + GLOBAL_TURN, _0x1cb360[10], undefined));
  } else {
    alert("버프 오류 발견");
  }
}
const actSet = new Set(["평추가*", "평발동*", "궁추가*", "궁발동*", "방발동*", "평추가+", "평발동+", "궁추가+", "궁발동+", "방발동+", "반격*", "반격+"]);
const actList2 = ["공발동*", "공발동+"];
const actList3 = ["행발동*", "행발동+"];
const blessList = ["<빛의 축복>", "<바람의 축복>", "<불의 축복>"];
const actList2Set = new Set(actList2);
const actList3Set = new Set(actList3);
const blessSet = new Set(blessList);
const actOnlySet = new Set([...actSet, ...actList2, ...actList3]);
const actionMap = new Map([["평추가평추가+", (_0x41d624, _0x1246b6, _0x460220) => applyAddDmg(_0x1246b6.size / 100 * _0x41d624.atkAddCoef(_0x460220) * getInt(_0x41d624, boss, _0x460220))], ["평추가평추가*", (_0x219a7b, _0x7a024d, _0x473c3b) => applyAddDmg(_0x7a024d.size / 100 * _0x219a7b.getCurAtk(_0x473c3b) * _0x219a7b.atkAddCoef(_0x473c3b) * getInt(_0x219a7b, boss, _0x473c3b))], ["평발동평발동+", (_0x4266a6, _0x639cdc, _0xb6c050) => applyAtvDmg(_0x639cdc.size / 100 * _0x4266a6.atkAtvCoef(_0xb6c050) * getInt(_0x4266a6, boss, _0xb6c050))], ["평발동평발동*", (_0x3f3456, _0x2dcc1a, _0x499bc7) => applyAtvDmg(_0x2dcc1a.size / 100 * _0x3f3456.getCurAtk(_0x499bc7) * _0x3f3456.atkAtvCoef(_0x499bc7) * getInt(_0x3f3456, boss, _0x499bc7))], ["궁추가궁추가+", (_0xb8d1bd, _0x412b7e, _0x336786) => applyAddDmg(_0x412b7e.size / 100 * _0xb8d1bd.ultAddCoef(_0x336786) * getInt(_0xb8d1bd, boss, _0x336786))], ["궁추가궁추가*", (_0x3fb990, _0x39b575, _0x3cd539) => applyAddDmg(_0x39b575.size / 100 * _0x3fb990.getCurAtk(_0x3cd539) * _0x3fb990.ultAddCoef(_0x3cd539) * getInt(_0x3fb990, boss, _0x3cd539))], ["궁발동궁발동+", (_0x40fbb0, _0x147d13, _0x1b2c0d) => applyAtvDmg(_0x147d13.size / 100 * _0x40fbb0.ultAtvCoef(_0x1b2c0d) * getInt(_0x40fbb0, boss, _0x1b2c0d))], ["궁발동궁발동*", (_0x3c1b58, _0x117a82, _0x5a43c6) => applyAtvDmg(_0x117a82.size / 100 * _0x3c1b58.getCurAtk(_0x5a43c6) * _0x3c1b58.ultAtvCoef(_0x5a43c6) * getInt(_0x3c1b58, boss, _0x5a43c6))], ["방발동방발동+", (_0x58576a, _0x35d8aa, _0x259acf) => applyAtvDmg(_0x35d8aa.size / 100 * _0x58576a.ultAtvCoef(_0x259acf) * getInt(_0x58576a, boss, _0x259acf))], ["방발동방발동*", (_0x1ea83e, _0x400517, _0x3b5b70) => applyAtvDmg(_0x400517.size / 100 * _0x1ea83e.getCurAtk(_0x3b5b70) * _0x1ea83e.ultAtvCoef(_0x3b5b70) * getInt(_0x1ea83e, boss, _0x3b5b70))], ["피격발동반격+", (_0xff57a2, _0x26eb79, _0x1ebb8d) => applyRefDmg(_0x26eb79.size / 100 * _0xff57a2.ultAtvCoef(_0x1ebb8d) * getInt(_0xff57a2, boss, _0x1ebb8d), _0xff57a2)], ["피격발동반격*", (_0x15dc53, _0x132ea4, _0xa0d158) => applyRefDmg(_0x132ea4.size / 100 * _0x15dc53.getCurAtk(_0xa0d158) * _0x15dc53.ultAtvCoef(_0xa0d158) * getInt(_0x15dc53, boss, _0xa0d158), _0x15dc53)], ["공격발동공발동+", (_0x4c6d0a, _0x573ef5, _0xafda8a) => applyAtvDmg(_0x573ef5.size / 100 * _0x4c6d0a.ultAtvCoef(_0xafda8a) * getInt(_0x4c6d0a, boss, _0xafda8a))], ["공격발동공발동*", (_0x3b144f, _0x3437ae, _0x27d17b) => applyAtvDmg(_0x3437ae.size / 100 * _0x3b144f.getCurAtk(_0x27d17b) * _0x3b144f.ultAtvCoef(_0x27d17b) * getInt(_0x3b144f, boss, _0x27d17b))], ["행동발동행발동+", (_0x4cc228, _0x2d5303, _0x24e0f1) => applyAtvDmg(_0x2d5303.size / 100 * _0x4cc228.ultAtvCoef(_0x24e0f1) * getInt(_0x4cc228, boss, _0x24e0f1))], ["행동발동행발동*", (_0x34e976, _0x381f42, _0x41e83b) => applyAtvDmg(_0x381f42.size / 100 * _0x34e976.getCurAtk(_0x41e83b) * _0x34e976.ultAtvCoef(_0x41e83b) * getInt(_0x34e976, boss, _0x41e83b))]]);
function getActCands(_0x14a194) {
  const _0x454079 = _0x14a194.buff;
  const _0x3a6537 = _0x14a194._actCache;
  if (BUFF_CACHE && _0x3a6537 && _0x3a6537.v === BUFF_VER && _0x3a6537.ov === _0x14a194._bv && _0x3a6537.a === _0x454079 && _0x3a6537.n === _0x454079.length) {
    return _0x3a6537.r;
  }
  const _0x151217 = [];
  for (let _0x18caee = 0; _0x18caee < _0x454079.length; _0x18caee++) {
    const _0x717a7 = _0x454079[_0x18caee];
    if (_0x717a7.div == "추가" || _0x717a7.div == "발동" || _0x717a7.div == "기본" && actOnlySet.has(_0x717a7.type)) {
      _0x151217.push(_0x717a7);
    }
  }
  if (BUFF_CACHE) {
    _0x14a194._actCache = {
      v: BUFF_VER,
      ov: _0x14a194._bv,
      a: _0x454079,
      n: _0x454079.length,
      r: _0x151217
    };
  }
  return _0x151217;
}
function addBuff(_0xcb13ac, _0x32e094, _0x335c93) {
  const _0x19c849 = getActCands(_0xcb13ac);
  let _0x44d697;
  if (_0x335c93 == "추가") {
    _0x44d697 = 0;
  } else if (_0x335c93 == "발동") {
    _0x44d697 = _0x32e094.includes("공격") ? 1 : _0x32e094.includes("행동") ? 2 : 3;
  } else {
    throw new TypeError("actBuff is not iterable");
  }
  if (_0x19c849.length === 0) {
    return;
  }
  const _0x210b8b = [];
  const _0x5145d8 = [];
  for (let _0x3ad4fa = 0; _0x3ad4fa < _0x19c849.length; _0x3ad4fa++) {
    const _0x2b4175 = _0x19c849[_0x3ad4fa];
    let _0x2a1092;
    if (_0x44d697 === 0) {
      _0x2a1092 = _0x2b4175.div == "추가" && _0x32e094.includes(_0x2b4175.act) || _0x2b4175.div == "기본" && actSet.has(_0x2b4175.type);
    } else if (_0x44d697 === 1) {
      _0x2a1092 = _0x2b4175.div == "발동" && _0x2b4175.act == "공격" || _0x2b4175.div == "기본" && actList2Set.has(_0x2b4175.type);
    } else if (_0x44d697 === 2) {
      _0x2a1092 = _0x2b4175.div == "발동" && _0x2b4175.act == "행동" || _0x2b4175.div == "기본" && actList3Set.has(_0x2b4175.type);
    } else {
      _0x2a1092 = _0x2b4175.div == "발동" && _0x32e094.includes(_0x2b4175.act) || _0x2b4175.div == "기본" && actSet.has(_0x2b4175.type);
    }
    if (!_0x2a1092) {
      continue;
    }
    if (_0x2b4175.type === "힐" || blessSet.has(_0x2b4175.type)) {
      _0x5145d8.push(_0x2b4175);
    } else {
      _0x210b8b.push(_0x2b4175);
    }
  }
  if (_0x210b8b.length === 0 && _0x5145d8.length === 0) {
    return;
  }
  const _0x2850c2 = _0x5145d8.length === 0 ? _0x210b8b : _0x210b8b.concat(_0x5145d8);
  const _0x22fd01 = [];
  for (const _0x289fec of _0x2850c2) {
    if (!_0x289fec.on) {
      continue;
    }
    if (_0x289fec.type == "제거") {
      if (_0x289fec.who === all) {
        for (let _0x460eff of comp) {
          deleteBuff(_0x460eff, _0x289fec.size, _0x289fec.name);
        }
      } else {
        deleteBuff(_0x289fec.who, _0x289fec.size, _0x289fec.name);
      }
      continue;
    } else if (_0x289fec.type == "on") {
      if (_0x289fec.who === all) {
        for (let _0x37ca3b of comp) {
          setBuffOn(_0x37ca3b, _0x289fec.size, _0x289fec.name, true);
        }
      } else {
        setBuffOn(_0x289fec.who, _0x289fec.size, _0x289fec.name, true);
      }
      continue;
    } else if (_0x289fec.type == "off") {
      if (_0x289fec.who === all) {
        for (let _0x305e31 of comp) {
          setBuffOn(_0x305e31, _0x289fec.size, _0x289fec.name, false);
        }
      } else {
        setBuffOn(_0x289fec.who, _0x289fec.size, _0x289fec.name, false);
      }
      continue;
    } else if (_0x289fec.type == "트리거") {
      buff(..._0x289fec.size);
      continue;
    }
    if (_0x289fec.type == "아머") {
      _0x22fd01.push(_0x289fec);
      continue;
    }
    if (_0x289fec.type == "힐") {
      if (_0x289fec.div == "발동") {
        continue;
      }
      if (_0x289fec.who === all) {
        for (let _0x391736 of comp) {
          _0x391736.heal();
        }
      } else {
        _0x289fec.who.heal();
      }
    } else if (blessSet.has(_0x289fec.type)) {
      if (_0x289fec.who === all) {
        for (let _0x194758 of comp) {
          _0x194758.bless(_0x289fec.type);
        }
      } else {
        _0x289fec.who.bless(_0x289fec.type);
      }
    } else if (_0x289fec.div == "기본") {
      let _0x11f4bc;
      if (_0x32e094.includes("평")) {
        _0x11f4bc = "평" + _0x335c93 + _0x289fec.type;
      } else if (_0x32e094.includes("궁")) {
        _0x11f4bc = "궁" + _0x335c93 + _0x289fec.type;
      } else if (_0x32e094.includes("방")) {
        _0x11f4bc = "방" + _0x335c93 + _0x289fec.type;
      } else if (_0x32e094.includes("피격")) {
        _0x11f4bc = "피격" + _0x335c93 + _0x289fec.type;
      } else if (_0x32e094.includes("공격")) {
        _0x11f4bc = "공격" + _0x335c93 + _0x289fec.type;
      } else if (_0x32e094.includes("행동")) {
        _0x11f4bc = "행동" + _0x335c93 + _0x289fec.type;
      }
      const _0x405922 = actionMap.get(_0x11f4bc);
      if (_0x405922) {
        _0x405922(_0xcb13ac, _0x289fec, getBuffSizeList(_0xcb13ac));
      }
    } else {
      if (_0x289fec.div != undefined && _0x289fec.div != "추가" && _0x289fec.div != "발동") {
        alert("버프 오류 발견");
      }
      if (_0x289fec.who === all) {
        for (let _0x49f186 of comp) {
          if (_0x289fec.nest == undefined) {
            buff(_0x49f186, _0x289fec.type, _0x289fec.size, _0x289fec.name, _0x289fec.turn, true);
          } else {
            buff(_0x49f186, _0x289fec.type, _0x289fec.size, _0x289fec.name, _0x289fec.nest, _0x289fec.maxNest, true);
          }
        }
      } else if (_0x289fec.who.id == 0 && _0xcb13ac.name == "타깃" && _0x32e094.includes("피격")) {
        const _0x6811f9 = comp.find(_0x1f6e5b => _0x1f6e5b.id == whoActed);
        if (_0x289fec.nest == undefined) {
          buff(_0x6811f9 ? _0x6811f9 : _0x289fec.who, _0x289fec.type, _0x289fec.size, _0x289fec.name, _0x289fec.turn, true);
        } else {
          buff(_0x6811f9 ? _0x6811f9 : _0x289fec.who, _0x289fec.type, _0x289fec.size, _0x289fec.name, _0x289fec.nest, _0x289fec.maxNest, true);
        }
      } else if (_0x289fec.nest == undefined) {
        buff(_0x289fec.who, _0x289fec.type, _0x289fec.size, _0x289fec.name, _0x289fec.turn, true);
      } else {
        buff(_0x289fec.who, _0x289fec.type, _0x289fec.size, _0x289fec.name, _0x289fec.nest, _0x289fec.maxNest, true);
      }
    }
  }
  for (const _0x450136 of _0x22fd01) {
    let _0x15798d = _0x450136.size;
    if (typeof _0x15798d == "string") {
      _0x15798d = getSize(_0x15798d).size;
    }
    _0x15798d *= armorUp(_0xcb13ac, _0x32e094[0], _0x335c93);
    if (_0x450136.who === all) {
      for (let _0x974924 of comp) {
        if (_0x450136.nest == undefined) {
          buff(_0x974924, _0x450136.type, _0x15798d, _0x450136.name, _0x450136.turn, true);
        } else {
          buff(_0x974924, _0x450136.type, _0x15798d, _0x450136.name, _0x450136.nest, _0x450136.maxNest, true);
        }
      }
    } else if (_0x450136.nest == undefined) {
      buff(_0x450136.who, _0x450136.type, _0x15798d, _0x450136.name, _0x450136.turn, true);
    } else {
      buff(_0x450136.who, _0x450136.type, _0x15798d, _0x450136.name, _0x450136.nest, _0x450136.maxNest, true);
    }
  }
}
let atvOverflowed = false;
const isOverflowed = [false, false, false, false, false];
function applyAddDmg(_0xda83f7) {
  if (_0xda83f7 <= 0) {
    _0xda83f7 = 0;
  }
  if (boss.def) {
    let _0x20d0cf = 0.5 - getBossBuffSizeList(boss)[21];
    if (_0x20d0cf < 0) {
      _0x20d0cf = 0;
    }
    _0xda83f7 = _0xda83f7 * (1 - _0x20d0cf);
  }
  if (_0xda83f7 > overflowDmg) {
    isOverflowed[1] = true;
    _0xda83f7 = overflowDmg;
  }
  lastAddDmg += _0xda83f7;
  boss.hp -= _0xda83f7;
  if (consoleOn) {
    console.log("추가 - " + _0xda83f7);
  }
}
function applyAtvDmg(_0x39eb0b) {
  if (_0x39eb0b <= 0) {
    _0x39eb0b = 0;
  }
  if (boss.def) {
    let _0x2e4f0d = 0.5 - getBossBuffSizeList(boss)[21];
    if (_0x2e4f0d < 0) {
      _0x2e4f0d = 0;
    }
    _0x39eb0b = _0x39eb0b * (1 - _0x2e4f0d);
  }
  if (_0x39eb0b > overflowDmg) {
    isOverflowed[2] = true;
    _0x39eb0b = overflowDmg;
  }
  lastAtvDmg += _0x39eb0b;
  boss.hp -= _0x39eb0b;
  if (consoleOn) {
    console.log("발동 - " + _0x39eb0b);
  }
}
function applyDotDmg(_0x3200ee, _0x510ae7) {
  if (_0x3200ee <= 0) {
    _0x3200ee = 0;
  }
  if (_0x3200ee > overflowDmg) {
    isOverflowed[3] = true;
    _0x3200ee = overflowDmg;
  }
  lastDotDmg += _0x3200ee;
  boss.hp -= _0x3200ee;
  if (consoleOn) {
    console.log("도트 - " + _0x3200ee);
  }
  return _0x3200ee;
}
function applyRefDmg(_0x88d007, _0x56ed5f) {
  if (_0x88d007 <= 0) {
    _0x88d007 = 0;
  }
  if (boss.def) {
    let _0xd37d8f = 0.5 - getBossBuffSizeList(boss)[21];
    if (_0xd37d8f < 0) {
      _0xd37d8f = 0;
    }
    _0x88d007 = _0x88d007 * (1 - _0xd37d8f);
  }
  if (_0x88d007 > overflowDmg) {
    isOverflowed[4] = true;
    _0x88d007 = overflowDmg;
  }
  lastRefDmg += _0x88d007;
  boss.hp -= _0x88d007;
  if (consoleOn) {
    console.log("반격 - " + _0x88d007);
  }
  return _0x88d007;
}
function isNest(_0x518eb8) {
  return _0x518eb8.act == undefined && _0x518eb8.nest != undefined;
}
function isTurn(_0x1f22aa) {
  return _0x1f22aa.act == undefined && _0x1f22aa.nest == undefined;
}
function isActNest(_0x15a06a) {
  return _0x15a06a.act != undefined && _0x15a06a.nest != undefined;
}
function isActTurn(_0x373007) {
  return _0x373007.act != undefined && _0x373007.nest == undefined;
}
const buff_ex = ["도트뎀"];
const txts = ["공퍼증", "공고증", "받뎀증", "일뎀증", "받일뎀", "궁뎀증", "받궁뎀", "발뎀증", "받발뎀", "가뎀증", "속뎀증", "받속뎀", "발효증", "받직뎀", "받캐뎀", "아머", "가아증", "받아증", "받지뎀", "속상감", "가지증", "방경감", "방뎀증"];
const txtsMap = new Map([["공퍼증", 0], ["공고증", 1], ["받뎀증", 2], ["일뎀증", 3], ["받일뎀", 4], ["궁뎀증", 5], ["받궁뎀", 6], ["발뎀증", 7], ["받발뎀", 8], ["가뎀증", 9], ["속뎀증", 10], ["받속뎀", 11], ["발효증", 12], ["받직뎀", 13], ["받캐뎀", 14], ["아머", 15], ["가아증", 16], ["받아증", 17], ["받지뎀", 18], ["속상감", 19], ["가지증", 20], ["방경감", 21], ["방뎀증", 22]]);
function calcBuffList(_0x2f9013) {
  const _0x26fa8e = Array(txts.length).fill(0);
  const _0x27b7aa = _0x2f9013.buff;
  let _0x101715 = false;
  for (let _0x1823c4 = 0; _0x1823c4 < buff_ex.length; _0x1823c4++) {
    if (txtsMap.has(buff_ex[_0x1823c4])) {
      _0x101715 = true;
      break;
    }
  }
  for (let _0x1ba54c = 0; _0x1ba54c < _0x27b7aa.length; _0x1ba54c++) {
    const _0x5666f2 = _0x27b7aa[_0x1ba54c];
    if (_0x5666f2.div != "기본") {
      continue;
    }
    if (!_0x5666f2.on) {
      continue;
    }
    const _0x70e9fd = txtsMap.get(_0x5666f2.type);
    if (_0x70e9fd !== undefined) {
      if (_0x101715 && buff_ex.includes(_0x5666f2.type)) {
        continue;
      }
      if (_0x5666f2.turn != undefined && _0x5666f2.turn <= GLOBAL_TURN) {
        continue;
      }
      _0x26fa8e[_0x70e9fd] += _0x5666f2.act == undefined && _0x5666f2.nest == undefined ? _0x5666f2.size / 100 : _0x5666f2.size * _0x5666f2.nest / 100;
    } else {
      if (buff_ex.includes(_0x5666f2.type)) {
        continue;
      }
      if (_0x5666f2.turn != undefined && _0x5666f2.turn <= GLOBAL_TURN) {
        continue;
      }
      if (actOnlySet.has(_0x5666f2.type)) {
        continue;
      }
      alert("버프 누락 : " + _0x5666f2.type);
    }
  }
  return _0x26fa8e;
}
function getBossBuffSizeList(_0xc51fa2) {
  if (!BUFF_CACHE) {
    return calcBuffList(_0xc51fa2);
  }
  const _0x4d0ffb = _0xc51fa2._ownCache;
  if (_0x4d0ffb && _0x4d0ffb.v === BUFF_VER && _0x4d0ffb.ov === _0xc51fa2._bv && _0x4d0ffb.a === _0xc51fa2.buff && _0x4d0ffb.n === _0xc51fa2.buff.length && _0x4d0ffb.t === GLOBAL_TURN) {
    return _0x4d0ffb.r;
  }
  const _0x1c6b06 = calcBuffList(_0xc51fa2);
  _0xc51fa2._ownCache = {
    v: BUFF_VER,
    ov: _0xc51fa2._bv,
    a: _0xc51fa2.buff,
    n: _0xc51fa2.buff.length,
    t: GLOBAL_TURN,
    r: _0x1c6b06
  };
  return _0x1c6b06;
}
function getBuffSizeList(_0x3cc004) {
  const _0x4e7131 = getBossBuffSizeList(_0x3cc004);
  const _0x540805 = getBossBuffSizeList(boss);
  boss.li = _0x540805;
  if (BUFF_CACHE) {
    const _0x13726b = _0x3cc004._fullCache;
    if (_0x13726b && _0x13726b.o === _0x4e7131 && _0x13726b.b === _0x540805) {
      return _0x13726b.r;
    }
  }
  const _0x46d584 = _0x4e7131.slice();
  for (let _0x291c1d = 0; _0x291c1d < _0x46d584.length; _0x291c1d++) {
    _0x46d584[_0x291c1d] += _0x540805[_0x291c1d];
  }
  if (BUFF_CACHE) {
    _0x3cc004._fullCache = {
      o: _0x4e7131,
      b: _0x540805,
      r: _0x46d584
    };
  }
  return _0x46d584;
}
function deleteBuff(_0x343697, _0x136893, _0x270967) {
  bumpBuff(_0x343697);
  for (let _0x500b87 = _0x343697.buff.length - 1; _0x500b87 >= 0; _0x500b87--) {
    if (_0x343697.buff[_0x500b87].name === _0x270967 && _0x343697.buff[_0x500b87].div == _0x136893) {
      _0x343697.buff.splice(_0x500b87, 1);
    }
  }
}
function keepOnlyLastBuff(_0xfa9fbc, _0x51b156, _0x27657e) {
  bumpBuff(_0xfa9fbc);
  let _0x361e85 = false;
  for (let _0x2552cd = _0xfa9fbc.buff.length - 1; _0x2552cd >= 0; _0x2552cd--) {
    if (_0xfa9fbc.buff[_0x2552cd].name === _0x27657e && _0xfa9fbc.buff[_0x2552cd].div == _0x51b156) {
      if (!_0x361e85) {
        _0x361e85 = true;
      } else {
        _0xfa9fbc.buff.splice(_0x2552cd, 1);
      }
    }
  }
}
function deleteBuffType(_0x146ba9, _0x5bba79, _0x42c702) {
  bumpBuff(_0x146ba9);
  for (let _0x3d4d6e = _0x146ba9.buff.length - 1; _0x3d4d6e >= 0; _0x3d4d6e--) {
    if (_0x146ba9.buff[_0x3d4d6e].type === _0x42c702 && _0x146ba9.buff[_0x3d4d6e].div == _0x5bba79) {
      _0x146ba9.buff.splice(_0x3d4d6e, 1);
    }
  }
}
const element = ["화", "수", "풍", "광", "암"];
const role = ["딜", "힐", "탱", "섶", "디"];
function getElementCnt() {
  let _0x17e6c8 = 0;
  let _0x292935 = Array.from(arguments);
  for (let _0x158d7e = 0; _0x158d7e < 5; _0x158d7e++) {
    if (_0x292935.includes(element[comp[_0x158d7e].element])) {
      _0x17e6c8++;
    }
  }
  return _0x17e6c8;
}
function getRoleCnt() {
  let _0x373719 = 0;
  let _0x188d33 = Array.from(arguments);
  for (let _0xc06be9 = 0; _0xc06be9 < 5; _0xc06be9++) {
    if (_0x188d33.includes(role[comp[_0xc06be9].role])) {
      _0x373719++;
    }
  }
  return _0x373719;
}
function getElementIdx() {
  let _0x5debca = [];
  let _0x26478c = Array.from(arguments);
  for (let _0x3ae567 = 0; _0x3ae567 < 5; _0x3ae567++) {
    if (_0x26478c.includes(element[comp[_0x3ae567].element])) {
      _0x5debca.push(_0x3ae567);
    }
  }
  return _0x5debca;
}
function getRoleIdx() {
  let _0x31ab0c = [];
  let _0x5a8eab = Array.from(arguments);
  for (let _0x18c886 = 0; _0x18c886 < 5; _0x18c886++) {
    if (_0x5a8eab.includes(role[comp[_0x18c886].role])) {
      _0x31ab0c.push(_0x18c886);
    }
  }
  return _0x31ab0c;
}
function hpUpAll(_0x2ed578) {
  for (let _0xb54c9a of comp) {
    hpUpMe(_0xb54c9a, _0x2ed578);
  }
}
function hpUpMe(_0x2cb37e, _0x1c416b) {
  const _0x1ae554 = getCharacter(_0x2cb37e.id);
  if (liberationList.includes(_0x2cb37e.name)) {
    _0x2cb37e.hp += Math.floor(_0x1ae554.hp * _0x2cb37e.coef_hp * 1.1 * (_0x1c416b / 100));
  } else {
    _0x2cb37e.hp += Math.floor(_0x1ae554.hp * _0x2cb37e.coef_hp * (_0x1c416b / 100));
  }
  _0x2cb37e.curHp = _0x2cb37e.hp;
}
function cdChange(_0x1b879d, _0x2c0111) {
  if (!_0x1b879d.canCDChange) {
    return;
  }
  _0x1b879d.curCd += _0x2c0111;
  if (_0x1b879d.curCd < 0) {
    _0x1b879d.curCd = 0;
  } else if (_0x1b879d.curCd > _0x1b879d.cd) {
    _0x1b879d.curCd = _0x1b879d.cd;
  }
}
function buffSizeByType(_0x46f5b9, _0x46c663) {
  const _0x325fa6 = _0x46f5b9.buff;
  let _0x2037a0 = 0;
  for (let _0x56f9ef = 0; _0x56f9ef < _0x325fa6.length; _0x56f9ef++) {
    const _0x34bae5 = _0x325fa6[_0x56f9ef];
    if (_0x34bae5.type == _0x46c663 && isTurn(_0x34bae5)) {
      _0x2037a0 += _0x34bae5.size;
    }
  }
  for (let _0x3097e4 = 0; _0x3097e4 < _0x325fa6.length; _0x3097e4++) {
    const _0x41440e = _0x325fa6[_0x3097e4];
    if (_0x41440e.type == _0x46c663 && isNest(_0x41440e)) {
      _0x2037a0 += _0x41440e.size * _0x41440e.nest;
    }
  }
  return _0x2037a0 / 100;
}
function buffNestByType(_0x3f5daf, _0x4a91db) {
  const _0x2703a4 = _0x3f5daf.buff.find(_0x439d1b => isNest(_0x439d1b) && _0x439d1b.type == _0x4a91db);
  if (!_0x2703a4) {
    return 0;
  }
  if (_0x2703a4.nest > _0x2703a4.maxNest) {
    return _0x2703a4.maxNest;
  } else if (_0x2703a4.nest < 0) {
    return 0;
  } else {
    return _0x2703a4.nest;
  }
}
function armorUp(_0x7e9f8b, _0x46dfa6, _0xa1333b) {
  const _0x1b51a7 = Math.max(0, 1 + buffSizeByType(_0x7e9f8b, "가아증"));
  const _0x186f5f = () => Math.max(0, 1 + buffSizeByType(_0x7e9f8b, "궁뎀증") + buffSizeByType(_0x7e9f8b, "발효증") + buffSizeByType(_0x7e9f8b, "발뎀증"));
  if (_0x46dfa6 == "궁") {
    if (_0xa1333b == "추가") {
      return Math.max(0, 1 + buffSizeByType(_0x7e9f8b, "궁뎀증")) * _0x1b51a7;
    }
    if (_0xa1333b == "발동") {
      return _0x186f5f() * _0x1b51a7;
    }
  } else if (_0x46dfa6 == "평") {
    if (_0xa1333b == "추가") {
      return Math.max(0, 1 + buffSizeByType(_0x7e9f8b, "일뎀증")) * _0x1b51a7;
    }
    if (_0xa1333b == "발동") {
      return _0x186f5f() * _0x1b51a7;
    }
  } else if (_0x46dfa6 == "방") {
    if (_0xa1333b == "발동") {
      return _0x186f5f() * _0x1b51a7;
    }
  } else {
    return _0x1b51a7;
  }
}
function tbf(..._0x50802e) {
  if (_0x50802e.length != 5) {
    showAlert(_0x50802e);
  }
  buff(..._0x50802e, true);
}
function ptbf(..._0x52a8ba) {
  if (_0x52a8ba.length != 8) {
    showAlert(_0x52a8ba);
  }
  buff(..._0x52a8ba, "추가", true);
}
function atbf(..._0x29ea73) {
  if (_0x29ea73.length != 8) {
    showAlert(_0x29ea73);
  }
  buff(..._0x29ea73, "발동", true);
}
function nbf(..._0x49398f) {
  if (_0x49398f.length != 6) {
    showAlert(_0x49398f);
  }
  buff(..._0x49398f, true);
}
function pnbf(..._0x19106d) {
  if (_0x19106d.length != 9) {
    showAlert(_0x19106d);
  }
  buff(..._0x19106d, "추가", true);
}
function anbf(..._0x44fbc6) {
  if (_0x44fbc6.length != 9) {
    showAlert(_0x44fbc6);
  }
  buff(..._0x44fbc6, "발동", true);
}
function showAlert(_0x30f8d8) {
  alert("버프 오류 발견");
}
function setBuffOnAll(_0x3b4913, _0x3f127d, _0x5ac521, _0xc16149) {
  bumpBuff(_0x3b4913);
  const _0xa5644d = _0x3b4913.buff.filter(_0x4b9dba => _0x4b9dba.div == _0x3f127d && _0x4b9dba.name == _0x5ac521);
  _0xa5644d.forEach(_0x3de37d => _0x3de37d.on = _0xc16149);
}
function setBuffOn(_0x312b65, _0x1b693e, _0x51d8f9, _0x2f9670) {
  bumpBuff(_0x312b65);
  const _0x2ef454 = _0x312b65.buff.find(_0x34e65e => _0x34e65e.div == _0x1b693e && _0x34e65e.name == _0x51d8f9);
  if (_0x2ef454) {
    _0x2ef454.on = _0x2f9670;
  }
}
function setBuffOnExtra(_0x2c29e9, _0x560b16, _0x56a30b, _0x3b704c, _0x3bf00e) {
  bumpBuff(_0x2c29e9);
  const _0x2334a6 = _0x2c29e9.buff.find(_0x4f1b40 => _0x4f1b40.div == _0x56a30b && _0x4f1b40.name == _0x3b704c && _0x56a30b != "기본" && _0x4f1b40.act == _0x560b16);
  if (_0x2334a6) {
    _0x2334a6.on = _0x3bf00e;
  }
}
function setBuffSizeUp(_0x46c304, _0x1aac9a, _0x1fa9d7, _0x39c89c) {
  bumpBuff(_0x46c304);
  const _0x57d6bd = _0x46c304.buff.find(_0x3de668 => _0x3de668.div == _0x1aac9a && _0x3de668.name == _0x1fa9d7);
  if (_0x57d6bd) {
    _0x57d6bd.size += _0x39c89c;
  }
}
function setBuffSizeUpAll(_0x275799, _0x3c7f15, _0x1ab8e7, _0x8eec5) {
  bumpBuff(_0x275799);
  const _0x911b54 = _0x275799.buff.filter(_0x2ec648 => _0x2ec648.div == _0x3c7f15 && _0x2ec648.name == _0x1ab8e7);
  _0x911b54.forEach(_0x220021 => _0x220021.size += _0x8eec5);
}
function setBuffSize(_0x3327a1, _0x31e8be, _0x5093fc, _0x5b0f68) {
  bumpBuff(_0x3327a1);
  const _0x2d206e = _0x3327a1.buff.find(_0x5301d0 => _0x5301d0.div == _0x31e8be && _0x5301d0.name == _0x5093fc);
  if (_0x2d206e) {
    _0x2d206e.size = _0x5b0f68;
  }
}
function setBuffSizeAll(_0x288c86, _0x468b4c, _0x269882, _0x34159c) {
  bumpBuff(_0x288c86);
  const _0x58f78e = _0x288c86.buff.filter(_0x5a828e => _0x5a828e.div == _0x468b4c && _0x5a828e.name == _0x269882);
  _0x58f78e.forEach(_0x397a5b => _0x397a5b.size = _0x34159c);
}
function setBuffNest(_0xd0c22d, _0x4efd6b, _0x42f442, _0x2142fc) {
  bumpBuff(_0xd0c22d);
  const _0x1fdeb5 = _0xd0c22d.buff.find(_0x287e4 => _0x287e4.div == _0x4efd6b && _0x287e4.name == _0x42f442);
  if (_0x1fdeb5) {
    _0x1fdeb5.nest = _0x2142fc;
  }
}
function setBuffWho(_0x4a6216, _0x46896a, _0x1adbf9, _0x218dd5) {
  const _0x380d50 = _0x4a6216.buff.find(_0x502599 => _0x502599.div == _0x46896a && _0x502599.name == _0x1adbf9);
  if (_0x380d50) {
    _0x380d50.who = _0x218dd5;
  }
}
function getBuffSize(_0x37e681, _0x5d1a4d, _0x37f2a4) {
  const _0x49b6e8 = _0x37e681.buff.find(_0x2428eb => _0x2428eb.div == _0x5d1a4d && _0x2428eb.name == _0x37f2a4);
  if (_0x49b6e8) {
    return _0x49b6e8.size;
  } else {
    return undefined;
  }
}
function setMnc(_0x143f82, _0x1fa7ae, _0x21c557) {
  if (_0x21c557 == undefined || _0x21c557 == null || _0x21c557 < 1 || _0x21c557 > 5) {
    _0x21c557 = 5;
  }
  _0x21c557 -= 1;
  _0x143f82.ultMag = _0x1fa7ae[_0x21c557 * 2];
  _0x143f82.cd = _0x1fa7ae[_0x21c557 * 2 + 1];
  _0x143f82.curCd = _0x1fa7ae[_0x21c557 * 2 + 1];
}
function setDefault(_0x23a024, _0x17c963) {
  switch (_0x23a024.id) {
    case 10001:
      setMnc(_0x23a024, [393, 4, 448, 4, 503, 4, 503, 4, 503, 3], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(_0x23a024, "공퍼증", 25, "맹렬한 불길1", 3);
            tbf(_0x23a024, "가뎀증", 5, "맹렬한 불길2", 3);
            break;
          case 2:
            tbf(_0x23a024, "공퍼증", 25, "맹렬한 불길1", 3);
            tbf(_0x23a024, "가뎀증", 5, "맹렬한 불길2", 3);
            break;
          case 3:
            tbf(_0x23a024, "공퍼증", 25, "맹렬한 불길1", 3);
            tbf(_0x23a024, "가뎀증", 10, "맹렬한 불길2", 3);
            break;
          case 4:
            tbf(_0x23a024, "공퍼증", 35, "맹렬한 불길1", 3);
            tbf(_0x23a024, "가뎀증", 10, "맹렬한 불길2", 3);
            break;
          default:
            tbf(_0x23a024, "공퍼증", 35, "맹렬한 불길1", 3);
            tbf(_0x23a024, "가뎀증", 10, "맹렬한 불길2", 3);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
        cdChange(_0x23a024, -1);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(20);
        tbf(all, "공퍼증", 40, "마왕 바알의 꿍꿍이1", always);
        tbf(all, "가뎀증", 20, "마왕 바알의 꿍꿍이2", always);
        tbf(_0x23a024, "공퍼증", 125, "마왕 바알의 꿍꿍이3", always);
        tbf(_0x23a024, "궁뎀증", 25, "마왕 바알의 꿍꿍이4", always);
      };
      _0x23a024.passive = function () {
        tbf(_0x23a024, "일뎀증", 25, "마왕의 육체1", always);
        tbf(_0x23a024, "궁뎀증", 15, "마왕의 육체2", always);
        anbf(_0x23a024, "궁", _0x23a024, "공퍼증", 15, "알 수 없는 성격", 1, 2, always);
        for (let _0x294bf5 of getElementIdx("화")) {
          anbf(_0x23a024, "궁", comp[_0x294bf5], "받속뎀", 10, "바알의 장난", 1, 2, always);
        }
        tbf(_0x23a024, "일뎀증", 10, "일반 공격 데미지+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        if (GLOBAL_TURN == 1) {
          cdChange(_0x23a024, -1);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10002:
      setMnc(_0x23a024, [0, 4, 0, 4, 0, 4, 0, 4, 0, 3], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(_0x23a024, "공퍼증", 60, "잔학무도", 3);
            break;
          case 2:
            tbf(_0x23a024, "공퍼증", 80, "잔학무도", 3);
            break;
          case 3:
            tbf(_0x23a024, "공퍼증", 100, "잔학무도", 3);
            break;
          case 4:
            tbf(_0x23a024, "공퍼증", 100, "잔학무도", 3);
            break;
          default:
            tbf(_0x23a024, "공퍼증", 100, "잔학무도", 3);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        tbf(all, "공퍼증", 40, "마왕 사탄의 호기1", always);
        tbf(all, "가뎀증", 20, "마왕 사탄의 호기2", always);
        tbf(_0x23a024, "공퍼증", 100, "마왕 사탄의 호기3", always);
      };
      _0x23a024.passive = function () {
        tbf(_0x23a024, "반격*", 100, "사탄의 보답1", always);
        anbf(_0x23a024, "피격", _0x23a024, "공퍼증", 10, "사탄의 보답2", 1, 10, always);
        anbf(_0x23a024, "피격", _0x23a024, "가뎀증", 2, "불패의 육체", 1, 10, always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10003:
      setMnc(_0x23a024, [388, 4, 445, 4, 503, 4, 560, 4, 560, 3], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            nbf(_0x23a024, "받캐뎀", 5, "장미 맹독", 1, 3);
            break;
          case 2:
            nbf(_0x23a024, "받캐뎀", 5, "장미 맹독", 1, 3);
            break;
          case 3:
            nbf(_0x23a024, "받캐뎀", 10, "장미 맹독", 1, 3);
            break;
          case 4:
            nbf(_0x23a024, "받캐뎀", 10, "장미 맹독", 1, 3);
            break;
          default:
            nbf(_0x23a024, "받캐뎀", 10, "장미 맹독", 1, 3);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(20);
        tbf(all, "공퍼증", 40, "마왕 이블리스의 오만1", always);
        tbf(all, "가뎀증", 20, "마왕 이블리스의 오만2", always);
        tbf(_0x23a024, "평추가*", 150, "마왕 이블리스의 오만3", always);
        tbf(_0x23a024, "궁추가*", 150, "마왕 이블리스의 오만3", always);
      };
      _0x23a024.passive = function () {
        tbf(_0x23a024, "공퍼증", 20, "비전의 마력 의식", always);
        tbf(_0x23a024, "일뎀증", 20, "마력 섭취1", always);
        tbf(_0x23a024, "궁뎀증", 25, "마력 섭취3", always);
        tbf(_0x23a024, "공퍼증", 25, "중생 압박1", always);
        for (let _0x244c9d of getElementIdx("광")) {
          anbf(_0x23a024, "공격", comp[_0x244c9d], "받속뎀", 4, "중생 압박2", 1, 5, always);
        }
        tbf(_0x23a024, "일뎀증", 10, "일반 공격 데미지+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10004:
      setMnc(_0x23a024, [475, 6, 550, 6, 625, 6, 625, 6, 625, 6], _0x17c963);
      _0x23a024.ultbefore = function () {};
      _0x23a024.ultafter = function () {
        switch (_0x17c963) {
          case 1:
            nbf(all, "공퍼증", 15, "유도 화살", 1, 2);
            break;
          case 2:
            nbf(all, "공퍼증", 15, "유도 화살", 1, 2);
            break;
          case 3:
            nbf(all, "공퍼증", 15, "유도 화살", 1, 2);
            break;
          case 4:
            nbf(all, "공퍼증", 20, "유도 화살", 1, 2);
            break;
          default:
            nbf(all, "공퍼증", 25, "유도 화살", 1, 2);
            break;
        }
      };
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
        boss.def = false;
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(20);
        tbf(all, "공퍼증", 50, "엘프의 영역1", always);
        tbf(all, "일뎀증", 50, "엘프의 영역2", always);
        tbf(_0x23a024, "공퍼증", 50, "엘프의 영역3", always);
      };
      _0x23a024.passive = function () {
        atbf(_0x23a024, "공격", all, "가뎀증", 20, "인도자1", 1, always);
        atbf(_0x23a024, "공격", all, "일뎀증", 30, "인도자2", 1, always);
        pnbf(_0x23a024, "궁", boss, "받뎀증", 12.5, "파천일격1", 1, 2, always);
        anbf(_0x23a024, "궁", boss, "받일뎀", 35, "파천일격3", 1, 2, always);
        tbf(all, "공퍼증", 25, "불어오는 승리의 바람", always);
        tbf(_0x23a024, "일뎀증", 10, "일반 공격 데미지+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        if (GLOBAL_TURN == 1) {
          cdChange(_0x23a024, -6);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10005:
      setMnc(_0x23a024, [631, 6, 736, 6, 840, 6, 945, 6, 1050, 6], _0x17c963);
      _0x23a024.ultbefore = function () {
        boss.def = false;
      };
      _0x23a024.ultafter = function () {
        switch (_0x17c963) {
          case 1:
            tbf(_0x23a024, "일뎀증", 60, "활공 찢기", 3);
            break;
          case 2:
            tbf(_0x23a024, "일뎀증", 70, "활공 찢기", 3);
            break;
          case 3:
            tbf(_0x23a024, "일뎀증", 80, "활공 찢기", 3);
            break;
          case 4:
            tbf(_0x23a024, "일뎀증", 90, "활공 찢기", 3);
            break;
          default:
            tbf(_0x23a024, "일뎀증", 100, "활공 찢기", 3);
            break;
        }
      };
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(20);
        tbf(_0x23a024, "공퍼증", 125, "난쟁이왕의 기세1", always);
        tbf(_0x23a024, "일뎀증", 100, "난쟁이왕의 기세2", always);
        tbf(_0x23a024, "가뎀증", 35, "난쟁이왕의 기세3", always);
      };
      _0x23a024.passive = function () {
        anbf(_0x23a024, "행동", _0x23a024, "공퍼증", 15, "에너지 세이브", 1, 4, always);
        anbf(_0x23a024, "행동", _0x23a024, "가뎀증", 5, "정신통일", 1, 4, always);
        tbf(_0x23a024, "궁뎀증", 50, "파룡의 환광1", always);
        for (let _0x3330cb of getElementIdx("수")) {
          anbf(_0x23a024, "행동", comp[_0x3330cb], "받속뎀", 6, "파룡의 환광2", 1, 4, always);
        }
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10006:
      setMnc(_0x23a024, [0, 5, 0, 5, 0, 4, 0, 4, 0, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            for (let _0x4f01bb of getRoleIdx("섶")) {
              tbf(comp[_0x4f01bb], "공고증", myCurAtk + _0x23a024.id + 20, "모두 화이팅!", 1);
            }
            break;
          case 2:
            for (let _0x52a985 of getRoleIdx("섶")) {
              tbf(comp[_0x52a985], "공고증", myCurAtk + _0x23a024.id + 20, "모두 화이팅!", 1);
            }
            break;
          case 3:
            for (let _0x447fb of getRoleIdx("섶")) {
              tbf(comp[_0x447fb], "공고증", myCurAtk + _0x23a024.id + 20, "모두 화이팅!", 1);
            }
            break;
          case 4:
            for (let _0x32cab7 of getRoleIdx("섶")) {
              tbf(comp[_0x32cab7], "공고증", myCurAtk + _0x23a024.id + 20, "모두 화이팅!", 1);
            }
            break;
          default:
            for (let _0x3c6ce5 of getRoleIdx("섶")) {
              tbf(comp[_0x3c6ce5], "공고증", myCurAtk + _0x23a024.id + 25, "모두 화이팅!", 1);
            }
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
        for (let _0x31dddc of comp) {
          _0x31dddc.heal();
        }
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
        for (let _0x54b34c of comp) {
          _0x54b34c.heal();
        }
      };
      _0x23a024.leader = function () {
        hpUpAll(35);
        for (let _0x2a30b5 = 0; _0x2a30b5 < 5; _0x2a30b5++) {
          if (getRoleIdx("탱").includes(_0x2a30b5)) {
            hpUpMe(comp[_0x2a30b5], 15);
          }
        }
        tbf(all, "공퍼증", 40, "보호 욕구 자극1", always);
        tbf(all, "궁뎀증", 25, "보호 욕구 자극2", always);
        tbf(all, "가뎀증", 20, "보호 욕구 자극3", always);
      };
      _0x23a024.passive = function () {
        const _0x4e973d = comp.reduce((_0x3ff48a, _0x132e5b) => {
          if (_0x132e5b.curHp < _0x3ff48a.curHp) {
            return _0x132e5b;
          } else {
            return _0x3ff48a;
          }
        }, comp[0]);
        atbf(_0x23a024, "평", _0x4e973d, "힐", 40, "추가 치료", 1, always);
        atbf(_0x23a024, "공격", all, "공고증", myCurAtk + _0x23a024.id + 25, "전격 지원", 1, always);
        tbf(all, "궁뎀증", 30, "모두에게 노력의 성과를 보여주겠어!1", always);
        for (let _0x354b64 of getElementIdx("풍")) {
          anbf(_0x23a024, "궁", comp[_0x354b64], "받속뎀", 20, "모두에게 노력의 성과를 보여주겠어!2", 1, 2, always);
        }
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {};
      return _0x23a024;
    case 10007:
      setMnc(_0x23a024, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x17c963);
      _0x23a024.ultbefore = function () {};
      _0x23a024.ultafter = function () {
        switch (_0x17c963) {
          case 1:
            tbf(boss, "도트뎀", myCurAtk + _0x23a024.id + 399, "대천사의 진노", 1);
            break;
          case 2:
            tbf(boss, "도트뎀", myCurAtk + _0x23a024.id + 458, "대천사의 진노", 1);
            break;
          case 3:
            tbf(boss, "도트뎀", myCurAtk + _0x23a024.id + 518, "대천사의 진노", 1);
            break;
          case 4:
            tbf(boss, "도트뎀", myCurAtk + _0x23a024.id + 578, "대천사의 진노", 1);
            break;
          default:
            tbf(boss, "도트뎀", myCurAtk + _0x23a024.id + 638, "대천사의 진노", 1);
            break;
        }
      };
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        for (let _0x409856 of getElementIdx("광")) {
          atbf(comp[_0x409856], "행동", all, "공퍼증", 30, "<대천사의 축복-성벌>", 50, 1);
        }
        for (let _0x916e72 of getElementIdx("화", "풍")) {
          atbf(comp[_0x916e72], "행동", all, "일뎀증", 60, "<대천사의 축복-심판>", 50, 1);
        }
        for (let _0xe28324 of getElementIdx("수", "암")) {
          atbf(comp[_0xe28324], "행동", all, "궁뎀증", 30, "<대천사의 축복-정죄>", 50, 1);
        }
      };
      _0x23a024.passive = function () {
        atbf(_0x23a024, "평", boss, "도트뎀", myCurAtk + _0x23a024.id + 130, "빛의 징계", 1, always);
        for (let _0x5bda12 of getElementIdx("광")) {
          atbf(comp[_0x5bda12], "행동", all, "공퍼증", 10, "<천사의 축복-성벌>", 50, 1);
        }
        for (let _0x46867e of getElementIdx("화", "풍")) {
          atbf(comp[_0x46867e], "행동", all, "일뎀증", 20, "<천사의 축복-심판>", 50, 1);
        }
        for (let _0x3eb062 of getElementIdx("수", "암")) {
          atbf(comp[_0x3eb062], "행동", all, "궁뎀증", 10, "<천사의 축복-정죄>", 50, 1);
        }
        atbf(_0x23a024, "공격", _0x23a024, "공퍼증", 50, "천벌의 힘", 4, always);
        tbf(_0x23a024, "공퍼증", 10, "공격력 증가", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10008:
      setMnc(_0x23a024, [60, 4, 70, 4, 80, 4, 90, 4, 100, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            nbf(_0x23a024, "공퍼증", 125, "전 지역 섬멸모드 - 가동", 1, 2);
            break;
          case 2:
            nbf(_0x23a024, "공퍼증", 130, "전 지역 섬멸모드 - 가동", 1, 2);
            break;
          case 3:
            nbf(_0x23a024, "공퍼증", 135, "전 지역 섬멸모드 - 가동", 1, 2);
            break;
          case 4:
            nbf(_0x23a024, "공퍼증", 140, "전 지역 섬멸모드 - 가동", 1, 2);
            break;
          default:
            nbf(_0x23a024, "공퍼증", 150, "전 지역 섬멸모드 - 가동", 1, 2);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        tbf(all, "공퍼증", 70, "최종 병기 소녀 모드", always);
        _0x23a024.cd -= 3;
        tbf(_0x23a024, "공퍼증", 450, "<최종병기 · 해방>1", 6);
        tbf(_0x23a024, "일뎀증", 100, "<최종병기 · 해방>2", 6);
        tbf(_0x23a024, "궁뎀증", 100, "<최종병기 · 해방>3", 6);
      };
      _0x23a024.passive = function () {
        anbf(_0x23a024, "공격", _0x23a024, "가뎀증", 10, "자아 학습 전투 시스템", 1, 5, always);
        atbf(_0x23a024, "방", _0x23a024, "아머", _0x23a024.hp * 50, "방어 모드 - 전환", 3, always);
        anbf(_0x23a024, "방", _0x23a024, "가뎀증", 10, "자아 학습 전투 시스템", -2, 5, always);
        tbf(_0x23a024, "공발동*", 100, "마인드 센서포 - 가동", always);
        tbf(_0x23a024, "일뎀증", 10, "일반 공격 데미지+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {
          if (GLOBAL_TURN == 1) {
            cdChange(_0x23a024, -4);
          }
          if (GLOBAL_TURN == 7) {
            _0x23a024.cd += 3;
            _0x23a024.curCd += 3;
            if (_0x23a024.curCd > _0x23a024.cd) {
              _0x23a024.curCd = _0x23a024.cd;
            }
          }
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10017:
      setMnc(_0x23a024, [330, 4, 376, 4, 422, 4, 468, 4, 514, 3], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(_0x23a024, "가뎀증", 25, "태양제의 성찬", 3);
            break;
          case 2:
            tbf(_0x23a024, "가뎀증", 30, "태양제의 성찬", 3);
            break;
          case 3:
            tbf(_0x23a024, "가뎀증", 35, "태양제의 성찬", 3);
            break;
          case 4:
            tbf(_0x23a024, "가뎀증", 35, "태양제의 성찬", 4);
            break;
          default:
            tbf(_0x23a024, "가뎀증", 35, "태양제의 성찬", 4);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024, 2);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(30);
        tbf(all, "공퍼증", 45, "축제 마왕의 기세1", always);
        tbf(_0x23a024, "일뎀증", 150, "축제 마왕의 기세2", always);
        anbf(boss, "피격", _0x23a024, "공퍼증", 20, "<광란의 올나잇>1", 1, 5, 50);
        atbf(boss, "피격", _0x23a024, "평추가*", 30, "<광란의 올나잇>2", 50, 50);
        atbf(boss, "피격", boss, "제거", "발동", "<광란의 올나잇>1", 1, 1);
        atbf(boss, "피격", boss, "제거", "발동", "<광란의 올나잇>2", 1, 1);
      };
      _0x23a024.passive = function () {
        tbf(_0x23a024, "공퍼증", 40, "돈은 행동력으로부터", always);
        tbf(_0x23a024, "일뎀증", 80, "돈은 행동력으로부터", always);
        atbf(_0x23a024, "궁", _0x23a024, "평추가*", 150, "<고가 매입>", 4, always);
        tbf(_0x23a024, "일뎀증", 10, "일반 공격 데미지+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        if (GLOBAL_TURN == 1) {
          cdChange(_0x23a024, -4);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10018:
      setMnc(_0x23a024, [0, 3, 0, 3, 0, 3, 0, 3, 0, 3], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(_0x23a024, "아머", _0x23a024.hp * 30 * armorUp(_0x23a024, "궁", "추가"), "용자 돌진 - 엉망진창1", 1);
            tbf(_0x23a024, "평추가+", _0x23a024.atk * 150, "용자 돌진 - 엉망진창2", 4);
            tbf(_0x23a024, "궁추가+", _0x23a024.atk * 150, "용자 돌진 - 엉망진창3", 4);
            break;
          case 2:
            tbf(_0x23a024, "아머", _0x23a024.hp * 35 * armorUp(_0x23a024, "궁", "추가"), "용자 돌진 - 엉망진창1", 1);
            tbf(_0x23a024, "평추가+", _0x23a024.atk * 190, "용자 돌진 - 엉망진창2", 4);
            tbf(_0x23a024, "궁추가+", _0x23a024.atk * 190, "용자 돌진 - 엉망진창3", 4);
            break;
          case 3:
            tbf(_0x23a024, "아머", _0x23a024.hp * 40 * armorUp(_0x23a024, "궁", "추가"), "용자 돌진 - 엉망진창1", 1);
            tbf(_0x23a024, "평추가+", _0x23a024.atk * 190, "용자 돌진 - 엉망진창2", 4);
            tbf(_0x23a024, "궁추가+", _0x23a024.atk * 190, "용자 돌진 - 엉망진창3", 4);
            break;
          case 4:
            tbf(_0x23a024, "아머", _0x23a024.hp * 45 * armorUp(_0x23a024, "궁", "추가"), "용자 돌진 - 엉망진창1", 1);
            tbf(_0x23a024, "평추가+", _0x23a024.atk * 190, "용자 돌진 - 엉망진창2", 4);
            tbf(_0x23a024, "궁추가+", _0x23a024.atk * 190, "용자 돌진 - 엉망진창3", 4);
            break;
          default:
            tbf(_0x23a024, "아머", _0x23a024.hp * 50 * armorUp(_0x23a024, "궁", "추가"), "용자 돌진 - 엉망진창1", 1);
            tbf(_0x23a024, "평추가+", _0x23a024.atk * 230, "용자 돌진 - 엉망진창2", 4);
            tbf(_0x23a024, "궁추가+", _0x23a024.atk * 230, "용자 돌진 - 엉망진창3", 4);
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {
        tbf(_0x23a024, "아머", _0x23a024.hp * 15, "생을 위한 투쟁", 1);
      };
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        tbf(all, "공퍼증", 30, "우자의 마음 - 나만의 정의1", always);
        hpUpAll(25);
        _0x23a024.cd -= 1;
        _0x23a024.curCd -= 1;
        tbf(_0x23a024, "일뎀증", 100, "우자의 마음 - 나만의 정의2", always);
        tbf(_0x23a024, "궁뎀증", 40, "우자의 마음 - 나만의 정의3", always);
      };
      _0x23a024.passive = function () {
        tbf(_0x23a024, "평추가+", _0x23a024.atk * 150, "바보의 직진1", always);
        tbf(_0x23a024, "궁추가+", _0x23a024.atk * 375, "바보의 직진2", always);
        tbf(_0x23a024, "받아증", 35, "공존 불가1", always);
        tbf(_0x23a024, "가뎀증", 25, "공존 불가2", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10019:
      setMnc(_0x23a024, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(_0x23a024, "공퍼증", 30, "성검해방 - 성신역법", 3);
            break;
          case 2:
            tbf(_0x23a024, "공퍼증", 30, "성검해방 - 성신역법", 3);
            break;
          case 3:
            tbf(_0x23a024, "공퍼증", 35, "성검해방 - 성신역법", 3);
            break;
          case 4:
            tbf(_0x23a024, "공퍼증", 40, "성검해방 - 성신역법", 3);
            break;
          default:
            tbf(_0x23a024, "공퍼증", 45, "성검해방 - 성신역법", 3);
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        tbf(all, "공퍼증", 40, "기원의 힘1", always);
        for (let _0x181a4e of getRoleIdx("딜")) {
          atbf(comp[_0x181a4e], "공격", _0x23a024, "가뎀증", 25, "공격 습득1", 1, always);
          atbf(comp[_0x181a4e], "공격", _0x23a024, "평추가*", 75, "공격 습득2", 1, always);
          atbf(comp[_0x181a4e], "공격", _0x23a024, "궁추가*", 75, "공격 습득3", 1, always);
        }
        for (let _0x1389ee of getRoleIdx("섶")) {
          const _0x265466 = comp[_0x1389ee].ultafter;
          comp[_0x1389ee].ultafter = function (..._0x239d44) {
            _0x265466.apply(this, _0x239d44);
            atbf(_0x23a024, "공격", _0x23a024, "공퍼증", 50, "보조 습득", 2, 1);
          };
          const _0x4f6448 = comp[_0x1389ee].atkafter;
          comp[_0x1389ee].atkafter = function (..._0x217089) {
            _0x4f6448.apply(this, _0x217089);
            atbf(_0x23a024, "공격", _0x23a024, "공퍼증", 50, "보조 습득", 2, 1);
          };
        }
        for (let _0x3e16ea of getRoleIdx("디")) {
          const _0x11d46f = comp[_0x3e16ea].ultafter;
          comp[_0x3e16ea].ultafter = function (..._0x15e10a) {
            _0x11d46f.apply(this, _0x15e10a);
            atbf(_0x23a024, "공격", boss, "받뎀증", 20, "방해 습득", 2, 1);
          };
          const _0x3b55b5 = comp[_0x3e16ea].atkafter;
          comp[_0x3e16ea].atkafter = function (..._0x1a23ce) {
            _0x3b55b5.apply(this, _0x1a23ce);
            atbf(_0x23a024, "공격", boss, "받뎀증", 20, "방해 습득", 2, 1);
          };
        }
      };
      _0x23a024.passive = function () {
        tbf(_0x23a024, "궁추가*", 100, "흩날리는 별빛의 검", always);
        for (let _0x24f24c of comp) {
          if (_0x24f24c.id != _0x23a024.id) {
            atbf(_0x24f24c, "공격", _0x23a024, "일뎀증", 10, "스타더스트 플래시1", 1, 50);
            atbf(_0x24f24c, "공격", _0x23a024, "궁뎀증", 4, "스타더스트 플래시2", 1, 50);
          }
        }
        atbf(_0x23a024, "평", _0x23a024, "아머", _0x23a024.hp * 12.5, "구원의 별빛1", 1, always);
        anbf(_0x23a024, "궁", _0x23a024, "받캐뎀", 17.5, "구원의 별빛2", 1, 2, always);
        tbf(_0x23a024, "공퍼증", 10, "공격력 증가", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10020:
      setMnc(_0x23a024, [265, 3, 298, 3, 331, 3, 364, 3, 397, 3], _0x17c963);
      _0x23a024.ultbefore = function () {};
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        tbf(all, "공퍼증", 40, "개조 시작... 히히히...1", always);
        const _0x1e80a3 = [1, 3];
        for (let _0x152cc0 of _0x1e80a3) {
          tbf(comp[_0x152cc0], "궁뎀증", 30, "개조 시작... 히히히...2", always);
          tbf(comp[_0x152cc0], "일뎀증", 60, "개조 시작... 히히히...3", always);
        }
      };
      _0x23a024.passive = function () {
        for (let _0x470fc6 of comp) {
          atbf(_0x23a024, "궁", _0x470fc6, "아머", _0x470fc6.hp * 30, "커브드 포스필드", 1, always);
        }
        tbf(_0x23a024, "공퍼증", 10, "공격+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 4 == 0) {
          const _0x3de540 = [1, 3];
          for (let _0x38ef0f of _0x3de540) {
            tbf(comp[_0x38ef0f], "궁뎀증", 50, "마도 개조 수술", 2);
          }
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10021:
      setMnc(_0x23a024, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            for (let _0x3be9db of comp) {
              if (_0x3be9db.id != _0x23a024.id) {
                tbf(_0x3be9db, "공퍼증", 15, "재생의 바람1", 4);
              }
            }
            break;
          case 2:
            for (let _0x2ec4e2 of comp) {
              if (_0x2ec4e2.id != _0x23a024.id) {
                tbf(_0x2ec4e2, "공퍼증", 17.5, "재생의 바람1", 4);
              }
            }
            break;
          case 3:
            for (let _0x33d377 of comp) {
              if (_0x33d377.id != _0x23a024.id) {
                tbf(_0x33d377, "공퍼증", 17.5, "재생의 바람1", 1);
              }
            }
            for (let _0x315142 of comp) {
              if (_0x315142.id != _0x23a024.id) {
                tbf(_0x315142, "공퍼증", 17.5, "재생의 바람1", 4);
              }
            }
            break;
          case 4:
            for (let _0x51f4b0 of comp) {
              if (_0x51f4b0.id != _0x23a024.id) {
                tbf(_0x51f4b0, "공퍼증", 20, "재생의 바람1", 1);
              }
            }
            for (let _0x5a0d04 of comp) {
              if (_0x5a0d04.id != _0x23a024.id) {
                tbf(_0x5a0d04, "공퍼증", 20, "재생의 바람1", 4);
              }
            }
            break;
          default:
            for (let _0xb41601 of comp) {
              if (_0xb41601.id != _0x23a024.id) {
                tbf(_0xb41601, "공퍼증", 25, "재생의 바람1", 1);
              }
            }
            for (let _0x225cb9 of comp) {
              if (_0x225cb9.id != _0x23a024.id) {
                tbf(_0x225cb9, "공퍼증", 25, "재생의 바람1", 4);
              }
            }
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
        for (let _0x463336 of comp) {
          _0x463336.heal();
        }
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
        for (let _0xed40ac of comp) {
          _0xed40ac.heal();
        }
      };
      _0x23a024.leader = function () {
        hpUpAll(10);
        tbf(all, "공퍼증", 40, "시공을 초월한 현자1", always);
        for (let _0x5b536b of getRoleIdx("딜", "디")) {
          tbf(comp[_0x5b536b], "가뎀증", 20, "시공을 초월한 현자2", always);
        }
        for (let _0x80ddd1 of getRoleIdx("탱")) {
          hpUpMe(comp[_0x80ddd1], 10);
        }
        for (let _0x37a046 of getRoleIdx("힐", "섶")) {
          tbf(comp[_0x37a046], "공퍼증", 40, "시공을 초월한 현자4", always);
        }
      };
      _0x23a024.passive = function () {
        hpUpMe(_0x23a024, 10);
        for (let _0x26aad5 of comp) {
          atbf(_0x23a024, "공격", _0x26aad5, "아머", _0x26aad5.hp * 10, "전능의 술1", 1, always);
        }
        for (let _0x3bf415 of getRoleIdx("딜", "디")) {
          atbf(_0x23a024, "공격", comp[_0x3bf415], "공고증", myCurAtk + _0x23a024.id + 20, "전능의 술2", 1, always);
        }
        tbf(_0x23a024, "공퍼증", 20, "천 년의 지혜", always);
        for (let _0xa87738 of getRoleIdx("딜", "디")) {
          tbf(comp[_0xa87738], "가뎀증", 15, "<적재적소>1", 50);
        }
        for (let _0x211e93 of getRoleIdx("힐", "섶")) {
          tbf(comp[_0x211e93], "공퍼증", 15, "<적재적소>2", 50);
        }
        tbf(_0x23a024, "공퍼증", 10, "공격+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10022:
      setMnc(_0x23a024, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x17c963);
      _0x23a024.ultbefore = function () {};
      _0x23a024.ultafter = function () {
        switch (_0x17c963) {
          case 1:
            anbf(boss, "피격", _0x23a024, "받캐뎀", 8.75, "배 가르기1", 1, 8, 4);
            break;
          case 2:
            anbf(boss, "피격", _0x23a024, "받캐뎀", 10, "배 가르기1", 1, 8, 4);
            break;
          case 3:
            anbf(boss, "피격", _0x23a024, "받캐뎀", 11.25, "배 가르기1", 1, 8, 4);
            nbf(boss, "받뎀증", 10, "배 가르기2", 1, 1);
            break;
          case 4:
            anbf(boss, "피격", _0x23a024, "받캐뎀", 12.5, "배 가르기1", 1, 8, 4);
            nbf(boss, "받뎀증", 20, "배 가르기2", 1, 1);
            break;
          default:
            anbf(boss, "피격", _0x23a024, "받캐뎀", 15, "배 가르기1", 1, 8, 4);
            nbf(boss, "받뎀증", 30, "배 가르기2", 1, 1);
        }
      };
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024, 10);
        deleteBuff(_0x23a024, "기본", "배 가르기1");
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(20);
        for (let _0x1cb671 of comp) {
          tbf(_0x1cb671, "궁뎀증", 50, "전쟁의 광기1", always);
        }
        for (let _0x3597fb of getRoleIdx("딜", "디", "탱")) {
          tbf(comp[_0x3597fb], "공퍼증", 40, "전쟁의 광기2", always);
          tbf(comp[_0x3597fb], "가뎀증", 25, "전쟁의 광기3", always);
        }
        atbf(_0x23a024, "궁", all, "힐", myCurAtk + _0x23a024.id + 200, "전쟁의 광기4", 1, always);
        for (let _0x14472a of getRoleIdx("딜", "디", "탱")) {
          if (_0x14472a != 0) {
            atbf(comp[_0x14472a], "궁", comp[0], "공퍼증", 90, "학살 시간이다!1", 1, always);
            atbf(comp[_0x14472a], "궁", comp[0], "궁추가*", 80, "학살 시간이다!2", 1, always);
          }
        }
      };
      _0x23a024.passive = function () {
        anbf(_0x23a024, "방", _0x23a024, "공퍼증", 100, "극도의 흥분", 1, 1, always);
        atbf(_0x23a024, "궁", _0x23a024, "제거", "기본", "극도의 흥분", 1, always);
        anbf(_0x23a024, "궁", _0x23a024, "가뎀증", 12, "물고 늘어지기", 1, 5, always);
        atbf(_0x23a024, "평", _0x23a024, "궁뎀증", 50, "아드레날린1", 2, always);
        atbf(_0x23a024, "평", _0x23a024, "궁추가*", 100, "아드레날린2", 2, always);
        tbf(_0x23a024, "궁추가*", 30, "궁극기 추격+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader && GLOBAL_TURN > 1) {
          for (let _0x58fee0 of comp);
        }
      };
      _0x23a024.turnover = function () {};
      return _0x23a024;
    case 10023:
      _0x23a024.stack = 0;
      setMnc(_0x23a024, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x17c963);
      buff_ex.push("<재편제>", "<역공 타이밍>", "<나약한 허상>", "<방향 틀기>");
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(_0x23a024, "공퍼증", 40, "광견의 충복1", 1);
            for (let _0x2bb723 of comp) {
              if (_0x2bb723.id != _0x23a024.id) {
                tbf(_0x2bb723, "공고증", myCurAtk + _0x23a024.id + 20, "광견의 충복2", 1);
              }
            }
            atbf(_0x23a024, "방", all, "아머", _0x23a024.hp * 15, "광견의 충복3", 4, 4);
            break;
          case 2:
            tbf(_0x23a024, "공퍼증", 60, "광견의 충복1", 1);
            for (let _0x5e291e of comp) {
              if (_0x5e291e.id != _0x23a024.id) {
                tbf(_0x5e291e, "공고증", myCurAtk + _0x23a024.id + 20, "광견의 충복2", 1);
              }
            }
            atbf(_0x23a024, "방", all, "아머", _0x23a024.hp * 17.5, "광견의 충복3", 4, 4);
            break;
          case 3:
            tbf(_0x23a024, "공퍼증", 70, "광견의 충복1", 1);
            for (let _0x10e7cf of comp) {
              if (_0x10e7cf.id != _0x23a024.id) {
                tbf(_0x10e7cf, "공고증", myCurAtk + _0x23a024.id + 22.5, "광견의 충복2", 1);
              }
            }
            atbf(_0x23a024, "방", all, "아머", _0x23a024.hp * 17.5, "광견의 충복3", 4, 4);
            break;
          case 4:
            tbf(_0x23a024, "공퍼증", 90, "광견의 충복1", 1);
            for (let _0x29a6d0 of comp) {
              if (_0x29a6d0.id != _0x23a024.id) {
                tbf(_0x29a6d0, "공고증", myCurAtk + _0x23a024.id + 22.5, "광견의 충복2", 1);
              }
            }
            atbf(_0x23a024, "방", all, "아머", _0x23a024.hp * 20, "광견의 충복3", 4, 4);
            break;
          default:
            tbf(_0x23a024, "공퍼증", 100, "광견의 충복1", 1);
            for (let _0x367493 of comp) {
              if (_0x367493.id != _0x23a024.id) {
                tbf(_0x367493, "공고증", myCurAtk + _0x23a024.id + 25, "광견의 충복2", 1);
              }
            }
            atbf(_0x23a024, "방", all, "아머", _0x23a024.hp * 20, "광견의 충복3", 4, 4);
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        const _0xf3e8f4 = _0x23a024.stack;
        setBuffOn(_0x23a024, "추가", "<반서의 포효>1-1", _0xf3e8f4 > 0);
        setBuffOn(_0x23a024, "추가", "<반서의 포효>1-2", _0xf3e8f4 > 0);
        setBuffOn(_0x23a024, "추가", "<반서의 포효>1-3", _0xf3e8f4 > 0);
        setBuffOn(_0x23a024, "추가", "<반서의 포효>1-4", _0xf3e8f4 > 0);
        setBuffOn(_0x23a024, "추가", "<반서의 포효>2", _0xf3e8f4 > 0);
        setBuffOn(_0x23a024, "추가", "<반서의 포효>3", _0xf3e8f4 > 0);
        setBuffOn(_0x23a024, "추가", "<반서의 포효>4", _0xf3e8f4 > 0);
        const _0x5147fe = _0x23a024.getNest("<역공 타이밍>");
        setBuffOn(_0x23a024, "기본", "<역습의 포화>", _0x5147fe > 0);
        setBuffOnAll(_0x23a024, "기본", "<역습의 총알 세례>", _0x5147fe > 0);
        ultLogic(_0x23a024);
        _0x23a024.stack = 0;
      };
      _0x23a024.atkbefore = function () {
        tbf(all, "공퍼증", 25, "작전 지휘", 1);
      };
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(10);
        tbf(all, "공퍼증", 100, "광견의 시야1", always);
        for (let _0x18f5c5 of comp) {
          if (_0x18f5c5.id != _0x23a024.id) {
            anbf(_0x18f5c5, "방", comp[0], "<재편제>", 0, "광견의 시야2", 1, 4, 50);
          }
        }
        buff(_0x23a024, "궁", comp[1], "공고증", myCurAtk + _0x23a024.id + 25, "<반서의 포효>1-1", 1, always, "추가", false);
        buff(_0x23a024, "궁", comp[2], "공고증", myCurAtk + _0x23a024.id + 25, "<반서의 포효>1-2", 1, always, "추가", false);
        buff(_0x23a024, "궁", comp[3], "공고증", myCurAtk + _0x23a024.id + 25, "<반서의 포효>1-3", 1, always, "추가", false);
        buff(_0x23a024, "궁", comp[4], "공고증", myCurAtk + _0x23a024.id + 25, "<반서의 포효>1-4", 1, always, "추가", false);
        buff(_0x23a024, "궁", all, "가뎀증", 50, "<반서의 포효>2", 1, always, "추가", false);
        buff(_0x23a024, "궁", all, "궁뎀증", 50, "<반서의 포효>3", 1, always, "추가", false);
        buff(_0x23a024, "궁", boss, "받뎀증", 50, "<반서의 포효>4", 1, always, "추가", false);
        anbf(_0x23a024, "궁", _0x23a024, "<방향 틀기>", 0, "광견의 시야3", -1, 1, always);
      };
      _0x23a024.passive = function () {
        nbf(_0x23a024, "<나약한 허상>", 0, "전략적 후퇴", 1, 1);
        anbf(_0x23a024, "궁", _0x23a024, "<나약한 허상>", 0, "전략적 후퇴", 1, 1, always);
        anbf(_0x23a024, "방", _0x23a024, "<역공 타이밍>", 0, "자신감의 계략", 1, 1, always);
        buff(_0x23a024, "궁추가*", 150, "<역습의 포화>", always, false);
        anbf(_0x23a024, "궁", _0x23a024, "<역공 타이밍>", 0, "자신감의 계략", -1, 1, always);
        buff(_0x23a024, "궁추가*", 45.5, "<역습의 총알 세례>", always, false);
        buff(_0x23a024, "궁추가*", 45.5, "<역습의 총알 세례>", always, false);
        buff(_0x23a024, "궁추가*", 45.5, "<역습의 총알 세례>", always, false);
        buff(_0x23a024, "궁추가*", 45.5, "<역습의 총알 세례>", always, false);
        buff(_0x23a024, "궁추가*", 45.5, "<역습의 총알 세례>", always, false);
        buff(_0x23a024, "궁추가*", 45.5, "<역습의 총알 세례>", always, false);
        buff(_0x23a024, "궁추가*", 45.5, "<역습의 총알 세례>", always, false);
        buff(_0x23a024, "궁추가*", 45.5, "<역습의 총알 세례>", always, false);
        tbf(_0x23a024, "공퍼증", 10, "공격+", always);
      };
      const _0x255527 = _0x23a024.hit;
      _0x23a024.hit = function (..._0x4c1925) {
        _0x255527.apply(this, _0x4c1925);
        deleteBuff(_0x23a024, "발동", "<반격>");
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
        deleteBuff(_0x23a024, "발동", "광견의 충복3");
        if (_0x23a024.isLeader && _0x23a024.getNest("<재편제>") == 4) {
          nbf(_0x23a024, "<방향 틀기>", 0, "광견의 시야3", 1, 1);
          _0x23a024.stack = 1;
        }
        if (_0x23a024.getNest("<나약한 허상>") == 1) {
          atbf(_0x23a024, "피격", all, "가뎀증", 35, "<반격>", 5, 1);
          anbf(_0x23a024, "피격", _0x23a024, "<나약한 허상>", 0, "전략적 후퇴", -1, 1, 1);
        }
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {
          if (GLOBAL_TURN > 1) {
            nbf(_0x23a024, "<재편제>", 0, "광견의 시야2", -4, 4);
          }
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10024:
      setMnc(_0x23a024, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x17c963);
      buff_ex.push("<영혼 접촉>", "<대영혼 접촉>");
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(all, "일뎀증", 30, "네크로맨서술 : 영혼 휘감기1", 4);
            break;
          case 2:
            tbf(all, "일뎀증", 30, "네크로맨서술 : 영혼 휘감기1", 4);
            break;
          case 3:
            tbf(all, "일뎀증", 40, "네크로맨서술 : 영혼 휘감기1", 4);
            tbf(boss, "받일뎀", 15, "네크로맨서술 : 영혼 휘감기2", 4);
            break;
          case 4:
            tbf(all, "일뎀증", 40, "네크로맨서술 : 영혼 휘감기1", 4);
            tbf(boss, "받일뎀", 20, "네크로맨서술 : 영혼 휘감기2", 4);
            break;
          default:
            tbf(all, "일뎀증", 50, "네크로맨서술 : 영혼 휘감기1", 4);
            tbf(boss, "받일뎀", 25, "네크로맨서술 : 영혼 휘감기2", 4);
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        for (let _0x2b218f of getRoleIdx("딜", "디")) {
          buff(comp[_0x2b218f], "평추가*", 40, "<영혼 접촉>", always, false);
          const _0x1e913d = comp[_0x2b218f].attack;
          comp[_0x2b218f].attack = function (..._0x3894c8) {
            const _0x34cf9d = comp[_0x2b218f].getNest("<영혼 접촉>");
            setBuffOn(comp[_0x2b218f], "기본", "<영혼 접촉>", _0x34cf9d > 0);
            _0x1e913d.apply(this, _0x3894c8);
            nbf(comp[_0x2b218f], "<영혼 접촉>", 0, "영혼 조종술 : 스릴 나이트", -1, 2);
            setBuffOn(comp[_0x2b218f], "기본", "<영혼 접촉>", _0x34cf9d > 1);
          };
        }
        if (getRoleCnt("딜") >= 3) {
          tbf(all, "공퍼증", 40, "<망령 빙의>1", always);
          tbf(all, "일뎀증", 40, "<망령 빙의>2", always);
          for (let _0x37ab7a of comp) {
            anbf(_0x37ab7a, "궁", _0x37ab7a, "받일뎀", 6, "<망령 빙의>3", 1, 4, always);
          }
        }
        if (getRoleCnt("디") >= 2) {
          tbf(all, "공퍼증", 40, "<망령 빙의>1", always);
          tbf(all, "일뎀증", 40, "<망령 빙의>2", always);
          for (let _0x3ac128 of comp) {
            anbf(_0x3ac128, "궁", _0x3ac128, "받일뎀", 6, "<망령 빙의>4", 1, 4, always);
          }
        }
      };
      _0x23a024.passive = function () {
        tbf(_0x23a024, "공퍼증", 40, "집령의 힘", always);
        for (let _0x3f28f2 of getRoleIdx("딜", "디")) {
          buff(comp[_0x3f28f2], "평추가*", 60, "<대영혼 접촉>", always, false);
          const _0x428a9f = comp[_0x3f28f2].attack;
          comp[_0x3f28f2].attack = function (..._0x1c7482) {
            const _0x1a343f = comp[_0x3f28f2].getNest("<대영혼 접촉>");
            setBuffOn(comp[_0x3f28f2], "기본", "<대영혼 접촉>", _0x1a343f > 0);
            _0x428a9f.apply(this, _0x1c7482);
            nbf(comp[_0x3f28f2], "<대영혼 접촉>", 0, "영혼 조종술 : 대영혼 접촉", -1, 2);
            setBuffOn(comp[_0x3f28f2], "기본", "<대영혼 접촉>", _0x1a343f > 1);
          };
        }
        anbf(_0x23a024, "평", boss, "받뎀증", 3.5, "영혼 찢어발기기", 1, 8, always);
        tbf(_0x23a024, "일뎀증", 10, "일반 공격 데미지+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {
          if (GLOBAL_TURN > 1) {
            for (let _0x2fe8f6 of getRoleIdx("딜", "디")) {
              tbf(comp[_0x2fe8f6], "공고증", myCurAtk + _0x23a024.id + 20, "<언데드 병사 강화술>", 1);
            }
          }
          if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 4 == 0) {
            for (let _0x218fe1 of getRoleIdx("딜", "디")) {
              nbf(comp[_0x218fe1], "<영혼 접촉>", 0, "영혼 조종술 : 스릴 나이트", 2, 2);
              setBuffOn(comp[_0x218fe1], "기본", "<영혼 접촉>", true);
            }
          }
        }
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 4 == 0) {
          for (let _0x2e7535 of getRoleIdx("딜", "디")) {
            nbf(comp[_0x2e7535], "<대영혼 접촉>", 0, "영혼 조종술 : 대영혼 접촉", 2, 2);
            setBuffOn(comp[_0x2e7535], "기본", "<대영혼 접촉>", true);
          }
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10025:
      setMnc(_0x23a024, [0, 6, 0, 6, 0, 6, 0, 6, 0, 6], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(boss, "도트뎀", myCurAtk + _0x23a024.id + 138.5, "달밤의 뜨거운 노래", 6);
            break;
          case 2:
            tbf(boss, "도트뎀", myCurAtk + _0x23a024.id + 160.4, "달밤의 뜨거운 노래", 6);
            break;
          case 3:
            tbf(boss, "도트뎀", myCurAtk + _0x23a024.id + 182.3, "달밤의 뜨거운 노래", 6);
            break;
          case 4:
            tbf(boss, "도트뎀", myCurAtk + _0x23a024.id + 204.2, "달밤의 뜨거운 노래", 6);
            break;
          default:
            tbf(boss, "도트뎀", myCurAtk + _0x23a024.id + 220, "달밤의 뜨거운 노래", 6);
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {
        tbf(boss, "도트뎀", myCurAtk + _0x23a024.id + 50, "열창", 4);
      };
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        tbf(_0x23a024, "공퍼증", 50, "고귀하고 완벽한 마족 아이돌", always);
      };
      _0x23a024.passive = function () {
        tbf(_0x23a024, "공퍼증", 20, "가창력", always);
        _0x23a024.cd -= 2;
        _0x23a024.curCd = _0x23a024.curCd < 2 ? 0 : _0x23a024.curCd - 2;
        tbf(_0x23a024, "공퍼증", 10, "공격력 증가", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {
          if (GLOBAL_TURN == 1) {
            cdChange(_0x23a024, -6);
          }
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10026:
      setMnc(_0x23a024, [0, 6, 0, 6, 0, 6, 0, 6, 0, 6], _0x17c963);
      _0x23a024.ultbefore = function () {
        for (let _0x20765b of comp) {
          if (_0x20765b.id != _0x23a024.id) {
            cdChange(_0x20765b, -1);
          }
        }
        switch (_0x17c963) {
          case 1:
            tbf(all, "궁뎀증", 10, "두근반짝", 3);
            break;
          case 2:
            tbf(all, "궁뎀증", 12.5, "두근반짝", 3);
            break;
          case 3:
            tbf(all, "궁뎀증", 15, "두근반짝", 3);
            break;
          case 4:
            tbf(all, "궁뎀증", 20, "두근반짝", 3);
            break;
          default:
            tbf(all, "궁뎀증", 20, "두근반짝", 6);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {
        tbf(all, "공고증", myCurAtk + _0x23a024.id + 30, "열창", 1);
      };
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(30);
        tbf(all, "공퍼증", 60, "반짝 아이돌 스타 노엘리1", always);
        tbf(all, "받아증", -75, "반짝 아이돌 스타 노엘리2", always);
        _0x23a024.cd -= 3;
        _0x23a024.curCd -= 3;
        anbf(_0x23a024, "궁", all, "궁뎀증", 10, "반짝 아이돌 스타 노엘리3", 1, 4, always);
      };
      _0x23a024.passive = function () {
        tbf(_0x23a024, "받아증", 30, "두 손을 들어요1", always);
        atbf(_0x23a024, "공격", all, "받아증", 12.5, "두 손을 들어요2", 2, always);
        anbf(_0x23a024, "궁", all, "공퍼증", 30, "함께 노래해요", 1, 1, always);
        atbf(_0x23a024, "궁", all, "공고증", myCurAtk + _0x23a024.id + 30, "팬들을 사랑해1", 1, always);
        atbf(_0x23a024, "궁", all, "아머", myCurAtk + _0x23a024.id + 100, "팬들을 사랑해2", 4, always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10027:
      setMnc(_0x23a024, [0, 3, 0, 3, 0, 3, 0, 3, 0, 3], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(boss, "받발뎀", 60, "살의의 유혹1", 3);
            tbf(_0x23a024, "공퍼증", 60, "살의의 유혹2", 1);
            break;
          case 2:
            tbf(boss, "받발뎀", 70, "살의의 유혹1", 3);
            tbf(_0x23a024, "공퍼증", 70, "살의의 유혹2", 1);
            break;
          case 3:
            tbf(boss, "받발뎀", 80, "살의의 유혹1", 3);
            tbf(_0x23a024, "공퍼증", 80, "살의의 유혹2", 1);
            break;
          case 4:
            tbf(boss, "받발뎀", 90, "살의의 유혹1", 3);
            tbf(_0x23a024, "공퍼증", 90, "살의의 유혹2", 1);
            break;
          default:
            tbf(boss, "받발뎀", 100, "살의의 유혹1", 3);
            tbf(_0x23a024, "공퍼증", 100, "살의의 유혹2", 1);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {
        tbf(_0x23a024, "공퍼증", 25, "갈겨찢기", 2);
      };
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        _0x23a024.cd -= 1;
        _0x23a024.curCd -= 1;
        tbf(_0x23a024, "공퍼증", 33, "블러드문의 재앙", always);
      };
      _0x23a024.passive = function () {
        anbf(_0x23a024, "피격", _0x23a024, "공퍼증", 10, "고통과 희열", 1, 5, always);
        tbf(_0x23a024, "반격*", 100, "살육의 욕망대로", always);
        tbf(_0x23a024, "가뎀증", 35, "살육의 충동", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10028:
      setMnc(_0x23a024, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            for (let _0x48c1a0 of getElementIdx("풍")) {
              nbf(comp[_0x48c1a0], "받속뎀", 15, "치즈루 전력의 일격!", 1, 2);
            }
            break;
          case 2:
            for (let _0x3129c5 of getElementIdx("풍")) {
              nbf(comp[_0x3129c5], "받속뎀", 15, "치즈루 전력의 일격!", 1, 2);
            }
            break;
          case 3:
            for (let _0x5e695 of getElementIdx("풍")) {
              nbf(comp[_0x5e695], "받속뎀", 15, "치즈루 전력의 일격!", 1, 2);
            }
            break;
          case 4:
            for (let _0xc2f276 of getElementIdx("풍")) {
              nbf(comp[_0xc2f276], "받속뎀", 20, "치즈루 전력의 일격!", 1, 2);
            }
            break;
          default:
            for (let _0x36f4e8 of getElementIdx("풍")) {
              nbf(comp[_0x36f4e8], "받속뎀", 25, "치즈루 전력의 일격!", 1, 2);
            }
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
        deleteBuff(_0x23a024, "기본", "방어 가속");
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpMe(_0x23a024, 50);
        tbf(_0x23a024, "공퍼증", 200, "각성 치즈루!1", always);
        tbf(_0x23a024, "궁뎀증", 100, "각성 치즈루!2", always);
      };
      _0x23a024.passive = function () {
        anbf(_0x23a024, "방", _0x23a024, "공퍼증", 50, "방어 가속", 1, 1, always);
        atbf(_0x23a024, "궁", all, "가뎀증", 20, "열풍의 격려1", 4, always);
        for (let _0x49e0a9 of getElementIdx("풍")) {
          anbf(_0x23a024, "궁", comp[_0x49e0a9], "궁뎀증", 20, "열풍의 격려2", 1, 2, always);
        }
        tbf(_0x23a024, "궁뎀증", 10, "궁극기 데미지+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
        cdChange(_0x23a024, -1);
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10029:
      setMnc(_0x23a024, [365, 4, 417, 4, 470, 4, 523, 4, 576, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        if (_0x17c963 >= 5) {
          nbf(boss, "받뎀증", 20, "워터 슬라이드 최고!", 1, 1);
        }
      };
      _0x23a024.ultafter = function () {
        if (_0x17c963 < 5) {
          nbf(boss, "받뎀증", 20, "워터 슬라이드 최고!", 1, 1);
        }
      };
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        for (let _0x4ed7c5 of getRoleIdx("딜")) {
          tbf(comp[_0x4ed7c5], "공퍼증", 60, "다들~전력을 다해 놀아보자구!", always);
        }
      };
      _0x23a024.passive = function () {
        anbf(_0x23a024, "공격", boss, "받뎀증", 4.5, "요호술 - 환통", 1, 6, always);
        tbf(_0x23a024, "공퍼증", 40, "멈출 수 없는 즐거움", always);
        tbf(_0x23a024, "궁뎀증", 10, "궁극기 데미지+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10030:
      setMnc(_0x23a024, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(all, "공퍼증", 20, "여름이 최고!1", 2);
            for (let _0x311056 of getRoleIdx("힐", "섶")) {
              buff(comp[_0x311056], "공격", all, "공퍼증", 15, "여름이 최고!2", 1, 2, "발동", false);
            }
            break;
          case 2:
            tbf(all, "공퍼증", 25, "여름이 최고!1", 2);
            for (let _0x62b065 of getRoleIdx("힐", "섶")) {
              buff(comp[_0x62b065], "공격", all, "공퍼증", 15, "여름이 최고!2", 1, 2, "발동", false);
            }
            break;
          case 3:
            tbf(all, "공퍼증", 25, "여름이 최고!1", 2);
            for (let _0x3096ea of getRoleIdx("힐", "섶")) {
              buff(comp[_0x3096ea], "공격", all, "공퍼증", 20, "여름이 최고!2", 1, 2, "발동", false);
            }
            break;
          case 4:
            tbf(all, "공퍼증", 30, "여름이 최고!1", 2);
            for (let _0x4f0134 of getRoleIdx("힐", "섶")) {
              buff(comp[_0x4f0134], "공격", all, "공퍼증", 20, "여름이 최고!2", 1, 2, "발동", false);
            }
            break;
          default:
            tbf(all, "공퍼증", 30, "여름이 최고!1", 2);
            for (let _0x12fd7f of getRoleIdx("힐", "섶")) {
              buff(comp[_0x12fd7f], "공격", all, "공퍼증", 25, "여름이 최고!2", 1, 2, "발동", false);
            }
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
        for (let _0x569175 of comp) {
          setBuffOnAll(_0x569175, "발동", "여름이 최고!2", true);
        }
      };
      _0x23a024.atkbefore = function () {
        tbf(all, "공고증", myCurAtk + _0x23a024.id + 30, "공주의 응원", 1);
      };
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        for (let _0x31604a of getRoleIdx("힐", "섶")) {
          tbf(comp[_0x31604a], "평추가*", 100, "집결! 공주호위대1", always);
          tbf(comp[_0x31604a], "궁추가*", 200, "집결! 공주호위대2", always);
        }
      };
      _0x23a024.passive = function () {
        atbf(_0x23a024, "궁", all, "아머", myCurAtk + _0x23a024.id + 100, "루루는 아픈 게 싫다구요", 1, always);
        for (let _0x1aa8d0 of getRoleIdx("힐", "섶")) {
          tbf(comp[_0x1aa8d0], "궁뎀증", 40, "난 강해질 거에요", 50);
        }
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 4 == 0) {
          tbf(boss, "받뎀증", 35, "루루를 괴롭히면 안 돼요~", 1);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10031:
      setMnc(_0x23a024, [265, 3, 298, 3, 331, 3, 364, 3, 397, 3], _0x17c963);
      _0x23a024.ultbefore = function () {
        if (_0x17c963 == 3) {
          tbf(boss, "받뎀증", 15, "출력 120% - 스매시", 3);
        }
        if (_0x17c963 == 4) {
          tbf(boss, "받뎀증", 20, "출력 120% - 스매시", 3);
        }
        if (_0x17c963 >= 5) {
          tbf(boss, "받뎀증", 20, "출력 120% - 스매시", 3);
        }
      };
      _0x23a024.ultafter = function () {
        if (_0x17c963 == 2) {
          tbf(boss, "받뎀증", 15, "출력 120% - 스매시", 3);
        }
        if (_0x17c963 == 1) {
          tbf(boss, "받뎀증", 15, "출력 120% - 스매시", 3);
        }
      };
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        tbf(boss, "받궁뎀", 50, "신뢰가는 해변의 보디가드", 50);
      };
      _0x23a024.passive = function () {
        tbf(_0x23a024, "궁뎀증", 20, "약점 분석", always);
        anbf(_0x23a024, "공격", boss, "받발뎀", 7.5, "고속 미니 어뢰3", 1, 4, always);
        anbf(_0x23a024, "궁", boss, "받발뎀", 32.5, "어획용 음폭탄3", 1, 1, always);
        tbf(_0x23a024, "공퍼증", 10, "공격력 증가", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 3 == 0) {
          tbf(_0x23a024, "공발동*", 40, "고속 미니 어뢰2", 1);
          tbf(_0x23a024, "공발동*", 40, "고속 미니 어뢰2", 1);
          tbf(_0x23a024, "공발동*", 40, "고속 미니 어뢰2", 1);
        }
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 4 == 0) {
          tbf(_0x23a024, "공발동*", 50, "어획용 음폭탄1", 1);
          tbf(_0x23a024, "공발동*", 50, "어획용 음폭탄1", 1);
          tbf(_0x23a024, "공발동*", 50, "어획용 음폭탄1", 1);
          tbf(_0x23a024, "공발동*", 50, "어획용 음폭탄1", 1);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10032:
      setMnc(_0x23a024, [475, 6, 550, 6, 625, 6, 700, 6, 775, 6], _0x17c963);
      _0x23a024.ultbefore = function () {
        if (_0x17c963 >= 5) {
          tbf(_0x23a024, "공퍼증", 15, "빛나는 모래사장이다냥!1", 1);
        }
        tbf(boss, "받궁뎀", 35, "빛나는 모래사장이다냥!2", 1);
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        tbf(all, "공발동*", 65, "묘비술오의 - 모래바람 냥이1", 50);
      };
      _0x23a024.passive = function () {
        anbf(_0x23a024, "궁", _0x23a024, "공퍼증", 30, "방심하지 않았다구", 1, 1, always);
        anbf(_0x23a024, "공격", all, "궁뎀증", 5, "민첩한 몸놀림", 1, 6, always);
        tbf(_0x23a024, "궁뎀증", 10, "궁극기 데미지+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10033:
      setMnc(_0x23a024, [0, 3, 0, 3, 0, 3, 0, 3, 0, 3], _0x17c963);
      _0x23a024.ultbefore = function () {};
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {
        tbf(boss, "받일뎀", 10, "악몽1", 3);
        tbf(boss, "받궁뎀", 5, "악몽2", 3);
        tbf(_0x23a024, "아머", myCurAtk + _0x23a024.id + armorUp(_0x23a024, "평", "추가") * 50, "악몽3", 1);
      };
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {};
      _0x23a024.passive = function () {};
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10034:
      setMnc(_0x23a024, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x17c963);
      const _0x47db83 = comp.find(_0x19d614 => _0x19d614.id == 10035);
      _0x23a024.ultbefore = function () {};
      _0x23a024.ultafter = function () {
        for (let _0x11c835 of comp) {
          tbf(_0x11c835, "아머", _0x11c835.hp * 15 * armorUp(_0x23a024, "궁", "추가"), "블러드 컷팅", 1);
        }
      };
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        for (let _0xf026ed of getElementIdx("화", "수")) {
          tbf(comp[_0xf026ed], "가뎀증", 50, "뒤엉킨 운명 - 레드1", always);
        }
        tbf(_0x23a024, "일뎀증", 30, "뒤엉킨 운명 - 레드2", 50);
        if (_0x47db83) {
          tbf(_0x47db83, "일뎀증", 30, "뒤엉킨 운명 - 레드2", 50);
        }
      };
      _0x23a024.passive = function () {
        tbf(_0x23a024, "일뎀증", 30, "붉은 재단", always);
        tbf(_0x23a024, "궁뎀증", 30, "블러드 커터1", always);
        if (_0x47db83) {
          tbf(_0x23a024, "가뎀증", 20, "블러드 커터2", always);
        }
        atbf(_0x23a024, "궁", _0x23a024, "일뎀증", 50, "영감 폭발", 4, always);
        tbf(_0x23a024, "일뎀증", 10, "일반 공격 데미지+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10035:
      setMnc(_0x23a024, [388, 4, 445, 4, 503, 4, 560, 4, 618, 4], _0x17c963);
      const _0x31b09f = comp.find(_0x59da9c => _0x59da9c.id == 10034);
      _0x23a024.ultbefore = function () {};
      _0x23a024.ultafter = function () {
        for (let _0x1b608f of comp) {
          tbf(_0x1b608f, "아머", _0x1b608f.hp * 15 * armorUp(_0x23a024, "궁", "추가"), "쪽빛 방직", 1);
        }
      };
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        for (let _0x24fedd of getElementIdx("화", "수")) {
          tbf(comp[_0x24fedd], "가뎀증", 50, "뒤엉킨 운명 - 블루1", always);
        }
        tbf(_0x23a024, "궁뎀증", 20, "뒤엉킨 운명 - 블루3", 50);
        if (_0x31b09f) {
          tbf(_0x31b09f, "궁뎀증", 20, "뒤엉킨 운명 - 블루3", 50);
        }
      };
      _0x23a024.passive = function () {
        tbf(_0x23a024, "궁뎀증", 30, "푸른 봉제", always);
        tbf(_0x23a024, "궁뎀증", 30, "코발트 니들1", always);
        if (_0x31b09f) {
          tbf(_0x23a024, "가뎀증", 20, "코발트 니들2", always);
        }
        atbf(_0x23a024, "평", _0x23a024, "궁뎀증", 10, "냉정한 판단", 6, always);
        tbf(_0x23a024, "궁뎀증", 10, "궁극기 데미지+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10037:
      setMnc(_0x23a024, [330, 4, 376, 4, 376, 3, 422, 3, 468, 3], _0x17c963);
      _0x23a024.ultbefore = function () {};
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        for (let _0x34fe31 of getElementIdx("화")) {
          tbf(comp[_0x34fe31], "공퍼증", 35, "정열의 춤사위", always);
        }
      };
      _0x23a024.passive = function () {
        atbf(_0x23a024, "평", boss, "받일뎀", 10, "카두케우스의 물어뜯기1", 3, always);
        atbf(_0x23a024, "궁", boss, "받궁뎀", 15, "카두케우스의 물어뜯기2", 2, always);
        anbf(_0x23a024, "공격", boss, "받일뎀", 4, "메스, 케이티 협공!", 1, 5, always);
        tbf(_0x23a024, "일뎀증", 10, "일반 공격 데미지+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10039:
      setMnc(_0x23a024, [505, 5, 586, 5, 667, 5, 748, 5, 829, 5], _0x17c963);
      _0x23a024.ultbefore = function () {};
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        const _0xb4c30e = [1, 3];
        for (let _0x2f01e of _0xb4c30e) {
          atbf(comp[_0x2f01e], "공격", _0x23a024, "공고증", myCurAtk + comp[_0x2f01e].id + 65, "피의 제물1", 1, always);
        }
        atbf(_0x23a024, "공격", all, "힐", 15, "피의 제물2", 1, always);
      };
      _0x23a024.passive = function () {
        anbf(_0x23a024, "평", _0x23a024, "공퍼증", 5, "선혈 섭취", 1, 3, always);
        _0x23a024.cd -= 1;
        _0x23a024.curCd -= 1;
        tbf(_0x23a024, "공퍼증", 10, "공격력 증가", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        if (GLOBAL_TURN == 1) {
          cdChange(_0x23a024, -5);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10040:
      setMnc(_0x23a024, [330, 4, 376, 4, 422, 4, 422, 4, 468, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        if (_0x17c963 == 3) {
          nbf(_0x23a024, "받캐뎀", 10, "천재 특제, 할로윈 한정 마력포", 1, 2);
        }
        if (_0x17c963 > 3) {
          nbf(_0x23a024, "받캐뎀", 15, "천재 특제, 할로윈 한정 마력포", 1, 2);
        }
      };
      _0x23a024.ultafter = function () {
        if (_0x17c963 < 3) {
          nbf(_0x23a024, "받캐뎀", 10, "천재 특제, 할로윈 한정 마력포", 1, 2);
        }
      };
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        tbf(all, "공퍼증", 40, "여러분의 마력을 내게 내줄래... 농담이야1", always);
        _0x23a024.stopCd = true;
        tbf(_0x23a024, "궁뎀증", 100, "여러분의 마력을 내게 내줄래... 농담이야2", always);
        for (let _0x21a335 = 1; _0x21a335 < 5; _0x21a335++) {
          if (!getRoleIdx("탱").includes(_0x21a335)) {
            const _0x3d205d = comp[_0x21a335].defense;
            comp[_0x21a335].defense = function (..._0xd96817) {
              _0x3d205d.apply(this, _0xd96817);
              cdChange(comp[0], -2);
              cdChange(comp[_0x21a335], 1);
            };
            atbf(comp[_0x21a335], "방", _0x23a024, "공고증", myCurAtk + comp[_0x21a335].id + 20, "여러분의 마력을 내게 내줄래... 농담이야3", 2, always);
          }
        }
      };
      _0x23a024.passive = function () {
        atbf(_0x23a024, "평", _0x23a024, "궁뎀증", 10, "서큐버스의 달란트", 4, always);
        atbf(_0x23a024, "궁", _0x23a024, "공퍼증", 50, "빠진 독에 마력 붓기", 4, always);
        tbf(_0x23a024, "가뎀증", 35, "서큐버스 군사의 비책", always);
        tbf(_0x23a024, "궁뎀증", 10, "궁극기 데미지+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        setBuffSizeUpAll(_0x23a024, "기본", "빠진 독에 마력 붓기", -12.5);
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10042:
      setMnc(_0x23a024, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            for (let _0x12e034 of getElementIdx("화", "수")) {
              tbf(comp[_0x12e034], "공퍼증", 30, "소녀의 연심은 무적!1", 1);
            }
            for (let _0x4e64c6 of getElementIdx("화", "수")) {
              nbf(comp[_0x4e64c6], "받속뎀", 5, "소녀의 연심은 무적!2", 1, 2);
            }
            break;
          case 2:
            for (let _0x19ed7d of getElementIdx("화", "수")) {
              tbf(comp[_0x19ed7d], "공퍼증", 30, "소녀의 연심은 무적!1", 1);
            }
            for (let _0x4769b8 of getElementIdx("화", "수")) {
              nbf(comp[_0x4769b8], "받속뎀", 7.5, "소녀의 연심은 무적!2", 1, 2);
            }
            break;
          case 3:
            for (let _0x5da8fc of getElementIdx("화", "수")) {
              tbf(comp[_0x5da8fc], "공퍼증", 40, "소녀의 연심은 무적!1", 1);
            }
            for (let _0x4ddb74 of getElementIdx("화", "수")) {
              nbf(comp[_0x4ddb74], "받속뎀", 10, "소녀의 연심은 무적!2", 1, 2);
            }
            break;
          case 4:
            for (let _0x3a9195 of getElementIdx("화", "수")) {
              tbf(comp[_0x3a9195], "공퍼증", 40, "소녀의 연심은 무적!1", 1);
            }
            for (let _0x5c399a of getElementIdx("화", "수")) {
              nbf(comp[_0x5c399a], "받속뎀", 12.5, "소녀의 연심은 무적!2", 1, 2);
            }
            break;
          default:
            for (let _0x483ab4 of getElementIdx("화", "수")) {
              tbf(comp[_0x483ab4], "공퍼증", 40, "소녀의 연심은 무적!1", 1);
            }
            for (let _0x577587 of getElementIdx("화", "수")) {
              nbf(comp[_0x577587], "받속뎀", 15, "소녀의 연심은 무적!2", 1, 2);
            }
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        tbf(all, "공퍼증", 100, "이블리스의 초호화 리조트!1", always);
        for (let _0x26147d of comp) {
          atbf(_0x23a024, "공격", _0x26147d, "아머", _0x26147d.hp * 25, "이블리스의 초호화 리조트!2", 1, always);
        }
        if (getRoleCnt("딜") == 5) {
          atbf(all, "공격", all, "힐", 1, "여름 만끽1", 1, always);
          for (let _0x134dc1 of comp) {
            atbf(_0x134dc1, "궁", all, "아머", myCurAtk + _0x134dc1.id + 12.5, "여름 만끽2", 1, always);
          }
          anbf(all, "공격", all, "궁뎀증", 5, "여름 만끽3", 1, 10, always);
          for (let _0x134844 of getElementIdx("수", "화")) {
            anbf(all, "공격", comp[_0x134844], "받속뎀", 3, "여름 만끽4", 1, 10, always);
          }
        }
      };
      _0x23a024.passive = function () {
        for (let _0x8d5e54 of getElementIdx("수", "화")) {
          anbf(_0x23a024, "궁", comp[_0x8d5e54], "공퍼증", 15, "여름 해변의 꽃2", 1, 2, always);
        }
        tbf(_0x23a024, "가뎀증", 25, "나에게 굴복하라!", always);
        tbf(_0x23a024, "공퍼증", 10, "공격력 증가", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 4 == 0) {
          for (let _0x5546ee of getElementIdx("수", "화")) {
            tbf(comp[_0x5546ee], "받속뎀", 40, "오만하구나!", 1);
          }
        }
      };
      _0x23a024.turnover = function () {};
      return _0x23a024;
    case 10043:
      setMnc(_0x23a024, [331.2, 4, 386.4, 4, 441.6, 4, 496.8, 4, 548, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        for (let _0x4f1abb of comp) {
          deleteBuff(_0x4f1abb, "기본", "최강 최고 최상의 할로 엘프 퀸1");
          deleteBuff(_0x4f1abb, "기본", "최강 최고 최상의 할로 엘프 퀸2");
          deleteBuff(_0x4f1abb, "기본", "최강 최고 최상의 할로 엘프 퀸3");
        }
        switch (_0x17c963) {
          case 1:
            tbf(all, "공퍼증", 22.2, "최강 최고 최상의 할로 엘프 퀸1", 4);
            for (let _0x4ce902 of getElementIdx("풍")) {
              tbf(comp[_0x4ce902], "받속뎀", 13.3, "최강 최고 최상의 할로 엘프 퀸3", 4);
            }
            break;
          case 2:
            tbf(all, "공퍼증", 25.9, "최강 최고 최상의 할로 엘프 퀸1", 4);
            for (let _0x3382ce of getElementIdx("풍")) {
              tbf(comp[_0x3382ce], "받속뎀", 15.5, "최강 최고 최상의 할로 엘프 퀸3", 4);
            }
            break;
          case 3:
            tbf(all, "공퍼증", 29.6, "최강 최고 최상의 할로 엘프 퀸1", 4);
            for (let _0x1a58ab of getRoleIdx("딜", "섶")) {
              if (comp[_0x1a58ab].id == _0x23a024.id) {
                continue;
              }
              tbf(comp[_0x1a58ab], "궁추가*", 30.4, "최강 최고 최상의 할로 엘프 퀸2", 5);
            }
            for (let _0x1764b9 of getElementIdx("풍")) {
              tbf(comp[_0x1764b9], "받속뎀", 17.8, "최강 최고 최상의 할로 엘프 퀸3", 4);
            }
            break;
          case 4:
            tbf(all, "공퍼증", 33.3, "최강 최고 최상의 할로 엘프 퀸1", 4);
            for (let _0x43c811 of getRoleIdx("딜", "섶")) {
              if (comp[_0x43c811].id == _0x23a024.id) {
                continue;
              }
              tbf(comp[_0x43c811], "궁추가*", 34.2, "최강 최고 최상의 할로 엘프 퀸2", 5);
            }
            for (let _0x2dc463 of getElementIdx("풍")) {
              tbf(comp[_0x2dc463], "받속뎀", 20, "최강 최고 최상의 할로 엘프 퀸3", 4);
            }
            break;
          default:
            tbf(all, "공퍼증", 37, "최강 최고 최상의 할로 엘프 퀸1", 4);
            for (let _0x419c92 of getRoleIdx("딜", "섶")) {
              if (comp[_0x419c92].id == _0x23a024.id) {
                continue;
              }
              tbf(comp[_0x419c92], "궁추가*", 38, "최강 최고 최상의 할로 엘프 퀸2", 5);
            }
            for (let _0x333a27 of getElementIdx("풍")) {
              tbf(comp[_0x333a27], "받속뎀", 22.2, "최강 최고 최상의 할로 엘프 퀸3", 4);
            }
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024, 2);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(55);
        if (getElementCnt("풍") >= 3) {
          for (let _0x24c812 of getRoleIdx("딜", "힐", "섶")) {
            tbf(comp[_0x24c812], "공퍼증", 11.3, "<캔디 축제>1", always);
            tbf(comp[_0x24c812], "가뎀증", 30.8, "<캔디 축제>2", always);
            tbf(comp[_0x24c812], "일뎀증", 38.5, "<캔디 축제>3", always);
            tbf(comp[_0x24c812], "궁뎀증", 25.8, "<캔디 축제>4", always);
            tbf(comp[_0x24c812], "평추가*", 25.5, "<캔디 축제>5", always);
            tbf(comp[_0x24c812], "궁추가*", 51.8, "<캔디 축제>6", always);
          }
        }
      };
      _0x23a024.passive = function () {
        for (let _0x2b5e3d of getRoleIdx("딜", "섶")) {
          anbf(_0x23a024, "평", comp[_0x2b5e3d], "받직뎀", 10, "출격! 나의 엘프(노예)여!", 1, 3, always);
        }
        anbf(_0x23a024, "평", boss, "받일뎀", 10, "사탕 징수령1", 1, 3, always);
        anbf(_0x23a024, "궁", boss, "받궁뎀", 5, "사탕 징수령2", 1, 2, always);
        anbf(_0x23a024, "궁", boss, "받뎀증", 7.4, "사탕 징수령3", 1, 2, always);
        for (let _0x1ec298 of getElementIdx("풍")) {
          anbf(_0x23a024, "궁", comp[_0x1ec298], "가뎀증", 15, "<여왕을 위해 싸운다>1", 1, 2, always);
          atbf(_0x23a024, "궁", comp[_0x1ec298], "제거", "기본", "<여왕을 위해 싸운다>2", 1, always);
          atbf(_0x23a024, "궁", comp[_0x1ec298], "평추가*", 18, "<여왕을 위해 싸운다>2", 4, always);
        }
        tbf(_0x23a024, "공퍼증", 10, "공격력 증가", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {
          if (GLOBAL_TURN == 1) {
            if (getElementCnt("풍") >= 3) {
              const _0x342eff = comp.find(_0x2dfa5a => _0x2dfa5a.id == 10004);
              if (_0x342eff) {
                _0x342eff.cd -= 2;
                _0x342eff.curCd -= 2;
              }
              for (let _0x4cd319 of getRoleIdx("섶")) {
                cdChange(comp[_0x4cd319], -4);
              }
              tbf(all, "공고증", myCurAtk + _0x23a024.id + 40, "<할로윈 엘프왕의 은총>3", 50);
              for (let _0xbb510 of getRoleIdx("섶")) {
                anbf(comp[_0xbb510], "궁", boss, "받뎀증", 5.13, "<할로윈 엘프왕의 은총>4", 1, 4, 50);
                for (let _0x271763 of getElementIdx("풍")) {
                  anbf(comp[_0xbb510], "궁", comp[_0x271763], "받속뎀", 7.7, "<할로윈 엘프왕의 은총>5", 1, 4, 50);
                }
              }
            }
          }
        }
        if (GLOBAL_TURN == 1) {
          cdChange(_0x23a024, -4);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10045:
      setMnc(_0x23a024, [0, 1, 0, 1, 0, 1, 0, 1, 0, 1], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(_0x23a024, "공퍼증", 75, "귀무에 취하다1", 1);
            break;
          case 2:
            tbf(_0x23a024, "공퍼증", 87.5, "귀무에 취하다1", 1);
            break;
          case 3:
            tbf(_0x23a024, "공퍼증", 87.5, "귀무에 취하다1", 1);
            tbf(_0x23a024, "가뎀증", 15, "귀무에 취하다2", 1);
            break;
          case 4:
            tbf(_0x23a024, "공퍼증", 100, "귀무에 취하다1", 1);
            tbf(_0x23a024, "가뎀증", 20, "귀무에 취하다2", 1);
            break;
          default:
            tbf(_0x23a024, "공퍼증", 112.5, "귀무에 취하다1", 1);
            tbf(_0x23a024, "가뎀증", 25, "귀무에 취하다2", 1);
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        if (getRoleCnt("딜") >= 3) {
          tbf(all, "공퍼증", 30, "미몽의 취무1", always);
        }
        if (getElementCnt("화") >= 3) {
          tbf(_0x23a024, "공퍼증", 40, "미몽의 취무2", always);
        }
      };
      _0x23a024.passive = function () {
        atbf(_0x23a024, "평", _0x23a024, "궁추가*", 60.5, "오니의 웃음", 7, always);
        anbf(_0x23a024, "궁", _0x23a024, "공퍼증", 15, "술 들이붓기", -2, 6, always);
        tbf(_0x23a024, "궁뎀증", 35, "오니의 가무", always);
        tbf(_0x23a024, "궁뎀증", 10, "궁극기 데미지+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        if (GLOBAL_TURN > 1) {
          nbf(_0x23a024, "공퍼증", 15, "술 들이붓기", 1, 6);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10047:
      setMnc(_0x23a024, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            nbf(boss, "받뎀증", 15, "폭풍 신성", 1, 1);
            break;
          case 2:
            nbf(boss, "받뎀증", 15, "폭풍 신성", 1, 1);
            break;
          case 3:
            nbf(boss, "받뎀증", 20, "폭풍 신성", 1, 1);
            break;
          case 4:
            nbf(boss, "받뎀증", 20, "폭풍 신성", 1, 1);
            break;
          default:
            nbf(boss, "받뎀증", 25, "폭풍 신성", 1, 1);
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        for (let _0x4311e5 of getElementIdx("풍")) {
          tbf(comp[_0x4311e5], "공퍼증", 80, "바람의 인재1", always);
          tbf(comp[_0x4311e5], "일뎀증", 60, "바람의 인재2", always);
          tbf(comp[_0x4311e5], "궁뎀증", 30, "바람의 인재3", always);
        }
      };
      _0x23a024.passive = function () {
        tbf(_0x23a024, "궁뎀증", 20, "폭풍이여, 내게 복종하라!1", always);
        tbf(_0x23a024, "궁발동*", 50, "폭풍이여, 내게 복종하라!2", always);
        tbf(_0x23a024, "가뎀증", 10, "마법 검사1", always);
        tbf(_0x23a024, "궁발동*", 50, "마법 검사2", always);
        tbf(_0x23a024, "공퍼증", 10, "공격+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 4 == 0) {
          for (let _0x4ec676 of getElementIdx("풍")) {
            tbf(comp[_0x4ec676], "받속뎀", 25, "마법 검사3", 1);
          }
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10048:
      setMnc(_0x23a024, [200, 4, 200, 4, 200, 4, 200, 4, 200, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(_0x23a024, "평추가*", 130, "독액 배출1", 2);
            tbf(all, "일뎀증", 20, "독액 배출2", 4);
            break;
          case 2:
            tbf(_0x23a024, "평추가*", 176, "독액 배출1", 2);
            tbf(all, "일뎀증", 25, "독액 배출2", 4);
            break;
          case 3:
            tbf(_0x23a024, "평추가*", 222, "독액 배출1", 2);
            tbf(all, "일뎀증", 30, "독액 배출2", 4);
            break;
          case 4:
            tbf(_0x23a024, "평추가*", 268, "독액 배출1", 2);
            tbf(all, "일뎀증", 35, "독액 배출2", 4);
            break;
          default:
            tbf(_0x23a024, "평추가*", 314, "독액 배출1", 2);
            tbf(all, "일뎀증", 40, "독액 배출2", 4);
        }
        tbf(_0x23a024, "일뎀증", 100, "독액 배출3", 2);
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(20);
        tbf(all, "공퍼증", 40, "치명적인 독", always);
        for (let _0x5869f4 of getRoleIdx("딜", "디")) {
          tbf(comp[_0x5869f4], "일뎀증", 50, "<무해지독>1", always);
          tbf(comp[_0x5869f4], "가뎀증", 20, "<무해지독>2", always);
        }
      };
      _0x23a024.passive = function () {
        atbf(_0x23a024, "궁", _0x23a024, "공퍼증", 80, "통제불능의 전주곡", 2, always);
        atbf(_0x23a024, "궁", boss, "받일뎀", 60, "부식성 맹독", 2, always);
        for (let _0x11da6b of getElementIdx("수")) {
          atbf(_0x23a024, "궁", comp[_0x11da6b], "받속뎀", 30, "스칼렛 톡신", 2, always);
        }
        tbf(_0x23a024, "일뎀증", 10, "일반 공격 데미지+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10049:
      setMnc(_0x23a024, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        tbf(all, "공고증", myCurAtk + _0x23a024.id + 20, "꿈이 하나 있어1", 1);
        switch (_0x17c963) {
          case 1:
            atbf(_0x23a024, "평", all, "공고증", myCurAtk + _0x23a024.id + 15, "꿈이 하나 있어2", 1, 4);
            break;
          case 2:
            atbf(_0x23a024, "평", all, "공고증", myCurAtk + _0x23a024.id + 20, "꿈이 하나 있어2", 1, 4);
            break;
          case 3:
            atbf(_0x23a024, "평", all, "공고증", myCurAtk + _0x23a024.id + 20, "꿈이 하나 있어2", 1, 4);
            break;
          case 4:
            atbf(_0x23a024, "평", all, "공고증", myCurAtk + _0x23a024.id + 22.5, "꿈이 하나 있어2", 1, 4);
            break;
          default:
            atbf(_0x23a024, "평", all, "공고증", myCurAtk + _0x23a024.id + 25, "꿈이 하나 있어2", 1, 4);
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
        for (let _0x56b63d of comp) {
          _0x56b63d.heal2();
        }
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
        for (let _0x59a342 of comp) {
          _0x59a342.heal();
        }
      };
      _0x23a024.leader = function () {
        hpUpAll(20);
        tbf(all, "공퍼증", 20, "강자의 자비1", always);
        tbf(all, "일뎀증", 40, "강자의 자비2", always);
        tbf(all, "받아증", 30, "강자의 자비4", always);
      };
      _0x23a024.passive = function () {
        atbf(_0x23a024, "평", all, "아머", _0x23a024.hp * 20, "방해 마법", 1, always);
        anbf(_0x23a024, "평", all, "받아증", 5, "선한 마음1", 1, 6, always);
        anbf(_0x23a024, "궁", all, "일뎀증", 22.5, "귀족의 보호", 1, 2, always);
        tbf(_0x23a024, "공퍼증", 10, "공격력 증가", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        if (GLOBAL_TURN == 1) {
          cdChange(_0x23a024, -2);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10050:
      setMnc(_0x23a024, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x17c963);
      _0x23a024.ultbefore = function () {};
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        switch (_0x17c963) {
          case 1:
            _0x23a024.hpUltDmg = _0x23a024.hp * 89;
            break;
          case 2:
            _0x23a024.hpUltDmg = _0x23a024.hp * 107;
            break;
          case 3:
            _0x23a024.hpUltDmg = _0x23a024.hp * 125;
            break;
          case 4:
            _0x23a024.hpUltDmg = _0x23a024.hp * 143;
            break;
          default:
            _0x23a024.hpUltDmg = _0x23a024.hp * 161;
        }
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        _0x23a024.hpAtkDmg = _0x23a024.hp * 50;
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpMe(_0x23a024, 100);
        tbf(_0x23a024, "일뎀증", 125, "마왕의 꼭대기1", always);
        tbf(_0x23a024, "궁뎀증", 100, "마왕의 꼭대기2", always);
        tbf(all, "공퍼증", 40, "마왕의 꼭대기5", always);
        tbf(all, "가뎀증", 20, "마왕의 꼭대기6", always);
        for (let _0x1102b7 of comp) {
          if (_0x1102b7.id != _0x23a024.id) {
            atbf(_0x1102b7, "방", all, "받속뎀", 6, "굴복하라", 2, always);
            atbf(_0x1102b7, "궁", all, "받속뎀", 6, "굴복하라", 2, always);
          }
        }
      };
      _0x23a024.passive = function () {
        anbf(_0x23a024, "궁", _0x23a024, "가뎀증", 20, "마주한 공포", 1, 2, always);
        tbf(boss, "받뎀증", 20, "시저라는 이름1", 50);
        tbf(_0x23a024, "가뎀증", 7.5, "피해+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10052:
      setMnc(_0x23a024, [475, 5, 550, 5, 625, 5, 700, 5, 775, 5], _0x17c963);
      buff_ex.push("CD 카운트 정지");
      _0x23a024.ultbefore = function () {};
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpMe(_0x23a024, 50);
        for (let _0x36cf47 of getElementIdx("암")) {
          tbf(comp[_0x36cf47], "공퍼증", 20, "크리스마스 킬러", always);
        }
        const _0x400fbb = comp.find(_0x133aa1 => _0x133aa1.id == 10053);
        if (_0x400fbb) {
          tbf(_0x23a024, "공고증", myCurAtk + _0x400fbb.id + 100, "공포에 굴복1", 50);
          tbf(_0x400fbb, "CD 카운트 정지", 0, "공포에 굴복2", 5);
          _0x400fbb.cd += 2;
          _0x400fbb.curCd += 2;
          tbf(_0x23a024, "공퍼증", 50, "광기1", always);
          for (let _0x1bf968 of getElementIdx("암")) {
            tbf(comp[_0x1bf968], "공퍼증", 25, "광기2", always);
          }
        }
        const _0x35be51 = comp.find(_0xb57a8 => _0xb57a8.id == 10054);
        if (_0x35be51) {
          tbf(_0x23a024, "공고증", myCurAtk + _0x35be51.id + 100, "공포에 굴복1", 50);
          tbf(_0x35be51, "CD 카운트 정지", 0, "공포에 굴복2", 5);
          _0x35be51.cd += 2;
          _0x35be51.curCd += 2;
          tbf(_0x23a024, "공퍼증", 50, "광기1", always);
          for (let _0xbf62c of getElementIdx("암")) {
            tbf(comp[_0xbf62c], "공퍼증", 25, "광기2", always);
          }
        }
      };
      _0x23a024.passive = function () {
        anbf(_0x23a024, "평", boss, "받궁뎀", 2.5, "빌어먹을 순록", 1, 4, always);
        const _0x5875bc = comp.find(_0x8570b => _0x8570b.id == 10054);
        if (_0x5875bc) {
          for (let _0x383e13 of getElementIdx("암")) {
            anbf(_0x23a024, "평", comp[_0x383e13], "받속뎀", 5, "순록 사살", 1, 5, always);
          }
        }
        anbf(_0x23a024, "평", boss, "받일뎀", 5, "빌어먹을 순록", 1, 4, always);
        const _0x5cf044 = comp.find(_0x4ea204 => _0x4ea204.id == 10053);
        if (_0x5cf044) {
          anbf(_0x23a024, "평", boss, "받일뎀", 6, "크리스마스 파괴", 1, 5, always);
        }
        tbf(_0x23a024, "일뎀증", 50, "암흑의 크리스마스", always);
        tbf(_0x23a024, "공퍼증", 10, "공격력 증가", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {
          const _0x2e0bc1 = comp.find(_0x4e269e => _0x4e269e.id == 10053);
          if (_0x2e0bc1) {
            const _0xb02581 = _0x2e0bc1.buff.find(_0x47e868 => _0x47e868.div == "기본" && _0x47e868.type == "CD 카운트 정지");
            if (_0xb02581) {
              _0x2e0bc1.stopCd = true;
            } else {
              _0x2e0bc1.stopCd = false;
            }
          }
          const _0x5800ce = comp.find(_0x7a06ec => _0x7a06ec.id == 10054);
          if (_0x5800ce) {
            const _0x59b524 = _0x5800ce.buff.find(_0x483f9c => _0x483f9c.div == "기본" && _0x483f9c.type == "CD 카운트 정지");
            if (_0x59b524) {
              _0x5800ce.stopCd = true;
            } else {
              _0x5800ce.stopCd = false;
            }
          }
        }
      };
      return _0x23a024;
    case 10053:
      setMnc(_0x23a024, [0, 5, 0, 5, 0, 4, 0, 4, 0, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(all, "아머", _0x23a024.hp * 50, "크리스마스 선물1", 1);
            tbf(all, "공퍼증", 10, "크리스마스 선물2", 3);
            break;
          case 2:
            tbf(all, "아머", _0x23a024.hp * 55, "크리스마스 선물1", 1);
            tbf(all, "공퍼증", 15, "크리스마스 선물2", 3);
            break;
          case 3:
            tbf(all, "아머", _0x23a024.hp * 55, "크리스마스 선물1", 1);
            tbf(all, "공퍼증", 15, "크리스마스 선물2", 3);
            break;
          case 4:
            tbf(all, "아머", _0x23a024.hp * 60, "크리스마스 선물1", 1);
            tbf(all, "공퍼증", 20, "크리스마스 선물2", 3);
            break;
          default:
            tbf(all, "아머", _0x23a024.hp * 60, "크리스마스 선물1", 1);
            tbf(all, "공퍼증", 20, "크리스마스 선물2", 4);
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
        for (let _0x133f1f of comp) {
          _0x133f1f.heal();
        }
      };
      _0x23a024.leader = function () {
        tbf(_0x23a024, "공퍼증", 100, "X-mas 난쟁이의 기백", always);
        for (let _0x11b31d of getRoleIdx("딜")) {
          anbf(comp[_0x11b31d], "평", comp[_0x11b31d], "궁뎀증", 15, "<시저의 특별 메뉴>1", 1, 2, 50);
          anbf(comp[_0x11b31d], "궁", comp[_0x11b31d], "일뎀증", 50, "<시저의 특별 메뉴>2", 1, 1, 50);
        }
      };
      _0x23a024.passive = function () {
        atbf(_0x23a024, "공격", all, "공고증", myCurAtk + _0x23a024.id + 25, "썰매 진짜 빠르다~", 1, always);
        nbf(comp[0], "받아증", 20, "사탕은 달고 맛있어~1", 1, 1);
        nbf(comp[4], "공퍼증", 20, "사탕은 달고 맛있어~2", 1, 1);
        nbf(comp[4], "일뎀증", 20, "사탕은 달고 맛있어~3", 1, 1);
        nbf(comp[4], "궁뎀증", 10, "사탕은 달고 맛있어~4", 1, 1);
        for (let _0x14ce9a of getRoleIdx("딜", "힐")) {
          tbf(comp[_0x14ce9a], "궁뎀증", 25, "크리스마스는 우리가 지킨다!", always);
        }
        tbf(_0x23a024, "공퍼증", 10, "공격력 증가", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10054:
      setMnc(_0x23a024, [0, 4, 0, 4, 0, 3, 0, 3, 0, 3], _0x17c963);
      _0x23a024.ultbefore = function () {};
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
        _0x23a024.heal();
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        let _0x922892 = [0, 2, 4];
        for (let _0x102db3 of _0x922892) {
          tbf(comp[_0x102db3], "공퍼증", 40, "기적의 사자1", always);
          tbf(comp[_0x102db3], "궁뎀증", 20, "기적의 사자2", always);
          tbf(comp[_0x102db3], "일뎀증", 40, "기적의 사자3", always);
        }
      };
      _0x23a024.passive = function () {
        for (let _0x47409e = 0; _0x47409e < 2; _0x47409e++) {
          atbf(_0x23a024, "궁", comp[_0x47409e], "공퍼증", 30, "크리스마스 스피릿", 2, always);
        }
        hpUpMe(_0x23a024, 10);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {
          for (let _0x2d0af2 of comp);
        }
      };
      return _0x23a024;
    case 10056:
      setMnc(_0x23a024, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(_0x23a024, "아머", _0x23a024.hp * 40 * armorUp(_0x23a024, "궁", "추가"), "결정의 벽", 1);
            break;
          case 2:
            tbf(_0x23a024, "아머", _0x23a024.hp * 45 * armorUp(_0x23a024, "궁", "추가"), "결정의 벽", 1);
            break;
          case 3:
            tbf(_0x23a024, "아머", _0x23a024.hp * 45 * armorUp(_0x23a024, "궁", "추가"), "결정의 벽", 1);
            break;
          case 4:
            tbf(_0x23a024, "아머", _0x23a024.hp * 50 * armorUp(_0x23a024, "궁", "추가"), "결정의 벽", 1);
            break;
          default:
            tbf(_0x23a024, "아머", _0x23a024.hp * 50 * armorUp(_0x23a024, "궁", "추가"), "결정의 벽", 1);
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        _0x23a024.cd -= 1;
        _0x23a024.curCd -= 1;
        hpUpMe(_0x23a024, 60);
      };
      _0x23a024.passive = function () {
        atbf(_0x23a024, "평", _0x23a024, "아머", _0x23a024.hp * 5, "결정과 공생", 50, always);
        atbf(_0x23a024, "궁", _0x23a024, "반격*", 300, "결정의 침식1", 1, always);
        atbf(_0x23a024, "방", _0x23a024, "반격*", 100, "결정의 침식2", 1, always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10057:
      setMnc(_0x23a024, [0, 4, 0, 4, 0, 3, 0, 3, 0, 3], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(all, "아머", myCurAtk + _0x23a024.id + armorUp(_0x23a024, "궁", "추가") * 165, "종극의 암흑 화염 저승길의 섬멸진?1", 2);
            tbf(all, "공고증", myCurAtk + _0x23a024.id + 30, "종극의 암흑 화염 저승길의 섬멸진?2", 2);
            break;
          case 2:
            tbf(all, "아머", myCurAtk + _0x23a024.id + armorUp(_0x23a024, "궁", "추가") * 188, "종극의 암흑 화염 저승길의 섬멸진?1", 2);
            tbf(all, "공고증", myCurAtk + _0x23a024.id + 30, "종극의 암흑 화염 저승길의 섬멸진?2", 2);
            break;
          case 3:
            tbf(all, "아머", myCurAtk + _0x23a024.id + armorUp(_0x23a024, "궁", "추가") * 188, "종극의 암흑 화염 저승길의 섬멸진?1", 2);
            tbf(all, "공고증", myCurAtk + _0x23a024.id + 30, "종극의 암흑 화염 저승길의 섬멸진?2", 2);
            break;
          case 4:
            tbf(all, "아머", myCurAtk + _0x23a024.id + armorUp(_0x23a024, "궁", "추가") * 211, "종극의 암흑 화염 저승길의 섬멸진?1", 2);
            tbf(all, "공고증", myCurAtk + _0x23a024.id + 30, "종극의 암흑 화염 저승길의 섬멸진?2", 2);
            break;
          default:
            tbf(all, "아머", myCurAtk + _0x23a024.id + armorUp(_0x23a024, "궁", "추가") * 211, "종극의 암흑 화염 저승길의 섬멸진?1", 2);
            tbf(all, "공고증", myCurAtk + _0x23a024.id + 40, "종극의 암흑 화염 저승길의 섬멸진?2", 2);
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {
        tbf(all, "아머", myCurAtk + _0x23a024.id + armorUp(_0x23a024, "평", "추가") * 50, "암흑의 저승 결계", 1);
      };
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        tbf(comp[0], "공퍼증", 33, "저승 심연의 켈베로스!1", always);
        tbf(comp[0], "궁뎀증", 15, "저승 심연의 켈베로스!2", always);
        tbf(comp[2], "공퍼증", 33, "저승 심연의 켈베로스!1", always);
        tbf(comp[2], "궁뎀증", 15, "저승 심연의 켈베로스!2", always);
        tbf(comp[4], "공퍼증", 33, "저승 심연의 켈베로스!1", always);
        tbf(comp[4], "궁뎀증", 15, "저승 심연의 켈베로스!2", always);
      };
      _0x23a024.passive = function () {
        tbf(_0x23a024, "일뎀증", 25, "지옥의 발톱!", always);
        tbf(_0x23a024, "일뎀증", 10, "일반 공격 데미지+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 6 == 0) {
          tbf(comp[0], "궁뎀증", 50, "명계의 서의 계시", 2);
          tbf(comp[2], "궁뎀증", 50, "명계의 서의 계시", 2);
          tbf(comp[4], "궁뎀증", 50, "명계의 서의 계시", 2);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10058:
      setMnc(_0x23a024, [200, 8, 200, 8, 200, 8, 200, 8, 200, 8], _0x17c963);
      buff_ex.push("궁극기 CD 변경 면역");
      _0x23a024.ultbefore = function () {};
      _0x23a024.ultafter = function () {
        switch (_0x17c963) {
          case 1:
            tbf(_0x23a024, "일뎀증", 96, "월하의 하울링", 6);
            break;
          case 2:
            tbf(_0x23a024, "일뎀증", 118, "월하의 하울링", 6);
            break;
          case 3:
            tbf(_0x23a024, "일뎀증", 141, "월하의 하울링", 6);
            break;
          case 4:
            tbf(_0x23a024, "일뎀증", 163, "월하의 하울링", 6);
            break;
          default:
            tbf(_0x23a024, "일뎀증", 186, "월하의 하울링", 6);
        }
      };
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        tbf(_0x23a024, "일뎀증", 20, "겁쟁이 늑대의 여정1", always);
        tbf(all, "일뎀증", 40, "겁쟁이 늑대의 여정2", always);
      };
      _0x23a024.passive = function () {
        atbf(_0x23a024, "궁", _0x23a024, "궁극기 CD 변경 면역", 0, "아드레날린", 8, always);
        atbf(_0x23a024, "궁", _0x23a024, "평발동*", 90, "3연격 발톱 공격", 6, always);
        anbf(_0x23a024, "궁", _0x23a024, "가뎀증", 20, "심해지는 광기", 1, 2, always);
        tbf(_0x23a024, "공퍼증", 10, "공격력 증가", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        if (GLOBAL_TURN == 1) {
          cdChange(_0x23a024, -6);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
        const _0x29ae9b = _0x23a024.buff.find(_0x1f79dd => _0x1f79dd.div == "기본" && _0x1f79dd.type == "궁극기 CD 변경 면역");
        if (_0x29ae9b) {
          _0x23a024.canCDChange = false;
        } else {
          _0x23a024.canCDChange = true;
        }
      };
      return _0x23a024;
    case 10059:
      setMnc(_0x23a024, [205, 2, 226, 2, 247, 2, 268, 2, 289, 2], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(_0x23a024, "공퍼증", 20, "팬텀 킬러", 3);
            break;
          case 2:
            tbf(_0x23a024, "공퍼증", 20, "팬텀 킬러", 3);
            break;
          case 3:
            tbf(_0x23a024, "공퍼증", 25, "팬텀 킬러", 3);
            break;
          case 4:
            tbf(_0x23a024, "공퍼증", 25, "팬텀 킬러", 3);
            break;
          default:
            tbf(_0x23a024, "공퍼증", 30, "팬텀 킬러", 3);
        }
      };
      _0x23a024.ultafter = function () {
        for (let _0x3f9677 of comp) {
          if (_0x3f9677.id != _0x23a024.id) {
            atbf(_0x3f9677, "공격", all, "궁뎀증", 5, "<음벽 초월>", 2, 2);
          }
        }
      };
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        tbf(all, "공퍼증", 20, "댄싱 머신1", always);
        atbf(_0x23a024, "공격", all, "공퍼증", 8, "댄싱 머신2", 2, always);
      };
      _0x23a024.passive = function () {
        anbf(_0x23a024, "평", _0x23a024, "궁뎀증", 5, "유망주", 1, 4, always);
        atbf(_0x23a024, "평", _0x23a024, "궁추가*", 75, "<백은의 바람>", 2, always);
        anbf(_0x23a024, "궁", _0x23a024, "일뎀증", 5, "잠재력 폭발", 1, 4, always);
        atbf(_0x23a024, "궁", _0x23a024, "평추가*", 20, "<팬텀의 바람>", 2, always);
        tbf(_0x23a024, "궁뎀증", 50, "마하 선봉", always);
        tbf(_0x23a024, "공퍼증", 10, "공격력 증가", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10060:
      setMnc(_0x23a024, [0, 5, 0, 5, 0, 5, 0, 5, 0, 5], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            break;
          case 2:
            break;
          case 3:
            break;
          case 4:
            tbf(all, "공퍼증", 15, "풍작의 축제", 2);
            break;
          default:
            tbf(all, "공퍼증", 20, "풍작의 축제", 2);
        }
        for (let _0x52bbad of getRoleIdx("딜", "탱")) {
          cdChange(comp[_0x52bbad], -1);
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
        for (let _0x1d7372 of comp) {
          _0x1d7372.heal();
        }
      };
      _0x23a024.leader = function () {
        hpUpAll(35);
        if (getRoleCnt("딜") >= 1) {
          tbf(all, "공퍼증", 15, "신도의 광휘1", always);
        }
        if (getRoleCnt("딜") >= 2) {
          tbf(all, "공퍼증", 15, "신도의 광휘2", always);
        }
        if (getRoleCnt("딜") >= 3) {
          tbf(all, "공퍼증", 30, "신도의 광휘3", always);
        }
        if (getRoleCnt("탱") >= 1) {
          tbf(all, "일뎀증", 40, "신도의 광휘4", always);
          tbf(all, "궁뎀증", 20, "신도의 광휘5", always);
        }
      };
      _0x23a024.passive = function () {
        atbf(_0x23a024, "공격", all, "공고증", myCurAtk + _0x23a024.id + 25, "멈출수 없는 환락", 1, always);
        anbf(_0x23a024, "공격", all, "가뎀증", 5, "열정과 흥분", 1, 5, always);
        tbf(_0x23a024, "공퍼증", 10, "공격력 증가", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10062:
      setMnc(_0x23a024, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(all, "궁뎀증", 10, "특선 상품 2.3% 할인", 1);
            break;
          case 2:
            tbf(all, "궁뎀증", 15, "특선 상품 2.3% 할인", 1);
            break;
          case 3:
            tbf(all, "궁뎀증", 20, "특선 상품 2.3% 할인", 1);
            break;
          case 4:
            tbf(all, "궁뎀증", 25, "특선 상품 2.3% 할인", 1);
            break;
          default:
            tbf(all, "궁뎀증", 30, "특선 상품 2.3% 할인", 1);
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
        for (let _0x53f848 of comp) {
          _0x53f848.heal();
        }
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
        for (let _0x4bf54c of comp) {
          _0x4bf54c.heal();
        }
      };
      _0x23a024.leader = function () {
        hpUpAll(30);
        tbf(all, "공퍼증", 30, "상인본색1", always);
        atbf(_0x23a024, "궁", all, "공고증", myCurAtk + _0x23a024.id + 30, "상인본색2", 1, always);
        for (let _0x3dd7f0 of comp) {
          if (_0x3dd7f0.id != _0x23a024.id) {
            anbf(_0x3dd7f0, "공격", _0x23a024, "공퍼증", 3, "<저가 매입>", 1, 15, 50);
          }
        }
      };
      _0x23a024.passive = function () {
        for (let _0x1543e9 of getRoleIdx("딜")) {
          atbf(_0x23a024, "공격", comp[_0x1543e9], "공고증", myCurAtk + _0x23a024.id + 25, "정보의 중요성", 1, always);
        }
        let _0xf00136 = comp.reduce((_0x5ec629, _0xb038a0) => {
          if (_0xb038a0.curHp < _0x5ec629.curHp) {
            return _0xb038a0;
          } else {
            return _0x5ec629;
          }
        }, comp[0]);
        atbf(_0x23a024, "평", _0xf00136, "아머", _0xf00136.hp * 20, "최신 상품1", 1, always);
        for (let _0x4b47c1 of comp) {
          if (_0x4b47c1.id != _0x23a024.id) {
            atbf(_0x4b47c1, "방", _0x4b47c1, "궁뎀증", 15, "<선착순 1명>", always, 1);
            atbf(_0x4b47c1, "방", _0x4b47c1, "가뎀증", 15, "<선착순 1명>", always, 1);
            atbf(_0x4b47c1, "방", _0x4b47c1, "공퍼증", 30, "<선착순 1명>", always, 1);
            for (let _0x2b495a of comp) {
              if (_0x2b495a.id != _0x4b47c1.id) {
                atbf(_0x4b47c1, "방", _0x2b495a, "제거", "발동", "<선착순 1명>", 1, 1);
              }
            }
          }
        }
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10063:
      setMnc(_0x23a024, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(all, "공고증", myCurAtk + _0x23a024.id + 15, "메이드 분신술1", 1);
            tbf(comp[4], "공퍼증", 20, "메이드 분신술2", 1);
            break;
          case 2:
            tbf(all, "공고증", myCurAtk + _0x23a024.id + 20, "메이드 분신술1", 1);
            tbf(comp[4], "공퍼증", 25, "메이드 분신술2", 1);
            break;
          case 3:
            tbf(all, "공고증", myCurAtk + _0x23a024.id + 30, "메이드 분신술1", 1);
            tbf(comp[4], "공퍼증", 30, "메이드 분신술2", 1);
            break;
          case 4:
            tbf(all, "공고증", myCurAtk + _0x23a024.id + 30, "메이드 분신술1", 1);
            tbf(comp[4], "공퍼증", 45, "메이드 분신술2", 1);
            break;
          default:
            tbf(all, "공고증", myCurAtk + _0x23a024.id + 30, "메이드 분신술1", 1);
            tbf(comp[4], "공퍼증", 60, "메이드 분신술2", 1);
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
        for (let _0xe40b2a of comp) {
          _0xe40b2a.heal();
        }
        cdChange(comp[4], -4);
      };
      _0x23a024.atkbefore = function () {
        tbf(all, "공고증", myCurAtk + _0x23a024.id + 30, "엄격한 지도", 1);
      };
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        tbf(_0x23a024, "공퍼증", 100, "빈틈없는 메이드장1", always);
      };
      _0x23a024.passive = function () {
        anbf(_0x23a024, "평", _0x23a024, "공퍼증", 10, "메이드 비기 - 고속요리술", 1, 4, always);
        atbf(_0x23a024, "궁", comp[4], "공퍼증", 40, "메이드 비기 - 순간환복술", 2, always);
        atbf(_0x23a024, "궁", all, "가뎀증", 30, "메이드 비기 - 무결청소술", 1, always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {
          if (GLOBAL_TURN > 1) {
            tbf(all, "공고증", myCurAtk + _0x23a024.id + 30, "빈틈없는 메이드장2", 1);
          }
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10066:
      setMnc(_0x23a024, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(_0x23a024, "공퍼증", 20, "마술회로-저주전개", 4);
            break;
          case 2:
            tbf(_0x23a024, "공퍼증", 35, "마술회로-저주전개", 4);
            break;
          case 3:
            tbf(_0x23a024, "공퍼증", 35, "마술회로-저주전개", 4);
            break;
          case 4:
            tbf(_0x23a024, "공퍼증", 50, "마술회로-저주전개", 4);
            break;
          default:
            tbf(_0x23a024, "공퍼증", 50, "마술회로-저주전개", 4);
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        tbf(all, "속상감", 100, "마도 현자0", always);
        tbf(all, "공퍼증", 30, "마도 현자1", always);
        hpUpAll(15);
      };
      _0x23a024.passive = function () {
        tbf(_0x23a024, "궁뎀증", 25, "천주1", always);
        anbf(_0x23a024, "공격", _0x23a024, "궁뎀증", 2, "천주2", 1, 25, always);
        tbf(_0x23a024, "가뎀증", 10, "구조 해석1", always);
        anbf(_0x23a024, "궁", _0x23a024, "가뎀증", 6, "구조 해석2", 1, 5, always);
        anbf(_0x23a024, "공격", _0x23a024, "공퍼증", 2, "편집광2", 1, 50, always);
        tbf(_0x23a024, "궁뎀증", 10, "궁극기+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {
          if (GLOBAL_TURN > 1) {
            nbf(all, "공퍼증", 5, "마도 현자2", 1, 25);
          }
        }
        if (GLOBAL_TURN > 1) {
          nbf(_0x23a024, "공퍼증", 4, "편집광1", 1, 50);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10067:
      setMnc(_0x23a024, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x17c963);
      _0x23a024.ultbefore = function () {};
      _0x23a024.ultafter = function () {
        switch (_0x17c963) {
          case 1:
            nbf(boss, "받발뎀", 30, "비검 - 근하신년", 1, 2);
            break;
          case 2:
            nbf(boss, "받발뎀", 40, "비검 - 근하신년", 1, 2);
            break;
          case 3:
            nbf(boss, "받발뎀", 50, "비검 - 근하신년", 1, 2);
            break;
          case 4:
            nbf(boss, "받발뎀", 50, "비검 - 근하신년", 1, 2);
            nbf(_0x23a024, "발효증", 10, "<명경지수>", 1, 10);
            break;
          default:
            nbf(boss, "받발뎀", 50, "비검 - 근하신년", 1, 2);
            nbf(_0x23a024, "발효증", 10, "<명경지수>", 2, 10);
        }
      };
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        tbf(boss, "받발뎀", 100, "도검 극의1", 50);
        hpUpAll(15);
        tbf(all, "공퍼증", 50, "도검 극의2", always);
        for (let _0x18e4b8 of getRoleIdx("딜", "탱", "디")) {
          if (comp[_0x18e4b8].id != _0x23a024.id) {
            tbf(comp[_0x18e4b8], "평발동*", 45, "<신무이도류 - 전수>1", always);
            tbf(comp[_0x18e4b8], "궁발동*", 135, "<신무이도류 - 전수>2", always);
          }
        }
      };
      _0x23a024.passive = function () {
        tbf(_0x23a024, "평발동*", 60, "미나요미 이도류 - 하고이타1", always);
        tbf(_0x23a024, "궁발동*", 180, "미나요미 이도류 - 하고이타2", always);
        anbf(_0x23a024, "궁", _0x23a024, "발효증", 10, "<명경지수>", -2, 10, always);
        tbf(_0x23a024, "발효증", 50, "정신통일1", always);
        anbf(_0x23a024, "공격", boss, "받발뎀", 12.5, "정신통일2", 1, 4, always);
        tbf(_0x23a024, "발효증", 30, "발동+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        if (GLOBAL_TURN > 1) {
          nbf(_0x23a024, "발효증", 10, "<명경지수>", 1, 10);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10068:
      setMnc(_0x23a024, [0, 3, 0, 3, 0, 3, 0, 3, 0, 3], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            nbf(all, "궁뎀증", 5, "주문하신 승룡교자 나왔습니다!", 1, 3);
            break;
          case 2:
            nbf(all, "궁뎀증", 5, "주문하신 승룡교자 나왔습니다!", 1, 3);
            break;
          case 3:
            nbf(all, "궁뎀증", 7.5, "주문하신 승룡교자 나왔습니다!", 1, 3);
            break;
          case 4:
            nbf(all, "궁뎀증", 10, "주문하신 승룡교자 나왔습니다!", 1, 3);
            break;
          default:
            nbf(all, "궁뎀증", 12.5, "주문하신 승룡교자 나왔습니다!", 1, 3);
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
        for (let _0x3bb8c0 of comp) {
          _0x3bb8c0.heal();
        }
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
        for (let _0x37b90f of comp) {
          _0x37b90f.heal();
        }
      };
      _0x23a024.leader = function () {
        tbf(all, "공퍼증", 30, "배고픔을 느껴라!", always);
        hpUpAll(30);
        tbf(all, "공퍼증", 40, "더는... 못먹겠어...", always);
      };
      _0x23a024.passive = function () {};
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 3 == 0) {
          tbf(all, "아머", _0x23a024.hp * 10, "주문하신 크림스튜 나왔습니다!1", 1);
          tbf(all, "공퍼증", 20, "주문하신 크림스튜 나왔습니다!2", 1);
          tbf(all, "궁뎀증", 30, "주문하신 최상급 시저 스테이크 나왔습니다!1", 1);
          tbf(all, "공고증", myCurAtk + _0x23a024.id + 20, "주문하신 최상급 시저 스테이크 나왔습니다!2", 1);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10069:
      setMnc(_0x23a024, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            for (let _0x304554 of getRoleIdx("딜", "디")) {
              tbf(comp[_0x304554], "궁뎀증", 10, "너무 하고 싶지만 안 돼!1", 2);
            }
            for (let _0x10e274 of comp) {
              if (_0x10e274.id != _0x23a024.id) {
                tbf(_0x10e274, "공발동*", 25, "너무 하고 싶지만 안 돼!2", 4);
              }
            }
            break;
          case 2:
            for (let _0x2d181d of getRoleIdx("딜", "디")) {
              tbf(comp[_0x2d181d], "궁뎀증", 15, "너무 하고 싶지만 안 돼!1", 2);
            }
            for (let _0xeadc16 of comp) {
              if (_0xeadc16.id != _0x23a024.id) {
                tbf(_0xeadc16, "공발동*", 35, "너무 하고 싶지만 안 돼!2", 4);
              }
            }
            break;
          case 3:
            for (let _0x2521c6 of getRoleIdx("딜", "디")) {
              tbf(comp[_0x2521c6], "궁뎀증", 20, "너무 하고 싶지만 안 돼!1", 2);
            }
            for (let _0xd2330d of comp) {
              if (_0xd2330d.id != _0x23a024.id) {
                tbf(_0xd2330d, "공발동*", 45, "너무 하고 싶지만 안 돼!2", 4);
              }
            }
            break;
          case 4:
            for (let _0x2295e0 of getRoleIdx("딜", "디")) {
              tbf(comp[_0x2295e0], "궁뎀증", 25, "너무 하고 싶지만 안 돼!1", 2);
            }
            for (let _0xb4476d of comp) {
              if (_0xb4476d.id != _0x23a024.id) {
                tbf(_0xb4476d, "공발동*", 55, "너무 하고 싶지만 안 돼!2", 4);
              }
            }
            break;
          default:
            for (let _0x8f3e6c of getRoleIdx("딜", "디")) {
              tbf(comp[_0x8f3e6c], "궁뎀증", 30, "너무 하고 싶지만 안 돼!1", 2);
            }
            for (let _0xa899ef of comp) {
              if (_0xa899ef.id != _0x23a024.id) {
                tbf(_0xa899ef, "공발동*", 65, "너무 하고 싶지만 안 돼!2", 4);
              }
            }
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {
        tbf(all, "공퍼증", 50, "토끼의 서포트", 1);
      };
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(20);
        tbf(all, "공퍼증", 50, "토끼 공격술1", always);
        for (let _0x4c7949 of getRoleIdx("딜", "디")) {
          anbf(comp[_0x4c7949], "공격", comp[_0x4c7949], "공퍼증", 20, "<성욕 토끼발>1", 1, 5, always);
          anbf(comp[_0x4c7949], "공격", boss, "받발뎀", 20, "<성욕 토끼발>2", 1, 5, always);
          tbf(comp[_0x4c7949], "궁발동*", 150, "<성욕 토끼발>3", always);
        }
      };
      _0x23a024.passive = function () {
        atbf(_0x23a024, "궁", all, "공퍼증", 50, "모두 파이팅!", 1, always);
        atbf(_0x23a024, "궁", _0x23a024, "아머", _0x23a024.hp * 15, "야아아아아아!", 1, always);
        tbf(all, "가뎀증", 20, "로맨틱한 연애!", always);
        tbf(_0x23a024, "공퍼증", 10, "공격 데미지+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {
          if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 4 == 0) {
            tbf(all, "궁뎀증", 35, "토끼 공격술2", 2);
          }
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10071:
      setMnc(_0x23a024, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(_0x23a024, "공퍼증", 180, "저주 멸살의 눈1", 2);
            tbf(_0x23a024, "일뎀증", 60, "저주 멸살의 눈2", 2);
            tbf(_0x23a024, "평추가*", 80, "저주 멸살의 눈4", 4);
            break;
          case 2:
            tbf(_0x23a024, "공퍼증", 180, "저주 멸살의 눈1", 2);
            tbf(_0x23a024, "일뎀증", 80, "저주 멸살의 눈2", 2);
            tbf(_0x23a024, "평추가*", 100, "저주 멸살의 눈4", 4);
            break;
          case 3:
            tbf(_0x23a024, "공퍼증", 200, "저주 멸살의 눈1", 2);
            tbf(_0x23a024, "일뎀증", 80, "저주 멸살의 눈2", 2);
            for (let _0x4e56f4 of getElementIdx("화")) {
              nbf(comp[_0x4e56f4], "받속뎀", 5, "저주 멸살의 눈3", 1, 2);
            }
            tbf(_0x23a024, "평추가*", 100, "저주 멸살의 눈4", 4);
            break;
          case 4:
            tbf(_0x23a024, "공퍼증", 200, "저주 멸살의 눈1", 2);
            tbf(_0x23a024, "일뎀증", 100, "저주 멸살의 눈2", 2);
            for (let _0x2c4519 of getElementIdx("화")) {
              nbf(comp[_0x2c4519], "받속뎀", 5, "저주 멸살의 눈3", 1, 2);
            }
            tbf(_0x23a024, "평추가*", 110, "저주 멸살의 눈4", 4);
            break;
          default:
            tbf(_0x23a024, "공퍼증", 240, "저주 멸살의 눈1", 2);
            tbf(_0x23a024, "일뎀증", 100, "저주 멸살의 눈2", 2);
            for (let _0x35db1b of getElementIdx("화")) {
              nbf(comp[_0x35db1b], "받속뎀", 5, "저주 멸살의 눈3", 1, 2);
            }
            tbf(_0x23a024, "평추가*", 130, "저주 멸살의 눈4", 4);
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(20);
        tbf(all, "공퍼증", 60, "금지구역의 수호자1", always);
        tbf(all, "일뎀증", 60, "금지구역의 수호자2", always);
        tbf(_0x23a024, "가뎀증", 50, "금지구역의 수호자3", always);
        anbf(_0x23a024, "평", boss, "받뎀증", 5, "금지구역의 수호자4", 1, 8, always);
        atbf(_0x23a024, "궁", _0x23a024, "평추가*", 150, "금지구역의 수호자5", 2, always);
      };
      _0x23a024.passive = function () {
        tbf(_0x23a024, "공퍼증", 50, "전율의 사냥", always);
        atbf(_0x23a024, "궁", _0x23a024, "평추가*", 70, "2연발", 2, always);
        tbf(_0x23a024, "가뎀증", 7.5, "데미지+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        if (GLOBAL_TURN == 6) {
          tbf(boss, "받일뎀", 100, "쇠약의 저주", 50);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10072:
      setMnc(_0x23a024, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(_0x23a024, "공고증", myCurAtk + _0x23a024.id + 40, "부케 임자는 이미 정해졌엉~1", 1);
            tbf(comp[1], "공고증", myCurAtk + _0x23a024.id + 65, "부케 임자는 이미 정해졌엉~2", 1);
            tbf(comp[1], "일뎀증", 80, "부케 임자는 이미 정해졌엉~3", 2);
            tbf(comp[1], "궁뎀증", 30, "부케 임자는 이미 정해졌엉~4", 1);
            break;
          case 2:
            tbf(_0x23a024, "공고증", myCurAtk + _0x23a024.id + 40, "부케 임자는 이미 정해졌엉~1", 1);
            tbf(comp[1], "공고증", myCurAtk + _0x23a024.id + 65, "부케 임자는 이미 정해졌엉~2", 1);
            tbf(comp[1], "일뎀증", 90, "부케 임자는 이미 정해졌엉~3", 2);
            tbf(comp[1], "궁뎀증", 35, "부케 임자는 이미 정해졌엉~4", 1);
            break;
          case 3:
            tbf(_0x23a024, "공고증", myCurAtk + _0x23a024.id + 45, "부케 임자는 이미 정해졌엉~1", 1);
            tbf(comp[1], "공고증", myCurAtk + _0x23a024.id + 70, "부케 임자는 이미 정해졌엉~2", 1);
            tbf(comp[1], "일뎀증", 90, "부케 임자는 이미 정해졌엉~3", 2);
            tbf(comp[1], "궁뎀증", 35, "부케 임자는 이미 정해졌엉~4", 1);
            break;
          case 4:
            tbf(_0x23a024, "공고증", myCurAtk + _0x23a024.id + 45, "부케 임자는 이미 정해졌엉~1", 1);
            tbf(comp[1], "공고증", myCurAtk + _0x23a024.id + 70, "부케 임자는 이미 정해졌엉~2", 1);
            tbf(comp[1], "일뎀증", 100, "부케 임자는 이미 정해졌엉~3", 2);
            tbf(comp[1], "궁뎀증", 40, "부케 임자는 이미 정해졌엉~4", 1);
            break;
          default:
            tbf(_0x23a024, "공고증", myCurAtk + _0x23a024.id + 50, "부케 임자는 이미 정해졌엉~1", 1);
            tbf(comp[1], "공고증", myCurAtk + _0x23a024.id + 75, "부케 임자는 이미 정해졌엉~2", 1);
            tbf(comp[1], "일뎀증", 100, "부케 임자는 이미 정해졌엉~3", 2);
            tbf(comp[1], "궁뎀증", 40, "부케 임자는 이미 정해졌엉~4", 1);
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {
        tbf(comp[1], "공고증", myCurAtk + _0x23a024.id + 75, "부케 던지기", 1);
      };
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        tbf(_0x23a024, "공퍼증", 80, "마왕의 연애 시뮬레이션1", always);
        tbf(_0x23a024, "가뎀증", 30, "마왕의 연애 시뮬레이션2", always);
        tbf(_0x23a024, "일뎀증", 125, "마왕의 연애 시뮬레이션3", always);
        tbf(_0x23a024, "궁뎀증", 50, "마왕의 연애 시뮬레이션4", always);
        tbf(_0x23a024, "평추가*", 125, "<마왕 바알이 원하는 고백>1", 50);
        tbf(_0x23a024, "궁추가*", 500, "<마왕 바알이 원하는 고백>2", 50);
      };
      _0x23a024.passive = function () {
        tbf(comp[1], "가뎀증", 25, "친구의 도움은 필수!", 50);
        tbf(_0x23a024, "공퍼증", 10, "공격력 증가", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        if (GLOBAL_TURN == 1) {
          cdChange(_0x23a024, -4);
        }
        if (GLOBAL_TURN > 1) {
          nbf(_0x23a024, "공퍼증", 15, "<밀당의 매력>", 1, 8);
        }
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 2 == 0) {
          nbf(_0x23a024, "공퍼증", 15, "<밀당의 매력>", 1, 8);
        }
        if (GLOBAL_TURN > 1) {
          tbf(_0x23a024, "공고증", myCurAtk + _0x23a024.id + 35, "시크릿 연애 대작전", 1);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10074:
      setMnc(_0x23a024, [306, 3, 348, 3, 390, 3, 429, 3, 471, 3], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            nbf(boss, "받궁뎀", 3.75, "피어나는 눈꽃1", 1, 4);
            nbf(boss, "받궁뎀", 3.75, "피어나는 눈꽃2", 1, 4);
            nbf(boss, "받궁뎀", 3.75, "피어나는 눈꽃3", 1, 4);
            break;
          case 2:
            nbf(boss, "받궁뎀", 3.75, "피어나는 눈꽃1", 1, 4);
            nbf(boss, "받궁뎀", 3.75, "피어나는 눈꽃2", 1, 4);
            nbf(boss, "받궁뎀", 3.75, "피어나는 눈꽃3", 1, 4);
            break;
          case 3:
            nbf(boss, "받궁뎀", 5, "피어나는 눈꽃1", 1, 4);
            nbf(boss, "받궁뎀", 5, "피어나는 눈꽃2", 1, 4);
            nbf(boss, "받궁뎀", 5, "피어나는 눈꽃3", 1, 4);
            break;
          case 4:
            nbf(boss, "받궁뎀", 5, "피어나는 눈꽃1", 1, 4);
            nbf(boss, "받궁뎀", 5, "피어나는 눈꽃2", 1, 4);
            nbf(boss, "받궁뎀", 5, "피어나는 눈꽃3", 1, 4);
            break;
          default:
            nbf(boss, "받궁뎀", 7.5, "피어나는 눈꽃1", 1, 4);
            nbf(boss, "받궁뎀", 7.5, "피어나는 눈꽃2", 1, 4);
            nbf(boss, "받궁뎀", 7.5, "피어나는 눈꽃3", 1, 4);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024, 3);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(30);
        tbf(all, "공퍼증", 100, "툰드라1", always);
        _0x23a024.cd += 1;
        _0x23a024.curCd += 1;
        anbf(_0x23a024, "궁", boss, "받뎀증", 15, "툰드라2", 1, 4, always);
        anbf(_0x23a024, "궁", boss, "받궁뎀", 12.5, "툰드라3", 1, 4, always);
        tbf(_0x23a024, "가뎀증", 40, "툰드라5", always);
        tbf(_0x23a024, "궁뎀증", 60, "툰드라6", always);
      };
      _0x23a024.passive = function () {
        atbf(_0x23a024, "방", all, "아머", _0x23a024.hp * 10, "설풍 장벽", 1, always);
        anbf(_0x23a024, "궁", _0x23a024, "공퍼증", 25, "칼바람1", 1, 4, always);
        anbf(_0x23a024, "궁", _0x23a024, "궁뎀증", 15, "칼바람2", 1, 4, always);
        tbf(_0x23a024, "가뎀증", 25, "설산 미인1", always);
        atbf(_0x23a024, "궁", all, "아머", _0x23a024.hp * 20, "설산 미인2", 1, always);
        tbf(_0x23a024, "공퍼증", 10, "공격력 증가", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {
          if (GLOBAL_TURN > 1) {
            tbf(all, "공고증", myCurAtk + _0x23a024.id + 30, "툰드라4", 1);
          }
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10075:
      setMnc(_0x23a024, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(_0x23a024, "공퍼증", 30, "역전극 개연~ 깡총~1", 1);
            tbf(all, "공고증", myCurAtk + _0x23a024.id + 30, "역전극 개연~ 깡총~2", 1);
            break;
          case 2:
            tbf(_0x23a024, "공퍼증", 35, "역전극 개연~ 깡총~1", 1);
            tbf(all, "공고증", myCurAtk + _0x23a024.id + 30, "역전극 개연~ 깡총~2", 1);
            break;
          case 3:
            tbf(_0x23a024, "공퍼증", 40, "역전극 개연~ 깡총~1", 1);
            tbf(all, "공고증", myCurAtk + _0x23a024.id + 35, "역전극 개연~ 깡총~2", 1);
            break;
          case 4:
            tbf(_0x23a024, "공퍼증", 45, "역전극 개연~ 깡총~1", 1);
            tbf(all, "공고증", myCurAtk + _0x23a024.id + 35, "역전극 개연~ 깡총~2", 1);
            break;
          default:
            tbf(_0x23a024, "공퍼증", 50, "역전극 개연~ 깡총~1", 1);
            tbf(all, "공고증", myCurAtk + _0x23a024.id + 40, "역전극 개연~ 깡총~2", 1);
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
        if (_0x23a024.isLeader && getRoleCnt("딜") >= 3) {
          for (let _0x5a9dd0 of getRoleIdx("딜")) {
            cdChange(comp[_0x5a9dd0], -1);
          }
        }
      };
      _0x23a024.atkbefore = function () {
        tbf(all, "공고증", myCurAtk + _0x23a024.id + 30, "역전극 개연~ 깡총~2", 1);
      };
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        if (getRoleCnt("딜") >= 3) {
          tbf(all, "궁뎀증", 50, "<래빗의 팀워크>", always);
          hpUpAll(30);
        }
      };
      _0x23a024.passive = function () {
        atbf(_0x23a024, "평", all, "일뎀증", 40, "행운의 토끼 다리1", 1, always);
        atbf(_0x23a024, "궁", all, "궁뎀증", 15, "행운의 토끼 다리2", 1, always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {
          if (GLOBAL_TURN > 1) {
            for (let _0x428df4 of comp) {
              if (_0x428df4.id != _0x23a024.id) {
                atbf(_0x428df4, "평", _0x23a024, "공퍼증", 15, "<깡총 깡총 깡깡총>", 5, 1);
              }
            }
          }
        }
        if (GLOBAL_TURN > 1) {
          nbf(all, "공퍼증", 2.5, "급하다 급해~", 1, 8);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10076:
      setMnc(_0x23a024, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x17c963);
      _0x23a024.ultbefore = function () {};
      _0x23a024.ultafter = function () {
        switch (_0x17c963) {
          case 1:
            for (let _0x3fb42f of getRoleIdx("딜")) {
              tbf(comp[_0x3fb42f], "평추가*", 37.5, "다과회 동맹 전원 돌격", 3);
            }
            break;
          case 2:
            for (let _0x4f80df of getRoleIdx("딜")) {
              tbf(comp[_0x4f80df], "평추가*", 45, "다과회 동맹 전원 돌격", 3);
            }
            break;
          case 3:
            for (let _0xd412ca of getRoleIdx("딜")) {
              tbf(comp[_0xd412ca], "평추가*", 45, "다과회 동맹 전원 돌격", 4);
            }
            break;
          case 4:
            for (let _0x218a91 of getRoleIdx("딜")) {
              tbf(comp[_0x218a91], "평추가*", 52.5, "다과회 동맹 전원 돌격", 4);
            }
            break;
          default:
            for (let _0x3ea293 of getRoleIdx("딜")) {
              tbf(comp[_0x3ea293], "평추가*", 60, "다과회 동맹 전원 돌격", 4);
            }
            break;
        }
      };
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        for (let _0x31e456 of getRoleIdx("딜")) {
          atbf(_0x23a024, "궁", comp[_0x31e456], "평추가*", 37.5, "<Shuffling>", 4, always);
        }
        if (getRoleCnt("딜") >= 4) {
          tbf(all, "공퍼증", 70, "<Four of a Kind>1", always);
          tbf(all, "일뎀증", 100, "<Four of a Kind>2", always);
        }
      };
      _0x23a024.passive = function () {
        anbf(_0x23a024, "궁", all, "일뎀증", 30, "아름다운 소망", 1, 2, always);
        tbf(all, "일뎀증", 30, "공주의 리더십(꿈)", 50);
        anbf(_0x23a024, "궁", all, "가뎀증", 12.5, "다과회 동맹의 야심", 1, 2, always);
        tbf(_0x23a024, "일뎀증", 10, "일반 공격 데미지+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {
          if (GLOBAL_TURN == 1) {
            cdChange(_0x23a024, -4);
          }
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10077:
      setMnc(_0x23a024, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(_0x23a024, "공고증", _0x23a024.hp * 10, "바삭바삭 닭고기 맛!", 4);
            break;
          case 2:
            tbf(_0x23a024, "공고증", _0x23a024.hp * 10, "바삭바삭 닭고기 맛!", 4);
            break;
          case 3:
            tbf(_0x23a024, "공고증", _0x23a024.hp * 12.5, "바삭바삭 닭고기 맛!", 4);
            break;
          case 4:
            tbf(_0x23a024, "공고증", _0x23a024.hp * 15, "바삭바삭 닭고기 맛!", 4);
            break;
          default:
            tbf(_0x23a024, "공고증", _0x23a024.hp * 20, "바삭바삭 닭고기 맛!", 4);
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
        for (let _0x167002 of comp) {
          _0x167002.heal();
        }
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
        for (let _0x4c119e of comp) {
          _0x4c119e.heal2();
        }
      };
      _0x23a024.leader = function () {
        hpUpMe(_0x23a024, 50);
        atbf(_0x23a024, "평", all, "공고증", _0x23a024.hp * 6, "진정한 생존 전문가1", 1, always);
        atbf(_0x23a024, "궁", all, "공고증", _0x23a024.hp * 8, "진정한 생존 전문가2", 1, always);
        tbf(all, "공퍼증", 60, "진정한 생존 전문가3", always);
        for (let _0x1c5fd9 of getRoleIdx("딜", "디")) {
          tbf(comp[_0x1c5fd9], "가뎀증", 50, "진정한 생존 전문가4", always);
        }
        for (let _0x45ef7f of getRoleIdx("탱", "힐", "섶")) {
          atbf(comp[_0x45ef7f], "궁", all, "궁뎀증", 30, "진정한 생존 전문가5", 2, always);
        }
      };
      _0x23a024.passive = function () {
        atbf(_0x23a024, "평", all, "공고증", myCurAtk + _0x23a024.id + 20, "다같이 가자!1", 1, always);
        atbf(_0x23a024, "궁", all, "공고증", myCurAtk + _0x23a024.id + 25, "다같이 가자!2", 1, always);
        atbf(_0x23a024, "평", all, "아머", _0x23a024.hp * 10, "왕성한 호기심1", 1, always);
        atbf(_0x23a024, "평", all, "아머", myCurAtk + _0x23a024.id + 10, "왕성한 호기심2", 1, always);
        atbf(_0x23a024, "궁", all, "공퍼증", 25, "머리 빼고 다 먹을 수 있어", 8, always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10078:
      setMnc(_0x23a024, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            nbf(boss, "받뎀증", 7.5, "루루는 잘못 없어!1", 1, 2);
            for (let _0x3b95a3 of getElementIdx("수")) {
              nbf(comp[_0x3b95a3], "받속뎀", 5, "루루는 잘못 없어!2", 1, 2);
            }
            break;
          case 2:
            nbf(boss, "받뎀증", 7.5, "루루는 잘못 없어!1", 1, 2);
            for (let _0xa1988f of getElementIdx("수")) {
              nbf(comp[_0xa1988f], "받속뎀", 7.5, "루루는 잘못 없어!2", 1, 2);
            }
            break;
          case 3:
            nbf(boss, "받뎀증", 10, "루루는 잘못 없어!1", 1, 2);
            for (let _0x463f74 of getElementIdx("수")) {
              nbf(comp[_0x463f74], "받속뎀", 7.5, "루루는 잘못 없어!2", 1, 2);
            }
            break;
          case 4:
            nbf(boss, "받뎀증", 12.5, "루루는 잘못 없어!1", 1, 2);
            for (let _0x5ddd95 of getElementIdx("수")) {
              nbf(comp[_0x5ddd95], "받속뎀", 10, "루루는 잘못 없어!2", 1, 2);
            }
            break;
          default:
            nbf(boss, "받뎀증", 15, "루루는 잘못 없어!1", 1, 2);
            for (let _0x4874e0 of getElementIdx("수")) {
              nbf(comp[_0x4874e0], "받속뎀", 12.5, "루루는 잘못 없어!2", 1, 2);
            }
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(30);
        tbf(all, "공퍼증", 25, "제어 불가능1", always);
        tbf(_0x23a024, "일뎀증", 30, "제어 불가능2", always);
        for (let _0x5c5eb3 of getElementIdx("수")) {
          anbf(comp[_0x5c5eb3], "공격", boss, "받일뎀", 15, "<수인화>1", 1, 5, always);
          tbf(comp[_0x5c5eb3], "평추가*", 30, "<수인화>2", always);
        }
        if (getElementCnt("수") >= 4) {
          tbf(all, "일뎀증", 50, "<초위험 수인화!>1", always);
          atbf(all, "공격", comp[0], "가뎀증", 5, "<초위험 수인화!>2", 1, always);
          atbf(all, "공격", comp[0], "평추가*", 10, "<초위험 수인화!>3", 1, always);
          atbf(all, "공격", comp[0], "궁추가*", 10, "<초위험 수인화!>3", 1, always);
        }
        if (getElementCnt("수") >= 5) {
          tbf(all, "가뎀증", 30, "<진한 맛 치즈!>1", always);
          atbf(all, "공격", comp[0], "가뎀증", 10, "<진한 맛 치즈!>2", 1, always);
          atbf(all, "공격", comp[0], "평추가*", 20, "<진한 맛 치즈!>3", 1, always);
          atbf(all, "공격", comp[0], "궁추가*", 20, "<진한 맛 치즈!>3", 1, always);
        }
      };
      _0x23a024.passive = function () {
        anbf(_0x23a024, "공격", _0x23a024, "공퍼증", 10, "파스제국 최강 고양이", 1, 5, always);
        tbf(_0x23a024, "평추가*", 35, "난 무척 귀여워, 그러니까 밥이나 줘", always);
        for (let _0x403151 of getElementIdx("수")) {
          anbf(_0x23a024, "평", comp[_0x403151], "받속뎀", 2, "꽃병 파괴자1", 1, 5, always);
        }
        anbf(_0x23a024, "평", boss, "받일뎀", 15, "꽃병 파괴자2", 1, 5, always);
        tbf(_0x23a024, "가뎀증", 7.5, "데미지+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10079:
      setMnc(_0x23a024, [200, 4, 200, 4, 200, 4, 200, 4, 200, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(_0x23a024, "공퍼증", 50, "정월인법 - 근하신년1", 3);
            break;
          case 2:
            tbf(_0x23a024, "공퍼증", 65, "정월인법 - 근하신년1", 3);
            break;
          case 3:
            tbf(_0x23a024, "공퍼증", 80, "정월인법 - 근하신년1", 3);
            break;
          case 4:
            tbf(_0x23a024, "공퍼증", 95, "정월인법 - 근하신년1", 4);
            break;
          default:
            tbf(_0x23a024, "공퍼증", 110, "정월인법 - 근하신년1", 4);
        }
      };
      _0x23a024.ultafter = function () {
        switch (_0x17c963) {
          case 1:
            break;
          case 2:
            break;
          case 3:
            nbf(_0x23a024, "가뎀증", 10, "정월인법 - 근하신년2", 1, 1);
            break;
          case 4:
            nbf(_0x23a024, "가뎀증", 15, "정월인법 - 근하신년2", 1, 1);
            break;
          default:
            nbf(_0x23a024, "가뎀증", 20, "정월인법 - 근하신년2", 1, 1);
        }
      };
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        tbf(all, "공퍼증", 50, "축제 거행 전문가1", always);
        tbf(all, "일뎀증", 30, "축제 거행 전문가2", always);
        atbf(_0x23a024, "궁", _0x23a024, "공고증", myCurAtk + _0x23a024.id + 100, "<새해의 축복>1", 50, 1);
        _0x23a024.stopCd = true;
        _0x23a024.canCDChange = false;
      };
      _0x23a024.passive = function () {
        anbf(_0x23a024, "평", boss, "받일뎀", 20, "닌닌 - 전과 확대술", 1, 4, always);
        tbf(all, "일뎀증", 30, "닌닌 - 암암리 지원술", 50);
        tbf(_0x23a024, "가뎀증", 10, "닌닌 - 분위기 띄운술1", always);
        anbf(_0x23a024, "공격", boss, "받뎀증", 5, "닌닌 - 분위기 띄운술2", 1, 5, always);
        tbf(_0x23a024, "공퍼증", 10, "공격력 증가", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {
          if (GLOBAL_TURN == 1) {
            cdChange(_0x23a024, -4);
          }
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10081:
      setMnc(_0x23a024, [388, 4, 445, 4, 503, 4, 560, 4, 618, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(_0x23a024, "가뎀증", 30, "암즈 오버클럭 - 연정1", 1);
            for (let _0x5a922d of getElementIdx("수")) {
              tbf(comp[_0x5a922d], "가뎀증", 30, "암즈 오버클럭 - 연정2", 1);
            }
            break;
          case 2:
            tbf(_0x23a024, "가뎀증", 35, "암즈 오버클럭 - 연정1", 1);
            for (let _0x49d683 of getElementIdx("수")) {
              tbf(comp[_0x49d683], "가뎀증", 35, "암즈 오버클럭 - 연정2", 1);
            }
            break;
          case 3:
            tbf(_0x23a024, "가뎀증", 40, "암즈 오버클럭 - 연정1", 1);
            for (let _0x440a75 of getElementIdx("수")) {
              tbf(comp[_0x440a75], "가뎀증", 40, "암즈 오버클럭 - 연정2", 1);
            }
            break;
          case 4:
            tbf(_0x23a024, "가뎀증", 45, "암즈 오버클럭 - 연정1", 1);
            for (let _0x473006 of getElementIdx("수")) {
              tbf(comp[_0x473006], "가뎀증", 45, "암즈 오버클럭 - 연정2", 1);
            }
            break;
          default:
            tbf(_0x23a024, "가뎀증", 50, "암즈 오버클럭 - 연정1", 1);
            for (let _0x48c858 of getElementIdx("수")) {
              tbf(comp[_0x48c858], "가뎀증", 50, "암즈 오버클럭 - 연정2", 1);
            }
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024, 2);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(40);
        tbf(_0x23a024, "평발동*", 50, "진정한 후궁 최강자", always);
      };
      _0x23a024.passive = function () {
        tbf(_0x23a024, "궁발동*", 120, "웨딩 암즈 서포트 AI", always);
        for (let _0x2d5a79 of getElementIdx("수")) {
          tbf(comp[_0x2d5a79], "궁발동*", 120, "웨딩 암즈 서포트 AI", always);
        }
        for (let _0x3c4460 of getElementIdx("수", "광")) {
          anbf(_0x23a024, "평", comp[_0x3c4460], "받속뎀", 5, "프로토타입 Z1", 1, 7, always);
        }
        tbf(_0x23a024, "궁발동*", 150, "프로토타입 Z2", always);
        tbf(_0x23a024, "공퍼증", 10, "공격력 증가", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {
          if (GLOBAL_TURN == 1) {
            for (let _0x221735 of getElementIdx("수", "광")) {
              tbf(comp[_0x221735], "공퍼증", 100, "<고귀한 웨딩>1", 50);
              anbf(comp[_0x221735], "궁", boss, "받발뎀", 20, "<고귀한 웨딩>2", 1, 5, 50);
              anbf(comp[_0x221735], "공격", boss, "받궁뎀", 2, "<고귀한 웨딩>3", 1, 60, 50);
              anbf(comp[_0x221735], "공격", boss, "받뎀증", 1, "<고귀한 웨딩>4", 1, 60, 50);
              for (let _0x8d864e of getElementIdx("수", "광")) {
                anbf(comp[_0x221735], "평", comp[_0x8d864e], "받속뎀", 5, "<고귀한 웨딩>5", 1, 7, 50);
              }
            }
          }
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
        nbf(_0x23a024, "궁뎀증", 9, "암즈 공명 - 소녀의 마음", 1, 11);
        for (let _0x48a29e of getElementIdx("수")) {
          nbf(comp[_0x48a29e], "궁뎀증", 9, "암즈 공명 - 소녀의 마음", 1, 11);
        }
      };
      return _0x23a024;
    case 10082:
      setMnc(_0x23a024, [490, 5, 568, 5, 646, 5, 724, 5, 802, 5], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            nbf(_0x23a024, "궁뎀증", 20, "지옥의 꽃1", 1, 1);
            nbf(_0x23a024, "일뎀증", 40, "지옥의 꽃2", 1, 1);
            break;
          case 2:
            nbf(_0x23a024, "궁뎀증", 20, "지옥의 꽃1", 1, 1);
            nbf(_0x23a024, "일뎀증", 40, "지옥의 꽃2", 1, 1);
            break;
          case 3:
            nbf(_0x23a024, "궁뎀증", 40, "지옥의 꽃1", 1, 1);
            nbf(_0x23a024, "일뎀증", 80, "지옥의 꽃2", 1, 1);
            break;
          case 4:
            nbf(_0x23a024, "궁뎀증", 40, "지옥의 꽃1", 1, 1);
            nbf(_0x23a024, "일뎀증", 80, "지옥의 꽃2", 1, 1);
            break;
          default:
            nbf(_0x23a024, "궁뎀증", 50, "지옥의 꽃1", 1, 1);
            nbf(_0x23a024, "일뎀증", 100, "지옥의 꽃2", 1, 1);
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(20);
        tbf(_0x23a024, "공퍼증", 100, "청순의 힘1", always);
        tbf(all, "공퍼증", 25, "청순의 힘2", always);
        for (let _0x12c290 of comp) {
          if (_0x12c290.id != _0x23a024.id) {
            for (let _0x3c3446 of getElementIdx("암")) {
              anbf(_0x12c290, "공격", comp[_0x3c3446], "받속뎀", 1, "<절대 복종>1", 1, 20, 50);
            }
            atbf(_0x12c290, "공격", comp[0], "공고증", myCurAtk + _0x12c290.id + 15, "<절대 복종>2", 1, 50);
          }
        }
      };
      _0x23a024.passive = function () {
        for (let _0x2e5679 of getElementIdx("암")) {
          anbf(_0x23a024, "공격", comp[_0x2e5679], "받속뎀", 4, "무구한 의복", 1, 5, always);
        }
        atbf(_0x23a024, "방", _0x23a024, "공퍼증", 100, "고통의 쾌락", 2, always);
        anbf(_0x23a024, "공격", all, "공퍼증", 3, "진정한 힘", 1, 10, always);
        tbf(_0x23a024, "궁뎀증", 10, "궁극기 데미지+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {
          if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 5 == 0) {
            tbf(all, "공퍼증", 50, "청순의 힘3", 3);
          }
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10083:
      setMnc(_0x23a024, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(all, "공고증", myCurAtk + _0x23a024.id + 40, "함께 가버리는 거야~1", 1);
            break;
          case 2:
            tbf(all, "공고증", myCurAtk + _0x23a024.id + 45, "함께 가버리는 거야~1", 1);
            break;
          case 3:
            tbf(all, "공고증", myCurAtk + _0x23a024.id + 50, "함께 가버리는 거야~1", 1);
            tbf(all, "공퍼증", 10, "함께 가버리는 거야~2", 4);
            break;
          case 4:
            tbf(all, "공고증", myCurAtk + _0x23a024.id + 50, "함께 가버리는 거야~1", 1);
            tbf(all, "공퍼증", 15, "함께 가버리는 거야~2", 4);
            break;
          default:
            tbf(all, "공고증", myCurAtk + _0x23a024.id + 50, "함께 가버리는 거야~1", 1);
            tbf(all, "공퍼증", 20, "함께 가버리는 거야~2", 4);
        }
      };
      _0x23a024.ultafter = function () {
        if (_0x23a024.isLeader) {
          for (let _0x55d75f of comp) {
            if (_0x55d75f.id != _0x23a024.id) {
              atbf(_0x55d75f, "궁", _0x23a024, "공고증", myCurAtk + _0x55d75f.id + 50, "나도 기분 좋게 해줘~", 2, 1);
            }
          }
        }
      };
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
        for (let _0x3d6532 of comp) {
          _0x3d6532.heal();
        }
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
        for (let _0x4e7379 of comp) {
          _0x4e7379.heal();
        }
      };
      _0x23a024.leader = function () {
        tbf(all, "공퍼증", 30, "누구나 환영~", always);
        atbf(_0x23a024, "궁", _0x23a024, "평발동*", 50, "크레이지 츄르릅", 2, always);
        atbf(_0x23a024, "궁", _0x23a024, "평발동*", 50, "크레이지 츄르릅", 2, always);
        atbf(_0x23a024, "궁", _0x23a024, "평발동*", 50, "크레이지 츄르릅", 2, always);
        anbf(_0x23a024, "평", _0x23a024, "공퍼증", 10, "<절정으로 Fly>", 1, 7, always);
        atbf(_0x23a024, "궁", _0x23a024, "제거", "기본", "<절정으로 Fly>", 1, always);
      };
      _0x23a024.passive = function () {
        atbf(_0x23a024, "궁", _0x23a024, "평발동*", 50, "<멈출수 없는 츄르릅>", 2, always);
        atbf(_0x23a024, "궁", _0x23a024, "평발동*", 50, "<멈출수 없는 츄르릅>", 2, always);
        atbf(_0x23a024, "궁", _0x23a024, "평발동*", 50, "<멈출수 없는 츄르릅>", 2, always);
        anbf(_0x23a024, "평", _0x23a024, "공퍼증", 10, "<갈수록 짜릿짜릿>", 1, 7, always);
        atbf(_0x23a024, "궁", _0x23a024, "제거", "기본", "<갈수록 짜릿짜릿>", 1, always);
        anbf(_0x23a024, "방", _0x23a024, "공퍼증", 10, "<갈수록 짜릿짜릿>", 3, 7, always);
        if (_0x23a024.isLeader) {
          anbf(_0x23a024, "방", _0x23a024, "공퍼증", 10, "<절정으로 Fly>", 3, 7, always);
        }
        tbf(_0x23a024, "공퍼증", 10, "공격력 증가", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10084:
      setMnc(_0x23a024, [265, 3, 298, 3, 331, 3, 364, 3, 397, 3], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(boss, "받궁뎀", 25, "빈틈 발견!", 1);
            break;
          case 2:
            tbf(boss, "받궁뎀", 30, "빈틈 발견!", 1);
            break;
          case 3:
            tbf(boss, "받궁뎀", 35, "빈틈 발견!", 1);
            break;
          case 4:
            tbf(boss, "받궁뎀", 40, "빈틈 발견!", 1);
            break;
          default:
            tbf(boss, "받궁뎀", 45, "빈틈 발견!", 1);
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(40);
        tbf(all, "공퍼증", 40, "죽었지만 죽지 않았어", always);
        _0x23a024.cd -= 1;
        _0x23a024.curCd -= 1;
      };
      _0x23a024.passive = function () {
        atbf(_0x23a024, "공격", _0x23a024, "공퍼증", 20, "슈퍼챗", 3, always);
        anbf(_0x23a024, "궁", _0x23a024, "가뎀증", 7, "<신나게 라이브를!>1", 1, 5, always);
        atbf(_0x23a024, "궁", _0x23a024, "공발동*", 50, "<신나게 라이브를!>2", 3, always);
        tbf(_0x23a024, "궁발동*", 99.9, "이방인의 전법1", always);
        atbf(_0x23a024, "공격", _0x23a024, "궁뎀증", 10, "이방인의 전법2", 5, always);
        tbf(_0x23a024, "궁뎀증", 10, "필살+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10085:
      setMnc(_0x23a024, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(all, "공퍼증", 20, "애무의 손길1", 3);
            tbf(_0x23a024, "일뎀증", 30, "애무의 손길2", 4);
            break;
          case 2:
            tbf(all, "공퍼증", 25, "애무의 손길1", 3);
            tbf(_0x23a024, "일뎀증", 30, "애무의 손길2", 4);
            break;
          case 3:
            tbf(all, "공퍼증", 25, "애무의 손길1", 4);
            tbf(_0x23a024, "일뎀증", 40, "애무의 손길2", 4);
            break;
          case 4:
            tbf(all, "공퍼증", 30, "애무의 손길1", 4);
            tbf(_0x23a024, "일뎀증", 40, "애무의 손길2", 4);
            break;
          default:
            tbf(all, "공퍼증", 35, "애무의 손길1", 4);
            tbf(_0x23a024, "일뎀증", 50, "애무의 손길2", 4);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
        for (let _0x2e4fba of comp) {
          _0x2e4fba.heal();
        }
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
        for (let _0x4f4959 of comp) {
          _0x4f4959.heal();
        }
      };
      _0x23a024.leader = function () {
        hpUpAll(35);
        for (let _0x406e8a of getElementIdx("화", "암")) {
          atbf(comp[_0x406e8a], "힐", comp[_0x406e8a], "궁뎀증", 7.5, "시드는 꽃잎1", 2, always);
          atbf(comp[_0x406e8a], "힐", comp[_0x406e8a], "일뎀증", 10, "시드는 꽃잎2", 2, always);
        }
        for (let _0x2a0f02 of getElementIdx("화", "암")) {
          ptbf(comp[_0x2a0f02], "공격", all, "힐", 5, "시드는 꽃잎3", 1, always);
        }
      };
      _0x23a024.passive = function () {
        for (let _0xfd52cc of comp) {
          atbf(_0xfd52cc, "힐", _0xfd52cc, "공퍼증", 12.5, "<취생몽사>", 2, always);
        }
        for (let _0x3b97ca of comp) {
          atbf(_0x3b97ca, "힐", _0x3b97ca, "가뎀증", 5, "<무르익은 춘의>", 2, always);
        }
        tbf(_0x23a024, "공퍼증", 10, "공격+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10088:
      setMnc(_0x23a024, [265, 3, 298, 3, 331, 3, 364, 3, 397, 3], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(boss, "받뎀증", 18, "아나스티의 특제 칵테일", 7);
            break;
          case 2:
            tbf(boss, "받뎀증", 18, "아나스티의 특제 칵테일", 7);
            break;
          case 3:
            tbf(boss, "받뎀증", 20, "아나스티의 특제 칵테일", 7);
            break;
          case 4:
            tbf(boss, "받뎀증", 20, "아나스티의 특제 칵테일", 7);
            break;
          default:
            tbf(boss, "받뎀증", 20, "아나스티의 특제 칵테일", 7);
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        atbf(_0x23a024, "궁", all, "가뎀증", 35, "열정적인 쌍성 점장", 1, always);
        const _0x5eba5c = getRoleCnt("딜");
        if (_0x5eba5c >= 1) {
          tbf(all, "공퍼증", 15, "술1", always);
        }
        if (_0x5eba5c >= 2) {
          tbf(all, "공퍼증", 20, "술2", always);
        }
        if (_0x5eba5c >= 3) {
          tbf(all, "공퍼증", 30, "술3", always);
        }
        const _0x49436b = getRoleCnt("디");
        if (_0x49436b >= 1) {
          tbf(all, "공퍼증", 15, "미인1", always);
        }
        if (_0x49436b >= 2) {
          tbf(all, "공퍼증", 20, "미인2", always);
        }
        if (_0x49436b >= 3) {
          tbf(all, "공퍼증", 30, "미인3", always);
        }
        if (getRoleCnt("탱") >= 1) {
          tbf(all, "궁뎀증", 50, "기도", always);
        }
        for (let _0x402d9c of comp) {
          if (_0x402d9c.name == "신파랑") {
            tbf(all, "가뎀증", 20, "예쁜 동생", always);
          }
        }
      };
      _0x23a024.passive = function () {
        atbf(_0x23a024, "궁", all, "궁뎀증", 25, "기세등등", 1, always);
        for (let _0x414c78 of getRoleIdx("딜", "디")) {
          if (comp[_0x414c78].id == _0x23a024.id) {
            continue;
          }
          atbf(_0x23a024, "궁", comp[_0x414c78], "궁발동*", 77, "추가 주문", 1, always);
        }
        tbf(_0x23a024, "공퍼증", 10, "공격 데미지+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        if (GLOBAL_TURN == 7) {
          nbf(all, "가뎀증", 30, "칠석의 기원", 1, 1);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10089:
      setMnc(_0x23a024, [0, 3, 0, 3, 0, 3, 0, 3, 0, 3], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(_0x23a024, "아머", _0x23a024.hp * 40 * armorUp(_0x23a024, "궁", "추가"), "언니는 내가 지켜!1", 1);
            for (let _0x5695c1 of getElementIdx("화", "수")) {
              tbf(comp[_0x5695c1], "받속뎀", 14, "언니는 내가 지켜!2", 2);
            }
            break;
          case 2:
            tbf(_0x23a024, "아머", _0x23a024.hp * 45 * armorUp(_0x23a024, "궁", "추가"), "언니는 내가 지켜!1", 1);
            for (let _0xd6b543 of getElementIdx("화", "수")) {
              tbf(comp[_0xd6b543], "받속뎀", 18, "언니는 내가 지켜!2", 2);
            }
            break;
          case 3:
            tbf(_0x23a024, "아머", _0x23a024.hp * 50 * armorUp(_0x23a024, "궁", "추가"), "언니는 내가 지켜!1", 1);
            for (let _0x3628e5 of getElementIdx("화", "수")) {
              tbf(comp[_0x3628e5], "받속뎀", 22, "언니는 내가 지켜!2", 2);
            }
            break;
          case 4:
            tbf(_0x23a024, "아머", _0x23a024.hp * 55 * armorUp(_0x23a024, "궁", "추가"), "언니는 내가 지켜!1", 1);
            for (let _0x28ce8b of getElementIdx("화", "수")) {
              tbf(comp[_0x28ce8b], "받속뎀", 26, "언니는 내가 지켜!2", 2);
            }
            break;
          default:
            tbf(_0x23a024, "아머", _0x23a024.hp * 60 * armorUp(_0x23a024, "궁", "추가"), "언니는 내가 지켜!1", 1);
            for (let _0x1b84d6 of getElementIdx("화", "수")) {
              tbf(comp[_0x1b84d6], "받속뎀", 30, "언니는 내가 지켜!2", 2);
            }
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
        _0x23a024.heal();
        for (let _0x416104 of comp) {
          if (_0x416104.id == 10088) {
            _0x416104.heal();
          }
        }
      };
      _0x23a024.leader = function () {
        hpUpAll(30);
        hpUpMe(_0x23a024, 40);
        tbf(all, "공퍼증", 40, "최고급 클럽 매니저1", always);
        tbf(_0x23a024, "받아증", 30, "최고급 클럽 매니저2", always);
        for (let _0x130f49 of comp) {
          if (_0x130f49.id == 10088) {
            tbf(_0x130f49, "받아증", 30, "최고급 클럽 매니저3", always);
          }
        }
      };
      _0x23a024.passive = function () {
        atbf(_0x23a024, "평", all, "아머", _0x23a024.hp * 10, "꿈의 직장1", 1, always);
        for (let _0x1a5c85 of comp) {
          if (_0x1a5c85.id == 10088) {
            atbf(_0x23a024, "평", _0x1a5c85, "아머", _0x23a024.hp * 10, "꿈의 직장2", 1, always);
          }
        }
        for (let _0x179979 of getElementIdx("화", "수")) {
          for (let _0x5dfb09 of getElementIdx("화", "수")) {
            anbf(comp[_0x179979], "공격", comp[_0x5dfb09], "받속뎀", 1.5, "<뒤엉킨 운명>1", 1, 7, always);
          }
          anbf(comp[_0x179979], "공격", comp[_0x179979], "가뎀증", 1.5, "<뒤엉킨 운명>2", 1, 7, always);
          anbf(comp[_0x179979], "공격", comp[_0x179979], "궁뎀증", 1.5, "<뒤엉킨 운명>3", 1, 7, always);
        }
        for (let _0x49cd5c of getElementIdx("화", "수")) {
          if (comp.find(_0x222155 => _0x222155.id == 10088)) {
            anbf(comp[_0x49cd5c], "공격", comp[_0x49cd5c], "가뎀증", 1.5, "<뒤엉킨 운명-구속>1", 1, 7, always);
            anbf(comp[_0x49cd5c], "공격", comp[_0x49cd5c], "궁뎀증", 1.5, "<뒤엉킨 운명-구속>2", 1, 7, always);
          }
        }
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10090:
      setMnc(_0x23a024, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x17c963);
      _0x23a024.ultbefore = function () {};
      _0x23a024.ultafter = function () {
        switch (_0x17c963) {
          case 1:
            tbf(all, "평발동*", 10, "넘치는 신의 사랑", 3);
            break;
          case 2:
            tbf(all, "평발동*", 15, "넘치는 신의 사랑", 3);
            break;
          case 3:
            tbf(all, "평발동*", 15, "넘치는 신의 사랑", 4);
            break;
          case 4:
            tbf(all, "평발동*", 20, "넘치는 신의 사랑", 4);
            break;
          default:
            tbf(all, "평발동*", 25, "넘치는 신의 사랑", 4);
        }
      };
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        tbf(all, "공퍼증", 50, "천사의 헌팅 구역1", always);
        for (let _0x41a29c of getRoleIdx("딜", "탱", "디")) {
          tbf(comp[_0x41a29c], "공퍼증", 40, "<섹스 신의 부름>1", always);
          tbf(comp[_0x41a29c], "궁발동*", 80, "<섹스 신의 부름>2", always);
        }
      };
      _0x23a024.passive = function () {
        tbf(_0x23a024, "궁발동*", 80, "낙원의 인2", always);
        anbf(_0x23a024, "평", boss, "받발뎀", 20, "실신의 파도", 1, 5, always);
        tbf(_0x23a024, "가뎀증", 20, "신의 애무1", always);
        tbf(_0x23a024, "궁뎀증", 40, "신의 애무2", always);
        tbf(_0x23a024, "궁뎀증", 10, "필살+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {
          if (GLOBAL_TURN > 1) {
            nbf(all, "발효증", 20, "천사의 헌팅 구역2", 1, 10);
          }
        }
        if (GLOBAL_TURN > 1) {
          nbf(_0x23a024, "공퍼증", 10, "낙원의 인1", 1, 10);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10091:
      setMnc(_0x23a024, [0, 3, 0, 3, 0, 3, 0, 3, 0, 3], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            for (let _0x36df4e of getRoleIdx("디")) {
              tbf(comp[_0x36df4e], "공고증", myCurAtk + _0x23a024.id + 40, "블링블링 노엘리빔", 1);
            }
            break;
          case 2:
            for (let _0x46fac9 of getRoleIdx("디")) {
              tbf(comp[_0x46fac9], "공고증", myCurAtk + _0x23a024.id + 45, "블링블링 노엘리빔", 1);
            }
            break;
          case 3:
            for (let _0x445108 of getRoleIdx("디")) {
              tbf(comp[_0x445108], "공고증", myCurAtk + _0x23a024.id + 45, "블링블링 노엘리빔", 2);
            }
            break;
          case 4:
            for (let _0x8e7d58 of getRoleIdx("디")) {
              tbf(comp[_0x8e7d58], "공고증", myCurAtk + _0x23a024.id + 50, "블링블링 노엘리빔", 2);
            }
            break;
          default:
            for (let _0x4dff04 of getRoleIdx("디")) {
              tbf(comp[_0x4dff04], "공고증", myCurAtk + _0x23a024.id + 55, "블링블링 노엘리빔", 2);
            }
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
        for (let _0x23d782 of getRoleIdx("디")) {
          cdChange(comp[_0x23d782], -1);
        }
      };
      _0x23a024.atkbefore = function () {
        for (let _0x397be8 of getRoleIdx("디")) {
          tbf(comp[_0x397be8], "공고증", myCurAtk + _0x23a024.id + 40, "열정의 제창", 1);
        }
      };
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(20);
        tbf(all, "공퍼증", 40, "여름의 운치 해변의 빛나는 별1", always);
        for (let _0x2cac7a of getRoleIdx("디")) {
          atbf(_0x23a024, "평", comp[_0x2cac7a], "공고증", myCurAtk + _0x23a024.id + 40, "여름의 운치 해변의 빛나는 별2", 1, always);
        }
        for (let _0x3f6a83 of getRoleIdx("디")) {
          atbf(_0x23a024, "궁", comp[_0x3f6a83], "공고증", myCurAtk + _0x23a024.id + 25, "여름의 운치 해변의 빛나는 별3", 10, always);
        }
        for (let _0x562926 of getRoleIdx("디")) {
          atbf(comp[_0x562926], "공격", comp[0], "공퍼증", 25, "아이돌 응원단!", 4, always);
        }
      };
      _0x23a024.passive = function () {
        atbf(_0x23a024, "궁", all, "아머", _0x23a024.hp * 50, "떨어지는 유성 같은~", 1, always);
        for (let _0xce260f of getRoleIdx("디")) {
          tbf(comp[_0xce260f], "궁뎀증", 35, "무대 위의 초신성", 50);
        }
        atbf(_0x23a024, "공격", all, "공고증", myCurAtk + _0x23a024.id + 10, "브릴리언트 블링블링 빅뱅1", 1, always);
        for (let _0x1b7102 of getRoleIdx("디")) {
          tbf(comp[_0x1b7102], "가뎀증", 20, "브릴리언트 블링블링 빅뱅2", 50);
        }
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10092:
      setMnc(_0x23a024, [348, 3, 396, 3, 447, 3, 495, 3, 546, 3], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(_0x23a024, "궁뎀증", 10, "거대한 파도 크레이지 빅독", 12);
            break;
          case 2:
            tbf(_0x23a024, "궁뎀증", 10, "거대한 파도 크레이지 빅독", 12);
            break;
          case 3:
            tbf(_0x23a024, "궁뎀증", 12.5, "거대한 파도 크레이지 빅독", 12);
            break;
          case 4:
            tbf(_0x23a024, "궁뎀증", 12.5, "거대한 파도 크레이지 빅독", 12);
            break;
          default:
            tbf(_0x23a024, "궁뎀증", 15, "거대한 파도 크레이지 빅독", 12);
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024, 3);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        tbf(all, "공퍼증", 50, "레전더리 서퍼 전승자1", always);
      };
      _0x23a024.passive = function () {
        tbf(_0x23a024, "공퍼증", 50, "숨만 쉬면 돼...", always);
        tbf(_0x23a024, "궁발동*", 90, "출렁이는 여파", always);
        tbf(_0x23a024, "공퍼증", 10, "공격력 증가", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {
          if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 3 == 0) {
            tbf(_0x23a024, "가뎀증", 125, "<파도 추격>1", 1);
          }
          if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 3 == 0) {
            tbf(boss, "받뎀증", 50, "<파도 추격>2", 1);
          }
          if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 6 == 0) {
            tbf(_0x23a024, "궁뎀증", 125, "<파도 탑승>", 1);
          }
        }
        if (GLOBAL_TURN == 4) {
          tbf(_0x23a024, "공퍼증", 40, "수면 부족의 분노1", 50);
        }
        if (GLOBAL_TURN == 7) {
          tbf(_0x23a024, "공퍼증", 80, "수면 부족의 분노2", 50);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10093:
      setMnc(_0x23a024, [423, 4, 486, 4, 552, 4, 615, 4, 681, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            nbf(_0x23a024, "공퍼증", 10, "과로의 냥이 빔!1", 1, 2);
            break;
          case 2:
            nbf(_0x23a024, "공퍼증", 20, "과로의 냥이 빔!1", 1, 2);
            break;
          case 3:
            nbf(_0x23a024, "공퍼증", 30, "과로의 냥이 빔!1", 1, 2);
            for (let _0x91c83e of getElementIdx("광")) {
              nbf(comp[_0x91c83e], "받속뎀", 5, "과로의 냥이 빔!2", 1, 2);
            }
            break;
          case 4:
            nbf(_0x23a024, "공퍼증", 40, "과로의 냥이 빔!1", 1, 2);
            for (let _0xb5acb of getElementIdx("광")) {
              nbf(comp[_0xb5acb], "받속뎀", 7.5, "과로의 냥이 빔!2", 1, 2);
            }
            break;
          default:
            nbf(_0x23a024, "공퍼증", 50, "과로의 냥이 빔!1", 1, 2);
            for (let _0x29ad5a of getElementIdx("광")) {
              nbf(comp[_0x29ad5a], "받속뎀", 10, "과로의 냥이 빔!2", 1, 2);
            }
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024, 3);
        tbf(_0x23a024, "공발동*", 67.5, "<초과 근무의 죽빵>", 8);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(40);
        tbf(_0x23a024, "공퍼증", 90, "별의 공진", always);
        for (let _0x5a9e1b of comp) {
          if (_0x5a9e1b.id == _0x23a024.id) {
            continue;
          }
          atbf(_0x5a9e1b, "공격", _0x23a024, "공고증", myCurAtk + _0x5a9e1b.id + 20, "<에너지 집중>1", 1, always);
          for (let _0x1713bf of getElementIdx("광", "암")) {
            anbf(_0x5a9e1b, "공격", comp[_0x1713bf], "받속뎀", 4, "<에너지 집중>2", 1, 15, always);
          }
        }
        const _0x2afdf0 = getElementCnt("광");
        const _0x23bfb1 = getElementCnt("암");
        for (let _0x22c2e4 of comp) {
          if (_0x2afdf0 >= 1) {
            tbf(_0x22c2e4, "공퍼증", 5, "<별의 조각>1", always);
          }
          if (_0x2afdf0 >= 2) {
            tbf(_0x22c2e4, "공퍼증", 25, "<별의 조각>2", always);
          }
          if (_0x23bfb1 >= 1) {
            tbf(_0x22c2e4, "공퍼증", 5, "<별의 조각>3", always);
          }
          if (_0x23bfb1 >= 2) {
            tbf(_0x22c2e4, "공퍼증", 25, "<별의 조각>3", always);
          }
        }
      };
      _0x23a024.passive = function () {
        anbf(_0x23a024, "평", _0x23a024, "일뎀증", 6, "과로사할 운명1", 1, 8, always);
        anbf(_0x23a024, "궁", _0x23a024, "궁뎀증", 20, "과로사할 운명2", 1, 2, always);
        anbf(_0x23a024, "힐", _0x23a024, "공퍼증", 8, "출출하다냥!2", 1, 8, always);
        anbf(_0x23a024, "힐", _0x23a024, "가뎀증", 4, "슈퍼 야근 모드!", 1, 8, always);
        tbf(_0x23a024, "공퍼증", 10, "공격+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10094:
      setMnc(_0x23a024, [306, 50, 348, 50, 389, 50, 430, 50, 471, 50], _0x17c963);
      _0x23a024.ultbefore = function () {};
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {
        if (GLOBAL_TURN == 1) {
          for (let _0x2df022 of comp) {
            atbf(_0x2df022, "궁", _0x2df022, "가뎀증", 20, "<자주 학습>", 4, 1);
          }
        }
      };
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpMe(_0x23a024, 70);
      };
      _0x23a024.passive = function () {
        _0x23a024.stopCd = true;
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
        if (GLOBAL_TURN == 1) {
          for (let _0x2163c7 of comp) {
            if (_0x2163c7.id != _0x23a024.id) {
              atbf(_0x2163c7, "궁", _0x23a024, "공고증", myCurAtk + _0x2163c7.id + 25, "<소극 적응>", 1, 50);
            }
          }
        }
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {
          if (GLOBAL_TURN == 4) {
            anbf(_0x23a024, "궁", _0x23a024, "궁뎀증", 60, "<진화단계1>", 1, 1, 1);
          }
          if (GLOBAL_TURN == 7) {
            anbf(_0x23a024, "궁", _0x23a024, "가뎀증", 60, "<진화단계2>", 1, 1, 1);
          }
          if (GLOBAL_TURN == 10) {
            anbf(_0x23a024, "궁", _0x23a024, "궁뎀증", 120, "<진화단계3>", 1, 1, 1);
          }
        }
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 3 == 0) {
          cdChange(_0x23a024, -50);
        }
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 4 == 0) {
          cdChange(_0x23a024, -50);
        }
        if (GLOBAL_TURN > 1) {
          nbf(_0x23a024, "공퍼증", 5, "적응 재진화", 1, 50);
        }
        if (GLOBAL_TURN == 4) {
          anbf(_0x23a024, "궁", _0x23a024, "궁뎀증", 20, "<잠식단계1>", 1, 1, 1);
        }
        if (GLOBAL_TURN == 7) {
          anbf(_0x23a024, "궁", _0x23a024, "가뎀증", 20, "<잠식단계2>", 1, 1, 1);
        }
        if (GLOBAL_TURN == 10) {
          anbf(_0x23a024, "궁", _0x23a024, "궁뎀증", 40, "<잠식단계3>", 1, 1, 1);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10095:
      _0x23a024.stack = 0;
      setMnc(_0x23a024, [0, 3, 0, 3, 0, 3, 0, 3, 0, 3], _0x17c963);
      buff_ex.push("<불굴의 결심>", "<작은 기사>");
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(_0x23a024, "공퍼증", 10, "큰 용기1", 3);
            ptbf(_0x23a024, "궁", _0x23a024, "아머", _0x23a024.hp * 30, "큰 용기2", 1, 1);
            tbf(boss, "받뎀증", 5, "큰 용기3", 3);
            break;
          case 2:
            tbf(_0x23a024, "공퍼증", 20, "큰 용기1", 3);
            ptbf(_0x23a024, "궁", _0x23a024, "아머", _0x23a024.hp * 35, "큰 용기2", 1, 1);
            tbf(boss, "받뎀증", 10, "큰 용기3", 3);
            break;
          case 3:
            tbf(_0x23a024, "공퍼증", 30, "큰 용기1", 3);
            ptbf(_0x23a024, "궁", _0x23a024, "아머", _0x23a024.hp * 40, "큰 용기2", 1, 1);
            tbf(boss, "받뎀증", 15, "큰 용기3", 3);
            break;
          case 4:
            tbf(_0x23a024, "공퍼증", 40, "큰 용기1", 3);
            ptbf(_0x23a024, "궁", _0x23a024, "아머", _0x23a024.hp * 45, "큰 용기2", 1, 1);
            tbf(boss, "받뎀증", 20, "큰 용기3", 3);
            break;
          default:
            tbf(_0x23a024, "공퍼증", 50, "큰 용기1", 3);
            ptbf(_0x23a024, "궁", _0x23a024, "아머", _0x23a024.hp * 50, "큰 용기2", 1, 1);
            tbf(boss, "받뎀증", 25, "큰 용기3", 3);
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
        _0x23a024.stack++;
        if (_0x23a024.stack > 10) {
          _0x23a024.stack = 10;
        }
        setBuffSize(_0x23a024, "기본", "드높은 투지1", _0x23a024.stack * 10);
        setBuffNest(_0x23a024, "발동", "드높은 투지2", _0x23a024.stack);
      };
      _0x23a024.leader = function () {
        tbf(all, "공퍼증", 50, "어엿한 성기사가 되겠어!1", always);
        for (let _0x4fcb2b of getElementIdx("광")) {
          tbf(comp[_0x4fcb2b], "궁뎀증", 30, "어엿한 성기사가 되겠어!2", always);
        }
        nbf(_0x23a024, "<불굴의 결심>", 0, "굳센 결심", 10, 10);
      };
      _0x23a024.passive = function () {
        anbf(_0x23a024, "피격", _0x23a024, "<불굴의 결심>", 0, "굳센 결심", 1, 10, always);
        tbf(_0x23a024, "궁발동*", 0, "굳센 결심1", always);
        anbf(_0x23a024, "궁", _0x23a024, "<불굴의 결심>", 0, "굳센 결심", 2, 10, always);
        tbf(_0x23a024, "평발동*", 0, "드높은 투지1", always);
        anbf(_0x23a024, "평", _0x23a024, "<작은 기사>", 0, "드높은 투지", 1, 10, always);
        anbf(_0x23a024, "궁", boss, "받발뎀", 10, "드높은 투지2", 0, 10, always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {
          if (GLOBAL_TURN > 1) {
            for (let _0x5a4f4e of getElementIdx("광")) {
              if (comp[_0x5a4f4e].id != _0x23a024.id) {
                tbf(comp[_0x5a4f4e], "공고증", myCurAtk + _0x23a024.id + 40, "어엿한 성기사가 되겠어!4", 1);
              }
            }
          }
        }
        setBuffSize(_0x23a024, "기본", "굳센 결심1", _0x23a024.getNest("<불굴의 결심>") * 45);
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10096:
      setMnc(_0x23a024, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(all, "공고증", myCurAtk + _0x23a024.id + 30, "피로 물든 밤의 광기1", 1);
            for (let _0x21ee0e of getRoleIdx("딜", "디", "탱")) {
              for (let _0x1478b1 of comp) {
                if (_0x1478b1.id != comp[_0x21ee0e].id) {
                  atbf(comp[_0x21ee0e], "공격", _0x1478b1, "공고증", myCurAtk + comp[_0x21ee0e].id + 10, "피로 물든 밤의 광기2", 1, 1);
                }
              }
            }
            break;
          case 2:
            tbf(all, "공고증", myCurAtk + _0x23a024.id + 35, "피로 물든 밤의 광기1", 1);
            for (let _0x21e190 of getRoleIdx("딜", "디", "탱")) {
              for (let _0x28f8ba of comp) {
                if (_0x28f8ba.id != comp[_0x21e190].id) {
                  atbf(comp[_0x21e190], "공격", _0x28f8ba, "공고증", myCurAtk + comp[_0x21e190].id + 10, "피로 물든 밤의 광기2", 1, 1);
                }
              }
            }
            break;
          case 3:
            tbf(all, "공고증", myCurAtk + _0x23a024.id + 35, "피로 물든 밤의 광기1", 1);
            for (let _0x2f3173 of getRoleIdx("딜", "디", "탱")) {
              for (let _0x364fa1 of comp) {
                if (_0x364fa1.id != comp[_0x2f3173].id) {
                  atbf(comp[_0x2f3173], "공격", _0x364fa1, "공고증", myCurAtk + comp[_0x2f3173].id + 12.5, "피로 물든 밤의 광기2", 1, 1);
                }
              }
            }
            break;
          case 4:
            tbf(all, "공고증", myCurAtk + _0x23a024.id + 40, "피로 물든 밤의 광기1", 1);
            for (let _0x517644 of getRoleIdx("딜", "디", "탱")) {
              for (let _0x283b23 of comp) {
                if (_0x283b23.id != comp[_0x517644].id) {
                  atbf(comp[_0x517644], "공격", _0x283b23, "공고증", myCurAtk + comp[_0x517644].id + 12.5, "피로 물든 밤의 광기2", 1, 1);
                }
              }
            }
            break;
          default:
            tbf(all, "공고증", myCurAtk + _0x23a024.id + 40, "피로 물든 밤의 광기1", 1);
            for (let _0x10261d of getRoleIdx("딜", "디", "탱")) {
              for (let _0x214827 of comp) {
                if (_0x214827.id != comp[_0x10261d].id) {
                  atbf(comp[_0x10261d], "공격", _0x214827, "공고증", myCurAtk + comp[_0x10261d].id + 15, "피로 물든 밤의 광기2", 1, 1);
                }
              }
            }
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {
        tbf(all, "공고증", myCurAtk + _0x23a024.id + 30, "피의 축복", 1);
      };
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        for (let _0x2631f1 of getElementIdx("암")) {
          nbf(comp[_0x2631f1], "공퍼증", 100, "은혜1", 1, 1);
          nbf(comp[_0x2631f1], "궁뎀증", 50, "은혜2", 1, 1);
        }
      };
      _0x23a024.passive = function () {
        atbf(_0x23a024, "평", all, "일뎀증", 30, "할로윈의 광기1", 1, always);
        atbf(_0x23a024, "궁", all, "궁뎀증", 10, "할로윈의 광기2", 2, always);
        for (let _0x53390a of getRoleIdx("딜", "디", "탱")) {
          atbf(comp[_0x53390a], "행동", all, "공퍼증", 15, "소나타", 50, 1);
        }
        tbf(_0x23a024, "공퍼증", 10, "공격+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 4 == 0) {
          tbf(boss, "받뎀증", 30, "피안개", 1);
        }
      };
      _0x23a024.turnover = function () {};
      return _0x23a024;
    case 10097:
      setMnc(_0x23a024, [265, 3, 298, 3, 331, 3, 364, 3, 397, 3], _0x17c963);
      _0x23a024.stack = false;
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(all, "궁뎀증", 25, "섹스마스 강림!1", 2);
            break;
          case 2:
            tbf(all, "궁뎀증", 30, "섹스마스 강림!1", 2);
            break;
          case 3:
            tbf(all, "궁뎀증", 30, "섹스마스 강림!1", 2);
            tbf(_0x23a024, "가뎀증", 20, "섹스마스 강림!2", 2);
            break;
          case 4:
            tbf(all, "궁뎀증", 30, "섹스마스 강림!1", 2);
            tbf(_0x23a024, "가뎀증", 20, "섹스마스 강림!2", 2);
            break;
          default:
            tbf(all, "궁뎀증", 35, "섹스마스 강림!1", 2);
            tbf(_0x23a024, "가뎀증", 25, "섹스마스 강림!2", 2);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
        if (_0x23a024.isLeader) {
          if (_0x23a024.stack) {
            cdChange(_0x23a024, -3);
            _0x23a024.stack = false;
          }
        }
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        let _0x3b5c12 = 0;
        if (getElementCnt("광") >= 3) {
          _0x3b5c12 += 10;
          tbf(all, "공퍼증", 65, "<오럴송>1", always);
          for (let _0x569a91 of getElementIdx("광")) {
            anbf(all, "공격", comp[_0x569a91], "받속뎀", 4, "<오럴송>2", 1, 5, always);
          }
          for (let _0x2a1ee3 of getElementIdx("풍")) {
            anbf(all, "공격", comp[_0x2a1ee3], "받속뎀", 4, "<오럴송>3", 1, 5, always);
          }
        }
        if (getElementCnt("풍") >= 2) {
          _0x3b5c12 += 10;
          tbf(all, "공퍼증", 65, "<난교 파티>1", always);
          for (let _0x150464 of getElementIdx("광")) {
            anbf(all, "공격", comp[_0x150464], "받속뎀", 4, "<난교 파티>2", 1, 5, always);
          }
          for (let _0xbfd0a2 of getElementIdx("풍")) {
            anbf(all, "공격", comp[_0xbfd0a2], "받속뎀", 4, "<난교 파티>3", 1, 5, always);
          }
        }
        if (_0x3b5c12 != 0) {
          hpUpAll(_0x3b5c12);
        }
      };
      _0x23a024.passive = function () {
        anbf(_0x23a024, "궁", _0x23a024, "받캐뎀", 50, "발골", 1, 1, always);
        anbf(_0x23a024, "궁", _0x23a024, "공퍼증", 50, "정신통일", 1, 2, always);
        tbf(_0x23a024, "가뎀증", 15, "시저 님을 위하여1", always);
        atbf(_0x23a024, "궁", boss, "받뎀증", 35, "시저 님을 위하여2", 2, always);
        tbf(_0x23a024, "궁뎀증", 10, "궁극기+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {
          if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 3 == 0) {
            _0x23a024.stack = true;
          }
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10098:
      setMnc(_0x23a024, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            nbf(boss, "받궁뎀", 8, "연쇄 트랩!", 1, 3);
            break;
          case 2:
            nbf(boss, "받궁뎀", 8, "연쇄 트랩!", 1, 3);
            break;
          case 3:
            nbf(boss, "받궁뎀", 8, "연쇄 트랩!", 1, 3);
            break;
          case 4:
            nbf(boss, "받궁뎀", 18, "연쇄 트랩!", 1, 2);
            break;
          default:
            nbf(boss, "받궁뎀", 22.5, "연쇄 트랩!", 1, 2);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        tbf(all, "공퍼증", 40, "함께 놀수록 재밌는 법~1", always);
        hpUpAll(10);
        if (getRoleCnt("탱") > 0) {
          tbf(all, "공퍼증", 50, "크리스마스 최고!1", always);
        }
        if (getElementCnt("광") >= 2) {
          tbf(all, "공퍼증", 25, "크리스마스 최고!2", always);
        }
        if (getElementCnt("화") > 0) {
          tbf(all, "공퍼증", 25, "크리스마스 최고!3", always);
        }
      };
      _0x23a024.passive = function () {
        tbf(_0x23a024, "가뎀증", 35, "시험작 999호1", always);
        tbf(_0x23a024, "공퍼증", 10, "공격+", always);
        anbf(_0x23a024, "궁", boss, "받뎀증", 5, "다방구 시작~", 4, 11, always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {
          if (GLOBAL_TURN == 5) {
            nbf(all, "궁뎀증", 30, "함께 놀수록 재밌는 법~2", 1, 1);
          }
          if (GLOBAL_TURN == 9) {
            nbf(all, "가뎀증", 20, "함께 놀수록 재밌는 법~3", 1, 1);
          }
        }
      };
      _0x23a024.turnover = function () {
        nbf(boss, "받뎀증", 5, "다방구 시작~", 1, 11);
      };
      return _0x23a024;
    case 10100:
      setMnc(_0x23a024, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            break;
          case 2:
            break;
          case 3:
            tbf(_0x23a024, "가뎀증", 15, "우사기 히메데스!", 4);
            break;
          case 4:
            tbf(_0x23a024, "가뎀증", 17.5, "우사기 히메데스!", 4);
            break;
          default:
            tbf(_0x23a024, "가뎀증", 20, "우사기 히메데스!", 4);
            break;
        }
      };
      _0x23a024.ultafter = function () {
        switch (_0x17c963) {
          case 1:
            tbf(_0x23a024, "가뎀증", 10, "우사기 히메데스!", 4);
            break;
          case 2:
            tbf(_0x23a024, "가뎀증", 12.5, "우사기 히메데스!", 4);
            break;
          case 3:
            break;
          case 4:
            break;
          default:
            break;
        }
      };
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024, 10);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        tbf(all, "공퍼증", 30, "고유 결계 - 악토끼 왕국!1", always);
        anbf(_0x23a024, "궁", _0x23a024, "공퍼증", 50, "고유 결계 - 악토끼 왕국!2", 1, 4, always);
        for (let _0x4adf33 of getRoleIdx("딜", "탱", "디")) {
          tbf(comp[_0x4adf33], "평추가*", 60, "<무다 무다 무다!>1", always);
          tbf(comp[_0x4adf33], "일뎀증", 60, "<무다 무다 무다!>2", always);
        }
      };
      _0x23a024.passive = function () {
        tbf(_0x23a024, "평추가*", 60, "무한 찌찌!1", always);
        anbf(_0x23a024, "평", all, "일뎀증", 15, "무한 찌찌!2", 1, 3, always);
        tbf(_0x23a024, "공퍼증", 10, "공격력 증가", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {
          if (GLOBAL_TURN == 1) {
            for (let _0x245b5d of comp) {
              cdChange(_0x245b5d, -2);
            }
          }
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
        nbf(boss, "받일뎀", 20, "가라! 악토끼 삼전사!", 1, 5);
      };
      return _0x23a024;
    case 10106:
      setMnc(_0x23a024, [200, 3, 200, 3, 200, 3, 200, 3, 200, 3], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(_0x23a024, "가뎀증", 10, "엘프궁술 - 연격의 화살1", 3);
            break;
          case 2:
            tbf(_0x23a024, "가뎀증", 10, "엘프궁술 - 연격의 화살1", 3);
            break;
          case 3:
            tbf(_0x23a024, "가뎀증", 15, "엘프궁술 - 연격의 화살1", 3);
            break;
          case 4:
            tbf(_0x23a024, "가뎀증", 15, "엘프궁술 - 연격의 화살1", 3);
            break;
          default:
            tbf(_0x23a024, "가뎀증", 20, "엘프궁술 - 연격의 화살1", 3);
            break;
        }
      };
      _0x23a024.ultafter = function () {
        switch (_0x17c963) {
          case 1:
            buff(_0x23a024, "공발동*", 50, "엘프궁술 - 연격의 화살3", 3, false);
            break;
          case 2:
            buff(_0x23a024, "공발동*", 65, "엘프궁술 - 연격의 화살3", 3, false);
            break;
          case 3:
            buff(_0x23a024, "공발동*", 80, "엘프궁술 - 연격의 화살3", 3, false);
            break;
          case 4:
            buff(_0x23a024, "공발동*", 95, "엘프궁술 - 연격의 화살3", 3, false);
            break;
          default:
            buff(_0x23a024, "공발동*", 110, "엘프궁술 - 연격의 화살3", 3, false);
            break;
        }
      };
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
        for (let _0x38e04c of comp) {
          setBuffOnAll(_0x38e04c, "기본", "엘프궁술 - 연격의 화살3", true);
        }
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(20);
        if (getElementCnt("풍") >= 3) {
          for (let _0x493042 of getRoleIdx("딜", "디")) {
            tbf(comp[_0x493042], "공퍼증", 25, "<엘프 대장>1", always);
            tbf(comp[_0x493042], "발뎀증", 175, "<엘프 대장>2", always);
            tbf(comp[_0x493042], "평발동*", 40, "<엘프 대장>3", always);
            tbf(comp[_0x493042], "궁발동*", 100, "<엘프 대장>4", always);
          }
        }
        if (getElementCnt("화") >= 2) {
          tbf(all, "공퍼증", 100, "<저격 포메이션>", always);
        }
      };
      _0x23a024.passive = function () {
        tbf(_0x23a024, "궁발동*", 80, "추풍의 맹격", always);
        anbf(_0x23a024, "평", boss, "받발뎀", 20, "부식 화살통1", 1, 5, always);
        tbf(_0x23a024, "평발동*", 35, "부식 화살통2", always);
        anbf(_0x23a024, "평", all, "궁뎀증", 6, "영기의 강격1", 1, 5, always);
        anbf(_0x23a024, "궁", boss, "받궁뎀", 15, "영기의 강격2", 1, 2, always);
        tbf(_0x23a024, "궁뎀증", 10, "궁극기+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10107:
      setMnc(_0x23a024, [353, 4, 404, 4, 454, 4, 505, 4, 555, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            nbf(_0x23a024, "공퍼증", 18.75, "회전 회오리 슛!", 4, 4);
            break;
          case 2:
            nbf(_0x23a024, "공퍼증", 22.5, "회전 회오리 슛!", 4, 4);
            break;
          case 3:
            nbf(_0x23a024, "공퍼증", 26.25, "회전 회오리 슛!", 4, 4);
            break;
          case 4:
            nbf(_0x23a024, "공퍼증", 30, "회전 회오리 슛!", 4, 4);
            break;
          default:
            nbf(_0x23a024, "공퍼증", 33.75, "회전 회오리 슛!", 4, 4);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
        deleteBuff(_0x23a024, "기본", "큰거 한방!");
        deleteBuff(_0x23a024, "기본", "공수전환!!");
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
        nbf(_0x23a024, "공퍼증", 33.75, "회전 회오리 슛!", -1, 4);
      };
      _0x23a024.leader = function () {
        hpUpAll(20);
        tbf(all, "공퍼증", 40, "악수는 승패가 난 후에!1", always);
        for (let _0x5b31bf of getRoleIdx("딜")) {
          atbf(_0x23a024, "평", comp[_0x5b31bf], "공고증", myCurAtk + _0x23a024.id + 40, "악수는 승패가 난 후에!2", 1, always);
        }
        if (getRoleCnt("딜") >= 4) {
          for (let _0x11c077 of getRoleIdx("딜")) {
            tbf(comp[_0x11c077], "공퍼증", 100, "<일파만파!>1", always);
            atbf(comp[_0x11c077], "궁", comp[0], "공고증", myCurAtk + comp[_0x11c077].id + 60, "<일파만파!>2", 1, always);
          }
        }
      };
      _0x23a024.passive = function () {
        anbf(_0x23a024, "평", _0x23a024, "공퍼증", 12.5, "파워 차징!", 1, 4, always);
        tbf(all, "가뎀증", 10, "공수 전환!!1", always);
        tbf(_0x23a024, "궁뎀증", 10, "궁극기+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 4 == 0) {
          nbf(_0x23a024, "공퍼증", 75, "큰거 한방!", 1, 1);
          nbf(_0x23a024, "가뎀증", 40, "공수 전환!!", 1, 1);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10108:
      setMnc(_0x23a024, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        for (let _0x17ce51 of comp) {
          if (_0x17ce51.id != _0x23a024.id) {
            tbf(_0x17ce51, "공고증", myCurAtk + _0x23a024.id + 20, "발렌타인 초콜릿 대방출~1", 1);
          }
        }
        switch (_0x17c963) {
          case 1:
            nbf(boss, "받뎀증", 15, "발렌타인 초콜릿 대방출~2", 1, 3);
            break;
          case 2:
            nbf(boss, "받뎀증", 15, "발렌타인 초콜릿 대방출~2", 1, 3);
            break;
          case 3:
            nbf(boss, "받뎀증", 22.5, "발렌타인 초콜릿 대방출~2", 1, 2);
            break;
          case 4:
            nbf(boss, "받뎀증", 22.5, "발렌타인 초콜릿 대방출~2", 1, 2);
            break;
          default:
            nbf(boss, "받뎀증", 30, "발렌타인 초콜릿 대방출~2", 1, 2);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {
        for (let _0x6ba7a2 of comp) {
          if (_0x6ba7a2.id != _0x23a024.id) {
            tbf(_0x6ba7a2, "공고증", myCurAtk + _0x23a024.id + 20, "달콤한 맛", 1);
          }
        }
      };
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
        for (let _0x38c793 of comp) {
          _0x38c793.heal();
        }
      };
      _0x23a024.leader = function () {
        hpUpAll(20);
        tbf(all, "공퍼증", 50, "연애하는 소녀의 기분이란", always);
        if (getElementCnt("화") >= 3) {
          atbf(all, "궁", boss, "받궁뎀", 15, "<모두 함께 초콜릿을 만들어보자>1", 2, always);
          for (let _0x5db5c1 of getElementIdx("화")) {
            atbf(all, "궁", comp[_0x5db5c1], "받속뎀", 15, "<모두 함께 초콜릿을 만들어보자>2", 2, always);
          }
        }
        tbf(comp[2], "공퍼증", 70, "<가장 사랑하는 그대에게>1", always);
        anbf(comp[2], "궁", comp[2], "가뎀증", 20, "<가장 사랑하는 그대에게>2", 1, 2, always);
      };
      _0x23a024.passive = function () {
        for (let _0xbc453a of getRoleIdx("힐", "섶")) {
          tbf(comp[_0xbc453a], "공퍼증", 40, "<격정의 밤>", always);
        }
        tbf(_0x23a024, "공퍼증", 10, "공격 데미지+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10109:
      setMnc(_0x23a024, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            for (let _0x10e395 of getElementIdx("광")) {
              tbf(comp[_0x10e395], "공고증", myCurAtk + _0x23a024.id + 20, "설탕처럼 진한 달콤함1", 1);
            }
            tbf(comp[4], "공고증", myCurAtk + _0x23a024.id + 30, "설탕처럼 진한 달콤함2", 1);
            break;
          case 2:
            for (let _0x34f32b of getElementIdx("광")) {
              tbf(comp[_0x34f32b], "공고증", myCurAtk + _0x23a024.id + 20, "설탕처럼 진한 달콤함1", 1);
            }
            tbf(comp[4], "공고증", myCurAtk + _0x23a024.id + 35, "설탕처럼 진한 달콤함2", 1);
            break;
          case 3:
            for (let _0x261403 of getElementIdx("광")) {
              tbf(comp[_0x261403], "공고증", myCurAtk + _0x23a024.id + 20, "설탕처럼 진한 달콤함1", 1);
            }
            tbf(comp[4], "공고증", myCurAtk + _0x23a024.id + 40, "설탕처럼 진한 달콤함2", 1);
            break;
          case 4:
            for (let _0x2f8862 of getElementIdx("광")) {
              tbf(comp[_0x2f8862], "공고증", myCurAtk + _0x23a024.id + 30, "설탕처럼 진한 달콤함1", 1);
            }
            tbf(comp[4], "공고증", myCurAtk + _0x23a024.id + 40, "설탕처럼 진한 달콤함2", 1);
            break;
          default:
            for (let _0x4a755a of getElementIdx("광")) {
              tbf(comp[_0x4a755a], "공고증", myCurAtk + _0x23a024.id + 40, "설탕처럼 진한 달콤함1", 1);
            }
            tbf(comp[4], "공고증", myCurAtk + _0x23a024.id + 40, "설탕처럼 진한 달콤함2", 1);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {
        for (let _0xa706d0 of getElementIdx("광")) {
          tbf(comp[_0xa706d0], "공고증", myCurAtk + _0x23a024.id + 10, "네게만 줄게1", 1);
        }
        tbf(comp[4], "공고증", myCurAtk + _0x23a024.id + 20, "네게만 줄게2", 1);
        tbf(comp[4], "일뎀증", 35, "네게만 줄게3", 1);
      };
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(30);
        tbf(all, "공퍼증", 40, "달콤한 날", always);
        for (let _0x1242ef of getRoleIdx("힐", "섶")) {
          atbf(comp[_0x1242ef], "궁", comp[4], "가뎀증", 15, "<가장 사랑하는 그대에게>1", 1, always);
          atbf(comp[_0x1242ef], "궁", comp[4], "궁발동*", 50, "<가장 사랑하는 그대에게>2", 1, always);
        }
        for (let _0x1ebafc = 0; _0x1ebafc < 4; _0x1ebafc++) {
          anbf(comp[4], "궁", comp[_0x1ebafc], "공퍼증", 50, "<정이 담긴 초콜릿>", 1, 1, always);
        }
      };
      _0x23a024.passive = function () {
        nbf(comp[4], "일뎀증", 50, "달콤한 선물", 1, 1);
        atbf(_0x23a024, "궁", comp[4], "궁뎀증", 30, "연애, 마왕, 초콜릿1", 1, always);
        for (let _0x21dc88 of getRoleIdx("딜")) {
          atbf(_0x23a024, "궁", comp[_0x21dc88], "궁뎀증", 20, "연애, 마왕, 초콜릿2", 1, always);
        }
        tbf(_0x23a024, "공퍼증", 10, "공격+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 4 == 0) {
          tbf(comp[4], "궁뎀증", 40, "정성 가득 초콜릿", 1);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10110:
      _0x23a024.stack = 0;
      setMnc(_0x23a024, [215, 4, 238, 4, 261, 4, 284, 4, 307, 4], _0x17c963);
      buff_ex.push("<치명적인 향기>", "<달콤한 살기>", "<마조 엑스터시>");
      _0x23a024.ultbefore = function () {
        nbf(_0x23a024, "<치명적인 향기>", 0, "달콤한 죽음을", 1, 9);
        switch (_0x17c963) {
          case 1:
            nbf(boss, "받뎀증", 10, "메이드 비기 - 모조리 사형(?)1", 1, 2);
            tbf(_0x23a024, "평추가*", 30, "메이드 비기 - 모조리 사형(?)2", 4);
            break;
          case 2:
            nbf(boss, "받뎀증", 10, "메이드 비기 - 모조리 사형(?)1", 1, 2);
            tbf(_0x23a024, "평추가*", 50, "메이드 비기 - 모조리 사형(?)2", 4);
            break;
          case 3:
            nbf(boss, "받뎀증", 12.5, "메이드 비기 - 모조리 사형(?)1", 1, 2);
            tbf(_0x23a024, "평추가*", 70, "메이드 비기 - 모조리 사형(?)2", 4);
            break;
          case 4:
            nbf(boss, "받뎀증", 12.5, "메이드 비기 - 모조리 사형(?)1", 1, 2);
            tbf(_0x23a024, "평추가*", 90, "메이드 비기 - 모조리 사형(?)2", 4);
            break;
          default:
            nbf(boss, "받뎀증", 15, "메이드 비기 - 모조리 사형(?)1", 1, 2);
            tbf(_0x23a024, "평추가*", 110, "메이드 비기 - 모조리 사형(?)2", 4);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        const _0x1a2dc9 = _0x23a024.getNest("<치명적인 향기>");
        if (_0x1a2dc9 == 8) {
          setBuffOn(_0x23a024, "발동", "달콤한 죽음을2", true);
        } else if (_0x1a2dc9 == 2) {
          setBuffOn(_0x23a024, "발동", "한번 죽어보도록~1", true);
        }
        atkLogic(_0x23a024);
        if (_0x1a2dc9 == 2) {
          setBuffOn(_0x23a024, "기본", "달콤한 죽음을1", true);
          setBuffOn(_0x23a024, "기본", "한번 죽어보도록~1", true);
        } else if (_0x1a2dc9 == 5) {
          setBuffOn(_0x23a024, "발동", "한번 죽어보도록~2", true);
        } else if (_0x1a2dc9 == 8) {
          setBuffOn(_0x23a024, "기본", "달콤한 죽음을2", true);
          setBuffOn(_0x23a024, "발동", "한번 죽어보도록~3", true);
        }
      };
      _0x23a024.leader = function () {
        hpUpAll(20);
        tbf(all, "공퍼증", 50, "피로 얼룩진 사랑1", always);
        tbf(all, "일뎀증", 30, "피로 얼룩진 사랑2", always);
        for (let _0x501585 of getRoleIdx("딜", "디")) {
          anbf(comp[_0x501585], "공격", all, "<달콤한 살기>", 0, "피로 얼룩진 사랑", 1, 30, always);
        }
        const _0x4abff6 = getRoleIdx("딜", "디");
        for (let _0x55108b of _0x4abff6) {
          buff(comp[_0x55108b], "공격", comp[_0x55108b], "on", "기본", "피로 얼룩진 사랑4", 1, always, "발동", false);
          buff(comp[_0x55108b], "공격", comp[_0x55108b], "on", "기본", "피로 얼룩진 사랑5", 1, always, "발동", false);
          buff(comp[_0x55108b], "평추가*", 50, "피로 얼룩진 사랑3", always, false);
          buff(comp[_0x55108b], "공퍼증", 50, "피로 얼룩진 사랑4", always, false);
          buff(comp[_0x55108b], "가뎀증", 25, "피로 얼룩진 사랑5", always, false);
          const _0x1f7054 = comp[_0x55108b].attack;
          comp[_0x55108b].attack = function (..._0x35fa41) {
            if (_0x23a024.stack == 19) {
              setBuffOn(comp[_0x55108b], "발동", "피로 얼룩진 사랑4", true);
            } else if (_0x23a024.stack == 29) {
              setBuffOn(comp[_0x55108b], "발동", "피로 얼룩진 사랑5", true);
            }
            _0x1f7054.apply(this, _0x35fa41);
            if (_0x23a024.stack == 19) {
              setBuffOn(comp[_0x55108b], "발동", "피로 얼룩진 사랑4", false);
            } else if (_0x23a024.stack == 29) {
              setBuffOn(comp[_0x55108b], "발동", "피로 얼룩진 사랑5", false);
            }
            _0x23a024.stack++;
            if (_0x23a024.stack > 30) {
              _0x23a024.stack = 30;
            }
            for (let _0x5aacf2 of _0x4abff6) {
              if (_0x23a024.stack == 10) {
                setBuffOn(comp[_0x5aacf2], "기본", "피로 얼룩진 사랑3", true);
              } else if (_0x23a024.stack == 20) {
                setBuffOn(comp[_0x5aacf2], "기본", "피로 얼룩진 사랑4", true);
              } else if (_0x23a024.stack == 30) {
                setBuffOn(comp[_0x5aacf2], "기본", "피로 얼룩진 사랑5", true);
              }
            }
          };
          const _0x4e4803 = comp[_0x55108b].ultimate;
          comp[_0x55108b].ultimate = function (..._0x4258d8) {
            if (_0x23a024.stack == 19) {
              setBuffOn(comp[_0x55108b], "발동", "피로 얼룩진 사랑4", true);
            } else if (_0x23a024.stack == 29) {
              setBuffOn(comp[_0x55108b], "발동", "피로 얼룩진 사랑5", true);
            }
            _0x4e4803.apply(this, _0x4258d8);
            if (_0x23a024.stack == 19) {
              setBuffOn(comp[_0x55108b], "발동", "피로 얼룩진 사랑4", false);
            } else if (_0x23a024.stack == 29) {
              setBuffOn(comp[_0x55108b], "발동", "피로 얼룩진 사랑5", false);
            }
            _0x23a024.stack++;
            if (_0x23a024.stack > 30) {
              _0x23a024.stack = 30;
            }
            for (let _0x1fa77c of _0x4abff6) {
              if (_0x23a024.stack == 10) {
                setBuffOn(comp[_0x1fa77c], "기본", "피로 얼룩진 사랑3", true);
              } else if (_0x23a024.stack == 20) {
                setBuffOn(comp[_0x1fa77c], "기본", "피로 얼룩진 사랑4", true);
              } else if (_0x23a024.stack == 30) {
                setBuffOn(comp[_0x1fa77c], "기본", "피로 얼룩진 사랑5", true);
              }
            }
          };
        }
      };
      _0x23a024.passive = function () {
        anbf(_0x23a024, "평", _0x23a024, "<치명적인 향기>", 0, "달콤한 죽음을", 1, 9, always);
        buff(_0x23a024, "평", _0x23a024, "on", "기본", "달콤한 죽음을2", 1, always, "발동", false);
        buff(_0x23a024, "평", _0x23a024, "on", "기본", "한번 죽어보도록~1", 1, always, "발동", false);
        buff(_0x23a024, "평추가*", 40, "달콤한 죽음을1", always, false);
        buff(_0x23a024, "공퍼증", 50, "달콤한 죽음을2", always, false);
        anbf(_0x23a024, "피격", _0x23a024, "<마조 엑스터시>", 0, "부족해 부족해 부족하다고!", 1, 10, always);
        buff(_0x23a024, "공퍼증", 20, "부족해 부족해 부족하다고!1", always, false);
        buff(_0x23a024, "공퍼증", 40, "부족해 부족해 부족하다고!2", always, false);
        buff(_0x23a024, "가뎀증", 20, "한번 죽어보도록~1", always, false);
        buff(_0x23a024, "평", _0x23a024, "일뎀증", 10, "한번 죽어보도록~2", 1, 3, always, "발동", false);
        buff(_0x23a024, "공격", boss, "받뎀증", 15, "한번 죽어보도록~3", 1, 1, always, "발동", false);
        tbf(_0x23a024, "공퍼증", 10, "공격 데미지+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        const _0x15c160 = _0x23a024.getNest("<마조 엑스터시>");
        setBuffOn(_0x23a024, "기본", "부족해 부족해 부족하다고!1", _0x15c160 >= 5);
        setBuffOn(_0x23a024, "기본", "부족해 부족해 부족하다고!2", _0x15c160 >= 10);
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
        nbf(_0x23a024, "<마조 엑스터시>", 0, "부족해 부족해 부족하다고!", 1, 10);
      };
      return _0x23a024;
    case 10111:
      setMnc(_0x23a024, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(all, "공고증", myCurAtk + _0x23a024.id + 20, "시저 님의 냄새1", 1);
            break;
          case 2:
            tbf(all, "공고증", myCurAtk + _0x23a024.id + 20, "시저 님의 냄새1", 1);
            break;
          case 3:
            tbf(all, "공고증", myCurAtk + _0x23a024.id + 25, "시저 님의 냄새1", 1);
            tbf(all, "공퍼증", 10, "시저 님의 냄새2", 4);
            break;
          case 4:
            tbf(all, "공고증", myCurAtk + _0x23a024.id + 25, "시저 님의 냄새1", 1);
            tbf(all, "공퍼증", 20, "시저 님의 냄새2", 4);
            break;
          default:
            tbf(all, "공고증", myCurAtk + _0x23a024.id + 30, "시저 님의 냄새1", 1);
            tbf(all, "공퍼증", 20, "시저 님의 냄새2", 4);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
        for (let _0x39c3c8 of comp) {
          _0x39c3c8.heal();
        }
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
        for (let _0x111ff1 of comp) {
          _0x111ff1.heal();
        }
      };
      _0x23a024.leader = function () {
        tbf(all, "공퍼증", 40, "수치성 열치료실", always);
        const _0x36a80f = comp.filter(_0x36be0a => _0x36be0a.role == 0);
        if (_0x36a80f.length != 0) {
          let _0x47159a = _0x36a80f.reduce((_0x1a1c14, _0x3a8645) => {
            if (_0x3a8645.atk > _0x1a1c14.atk) {
              return _0x3a8645;
            } else {
              return _0x1a1c14;
            }
          }, _0x36a80f[0]);
          tbf(_0x47159a, "공퍼증", 60, "<성욕 팽창>1", always);
          tbf(_0x47159a, "가뎀증", 35, "<성욕 팽창>2", always);
          tbf(_0x47159a, "궁뎀증", 40, "<성욕 팽창>3", always);
          tbf(_0x47159a, "궁발동*", 275, "<성욕 팽창>4", always);
        }
        let _0x28401b = comp.reduce((_0x23a9a5, _0xe7bb04) => {
          if (_0xe7bb04.atk < _0x23a9a5.atk) {
            return _0xe7bb04;
          } else {
            return _0x23a9a5;
          }
        }, comp[0]);
        tbf(_0x28401b, "받아증", 30, "<자극적인 배덕감>", 50);
      };
      _0x23a024.passive = function () {
        tbf(all, "받아증", 30, "약 복용과 섹스는 적당하게1", always);
        atbf(_0x23a024, "방", all, "아머", myCurAtk + _0x23a024.id + 25, "약 복용과 섹스는 적당하게2", 1, always);
        hpUpMe(_0x23a024, 10);
        tbf(_0x23a024, "공퍼증", 10, "말 안들으면 벌 줄거에요1", always);
        anbf(_0x23a024, "궁", boss, "받궁뎀", 20, "말 안들으면 벌 줄거에요2", 1, 2, always);
        tbf(_0x23a024, "공퍼증", 10, "공격+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10113:
      setMnc(_0x23a024, [445, 4, 514, 4, 583, 4, 652, 4, 721, 4], _0x17c963);
      _0x23a024.ultbefore = function () {};
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        if (getRoleCnt("섶") >= 1) {
          tbf(_0x23a024, "궁뎀증", 35, "내 전문적인 의료행위에 딴지 걸지 마!1", always);
        }
        if (getRoleCnt("섶") >= 2) {
          tbf(_0x23a024, "궁뎀증", 35, "내 전문적인 의료행위에 딴지 걸지 마!2", always);
        }
        if (getRoleCnt("힐") >= 1) {
          tbf(_0x23a024, "궁뎀증", 35, "내 전문적인 의료행위에 딴지 걸지 마!3", always);
        }
        if (getRoleCnt("힐") >= 2) {
          tbf(_0x23a024, "궁뎀증", 35, "내 전문적인 의료행위에 딴지 걸지 마!4", always);
        }
        if (getElementCnt("암") >= 3) {
          hpUpAll(20);
          tbf(all, "공퍼증", 50, "<암흑요법>1", always);
          anbf(all, "궁", boss, "받뎀증", 8, "<암흑요법>2", 1, 5, always);
          for (let _0x107a6d of getElementIdx("암")) {
            anbf(all, "궁", comp[_0x107a6d], "받속뎀", 8, "<암흑요법>3", 1, 5, always);
          }
        }
      };
      _0x23a024.passive = function () {
        if (getRoleCnt("딜") >= 1) {
          tbf(_0x23a024, "궁추가*", 100, "일침견혈(?)1", always);
        }
        if (getRoleCnt("딜") >= 2) {
          tbf(_0x23a024, "궁추가*", 100, "일침견혈(?)2", always);
        }
        if (getElementCnt("암") >= 2) {
          tbf(_0x23a024, "공퍼증", 50, "혼돈 요법1", always);
        }
        if (getElementCnt("암") >= 3) {
          tbf(_0x23a024, "공퍼증", 50, "혼돈 요법2", always);
        }
        if (getRoleCnt("섶") >= 1) {
          tbf(_0x23a024, "가뎀증", 15, "투여량 대폭 증가1", always);
        }
        if (getRoleCnt("섶") >= 2) {
          tbf(_0x23a024, "가뎀증", 15, "투여량 대폭 증가2", always);
        }
        if (getRoleCnt("힐") >= 1) {
          tbf(_0x23a024, "가뎀증", 15, "투여량 대폭 증가1", always);
        }
        if (getRoleCnt("힐") >= 2) {
          tbf(_0x23a024, "가뎀증", 15, "투여량 대폭 증가2", always);
        }
        tbf(_0x23a024, "공퍼증", 10, "공격+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10114:
      setMnc(_0x23a024, [388, 4, 445, 4, 503, 4, 560, 4, 618, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(comp[4], "궁뎀증", 30, "전력 해방! 별빛 분쇄 스매쉬!", 2);
            break;
          case 2:
            tbf(comp[4], "궁뎀증", 40, "전력 해방! 별빛 분쇄 스매쉬!", 2);
            break;
          case 3:
            tbf(comp[4], "궁뎀증", 50, "전력 해방! 별빛 분쇄 스매쉬!", 2);
            break;
          case 4:
            tbf(comp[4], "궁뎀증", 60, "전력 해방! 별빛 분쇄 스매쉬!", 2);
            break;
          default:
            tbf(comp[4], "궁뎀증", 70, "전력 해방! 별빛 분쇄 스매쉬!", 2);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(30);
        if (getElementCnt("암") >= 3) {
          tbf(all, "공퍼증", 40, "<원초의 마법소녀>1", always);
          anbf(all, "행동", boss, "받뎀증", 2.5, "<원초의 마법소녀>2", 1, 12, always);
          anbf(all, "행동", boss, "받발뎀", 5, "<원초의 마법소녀>3", 1, 12, always);
        }
        if (getElementCnt("광") >= 2) {
          tbf(all, "가뎀증", 20, "<성월의 축복>1", always);
          for (let _0x4b10e4 of getElementIdx("암", "광")) {
            anbf(all, "궁", comp[_0x4b10e4], "받속뎀", 17.5, "<성월의 축복>2", 1, 2, always);
          }
        }
        tbf(comp[0], "공퍼증", 80, "<힘 증폭>1", always);
        tbf(comp[0], "일뎀증", 60, "<힘 증폭>2", always);
        tbf(comp[0], "궁뎀증", 40, "<힘 증폭>3", always);
        tbf(comp[0], "궁발동*", 150, "<힘 증폭>4", always);
      };
      _0x23a024.passive = function () {
        tbf(_0x23a024, "공퍼증", 40, "다가오지 마!1", always);
        tbf(_0x23a024, "궁뎀증", 20, "다가오지 마!2", always);
        tbf(comp[4], "궁뎀증", 40, "<다시 찾은 광명>1", always);
        tbf(comp[4], "가뎀증", 40, "<다시 찾은 광명>2", always);
        tbf(_0x23a024, "발뎀증", 100, "마법소녀의 힘의 근원1", always);
        tbf(_0x23a024, "궁발동*", 180, "마법소녀의 힘의 근원2", always);
        tbf(_0x23a024, "공퍼증", 10, "공격+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10115:
      setMnc(_0x23a024, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(all, "아머", _0x23a024.hp * 20 * armorUp(_0x23a024, "궁", "추가"), "자동 가열 진동 모드?1", 1);
            break;
          case 2:
            tbf(all, "아머", _0x23a024.hp * 24 * armorUp(_0x23a024, "궁", "추가"), "자동 가열 진동 모드?1", 1);
            break;
          case 3:
            tbf(all, "아머", _0x23a024.hp * 28 * armorUp(_0x23a024, "궁", "추가"), "자동 가열 진동 모드?1", 1);
            tbf(boss, "받뎀증", 10, "자동 가열 진동 모드?2", 4);
            break;
          case 4:
            tbf(all, "아머", _0x23a024.hp * 32 * armorUp(_0x23a024, "궁", "추가"), "자동 가열 진동 모드?1", 1);
            tbf(boss, "받뎀증", 15, "자동 가열 진동 모드?2", 4);
            break;
          default:
            tbf(all, "아머", _0x23a024.hp * 36 * armorUp(_0x23a024, "궁", "추가"), "자동 가열 진동 모드?1", 1);
            tbf(boss, "받뎀증", 20, "자동 가열 진동 모드?2", 4);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
        if (_0x23a024.isLeader) {
          for (let _0x3fab9e of comp) {
            if (_0x3fab9e.id != _0x23a024.id) {
              setBuffOn(_0x3fab9e, "발동", "<마력 응집>1", true);
              setBuffOn(_0x3fab9e, "발동", "<마력 응집>2", true);
              setBuffOn(_0x3fab9e, "발동", "<마력 응집>3", true);
            }
          }
        }
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
        for (let _0x350407 of comp) {
          _0x350407.heal();
        }
        if (_0x23a024.isLeader) {
          for (let _0x3e0117 of comp) {
            if (_0x3e0117.id != _0x23a024.id) {
              setBuffOn(_0x3e0117, "발동", "<마력 응집>1", true);
              setBuffOn(_0x3e0117, "발동", "<마력 응집>2", true);
              setBuffOn(_0x3e0117, "발동", "<마력 응집>3", true);
            }
          }
        }
      };
      _0x23a024.leader = function () {
        for (let _0x2107b4 of getElementIdx("풍")) {
          nbf(comp[_0x2107b4], "받속뎀", 35, "별이 반짝 천재 마법소녀1", 1, 1);
        }
        tbf(_0x23a024, "가뎀증", 50, "별이 반짝 천재 마법소녀2", always);
        for (let _0x27dc6b of comp) {
          if (_0x27dc6b.id != _0x23a024.id) {
            atbf(_0x23a024, "공격", _0x27dc6b, "가뎀증", 20, "<정의의 이름으로 널 심판하겠다>1", 1, always);
            buff(_0x27dc6b, "공격", comp[0], "공퍼증", 50, "<마력 응집>1", 2, always, "발동", false);
            buff(_0x27dc6b, "공격", comp[0], "평추가*", 75, "<마력 응집>2", 2, always, "발동", false);
            buff(_0x27dc6b, "공격", comp[0], "궁추가*", 125, "<마력 응집>3", 2, always, "발동", false);
          }
        }
      };
      _0x23a024.passive = function () {
        atbf(_0x23a024, "공격", all, "공고증", myCurAtk + _0x23a024.id + 20, "분홍빛 최음 광선", 1, always);
        tbf(all, "받아증", 20, "노출광 모드", always);
        atbf(_0x23a024, "힐", all, "공퍼증", 20, "도피는 유용하지만 도피할 수 없어1", 1, always);
        tbf(all, "가뎀증", 15, "도피는 유용하지만 도피할 수 없어2", always);
        tbf(_0x23a024, "공퍼증", 10, "공격력+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {
          for (let _0x374fa3 of comp) {
            if (_0x374fa3.id != _0x23a024.id) {
              setBuffOn(_0x374fa3, "발동", "<마력 응집>1", false);
              setBuffOn(_0x374fa3, "발동", "<마력 응집>2", false);
              setBuffOn(_0x374fa3, "발동", "<마력 응집>3", false);
            }
          }
        }
      };
      return _0x23a024;
    case 10116:
      setMnc(_0x23a024, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(_0x23a024, "공퍼증", 50, "포효하라 칼리버!", 2);
            break;
          case 2:
            tbf(_0x23a024, "공퍼증", 60, "포효하라 칼리버!", 2);
            break;
          case 3:
            tbf(_0x23a024, "공퍼증", 70, "포효하라 칼리버!", 3);
            break;
          case 4:
            tbf(_0x23a024, "공퍼증", 80, "포효하라 칼리버!", 4);
            break;
          default:
            tbf(_0x23a024, "공퍼증", 100, "포효하라 칼리버!", 4);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(25);
        tbf(all, "일뎀증", 50, "여름 용자의 바캉스 타임1", always);
        if (getRoleCnt("딜") >= 3) {
          tbf(comp[0], "공퍼증", 40, "<나는 먹는다. 고로 존재한다>1", always);
          tbf(comp[0], "평추가*", 50, "<나는 먹는다. 고로 존재한다>2", always);
          for (let _0xd4b11a of getElementIdx("화")) {
            anbf(comp[0], "궁", comp[_0xd4b11a], "받속뎀", 20, "<나는 먹는다. 고로 존재한다>3", 1, 2, always);
          }
          anbf(_0x23a024, "궁", boss, "받일뎀", 40, "<나는 먹는다. 고로 존재한다>4", 1, 2, always);
        }
        if (getElementCnt("화") >= 3) {
          tbf(all, "공퍼증", 40, "<라이딩 모드 ON>1", always);
          for (let _0xd62baf of comp) {
            anbf(_0xd62baf, "행동", _0xd62baf, "가뎀증", 7, "<라이딩 모드 ON>2", 1, 5, always);
          }
          for (let _0x500f04 of comp) {
            anbf(_0x500f04, "행동", _0x500f04, "일뎀증", 15, "<라이딩 모드 ON>3", 1, 5, always);
          }
        }
      };
      _0x23a024.passive = function () {
        tbf(_0x23a024, "일뎀증", 30, "디저트 금단 현상1", always);
        tbf(_0x23a024, "궁뎀증", 20, "디저트 금단 현상2", always);
        tbf(boss, "받뎀증", 15, "우리 엄마가 하와이에서 가르쳐주셨어1", 50);
        tbf(_0x23a024, "평추가*", 25, "셀프 BGM의 용자1", always);
        anbf(_0x23a024, "평", _0x23a024, "가뎀증", 10, "셀프 BGM의 용자2", 1, 3, always);
        tbf(_0x23a024, "궁뎀증", 10, "궁극기+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        if (GLOBAL_TURN == 8) {
          tbf(_0x23a024, "궁뎀증", 40, "우리 엄마가 하와이에서 가르쳐주셨어2", 50);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10117:
      setMnc(_0x23a024, [100, 4, 100, 4, 100, 4, 100, 4, 100, 4], _0x17c963);
      _0x23a024.ultbefore = function () {};
      _0x23a024.ultafter = function () {
        switch (_0x17c963) {
          case 1:
            tbf(_0x23a024, "평추가*", 96, "돌진! 시저 호!", 4);
            break;
          case 2:
            tbf(_0x23a024, "평추가*", 115, "돌진! 시저 호!", 4);
            break;
          case 3:
            tbf(_0x23a024, "평추가*", 135, "돌진! 시저 호!", 4);
            break;
          case 4:
            tbf(_0x23a024, "평추가*", 154, "돌진! 시저 호!", 4);
            break;
          default:
            tbf(_0x23a024, "평추가*", 173, "돌진! 시저 호!", 4);
            break;
        }
      };
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpMe(_0x23a024, 20);
        for (let _0x1b4e58 of getElementIdx("화", "광")) {
          hpUpMe(comp[_0x1b4e58], 20);
        }
        tbf(_0x23a024, "가뎀증", 20, "여름 상품 전면 세일 중~1", always);
        for (let _0x329602 of getElementIdx("화", "광")) {
          tbf(comp[_0x329602], "가뎀증", 20, "여름 상품 전면 세일 중~1", always);
        }
        tbf(_0x23a024, "공퍼증", 50, "여름 상품 전면 세일 중~2", always);
        tbf(_0x23a024, "일뎀증", 20, "여름 상품 전면 세일 중~3", always);
        for (let _0x3e4b80 of getElementIdx("화", "광")) {
          tbf(comp[_0x3e4b80], "공퍼증", 80, "여름 상품 전면 세일 중~4", always);
        }
        for (let _0x530832 of getElementIdx("화", "광")) {
          tbf(comp[_0x530832], "일뎀증", 50, "여름 상품 전면 세일 중~5", always);
        }
        if (getElementCnt("화") >= 2) {
          for (let _0x208e86 of getRoleIdx("딜", "디")) {
            tbf(comp[_0x208e86], "평추가*", 40, "<바알상회 특제 BBQ 그릴>1", always);
            pnbf(comp[_0x208e86], "평", boss, "받일뎀", 18, "<바알상회 특제 BBQ 그릴>2", 1, 5, always);
          }
        }
        if (getElementCnt("광") >= 2) {
          for (let _0x5d2c31 of getRoleIdx("딜", "디")) {
            tbf(comp[_0x5d2c31], "평추가*", 40, "<바알상회 특제 BBQ 그릴>3", always);
            pnbf(comp[_0x5d2c31], "평", boss, "받일뎀", 18, "<바알상회 특제 BBQ 그릴>4", 1, 5, always);
          }
        }
      };
      _0x23a024.passive = function () {
        for (let _0x441ea2 of getElementIdx("수")) {
          tbf(comp[_0x441ea2], "공퍼증", 30, "수영복 모카 피부 마왕1", always);
        }
        for (let _0x244cb9 of getElementIdx("수")) {
          tbf(comp[_0x244cb9], "일뎀증", 20, "수영복 모카 피부 마왕2", always);
        }
        for (let _0x3a0371 of getRoleIdx("딜", "디")) {
          let _0x16c8d3 = getElementCnt("수");
          if (_0x16c8d3 == 4) {
            tbf(comp[_0x3a0371], "평추가*", 15, "<바알상회 특제 물총>1", always);
          } else if (_0x16c8d3 == 5) {
            tbf(comp[_0x3a0371], "평추가*", 30, "<바알상회 특제 물총>1", always);
          }
          if (_0x16c8d3 == 4) {
            pnbf(comp[_0x3a0371], "평", boss, "받일뎀", 9, "<바알상회 특제 물총>2", 1, 5, always);
          } else if (_0x16c8d3 == 5) {
            pnbf(comp[_0x3a0371], "평", boss, "받일뎀", 18, "<바알상회 특제 물총>2", 1, 5, always);
          }
        }
        if (getRoleCnt("딜") >= 2) {
          tbf(all, "가뎀증", 30, "<해변의 집 프리미엄 상품>1", always);
          tbf(all, "일뎀증", 30, "<해변의 집 프리미엄 상품>2", always);
        }
        tbf(_0x23a024, "일뎀증", 10, "일반 공격+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10118:
      setMnc(_0x23a024, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            for (let _0x1703af of getElementIdx("광")) {
              tbf(comp[_0x1703af], "받속뎀", 10, "지상신국이 도래한다~", 1);
            }
            break;
          case 2:
            for (let _0x33f5f9 of getElementIdx("광")) {
              tbf(comp[_0x33f5f9], "받속뎀", 10, "지상신국이 도래한다~", 1);
            }
            break;
          case 3:
            for (let _0x190537 of getElementIdx("광")) {
              tbf(comp[_0x190537], "받속뎀", 15, "지상신국이 도래한다~", 1);
            }
            break;
          case 4:
            for (let _0x8fbf22 of getElementIdx("광")) {
              tbf(comp[_0x8fbf22], "받속뎀", 20, "지상신국이 도래한다~", 1);
            }
            break;
          default:
            for (let _0x48fe85 of getElementIdx("광")) {
              tbf(comp[_0x48fe85], "받속뎀", 25, "지상신국이 도래한다~", 1);
            }
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
        for (let _0x176f0b of comp) {
          _0x176f0b.heal();
        }
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
        for (let _0x491797 of comp) {
          _0x491797.heal();
        }
      };
      _0x23a024.leader = function () {
        hpUpAll(20);
        if (getElementCnt("광") >= 4) {
          tbf(all, "공퍼증", 100, "섹스의 복음 전파자1", always);
        }
        for (let _0x43ab3e of getElementIdx("광")) {
          tbf(comp[_0x43ab3e], "궁뎀증", 50, "섹스의 복음 전파자2", always);
        }
        atbf(_0x23a024, "힐", all, "가뎀증", 15, "섹스의 복음 전파자4", 1, always);
      };
      _0x23a024.passive = function () {
        anbf(_0x23a024, "궁", all, "공퍼증", 40, "절정으로 사랑이 널리 퍼지기를1", 1, 1, always);
        atbf(_0x23a024, "힐", all, "공퍼증", 10, "절정으로 사랑이 널리 퍼지기를2", 1, always);
        anbf(_0x23a024, "궁", all, "궁뎀증", 30, "함께 절정을 느껴봐요~1", 1, 1, always);
        atbf(_0x23a024, "힐", all, "궁뎀증", 10, "함께 절정을 느껴봐요~2", 1, always);
        anbf(_0x23a024, "궁", all, "가뎀증", 20, "섹스의 진리1", 1, 1, always);
        atbf(_0x23a024, "힐", all, "가뎀증", 5, "섹스의 진리2", 1, always);
        tbf(_0x23a024, "일뎀증", 10, "일반 공격 데미지+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {
          if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 4 == 0) {
            tbf(boss, "받뎀증", 50, "섹스의 복음 전파자3", 1);
          }
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10119:
      setMnc(_0x23a024, [0, 3, 0, 3, 0, 3, 0, 3, 0, 3], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(all, "발효증", 50, "아이카의 여름 칵테일1", 3);
            tbf(all, "가뎀증", 10, "아이카의 여름 칵테일2", 3);
            tbf(all, "공퍼증", 20, "아이카의 여름 칵테일3", 3);
            break;
          case 2:
            tbf(all, "발효증", 75, "아이카의 여름 칵테일1", 3);
            tbf(all, "가뎀증", 10, "아이카의 여름 칵테일2", 3);
            tbf(all, "공퍼증", 35, "아이카의 여름 칵테일3", 3);
            break;
          case 3:
            tbf(all, "발효증", 75, "아이카의 여름 칵테일1", 3);
            tbf(all, "가뎀증", 20, "아이카의 여름 칵테일2", 3);
            tbf(all, "공퍼증", 35, "아이카의 여름 칵테일3", 3);
            break;
          case 4:
            tbf(all, "발효증", 100, "아이카의 여름 칵테일1", 3);
            tbf(all, "가뎀증", 20, "아이카의 여름 칵테일2", 3);
            tbf(all, "공퍼증", 50, "아이카의 여름 칵테일3", 3);
            break;
          default:
            tbf(all, "발효증", 100, "아이카의 여름 칵테일1", 3);
            tbf(all, "가뎀증", 30, "아이카의 여름 칵테일2", 3);
            tbf(all, "공퍼증", 50, "아이카의 여름 칵테일3", 3);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        tbf(all, "공퍼증", 50, "시저 님은 신이야", always);
        tbf(_0x23a024, "가뎀증", 50, "전속 종업원1", always);
        tbf(_0x23a024, "평발동*", 100, "전속 종업원2", always);
        tbf(_0x23a024, "궁발동*", 250, "전속 종업원3", always);
        if (getRoleCnt("탱") >= 2) {
          for (let _0x47cac6 of getRoleIdx("탱")) {
            tbf(comp[_0x47cac6], "가뎀증", 50, "시저 님은 영원히 옳다1", always);
            tbf(comp[_0x47cac6], "평발동*", 100, "시저 님은 영원히 옳다2", always);
            tbf(comp[_0x47cac6], "평발동+", comp[_0x47cac6].hp * 50, "시저 님은 영원히 옳다2", always);
            tbf(comp[_0x47cac6], "궁발동*", 250, "시저 님은 영원히 옳다3", always);
            tbf(comp[_0x47cac6], "궁발동+", comp[_0x47cac6].hp * 125, "시저 님은 영원히 옳다3", always);
          }
        }
      };
      _0x23a024.passive = function () {
        atbf(_0x23a024, "궁", all, "힐", 150, "메이드... 종업원 섹스 테크닉!1", 1, always);
        tbf(_0x23a024, "궁발동*", 250, "메이드... 종업원 섹스 테크닉!2", always);
        tbf(_0x23a024, "공퍼증", 50, "아름다운 맛~", always);
        tbf(_0x23a024, "발효증", 75, "꾸잉 꾸잉 뀨~1", always);
        atbf(_0x23a024, "궁", all, "아머", _0x23a024.hp * 15, "꾸잉 꾸잉 뀨~2", 1, always);
        tbf(_0x23a024, "공퍼증", 10, "공격+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10120:
      setMnc(_0x23a024, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(_0x23a024, "발효증", 40, "심해의 파인애플!1", 3);
            break;
          case 2:
            tbf(_0x23a024, "발효증", 60, "심해의 파인애플!1", 3);
            break;
          case 3:
            tbf(_0x23a024, "발효증", 60, "심해의 파인애플!1", 3);
            tbf(_0x23a024, "궁뎀증", 20, "심해의 파인애플!2", 1);
            break;
          case 4:
            tbf(_0x23a024, "발효증", 80, "심해의 파인애플!1", 3);
            tbf(_0x23a024, "궁뎀증", 37.5, "심해의 파인애플!2", 1);
            break;
          default:
            tbf(_0x23a024, "발효증", 100, "심해의 파인애플!1", 3);
            tbf(_0x23a024, "궁뎀증", 45, "심해의 파인애플!2", 1);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
        deleteBuff(_0x23a024, "기본", "<화약 장전>");
        deleteBuff(_0x23a024, "기본", "<네, 선장님!>");
        deleteBuff(_0x23a024, "기본", "<목소리가 작다!>");
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(20);
        tbf(all, "공퍼증", 50, "난쟁이 선장과 함께!1", always);
        if (getElementCnt("풍") >= 3) {
          for (let _0x2e3e86 of getRoleIdx("딜", "디")) {
            tbf(comp[_0x2e3e86], "공퍼증", 80, "<바람을 타고>1", always);
            tbf(comp[_0x2e3e86], "가뎀증", 40, "<바람을 타고>2", always);
            atbf(comp[_0x2e3e86], "공격", comp[0], "평발동*", 65, "<참파도랑>", 1, always);
          }
        }
        for (let _0x1a63bb of getElementIdx("풍")) {
          tbf(comp[_0x1a63bb], "받속뎀", 25, "난쟁이 선장과 함께!2", 50);
        }
      };
      _0x23a024.passive = function () {
        atbf(_0x23a024, "평", _0x23a024, "공퍼증", 50, "<화약 장전>", 3, always);
        atbf(_0x23a024, "평", _0x23a024, "궁발동*", 80, "<네, 선장님!>", 3, always);
        _0x23a024.cd -= 1;
        _0x23a024.curCd -= 1;
        atbf(_0x23a024, "평", _0x23a024, "가뎀증", 20, "<목소리가 작다!>", 3, always);
        tbf(_0x23a024, "가뎀증", 7.5, "데미지+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10121:
      setMnc(_0x23a024, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(_0x23a024, "일뎀증", 60, "회기ㆍ백화투영1", 4);
            tbf(boss, "받일뎀", 40, "회기ㆍ백화투영2", 8);
            break;
          case 2:
            tbf(_0x23a024, "일뎀증", 75, "회기ㆍ백화투영1", 4);
            tbf(boss, "받일뎀", 55, "회기ㆍ백화투영2", 8);
            break;
          case 3:
            tbf(_0x23a024, "일뎀증", 90, "회기ㆍ백화투영1", 4);
            tbf(boss, "받일뎀", 70, "회기ㆍ백화투영2", 8);
            break;
          case 4:
            tbf(_0x23a024, "일뎀증", 105, "회기ㆍ백화투영1", 4);
            tbf(boss, "받일뎀", 85, "회기ㆍ백화투영2", 8);
            break;
          default:
            tbf(_0x23a024, "일뎀증", 120, "회기ㆍ백화투영1", 4);
            tbf(boss, "받일뎀", 100, "회기ㆍ백화투영2", 8);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {
        tbf(all, "일뎀증", 50, "후방 보급이다냥", 2);
      };
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(25);
        if (getElementCnt("풍") >= 3) {
          tbf(all, "공퍼증", 40, "<갈매기 도적단>1", always);
          tbf(all, "일뎀증", 100, "<갈매기 도적단>2", always);
          tbf(all, "평추가*", 65, "<갈매기 도적단>3", always);
        }
        if (getRoleCnt("딜") >= 2) {
          anbf(_0x23a024, "평", boss, "받뎀증", 5, "<대해를 향하여!>1", 1, 10, always);
          for (let _0x59fb11 of getElementIdx("풍")) {
            atbf(_0x23a024, "궁", comp[_0x59fb11], "받속뎀", 15, "<대해를 향하여!>2", 2, always);
          }
        }
      };
      _0x23a024.passive = function () {
        ptbf(_0x23a024, "평", all, "아머", _0x23a024.hp * 10, "폭풍우 감행", 1, always);
        atbf(_0x23a024, "궁", _0x23a024, "평추가*", 120, "<폭풍우도 우릴 막을 수 없어>1", 2, always);
        for (let _0x5d9d54 of getElementIdx("풍")) {
          atbf(_0x23a024, "궁", comp[_0x5d9d54], "받속뎀", 15, "<폭풍우도 우릴 막을 수 없어>2", 2, always);
        }
        tbf(_0x23a024, "평추가*", 70, "프로젝터 캐논", always);
        tbf(all, "가뎀증", 10, "오랜 추억1", always);
        anbf(_0x23a024, "평", all, "공퍼증", 10, "오랜 추억2", 1, 4, always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        if (GLOBAL_TURN == 1) {
          cdChange(_0x23a024, -4);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10122:
      setMnc(_0x23a024, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x17c963);
      buff_ex.push("<시기의 화염>");
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(all, "가뎀증", 25, "히메는, 모두를 사랑해~1", 1);
            tbf(all, "가뎀증", 10, "히메는, 모두를 사랑해~2", 4);
            nbf(all, "공퍼증", 10, "히메는, 모두를 사랑해~3", 1, 3);
            break;
          case 2:
            tbf(all, "가뎀증", 30, "히메는, 모두를 사랑해~1", 1);
            tbf(all, "가뎀증", 10, "히메는, 모두를 사랑해~2", 4);
            nbf(all, "공퍼증", 15, "히메는, 모두를 사랑해~3", 1, 2);
            break;
          case 3:
            tbf(all, "가뎀증", 30, "히메는, 모두를 사랑해~1", 1);
            tbf(all, "가뎀증", 15, "히메는, 모두를 사랑해~2", 4);
            nbf(all, "공퍼증", 20, "히메는, 모두를 사랑해~3", 1, 2);
            break;
          case 4:
            tbf(all, "가뎀증", 35, "히메는, 모두를 사랑해~1", 1);
            tbf(all, "가뎀증", 15, "히메는, 모두를 사랑해~2", 4);
            nbf(all, "공퍼증", 25, "히메는, 모두를 사랑해~3", 1, 2);
            break;
          default:
            tbf(all, "가뎀증", 35, "히메는, 모두를 사랑해~1", 1);
            tbf(all, "가뎀증", 20, "히메는, 모두를 사랑해~2", 4);
            nbf(all, "공퍼증", 30, "히메는, 모두를 사랑해~3", 1, 2);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {
        tbf(all, "가뎀증", 25, "성광의 축복", 1);
      };
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(20);
        atbf(_0x23a024, "궁", boss, "받뎀증", 20, "가슴이 커야 사람들의 마음을 수용할 수 있는 법1", 9, always);
        if (getElementCnt("화") >= 1) {
          tbf(all, "공퍼증", 40, "가슴이 커야 사람들의 마음을 수용할 수 있는 법2", always);
        }
        if (getElementCnt("암") >= 1) {
          tbf(all, "공퍼증", 40, "가슴이 커야 사람들의 마음을 수용할 수 있는 법2", always);
        }
      };
      _0x23a024.passive = function () {
        anbf(_0x23a024, "궁", all, "궁뎀증", 20, "드라이브 엔젤 하트", 1, 2, always);
        tbf(_0x23a024, "궁발동*", 150, "이게 히메의 사랑이야", always);
        tbf(_0x23a024, "평발동*", 50, "불안해지면 먼저 가슴을 만져1", always);
        tbf(_0x23a024, "궁발동*", 100, "불안해지면 먼저 가슴을 만져2", always);
        tbf(_0x23a024, "궁발동*", 30, "궁극기 발동+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {
          if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 4 == 0) {
            anbf(_0x23a024, "궁", boss, "받궁뎀", 20, "<시기의 화염>", 1, 2, 4);
            atbf(_0x23a024, "궁", _0x23a024, "제거", "발동", "<시기의 화염>", 1, 4);
          }
        }
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 4 == 0) {
          atbf(all, "궁", all, "발효증", 30, "불안해지면 먼저 가슴을 만져3", 4, 4);
          for (let _0x90ce22 of comp) {
            atbf(_0x90ce22, "궁", _0x90ce22, "제거", "발동", "불안해지면 먼저 가슴을 만져3", 1, 4);
          }
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10123:
      setMnc(_0x23a024, [265, 3, 298, 3, 331, 3, 364, 3, 397, 3], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(all, "발효증", 60, "안닌궁주 보너스!1", 4);
            break;
          case 2:
            tbf(all, "발효증", 70, "안닌궁주 보너스!1", 4);
            break;
          case 3:
            tbf(all, "발효증", 80, "안닌궁주 보너스!1", 4);
            break;
          case 4:
            tbf(all, "발효증", 90, "안닌궁주 보너스!1", 4);
            break;
          default:
            tbf(all, "발효증", 100, "안닌궁주 보너스!1", 4);
            break;
        }
      };
      _0x23a024.ultafter = function () {
        switch (_0x17c963) {
          case 1:
            for (let _0x559497 of getRoleIdx("딜", "디")) {
              buff(comp[_0x559497], "공발동*", 33, "안닌궁주 보너스!2", 3, false);
            }
            break;
          case 2:
            for (let _0x6e5873 of getRoleIdx("딜", "디")) {
              buff(comp[_0x6e5873], "공발동*", 39, "안닌궁주 보너스!2", 3, false);
            }
            break;
          case 3:
            for (let _0x187867 of getRoleIdx("딜", "디")) {
              buff(comp[_0x187867], "공발동*", 46, "안닌궁주 보너스!2", 3, false);
            }
            break;
          case 4:
            for (let _0x577fdf of getRoleIdx("딜", "디")) {
              buff(comp[_0x577fdf], "공발동*", 52, "안닌궁주 보너스!2", 3, false);
            }
            break;
          default:
            for (let _0x36c2d4 of getRoleIdx("딜", "디")) {
              buff(comp[_0x36c2d4], "공발동*", 59, "안닌궁주 보너스!2", 3, false);
            }
            break;
        }
      };
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
        for (let _0x3a03aa of comp) {
          setBuffOnAll(_0x3a03aa, "기본", "안닌궁주 보너스!2", true);
        }
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(20);
        tbf(all, "공퍼증", 70, "다같이 먀먀먀", always);
        if (getRoleCnt("딜") >= 3) {
          tbf(all, "발효증", 150, "같이 먀먀먀먀먀1", always);
          tbf(all, "가뎀증", 30, "같이 먀먀먀먀먀2", always);
          atbf(all, "궁", boss, "받속뎀", 5, "같이 먀먀먀먀먀3", 2, always);
        }
        if (getRoleCnt("디") >= 2) {
          tbf(all, "발효증", 150, "같이 먀먀먀먀먀1", always);
          tbf(all, "가뎀증", 30, "같이 먀먀먀먀먀2", always);
          atbf(all, "궁", boss, "받속뎀", 5, "같이 먀먀먀먀먀3", 2, always);
        }
      };
      _0x23a024.passive = function () {
        anbf(_0x23a024, "궁", _0x23a024, "공퍼증", 40, "18x18=88", 1, 2, always);
        atbf(_0x23a024, "궁", boss, "받궁뎀", 20, "마음을 훔치는 소악마가 로그인했다고~", 4, always);
        atbf(_0x23a024, "궁", boss, "받뎀증", 20, "오늘은 야한 미루 꿈 꿔", 4, always);
        tbf(_0x23a024, "궁뎀증", 10, "궁극기+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10124:
      setMnc(_0x23a024, [265, 3, 298, 3, 331, 3, 364, 3, 397, 3], _0x17c963);
      buff_ex.push("<애교 시간>");
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            nbf(_0x23a024, "받캐뎀", 30, "네 마음을 NyoroNyoro하게", 1, 2);
            break;
          case 2:
            nbf(_0x23a024, "받캐뎀", 30, "네 마음을 NyoroNyoro하게", 1, 2);
            break;
          case 3:
            nbf(_0x23a024, "받캐뎀", 35, "네 마음을 NyoroNyoro하게", 1, 2);
            break;
          case 4:
            nbf(_0x23a024, "받캐뎀", 35, "네 마음을 NyoroNyoro하게", 1, 2);
            break;
          default:
            nbf(_0x23a024, "받캐뎀", 40, "네 마음을 NyoroNyoro하게", 1, 2);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
        if (_0x23a024.isLeader) {
          if (buffNestByType(_0x23a024, "<애교 시간>") < 2) {
            _0x23a024.cd -= 1;
            _0x23a024.curCd -= 1;
            nbf(_0x23a024, "<애교 시간>", 0, "애교계 청순한 여친", 1, 2);
          } else {
            _0x23a024.cd = 3;
            _0x23a024.curCd = 3;
            deleteBuffType(_0x23a024, "기본", "<애교 시간>");
          }
        }
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(20);
        if (getElementCnt("광") >= 1) {
          tbf(all, "공퍼증", 80, "<우사기 히메 부비부비~>", always);
        }
        if (getElementCnt("암") >= 1) {
          tbf(_0x23a024, "공퍼증", 60, "<미루 부비부비~>1", always);
          for (let _0x1bfd2a of getElementIdx("화")) {
            anbf(_0x23a024, "궁", comp[_0x1bfd2a], "받속뎀", 25, "<미루 부비부비~>2", 1, 2, always);
          }
          tbf(_0x23a024, "궁추가*", 160, "<미루 부비부비~>3", always);
        }
      };
      _0x23a024.passive = function () {
        anbf(_0x23a024, "공격", _0x23a024, "공퍼증", 20, "꼬리달린 소형 양생동물", 1, 4, always);
        tbf(_0x23a024, "궁추가*", 66, "핑크빛 유혹", always);
        tbf(_0x23a024, "가뎀증", 40, "뇨로는 모두를 좋아해~", always);
        tbf(_0x23a024, "가뎀증", 7.5, "피해+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10125:
      setMnc(_0x23a024, [0, 3, 0, 3, 0, 3, 0, 3, 0, 3], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(_0x23a024, "공퍼증", 200, "장난은 안치지만 사탕 내 놔1", 1);
            tbf(_0x23a024, "공고증", myCurAtk + _0x23a024.id + 25, "장난은 안치지만 사탕 내 놔2", 1);
            break;
          case 2:
            tbf(_0x23a024, "공퍼증", 200, "장난은 안치지만 사탕 내 놔1", 1);
            tbf(_0x23a024, "공고증", myCurAtk + _0x23a024.id + 30, "장난은 안치지만 사탕 내 놔2", 1);
            break;
          case 3:
            tbf(_0x23a024, "공퍼증", 250, "장난은 안치지만 사탕 내 놔1", 1);
            tbf(_0x23a024, "공고증", myCurAtk + _0x23a024.id + 35, "장난은 안치지만 사탕 내 놔2", 1);
            break;
          case 4:
            tbf(_0x23a024, "공퍼증", 250, "장난은 안치지만 사탕 내 놔1", 1);
            tbf(_0x23a024, "공고증", myCurAtk + _0x23a024.id + 40, "장난은 안치지만 사탕 내 놔2", 1);
            break;
          default:
            tbf(_0x23a024, "공퍼증", 300, "장난은 안치지만 사탕 내 놔1", 1);
            tbf(_0x23a024, "공고증", myCurAtk + _0x23a024.id + 45, "장난은 안치지만 사탕 내 놔2", 1);
            break;
        }
        for (let _0x88c922 of getRoleIdx("딜", "디")) {
          tbf(comp[_0x88c922], "공고증", myCurAtk + _0x23a024.id + 25, "장난은 안치지만 사탕 내 놔3", 1);
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {
        tbf(all, "공퍼증", 50, "용기의 힘", 1);
      };
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(20);
        tbf(all, "공퍼증", 50, "할로윈 코스프레 파티1", always);
        tbf(all, "가뎀증", 50, "할로윈 코스프레 파티2", always);
        tbf(all, "궁뎀증", 70, "할로윈 코스프레 파티3", always);
      };
      _0x23a024.passive = function () {
        tbf(_0x23a024, "궁추가*", 250, "호박을 자르는데 어찌 성검을 쓰겠는가", always);
        for (let _0x5144a2 of getRoleIdx("딜", "디")) {
          tbf(comp[_0x5144a2], "궁추가*", 100, "할로윈에 입을 옷", 50);
        }
        tbf(_0x23a024, "공퍼증", 10, "공격+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 3 == 0) {
          for (let _0x118a60 of getRoleIdx("딜", "디")) {
            atbf(_0x23a024, "궁", comp[_0x118a60], "공고증", myCurAtk + _0x23a024.id + 25, "즉석 호박파이", 1, 1);
          }
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10126:
      _0x23a024.stack = 0;
      setMnc(_0x23a024, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x17c963);
      buff_ex.push("<연쇄 트랩>");
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(boss, "받뎀증", 30, "사탕을 줘도 장난 칠거야!1", 4);
            tbf(all, "궁뎀증", 10, "사탕을 줘도 장난 칠거야!3", 4);
            break;
          case 2:
            tbf(boss, "받뎀증", 30, "사탕을 줘도 장난 칠거야!1", 4);
            nbf(boss, "받뎀증", 10, "사탕을 줘도 장난 칠거야!2", 1, 1);
            tbf(all, "궁뎀증", 15, "사탕을 줘도 장난 칠거야!3", 4);
            break;
          case 3:
            tbf(boss, "받뎀증", 40, "사탕을 줘도 장난 칠거야!1", 4);
            nbf(boss, "받뎀증", 10, "사탕을 줘도 장난 칠거야!2", 1, 1);
            tbf(all, "궁뎀증", 20, "사탕을 줘도 장난 칠거야!3", 4);
            break;
          case 4:
            tbf(boss, "받뎀증", 40, "사탕을 줘도 장난 칠거야!1", 4);
            nbf(boss, "받뎀증", 20, "사탕을 줘도 장난 칠거야!2", 1, 1);
            tbf(all, "궁뎀증", 25, "사탕을 줘도 장난 칠거야!3", 4);
            break;
          default:
            tbf(boss, "받뎀증", 45, "사탕을 줘도 장난 칠거야!1", 4);
            nbf(boss, "받뎀증", 20, "사탕을 줘도 장난 칠거야!2", 1, 1);
            tbf(all, "궁뎀증", 30, "사탕을 줘도 장난 칠거야!3", 4);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {
        for (let _0x1915f4 of comp) {
          tbf(_0x1915f4, "공고증", myCurAtk + _0x23a024.id + 30, "찹쌀 끈적끈적탄", 1);
        }
      };
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(30);
        atbf(_0x23a024, "궁", all, "아머", _0x23a024.hp * 10, "참신한 말썽꾸러기1", 1, always);
        for (let _0x4fd32a of getElementIdx("광", "암")) {
          atbf(_0x23a024, "궁", comp[_0x4fd32a], "받속뎀", 0, "참신한 말썽꾸러기2", 1, always);
        }
        for (let _0x19e7db of getElementIdx("화", "수")) {
          atbf(_0x23a024, "궁", comp[_0x19e7db], "받속뎀", 0, "참신한 말썽꾸러기3", 1, always);
        }
        if (getRoKind() == 4) {
          tbf(all, "공퍼증", 120, "<할로윈 장난 파티>1", always);
          tbf(all, "가뎀증", 50, "<할로윈 장난 파티>2", always);
        }
      };
      _0x23a024.passive = function () {
        atbf(_0x23a024, "궁", all, "공고증", myCurAtk + _0x23a024.id + 30, "천방백계1", 1, always);
        buff(_0x23a024, "받아증", 20, "천방백계2", always, false);
        buff(_0x23a024, "공퍼증", 20, "천방백계3", always, false);
        buff(_0x23a024, "공퍼증", 20, "천방백계4", always, false);
        for (let _0x340df0 of getElementIdx("화", "수")) {
          atbf(_0x23a024, "궁", comp[_0x340df0], "받속뎀", 0, "할로윈 미궁", 1, always);
        }
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
        nbf(_0x23a024, "<연쇄 트랩>", 0, "작은 몸과 큰 머리", 1, 9);
        if (_0x23a024.stack == 3) {
          setBuffOn(_0x23a024, "기본", "천방백계2", true);
        } else if (_0x23a024.stack == 6) {
          setBuffOn(_0x23a024, "기본", "천방백계3", true);
        } else if (_0x23a024.stack == 8) {
          setBuffOn(_0x23a024, "기본", "천방백계4", true);
        }
        if (_0x23a024.stack < 9) {
          if (_0x23a024.isLeader) {
            setBuffSizeAll(_0x23a024, "발동", "참신한 말썽꾸러기2", (_0x23a024.stack + 1) * 6);
            setBuffSizeAll(_0x23a024, "발동", "참신한 말썽꾸러기3", (_0x23a024.stack + 1) * 3);
          }
          setBuffSizeAll(_0x23a024, "발동", "할로윈 미궁", (_0x23a024.stack + 1) * 3);
        }
        _0x23a024.stack++;
        if (_0x23a024.stack > 9) {
          _0x23a024.stack = 9;
        }
      };
      return _0x23a024;
    case 10127:
      setMnc(_0x23a024, [0, 30, 0, 30, 0, 30, 0, 30, 0, 30], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(all, "궁뎀증", 10, "꿈나라의 왕1", 15);
            buff(_0x23a024, "공격", all, "공고증", myCurAtk + _0x23a024.id + 20, "꿈나라의 왕2", 1, 15, "발동", false);
            break;
          case 2:
            tbf(all, "궁뎀증", 15, "꿈나라의 왕1", 15);
            buff(_0x23a024, "공격", all, "공고증", myCurAtk + _0x23a024.id + 22.5, "꿈나라의 왕2", 1, 15, "발동", false);
            break;
          case 3:
            tbf(all, "궁뎀증", 20, "꿈나라의 왕1", 15);
            buff(_0x23a024, "공격", all, "공고증", myCurAtk + _0x23a024.id + 25, "꿈나라의 왕2", 1, 15, "발동", false);
            break;
          case 4:
            tbf(all, "궁뎀증", 25, "꿈나라의 왕1", 15);
            buff(_0x23a024, "공격", all, "공고증", myCurAtk + _0x23a024.id + 27.5, "꿈나라의 왕2", 1, 15, "발동", false);
            break;
          default:
            tbf(all, "궁뎀증", 30, "꿈나라의 왕1", 15);
            buff(_0x23a024, "공격", all, "공고증", myCurAtk + _0x23a024.id + 30, "꿈나라의 왕2", 1, 15, "발동", false);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
        cdChange(_0x23a024, -1);
        for (let _0x119554 of comp) {
          setBuffOnAll(_0x119554, "발동", "꿈나라의 왕2", true);
        }
      };
      _0x23a024.atkbefore = function () {
        for (let _0xf5d7e5 of getElementIdx("수")) {
          tbf(comp[_0xf5d7e5], "공퍼증", 40, "꿈의 거품", 1);
        }
      };
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
        cdChange(_0x23a024, -1);
      };
      _0x23a024.leader = function () {
        hpUpAll(20);
        tbf(all, "공퍼증", 40, "전설의 환수1", always);
        if (getElementCnt("수") >= 4) {
          tbf(all, "공퍼증", 80, "<영원한 꿈>1", always);
          anbf(all, "궁", all, "가뎀증", 50, "<영원한 꿈>2", 1, 1, always);
        }
      };
      _0x23a024.passive = function () {
        for (let _0x390c16 of comp) {
          if (_0x390c16.id != _0x23a024.id) {
            atbf(_0x23a024, "평", _0x390c16, "공발동*", 25, "<강제 수면>1", 1, always);
          }
        }
        tbf(_0x23a024, "공퍼증", 10, "공격+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
        cdChange(_0x23a024, -1);
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {
          if (GLOBAL_TURN == 10) {
            tbf(all, "궁뎀증", 150, "전설의 환수2", 40);
          }
        }
        if (GLOBAL_TURN == 1) {
          cdChange(_0x23a024, -30);
        }
        if (GLOBAL_TURN == 4) {
          tbf(all, "궁뎀증", 30, "분노한 드림이터1", 16);
        }
        if (GLOBAL_TURN == 7) {
          tbf(all, "궁뎀증", 30, "분노한 드림이터2", 13);
        }
        if (GLOBAL_TURN == 10) {
          tbf(all, "궁뎀증", 40, "분노한 드림이터3", 10);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10128:
      setMnc(_0x23a024, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            for (let _0x1aed06 of getRoleIdx("딜")) {
              nbf(comp[_0x1aed06], "받직뎀", 30, "흔들리는 와인잔1", 1, 2);
            }
            tbf(_0x23a024, "평추가*", 50, "흔들리는 와인잔2", 4);
            break;
          case 2:
            for (let _0x48717c of getRoleIdx("딜")) {
              nbf(comp[_0x48717c], "받직뎀", 36.5, "흔들리는 와인잔1", 1, 2);
            }
            tbf(_0x23a024, "평추가*", 56.5, "흔들리는 와인잔2", 4);
            break;
          case 3:
            for (let _0x1f1bb7 of getRoleIdx("딜")) {
              nbf(comp[_0x1f1bb7], "받직뎀", 40, "흔들리는 와인잔1", 1, 2);
            }
            tbf(_0x23a024, "평추가*", 70, "흔들리는 와인잔2", 4);
            break;
          case 4:
            for (let _0x2de5bb of getRoleIdx("딜")) {
              nbf(comp[_0x2de5bb], "받직뎀", 46.5, "흔들리는 와인잔1", 1, 2);
            }
            tbf(_0x23a024, "평추가*", 76.5, "흔들리는 와인잔2", 4);
            break;
          default:
            for (let _0x18a95f of getRoleIdx("딜")) {
              nbf(comp[_0x18a95f], "받직뎀", 50, "흔들리는 와인잔1", 1, 2);
            }
            tbf(_0x23a024, "평추가*", 90, "흔들리는 와인잔2", 4);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(20);
        nbf(all, "공퍼증", 40, "숨막히는 여왕", 1, 1);
        let _0xaefe57 = getElementCnt("광");
        let _0x1e4c21 = getRoleCnt("딜");
        let _0x25edfb = getElementIdx("광");
        let _0x53d04c = getRoleIdx("딜");
        if (_0xaefe57 >= 3) {
          tbf(_0x23a024, "속상감", 55, "야릇한 음악0", always);
          for (const _0x10615a of _0x53d04c) {
            atbf(_0x23a024, "평", comp[_0x10615a], "공고증", _0x23a024.atk * 30, "야릇한 음악1", 4, always);
          }
          for (const _0x3db566 of _0x25edfb) {
            anbf(_0x23a024, "평", comp[_0x3db566], "속뎀증", 7, "야릇한음악2", 1, 8, always);
          }
        }
        if (_0x1e4c21 >= 3) {
          for (const _0x52d7d0 of _0x53d04c) {
            comp[_0x52d7d0].canCDChange = false;
            tbf(comp[_0x52d7d0], "가뎀증", 20, "무장방어1", always);
            tbf(comp[_0x52d7d0], "평추가*", 40, "무장방어2", always);
          }
        }
      };
      _0x23a024.passive = function () {
        let _0x375899 = getRoleIdx("딜");
        for (const _0x593c23 of _0x375899) {
          tbf(comp[_0x593c23], "일뎀증", 30, "곡도 같은 눈썹1", always);
        }
        tbf(_0x23a024, "일뎀증", 60, "곡도 같은 눈썹2", always);
        for (const _0x29c2e8 of _0x375899) {
          tbf(comp[_0x29c2e8], "공퍼증", 30, "핏빛 입술1", always);
        }
        tbf(_0x23a024, "공퍼증", 50, "핏빛 입술2", always);
        for (const _0x375e3f of _0x375899) {
          tbf(comp[_0x375e3f], "가뎀증", 15, "모든 것을 독점한 아름다움1", always);
        }
        tbf(_0x23a024, "가뎀증", 20, "모든 것을 독점한 아름다움2", always);
        tbf(_0x23a024, "가뎀증", 7.5, "가하는 데미지+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {};
      _0x23a024.turnover = function () {};
      return _0x23a024;
    case 10129:
      setMnc(_0x23a024, [388, 4, 445, 4, 503, 4, 560, 4, 618, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(all, "가뎀증", 10, "맹록 착지 포즈", 4);
            break;
          case 2:
            tbf(all, "가뎀증", 15, "맹록 착지 포즈", 4);
            break;
          case 3:
            tbf(all, "가뎀증", 20, "맹록 착지 포즈", 4);
            break;
          case 4:
            tbf(all, "가뎀증", 25, "맹록 착지 포즈", 4);
            break;
          default:
            tbf(all, "가뎀증", 30, "맹록 착지 포즈", 4);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpMe(_0x23a024, 30);
        tbf(_0x23a024, "가아증", 50, "순결마성의 매력1", always);
        nbf(boss, "받뎀증", 50, "순결마성의 매력2", 1, 1);
        if (getElementCnt("풍") >= 4) {
          tbf(all, "공퍼증", 130, "<메리 섹스마스!>1", always);
          tbf(all, "궁뎀증", 50, "<메리 섹스마스!>2", always);
          tbf(all, "가뎀증", 20, "<메리 섹스마스!>3", always);
        }
      };
      _0x23a024.passive = function () {
        anbf(_0x23a024, "피격", all, "궁뎀증", 3, "브레이크를 위한 액셀", 1, 15, always);
        atbf(_0x23a024, "공격", _0x23a024, "아머", _0x23a024.hp * 20, "함께 파티 시작!", 1, always);
        anbf(_0x23a024, "피격", _0x23a024, "가뎀증", 10, "이것이 바로 속박의 힘!1", 1, 4, always);
        atbf(_0x23a024, "피격", _0x23a024, "아머", _0x23a024.hp * 23, "이것이 바로 속박의 힘!2", 2, always);
        tbf(_0x23a024, "가아증", 10, "아머+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
        nbf(all, "궁뎀증", 3, "브레이크를 위한 액셀", 1, 15);
      };
      return _0x23a024;
    case 10130:
      _0x23a024.stack = 0;
      setMnc(_0x23a024, [211, 3, 234, 3, 256, 3, 278, 3, 300, 3], _0x17c963);
      buff_ex.push("<싸움상등!>");
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(_0x23a024, "반격*", 156, "이 일격으로 머리를 뚫어버린다!2", 3);
            break;
          case 2:
            tbf(_0x23a024, "반격*", 156, "이 일격으로 머리를 뚫어버린다!2", 3);
            break;
          case 3:
            tbf(boss, "받뎀증", 20, "이 일격으로 머리를 뚫어버린다!1", 3);
            tbf(_0x23a024, "반격*", 178, "이 일격으로 머리를 뚫어버린다!2", 3);
            break;
          case 4:
            tbf(boss, "받뎀증", 20, "이 일격으로 머리를 뚫어버린다!1", 3);
            tbf(_0x23a024, "반격*", 178, "이 일격으로 머리를 뚫어버린다!2", 3);
            break;
          default:
            tbf(boss, "받뎀증", 25, "이 일격으로 머리를 뚫어버린다!1", 3);
            tbf(_0x23a024, "반격*", 200, "이 일격으로 머리를 뚫어버린다!2", 3);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(20);
        if (getRoleCnt("탱") >= 3) {
          tbf(all, "공퍼증", 140, "크리스마스 계승자1", always);
          tbf(all, "가뎀증", 100, "크리스마스 계승자2", always);
          anbf(all, "피격", boss, "받발뎀", 20, "<빠따는 훌륭한 대화 수단!>", 1, 10, always);
          for (let _0x564aab of comp) {
            atbf(_0x564aab, "궁", _0x564aab, "반격*", 250, "<그래도 넌 내가 이김!>", 3, always);
            const _0x389167 = _0x564aab.hit;
            _0x564aab.hit = function (..._0x7b335d) {
              _0x389167.apply(this, _0x7b335d);
              deleteBuff(_0x564aab, "기본", "<그래도 넌 내가 이김!>");
            };
          }
        }
      };
      _0x23a024.passive = function () {
        _0x23a024.canCDChange = false;
        anbf(_0x23a024, "피격", _0x23a024, "<싸움상등!>", 0, "늑대가 뒤를 돌아본 것은!", 1, 10, always);
        buff(_0x23a024, "피격", _0x23a024, "on", "기본", "보은 때문이 아닌!1", 1, always, "발동", false);
        buff(_0x23a024, "피격", _0x23a024, "on", "기본", "보은 때문이 아닌!2", 1, always, "발동", false);
        buff(_0x23a024, "피격", _0x23a024, "on", "기본", "보은 때문이 아닌!3", 1, always, "발동", false);
        const _0x29d61f = _0x23a024.hit;
        _0x23a024.hit = function (..._0x427b95) {
          setBuffNest(_0x23a024, "기본", "<싸움상등!>", _0x23a024.stack + 1 > 10 ? 10 : _0x23a024.stack + 1);
          if (_0x23a024.stack == 2) {
            setBuffOn(_0x23a024, "발동", "보은 때문이 아닌!1", true);
          } else if (_0x23a024.stack == 5) {
            setBuffOn(_0x23a024, "발동", "보은 때문이 아닌!2", true);
          } else if (_0x23a024.stack == 8) {
            setBuffOn(_0x23a024, "발동", "보은 때문이 아닌!3", true);
          }
          _0x29d61f.apply(this, _0x427b95);
          if (_0x23a024.stack == 2) {
            setBuffOn(_0x23a024, "발동", "보은 때문이 아닌!1", false);
          } else if (_0x23a024.stack == 5) {
            setBuffOn(_0x23a024, "발동", "보은 때문이 아닌!2", false);
          } else if (_0x23a024.stack == 8) {
            setBuffOn(_0x23a024, "발동", "보은 때문이 아닌!3", false);
          }
          _0x23a024.stack++;
          if (_0x23a024.stack > 10) {
            _0x23a024.stack = 10;
          }
          deleteBuff(_0x23a024, "기본", "이 일격으로 머리를 뚫어버린다!2");
          deleteBuff(_0x23a024, "기본", "<빠가야로!>");
        };
        nbf(_0x23a024, "공퍼증", 5, "<싸움상등!>", 0, 10);
        buff(_0x23a024, "가뎀증", 5, "보은 때문이 아닌!1", always, false);
        buff(_0x23a024, "가뎀증", 10, "보은 때문이 아닌!2", always, false);
        buff(_0x23a024, "가뎀증", 15, "보은 때문이 아닌!3", always, false);
        buff(_0x23a024, "행동", _0x23a024, "반격*", 100, "<빠가야로!>", 1, always, "발동", false);
        tbf(_0x23a024, "가뎀증", 7.5, "데미지+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        if (GLOBAL_TURN == 1) {
          nbf(_0x23a024, "<싸움상등!>", 0, "늑대가 뒤를 돌아본 것은!", 2, 10);
          _0x23a024.stack += 2;
          if (_0x23a024.stack > 10) {
            _0x23a024.stack = 10;
          }
        }
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 3 == 0) {
          nbf(_0x23a024, "<싸움상등!>", 0, "늑대가 뒤를 돌아본 것은!", 2, 10);
          _0x23a024.stack += 2;
          if (_0x23a024.stack > 10) {
            _0x23a024.stack = 10;
          }
        }
        setBuffNest(_0x23a024, "기본", "<싸움상등!>", _0x23a024.stack);
        setBuffOn(_0x23a024, "기본", "보은 때문이 아닌!1", _0x23a024.stack >= 3);
        setBuffOn(_0x23a024, "기본", "보은 때문이 아닌!2", _0x23a024.stack >= 6);
        setBuffOn(_0x23a024, "기본", "보은 때문이 아닌!3", _0x23a024.stack >= 9);
        setBuffOn(_0x23a024, "발동", "<빠가야로!>", _0x23a024.stack >= 10);
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10131:
      setMnc(_0x23a024, [265, 3, 298, 3, 331, 3, 364, 3, 397, 3], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(_0x23a024, "받캐뎀", 50, "시간을 초월한 희망", 3);
            break;
          case 2:
            tbf(_0x23a024, "받캐뎀", 62.5, "시간을 초월한 희망", 3);
            break;
          case 3:
            tbf(_0x23a024, "받캐뎀", 75, "시간을 초월한 희망", 3);
            break;
          case 4:
            tbf(_0x23a024, "받캐뎀", 87.5, "시간을 초월한 희망", 3);
            break;
          default:
            tbf(_0x23a024, "받캐뎀", 100, "시간을 초월한 희망", 3);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(25);
        tbf(all, "공퍼증", 90, "시간을 다스리는 자1", always);
        for (let _0x10f8f6 of getRoleIdx("딜", "디")) {
          tbf(comp[_0x10f8f6], "가뎀증", 40, "시간을 다스리는 자2", always);
        }
        tbf(_0x23a024, "공퍼증", 90, "시간을 다스리는 자3", always);
      };
      _0x23a024.passive = function () {
        nbf(_0x23a024, "가뎀증", 4, "부서진 창공", 1, 5);
        tbf(_0x23a024, "가뎀증", 20, "시공간 지배1", always);
        atbf(_0x23a024, "궁", _0x23a024, "받캐뎀", 10, "시공간 지배2", 4, always);
        tbf(_0x23a024, "평발동*", 70, "찬란한 세월1", always);
        tbf(_0x23a024, "궁발동*", 70, "찬란한 세월2", always);
        tbf(_0x23a024, "공퍼증", 10, "공격 데미지+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 3 == 0) {
          nbf(_0x23a024, "가뎀증", 4, "부서진 창공", 2, 5);
          if (GLOBAL_TURN <= 7) {
            setBuffSizeUp(_0x23a024, "발동", "시공간 지배2", 20);
          }
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10132:
      setMnc(_0x23a024, [265, 3, 298, 3, 331, 3, 364, 3, 397, 3], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(all, "궁뎀증", 20, "드리워진 밤의 장막1", 3);
            tbf(_0x23a024, "가아증", 10, "드리워진 밤의 장막2", 3);
            break;
          case 2:
            tbf(all, "궁뎀증", 30, "드리워진 밤의 장막1", 3);
            tbf(_0x23a024, "가아증", 15, "드리워진 밤의 장막2", 3);
            break;
          case 3:
            tbf(all, "궁뎀증", 40, "드리워진 밤의 장막1", 3);
            tbf(_0x23a024, "가아증", 20, "드리워진 밤의 장막2", 3);
            break;
          case 4:
            tbf(all, "궁뎀증", 50, "드리워진 밤의 장막1", 3);
            tbf(_0x23a024, "가아증", 25, "드리워진 밤의 장막2", 3);
            break;
          default:
            tbf(all, "궁뎀증", 60, "드리워진 밤의 장막1", 3);
            tbf(_0x23a024, "가아증", 30, "드리워진 밤의 장막2", 3);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(20);
        tbf(all, "공퍼증", 80, "어둠의 여제", always);
        if (getElementCnt("수") >= 3) {
          tbf(_0x23a024, "공퍼증", 60, "<어두운 밤>1", always);
          for (let _0x1877a2 of getElementIdx("암", "수")) {
            anbf(_0x23a024, "궁", comp[_0x1877a2], "받속뎀", 5, "<어두운 밤>2", 1, 3, always);
          }
          for (let _0x10da3c of comp) {
            atbf(_0x23a024, "공격", _0x10da3c, "공고증", myCurAtk + _0x23a024.id + 40, "<어두운 밤>3", 1, always);
          }
        }
        if (getElementCnt("암") >= 2) {
          tbf(comp[2], "가뎀증", 30, "<용병 지침>1", always);
          tbf(comp[4], "가뎀증", 30, "<용병 지침>1", always);
          tbf(comp[2], "궁추가*", 40, "<용병 지침>2", always);
          tbf(comp[4], "궁추가*", 40, "<용병 지침>2", always);
        }
      };
      _0x23a024.passive = function () {
        ptbf(_0x23a024, "궁", boss, "받뎀증", 15, "희미한 규방", 7, always);
        ptbf(_0x23a024, "궁", all, "아머", _0x23a024.hp * 7, "부슬비", 1, always);
        ptbf(_0x23a024, "궁", boss, "받궁뎀", 20, "끝없이 흐르는 밤", 7, always);
        tbf(_0x23a024, "공퍼증", 10, "공격+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10133:
      setMnc(_0x23a024, [0, 3, 0, 3, 0, 3, 0, 3, 0, 3], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(all, "공고증", _0x23a024.atk * 50, "이것이 바로 프로 아이돌의 매력1", 4);
            tbf(all, "궁뎀증", 20, "이것이 바로 프로 아이돌의 매력2", 4);
            break;
          case 2:
            tbf(all, "공고증", _0x23a024.atk * 55, "이것이 바로 프로 아이돌의 매력1", 4);
            tbf(all, "궁뎀증", 25, "이것이 바로 프로 아이돌의 매력2", 4);
            break;
          case 3:
            tbf(all, "공고증", _0x23a024.atk * 60, "이것이 바로 프로 아이돌의 매력1", 4);
            tbf(all, "궁뎀증", 30, "이것이 바로 프로 아이돌의 매력2", 4);
            break;
          case 4:
            tbf(all, "공고증", _0x23a024.atk * 65, "이것이 바로 프로 아이돌의 매력1", 4);
            tbf(all, "궁뎀증", 35, "이것이 바로 프로 아이돌의 매력2", 4);
            break;
          default:
            tbf(all, "공고증", _0x23a024.atk * 70, "이것이 바로 프로 아이돌의 매력1", 4);
            tbf(all, "궁뎀증", 40, "이것이 바로 프로 아이돌의 매력2", 4);
            break;
        }
      };
      _0x23a024.ultafter = function () {
        tbf(all, "아머", _0x23a024.getCurAtk() * 25 * armorUp(_0x23a024, "궁", "추가"), "청순 아이돌1", 1);
        tbf(all, "아머", _0x23a024.hp * 30 * armorUp(_0x23a024, "궁", "추가"), "청순 아이돌2", 1);
        if (_0x23a024.isLeader) {
          tbf(_0x23a024, "궁발동+", myCurShd + _0x23a024.id + 60, "나나미의 형상으로 변한 것뿐2", 1);
        }
      };
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
        if (_0x23a024.isLeader) {
          _0x23a024.hit();
          deleteBuffType(_0x23a024, "기본", "아머");
        }
      };
      _0x23a024.atkbefore = function () {
        tbf(all, "아머", _0x23a024.getCurAtk() * 25 * armorUp(_0x23a024, "평", "추가"), "한눈 팔기 없기~1", 1);
        tbf(all, "아머", _0x23a024.hp * 30 * armorUp(_0x23a024, "평", "추가"), "한눈 팔기 없기~2", 1);
      };
      _0x23a024.atkafter = function () {
        if (_0x23a024.isLeader) {
          tbf(_0x23a024, "평발동+", myCurShd + _0x23a024.id + 55, "나나미의 형상으로 변한 것뿐1", 1);
        }
        if (_0x23a024.isLeader) {
          _0x23a024.hit();
          deleteBuffType(_0x23a024, "기본", "아머");
        }
      };
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        tbf(all, "공퍼증", 50, "악수회 시간이야~1", always);
        tbf(all, "발효증", 100, "악수회 시간이야~2", always);
        tbf(all, "가뎀증", 20, "악수회 시간이야~3", always);
        if (getRoleCnt("섶") >= 2) {
          _0x23a024.getArmor = function () {
            return 0;
          };
        }
        for (let _0x5d0d8a of comp) {
          if (_0x5d0d8a.id != _0x23a024.id) {
            atbf(_0x5d0d8a, "공격", comp[0], "아머", myCurAtk + _0x5d0d8a.id + 30, "<돈은 사라지지 않아>", 1, always);
          }
        }
      };
      _0x23a024.passive = function () {
        tbf(_0x23a024, "가아증", 15, "무대 준비", always);
        tbf(_0x23a024, "공퍼증", 10, "공격+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        if (GLOBAL_TURN > 1) {
          tbf(all, "공고증", myCurAtk + _0x23a024.id + 25, "OnlySex", 1);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10134:
      setMnc(_0x23a024, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x17c963);
      _0x23a024.turnHeal = false;
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            for (let _0x250d68 of getRoleIdx("딜", "디")) {
              tbf(comp[_0x250d68], "궁추가*", 65, "다들 함께 불러요~2", 1);
            }
            tbf(all, "가뎀증", 30, "다들 함께 불러요~3", 1);
            break;
          case 2:
            for (let _0x2f4897 of getRoleIdx("딜", "디")) {
              tbf(comp[_0x2f4897], "궁추가*", 75, "다들 함께 불러요~2", 1);
            }
            tbf(all, "가뎀증", 37.5, "다들 함께 불러요~3", 1);
            break;
          case 3:
            for (let _0x52449d of getRoleIdx("딜", "디")) {
              tbf(comp[_0x52449d], "궁추가*", 75, "다들 함께 불러요~2", 1);
            }
            tbf(all, "가뎀증", 45, "다들 함께 불러요~3", 1);
            break;
          case 4:
            for (let _0x189406 of getRoleIdx("딜", "디")) {
              tbf(comp[_0x189406], "궁추가*", 75, "다들 함께 불러요~2", 1);
            }
            tbf(all, "가뎀증", 52.5, "다들 함께 불러요~3", 1);
            break;
          default:
            for (let _0x5e20b4 of getRoleIdx("딜", "디")) {
              tbf(comp[_0x5e20b4], "궁추가*", 75, "다들 함께 불러요~2", 1);
            }
            tbf(all, "가뎀증", 60, "다들 함께 불러요~3", 1);
            break;
        }
        _0x23a024.turnHeal = true;
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
        for (let _0x246bec of comp) {
          _0x246bec.heal();
        }
        switch (_0x17c963) {
          case 1:
            break;
          case 2:
            break;
          case 3:
            for (let _0x319251 of comp) {
              if (_0x319251.id != _0x23a024.id) {
                atbf(_0x23a024, "평", _0x319251, "공고증", myCurAtk + _0x23a024.id + 10, "다들 함께 불러요~1", 1, 5);
              }
            }
            for (let _0x3bf473 of comp) {
              if (_0x3bf473.id != _0x23a024.id) {
                atbf(_0x23a024, "궁", _0x3bf473, "공고증", myCurAtk + _0x23a024.id + 10, "다들 함께 불러요~1", 1, 5);
              }
            }
            break;
          case 4:
            for (let _0x7b86d0 of comp) {
              if (_0x7b86d0.id != _0x23a024.id) {
                atbf(_0x23a024, "평", _0x7b86d0, "공고증", myCurAtk + _0x23a024.id + 12.5, "다들 함께 불러요~1", 1, 5);
              }
            }
            for (let _0x2f321f of comp) {
              if (_0x2f321f.id != _0x23a024.id) {
                atbf(_0x23a024, "궁", _0x2f321f, "공고증", myCurAtk + _0x23a024.id + 12.5, "다들 함께 불러요~1", 1, 5);
              }
            }
            break;
          default:
            for (let _0x5c2e66 of comp) {
              if (_0x5c2e66.id != _0x23a024.id) {
                atbf(_0x23a024, "평", _0x5c2e66, "공고증", myCurAtk + _0x23a024.id + 15, "다들 함께 불러요~1", 1, 5);
              }
            }
            for (let _0x3e7870 of comp) {
              if (_0x3e7870.id != _0x23a024.id) {
                atbf(_0x23a024, "궁", _0x3e7870, "공고증", myCurAtk + _0x23a024.id + 15, "다들 함께 불러요~1", 1, 5);
              }
            }
            break;
        }
      };
      _0x23a024.atkbefore = function () {
        _0x23a024.turnHeal = true;
      };
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
        for (let _0x411a92 of comp) {
          _0x411a92.heal();
        }
      };
      _0x23a024.leader = function () {
        hpUpAll(35);
        atbf(_0x23a024, "궁", boss, "받뎀증", 30, "<슬픔을 몰아내는 빛>1", 1, always);
        for (let _0x1f8684 of getRoleIdx("딜", "디")) {
          atbf(_0x23a024, "궁", comp[_0x1f8684], "궁추가*", 80, "<슬픔을 몰아내는 빛>2", 1, always);
        }
        if (getElKind() == 4) {
          tbf(all, "공퍼증", 125, "<아이돌 댄스팀>1", always);
        }
      };
      _0x23a024.passive = function () {
        tbf(_0x23a024, "공퍼증", 35, "입만 열면 터지는 flow1", always);
        for (let _0x3dfd99 of comp) {
          if (_0x3dfd99.id != _0x23a024.id) {
            atbf(_0x23a024, "궁", _0x3dfd99, "공고증", myCurAtk + _0x23a024.id + 15, "입만 열면 터지는 flow2", 1, always);
          }
        }
        for (let _0x51f10a of comp) {
          if (_0x51f10a.id != _0x23a024.id) {
            atbf(_0x23a024, "궁", _0x51f10a, "공고증", myCurAtk + _0x23a024.id + 15, "팬들은 wow", 1, always);
          }
        }
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
        if (_0x23a024.turnHeal) {
          for (let _0x4294b0 of comp);
        }
        _0x23a024.turnHeal = false;
      };
      return _0x23a024;
    case 10135:
      _0x23a024.stack = 0;
      setMnc(_0x23a024, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x17c963);
      buff_ex.push("<위대한 나가퀸>");
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(_0x23a024, "가뎀증", 10, "돈이 곧 힘!1", 2);
            break;
          case 2:
            tbf(_0x23a024, "가뎀증", 15, "돈이 곧 힘!1", 2);
            break;
          case 3:
            tbf(_0x23a024, "가뎀증", 20, "돈이 곧 힘!1", 2);
            break;
          case 4:
            tbf(_0x23a024, "가뎀증", 25, "돈이 곧 힘!1", 2);
            break;
          default:
            tbf(_0x23a024, "가뎀증", 30, "돈이 곧 힘!1", 2);
            break;
        }
      };
      _0x23a024.ultafter = function () {
        switch (_0x17c963) {
          case 1:
            tbf(_0x23a024, "평추가*", 80, "돈이 곧 힘!2", 2);
            break;
          case 2:
            tbf(_0x23a024, "평추가*", 100, "돈이 곧 힘!2", 2);
            break;
          case 3:
            tbf(_0x23a024, "평추가*", 120, "돈이 곧 힘!2", 2);
            break;
          case 4:
            tbf(_0x23a024, "평추가*", 140, "돈이 곧 힘!2", 2);
            break;
          default:
            tbf(_0x23a024, "평추가*", 160, "돈이 곧 힘!2", 2);
            break;
        }
      };
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        tbf(_0x23a024, "공퍼증", 50, "슈퍼 리치 메스미나 님1", always);
        tbf(_0x23a024, "평추가*", 50, "슈퍼 리치 메스미나 님2", always);
        for (let _0x126a21 of comp) {
          if (_0x126a21.id != _0x23a024.id) {
            tbf(_0x126a21, "가뎀증", -100, "슈퍼 리치 메스미나 님3", always);
          }
        }
        nbf(_0x23a024, "<위대한 나가퀸>", 0, "아이돌 매니저의 상담 시간1", 4, 4);
      };
      _0x23a024.passive = function () {
        anbf(comp[2], "공격", _0x23a024, "<위대한 나가퀸>", 0, "아이돌 매니저의 상담 시간1", 1, 4, always);
        atbf(comp[2], "공격", _0x23a024, "공고증", myCurAtk + comp[2].id + 10, "아이돌 매니저의 상담 시간2", 1, always);
        tbf(comp[2], "가뎀증", -100, "아이돌 매니저의 상담 시간3", always);
        buff(_0x23a024, "일뎀증", 75, "아무것도 안 하는 게 최고야!1", always, false);
        buff(_0x23a024, "공퍼증", 100, "아무것도 안 하는 게 최고야!2", always, false);
        buff(_0x23a024, "공퍼증", 100, "아무것도 안 하는 게 최고야!3", always, false);
        buff(_0x23a024, "궁뎀증", 60, "아무것도 안 하는 게 최고야!4", always, false);
        const _0x4c3230 = comp[2].attack;
        comp[2].attack = function (..._0x3234ad) {
          _0x4c3230.apply(this, _0x3234ad);
          if (!_0x23a024.isLeader) {
            if (_0x23a024.stack == 0) {
              setBuffOn(_0x23a024, "기본", "아무것도 안 하는 게 최고야!1", true);
            } else if (_0x23a024.stack == 1) {
              setBuffOn(_0x23a024, "기본", "아무것도 안 하는 게 최고야!2", true);
            } else if (_0x23a024.stack == 2) {
              setBuffOn(_0x23a024, "기본", "아무것도 안 하는 게 최고야!3", true);
            } else if (_0x23a024.stack == 3) {
              setBuffOn(_0x23a024, "기본", "아무것도 안 하는 게 최고야!4", true);
            }
            _0x23a024.stack++;
            if (_0x23a024.stack > 4) {
              _0x23a024.stack = 4;
            }
          }
        };
        const _0x883882 = comp[2].ultimate;
        comp[2].ultimate = function (..._0x3f5ba7) {
          _0x883882.apply(this, _0x3f5ba7);
          if (!_0x23a024.isLeader) {
            if (_0x23a024.stack == 0) {
              setBuffOn(_0x23a024, "기본", "아무것도 안 하는 게 최고야!1", true);
            } else if (_0x23a024.stack == 1) {
              setBuffOn(_0x23a024, "기본", "아무것도 안 하는 게 최고야!2", true);
            } else if (_0x23a024.stack == 2) {
              setBuffOn(_0x23a024, "기본", "아무것도 안 하는 게 최고야!3", true);
            } else if (_0x23a024.stack == 3) {
              setBuffOn(_0x23a024, "기본", "아무것도 안 하는 게 최고야!4", true);
            }
            _0x23a024.stack++;
            if (_0x23a024.stack > 4) {
              _0x23a024.stack = 4;
            }
          }
        };
        atbf(comp[2], "궁", _0x23a024, "가뎀증", 40, "럭셔리의 기쁨", 2, always);
        tbf(_0x23a024, "가뎀증", 7.5, "피해+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {
          if (GLOBAL_TURN == 1) {
            _0x23a024.stack = 4;
            setBuffOn(_0x23a024, "기본", "아무것도 안 하는 게 최고야!1", true);
            setBuffOn(_0x23a024, "기본", "아무것도 안 하는 게 최고야!2", true);
            setBuffOn(_0x23a024, "기본", "아무것도 안 하는 게 최고야!3", true);
            setBuffOn(_0x23a024, "기본", "아무것도 안 하는 게 최고야!4", true);
          }
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10136:
      setMnc(_0x23a024, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(boss, "받뎀증", 30, "이제부터 돈 벌 시간!1", 4);
            break;
          case 2:
            tbf(boss, "받뎀증", 35, "이제부터 돈 벌 시간!1", 4);
            break;
          case 3:
            tbf(boss, "받뎀증", 40, "이제부터 돈 벌 시간!1", 4);
            break;
          case 4:
            tbf(boss, "받뎀증", 45, "이제부터 돈 벌 시간!1", 4);
            break;
          default:
            tbf(boss, "받뎀증", 50, "이제부터 돈 벌 시간!1", 4);
            break;
        }
      };
      _0x23a024.ultafter = function () {
        switch (_0x17c963) {
          case 1:
            tbf(_0x23a024, "평추가*", 15, "이제부터 돈 벌 시간!2", 4);
            break;
          case 2:
            tbf(_0x23a024, "평추가*", 15, "이제부터 돈 벌 시간!2", 4);
            break;
          case 3:
            tbf(_0x23a024, "평추가*", 22.5, "이제부터 돈 벌 시간!2", 4);
            break;
          case 4:
            tbf(_0x23a024, "평추가*", 22.5, "이제부터 돈 벌 시간!2", 4);
            break;
          default:
            tbf(_0x23a024, "평추가*", 30, "이제부터 돈 벌 시간!2", 4);
            break;
        }
      };
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        for (let _0x2793d6 of getElementIdx("수", "풍")) {
          hpUpMe(comp[_0x2793d6], 20);
        }
        for (let _0x5c3f2f of getElementIdx("수", "풍")) {
          tbf(comp[_0x5c3f2f], "공퍼증", 100, "수배령1", always);
        }
        for (let _0x5f0c8f of getElementIdx("수")) {
          tbf(comp[_0x5f0c8f], "일뎀증", 80, "수배령2", always);
        }
        for (let _0x681015 of getElementIdx("수")) {
          tbf(comp[_0x681015], "가뎀증", 50, "수배령3", always);
        }
        for (let _0x3fd635 of getElementIdx("풍")) {
          if (getRoleIdx("힐", "섶").includes(_0x3fd635)) {
            for (let _0x5778b6 of getElementIdx("수")) {
              atbf(comp[_0x3fd635], "공격", comp[_0x5778b6], "가뎀증", 30, "<집단 사냥>", 1, always);
            }
          }
        }
      };
      _0x23a024.passive = function () {
        tbf(_0x23a024, "일뎀증", 70, "사냥감 추적", always);
        for (let _0x5c0c58 of getElementIdx("수")) {
          if (getRoleIdx("딜", "탱", "디").includes(_0x5c0c58)) {
            atbf(_0x23a024, "궁", comp[_0x5c0c58], "평추가*", 30, "<비검 전달>", 1, always);
          }
        }
        let _0x405931 = comp.findIndex(_0x424bb2 => _0x424bb2.id == _0x23a024.id);
        for (let _0x1dcb0b of getElementIdx("수")) {
          if (getRoleIdx("딜", "탱", "디").includes(_0x1dcb0b)) {
            if (_0x1dcb0b == _0x405931) {
              continue;
            }
            atbf(comp[_0x1dcb0b], "궁", _0x23a024, "평추가*", 30, "<비검 전달>", 1, always);
          }
        }
        tbf(_0x23a024, "일뎀증", 10, "일반 공격+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        if (GLOBAL_TURN == 1) {
          cdChange(_0x23a024, -4);
          for (let _0x5eca07 of getElementIdx("수")) {
            if (comp[_0x5eca07].id != _0x23a024.id) {
              cdChange(comp[_0x5eca07], -1);
            }
          }
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10137:
      setMnc(_0x23a024, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(boss, "받뎀증", 20, "함께 시저 님을 섬겨요~1", 4);
            for (let _0x58ec4a of getRoleIdx("딜", "탱", "디")) {
              tbf(comp[_0x58ec4a], "평추가*", 10, "함께 시저 님을 섬겨요~2", 4);
            }
            tbf(_0x23a024, "평추가*", 20, "함께 시저 님을 섬겨요~3", 4);
            break;
          case 2:
            tbf(boss, "받뎀증", 25, "함께 시저 님을 섬겨요~1", 4);
            for (let _0x2f3811 of getRoleIdx("딜", "탱", "디")) {
              tbf(comp[_0x2f3811], "평추가*", 15, "함께 시저 님을 섬겨요~2", 4);
            }
            tbf(_0x23a024, "평추가*", 30, "함께 시저 님을 섬겨요~3", 4);
            break;
          case 3:
            tbf(boss, "받뎀증", 30, "함께 시저 님을 섬겨요~1", 4);
            for (let _0x29b4fe of getRoleIdx("딜", "탱", "디")) {
              tbf(comp[_0x29b4fe], "평추가*", 20, "함께 시저 님을 섬겨요~2", 4);
            }
            tbf(_0x23a024, "평추가*", 40, "함께 시저 님을 섬겨요~3", 4);
            break;
          case 4:
            tbf(boss, "받뎀증", 35, "함께 시저 님을 섬겨요~1", 4);
            for (let _0x105a41 of getRoleIdx("딜", "탱", "디")) {
              tbf(comp[_0x105a41], "평추가*", 25, "함께 시저 님을 섬겨요~2", 4);
            }
            tbf(_0x23a024, "평추가*", 50, "함께 시저 님을 섬겨요~3", 4);
            break;
          default:
            tbf(boss, "받뎀증", 40, "함께 시저 님을 섬겨요~1", 4);
            for (let _0x1989d6 of getRoleIdx("딜", "탱", "디")) {
              tbf(comp[_0x1989d6], "평추가*", 30, "함께 시저 님을 섬겨요~2", 4);
            }
            tbf(_0x23a024, "평추가*", 60, "함께 시저 님을 섬겨요~3", 4);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {
        tbf(_0x23a024, "공퍼증", 50, "버니 웨이브", 1);
      };
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(30);
        const _0x34190b = getElementIdx("풍");
        for (let _0xeb8751 of getRoleIdx("딜", "탱", "디")) {
          if (!_0x34190b.includes(_0xeb8751)) {
            continue;
          }
          anbf(comp[_0xeb8751], "평", all, "공퍼증", 6, "<정욕 페로몬>1", 1, 18, always);
          anbf(comp[_0xeb8751], "평", all, "일뎀증", 6, "<정욕 페로몬>2", 1, 18, always);
          anbf(comp[_0xeb8751], "평", all, "가뎀증", 2, "<정욕 페로몬>3", 1, 18, always);
        }
      };
      _0x23a024.passive = function () {
        anbf(_0x23a024, "평", _0x23a024, "공퍼증", 15, "샤랄라 쁘띠 원피스", 1, 6, always);
        anbf(_0x23a024, "평", boss, "받일뎀", 15, "큐티 썬캡", 1, 6, always);
        tbf(_0x23a024, "가뎀증", 20, "쇼 로망스1", always);
        for (let _0x3e3755 of getElementIdx("풍")) {
          anbf(_0x23a024, "궁", comp[_0x3e3755], "받속뎀", 10, "쇼 로망스2", 1, 3, always);
        }
        tbf(_0x23a024, "일뎀증", 10, "일반 공격+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10138:
      setMnc(_0x23a024, [0, 3, 0, 3, 0, 3, 0, 3, 0, 3], _0x17c963);
      buff_ex.push("<파티 사회자>", "<파티 참가자>");
      _0x23a024.stack = false;
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(comp[4], "궁뎀증", 30, "마왕성 party time3", 1);
            tbf(comp[4], "궁추가*", 60, "마왕성 party time4", 1);
            break;
          case 2:
            tbf(comp[4], "궁뎀증", 40, "마왕성 party time3", 1);
            tbf(comp[4], "궁추가*", 70, "마왕성 party time4", 1);
            break;
          case 3:
            tbf(comp[4], "궁뎀증", 40, "마왕성 party time3", 1);
            tbf(comp[4], "궁추가*", 80, "마왕성 party time4", 1);
            break;
          case 4:
            tbf(comp[4], "궁뎀증", 50, "마왕성 party time3", 1);
            tbf(comp[4], "궁추가*", 90, "마왕성 party time4", 1);
            break;
          default:
            tbf(comp[4], "궁뎀증", 50, "마왕성 party time3", 1);
            tbf(comp[4], "궁추가*", 100, "마왕성 party time4", 1);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
        if (_0x23a024.isLeader) {
          tbf(comp[4], "가뎀증", buffNestByType(_0x23a024, "<파티 사회자>") * 7.5, "파자마 파티 스타트~3", 1);
          tbf(boss, "받뎀증", buffNestByType(_0x23a024, "<파티 참가자>") * 7.5, "파자마 파티 스타트~4", 1);
        }
        tbf(comp[4], "가뎀증", buffNestByType(_0x23a024, "<파티 사회자>") * 8.75, "스릴 넘치는 파티 게임3", 1);
        tbf(boss, "받뎀증", buffNestByType(_0x23a024, "<파티 참가자>") * 8.75, "스릴 넘치는 파티 게임4", 1);
        switch (_0x17c963) {
          case 1:
            if (!_0x23a024.stack) {
              nbf(_0x23a024, "<파티 사회자>", 0, "스릴 넘치는 파티 게임1", 1, 4);
            }
            if (!_0x23a024.stack) {
              nbf(_0x23a024, "<파티 참가자>", 0, "스릴 넘치는 파티 게임2", 1, 4);
            }
            break;
          case 2:
            if (!_0x23a024.stack) {
              nbf(_0x23a024, "<파티 사회자>", 0, "스릴 넘치는 파티 게임1", 1, 4);
            }
            if (!_0x23a024.stack) {
              nbf(_0x23a024, "<파티 참가자>", 0, "스릴 넘치는 파티 게임2", 1, 4);
            }
            break;
          case 3:
            if (!_0x23a024.stack) {
              nbf(_0x23a024, "<파티 사회자>", 0, "스릴 넘치는 파티 게임1", 2, 4);
            }
            if (!_0x23a024.stack) {
              nbf(_0x23a024, "<파티 참가자>", 0, "스릴 넘치는 파티 게임2", 2, 4);
            }
            break;
          case 4:
            if (!_0x23a024.stack) {
              nbf(_0x23a024, "<파티 사회자>", 0, "스릴 넘치는 파티 게임1", 2, 4);
            }
            if (!_0x23a024.stack) {
              nbf(_0x23a024, "<파티 참가자>", 0, "스릴 넘치는 파티 게임2", 2, 4);
            }
            break;
          default:
            if (!_0x23a024.stack) {
              nbf(_0x23a024, "<파티 사회자>", 0, "스릴 넘치는 파티 게임1", 3, 4);
            }
            if (!_0x23a024.stack) {
              nbf(_0x23a024, "<파티 참가자>", 0, "스릴 넘치는 파티 게임2", 3, 4);
            }
            break;
        }
        _0x23a024.stack = true;
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(30);
        tbf(all, "공퍼증", 50, "파자마 파티 스타트~1", always);
        atbf(_0x23a024, "궁", comp[4], "궁뎀증", 30, "파자마 파티 스타트~2", 1, always);
        for (let _0x18e216 of getRoleIdx("섶")) {
          atbf(comp[_0x18e216], "궁", comp[4], "공고증", myCurAtk + comp[_0x18e216].id + 10, "파자마 파티 스타트~5", 1, always);
        }
        let _0x38ba92 = 0;
        let _0x1fba72 = 0;
        for (let _0xc84adf = 0; _0xc84adf < 5; _0xc84adf++) {
          if (comp[_0xc84adf].hp > _0x1fba72) {
            _0x38ba92 = _0xc84adf;
            _0x1fba72 = comp[_0xc84adf].hp;
          }
        }
        let _0x46bdab = 0;
        let _0x36c29a = 999999999;
        for (let _0x566caa = 0; _0x566caa < 5; _0x566caa++) {
          if (comp[_0x566caa].hp < _0x36c29a) {
            _0x46bdab = _0x566caa;
            _0x36c29a = comp[_0x566caa].hp;
          }
        }
        atbf(comp[_0x38ba92], "방", comp[_0x46bdab], "아머", comp[_0x38ba92].hp * 30, "파자마 파티 스타트~6", 1, always);
        for (let _0x3ac217 of getRoleIdx("디")) {
          atbf(comp[_0x3ac217], "궁", comp[4], "궁추가*", 50, "<파티 주인공>", 1, always);
        }
      };
      _0x23a024.passive = function () {
        atbf(_0x23a024, "궁", all, "힐", myCurAtk + _0x23a024.id + 100, "수줍은 연애 이야기1", 1, always);
        nbf(_0x23a024, "<파티 사회자>", 0, "스릴 넘치는 파티 게임1", getRoleCnt("섶") * 1, 4);
        nbf(_0x23a024, "<파티 참가자>", 0, "스릴 넘치는 파티 게임2", getRoleCnt("디") * 1, 4);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
        for (let _0x4b16d2 of comp);
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10139:
      setMnc(_0x23a024, [520, 5, 550, 5, 580, 5, 610, 5, 640, 5], _0x17c963);
      buff_ex.push("<마법소녀의 힘>");
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            for (let _0x344445 of getElementIdx("광")) {
              nbf(comp[_0x344445], "받속뎀", 10, "마법소녀 초건전 빔1", 1, 1);
            }
            nbf(boss, "받뎀증", 10, "마법소녀 초건전 빔2", 1, 1);
            break;
          case 2:
            for (let _0x3cff12 of getElementIdx("광")) {
              nbf(comp[_0x3cff12], "받속뎀", 15, "마법소녀 초건전 빔1", 1, 1);
            }
            nbf(boss, "받뎀증", 10, "마법소녀 초건전 빔2", 1, 2);
            nbf(all, "공퍼증", 10, "마법소녀 초건전 빔3", 1, 1);
            break;
          case 3:
            for (let _0x47ec78 of getElementIdx("광")) {
              nbf(comp[_0x47ec78], "받속뎀", 20, "마법소녀 초건전 빔1", 1, 1);
            }
            nbf(boss, "받뎀증", 10, "마법소녀 초건전 빔2", 1, 2);
            nbf(all, "공퍼증", 10, "마법소녀 초건전 빔3", 1, 1);
            break;
          case 4:
            for (let _0x222b1e of getElementIdx("광")) {
              nbf(comp[_0x222b1e], "받속뎀", 20, "마법소녀 초건전 빔1", 1, 1);
            }
            nbf(boss, "받뎀증", 10, "마법소녀 초건전 빔2", 1, 2);
            nbf(all, "공퍼증", 10, "마법소녀 초건전 빔3", 1, 1);
            break;
          default:
            for (let _0x865d11 of getElementIdx("광")) {
              nbf(comp[_0x865d11], "받속뎀", 20, "마법소녀 초건전 빔1", 1, 1);
            }
            nbf(boss, "받뎀증", 10, "마법소녀 초건전 빔2", 1, 2);
            nbf(all, "공퍼증", 10, "마법소녀 초건전 빔3", 1, 1);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
        cdChange(_0x23a024, -2);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        let _0x549bb6 = getElementCnt("광", "화");
        if (_0x549bb6 > 4) {
          _0x549bb6 = 4;
        }
        if (_0x549bb6 >= 2) {
          tbf(_0x23a024, "공퍼증", 50, "이것이 바로 우정의 힘1", always);
          tbf(_0x23a024, "가뎀증", 20, "이것이 바로 우정의 힘2", always);
        }
        if (_0x549bb6 >= 3) {
          anbf(_0x23a024, "공격", boss, "받뎀증", 10, "이것이 바로 우정의 힘3", 1, 4, always);
        }
        if (_0x549bb6 >= 4) {
          tbf(_0x23a024, "궁추가*", 120, "이것이 바로 우정의 힘4", always);
        }
        nbf(_0x23a024, "<마법소녀의 힘>", 0, "이것이 바로 우정의 힘", _0x549bb6, 4);
        for (let _0x133355 of getElementIdx("광", "화")) {
          hpUpMe(comp[_0x133355], 30);
          tbf(comp[_0x133355], "공퍼증", 100, "<마법소녀 집결>1", always);
          tbf(comp[_0x133355], "가뎀증", 20, "<마법소녀 집결>2", always);
          tbf(comp[_0x133355], "궁뎀증", 40, "<마법소녀 집결>3", always);
        }
      };
      _0x23a024.passive = function () {
        for (let _0x5e65b1 of getElementIdx("광")) {
          if (getRoleIdx("딜").includes(_0x5e65b1)) {
            if (_0x23a024.id != comp[_0x5e65b1].id) {
              comp[_0x5e65b1].canCDChange = false;
            }
          }
        }
        anbf(_0x23a024, "궁", _0x23a024, "가뎀증", 15, "블링블링 베개 분쇄기", 1, 2, always);
        for (let _0x4fdfdd of getElementIdx("광")) {
          anbf(_0x23a024, "궁", comp[_0x4fdfdd], "받속뎀", 20, "어렴풋이 보여", 1, 1, always);
        }
        tbf(_0x23a024, "궁뎀증", 10, "궁극기+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        if (GLOBAL_TURN == 1) {
          cdChange(_0x23a024, -2);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10140:
      setMnc(_0x23a024, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x17c963);
      buff_ex.push("<강림치>");
      _0x23a024.ultbefore = function () {};
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpMe(_0x23a024, 50);
        tbf(all, "공퍼증", 100, "왜곡 의식1", always);
        tbf(_0x23a024, "궁발동*", 400, "왜곡 의식2", always);
        for (let _0x1f441e = 1; _0x1f441e <= 2; _0x1f441e++) {
          tbf(comp[_0x1f441e], "가뎀증", -300, "<살아있는 제물>1", always);
          atbf(comp[_0x1f441e], "공격", comp[0], "공고증", comp[_0x1f441e].atk * 125, "<살아있는 제물>2", 1, always);
          for (let _0x468236 of getElementIdx("암")) {
            atbf(comp[_0x1f441e], "궁", comp[_0x468236], "받속뎀", 14, "<살아있는 제물>3", 2, always);
          }
          if (getRoleIdx("딜").includes(_0x1f441e)) {
            atbf(comp[_0x1f441e], "행동", comp[0], "궁발동+", comp[0].hp * 100, "<의식 박리>1", 50, 1);
            atbf(comp[_0x1f441e], "행동", comp[0], "궁발동*", 150, "<의식 박리>2", 50, 1);
            atbf(comp[_0x1f441e], "행동", comp[0], "가뎀증", 25, "<의식 박리>3", 50, 1);
          }
          if (getRoleIdx("디").includes(_0x1f441e)) {
            const _0x4f36c2 = comp[_0x1f441e].ultimate;
            comp[_0x1f441e].isFirstTurnActed = false;
            comp[_0x1f441e].ultimate = function (..._0x48fb43) {
              _0x4f36c2.apply(this, _0x48fb43);
              if (!comp[_0x1f441e].isFirstTurnActed) {
                buff(comp[0], "궁", boss, "받뎀증", 45, "<의식 박리>5", 9, 50, "발동", true);
              }
              comp[_0x1f441e].isFirstTurnActed = true;
            };
            const _0x46d53f = comp[_0x1f441e].attack;
            comp[_0x1f441e].attack = function (..._0x500d1a) {
              _0x46d53f.apply(this, _0x500d1a);
              if (!comp[_0x1f441e].isFirstTurnActed) {
                buff(comp[0], "궁", boss, "받뎀증", 45, "<의식 박리>5", 9, 50, "발동", true);
              }
              comp[_0x1f441e].isFirstTurnActed = true;
            };
            const _0xa764ce = comp[_0x1f441e].defense;
            comp[_0x1f441e].defense = function (..._0x32c954) {
              _0xa764ce.apply(this, _0x32c954);
              if (!comp[_0x1f441e].isFirstTurnActed) {
                buff(comp[0], "궁", boss, "받뎀증", 45, "<의식 박리>5", 9, 50, "발동", true);
              }
              comp[_0x1f441e].isFirstTurnActed = true;
            };
            atbf(comp[_0x1f441e], "행동", comp[0], "가뎀증", 25, "<의식 박리>6", 50, 1);
          }
          if (getRoleIdx("탱", "힐", "섶").includes(_0x1f441e)) {
            tbf(comp[_0x1f441e], "공퍼증", -600, "<의식 박리>7", always);
          }
        }
      };
      _0x23a024.passive = function () {
        tbf(all, "궁뎀증", 30, "심연의 관저", always);
        tbf(_0x23a024, "가뎀증", 10, "형언할 수 없는 몸1", always);
        atbf(_0x23a024, "궁", all, "가뎀증", 20, "형언할 수 없는 몸2", 1, always);
        anbf(_0x23a024, "평", _0x23a024, "<강림치>", 0, "<강림 준비>", 1, 10, always);
        anbf(_0x23a024, "궁", _0x23a024, "<강림치>", 0, "<강림 준비>", 3, 10, always);
        buff(_0x23a024, "평", boss, "받뎀증", 5, "<최고 신 강림>1", 3, 9, always, "발동", false);
        buff(_0x23a024, "궁발동+", _0x23a024.hp * 50, "<최고 신 강림>2", always, false);
        tbf(_0x23a024, "가뎀증", 7.5, "데미지+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.check = true;
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        if (buffNestByType(_0x23a024, "<강림치>") >= 10 && _0x23a024.check) {
          setBuffOn(_0x23a024, "발동", "<최고 신 강림>1", true);
          setBuffOn(_0x23a024, "기본", "<최고 신 강림>2", true);
          _0x23a024.check = false;
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10141:
      _0x23a024.stack = 0;
      setMnc(_0x23a024, [120, 6, 139.8, 6, 159.6, 6, 180, 6, 199.8, 6], _0x17c963);
      buff_ex.push("<이성치>", "<이성치>감소X");
      _0x23a024.isSANFix = function () {
        const _0x9d592e = _0x23a024.buff.filter(_0x44a03c => isTurn(_0x44a03c) && _0x44a03c.type == "<이성치>감소X");
        if (_0x9d592e.length > 0) {
          return true;
        } else {
          return false;
        }
      };
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            break;
          case 2:
            break;
          case 3:
            tbf(all, "발효증", 80, "백발백중이다냥!1", 6);
            for (let _0x402a5c of getElementIdx("풍")) {
              tbf(comp[_0x402a5c], "받속뎀", 20, "백발백중이다냥!2", 6);
            }
            break;
          case 4:
            tbf(all, "발효증", 90, "백발백중이다냥!1", 6);
            for (let _0x182ba8 of getElementIdx("풍")) {
              tbf(comp[_0x182ba8], "받속뎀", 25, "백발백중이다냥!2", 6);
            }
            break;
          default:
            tbf(all, "발효증", 100, "백발백중이다냥!1", 6);
            for (let _0x1f7b9e of getElementIdx("풍")) {
              tbf(comp[_0x1f7b9e], "받속뎀", 30, "백발백중이다냥!2", 6);
            }
            break;
        }
      };
      _0x23a024.ultafter = function () {
        switch (_0x17c963) {
          case 1:
            tbf(all, "발효증", 60, "백발백중이다냥!1", 6);
            for (let _0x5262fa of getElementIdx("풍")) {
              tbf(comp[_0x5262fa], "받속뎀", 10, "백발백중이다냥!2", 6);
            }
            break;
          case 2:
            tbf(all, "발효증", 70, "백발백중이다냥!1", 6);
            for (let _0x1fba36 of getElementIdx("풍")) {
              tbf(comp[_0x1fba36], "받속뎀", 15, "백발백중이다냥!2", 6);
            }
            break;
          case 3:
            break;
          case 4:
            break;
          default:
            break;
        }
      };
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024, 6);
        nbf(_0x23a024, "<이성치>", 0, "야옹이 요원 탐험 중", 50, 50);
        _0x23a024.stack = 50;
        setBuffOn(_0x23a024, "기본", "심연 직시3", true);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(20);
        tbf(all, "공퍼증", 50, "심연과의 동행", always);
        tbf(_0x23a024, "공퍼증", 40, "진실 조사1", always);
        tbf(_0x23a024, "가뎀증", 50, "진실 조사2", always);
        tbf(_0x23a024, "공발동*", 100, "진실 조사3", always);
        for (let _0x26ae72 of getElementIdx("풍")) {
          atbf(_0x23a024, "궁", comp[_0x26ae72], "받속뎀", 30, "진실 조사4", 6, always);
        }
      };
      _0x23a024.passive = function () {
        buff(_0x23a024, "발효증", 30, "심연 직시1", always, false);
        buff(_0x23a024, "가뎀증", 20, "심연 직시2", always, false);
        buff(_0x23a024, "공발동*", 100, "심연 직시3", always, false);
        buff(_0x23a024, "공퍼증", 65, "심연 직시4", always, false);
        buff(_0x23a024, "공퍼증", 65, "심연 직시5", always, false);
        tbf(_0x23a024, "궁발동*", 100, "이성치-바보 시저1", always);
        atbf(_0x23a024, "궁", _0x23a024, "on", "기본", "심연 직시1", 1, always);
        atbf(_0x23a024, "궁", _0x23a024, "on", "기본", "심연 직시2", 1, always);
        atbf(_0x23a024, "궁", _0x23a024, "on", "기본", "심연 직시4", 1, always);
        atbf(_0x23a024, "궁", _0x23a024, "on", "기본", "심연 직시5", 1, always);
        atbf(_0x23a024, "궁", _0x23a024, "<이성치>감소X", 0, "이성치-바보 시저2", 4, always);
        tbf(_0x23a024, "발효증", 30, "발동+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (GLOBAL_TURN == 1) {
          cdChange(_0x23a024, _0x23a024.isLeader ? -6 : -3);
        }
        if (GLOBAL_TURN == 1) {
          nbf(_0x23a024, "<이성치>", 0, "야옹이 요원 탐험 중", 50, 50);
          _0x23a024.stack = 50;
        }
        if (_0x23a024.getNest("<이성치>") < 1) {
          nbf(_0x23a024, "<이성치>", 0, "야옹이 요원 탐험 중", 50, 50);
          _0x23a024.stack = 50;
        } else if (GLOBAL_TURN > 1 && !_0x23a024.isSANFix()) {
          nbf(_0x23a024, "<이성치>", 0, "야옹이 요원 탐험 중", -10, 50);
          _0x23a024.stack -= 10;
          if (_0x23a024.stack < 0) {
            _0x23a024.stack = 0;
          }
        }
        setBuffOn(_0x23a024, "기본", "심연 직시1", _0x23a024.stack >= 50);
        setBuffOn(_0x23a024, "기본", "심연 직시2", _0x23a024.stack >= 40);
        setBuffOn(_0x23a024, "기본", "심연 직시3", _0x23a024.stack >= 30);
        setBuffOn(_0x23a024, "기본", "심연 직시4", _0x23a024.stack >= 20);
        setBuffOn(_0x23a024, "기본", "심연 직시5", _0x23a024.stack >= 10);
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10142:
      setMnc(_0x23a024, [200, 4, 200, 4, 200, 4, 200, 4, 200, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(_0x23a024, "일뎀증", 50, "다 함께 수박 깨기~1", 4);
            tbf(_0x23a024, "가뎀증", 20, "다 함께 수박 깨기~2", 4);
            for (let _0x2775c6 of getRoleIdx("딜")) {
              tbf(comp[_0x2775c6], "평추가*", 20, "다 함께 수박 깨기~3", 4);
              atbf(comp[_0x2775c6], "평", _0x23a024, "공퍼증", 10, "다 함께 수박 깨기~3", 1, 4);
            }
            break;
          case 2:
            tbf(_0x23a024, "일뎀증", 70, "다 함께 수박 깨기~1", 4);
            tbf(_0x23a024, "가뎀증", 25, "다 함께 수박 깨기~2", 4);
            for (let _0x1b3616 of getRoleIdx("딜")) {
              tbf(comp[_0x1b3616], "평추가*", 30, "다 함께 수박 깨기~3", 4);
              atbf(comp[_0x1b3616], "평", _0x23a024, "공퍼증", 10, "다 함께 수박 깨기~3", 1, 4);
            }
            break;
          case 3:
            tbf(_0x23a024, "일뎀증", 90, "다 함께 수박 깨기~1", 4);
            tbf(_0x23a024, "가뎀증", 30, "다 함께 수박 깨기~2", 4);
            for (let _0x56464d of getRoleIdx("딜")) {
              tbf(comp[_0x56464d], "평추가*", 30, "다 함께 수박 깨기~3", 4);
              atbf(comp[_0x56464d], "평", _0x23a024, "공퍼증", 20, "다 함께 수박 깨기~3", 1, 4);
            }
            break;
          case 4:
            tbf(_0x23a024, "일뎀증", 110, "다 함께 수박 깨기~1", 4);
            tbf(_0x23a024, "가뎀증", 35, "다 함께 수박 깨기~2", 4);
            for (let _0x3c5750 of getRoleIdx("딜")) {
              tbf(comp[_0x3c5750], "평추가*", 40, "다 함께 수박 깨기~3", 4);
              atbf(comp[_0x3c5750], "평", _0x23a024, "공퍼증", 20, "다 함께 수박 깨기~3", 1, 4);
            }
            break;
          default:
            tbf(_0x23a024, "일뎀증", 130, "다 함께 수박 깨기~1", 4);
            tbf(_0x23a024, "가뎀증", 40, "다 함께 수박 깨기~2", 4);
            for (let _0xc5244c of getRoleIdx("딜")) {
              tbf(comp[_0xc5244c], "평추가*", 60, "다 함께 수박 깨기~3", 4);
              atbf(comp[_0xc5244c], "평", _0x23a024, "공퍼증", 30, "다 함께 수박 깨기~3", 1, 4);
            }
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(40);
        tbf(all, "공퍼증", 50, "발리볼 대회 스타트~", always);
        if (getRoleCnt("딜") >= 3) {
          atbf(_0x23a024, "궁", boss, "받뎀증", 20, "<시합 참여>1", 4, always);
          for (let _0x3bb29b of getRoleIdx("딜")) {
            atbf(_0x23a024, "궁", comp[_0x3bb29b], "가뎀증", 20, "<시합 참여>2", 4, always);
            atbf(_0x23a024, "궁", comp[_0x3bb29b], "일뎀증", 110, "<시합 참여>3", 4, always);
          }
        }
      };
      _0x23a024.passive = function () {
        for (let _0x1e1f44 of getRoleIdx("딜")) {
          atbf(comp[_0x1e1f44], "궁", _0x23a024, "공퍼증", 20, "<머리통 바로잡기>", 4, always);
        }
        anbf(_0x23a024, "궁", boss, "받뎀증", 20, "웨딩드레스 병기 - 힘 강화", 1, 2, always);
        tbf(_0x23a024, "공퍼증", 10, "공격+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        if (GLOBAL_TURN == 1) {
          cdChange(_0x23a024, -4);
        }
        if (GLOBAL_TURN > 1) {
          const _0x1818d4 = getRoleCnt("딜");
          for (let _0x483f85 = 0; _0x483f85 < _0x1818d4; _0x483f85++) {
            tbf(boss, "받일뎀", 30, "<해설 타임>", 1);
          }
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10143:
      setMnc(_0x23a024, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(all, "일뎀증", 30, "여름날의 아름다운 풍경1", 4);
            ptbf(all, "평", all, "힐", 4, "여름날의 아름다운 풍경2", 1, 4);
            tbf(_0x23a024, "평추가*", 60, "여름날의 아름다운 풍경3", 4);
            break;
          case 2:
            tbf(all, "일뎀증", 45, "여름날의 아름다운 풍경1", 4);
            ptbf(all, "평", all, "힐", 4, "여름날의 아름다운 풍경2", 1, 4);
            tbf(_0x23a024, "평추가*", 80, "여름날의 아름다운 풍경3", 4);
            break;
          case 3:
            tbf(all, "일뎀증", 60, "여름날의 아름다운 풍경1", 4);
            ptbf(all, "평", all, "힐", 6, "여름날의 아름다운 풍경2", 1, 4);
            tbf(_0x23a024, "평추가*", 100, "여름날의 아름다운 풍경3", 4);
            tbf(_0x23a024, "공퍼증", 30, "여름날의 아름다운 풍경4", 4);
            break;
          case 4:
            tbf(all, "일뎀증", 75, "여름날의 아름다운 풍경1", 4);
            ptbf(all, "평", all, "힐", 6, "여름날의 아름다운 풍경2", 1, 4);
            tbf(_0x23a024, "평추가*", 120, "여름날의 아름다운 풍경3", 4);
            tbf(_0x23a024, "공퍼증", 60, "여름날의 아름다운 풍경4", 4);
            break;
          default:
            tbf(all, "일뎀증", 90, "여름날의 아름다운 풍경1", 4);
            ptbf(all, "평", all, "힐", 10, "여름날의 아름다운 풍경2", 1, 4);
            tbf(_0x23a024, "평추가*", 140, "여름날의 아름다운 풍경3", 4);
            tbf(_0x23a024, "공퍼증", 90, "여름날의 아름다운 풍경4", 4);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(30);
        if (getRoKind() == 3) {
          tbf(all, "공퍼증", 100, "<엘프 여왕의 여름 나기>1", always);
          tbf(all, "일뎀증", 110, "<엘프 여왕의 여름 나기>2", always);
          tbf(all, "가뎀증", 20, "<엘프 여왕의 여름 나기>3", always);
          tbf(all, "평추가*", 30, "<엘프 여왕의 여름 나기>4", always);
        }
      };
      _0x23a024.passive = function () {
        tbf(_0x23a024, "공퍼증", 30, "우아한 발걸음1", always);
        atbf(_0x23a024, "궁", all, "아머", _0x23a024.hp * 25, "파라솔을 펴다", 1, always);
        tbf(_0x23a024, "공퍼증", 10, "공격+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        if (GLOBAL_TURN == 9) {
          tbf(boss, "받뎀증", 50, "웨딩드레스 병기 - 마력 강화", 50);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10144:
      setMnc(_0x23a024, [295, 4, 364, 4, 433, 4, 502, 4, 571, 4], _0x17c963);
      _0x23a024.ultbefore = function () {};
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        switch (_0x17c963) {
          case 1:
            _0x23a024.hpUltDmg = _0x23a024.hp * 89;
            break;
          case 2:
            _0x23a024.hpUltDmg = _0x23a024.hp * 107;
            break;
          case 3:
            _0x23a024.hpUltDmg = _0x23a024.hp * 125;
            break;
          case 4:
            _0x23a024.hpUltDmg = _0x23a024.hp * 143;
            break;
          default:
            _0x23a024.hpUltDmg = _0x23a024.hp * 161;
            break;
        }
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        _0x23a024.hpAtkDmg = _0x23a024.hp * 50;
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(20);
        hpUpMe(_0x23a024, 20);
        tbf(all, "공퍼증", 50, "바다의 군림자!1", always);
        nbf(_0x23a024, "공퍼증", 5, "웨딩드레스 병기 - 에너지 섭취1", 20, 20);
        nbf(_0x23a024, "받캐뎀", 4, "웨딩드레스 병기 - 에너지 섭취2", 15, 15);
        nbf(_0x23a024, "가뎀증", 20, "웨딩드레스 병기 - 에너지 섭취3", 4, 4);
        for (let _0x3af926 of comp) {
          if (_0x3af926.id == _0x23a024.id) {
            continue;
          }
          atbf(_0x3af926, "방", boss, "받뎀증", 9, "여름날 마왕의 위엄", 2, always);
          atbf(_0x3af926, "궁", boss, "받뎀증", 9, "여름날 마왕의 위엄", 2, always);
          atbf(_0x3af926, "방", comp[0], "공고증", _0x3af926.atk * 75, "여름날 마왕의 위엄", 1, always);
          atbf(_0x3af926, "궁", comp[0], "공고증", _0x3af926.atk * 75, "여름날 마왕의 위엄", 1, always);
        }
      };
      _0x23a024.passive = function () {
        tbf(_0x23a024, "공퍼증", 50, "마왕 바다 가르기1", always);
        tbf(_0x23a024, "궁뎀증", 30, "마왕 바다 가르기2", always);
        anbf(_0x23a024, "평", _0x23a024, "받캐뎀", 4, "웨딩드레스 병기 - 에너지 섭취2", 1, 15, always);
        anbf(_0x23a024, "궁", _0x23a024, "가뎀증", 20, "웨딩드레스 병기 - 에너지 섭취3", 1, 4, always);
        tbf(_0x23a024, "궁추가*", 150, "웨딩드레스 병기 - 연산 공유", always);
        tbf(_0x23a024, "공퍼증", 10, "공격+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        if (GLOBAL_TURN > 1) {
          for (let _0x130190 of comp) {
            tbf(_0x130190, "공고증", myCurAtk + _0x23a024.id + 5, "웨딩드레스 병기 - 연산 공유2", 1);
          }
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
        nbf(_0x23a024, "공퍼증", 5, "웨딩드레스 병기 - 에너지 섭취1", 1, 20);
      };
      return _0x23a024;
    case 10145:
      setMnc(_0x23a024, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            break;
          case 2:
            break;
          case 3:
            tbf(all, "공고증", _0x23a024.hp * 7.5, "피비린내1", 5);
            break;
          case 4:
            tbf(all, "공고증", _0x23a024.hp * 8.75, "피비린내1", 5);
            break;
          default:
            tbf(all, "공고증", _0x23a024.hp * 10, "피비린내1", 5);
            break;
        }
      };
      _0x23a024.ultafter = function () {
        switch (_0x17c963) {
          case 1:
            tbf(all, "공고증", _0x23a024.hp * 5, "피비린내1", 5);
            break;
          case 2:
            tbf(all, "공고증", _0x23a024.hp * 6.25, "피비린내1", 5);
            break;
          case 3:
            tbf(all, "아머", _0x23a024.hp * 25 * armorUp(_0x23a024, "궁", "추가"), "피비린내2", 2);
            break;
          case 4:
            tbf(all, "아머", _0x23a024.hp * 25 * armorUp(_0x23a024, "궁", "추가"), "피비린내2", 2);
            break;
          default:
            tbf(all, "아머", _0x23a024.hp * 25 * armorUp(_0x23a024, "궁", "추가"), "피비린내2", 2);
            break;
        }
        _0x23a024.hit();
      };
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {
        _0x23a024.hit();
      };
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(40);
        tbf(all, "공퍼증", 70, "마계의 낚시 마스터1", always);
        tbf(all, "일뎀증", 60, "마계의 낚시 마스터2", always);
        tbf(all, "궁뎀증", 20, "마계의 낚시 마스터3", always);
        atbf(_0x23a024, "공격", all, "공고증", _0x23a024.hp * 5, "마계의 낚시 마스터4", 2, always);
        anbf(_0x23a024, "피격", all, "가뎀증", 1.33, "<걸려들었다>1", 1, 15, always);
        anbf(_0x23a024, "피격", boss, "받뎀증", 1.33, "<걸려들었다>2", 1, 15, always);
      };
      _0x23a024.passive = function () {
        anbf(_0x23a024, "평", all, "일뎀증", 5, "피로 묻는 안부2", 1, 10, always);
        anbf(_0x23a024, "궁", all, "궁뎀증", 10, "피로 묻는 안부4", 1, 3, always);
        anbf(_0x23a024, "피격", all, "가뎀증", 1.33, "학살 욕망", 1, 15, always);
        anbf(_0x23a024, "피격", boss, "받뎀증", 1.33, "웨딩드레스 병기 - 장애 식별", 1, 15, always);
        tbf(_0x23a024, "가뎀증", 7.5, "데미지+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10146:
      _0x23a024.stack = 0;
      setMnc(_0x23a024, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x17c963);
      buff_ex.push("<잡념 떨치기>");
      _0x23a024.ultbefore = function () {
        nbf(_0x23a024, "일뎀증", -150, "이도류 오의 - 절멸참1", 1, 1);
        switch (_0x17c963) {
          case 1:
            nbf(_0x23a024, "궁뎀증", 60, "이도류 오의 - 절멸참2", 1, 1);
            for (let _0x325da6 of getElementIdx("암")) {
              nbf(comp[_0x325da6], "받속뎀", 10, "이도류 오의 - 절멸참3", 1, 1);
            }
            break;
          case 2:
            nbf(_0x23a024, "궁뎀증", 70, "이도류 오의 - 절멸참2", 1, 1);
            for (let _0x536fbc of getElementIdx("암")) {
              nbf(comp[_0x536fbc], "받속뎀", 15, "이도류 오의 - 절멸참3", 1, 1);
            }
            break;
          case 3:
            nbf(_0x23a024, "궁뎀증", 80, "이도류 오의 - 절멸참2", 1, 1);
            for (let _0x55a0c1 of getElementIdx("암")) {
              nbf(comp[_0x55a0c1], "받속뎀", 20, "이도류 오의 - 절멸참3", 1, 1);
            }
            break;
          case 4:
            nbf(_0x23a024, "궁뎀증", 90, "이도류 오의 - 절멸참2", 1, 1);
            for (let _0x32be4b of getElementIdx("암")) {
              nbf(comp[_0x32be4b], "받속뎀", 30, "이도류 오의 - 절멸참3", 1, 1);
            }
            break;
          default:
            nbf(_0x23a024, "궁뎀증", 100, "이도류 오의 - 절멸참2", 1, 1);
            for (let _0x4c15e2 of getElementIdx("암")) {
              nbf(comp[_0x4c15e2], "받속뎀", 40, "이도류 오의 - 절멸참3", 1, 1);
            }
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(30);
        tbf(all, "공퍼증", 50, "편집광1", always);
        tbf(_0x23a024, "궁추가*", 80, "편집광2", always);
        for (let _0x4b4b18 of getRoleIdx("딜", "디")) {
          tbf(all, "공고증", comp[_0x4b4b18].atk * 10, "<궁극의 무도>1", 50);
        }
      };
      _0x23a024.passive = function () {
        anbf(_0x23a024, "평", _0x23a024, "공퍼증", 40, "<정신통일>", 1, 2, always);
        atbf(_0x23a024, "궁", _0x23a024, "제거", "기본", "<정신통일>", 1, always);
        tbf(_0x23a024, "가뎀증", 15, "침착한 마음1", always);
        for (let _0x14ffda of getRoleIdx("딜", "디")) {
          if (comp[_0x14ffda].id != _0x23a024.id) {
            tbf(comp[_0x14ffda], "가뎀증", 15, "침착한 마음2", 50);
            tbf(_0x23a024, "가뎀증", 15, "침착한 마음2", 50);
          }
        }
        buff(_0x23a024, "궁추가*", 220, "공명정대2", always, false);
        tbf(_0x23a024, "공퍼증", 10, "공격+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {
          for (let _0x52710e of getRoleIdx("딜", "디")) {
            if (GLOBAL_TURN == 5) {
              nbf(comp[_0x52710e], "궁뎀증", 50, "<궁극의 무도>2", 1, 1);
            }
            if (GLOBAL_TURN == 9) {
              nbf(boss, "받뎀증", 33, "<궁극의 무도>3", 1, 3);
            }
          }
        }
        if (GLOBAL_TURN > 1 && _0x23a024.stack < 8) {
          nbf(_0x23a024, "<잡념 떨치기>", 0, "공명정대1", 1, 8);
          if (_0x23a024.stack == 7) {
            setBuffOn(_0x23a024, "기본", "공명정대2", true);
          }
          _0x23a024.stack++;
          if (_0x23a024.stack > 8) {
            _0x23a024.stack = 8;
          }
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10147:
      setMnc(_0x23a024, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            break;
          case 2:
            break;
          case 3:
            for (let _0x336191 of getElementIdx("풍", "광")) {
              tbf(comp[_0x336191], "받속뎀", 40, "널 요리해 버리는 수밖에!1", 2);
            }
            tbf(boss, "받뎀증", 15, "널 요리해 버리는 수밖에!2", 2);
            break;
          case 4:
            for (let _0x5a4296 of getElementIdx("풍", "광")) {
              tbf(comp[_0x5a4296], "받속뎀", 45, "널 요리해 버리는 수밖에!1", 2);
            }
            tbf(boss, "받뎀증", 15, "널 요리해 버리는 수밖에!2", 2);
            break;
          default:
            for (let _0x18450c of getElementIdx("풍", "광")) {
              tbf(comp[_0x18450c], "받속뎀", 50, "널 요리해 버리는 수밖에!1", 2);
            }
            tbf(boss, "받뎀증", 15, "널 요리해 버리는 수밖에!2", 2);
            break;
        }
      };
      _0x23a024.ultafter = function () {
        switch (_0x17c963) {
          case 1:
            for (let _0x4dcd69 of getElementIdx("풍", "광")) {
              tbf(comp[_0x4dcd69], "받속뎀", 30, "널 요리해 버리는 수밖에!1", 2);
            }
            break;
          case 2:
            for (let _0x50444f of getElementIdx("풍", "광")) {
              tbf(comp[_0x50444f], "받속뎀", 35, "널 요리해 버리는 수밖에!1", 2);
            }
            break;
          case 3:
            break;
          case 4:
            break;
          default:
            break;
        }
      };
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
        if (_0x23a024.isLeader) {
          for (let _0x29057e of comp) {
            if (_0x29057e.id != _0x23a024.id) {
              for (let _0x51bff8 of comp) {
                if (_0x51bff8.id != _0x29057e.id) {
                  atbf(_0x29057e, "행동", _0x51bff8, "제거", "기본", "<특제-마물요리>", 1, 2);
                }
              }
            }
          }
          for (let _0x2d111c of comp) {
            if (_0x2d111c.id != _0x23a024.id) {
              for (let _0x38507b of comp) {
                if (_0x38507b.id != _0x23a024.id) {
                  atbf(_0x2d111c, "행동", _0x38507b, "제거", "발동", "<특제-마물요리>", 1, 2);
                }
              }
            }
          }
        }
        for (let _0x146ee1 of comp) {
          if (_0x146ee1.id != _0x23a024.id) {
            for (let _0x7b52aa of comp) {
              if (_0x7b52aa.id != _0x146ee1.id) {
                atbf(_0x146ee1, "행동", _0x7b52aa, "제거", "기본", "<즐거운 만찬>", 1, 2);
              }
            }
          }
        }
        for (let _0x37a288 of comp) {
          if (_0x37a288.id != _0x23a024.id) {
            for (let _0x15c289 of comp) {
              if (_0x15c289.id != _0x23a024.id) {
                atbf(_0x37a288, "행동", _0x15c289, "제거", "발동", "<즐거운 만찬>", 1, 2);
              }
            }
          }
        }
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(40);
        tbf(all, "공퍼증", 50, "마물 요리 셰프", always);
        tbf(_0x23a024, "공퍼증", 100, "<모두 어서 먹어보라니까!>1", always);
        tbf(_0x23a024, "가뎀증", 50, "<모두 어서 먹어보라니까!>2", always);
        tbf(_0x23a024, "궁뎀증", 100, "<모두 어서 먹어보라니까!>3", always);
        tbf(_0x23a024, "일뎀증", 100, "<모두 어서 먹어보라니까!>4", always);
        for (let _0x58f0da of comp) {
          if (_0x58f0da.id != _0x23a024.id) {
            atbf(_0x23a024, "궁", _0x58f0da, "공퍼증", 100, "<특제-마물요리>", 2, always);
            atbf(_0x23a024, "궁", _0x58f0da, "가뎀증", 30, "<특제-마물요리>", 2, always);
            atbf(_0x23a024, "궁", _0x58f0da, "궁뎀증", 50, "<특제-마물요리>", 1, always);
            atbf(_0x23a024, "궁", _0x58f0da, "일뎀증", 100, "<특제-마물요리>", 2, always);
          }
        }
      };
      _0x23a024.passive = function () {
        for (let _0x42db8f of comp) {
          if (_0x42db8f.id != _0x23a024.id) {
            atbf(_0x23a024, "궁", _0x42db8f, "공퍼증", 100, "<즐거운 만찬>", 2, always);
            atbf(_0x23a024, "궁", _0x42db8f, "일뎀증", 100, "<즐거운 만찬>", 2, always);
          }
        }
        atbf(comp[1], "궁", boss, "받궁뎀", 100, "칼질 지도1", 1, always);
        tbf(_0x23a024, "공퍼증", 10, "공격+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10148:
      setMnc(_0x23a024, [100, 4, 125, 4, 150, 4, 175, 4, 200, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            for (let _0x1bfbb4 of getElementIdx("수")) {
              nbf(comp[_0x1bfbb4], "받속뎀", 10, "시즈카는 놀러가야지~1", 1, 2);
            }
            tbf(_0x23a024, "평추가*", 110, "시즈카는 놀러가야지~2", 4);
            break;
          case 2:
            for (let _0x5e7341 of getElementIdx("수")) {
              nbf(comp[_0x5e7341], "받속뎀", 12.5, "시즈카는 놀러가야지~1", 1, 2);
            }
            tbf(_0x23a024, "평추가*", 125, "시즈카는 놀러가야지~2", 4);
            break;
          case 3:
            for (let _0x174366 of getElementIdx("수")) {
              nbf(comp[_0x174366], "받속뎀", 15, "시즈카는 놀러가야지~1", 1, 2);
            }
            tbf(_0x23a024, "평추가*", 140, "시즈카는 놀러가야지~2", 4);
            break;
          case 4:
            for (let _0x24be15 of getElementIdx("수")) {
              nbf(comp[_0x24be15], "받속뎀", 17.5, "시즈카는 놀러가야지~1", 1, 2);
            }
            tbf(_0x23a024, "평추가*", 155, "시즈카는 놀러가야지~2", 4);
            break;
          default:
            for (let _0xf109b8 of getElementIdx("수")) {
              nbf(comp[_0xf109b8], "받속뎀", 20, "시즈카는 놀러가야지~1", 1, 2);
            }
            tbf(_0x23a024, "평추가*", 170, "시즈카는 놀러가야지~2", 4);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(40);
        tbf(all, "공퍼증", 50, "요호 탐험대 출발!", always);
        for (let _0x15e5d5 of getRoleIdx("딜", "디")) {
          if (getRoleCnt("힐") >= 2) {
            ptbf(comp[_0x15e5d5], "평", all, "힐", 10, "<한잔해~>", 1, always);
          }
        }
        for (let _0x43ca33 of getRoleIdx("힐")) {
          if (getRoleCnt("힐") >= 2) {
            tbf(comp[_0x43ca33], "가뎀증", 30, "<말썽꾸러기 요호>1", always);
            tbf(comp[_0x43ca33], "일뎀증", 60, "<말썽꾸러기 요호>2", always);
            tbf(comp[_0x43ca33], "평추가*", 100, "<말썽꾸러기 요호>3", always);
            atbf(comp[_0x43ca33], "공격", comp[0], "평추가*", 25, "<장난칠 시간>1", 1, always);
            atbf(comp[_0x43ca33], "공격", all, "가뎀증", 5, "<장난칠 시간>2", 4, always);
            atbf(comp[_0x43ca33], "공격", all, "일뎀증", 6.25, "<장난칠 시간>3", 4, always);
          }
        }
      };
      _0x23a024.passive = function () {
        for (let _0x4dca3d of getRoleIdx("딜", "디")) {
          atbf(_0x23a024, "힐", comp[_0x4dca3d], "공퍼증", 2.5, "활발하고 귀여운 요호", 4, always);
        }
        anbf(_0x23a024, "공격", _0x23a024, "일뎀증", 10, "우선 한잔해", 1, 10, always);
        for (let _0x3c0873 of getRoleIdx("힐")) {
          for (let _0x2ded14 of getRoleIdx("딜", "디")) {
            atbf(comp[_0x3c0873], "공격", comp[_0x2ded14], "가뎀증", 10, "<주문하신 술 나왔습니다>1", 1, always);
            atbf(comp[_0x3c0873], "공격", comp[_0x2ded14], "평추가*", 10, "<주문하신 술 나왔습니다>2", 1, always);
          }
        }
        tbf(_0x23a024, "일뎀증", 10, "일반 공격 데미지+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        if (GLOBAL_TURN == 1) {
          for (let _0x405182 of getRoleIdx("힐")) {
            cdChange(comp[_0x405182], -4);
          }
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10149:
      setMnc(_0x23a024, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            for (let _0x27c26a of getElementIdx("화")) {
              tbf(comp[_0x27c26a], "궁뎀증", 20, "천호요화1", 4);
            }
            for (let _0x2d63d6 of getRoleIdx("디")) {
              tbf(comp[_0x2d63d6], "가뎀증", 15, "천호요화2", 4);
            }
            break;
          case 2:
            for (let _0x233fb6 of getElementIdx("화")) {
              tbf(comp[_0x233fb6], "궁뎀증", 30, "천호요화1", 4);
            }
            for (let _0x10943f of getRoleIdx("디")) {
              tbf(comp[_0x10943f], "가뎀증", 20, "천호요화2", 4);
            }
            break;
          case 3:
            for (let _0x55bec3 of getElementIdx("화")) {
              tbf(comp[_0x55bec3], "궁뎀증", 40, "천호요화1", 4);
            }
            for (let _0x3bed57 of getRoleIdx("디")) {
              tbf(comp[_0x3bed57], "가뎀증", 30, "천호요화2", 4);
            }
            break;
          case 4:
            for (let _0x7591fb of getElementIdx("화")) {
              tbf(comp[_0x7591fb], "궁뎀증", 50, "천호요화1", 4);
            }
            for (let _0x330832 of getRoleIdx("디")) {
              tbf(comp[_0x330832], "가뎀증", 40, "천호요화2", 4);
            }
            break;
          default:
            for (let _0x2339e0 of getElementIdx("화")) {
              tbf(comp[_0x2339e0], "궁뎀증", 60, "천호요화1", 4);
            }
            for (let _0x124e02 of getRoleIdx("디")) {
              tbf(comp[_0x124e02], "가뎀증", 50, "천호요화2", 4);
            }
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(30);
        tbf(all, "공퍼증", 40, "옥면과 은빛 꼬리의 구미호1", always);
        for (let _0x49c393 of getRoleIdx("디")) {
          comp[_0x49c393].canCDChange = false;
        }
        for (let _0x32d636 of getElementIdx("화")) {
          anbf(_0x23a024, "궁", comp[_0x32d636], "받속뎀", 100, "옥면과 은빛 꼬리의 구미호2", 1, 1, always);
        }
        for (let _0x262eac of getRoleIdx("디")) {
          anbf(_0x23a024, "궁", comp[_0x262eac], "받직뎀", 50, "옥면과 은빛 꼬리의 구미호3", 1, 2, always);
        }
        for (let _0x51081d of getRoleIdx("디")) {
          atbf(comp[_0x51081d], "방", comp[_0x51081d], "공퍼증", 50, "<요술달인>1", 2, always);
          atbf(comp[_0x51081d], "방", comp[_0x51081d], "궁뎀증", 60, "<요술달인>2", 2, always);
          atbf(comp[_0x51081d], "방", comp[_0x51081d], "궁추가*", 100, "<요술달인>3", 2, always);
        }
        if (getElementCnt("화") >= 2) {
          tbf(all, "공퍼증", -250, "<과열>1", always);
          tbf(all, "궁뎀증", -250, "<과열>2", always);
        }
      };
      _0x23a024.passive = function () {
        atbf(_0x23a024, "궁", _0x23a024, "힐", 75, "나이는 비밀~", 1, always);
        anbf(_0x23a024, "궁", boss, "받뎀증", 30, "장난 전문가", 1, 2, always);
        tbf(_0x23a024, "공퍼증", 10, "공격+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 4 == 0) {
          tbf(_0x23a024, "공고증", myCurAtk + _0x23a024.id + 60, "살짝 놀리기만 하면 돼", 1);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10044:
      setMnc(_0x23a024, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            for (let _0xa0804a of comp) {
              buff(_0xa0804a, "궁", _0xa0804a, "궁뎀증", 20, "운명을 엿보는 자1", 1, 2, 1, "발동", false);
            }
            for (let _0x5d128d of comp) {
              anbf(_0x5d128d, "평", _0x5d128d, "일뎀증", 20, "운명을 엿보는 자2", 1, 2, 2);
            }
            tbf(all, "가뎀증", 10, "운명을 엿보는 자3", 2);
            break;
          case 2:
            for (let _0x45fa80 of comp) {
              buff(_0x45fa80, "궁", _0x45fa80, "궁뎀증", 22.5, "운명을 엿보는 자1", 1, 2, 1, "발동", false);
            }
            for (let _0x1ef61d of comp) {
              anbf(_0x1ef61d, "평", _0x1ef61d, "일뎀증", 25, "운명을 엿보는 자2", 1, 2, 2);
            }
            tbf(all, "가뎀증", 10, "운명을 엿보는 자3", 2);
            break;
          case 3:
            for (let _0x162644 of comp) {
              buff(_0x162644, "궁", _0x162644, "궁뎀증", 25, "운명을 엿보는 자1", 1, 2, 1, "발동", false);
            }
            for (let _0x3cc510 of comp) {
              anbf(_0x3cc510, "평", _0x3cc510, "일뎀증", 30, "운명을 엿보는 자2", 1, 2, 2);
            }
            tbf(all, "가뎀증", 15, "운명을 엿보는 자3", 2);
            break;
          case 4:
            for (let _0x56b5e8 of comp) {
              buff(_0x56b5e8, "궁", _0x56b5e8, "궁뎀증", 27.5, "운명을 엿보는 자1", 1, 2, 1, "발동", false);
            }
            for (let _0x2d3d10 of comp) {
              anbf(_0x2d3d10, "평", _0x2d3d10, "일뎀증", 35, "운명을 엿보는 자2", 1, 2, 2);
            }
            tbf(all, "가뎀증", 15, "운명을 엿보는 자3", 2);
            break;
          default:
            for (let _0x208803 of comp) {
              buff(_0x208803, "궁", _0x208803, "궁뎀증", 30, "운명을 엿보는 자1", 1, 2, 1, "발동", false);
            }
            for (let _0x1b2ae5 of comp) {
              anbf(_0x1b2ae5, "평", _0x1b2ae5, "일뎀증", 40, "운명을 엿보는 자2", 1, 2, 2);
            }
            tbf(all, "가뎀증", 20, "운명을 엿보는 자3", 2);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
        for (let _0x233975 of comp) {
          setBuffOn(_0x233975, "발동", "운명을 엿보는 자1", true);
        }
      };
      _0x23a024.atkbefore = function () {
        tbf(all, "공고증", myCurAtk + _0x23a024.id + 30, "점술", 1);
      };
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(30);
        tbf(all, "궁뎀증", 20, "고독한 점술사1", always);
        tbf(all, "일뎀증", 30, "고독한 점술사2", always);
        tbf(_0x23a024, "공퍼증", 350, "고독한 점술사3", always);
        for (let _0x27bc2f of comp) {
          if (_0x23a024.id != _0x27bc2f.id) {
            atbf(_0x23a024, "궁", _0x27bc2f, "궁추가*", 100, "고독한 점술사4", 1, always);
          }
        }
        for (let _0xa680fe of comp) {
          if (_0x23a024.id != _0xa680fe.id) {
            atbf(_0x23a024, "궁", _0xa680fe, "평추가*", 25, "고독한 점술사5", 2, always);
          }
        }
        if (getRoleCnt("딜") >= 2) {
          tbf(_0x23a024, "공퍼증", -350, "<운명 간섭>", always);
        }
        if (getRoleCnt("탱") >= 2) {
          tbf(_0x23a024, "공퍼증", -350, "<운명 간섭>", always);
        }
        if (getRoleCnt("힐") >= 2) {
          tbf(_0x23a024, "공퍼증", -350, "<운명 간섭>", always);
        }
        if (getRoleCnt("섶") >= 2) {
          tbf(_0x23a024, "공퍼증", -350, "<운명 간섭>", always);
        }
        if (getRoleCnt("디") >= 2) {
          tbf(_0x23a024, "공퍼증", -350, "<운명 간섭>", always);
        }
      };
      _0x23a024.passive = function () {
        atbf(_0x23a024, "궁", all, "공고증", myCurAtk + _0x23a024.id + 30, "길흉을 가리다", 1, always);
        anbf(_0x23a024, "방", _0x23a024, "공퍼증", 30, "운명의 그물1", 1, 3, always);
        tbf(_0x23a024, "공퍼증", 10, "공격+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {
          if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 4 == 0) {
            for (let _0x43857d of getElementIdx("화", "수", "풍", "광", "암")) {
              tbf(comp[_0x43857d], "받속뎀", 70, "고독한 점술사6", 2);
            }
          }
        }
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 4 == 0) {
          tbf(boss, "받뎀증", 25, "미래 선택", 2);
        }
        if (GLOBAL_TURN > 1) {
          tbf(all, "공고증", myCurAtk + _0x23a024.id + 5, "운명의 그물2", 1);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10150:
      setMnc(_0x23a024, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            for (let _0x2ed142 of getElementIdx("광")) {
              nbf(comp[_0x2ed142], "가뎀증", 10, "무한 666666", 1, 2);
            }
            break;
          case 2:
            for (let _0x2a9c4a of getElementIdx("광")) {
              nbf(comp[_0x2a9c4a], "가뎀증", 10, "무한 666666", 1, 2);
            }
            break;
          case 3:
            for (let _0x4e7b8c of getElementIdx("광")) {
              nbf(comp[_0x4e7b8c], "가뎀증", 15, "무한 666666", 1, 2);
            }
            break;
          case 4:
            for (let _0x2e7842 of getElementIdx("광")) {
              nbf(comp[_0x2e7842], "가뎀증", 15, "무한 666666", 1, 2);
            }
            break;
          default:
            for (let _0x5cd261 of getElementIdx("광")) {
              nbf(comp[_0x5cd261], "가뎀증", 20, "무한 666666", 1, 2);
            }
            break;
        }
      };
      _0x23a024.ultafter = function () {
        switch (_0x17c963) {
          case 1:
            tbf(_0x23a024, "평추가*", 50, "무한 666666", 4);
            break;
          case 2:
            tbf(_0x23a024, "평추가*", 57, "무한 666666", 4);
            break;
          case 3:
            tbf(_0x23a024, "평추가*", 65, "무한 666666", 4);
            break;
          case 4:
            tbf(_0x23a024, "평추가*", 72, "무한 666666", 4);
            break;
          default:
            tbf(_0x23a024, "평추가*", 80, "무한 666666", 4);
            break;
        }
      };
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(40);
        tbf(all, "공퍼증", 80, "엔터테인먼트 시티의 용자 딜러1", always);
        if (getElementCnt("광") >= 4) {
          tbf(_0x23a024, "궁뎀증", 40, "<섹시 딜러의 서비스>1", always);
          tbf(_0x23a024, "궁추가*", 66.6, "<섹시 딜러의 서비스>2", always);
        }
        if (getElementCnt("광") >= 4) {
          for (let _0x45b965 of getElementIdx("광")) {
            comp[_0x45b965].canCDChange = false;
            tbf(comp[_0x45b965], "속상감", 100, "<타짜 입장>0", always);
            tbf(comp[_0x45b965], "가뎀증", 30, "<타짜 입장>1", always);
            tbf(comp[_0x45b965], "일뎀증", 50, "<타짜 입장>2", always);
            tbf(comp[_0x45b965], "평추가*", 18, "<타짜 입장>3", always);
            anbf(comp[_0x45b965], "공격", boss, "받뎀증", 0.4, "<타짜 입장>4", 1, 50, always);
            for (let _0x2d6390 of getElementIdx("광")) {
              anbf(comp[_0x45b965], "공격", comp[_0x2d6390], "받속뎀", 0.6, "<타짜 입장>5", 1, 50, always);
            }
          }
        }
      };
      _0x23a024.passive = function () {
        _0x23a024.canCDChange = false;
        tbf(_0x23a024, "공퍼증", 50, "날카로운 청각1", always);
        for (let _0x5a1e89 of getElementIdx("광")) {
          tbf(comp[_0x5a1e89], "공퍼증", 30, "날카로운 청각2", always);
        }
        tbf(_0x23a024, "일뎀증", 30, "용자의 가호1", always);
        for (let _0x298bf0 of getElementIdx("광")) {
          if (comp[_0x298bf0].id != _0x23a024.id) {
            atbf(_0x23a024, "평", comp[_0x298bf0], "일뎀증", 40, "용자의 가호2", 1, always);
          }
        }
        for (let _0x42807c of getElementIdx("광")) {
          if (comp[_0x42807c].id != _0x23a024.id) {
            atbf(comp[_0x42807c], "궁", _0x23a024, "가뎀증", 6.66, "<손은 눈보다 빠르다>1", 4, always);
            atbf(comp[_0x42807c], "궁", _0x23a024, "궁뎀증", 18, "<손은 눈보다 빠르다>2", 1, always);
            atbf(comp[_0x42807c], "궁", _0x23a024, "궁추가*", 25, "<손은 눈보다 빠르다>3", 1, always);
          }
        }
        tbf(_0x23a024, "가뎀증", 7.5, "가하는 데미지+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {
          if (getElementCnt("광") >= 4) {
            if (GLOBAL_TURN == 1 && boss.element != undefined && boss.element == 4) {
              for (let _0x5ebab7 of getElementIdx("광")) {
                tbf(comp[_0x5ebab7], "받속뎀", 50, "<섹시 딜러의 서비스>0", 50);
              }
            }
          }
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10151:
      setMnc(_0x23a024, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(boss, "받뎀증", 30, "머저리들, 전부 날려주마!1", 4);
            tbf(all, "궁추가*", 30, "머저리들, 전부 날려주마!2", 1);
            tbf(all, "평추가*", 20, "머저리들, 전부 날려주마!3", 4);
            break;
          case 2:
            tbf(boss, "받뎀증", 30, "머저리들, 전부 날려주마!1", 4);
            tbf(all, "궁추가*", 40, "머저리들, 전부 날려주마!2", 1);
            tbf(all, "평추가*", 22.5, "머저리들, 전부 날려주마!3", 4);
            break;
          case 3:
            tbf(boss, "받뎀증", 40, "머저리들, 전부 날려주마!1", 4);
            tbf(all, "궁추가*", 40, "머저리들, 전부 날려주마!2", 1);
            tbf(all, "평추가*", 25, "머저리들, 전부 날려주마!3", 4);
            break;
          case 4:
            tbf(boss, "받뎀증", 40, "머저리들, 전부 날려주마!1", 4);
            tbf(all, "궁추가*", 50, "머저리들, 전부 날려주마!2", 1);
            tbf(all, "평추가*", 27.5, "머저리들, 전부 날려주마!3", 4);
            break;
          default:
            tbf(boss, "받뎀증", 50, "머저리들, 전부 날려주마!1", 4);
            tbf(all, "궁추가*", 60, "머저리들, 전부 날려주마!2", 1);
            tbf(all, "평추가*", 30, "머저리들, 전부 날려주마!3", 4);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {
        tbf(all, "공퍼증", 50, "종업원의 분노", 1);
      };
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(40);
        tbf(all, "공퍼증", 40, "엔터테인먼트 시티의 마왕 경리1", always);
        for (let _0x35f782 of getRoleIdx("딜")) {
          comp[_0x35f782].canCDChange = false;
        }
        const _0x450424 = getElKind();
        if (_0x450424 == 2) {
          for (let _0x320e97 of getElementIdx("풍")) {
            nbf(all, "공퍼증", 25, "<이 몸은 운에 기대지 않아>1", 1, 3);
            nbf(all, "궁뎀증", 25, "<이 몸은 운에 기대지 않아>2", 1, 3);
            for (let _0x11a077 of getRoleIdx("딜")) {
              tbf(comp[_0x11a077], "궁추가*", 25, "<이 몸은 운에 기대지 않아>3", 50);
            }
          }
        }
        if (_0x450424 == 2) {
          for (let _0x59191a of getElementIdx("광")) {
            nbf(all, "가뎀증", 15, "<압도적인 실력>1", 1, 3);
            nbf(all, "일뎀증", 35, "<압도적인 실력>2", 1, 3);
            for (let _0x4256f6 of getRoleIdx("딜")) {
              tbf(comp[_0x4256f6], "평추가*", 20, "<압도적인 실력>3", 50);
            }
          }
        }
      };
      _0x23a024.passive = function () {
        _0x23a024.canCDChange = false;
        atbf(_0x23a024, "평", all, "일뎀증", 30, "무례한 녀석", 1, always);
        atbf(_0x23a024, "궁", all, "궁뎀증", 30, "꺼져!", 1, always);
        atbf(_0x23a024, "공격", all, "공고증", myCurAtk + _0x23a024.id + 30, "마왕의 절대 영역1", 1, always);
        for (let _0x227c3b of getRoleIdx("딜")) {
          atbf(comp[_0x227c3b], "공격", all, "공고증", myCurAtk + comp[_0x227c3b].id + 5, "마왕의 절대 영역2", 1, always);
        }
        tbf(_0x23a024, "공퍼증", 10, "공격+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10152:
      setMnc(_0x23a024, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(all, "가뎀증", 25, "밝은 달빛1", 4);
            nbf(_0x23a024, "공퍼증", 20, "밝은 달빛2", 1, 1);
            break;
          case 2:
            tbf(all, "가뎀증", 30, "밝은 달빛1", 4);
            nbf(_0x23a024, "공퍼증", 40, "밝은 달빛2", 1, 1);
            break;
          case 3:
            tbf(all, "가뎀증", 40, "밝은 달빛1", 4);
            nbf(_0x23a024, "공퍼증", 60, "밝은 달빛2", 1, 1);
            break;
          case 4:
            tbf(all, "가뎀증", 50, "밝은 달빛1", 4);
            nbf(_0x23a024, "공퍼증", 80, "밝은 달빛2", 1, 1);
            break;
          default:
            tbf(all, "가뎀증", 60, "밝은 달빛1", 4);
            nbf(_0x23a024, "공퍼증", 100, "밝은 달빛2", 1, 1);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
        for (let _0x3851f5 of comp) {
          _0x3851f5.heal2();
        }
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
        for (let _0x366ba6 of comp) {
          _0x366ba6.heal();
        }
      };
      _0x23a024.leader = function () {
        hpUpAll(50);
        tbf(all, "받아증", -200, "선택받은 욕주1", always);
        const _0x257f0d = getElKind();
        if (_0x257f0d == 1 || _0x257f0d == 2) {
          tbf(all, "공퍼증", 75, "<영웅 소환>1", always);
          for (let _0x2d9ef6 of getElementIdx("광", "암")) {
            anbf(all, "궁", comp[_0x2d9ef6], "받속뎀", 3, "<영웅 소환>2", 1, 15, always);
          }
          tbf(all, "궁추가*", 200, "<영웅 소환>3", always);
          tbf(all, "평추가*", 100, "<영웅 소환>4", always);
        }
      };
      _0x23a024.passive = function () {
        atbf(_0x23a024, "궁", all, "공고증", myCurAtk + _0x23a024.id + 30, "성배 파편", 1, always);
        for (let _0x26eb19 of getElementIdx("광", "암")) {
          tbf(comp[_0x26eb19], "공퍼증", 40, "믿음직하고 성숙한 여성2", always);
        }
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10153:
      _0x23a024.stack = 0;
      buff_ex.push("<고급 할로윈 디저트 세트>");
      setMnc(_0x23a024, [0, 3, 0, 3, 0, 3, 0, 3, 0, 3], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            nbf(boss, "받뎀증", 15, "싹트는 살육 욕망1", 1, 2);
            for (let _0x49efae of getElementIdx("암")) {
              nbf(comp[_0x49efae], "받속뎀", 5, "싹트는 살육 욕망2", 1, 2);
            }
            break;
          case 2:
            nbf(boss, "받뎀증", 20, "싹트는 살육 욕망1", 1, 2);
            for (let _0x59bb45 of getElementIdx("암")) {
              nbf(comp[_0x59bb45], "받속뎀", 5, "싹트는 살육 욕망2", 1, 2);
            }
            break;
          case 3:
            nbf(boss, "받뎀증", 20, "싹트는 살육 욕망1", 1, 2);
            for (let _0x3b02d0 of getElementIdx("암")) {
              nbf(comp[_0x3b02d0], "받속뎀", 10, "싹트는 살육 욕망2", 1, 2);
            }
            break;
          case 4:
            nbf(boss, "받뎀증", 25, "싹트는 살육 욕망1", 1, 2);
            for (let _0x509dfa of getElementIdx("암")) {
              nbf(comp[_0x509dfa], "받속뎀", 10, "싹트는 살육 욕망2", 1, 2);
            }
            break;
          default:
            nbf(boss, "받뎀증", 25, "싹트는 살육 욕망1", 1, 2);
            for (let _0x5e2a9c of getElementIdx("암")) {
              nbf(comp[_0x5e2a9c], "받속뎀", 15, "싹트는 살육 욕망2", 1, 2);
            }
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        if (getBuffSize(_0x23a024, "기본", "성배의 메아리") != 0) {
          for (let _0x4abd8b = 0; _0x4abd8b < _0x17c963 + 5; _0x4abd8b++) {
            tbf(_0x23a024, "궁발동*", 30, "성배의 메아리2", 1);
          }
        }
        setBuffSize(_0x23a024, "기본", "성배의 메아리", 0);
        ultLogic(_0x23a024);
        deleteBuff(_0x23a024, "기본", "성배의 메아리2");
        setBuffSize(_0x23a024, "기본", "성배의 메아리", (_0x17c963 + 5) * 30);
        setBuffNest(_0x23a024, "기본", "디저트 폭식", 0);
        _0x23a024.stack = 0;
        setBuffSize(_0x23a024, "기본", "디저트 폭식1", 0);
        setBuffOn(_0x23a024, "기본", "디저트 폭식2", false);
        setBuffOn(_0x23a024, "기본", "디저트 폭식3", false);
        setBuffOn(_0x23a024, "기본", "디저트 폭식4", false);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
        setBuffNest(_0x23a024, "기본", "디저트 폭식", 0);
        _0x23a024.stack = 0;
        setBuffSize(_0x23a024, "기본", "디저트 폭식1", 0);
        setBuffOn(_0x23a024, "기본", "디저트 폭식2", false);
        setBuffOn(_0x23a024, "기본", "디저트 폭식3", false);
        setBuffOn(_0x23a024, "기본", "디저트 폭식4", false);
      };
      _0x23a024.leader = function () {
        hpUpAll(40);
        tbf(all, "공퍼증", 50, "귀엽고 위험한 사신", always);
        if (getElementCnt("암") >= 4) {
          tbf(_0x23a024, "공퍼증", 100, "<달콤살벌한 살의>1", always);
          tbf(_0x23a024, "가뎀증", 50, "<달콤살벌한 살의>2", always);
          for (let _0x45f144 of getElementIdx("암")) {
            anbf(_0x23a024, "피격", comp[_0x45f144], "받속뎀", 5, "<달콤살벌한 살의>3", 1, 10, always);
          }
        }
        if (getElementCnt("암") >= 4) {
          for (let _0x24c4d8 of comp) {
            if (_0x24c4d8.id != _0x23a024.id) {
              tbf(_0x24c4d8, "공발동*", 20, "<살육을 즐기자>1", always);
            }
          }
        }
      };
      _0x23a024.passive = function () {
        tbf(_0x23a024, "궁발동*", 0, "성배의 메아리", always);
        for (let _0x1fef35 of comp) {
          if (_0x1fef35.id != _0x23a024.id) {
            anbf(_0x1fef35, "피격", _0x23a024, "<고급 할로윈 디저트 세트>", 0, "디저트 폭식", 1, 6, always);
            const _0x1210c7 = _0x1fef35.hit;
            _0x1fef35.hit = function (..._0x321c1d) {
              _0x1210c7.apply(this, _0x321c1d);
              _0x23a024.stack++;
              if (_0x23a024.stack > 6) {
                _0x23a024.stack = 6;
              }
              setBuffSize(_0x23a024, "기본", "디저트 폭식1", _0x23a024.stack * 10);
              setBuffOn(_0x23a024, "기본", "디저트 폭식2", _0x23a024.stack >= 2);
              setBuffOn(_0x23a024, "기본", "디저트 폭식3", _0x23a024.stack >= 4);
              setBuffOn(_0x23a024, "기본", "디저트 폭식4", _0x23a024.stack >= 6);
            };
          }
        }
        tbf(_0x23a024, "평발동*", 0, "디저트 폭식1", always);
        buff(_0x23a024, "발효증", 50, "디저트 폭식2", always, false);
        buff(_0x23a024, "공퍼증", 40, "디저트 폭식3", always, false);
        buff(_0x23a024, "가뎀증", 30, "디저트 폭식4", always, false);
        for (let _0x20d856 of comp) {
          if (_0x20d856.id != _0x23a024.id) {
            const _0x285de2 = _0x20d856.attack;
            _0x20d856.attack = function (..._0x1b5888) {
              _0x285de2.apply(this, _0x1b5888);
              _0x20d856.hit();
            };
            const _0x588bf9 = _0x20d856.ultimate;
            _0x20d856.ultimate = function (..._0x11693d) {
              _0x588bf9.apply(this, _0x11693d);
              _0x20d856.hit();
            };
          }
        }
        tbf(_0x23a024, "발효증", 30, "트리거+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
        setBuffNest(_0x23a024, "기본", "디저트 폭식", 0);
        _0x23a024.stack = 0;
        setBuffSize(_0x23a024, "기본", "디저트 폭식1", 0);
        setBuffOn(_0x23a024, "기본", "디저트 폭식2", false);
        setBuffOn(_0x23a024, "기본", "디저트 폭식3", false);
        setBuffOn(_0x23a024, "기본", "디저트 폭식4", false);
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {
          if (getElementCnt("암") >= 4 && GLOBAL_TURN > 1) {
            nbf(_0x23a024, "<고급 할로윈 디저트 세트>", 0, "디저트 폭식", 2, 6);
            _0x23a024.stack += 2;
            if (_0x23a024.stack > 6) {
              _0x23a024.stack = 6;
            }
            setBuffSize(_0x23a024, "기본", "디저트 폭식1", _0x23a024.stack * 10);
            setBuffOn(_0x23a024, "기본", "디저트 폭식2", _0x23a024.stack >= 2);
            setBuffOn(_0x23a024, "기본", "디저트 폭식3", _0x23a024.stack >= 4);
            setBuffOn(_0x23a024, "기본", "디저트 폭식4", _0x23a024.stack >= 6);
          }
        }
        if (GLOBAL_TURN == 1) {
          cdChange(_0x23a024, -3);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10154:
      setMnc(_0x23a024, [265, 3, 298, 3, 331, 3, 364, 3, 397, 3], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            for (let _0x659f54 of getElementIdx("수")) {
              if (comp[_0x659f54].id != _0x23a024.id) {
                tbf(comp[_0x659f54], "궁추가*", 80, "러브 메이드의 모에모에 빔", 1);
              }
            }
            break;
          case 2:
            for (let _0x5195bc of getElementIdx("수")) {
              if (comp[_0x5195bc].id != _0x23a024.id) {
                tbf(comp[_0x5195bc], "궁추가*", 90, "러브 메이드의 모에모에 빔", 1);
              }
            }
            break;
          case 3:
            for (let _0x42c9e3 of getElementIdx("수")) {
              if (comp[_0x42c9e3].id != _0x23a024.id) {
                tbf(comp[_0x42c9e3], "궁추가*", 100, "러브 메이드의 모에모에 빔", 1);
              }
            }
            break;
          case 4:
            for (let _0x29e844 of getElementIdx("수")) {
              if (comp[_0x29e844].id != _0x23a024.id) {
                tbf(comp[_0x29e844], "궁추가*", 110, "러브 메이드의 모에모에 빔", 1);
              }
            }
            break;
          default:
            for (let _0x194b76 of getElementIdx("수")) {
              if (comp[_0x194b76].id != _0x23a024.id) {
                tbf(comp[_0x194b76], "궁추가*", 120, "러브 메이드의 모에모에 빔", 1);
              }
            }
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(40);
        tbf(all, "공퍼증", 50, "☆스타라이트 걸☆", always);
      };
      _0x23a024.passive = function () {
        for (let _0x4f11b1 of getElementIdx("수")) {
          anbf(_0x23a024, "궁", comp[_0x4f11b1], "받속뎀", 7.5, "비밀 개조 마도 전투복", 1, 4, always);
        }
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
        if ((GLOBAL_TURN - 1) % 3 == 0) {
          cdChange(_0x23a024, 3);
        }
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader && GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 3 == 0) {
          if (getElementCnt("수") >= 4) {
            _0x4a4025();
          }
          if (getRoKind() == 4) {
            _0x4a4025();
          }
          if (getRoleCnt("딜") >= 1) {
            _0x4a4025();
          }
          if (getRoleCnt("섶") >= 1) {
            _0x4a4025();
          }
          function _0x4a4025() {
            tbf(all, "공퍼증", 15, "<유성처럼 추락>1", 1);
            tbf(all, "가뎀증", 10, "<유성처럼 추락>2", 1);
            tbf(all, "궁뎀증", 12.5, "<유성처럼 추락>3", 1);
            tbf(all, "궁추가*", 10, "<유성처럼 추락>4", 1);
            tbf(boss, "받뎀증", 10, "<유성처럼 추락>5", 1);
          }
        }
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 3 == 0) {
          tbf(all, "궁뎀증", 50, "<너만의 아이돌>1", 1);
          for (let _0x33e5e6 of getElementIdx("수")) {
            tbf(comp[_0x33e5e6], "공퍼증", 120, "두근두근♡사랑 시작의 신호1", 1);
          }
          for (let _0x297b41 of getElementIdx("수")) {
            tbf(comp[_0x297b41], "가뎀증", 60, "두근두근♡사랑 시작의 신호2", 1);
          }
        }
        if (GLOBAL_TURN == 1) {
          cdChange(_0x23a024, -3);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10155:
      setMnc(_0x23a024, [0, 3, 0, 3, 0, 3, 0, 3, 0, 3], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(_0x23a024, "공퍼증", 100, "정확히 후두부 가격1", 1);
            tbf(_0x23a024, "발효증", 100, "정확히 후두부 가격2", 3);
            tbf(boss, "받발뎀", 60, "정확히 후두부 가격3", 3);
            break;
          case 2:
            tbf(_0x23a024, "공퍼증", 125, "정확히 후두부 가격1", 1);
            tbf(_0x23a024, "발효증", 150, "정확히 후두부 가격2", 3);
            tbf(boss, "받발뎀", 70, "정확히 후두부 가격3", 3);
            break;
          case 3:
            tbf(_0x23a024, "공퍼증", 150, "정확히 후두부 가격1", 1);
            tbf(_0x23a024, "발효증", 200, "정확히 후두부 가격2", 3);
            tbf(boss, "받발뎀", 80, "정확히 후두부 가격3", 3);
            break;
          case 4:
            tbf(_0x23a024, "공퍼증", 175, "정확히 후두부 가격1", 1);
            tbf(_0x23a024, "발효증", 250, "정확히 후두부 가격2", 3);
            tbf(boss, "받발뎀", 90, "정확히 후두부 가격3", 3);
            break;
          default:
            tbf(_0x23a024, "공퍼증", 200, "정확히 후두부 가격1", 1);
            tbf(_0x23a024, "발효증", 300, "정확히 후두부 가격2", 3);
            tbf(boss, "받발뎀", 100, "정확히 후두부 가격3", 3);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {
        tbf(_0x23a024, "공퍼증", 100, "케첩 짜기", 1);
      };
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(30);
        if (getElKind() == 1) {
          tbf(all, "공퍼증", 70, "<유머 대결>1", always);
          tbf(all, "가뎀증", 30, "<유머 대결>2", always);
          tbf(all, "공발동*", 40, "<유머 대결>3", always);
        }
      };
      _0x23a024.passive = function () {
        tbf(_0x23a024, "평발동*", 100, "간단한 메이드 잡기술", always);
        tbf(all, "공퍼증", 30, "신형 마도포1", always);
        tbf(_0x23a024, "궁발동*", 300, "신형 마도포2", always);
        tbf(_0x23a024, "가뎀증", 30, "넘어지기 스킬1", always);
        tbf(_0x23a024, "방발동*", 50, "넘어지기 스킬2", always);
        tbf(_0x23a024, "공퍼증", 10, "공격+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader && GLOBAL_TURN == 10) {
          if (getElKind() == 1) {
            for (let _0x5af36f of getElementIdx("화")) {
              nbf(comp[_0x5af36f], "받속뎀", 10, "<유머 대결>4", getElementCnt("화"), 5);
            }
          }
        }
        if (GLOBAL_TURN == 7) {
          nbf(_0x23a024, "궁뎀증", 100, "넘어지기 스킬3", 1, 1);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10156:
      setMnc(_0x23a024, [388, 4, 446, 4, 502, 4, 560, 4, 618, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            nbf(boss, "받뎀증", 10, "달링~ 사줘~1", 1, 1);
            for (let _0x3b4ea1 of getElementIdx("화")) {
              nbf(comp[_0x3b4ea1], "받속뎀", 20, "달링~ 사줘~2", 1, 1);
            }
            break;
          case 2:
            nbf(boss, "받뎀증", 20, "달링~ 사줘~1", 1, 1);
            for (let _0x11219b of getElementIdx("화")) {
              nbf(comp[_0x11219b], "받속뎀", 25, "달링~ 사줘~2", 1, 1);
            }
            break;
          case 3:
            nbf(boss, "받뎀증", 30, "달링~ 사줘~1", 1, 1);
            for (let _0x49d5ec of getElementIdx("화")) {
              nbf(comp[_0x49d5ec], "받속뎀", 30, "달링~ 사줘~2", 1, 1);
            }
            break;
          case 4:
            nbf(boss, "받뎀증", 40, "달링~ 사줘~1", 1, 1);
            for (let _0x10658c of getElementIdx("화")) {
              nbf(comp[_0x10658c], "받속뎀", 35, "달링~ 사줘~2", 1, 1);
            }
            break;
          default:
            nbf(boss, "받뎀증", 60, "달링~ 사줘~1", 1, 1);
            for (let _0x5e9627 of getElementIdx("화")) {
              nbf(comp[_0x5e9627], "받속뎀", 40, "달링~ 사줘~2", 1, 1);
            }
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024, 2);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(40);
        if (getRoleCnt("딜") >= 3) {
          tbf(all, "공퍼증", 80, "<비즈니스 기회!>1", always);
          tbf(all, "궁추가*", 100, "<비즈니스 기회!>3", always);
        }
      };
      _0x23a024.passive = function () {
        anbf(_0x23a024, "궁", _0x23a024, "공퍼증", 60, "아양 좀 떨어도 괜잖겠지?1", 1, 3, always);
        if (getElementCnt("화") >= 3) {
          tbf(_0x23a024, "공퍼증", -180, "아양 좀 떨어도 괜잖겠지?2", always);
        }
        anbf(_0x23a024, "궁", _0x23a024, "가뎀증", 30, "제멋대로인 여친이 네 마음을 점령~1", 1, 3, always);
        if (getElementCnt("화") >= 3) {
          tbf(_0x23a024, "가뎀증", -90, "제멋대로인 여친이 네 마음을 점령~2", always);
        }
        anbf(_0x23a024, "궁", _0x23a024, "궁뎀증", 50, "필승 크리스마스 전략1", 1, 3, always);
        if (getElementCnt("화") >= 3) {
          tbf(_0x23a024, "궁뎀증", -150, "필승 크리스마스 전략2", always);
        }
        tbf(_0x23a024, "공퍼증", 10, "공격+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {
          if (getRoleCnt("딜") >= 3 && GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 4 == 0) {
            for (let _0x7c6a4d of getRoleIdx("딜")) {
              tbf(comp[_0x7c6a4d], "받직뎀", 150, "<비즈니스 기회!>2", 1);
            }
          }
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10157:
      buff_ex.push("<순진한 소원>");
      setMnc(_0x23a024, [0, 1, 0, 1, 0, 1, 0, 1, 0, 1], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(all, "공고증", myCurAtk + _0x23a024.id + 30, "섹스마스의 예찬2", 1);
            break;
          case 2:
            tbf(all, "공고증", myCurAtk + _0x23a024.id + 30, "섹스마스의 예찬2", 1);
            break;
          case 3:
            tbf(all, "공고증", myCurAtk + _0x23a024.id + 30, "섹스마스의 예찬2", 1);
            break;
          case 4:
            tbf(all, "공고증", myCurAtk + _0x23a024.id + 30, "섹스마스의 예찬2", 1);
            break;
          default:
            tbf(all, "공고증", myCurAtk + _0x23a024.id + 30, "섹스마스의 예찬2", 1);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
        if (_0x23a024.getNest("<순진한 소원>") == 0) {
          nbf(_0x23a024, "<순진한 소원>", 0, "섹스마스의 예찬1", _0x17c963 + 5, 10);
          setBuffOn(_0x23a024, "발동", "<정해진 운명>1", true);
          setBuffOn(_0x23a024, "발동", "<정해진 운명>2", true);
          setBuffOn(_0x23a024, "발동", "<정해진 운명>3", true);
          setBuffOnAll(_0x23a024, "발동", "마음에 사랑이 깃든다면1", true);
          setBuffOnAll(_0x23a024, "발동", "마음에 사랑이 깃든다면2", true);
          setBuffOn(_0x23a024, "발동", "<가장 아름다운 밤>1", true);
          setBuffOn(_0x23a024, "발동", "<가장 아름다운 밤>2", true);
        }
      };
      _0x23a024.atkbefore = function () {
        tbf(all, "공고증", myCurAtk + _0x23a024.id + 30, "크리스마스의 환희", 1);
      };
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(40);
        tbf(all, "공퍼증", 100, "크리스마스의 핫걸 무엘라1", always);
        tbf(all, "평추가*", 15, "크리스마스의 핫걸 무엘라2", always);
        tbf(all, "궁추가*", 30, "크리스마스의 핫걸 무엘라3", always);
        buff(_0x23a024, "공격", all, "가뎀증", 0.75, "<정해진 운명>1", _0x17c963 + 5, 80, always, "발동", false);
        buff(_0x23a024, "공격", boss, "받뎀증", 0.25, "<정해진 운명>2", _0x17c963 + 5, 80, always, "발동", false);
        buff(_0x23a024, "공격", all, "받속뎀", 0.25, "<정해진 운명>3", _0x17c963 + 5, 80, always, "발동", false);
      };
      _0x23a024.passive = function () {
        for (let _0x26bd71 of comp) {
          atbf(_0x26bd71, "평", _0x26bd71, "제거", "기본", "마음에 사랑이 깃든다면1", 1, always);
          atbf(_0x26bd71, "궁", _0x26bd71, "제거", "기본", "마음에 사랑이 깃든다면2", 1, always);
        }
        buff(_0x23a024, "평", all, "일뎀증", 8, "마음에 사랑이 깃든다면1", _0x17c963 + 5, 20, always, "발동", false);
        buff(_0x23a024, "궁", all, "궁뎀증", 1.25, "마음에 사랑이 깃든다면2", _0x17c963 + 5, 50, always, "발동", false);
        buff(_0x23a024, "공격", boss, "받뎀증", 0.25, "<가장 아름다운 밤>1", _0x17c963 + 5, 80, always, "발동", false);
        buff(_0x23a024, "공격", all, "받속뎀", 0.25, "<가장 아름다운 밤>2", _0x17c963 + 5, 80, always, "발동", false);
        tbf(_0x23a024, "공퍼증", 10, "공격+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        if (GLOBAL_TURN == 1) {
          cdChange(_0x23a024, -1);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10158:
      buff_ex.push("<절묘한 비책>");
      setMnc(_0x23a024, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(all, "공퍼증", 40, "크리스마스 팔진도", 3);
            break;
          case 2:
            tbf(all, "공퍼증", 48.75, "크리스마스 팔진도", 3);
            break;
          case 3:
            tbf(all, "공퍼증", 57.5, "크리스마스 팔진도", 3);
            break;
          case 4:
            tbf(all, "공퍼증", 66.25, "크리스마스 팔진도", 3);
            break;
          default:
            tbf(all, "공퍼증", 75, "크리스마스 팔진도", 3);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
        for (let _0x3e0ec7 of comp) {
          if (_0x3e0ec7.id != _0x23a024.id) {
            _0x23a024.tmpfunc(_0x3e0ec7, 0);
          }
        }
        for (let _0x58f04f of comp) {
          if (_0x58f04f.id != _0x23a024.id) {
            anbf(_0x58f04f, "공격", _0x58f04f, "<절묘한 비책>", 0, "<절묘한 비책>", 3, 3, 1);
            for (let _0x1369f7 of comp) {
              if (_0x1369f7.id != _0x58f04f.id && _0x1369f7.id != _0x23a024.id) {
                atbf(_0x58f04f, "공격", _0x1369f7, "제거", "발동", "<절묘한 비책>", 1, 1);
              }
            }
          }
        }
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(40);
        if (getElKind() == 5) {
          tbf(all, "공퍼증", 50, "<결승천리지외>1", always);
          tbf(all, "가뎀증", 80, "<결승천리지외>2", always);
          anbf(all, "공격", boss, "받뎀증", 1, "<결승천리지외>3", 1, 50, always);
          tbf(all, "평추가*", 100, "<결승천리지외>4", always);
          tbf(all, "궁추가*", 130, "<결승천리지외>5", always);
        }
      };
      _0x23a024.tmpfunc = function (_0xa38e49, _0x58613b = undefined) {
        const _0x5abfe0 = _0x58613b || _0xa38e49.getNest("<절묘한 비책>");
        setBuffOnExtra(_0xa38e49, "피격", "발동", "<신묘한 계략>", _0x5abfe0 == 3);
        setBuffOnExtra(_0xa38e49, "피격", "발동", "<절묘한 비책>", _0x5abfe0 == 3);
        setBuffOn(_0xa38e49, "기본", "<제2계-옹중착별>", _0x5abfe0 == 2);
        setBuffOnExtra(_0xa38e49, "궁", "발동", "<신묘한 계략>", _0x5abfe0 == 2);
        setBuffOnExtra(_0xa38e49, "궁", "발동", "<절묘한 비책>", _0x5abfe0 == 2);
        setBuffOnExtra(_0xa38e49, "궁", "발동", "<제2계-옹중착별>", _0x5abfe0 == 2);
        setBuffOn(_0xa38e49, "기본", "<제3계-천승추격>", _0x5abfe0 == 1);
        setBuffOnExtra(_0xa38e49, "평", "발동", "<신묘한 계략>", _0x5abfe0 == 1);
        setBuffOnExtra(_0xa38e49, "평", "발동", "<절묘한 비책>", _0x5abfe0 == 1);
        setBuffOnExtra(_0xa38e49, "평", "발동", "<제3계-천승추격>", _0x5abfe0 == 1);
        setBuffOnExtra(_0xa38e49, "평", "발동", "계략 총동원", _0x5abfe0 == 1);
        setBuffOn(_0xa38e49, "기본", "계략 총동원", _0x5abfe0 >= 1);
      };
      _0x23a024.passive = function () {
        for (let _0x4257ee of comp) {
          if (_0x4257ee.id != _0x23a024.id) {
            anbf(_0x23a024, "궁", _0x4257ee, "<절묘한 비책>", 0, "<절묘한 비책>", -3, 3, always);
          }
        }
        for (let _0x2583b4 of comp) {
          if (_0x2583b4.id != _0x23a024.id) {
            buff(_0x2583b4, "피격", boss, "받뎀증", 5, "<신묘한 계략>", 1, 6, always, "발동", false);
            buff(_0x2583b4, "피격", _0x2583b4, "<절묘한 비책>", 0, "<절묘한 비책>", -1, 3, always, "발동", false);
            buff(_0x2583b4, "궁뎀증", 30, "<제2계-옹중착별>", always, false);
            buff(_0x2583b4, "궁", boss, "받뎀증", 5, "<신묘한 계략>", 1, 6, always, "발동", false);
            buff(_0x2583b4, "궁", _0x2583b4, "<절묘한 비책>", 0, "<절묘한 비책>", -1, 3, always, "발동", false);
            buff(_0x2583b4, "궁", _0x2583b4, "off", "기본", "<제2계-옹중착별>", 1, always, "발동", false);
            buff(_0x2583b4, "일뎀증", 60, "<제3계-천승추격>", always, false);
            buff(_0x2583b4, "평", boss, "받뎀증", 5, "<신묘한 계략>", 1, 6, always, "발동", false);
            buff(_0x2583b4, "평", _0x2583b4, "<절묘한 비책>", 0, "<절묘한 비책>", -1, 3, always, "발동", false);
            buff(_0x2583b4, "평", _0x2583b4, "off", "기본", "<제3계-천승추격>", 1, always, "발동", false);
            buff(_0x2583b4, "평", _0x2583b4, "off", "기본", "계략 총동원", 1, always, "발동", false);
            const _0x292fb8 = _0x2583b4.attack;
            const _0x1c6069 = _0x2583b4.ultimate;
            const _0x350383 = _0x2583b4.hit;
            _0x2583b4.attack = function (..._0x5bb294) {
              _0x292fb8.apply(this, _0x5bb294);
              _0x23a024.tmpfunc(_0x2583b4);
            };
            _0x2583b4.ultimate = function (..._0x253fd4) {
              _0x1c6069.apply(this, _0x253fd4);
              _0x23a024.tmpfunc(_0x2583b4);
            };
            _0x2583b4.hit = function (..._0x1bf805) {
              _0x350383.apply(this, _0x1bf805);
              _0x23a024.tmpfunc(_0x2583b4);
            };
          }
        }
        for (let _0x15246d of comp) {
          if (_0x15246d.id != _0x23a024.id) {
            buff(_0x15246d, "가뎀증", 20, "계략 총동원", always, false);
          }
        }
        tbf(_0x23a024, "공퍼증", 10, "공격+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        if (GLOBAL_TURN == 1) {
          cdChange(_0x23a024, -1);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10175:
      setMnc(_0x23a024, [0, 3, 0, 3, 0, 3, 0, 3, 0, 3], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(all, "공퍼증", 40, "3연발 눈덩이 공격!1", 1);
            tbf(all, "가뎀증", 10, "3연발 눈덩이 공격!2", 2);
            tbf(all, "궁뎀증", 20, "3연발 눈덩이 공격!3", 3);
            break;
          case 2:
            tbf(all, "공퍼증", 45, "3연발 눈덩이 공격!1", 1);
            tbf(all, "가뎀증", 15, "3연발 눈덩이 공격!2", 2);
            tbf(all, "궁뎀증", 25, "3연발 눈덩이 공격!3", 3);
            break;
          case 3:
            tbf(all, "공퍼증", 50, "3연발 눈덩이 공격!1", 1);
            tbf(all, "가뎀증", 20, "3연발 눈덩이 공격!2", 2);
            tbf(all, "궁뎀증", 30, "3연발 눈덩이 공격!3", 3);
            break;
          case 4:
            tbf(all, "공퍼증", 55, "3연발 눈덩이 공격!1", 1);
            tbf(all, "가뎀증", 25, "3연발 눈덩이 공격!2", 2);
            tbf(all, "궁뎀증", 35, "3연발 눈덩이 공격!3", 3);
            break;
          default:
            tbf(all, "공퍼증", 60, "3연발 눈덩이 공격!1", 1);
            tbf(all, "가뎀증", 30, "3연발 눈덩이 공격!2", 2);
            tbf(all, "궁뎀증", 40, "3연발 눈덩이 공격!3", 3);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {
        tbf(all, "공퍼증", 40, "3연발 눈덩이 공격!3", 1);
      };
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(40);
        for (let _0x4b3ca4 of getElementIdx("수", "암")) {
          tbf(comp[_0x4b3ca4], "공퍼증", 100, "겨울 놀이 마스터", always);
        }
      };
      _0x23a024.passive = function () {
        tbf(_0x23a024, "공퍼증", 40, "설녀의 진짜 실력", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {
          if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 3 == 0) {
            tbf(boss, "받뎀증", 10, "<모두 함께 눈싸움~>1", 1);
            nbf(all, "가뎀증", 20, "<모두 함께 눈싸움~>2", 1, 4);
            tbf(all, "궁추가*", 200, "<모두 함께 눈싸움~>3", 1);
          }
        }
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 3 == 0) {
          tbf(boss, "받뎀증", 20, "찡그린 얼굴은 안 돼요!", 1);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10159:
      setMnc(_0x23a024, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            nbf(_0x23a024, "공퍼증", 10, "섹스의 해가 다가왔습니다~1", 1, 4);
            tbf(all, "공고증", myCurAtk + _0x23a024.id + 30, "섹스의 해가 다가왔습니다~2", 1);
            tbf(all, "가뎀증", 10, "섹스의 해가 다가왔습니다~3", 4);
            break;
          case 2:
            nbf(_0x23a024, "공퍼증", 12.5, "섹스의 해가 다가왔습니다~1", 1, 4);
            tbf(all, "공고증", myCurAtk + _0x23a024.id + 30, "섹스의 해가 다가왔습니다~2", 1);
            tbf(all, "가뎀증", 15, "섹스의 해가 다가왔습니다~3", 4);
            break;
          case 3:
            nbf(_0x23a024, "공퍼증", 15, "섹스의 해가 다가왔습니다~1", 1, 4);
            tbf(all, "공고증", myCurAtk + _0x23a024.id + 30, "섹스의 해가 다가왔습니다~2", 1);
            tbf(all, "가뎀증", 20, "섹스의 해가 다가왔습니다~3", 4);
            break;
          case 4:
            nbf(_0x23a024, "공퍼증", 20, "섹스의 해가 다가왔습니다~1", 1, 4);
            tbf(all, "공고증", myCurAtk + _0x23a024.id + 30, "섹스의 해가 다가왔습니다~2", 1);
            tbf(all, "가뎀증", 25, "섹스의 해가 다가왔습니다~3", 4);
            break;
          default:
            nbf(_0x23a024, "공퍼증", 25, "섹스의 해가 다가왔습니다~1", 1, 4);
            tbf(all, "공고증", myCurAtk + _0x23a024.id + 30, "섹스의 해가 다가왔습니다~2", 1);
            tbf(all, "가뎀증", 30, "섹스의 해가 다가왔습니다~3", 4);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {
        tbf(all, "공고증", myCurAtk + _0x23a024.id + 30, "성수 뿌리기", 1);
      };
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(50);
        if (getElKind() == 2) {
          tbf(all, "공퍼증", 80, "<음춘 대회>1", always);
          tbf(all, "가뎀증", 30, "<음춘 대회>2", always);
          tbf(all, "궁뎀증", 70, "<음춘 대회>3", always);
          for (let _0x3ec987 of getElementIdx("수", "암")) {
            anbf(all, "궁", comp[_0x3ec987], "받속뎀", 4, "<음춘 대회>4", 1, 12, always);
          }
        }
        for (let _0x1ad595 of getRoleIdx("힐")) {}
      };
      _0x23a024.passive = function () {
        for (let _0x1870a0 of getElementIdx("수", "암")) {
          if (comp[_0x1870a0].role == 0 || comp[_0x1870a0].role == 4) {
            anbf(comp[_0x1870a0], "궁", boss, "받뎀증", 5, "<오르가즘의 빛>", 1, 6, always);
          }
        }
        for (let _0x4a0cea of getElementIdx("수", "암")) {
          anbf(_0x23a024, "궁", comp[_0x4a0cea], "받속뎀", 12, "81회 오르가즘", 1, 3, always);
        }
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10161:
      setMnc(_0x23a024, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        deleteBuff(boss, "기본", "삼매룡화3");
        switch (_0x17c963) {
          case 1:
            nbf(boss, "받뎀증", 15, "삼매룡화1", 1, 2);
            tbf(_0x23a024, "공고증", myCurAtk + _0x23a024.id + 30, "삼매룡화2", 1);
            tbf(boss, "도트뎀", myCurAtk + _0x23a024.id + 210, "삼매룡화3", 4);
            break;
          case 2:
            nbf(boss, "받뎀증", 17.5, "삼매룡화1", 1, 2);
            tbf(_0x23a024, "공고증", myCurAtk + _0x23a024.id + 35, "삼매룡화2", 1);
            tbf(boss, "도트뎀", myCurAtk + _0x23a024.id + 245, "삼매룡화3", 4);
            break;
          case 3:
            nbf(boss, "받뎀증", 20, "삼매룡화1", 1, 2);
            tbf(_0x23a024, "공고증", myCurAtk + _0x23a024.id + 40, "삼매룡화2", 1);
            tbf(boss, "도트뎀", myCurAtk + _0x23a024.id + 280, "삼매룡화3", 4);
            break;
          case 4:
            nbf(boss, "받뎀증", 22.5, "삼매룡화1", 1, 2);
            tbf(_0x23a024, "공고증", myCurAtk + _0x23a024.id + 45, "삼매룡화2", 1);
            tbf(boss, "도트뎀", myCurAtk + _0x23a024.id + 315, "삼매룡화3", 4);
            break;
          default:
            nbf(boss, "받뎀증", 25, "삼매룡화1", 1, 2);
            tbf(_0x23a024, "공고증", myCurAtk + _0x23a024.id + 50, "삼매룡화2", 1);
            tbf(boss, "도트뎀", myCurAtk + _0x23a024.id + 350, "삼매룡화3", 4);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(40);
        tbf(all, "공퍼증", 100, "진룡의 화신1", always);
        tbf(all, "가뎀증", -200, "진룡의 화신2", always);
      };
      _0x23a024.passive = function () {
        tbf(_0x23a024, "공퍼증", 100, "인룡혼혈", always);
        atbf(_0x23a024, "평", boss, "도트뎀", myCurAtk + _0x23a024.id + 50, "타오르는 몸1", 4, always);
        tbf(_0x23a024, "가지증", 150, "타오르는 몸2", always);
        anbf(_0x23a024, "공격", boss, "받뎀증", 2, "<고온탄화>1", 1, 10, always);
        anbf(_0x23a024, "공격", boss, "받일뎀", 12, "<고온탄화>2", 1, 10, always);
        tbf(_0x23a024, "공퍼증", 10, "공격+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {
          if (GLOBAL_TURN == 1) {
            tbf(boss, "받지뎀", 200, "<화염산 점화>1", 50);
            tbf(boss, "받뎀증", 100, "<화염산 점화>2", 50);
          }
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10162:
      _0x23a024.stack = 0;
      buff_ex.push("<시저 대명신의 가호>");
      setMnc(_0x23a024, [0, 4, 0, 5, 0, 6, 0, 7, 0, 8], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            nbf(_0x23a024, "<시저 대명신의 가호>", 0, "천지창조!1", 3, 7);
            _0x23a024.stack += 3;
            if (_0x23a024.stack > 7) {
              _0x23a024.stack = 7;
            }
            nbf(_0x23a024, "가뎀증", 35, "천지창조!2", 1, 1);
            break;
          case 2:
            nbf(_0x23a024, "<시저 대명신의 가호>", 0, "천지창조!1", 4, 7);
            _0x23a024.stack += 4;
            if (_0x23a024.stack > 7) {
              _0x23a024.stack = 7;
            }
            nbf(_0x23a024, "가뎀증", 45, "천지창조!2", 1, 1);
            break;
          case 3:
            nbf(_0x23a024, "<시저 대명신의 가호>", 0, "천지창조!1", 5, 7);
            _0x23a024.stack += 5;
            if (_0x23a024.stack > 7) {
              _0x23a024.stack = 7;
            }
            nbf(_0x23a024, "가뎀증", 55, "천지창조!2", 1, 1);
            break;
          case 4:
            nbf(_0x23a024, "<시저 대명신의 가호>", 0, "천지창조!1", 6, 7);
            _0x23a024.stack += 6;
            if (_0x23a024.stack > 7) {
              _0x23a024.stack = 7;
            }
            nbf(_0x23a024, "가뎀증", 65, "천지창조!2", 1, 1);
            break;
          default:
            nbf(_0x23a024, "<시저 대명신의 가호>", 0, "천지창조!1", 7, 7);
            _0x23a024.stack += 7;
            if (_0x23a024.stack > 7) {
              _0x23a024.stack = 7;
            }
            nbf(_0x23a024, "가뎀증", 75, "천지창조!2", 1, 1);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
        setBuffOn(_0x23a024, "기본", "<정화 작업>1", true);
        setBuffOn(_0x23a024, "기본", "<정화 작업>2", true);
        setBuffOn(_0x23a024, "발동", "<시저 대현신>1", true);
        setBuffOnAll(_0x23a024, "발동", "<시저 대현신>2", true);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
        nbf(_0x23a024, "<시저 대명신의 가호>", 0, "천지창조!1", -1, 7);
        if (_0x23a024.stack == 3) {
          setBuffOn(_0x23a024, "발동", "<시저 대현신>1", false);
          setBuffOnAll(_0x23a024, "발동", "<시저 대현신>2", false);
        } else if (_0x23a024.stack == 1) {
          setBuffOn(_0x23a024, "기본", "<정화 작업>1", false);
          setBuffOn(_0x23a024, "기본", "<정화 작업>2", false);
        }
        _0x23a024.stack -= 1;
        if (_0x23a024.stack < 0) {
          _0x23a024.stack = 0;
        }
      };
      _0x23a024.leader = function () {
        hpUpAll(40);
        tbf(all, "공퍼증", 80, "시저 대명신의 무녀1", always);
        tbf(all, "가뎀증", 50, "시저 대명신의 무녀2", always);
        tbf(all, "일뎀증", 100, "시저 대명신의 무녀3", always);
        anbf(all, "평", boss, "받뎀증", 1.5, "시저 대명신의 무녀4", 1, 50, always);
        if (getRoleCnt("섶") >= 1) {
          tbf(all, "가뎀증", -500, "<이교 신앙>", always);
        }
      };
      _0x23a024.passive = function () {
        buff(_0x23a024, "일뎀증", 125, "<정화 작업>1", always, false);
        buff(_0x23a024, "평추가*", 150, "<정화 작업>2", always, false);
        buff(_0x23a024, "평", boss, "받뎀증", 3, "<시저 대현신>1", 1, 5, always, "발동", false);
        for (let _0x1532b of getElementIdx("암")) {
          buff(_0x23a024, "평", comp[_0x1532b], "받속뎀", 3, "<시저 대현신>2", 1, 5, always, "발동", false);
        }
        tbf(_0x23a024, "공퍼증", 10, "공격+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        if (GLOBAL_TURN == 1) {
          cdChange(_0x23a024, -8);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10163:
      _0x23a024.stack = 0;
      buff_ex.push("<마왕 분신>");
      setMnc(_0x23a024, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            nbf(_0x23a024, "가뎀증", 10, "오의·진마수리검1", 1, 1);
            nbf(all, "받속뎀", 15, "오의·진마수리검2", 1, 1);
            break;
          case 2:
            nbf(_0x23a024, "가뎀증", 23, "오의·진마수리검1", 1, 1);
            nbf(all, "받속뎀", 20, "오의·진마수리검2", 1, 1);
            break;
          case 3:
            nbf(_0x23a024, "가뎀증", 36, "오의·진마수리검1", 1, 1);
            nbf(all, "받속뎀", 25, "오의·진마수리검2", 1, 1);
            break;
          case 4:
            nbf(_0x23a024, "가뎀증", 49, "오의·진마수리검1", 1, 1);
            nbf(all, "받속뎀", 30, "오의·진마수리검2", 1, 1);
            break;
          default:
            nbf(_0x23a024, "가뎀증", 62, "오의·진마수리검1", 1, 1);
            nbf(all, "받속뎀", 35, "오의·진마수리검2", 1, 1);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024, 2);
        _0x23a024.stack = 0;
        setBuffOn(_0x23a024, "기본", "인법·마왕분신술3", false);
        setBuffOn(_0x23a024, "기본", "인법·마왕분신술4", false);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(40);
        tbf(all, "공퍼증", 50, "마왕 비기·닌자전대결집1", always);
        for (let _0x337030 of getRoleIdx("딜", "디")) {
          comp[_0x337030].canCDChange = false;
          atbf(comp[_0x337030], "방", all, "가뎀증", 20, "<닌자·참전!>1", 2, always);
          atbf(comp[_0x337030], "방", comp[_0x337030], "궁뎀증", 30, "<닌자·참전!>2", 2, always);
          atbf(comp[_0x337030], "방", comp[_0x337030], "공퍼증", 40, "<닌자·참전!>3", 2, always);
          tbf(comp[_0x337030], "궁발동*", 55, "<닌자·참전!>4", always);
        }
      };
      _0x23a024.passive = function () {
        anbf(_0x23a024, "방", _0x23a024, "궁뎀증", 20, "인법·마왕분신술1", 1, 5, always);
        anbf(_0x23a024, "방", _0x23a024, "<마왕 분신>", 0, "<마왕 분신>", 1, 2, always);
        buff(_0x23a024, "궁발동*", 90, "인법·마왕분신술3", always, false);
        buff(_0x23a024, "궁발동*", 90, "인법·마왕분신술4", always, false);
        anbf(_0x23a024, "궁", _0x23a024, "<마왕 분신>", 0, "<마왕 분신>", -2, 2, always);
        for (let _0x8094c5 of getRoleIdx("딜", "디")) {
          nbf(_0x23a024, "공퍼증", 50, "비기·삼라만상", 1, 3);
        }
        atbf(all, "방", boss, "받뎀증", 12, "비기·기운 차단!", 2, always);
        tbf(_0x23a024, "공퍼증", 10, "공격+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
        if (_0x23a024.stack == 0) {
          setBuffOn(_0x23a024, "기본", "인법·마왕분신술3", true);
        } else if (_0x23a024.stack == 1) {
          setBuffOn(_0x23a024, "기본", "인법·마왕분신술4", true);
        }
        _0x23a024.stack += 1;
        if (_0x23a024.stack > 2) {
          _0x23a024.stack = 2;
        }
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10164:
      setMnc(_0x23a024, [0, 3, 0, 3, 0, 3, 0, 3, 0, 3], _0x17c963);
      _0x23a024.ultbefore = function () {
        deleteBuff(boss, "기본", "수줍은 정취1");
        switch (_0x17c963) {
          case 1:
            tbf(boss, "받발뎀", 60, "수줍은 정취1", 3);
            tbf(all, "공고증", myCurAtk + _0x23a024.id + 20, "수줍은 정취2", 1);
            tbf(_0x23a024, "반격*", 265, "수줍은 정취3", 3);
            break;
          case 2:
            tbf(boss, "받발뎀", 70, "수줍은 정취1", 3);
            tbf(all, "공고증", myCurAtk + _0x23a024.id + 22.5, "수줍은 정취2", 1);
            tbf(_0x23a024, "반격*", 298, "수줍은 정취3", 3);
            break;
          case 3:
            tbf(boss, "받발뎀", 80, "수줍은 정취1", 3);
            tbf(all, "공고증", myCurAtk + _0x23a024.id + 25, "수줍은 정취2", 1);
            tbf(_0x23a024, "반격*", 331, "수줍은 정취3", 3);
            break;
          case 4:
            tbf(boss, "받발뎀", 90, "수줍은 정취1", 3);
            tbf(all, "공고증", myCurAtk + _0x23a024.id + 27.5, "수줍은 정취2", 1);
            tbf(_0x23a024, "반격*", 364, "수줍은 정취3", 3);
            break;
          default:
            tbf(boss, "받발뎀", 100, "수줍은 정취1", 3);
            tbf(all, "공고증", myCurAtk + _0x23a024.id + 30, "수줍은 정취2", 1);
            tbf(_0x23a024, "반격*", 397, "수줍은 정취3", 3);
            break;
        }
        atbf(_0x23a024, "피격", _0x23a024, "제거", "기본", "수줍은 정취3", 1, 3);
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {
        tbf(all, "공고증", myCurAtk + _0x23a024.id + 15, "달빛 동행", 1);
      };
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(40);
        tbf(all, "공퍼증", 60, "님과 함께라면1", always);
        if (getElKind() == 2) {
          tbf(all, "가뎀증", 50, "<재색겸비>1", always);
          tbf(all, "발효증", 100, "<재색겸비>2", always);
          anbf(all, "피격", boss, "받뎀증", 0.8, "<재색겸비>3", 1, 50, always);
        }
      };
      _0x23a024.passive = function () {
        atbf(_0x23a024, "평", _0x23a024, "반격*", 100, "<가녀린 손>", 2, always);
        atbf(_0x23a024, "피격", _0x23a024, "제거", "기본", "<가녀린 손>", 1, always);
        atbf(_0x23a024, "방", all, "제거", "기본", "<백아의 미소>1", 1, always);
        atbf(_0x23a024, "방", all, "공퍼증", 50, "<백아의 미소>1", 3, always);
        tbf(_0x23a024, "공퍼증", 10, "공격+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 3 == 0) {
          for (let _0x322a58 of getElementIdx("풍")) {
            atbf(_0x23a024, "피격", comp[_0x322a58], "받속뎀", 30, "<연꽃의 자태>", 5, 3);
            atbf(_0x23a024, "피격", comp[_0x322a58], "제거", "발동", "<연꽃의 자태>", 1, 3);
          }
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10165:
      setMnc(_0x23a024, [0, 8, 0, 8, 0, 8, 0, 8, 0, 8], _0x17c963);
      _0x23a024.ultbefore = function () {
        deleteBuff(_0x23a024, "기본", "연심♡공명1");
        deleteBuff(_0x23a024, "기본", "연심♡공명2");
        deleteBuff(_0x23a024, "기본", "연심♡공명3");
        switch (_0x17c963) {
          case 1:
            tbf(_0x23a024, "공퍼증", 60, "연심♡공명1", 8);
            tbf(_0x23a024, "일뎀증", 60, "연심♡공명2", 8);
            tbf(_0x23a024, "가뎀증", 40, "연심♡공명3", 8);
            break;
          case 2:
            tbf(_0x23a024, "공퍼증", 70, "연심♡공명1", 8);
            tbf(_0x23a024, "일뎀증", 70, "연심♡공명2", 8);
            tbf(_0x23a024, "가뎀증", 45, "연심♡공명3", 8);
            break;
          case 3:
            tbf(_0x23a024, "공퍼증", 80, "연심♡공명1", 8);
            tbf(_0x23a024, "일뎀증", 80, "연심♡공명2", 8);
            tbf(_0x23a024, "가뎀증", 50, "연심♡공명3", 8);
            break;
          case 4:
            tbf(_0x23a024, "공퍼증", 90, "연심♡공명1", 8);
            tbf(_0x23a024, "일뎀증", 90, "연심♡공명2", 8);
            tbf(_0x23a024, "가뎀증", 55, "연심♡공명3", 8);
            break;
          default:
            tbf(_0x23a024, "공퍼증", 100, "연심♡공명1", 8);
            tbf(_0x23a024, "일뎀증", 100, "연심♡공명2", 8);
            tbf(_0x23a024, "가뎀증", 60, "연심♡공명3", 8);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(40);
        tbf(all, "공퍼증", 50, "슈퍼 언리쉬", always);
        if (getElementCnt("화") >= 1) {
          tbf(_0x23a024, "공퍼증", 50, "<특화 무장α>1", always);
          for (let _0x4ea52d of getElementIdx("화", "풍")) {
            anbf(_0x23a024, "평", comp[_0x4ea52d], "받속뎀", 4, "<특화 무장α>2", 1, 10, always);
          }
        }
        if (getElKind() == 2) {
          tbf(_0x23a024, "일뎀증", 100, "<특화 무장β>1", always);
          anbf(_0x23a024, "평", boss, "받뎀증", 4, "<특화 무장β>2", 1, 10, always);
        }
        if (getRoleCnt("딜") >= 3) {
          tbf(_0x23a024, "가뎀증", 35, "<특화 무장γ>1", always);
          tbf(_0x23a024, "평추가*", 20, "<특화 무장γ>2", always);
        }
      };
      _0x23a024.passive = function () {
        tbf(_0x23a024, "공퍼증", 30, "실버아울1", always);
        tbf(_0x23a024, "일뎀증", 60, "실버아울2", always);
        tbf(_0x23a024, "공퍼증", 70, "핑크 토네이도1", always);
        tbf(_0x23a024, "가뎀증", 25, "핑크 토네이도2", always);
        tbf(_0x23a024, "일뎀증", 10, "일반 공격 데미지+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 2 == 0) {
          for (let _0x4a81f0 = 1; _0x4a81f0 < 7; _0x4a81f0++) {
            tbf(_0x23a024, "평추가*", 30, "<날개형 유도탄>" + _0x4a81f0, 1);
          }
        }
        if (GLOBAL_TURN == 1) {
          cdChange(_0x23a024, -3);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10166:
      setMnc(_0x23a024, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            nbf(_0x23a024, "공퍼증", 14, "곰돌이의 분노1", 1, 3);
            tbf(all, "궁뎀증", 36, "곰돌이의 분노2", 1);
            break;
          case 2:
            nbf(_0x23a024, "공퍼증", 16.5, "곰돌이의 분노1", 1, 3);
            tbf(all, "궁뎀증", 42, "곰돌이의 분노2", 1);
            break;
          case 3:
            nbf(_0x23a024, "공퍼증", 19, "곰돌이의 분노1", 1, 3);
            tbf(all, "궁뎀증", 48, "곰돌이의 분노2", 1);
            break;
          case 4:
            nbf(_0x23a024, "공퍼증", 21.5, "곰돌이의 분노1", 1, 3);
            tbf(all, "궁뎀증", 54, "곰돌이의 분노2", 1);
            break;
          default:
            nbf(_0x23a024, "공퍼증", 24, "곰돌이의 분노1", 1, 3);
            tbf(all, "궁뎀증", 60, "곰돌이의 분노2", 1);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {
        tbf(all, "공고증", myCurAtk + _0x23a024.id + 30, "사탕 드세요~", 1);
      };
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(40);
        tbf(all, "공퍼증", 50, "폴라 베어ㆍ애니, 출격!1", always);
        tbf(all, "궁뎀증", 30, "폴라 베어ㆍ애니, 출격!2", always);
      };
      _0x23a024.passive = function () {
        atbf(_0x23a024, "궁", all, "가뎀증", 20, "곰돌이의 사랑", 1, always);
        atbf(_0x23a024, "평", all, "공퍼증", 20, "천재 암즈걸1", 2, always);
        atbf(_0x23a024, "방", all, "공퍼증", 10, "천재 암즈걸2", 2, always);
        atbf(_0x23a024, "궁", all, "공고증", myCurAtk + _0x23a024.id + 30, "천재 암즈걸3", 1, always);
        tbf(_0x23a024, "공퍼증", 10, "공격+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {
          if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 4 == 0) {
            for (let _0x1d2d38 of getElementIdx("광", "암")) {
              if (getRoleIdx("딜", "디").includes(_0x1d2d38)) {
                tbf(boss, "받뎀증", 20, "<백백의 과도한 서포트>1", 1);
                tbf(comp[_0x1d2d38], "공퍼증", 80, "<백백의 과도한 서포트>2", 1);
                tbf(comp[_0x1d2d38], "궁뎀증", 45, "<백백의 과도한 서포트>3", 1);
                tbf(comp[_0x1d2d38], "가뎀증", 50, "<백백의 과도한 서포트>4", 1);
              }
            }
          }
        }
        if (GLOBAL_TURN == 1) {
          nbf(boss, "받궁뎀", 30, "백백 탐측기", 1, 1);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10176:
      setMnc(_0x23a024, [0, 3, 0, 3, 165, 3, 211, 3, 257, 3], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            break;
          case 2:
            break;
          case 3:
            break;
          case 4:
            break;
          default:
            nbf(boss, "받뎀증", 20, "다양성과 평등과 포용의 캐넌", 1, 2);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        tbf(_0x23a024, "공퍼증", 100, "<콩코드 공격용 장갑>1", 1);
        tbf(_0x23a024, "일뎀증", 100, "<콩코드 공격용 장갑>2", 1);
        tbf(_0x23a024, "가뎀증", 50, "<콩코드 공격용 장갑>3", 1);
        tbf(_0x23a024, "평추가*", 100, "<콩코드 공격용 장갑>4", 1);
      };
      _0x23a024.passive = function () {
        tbf(_0x23a024, "공퍼증", 70, "성형 후 컴백1", always);
        tbf(_0x23a024, "일뎀증", 70, "성형 후 컴백2", always);
        tbf(_0x23a024, "궁뎀증", 30, "성형 후 컴백3", always);
        tbf(_0x23a024, "가뎀증", 20, "성형 후 컴백4", always);
        tbf(_0x23a024, "평추가*", 50, "성형 후 컴백5", always);
        tbf(_0x23a024, "공퍼증", 10, "공격+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10167:
      setMnc(_0x23a024, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            for (let _0xa98ec1 of getRoleIdx("딜")) {
              tbf(comp[_0xa98ec1], "공퍼증", 20, "반짝☆응원1", 2);
            }
            for (let _0x4ab941 of getRoleIdx("딜")) {
              nbf(comp[_0x4ab941], "가뎀증", 10, "반짝☆응원2", 1, 4);
            }
            for (let _0x5129d6 of getRoleIdx("딜")) {
              atbf(comp[_0x5129d6], "궁", comp[_0x5129d6], "제거", "기본", "반짝☆응원3", 2, 1);
              atbf(comp[_0x5129d6], "궁", comp[_0x5129d6], "공고증", myCurAtk + comp[_0x5129d6].id + 10, "반짝☆응원3", 2, 1);
            }
            for (let _0xac9403 of getElementIdx("화")) {
              nbf(comp[_0xac9403], "받속뎀", 5, "반짝☆응원4", 1, 4);
            }
            break;
          case 2:
            for (let _0x344046 of getRoleIdx("딜")) {
              tbf(comp[_0x344046], "공퍼증", 25, "반짝☆응원1", 2);
            }
            for (let _0x1a2c60 of getRoleIdx("딜")) {
              nbf(comp[_0x1a2c60], "가뎀증", 11.25, "반짝☆응원2", 1, 4);
            }
            for (let _0x37d892 of getRoleIdx("딜")) {
              atbf(comp[_0x37d892], "궁", comp[_0x37d892], "제거", "기본", "반짝☆응원3", 2, 1);
              atbf(comp[_0x37d892], "궁", comp[_0x37d892], "공고증", myCurAtk + comp[_0x37d892].id + 11.25, "반짝☆응원3", 2, 1);
            }
            for (let _0x1452b8 of getElementIdx("화")) {
              nbf(comp[_0x1452b8], "받속뎀", 7.5, "반짝☆응원4", 1, 3);
            }
            break;
          case 3:
            for (let _0x3f3195 of getRoleIdx("딜")) {
              tbf(comp[_0x3f3195], "공퍼증", 30, "반짝☆응원1", 2);
            }
            for (let _0xee2ab9 of getRoleIdx("딜")) {
              nbf(comp[_0xee2ab9], "가뎀증", 16.66, "반짝☆응원2", 1, 3);
            }
            for (let _0x203142 of getRoleIdx("딜")) {
              atbf(comp[_0x203142], "궁", comp[_0x203142], "제거", "기본", "반짝☆응원3", 2, 1);
              atbf(comp[_0x203142], "궁", comp[_0x203142], "공고증", myCurAtk + comp[_0x203142].id + 12.5, "반짝☆응원3", 2, 1);
            }
            for (let _0x3a2f6b of getElementIdx("화")) {
              nbf(comp[_0x3a2f6b], "받속뎀", 8.33, "반짝☆응원4", 1, 3);
            }
            break;
          case 4:
            for (let _0x21c6f1 of getRoleIdx("딜")) {
              tbf(comp[_0x21c6f1], "공퍼증", 35, "반짝☆응원1", 2);
            }
            for (let _0x2c367f of getRoleIdx("딜")) {
              nbf(comp[_0x2c367f], "가뎀증", 18.33, "반짝☆응원2", 1, 3);
            }
            for (let _0x5d6f97 of getRoleIdx("딜")) {
              atbf(comp[_0x5d6f97], "궁", comp[_0x5d6f97], "제거", "기본", "반짝☆응원3", 2, 1);
              atbf(comp[_0x5d6f97], "궁", comp[_0x5d6f97], "공고증", myCurAtk + comp[_0x5d6f97].id + 13.75, "반짝☆응원3", 2, 1);
            }
            for (let _0x4e9bfa of getElementIdx("화")) {
              nbf(comp[_0x4e9bfa], "받속뎀", 13.75, "반짝☆응원4", 1, 2);
            }
            break;
          default:
            for (let _0x2f128a of getRoleIdx("딜")) {
              tbf(comp[_0x2f128a], "공퍼증", 40, "반짝☆응원1", 2);
            }
            for (let _0x7d8f1a of getRoleIdx("딜")) {
              nbf(comp[_0x7d8f1a], "가뎀증", 30, "반짝☆응원2", 1, 2);
            }
            for (let _0x1f8bd7 of getRoleIdx("딜")) {
              atbf(comp[_0x1f8bd7], "궁", comp[_0x1f8bd7], "제거", "기본", "반짝☆응원3", 2, 1);
              atbf(comp[_0x1f8bd7], "궁", comp[_0x1f8bd7], "공고증", myCurAtk + comp[_0x1f8bd7].id + 15, "반짝☆응원3", 2, 1);
            }
            for (let _0x2765fc of getElementIdx("화")) {
              nbf(comp[_0x2765fc], "받속뎀", 15, "반짝☆응원4", 1, 2);
            }
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {
        tbf(all, "공고증", myCurAtk + _0x23a024.id + 30, "아이돌 응원", 1);
      };
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(40);
        for (let _0x428108 of comp) {
          if (_0x428108.element != 0) {
            continue;
          }
          if (_0x428108.role == 0) {
            continue;
          }
          atbf(_0x428108, "평", boss, "받뎀증", 5, "<열정 나눔>1", 1, 50);
          for (let _0x22c518 of getElementIdx("화")) {
            atbf(_0x428108, "평", comp[_0x22c518], "받속뎀", 5, "<열정 나눔>2", 1, 50);
          }
          nbf(all, "공퍼증", 20, "<열정 나눔>3", 1, 4);
          for (let _0x34bb22 of comp) {
            if (_0x34bb22.element == 0 && _0x34bb22.role == 0) {
              nbf(_0x34bb22, "일뎀증", 15, "<열정 나눔>4", 1, 4);
              nbf(_0x34bb22, "가뎀증", 10, "<열정 나눔>5", 1, 4);
              tbf(_0x34bb22, "평추가*", 15, "<열정 나눔>6", 50);
            }
          }
        }
      };
      _0x23a024.passive = function () {
        tbf(_0x23a024, "평추가*", 50, "한 방 역전☆1", always);
        atbf(_0x23a024, "궁", all, "공고증", myCurAtk + _0x23a024.id + 30, "한 방 역전☆2", 1, always);
        for (let _0x58310b of getRoleIdx("딜")) {
          atbf(comp[_0x58310b], "궁", comp[_0x58310b], "평추가*", 40, "<스페셜 응원 스킬♡>", 2, always);
        }
        tbf(_0x23a024, "공퍼증", 10, "공격+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        if (GLOBAL_TURN == 2 || GLOBAL_TURN == 6 || GLOBAL_TURN == 10) {
          for (let _0x2509c1 of getRoleIdx("딜")) {
            nbf(comp[_0x2509c1], "일뎀증", 30, "용기☆두근두근~!", 1, 3);
          }
        }
        if (GLOBAL_TURN == 1) {
          cdChange(_0x23a024, -4);
          for (let _0x2d9f5b of getRoleIdx("딜")) {
            cdChange(comp[_0x2d9f5b], -4);
          }
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10168:
      _0x23a024.stack = 0;
      buff_ex.push("<행운의 부적>");
      setMnc(_0x23a024, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(boss, "받뎀증", 12, "가득한 기운을 모두에게☆1", 1);
            nbf(boss, "받뎀증", 6, "가득한 기운을 모두에게☆2", 1, 2);
            break;
          case 2:
            tbf(boss, "받뎀증", 14, "가득한 기운을 모두에게☆1", 1);
            nbf(boss, "받뎀증", 7, "가득한 기운을 모두에게☆2", 1, 2);
            break;
          case 3:
            tbf(boss, "받뎀증", 16, "가득한 기운을 모두에게☆1", 1);
            nbf(boss, "받뎀증", 8, "가득한 기운을 모두에게☆2", 1, 2);
            for (let _0x56501e of getElementIdx("풍")) {
              tbf(comp[_0x56501e], "받속뎀", 10, "가득한 기운을 모두에게☆3", 1);
            }
            for (let _0xb4378 of getElementIdx("풍")) {
              nbf(comp[_0xb4378], "받속뎀", 5, "가득한 기운을 모두에게☆4", 1, 2);
            }
            break;
          case 4:
            tbf(boss, "받뎀증", 18, "가득한 기운을 모두에게☆1", 1);
            nbf(boss, "받뎀증", 9, "가득한 기운을 모두에게☆2", 1, 2);
            for (let _0x47313b of getElementIdx("풍")) {
              tbf(comp[_0x47313b], "받속뎀", 12, "가득한 기운을 모두에게☆3", 1);
            }
            for (let _0x3a3754 of getElementIdx("풍")) {
              nbf(comp[_0x3a3754], "받속뎀", 6, "가득한 기운을 모두에게☆4", 1, 2);
            }
            break;
          default:
            tbf(boss, "받뎀증", 20, "가득한 기운을 모두에게☆1", 1);
            nbf(boss, "받뎀증", 10, "가득한 기운을 모두에게☆2", 1, 2);
            for (let _0x3dd467 of getElementIdx("풍")) {
              tbf(comp[_0x3dd467], "받속뎀", 14, "가득한 기운을 모두에게☆3", 1);
            }
            for (let _0x468ecc of getElementIdx("풍")) {
              nbf(comp[_0x468ecc], "받속뎀", 7, "가득한 기운을 모두에게☆4", 1, 2);
            }
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        if (_0x23a024.stack == 0) {
          setBuffOn(_0x23a024, "발동", "<행운 더하기>1", true);
        }
        if (_0x23a024.stack == 2) {
          setBuffOn(_0x23a024, "발동", "<행운 더하기>3", true);
        }
        ultLogic(_0x23a024);
        if (_0x23a024.stack == 0) {
          setBuffOn(_0x23a024, "발동", "<행운 더하기>1", false);
        }
        if (_0x23a024.stack == 2) {
          setBuffOn(_0x23a024, "발동", "<행운 더하기>3", false);
        }
        _0x23a024.stack += 1;
        if (_0x23a024.stack > 3) {
          _0x23a024.stack = 3;
        }
        if (_0x23a024.stack == 1) {
          for (let _0x3a0a3c of comp) {
            setBuffOn(_0x3a0a3c, "기본", "<행운 더하기>1", true);
          }
        }
        if (_0x23a024.stack == 3) {
          for (let _0x18b8bf of comp) {
            setBuffOn(_0x18b8bf, "기본", "<행운 더하기>3", true);
          }
        }
        for (let _0x4b7869 of comp) {
          _0x4b7869.heal();
        }
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
        for (let _0x5778e9 of comp) {
          _0x5778e9.heal();
        }
      };
      _0x23a024.leader = function () {
        for (let _0x53de94 of getElementIdx("풍")) {
          hpUpMe(comp[_0x53de94], 50);
        }
        for (let _0xee579d of getElementIdx("풍")) {
          tbf(comp[_0xee579d], "공퍼증", 100, "전력을 다해 승리를 쟁취~!1", always);
        }
        for (let _0x18070b of getElementIdx("풍")) {
          anbf(_0x23a024, "궁", comp[_0x18070b], "받속뎀", 10, "전력을 다해 승리를 쟁취~!2", 1, 2, always);
        }
        if (getElementCnt("풍") >= 4) {
          tbf(all, "일뎀증", 80, "<플레이, 플레이, 필승!>1", always);
          tbf(all, "궁뎀증", 50, "<플레이, 플레이, 필승!>2", always);
        }
      };
      _0x23a024.passive = function () {
        anbf(_0x23a024, "궁", all, "<행운의 부적>", 0, "부적은 많으면 많을수록 좋아!", 1, 3, always);
        buff(all, "공퍼증", 30, "<행운 더하기>1", always, false);
        buff(_0x23a024, "궁", _0x23a024, "on", "기본", "<행운 더하기>1", 1, always, "발동", false);
        buff(all, "일뎀증", 30, "<행운 더하기>3", always, false);
        buff(_0x23a024, "궁", _0x23a024, "on", "기본", "<행운 더하기>3", 1, always, "발동", false);
        atbf(_0x23a024, "공격", all, "공고증", myCurAtk + _0x23a024.id + 10, "컨디션 최고!1", 1, always);
        atbf(_0x23a024, "궁", all, "궁뎀증", 30, "컨디션 최고!2", 1, always);
        tbf(all, "궁추가*", 25, "응원 만점!2", always);
        tbf(_0x23a024, "공퍼증", 10, "공격+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        if (GLOBAL_TURN == 1) {
          cdChange(_0x23a024, -4);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10169:
      setMnc(_0x23a024, [265, 4, 298, 4, 331, 4, 364, 4, 397, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(_0x23a024, "공퍼증", 100, "기분이 좋아지는 일을 해봐요~1", 1);
            nbf(boss, "받궁뎀", 6, "기분이 좋아지는 일을 해봐요~2", 1, 6);
            nbf(boss, "받발뎀", 6, "기분이 좋아지는 일을 해봐요~3", 1, 6);
            break;
          case 2:
            tbf(_0x23a024, "공퍼증", 125, "기분이 좋아지는 일을 해봐요~1", 1);
            nbf(boss, "받궁뎀", 10.5, "기분이 좋아지는 일을 해봐요~2", 1, 4);
            nbf(boss, "받발뎀", 10.5, "기분이 좋아지는 일을 해봐요~3", 1, 4);
            break;
          case 3:
            tbf(_0x23a024, "공퍼증", 150, "기분이 좋아지는 일을 해봐요~1", 1);
            for (let _0x25702d of getElementIdx("암")) {
              nbf(comp[_0x25702d], "받속뎀", 2.5, "기분이 좋아지는 일을 해봐요~4", 1, 4);
            }
            nbf(boss, "받궁뎀", 12, "기분이 좋아지는 일을 해봐요~2", 1, 4);
            nbf(boss, "받발뎀", 12, "기분이 좋아지는 일을 해봐요~3", 1, 4);
            break;
          case 4:
            tbf(_0x23a024, "공퍼증", 175, "기분이 좋아지는 일을 해봐요~1", 1);
            for (let _0x415e04 of getElementIdx("암")) {
              nbf(comp[_0x415e04], "받속뎀", 3.75, "기분이 좋아지는 일을 해봐요~4", 1, 4);
            }
            nbf(boss, "받궁뎀", 13.5, "기분이 좋아지는 일을 해봐요~2", 1, 4);
            nbf(boss, "받발뎀", 13.5, "기분이 좋아지는 일을 해봐요~3", 1, 4);
            break;
          default:
            tbf(_0x23a024, "공퍼증", 200, "기분이 좋아지는 일을 해봐요~1", 1);
            for (let _0x2926d0 of getElementIdx("암")) {
              nbf(comp[_0x2926d0], "받속뎀", 5, "기분이 좋아지는 일을 해봐요~4", 1, 4);
            }
            nbf(boss, "받궁뎀", 15, "기분이 좋아지는 일을 해봐요~2", 1, 4);
            nbf(boss, "받발뎀", 15, "기분이 좋아지는 일을 해봐요~3", 1, 4);
            break;
        }
      };
      _0x23a024.ultafter = function () {
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 4 == 0) {
          cdChange(_0x23a024, -3);
        }
      };
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {
        tbf(_0x23a024, "공퍼증", 100, "엄마의 사랑♡", 1);
      };
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(40);
        tbf(all, "공퍼증", 100, "토끼 모녀 덮밥1", always);
        if (getElKind() == 2) {
          for (let _0x56934b of getElementIdx("화")) {
            for (let _0x28ad4c of getElementIdx("암")) {
              atbf(comp[_0x56934b], "공격", comp[_0x28ad4c], "공고증", myCurAtk + comp[_0x56934b].id + 10, "<모녀 합심>1", 1, always);
            }
            atbf(comp[_0x56934b], "공격", boss, "받뎀증", 3.5, "<모녀 합심>2", 2, always);
            for (let _0x166f7c of getElementIdx("암")) {
              atbf(comp[_0x56934b], "공격", comp[_0x166f7c], "받속뎀", 3, "<모녀 합심>3", 2, always);
            }
          }
          for (let _0x2d5866 of getElementIdx("암")) {
            tbf(comp[_0x2d5866], "가뎀증", 30, "<전력 착정>1", always);
            tbf(comp[_0x2d5866], "궁뎀증", 40, "<전력 착정>2", always);
            tbf(comp[_0x2d5866], "발효증", 80, "<전력 착정>3", always);
          }
        }
      };
      _0x23a024.passive = function () {
        tbf(_0x23a024, "공발동*", 50, "평타 연격 관통1", always);
        tbf(_0x23a024, "공발동*", 50, "평타 연격 관통2", always);
        tbf(_0x23a024, "방뎀증", 100, "평타 연격 관통3", always);
        atbf(_0x23a024, "공격", boss, "받뎀증", 10, "<채양보음>1", 3, always);
        anbf(_0x23a024, "공격", all, "받아증", 3, "<채양보음>3", 1, 10, always);
        tbf(_0x23a024, "공퍼증", 10, "공격+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 4 == 0) {
          cdChange(_0x23a024, -1);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10170:
      _0x23a024.stack = 0;
      buff_ex.push("<응석 받아줄게~>");
      setMnc(_0x23a024, [120, 4, 140, 4, 160, 4, 180, 4, 200, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        for (let _0x151690 of getElementIdx("수")) {
          if (role[comp[_0x151690].role] == "딜") {
            deleteBuff(comp[_0x151690], "기본", "엄마의 사랑 요리♡2");
          }
        }
        switch (_0x17c963) {
          case 1:
            for (let _0x5e337d of getElementIdx("수")) {
              if (role[comp[_0x5e337d].role] == "딜") {
                tbf(comp[_0x5e337d], "가뎀증", 24, "엄마의 사랑 요리♡2", 4);
              }
            }
            break;
          case 2:
            for (let _0x520718 of getElementIdx("수")) {
              if (role[comp[_0x520718].role] == "딜") {
                tbf(comp[_0x520718], "가뎀증", 28, "엄마의 사랑 요리♡2", 4);
              }
            }
            break;
          case 3:
            for (let _0x5b6e31 of getElementIdx("수")) {
              if (role[comp[_0x5b6e31].role] == "딜") {
                tbf(comp[_0x5b6e31], "가뎀증", 32, "엄마의 사랑 요리♡2", 4);
              }
            }
            break;
          case 4:
            for (let _0x4254ea of getElementIdx("수")) {
              if (role[comp[_0x4254ea].role] == "딜") {
                tbf(comp[_0x4254ea], "가뎀증", 36, "엄마의 사랑 요리♡2", 4);
              }
            }
            break;
          default:
            for (let _0x54d72c of getElementIdx("수")) {
              if (role[comp[_0x54d72c].role] == "딜") {
                tbf(comp[_0x54d72c], "가뎀증", 40, "엄마의 사랑 요리♡2", 4);
              }
            }
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        if (_0x23a024.stack == 0) {
          setBuffOn(_0x23a024, "기본", "영양 만점의 맛있는 저녁1", true);
        }
        ultLogic(_0x23a024);
        switch (_0x17c963) {
          case 1:
            nbf(_0x23a024, "<응석 받아줄게~>", 0, "엄마의 사랑 요리♡", 4, 8);
            _0x23a024.stack += 4;
            if (_0x23a024.stack > 8) {
              _0x23a024.stack = 8;
            }
            break;
          case 2:
            nbf(_0x23a024, "<응석 받아줄게~>", 0, "엄마의 사랑 요리♡", 5, 8);
            _0x23a024.stack += 5;
            if (_0x23a024.stack > 8) {
              _0x23a024.stack = 8;
            }
            break;
          case 3:
            nbf(_0x23a024, "<응석 받아줄게~>", 0, "엄마의 사랑 요리♡", 6, 8);
            _0x23a024.stack += 6;
            if (_0x23a024.stack > 8) {
              _0x23a024.stack = 8;
            }
            break;
          case 4:
            nbf(_0x23a024, "<응석 받아줄게~>", 0, "엄마의 사랑 요리♡", 7, 8);
            _0x23a024.stack += 7;
            if (_0x23a024.stack > 8) {
              _0x23a024.stack = 8;
            }
            break;
          default:
            nbf(_0x23a024, "<응석 받아줄게~>", 0, "엄마의 사랑 요리♡", 8, 8);
            _0x23a024.stack += 8;
            if (_0x23a024.stack > 8) {
              _0x23a024.stack = 8;
            }
            break;
        }
        _0x23a024.tmpfunc();
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(40);
        if (getElementCnt("수") >= 3) {
          tbf(all, "공퍼증", 80, "<행복한 장난>1", always);
          tbf(all, "일뎀증", 70, "<행복한 장난>2", always);
          ptbf(all, "평", all, "힐", 20, "<행복한 장난>3", 1, always);
          ptbf(all, "궁", all, "힐", 50, "<행복한 장난>4", 1, always);
        }
        if (getElementCnt("수") >= 5) {
          tbf(all, "평추가*", 20, "<착한 아이를 위한 선물>1", always);
          for (let _0x3516c1 of getElementIdx("수")) {
            anbf(all, "평", comp[_0x3516c1], "받속뎀", 2.5, "<착한 아이를 위한 선물>2", 1, 10, always);
          }
        }
      };
      _0x23a024.tmpfunc = function () {
        const _0x5a0fc8 = _0x23a024.stack;
        setBuffSize(_0x23a024, "발동", "초보 엄마의 새출발2", _0x5a0fc8 * 10);
        setBuffSize(_0x23a024, "발동", "초보 엄마의 새출발3", _0x5a0fc8 * 10);
        setBuffOn(_0x23a024, "기본", "영양 만점의 맛있는 저녁1", _0x5a0fc8 >= 1);
        setBuffOn(_0x23a024, "기본", "영양 만점의 맛있는 저녁2", _0x5a0fc8 >= 2);
        setBuffOn(_0x23a024, "기본", "영양 만점의 맛있는 저녁3", _0x5a0fc8 >= 3);
      };
      _0x23a024.passive = function () {
        anbf(_0x23a024, "평", boss, "받뎀증", 1.5, "초보 엄마의 새출발1", 1, 10, always);
        atbf(_0x23a024, "공격", _0x23a024, "평추가*", 0, "초보 엄마의 새출발2", 2, always);
        atbf(_0x23a024, "방", _0x23a024, "평추가*", 0, "초보 엄마의 새출발3", 2, always);
        buff(_0x23a024, "공퍼증", 50, "영양 만점의 맛있는 저녁1", always, false);
        buff(_0x23a024, "일뎀증", 35, "영양 만점의 맛있는 저녁2", always, false);
        buff(_0x23a024, "평추가*", 30, "영양 만점의 맛있는 저녁3", always, false);
        tbf(_0x23a024, "가뎀증", 20, "여우 엄마의 비밀 특훈1", always);
        for (let _0x59fd5d of getRoleIdx("딜", "디")) {
          atbf(_0x23a024, "힐", comp[_0x59fd5d], "일뎀증", 9, "여우 엄마의 비밀 특훈2", 4, always);
        }
        tbf(_0x23a024, "공퍼증", 10, "공격+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        if (GLOBAL_TURN == 1) {
          for (let _0x3749e0 of getElementIdx("수")) {
            if (role[comp[_0x3749e0].role] == "딜") {
              cdChange(comp[_0x3749e0], -4);
            }
          }
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
        nbf(_0x23a024, "<응석 받아줄게~>", 0, "엄마의 사랑 요리♡", -1, 8);
        _0x23a024.stack -= 1;
        if (_0x23a024.stack < 0) {
          _0x23a024.stack = 0;
        }
        _0x23a024.tmpfunc();
      };
      return _0x23a024;
    case 10171:
      _0x23a024.stack = 0;
      buff_ex.push("<만물을 굴복시키는 왕자의 위엄>", "<만물을 굴복시키는 왕자의 위엄>감소면역");
      setMnc(_0x23a024, [330, 4, 375, 4, 420, 4, 465, 4, 510, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            nbf(_0x23a024, "<만물을 굴복시키는 왕자의 위엄>", 0, "최후의 불꽃·장미의 춤", 1, 4);
            _0x23a024.stack += 1;
            if (_0x23a024.stack > 4) {
              _0x23a024.stack = 4;
            }
            break;
          case 2:
            nbf(_0x23a024, "<만물을 굴복시키는 왕자의 위엄>", 0, "최후의 불꽃·장미의 춤", 2, 4);
            _0x23a024.stack += 2;
            if (_0x23a024.stack > 4) {
              _0x23a024.stack = 4;
            }
            break;
          case 3:
            nbf(_0x23a024, "<만물을 굴복시키는 왕자의 위엄>", 0, "최후의 불꽃·장미의 춤", 3, 4);
            _0x23a024.stack += 3;
            if (_0x23a024.stack > 4) {
              _0x23a024.stack = 4;
            }
            break;
          case 4:
            nbf(_0x23a024, "<만물을 굴복시키는 왕자의 위엄>", 0, "최후의 불꽃·장미의 춤", 4, 4);
            _0x23a024.stack += 4;
            if (_0x23a024.stack > 4) {
              _0x23a024.stack = 4;
            }
            break;
          default:
            nbf(_0x23a024, "<만물을 굴복시키는 왕자의 위엄>", 0, "최후의 불꽃·장미의 춤", 4, 4);
            _0x23a024.stack += 4;
            if (_0x23a024.stack > 4) {
              _0x23a024.stack = 4;
            }
            tbf(_0x23a024, "<만물을 굴복시키는 왕자의 위엄>감소면역", 0, "최후의 불꽃·장미의 춤2", 4);
            break;
        }
        setBuffOn(_0x23a024, "기본", "절대적인 힘1", _0x23a024.stack >= 1);
        setBuffOn(_0x23a024, "기본", "절대적인 힘2", _0x23a024.stack >= 2);
        setBuffOn(_0x23a024, "기본", "절대적인 힘3", _0x23a024.stack >= 3);
        setBuffOn(_0x23a024, "기본", "절대적인 힘4", _0x23a024.stack >= 4);
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024, 3);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        if (_0x23a024.isLeader && getElKind() == 5) {
          for (let _0x3b4acb of comp) {
            if (_0x3b4acb.id == _0x23a024.id) {
              continue;
            }
            atbf(_0x3b4acb, "평", boss, "받뎀증", 5.5, "<영광의 귀환 이블리스>1", 2, 1);
            atbf(_0x3b4acb, "궁", boss, "받뎀증", 5.5, "<영광의 귀환 이블리스>2", 2, 2);
            atbf(_0x3b4acb, "평", _0x23a024, "공고증", myCurAtk + _0x3b4acb.id + 10, "<영광의 귀환 이블리스>3", 2, 1);
            atbf(_0x3b4acb, "궁", _0x23a024, "공고증", myCurAtk + _0x3b4acb.id + 10, "<영광의 귀환 이블리스>4", 2, 2);
            atbf(_0x3b4acb, "평", _0x23a024, "평추가*", 30, "<영광의 귀환 이블리스>5", 2, 1);
            atbf(_0x3b4acb, "궁", _0x23a024, "평추가*", 30, "<영광의 귀환 이블리스>6", 2, 2);
            atbf(_0x3b4acb, "평", _0x23a024, "궁추가*", 60, "<영광의 귀환 이블리스>7", 1, 1);
            atbf(_0x3b4acb, "궁", _0x23a024, "궁추가*", 60, "<영광의 귀환 이블리스>8", 1, 2);
          }
        }
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(40);
        tbf(all, "공퍼증", 50, "최강의 이블리스", always);
        if (getElKind() == 5) {
          tbf(_0x23a024, "일뎀증", 100, "<선봉의 왕>1", always);
          tbf(_0x23a024, "궁뎀증", 50, "<선봉의 왕>2", always);
          tbf(_0x23a024, "가뎀증", 30, "<선봉의 왕>3", always);
          for (let _0x166f29 of getElementIdx("풍")) {
            atbf(_0x23a024, "궁", comp[_0x166f29], "받속뎀", 25, "<선봉의 왕>6", 5, always);
          }
        }
      };
      _0x23a024.passive = function () {
        atbf(_0x23a024, "피격", all, "제거", "기본", "도전 응수자의 프라이드2", 1, always);
        atbf(_0x23a024, "피격", all, "공퍼증", 50, "도전 응수자의 프라이드2", 5, always);
        buff(_0x23a024, "방뎀증", 110, "절대적인 힘1", always, false);
        buff(_0x23a024, "일뎀증", 100, "절대적인 힘2", always, false);
        buff(_0x23a024, "궁뎀증", 50, "절대적인 힘3", always, false);
        buff(_0x23a024, "가뎀증", 30, "절대적인 힘4", always, false);
        tbf(_0x23a024, "가뎀증", 7.5, "데미지+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
        if (getBuffSize(_0x23a024, "기본", "최후의 불꽃·장미의 춤2") == undefined) {
          nbf(_0x23a024, "<만물을 굴복시키는 왕자의 위엄>", 0, "최후의 불꽃·장미의 춤", -1, 4);
          _0x23a024.stack -= 1;
          if (_0x23a024.stack < 0) {
            _0x23a024.stack = 0;
          }
          setBuffOn(_0x23a024, "기본", "절대적인 힘1", _0x23a024.stack >= 1);
          setBuffOn(_0x23a024, "기본", "절대적인 힘2", _0x23a024.stack >= 2);
          setBuffOn(_0x23a024, "기본", "절대적인 힘3", _0x23a024.stack >= 3);
          setBuffOn(_0x23a024, "기본", "절대적인 힘4", _0x23a024.stack >= 4);
        }
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {
          if (GLOBAL_TURN == 1) {
            if (getElKind() == 5) {
              cdChange(_0x23a024, -4);
            }
          }
        }
        if (GLOBAL_TURN == 1) {
          _0x23a024.canCDChange = false;
        }
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 4 == 0) {
          if (_0x23a024.stack >= 4) {
            tbf(boss, "받뎀증", 30, "<마왕 영역>1", 4);
            for (let _0x215e6d of getElementIdx("풍")) {
              tbf(comp[_0x215e6d], "받속뎀", 25, "<마왕 영역>2", 4);
            }
            tbf(boss, "방경감", 50, "<마왕 영역>3", 1);
            atbf(boss, "피격", boss, "방어", 0, "<마왕 영역>4", 1, 1);
            atbf(boss, "피격", boss, "제거", "발동", "<마왕 영역>4", 1, 1);
          }
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10172:
      setMnc(_0x23a024, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        deleteBuff(_0x23a024, "기본", "물총 전쟁 시작~!1");
        switch (_0x17c963) {
          case 1:
            tbf(_0x23a024, "공퍼증", 60, "물총 전쟁 시작~!1", 4);
            for (let _0x44d7ee of getElementIdx("광")) {
              nbf(comp[_0x44d7ee], "받속뎀", 18, "물총 전쟁 시작~!2", 1, 1);
            }
            tbf(all, "아머", _0x23a024.hp * 20 * armorUp(_0x23a024, "궁", "추가"), "물총 전쟁 시작~!4", 2);
            break;
          case 2:
            tbf(_0x23a024, "공퍼증", 70, "물총 전쟁 시작~!1", 4);
            for (let _0x2715e2 of getElementIdx("광")) {
              nbf(comp[_0x2715e2], "받속뎀", 21, "물총 전쟁 시작~!2", 1, 1);
            }
            tbf(all, "아머", _0x23a024.hp * 20 * armorUp(_0x23a024, "궁", "추가"), "물총 전쟁 시작~!4", 2);
            break;
          case 3:
            tbf(_0x23a024, "공퍼증", 80, "물총 전쟁 시작~!1", 4);
            for (let _0x3495d4 of getElementIdx("광")) {
              nbf(comp[_0x3495d4], "받속뎀", 24, "물총 전쟁 시작~!2", 1, 1);
            }
            tbf(all, "아머", _0x23a024.hp * 20 * armorUp(_0x23a024, "궁", "추가"), "물총 전쟁 시작~!4", 2);
            break;
          case 4:
            tbf(_0x23a024, "공퍼증", 90, "물총 전쟁 시작~!1", 4);
            for (let _0x2584e5 of getElementIdx("광")) {
              nbf(comp[_0x2584e5], "받속뎀", 27, "물총 전쟁 시작~!2", 1, 1);
            }
            tbf(all, "아머", _0x23a024.hp * 20 * armorUp(_0x23a024, "궁", "추가"), "물총 전쟁 시작~!4", 2);
            break;
          default:
            tbf(_0x23a024, "공퍼증", 100, "물총 전쟁 시작~!1", 4);
            for (let _0x5983f3 of getElementIdx("광")) {
              nbf(comp[_0x5983f3], "받속뎀", 30, "물총 전쟁 시작~!2", 1, 1);
            }
            tbf(all, "아머", _0x23a024.hp * 20 * armorUp(_0x23a024, "궁", "추가"), "물총 전쟁 시작~!4", 2);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
        for (let _0x303d73 of comp) {
          _0x303d73.heal();
        }
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
        for (let _0x41c80a of comp) {
          _0x41c80a.heal();
        }
      };
      _0x23a024.leader = function () {
        hpUpAll(40);
        tbf(all, "공퍼증", 100, "프로 순록 가이드1", always);
        if (getElementCnt("광") >= 4) {
          tbf(all, "일뎀증", 75, "<출발 준비 완료>1", always);
          tbf(all, "평추가*", 30, "<출발 준비 완료>2", always);
          tbf(all, "평추가*", 30, "<출발 준비 완료>3", always);
        }
        atbf(_0x23a024, "공격", all, "공고증", myCurAtk + _0x23a024.id + 10, "프로 순록 가이드2", 1, always);
        nbf(boss, "받뎀증", 30, "프로 순록 가이드3", 1, 1);
      };
      _0x23a024.passive = function () {
        for (let _0x63f9a7 of getElementIdx("광")) {
          atbf(_0x23a024, "평", comp[_0x63f9a7], "일뎀증", 85, "시련의 안내인1", 1, always);
        }
        atbf(_0x23a024, "공격", all, "공고증", myCurAtk + _0x23a024.id + 20, "지속형 순록 보급1", 1, always);
        for (let _0x2b3667 of getElementIdx("광")) {
          tbf(comp[_0x2b3667], "평추가*", 30, "지속형 순록 보급3", always);
        }
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10173:
      buff_ex.push("<고속 장전>");
      setMnc(_0x23a024, [265, 3, 298.20000000000005, 3, 331.09999999999997, 3, 364, 3, 396.90000000000003, 3], _0x17c963);
      _0x23a024.ultbefore = function () {
        boss.def = false;
        switch (_0x17c963) {
          case 1:
            tbf(_0x23a024, "가뎀증", 36, "선수필승이다!2", 1);
            tbf(_0x23a024, "궁뎀증", 18, "선수필승이다!3", 1);
            tbf(_0x23a024, "발효증", 50, "선수필승이다!4", 1);
            break;
          case 2:
            tbf(_0x23a024, "가뎀증", 42, "선수필승이다!2", 1);
            tbf(_0x23a024, "궁뎀증", 21, "선수필승이다!3", 1);
            tbf(_0x23a024, "발효증", 55, "선수필승이다!4", 1);
            break;
          case 3:
            tbf(_0x23a024, "가뎀증", 48, "선수필승이다!2", 1);
            tbf(_0x23a024, "궁뎀증", 24, "선수필승이다!3", 1);
            tbf(_0x23a024, "발효증", 60, "선수필승이다!4", 1);
            buff(_0x23a024, "행동", _0x23a024, "<고속 장전>", 0, "생존 게임 노장", 3, 6, 2, "발동", false);
            break;
          case 4:
            tbf(_0x23a024, "가뎀증", 54, "선수필승이다!2", 1);
            tbf(_0x23a024, "궁뎀증", 27, "선수필승이다!3", 1);
            tbf(_0x23a024, "발효증", 65, "선수필승이다!4", 1);
            buff(_0x23a024, "행동", _0x23a024, "<고속 장전>", 0, "생존 게임 노장", 3, 6, 2, "발동", false);
            break;
          default:
            tbf(_0x23a024, "가뎀증", 60, "선수필승이다!2", 1);
            tbf(_0x23a024, "궁뎀증", 30, "선수필승이다!3", 1);
            tbf(_0x23a024, "발효증", 70, "선수필승이다!4", 1);
            buff(_0x23a024, "행동", _0x23a024, "<고속 장전>", 0, "생존 게임 노장", 3, 6, 2, "발동", false);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        const _0x33fc52 = boss.def;
        ultLogic(_0x23a024, _0x17c963 + 4);
        setBuffOnAll(_0x23a024, "발동", "생존 게임 노장", true);
        if (_0x33fc52) {
          for (let _0x889852 of getElementIdx("수")) {
            deleteBuff(comp[_0x889852], "기본", "바로 지금이다! 가랏!");
            tbf(comp[_0x889852], "받속뎀", 20, "바로 지금이다! 가랏!", 4);
          }
        }
        _0x23a024.tmpfunc();
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
        _0x23a024.tmpfunc();
      };
      _0x23a024.leader = function () {
        hpUpAll(40);
        tbf(all, "공퍼증", 100, "하운드 소대 여름 집합1", always);
        tbf(all, "가뎀증", 40, "하운드 소대 여름 집합2", always);
        tbf(all, "궁뎀증", 30, "하운드 소대 여름 집합3", always);
        tbf(all, "발효증", 60, "하운드 소대 여름 집합4", always);
        nbf(boss, "받뎀증", 30, "하운드 소대 여름 집합5", 1, 1);
        for (let _0xd51a79 of comp) {
          if (_0xd51a79.id == _0x23a024.id) {
            continue;
          }
          tbf(_0xd51a79, "공발동*", 60, "<엄호 공격>1", always);
          tbf(_0xd51a79, "궁추가*", 120, "<엄호 공격>2", always);
        }
        for (let _0x55c3e5 of getRoleIdx("딜")) {
          if (comp[_0x55c3e5].id == _0x23a024.id) {
            continue;
          }
          tbf(comp[_0x55c3e5], "가뎀증", -500, "<물러서!>", always);
        }
      };
      _0x23a024.tmpfunc = function () {
        const _0x57232f = _0x23a024.getNest("<고속 장전>");
        setBuffOn(_0x23a024, "기본", "<전력 사격>1", _0x57232f >= 1);
        setBuffOn(_0x23a024, "기본", "<전력 사격>2", _0x57232f >= 2);
        setBuffOn(_0x23a024, "기본", "<전력 사격>3", _0x57232f >= 3);
        setBuffOn(_0x23a024, "기본", "<전력 사격>4", _0x57232f >= 4);
        setBuffOn(_0x23a024, "기본", "<전력 사격>5", _0x57232f >= 5);
        setBuffOn(_0x23a024, "기본", "<전력 사격>6", _0x57232f == 6);
        setBuffOn(_0x23a024, "기본", "바로 지금이다! 가랏!1", _0x57232f >= 1);
        setBuffOn(_0x23a024, "기본", "바로 지금이다! 가랏!2", _0x57232f >= 2);
        setBuffOn(_0x23a024, "기본", "바로 지금이다! 가랏!3", _0x57232f >= 3);
        setBuffOn(_0x23a024, "기본", "하운드의 정신적 상징1", _0x57232f >= 4);
        setBuffOn(_0x23a024, "기본", "하운드의 정신적 상징2", _0x57232f >= 5);
        setBuffOn(_0x23a024, "기본", "하운드의 정신적 상징3", _0x57232f == 6);
      };
      _0x23a024.passive = function () {
        anbf(_0x23a024, "방", _0x23a024, "<고속 장전>", 0, "생존 게임 노장", 3, 6, always);
        anbf(_0x23a024, "피격", _0x23a024, "<고속 장전>", 0, "생존 게임 노장", 3, 6, always);
        const _0x6571bd = _0x23a024.hit;
        _0x23a024.hit = function (..._0x43a020) {
          _0x6571bd.apply(this, _0x43a020);
          _0x23a024.tmpfunc();
        };
        buff(_0x23a024, "궁발동*", 50, "<전력 사격>1", always, false);
        buff(_0x23a024, "궁발동*", 50, "<전력 사격>2", always, false);
        buff(_0x23a024, "궁발동*", 50, "<전력 사격>3", always, false);
        buff(_0x23a024, "궁발동*", 50, "<전력 사격>4", always, false);
        buff(_0x23a024, "궁발동*", 50, "<전력 사격>5", always, false);
        buff(_0x23a024, "궁발동*", 50, "<전력 사격>6", always, false);
        if (getRoleCnt("딜") >= 2) {
          anbf(_0x23a024, "행동", _0x23a024, "<고속 장전>", 0, "생존 게임 노장", -6, 6, always);
        }
        buff(_0x23a024, "공퍼증", 50, "바로 지금이다! 가랏!1", always, false);
        buff(_0x23a024, "발효증", 20, "바로 지금이다! 가랏!2", always, false);
        buff(_0x23a024, "발효증", 20, "바로 지금이다! 가랏!3", always, false);
        atbf(_0x23a024, "방", all, "제거", "기본", "하운드의 정신적 상징", 1, always);
        atbf(_0x23a024, "방", all, "공퍼증", 50, "하운드의 정신적 상징", 2, always);
        buff(_0x23a024, "발효증", 20, "하운드의 정신적 상징1", always, false);
        buff(_0x23a024, "발효증", 20, "하운드의 정신적 상징2", always, false);
        buff(_0x23a024, "궁뎀증", 30, "하운드의 정신적 상징3", always, false);
        tbf(_0x23a024, "공퍼증", 10, "공격+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
        _0x23a024.tmpfunc();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 3 == 0) {
          anbf(_0x23a024, "행동", _0x23a024, "<고속 장전>", 0, "생존 게임 노장", -6, 6, 1);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10174:
      buff_ex.push("<수중 깊이>");
      setMnc(_0x23a024, [120, 4, 140, 4, 160, 4, 180, 4, 200, 4], _0x17c963);
      _0x23a024.stack = 0;
      _0x23a024.ultbefore = function () {
        const _0x4c97b2 = _0x23a024.stack;
        switch (_0x17c963) {
          case 1:
            _0x23a024.stack += 20;
            nbf(_0x23a024, "공퍼증", 40, "비기 - 소용돌이 폭포!2", 1, 4);
            break;
          case 2:
            _0x23a024.stack += 20;
            nbf(_0x23a024, "공퍼증", 56.66, "비기 - 소용돌이 폭포!2", 1, 3);
            break;
          case 3:
            _0x23a024.stack += 30;
            nbf(_0x23a024, "공퍼증", 60, "비기 - 소용돌이 폭포!2", 1, 3);
            nbf(_0x23a024, "가뎀증", 10, "비기 - 소용돌이 폭포!3", 1, 2);
            break;
          case 4:
            _0x23a024.stack += 30;
            nbf(_0x23a024, "공퍼증", 95, "비기 - 소용돌이 폭포!2", 1, 2);
            nbf(_0x23a024, "가뎀증", 22.5, "비기 - 소용돌이 폭포!3", 1, 2);
            break;
          default:
            _0x23a024.stack += 40;
            nbf(_0x23a024, "공퍼증", 100, "비기 - 소용돌이 폭포!2", 1, 2);
            nbf(_0x23a024, "가뎀증", 30, "비기 - 소용돌이 폭포!3", 1, 2);
            break;
        }
        if (_0x4c97b2 < 33 && _0x23a024.stack >= 33) {
          setBuffOn(_0x23a024, "기본", "심해 잠행1", true);
        }
        if (_0x4c97b2 < 66 && _0x23a024.stack >= 66) {
          setBuffOn(_0x23a024, "기본", "심해 잠행2", true);
        }
        if (_0x4c97b2 < 99 && _0x23a024.stack >= 99) {
          setBuffOn(_0x23a024, "기본", "심해 잠행3", true);
        }
        if (_0x4c97b2 < 100 && _0x23a024.stack >= 100) {
          setBuffOn(_0x23a024, "기본", "<심해 밑바닥>2", true);
        }
        if (_0x23a024.stack > 100) {
          _0x23a024.stack = 100;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        const _0x53e31c = _0x23a024.stack;
        ultLogic(_0x23a024);
        switch (_0x17c963) {
          case 1:
            nbf(_0x23a024, "<수중 깊이>", 0, "비기 - 소용돌이 폭포!", 20, 100);
            break;
          case 2:
            nbf(_0x23a024, "<수중 깊이>", 0, "비기 - 소용돌이 폭포!", 20, 100);
            break;
          case 3:
            nbf(_0x23a024, "<수중 깊이>", 0, "비기 - 소용돌이 폭포!", 30, 100);
            break;
          case 4:
            nbf(_0x23a024, "<수중 깊이>", 0, "비기 - 소용돌이 폭포!", 30, 100);
            break;
          default:
            nbf(_0x23a024, "<수중 깊이>", 0, "비기 - 소용돌이 폭포!", 40, 100);
            break;
        }
        if (_0x53e31c < 100 && _0x23a024.stack >= 100) {
          setBuffOn(_0x23a024, "기본", "<심해 밑바닥>3", true);
          setBuffOn(_0x23a024, "발동", "<심해 밑바닥>4", true);
          setBuffOn(_0x23a024, "발동", "<심해 밑바닥>5", true);
          setBuffOnAll(_0x23a024, "발동", "<심해 밑바닥>6", true);
        }
      };
      _0x23a024.atkbefore = function () {
        tbf(_0x23a024, "아머", myCurAtk + _0x23a024.id + armorUp(_0x23a024, "평", "추가") * 25, "닻 휘두르기", 1);
      };
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        const _0x6de1b1 = _0x23a024.stack;
        _0x23a024.stack += 5;
        if (_0x6de1b1 < 33 && _0x23a024.stack >= 33) {
          setBuffOn(_0x23a024, "발동", "심해 잠행1", true);
        }
        if (_0x6de1b1 < 66 && _0x23a024.stack >= 66) {
          setBuffOn(_0x23a024, "발동", "심해 잠행2", true);
        }
        if (_0x6de1b1 < 99 && _0x23a024.stack >= 99) {
          setBuffOn(_0x23a024, "발동", "심해 잠행3", true);
        }
        if (_0x6de1b1 < 100 && _0x23a024.stack >= 100) {
          setBuffOn(_0x23a024, "발동", "<심해 밑바닥>2", true);
        }
        atkLogic(_0x23a024);
        if (_0x6de1b1 < 33 && _0x23a024.stack >= 33) {
          setBuffOn(_0x23a024, "발동", "심해 잠행1", false);
        }
        if (_0x6de1b1 < 66 && _0x23a024.stack >= 66) {
          setBuffOn(_0x23a024, "발동", "심해 잠행2", false);
        }
        if (_0x6de1b1 < 99 && _0x23a024.stack >= 99) {
          setBuffOn(_0x23a024, "발동", "심해 잠행3", false);
        }
        if (_0x6de1b1 < 100 && _0x23a024.stack >= 100) {
          setBuffOn(_0x23a024, "발동", "<심해 밑바닥>2", false);
        }
        if (_0x6de1b1 < 100 && _0x23a024.stack >= 100) {
          setBuffOn(_0x23a024, "기본", "<심해 밑바닥>3", true);
          setBuffOn(_0x23a024, "발동", "<심해 밑바닥>4", true);
          setBuffOn(_0x23a024, "발동", "<심해 밑바닥>5", true);
          setBuffOnAll(_0x23a024, "발동", "<심해 밑바닥>6", true);
        }
      };
      _0x23a024.leader = function () {
        hpUpMe(_0x23a024, 60);
        tbf(all, "공퍼증", 100, "배가 나고, 내가 배야1", always);
        tbf(all, "가뎀증", 30, "배가 나고, 내가 배야2", always);
        tbf(all, "일뎀증", 40, "배가 나고, 내가 배야3", always);
        for (let _0x164d3c of comp) {
          for (let _0x187dbc of getElementIdx("수", "암")) {
            atbf(_0x164d3c, "공격", comp[_0x187dbc], "받속뎀", 5, "<닻을 올리고 출항>", 2, always);
          }
        }
      };
      _0x23a024.passive = function () {
        anbf(_0x23a024, "평", _0x23a024, "<수중 깊이>", 0, "비기 - 소용돌이 폭포!", 5, 100, always);
        buff(_0x23a024, "평", _0x23a024, "on", "기본", "심해 잠행1", 1, always, "발동", false);
        buff(_0x23a024, "평", _0x23a024, "on", "기본", "심해 잠행2", 1, always, "발동", false);
        buff(_0x23a024, "평", _0x23a024, "on", "기본", "심해 잠행3", 1, always, "발동", false);
        buff(_0x23a024, "평", _0x23a024, "on", "기본", "<심해 밑바닥>2", 1, always, "발동", false);
        anbf(_0x23a024, "피격", _0x23a024, "<수중 깊이>", 0, "비기 - 소용돌이 폭포!", 3, 100, always);
        buff(_0x23a024, "공퍼증", 60, "심해 잠행1", always, false);
        buff(_0x23a024, "일뎀증", 60, "심해 잠행2", always, false);
        buff(_0x23a024, "가뎀증", 30, "심해 잠행3", always, false);
        atbf(_0x23a024, "궁", _0x23a024, "아머", myCurAtk + _0x23a024.id + armorUp(_0x23a024, "궁", "발동") * 50, "<사냥 시작>", 1, always);
        buff(_0x23a024, "일뎀증", 60, "<심해 밑바닥>2", always, false);
        buff(_0x23a024, "평추가*", 30, "<심해 밑바닥>3", always, false);
        buff(_0x23a024, "공격", boss, "받뎀증", 20, "<심해 밑바닥>4", 2, always, "발동", false);
        buff(_0x23a024, "공격", boss, "받일뎀", 50, "<심해 밑바닥>5", 2, always, "발동", false);
        for (let _0xd54757 of getElementIdx("암")) {
          buff(_0x23a024, "공격", comp[_0xd54757], "받속뎀", 20, "<심해 밑바닥>6", 2, always, "발동", false);
        }
        tbf(_0x23a024, "공퍼증", 10, "공격+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        if (GLOBAL_TURN == 1) {
          cdChange(_0x23a024, -4);
        }
      };
      const _0x1f4e72 = _0x23a024.hit;
      _0x23a024.hit = function (..._0x3049b6) {
        const _0x13c47f = _0x23a024.stack;
        _0x23a024.stack += 3;
        if (_0x13c47f < 33 && _0x23a024.stack >= 33) {
          setBuffOn(_0x23a024, "기본", "심해 잠행1", true);
        }
        if (_0x13c47f < 66 && _0x23a024.stack >= 66) {
          setBuffOn(_0x23a024, "기본", "심해 잠행2", true);
        }
        if (_0x13c47f < 99 && _0x23a024.stack >= 99) {
          setBuffOn(_0x23a024, "기본", "심해 잠행3", true);
        }
        if (_0x13c47f < 100 && _0x23a024.stack >= 100) {
          setBuffOn(_0x23a024, "기본", "<심해 밑바닥>2", true);
        }
        _0x1f4e72.call(this);
        if (_0x13c47f < 100 && _0x23a024.stack >= 100) {
          setBuffOn(_0x23a024, "기본", "<심해 밑바닥>3", true);
          setBuffOn(_0x23a024, "발동", "<심해 밑바닥>4", true);
          setBuffOn(_0x23a024, "발동", "<심해 밑바닥>5", true);
          setBuffOnAll(_0x23a024, "발동", "<심해 밑바닥>6", true);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10160:
      buff_ex.push("<지켜야 할 존재>");
      setMnc(_0x23a024, [840, 40, 980, 40, 1120, 40, 1260, 40, 1400, 40], _0x17c963);
      _0x23a024.ultbefore = function () {
        for (let _0x2af301 of getElementIdx("광")) {
          deleteBuff(comp[_0x2af301], "기본", "성검 포효·성진편년1");
        }
        for (let _0x175149 of getRoleIdx("딜")) {
          deleteBuff(comp[_0x175149], "기본", "성검 포효·성진편년2");
        }
        switch (_0x17c963) {
          case 1:
            for (let _0x224ffe of getElementIdx("광")) {
              tbf(comp[_0x224ffe], "받속뎀", 18, "성검 포효·성진편년1", 8);
            }
            break;
          case 2:
            for (let _0x116604 of getElementIdx("광")) {
              tbf(comp[_0x116604], "받속뎀", 21, "성검 포효·성진편년1", 8);
            }
            break;
          case 3:
            for (let _0x2de4ed of getElementIdx("광")) {
              tbf(comp[_0x2de4ed], "받속뎀", 24, "성검 포효·성진편년1", 8);
            }
            for (let _0x300112 of getRoleIdx("딜")) {
              tbf(comp[_0x300112], "평추가*", 15, "성검 포효·성진편년2", 8);
            }
            break;
          case 4:
            for (let _0x3b6a6d of getElementIdx("광")) {
              tbf(comp[_0x3b6a6d], "받속뎀", 27, "성검 포효·성진편년1", 8);
            }
            for (let _0xc022f1 of getRoleIdx("딜")) {
              tbf(comp[_0xc022f1], "평추가*", 20, "성검 포효·성진편년2", 8);
            }
            break;
          default:
            for (let _0x1591db of getElementIdx("광")) {
              tbf(comp[_0x1591db], "받속뎀", 30, "성검 포효·성진편년1", 8);
            }
            for (let _0x371f04 of getRoleIdx("딜")) {
              tbf(comp[_0x371f04], "평추가*", 25, "성검 포효·성진편년2", 8);
            }
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024, _0x17c963 + 5);
      };
      _0x23a024.atkbefore = function () {
        deleteBuff(boss, "기본", "역날");
        tbf(boss, "받뎀증", 10, "역날", 2);
      };
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(40);
        let _0x30fa32 = 0;
        for (let _0xd5838e of comp) {
          if (_0xd5838e.element == 3) {
            continue;
          }
          _0x30fa32++;
          nbf(_0x23a024, "<지켜야 할 존재>", 0, "마지막 용자", 1, 4);
        }
        if (_0x30fa32 == 4) {
          _0x23a024.cd -= 20;
          _0x23a024.curCd -= 20;
          tbf(_0x23a024, "공퍼증", 200, "<모든 것을 지키는 결심>1", always);
          tbf(_0x23a024, "가뎀증", 50, "<모든 것을 지키는 결심>2", always);
          tbf(_0x23a024, "일뎀증", 100, "<모든 것을 지키는 결심>3", always);
          tbf(_0x23a024, "궁뎀증", 60, "<모든 것을 지키는 결심>4", always);
          for (let _0x1191ed of getElementIdx("광")) {
            anbf(_0x23a024, "궁", comp[_0x1191ed], "받속뎀", 30, "<모든 것을 지키는 결심>5", 1, 1, always);
          }
        }
      };
      _0x23a024.passive = function () {
        tbf(_0x23a024, "공퍼증", 50, "용사의 직책1", always);
        tbf(_0x23a024, "일뎀증", 50, "용사의 직책2", always);
        tbf(_0x23a024, "궁뎀증", 30, "용사의 직책3", always);
        tbf(_0x23a024, "방뎀증", 100, "용사의 직책4", always);
        for (let _0x26e0b5 of comp) {
          if (_0x26e0b5.id == _0x23a024.id) {
            continue;
          }
          const _0x58583d = _0x26e0b5.ultimate;
          const _0x2be5ca = _0x26e0b5.attack;
          _0x26e0b5.ultimate = function (..._0x179b87) {
            _0x58583d.apply(this, _0x179b87);
            cdChange(_0x23a024, -1);
          };
          _0x26e0b5.attack = function (..._0x4e8808) {
            _0x2be5ca.apply(this, _0x4e8808);
            cdChange(_0x23a024, -1);
          };
        }
        atbf(_0x23a024, "방", _0x23a024, "아머", _0x23a024.hp * 20 * armorUp(_0x23a024, "방", "발동"), "<새벽빛>1", 1, always);
        atbf(_0x23a024, "방", _0x23a024, "평추가*", 50, "<새벽빛>2", 2, always);
        tbf(_0x23a024, "가뎀증", 30, "성검 해방, 최종 형태!", always);
        tbf(_0x23a024, "가뎀증", 7.5, "가하는 데미지+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        if (GLOBAL_TURN == 1) {
          for (let _0x1af0f2 of comp) {
            if (_0x1af0f2.id == _0x23a024.id || _0x1af0f2.role != 0) {
              continue;
            }
            cdChange(_0x23a024, -20);
          }
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10177:
      buff_ex.push("<기내식엔 저도 포함♡>");
      setMnc(_0x23a024, [0, 3, 0, 3, 0, 3, 0, 3, 0, 3], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(all, "공퍼증", 45, "가성비 좌석~!1", 1);
            for (let _0x5f334c of getRoleIdx("딜")) {
              tbf(comp[_0x5f334c], "궁뎀증", 24, "가성비 좌석~!2", 1);
            }
            break;
          case 2:
            tbf(all, "공퍼증", 52.5, "이코노미 좌석~!!", 1);
            for (let _0x3bdadb of getRoleIdx("딜")) {
              tbf(comp[_0x3bdadb], "궁뎀증", 28, "이코노미 좌석~!2", 1);
            }
            break;
          case 3:
            tbf(all, "공퍼증", 60, "프리미엄 이코노미 좌석~!1", 1);
            for (let _0x16b162 of getRoleIdx("딜")) {
              tbf(comp[_0x16b162], "궁뎀증", 32, "프리미엄 이코노미 좌석~!2", 1);
            }
            for (let _0x4d0fc9 of getRoleIdx("딜")) {
              tbf(comp[_0x4d0fc9], "가뎀증", 5, "프리미엄 이코노미 좌석~!3", 1);
            }
            for (let _0x47aa36 of getRoleIdx("딜")) {
              tbf(comp[_0x47aa36], "궁추가*", 20, "프리미엄 이코노미 좌석~!4", 1);
            }
            break;
          case 4:
            tbf(all, "공퍼증", 67.5, "비즈니스 좌석~!1", 1);
            for (let _0x43a6ef of getRoleIdx("딜")) {
              tbf(comp[_0x43a6ef], "궁뎀증", 36, "비즈니스 좌석~!2", 1);
            }
            for (let _0x3ef48d of getRoleIdx("딜")) {
              tbf(comp[_0x3ef48d], "가뎀증", 10, "비즈니스 좌석~!3", 1);
            }
            for (let _0x34321b of getRoleIdx("딜")) {
              tbf(comp[_0x34321b], "궁추가*", 40, "비즈니스 좌석~!4", 1);
            }
            break;
          default:
            tbf(all, "공퍼증", 75, "품격 만점의 퍼스트 클래스~!1", 1);
            for (let _0x366794 of getRoleIdx("딜")) {
              tbf(comp[_0x366794], "궁뎀증", 40, "품격 만점의 퍼스트 클래스~!2", 1);
            }
            for (let _0x13bf87 of getRoleIdx("딜")) {
              tbf(comp[_0x13bf87], "가뎀증", 15, "품격 만점의 퍼스트 클래스~!3", 1);
            }
            for (let _0x57891e of getRoleIdx("딜")) {
              tbf(comp[_0x57891e], "궁추가*", 60, "품격 만점의 퍼스트 클래스~!4", 1);
            }
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {
        for (let _0x3a0931 of getRoleIdx("딜")) {
          tbf(comp[_0x3a0931], "공고증", myCurAtk + _0x23a024.id + 30, "기내 서비스", 1);
        }
      };
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(40);
        tbf(all, "공퍼증", 120, "바알 항공에 탑승하신 여러분을 환영합니다~1", always);
        for (let _0x554a02 of getElementIdx("광")) {
          anbf(comp[_0x554a02], "궁", comp[_0x554a02], "<기내식엔 저도 포함♡>", 0, "<즐거운 여행 되시길 바랍니다>", 1, 3, always);
          buff(comp[_0x554a02], "궁", comp[_0x554a02], "on", "기본", "<즐거운 여행 되시길 바랍니다>1", 1, always, "발동", false);
          buff(comp[_0x554a02], "궁", comp[_0x554a02], "on", "기본", "<즐거운 여행 되시길 바랍니다>2", 1, always, "발동", false);
          buff(comp[_0x554a02], "궁", comp[_0x554a02], "on", "기본", "<즐거운 여행 되시길 바랍니다>3", 1, always, "발동", false);
          buff(comp[_0x554a02], "궁뎀증", 50, "<즐거운 여행 되시길 바랍니다>1", always, false);
          buff(comp[_0x554a02], "궁뎀증", 50, "<즐거운 여행 되시길 바랍니다>2", always, false);
          buff(comp[_0x554a02], "궁추가*", 140, "<즐거운 여행 되시길 바랍니다>3", always, false);
          const _0x372e12 = comp[_0x554a02].ultimate;
          comp[_0x554a02].ultimate = function (..._0x7107b9) {
            const _0x58ca2b = comp[_0x554a02].getNest("<기내식엔 저도 포함♡>");
            if (_0x58ca2b == 0) {
              setBuffOn(comp[_0x554a02], "발동", "<즐거운 여행 되시길 바랍니다>1", true);
            }
            if (_0x58ca2b == 1) {
              setBuffOn(comp[_0x554a02], "발동", "<즐거운 여행 되시길 바랍니다>2", true);
            }
            if (_0x58ca2b == 2) {
              setBuffOn(comp[_0x554a02], "발동", "<즐거운 여행 되시길 바랍니다>3", true);
            }
            _0x372e12.apply(this, _0x7107b9);
            if (_0x58ca2b == 0) {
              setBuffOn(comp[_0x554a02], "발동", "<즐거운 여행 되시길 바랍니다>1", false);
            }
            if (_0x58ca2b == 1) {
              setBuffOn(comp[_0x554a02], "발동", "<즐거운 여행 되시길 바랍니다>2", false);
            }
            if (_0x58ca2b == 2) {
              setBuffOn(comp[_0x554a02], "발동", "<즐거운 여행 되시길 바랍니다>3", false);
            }
          };
        }
        const _0x3b002a = getElKind();
        if (_0x3b002a == 3 || _0x3b002a == 4 || _0x3b002a == 5) {
          tbf(_0x23a024, "공퍼증", -500, "<나나미는 바빠요>", always);
        }
      };
      _0x23a024.passive = function () {
        for (let _0x1a4681 of getRoleIdx("딜")) {
          atbf(_0x23a024, "궁", comp[_0x1a4681], "공고증", myCurAtk + _0x23a024.id + 30, "비행하기에 아주 좋은 날이네요~1", 1, always);
        }
        for (let _0x15da8c of getRoleIdx("딜")) {
          tbf(comp[_0x15da8c], "궁추가*", 15, "비행하기에 아주 좋은 날이네요~2", always);
        }
        for (let _0x195e60 of getRoleIdx("딜")) {
          atbf(_0x23a024, "궁", comp[_0x195e60], "공고증", myCurAtk + _0x23a024.id + 20, "나나미의 개인 서비스1", 1, always);
        }
        for (let _0x37d821 of getRoleIdx("딜")) {
          tbf(comp[_0x37d821], "궁추가*", 15, "나나미의 개인 서비스3", always);
        }
        tbf(_0x23a024, "공퍼증", 10, "공격+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {
          if (GLOBAL_TURN == 1) {
            for (let _0x38dec5 of getElementIdx("광")) {
              cdChange(comp[_0x38dec5], -3);
            }
          }
          if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 3 == 0) {
            for (let _0x3e7a6f of getElementIdx("광")) {
              tbf(comp[_0x3e7a6f], "받속뎀", 50, "바알 항공에 탑승하신 여러분을 환영합니다~2", 1);
            }
            tbf(boss, "받뎀증", 25, "바알 항공에 탑승하신 여러분을 환영합니다~3", 1);
          }
        }
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 3 == 0) {
          for (let _0x482adf of getElementIdx("광", "암")) {
            tbf(comp[_0x482adf], "받속뎀", 20, "청순하고 달콤한 영업용 미소", 1);
          }
          for (let _0x337b1e of getElementIdx("광", "암")) {
            tbf(comp[_0x337b1e], "받속뎀", 20, "나나미의 개인 서비스2", 1);
          }
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10178:
      setMnc(_0x23a024, [0, 3, 0, 3, 0, 3, 0, 3, 0, 3], _0x17c963);
      _0x23a024.ultbefore = function () {
        deleteBuff(_0x23a024, "기본", "초고속 루프 기동2");
        for (let _0x4e4160 of getElementIdx("풍")) {
          deleteBuff(comp[_0x4e4160], "기본", "초고속 루프 기동3");
        }
        deleteBuff(_0x23a024, "기본", "초고속 루프 기동4");
        switch (_0x17c963) {
          case 1:
            tbf(_0x23a024, "공퍼증", 100, "초고속 루프 기동1", 1);
            tbf(_0x23a024, "발효증", 150, "초고속 루프 기동2", 3);
            for (let _0x578c1a of getElementIdx("풍")) {
              tbf(comp[_0x578c1a], "받속뎀", 18, "초고속 루프 기동3", 3);
            }
            break;
          case 2:
            tbf(_0x23a024, "공퍼증", 125, "초고속 루프 기동1", 1);
            tbf(_0x23a024, "발효증", 175, "초고속 루프 기동2", 3);
            for (let _0x2f98f7 of getElementIdx("풍")) {
              tbf(comp[_0x2f98f7], "받속뎀", 21, "초고속 루프 기동3", 3);
            }
            break;
          case 3:
            tbf(_0x23a024, "공퍼증", 150, "초고속 루프 기동1", 1);
            tbf(_0x23a024, "발효증", 200, "초고속 루프 기동2", 3);
            for (let _0xfe44da of getElementIdx("풍")) {
              tbf(comp[_0xfe44da], "받속뎀", 24, "초고속 루프 기동3", 3);
            }
            buff(_0x23a024, "공발동*", 80, "초고속 루프 기동4", 3, false);
            break;
          case 4:
            tbf(_0x23a024, "공퍼증", 175, "초고속 루프 기동1", 1);
            tbf(_0x23a024, "발효증", 225, "초고속 루프 기동2", 3);
            for (let _0x5b2aaf of getElementIdx("풍")) {
              tbf(comp[_0x5b2aaf], "받속뎀", 27, "초고속 루프 기동3", 3);
            }
            buff(_0x23a024, "공발동*", 100, "초고속 루프 기동4", 3, false);
            break;
          default:
            tbf(_0x23a024, "공퍼증", 200, "초고속 루프 기동1", 1);
            tbf(_0x23a024, "발효증", 250, "초고속 루프 기동2", 3);
            for (let _0x1e8903 of getElementIdx("풍")) {
              tbf(comp[_0x1e8903], "받속뎀", 30, "초고속 루프 기동3", 3);
            }
            buff(_0x23a024, "공발동*", 120, "초고속 루프 기동4", 3, false);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
        setBuffOnAll(_0x23a024, "기본", "초고속 루프 기동4", true);
      };
      _0x23a024.atkbefore = function () {
        tbf(_0x23a024, "공퍼증", 100, "회오리 여행 가방", 1);
      };
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(40);
        tbf(all, "공퍼증", 50, "바알 항공이 정성을 다해 모시겠습니다", always);
        if (getElementCnt("풍") >= 4) {
          tbf(all, "가뎀증", 40, "<전속력으로☆바알 항공>1", always);
          tbf(all, "발효증", 90, "<전속력으로☆바알 항공>2", always);
          for (let _0x12cc44 of getElementIdx("풍")) {
            anbf(all, "궁", comp[_0x12cc44], "받속뎀", 3, "<전속력으로☆바알 항공>3", 1, 20, always);
          }
        }
      };
      _0x23a024.passive = function () {
        _0x23a024.canCDChange = false;
        tbf(_0x23a024, "평발동*", 100, "타올라라! 이 몸의 생존 본능!1", always);
        tbf(_0x23a024, "궁발동*", 200, "타올라라! 이 몸의 생존 본능!2", always);
        anbf(_0x23a024, "궁", _0x23a024, "가뎀증", 15, "검은 스타킹의 유혹", 1, 3, always);
        tbf(_0x23a024, "가뎀증", 7.5, "가하는 데미지+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 3 == 0) {
          if (getRoleCnt("딜") >= 2) {
            tbf(boss, "받발뎀", 80, "<리틀 바알 출동!>1", 3);
            for (let _0x1ee3e of getElementIdx("풍")) {
              tbf(comp[_0x1ee3e], "받속뎀", 20, "<리틀 바알 출동!>2", 1);
            }
          }
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10179:
      setMnc(_0x23a024, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        for (let _0x482429 of comp) {
          deleteBuff(_0x482429, "기본", "화려한 붕대 치료법1");
        }
        switch (_0x17c963) {
          case 1:
            tbf(all, "공퍼증", 20, "화려한 붕대 치료법1", 4);
            for (let _0x7b417b of getElementIdx("화")) {
              nbf(comp[_0x7b417b], "받속뎀", 6, "화려한 붕대 치료법2", 1, 2);
            }
            break;
          case 2:
            tbf(all, "공퍼증", 25, "화려한 붕대 치료법1", 4);
            for (let _0x1085f3 of getElementIdx("화")) {
              nbf(comp[_0x1085f3], "받속뎀", 7, "화려한 붕대 치료법2", 1, 2);
            }
            break;
          case 3:
            tbf(all, "공퍼증", 30, "화려한 붕대 치료법1", 4);
            for (let _0x1e5fd1 of getElementIdx("화")) {
              nbf(comp[_0x1e5fd1], "받속뎀", 8, "화려한 붕대 치료법2", 1, 2);
            }
            nbf(boss, "받뎀증", 3, "화려한 붕대 치료법3", 1, 2);
            break;
          case 4:
            tbf(all, "공퍼증", 35, "화려한 붕대 치료법1", 4);
            for (let _0x571cb6 of getElementIdx("화")) {
              nbf(comp[_0x571cb6], "받속뎀", 9, "화려한 붕대 치료법2", 1, 2);
            }
            nbf(boss, "받뎀증", 4, "화려한 붕대 치료법3", 1, 2);
            break;
          default:
            tbf(all, "공퍼증", 40, "화려한 붕대 치료법1", 4);
            for (let _0x55dc38 of getElementIdx("화")) {
              nbf(comp[_0x55dc38], "받속뎀", 10, "화려한 붕대 치료법2", 1, 2);
            }
            nbf(boss, "받뎀증", 5, "화려한 붕대 치료법3", 1, 2);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
        for (let _0x25e186 of comp) {
          _0x25e186.heal();
        }
      };
      _0x23a024.atkbefore = function () {
        for (let _0x97cd7 of comp) {
          _0x97cd7.heal();
        }
      };
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(50);
        tbf(all, "공퍼증", 50, "시저의 전용 간호사", always);
        if (getElKind() == 2) {
          tbf(all, "일뎀증", 100, "<♡전용 간호사♡>1", always);
          tbf(all, "가뎀증", 30, "<♡전용 간호사♡>2", always);
          anbf(all, "평", boss, "받뎀증", 1, "<♡전용 간호사♡>3", 1, 20, always);
          for (let _0x58ea23 of comp) {
            atbf(_0x58ea23, "궁", _0x58ea23, "일뎀증", 50, "<♡전용 간호사♡>4", 2, always);
          }
        }
      };
      _0x23a024.passive = function () {
        tbf(_0x23a024, "공퍼증", 30, "디저트를 위해 싸우겠어1", always);
        tbf(_0x23a024, "평추가*", 75, "디저트를 위해 싸우겠어2", always);
        atbf(_0x23a024, "방", all, "일뎀증", 40, "<루루♡슈퍼 신중 모드>1", 4, always);
        for (let _0x45ca84 of getRoleIdx("딜")) {
          tbf(comp[_0x45ca84], "평추가*", 20, "간호사도 명탐정이 될 수 있어", always);
        }
        tbf(_0x23a024, "공퍼증", 10, "공격+", always);
      };
      _0x23a024.defense = function () {
        for (let _0x2d3394 of comp) {
          deleteBuff(_0x2d3394, "기본", "<루루♡슈퍼 신중 모드>1");
        }
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        if (GLOBAL_TURN == 1) {
          cdChange(_0x23a024, -4);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10180:
      setMnc(_0x23a024, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        deleteBuff(boss, "기본", "치명적인 연애3");
        switch (_0x17c963) {
          case 1:
            tbf(boss, "받뎀증", 20, "치명적인 연애1", 1);
            tbf(boss, "방경감", 5, "치명적인 연애3", 4);
            break;
          case 2:
            tbf(boss, "받뎀증", 25, "치명적인 연애1", 1);
            for (let _0x1d62ee of getElementIdx("수")) {
              tbf(comp[_0x1d62ee], "받속뎀", 5, "치명적인 연애2", 1);
            }
            tbf(boss, "방경감", 5, "치명적인 연애3", 4);
            break;
          case 3:
            tbf(boss, "받뎀증", 30, "치명적인 연애1", 1);
            for (let _0x273593 of getElementIdx("수")) {
              tbf(comp[_0x273593], "받속뎀", 10, "치명적인 연애2", 1);
            }
            tbf(boss, "방경감", 10, "치명적인 연애3", 4);
            break;
          case 4:
            tbf(boss, "받뎀증", 35, "치명적인 연애1", 1);
            for (let _0x2d58e5 of getElementIdx("수")) {
              tbf(comp[_0x2d58e5], "받속뎀", 15, "치명적인 연애2", 1);
            }
            tbf(boss, "방경감", 10, "치명적인 연애3", 4);
            break;
          default:
            tbf(boss, "받뎀증", 40, "치명적인 연애1", 1);
            for (let _0x3a4a80 of getElementIdx("수")) {
              tbf(comp[_0x3a4a80], "받속뎀", 20, "치명적인 연애2", 1);
            }
            tbf(boss, "방경감", 10, "치명적인 연애3", 4);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(40);
        if (getRoleCnt("디") >= 4) {
          tbf(all, "공퍼증", 50, "<유리만 있으면 돼♡>1", always);
          tbf(all, "가뎀증", 20, "<유리만 있으면 돼♡>2", always);
          tbf(all, "일뎀증", 50, "<유리만 있으면 돼♡>3", always);
          tbf(all, "궁뎀증", 30, "<유리만 있으면 돼♡>4", always);
          tbf(all, "발효증", 30, "<유리만 있으면 돼♡>5", always);
          for (let _0x4954a6 of comp) {
            atbf(_0x4954a6, "공격", all, "공고증", myCurAtk + _0x4954a6.id + 20, "<꼼짝 못 하게 해줄게♡>1", 1, always);
            anbf(_0x4954a6, "공격", boss, "받뎀증", 0.4, "<꼼짝 못 하게 해줄게♡>2", 1, 50, always);
            for (let _0xa66d39 of comp) {
              anbf(_0x4954a6, "공격", _0xa66d39, "받속뎀", 0.6, "<꼼짝 못 하게 해줄게♡>3", 1, 50, always);
            }
            for (let _0x312c99 of getRoleIdx("디")) {
              anbf(_0x4954a6, "공격", comp[_0x312c99], "받직뎀", 1.2, "<꼼짝 못 하게 해줄게♡>4", 1, 50, always);
            }
          }
        }
      };
      _0x23a024.passive = function () {
        tbf(_0x23a024, "공퍼증", 50, "감정을 억제할 수가 없어1", always);
        tbf(_0x23a024, "방뎀증", 100, "감정을 억제할 수가 없어2", always);
        atbf(_0x23a024, "평", boss, "받일뎀", 70, "삼독오대1", 1, always);
        atbf(_0x23a024, "궁", boss, "받궁뎀", 35, "삼독오대2", 1, always);
        tbf(_0x23a024, "가뎀증", 30, "전용 간호사", always);
        atbf(_0x23a024, "공격", boss, "받뎀증", 20, "<밀착 간호>1", 1, always);
        for (let _0x2eb2fd of getElementIdx("수")) {
          atbf(_0x23a024, "공격", comp[_0x2eb2fd], "받속뎀", 20, "<밀착 간호>2", 1, always);
        }
        tbf(_0x23a024, "공퍼증", 10, "공격+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10181:
      _0x23a024.stack = 0;
      setMnc(_0x23a024, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x17c963);
      buff_ex.push("<포만감>", "<격렬한 운동>");
      _0x23a024.ultbefore = function () {
        for (let _0x2ed2db of comp) {
          deleteBuff(_0x2ed2db, "기본", "오늘 저녁은 쇼가야키!5");
        }
        switch (_0x17c963) {
          case 1:
            nbf(_0x23a024, "<포만감>", 0, "오늘 저녁은 쇼가야키!1", 2, 5);
            _0x23a024.stack += 2;
            if (_0x23a024.stack > 5) {
              _0x23a024.stack = 5;
            }
            tbf(all, "가뎀증", 12, "오늘 저녁은 쇼가야키!2", 1);
            nbf(all, "가뎀증", 3, "오늘 저녁은 쇼가야키!3", 1, 2);
            tbf(all, "궁추가*", 75, "오늘 저녁은 쇼가야키!4", 1);
            tbf(all, "평추가*", 37.5, "오늘 저녁은 쇼가야키!5", 4);
            break;
          case 2:
            nbf(_0x23a024, "<포만감>", 0, "오늘 저녁은 쇼가야키!1", 2, 5);
            _0x23a024.stack += 2;
            if (_0x23a024.stack > 5) {
              _0x23a024.stack = 5;
            }
            tbf(all, "가뎀증", 14, "오늘 저녁은 쇼가야키!2", 1);
            nbf(all, "가뎀증", 3.5, "오늘 저녁은 쇼가야키!3", 1, 2);
            tbf(all, "궁추가*", 87.5, "오늘 저녁은 쇼가야키!4", 1);
            tbf(all, "평추가*", 43.8, "오늘 저녁은 쇼가야키!5", 4);
            break;
          case 3:
            nbf(_0x23a024, "<포만감>", 0, "오늘 저녁은 쇼가야키!1", 2, 5);
            _0x23a024.stack += 2;
            if (_0x23a024.stack > 5) {
              _0x23a024.stack = 5;
            }
            tbf(all, "가뎀증", 16, "오늘 저녁은 쇼가야키!2", 1);
            nbf(all, "가뎀증", 4, "오늘 저녁은 쇼가야키!3", 1, 2);
            tbf(all, "궁추가*", 100, "오늘 저녁은 쇼가야키!4", 1);
            tbf(all, "평추가*", 50, "오늘 저녁은 쇼가야키!5", 4);
            break;
          case 4:
            nbf(_0x23a024, "<포만감>", 0, "오늘 저녁은 쇼가야키!1", 2, 5);
            _0x23a024.stack += 2;
            if (_0x23a024.stack > 5) {
              _0x23a024.stack = 5;
            }
            tbf(all, "가뎀증", 18, "오늘 저녁은 쇼가야키!2", 1);
            nbf(all, "가뎀증", 4.5, "오늘 저녁은 쇼가야키!3", 1, 2);
            tbf(all, "궁추가*", 112.5, "오늘 저녁은 쇼가야키!4", 1);
            tbf(all, "평추가*", 56.3, "오늘 저녁은 쇼가야키!5", 4);
            break;
          default:
            nbf(_0x23a024, "<포만감>", 0, "오늘 저녁은 쇼가야키!1", 2, 5);
            _0x23a024.stack += 2;
            if (_0x23a024.stack > 5) {
              _0x23a024.stack = 5;
            }
            tbf(all, "가뎀증", 20, "오늘 저녁은 쇼가야키!2", 1);
            nbf(all, "가뎀증", 5, "오늘 저녁은 쇼가야키!3", 1, 2);
            tbf(all, "궁추가*", 125, "오늘 저녁은 쇼가야키!4", 1);
            tbf(all, "평추가*", 62.5, "오늘 저녁은 쇼가야키!5", 4);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        if (_0x23a024.stack == 2 || _0x23a024.stack == 3) {
          setBuffOn(_0x23a024, "기본", "기억 속의 맛4", true);
        } else if (_0x23a024.stack == 1) {
          setBuffOn(_0x23a024, "발동", "기억 속의 맛4", true);
        }
        ultLogic(_0x23a024);
        if (_0x23a024.stack == 1) {
          setBuffOn(_0x23a024, "발동", "기억 속의 맛4", false);
        }
        _0x23a024.stack += 1;
        if (_0x23a024.stack > 5) {
          _0x23a024.stack = 5;
        }
        setBuffOn(_0x23a024, "발동", "기억 속의 맛3", true);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        if (_0x23a024.stack == 3) {
          setBuffOn(_0x23a024, "발동", "기억 속의 맛4", true);
        }
        atkLogic(_0x23a024);
        if (_0x23a024.stack == 3) {
          setBuffOn(_0x23a024, "발동", "기억 속의 맛4", false);
        }
        _0x23a024.stack += 1;
        if (_0x23a024.stack > 5) {
          _0x23a024.stack = 5;
        }
        if (_0x23a024.stack == 3) {
          setBuffOn(_0x23a024, "발동", "기억 속의 맛3", true);
        }
      };
      _0x23a024.leader = function () {
        hpUpMe(_0x23a024, 60);
        for (let _0x905b7a of comp) {
          if (_0x905b7a.id != _0x23a024.id) {
            hpUpMe(_0x905b7a, 30);
          }
        }
        atbf(_0x23a024, "방", all, "아머", _0x23a024.hp * 10, "<꿈 탈출>", 1, always);
      };
      _0x23a024.passive = function () {
        anbf(_0x23a024, "공격", _0x23a024, "<포만감>", 0, "오늘 저녁은 쇼가야키!1", 1, 5, always);
        buff(_0x23a024, "공격", _0x23a024, "on", "기본", "기억 속의 맛4", 1, always, "발동", false);
        buff(_0x23a024, "궁", all, "아머", _0x23a024.hp * 20, "기억 속의 맛3", 2, always, "발동", false);
        buff(_0x23a024, "가뎀증", 30, "기억 속의 맛4", always, false);
        anbf(_0x23a024, "피격", _0x23a024, "<격렬한 운동>", 0, "스포츠 만능", 1, 1, always);
        tbf(all, "일뎀증", 70, "잠자는 숲 속의 검사2", always);
        tbf(all, "궁뎀증", 35, "잠자는 숲 속의 검사3", always);
        tbf(all, "받아증", 30, "잠자는 숲 속의 검사4", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        if (GLOBAL_TURN == 1) {
          cdChange(_0x23a024, -4);
          nbf(_0x23a024, "<포만감>", 0, "오늘 저녁은 쇼가야키!1", 2, 5);
          _0x23a024.stack += 2;
          if (_0x23a024.stack > 5) {
            _0x23a024.stack = 5;
          }
        }
        if (GLOBAL_TURN > 1) {
          if (_0x23a024.getNest("<격렬한 운동>") == 1) {
            for (let _0x563c22 of comp) {
              deleteBuff(_0x563c22, "기본", "<소화 촉진>1");
            }
            tbf(all, "공퍼증", 30, "<소화 촉진>1", 2);
            nbf(_0x23a024, "<포만감>", 0, "오늘 저녁은 쇼가야키!1", -1, 5);
            nbf(_0x23a024, "<격렬한 운동>", 0, "스포츠 만능", -1, 1);
            if (_0x23a024.stack == 3) {
              setBuffOn(_0x23a024, "발동", "기억 속의 맛3", false);
            } else if (_0x23a024.stack == 4) {
              setBuffOn(_0x23a024, "기본", "기억 속의 맛4", false);
            }
            _0x23a024.stack -= 1;
            if (_0x23a024.stack < 0) {
              _0x23a024.stack = 0;
            }
          }
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {
          for (let _0x5fdfe4 of comp) {
            if (_0x5fdfe4.curHp / _0x5fdfe4.hp > 0.5) {
              if (_0x5fdfe4.id == _0x23a024.id) {
                continue;
              }
              tbf(all, "공퍼증", 12.5, "<최우수 조연>1", 2);
              tbf(all, "가뎀증", 7, "<최우수 조연>2", 2);
              tbf(all, "일뎀증", 20, "<최우수 조연>3", 2);
              tbf(all, "궁뎀증", 10, "<최우수 조연>4", 2);
              tbf(boss, "받뎀증", 5, "<최우수 조연>5", 2);
              tbf(all, "받속뎀", 7, "<최우수 조연>6", 2);
            }
          }
        }
      };
      return _0x23a024;
    case 10182:
      _0x23a024.stack = 0;
      setMnc(_0x23a024, [0, 5, 0, 5, 0, 5, 0, 5, 0, 5], _0x17c963);
      buff_ex.push("<가족의 정>");
      _0x23a024.ultbefore = function () {
        for (let _0x7a3835 of comp) {
          deleteBuff(_0x7a3835, "기본", "오피스 여왕의 응시3");
          deleteBuff(_0x7a3835, "기본", "오피스 여왕의 응시4");
        }
        switch (_0x17c963) {
          case 1:
            nbf(_0x23a024, "공퍼증", 18, "오파스 여왕의 응시1", 1, 2);
            for (let _0x214d65 of getElementIdx("암")) {
              nbf(comp[_0x214d65], "받속뎀", 6.5, "오피스 여왕의 응시2", 1, 2);
            }
            for (let _0x42001a of comp) {
              if (_0x42001a.role == 0 || _0x42001a.role == 2) {
                tbf(_0x42001a, "일뎀증", 18, "오피스 여왕의 응시3", 5);
              }
            }
            break;
          case 2:
            nbf(_0x23a024, "공퍼증", 21, "오파스 여왕의 응시1", 1, 2);
            for (let _0x2a5be5 of getElementIdx("암")) {
              nbf(comp[_0x2a5be5], "받속뎀", 8, "오피스 여왕의 응시2", 1, 2);
            }
            for (let _0x410ac9 of comp) {
              if (_0x410ac9.role == 0 || _0x410ac9.role == 2) {
                tbf(_0x410ac9, "일뎀증", 21, "오피스 여왕의 응시3", 5);
                tbf(_0x410ac9, "평추가*", 21, "오피스 여왕의 응시4", 5);
              }
            }
            break;
          case 3:
            nbf(_0x23a024, "공퍼증", 24, "오파스 여왕의 응시1", 1, 2);
            for (let _0x48fecb of getElementIdx("암")) {
              nbf(comp[_0x48fecb], "받속뎀", 9.5, "오피스 여왕의 응시2", 1, 2);
            }
            for (let _0xe13b88 of comp) {
              if (_0xe13b88.role == 0 || _0xe13b88.role == 2) {
                tbf(_0xe13b88, "일뎀증", 24, "오피스 여왕의 응시3", 5);
                tbf(_0xe13b88, "평추가*", 24, "오피스 여왕의 응시4", 5);
              }
            }
            break;
          case 4:
            nbf(_0x23a024, "공퍼증", 27, "오파스 여왕의 응시1", 1, 2);
            for (let _0x1c7291 of getElementIdx("암")) {
              nbf(comp[_0x1c7291], "받속뎀", 11, "오피스 여왕의 응시2", 1, 2);
            }
            for (let _0x5ebf99 of comp) {
              if (_0x5ebf99.role == 0 || _0x5ebf99.role == 2) {
                tbf(_0x5ebf99, "일뎀증", 27, "오피스 여왕의 응시3", 5);
                tbf(_0x5ebf99, "평추가*", 27, "오피스 여왕의 응시4", 5);
              }
            }
            break;
          default:
            nbf(_0x23a024, "공퍼증", 30, "오파스 여왕의 응시1", 1, 2);
            for (let _0x127b56 of getElementIdx("암")) {
              nbf(comp[_0x127b56], "받속뎀", 12.5, "오피스 여왕의 응시2", 1, 2);
            }
            for (let _0x3c98ae of comp) {
              if (_0x3c98ae.role == 0 || _0x3c98ae.role == 2) {
                tbf(_0x3c98ae, "일뎀증", 30, "오피스 여왕의 응시3", 5);
                tbf(_0x3c98ae, "평추가*", 30, "오피스 여왕의 응시4", 5);
              }
            }
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {
        tbf(all, "공고증", myCurAtk + _0x23a024.id + 30, "지령 전달", 1);
      };
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(45);
        tbf(all, "공퍼증", 85, "도도한 위엄의 가장1", always);
        tbf(all, "일뎀증", 110, "도도한 위엄의 가장2", always);
        if (getRoleCnt("섶") >= 2) {
          tbf(all, "공퍼증", -500, "도도한 위엄의 가장3", always);
        }
        anbf(_0x23a024, "공격", all, "가뎀증", 6, "도도한 위엄의 가장5", 1, 5, always);
        for (let _0x4457e2 of comp) {
          if (_0x4457e2.id != _0x23a024.id) {
            anbf(_0x4457e2, "공격", _0x23a024, "공퍼증", 2, "<네, 엄마!!>1", 1, 20, always);
            for (let _0x582b6a of getElementIdx("암")) {
              anbf(_0x4457e2, "공격", comp[_0x582b6a], "받속뎀", 1.5, "<네, 엄마!!>2", 1, 20, always);
            }
            anbf(_0x4457e2, "공격", boss, "받뎀증", 1.5, "<네, 엄마!!>3", 1, 20, always);
          }
        }
      };
      _0x23a024.passive = function () {
        tbf(_0x23a024, "평추가*", 75, "엄마의 호통1", always);
        atbf(_0x23a024, "궁", all, "공고증", myCurAtk + _0x23a024.id + 30, "엄마의 호통2", 1, always);
        for (let _0x537158 of comp) {
          if (_0x537158.id != _0x23a024.id) {
            anbf(_0x537158, "평", _0x23a024, "<가족의 정>", 0, "도도한 위엄의 가장4", 1, 24, always);
            const _0x417953 = _0x537158.attack;
            _0x537158.attack = function (..._0x2f8446) {
              const _0x1879d4 = _0x23a024.stack;
              _0x417953.apply(this, _0x2f8446);
              _0x23a024.stack += 1;
              if (_0x23a024.stack > 24) {
                _0x23a024.stack = 24;
              }
              if (_0x1879d4 < 12 && _0x23a024.stack >= 12) {
                setBuffOnAll(_0x23a024, "발동", "사랑이 담긴 암흑 요리2", true);
              }
              if (_0x1879d4 < 24 && _0x23a024.stack >= 24) {
                setBuffOn(_0x23a024, "발동", "사랑이 담긴 암흑 요리3", true);
              }
              if (_0x1879d4 < 8 && _0x23a024.stack >= 8) {
                setBuffOnAll(_0x23a024, "발동", "엄마의 따뜻한 포옹1", true);
              }
              if (_0x1879d4 < 20 && _0x23a024.stack >= 20) {
                setBuffOn(_0x23a024, "발동", "엄마의 따뜻한 포옹2", true);
              }
            };
          }
        }
        for (let _0x58633d of comp) {
          if (_0x58633d.id != _0x23a024.id) {
            buff(_0x23a024, "공격", _0x58633d, "일뎀증", 20, "사랑이 담긴 암흑 요리2", 1, always, "발동", false);
          }
        }
        buff(_0x23a024, "공격", boss, "받뎀증", 5, "사랑이 담긴 암흑 요리3", 1, always, "발동", false);
        for (let _0x6bdca7 of comp) {
          if (_0x6bdca7.id != _0x23a024.id) {
            buff(_0x23a024, "공격", _0x6bdca7, "일뎀증", 20, "엄마의 따뜻한 포옹1", 1, always, "발동", false);
          }
        }
        buff(_0x23a024, "공격", boss, "받뎀증", 5, "엄마의 따뜻한 포옹2", 1, always, "발동", false);
        tbf(_0x23a024, "공퍼증", 10, "공격+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {
          if (GLOBAL_TURN == 1) {
            nbf(_0x23a024, "<가족의 정>", 0, "도도한 위엄의 가장4", 8, 24);
            _0x23a024.stack += 8;
            if (_0x23a024.stack > 24) {
              _0x23a024.stack = 24;
            }
            setBuffOnAll(_0x23a024, "발동", "엄마의 따뜻한 포옹1", true);
          }
        }
        if (GLOBAL_TURN == 1) {
          cdChange(_0x23a024, -5);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10183:
      _0x23a024.stack = 0;
      setMnc(_0x23a024, [0, 4, 0, 4, 60, 4, 90, 4, 120, 4], _0x17c963);
      buff_ex.push("<이목 끌기>");
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            nbf(_0x23a024, "공퍼증", 24, "이 천재의 반전극1", 1, 3);
            nbf(_0x23a024, "가뎀증", 12, "이 천재의 반전극2", 1, 3);
            nbf(_0x23a024, "궁뎀증", 12, "이 천재의 반전극3", 1, 3);
            break;
          case 2:
            nbf(_0x23a024, "공퍼증", 28, "이 천재의 반전극1", 1, 3);
            nbf(_0x23a024, "가뎀증", 14, "이 천재의 반전극2", 1, 3);
            nbf(_0x23a024, "궁뎀증", 14, "이 천재의 반전극3", 1, 3);
            break;
          case 3:
            nbf(_0x23a024, "공퍼증", 48, "이 천재의 반전극1", 1, 2);
            nbf(_0x23a024, "가뎀증", 24, "이 천재의 반전극2", 1, 2);
            nbf(_0x23a024, "궁뎀증", 24, "이 천재의 반전극3", 1, 2);
            break;
          case 4:
            nbf(_0x23a024, "공퍼증", 54, "이 천재의 반전극1", 1, 2);
            nbf(_0x23a024, "가뎀증", 27, "이 천재의 반전극2", 1, 2);
            nbf(_0x23a024, "궁뎀증", 27, "이 천재의 반전극3", 1, 2);
            break;
          default:
            nbf(_0x23a024, "공퍼증", 60, "이 천재의 반전극1", 1, 2);
            nbf(_0x23a024, "가뎀증", 30, "이 천재의 반전극2", 1, 2);
            nbf(_0x23a024, "궁뎀증", 30, "이 천재의 반전극3", 1, 2);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
        nbf(_0x23a024, "<이목 끌기>", 0, "<갸루 화장 스킬>", -12, 12);
        _0x23a024.stack = 0;
        setBuffOn(_0x23a024, "기본", "트렌드를 좇는 건 필수1", false);
        setBuffOn(_0x23a024, "기본", "트렌드를 좇는 건 필수2", false);
        setBuffOn(_0x23a024, "기본", "트렌드를 좇는 건 필수3", false);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
        for (let _0x1b810a of comp) {
          if (_0x1b810a.id != _0x23a024.id) {
            anbf(_0x1b810a, "평", _0x23a024, "<이목 끌기>", 0, "<갸루 화장 스킬>", 1, 12, 1);
          }
        }
      };
      _0x23a024.leader = function () {
        hpUpAll(45);
        if (getElementCnt("수") >= 3) {
          tbf(_0x23a024, "공퍼증", 120, "<갸루 Style♡>1", always);
          tbf(_0x23a024, "궁뎀증", 60, "<갸루 Style♡>2", always);
          tbf(_0x23a024, "가뎀증", 60, "<갸루 Style♡>3", always);
        }
        if (getElementCnt("수") >= 3) {
          for (let _0x2e16f5 of comp) {
            if (_0x2e16f5.id != _0x23a024.id) {
              tbf(_0x2e16f5, "공퍼증", 50, "<블링하게 등장☆>1", always);
              atbf(_0x2e16f5, "궁", _0x23a024, "궁추가*", 30, "<천재의 무적 매력~>1", 1, always);
              atbf(_0x2e16f5, "궁", boss, "받궁뎀", 15, "<천재의 무적 매력~>2", 1, always);
              for (let _0xfd153a of getElementIdx("수")) {
                atbf(_0x2e16f5, "궁", comp[_0xfd153a], "받속뎀", 10, "<천재의 무적 매력~>3", 1, always);
              }
              atbf(_0x2e16f5, "궁", boss, "받뎀증", 7.5, "<천재의 무적 매력~>4", 1, always);
            }
          }
        }
      };
      _0x23a024.passive = function () {
        for (let _0x40cf9a of getElementIdx("수")) {
          atbf(_0x23a024, "평", comp[_0x40cf9a], "받속뎀", 10, "<소개팅 무적 콤보 스킬>1", 4, always);
        }
        atbf(_0x23a024, "평", _0x23a024, "궁뎀증", 8, "<소개팅 무적 콤보 스킬>2", 4, always);
        atbf(_0x23a024, "평", _0x23a024, "가뎀증", 8, "<소개팅 무적 콤보 스킬>3", 4, always);
        for (let _0x381179 of comp) {
          if (_0x381179.id != _0x23a024.id) {
            const _0x2795cf = _0x381179.attack;
            _0x381179.attack = function (..._0x3711da) {
              _0x2795cf.apply(this, _0x3711da);
              _0x23a024.stack = _0x23a024.getNest("<이목 끌기>");
              if (_0x23a024.stack >= 4) {
                setBuffOn(_0x23a024, "기본", "트렌드를 좇는 건 필수1", true);
              }
              if (_0x23a024.stack >= 8) {
                setBuffOn(_0x23a024, "기본", "트렌드를 좇는 건 필수2", true);
              }
              if (_0x23a024.stack >= 12) {
                setBuffOn(_0x23a024, "기본", "트렌드를 좇는 건 필수3", true);
              }
            };
          }
        }
        buff(_0x23a024, "궁추가*", 210, "트렌드를 좇는 건 필수1", always, false);
        buff(_0x23a024, "궁추가*", 140, "트렌드를 좇는 건 필수2", always, false);
        buff(_0x23a024, "궁추가*", 70, "트렌드를 좇는 건 필수3", always, false);
        atbf(_0x23a024, "평", all, "공퍼증", 20, "오타쿠에게 다정한 갸루1", 4, always);
        for (let _0x1ca201 of comp) {
          if (_0x1ca201.id != _0x23a024.id) {
            anbf(_0x1ca201, "방", _0x23a024, "<이목 끌기>", 0, "<갸루 화장 스킬>", 2, 12, always);
            const _0xcc73a = _0x1ca201.defense;
            _0x1ca201.defense = function (..._0x46d3e3) {
              _0xcc73a.apply(this, _0x46d3e3);
              const _0x31433e = _0x23a024.stack;
              _0x23a024.stack += 2;
              if (_0x23a024.stack > 12) {
                _0x23a024.stack = 12;
              }
              if (_0x31433e < 4 && _0x23a024.stack >= 4) {
                setBuffOn(_0x23a024, "기본", "트렌드를 좇는 건 필수1", true);
              }
              if (_0x31433e < 8 && _0x23a024.stack >= 8) {
                setBuffOn(_0x23a024, "기본", "트렌드를 좇는 건 필수2", true);
              }
              if (_0x31433e < 12 && _0x23a024.stack >= 12) {
                setBuffOn(_0x23a024, "기본", "트렌드를 좇는 건 필수3", true);
              }
            };
          }
        }
        tbf(_0x23a024, "공퍼증", 10, "공격+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {
          if (GLOBAL_TURN == 1) {
            for (let _0x2c544d of getElementIdx("수")) {
              nbf(comp[_0x2c544d], "받속뎀", 30, "천재 갸루 군사1", 1, 1);
            }
          }
        }
        if (GLOBAL_TURN == 1) {
          cdChange(_0x23a024, -4);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10184:
      _0x23a024.stack = 0;
      buff_ex.push("<마력 수집>");
      setMnc(_0x23a024, [0, 3, 0, 3, 0, 3, 0, 3, 0, 3], _0x17c963);
      _0x23a024.ultbefore = function () {
        let _0x35700e = getElementIdx("풍", "암");
        switch (_0x17c963) {
          case 1:
            for (let _0x38b742 of _0x35700e) {
              tbf(comp[_0x38b742], "궁뎀증", 30, "아담한 몸집, 모성의 포용1", 1);
            }
            for (let _0x544446 of _0x35700e) {
              tbf(comp[_0x544446], "가뎀증", 12, "아담한 몸집, 모성의 포용2", 1);
            }
            for (let _0x45b538 of _0x35700e) {
              tbf(comp[_0x45b538], "받속뎀", 18, "아담한 몸집, 모성의 포용3", 1);
            }
            break;
          case 2:
            for (let _0x4979e7 of _0x35700e) {
              tbf(comp[_0x4979e7], "궁뎀증", 35, "아담한 몸집, 모성의 포용1", 1);
            }
            for (let _0x4dea27 of _0x35700e) {
              tbf(comp[_0x4dea27], "가뎀증", 14, "아담한 몸집, 모성의 포용2", 1);
            }
            for (let _0x5ef455 of _0x35700e) {
              tbf(comp[_0x5ef455], "받속뎀", 21, "아담한 몸집, 모성의 포용3", 1);
            }
            break;
          case 3:
            for (let _0x3b3e79 of _0x35700e) {
              tbf(comp[_0x3b3e79], "궁뎀증", 40, "아담한 몸집, 모성의 포용1", 1);
            }
            for (let _0x25a158 of _0x35700e) {
              tbf(comp[_0x25a158], "가뎀증", 16, "아담한 몸집, 모성의 포용2", 1);
            }
            for (let _0x2a16b8 of _0x35700e) {
              tbf(comp[_0x2a16b8], "받속뎀", 24, "아담한 몸집, 모성의 포용3", 1);
            }
            break;
          case 4:
            for (let _0x15849b of _0x35700e) {
              tbf(comp[_0x15849b], "궁뎀증", 45, "아담한 몸집, 모성의 포용1", 1);
            }
            for (let _0x21dc69 of _0x35700e) {
              tbf(comp[_0x21dc69], "가뎀증", 18, "아담한 몸집, 모성의 포용2", 1);
            }
            for (let _0xd430b7 of _0x35700e) {
              tbf(comp[_0xd430b7], "받속뎀", 27, "아담한 몸집, 모성의 포용3", 1);
            }
            break;
          default:
            for (let _0x1deaa3 of _0x35700e) {
              tbf(comp[_0x1deaa3], "궁뎀증", 50, "아담한 몸집, 모성의 포용1", 1);
            }
            for (let _0x4c0494 of _0x35700e) {
              tbf(comp[_0x4c0494], "가뎀증", 20, "아담한 몸집, 모성의 포용2", 1);
            }
            for (let _0xbb59d9 of _0x35700e) {
              tbf(comp[_0xbb59d9], "받속뎀", 30, "아담한 몸집, 모성의 포용3", 1);
            }
            break;
        }
      };
      _0x23a024.ultafter = function () {
        boss.def = false;
      };
      _0x23a024.ultimate = function () {
        if (_0x23a024.stack == 0) {
          setBuffOn(_0x23a024, "발동", "페어리 행복 안심 위원회1", true);
        }
        ultLogic(_0x23a024);
        if (_0x23a024.stack == 0) {
          setBuffOn(_0x23a024, "발동", "페어리 행복 안심 위원회1", false);
        }
        nbf(_0x23a024, "<마력 수집>", 0, "미니 더피 등장!", 1, 3);
        if (_0x23a024.stack == 2) {
          setBuffOnAll(_0x23a024, "발동", "페어리 행복 안심 위원회3", true);
        }
        _0x23a024.stack += 1;
        if (_0x23a024.stack > 3) {
          _0x23a024.stack = 3;
        }
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(45);
        for (let _0x1962fa of comp) {
          for (let _0x4e873c of comp) {
            anbf(_0x1962fa, "궁", _0x4e873c, "공퍼증", 8, "<애교 타임>2", 1, 11, always);
          }
          for (let _0x28bd2 of comp) {
            anbf(_0x1962fa, "궁", _0x28bd2, "가뎀증", 5, "<애교 타임>3", 1, 11, always);
          }
          anbf(_0x1962fa, "궁", boss, "받궁뎀", 4, "<애교 타임>4", 1, 11, always);
        }
      };
      _0x23a024.passive = function () {
        buff(_0x23a024, "공퍼증", 100, "페어리 행복 안심 위원회1", always, false);
        buff(_0x23a024, "궁", _0x23a024, "on", "기본", "페어리 행복 안심 위원회1", 1, always, "발동", false);
        for (let _0x3e15dd of comp) {
          buff(_0x23a024, "궁", _0x3e15dd, "공고증", myCurAtk + _0x23a024.id + 20, "페어리 행복 안심 위원회3", 1, always, "발동", false);
        }
        for (let _0x2fb12c of getRoleIdx("딜", "탱", "디")) {
          tbf(comp[_0x2fb12c], "궁추가*", 75, "꼬마 엄마의 섹스테크닉♡", always);
        }
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {
          if (GLOBAL_TURN == 1) {
            nbf(_0x23a024, "<마력 수집>", 0, "미니 더피 등장!", 1, 3);
            _0x23a024.stack += 1;
            if (_0x23a024.stack > 3) {
              _0x23a024.stack = 3;
            }
            setBuffOn(_0x23a024, "기본", "페어리 행복 안심 위원회1", true);
          }
        }
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 3 == 0) {
          if (_0x23a024.stack >= 2) {
            tbf(boss, "받뎀증", 15, "페어리 행복 안심 위원회2", 1);
          }
        }
        if (GLOBAL_TURN == 1) {
          cdChange(_0x23a024, -3);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10185:
      _0x23a024.stack = 0;
      buff_ex.push("<원금에 이자까지>");
      setMnc(_0x23a024, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(_0x23a024, "공퍼증", 105, "시멘트 통에 처박아줄게♡1", 1);
            tbf(_0x23a024, "발효증", 150, "시멘트 통에 처박아줄게♡2", 1);
            tbf(_0x23a024, "가뎀증", 24, "시멘트 통에 처박아줄게♡3", 1);
            break;
          case 2:
            tbf(_0x23a024, "공퍼증", 120, "시멘트 통에 처박아줄게♡1", 1);
            tbf(_0x23a024, "발효증", 175, "시멘트 통에 처박아줄게♡2", 1);
            tbf(_0x23a024, "가뎀증", 28, "시멘트 통에 처박아줄게♡3", 1);
            tbf(boss, "받뎀증", 14, "시멘트 통에 처박아줄게♡4", 1);
            break;
          case 3:
            tbf(_0x23a024, "공퍼증", 135, "시멘트 통에 처박아줄게♡1", 1);
            tbf(_0x23a024, "발효증", 200, "시멘트 통에 처박아줄게♡2", 1);
            tbf(_0x23a024, "가뎀증", 32, "시멘트 통에 처박아줄게♡3", 1);
            tbf(boss, "받뎀증", 16, "시멘트 통에 처박아줄게♡4", 1);
            break;
          case 4:
            tbf(_0x23a024, "공퍼증", 150, "시멘트 통에 처박아줄게♡1", 1);
            tbf(_0x23a024, "발효증", 225, "시멘트 통에 처박아줄게♡2", 1);
            tbf(_0x23a024, "가뎀증", 36, "시멘트 통에 처박아줄게♡3", 1);
            tbf(boss, "받뎀증", 18, "시멘트 통에 처박아줄게♡4", 1);
            break;
          default:
            tbf(_0x23a024, "공퍼증", 165, "시멘트 통에 처박아줄게♡1", 1);
            tbf(_0x23a024, "발효증", 250, "시멘트 통에 처박아줄게♡2", 1);
            tbf(_0x23a024, "가뎀증", 40, "시멘트 통에 처박아줄게♡3", 1);
            tbf(boss, "받뎀증", 20, "시멘트 통에 처박아줄게♡4", 1);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        if (_0x23a024.stack >= 1) {
          tbf(_0x23a024, "궁발동*", 110, "달콤한 마력 이자1", 1);
        }
        if (_0x23a024.stack >= 2) {
          tbf(_0x23a024, "궁발동*", 110, "달콤한 마력 이자2", 1);
        }
        if (_0x23a024.stack >= 3) {
          tbf(_0x23a024, "궁발동*", 110, "달콤한 마력 이자3", 1);
        }
        if (_0x23a024.stack >= 4) {
          tbf(_0x23a024, "궁발동*", 110, "달콤한 마력 이자4", 1);
        }
        ultLogic(_0x23a024);
        nbf(_0x23a024, "<원금에 이자까지>", 0, "<빚 갚을 시간>", -4, 4);
        _0x23a024.stack = 0;
        setBuffOn(_0x23a024, "기본", "<일수 악마>", false);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(45);
        const _0x3f386d = getElementIdx("광");
        if (_0x3f386d.length >= 3) {
          for (let _0xcc6324 of comp) {
            if (_0xcc6324.id == _0x23a024.id) {
              continue;
            }
            tbf(_0xcc6324, "공퍼증", 45, "<잡어! 잡어!>", always);
            anbf(_0xcc6324, "공격", _0x23a024, "<원금에 이자까지>", 0, "<빚 갚을 시간>", 1, 4, always);
            const _0x2e649e = _0xcc6324.attack;
            _0xcc6324.attack = function (..._0x2cfdbb) {
              _0x2e649e.apply(this, _0x2cfdbb);
              if (_0x23a024.stack == 3) {
                setBuffOn(_0x23a024, "기본", "<일수 악마>", true);
              }
              _0x23a024.stack += 1;
              if (_0x23a024.stack > 4) {
                _0x23a024.stack = 4;
              }
            };
            const _0x1fbe66 = _0xcc6324.ultimate;
            _0xcc6324.ultimate = function (..._0x176dd9) {
              _0x1fbe66.apply(this, _0x176dd9);
              if (_0x23a024.stack == 3) {
                setBuffOn(_0x23a024, "기본", "<일수 악마>", true);
              }
              _0x23a024.stack += 1;
              if (_0x23a024.stack > 4) {
                _0x23a024.stack = 4;
              }
            };
            for (let _0x3c0788 of _0x3f386d) {
              atbf(_0xcc6324, "공격", comp[_0x3c0788], "받속뎀", 7.5, "<빚 갚을 시간>2", 1, always);
            }
            atbf(_0xcc6324, "궁", _0x23a024, "궁발동*", 65, "<이자 2배!>1", 1, always);
            atbf(_0xcc6324, "궁", _0x23a024, "공퍼증", 25, "<이자 2배!>2", 1, always);
            atbf(_0xcc6324, "궁", _0x23a024, "가뎀증", 10, "<이자 2배!>3", 1, always);
            atbf(_0xcc6324, "궁", _0x23a024, "발효증", 25, "<이자 2배!>4", 1, always);
          }
        }
      };
      _0x23a024.passive = function () {
        tbf(_0x23a024, "공퍼증", 65, "잡어가 파산해버렸네", always);
        for (let _0x1ee206 of comp) {
          if (_0x1ee206.id == _0x23a024.id) {
            continue;
          }
          anbf(_0x1ee206, "궁", _0x23a024, "<원금에 이자까지>", 0, "<빚 갚을 시간>", 1, 4, always);
          const _0x3bf058 = _0x1ee206.ultimate;
          _0x1ee206.ultimate = function (..._0x2e7fca) {
            _0x3bf058.apply(this, _0x2e7fca);
            if (_0x23a024.stack == 3) {
              setBuffOn(_0x23a024, "기본", "<일수 악마>", true);
            }
            _0x23a024.stack += 1;
            if (_0x23a024.stack > 4) {
              _0x23a024.stack = 4;
            }
          };
          for (let _0x221853 of getElementIdx("광")) {
            atbf(_0x1ee206, "궁", comp[_0x221853], "받속뎀", 7.5, "<빚 갚을 시간>2", 1, always);
          }
        }
        buff(_0x23a024, "궁발동*", 65, "<일수 악마>", always, false);
        tbf(_0x23a024, "공퍼증", 10, "공격+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10186:
      _0x23a024.stack = -1;
      buff_ex.push("<시저 님의 전속 메이드>", "<엘프 일족의 완벽한 여왕>");
      setMnc(_0x23a024, [0, 1, 0, 1, 0, 1, 0, 1, 0, 1], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            for (let _0x432af4 of getRoleIdx("딜", "탱", "디")) {
              if (comp[_0x432af4].element != 1) {
                continue;
              }
              nbf(comp[_0x432af4], "일뎀증", 60, "여왕의 봉사1", 1, 1);
              deleteBuff(comp[_0x432af4], "기본", "여왕의 봉사2");
              tbf(comp[_0x432af4], "평추가*", 27, "여왕의 봉사2", 50);
            }
            nbf(boss, "받뎀증", 12, "여왕의 봉사3", 1, 1);
            break;
          case 2:
            for (let _0x50eff4 of getRoleIdx("딜", "탱", "디")) {
              if (comp[_0x50eff4].element != 1) {
                continue;
              }
              nbf(comp[_0x50eff4], "일뎀증", 70, "여왕의 봉사1", 1, 1);
              deleteBuff(comp[_0x50eff4], "기본", "여왕의 봉사2");
              tbf(comp[_0x50eff4], "평추가*", 31.5, "여왕의 봉사2", 50);
            }
            nbf(boss, "받뎀증", 14, "여왕의 봉사3", 1, 1);
            break;
          case 3:
            for (let _0x21b3bd of getRoleIdx("딜", "탱", "디")) {
              if (comp[_0x21b3bd].element != 1) {
                continue;
              }
              nbf(comp[_0x21b3bd], "일뎀증", 80, "여왕의 봉사1", 1, 1);
              deleteBuff(comp[_0x21b3bd], "기본", "여왕의 봉사2");
              tbf(comp[_0x21b3bd], "평추가*", 36, "여왕의 봉사2", 50);
            }
            nbf(boss, "받뎀증", 16, "여왕의 봉사3", 1, 1);
            break;
          case 4:
            for (let _0x3de9e5 of getRoleIdx("딜", "탱", "디")) {
              if (comp[_0x3de9e5].element != 1) {
                continue;
              }
              nbf(comp[_0x3de9e5], "일뎀증", 90, "여왕의 봉사1", 1, 1);
              deleteBuff(comp[_0x3de9e5], "기본", "여왕의 봉사2");
              tbf(comp[_0x3de9e5], "평추가*", 40.5, "여왕의 봉사2", 50);
            }
            nbf(boss, "받뎀증", 18, "여왕의 봉사3", 1, 1);
            break;
          default:
            for (let _0x565b6c of getRoleIdx("딜", "탱", "디")) {
              if (comp[_0x565b6c].element != 1) {
                continue;
              }
              nbf(comp[_0x565b6c], "일뎀증", 100, "여왕의 봉사1", 1, 1);
              deleteBuff(comp[_0x565b6c], "기본", "여왕의 봉사2");
              tbf(comp[_0x565b6c], "평추가*", 45, "여왕의 봉사2", 50);
            }
            nbf(boss, "받뎀증", 20, "여왕의 봉사3", 1, 1);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        if (_0x23a024.stack == 0) {
          nbf(_0x23a024, "<시저 님의 전속 메이드>", 0, "가끔은 휴가를 내는 것도 나쁘지 않지", -1, 1);
          nbf(_0x23a024, "<엘프 일족의 완벽한 여왕>", 0, "왕의 책임을 잊어선 안 돼", 1, 1);
          _0x23a024.stack = 1;
        } else {
          nbf(_0x23a024, "<시저 님의 전속 메이드>", 0, "가끔은 휴가를 내는 것도 나쁘지 않지", 1, 1);
          nbf(_0x23a024, "<엘프 일족의 완벽한 여왕>", 0, "왕의 책임을 잊어선 안 돼", -1, 1);
          atbf(_0x23a024, "궁", _0x23a024, "on", "기본", "<전속 메이드 서비스>1", 1, 1);
          _0x23a024.stack = 0;
        }
        ultLogic(_0x23a024);
        setBuffOn(_0x23a024, "기본", "<전속 메이드 서비스>1", _0x23a024.stack == 0);
        setBuffOn(_0x23a024, "기본", "<전속 메이드 서비스>2", _0x23a024.stack == 0);
        setBuffOnAll(_0x23a024, "발동", "<완벽한 여왕의 비호>1", _0x23a024.stack == 1);
        setBuffOn(_0x23a024, "발동", "<완벽한 여왕의 비호>2", _0x23a024.stack == 1);
        setBuffOnAll(_0x23a024, "발동", "여왕 혹은 메이드 전부 문제없지2", _0x23a024.stack == 0);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(45);
        if (getElementCnt("암") >= 2) {
          for (let _0x44307f of getElementIdx("수")) {
            tbf(comp[_0x44307f], "공퍼증", 50, "<메이드 청소팀>1", always);
            tbf(comp[_0x44307f], "일뎀증", 100, "<메이드 청소팀>2", always);
            tbf(comp[_0x44307f], "가뎀증", 40, "<메이드 청소팀>3", always);
            tbf(comp[_0x44307f], "평추가*", 50, "<메이드 청소팀>4", always);
            anbf(comp[_0x44307f], "평", boss, "받뎀증", 0.75, "<메이드 청소팀>5", 1, 40, always);
            for (let _0x3c7684 of getElementIdx("수")) {
              anbf(comp[_0x44307f], "평", comp[_0x3c7684], "받속뎀", 2, "<메이드 청소팀>6", 1, 20, always);
            }
          }
        }
        if (getElementCnt("수") >= 2) {
          for (let _0x455ed8 of getElementIdx("암")) {
            tbf(comp[_0x455ed8], "공퍼증", 100, "<메이드 봉사팀>1", always);
            tbf(comp[_0x455ed8], "일뎀증", 150, "<메이드 봉사팀>2", always);
            tbf(comp[_0x455ed8], "가뎀증", 40, "<메이드 봉사팀>3", always);
            tbf(comp[_0x455ed8], "평추가*", 80, "<메이드 봉사팀>4", always);
            anbf(comp[_0x455ed8], "평", boss, "받뎀증", 0.75, "<메이드 봉사팀>5", 1, 40, always);
            for (let _0x51a763 of getElementIdx("암")) {
              anbf(comp[_0x455ed8], "평", comp[_0x51a763], "받속뎀", 3.5, "<메이드 봉사팀>6", 1, 20, always);
            }
          }
        }
      };
      _0x23a024.passive = function () {
        buff(_0x23a024, "가뎀증", 30, "<전속 메이드 서비스>1", always, false);
        buff(_0x23a024, "평추가*", 50, "<전속 메이드 서비스>2", always, false);
        for (let _0x22549c of getElementIdx("수")) {
          buff(_0x23a024, "평", comp[_0x22549c], "아머", _0x23a024.hp * 10, "<완벽한 여왕의 비호>1", 1, always, "발동", false);
        }
        buff(_0x23a024, "방", _0x23a024, "아머", _0x23a024.hp * 30, "<완벽한 여왕의 비호>2", 1, always, "발동", false);
        for (let _0x55b3ed of getElementIdx("수")) {
          anbf(_0x23a024, "평", comp[_0x55b3ed], "공퍼증", 6.25, "여왕 혹은 메이드 전부 문제없지1", 1, 8, always);
        }
        for (let _0x384d6f of getElementIdx("수")) {
          buff(_0x23a024, "평", comp[_0x384d6f], "받속뎀", 3.75, "여왕 혹은 메이드 전부 문제없지2", 8, always, "발동", false);
        }
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        if (GLOBAL_TURN == 1) {
          cdChange(_0x23a024, -1);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10187:
      buff_ex.push("<소녀의 음수>");
      setMnc(_0x23a024, [265, 3, 298, 3, 331, 3, 364, 3, 397, 3], _0x17c963);
      _0x23a024.stack = 0;
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            nbf(boss, "받발뎀", 21, "메이드 청소술! 먼지 멸절 쾌도!1", 1, 3);
            break;
          case 2:
            nbf(boss, "받발뎀", 24.5, "메이드 청소술! 먼지 멸절 쾌도!1", 1, 3);
            for (let _0x1c0dd1 of getRoleIdx("딜", "탱", "디")) {
              buff(comp[_0x1c0dd1], "공발동*", 14, "메이드 청소술! 먼지 멸절 쾌도!2", 4, false);
            }
            break;
          case 3:
            nbf(boss, "받발뎀", 28, "메이드 청소술! 먼지 멸절 쾌도!1", 1, 3);
            for (let _0xd344be of getRoleIdx("딜", "탱", "디")) {
              buff(comp[_0xd344be], "공발동*", 16, "메이드 청소술! 먼지 멸절 쾌도!2", 4, false);
            }
            break;
          case 4:
            nbf(boss, "받발뎀", 31.5, "메이드 청소술! 먼지 멸절 쾌도!1", 1, 3);
            for (let _0x116c69 of getRoleIdx("딜", "탱", "디")) {
              buff(comp[_0x116c69], "공발동*", 18, "메이드 청소술! 먼지 멸절 쾌도!2", 4, false);
            }
            break;
          default:
            nbf(boss, "받발뎀", 35, "메이드 청소술! 먼지 멸절 쾌도!1", 1, 3);
            for (let _0x17d883 of getRoleIdx("딜", "탱", "디")) {
              buff(comp[_0x17d883], "공발동*", 20, "메이드 청소술! 먼지 멸절 쾌도!2", 4, false);
            }
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        if (_0x23a024.stack == 2) {
          setBuffOn(_0x23a024, "발동", "특제! 신성한 세정제!3", true);
        }
        ultLogic(_0x23a024);
        if (_0x23a024.stack == 2) {
          setBuffOn(_0x23a024, "발동", "특제! 신성한 세정제!3", false);
        }
        for (let _0xe34ddf of comp) {
          setBuffOnAll(_0xe34ddf, "기본", "메이드 청소술! 먼지 멸절 쾌도!2", true);
        }
        if (_0x23a024.stack == 0) {
          setBuffOnAll(_0x23a024, "발동", "특제! 신성한 세정제!1", true);
        } else if (_0x23a024.stack == 1) {
          setBuffOn(_0x23a024, "기본", "특제! 신성한 세정제!2", true);
        }
        _0x23a024.stack++;
        if (_0x23a024.stack > 3) {
          _0x23a024.stack = 3;
        }
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(45);
        tbf(all, "공퍼증", 90, "일류 메이드 학습 중!1", always);
        tbf(all, "가뎀증", 25, "일류 메이드 학습 중!2", always);
        anbf(_0x23a024, "궁", boss, "받뎀증", 5, "<메이드 청소 비급서 특별판>1", 1, 3, always);
        for (let _0x4e0b24 of getElementIdx("암")) {
          anbf(_0x23a024, "궁", comp[_0x4e0b24], "받속뎀", 10, "<메이드 청소 비급서 특별판>2", 1, 3, always);
        }
        anbf(_0x23a024, "궁", boss, "받발뎀", 42.5, "<메이드 청소 비급서 특별판>3", 1, 3, always);
      };
      _0x23a024.passive = function () {
        anbf(_0x23a024, "궁", _0x23a024, "<소녀의 음수>", 0, "특제! 신성한 세정제!", 1, 3, always);
        buff(_0x23a024, "궁", _0x23a024, "on", "기본", "특제! 신성한 세정제!3", 1, always, "발동", false);
        for (let _0x5c43ac of getElementIdx("암")) {
          buff(_0x23a024, "궁", comp[_0x5c43ac], "받속뎀", 2.5, "특제! 신성한 세정제!1", 1, 3, always, "발동", false);
        }
        buff(_0x23a024, "궁발동*", 40, "특제! 신성한 세정제!2", always, false);
        buff(_0x23a024, "가뎀증", 15, "특제! 신성한 세정제!3", always, false);
        anbf(_0x23a024, "궁", boss, "받뎀증", 20, "받아라! 초강력 세정제!1", 1, 3, always);
        for (let _0x49187c of getElementIdx("암")) {
          anbf(_0x23a024, "궁", comp[_0x49187c], "받속뎀", 5, "메이드 청소술! 먼지 박멸 회오리!", 1, 3, always);
        }
        tbf(_0x23a024, "공퍼증", 10, "공격+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        if (GLOBAL_TURN == 1) {
          cdChange(_0x23a024, -3);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10188:
      _0x23a024.stack = 0;
      setMnc(_0x23a024, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x17c963);
      buff_ex.push("<뼈저린 후회>");
      _0x23a024.ultbefore = function () {
        for (let _0x39547a of comp) {
          deleteBuff(_0x39547a, "기본", "장미 개화1");
        }
        for (let _0x2798f9 of comp) {
          deleteBuff(_0x2798f9, "기본", "장미 개화3");
        }
        deleteBuff(boss, "기본", "장미 개화4");
        switch (_0x17c963) {
          case 1:
            tbf(all, "가뎀증", 15, "장미 개화1", 4);
            tbf(all, "궁뎀증", 15, "장미 개화2", 1);
            tbf(all, "일뎀증", 25.2, "장미 개화3", 4);
            break;
          case 2:
            tbf(all, "가뎀증", 17.5, "장미 개화1", 4);
            tbf(all, "궁뎀증", 17.5, "장미 개화2", 1);
            tbf(all, "일뎀증", 29.4, "장미 개화3", 4);
            break;
          case 3:
            tbf(all, "가뎀증", 20, "장미 개화1", 4);
            tbf(all, "궁뎀증", 20, "장미 개화2", 1);
            tbf(all, "일뎀증", 33.6, "장미 개화3", 4);
            tbf(boss, "받뎀증", 6, "장미 개화4", 4);
            break;
          case 4:
            tbf(all, "가뎀증", 22.5, "장미 개화1", 4);
            tbf(all, "궁뎀증", 22.5, "장미 개화2", 1);
            tbf(all, "일뎀증", 37.8, "장미 개화3", 4);
            tbf(boss, "받뎀증", 12, "장미 개화4", 4);
            break;
          default:
            tbf(all, "가뎀증", 25, "장미 개화1", 4);
            tbf(all, "궁뎀증", 25, "장미 개화2", 1);
            tbf(all, "일뎀증", 42, "장미 개화3", 4);
            tbf(boss, "받뎀증", 18, "장미 개화4", 4);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
        const _0x186029 = _0x23a024.stack;
        if (_0x23a024.isLeader) {
          if (_0x186029 == 3) {
            setBuffOn(comp[4], "기본", "스스로 유배된 마왕2", true);
          }
          if (_0x186029 == 3) {
            setBuffOn(comp[4], "기본", "스스로 유배된 마왕3", true);
          }
          if (_0x186029 == 7) {
            setBuffOn(comp[4], "기본", "스스로 유배된 마왕4", true);
          }
          if (_0x186029 == 7) {
            setBuffOn(comp[4], "기본", "스스로 유배된 마왕5", true);
          }
        }
        if (_0x186029 == 3) {
          setBuffOnAll(comp[4], "발동", "<더 이상 피하지 않겠어>1", true);
        }
        if (_0x186029 == 3) {
          setBuffOnAll(comp[4], "발동", "<더 이상 피하지 않겠어>2", true);
        }
        if (_0x186029 == 3) {
          setBuffOn(comp[4], "기본", "다시 다진 결의1", true);
        }
        if (_0x186029 == 7) {
          setBuffOnAll(comp[4], "발동", "<모든 것을 지키겠어>1", true);
        }
        if (_0x186029 == 7) {
          setBuffOn(comp[4], "발동", "<모든 것을 지키겠어>2", true);
        }
        if (_0x186029 == 7) {
          setBuffOn(comp[4], "기본", "다시 다진 결의2", true);
        }
        if (_0x186029 == 3) {
          setBuffOn(comp[4], "발동", "잊은 적 없는 그 사람", true);
        }
        _0x23a024.stack++;
        if (_0x23a024.stack > 8) {
          _0x23a024.stack = 8;
        }
      };
      _0x23a024.atkbefore = function () {
        tbf(all, "공고증", myCurAtk + _0x23a024.id + 30, "축복의 빛", 1);
      };
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
        const _0x35cc64 = _0x23a024.stack;
        if (_0x23a024.isLeader) {
          if (_0x35cc64 == 3) {
            setBuffOn(comp[4], "기본", "스스로 유배된 마왕2", true);
          }
          if (_0x35cc64 == 3) {
            setBuffOn(comp[4], "기본", "스스로 유배된 마왕3", true);
          }
          if (_0x35cc64 == 7) {
            setBuffOn(comp[4], "기본", "스스로 유배된 마왕4", true);
          }
          if (_0x35cc64 == 7) {
            setBuffOn(comp[4], "기본", "스스로 유배된 마왕5", true);
          }
        }
        if (_0x35cc64 == 3) {
          setBuffOnAll(comp[4], "발동", "<더 이상 피하지 않겠어>1", true);
        }
        if (_0x35cc64 == 3) {
          setBuffOnAll(comp[4], "발동", "<더 이상 피하지 않겠어>2", true);
        }
        if (_0x35cc64 == 3) {
          setBuffOn(comp[4], "기본", "다시 다진 결의1", true);
        }
        if (_0x35cc64 == 7) {
          setBuffOnAll(comp[4], "발동", "<모든 것을 지키겠어>1", true);
        }
        if (_0x35cc64 == 7) {
          setBuffOn(comp[4], "발동", "<모든 것을 지키겠어>2", true);
        }
        if (_0x35cc64 == 7) {
          setBuffOn(comp[4], "기본", "다시 다진 결의2", true);
        }
        if (_0x35cc64 == 3) {
          setBuffOn(comp[4], "발동", "잊은 적 없는 그 사람", true);
        }
        _0x23a024.stack++;
        if (_0x23a024.stack > 8) {
          _0x23a024.stack = 8;
        }
      };
      _0x23a024.leader = function () {
        hpUpAll(50);
        if (getElKind() == 1) {
          tbf(all, "공퍼증", 50, "<은밀한 도움>1", always);
          tbf(all, "가뎀증", 45, "<은밀한 도움>2", always);
          tbf(all, "일뎀증", 75, "<은밀한 도움>3", always);
          tbf(all, "평추가*", 30, "<은밀한 도움>4", always);
        }
        for (let _0x4bc6a9 of getRoleIdx("딜", "탱", "디")) {
          atbf(comp[_0x4bc6a9], "공격", all, "공고증", myCurAtk + comp[_0x4bc6a9].id + 15, "스스로 유배된 마왕1", 1, always);
        }
        buff(comp[4], "궁뎀증", 40, "스스로 유배된 마왕2", always, false);
        buff(comp[4], "궁추가*", 50, "스스로 유배된 마왕3", always, false);
        buff(comp[4], "궁뎀증", 80, "스스로 유배된 마왕4", always, false);
        buff(comp[4], "궁추가*", 100, "스스로 유배된 마왕5", always, false);
      };
      _0x23a024.passive = function () {
        anbf(_0x23a024, "공격", comp[4], "<뼈저린 후회>", 0, "잊은 적 없는 그 사람", 1, 8, always);
        atbf(_0x23a024, "궁", all, "공고증", myCurAtk + _0x23a024.id + 30, "잊은 적 없는 그 사람2", 1, always);
        buff(comp[4], "궁", comp[4], "제거", "기본", "<더 이상 피하지 않겠어>1", 1, always, "발동", false);
        buff(comp[4], "궁", comp[4], "가뎀증", 7, "<더 이상 피하지 않겠어>1", 9, always, "발동", false);
        buff(comp[4], "궁", comp[4], "제거", "기본", "<더 이상 피하지 않겠어>2", 1, always, "발동", false);
        buff(comp[4], "궁", comp[4], "평추가*", 8, "<더 이상 피하지 않겠어>2", 8, always, "발동", false);
        buff(comp[4], "궁추가*", 25, "다시 다진 결의1", always, false);
        buff(comp[4], "궁", comp[4], "제거", "기본", "<모든 것을 지키겠어>1", 1, always, "발동", false);
        buff(comp[4], "궁", comp[4], "가뎀증", 17, "<모든 것을 지키겠어>1", 9, always, "발동", false);
        buff(comp[4], "궁", comp[4], "평추가*", 16, "<모든 것을 지키겠어>2", 8, always, "발동", false);
        buff(comp[4], "궁추가*", 50, "다시 다진 결의2", always, false);
        buff(comp[4], "궁", comp[4], "<뼈저린 후회>", 0, "잊은 적 없는 그 사람", -8, 8, always, "발동", false);
        const _0x1c8444 = comp[4].ultimate;
        comp[4].ultimate = function (..._0x23a2e1) {
          _0x1c8444.apply(this, _0x23a2e1);
          if (_0x23a024.stack >= 4) {
            _0x23a024.stack = 0;
            if (_0x23a024.isLeader) {
              setBuffOn(comp[4], "기본", "스스로 유배된 마왕2", false);
              setBuffOn(comp[4], "기본", "스스로 유배된 마왕3", false);
              setBuffOn(comp[4], "기본", "스스로 유배된 마왕4", false);
              setBuffOn(comp[4], "기본", "스스로 유배된 마왕5", false);
            }
            setBuffOnAll(comp[4], "발동", "<더 이상 피하지 않겠어>1", false);
            setBuffOnAll(comp[4], "발동", "<더 이상 피하지 않겠어>2", false);
            setBuffOn(comp[4], "기본", "다시 다진 결의1", false);
            setBuffOnAll(comp[4], "발동", "<모든 것을 지키겠어>1", false);
            setBuffOn(comp[4], "발동", "<모든 것을 지키겠어>2", false);
            setBuffOn(comp[4], "기본", "다시 다진 결의2", false);
            setBuffOn(comp[4], "발동", "잊은 적 없는 그 사람", false);
          }
        };
        atbf(_0x23a024, "공격", comp[4], "공고증", myCurAtk + _0x23a024.id + 15, "다시 출발1", 1, always);
        tbf(_0x23a024, "공퍼증", 10, "공격+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {
          if (GLOBAL_TURN == 1) {
            nbf(boss, "받뎀증", 16, "스스로 유배된 마왕6", 1, 1);
            for (let _0x1ff17c of getElementIdx("광")) {
              nbf(comp[_0x1ff17c], "받속뎀", 40, "스스로 유배된 마왕7", 1, 1);
            }
          }
        }
        if (GLOBAL_TURN == 1 || GLOBAL_TURN == 5 || GLOBAL_TURN == 9) {
          for (let _0x3ff31e of getElementIdx("광")) {
            nbf(comp[_0x3ff31e], "받속뎀", 10, "다시 출발2", 1, 3);
          }
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10189:
      _0x23a024.stack = 0;
      buff_ex.push("<지옥의 화염>", "<저주 같은 사랑>");
      setMnc(_0x23a024, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(_0x23a024, "공퍼증", 100, "종언-잔혹의 발톱1", 2);
            tbf(_0x23a024, "일뎀증", 50, "종언-잔혹의 발톱2", 2);
            for (let _0x249cf0 of getElementIdx("화")) {
              tbf(comp[_0x249cf0], "받속뎀", 18, "종언-잔혹의 발톱3", 2);
            }
            break;
          case 2:
            tbf(_0x23a024, "공퍼증", 115, "종언-잔혹의 발톱1", 2);
            tbf(_0x23a024, "일뎀증", 65, "종언-잔혹의 발톱2", 2);
            for (let _0x1edd1e of getElementIdx("화")) {
              tbf(comp[_0x1edd1e], "받속뎀", 21, "종언-잔혹의 발톱3", 2);
            }
            break;
          case 3:
            tbf(_0x23a024, "공퍼증", 130, "종언-잔혹의 발톱1", 2);
            tbf(_0x23a024, "일뎀증", 80, "종언-잔혹의 발톱2", 2);
            for (let _0x77f93b of getElementIdx("화")) {
              tbf(comp[_0x77f93b], "받속뎀", 24, "종언-잔혹의 발톱3", 2);
            }
            anbf(_0x23a024, "평", _0x23a024, "<지옥의 화염>", 0, "만물 멸절", 1, 6, 2);
            break;
          case 4:
            tbf(_0x23a024, "공퍼증", 145, "종언-잔혹의 발톱1", 2);
            tbf(_0x23a024, "일뎀증", 95, "종언-잔혹의 발톱2", 2);
            for (let _0x14f596 of getElementIdx("화")) {
              tbf(comp[_0x14f596], "받속뎀", 27, "종언-잔혹의 발톱3", 2);
            }
            anbf(_0x23a024, "평", _0x23a024, "<지옥의 화염>", 0, "만물 멸절", 2, 6, 2);
            break;
          default:
            tbf(_0x23a024, "공퍼증", 160, "종언-잔혹의 발톱1", 2);
            tbf(_0x23a024, "일뎀증", 110, "종언-잔혹의 발톱2", 2);
            for (let _0x305b24 of getElementIdx("화")) {
              tbf(comp[_0x305b24], "받속뎀", 30, "종언-잔혹의 발톱3", 2);
            }
            anbf(_0x23a024, "평", _0x23a024, "<지옥의 화염>", 0, "만물 멸절", 3, 6, 2);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
        setBuffOnAll(_0x23a024, "발동", "만물 멸절1", false);
        setBuffOnAll(_0x23a024, "발동", "만물 멸절2", false);
        setBuffOnAll(_0x23a024, "발동", "만물 멸절3", false);
        setBuffOnAll(_0x23a024, "발동", "만물 멸절4", false);
        setBuffOnAll(_0x23a024, "발동", "만물 멸절5", false);
        setBuffOnAll(_0x23a024, "발동", "만물 멸절6", false);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {
        nbf(_0x23a024, "일뎀증", 5, "타오르지 않는 증오2", 1, 10);
      };
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
        _0x23a024.hit();
      };
      _0x23a024.leader = function () {
        hpUpAll(50);
        if (getRoleCnt("딜") >= 2) {
          tbf(all, "공퍼증", -500, "욕망을 상실한 마왕1", always);
        }
        for (let _0x190f51 of comp) {
          if (_0x190f51.id == _0x23a024.id) {
            continue;
          }
          tbf(_0x190f51, "공퍼증", 50, "<화염의 만연>1", always);
          const _0x4c0ff0 = _0x190f51.ultimate;
          _0x190f51.ultimate = function (..._0x3119ff) {
            atbf(_0x190f51, "평", boss, "받뎀증", 5, "<화염의 만연>2", 1, 2);
            atbf(_0x190f51, "평", boss, "받일뎀", 10, "<화염의 만연>3", 1, 2);
            _0x4c0ff0.apply(this, _0x3119ff);
            atbf(comp[0], "궁", comp[0], "공퍼증", 35, "<타오르는 전투 욕구>1", 2, 1);
            atbf(comp[0], "궁", comp[0], "가뎀증", 10.5, "<타오르는 전투 욕구>2", 2, 1);
            atbf(comp[0], "궁", comp[0], "일뎀증", 30, "<타오르는 전투 욕구>3", 2, 1);
            atbf(comp[0], "궁", comp[0], "평추가*", 52.5, "<타오르는 전투 욕구>4", 2, 1);
          };
        }
      };
      _0x23a024.passive = function () {
        tbf(_0x23a024, "공퍼증", 45, "타오르지 않는 증오1", always);
        anbf(_0x23a024, "피격", _0x23a024, "<지옥의 화염>", 0, "만물 멸절", 1, 6, always);
        const _0x5bc102 = _0x23a024.hit;
        _0x23a024.hit = function (..._0x1c8e96) {
          _0x5bc102.apply(this, _0x1c8e96);
          const _0xdea6d4 = _0x23a024.getNest("<지옥의 화염>");
          setBuffOnAll(_0x23a024, "발동", "만물 멸절1", _0xdea6d4 >= 1);
          setBuffOnAll(_0x23a024, "발동", "만물 멸절2", _0xdea6d4 >= 2);
          setBuffOnAll(_0x23a024, "발동", "만물 멸절3", _0xdea6d4 >= 3);
          setBuffOnAll(_0x23a024, "발동", "만물 멸절4", _0xdea6d4 >= 4);
          setBuffOnAll(_0x23a024, "발동", "만물 멸절5", _0xdea6d4 >= 5);
          setBuffOnAll(_0x23a024, "발동", "만물 멸절6", _0xdea6d4 >= 6);
        };
        buff(_0x23a024, "궁", _0x23a024, "가뎀증", 5, "만물 멸절1", 2, always, "발동", false);
        buff(_0x23a024, "궁", _0x23a024, "평추가*", 52.5, "만물 멸절1", 2, always, "발동", false);
        buff(_0x23a024, "궁", _0x23a024, "가뎀증", 5, "만물 멸절2", 2, always, "발동", false);
        buff(_0x23a024, "궁", _0x23a024, "평추가*", 52.5, "만물 멸절2", 2, always, "발동", false);
        buff(_0x23a024, "궁", _0x23a024, "가뎀증", 5, "만물 멸절3", 2, always, "발동", false);
        buff(_0x23a024, "궁", _0x23a024, "평추가*", 52.5, "만물 멸절3", 2, always, "발동", false);
        buff(_0x23a024, "궁", _0x23a024, "가뎀증", 5, "만물 멸절4", 2, always, "발동", false);
        buff(_0x23a024, "궁", _0x23a024, "평추가*", 52.5, "만물 멸절4", 2, always, "발동", false);
        buff(_0x23a024, "궁", _0x23a024, "가뎀증", 5, "만물 멸절5", 2, always, "발동", false);
        buff(_0x23a024, "궁", _0x23a024, "평추가*", 52.5, "만물 멸절5", 2, always, "발동", false);
        buff(_0x23a024, "궁", _0x23a024, "가뎀증", 5, "만물 멸절6", 2, always, "발동", false);
        buff(_0x23a024, "궁", _0x23a024, "평추가*", 52.5, "만물 멸절6", 2, always, "발동", false);
        anbf(_0x23a024, "궁", _0x23a024, "<지옥의 화염>", 0, "만물 멸절", -6, 6, always);
        for (let _0x3c62cf of comp) {
          anbf(_0x3c62cf, "피격", _0x23a024, "<저주 같은 사랑>", 0, "되찾을 수 없는 욕망", 1, 10, always);
        }
        buff(_0x23a024, "공퍼증", 30, "되찾을 수 없는 욕망1", always, false);
        buff(_0x23a024, "방뎀증", 100, "되찾을 수 없는 욕망2", always, false);
        buff(_0x23a024, "궁", _0x23a024, "가뎀증", 30, "되찾을 수 없는 욕망3", 2, always, "발동", false);
        for (let _0x2f767d of comp) {
          const _0x433049 = _0x2f767d.hit;
          _0x2f767d.hit = function (..._0x306f4a) {
            _0x433049.apply(this, _0x306f4a);
            if (_0x23a024.stack == 1) {
              setBuffOn(_0x23a024, "기본", "되찾을 수 없는 욕망1", true);
            } else if (_0x23a024.stack == 5) {
              setBuffOn(_0x23a024, "기본", "되찾을 수 없는 욕망2", true);
            } else if (_0x23a024.stack == 9) {
              setBuffOn(_0x23a024, "발동", "되찾을 수 없는 욕망3", true);
            }
            _0x23a024.stack += 1;
            if (_0x23a024.stack >= 10) {
              _0x23a024.stack = 10;
            }
          };
        }
        tbf(_0x23a024, "공퍼증", 10, "공격+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10190:
      buff_ex.push("<모두를 지키겠어>", "<잃어버린 마력>");
      _0x23a024.stack = 0;
      setMnc(_0x23a024, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        for (let _0x3e5926 of comp) {
          if (_0x3e5926.id != _0x23a024.id) {
            deleteBuff(_0x3e5926, "기본", "승부수를 던지다3");
          }
        }
        switch (_0x17c963) {
          case 1:
            nbf(_0x23a024, "공퍼증", 18, "승부수를 던지다1", 1, 3);
            nbf(all, "발효증", 25.2, "승부수를 던지다2", 1, 3);
            buff(all, "공발동*", 18, "승부수를 던지다3", 4, false);
            break;
          case 2:
            nbf(_0x23a024, "공퍼증", 21, "승부수를 던지다1", 1, 3);
            nbf(all, "발효증", 29.4, "승부수를 던지다2", 1, 3);
            buff(all, "공발동*", 21, "승부수를 던지다3", 4, false);
            break;
          case 3:
            nbf(_0x23a024, "공퍼증", 24, "승부수를 던지다1", 1, 3);
            nbf(all, "발효증", 33.6, "승부수를 던지다2", 1, 3);
            buff(all, "공발동*", 24, "승부수를 던지다3", 4, false);
            break;
          case 4:
            nbf(_0x23a024, "공퍼증", 27, "승부수를 던지다1", 1, 3);
            nbf(all, "발효증", 37.8, "승부수를 던지다2", 1, 3);
            buff(all, "공발동*", 27, "승부수를 던지다3", 4, false);
            break;
          default:
            nbf(_0x23a024, "공퍼증", 30, "승부수를 던지다1", 1, 3);
            nbf(all, "발효증", 42, "승부수를 던지다2", 1, 3);
            buff(all, "공발동*", 30, "승부수를 던지다3", 4, false);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
        for (let _0x452a30 = 0; _0x452a30 < _0x23a024.buff.length; _0x452a30++) {
          if (_0x23a024.buff[_0x452a30].name === "승부수를 던지다3" && _0x23a024.buff[_0x452a30].div == "기본" && _0x23a024.buff[_0x452a30].on) {
            _0x23a024.buff.splice(_0x452a30, 1);
            break;
          }
        }
        for (let _0x4d60a2 of comp) {
          setBuffOn(_0x4d60a2, "기본", "승부수를 던지다3", true);
          _0x4d60a2.heal();
        }
        nbf(_0x23a024, "<잃어버린 마력>", 0, "마력 상실", 1, 3);
        _0x23a024.stack += 1;
        if (_0x23a024.stack > 3) {
          _0x23a024.stack = 3;
        }
        setBuffOnAll(_0x23a024, "발동", "마력 상실1", _0x23a024.stack >= 1);
        setBuffOnAll(_0x23a024, "발동", "마력 상실3", _0x23a024.stack >= 3);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
        for (let _0x3176fb of comp) {
          _0x3176fb.heal();
        }
      };
      _0x23a024.leader = function () {
        hpUpAll(50);
        tbf(all, "공퍼증", 50, "유언의 계승자1", always);
        for (let _0x3b2a1b of comp) {
          anbf(_0x3b2a1b, "힐", _0x3b2a1b, "<모두를 지키겠어>", 0, "마지막 당부", 1, 40, always);
          anbf(_0x3b2a1b, "힐", _0x3b2a1b, "발효증", 2.25, "마지막 당부2", 1, 40, always);
        }
        if (getElementCnt("광") >= 2 || getElementCnt("수") >= 2) {
          for (let _0x4f390 of comp) {
            const _0x2a548a = _0x4f390.act_attack;
            _0x4f390.act_attack = function (..._0x50f623) {
              _0x2a548a.apply(this, _0x50f623);
              for (let _0x28195e of comp) {
                _0x28195e.heal3();
              }
            };
            const _0x1600d0 = _0x4f390.act_ultimate;
            _0x4f390.act_ultimate = function (..._0x40dd1f) {
              _0x1600d0.apply(this, _0x40dd1f);
              for (let _0x4c515d of comp) {
                _0x4c515d.heal3();
              }
            };
          }
        }
        buff(all, "공발동*", 20, "유언의 계승자4", always, false);
        buff(all, "공발동*", 20, "유언의 계승자5", always, false);
        for (let _0x2c46d0 of comp) {
          const _0x21fe00 = _0x2c46d0.attack;
          _0x2c46d0.attack = function (..._0x57a4c0) {
            _0x21fe00.apply(this, _0x57a4c0);
            _0x2603c2();
          };
          const _0x95e79e = _0x2c46d0.ultimate;
          _0x2c46d0.ultimate = function (..._0x17ddf0) {
            _0x95e79e.apply(this, _0x17ddf0);
            _0x2603c2();
          };
          const _0xc00a51 = _0x2c46d0.defense;
          _0x2c46d0.defense = function (..._0x23573e) {
            _0xc00a51.apply(this, _0x23573e);
            _0x2603c2();
          };
        }
        function _0x2603c2() {
          for (let _0x1377b1 of comp) {
            const _0x397cd0 = _0x1377b1.getNest("<모두를 지키겠어>");
            setBuffOn(_0x1377b1, "기본", "유언의 계승자4", _0x397cd0 >= 20);
            setBuffOn(_0x1377b1, "기본", "유언의 계승자5", _0x397cd0 >= 40);
          }
        }
      };
      _0x23a024.passive = function () {
        anbf(_0x23a024, "힐", all, "발효증", 6, "<시저의 영면>1", 1, 10, always);
        for (let _0x5e9d7f of comp) {
          const _0x30985c = _0x5e9d7f.attack;
          _0x5e9d7f.attack = function (..._0x4c303f) {
            _0x30985c.apply(this, _0x4c303f);
            _0x12eb52();
          };
          const _0x1dbf7e = _0x5e9d7f.ultimate;
          _0x5e9d7f.ultimate = function (..._0x212b08) {
            _0x1dbf7e.apply(this, _0x212b08);
            _0x12eb52();
          };
          const _0x9f4be5 = _0x5e9d7f.defense;
          _0x5e9d7f.defense = function (..._0x19ea17) {
            _0x9f4be5.apply(this, _0x19ea17);
            _0x12eb52();
          };
        }
        function _0x12eb52() {
          if (_0x23a024.isHealed || _0x23a024.isHealed2 || _0x23a024.isHealed3) {
            for (let _0x137f65 of comp) {
              deleteBuff(_0x137f65, "기본", "<시저의 영면>2");
              tbf(_0x137f65, "공발동*", 30, "<시저의 영면>2", 1);
            }
          }
        }
        for (let _0xbc1222 of getElementIdx("수", "광")) {
          buff(_0x23a024, "힐", comp[_0xbc1222], "가뎀증", 10, "마력 상실1", 1, always, "발동", false);
        }
        for (let _0x10ae2d of comp) {
          if (_0x10ae2d.id != _0x23a024.id) {
            buff(_0x23a024, "힐", _0x10ae2d, "공고증", myCurAtk + _0x23a024.id + 6, "마력 상실3", 1, always, "발동", false);
          }
        }
        anbf(_0x23a024, "힐", all, "가뎀증", 1.5, "약속 이행3", 1, 10, always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {
          if (GLOBAL_TURN != 1) {
            for (let _0x45656c of getElementIdx("수", "광")) {
              nbf(comp[_0x45656c], "받속뎀", 2, "유언의 계승자6", 1, 10);
            }
          }
        }
        if (GLOBAL_TURN == 1) {
          cdChange(_0x23a024, -4);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10191:
      _0x23a024.stack = 0;
      buff_ex.push("<여전히 함께>");
      setMnc(_0x23a024, [246, 4, 310.5, 4, 375, 4, 439.5, 4, 504, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        deleteBuff(_0x23a024, "기본", "혈체술-영혼갈퀴0");
        deleteBuff(_0x23a024, "기본", "혈체술-영혼갈퀴2");
        switch (_0x17c963) {
          case 1:
            tbf(_0x23a024, "궁뎀증", 39, "혈체술-영혼갈퀴1", 1);
            tbf(_0x23a024, "발효증", 39, "혈체술-영혼갈퀴2", 4);
            break;
          case 2:
            tbf(_0x23a024, "궁뎀증", 45.5, "혈체술-영혼갈퀴1", 1);
            tbf(_0x23a024, "발효증", 45.5, "혈체술-영혼갈퀴2", 4);
            break;
          case 3:
            tbf(_0x23a024, "가뎀증", 10, "혈체술-영혼갈퀴0", 4);
            tbf(_0x23a024, "궁뎀증", 52, "혈체술-영혼갈퀴1", 1);
            tbf(_0x23a024, "발효증", 52, "혈체술-영혼갈퀴2", 4);
            break;
          case 4:
            tbf(_0x23a024, "가뎀증", 20, "혈체술-영혼갈퀴0", 4);
            tbf(_0x23a024, "궁뎀증", 58.5, "혈체술-영혼갈퀴1", 1);
            tbf(_0x23a024, "발효증", 58.5, "혈체술-영혼갈퀴2", 4);
            break;
          default:
            tbf(_0x23a024, "가뎀증", 30, "혈체술-영혼갈퀴0", 4);
            tbf(_0x23a024, "궁뎀증", 65, "혈체술-영혼갈퀴1", 1);
            tbf(_0x23a024, "발효증", 65, "혈체술-영혼갈퀴2", 4);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024, 5);
        nbf(_0x23a024, "<여전히 함께>", 0, "마왕의 힘", -3, 3);
        _0x23a024.stack = 0;
        setBuffOn(_0x23a024, "기본", "마왕의 힘1", false);
        setBuffOn(_0x23a024, "기본", "마왕의 힘2", false);
        setBuffOn(_0x23a024, "기본", "마왕의 힘3", false);
      };
      _0x23a024.atkbefore = function () {
        tbf(_0x23a024, "가뎀증", 8, "빌려온 힘", 4);
      };
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
        if (_0x23a024.stack == 0) {
          setBuffOn(_0x23a024, "기본", "마왕의 힘1", true);
        } else if (_0x23a024.stack == 1) {
          setBuffOn(_0x23a024, "기본", "마왕의 힘2", true);
        } else if (_0x23a024.stack == 2) {
          setBuffOn(_0x23a024, "기본", "마왕의 힘3", true);
        }
        _0x23a024.stack += 1;
        if (_0x23a024.stack > 3) {
          _0x23a024.stack = 3;
        }
      };
      _0x23a024.leader = function () {
        hpUpAll(50);
        if (getRoKind() == 3) {
          tbf(_0x23a024, "공퍼증", 70, "<의식 코어>1", always);
          tbf(_0x23a024, "가뎀증", 70, "<의식 코어>2", always);
          tbf(_0x23a024, "궁뎀증", 75, "<의식 코어>3", always);
          tbf(_0x23a024, "발효증", 75, "<의식 코어>4", always);
          tbf(_0x23a024, "궁추가*", 100, "<의식 코어>5", always);
          tbf(_0x23a024, "궁발동*", 50, "<의식 코어>6", always);
          for (let _0x494fff of comp) {
            if (_0x494fff.role == 0) {
              continue;
            }
            tbf(_0x494fff, "공퍼증", 70, "<힘 흡수>1", always);
            atbf(_0x494fff, "공격", boss, "받뎀증", 7, "<힘 흡수>2", 1, always);
            for (let _0x410274 of getElementIdx("풍")) {
              atbf(_0x494fff, "공격", comp[_0x410274], "받속뎀", 10.5, "<힘 흡수>3", 1, always);
            }
          }
        }
      };
      _0x23a024.passive = function () {
        tbf(_0x23a024, "공퍼증", 60, "광기에 빠진 시저1", always);
        tbf(_0x23a024, "평발동*", 100, "광기에 빠진 시저2", always);
        anbf(_0x23a024, "평", _0x23a024, "<여전히 함께>", 0, "마왕의 힘", 1, 3, always);
        buff(_0x23a024, "궁발동*", 36, "마왕의 힘1", always, false);
        buff(_0x23a024, "궁발동*", 72, "마왕의 힘2", always, false);
        buff(_0x23a024, "궁발동*", 108, "마왕의 힘3", always, false);
        tbf(_0x23a024, "가뎀증", 27.5, "이루지 못한 아쉬움1", always);
        for (let _0x3c9905 of comp) {
          if (_0x3c9905.role != 0) {
            atbf(_0x3c9905, "공격", boss, "받뎀증", 6.5, "<다하지 못한 약속>1", 1, always);
            for (let _0x2be103 of getElementIdx("풍")) {
              atbf(_0x3c9905, "공격", comp[_0x2be103], "받속뎀", 9.75, "<다하지 못한 약속>2", 1, always);
            }
          }
        }
        tbf(_0x23a024, "가뎀증", 7.5, "데미지+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10192:
      _0x23a024.stack = 0;
      setMnc(_0x23a024, [324, 4, 378, 4, 432, 4, 486, 4, 540, 4], _0x17c963);
      buff_ex.push("<순진무구>", "<여우 신부의 축복>");
      _0x23a024.ultbefore = function () {
        deleteBuff(_0x23a024, "기본", "새로운 빛으로 물들이다1");
        deleteBuff(_0x23a024, "기본", "새로운 빛으로 물들이다2");
        for (let _0x1b8de9 of comp) {
          if (_0x1b8de9.id != _0x23a024.id) {
            deleteBuff(_0x1b8de9, "발동", "새로운 빛으로 물들이다3");
            deleteBuff(_0x1b8de9, "발동", "새로운 빛으로 물들이다4");
          }
        }
        switch (_0x17c963) {
          case 1:
            tbf(_0x23a024, "공퍼증", 100, "새로운 빛으로 물들이다1", 4);
            tbf(_0x23a024, "가뎀증", 18, "새로운 빛으로 물들이다2", 4);
            for (let _0x1f8d6c of comp) {
              if (_0x1f8d6c.id != _0x23a024.id) {
                for (let _0x5f5d28 of getElementIdx("암")) {
                  atbf(_0x1f8d6c, "공격", comp[_0x5f5d28], "받속뎀", 5, "새로운 빛으로 물들이다4", 1, 5);
                }
              }
            }
            break;
          case 2:
            tbf(_0x23a024, "공퍼증", 112, "새로운 빛으로 물들이다1", 4);
            tbf(_0x23a024, "가뎀증", 21, "새로운 빛으로 물들이다2", 4);
            for (let _0x5a1729 of comp) {
              if (_0x5a1729.id != _0x23a024.id) {
                atbf(_0x5a1729, "공격", boss, "받뎀증", 3.5, "새로운 빛으로 물들이다3", 1, 5);
                for (let _0x1b1020 of getElementIdx("암")) {
                  atbf(_0x5a1729, "공격", comp[_0x1b1020], "받속뎀", 6, "새로운 빛으로 물들이다4", 1, 5);
                }
              }
            }
            break;
          case 3:
            tbf(_0x23a024, "공퍼증", 128, "새로운 빛으로 물들이다1", 4);
            tbf(_0x23a024, "가뎀증", 24, "새로운 빛으로 물들이다2", 4);
            for (let _0x260228 of comp) {
              if (_0x260228.id != _0x23a024.id) {
                atbf(_0x260228, "공격", boss, "받뎀증", 4, "새로운 빛으로 물들이다3", 1, 5);
                for (let _0x347fe1 of getElementIdx("암")) {
                  atbf(_0x260228, "공격", comp[_0x347fe1], "받속뎀", 7, "새로운 빛으로 물들이다4", 1, 5);
                }
              }
            }
            break;
          case 4:
            tbf(_0x23a024, "공퍼증", 144, "새로운 빛으로 물들이다1", 4);
            tbf(_0x23a024, "가뎀증", 27, "새로운 빛으로 물들이다2", 4);
            for (let _0x2204e3 of comp) {
              if (_0x2204e3.id != _0x23a024.id) {
                atbf(_0x2204e3, "공격", boss, "받뎀증", 4.5, "새로운 빛으로 물들이다3", 1, 5);
                for (let _0x38c75e of getElementIdx("암")) {
                  atbf(_0x2204e3, "공격", comp[_0x38c75e], "받속뎀", 8, "새로운 빛으로 물들이다4", 1, 5);
                }
              }
            }
            break;
          default:
            tbf(_0x23a024, "공퍼증", 160, "새로운 빛으로 물들이다1", 4);
            tbf(_0x23a024, "가뎀증", 30, "새로운 빛으로 물들이다2", 4);
            for (let _0x3e281d of comp) {
              if (_0x3e281d.id != _0x23a024.id) {
                atbf(_0x3e281d, "공격", boss, "받뎀증", 5, "새로운 빛으로 물들이다3", 1, 5);
                for (let _0x3790e1 of getElementIdx("암")) {
                  atbf(_0x3e281d, "공격", comp[_0x3790e1], "받속뎀", 9, "새로운 빛으로 물들이다4", 1, 5);
                }
              }
            }
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024, 3);
        const _0x3e2ce5 = _0x23a024.stack;
        for (let _0x4d3916 = 0; _0x4d3916 < _0x3e2ce5; _0x4d3916++) {
          tbf(_0x23a024, "일뎀증", 7, "<여우의 어령>1", 4);
          tbf(_0x23a024, "가뎀증", 5, "<여우의 어령>2", 5);
          tbf(_0x23a024, "평추가*", 10, "<여우의 어령>3", 4);
        }
        nbf(_0x23a024, "<순진무구>", 0, "장난꾸러기 요호의 하루 기원", -3, 3);
        _0x23a024.stack = 0;
        setBuffOn(_0x23a024, "기본", "<무결한 마음>1", false);
        setBuffOn(_0x23a024, "기본", "<무결한 마음>2", false);
        setBuffOnAll(_0x23a024, "발동", "<무결한 마음>3", false);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        if (_0x23a024.stack == 2) {
          setBuffOn(_0x23a024, "발동", "<무결한 마음>1", true);
          setBuffOn(_0x23a024, "발동", "<무결한 마음>2", true);
        }
        atkLogic(_0x23a024);
        if (_0x23a024.stack == 2) {
          setBuffOn(_0x23a024, "발동", "<무결한 마음>1", false);
          setBuffOn(_0x23a024, "발동", "<무결한 마음>2", false);
          setBuffOnAll(_0x23a024, "발동", "<무결한 마음>3", true);
        }
        _0x23a024.stack += 1;
        if (_0x23a024.stack > 3) {
          _0x23a024.stack = 3;
        }
      };
      _0x23a024.leader = function () {
        hpUpAll(50);
        anbf(_0x23a024, "방", _0x23a024, "<순진무구>", 0, "장난꾸러기 요호의 하루 기원", 1, 3, always);
        const _0x3dc345 = getRoleCnt("딜", "탱", "디");
        for (let _0x1ac656 of comp) {
          nbf(_0x1ac656, "<여우 신부의 축복>", 0, "오늘은 시즈카가 시집가는 날~", _0x3dc345, 4);
        }
        if (_0x3dc345 >= 4) {
          for (let _0x4ff6a5 of comp) {
            tbf(_0x4ff6a5, "공퍼증", 100, "<새해의 인연>1", always);
            tbf(_0x4ff6a5, "가뎀증", 35, "<새해의 인연>2", always);
            tbf(_0x4ff6a5, "일뎀증", 60, "<새해의 인연>3", always);
            tbf(_0x4ff6a5, "궁뎀증", 40, "<새해의 인연>4", always);
            atbf(_0x4ff6a5, "공격", all, "공고증", myCurAtk + _0x4ff6a5.id + 10, "<새해의 인연>5", 1, always);
            tbf(_0x4ff6a5, "평추가*", 25, "<새해의 인연>6", always);
            tbf(_0x4ff6a5, "궁추가*", 50, "<새해의 인연>7", always);
          }
        }
      };
      _0x23a024.passive = function () {
        anbf(_0x23a024, "평", _0x23a024, "궁뎀증", 2.5, "소꿉놀이로 끝내고 싶지 않아1", 1, 6, always);
        anbf(_0x23a024, "궁", _0x23a024, "일뎀증", 10, "소꿉놀이로 끝내고 싶지 않아2", 1, 3, always);
        anbf(_0x23a024, "평", _0x23a024, "<순진무구>", 0, "장난꾸러기 요호의 하루 기원", 1, 3, always);
        buff(_0x23a024, "평", _0x23a024, "on", "기본", "<무결한 마음>1", 1, always, "발동", false);
        buff(_0x23a024, "평", _0x23a024, "on", "기본", "<무결한 마음>2", 1, always, "발동", false);
        buff(_0x23a024, "궁뎀증", 20, "<무결한 마음>1", always, false);
        buff(_0x23a024, "방뎀증", 100, "<무결한 마음>2", always, false);
        buff(_0x23a024, "궁", all, "제거", "기본", "<무결한 마음>3", 1, always, "발동", false);
        buff(_0x23a024, "궁", all, "공퍼증", 15, "<무결한 마음>3", 5, always, "발동", false);
        tbf(_0x23a024, "가뎀증", 7.5, "가하는 데미지+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
        if (_0x23a024.isLeader) {
          if (_0x23a024.stack == 2) {
            setBuffOn(_0x23a024, "기본", "<무결한 마음>1", true);
            setBuffOn(_0x23a024, "기본", "<무결한 마음>2", true);
            setBuffOnAll(_0x23a024, "발동", "<무결한 마음>3", true);
          }
          _0x23a024.stack += 1;
          if (_0x23a024.stack > 3) {
            _0x23a024.stack = 3;
          }
        }
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        if (GLOBAL_TURN == 1) {
          cdChange(_0x23a024, -4);
          nbf(_0x23a024, "<순진무구>", 0, "장난꾸러기 요호의 하루 기원", 3, 3);
          _0x23a024.stack += 3;
          setBuffOn(_0x23a024, "기본", "<무결한 마음>1", true);
          setBuffOn(_0x23a024, "기본", "<무결한 마음>2", true);
          setBuffOnAll(_0x23a024, "발동", "<무결한 마음>3", true);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10193:
      setMnc(_0x23a024, [265, 3, 298, 3, 331, 3, 364, 3, 397, 3], _0x17c963);
      buff_ex.push("<킹크랩 양념 부적>", "<통증이 사라진다 부적>", "<정면으로 덤벼라 부적>", "<느끼면 패배 부적>");
      _0x23a024.stack = 0;
      _0x23a024.ultbefore = function () {
        for (let _0x462f0a of getRoleIdx("딜", "디")) {
          deleteBuff(comp[_0x462f0a], "기본", "붓이 아주 크니까, 조금만 참아2");
        }
        deleteBuff(boss, "기본", "붓이 아주 크니까, 조금만 참아3");
        switch (_0x17c963) {
          case 1:
            for (let _0x4ca08e of getRoleIdx("딜", "디")) {
              tbf(comp[_0x4ca08e], "궁추가*", 36, "붓이 아주 크니까, 조금만 참아1", 1);
              tbf(comp[_0x4ca08e], "평발동*", 21.6, "붓이 아주 크니까, 조금만 참아2", 3);
            }
            tbf(boss, "받뎀증", 13.2, "붓이 아주 크니까, 조금만 참아3", 3);
            break;
          case 2:
            for (let _0x1b9065 of getRoleIdx("딜", "디")) {
              tbf(comp[_0x1b9065], "궁추가*", 42, "붓이 아주 크니까, 조금만 참아1", 1);
              tbf(comp[_0x1b9065], "평발동*", 25.2, "붓이 아주 크니까, 조금만 참아2", 3);
            }
            tbf(boss, "받뎀증", 15.4, "붓이 아주 크니까, 조금만 참아3", 3);
            break;
          case 3:
            for (let _0x415e91 of getRoleIdx("딜", "디")) {
              tbf(comp[_0x415e91], "궁추가*", 48, "붓이 아주 크니까, 조금만 참아1", 1);
              tbf(comp[_0x415e91], "평발동*", 28.8, "붓이 아주 크니까, 조금만 참아2", 3);
            }
            tbf(boss, "받뎀증", 17.6, "붓이 아주 크니까, 조금만 참아3", 3);
            break;
          case 4:
            for (let _0x54b989 of getRoleIdx("딜", "디")) {
              tbf(comp[_0x54b989], "궁추가*", 54, "붓이 아주 크니까, 조금만 참아1", 1);
              tbf(comp[_0x54b989], "평발동*", 32.4, "붓이 아주 크니까, 조금만 참아2", 3);
            }
            tbf(boss, "받뎀증", 19.8, "붓이 아주 크니까, 조금만 참아3", 3);
            break;
          default:
            for (let _0x15df1b of getRoleIdx("딜", "디")) {
              tbf(comp[_0x15df1b], "궁추가*", 60, "붓이 아주 크니까, 조금만 참아1", 1);
              tbf(comp[_0x15df1b], "평발동*", 36, "붓이 아주 크니까, 조금만 참아2", 3);
            }
            tbf(boss, "받뎀증", 22, "붓이 아주 크니까, 조금만 참아3", 3);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
        _0x23a024.tmpOff();
        _0x23a024.stack = 1;
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
        if (_0x23a024.stack == 1) {
          anbf(_0x23a024, "평", _0x23a024, "<킹크랩 양념 부적>", 0, "귀화부의 대가01", 1, 1, 2);
          anbf(_0x23a024, "방", _0x23a024, "<통증이 사라진다 부적>", 0, "귀화부의 대가02", 1, 1, 2);
          _0x23a024.stack = 0;
        }
        _0x23a024.tmpOn();
      };
      _0x23a024.leader = function () {
        hpUpAll(50);
        if (getElKind() == 2) {
          for (let _0x527120 of getElementIdx("광", "암")) {
            tbf(comp[_0x527120], "공퍼증", 55, "<우사기 히메 대명신의 신도>1", always);
            tbf(comp[_0x527120], "가뎀증", 30, "<우사기 히메 대명신의 신도>2", always);
            tbf(comp[_0x527120], "궁뎀증", 30, "<우사기 히메 대명신의 신도>3", always);
            tbf(comp[_0x527120], "발효증", 30, "<우사기 히메 대명신의 신도>4", always);
            tbf(comp[_0x527120], "궁추가*", 60, "<우사기 히메 대명신의 신도>5", always);
            tbf(comp[_0x527120], "평발동*", 36, "<우사기 히메 대명신의 신도>6", always);
            tbf(comp[_0x527120], "방발동*", 36, "<우사기 히메 대명신의 신도>7", always);
            anbf(comp[_0x527120], "행동", boss, "받뎀증", 0.5, "<우사기 히메 대명신의 신도>8", 1, 40, always);
            for (let _0x12a02e of getElementIdx("광", "암")) {
              anbf(comp[_0x527120], "행동", comp[_0x12a02e], "받속뎀", 0.75, "<우사기 히메 대명신의 신도>9", 1, 40, always);
            }
          }
        }
      };
      _0x23a024.passive = function () {
        tbf(_0x23a024, "평발동*", 100, "귀화부의 대가1", always);
        tbf(_0x23a024, "방발동*", 100, "귀화부의 대가2", always);
        for (let _0x88992 of getElementIdx("광")) {
          buff(_0x23a024, "궁", comp[_0x88992], "받속뎀", 24, "하늘이시여, 땅이시여~11", 1, always, "발동", false);
          buff(_0x23a024, "궁", comp[_0x88992], "제거", "기본", "하늘이시여, 땅이시여~12", 3, always, "발동", false);
          buff(_0x23a024, "궁", comp[_0x88992], "받속뎀", 24, "하늘이시여, 땅이시여~12", 3, always, "발동", false);
        }
        buff(_0x23a024, "궁", all, "궁뎀증", 30, "하늘이시여, 땅이시여~21", 1, 1, always, "발동", false);
        buff(_0x23a024, "궁", all, "발효증", 30, "하늘이시여, 땅이시여~22", 1, 1, always, "발동", false);
        buff(_0x23a024, "궁", all, "아머", _0x23a024.hp * 10, "하늘이시여, 땅이시여~23", 2, always, "발동", false);
        buff(_0x23a024, "궁", all, "받아증", 50, "하늘이시여, 땅이시여~32", 1, 1, always, "발동", false);
        buff(_0x23a024, "궁", _0x23a024, "아머", _0x23a024.hp * 30, "하늘이시여, 땅이시여~42", 3, always, "발동", false);
        for (let _0x33bf59 of comp) {
          if (_0x33bf59.id != _0x23a024.id) {
            atbf(_0x23a024, "궁", _0x33bf59, "<빛의 축복>", 0, "우사기 히메에게 드리는 기도", 1, always);
          }
        }
        for (let _0x32a678 of getRoleIdx("힐", "섶")) {
          anbf(comp[_0x32a678], "<빛의 축복>", comp[_0x32a678], "공퍼증", 12, "우사기 히메에게 드리는 기도1", 1, 6, always);
        }
        for (let _0x1a69d1 of getRoleIdx("딜", "디")) {
          anbf(comp[_0x1a69d1], "<빛의 축복>", comp[_0x1a69d1], "가뎀증", 6, "우사기 히메에게 드리는 기도2", 1, 6, always);
        }
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
        if (_0x23a024.stack == 1) {
          anbf(_0x23a024, "평", _0x23a024, "<정면으로 덤벼라 부적>", 0, "귀화부의 대가03", 1, 1, 2);
          anbf(_0x23a024, "방", _0x23a024, "<느끼면 패배 부적>", 0, "귀화부의 대가04", 1, 1, 2);
          _0x23a024.stack = 0;
        }
        _0x23a024.tmpOn();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        if (GLOBAL_TURN == 1) {
          cdChange(_0x23a024, -3);
        }
      };
      _0x23a024.tmpOn = function () {
        const _0x16274d = _0x23a024.getNest("<킹크랩 양념 부적>");
        const _0x442a73 = _0x23a024.getNest("<통증이 사라진다 부적>");
        const _0x334d38 = _0x23a024.getNest("<정면으로 덤벼라 부적>");
        const _0x4c19b2 = _0x23a024.getNest("<느끼면 패배 부적>");
        if (_0x16274d >= 1) {
          setBuffOnAll(_0x23a024, "발동", "하늘이시여, 땅이시여~11", true);
          setBuffOnAll(_0x23a024, "발동", "하늘이시여, 땅이시여~12", true);
        }
        if (_0x442a73 >= 1) {
          setBuffOnAll(_0x23a024, "발동", "하늘이시여, 땅이시여~21", true);
          setBuffOnAll(_0x23a024, "발동", "하늘이시여, 땅이시여~22", true);
          setBuffOnAll(_0x23a024, "발동", "하늘이시여, 땅이시여~23", true);
        }
        if (_0x334d38 >= 1) {
          setBuffOnAll(_0x23a024, "발동", "하늘이시여, 땅이시여~32", true);
        }
        if (_0x4c19b2 >= 1) {
          setBuffOn(_0x23a024, "발동", "하늘이시여, 땅이시여~42", true);
        }
      };
      _0x23a024.tmpOff = function () {
        nbf(_0x23a024, "<킹크랩 양념 부적>", 0, "귀화부의 대가01", -1, 1);
        nbf(_0x23a024, "<통증이 사라진다 부적>", 0, "귀화부의 대가02", -1, 1);
        nbf(_0x23a024, "<정면으로 덤벼라 부적>", 0, "귀화부의 대가03", -1, 1);
        nbf(_0x23a024, "<느끼면 패배 부적>", 0, "귀화부의 대가04", -1, 1);
        setBuffOnAll(_0x23a024, "발동", "하늘이시여, 땅이시여~11", false);
        setBuffOnAll(_0x23a024, "발동", "하늘이시여, 땅이시여~12", false);
        setBuffOnAll(_0x23a024, "발동", "하늘이시여, 땅이시여~21", false);
        setBuffOnAll(_0x23a024, "발동", "하늘이시여, 땅이시여~22", false);
        setBuffOnAll(_0x23a024, "발동", "하늘이시여, 땅이시여~23", false);
        setBuffOnAll(_0x23a024, "발동", "하늘이시여, 땅이시여~32", false);
        setBuffOn(_0x23a024, "발동", "하늘이시여, 땅이시여~42", false);
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10194:
      setMnc(_0x23a024, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(_0x23a024, "궁뎀증", 36, "시저님과의 유대2", 1);
            break;
          case 2:
            tbf(_0x23a024, "궁뎀증", 42, "시저님과의 유대2", 1);
            break;
          case 3:
            nbf(_0x23a024, "가뎀증", 7, "시저님과의 유대1", 1, 2);
            tbf(_0x23a024, "궁뎀증", 48, "시저님과의 유대2", 1);
            break;
          case 4:
            nbf(_0x23a024, "가뎀증", 14, "시저님과의 유대1", 1, 2);
            tbf(_0x23a024, "궁뎀증", 54, "시저님과의 유대2", 1);
            break;
          default:
            nbf(_0x23a024, "가뎀증", 21, "시저님과의 유대1", 1, 2);
            tbf(_0x23a024, "궁뎀증", 60, "시저님과의 유대2", 1);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024, 5);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(50);
        tbf(all, "공퍼증", 50, "화이트 리본 사이클론-아이카1", always);
        anbf(all, "궁", boss, "받뎀증", 2, "화이트 리본 사이클론-아이카2", 1, 10, always);
        for (let _0xfc53cc of getElementIdx("화")) {
          anbf(all, "궁", comp[_0xfc53cc], "받속뎀", 3.5, "화이트 리본 사이클론-아이카3", 1, 10, always);
        }
        const _0x5e5c02 = getRoleCnt("딜");
        if (_0x5e5c02 >= 2) {
          tbf(_0x23a024, "궁뎀증", 36, "<마음>1", always);
          tbf(_0x23a024, "가뎀증", 30, "<마음>2", always);
          tbf(_0x23a024, "궁추가*", 100, "<마음>3", always);
        }
        if (_0x5e5c02 >= 2) {
          for (let _0x536457 of getRoleIdx("딜", "탱", "디")) {
            tbf(comp[_0x536457], "궁뎀증", 36, "<마음>4", always);
            tbf(comp[_0x536457], "가뎀증", 30, "<마음>5", always);
            tbf(comp[_0x536457], "궁추가*", 100, "<마음>6", always);
          }
        }
      };
      _0x23a024.passive = function () {
        tbf(_0x23a024, "공퍼증", 35, "영원히 당신 곁에1", always);
        tbf(_0x23a024, "궁추가*", 100, "영원히 당신 곁에2", always);
        anbf(all, "궁", boss, "받뎀증", 2, "영원히 당신 곁에4", 1, 10, always);
        const _0x47cd08 = getElementCnt("화");
        if (_0x47cd08 >= 4) {
          for (let _0x25b3ae of comp) {
            pnbf(_0x25b3ae, "궁", _0x25b3ae, "공퍼증", 13, "<웨딩드레스 착용>1", 1, 2, always);
            pnbf(_0x25b3ae, "궁", _0x25b3ae, "가뎀증", 7.5, "<웨딩드레스 착용>2", 1, 2, always);
            pnbf(_0x25b3ae, "궁", _0x25b3ae, "궁뎀증", 10, "<웨딩드레스 착용>3", 1, 2, always);
          }
        }
        if (_0x47cd08 >= 5) {
          for (let _0x4c922a of comp) {
            pnbf(_0x4c922a, "궁", _0x4c922a, "공퍼증", 13, "<웨딩드레스 착용>4", 1, 2, always);
            pnbf(_0x4c922a, "궁", _0x4c922a, "가뎀증", 7.5, "<웨딩드레스 착용>5", 1, 2, always);
            pnbf(_0x4c922a, "궁", _0x4c922a, "궁뎀증", 10, "<웨딩드레스 착용>6", 1, 2, always);
          }
        }
        if (_0x47cd08 >= 4) {
          for (let _0x4fa84b of comp) {
            tbf(_0x4fa84b, "궁추가*", 100, "<부케>1", always);
            for (let _0x366992 of getElementIdx("화")) {
              pnbf(_0x4fa84b, "궁", comp[_0x366992], "받속뎀", 2, "<부케>2", 1, 10, always);
            }
          }
        }
        if (_0x47cd08 >= 5) {
          for (let _0xcc8358 of comp) {
            tbf(_0xcc8358, "궁추가*", 100, "<부케>3", always);
            for (let _0x1ab19c of getElementIdx("화")) {
              pnbf(_0xcc8358, "궁", comp[_0x1ab19c], "받속뎀", 2, "<부케>4", 1, 10, always);
            }
          }
        }
        tbf(_0x23a024, "궁뎀증", 10, "궁극기+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        if (GLOBAL_TURN == 1) {
          for (let _0x1b59b2 of getRoleIdx("딜", "섶", "디")) {
            nbf(comp[_0x1b59b2], "일뎀증", -99, "영원히 당신 곁에3", 1, 1);
          }
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10195:
      setMnc(_0x23a024, [265, 3, 298, 3, 331, 3, 364, 3, 397, 3], _0x17c963);
      _0x23a024.ultbefore = function () {
        deleteBuff(boss, "기본", "칼리버, 길을 열어줘!2");
        for (let _0x45960b of comp) {
          deleteBuff(_0x45960b, "기본", "칼리버, 길을 열어줘!4");
        }
        switch (_0x17c963) {
          case 1:
            tbf(boss, "받뎀증", 15, "칼리버, 길을 열어줘!1", 1);
            tbf(boss, "받뎀증", 15, "칼리버, 길을 열어줘!2", 3);
            for (let _0x2eef8f of getElementIdx("광")) {
              tbf(comp[_0x2eef8f], "받속뎀", 9, "칼리버, 길을 열어줘!3", 1);
              tbf(comp[_0x2eef8f], "받속뎀", 9, "칼리버, 길을 열어줘!4", 3);
            }
            break;
          case 2:
            tbf(boss, "받뎀증", 17.5, "칼리버, 길을 열어줘!1", 1);
            tbf(boss, "받뎀증", 17.5, "칼리버, 길을 열어줘!2", 3);
            for (let _0x4f74d3 of getElementIdx("광")) {
              tbf(comp[_0x4f74d3], "받속뎀", 10.5, "칼리버, 길을 열어줘!3", 1);
              tbf(comp[_0x4f74d3], "받속뎀", 10.5, "칼리버, 길을 열어줘!4", 3);
            }
            break;
          case 3:
            tbf(boss, "받뎀증", 20, "칼리버, 길을 열어줘!1", 1);
            tbf(boss, "받뎀증", 20, "칼리버, 길을 열어줘!2", 3);
            for (let _0x3bf517 of getElementIdx("광")) {
              tbf(comp[_0x3bf517], "받속뎀", 12, "칼리버, 길을 열어줘!3", 1);
              tbf(comp[_0x3bf517], "받속뎀", 12, "칼리버, 길을 열어줘!4", 3);
            }
            break;
          case 4:
            tbf(boss, "받뎀증", 22.5, "칼리버, 길을 열어줘!1", 1);
            tbf(boss, "받뎀증", 22.5, "칼리버, 길을 열어줘!2", 3);
            for (let _0x5ec6e8 of getElementIdx("광")) {
              tbf(comp[_0x5ec6e8], "받속뎀", 13.5, "칼리버, 길을 열어줘!3", 1);
              tbf(comp[_0x5ec6e8], "받속뎀", 13.5, "칼리버, 길을 열어줘!4", 3);
            }
            break;
          default:
            tbf(boss, "받뎀증", 25, "칼리버, 길을 열어줘!1", 1);
            tbf(boss, "받뎀증", 25, "칼리버, 길을 열어줘!2", 3);
            for (let _0x4a1b79 of getElementIdx("광")) {
              tbf(comp[_0x4a1b79], "받속뎀", 15, "칼리버, 길을 열어줘!3", 1);
              tbf(comp[_0x4a1b79], "받속뎀", 15, "칼리버, 길을 열어줘!4", 3);
            }
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024, 2);
      };
      _0x23a024.atkbefore = function () {
        tbf(boss, "받뎀증", 5, "휘날리는 면사포", 3);
      };
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
        comp[4].bless("<빛의 축복>");
      };
      _0x23a024.leader = function () {
        hpUpAll(50);
        tbf(all, "공퍼증", 85, "신부를 꿈꾸며1", always);
        if (getRoleCnt("딜") >= 1) {
          tbf(all, "가뎀증", -500, "신부를 꿈꾸며2", always);
        }
        anbf(all, "공격", boss, "받뎀증", 2.5, "신부를 꿈꾸며3", 1, 40, always);
        for (let _0x148cbf of getElementIdx("광")) {
          anbf(all, "공격", comp[_0x148cbf], "받속뎀", 1.25, "신부를 꿈꾸며4", 1, 40, always);
        }
      };
      _0x23a024.passive = function () {
        anbf(_0x23a024, "평", boss, "받궁뎀", 3, "<용자 킥>1", 1, 9, always);
        anbf(_0x23a024, "평", boss, "받발뎀", 3, "<용자 킥>2", 1, 9, always);
        tbf(_0x23a024, "평발동*", 100, "<용자 킥>3", always);
        if (getRoleCnt("힐") >= 2) {
          _0x23a024.isSealed = true;
        }
        tbf(comp[4], "평발동*", 15, "사랑을 지키는 용자1", always);
        tbf(comp[4], "궁추가*", 50, "사랑을 지키는 용자2", always);
        anbf(comp[4], "<빛의 축복>", comp[4], "가뎀증", 2.3, "신부에게 보내는 축복1", 1, 13, always);
        tbf(_0x23a024, "가뎀증", 7.5, "가하는 데미지+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {
          if (GLOBAL_TURN == 1) {
            tbf(_0x23a024, "궁뎀증", 42.5, "<웨딩드레스를 입는 그날>1", 50);
            tbf(_0x23a024, "발효증", 42.5, "<웨딩드레스를 입는 그날>2", 50);
            tbf(_0x23a024, "평발동*", 40.5, "<웨딩드레스를 입는 그날>3", 50);
            tbf(_0x23a024, "궁추가*", 135, "<웨딩드레스를 입는 그날>4", 50);
            deleteBuff(comp[4], "기본", "사랑을 지키는 용자1");
            deleteBuff(comp[4], "기본", "사랑을 지키는 용자2");
            deleteBuff(comp[4], "발동", "신부에게 보내는 축복1");
            anbf(comp[4], "<빛의 축복>", _0x23a024, "가뎀증", 10, "<웨딩드레스를 입는 그날>5", 1, 13, 50);
          }
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10196:
      _0x23a024.stack = 0;
      buff_ex.push("<동반자의 힘>", "<수련의 행복>");
      setMnc(_0x23a024, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(_0x23a024, "공퍼증", 30, "아령 열단파1", 1);
            for (let _0xb87632 of getRoleIdx("딜", "탱", "디")) {
              tbf(comp[_0xb87632], "궁추가*", 30, "아령 열단파3", 1);
            }
            tbf(boss, "받뎀증", 9, "아령 열단파4", 1);
            break;
          case 2:
            tbf(_0x23a024, "공퍼증", 35, "아령 열단파1", 1);
            for (let _0x12b9ad of getRoleIdx("딜", "탱", "디")) {
              tbf(comp[_0x12b9ad], "궁뎀증", 17.5, "아령 열단파2", 1);
              tbf(comp[_0x12b9ad], "궁추가*", 35, "아령 열단파3", 1);
            }
            tbf(boss, "받뎀증", 10.5, "아령 열단파4", 1);
            break;
          case 3:
            tbf(_0x23a024, "공퍼증", 40, "아령 열단파1", 1);
            for (let _0xe48d5c of getRoleIdx("딜", "탱", "디")) {
              tbf(comp[_0xe48d5c], "궁뎀증", 20, "아령 열단파2", 1);
              tbf(comp[_0xe48d5c], "궁추가*", 40, "아령 열단파3", 1);
            }
            tbf(boss, "받뎀증", 12, "아령 열단파4", 1);
            break;
          case 4:
            tbf(_0x23a024, "공퍼증", 45, "아령 열단파1", 1);
            for (let _0x5c5e60 of getRoleIdx("딜", "탱", "디")) {
              tbf(comp[_0x5c5e60], "궁뎀증", 22.5, "아령 열단파2", 1);
              tbf(comp[_0x5c5e60], "궁추가*", 45, "아령 열단파3", 1);
            }
            tbf(boss, "받뎀증", 13.5, "아령 열단파4", 1);
            break;
          default:
            tbf(_0x23a024, "공퍼증", 50, "아령 열단파1", 1);
            for (let _0x32a1e5 of getRoleIdx("딜", "탱", "디")) {
              tbf(comp[_0x32a1e5], "궁뎀증", 25, "아령 열단파2", 1);
              tbf(comp[_0x32a1e5], "궁추가*", 50, "아령 열단파3", 1);
            }
            tbf(boss, "받뎀증", 15, "아령 열단파4", 1);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
        if (_0x23a024.stack >= 2) {
          _0x23a024.stack = 0;
          nbf(_0x23a024, "<수련의 행복>", 0, "사랑이 곧 힘", -2, 2);
          setBuffOnAll(_0x23a024, "추가", "사랑이 곧 힘1", false);
        }
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
        if (_0x23a024.stack == 1) {
          setBuffOnAll(_0x23a024, "추가", "사랑이 곧 힘1", true);
        }
        _0x23a024.stack += 1;
        atbf(boss, "피격", bossHitTarget, "공퍼증", 25, "<난쟁이 왕의 위압>1", 3, 1);
        atbf(boss, "피격", bossHitTarget, "가뎀증", 10, "<난쟁이 왕의 위압>2", 3, 1);
      };
      _0x23a024.leader = function () {
        hpUpAll(50);
        tbf(all, "공퍼증", 50, "웨딩드레스를 입은 난쟁이 왕의 진심1", always);
        for (let _0x4db7f4 of getElementIdx("풍")) {
          buff(_0x23a024, "평", comp[_0x4db7f4], "받속뎀", 10, "웨딩드레스를 입은 난쟁이 왕의 진심2", 3, always, "발동", false);
        }
        buff(_0x23a024, "공퍼증", 50, "웨딩드레스를 입은 난쟁이 왕의 진심3", always, false);
        buff(_0x23a024, "궁", all, "가뎀증", 20, "웨딩드레스를 입은 난쟁이 왕의 진심4", 1, always, "발동", false);
        for (let _0x189a4e of comp) {
          if (_0x189a4e.id == _0x23a024.id) {
            continue;
          }
          const _0x1675ce = _0x189a4e.attack;
          _0x189a4e.attack = function (..._0x5b19aa) {
            _0x1675ce.apply(this, _0x5b19aa);
            const _0x546777 = _0x23a024.getNest("<동반자의 힘>");
            if (_0x546777 >= 1) {
              setBuffOnAll(_0x23a024, "발동", "웨딩드레스를 입은 난쟁이 왕의 진심2", true);
            }
            if (_0x546777 >= 4) {
              setBuffOn(_0x23a024, "기본", "웨딩드레스를 입은 난쟁이 왕의 진심3", true);
            }
            if (_0x546777 >= 8) {
              setBuffOnAll(_0x23a024, "발동", "웨딩드레스를 입은 난쟁이 왕의 진심4", true);
            }
          };
          const _0x324ee6 = _0x189a4e.ultimate;
          _0x189a4e.ultimate = function (..._0x408f4b) {
            _0x324ee6.apply(this, _0x408f4b);
            const _0x47b1b5 = _0x23a024.getNest("<동반자의 힘>");
            if (_0x47b1b5 >= 1) {
              setBuffOnAll(_0x23a024, "발동", "웨딩드레스를 입은 난쟁이 왕의 진심2", true);
            }
            if (_0x47b1b5 >= 4) {
              setBuffOn(_0x23a024, "기본", "웨딩드레스를 입은 난쟁이 왕의 진심3", true);
            }
            if (_0x47b1b5 >= 8) {
              setBuffOnAll(_0x23a024, "발동", "웨딩드레스를 입은 난쟁이 왕의 진심4", true);
            }
          };
        }
      };
      _0x23a024.passive = function () {
        atbf(_0x23a024, "평", _0x23a024, "공퍼증", 25, "축복의 무게1", 3, always);
        if (getRoleCnt("섶") >= 2) {
          for (let _0x59594f of getRoleIdx("딜", "탱", "디")) {
            tbf(comp[_0x59594f], "발효증", -500, "축복의 무게4", always);
          }
        }
        ptbf(_0x23a024, "궁", all, "공고증", myCurAtk + _0x23a024.id + 30, "<풀파워 부케 아령 투척>1", 1, always);
        ptbf(_0x23a024, "궁", all, "궁뎀증", 10, "<풀파워 부케 아령 투척>2", 1, always);
        for (let _0x13d64a of getElementIdx("풍")) {
          ptbf(_0x23a024, "궁", comp[_0x13d64a], "받속뎀", 30, "<풀파워 부케 아령 투척>3", 1, always);
        }
        tbf(_0x23a024, "궁추가*", 200, "<풀파워 부케 아령 투척>4", always);
        anbf(_0x23a024, "평", _0x23a024, "<수련의 행복>", 0, "사랑이 곧 힘", 1, 2, always);
        for (let _0x4cb3ce of comp) {
          if (_0x4cb3ce.id != _0x23a024.id) {
            buff(_0x23a024, "궁", _0x4cb3ce, "<바람의 축복>", 0, "사랑이 곧 힘1", 1, always, "추가", false);
          }
        }
        for (let _0x2f04a3 of comp) {
          if (_0x2f04a3.id != _0x23a024.id) {
            anbf(_0x2f04a3, "<바람의 축복>", _0x2f04a3, "공퍼증", 15, "사랑이 곧 힘2", 1, 5, always);
            anbf(_0x2f04a3, "<바람의 축복>", _0x2f04a3, "궁뎀증", 5, "사랑이 곧 힘3", 1, 5, always);
          }
        }
        tbf(_0x23a024, "공퍼증", 10, "공격+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {
          if (GLOBAL_TURN == 1) {
            if (getElKind() == 1) {
              for (let _0x22124b of comp) {
                if (_0x22124b.id == _0x23a024.id) {
                  continue;
                }
                tbf(_0x22124b, "공퍼증", 50, "<부케를 받은 자>", 50);
                tbf(_0x22124b, "가뎀증", 50, "<부케를 받은 자>", 50);
                tbf(_0x22124b, "궁뎀증", 50, "<부케를 받은 자>", 50);
                anbf(_0x22124b, "공격", _0x23a024, "<동반자의 힘>", 0, "<부케를 받은 자>", 1, 8, 50);
                tbf(_0x22124b, "궁추가*", 75, "<부케를 받은 자>", 50);
                for (let _0x37faac of comp) {
                  if (_0x37faac.id == _0x22124b.id || _0x37faac.id == _0x23a024.id) {
                    continue;
                  }
                  atbf(_0x22124b, "행동", _0x37faac, "제거", "기본", "<부케를 받은 자>", 1, 1);
                  atbf(_0x22124b, "행동", _0x37faac, "제거", "발동", "<부케를 받은 자>", 1, 1);
                }
              }
            }
          }
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10197:
      setMnc(_0x23a024, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x17c963);
      buff_ex.push("<상부상조>");
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(_0x23a024, "공퍼증", 231, "천-요화유리1", 1);
            nbf(_0x23a024, "궁뎀증", 15, "천-요화유리2", 1, 3);
            boss.def = false;
            break;
          case 2:
            tbf(_0x23a024, "공퍼증", 269.5, "천-요화유리1", 1);
            nbf(_0x23a024, "궁뎀증", 17.5, "천-요화유리2", 1, 3);
            boss.def = false;
            break;
          case 3:
            tbf(_0x23a024, "공퍼증", 308, "천-요화유리1", 1);
            nbf(_0x23a024, "궁뎀증", 20, "천-요화유리2", 1, 3);
            boss.def = false;
            for (let _0x3dcaee of getElementIdx("광")) {
              nbf(comp[_0x3dcaee], "받속뎀", 3, "천-요화유리4", 1, 3);
            }
            break;
          case 4:
            tbf(_0x23a024, "공퍼증", 346.5, "천-요화유리1", 1);
            nbf(_0x23a024, "궁뎀증", 22.5, "천-요화유리2", 1, 3);
            boss.def = false;
            for (let _0x3be05c of getElementIdx("광")) {
              nbf(comp[_0x3be05c], "받속뎀", 6, "천-요화유리4", 1, 3);
            }
            break;
          default:
            tbf(_0x23a024, "공퍼증", 385, "천-요화유리1", 1);
            nbf(_0x23a024, "궁뎀증", 25, "천-요화유리2", 1, 3);
            boss.def = false;
            for (let _0x1828ba of getElementIdx("광")) {
              nbf(comp[_0x1828ba], "받속뎀", 9, "천-요화유리4", 1, 3);
            }
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        const _0x1a0ae2 = boss.def;
        ultLogic(_0x23a024, 5);
        if (_0x1a0ae2) {
          nbf(_0x23a024, "가뎀증", 30, "여우의 환영", 1, 2);
        }
        nbf(_0x23a024, "<상부상조>", 0, "<익자삼우>", -3, 3);
        setBuffOn(_0x23a024, "기본", "세상을 유영하다1", false);
        setBuffOn(_0x23a024, "기본", "세상을 유영하다2", false);
        setBuffOn(_0x23a024, "기본", "세상을 유영하다3", false);
        if (_0x23a024.isLeader) {
          setBuffOnAll(_0x23a024, "기본", "<절대 매혹>3", false);
          setBuffOnAll(_0x23a024, "기본", "<절대 매혹>4", false);
          setBuffOnAll(_0x23a024, "기본", "<절대 매혹>5", false);
          for (let _0x3c2ec2 of getRoleIdx("딜", "탱", "디")) {
            if (comp[_0x3c2ec2].id != _0x23a024.id) {
              const _0x4cd28d = comp[_0x3c2ec2].getNest("<상부상조>");
              setBuffOn(comp[_0x3c2ec2], "기본", "<절대 매혹>3", _0x4cd28d >= 1);
              setBuffOn(comp[_0x3c2ec2], "기본", "<절대 매혹>4", _0x4cd28d >= 2);
              setBuffOn(comp[_0x3c2ec2], "기본", "<절대 매혹>5", _0x4cd28d >= 3);
            }
          }
        }
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
        if (_0x23a024.isLeader) {
          for (let _0x5d561d of getRoleIdx("딜", "탱", "디")) {
            if (comp[_0x5d561d].id != _0x23a024.id) {
              const _0x192469 = comp[_0x5d561d].getNest("<상부상조>");
              setBuffOn(comp[_0x5d561d], "기본", "<절대 매혹>3", _0x192469 >= 1);
              setBuffOn(comp[_0x5d561d], "기본", "<절대 매혹>4", _0x192469 >= 2);
              setBuffOn(comp[_0x5d561d], "기본", "<절대 매혹>5", _0x192469 >= 3);
            }
          }
        }
      };
      _0x23a024.leader = function () {
        hpUpAll(50);
        tbf(all, "공퍼증", 50, "경국경성-얀코1", always);
        for (let _0x537aab of getRoleIdx("딜", "탱", "디")) {
          if (comp[_0x537aab].id != _0x23a024.id) {
            const _0x35db5a = comp[_0x537aab].ultimate;
            comp[_0x537aab].ultimate = function (..._0x105874) {
              _0x35db5a.apply(this, _0x105874);
              nbf(comp[_0x537aab], "<상부상조>", 0, "<익자삼우>", -3, 3);
              setBuffOn(comp[_0x537aab], "기본", "<절대 매혹>3", false);
              setBuffOn(comp[_0x537aab], "기본", "<절대 매혹>4", false);
              setBuffOn(comp[_0x537aab], "기본", "<절대 매혹>5", false);
            };
          }
        }
        const _0x375a6d = comp[3].ultimate;
        comp[3].ultimate = function (..._0xa5bb57) {
          _0x375a6d.apply(this, _0xa5bb57);
          for (let _0x462938 of comp) {
            atbf(_0x462938, "궁", boss, "방어", 0, "<호란신미>", 1, 1);
          }
        };
        if (getElKind() == 1) {
          for (let _0x2ae4a0 of getRoleIdx("딜", "탱", "디")) {
            if (comp[_0x2ae4a0].id != _0x23a024.id) {
              anbf(_0x23a024, "행동", comp[_0x2ae4a0], "<상부상조>", 0, "<익자삼우>", 1, 3, always);
            }
          }
        }
        pnbf(_0x23a024, "궁", boss, "받뎀증", 2, "<절대 매혹>1", 1, 15, always);
        for (let _0x11d9ee of getElementIdx("광")) {
          pnbf(_0x23a024, "궁", comp[_0x11d9ee], "받속뎀", 3, "<절대 매혹>2", 1, 15, always);
        }
        buff(_0x23a024, "궁뎀증", 45, "<절대 매혹>3", always, false);
        buff(_0x23a024, "가뎀증", 55, "<절대 매혹>4", always, false);
        buff(_0x23a024, "궁추가*", 100, "<절대 매혹>5", always, false);
        for (let _0x5b959d of getRoleIdx("딜", "탱", "디")) {
          pnbf(comp[_0x5b959d], "궁", boss, "받뎀증", 2, "<절대 매혹>1", 1, 15, always);
          for (let _0x58cce9 of getElementIdx("광")) {
            pnbf(comp[_0x5b959d], "궁", comp[_0x58cce9], "받속뎀", 3, "<절대 매혹>2", 1, 15, always);
          }
          buff(comp[_0x5b959d], "궁뎀증", 45, "<절대 매혹>3", always, false);
          buff(comp[_0x5b959d], "가뎀증", 55, "<절대 매혹>4", always, false);
          buff(comp[_0x5b959d], "궁추가*", 100, "<절대 매혹>5", always, false);
        }
      };
      _0x23a024.passive = function () {
        tbf(_0x23a024, "궁추가*", 100, "꽃속의 그림자1", always);
        for (let _0x223d29 of comp) {
          if (_0x223d29.id != _0x23a024.id) {
            anbf(_0x223d29, "궁", boss, "받뎀증", 3.33, "꽃속의 그림자2", 1, 12, always);
            for (let _0x5b7788 of getElementIdx("광")) {
              anbf(_0x223d29, "궁", comp[_0x5b7788], "받속뎀", 2.75, "꽃속의 그림자3", 1, 12, always);
            }
          }
        }
        for (let _0x13b4a3 of getRoleIdx("딜", "탱", "디")) {
          if (comp[_0x13b4a3].id != _0x23a024.id) {
            anbf(comp[_0x13b4a3], "평", _0x23a024, "<상부상조>", 0, "<익자삼우>", 1, 3, always);
            const _0x339f72 = comp[_0x13b4a3].attack;
            comp[_0x13b4a3].attack = function (..._0x2adf5a) {
              _0x339f72.apply(this, _0x2adf5a);
              const _0x252e75 = _0x23a024.getNest("<상부상조>");
              setBuffOn(_0x23a024, "기본", "세상을 유영하다1", _0x252e75 >= 1);
              setBuffOn(_0x23a024, "기본", "세상을 유영하다2", _0x252e75 >= 2);
              setBuffOn(_0x23a024, "기본", "세상을 유영하다3", _0x252e75 >= 3);
              if (_0x23a024.isLeader) {
                setBuffOnAll(_0x23a024, "기본", "<절대 매혹>3", _0x252e75 >= 1);
                setBuffOnAll(_0x23a024, "기본", "<절대 매혹>4", _0x252e75 >= 2);
                setBuffOnAll(_0x23a024, "기본", "<절대 매혹>5", _0x252e75 >= 3);
              }
            };
          }
        }
        buff(_0x23a024, "궁뎀증", 25, "세상을 유영하다1", always, false);
        buff(_0x23a024, "가뎀증", 60, "세상을 유영하다2", always, false);
        buff(_0x23a024, "궁추가*", 100, "세상을 유영하다3", always, false);
        anbf(_0x23a024, "방", _0x23a024, "<상부상조>", 0, "<익자삼우>", 1, 3, always);
        if (!_0x23a024.isLeader) {
          const _0x21aaaf = comp[2].ultimate;
          comp[2].ultimate = function (..._0x3ccc10) {
            _0x21aaaf.apply(this, _0x3ccc10);
            for (let _0x15d975 of comp) {
              atbf(_0x15d975, "궁", boss, "방어", 0, "<호란신미>", 1, 1);
            }
          };
        }
        tbf(_0x23a024, "궁뎀증", 10, "궁극기+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
        const _0x265bca = _0x23a024.getNest("<상부상조>");
        setBuffOn(_0x23a024, "기본", "세상을 유영하다1", _0x265bca >= 1);
        setBuffOn(_0x23a024, "기본", "세상을 유영하다2", _0x265bca >= 2);
        setBuffOn(_0x23a024, "기본", "세상을 유영하다3", _0x265bca >= 3);
        if (_0x23a024.isLeader) {
          setBuffOnAll(_0x23a024, "기본", "<절대 매혹>3", _0x265bca >= 1);
          setBuffOnAll(_0x23a024, "기본", "<절대 매혹>4", _0x265bca >= 2);
          setBuffOnAll(_0x23a024, "기본", "<절대 매혹>5", _0x265bca >= 3);
          for (let _0x3aae46 of getRoleIdx("딜", "탱", "디")) {
            if (comp[_0x3aae46].id != _0x23a024.id) {
              const _0x2f64ff = comp[_0x3aae46].getNest("<상부상조>");
              setBuffOn(comp[_0x3aae46], "기본", "<절대 매혹>3", _0x2f64ff >= 1);
              setBuffOn(comp[_0x3aae46], "기본", "<절대 매혹>4", _0x2f64ff >= 2);
              setBuffOn(comp[_0x3aae46], "기본", "<절대 매혹>5", _0x2f64ff >= 3);
            }
          }
        }
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10198:
      buff_ex.push("<붉은 장미>");
      _0x23a024.stack = 0;
      setMnc(_0x23a024, [0, 1, 0, 1, 0, 1, 0, 1, 0, 1], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            nbf(_0x23a024, "공퍼증", 90, "구음진경(위)-해방1", 1, 1);
            nbf(_0x23a024, "일뎀증", 30, "구음진경(위)-해방2", 1, 1);
            break;
          case 2:
            nbf(_0x23a024, "공퍼증", 105, "구음진경(위)-해방1", 1, 1);
            nbf(_0x23a024, "일뎀증", 35, "구음진경(위)-해방2", 1, 1);
            break;
          case 3:
            nbf(_0x23a024, "공퍼증", 120, "구음진경(위)-해방1", 1, 1);
            nbf(_0x23a024, "일뎀증", 40, "구음진경(위)-해방2", 1, 1);
            nbf(_0x23a024, "가뎀증", 20, "구음진경(위)-해방3", 1, 1);
            break;
          case 4:
            nbf(_0x23a024, "공퍼증", 135, "구음진경(위)-해방1", 1, 1);
            nbf(_0x23a024, "일뎀증", 45, "구음진경(위)-해방2", 1, 1);
            nbf(_0x23a024, "가뎀증", 22.5, "구음진경(위)-해방3", 1, 1);
            break;
          default:
            nbf(_0x23a024, "공퍼증", 150, "구음진경(위)-해방1", 1, 1);
            nbf(_0x23a024, "일뎀증", 50, "구음진경(위)-해방2", 1, 1);
            nbf(_0x23a024, "가뎀증", 25, "구음진경(위)-해방3", 1, 1);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
        deleteBuff(_0x23a024, "발동", "<질풍 세계>1");
        deleteBuff(_0x23a024, "발동", "<질풍 세계>2");
        _0x23a024.stopCd = true;
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        if (_0x23a024.stack == 12) {
          setBuffOn(_0x23a024, "추가", "핏빛 꿰뚫기술1", true);
          setBuffOn(_0x23a024, "추가", "핏빛 꿰뚫기술2", true);
        }
        atkLogic(_0x23a024, 2);
        if (_0x23a024.stack == 12) {
          _0x23a024.stack = 0;
          setBuffOn(_0x23a024, "추가", "핏빛 꿰뚫기술1", false);
          setBuffOn(_0x23a024, "추가", "핏빛 꿰뚫기술2", false);
          setBuffOnAll(_0x23a024, "기본", "핏빛 꿰뚫기술3", false);
          setBuffOnAll(_0x23a024, "추가", "핏빛 꿰뚫기술4", false);
          setBuffOn(_0x23a024, "추가", "<장미의 잔영>", false);
        }
      };
      _0x23a024.leader = function () {
        hpUpAll(50);
        tbf(all, "공퍼증", 50, "장미의 그림자1", always);
        if (getRoleCnt("딜") >= 5) {
          tbf(_0x23a024, "가뎀증", 60, "<꽃잎의 춤>1", always);
          tbf(_0x23a024, "일뎀증", 60, "<꽃잎의 춤>2", always);
          tbf(_0x23a024, "평추가*", 30, "<꽃잎의 춤>3", always);
        }
        if (getRoleCnt("딜") >= 5) {
          for (let _0x277e82 of comp) {
            if (_0x277e82.id != _0x23a024.id) {
              atbf(_0x277e82, "공격", _0x23a024, "공고증", myCurAtk + _0x277e82.id + 12.5, "<장미의 잔영>1", 1, always);
              anbf(_0x277e82, "공격", _0x23a024, "<붉은 장미>", 0, "<장미의 잔영>", 2, 12, always);
              const _0x54aa8e = _0x277e82.ultimate;
              _0x277e82.ultimate = function (..._0x17d25a) {
                _0x54aa8e.apply(this, _0x17d25a);
                _0x23a024.stack += 2;
                if (_0x23a024.stack > 12) {
                  _0x23a024.stack = 12;
                }
              };
              const _0x543651 = _0x277e82.attack;
              _0x277e82.attack = function (..._0x156e93) {
                _0x543651.apply(this, _0x156e93);
                _0x23a024.stack += 2;
                if (_0x23a024.stack > 12) {
                  _0x23a024.stack = 12;
                }
              };
            }
          }
        }
      };
      _0x23a024.passive = function () {
        for (let _0x41ea16 of comp) {
          if (_0x41ea16.id != _0x23a024.id) {
            anbf(_0x41ea16, "공격", _0x23a024, "<붉은 장미>", 0, "<장미의 잔영>", 1, 12, always);
            const _0xe623ec = _0x41ea16.ultimate;
            _0x41ea16.ultimate = function (..._0x2c213e) {
              const _0x2dafa5 = _0x23a024.stack;
              _0xe623ec.apply(this, _0x2c213e);
              _0x23a024.stack++;
              if (_0x23a024.stack > 12) {
                _0x23a024.stack = 12;
              }
              if (_0x2dafa5 < 4 && _0x23a024.stack >= 4) {
                setBuffOn(_0x23a024, "기본", "핏빛 꿰뚫기술1", true);
              }
              if (_0x2dafa5 < 8 && _0x23a024.stack >= 8) {
                setBuffOn(_0x23a024, "기본", "핏빛 꿰뚫기술2", true);
              }
              if (_0x2dafa5 < 12 && _0x23a024.stack >= 12) {
                setBuffOnAll(_0x23a024, "기본", "핏빛 꿰뚫기술3", true);
              }
              if (_0x2dafa5 < 12 && _0x23a024.stack >= 12) {
                setBuffOnAll(_0x23a024, "추가", "핏빛 꿰뚫기술4", true);
              }
              if (_0x2dafa5 < 12 && _0x23a024.stack >= 12) {
                setBuffOn(_0x23a024, "추가", "<장미의 잔영>", true);
              }
            };
            const _0x17c0de = _0x41ea16.attack;
            _0x41ea16.attack = function (..._0x34fa2b) {
              const _0x2d63f3 = _0x23a024.stack;
              _0x17c0de.apply(this, _0x34fa2b);
              _0x23a024.stack++;
              if (_0x23a024.stack > 12) {
                _0x23a024.stack = 12;
              }
              if (_0x2d63f3 < 4 && _0x23a024.stack >= 4) {
                setBuffOn(_0x23a024, "기본", "핏빛 꿰뚫기술1", true);
              }
              if (_0x2d63f3 < 8 && _0x23a024.stack >= 8) {
                setBuffOn(_0x23a024, "기본", "핏빛 꿰뚫기술2", true);
              }
              if (_0x2d63f3 < 12 && _0x23a024.stack >= 12) {
                setBuffOnAll(_0x23a024, "기본", "핏빛 꿰뚫기술3", true);
              }
              if (_0x2d63f3 < 12 && _0x23a024.stack >= 12) {
                setBuffOnAll(_0x23a024, "추가", "핏빛 꿰뚫기술4", true);
              }
              if (_0x2d63f3 < 12 && _0x23a024.stack >= 12) {
                setBuffOn(_0x23a024, "추가", "<장미의 잔영>", true);
              }
            };
          }
        }
        buff(_0x23a024, "일뎀증", 85, "핏빛 꿰뚫기술1", always, false);
        buff(_0x23a024, "가뎀증", 30, "핏빛 꿰뚫기술2", always, false);
        buff(_0x23a024, "평추가*", 30, "핏빛 꿰뚫기술3", always, false);
        buff(_0x23a024, "평추가*", 30, "핏빛 꿰뚫기술3", always, false);
        buff(_0x23a024, "평추가*", 30, "핏빛 꿰뚫기술3", always, false);
        buff(_0x23a024, "평추가*", 30, "핏빛 꿰뚫기술3", always, false);
        for (let _0x70b689 of getElementIdx("암")) {
          buff(_0x23a024, "평", comp[_0x70b689], "받속뎀", 37.5, "핏빛 꿰뚫기술4", 1, 1, always, "추가", false);
        }
        buff(_0x23a024, "평", _0x23a024, "<붉은 장미>", 0, "<장미의 잔영>", -12, 12, always, "추가", false);
        buff(_0x23a024, "평", _0x23a024, "off", "기본", "핏빛 꿰뚫기술1", 1, always, "추가", false);
        buff(_0x23a024, "평", _0x23a024, "off", "기본", "핏빛 꿰뚫기술2", 1, always, "추가", false);
        anbf(_0x23a024, "방", _0x23a024, "<붉은 장미>", 0, "<장미의 잔영>", 4, 12, always);
        atbf(_0x23a024, "궁", _0x23a024, "공퍼증", 110, "<질풍 세계>1", 50, always);
        atbf(_0x23a024, "궁", _0x23a024, "방뎀증", 110, "<질풍 세계>2", 50, always);
        tbf(_0x23a024, "일뎀증", 10, "일반 공격 데미지+", always);
      };
      _0x23a024.defense = function () {
        const _0x1a2ae1 = _0x23a024.stack;
        _0x23a024.act_defense();
        _0x23a024.stack += 4;
        if (_0x23a024.stack > 12) {
          _0x23a024.stack = 12;
        }
        if (_0x1a2ae1 < 4 && _0x23a024.stack >= 4) {
          setBuffOn(_0x23a024, "기본", "핏빛 꿰뚫기술1", true);
        }
        if (_0x1a2ae1 < 8 && _0x23a024.stack >= 8) {
          setBuffOn(_0x23a024, "기본", "핏빛 꿰뚫기술2", true);
        }
        if (_0x1a2ae1 < 12 && _0x23a024.stack >= 12) {
          setBuffOnAll(_0x23a024, "기본", "핏빛 꿰뚫기술3", true);
        }
        if (_0x1a2ae1 < 12 && _0x23a024.stack >= 12) {
          setBuffOnAll(_0x23a024, "추가", "핏빛 꿰뚫기술4", true);
        }
        if (_0x1a2ae1 < 12 && _0x23a024.stack >= 12) {
          setBuffOn(_0x23a024, "추가", "<장미의 잔영>", true);
        }
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {
          if (GLOBAL_TURN == 1) {
            if (getRoleCnt("딜") >= 5) {
              nbf(boss, "받뎀증", 15, "<꽃잎의 춤>4", 1, 1);
              for (let _0x581d67 of comp) {
                nbf(_0x581d67, "받속뎀", 20, "<꽃잎의 춤>5", 1, 1);
                cdChange(_0x581d67, -4);
              }
            }
          }
        }
        if (GLOBAL_TURN == 1) {
          cdChange(_0x23a024, -1);
          const _0x4d1153 = getRoleCnt("딜", "디", "탱") - 1;
          for (let _0x4c3c8d = 0; _0x4c3c8d < _0x4d1153; _0x4c3c8d++) {
            nbf(_0x23a024, "가뎀증", 15, "암살자 길드의 엘리트1", 1, 2);
            nbf(boss, "받뎀증", 12.5, "암살자 길드의 엘리트2", 1, 2);
          }
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10199:
      setMnc(_0x23a024, [0, 3, 0, 3, 0, 3, 0, 3, 0, 3], _0x17c963);
      _0x23a024.stack = 0;
      buff_ex.push("<카드 한 장 세트>");
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            for (let _0x2b3c52 of getElementIdx("수")) {
              tbf(comp[_0x2b3c52], "공퍼증", 28.5, "섹스 신의 선고1", 1);
              tbf(comp[_0x2b3c52], "가뎀증", 17.1, "섹스 신의 선고2", 1);
            }
            tbf(boss, "받뎀증", 11.4, "섹스 신의 선고3", 1);
            for (let _0x20178b of getElementIdx("수")) {
              tbf(comp[_0x20178b], "받속뎀", 17.1, "섹스 신의 선고4", 1);
            }
            break;
          case 2:
            for (let _0x16df0e of getElementIdx("수")) {
              tbf(comp[_0x16df0e], "공퍼증", 33.25, "섹스 신의 선고1", 1);
              tbf(comp[_0x16df0e], "가뎀증", 19.95, "섹스 신의 선고2", 1);
            }
            tbf(boss, "받뎀증", 13.3, "섹스 신의 선고3", 1);
            for (let _0x38a32e of getElementIdx("수")) {
              tbf(comp[_0x38a32e], "받속뎀", 19.95, "섹스 신의 선고4", 1);
            }
            break;
          case 3:
            for (let _0x35d97d of getElementIdx("수")) {
              tbf(comp[_0x35d97d], "공퍼증", 38, "섹스 신의 선고1", 1);
              tbf(comp[_0x35d97d], "가뎀증", 22.8, "섹스 신의 선고2", 1);
            }
            tbf(boss, "받뎀증", 15.2, "섹스 신의 선고3", 1);
            for (let _0x2e1877 of getElementIdx("수")) {
              tbf(comp[_0x2e1877], "받속뎀", 22.8, "섹스 신의 선고4", 1);
            }
            break;
          case 4:
            for (let _0x2a7c77 of getElementIdx("수")) {
              tbf(comp[_0x2a7c77], "공퍼증", 42.75, "섹스 신의 선고1", 1);
              tbf(comp[_0x2a7c77], "가뎀증", 25.65, "섹스 신의 선고2", 1);
            }
            tbf(boss, "받뎀증", 17.1, "섹스 신의 선고3", 1);
            for (let _0x31808e of getElementIdx("수")) {
              tbf(comp[_0x31808e], "받속뎀", 25.65, "섹스 신의 선고4", 1);
            }
            break;
          default:
            for (let _0x4ffe21 of getElementIdx("수")) {
              tbf(comp[_0x4ffe21], "공퍼증", 47.5, "섹스 신의 선고1", 1);
              tbf(comp[_0x4ffe21], "가뎀증", 28.5, "섹스 신의 선고2", 1);
            }
            tbf(boss, "받뎀증", 19, "섹스 신의 선고3", 1);
            for (let _0x5a4e0a of getElementIdx("수")) {
              tbf(comp[_0x5a4e0a], "받속뎀", 28.5, "섹스 신의 선고4", 1);
            }
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
        _0x23a024.stack = 0;
        setBuffOnAll(_0x23a024, "발동", "<리버스 카드 오픈>1", false);
        setBuffOnAll(_0x23a024, "발동", "<리버스 카드 오픈>2", false);
      };
      _0x23a024.atkbefore = function () {
        for (let _0xe9ac05 of getElementIdx("수")) {
          tbf(comp[_0xe9ac05], "공고증", myCurAtk + _0x23a024.id + 30, "드로우!", 1);
        }
      };
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
        _0x23a024.stack++;
        if (_0x23a024.stack > 2) {
          _0x23a024.stack = 2;
        }
        setBuffOnAll(_0x23a024, "발동", "<리버스 카드 오픈>1", _0x23a024.stack >= 1);
        setBuffOnAll(_0x23a024, "발동", "<리버스 카드 오픈>2", _0x23a024.stack >= 2);
      };
      _0x23a024.leader = function () {
        hpUpAll(50);
        tbf(all, "공퍼증", 65, "섹스 신관의 특훈1", always);
        if (getElementCnt("수") >= 4) {
          tbf(all, "가뎀증", -500, "섹스 신관의 특훈2", always);
        }
      };
      _0x23a024.passive = function () {
        for (let _0xe5e902 of getElementIdx("수")) {
          atbf(_0x23a024, "궁", comp[_0xe5e902], "공고증", myCurAtk + _0x23a024.id + 30, "전술마법 「야외 자위」", 1, always);
        }
        anbf(_0x23a024, "평", _0x23a024, "<카드 한 장 세트>", 0, "섹스 듀얼리스트의 마음", 1, 2, always);
        for (let _0x2371aa of getElementIdx("수")) {
          buff(_0x23a024, "궁", comp[_0x2371aa], "궁뎀증", 12, "<리버스 카드 오픈>1", 1, always, "발동", false);
          buff(_0x23a024, "궁", comp[_0x2371aa], "발효증", 24, "<리버스 카드 오픈>1", 1, always, "발동", false);
          buff(_0x23a024, "궁", comp[_0x2371aa], "궁뎀증", 12, "<리버스 카드 오픈>2", 1, always, "발동", false);
          buff(_0x23a024, "궁", comp[_0x2371aa], "발효증", 24, "<리버스 카드 오픈>2", 1, always, "발동", false);
        }
        anbf(_0x23a024, "궁", _0x23a024, "<카드 한 장 세트>", 0, "섹스 듀얼리스트의 마음", -2, 2, always);
        tbf(_0x23a024, "공퍼증", 10, "공격+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {
          if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 3 == 0) {
            for (let _0x12ec4f of getElementIdx("수")) {
              tbf(comp[_0x12ec4f], "가뎀증", 38.5, "<하늘에서 내려온 복음>1", 1);
              tbf(comp[_0x12ec4f], "궁뎀증", 32, "<하늘에서 내려온 복음>2", 1);
              tbf(comp[_0x12ec4f], "발효증", 64, "<하늘에서 내려온 복음>3", 1);
            }
            for (let _0x12d8a2 of getRoleIdx("딜", "탱", "디")) {
              if (comp[_0x12d8a2].element == 1) {
                tbf(comp[_0x12d8a2], "궁추가*", 48, "<하늘에서 내려온 복음>4", 1);
                tbf(comp[_0x12d8a2], "궁발동*", 24, "<하늘에서 내려온 복음>5", 1);
              }
            }
            tbf(boss, "받뎀증", 25.5, "<하늘에서 내려온 복음>6", 1);
            for (let _0x2e3da7 of getElementIdx("수")) {
              tbf(comp[_0x2e3da7], "받속뎀", 38.5, "<하늘에서 내려온 복음>7", 1);
            }
          }
        }
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 3 == 0) {
          for (let _0x533647 of getRoleIdx("딜", "탱", "디")) {
            if (comp[_0x533647].element == 1) {
              tbf(comp[_0x533647], "궁추가*", 35.6, "<섹스의 힘>1", 1);
              tbf(comp[_0x533647], "궁발동*", 17.8, "<섹스의 힘>2", 1);
            }
          }
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10200:
      setMnc(_0x23a024, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            nbf(boss, "받뎀증", 19.8, "섹스 천사의 절대 의식1", 1, 2);
            nbf(boss, "받일뎀", 16.5, "섹스 천사의 절대 의식2", 1, 2);
            break;
          case 2:
            nbf(boss, "받뎀증", 23.1, "섹스 천사의 절대 의식1", 1, 2);
            nbf(boss, "받일뎀", 19.25, "섹스 천사의 절대 의식2", 1, 2);
            for (let _0x446327 of getElementIdx("풍")) {
              nbf(comp[_0x446327], "받속뎀", 9.9, "섹스 천사의 절대 의식3", 1, 2);
            }
            break;
          case 3:
            nbf(boss, "받뎀증", 26.4, "섹스 천사의 절대 의식1", 1, 2);
            nbf(boss, "받일뎀", 22, "섹스 천사의 절대 의식2", 1, 2);
            for (let _0x4a435a of getElementIdx("풍")) {
              nbf(comp[_0x4a435a], "받속뎀", 12.1, "섹스 천사의 절대 의식3", 1, 2);
            }
            break;
          case 4:
            nbf(boss, "받뎀증", 29.7, "섹스 천사의 절대 의식1", 1, 2);
            nbf(boss, "받일뎀", 24.75, "섹스 천사의 절대 의식2", 1, 2);
            for (let _0x2cc7ce of getElementIdx("풍")) {
              nbf(comp[_0x2cc7ce], "받속뎀", 14.3, "섹스 천사의 절대 의식3", 1, 2);
            }
            break;
          default:
            nbf(boss, "받뎀증", 33, "섹스 천사의 절대 의식1", 1, 2);
            nbf(boss, "받일뎀", 27.5, "섹스 천사의 절대 의식2", 1, 2);
            for (let _0x1f58e9 of getElementIdx("풍")) {
              nbf(comp[_0x1f58e9], "받속뎀", 16.5, "섹스 천사의 절대 의식3", 1, 2);
            }
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {
        tbf(boss, "받일뎀", 27.5, "섹스 쇼크 웨이브", 1);
      };
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(50);
        tbf(all, "공퍼증", 50, "강욕의 선고자", always);
        if (getElKind() == 1) {
          tbf(all, "가뎀증", 22.5, "<선고>1", always);
          tbf(all, "평추가*", 37.5, "<선고>2", always);
          for (let _0x55b0c9 of comp) {
            atbf(_0x55b0c9, "공격", all, "공고증", myCurAtk + _0x55b0c9.id + 3, "<선고>3", 1, always);
          }
          anbf(_0x23a024, "궁", boss, "받뎀증", 7.5, "강욕의 선고자1", 1, 2, always);
          anbf(_0x23a024, "궁", boss, "받일뎀", 28, "강욕의 선고자2", 1, 2, always);
          for (let _0x553d72 of getElementIdx("풍")) {
            anbf(_0x23a024, "궁", comp[_0x553d72], "받속뎀", 11.25, "강욕의 선고자3", 1, 2, always);
          }
        }
      };
      _0x23a024.passive = function () {
        tbf(_0x23a024, "공퍼증", 220, "천공의 성역", always);
        tbf(_0x23a024, "평추가*", 155, "소환! 섹스 천사", always);
        tbf(_0x23a024, "가뎀증", 33, "섹스의 가호1", always);
        atbf(_0x23a024, "방", all, "일뎀증", 27.5, "섹스의 가호2", 1, always);
        tbf(_0x23a024, "일뎀증", 10, "일반 공격+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        if (GLOBAL_TURN == 1) {
          cdChange(_0x23a024, -4);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10201:
      _0x23a024.stack = 0;
      buff_ex.push("<자애르기 파>", "<나쁜 아이 발견♡>");
      setMnc(_0x23a024, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            for (let _0x3cd526 of getElementIdx("화")) {
              tbf(comp[_0x3cd526], "공퍼증", 31.7, "자애로운 토끼 빔~1", 2);
              tbf(comp[_0x3cd526], "가뎀증", 19.1, "자애로운 토끼 빔~2", 2);
            }
            for (let _0xaf5e0b of getRoleIdx("딜", "탱", "디")) {
              if (comp[_0xaf5e0b].element == 0) {
                if (comp[_0xaf5e0b].id != _0x23a024.id) {
                  atbf(comp[_0xaf5e0b], "궁", comp[_0xaf5e0b], "평추가*", 58.7, "자애로운 토끼 빔~3", 2, 1);
                }
              }
            }
            tbf(_0x23a024, "평추가*", 154.2, "자애로운 토끼 빔~4", 2);
            break;
          case 2:
            for (let _0x5691c5 of getElementIdx("화")) {
              tbf(comp[_0x5691c5], "공퍼증", 37.1, "자애로운 토끼 빔~1", 2);
              tbf(comp[_0x5691c5], "가뎀증", 22.3, "자애로운 토끼 빔~2", 2);
            }
            for (let _0x49ac1a of getRoleIdx("딜", "탱", "디")) {
              if (comp[_0x49ac1a].element == 0) {
                if (comp[_0x49ac1a].id != _0x23a024.id) {
                  atbf(comp[_0x49ac1a], "궁", comp[_0x49ac1a], "평추가*", 68.5, "자애로운 토끼 빔~3", 2, 1);
                }
              }
            }
            tbf(_0x23a024, "평추가*", 179.9, "자애로운 토끼 빔~4", 2);
            break;
          case 3:
            for (let _0x126dfc of getElementIdx("화")) {
              tbf(comp[_0x126dfc], "공퍼증", 42.4, "자애로운 토끼 빔~1", 2);
              tbf(comp[_0x126dfc], "가뎀증", 25.4, "자애로운 토끼 빔~2", 2);
            }
            for (let _0x385bf8 of getRoleIdx("딜", "탱", "디")) {
              if (comp[_0x385bf8].element == 0) {
                if (comp[_0x385bf8].id != _0x23a024.id) {
                  atbf(comp[_0x385bf8], "궁", comp[_0x385bf8], "평추가*", 78.4, "자애로운 토끼 빔~3", 2, 1);
                }
              }
            }
            tbf(_0x23a024, "평추가*", 205.6, "자애로운 토끼 빔~4", 2);
            break;
          case 4:
            for (let _0x287cbc of getElementIdx("화")) {
              tbf(comp[_0x287cbc], "공퍼증", 47.7, "자애로운 토끼 빔~1", 2);
              tbf(comp[_0x287cbc], "가뎀증", 28.6, "자애로운 토끼 빔~2", 2);
            }
            for (let _0x1e30a8 of getRoleIdx("딜", "탱", "디")) {
              if (comp[_0x1e30a8].element == 0) {
                if (comp[_0x1e30a8].id != _0x23a024.id) {
                  atbf(comp[_0x1e30a8], "궁", comp[_0x1e30a8], "평추가*", 88.2, "자애로운 토끼 빔~3", 2, 1);
                }
              }
            }
            tbf(_0x23a024, "평추가*", 231.3, "자애로운 토끼 빔~4", 2);
            break;
          default:
            for (let _0x4370af of getElementIdx("화")) {
              tbf(comp[_0x4370af], "공퍼증", 53, "자애로운 토끼 빔~1", 2);
              tbf(comp[_0x4370af], "가뎀증", 31.8, "자애로운 토끼 빔~2", 2);
            }
            for (let _0x390b2e of getRoleIdx("딜", "탱", "디")) {
              if (comp[_0x390b2e].element == 0) {
                if (comp[_0x390b2e].id != _0x23a024.id) {
                  atbf(comp[_0x390b2e], "궁", comp[_0x390b2e], "평추가*", 98, "자애로운 토끼 빔~3", 2, 1);
                }
              }
            }
            tbf(_0x23a024, "평추가*", 257, "자애로운 토끼 빔~4", 2);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
        const _0x370622 = _0x23a024.getNest("<자애르기 파>");
        for (let _0x59a4a7 of getRoleIdx("딜", "탱", "디")) {
          if (comp[_0x59a4a7].element == 0) {
            for (let _0x31bc93 = 0; _0x31bc93 < _0x370622; _0x31bc93++) {
              tbf(comp[_0x59a4a7], "일뎀증", 10, "<가득한 모성애>1", 2);
              tbf(comp[_0x59a4a7], "방뎀증", 15, "<가득한 모성애>2", 2);
              tbf(comp[_0x59a4a7], "평추가*", 19.6, "<가득한 모성애>3", 2);
            }
          }
        }
        nbf(_0x23a024, "<자애르기 파>", 0, "사랑과 정의의 마법소녀(?)", -3, 3);
        _0x23a024.stack = 1;
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
        _0x23a024.stack = 0;
      };
      _0x23a024.leader = function () {
        hpUpAll(50);
        const _0x243cd3 = getRoKind();
        if (_0x243cd3 == 4) {
          for (let _0x2aef11 of getRoleIdx("섶", "힐")) {
            tbf(comp[_0x2aef11], "공퍼증", 50, "<포근한 힐링>1", always);
            atbf(comp[_0x2aef11], "평", boss, "받일뎀", 9, "<포근한 힐링>2", 4, always);
            for (let _0x155b69 of getElementIdx("화")) {
              atbf(comp[_0x2aef11], "평", comp[_0x155b69], "받속뎀", 3.5, "<포근한 힐링>3", 4, always);
            }
            for (let _0x1c6d9d of getRoleIdx("딜", "탱", "디")) {
              atbf(comp[_0x2aef11], "궁", comp[_0x1c6d9d], "공고증", myCurAtk + comp[_0x2aef11].id + 15, "<포근한 힐링>4", 2, always);
            }
          }
        }
        if (_0x243cd3 == 4) {
          for (let _0x1c59e2 of getRoleIdx("딜", "탱", "디")) {
            atbf(comp[_0x1c59e2], "궁", comp[_0x1c59e2], "공퍼증", 125, "<사랑의 대폭발~♡>1", 2, always);
            atbf(comp[_0x1c59e2], "궁", comp[_0x1c59e2], "가뎀증", 21, "<사랑의 대폭발~♡>2", 2, always);
            atbf(comp[_0x1c59e2], "궁", comp[_0x1c59e2], "평추가*", 106, "<사랑의 대폭발~♡>3", 2, always);
          }
        }
      };
      _0x23a024.passive = function () {
        atbf(_0x23a024, "공격", boss, "받일뎀", 16.5, "관중을 위한 서비스♡", 4, always);
        anbf(_0x23a024, "평", _0x23a024, "<자애르기 파>", 0, "사랑과 정의의 마법소녀(?)", 1, 3, always);
        anbf(_0x23a024, "궁", _0x23a024, "<나쁜 아이 발견♡>", 0, "말 안듣는 나쁜 아이들아~ 어디에 있니~", 1, 1, always);
        anbf(_0x23a024, "행동", _0x23a024, "<나쁜 아이 발견♡>", 0, "말 안듣는 나쁜 아이들아~ 어디에 있니~", -1, 1, always);
        tbf(_0x23a024, "공퍼증", 10, "공격+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
        _0x23a024.stack = 0;
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        if (_0x23a024.stack == 1) {
          tbf(boss, "받뎀증", 21.3, "<정의의 징벌♡>1", 1);
          for (let _0x5bf725 of getElementIdx("화")) {
            tbf(comp[_0x5bf725], "받속뎀", 31.8, "<정의의 징벌♡>2", 1);
          }
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10202:
      _0x23a024.stack = 0;
      setMnc(_0x23a024, [165, 4, 188, 4, 211, 4, 234, 4, 257, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(_0x23a024, "공퍼증", 138, "정의의 사악 광선1", 1);
            tbf(all, "가뎀증", 20.7, "정의의 사악 광선2", 1);
            for (let _0x2c2ca9 of getElementIdx("암")) {
              tbf(comp[_0x2c2ca9], "받속뎀", 20.7, "정의의 사악 광선4", 1);
            }
            break;
          case 2:
            tbf(_0x23a024, "공퍼증", 161, "정의의 사악 광선1", 1);
            tbf(all, "가뎀증", 24.15, "정의의 사악 광선2", 1);
            tbf(boss, "받뎀증", 16.1, "정의의 사악 광선3", 1);
            for (let _0x45bae4 of getElementIdx("암")) {
              tbf(comp[_0x45bae4], "받속뎀", 24.15, "정의의 사악 광선4", 1);
            }
            break;
          case 3:
            tbf(_0x23a024, "공퍼증", 184, "정의의 사악 광선1", 1);
            tbf(all, "가뎀증", 27.6, "정의의 사악 광선2", 1);
            tbf(boss, "받뎀증", 18.4, "정의의 사악 광선3", 1);
            for (let _0x2673f1 of getElementIdx("암")) {
              tbf(comp[_0x2673f1], "받속뎀", 27.6, "정의의 사악 광선4", 1);
            }
            break;
          case 4:
            tbf(_0x23a024, "공퍼증", 207, "정의의 사악 광선1", 1);
            tbf(all, "가뎀증", 31.05, "정의의 사악 광선2", 1);
            tbf(boss, "받뎀증", 20.7, "정의의 사악 광선3", 1);
            for (let _0x5f378f of getElementIdx("암")) {
              tbf(comp[_0x5f378f], "받속뎀", 31.05, "정의의 사악 광선4", 1);
            }
            break;
          default:
            tbf(_0x23a024, "공퍼증", 230, "정의의 사악 광선1", 1);
            tbf(all, "가뎀증", 34.5, "정의의 사악 광선2", 1);
            tbf(boss, "받뎀증", 23, "정의의 사악 광선3", 1);
            for (let _0x23a2af of getElementIdx("암")) {
              tbf(comp[_0x23a2af], "받속뎀", 34.5, "정의의 사악 광선4", 1);
            }
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
        if (_0x23a024.stack == 1) {
          cdChange(_0x23a024, -3);
        }
        _0x23a024.stack = 0;
      };
      _0x23a024.atkbefore = function () {
        tbf(_0x23a024, "공퍼증", 100, "아그이 분쇄 타격", 1);
      };
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(50);
        tbf(all, "공퍼증", 63.5, "악의 왕의 명령1", always);
        anbf(all, "궁", all, "가뎀증", 2.54, "<마법소녀를 위한 함정>1", 1, 15, always);
        anbf(all, "궁", all, "궁뎀증", 2.12, "<마법소녀를 위한 함정>2", 1, 15, always);
        anbf(all, "궁", all, "발효증", 2.12, "<마법소녀를 위한 함정>3", 1, 15, always);
        anbf(all, "궁", boss, "받뎀증", 1.69, "<마법소녀를 위한 함정>4", 1, 15, always);
        for (let _0x852512 of getElementIdx("암")) {
          anbf(all, "궁", comp[_0x852512], "받속뎀", 2.54, "<마법소녀를 위한 함정>5", 1, 15, always);
        }
        if (getRoleCnt("힐") >= 1) {
          tbf(all, "가뎀증", -500, "악의 왕의 명령3", always);
        }
      };
      _0x23a024.passive = function () {
        tbf(_0x23a024, "공발동*", 50, "평범한 아르바이트생1", always);
        atbf(_0x23a024, "방", all, "제거", "기본", "평범한 아르바이트생2", 3, always);
        atbf(_0x23a024, "방", all, "아머", _0x23a024.hp * 10, "평범한 아르바이트생2", 3, always);
        tbf(all, "궁뎀증", 28.75, "평범한 아르바이트생3", always);
        tbf(all, "발효증", 28.75, "평범한 아르바이트생4", always);
        tbf(all, "받아증", 50, "평범한 아르바이트생5", always);
        tbf(_0x23a024, "궁발동*", 100, "<돈이 곧 힘>3", always);
        atbf(_0x23a024, "궁", _0x23a024, "아머", _0x23a024.hp * 30, "<돈이 곧 힘>4", 1, always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {
          if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 4 == 0) {
            for (let _0x54aec7 of getRoleIdx("딜", "탱", "디")) {
              if (comp[_0x54aec7].element == 4) {
                tbf(comp[_0x54aec7], "궁추가*", 63.5, "<악의 발톱 소환>1", 2);
                tbf(comp[_0x54aec7], "궁발동*", 19, "<악의 발톱 소환>2", 2);
              }
            }
          }
        }
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 4 == 0) {
          cdChange(_0x23a024, -1);
          _0x23a024.stack = 1;
          for (let _0x35ec30 of getRoleIdx("딜", "탱", "디")) {
            if (comp[_0x35ec30].element == 4) {
              tbf(comp[_0x35ec30], "궁추가*", 57.5, "<마법봉의 응답>1", 2);
              tbf(comp[_0x35ec30], "궁발동*", 17.2, "<마법봉의 응답>2", 2);
            }
          }
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10203:
      setMnc(_0x23a024, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            nbf(_0x23a024, "공퍼증", 98.4, "웨딩드레스 병기 X 시리즈1", 1, 2);
            nbf(boss, "받뎀증", 9.84, "웨딩드레스 병기 X 시리즈2", 1, 2);
            break;
          case 2:
            nbf(_0x23a024, "공퍼증", 114.8, "웨딩드레스 병기 X 시리즈1", 1, 2);
            nbf(boss, "받뎀증", 11.48, "웨딩드레스 병기 X 시리즈2", 1, 2);
            break;
          case 3:
            nbf(_0x23a024, "공퍼증", 131.2, "웨딩드레스 병기 X 시리즈1", 1, 2);
            nbf(boss, "받뎀증", 13.12, "웨딩드레스 병기 X 시리즈2", 1, 2);
            for (let _0x7176c1 of getElementIdx("화")) {
              nbf(comp[_0x7176c1], "받속뎀", 14.76, "웨딩드레스 병기 X 시리즈3", 1, 2);
            }
            break;
          case 4:
            nbf(_0x23a024, "공퍼증", 147.6, "웨딩드레스 병기 X 시리즈1", 1, 2);
            nbf(boss, "받뎀증", 14.76, "웨딩드레스 병기 X 시리즈2", 1, 2);
            for (let _0x37d66d of getElementIdx("화")) {
              nbf(comp[_0x37d66d], "받속뎀", 19.68, "웨딩드레스 병기 X 시리즈3", 1, 2);
            }
            break;
          default:
            nbf(_0x23a024, "공퍼증", 164, "웨딩드레스 병기 X 시리즈1", 1, 2);
            nbf(boss, "받뎀증", 16.4, "웨딩드레스 병기 X 시리즈2", 1, 2);
            for (let _0x417c1f of getElementIdx("화")) {
              nbf(comp[_0x417c1f], "받속뎀", 24.6, "웨딩드레스 병기 X 시리즈3", 1, 2);
            }
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024, 5);
        _0x23a024.bless("<불의 축복>");
      };
      _0x23a024.atkbefore = function () {
        nbf(_0x23a024, "발효증", 6, "데이터 조사", 1, 4);
      };
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(55);
        tbf(all, "공퍼증", 40.5, "용궁의 주인1", always);
        const _0x292e6e = getElKind();
        if (_0x292e6e == 4 || _0x292e6e == 5) {
          tbf(_0x23a024, "가뎀증", 48.6, "<관리자 권한>1", always);
          tbf(_0x23a024, "궁뎀증", 16.2, "<관리자 권한>2", always);
          tbf(_0x23a024, "발효증", 32.4, "<관리자 권한>3", always);
          tbf(_0x23a024, "궁추가*", 32.4, "<관리자 권한>4", always);
          tbf(_0x23a024, "공발동*", 14.6, "<관리자 권한>5", always);
          anbf(_0x23a024, "궁", boss, "받뎀증", 8.1, "<관리자 권한>6", 1, 2, always);
          for (let _0x17f076 of getElementIdx("화")) {
            tbf(comp[_0x17f076], "받속뎀", 97.2, "<관리자 권한>7", 50);
          }
        }
      };
      _0x23a024.passive = function () {
        tbf(_0x23a024, "가뎀증", 98.4, "마도 기술의 작은 한 걸음1", always);
        tbf(_0x23a024, "궁뎀증", 19.68, "마도 기술의 작은 한 걸음2", always);
        if (getRoleCnt("딜") >= 2) {
          _0x23a024.isSealed = true;
        }
        tbf(_0x23a024, "궁추가*", 65.6, "신형 전투복 실전 테스트1", always);
        tbf(_0x23a024, "평발동*", 100, "신형 전투복 실전 테스트2", always);
        tbf(_0x23a024, "공발동*", 17.7, "신형 전투복 실전 테스트3", always);
        for (let _0x19a623 of comp) {
          if (_0x23a024.id != _0x19a623.id) {
            ptbf(_0x23a024, "궁", _0x19a623, "<불의 축복>", 0, "궁극의 용궁 방어 시스템1", 1, always);
          }
        }
        tbf(_0x23a024, "궁발동*", 23.6, "궁극의 용궁 방어 시스템2", always);
        anbf(_0x23a024, "<불의 축복>", _0x23a024, "궁뎀증", 3.28, "궁극의 용궁 방어 시스템3", 1, 10, always);
        anbf(_0x23a024, "<불의 축복>", _0x23a024, "발효증", 6.56, "궁극의 용궁 방어 시스템4", 1, 10, always);
        atbf(_0x23a024, "<불의 축복>", _0x23a024, "공발동*", 23.6, "궁극의 용궁 방어 시스템5", 1, always);
        tbf(_0x23a024, "발효증", 10, "트리거+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10204:
      buff_ex.push("<방한 계획>");
      setMnc(_0x23a024, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            for (let _0x45c364 of getRoleIdx("딜", "탱", "디")) {
              nbf(comp[_0x45c364], "가뎀증", 7.94, "난로 화력 개발1", 1, 2);
              tbf(comp[_0x45c364], "가뎀증", 10.58, "난로 화력 개발2", 1);
            }
            nbf(boss, "받뎀증", 8.82, "난로 화력 개발3", 1, 2);
            for (let _0x1dc723 of getElementIdx("화")) {
              tbf(comp[_0x1dc723], "받속뎀", 26.46, "난로 화력 개발4", 1);
            }
            tbf(all, "공고증", myCurAtk + _0x23a024.id + 30, "난로 화력 개발5", 1);
            break;
          case 2:
            for (let _0x4e807d of getRoleIdx("딜", "탱", "디")) {
              nbf(comp[_0x4e807d], "가뎀증", 9.26, "난로 화력 개발1", 1, 2);
              tbf(comp[_0x4e807d], "가뎀증", 12.34, "난로 화력 개발2", 1);
            }
            nbf(boss, "받뎀증", 10.29, "난로 화력 개발3", 1, 2);
            for (let _0x4e5a81 of getElementIdx("화")) {
              tbf(comp[_0x4e5a81], "받속뎀", 30.87, "난로 화력 개발4", 1);
            }
            tbf(all, "공고증", myCurAtk + _0x23a024.id + 30, "난로 화력 개발5", 1);
            break;
          case 3:
            for (let _0x39454b of getRoleIdx("딜", "탱", "디")) {
              nbf(comp[_0x39454b], "가뎀증", 10.58, "난로 화력 개발1", 1, 2);
              tbf(comp[_0x39454b], "가뎀증", 14.1, "난로 화력 개발2", 1);
            }
            nbf(boss, "받뎀증", 11.76, "난로 화력 개발3", 1, 2);
            for (let _0x49600a of getElementIdx("화")) {
              tbf(comp[_0x49600a], "받속뎀", 35.28, "난로 화력 개발4", 1);
            }
            tbf(all, "공고증", myCurAtk + _0x23a024.id + 30, "난로 화력 개발5", 1);
            break;
          case 4:
            for (let _0x2594f0 of getRoleIdx("딜", "탱", "디")) {
              nbf(comp[_0x2594f0], "가뎀증", 11.9, "난로 화력 개발1", 1, 2);
              tbf(comp[_0x2594f0], "가뎀증", 15.87, "난로 화력 개발2", 1);
            }
            nbf(boss, "받뎀증", 13.23, "난로 화력 개발3", 1, 2);
            for (let _0x336d57 of getElementIdx("화")) {
              tbf(comp[_0x336d57], "받속뎀", 39.69, "난로 화력 개발4", 1);
            }
            tbf(all, "공고증", myCurAtk + _0x23a024.id + 30, "난로 화력 개발5", 1);
            break;
          default:
            for (let _0x390a55 of getRoleIdx("딜", "탱", "디")) {
              nbf(comp[_0x390a55], "가뎀증", 13.23, "난로 화력 개발1", 1, 2);
              tbf(comp[_0x390a55], "가뎀증", 17.64, "난로 화력 개발2", 1);
            }
            nbf(boss, "받뎀증", 14.7, "난로 화력 개발3", 1, 2);
            for (let _0x51f7e8 of getElementIdx("화")) {
              tbf(comp[_0x51f7e8], "받속뎀", 44.1, "난로 화력 개발4", 1);
            }
            tbf(all, "공고증", myCurAtk + _0x23a024.id + 30, "난로 화력 개발5", 1);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
        _0x23a024.bless("<불의 축복>");
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {
        tbf(all, "공고증", myCurAtk + _0x23a024.id + 30, "일단은 뜨끈한 것부터 먹자~", 1);
      };
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(55);
        tbf(all, "공퍼증", 63.5, "천재의 방한 계획1", always);
        if (getRoKind() == 5) {
          tbf(all, "가뎀증", 38.4, "<덜덜>1", always);
          tbf(all, "발효증", 51.2, "<덜덜>2", always);
          tbf(all, "공발동*", 23.1, "<덜덜>3", always);
          for (let _0x2fea56 of comp) {
            anbf(_0x2fea56, "평", _0x2fea56, "<방한 계획>", 0, "<덜덜>", 1, 3, always);
            const _0xfd54d8 = _0x2fea56.attack;
            _0x2fea56.attack = function (..._0xe1a6a8) {
              const _0x5ae349 = _0x2fea56.getNest("<방한 계획>");
              if (_0x5ae349 == 0) {
                setBuffOnAll(_0x2fea56, "기본", "<방한의 힘>11", true);
                setBuffOnAll(_0x2fea56, "기본", "<방한의 힘>12", true);
              } else if (_0x5ae349 == 1) {
                setBuffOnAll(_0x2fea56, "기본", "<방한의 힘>21", true);
                setBuffOnAll(_0x2fea56, "기본", "<방한의 힘>22", true);
              } else if (_0x5ae349 == 2) {
                setBuffOnAll(_0x2fea56, "기본", "<방한의 힘>31", true);
                setBuffOnAll(_0x2fea56, "기본", "<방한의 힘>32", true);
              }
              _0xfd54d8.apply(this, _0xe1a6a8);
            };
          }
          anbf(all, "궁", boss, "받뎀증", 2.56, "<덜덜>5", 1, 10, always);
          for (let _0x121bf1 of getElementIdx("화")) {
            anbf(all, "궁", comp[_0x121bf1], "받속뎀", 3.84, "<덜덜>6", 1, 10, always);
          }
          for (let _0x1ebb8b of comp) {
            anbf(_0x1ebb8b, "궁", _0x1ebb8b, "<방한 계획>", 0, "<덜덜>", -3, 3, always);
            atbf(_0x1ebb8b, "궁", _0x1ebb8b, "off", "기본", "<방한의 힘>11", 1, always);
            atbf(_0x1ebb8b, "궁", _0x1ebb8b, "off", "기본", "<방한의 힘>12", 1, always);
            atbf(_0x1ebb8b, "궁", _0x1ebb8b, "off", "기본", "<방한의 힘>21", 1, always);
            atbf(_0x1ebb8b, "궁", _0x1ebb8b, "off", "기본", "<방한의 힘>22", 1, always);
            atbf(_0x1ebb8b, "궁", _0x1ebb8b, "off", "기본", "<방한의 힘>31", 1, always);
            atbf(_0x1ebb8b, "궁", _0x1ebb8b, "off", "기본", "<방한의 힘>32", 1, always);
          }
        }
        buff(all, "궁뎀증", 8.53, "<방한의 힘>11", always, false);
        buff(all, "궁추가*", 17, "<방한의 힘>12", always, false);
        buff(all, "궁뎀증", 8.53, "<방한의 힘>21", always, false);
        buff(all, "궁추가*", 17, "<방한의 힘>22", always, false);
        buff(all, "궁뎀증", 8.53, "<방한의 힘>31", always, false);
        buff(all, "궁추가*", 17, "<방한의 힘>32", always, false);
      };
      _0x23a024.passive = function () {
        if (getRoleCnt("탱") >= 1) {
          atbf(_0x23a024, "궁", all, "궁뎀증", 29.4, "눈, 눈... 더 많은 눈!1", 1, always);
        }
        if (getRoleCnt("디") >= 1) {
          anbf(_0x23a024, "궁", all, "발효증", 29.4, "눈, 눈... 더 많은 눈!2", 1, 2, always);
        }
        if (getRoleCnt("딜") >= 2) {
          _0x23a024.isSealed = true;
        }
        _0x23a024.canCDChange = false;
        for (let _0xbe7e60 of getRoleIdx("딜", "탱", "디")) {
          tbf(comp[_0xbe7e60], "궁추가*", 58.8, "짙푸른 빙점2", always);
          tbf(comp[_0xbe7e60], "공발동*", 26.5, "짙푸른 빙점3", always);
        }
        tbf(_0x23a024, "공퍼증", 44.1, "방한 대책1", always);
        for (let _0x565cb4 of comp) {
          if (_0x23a024.id != _0x565cb4.id) {
            ptbf(_0x23a024, "궁", _0x565cb4, "<불의 축복>", 0, "방한 대책2", 1, always);
          }
        }
        for (let _0x349600 of getRoleIdx("힐", "섶")) {
          anbf(comp[_0x349600], "<불의 축복>", comp[_0x349600], "공퍼증", 7.35, "방한 대책3", 1, 10, always);
        }
        tbf(_0x23a024, "공퍼증", 10, "공격+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10205:
      buff_ex.push("<사진 소재>");
      setMnc(_0x23a024, [0, 3, 0, 3, 0, 4, 0, 4, 0, 5], _0x17c963);
      _0x23a024.ultbefore = function () {
        for (let _0x54f67f of comp) {
          deleteBuff(_0x54f67f, "기본", "완벽한 셀카 각도1");
          deleteBuff(_0x54f67f, "기본", "완벽한 셀카 각도3");
        }
        switch (_0x17c963) {
          case 1:
            tbf(all, "가뎀증", 12.24, "완벽한 셀카 각도1", 3);
            nbf(all, "<사진 소재>", 0, "완벽한 셀카 각도", 3, 5);
            for (let _0x382706 of getRoleIdx("딜", "탱", "디")) {
              tbf(comp[_0x382706], "평추가*", 40.8, "완벽한 셀카 각도3", 3);
            }
            break;
          case 2:
            tbf(all, "가뎀증", 14.28, "완벽한 셀카 각도1", 3);
            nbf(all, "<사진 소재>", 0, "완벽한 셀카 각도", 3, 5);
            for (let _0x1b51ce of getRoleIdx("딜", "탱", "디")) {
              tbf(comp[_0x1b51ce], "평추가*", 47.6, "완벽한 셀카 각도3", 3);
            }
            break;
          case 3:
            tbf(all, "가뎀증", 16.32, "완벽한 셀카 각도1", 4);
            nbf(all, "<사진 소재>", 0, "완벽한 셀카 각도", 4, 5);
            for (let _0x527d56 of getRoleIdx("딜", "탱", "디")) {
              tbf(comp[_0x527d56], "평추가*", 54.4, "완벽한 셀카 각도3", 4);
            }
            break;
          case 4:
            tbf(all, "가뎀증", 18.36, "완벽한 셀카 각도1", 4);
            nbf(all, "<사진 소재>", 0, "완벽한 셀카 각도", 4, 5);
            for (let _0xd5fe9f of getRoleIdx("딜", "탱", "디")) {
              tbf(comp[_0xd5fe9f], "평추가*", 61.2, "완벽한 셀카 각도3", 4);
            }
            break;
          default:
            tbf(all, "가뎀증", 20.4, "완벽한 셀카 각도1", 5);
            nbf(all, "<사진 소재>", 0, "완벽한 셀카 각도", 5, 5);
            for (let _0x294f41 of getRoleIdx("딜", "탱", "디")) {
              tbf(comp[_0x294f41], "평추가*", 68, "완벽한 셀카 각도3", 5);
            }
            break;
        }
        for (let _0x312432 of comp) {
          setBuffOn(_0x312432, "기본", "아이돌도 낚시할 수 있는데1", true);
          setBuffOn(_0x312432, "기본", "아이돌도 낚시할 수 있는데2", true);
          setBuffOn(_0x312432, "발동", "페어 스케이팅1", true);
          setBuffOnAll(_0x312432, "발동", "페어 스케이팅2", true);
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(55);
        if (getElKind() == 1) {
          tbf(all, "공퍼증", 63.5, "〈VIP 교환권〉1", always);
          tbf(all, "가뎀증", 19.05, "〈VIP 교환권〉2", always);
          tbf(all, "일뎀증", 95.25, "〈VIP 교환권〉3", always);
          tbf(all, "평추가*", 63.5, "〈VIP 교환권〉4", always);
        }
        if (getElKind() == 1) {
          tbf(_0x23a024, "가뎀증", 19.05, "<바캉스 한정♡시크릿포토>1", always);
          anbf(boss, "피격", boss, "받뎀증", 0.63, "<바캉스 한정♡시크릿포토>2", 1, 40, always);
          for (let _0x5e86b4 of getElementIdx("수")) {
            anbf(boss, "피격", comp[_0x5e86b4], "받속뎀", 0.95, "<바캉스 한정♡시크릿포토>2", 1, 40, always);
          }
        }
      };
      _0x23a024.passive = function () {
        tbf(_0x23a024, "공퍼증", 68, "데이트 방해하지 마1", always);
        tbf(_0x23a024, "가뎀증", 20.4, "데이트 방해하지 마2", always);
        for (let _0x55045f of comp) {
          anbf(_0x55045f, "평", _0x55045f, "<사진 소재>", 0, "완벽한 셀카 각도", -1, 5, always);
        }
        buff(all, "공퍼증", 40.8, "아이돌도 낚시할 수 있는데1", always, false);
        buff(all, "일뎀증", 102, "아이돌도 낚시할 수 있는데2", always, false);
        buff(all, "평", boss, "받뎀증", 0.68, "페어 스케이팅1", 1, 40, always, "발동", false);
        for (let _0x2b6fc1 of getElementIdx("수")) {
          buff(all, "평", comp[_0x2b6fc1], "받속뎀", 1.02, "페어 스케이팅2", 1, 40, always, "발동", false);
        }
        for (let _0x3a6135 of comp) {
          const _0x362e56 = _0x3a6135.attack;
          _0x3a6135.attack = function (..._0x5390fc) {
            const _0x5c6a65 = _0x3a6135.getNest("<사진 소재>");
            _0x362e56.apply(this, _0x5390fc);
            if (_0x5c6a65 <= 1) {
              setBuffOn(_0x3a6135, "기본", "아이돌도 낚시할 수 있는데1", false);
              setBuffOn(_0x3a6135, "기본", "아이돌도 낚시할 수 있는데2", false);
              setBuffOn(_0x3a6135, "발동", "페어 스케이팅1", false);
              setBuffOnAll(_0x3a6135, "발동", "페어 스케이팅2", false);
            }
          };
        }
        tbf(_0x23a024, "가뎀증", 7.5, "데미지+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        if (GLOBAL_TURN == 1) {
          cdChange(_0x23a024, -5);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10206:
      setMnc(_0x23a024, [365, 4, 425.8, 4, 486.6, 4, 547.4, 4, 608, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(all, "공고증", myCurAtk + _0x23a024.id + 20, "리고라 빔!1", 1);
            for (let _0x4611ae of getElementIdx("풍")) {
              tbf(comp[_0x4611ae], "가뎀증", 17, "리고라 빔!2", 1);
            }
            for (let _0x3ec0d4 of getRoleIdx("딜", "디")) {
              if (comp[_0x3ec0d4].element != 2) {
                continue;
              }
              tbf(comp[_0x3ec0d4], "궁추가*", 56.6, "리고라 빔!3", 1);
            }
            break;
          case 2:
            tbf(all, "공고증", myCurAtk + _0x23a024.id + 20, "리고라 빔!1", 1);
            for (let _0x3e5780 of getElementIdx("풍")) {
              tbf(comp[_0x3e5780], "가뎀증", 19.8, "리고라 빔!2", 1);
            }
            for (let _0x4d54ce of getRoleIdx("딜", "디")) {
              if (comp[_0x4d54ce].element != 2) {
                continue;
              }
              tbf(comp[_0x4d54ce], "궁추가*", 66, "리고라 빔!3", 1);
            }
            break;
          case 3:
            tbf(all, "공고증", myCurAtk + _0x23a024.id + 20, "리고라 빔!1", 1);
            for (let _0x41d527 of getElementIdx("풍")) {
              tbf(comp[_0x41d527], "가뎀증", 22.6, "리고라 빔!2", 1);
            }
            for (let _0x439972 of getRoleIdx("딜", "디")) {
              if (comp[_0x439972].element != 2) {
                continue;
              }
              tbf(comp[_0x439972], "궁추가*", 75.4, "리고라 빔!3", 1);
            }
            for (let _0x3cf8e1 of getElementIdx("풍")) {
              tbf(comp[_0x3cf8e1], "받속뎀", 22.6, "리고라 빔!4", 1);
            }
            break;
          case 4:
            tbf(all, "공고증", myCurAtk + _0x23a024.id + 20, "리고라 빔!1", 1);
            for (let _0x1d67e7 of getElementIdx("풍")) {
              tbf(comp[_0x1d67e7], "가뎀증", 25.5, "리고라 빔!2", 1);
            }
            for (let _0x38d8b4 of getRoleIdx("딜", "디")) {
              if (comp[_0x38d8b4].element != 2) {
                continue;
              }
              tbf(comp[_0x38d8b4], "궁추가*", 84.9, "리고라 빔!3", 1);
            }
            for (let _0x20cf57 of getElementIdx("풍")) {
              tbf(comp[_0x20cf57], "받속뎀", 25.5, "리고라 빔!4", 1);
            }
            break;
          default:
            tbf(all, "공고증", myCurAtk + _0x23a024.id + 20, "리고라 빔!1", 1);
            for (let _0x4287c9 of getElementIdx("풍")) {
              tbf(comp[_0x4287c9], "가뎀증", 28.3, "리고라 빔!2", 1);
            }
            for (let _0x329d42 of getRoleIdx("딜", "디")) {
              if (comp[_0x329d42].element != 2) {
                continue;
              }
              tbf(comp[_0x329d42], "궁추가*", 94.3, "리고라 빔!3", 1);
            }
            for (let _0x2489b9 of getElementIdx("풍")) {
              tbf(comp[_0x2489b9], "받속뎀", 28.3, "리고라 빔!4", 1);
            }
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024, 2);
        _0x23a024.bless("<바람의 축복>");
        if (_0x23a024.isLeader) {
          deleteBuff(_0x23a024, "발동", "<따뜻한 자아>5");
          deleteBuff(_0x23a024, "발동", "<따뜻한 자아>6");
        }
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(55);
        tbf(all, "공퍼증", 51.5, "평화를 사랑하는 괴수1", always);
      };
      _0x23a024.passive = function () {
        atbf(_0x23a024, "방", all, "아머", _0x23a024.hp * 10, "리고라 배고파2", 1, always);
        ptbf(_0x23a024, "궁", boss, "받뎀증", 18.8, "마지막 괴수의 축복1", 1, always);
        for (let _0x2bccb1 of comp) {
          if (_0x2bccb1.id != _0x23a024.id) {
            ptbf(_0x23a024, "궁", _0x2bccb1, "<바람의 축복>", 0, "마지막 괴수의 축복2", 1, always);
          }
        }
        for (let _0x4eab09 of comp) {
          anbf(_0x4eab09, "<바람의 축복>", _0x4eab09, "공퍼증", 9.45, "마지막 괴수의 축복3", 1, 5, always);
          anbf(_0x4eab09, "<바람의 축복>", _0x4eab09, "궁뎀증", 9.45, "마지막 괴수의 축복4", 1, 5, always);
        }
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
        if (_0x23a024.isLeader) {
          deleteBuff(_0x23a024, "발동", "<따뜻한 자아>5");
          deleteBuff(_0x23a024, "발동", "<따뜻한 자아>6");
        }
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {
          if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 4 == 0) {
            if (getElKind() == 2) {
              nbf(all, "가뎀증", 7.75, "<따뜻한 자아>1", 1, 4);
              nbf(all, "궁뎀증", 12.9, "<따뜻한 자아>2", 1, 4);
              tbf(all, "궁추가*", 51.5, "<따뜻한 자아>4", 4);
              for (let _0x3c51d4 of comp) {
                atbf(_0x3c51d4, "궁", _0x3c51d4, "제거", "기본", "<따뜻한 자아>4", 1, always);
              }
              for (let _0x4683a1 of getElementIdx("풍")) {
                anbf(_0x23a024, "궁", comp[_0x4683a1], "받속뎀", 7.75, "<따뜻한 자아>5", 1, 4, always);
                anbf(_0x23a024, "방", comp[_0x4683a1], "받속뎀", 7.75, "<따뜻한 자아>5", 1, 4, always);
              }
              anbf(_0x23a024, "궁", boss, "받뎀증", 5.15, "<따뜻한 자아>6", 1, 4, always);
              anbf(_0x23a024, "방", boss, "받뎀증", 5.15, "<따뜻한 자아>6", 1, 4, always);
            }
          }
          if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 4 == 0) {
            if (getRoleCnt("딜") >= 2) {
              nbf(all, "가뎀증", 7.75, "<따뜻한 자아>1", 1, 4);
              nbf(all, "궁뎀증", 12.9, "<따뜻한 자아>2", 1, 4);
              tbf(all, "궁추가*", 51.5, "<따뜻한 자아>4", 4);
              for (let _0x19b705 of comp) {
                atbf(_0x19b705, "궁", _0x19b705, "제거", "기본", "<따뜻한 자아>4", 1, always);
              }
              for (let _0x56258c of getElementIdx("풍")) {
                anbf(_0x23a024, "궁", comp[_0x56258c], "받속뎀", 7.75, "<따뜻한 자아>5", 1, 4, always);
                anbf(_0x23a024, "방", comp[_0x56258c], "받속뎀", 7.75, "<따뜻한 자아>5", 1, 4, always);
              }
              anbf(_0x23a024, "궁", boss, "받뎀증", 5.15, "<따뜻한 자아>6", 1, 4, always);
              anbf(_0x23a024, "방", boss, "받뎀증", 5.15, "<따뜻한 자아>6", 1, 4, always);
            }
          }
        }
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 4 == 0) {
          atbf(_0x23a024, "방", all, "받아증", 50, "<리고라는 모두를 지킬 거야!>5", 4, 4);
          atbf(_0x23a024, "방", _0x23a024, "제거", "발동", "<리고라는 모두를 지킬 거야!>5", 1, 4);
          atbf(_0x23a024, "방", _0x23a024, "아머", _0x23a024.hp * 30, "<리고라는 모두를 지킬 거야!>6", 4, 4);
          atbf(_0x23a024, "방", _0x23a024, "제거", "발동", "<리고라는 모두를 지킬 거야!>6", 1, 4);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10207:
      buff_ex.push("<피어나는 샛별>");
      setMnc(_0x23a024, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(all, "궁뎀증", 22.5, "심쿵♡에너지1", 1);
            for (let _0x5c3e5a of getRoleIdx("딜", "탱", "디")) {
              tbf(comp[_0x5c3e5a], "가뎀증", 13.5, "심쿵♡에너지2", 1);
            }
            tbf(boss, "받뎀증", 9, "심쿵♡에너지3", 1);
            break;
          case 2:
            tbf(all, "궁뎀증", 26.25, "심쿵♡에너지1", 1);
            for (let _0x8ae3fb of getRoleIdx("딜", "탱", "디")) {
              tbf(comp[_0x8ae3fb], "가뎀증", 15.75, "심쿵♡에너지2", 1);
            }
            tbf(boss, "받뎀증", 10.5, "심쿵♡에너지3", 1);
            break;
          case 3:
            tbf(all, "궁뎀증", 30, "심쿵♡에너지1", 1);
            for (let _0x1699d0 of getRoleIdx("딜", "탱", "디")) {
              tbf(comp[_0x1699d0], "가뎀증", 18, "심쿵♡에너지2", 1);
            }
            tbf(boss, "받뎀증", 12, "심쿵♡에너지3", 1);
            break;
          case 4:
            tbf(all, "궁뎀증", 33.75, "심쿵♡에너지1", 1);
            for (let _0x9cda3b of getRoleIdx("딜", "탱", "디")) {
              tbf(comp[_0x9cda3b], "가뎀증", 20.25, "심쿵♡에너지2", 1);
            }
            tbf(boss, "받뎀증", 13.5, "심쿵♡에너지3", 1);
            break;
          default:
            tbf(all, "궁뎀증", 37.5, "심쿵♡에너지1", 1);
            for (let _0x9ad6f2 of getRoleIdx("딜", "탱", "디")) {
              tbf(comp[_0x9ad6f2], "가뎀증", 22.5, "심쿵♡에너지2", 1);
            }
            tbf(boss, "받뎀증", 15, "심쿵♡에너지3", 1);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
        for (let _0x9e35a4 of comp) {
          _0x9e35a4.heal();
        }
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(55);
        tbf(all, "공퍼증", 88, "길 잃은 신입을 이끄는 선배!1", always);
        if (getElementCnt("수") >= 5) {
          for (let _0x528dd8 of getRoleIdx("딜", "탱", "디")) {
            anbf(comp[_0x528dd8], "방", comp[_0x528dd8], "<피어나는 샛별>", 0, "희망의 빛이 되어☆", 1, 3, always);
            const _0x48a188 = comp[_0x528dd8].defense;
            comp[_0x528dd8].defense = function (..._0x5ae085) {
              const _0x38f765 = comp[_0x528dd8].getNest("<피어나는 샛별>");
              _0x48a188.apply(this, _0x5ae085);
              if (_0x38f765 == 0) {
                setBuffOn(comp[_0x528dd8], "기본", "<반짝☆스포트라이트>1", true);
              } else if (_0x38f765 == 1) {
                setBuffOn(comp[_0x528dd8], "기본", "<반짝☆스포트라이트>1", false);
                setBuffOn(comp[_0x528dd8], "기본", "<반짝☆스포트라이트>2", true);
              } else if (_0x38f765 == 2) {
                setBuffOn(comp[_0x528dd8], "기본", "<반짝☆스포트라이트>2", false);
                setBuffOn(comp[_0x528dd8], "기본", "<반짝☆스포트라이트>3", true);
              }
            };
          }
        }
      };
      _0x23a024.passive = function () {
        tbf(_0x23a024, "공퍼증", 37.5, "블랙과 화이트의 하모니~1", always);
        for (let _0x497e0f of comp) {
          if (_0x23a024.id != _0x497e0f.id) {
            atbf(_0x23a024, "공격", _0x497e0f, "공고증", myCurAtk + _0x23a024.id + 25, "블랙과 화이트의 하모니~2", 1, always);
          }
        }
        for (let _0x5ee20d of getRoleIdx("딜", "탱", "디")) {
          anbf(comp[_0x5ee20d], "평", comp[_0x5ee20d], "<피어나는 샛별>", 0, "희망의 빛이 되어☆", 1, 3, always);
          const _0x1cbd2b = comp[_0x5ee20d].attack;
          comp[_0x5ee20d].attack = function (..._0x353f22) {
            const _0x1741f4 = comp[_0x5ee20d].getNest("<피어나는 샛별>");
            _0x1cbd2b.apply(this, _0x353f22);
            if (_0x1741f4 == 0) {
              setBuffOn(comp[_0x5ee20d], "기본", "<반짝☆스포트라이트>1", true);
            } else if (_0x1741f4 == 1) {
              setBuffOn(comp[_0x5ee20d], "기본", "<반짝☆스포트라이트>1", false);
              setBuffOn(comp[_0x5ee20d], "기본", "<반짝☆스포트라이트>2", true);
            } else if (_0x1741f4 == 2) {
              setBuffOn(comp[_0x5ee20d], "기본", "<반짝☆스포트라이트>2", false);
              setBuffOn(comp[_0x5ee20d], "기본", "<반짝☆스포트라이트>3", true);
            }
          };
          anbf(comp[_0x5ee20d], "궁", comp[_0x5ee20d], "<피어나는 샛별>", 0, "희망의 빛이 되어☆", -3, 3, always);
          const _0xa07180 = comp[_0x5ee20d].ultimate;
          comp[_0x5ee20d].ultimate = function (..._0x40c967) {
            _0xa07180.apply(this, _0x40c967);
            setBuffOn(comp[_0x5ee20d], "기본", "<반짝☆스포트라이트>1", false);
            setBuffOn(comp[_0x5ee20d], "기본", "<반짝☆스포트라이트>2", false);
            setBuffOn(comp[_0x5ee20d], "기본", "<반짝☆스포트라이트>3", false);
          };
          buff(comp[_0x5ee20d], "궁추가*", 25, "<반짝☆스포트라이트>1", always, false);
          buff(comp[_0x5ee20d], "궁추가*", 50, "<반짝☆스포트라이트>2", always, false);
          buff(comp[_0x5ee20d], "궁추가*", 75, "<반짝☆스포트라이트>3", always, false);
        }
        for (let _0x583c65 of getElementIdx("수")) {
          atbf(_0x23a024, "궁", comp[_0x583c65], "받속뎀", 22.5, "노엘리는 여러분을 제일 사랑해요♡1", 1, always);
        }
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {
          if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 4 == 0) {
            if (getElementCnt("수") >= 5) {
              tbf(boss, "받뎀증", 35.2, "<세심한 케어♡>1", 1);
              for (let _0x5498f5 of getElementIdx("수")) {
                tbf(comp[_0x5498f5], "받속뎀", 52.8, "<세심한 케어♡>2", 1);
              }
              for (let _0x43da7f of getRoleIdx("딜", "탱", "디")) {
                tbf(comp[_0x43da7f], "가뎀증", 52.8, "<철저한 계획>1", 1);
                tbf(comp[_0x43da7f], "궁뎀증", 88, "<철저한 계획>2", 1);
                tbf(comp[_0x43da7f], "궁추가*", 176, "<철저한 계획>3", 1);
              }
            }
          }
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10208:
      setMnc(_0x23a024, [265, 3, 298, 3, 331, 3, 364, 3, 397, 3], _0x17c963);
      _0x23a024.ultbefore = function () {
        deleteBuff(_0x23a024, "기본", "나~는~아~이~돌~이~될~거~야~!3");
        deleteBuff(boss, "기본", "나~는~아~이~돌~이~될~거~야~!5");
        switch (_0x17c963) {
          case 1:
            tbf(_0x23a024, "공퍼증", 180, "나~는~아~이~돌~이~될~거~야~!1", 1);
            tbf(_0x23a024, "가뎀증", 27, "나~는~아~이~돌~이~될~거~야~!2", 1);
            tbf(_0x23a024, "가뎀증", 27, "나~는~아~이~돌~이~될~거~야~!3", 3);
            break;
          case 2:
            tbf(_0x23a024, "공퍼증", 210, "나~는~아~이~돌~이~될~거~야~!1", 1);
            tbf(_0x23a024, "가뎀증", 31.5, "나~는~아~이~돌~이~될~거~야~!2", 1);
            tbf(_0x23a024, "가뎀증", 31.5, "나~는~아~이~돌~이~될~거~야~!3", 3);
            tbf(boss, "받뎀증", 10.5, "나~는~아~이~돌~이~될~거~야~!4", 1);
            tbf(boss, "받뎀증", 10.5, "나~는~아~이~돌~이~될~거~야~!5", 3);
            break;
          case 3:
            tbf(_0x23a024, "공퍼증", 240, "나~는~아~이~돌~이~될~거~야~!1", 1);
            tbf(_0x23a024, "가뎀증", 36, "나~는~아~이~돌~이~될~거~야~!2", 1);
            tbf(_0x23a024, "가뎀증", 36, "나~는~아~이~돌~이~될~거~야~!3", 3);
            tbf(boss, "받뎀증", 12, "나~는~아~이~돌~이~될~거~야~!4", 1);
            tbf(boss, "받뎀증", 12, "나~는~아~이~돌~이~될~거~야~!5", 3);
            break;
          case 4:
            tbf(_0x23a024, "공퍼증", 270, "나~는~아~이~돌~이~될~거~야~!1", 1);
            tbf(_0x23a024, "가뎀증", 40.5, "나~는~아~이~돌~이~될~거~야~!2", 1);
            tbf(_0x23a024, "가뎀증", 40.5, "나~는~아~이~돌~이~될~거~야~!3", 3);
            tbf(boss, "받뎀증", 13.5, "나~는~아~이~돌~이~될~거~야~!4", 1);
            tbf(boss, "받뎀증", 13.5, "나~는~아~이~돌~이~될~거~야~!5", 3);
            break;
          default:
            tbf(_0x23a024, "공퍼증", 300, "나~는~아~이~돌~이~될~거~야~!1", 1);
            tbf(_0x23a024, "가뎀증", 45, "나~는~아~이~돌~이~될~거~야~!2", 1);
            tbf(_0x23a024, "가뎀증", 45, "나~는~아~이~돌~이~될~거~야~!3", 3);
            tbf(boss, "받뎀증", 15, "나~는~아~이~돌~이~될~거~야~!4", 1);
            tbf(boss, "받뎀증", 15, "나~는~아~이~돌~이~될~거~야~!5", 3);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024, 5);
        deleteBuff(_0x23a024, "기본", "<아이돌의 빛>2");
        _0x23a024.bless("<빛의 축복>");
      };
      _0x23a024.atkbefore = function () {
        tbf(_0x23a024, "공퍼증", 100, "음침한 소녀 메이크업 중", 1);
      };
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
        _0x23a024.bless("<빛의 축복>");
      };
      _0x23a024.leader = function () {
        hpUpAll(55);
        if (getRoKind() == 3) {
          for (let _0x2bf531 of getRoleIdx("딜", "탱", "디")) {
            tbf(comp[_0x2bf531], "공퍼증", 55, "<아이돌 3명의 무대>1", always);
            tbf(comp[_0x2bf531], "가뎀증", 16.5, "<아이돌 3명의 무대>2", always);
            tbf(comp[_0x2bf531], "궁뎀증", 27.5, "<아이돌 3명의 무대>3", always);
            tbf(comp[_0x2bf531], "발효증", 27.5, "<아이돌 3명의 무대>4", always);
            tbf(comp[_0x2bf531], "궁추가*", 55, "<아이돌 3명의 무대>5", always);
            anbf(comp[_0x2bf531], "공격", boss, "받뎀증", 0.44, "<찬란한 빛>1", 1, 50, always);
            for (let _0x2028e6 of getElementIdx("광")) {
              anbf(comp[_0x2bf531], "공격", comp[_0x2028e6], "받속뎀", 0.66, "<찬란한 빛>2", 1, 50, always);
            }
            atbf(comp[_0x2bf531], "공격", all, "공고증", myCurAtk + comp[_0x2bf531].id + 15, "<찬란한 빛>3", 1, always);
            tbf(comp[_0x2bf531], "공발동*", 16.5, "<찬란한 빛>4", always);
          }
          tbf(_0x23a024, "가뎀증", 16.5, "콜라보 콘서트2", always);
        }
        if (getRoleCnt("섶") >= 1) {
          tbf(all, "가뎀증", -500, "콜라보 콘서트3", always);
        }
      };
      _0x23a024.passive = function () {
        atbf(_0x23a024, "공격", _0x23a024, "궁뎀증", 18.75, "신예 아이돌1", 3, always);
        atbf(_0x23a024, "공격", _0x23a024, "발효증", 18.75, "신예 아이돌2", 3, always);
        tbf(_0x23a024, "평발동*", 100, "신예 아이돌3", always);
        for (let _0x441ed2 of getElementIdx("광")) {
          anbf(_0x23a024, "궁", comp[_0x441ed2], "받속뎀", 15, "아이돌 라이브 중", 1, 3, always);
        }
        atbf(_0x23a024, "<빛의 축복>", _0x23a024, "평발동*", 4.5, "<아이돌의 빛>1", 3, always);
        atbf(_0x23a024, "<빛의 축복>", _0x23a024, "궁추가*", 15, "<아이돌의 빛>2", 3, always);
        tbf(_0x23a024, "가뎀증", 7.5, "가하는 데미지+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10209:
      setMnc(_0x23a024, [0, 5, 0, 5, 0, 5, 0, 5, 0, 5], _0x17c963);
      deleteBuff(_0x23a024, "기본", "1바퀴 돌기, 적의 주의 끌기4");
      deleteBuff(_0x23a024, "기본", "2바퀴 돌기, 적을 어지럽게 만들기4");
      deleteBuff(_0x23a024, "기본", "3바퀴 돌기, 뭘 봐!4");
      deleteBuff(_0x23a024, "기본", "4바퀴 돌기, 원해서 돈 게 아니야4");
      deleteBuff(_0x23a024, "기본", "5바퀴 돌기, 신난다 신나!4");
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            nbf(_0x23a024, "공퍼증", 67.2, "1바퀴 돌기, 적의 주의 끌기1", 1, 2);
            nbf(_0x23a024, "가뎀증", 10.08, "1바퀴 돌기, 적의 주의 끌기2", 1, 2);
            nbf(_0x23a024, "발효증", 16.8, "1바퀴 돌기, 적의 주의 끌기3", 1, 2);
            tbf(_0x23a024, "반격*", 10, "1바퀴 돌기, 적의 주의 끌기4", 5);
            nbf(boss, "받뎀증", 3.36, "1바퀴 돌기, 적의 주의 끌기5", 1, 2);
            break;
          case 2:
            nbf(_0x23a024, "공퍼증", 78.4, "2바퀴 돌기, 적을 어지럽게 만들기1", 1, 2);
            nbf(_0x23a024, "가뎀증", 13.44, "2바퀴 돌기, 적을 어지럽게 만들기2", 1, 2);
            nbf(_0x23a024, "발효증", 22.4, "2바퀴 돌기, 적을 어지럽게 만들기3", 1, 2);
            tbf(_0x23a024, "반격*", 10.9, "2바퀴 돌기, 적을 어지럽게 만들기4", 5);
            nbf(boss, "받뎀증", 3.92, "2바퀴 돌기, 적을 어지럽게 만들기5", 1, 2);
            break;
          case 3:
            nbf(_0x23a024, "공퍼증", 89.6, "3바퀴 돌기, 뭘 봐!1", 1, 2);
            nbf(_0x23a024, "가뎀증", 16.8, "3바퀴 돌기, 뭘 봐!2", 1, 2);
            nbf(_0x23a024, "발효증", 28, "3바퀴 돌기, 뭘 봐!3", 1, 2);
            tbf(_0x23a024, "반격*", 11.8, "3바퀴 돌기, 뭘 봐!4", 5);
            nbf(boss, "받뎀증", 4.48, "3바퀴 돌기, 뭘 봐!5", 1, 2);
            break;
          case 4:
            nbf(_0x23a024, "공퍼증", 100.8, "4바퀴 돌기, 원해서 돈 게 아니야1", 1, 2);
            nbf(_0x23a024, "가뎀증", 20.16, "4바퀴 돌기, 원해서 돈 게 아니야2", 1, 2);
            nbf(_0x23a024, "발효증", 33.6, "4바퀴 돌기, 원해서 돈 게 아니야3", 1, 2);
            tbf(_0x23a024, "반격*", 12.7, "4바퀴 돌기, 원해서 돈 게 아니야4", 5);
            nbf(boss, "받뎀증", 5.04, "4바퀴 돌기, 원해서 돈 게 아니야5", 1, 2);
            break;
          default:
            nbf(_0x23a024, "공퍼증", 112, "5바퀴 돌기, 신난다 신나!1", 1, 2);
            nbf(_0x23a024, "가뎀증", 23.52, "5바퀴 돌기, 신난다 신나!2", 1, 2);
            nbf(_0x23a024, "발효증", 39.2, "5바퀴 돌기, 신난다 신나!3", 1, 2);
            tbf(_0x23a024, "반격*", 13.7, "5바퀴 돌기, 신난다 신나!4", 5);
            nbf(boss, "받뎀증", 5.6, "5바퀴 돌기, 신난다 신나!5", 1, 2);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
        _0x23a024.hit();
      };
      _0x23a024.atkbefore = function () {
        _0x23a024.hit();
      };
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(55);
        tbf(all, "공퍼증", 73, "케모미미 대장 놀라이티1", always);
        if (getElKind() == 1) {
          anbf(_0x23a024, "궁", boss, "받뎀증", 7.3, "<신체 내성 UP>1", 1, 2, always);
          for (let _0x4024f0 of getElementIdx("풍")) {
            anbf(_0x23a024, "궁", comp[_0x4024f0], "받속뎀", 10.95, "<신체 내성 UP>2", 1, 2, always);
          }
          tbf(_0x23a024, "반격*", 4.4, "<신체 내성 UP>4", always);
        }
        if (getElKind() == 1) {
          for (let _0x5f0282 of getRoleIdx("딜", "디")) {
            tbf(comp[_0x5f0282], "가뎀증", 43.8, "<늑대 무리 사냥 스타트!>1", always);
            tbf(comp[_0x5f0282], "발효증", 146, "<늑대 무리 사냥 스타트!>2", always);
            tbf(comp[_0x5f0282], "공발동*", 21.9, "<늑대 무리 사냥 스타트!>3", always);
          }
        }
        if (getRoleCnt("탱") >= 1) {
          tbf(all, "가뎀증", -500, "케모미미 대장 놀라이티4", always);
        }
      };
      _0x23a024.passive = function () {
        tbf(_0x23a024, "반격*", 10, "늑대의 반격1", always);
        for (let _0x221975 of comp) {
          if (_0x221975.id != _0x23a024.id) {
            const _0x5a9429 = _0x221975.ultimate;
            _0x221975.ultimate = function (..._0x2c861f) {
              _0x5a9429.apply(this, _0x2c861f);
              _0x23a024.hit();
            };
            const _0xe51c36 = _0x221975.attack;
            _0x221975.attack = function (..._0x23e9f7) {
              _0xe51c36.apply(this, _0x23e9f7);
              _0x23a024.hit();
            };
          }
        }
        tbf(_0x23a024, "가뎀증", 20.16, "야생 늑대의 유연성1", always);
        tbf(_0x23a024, "발효증", 33.6, "야생 늑대의 유연성2", always);
        for (let _0x2c3f93 of getElementIdx("풍")) {
          anbf(_0x23a024, "피격", comp[_0x2c3f93], "받속뎀", 0.34, "수인화 Power2", 1, 50, always);
        }
        tbf(_0x23a024, "가뎀증", 6, "데미지+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        if (GLOBAL_TURN == 1) {
          cdChange(_0x23a024, -5);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10210:
      setMnc(_0x23a024, [0, 3, 0, 3, 0, 3, 0, 3, 0, 3], _0x17c963);
      buff_ex.push("<진귀 버섯>");
      _0x23a024.stack = 0;
      _0x23a024.ultbefore = function () {
        const _0x16a30f = _0x23a024.stack;
        switch (_0x17c963) {
          case 1:
            nbf(all, "<진귀 버섯>", 0, "초간지 버섯 채집견", 12, 60);
            _0x23a024.stack += 12;
            if (_0x23a024.stack > 60) {
              _0x23a024.stack = 60;
            }
            tbf(all, "가뎀증", 13.2, "초간지 버섯 채집견2", 1);
            for (let _0x241679 of getRoleIdx("딜", "탱", "디")) {
              if (comp[_0x241679].element == 4) {
                tbf(comp[_0x241679], "궁추가*", 44.1, "초간지 버섯 채집견3", 1);
              }
            }
            break;
          case 2:
            nbf(all, "<진귀 버섯>", 0, "초간지 버섯 채집견", 15, 60);
            _0x23a024.stack += 15;
            if (_0x23a024.stack > 60) {
              _0x23a024.stack = 60;
            }
            tbf(all, "가뎀증", 15.4, "초간지 버섯 채집견2", 1);
            for (let _0x2a9329 of getRoleIdx("딜", "탱", "디")) {
              if (comp[_0x2a9329].element == 4) {
                tbf(comp[_0x2a9329], "궁추가*", 51.5, "초간지 버섯 채집견3", 1);
              }
            }
            break;
          case 3:
            nbf(all, "<진귀 버섯>", 0, "초간지 버섯 채집견", 15, 60);
            _0x23a024.stack += 15;
            if (_0x23a024.stack > 60) {
              _0x23a024.stack = 60;
            }
            tbf(all, "가뎀증", 17.6, "초간지 버섯 채집견2", 1);
            for (let _0x34dcaf of getRoleIdx("딜", "탱", "디")) {
              if (comp[_0x34dcaf].element == 4) {
                tbf(comp[_0x34dcaf], "궁추가*", 58.8, "초간지 버섯 채집견3", 1);
              }
            }
            break;
          case 4:
            nbf(all, "<진귀 버섯>", 0, "초간지 버섯 채집견", 20, 60);
            _0x23a024.stack += 20;
            if (_0x23a024.stack > 60) {
              _0x23a024.stack = 60;
            }
            tbf(all, "가뎀증", 19.8, "초간지 버섯 채집견2", 1);
            for (let _0x1dbc59 of getRoleIdx("딜", "탱", "디")) {
              if (comp[_0x1dbc59].element == 4) {
                tbf(comp[_0x1dbc59], "궁추가*", 66.2, "초간지 버섯 채집견3", 1);
              }
            }
            break;
          default:
            nbf(all, "<진귀 버섯>", 0, "초간지 버섯 채집견", 20, 60);
            _0x23a024.stack += 20;
            if (_0x23a024.stack > 60) {
              _0x23a024.stack = 60;
            }
            tbf(all, "가뎀증", 22, "초간지 버섯 채집견2", 1);
            for (let _0x403913 of getRoleIdx("딜", "탱", "디")) {
              if (comp[_0x403913].element == 4) {
                tbf(comp[_0x403913], "궁추가*", 73.5, "초간지 버섯 채집견3", 1);
              }
            }
            break;
        }
        for (let _0x11bf48 of comp) {
          if (_0x16a30f < 20 && _0x23a024.stack >= 20) {
            setBuffOn(_0x11bf48, "기본", "<♡심장 박동 가속♡>1", true);
          }
          if (_0x16a30f < 40 && _0x23a024.stack >= 40) {
            setBuffOn(_0x11bf48, "기본", "<♡심장 박동 가속♡>2", true);
          }
          if (_0x16a30f < 60 && _0x23a024.stack >= 60) {
            setBuffOn(_0x11bf48, "기본", "<♡심장 박동 가속♡>3", true);
            setBuffOn(_0x11bf48, "기본", "<♡심장 박동 가속♡>4", true);
          }
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        const _0x4ffa52 = _0x23a024.stack;
        ultLogic(_0x23a024);
        if (_0x4ffa52 < 40 && _0x23a024.stack >= 40) {
          setBuffOnAll(_0x23a024, "발동", "왕성한 번식욕1", true);
          setBuffOn(_0x23a024, "발동", "왕성한 번식욕2", true);
        }
      };
      _0x23a024.atkbefore = function () {
        tbf(all, "공고증", myCurAtk + _0x23a024.id + 30, "정찰 개시", 1);
      };
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(55);
        if (getElementCnt("풍") >= 2) {
          tbf(all, "공퍼증", 53, "<우리는 멍멍이의 꼬리다!>1", always);
          tbf(all, "궁뎀증", 53, "<우리는 멍멍이의 꼬리다!>2", always);
          tbf(all, "궁추가*", 105.5, "<우리는 멍멍이의 꼬리다!>3", always);
        }
        if (getElementCnt("암") >= 2) {
          atbf(_0x23a024, "궁", all, "가뎀증", 31.7, "<목표는 전설의 모험가 소대!>1", 1, always);
          atbf(_0x23a024, "궁", boss, "받뎀증", 21.2, "<목표는 전설의 모험가 소대!>2", 1, always);
          for (let _0x38a6f6 of getElementIdx("풍", "암")) {
            atbf(_0x23a024, "궁", comp[_0x38a6f6], "받속뎀", 76.7, "<목표는 전설의 모험가 소대!>3", 1, always);
          }
        }
      };
      _0x23a024.passive = function () {
        atbf(_0x23a024, "궁", all, "공고증", myCurAtk + _0x23a024.id + 30, "복슬복슬한 게 정의다", 1, always);
        buff(all, "공퍼증", 16.7, "<♡심장 박동 가속♡>1", always, false);
        buff(all, "궁뎀증", 16.7, "<♡심장 박동 가속♡>2", always, false);
        buff(all, "공퍼증", 20, "<♡심장 박동 가속♡>3", always, false);
        buff(all, "궁뎀증", 20, "<♡심장 박동 가속♡>4", always, false);
        for (let _0x53cbd3 of getElementIdx("암")) {
          buff(_0x23a024, "궁", comp[_0x53cbd3], "받속뎀", 22, "왕성한 번식욕1", 1, always, "발동", false);
        }
        buff(_0x23a024, "궁", boss, "받뎀증", 14.6, "왕성한 번식욕2", 1, always, "발동", false);
        tbf(_0x23a024, "공퍼증", 10, "공격+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        if (GLOBAL_TURN == 1) {
          cdChange(_0x23a024, -3);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10211:
      _0x23a024.stack = 0;
      buff_ex.push("<악즉참>");
      setMnc(_0x23a024, [382.5, 4, 428.5, 4, 474.5, 4, 520.5, 4, 566.5, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        deleteBuff(_0x23a024, "기본", "성검해방! 월아충파!1");
        deleteBuff(_0x23a024, "기본", "성검해방! 월아충파!2");
        switch (_0x17c963) {
          case 1:
            tbf(_0x23a024, "공퍼증", 78.6, "성검해방! 월아충파!1", 4);
            tbf(_0x23a024, "가뎀증", 23.58, "성검해방! 월아충파!2", 4);
            nbf(boss, "받뎀증", 7.86, "성검해방! 월아충파!3", 1, 2);
            break;
          case 2:
            tbf(_0x23a024, "공퍼증", 91.7, "성검해방! 월아충파!1", 4);
            tbf(_0x23a024, "가뎀증", 27.51, "성검해방! 월아충파!2", 4);
            nbf(boss, "받뎀증", 9.17, "성검해방! 월아충파!3", 1, 2);
            for (let _0x276cfb of getElementIdx("광")) {
              nbf(comp[_0x276cfb], "받속뎀", 11.79, "성검해방! 월아충파!4", 1, 2);
            }
            break;
          case 3:
            tbf(_0x23a024, "공퍼증", 104.8, "성검해방! 월아충파!1", 4);
            tbf(_0x23a024, "가뎀증", 31.44, "성검해방! 월아충파!2", 4);
            nbf(boss, "받뎀증", 10.48, "성검해방! 월아충파!3", 1, 2);
            for (let _0x1ac3ad of getElementIdx("광")) {
              nbf(comp[_0x1ac3ad], "받속뎀", 14.41, "성검해방! 월아충파!4", 1, 2);
            }
            break;
          case 4:
            tbf(_0x23a024, "공퍼증", 117.9, "성검해방! 월아충파!1", 4);
            tbf(_0x23a024, "가뎀증", 35.37, "성검해방! 월아충파!2", 4);
            nbf(boss, "받뎀증", 11.79, "성검해방! 월아충파!3", 1, 2);
            for (let _0x3c31d1 of getElementIdx("광")) {
              nbf(comp[_0x3c31d1], "받속뎀", 17.03, "성검해방! 월아충파!4", 1, 2);
            }
            break;
          default:
            tbf(_0x23a024, "공퍼증", 131, "성검해방! 월아충파!1", 4);
            tbf(_0x23a024, "가뎀증", 39.3, "성검해방! 월아충파!2", 4);
            nbf(boss, "받뎀증", 13.1, "성검해방! 월아충파!3", 1, 2);
            for (let _0x309980 of getElementIdx("광")) {
              nbf(comp[_0x309980], "받속뎀", 19.65, "성검해방! 월아충파!4", 1, 2);
            }
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024, 5);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(55);
        for (let _0x2f04c9 of comp) {
          if (_0x2f04c9.id == 10160) {
            _0x2f04c9.cd -= 20;
            _0x2f04c9.curCd -= 20;
          }
        }
        const _0x3e978a = getElementCnt("광");
        nbf(all, "<악즉참>", 0, "파사성검", _0x3e978a, 5);
        if (_0x3e978a == 3) {
          tbf(all, "공퍼증", 63, "<인류의 수호자>1", always);
          anbf(all, "궁", boss, "받뎀증", 2.52, "<인류의 수호자>2", 1, 10, always);
          for (let _0x380280 of getElementIdx("광")) {
            anbf(all, "궁", comp[_0x380280], "받속뎀", 3.78, "<인류의 수호자>3", 1, 10, always);
          }
        }
        if (getRoleCnt("딜") >= 2) {
          for (let _0x11a19b of getElementIdx("광")) {
            if (comp[_0x11a19b].role != 0) {
              continue;
            }
            tbf(comp[_0x11a19b], "가뎀증", 37.8, "<마왕 말살의 검>1", always);
            tbf(comp[_0x11a19b], "일뎀증", 56.7, "<마왕 말살의 검>2", always);
            tbf(comp[_0x11a19b], "궁뎀증", 25.2, "<마왕 말살의 검>3", always);
            tbf(comp[_0x11a19b], "평추가*", 37.8, "<마왕 말살의 검>4", always);
            tbf(comp[_0x11a19b], "궁추가*", 50.4, "<마왕 말살의 검>5", always);
          }
        }
      };
      _0x23a024.passive = function () {
        tbf(_0x23a024, "일뎀증", 29.48, "간파1", always);
        tbf(_0x23a024, "궁뎀증", 13.1, "간파2", always);
        for (let _0x48ed43 of getElementIdx("광")) {
          if (comp[_0x48ed43].role != 0) {
            continue;
          }
          tbf(comp[_0x48ed43], "공퍼증", 65.5, "십자순섬1", always);
          tbf(comp[_0x48ed43], "일뎀증", 14.74, "십자순섬2", always);
          tbf(comp[_0x48ed43], "궁뎀증", 6.55, "십자순섬3", always);
        }
        for (let _0x12b279 of getElementIdx("광")) {
          if (comp[_0x12b279].role != 0) {
            continue;
          }
          tbf(comp[_0x12b279], "가뎀증", 19.65, "여명의 일격1", always);
          tbf(comp[_0x12b279], "평추가*", 19.7, "여명의 일격2", always);
          tbf(comp[_0x12b279], "궁추가*", 26.2, "여명의 일격3", always);
        }
        tbf(_0x23a024, "가뎀증", 6, "데미지+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10212:
      setMnc(_0x23a024, [458.5, 3, 524, 3, 589, 3, 654.5, 3, 719.5, 3], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(_0x23a024, "가뎀증", 58.05, "빙폭의 장송1", 1);
            tbf(boss, "받뎀증", 19.35, "빙폭의 장송2", 1);
            break;
          case 2:
            tbf(_0x23a024, "가뎀증", 67.73, "빙폭의 장송1", 1);
            tbf(boss, "받뎀증", 22.58, "빙폭의 장송2", 1);
            break;
          case 3:
            tbf(_0x23a024, "가뎀증", 77.4, "빙폭의 장송1", 1);
            tbf(boss, "받뎀증", 25.8, "빙폭의 장송2", 1);
            break;
          case 4:
            tbf(_0x23a024, "가뎀증", 87.08, "빙폭의 장송1", 1);
            tbf(boss, "받뎀증", 29.03, "빙폭의 장송2", 1);
            break;
          default:
            tbf(_0x23a024, "가뎀증", 96.75, "빙폭의 장송1", 1);
            tbf(boss, "받뎀증", 32.25, "빙폭의 장송2", 1);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024, 5);
      };
      _0x23a024.atkbefore = function () {
        tbf(_0x23a024, "궁뎀증", 15, "힘 축적", 3);
      };
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(55);
        for (let _0x177524 of comp) {
          if (_0x23a024.id != _0x177524.id) {
            tbf(_0x177524, "공퍼증", 50, "영혼을 삼키는 마검1", always);
          }
        }
        if (getElKind() == 1) {
          tbf(_0x23a024, "가뎀증", 36, "<마력 충전>2", always);
          tbf(_0x23a024, "궁뎀증", 30, "<마력 충전>3", always);
          tbf(_0x23a024, "궁추가*", 120, "<마력 충전>4", always);
        }
        if (getElKind() == 1) {
          for (let _0x5e3609 of comp) {
            if (_0x23a024.id != _0x5e3609.id) {
              atbf(_0x5e3609, "궁", _0x23a024, "공고증", _0x5e3609.hp * 5.76, "<영혼 흡수>1", 1, always);
              anbf(_0x5e3609, "궁", boss, "받뎀증", 1, "<영혼 흡수>2", 1, 12, always);
              for (let _0x43a40d of getElementIdx("암")) {
                anbf(_0x5e3609, "궁", comp[_0x43a40d], "받속뎀", 1.5, "<영혼 흡수>3", 1, 12, always);
              }
            }
          }
        }
      };
      _0x23a024.passive = function () {
        anbf(_0x23a024, "공격", _0x23a024, "궁뎀증", 5.05, "마왕의 피로 벼려낸 검", 1, 10, always);
        for (let _0x51b323 of comp) {
          if (_0x23a024.id != _0x51b323.id) {
            atbf(_0x51b323, "궁", _0x23a024, "공고증", _0x51b323.hp * 13.76, "혹독한 겨울", 1, always);
          }
        }
        for (let _0x23c64e of getElementIdx("암")) {
          anbf(_0x23a024, "궁", comp[_0x23c64e], "받속뎀", 16.1, "서리 독의 침식2", 1, 3, always);
        }
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {
          if (GLOBAL_TURN == 1 && getElKind() == 1) {
            for (let _0x110dd1 of comp) {
              if (_0x110dd1.id != _0x23a024.id) {
                cdChange(_0x110dd1, -3);
              }
            }
          }
        }
        if (GLOBAL_TURN == 1) {
          cdChange(_0x23a024, -3);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10213:
      _0x23a024.stack = 0;
      buff_ex.push("<살기 축적>");
      setMnc(_0x23a024, [0, 50, 0, 50, 0, 50, 0, 50, 0, 50], _0x17c963);
      _0x23a024.ultbefore = function () {
        for (let _0x9f04ad of comp) {
          deleteBuff(_0x9f04ad, "기본", "미나요미 일도류 오의 요염1");
          deleteBuff(_0x9f04ad, "기본", "미나요미 일도류 오의 요염2");
          deleteBuff(_0x9f04ad, "기본", "미나요미 일도류 오의 요염3");
          if (_0x23a024.id != _0x9f04ad.id) {
            deleteBuff(_0x9f04ad, "기본", "미나요미 일도류 오의 요염4");
          }
        }
        switch (_0x17c963) {
          case 1:
            tbf(all, "공퍼증", 39.9, "미나요미 일도류 오의 요염1", 4);
            tbf(all, "발효증", 61.8, "미나요미 일도류 오의 요염2", 4);
            buff(_0x23a024, "공발동*", 24, "미나요미 일도류 오의 요염4", 4, false);
            for (let _0x2f2611 of getRoleIdx("딜", "탱", "디")) {
              if (_0x23a024.id != comp[_0x2f2611].id) {
                tbf(comp[_0x2f2611], "공발동*", 24, "미나요미 일도류 오의 요염4", 4);
              }
            }
            break;
          case 2:
            tbf(all, "공퍼증", 46.55, "미나요미 일도류 오의 요염1", 4);
            tbf(all, "발효증", 72.1, "미나요미 일도류 오의 요염2", 4);
            buff(_0x23a024, "공발동*", 28, "미나요미 일도류 오의 요염4", 4, false);
            for (let _0x4cb15a of getRoleIdx("딜", "탱", "디")) {
              if (_0x23a024.id != comp[_0x4cb15a].id) {
                tbf(comp[_0x4cb15a], "공발동*", 28, "미나요미 일도류 오의 요염4", 4);
              }
            }
            break;
          case 3:
            tbf(all, "공퍼증", 53.2, "미나요미 일도류 오의 요염1", 4);
            tbf(all, "발효증", 82.4, "미나요미 일도류 오의 요염2", 4);
            for (let _0xda9b63 of getElementIdx("화")) {
              tbf(comp[_0xda9b63], "받속뎀", 32, "미나요미 일도류 오의 요염3", 4);
            }
            buff(_0x23a024, "공발동*", 32, "미나요미 일도류 오의 요염4", 4, false);
            for (let _0x30c852 of getRoleIdx("딜", "탱", "디")) {
              if (_0x23a024.id != comp[_0x30c852].id) {
                tbf(comp[_0x30c852], "공발동*", 32, "미나요미 일도류 오의 요염4", 4);
              }
            }
            break;
          case 4:
            tbf(all, "공퍼증", 59.85, "미나요미 일도류 오의 요염1", 4);
            tbf(all, "발효증", 92.7, "미나요미 일도류 오의 요염2", 4);
            for (let _0x226b07 of getElementIdx("화")) {
              tbf(comp[_0x226b07], "받속뎀", 36, "미나요미 일도류 오의 요염3", 4);
            }
            buff(_0x23a024, "공발동*", 36, "미나요미 일도류 오의 요염4", 4, false);
            for (let _0x1fe2a of getRoleIdx("딜", "탱", "디")) {
              if (_0x23a024.id != comp[_0x1fe2a].id) {
                tbf(comp[_0x1fe2a], "공발동*", 36, "미나요미 일도류 오의 요염4", 4);
              }
            }
            break;
          default:
            tbf(all, "공퍼증", 66.5, "미나요미 일도류 오의 요염1", 4);
            tbf(all, "발효증", 103, "미나요미 일도류 오의 요염2", 4);
            for (let _0x12335d of getElementIdx("화")) {
              tbf(comp[_0x12335d], "받속뎀", 40, "미나요미 일도류 오의 요염3", 4);
            }
            buff(_0x23a024, "공발동*", 40, "미나요미 일도류 오의 요염4", 4, false);
            for (let _0x5563a5 of getRoleIdx("딜", "탱", "디")) {
              if (_0x23a024.id != comp[_0x5563a5].id) {
                tbf(comp[_0x5563a5], "공발동*", 40, "미나요미 일도류 오의 요염4", 4);
              }
            }
            break;
        }
      };
      _0x23a024.ultafter = function () {
        boss.def = false;
      };
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
        setBuffOnAll(_0x23a024, "기본", "미나요미 일도류 오의 요염4", true);
        keepOnlyLastBuff(_0x23a024, "기본", "미나요미 일도류 오의 요염4");
      };
      _0x23a024.atkbefore = function () {
        tbf(all, "발효증", 30, "복수의 일격", 1);
      };
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(55);
        tbf(all, "공퍼증", 48.2, "목숨을 앗는 사도1", always);
        if (getRoKind() == 4) {
          tbf(_0x23a024, "공발동*", 28.8, "<검신화>5", always);
          for (let _0x2e194d of getElementIdx("화")) {
            anbf(_0x23a024, "궁", comp[_0x2e194d], "받속뎀", 28.8, "<검신화>6", 1, 1, always);
          }
          anbf(_0x23a024, "궁", boss, "받뎀증", 19.2, "<검신화>7", 1, 1, always);
          for (let _0xfb4a5b of getRoleIdx("딜")) {
            if (_0x23a024.id == comp[_0xfb4a5b].id) {
              continue;
            }
            for (let _0x1505f9 of getRoleIdx("딜")) {
              nbf(comp[_0x1505f9], "가뎀증", 28.8, "<요도의 주인>1", 1, 1);
              nbf(comp[_0x1505f9], "발효증", 96.4, "<요도의 주인>2", 1, 1);
            }
            tbf(comp[_0xfb4a5b], "공발동*", 28.8, "<요도의 주인>3", always);
          }
        }
      };
      _0x23a024.passive = function () {
        tbf(_0x23a024, "평발동*", 100, "월하이섬1", always);
        tbf(_0x23a024, "궁발동*", 400, "월하이섬2", always);
        buff(_0x23a024, "궁", all, "발효증", 30, "강자를 향한 집념1", 1, always, "발동", false);
        buff(_0x23a024, "궁", boss, "제거", "기본", "강자를 향한 집념2", 1, always, "발동", false);
        buff(_0x23a024, "궁", boss, "받뎀증", 26.5, "강자를 향한 집념2", 4, always, "발동", false);
        for (let _0x255862 of getElementIdx("화")) {
          tbf(comp[_0x255862], "가뎀증", 40, "귀면의 혈야차1", always);
        }
        tbf(_0x23a024, "가뎀증", 6, "데미지+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        const _0x511523 = getRoKind();
        if (_0x23a024.isLeader) {
          if (GLOBAL_TURN == 1 && _0x511523 == 4) {
            nbf(_0x23a024, "<살기 축적>", 0, "강자를 향한 집념", 3, 3);
            _0x23a024.stack += 3;
            if (_0x23a024.stack > 3) {
              _0x23a024.stack = 3;
            }
            setBuffOn(_0x23a024, "발동", "강자를 향한 집념1", true);
            setBuffOnAll(_0x23a024, "발동", "강자를 향한 집념2", true);
            cdChange(_0x23a024, -50);
          }
          if ((GLOBAL_TURN - 1) % 3 == 0 && GLOBAL_TURN > 1 && _0x511523 == 4) {
            cdChange(_0x23a024, -50);
          }
        }
        if ((GLOBAL_TURN - 1) % 4 == 0 && GLOBAL_TURN > 1) {
          cdChange(_0x23a024, -50);
        }
        if (GLOBAL_TURN == 3 || GLOBAL_TURN == 5 || GLOBAL_TURN == 7) {
          if (!_0x23a024.isLeader || _0x23a024.isLeader && _0x511523 != 4) {
            nbf(_0x23a024, "<살기 축적>", 0, "강자를 향한 집념", 1, 3);
            _0x23a024.stack += 1;
            if (_0x23a024.stack > 3) {
              _0x23a024.stack = 3;
            }
            if (_0x23a024.stack == 1) {
              setBuffOn(_0x23a024, "발동", "강자를 향한 집념1", true);
            }
            if (_0x23a024.stack == 2) {
              setBuffOnAll(_0x23a024, "발동", "강자를 향한 집념2", true);
            }
          }
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10214:
      _0x23a024.stack = 0;
      buff_ex.push("<사탕 함정>", "<케이크 함정>");
      setMnc(_0x23a024, [154.2, 2, 179.9, 2, 205.6, 2, 231.3, 2, 257, 2], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(boss, "받뎀증", 6.45, "장난 마력 폭발1", 8);
            for (let _0x41f77e of getElementIdx("수")) {
              nbf(comp[_0x41f77e], "받속뎀", 3.25, "장난 마력 폭발2", 1, 4);
            }
            for (let _0x7b1591 of getRoleIdx("딜", "탱", "디")) {
              tbf(comp[_0x7b1591], "평추가*", 16.2, "장난 마력 폭발3", 4);
              const _0x157c3d = comp[_0x7b1591].attack;
              comp[_0x7b1591].attack = function (..._0x446fb0) {
                _0x157c3d.apply(this, _0x446fb0);
                deleteBuff(comp[_0x7b1591], "기본", "장난 마력 폭발3");
              };
            }
            break;
          case 2:
            tbf(boss, "받뎀증", 7.53, "장난 마력 폭발1", 8);
            for (let _0x49e90c of getElementIdx("수")) {
              nbf(comp[_0x49e90c], "받속뎀", 3.8, "장난 마력 폭발2", 1, 4);
            }
            for (let _0x491c17 of getRoleIdx("딜", "탱", "디")) {
              tbf(comp[_0x491c17], "평추가*", 18.9, "장난 마력 폭발3", 4);
              const _0x424d6 = comp[_0x491c17].attack;
              comp[_0x491c17].attack = function (..._0x2b62a4) {
                _0x424d6.apply(this, _0x2b62a4);
                deleteBuff(comp[_0x491c17], "기본", "장난 마력 폭발3");
              };
            }
            break;
          case 3:
            tbf(boss, "받뎀증", 8.6, "장난 마력 폭발1", 8);
            for (let _0x3950e3 of getElementIdx("수")) {
              nbf(comp[_0x3950e3], "받속뎀", 4.34, "장난 마력 폭발2", 1, 4);
            }
            for (let _0x5c86ed of getRoleIdx("딜", "탱", "디")) {
              tbf(comp[_0x5c86ed], "평추가*", 21.6, "장난 마력 폭발3", 4);
              const _0x5d685b = comp[_0x5c86ed].attack;
              comp[_0x5c86ed].attack = function (..._0x30a9af) {
                _0x5d685b.apply(this, _0x30a9af);
                deleteBuff(comp[_0x5c86ed], "기본", "장난 마력 폭발3");
              };
            }
            break;
          case 4:
            tbf(boss, "받뎀증", 9.68, "장난 마력 폭발1", 8);
            for (let _0x42481c of getElementIdx("수")) {
              nbf(comp[_0x42481c], "받속뎀", 4.88, "장난 마력 폭발2", 1, 4);
            }
            for (let _0xf120ef of getRoleIdx("딜", "탱", "디")) {
              tbf(comp[_0xf120ef], "평추가*", 24.3, "장난 마력 폭발3", 4);
              const _0x86a5a5 = comp[_0xf120ef].attack;
              comp[_0xf120ef].attack = function (..._0x32897c) {
                _0x86a5a5.apply(this, _0x32897c);
                deleteBuff(comp[_0xf120ef], "기본", "장난 마력 폭발3");
              };
            }
            break;
          default:
            tbf(boss, "받뎀증", 10.75, "장난 마력 폭발1", 8);
            for (let _0x233739 of getElementIdx("수")) {
              nbf(comp[_0x233739], "받속뎀", 5.42, "장난 마력 폭발2", 1, 4);
            }
            for (let _0x2abe69 of getRoleIdx("딜", "탱", "디")) {
              tbf(comp[_0x2abe69], "평추가*", 27, "장난 마력 폭발3", 4);
              const _0x54e758 = comp[_0x2abe69].attack;
              comp[_0x2abe69].attack = function (..._0xc14a09) {
                _0x54e758.apply(this, _0xc14a09);
                deleteBuff(comp[_0x2abe69], "기본", "장난 마력 폭발3");
              };
            }
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
        if (_0x23a024.stack == 0) {
          nbf(_0x23a024, "<사탕 함정>", 0, "나랑 술래잡기하자!", -1, 1);
          nbf(_0x23a024, "<케이크 함정>", 0, "내가 실컷 놀 때까지 죽으면 안 돼~", 1, 1);
          _0x23a024.stack = 1;
          const _0x56aeed = _0x23a024.stack == 0;
          setBuffOnAll(_0x23a024, "추가", "<막대사탕 쇠뇌>1", _0x56aeed);
          setBuffOn(_0x23a024, "추가", "<막대사탕 쇠뇌>2", _0x56aeed);
          setBuffOn(_0x23a024, "추가", "<막대사탕 쇠뇌>3", _0x56aeed);
          setBuffOnAll(_0x23a024, "추가", "<막대사탕 쇠뇌>4", _0x56aeed);
          setBuffOn(_0x23a024, "기본", "<막대사탕 쇠뇌>5", _0x56aeed);
          setBuffOn(_0x23a024, "발동", "<과일사탕 마정포>1", _0x56aeed);
          setBuffOnAll(_0x23a024, "추가", "<초콜릿 얼음칼날 구름>1", !_0x56aeed);
          setBuffOn(_0x23a024, "추가", "<초콜릿 얼음칼날 구름>2", !_0x56aeed);
          setBuffOnAll(_0x23a024, "추가", "<초콜릿 얼음칼날 구름>3", !_0x56aeed);
          setBuffOn(_0x23a024, "기본", "<초콜릿 얼음칼날 구름>4", !_0x56aeed);
          setBuffOnAll(_0x23a024, "발동", "<바닐라 크림 뇌운>1", !_0x56aeed);
          setBuffOn(_0x23a024, "발동", "<바닐라 크림 뇌운>2", !_0x56aeed);
        }
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
        if (_0x23a024.stack == 1) {
          nbf(_0x23a024, "<사탕 함정>", 0, "나랑 술래잡기하자!", 1, 1);
          nbf(_0x23a024, "<케이크 함정>", 0, "내가 실컷 놀 때까지 죽으면 안 돼~", -1, 1);
          _0x23a024.stack = 0;
          const _0x913e1d = _0x23a024.stack == 0;
          setBuffOnAll(_0x23a024, "추가", "<막대사탕 쇠뇌>1", _0x913e1d);
          setBuffOn(_0x23a024, "추가", "<막대사탕 쇠뇌>2", _0x913e1d);
          setBuffOn(_0x23a024, "추가", "<막대사탕 쇠뇌>3", _0x913e1d);
          setBuffOnAll(_0x23a024, "추가", "<막대사탕 쇠뇌>4", _0x913e1d);
          setBuffOn(_0x23a024, "기본", "<막대사탕 쇠뇌>5", _0x913e1d);
          setBuffOn(_0x23a024, "발동", "<과일사탕 마정포>1", _0x913e1d);
          setBuffOnAll(_0x23a024, "추가", "<초콜릿 얼음칼날 구름>1", !_0x913e1d);
          setBuffOn(_0x23a024, "추가", "<초콜릿 얼음칼날 구름>2", !_0x913e1d);
          setBuffOnAll(_0x23a024, "추가", "<초콜릿 얼음칼날 구름>3", !_0x913e1d);
          setBuffOn(_0x23a024, "기본", "<초콜릿 얼음칼날 구름>4", !_0x913e1d);
          setBuffOnAll(_0x23a024, "발동", "<바닐라 크림 뇌운>1", !_0x913e1d);
          setBuffOn(_0x23a024, "발동", "<바닐라 크림 뇌운>2", !_0x913e1d);
        }
      };
      _0x23a024.leader = function () {
        for (let _0x3bfc21 of getElementIdx("수", "풍")) {
          hpUpMe(comp[_0x3bfc21], 55);
          tbf(comp[_0x3bfc21], "공퍼증", 60.5, "할로윈 장난꾸러기 소악마1", always);
        }
        if (getElementCnt("수") >= 4) {
          tbf(all, "가뎀증", -500, "할로윈 장난꾸러기 소악마2", always);
        }
        for (let _0x42ea9b of getElementIdx("풍")) {
          buff(_0x23a024, "궁", comp[_0x42ea9b], "받속뎀", 18.15, "<막대사탕 쇠뇌>1", 1, 4, always, "추가", true);
        }
        buff(_0x23a024, "궁", boss, "방경감", 10, "<막대사탕 쇠뇌>2", 1, 4, always, "추가", true);
        buff(_0x23a024, "궁", boss, "받일뎀", 17, "<막대사탕 쇠뇌>3", 8, always, "추가", true);
        for (let _0x13f04a of getRoleIdx("딜", "탱", "디")) {
          if (comp[_0x13f04a].element == 1 || comp[_0x13f04a].element == 2) {
            if (_0x23a024.id == comp[_0x13f04a].id) {
              continue;
            }
            buff(_0x23a024, "궁", comp[_0x13f04a], "궁추가*", 30.3, "<막대사탕 쇠뇌>4", 4, always, "추가", true);
            const _0x1f7fd0 = comp[_0x13f04a].ultimate;
            comp[_0x13f04a].ultimate = function (..._0x49e479) {
              _0x1f7fd0.apply(this, _0x49e479);
              deleteBuff(comp[_0x13f04a], "기본", "<막대사탕 쇠뇌>4");
            };
          }
        }
        buff(_0x23a024, "궁추가*", 30.3, "<막대사탕 쇠뇌>5", always, true);
        for (let _0x2d2f3e of getElementIdx("수")) {
          buff(_0x23a024, "평", comp[_0x2d2f3e], "받속뎀", 9.08, "<초콜릿 얼음칼날 구름>1", 1, 4, always, "추가", false);
        }
        buff(_0x23a024, "평", boss, "받궁뎀", 3.8, "<초콜릿 얼음칼날 구름>2", 8, always, "추가", false);
        for (let _0x74dce6 of getRoleIdx("딜", "탱", "디")) {
          if (comp[_0x74dce6].element == 1 || comp[_0x74dce6].element == 2) {
            if (_0x23a024.id == comp[_0x74dce6].id) {
              continue;
            }
            buff(_0x23a024, "평", comp[_0x74dce6], "평추가*", 45.5, "<초콜릿 얼음칼날 구름>3", 4, always, "추가", false);
            const _0x460fb2 = comp[_0x74dce6].attack;
            comp[_0x74dce6].attack = function (..._0x42b400) {
              _0x460fb2.apply(this, _0x42b400);
              deleteBuff(comp[_0x74dce6], "기본", "<초콜릿 얼음칼날 구름>3");
            };
          }
        }
        buff(_0x23a024, "평추가*", 45.5, "<초콜릿 얼음칼날 구름>4", always, false);
        anbf(_0x23a024, "공격", all, "가뎀증", 4.54, "할로윈 장난꾸러기 소악마3", 1, 8, always);
        atbf(_0x23a024, "공격", boss, "받뎀증", 9.06, "할로윈 장난꾸러기 소악마4", 8, always);
      };
      _0x23a024.passive = function () {
        tbf(all, "공퍼증", 36, "나랑 술래잡기하자!2", always);
        buff(_0x23a024, "궁", boss, "받일뎀", 10.12, "<과일사탕 마정포>1", 8, always, "발동", true);
        for (let _0x2a1260 of getRoleIdx("딜", "탱", "디")) {
          buff(_0x23a024, "평", comp[_0x2a1260], "궁추가*", 18, "<바닐라 크림 뇌운>1", 4, always, "발동", false);
          const _0x4d591a = comp[_0x2a1260].ultimate;
          comp[_0x2a1260].ultimate = function (..._0x14ec91) {
            _0x4d591a.apply(this, _0x14ec91);
            deleteBuff(comp[_0x2a1260], "기본", "<바닐라 크림 뇌운>1");
          };
        }
        buff(_0x23a024, "평", boss, "받궁뎀", 2.25, "<바닐라 크림 뇌운>2", 8, always, "발동", false);
        anbf(_0x23a024, "공격", all, "가뎀증", 2.71, "<호박머리 폭탄>1", 1, 8, always);
        anbf(_0x23a024, "공격", boss, "방경감", 10, "<호박머리 폭탄>2", 1, 1, always);
        tbf(_0x23a024, "공퍼증", 10, "공격+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
        if (GLOBAL_TURN == 1) {
          cdChange(_0x23a024, -2);
          nbf(_0x23a024, "<사탕 함정>", 0, "나랑 술래잡기하자!", 1, 1);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10215:
      buff_ex.push("<달콤한 개입>", "<끝없는 욕망>");
      setMnc(_0x23a024, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        for (let _0x6f4ec3 of getRoleIdx("딜", "탱", "디")) {
          deleteBuff(comp[_0x6f4ec3], "기본", "마왕 자본의 압제를 타도하라!1");
        }
        switch (_0x17c963) {
          case 1:
            for (let _0x1349da of getRoleIdx("딜", "탱", "디")) {
              tbf(comp[_0x1349da], "가뎀증", 15.66, "마왕 자본의 압제를 타도하라!1", 4);
            }
            nbf(boss, "받뎀증", 2.61, "마왕 자본의 압제를 타도하라!2", 1, 2);
            break;
          case 2:
            for (let _0x20d9b8 of getRoleIdx("딜", "탱", "디")) {
              tbf(comp[_0x20d9b8], "가뎀증", 18.27, "마왕 자본의 압제를 타도하라!1", 4);
            }
            nbf(boss, "받뎀증", 3.04, "마왕 자본의 압제를 타도하라!2", 1, 2);
            for (let _0x537cb7 of getElementIdx("풍")) {
              nbf(comp[_0x537cb7], "받속뎀", 3.92, "마왕 자본의 압제를 타도하라!3", 1, 2);
            }
            break;
          case 3:
            for (let _0x231a8b of getRoleIdx("딜", "탱", "디")) {
              tbf(comp[_0x231a8b], "가뎀증", 20.88, "마왕 자본의 압제를 타도하라!1", 4);
            }
            nbf(boss, "받뎀증", 3.48, "마왕 자본의 압제를 타도하라!2", 1, 2);
            for (let _0x199cb9 of getElementIdx("풍")) {
              nbf(comp[_0x199cb9], "받속뎀", 4.79, "마왕 자본의 압제를 타도하라!3", 1, 2);
            }
            break;
          case 4:
            for (let _0x27ed7b of getRoleIdx("딜", "탱", "디")) {
              tbf(comp[_0x27ed7b], "가뎀증", 23.49, "마왕 자본의 압제를 타도하라!1", 4);
            }
            nbf(boss, "받뎀증", 3.91, "마왕 자본의 압제를 타도하라!2", 1, 2);
            for (let _0x59e207 of getElementIdx("풍")) {
              nbf(comp[_0x59e207], "받속뎀", 5.66, "마왕 자본의 압제를 타도하라!3", 1, 2);
            }
            break;
          default:
            for (let _0x27b63b of getRoleIdx("딜", "탱", "디")) {
              tbf(comp[_0x27b63b], "가뎀증", 26.1, "마왕 자본의 압제를 타도하라!1", 4);
            }
            nbf(boss, "받뎀증", 4.35, "마왕 자본의 압제를 타도하라!2", 1, 2);
            for (let _0x39f0da of getElementIdx("풍")) {
              nbf(comp[_0x39f0da], "받속뎀", 6.53, "마왕 자본의 압제를 타도하라!3", 1, 2);
            }
            break;
        }
      };
      _0x23a024.ultafter = function () {
        for (let _0x109168 of comp) {
          _0x109168.hit();
        }
      };
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {
        tbf(all, "공고증", myCurAtk + _0x23a024.id + 30, "권력 남용1", 1);
        for (let _0x4248ef of comp) {
          _0x4248ef.hit();
        }
      };
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpAll(55);
        tbf(all, "공퍼증", 67.5, "할로윈 다양성 박사 고문1", always);
        const _0x588535 = getElementCnt("풍");
        nbf(all, "<달콤한 개입>", 0, "할로윈 다양성 박사 고문", _0x588535, 5);
        if (_0x588535 == 3) {
          for (let _0x3bf994 of comp) {
            anbf(_0x3bf994, "피격", _0x3bf994, "발효증", 16.88, "<너희 입다물어>1", 1, 8, always);
            anbf(_0x3bf994, "피격", boss, "받뎀증", 0.34, "<너희 입다물어>2", 1, 40, always);
            for (let _0x273602 of getElementIdx("풍")) {
              anbf(_0x3bf994, "피격", comp[_0x273602], "받속뎀", 0.51, "<너희 입다물어>3", 1, 40, always);
            }
          }
        }
        if (_0x588535 == 3) {
          for (let _0x2dd81e of getRoleIdx("딜", "탱", "디")) {
            if (comp[_0x2dd81e].element != 2) {
              continue;
            }
            anbf(comp[_0x2dd81e], "피격", comp[_0x2dd81e], "가뎀증", 5.06, "〈Party 해산 카운트다운〉1", 1, 8, always);
            tbf(comp[_0x2dd81e], "반격*", 4, "〈Party 해산 카운트다운〉2", always);
          }
        }
      };
      _0x23a024.passive = function () {
        ptbf(_0x23a024, "궁", all, "공고증", myCurAtk + _0x23a024.id + 30, "너희가 날 모셔야 해!1", 1, always);
        for (let _0x330bae of getRoleIdx("딜", "탱", "디")) {
          const _0x24934c = comp[_0x330bae].ultafter;
          comp[_0x330bae].ultafter = function (..._0x164c0b) {
            _0x24934c.apply(this, _0x164c0b);
            _0x23a024.hit();
          };
          const _0x2ac1ec = comp[_0x330bae].atkafter;
          comp[_0x330bae].atkafter = function (..._0x30fe7d) {
            _0x2ac1ec.apply(this, _0x30fe7d);
            _0x23a024.hit();
          };
        }
        for (let _0x3281cc of getRoleIdx("딜", "탱", "디")) {
          buff(comp[_0x3281cc], "반격*", 2.2, "모두 내 말을 들어야 해3", always, true);
          anbf(comp[_0x3281cc], "피격", comp[_0x3281cc], "<끝없는 욕망>", 0, "모두 내 말을 들어야 해", 1, 5, always);
          buff(comp[_0x3281cc], "반격*", 4.4, "모두 내 말을 들어야 해4", always, false);
          const _0x1a7343 = comp[_0x3281cc].hit;
          comp[_0x3281cc].hit = function (..._0x211b40) {
            _0x1a7343.apply(this, _0x211b40);
            const _0x880ce7 = comp[_0x3281cc].getNest("<끝없는 욕망>");
            if (_0x880ce7 >= 5) {
              setBuffOn(comp[_0x3281cc], "기본", "모두 내 말을 들어야 해3", false);
              setBuffOn(comp[_0x3281cc], "기본", "모두 내 말을 들어야 해4", true);
            }
          };
        }
        tbf(_0x23a024, "공퍼증", 43.5, "이건 내가 마땅히 누려야 할 권리야!2", always);
        atbf(_0x23a024, "방", all, "공고증", myCurAtk + _0x23a024.id + 30, "이건 내가 마땅히 누려야 할 권리야!3", 1, always);
        for (let _0x386cc3 of comp) {
          anbf(_0x386cc3, "피격", _0x386cc3, "발효증", 10.88, "이건 내가 마땅히 누려야 할 권리야!4", 1, 8, always);
        }
        tbf(_0x23a024, "공퍼증", 10, "공격+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {
          if (GLOBAL_TURN == 1) {
            for (let _0x448e97 of getRoleIdx("딜", "탱", "디")) {
              tbf(comp[_0x448e97], "공퍼증", 100, "<비다양성 사상 감지 병기>1", 1);
              tbf(comp[_0x448e97], "가뎀증", 60, "<비다양성 사상 감지 병기>2", 1);
              tbf(comp[_0x448e97], "발효증", 200, "<비다양성 사상 감지 병기>3", 1);
              tbf(comp[_0x448e97], "반격*", 15, "<비다양성 사상 감지 병기>4", 1);
            }
          }
        }
        if (GLOBAL_TURN == 1) {
          for (let _0x1c5765 of getRoleIdx("딜", "탱", "디")) {
            nbf(comp[_0x1c5765], "<끝없는 욕망>", 0, "모두 내 말을 들어야 해", 1, 5);
          }
          cdChange(_0x23a024, -4);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
        for (let _0x3c24b3 of getRoleIdx("딜", "탱", "디")) {
          setBuffNest(comp[_0x3c24b3], "기본", "모두 내 말을 들어야 해", 1);
          setBuffOn(comp[_0x3c24b3], "기본", "모두 내 말을 들어야 해3", true);
          setBuffOn(comp[_0x3c24b3], "기본", "모두 내 말을 들어야 해4", false);
        }
      };
      return _0x23a024;
    case 10216:
      buff_ex.push("<경심 철갑탄>", "<연막탄 지원>");
      _0x23a024.stack = 0;
      setMnc(_0x23a024, [373.5, 4, 436, 4, 498, 4, 560.5, 4, 622.5, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(boss, "받뎀증", 26.1, "고속 정밀 연사1", 1);
            for (let _0x190823 of getElementIdx("풍")) {
              tbf(comp[_0x190823], "받속뎀", 39.18, "고속 정밀 연사2", 1);
            }
            break;
          case 2:
            tbf(boss, "받뎀증", 30.45, "고속 정밀 연사1", 1);
            for (let _0x5060f8 of getElementIdx("풍")) {
              tbf(comp[_0x5060f8], "받속뎀", 45.71, "고속 정밀 연사2", 1);
            }
            break;
          case 3:
            tbf(boss, "받뎀증", 34.8, "고속 정밀 연사1", 1);
            for (let _0x1e0252 of getElementIdx("풍")) {
              tbf(comp[_0x1e0252], "받속뎀", 52.24, "고속 정밀 연사2", 1);
            }
            break;
          case 4:
            tbf(boss, "받뎀증", 39.15, "고속 정밀 연사1", 1);
            for (let _0xb9a542 of getElementIdx("풍")) {
              tbf(comp[_0xb9a542], "받속뎀", 58.77, "고속 정밀 연사2", 1);
            }
            break;
          default:
            tbf(boss, "받뎀증", 43.5, "고속 정밀 연사1", 1);
            for (let _0x386db7 of getElementIdx("풍")) {
              tbf(comp[_0x386db7], "받속뎀", 65.3, "고속 정밀 연사2", 1);
            }
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        if (_0x23a024.stack >= 3) {
          if (_0x23a024.isLeader) {
            setBuffOn(_0x23a024, "발동", "<고고한 저격수>1", true);
            setBuffOn(_0x23a024, "발동", "<고고한 저격수>2", true);
            setBuffOn(_0x23a024, "발동", "<고고한 저격수>3", true);
            setBuffOn(_0x23a024, "발동", "<고고한 저격수>4", true);
          }
          setBuffOn(_0x23a024, "발동", "탄약 장전1", true);
          setBuffOn(_0x23a024, "발동", "관통 사격", true);
        }
        ultLogic(_0x23a024, 5);
        if (_0x23a024.stack >= 3) {
          nbf(_0x23a024, "<경심 철갑탄>", 0, "조준 사격", -3, 3);
          _0x23a024.stack = 0;
          if (_0x23a024.isLeader) {
            setBuffOn(_0x23a024, "발동", "<고고한 저격수>1", false);
            setBuffOn(_0x23a024, "발동", "<고고한 저격수>2", false);
            setBuffOn(_0x23a024, "발동", "<고고한 저격수>3", false);
            setBuffOn(_0x23a024, "발동", "<고고한 저격수>4", false);
          }
          setBuffOn(_0x23a024, "발동", "탄약 장전1", false);
          setBuffOn(_0x23a024, "발동", "관통 사격", false);
        }
      };
      _0x23a024.atkbefore = function () {
        nbf(_0x23a024, "<경심 철갑탄>", 0, "조준 사격", 1, 3);
        _0x23a024.stack += 1;
        if (_0x23a024.stack > 3) {
          _0x23a024.stack = 3;
        }
      };
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        const _0x282238 = _0x23a024.stack;
        if (_0x282238 >= 3) {
          if (_0x23a024.isLeader) {
            setBuffOn(_0x23a024, "발동", "<고고한 저격수>1", true);
            setBuffOn(_0x23a024, "발동", "<고고한 저격수>2", true);
            setBuffOn(_0x23a024, "발동", "<고고한 저격수>3", true);
            setBuffOn(_0x23a024, "발동", "<고고한 저격수>4", true);
          }
          setBuffOn(_0x23a024, "발동", "탄약 장전1", true);
          setBuffOn(_0x23a024, "발동", "관통 사격", true);
        }
        atkLogic(_0x23a024);
        if (_0x23a024.isLeader) {
          for (let _0x389241 of comp) {
            if (_0x23a024.id != _0x389241.id) {
              nbf(_0x389241, "<연막탄 지원>", 0, "총기 전문가의 직감", 1, 3);
              if (_0x389241.getNest("<연막탄 지원>") >= 3) {
                setBuffOn(_0x389241, "발동", "<연막탄 지원>1", true);
                setBuffOnAll(_0x389241, "발동", "<연막탄 지원>2", true);
              }
            }
          }
        }
        if (_0x282238 >= 3) {
          nbf(_0x23a024, "<경심 철갑탄>", 0, "조준 사격", -3, 3);
          _0x23a024.stack = 0;
          if (_0x23a024.isLeader) {
            setBuffOn(_0x23a024, "발동", "<고고한 저격수>1", false);
            setBuffOn(_0x23a024, "발동", "<고고한 저격수>2", false);
            setBuffOn(_0x23a024, "발동", "<고고한 저격수>3", false);
            setBuffOn(_0x23a024, "발동", "<고고한 저격수>4", false);
          }
          setBuffOn(_0x23a024, "발동", "탄약 장전1", false);
          setBuffOn(_0x23a024, "발동", "관통 사격", false);
        } else if (_0x23a024.stack >= 3) {
          if (_0x23a024.isLeader) {
            setBuffOn(_0x23a024, "기본", "<고고한 저격수>1", true);
            setBuffOn(_0x23a024, "기본", "<고고한 저격수>2", true);
            setBuffOn(_0x23a024, "기본", "<고고한 저격수>3", true);
            setBuffOn(_0x23a024, "기본", "<고고한 저격수>4", true);
          }
          setBuffOn(_0x23a024, "기본", "탄약 장전1", true);
          setBuffOn(_0x23a024, "기본", "관통 사격", true);
        }
      };
      _0x23a024.leader = function () {
        hpUpAll(45);
        tbf(all, "공퍼증", 50, "총기 전문가의 직감1", always);
        if (getRoleCnt("디") >= 1) {
          tbf(all, "가뎀증", -500, "총기 전문가의 직감2", always);
        }
        buff(_0x23a024, "공퍼증", 166, "<고고한 저격수>1", always, true);
        buff(_0x23a024, "가뎀증", 64.5, "<고고한 저격수>2", always, true);
        buff(_0x23a024, "궁뎀증", 27, "<고고한 저격수>3", always, true);
        buff(_0x23a024, "궁추가*", 54, "<고고한 저격수>4", always, true);
        for (let _0x5a1b1f of comp) {
          if (_0x23a024.id != _0x5a1b1f.id) {
            buff(_0x5a1b1f, "궁", boss, "받뎀증", 5.38, "<연막탄 지원>1", 1, always, "발동", false);
            for (let _0x523c17 of getElementIdx("풍")) {
              buff(_0x5a1b1f, "궁", comp[_0x523c17], "받속뎀", 8.13, "<연막탄 지원>2", 1, always, "발동", false);
            }
            const _0x43e778 = _0x5a1b1f.ultimate;
            _0x5a1b1f.ultimate = function (..._0xef5e1c) {
              _0x43e778.apply(this, _0xef5e1c);
              if (_0x5a1b1f.getNest("<연막탄 지원>") >= 3) {
                nbf(_0x5a1b1f, "<연막탄 지원>", 0, "총기 전문가의 직감", -3, 3);
                setBuffOn(_0x5a1b1f, "발동", "<연막탄 지원>1", false);
                setBuffOnAll(_0x5a1b1f, "발동", "<연막탄 지원>2", false);
              }
            };
          }
        }
      };
      _0x23a024.passive = function () {
        buff(_0x23a024, "공퍼증", 435, "탄약 장전1", always, true);
        if (_0x23a024.isLeader) {
          buff(_0x23a024, "공격", _0x23a024, "off", "기본", "<고고한 저격수>1", 1, always, "발동", true);
          buff(_0x23a024, "공격", _0x23a024, "off", "기본", "<고고한 저격수>2", 1, always, "발동", true);
          buff(_0x23a024, "공격", _0x23a024, "off", "기본", "<고고한 저격수>3", 1, always, "발동", true);
          buff(_0x23a024, "공격", _0x23a024, "off", "기본", "<고고한 저격수>4", 1, always, "발동", true);
        }
        buff(_0x23a024, "공격", _0x23a024, "off", "기본", "탄약 장전1", 1, always, "발동", true);
        buff(_0x23a024, "공격", _0x23a024, "off", "기본", "관통 사격", 1, always, "발동", true);
        buff(_0x23a024, "궁뎀증", 54.4, "관통 사격", always, true);
        ptbf(_0x23a024, "궁", _0x23a024, "<바람의 축복>", 0, "퀵 리로드2", 1, always);
        anbf(_0x23a024, "<바람의 축복>", _0x23a024, "가뎀증", 6.52, "퀵 리로드3", 1, 5, always);
        tbf(_0x23a024, "가뎀증", 6, "데미지+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {
          if (GLOBAL_TURN == 1) {
            for (let _0x3160a9 of comp) {
              if (_0x3160a9.id != _0x23a024.id && _0x3160a9.element == 2) {
                cdChange(_0x3160a9, -4);
              }
            }
          }
        }
        if (GLOBAL_TURN == 1) {
          nbf(_0x23a024, "<경심 철갑탄>", 0, "조준 사격", 3, 3);
          _0x23a024.stack = 3;
          cdChange(_0x23a024, -4);
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10217:
      buff_ex.push("<달롬의 첨단 과학 기술>");
      setMnc(_0x23a024, [0, 3, 0, 3, 0, 3, 0, 3, 0, 3], _0x17c963);
      _0x23a024.ultbefore = function () {
        for (let _0x333b98 of getRoleIdx("딜", "탱", "디")) {
          deleteBuff(comp[_0x333b98], "기본", "신대륙 정복2");
          deleteBuff(comp[_0x333b98], "기본", "신대륙 정복3");
          deleteBuff(comp[_0x333b98], "기본", "신대륙 정복4");
        }
        deleteBuff(boss, "기본", "신대륙 정복5");
        switch (_0x17c963) {
          case 1:
            for (let _0x24765b of getRoleIdx("딜", "탱", "디")) {
              tbf(comp[_0x24765b], "가뎀증", 7.56, "신대륙 정복2", 3);
              tbf(comp[_0x24765b], "궁추가*", 9.5, "신대륙 정복3", 3);
              tbf(comp[_0x24765b], "평발동*", 2.8, "신대륙 정복4", 3);
            }
            break;
          case 2:
            for (let _0xcc6db3 of getRoleIdx("딜", "탱", "디")) {
              tbf(comp[_0xcc6db3], "가뎀증", 8.82, "신대륙 정복2", 3);
              tbf(comp[_0xcc6db3], "궁추가*", 11.1, "신대륙 정복3", 3);
              tbf(comp[_0xcc6db3], "평발동*", 3.3, "신대륙 정복4", 3);
            }
            tbf(boss, "받뎀증", 5.88, "신대륙 정복5", 3);
            break;
          case 3:
            for (let _0x2660df of getRoleIdx("딜", "탱", "디")) {
              tbf(comp[_0x2660df], "가뎀증", 10.08, "신대륙 정복2", 3);
              tbf(comp[_0x2660df], "궁추가*", 12.6, "신대륙 정복3", 3);
              tbf(comp[_0x2660df], "평발동*", 3.8, "신대륙 정복4", 3);
            }
            tbf(boss, "받뎀증", 6.72, "신대륙 정복5", 3);
            break;
          case 4:
            for (let _0x14e73a of getRoleIdx("딜", "탱", "디")) {
              tbf(comp[_0x14e73a], "가뎀증", 11.34, "신대륙 정복2", 3);
              tbf(comp[_0x14e73a], "궁추가*", 14.2, "신대륙 정복3", 3);
              tbf(comp[_0x14e73a], "평발동*", 4.2, "신대륙 정복4", 3);
            }
            tbf(boss, "받뎀증", 7.56, "신대륙 정복5", 3);
            break;
          default:
            for (let _0x2f53f7 of getRoleIdx("딜", "탱", "디")) {
              tbf(comp[_0x2f53f7], "가뎀증", 12.6, "신대륙 정복2", 3);
              tbf(comp[_0x2f53f7], "궁추가*", 15.8, "신대륙 정복3", 3);
              tbf(comp[_0x2f53f7], "평발동*", 4.7, "신대륙 정복4", 3);
            }
            tbf(boss, "받뎀증", 8.4, "신대륙 정복5", 3);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
        for (let _0x4d9789 of comp) {
          _0x4d9789.bless("<빛의 축복>");
        }
        for (let _0x3ff78a of comp) {
          if (_0x23a024.id != _0x3ff78a.id && _0x3ff78a.element == 3) {
            if (_0x3ff78a.getNest("<달롬의 첨단 과학 기술>") >= 3) {
              if (_0x3ff78a.role == 0) {
                setBuffOnAll(_0x3ff78a, "발동", "과학기술위원1", true);
                setBuffOnAll(_0x3ff78a, "발동", "과학기술위원2", true);
              }
              setBuffOn(_0x3ff78a, "발동", "과학기술위원", true);
            }
          }
        }
      };
      _0x23a024.atkbefore = function () {
        for (let _0xed5d6b of comp) {
          if (_0x23a024.id != _0xed5d6b.id) {
            tbf(_0xed5d6b, "공고증", myCurAtk + _0x23a024.id + 25, "무기 점검", 1);
          }
        }
      };
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
        for (let _0x39f77e of comp) {
          if (_0x23a024.id != _0x39f77e.id && _0x39f77e.element == 3) {
            if (_0x39f77e.getNest("<달롬의 첨단 과학 기술>") >= 3) {
              if (_0x39f77e.role == 0) {
                setBuffOnAll(_0x39f77e, "발동", "과학기술위원1", true);
                setBuffOnAll(_0x39f77e, "발동", "과학기술위원2", true);
              }
              setBuffOn(_0x39f77e, "발동", "과학기술위원", true);
            }
          }
        }
      };
      _0x23a024.leader = function () {
        hpUpAll(55);
        tbf(all, "공퍼증", 97.5, "구대륙에서 온 정복자1", always);
        if (getElKind() == 1) {
          for (let _0x5cb97d of getRoleIdx("딜", "탱", "디")) {
            tbf(comp[_0x5cb97d], "가뎀증", 58.5, "<제1중대! 집합!>1", always);
            tbf(comp[_0x5cb97d], "궁뎀증", 12.19, "<제1중대! 집합!>2", always);
            tbf(comp[_0x5cb97d], "발효증", 85.31, "<제1중대! 집합!>3", always);
            tbf(comp[_0x5cb97d], "평발동*", 21.9, "<제1중대! 집합!>4", always);
            tbf(comp[_0x5cb97d], "궁추가*", 73.3, "<제1중대! 집합!>5", always);
          }
          for (let _0x2b9894 of getRoleIdx("힐", "섶")) {
            anbf(comp[_0x2b9894], "공격", boss, "받뎀증", 2.17, "<수행 비서>1", 1, 18, always);
            for (let _0x309117 of getElementIdx("광")) {
              anbf(comp[_0x2b9894], "공격", comp[_0x309117], "받속뎀", 3.25, "<수행 비서>2", 1, 18, always);
            }
          }
        }
      };
      _0x23a024.passive = function () {
        for (let _0x3ea1fd of comp) {
          if (_0x3ea1fd.id != _0x23a024.id) {
            atbf(_0x23a024, "궁", _0x3ea1fd, "공고증", myCurAtk + _0x23a024.id + 25, "문명 전파자2", 1, always);
          }
        }
        for (let _0x2b6dc0 of comp) {
          anbf(_0x2b6dc0, "<빛의 축복>", _0x2b6dc0, "공퍼증", 2.1, "문명 전파자4", 1, 10, always);
        }
        for (let _0x2970a9 of comp) {
          if (_0x23a024.id != _0x2970a9.id) {
            anbf(_0x23a024, "공격", _0x2970a9, "<달롬의 첨단 과학 기술>", 0, "과학기술위원", 1, 3, always);
          }
        }
        for (let _0x5d814d of getRoleIdx("딜")) {
          if (comp[_0x5d814d].element == 3) {
            buff(comp[_0x5d814d], "공격", comp[_0x5d814d], "제거", "기본", "과학기술위원1", 1, always, "발동", true);
            buff(comp[_0x5d814d], "공격", comp[_0x5d814d], "궁뎀증", 2.62, "과학기술위원1", 4, always, "발동", true);
            buff(comp[_0x5d814d], "공격", comp[_0x5d814d], "제거", "기본", "과학기술위원2", 1, always, "발동", true);
            buff(comp[_0x5d814d], "공격", comp[_0x5d814d], "발효증", 18.38, "과학기술위원2", 4, always, "발동", true);
            buff(comp[_0x5d814d], "공격", comp[_0x5d814d], "<달롬의 첨단 과학 기술>", 0, "과학기술위원", -3, 3, always, "발동", true);
            const _0x440668 = comp[_0x5d814d].attack;
            comp[_0x5d814d].attack = function (..._0x2ab25f) {
              _0x440668.apply(this, _0x2ab25f);
              if (comp[_0x5d814d].getNest("<달롬의 첨단 과학 기술>") < 3) {
                setBuffOnAll(comp[_0x5d814d], "발동", "과학기술위원1", false);
                setBuffOnAll(comp[_0x5d814d], "발동", "과학기술위원2", false);
                setBuffOn(comp[_0x5d814d], "발동", "과학기술위원", false);
              }
            };
            const _0x207a08 = comp[_0x5d814d].ultimate;
            comp[_0x5d814d].ultimate = function (..._0x2aa6d9) {
              _0x207a08.apply(this, _0x2aa6d9);
              if (comp[_0x5d814d].getNest("<달롬의 첨단 과학 기술>") < 3) {
                setBuffOnAll(comp[_0x5d814d], "발동", "과학기술위원1", false);
                setBuffOnAll(comp[_0x5d814d], "발동", "과학기술위원2", false);
                setBuffOn(comp[_0x5d814d], "발동", "과학기술위원", false);
              }
            };
          }
        }
        for (let _0x37edff of getRoleIdx("탱", "섶")) {
          if (comp[_0x37edff].element == 3) {
            buff(comp[_0x37edff], "평", comp[_0x37edff], "<달롬의 첨단 과학 기술>", 0, "과학기술위원", -3, 3, always, "발동", true);
            const _0x4df25d = comp[_0x37edff].attack;
            comp[_0x37edff].attack = function (..._0x1a3454) {
              const _0x4605db = comp[_0x37edff].getNest("<달롬의 첨단 과학 기술>");
              _0x4df25d.apply(this, _0x1a3454);
              if (_0x4605db >= 3) {
                for (let _0x4dc22d of comp) {
                  _0x4dc22d.bless("<빛의 축복>");
                }
                setBuffOn(comp[_0x37edff], "발동", "과학기술위원", false);
              }
            };
          }
        }
        for (let _0x1ec2ff of getRoleIdx("디")) {
          if (comp[_0x1ec2ff].element == 3) {
            buff(comp[_0x1ec2ff], "궁", comp[_0x1ec2ff], "<달롬의 첨단 과학 기술>", 0, "과학기술위원", -3, 3, always, "발동", true);
            const _0x3a9139 = comp[_0x1ec2ff].ultimate;
            comp[_0x1ec2ff].ultimate = function (..._0x293d32) {
              const _0x4bac76 = comp[_0x1ec2ff].getNest("<달롬의 첨단 과학 기술>");
              _0x3a9139.apply(this, _0x293d32);
              if (_0x4bac76 >= 3) {
                for (let _0x455d47 of comp) {
                  _0x455d47.bless("<빛의 축복>");
                }
                setBuffOn(comp[_0x1ec2ff], "발동", "과학기술위원", false);
              }
            };
          }
        }
        for (let _0x83ddd5 of comp) {
          if (_0x23a024.id != _0x83ddd5.id && _0x83ddd5.element == 3) {
            nbf(_0x83ddd5, "<달롬의 첨단 과학 기술>", 0, "과학기술위원", 3, 3);
          }
        }
        for (let _0x3a0b55 of comp) {
          for (let _0x1bad6d of getElementIdx("광")) {
            atbf(_0x3a0b55, "<빛의 축복>", _0x3a0b55, "트리거", [_0x3a0b55, "공격", comp[_0x1bad6d], "받속뎀", 0.25, "<반마도 장비>", 1, 50, 3, "발동", true], "공국 무기고", 1, always);
          }
        }
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case -1:
      setMnc(_0x23a024, [], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
          case 2:
          case 3:
          case 4:
          default:
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {};
      _0x23a024.passive = function () {};
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10009:
      setMnc(_0x23a024, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            tbf(comp[2], "공퍼증", 30, "마도 메이드의 비기 - 마력 주입", 1);
            break;
          case 2:
            tbf(comp[2], "공퍼증", 35, "마도 메이드의 비기 - 마력 주입", 1);
            break;
          case 3:
            tbf(comp[2], "공퍼증", 40, "마도 메이드의 비기 - 마력 주입", 1);
            break;
          case 4:
            tbf(comp[2], "공퍼증", 45, "마도 메이드의 비기 - 마력 주입", 1);
            break;
          default:
            tbf(comp[2], "공퍼증", 50, "마도 메이드의 비기 - 마력 주입", 1);
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
        for (let _0x3721b5 of comp) {
          _0x3721b5.heal();
        }
        cdChange(comp[2], -4);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
        for (let _0x4df6af of comp) {
          _0x4df6af.heal();
        }
      };
      _0x23a024.leader = function () {
        tbf(comp[2], "공퍼증", 50, "아이카의 밀착 서비스", always);
      };
      _0x23a024.passive = function () {
        atbf(_0x23a024, "평", comp[2], "공퍼증", 10, "최고의 원군", 1, always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10013:
      setMnc(_0x23a024, [266, 3, 282, 3, 298, 3, 315, 3, 331, 3], _0x17c963);
      _0x23a024.ultbefore = function () {};
      _0x23a024.ultafter = function () {
        nbf(boss, "받뎀증", 10, "신무이도류-멸천일격", 1, 3);
      };
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        tbf(boss, "받뎀증", 30, "신기-약점 간파", 50);
      };
      _0x23a024.passive = function () {
        tbf(_0x23a024, "평발동*", 30, "신무류-추격 베기", always);
        anbf(_0x23a024, "공격", boss, "받뎀증", 5, "신무류-무쇠 가르기", 1, 5, always);
        anbf(_0x23a024, "공격", _0x23a024, "공퍼증", 6, "호기만천", 1, 5, always);
        tbf(_0x23a024, "일뎀증", 10, "일반 공격 데미지+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10036:
      setMnc(_0x23a024, [0, 5, 0, 5, 0, 5, 0, 5, 0, 4], _0x17c963);
      _0x23a024.ultbefore = function () {};
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        hpUpMe(_0x23a024, 30);
      };
      _0x23a024.passive = function () {
        let _0x3b6237 = comp.reduce((_0xb5827d, _0x43302e) => {
          if (_0x43302e.curHp < _0xb5827d.curHp) {
            return _0x43302e;
          } else {
            return _0xb5827d;
          }
        }, comp[0]);
        atbf(_0x23a024, "평", _0x3b6237, "힐", 100, "에너지 젤리", 1, always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {
          if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 4 == 0) {
            tbf(boss, "받뎀증", 15, "나는 착한 슬라임이야", 2);
          }
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10038:
      setMnc(_0x23a024, [445, 5, 514, 5, 583, 5, 652, 5, 721, 5], _0x17c963);
      _0x23a024.ultbefore = function () {
        for (let _0x3771a5 of getElementIdx("광")) {
          nbf(comp[_0x3771a5], "받속뎀", 30, "필살기-마법소녀 빔!", 1, 1);
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
        if (Math.random() < 0.5) {
          cdChange(_0x23a024, -2);
        }
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        for (let _0x2c2e3a of getElementIdx("광")) {
          tbf(comp[_0x2c2e3a], "공퍼증", 30, "사랑과 희망의 빛!1", always);
        }
        tbf(_0x23a024, "궁뎀증", 25, "사랑과 희망의 빛!2", always);
      };
      _0x23a024.passive = function () {
        atbf(_0x23a024, "궁", _0x23a024, "궁뎀증", 50, "정의는 굴복하지 않아!", 4, always);
        for (let _0x2f7eb5 of getElementIdx("광")) {
          atbf(_0x23a024, "궁", comp[_0x2f7eb5], "받속뎀", 20, "마법소녀의 아우라!", 4, always);
        }
        tbf(_0x23a024, "궁뎀증", 10, "궁극기 데미지+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10041:
      setMnc(_0x23a024, [0, 5, 0, 5, 0, 5, 0, 5, 0, 5], _0x17c963);
      _0x23a024.ultbefore = function () {
        tbf(_0x23a024, "공퍼증", 20, "전 제 직업이 정말 좋아요!1", 4);
        switch (_0x17c963) {
          case 1:
            break;
          case 2:
            break;
          case 3:
            break;
          case 4:
            break;
          default:
            break;
        }
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
        for (let _0x5a794b of comp) {
          _0x5a794b.heal();
        }
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
        for (let _0x75add5 of comp) {
          _0x75add5.heal();
        }
      };
      _0x23a024.leader = function () {
        tbf(all, "공퍼증", 30, "모험가 길드에 오신 것을 환영합니다!1", always);
        hpUpAll(30);
      };
      _0x23a024.passive = function () {
        for (let _0xd45a01 of comp) {
          if (_0xd45a01.id != _0x23a024.id) {
            nbf(_0xd45a01, "일뎀증", 20, "오늘의 의뢰들이에요~1", 1, 1);
          }
        }
        for (let _0x403215 of comp) {
          if (_0x403215.id != _0x23a024.id) {
            nbf(_0x403215, "궁뎀증", 10, "오늘의 의뢰들이에요~2", 1, 1);
          }
        }
        _0x23a024.cd -= 1;
        _0x23a024.curCd -= 1;
        atbf(_0x23a024, "공격", all, "일뎀증", 4, "여러분의 든든한 지원군이 되어드릴 거에요!", 5, always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10055:
      setMnc(_0x23a024, [0, 3, 0, 3, 0, 3, 0, 3, 0, 3], _0x17c963);
      _0x23a024.ultbefore = function () {
        switch (_0x17c963) {
          case 1:
            nbf(all, "공퍼증", 1.5, "신사의 무희1", 1, 10);
            break;
          case 2:
            nbf(all, "공퍼증", 1.75, "신사의 무희1", 1, 10);
            break;
          case 3:
            nbf(all, "공퍼증", 2, "신사의 무희1", 1, 10);
            break;
          case 4:
            nbf(all, "공퍼증", 2.25, "신사의 무희1", 1, 10);
            break;
          default:
            nbf(all, "공퍼증", 2.5, "신사의 무희1", 1, 10);
            break;
        }
        tbf(all, "공고증", myCurAtk + _0x23a024.id + 25, "신사의 무희2", 1);
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
        for (let _0x12a5cd of comp) {
          _0x12a5cd.heal();
        }
      };
      _0x23a024.atkbefore = function () {
        tbf(all, "공고증", myCurAtk + _0x23a024.id + 25, "유혹의 자태", 1);
      };
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {
        tbf(_0x23a024, "공퍼증", 50, "순결한 무희", always);
        hpUpAll(10);
      };
      _0x23a024.passive = function () {
        anbf(_0x23a024, "평", all, "궁뎀증", 2, "요조숙녀", 1, 5, always);
        anbf(_0x23a024, "궁", all, "일뎀증", 10, "도읍 최고의 무녀", 1, 2, always);
        anbf(_0x23a024, "궁", all, "공퍼증", 10, "전국 최고의 무녀", 1, 3, always);
        tbf(_0x23a024, "공퍼증", 10, "공격력 증가", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {}
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    case 10012:
      setMnc(_0x23a024, [133, 3, 149, 3, 166, 3, 182, 3, 199, 3], _0x17c963);
      _0x23a024.ultbefore = function () {
        tbf(boss, "받뎀증", 20, "인법 - 고통 흘리기", 1);
      };
      _0x23a024.ultafter = function () {};
      _0x23a024.ultimate = function () {
        ultLogic(_0x23a024);
      };
      _0x23a024.atkbefore = function () {};
      _0x23a024.atkafter = function () {};
      _0x23a024.attack = function () {
        atkLogic(_0x23a024);
      };
      _0x23a024.leader = function () {};
      _0x23a024.passive = function () {
        tbf(_0x23a024, "평추가*", 33, "즉효성 독약", always);
        tbf(_0x23a024, "공퍼증", 20, "집중인법 - 일엽", 4);
        tbf(boss, "받뎀증", 20, "선제인법 - 식갑", 1);
        tbf(_0x23a024, "일뎀증", 10, "일반 공격 데미지+", always);
      };
      _0x23a024.defense = function () {
        _0x23a024.act_defense();
      };
      _0x23a024.turnstart = function () {
        if (_0x23a024.isLeader) {
          if (GLOBAL_TURN == 1) {
            for (let _0x30ac36 of comp) {
              cdChange(_0x30ac36, -4);
            }
          }
        }
      };
      _0x23a024.turnover = function () {
        if (_0x23a024.isLeader) {}
      };
      return _0x23a024;
    default:
      return null;
  }
}
function ultLogic(_0x4b8d1d, _0x521a37 = 1) {
  lastDmg = 0;
  lastAddDmg = 0;
  lastAtvDmg = 0;
  lastDotDmg = 0;
  lastRefDmg = 0;
  whoActed = _0x4b8d1d.id;
  _0x4b8d1d.ultbefore();
  bossUltAttack(_0x4b8d1d, _0x521a37);
  _0x4b8d1d.ultafter();
  _0x4b8d1d.act_ultimate();
  if (lastDmg > 0 || lastAddDmg > 0) {
    boss.hit();
  }
}
function atkLogic(_0x1311f1, _0x477878 = 1) {
  lastDmg = 0;
  lastAddDmg = 0;
  lastAtvDmg = 0;
  lastDotDmg = 0;
  lastRefDmg = 0;
  whoActed = _0x1311f1.id;
  _0x1311f1.atkbefore();
  bossAttack(_0x1311f1, _0x477878);
  _0x1311f1.atkafter();
  _0x1311f1.act_attack();
  if (lastDmg > 0 || lastAddDmg > 0) {
    boss.hit();
  }
}
let atkOverflowed = false;
function bossAttack(_0x3cfda2, _0x3114f7) {
  const _0x5bf15e = getBuffSizeList(_0x3cfda2);
  let _0x37f6c0 = _0x3cfda2.getAtkDmg(_0x5bf15e) * getInt(_0x3cfda2, boss, _0x5bf15e);
  let _0x1f7abb = _0x3cfda2.getHpAtkDmg(_0x5bf15e) * getInt(_0x3cfda2, boss, _0x5bf15e);
  if (_0x37f6c0 <= 0) {
    _0x37f6c0 = 0;
  }
  if (_0x1f7abb <= 0) {
    _0x1f7abb = 0;
  }
  if (boss.def) {
    let _0x4d33c0 = 0.5 - getBossBuffSizeList(boss)[21];
    if (_0x4d33c0 < 0) {
      _0x4d33c0 = 0;
    }
    _0x37f6c0 = _0x37f6c0 * (1 - _0x4d33c0);
    _0x1f7abb = _0x1f7abb * (1 - _0x4d33c0);
  }
  if (_0x37f6c0 / _0x3114f7 > overflowDmg) {
    _0x37f6c0 = overflowDmg * _0x3114f7;
    isOverflowed[0] = true;
  }
  boss.hp -= lastDmg = _0x37f6c0;
  boss.hp -= lastAddDmg = _0x1f7abb;
  if (consoleOn) {
    for (let _0x23fd06 = 0; _0x23fd06 < _0x3114f7; _0x23fd06++) {
      console.log("평타 - " + _0x37f6c0 / _0x3114f7);
    }
  }
}
let overflowed = false;
function bossUltAttack(_0x5e2472, _0x35b2d6) {
  const _0x54fcf0 = getBuffSizeList(_0x5e2472);
  let _0x55f8f5 = _0x5e2472.getUltDmg(_0x54fcf0) * getInt(_0x5e2472, boss, _0x54fcf0);
  let _0x12ec36 = _0x5e2472.getHpUltDmg(_0x54fcf0) * getInt(_0x5e2472, boss, _0x54fcf0);
  if (_0x55f8f5 <= 0) {
    _0x55f8f5 = 0;
  }
  if (_0x12ec36 <= 0) {
    _0x12ec36 = 0;
  }
  if (boss.def) {
    let _0x237473 = 0.5 - getBossBuffSizeList(boss)[21];
    if (_0x237473 < 0) {
      _0x237473 = 0;
    }
    _0x55f8f5 = _0x55f8f5 * (1 - _0x237473);
    _0x12ec36 = _0x12ec36 * (1 - _0x237473);
  }
  if (_0x55f8f5 / _0x35b2d6 > overflowDmg) {
    _0x55f8f5 = overflowDmg * _0x35b2d6;
    isOverflowed[0] = true;
  }
  boss.hp -= lastDmg = _0x55f8f5;
  boss.hp -= lastAddDmg = _0x12ec36;
  _0x5e2472.curCd = _0x5e2472.cd;
  if (consoleOn) {
    for (let _0x573b7a = 0; _0x573b7a < _0x35b2d6; _0x573b7a++) {
      console.log("궁극 - " + _0x55f8f5 / _0x35b2d6);
    }
  }
}
function getElKind() {
  let _0x1cb0ff = 0;
  let _0x5e5d2c = ["화", "수", "풍", "광", "암"];
  for (let _0x3f80b7 of _0x5e5d2c) {
    if (getElementCnt(_0x3f80b7) > 0) {
      _0x1cb0ff++;
    }
  }
  return _0x1cb0ff;
}
function getRoKind() {
  let _0x5c7094 = 0;
  let _0x14bedc = ["딜", "힐", "탱", "섶", "디"];
  for (let _0xbc66f4 of _0x14bedc) {
    if (getRoleCnt(_0xbc66f4) > 0) {
      _0x5c7094++;
    }
  }
  return _0x5c7094;
}
const fixSet = new Set(["궁추가+", "궁발동+", "공발동+", "행발동+", "공고증", "평추가+", "평발동+", "아머", "도트뎀"]);
function get_buff_all(_0x5a7e65) {
  if (_0x5a7e65 == -1) {
    return allBuffToString(boss);
  } else {
    return allBuffToString(comp[_0x5a7e65]);
  }
}
function get_buff_simple(_0x491609) {
  if (_0x491609 == -1) {
    return buffListToString(boss);
  } else {
    return buffListToString(comp[_0x491609]);
  }
}
function buffListToString(_0x357d57) {
  const _0x4cbc56 = getBossBuffSizeList(_0x357d57);
  const _0x18f299 = [t("버프요약") + " - " + t(_0x357d57.name), ""];
  _0x18f299.push("HP : " + _0x357d57.hp.toFixed(0));
  _0x18f299.push("ATK : " + _0x357d57.getCurAtk().toFixed(0));
  _0x18f299.push(t("현재 아머 수치") + " : " + _0x357d57.getArmor().toFixed(0));
  for (let _0x5841a4 = 0, _0x5c55a9; _0x5841a4 < _0x4cbc56.length; _0x5841a4++) {
    if (_0x4cbc56[_0x5841a4] == 0) {
      continue;
    }
    if (fixSet.has(txts[_0x5841a4])) {
      _0x5c55a9 = Math.floor(_0x4cbc56[_0x5841a4]);
    } else {
      _0x5c55a9 = Math.floor(_0x4cbc56[_0x5841a4] * 100000) / 1000 + "%";
    }
    _0x18f299.push(t(txts[_0x5841a4]) + " : " + _0x5c55a9);
  }
  return _0x18f299.join("<hr>");
}
function allBuffToString(_0x4d9949) {
  const _0x469f92 = [..._0x4d9949.buff];
  const _0x6bced7 = [t("버프상세") + " - " + t(_0x4d9949.name), ""];
  for (const _0x5ea772 of _0x469f92) {
    let _0x22a24d;
    if (fixSet.has(_0x5ea772.type) && typeof _0x5ea772.size != "string") {
      _0x22a24d = " " + Math.floor(_0x5ea772.size / 100);
    } else if (typeof _0x5ea772.size == "string" && (_0x5ea772.size.charAt(0) == myCurAtk || _0x5ea772.size.charAt(0) == myCurShd)) {
      let _0xe34539 = _0x5ea772.size.slice(1);
      let _0x446dec = _0xe34539.slice(0, 5);
      let _0x3451e2 = _0xe34539.slice(5);
      let _0xd5fce3 = comp.filter(_0x4e9f80 => _0x4e9f80.id == Number(_0x446dec))[0];
      const _0x34ceed = _0xd5fce3.name;
      const _0xd9fc0d = _0x5ea772.size.charAt(0) == myCurAtk ? t("공") : t("아머");
      _0x22a24d = " 『" + t(_0x34ceed) + t("의") + " " + _0xd9fc0d + " " + _0x3451e2 + "%" + t("만큼") + "』";
    } else if (_0x5ea772.type == "제거") {
      let _0x13353f = _0x5ea772.ex >= 100 ? t("상시") : "" + (_0x5ea772.ex - GLOBAL_TURN) + t("턴");
      _0x6bced7.push(t(_0x5ea772.act + "시") + " " + (_0x5ea772.who == all ? t("모두") : t(_0x5ea772.who.name)) + t("의") + " " + _0x5ea772.name + " " + t(_0x5ea772.size) + t("버프 제거") + " (" + _0x13353f + ")");
      continue;
    } else if (_0x5ea772.type == "트리거") {
      const _0x4697bd = _0x5ea772.size;
      let _0xd284a7 = _0x5ea772.ex >= 100 ? t("상시") : "" + (_0x5ea772.ex - GLOBAL_TURN) + t("턴");
      const _0x1095d9 = _0x4697bd[3] == "제거" ? t("제거") : t("발동");
      _0x6bced7.push(t(_0x5ea772.act + "시") + " " + t(_0x4697bd[1] + "시") + " " + _0x4697bd[5] + " " + _0x1095d9 + " (" + _0xd284a7 + ")" + (_0x5ea772.on ? "" : " (" + t("미발동") + ")") + " : " + (lang == "ko" ? _0x5ea772.name : ""));
      continue;
    } else if (_0x5ea772.type == "on" || _0x5ea772.type == "off") {
      continue;
    } else {
      _0x22a24d = _0x5ea772.size == 0 ? "" : " " + _0x5ea772.size + "%";
    }
    if (isNest(_0x5ea772)) {
      _0x6bced7.push("" + t(_0x5ea772.type) + _0x22a24d + " " + _0x5ea772.nest + t("중첩") + " (" + t("최대") + " " + _0x5ea772.maxNest + t("중첩") + ")" + (_0x5ea772.on ? "" : " (" + t("미발동") + ")") + " : " + (lang == "ko" ? _0x5ea772.name : ""));
    } else if (isTurn(_0x5ea772)) {
      let _0x4d9d79 = _0x5ea772.turn >= 100 ? t("상시") : "" + (_0x5ea772.turn - GLOBAL_TURN) + t("턴");
      _0x6bced7.push("" + t(_0x5ea772.type) + _0x22a24d + " (" + _0x4d9d79 + ")" + (_0x5ea772.on ? "" : " (" + t("미발동") + ")") + " : " + (lang == "ko" ? _0x5ea772.name : ""));
    } else if (isActNest(_0x5ea772)) {
      let _0x3b9258 = _0x5ea772.ex >= 100 ? t("상시") : "" + (_0x5ea772.ex - GLOBAL_TURN) + t("턴");
      _0x6bced7.push(t(_0x5ea772.act + "시") + " " + (_0x5ea772.who == all ? t("모두") : t(_0x5ea772.who.name)) + " " + t("에게") + " " + t(_0x5ea772.type) + _0x22a24d + " " + _0x5ea772.nest + t("중첩") + " (" + t("최대") + " " + _0x5ea772.maxNest + t("중첩") + ") " + t("부여") + "(" + _0x3b9258 + ") " + t(_0x5ea772.div) + (_0x5ea772.on ? "" : " (" + t("미발동") + ")") + " : " + (lang == "ko" ? _0x5ea772.name : ""));
    } else if (isActTurn(_0x5ea772)) {
      let _0x4a9700 = _0x5ea772.ex >= 100 ? t("상시") : "" + (_0x5ea772.ex - GLOBAL_TURN) + t("턴");
      _0x6bced7.push(t(_0x5ea772.act + "시") + " " + (_0x5ea772.who == all ? t("모두") : t(_0x5ea772.who.name)) + " " + t("에게") + " " + t(_0x5ea772.type) + _0x22a24d + " (" + _0x5ea772.turn + t("턴") + ") " + t("부여") + "(" + _0x4a9700 + ") " + t(_0x5ea772.div) + (_0x5ea772.on ? "" : " (" + t("미발동") + ")") + " : " + (lang == "ko" ? _0x5ea772.name : ""));
    } else {
      _0x6bced7.push(JSON.stringify(_0x5ea772));
    }
  }
  return _0x6bced7.join("<hr>");
}
const savedData = [];
function loadBefore() {
  if (savedData.length == 0) {
    return;
  }
  command.pop();
  const _0xe6a195 = savedData.pop();
  for (let _0x1a8eca = 0; _0x1a8eca < 5; _0x1a8eca++) {
    jsonToCharacter(_0x1a8eca, _0xe6a195[_0x1a8eca]);
  }
  jsonToBoss(_0xe6a195[5]);
  lastDmg = 0;
  lastAddDmg = 0;
  lastAtvDmg = 0;
  lastDotDmg = 0;
  lastRefDmg = 0;
  updateAll();
}
function saveCur() {
  const _0x5eaa37 = [];
  for (let _0x138207 = 0; _0x138207 < 5; _0x138207++) {
    _0x5eaa37.push(characterToJson(_0x138207));
  }
  _0x5eaa37.push(bossToJson());
  savedData.push(_0x5eaa37);
}
function bossToJson() {
  const _0x4e8eae = {
    hp: boss.hp,
    maxHp: boss.maxHp,
    def: boss.def,
    buff: getCopyList(boss.buff),
    li: JSON.parse(JSON.stringify(boss.li)),
    turn: GLOBAL_TURN
  };
  return _0x4e8eae;
}
function jsonToBoss(_0x43a4f3) {
  boss.hp = _0x43a4f3.hp;
  boss.maxHp = _0x43a4f3.maxHp;
  boss.def = _0x43a4f3.def;
  boss.buff = getCopyList(_0x43a4f3.buff);
  boss.li = JSON.parse(JSON.stringify(_0x43a4f3.li));
  GLOBAL_TURN = _0x43a4f3.turn;
}
function characterToJson(_0x41c349) {
  const _0x1f75cd = comp[_0x41c349];
  const _0x4e10d3 = {
    atk: _0x1f75cd.atk,
    hp: _0x1f75cd.hp,
    curHp: _0x1f75cd.curHp,
    cd: _0x1f75cd.cd,
    curCd: _0x1f75cd.curCd,
    buff: getCopyList(_0x1f75cd.buff),
    stopCd: _0x1f75cd.stopCd,
    canCDChange: _0x1f75cd.canCDChange,
    isLeader: _0x1f75cd.isLeader,
    isActed: _0x1f75cd.isActed,
    hpAtkDmg: _0x1f75cd.hpAtkDmg,
    hpUltDmg: _0x1f75cd.hpUltDmg,
    isHealed: _0x1f75cd.isHealed,
    isHealed2: _0x1f75cd.isHealed2,
    isHealed3: _0x1f75cd.isHealed3,
    stack: cloneValue(_0x1f75cd.stack)
  };
  return _0x4e10d3;
}
function jsonToCharacter(_0x30c3ae, _0x292a95) {
  const _0x13fdb8 = comp[_0x30c3ae];
  _0x13fdb8.atk = _0x292a95.atk;
  _0x13fdb8.hp = _0x292a95.hp;
  _0x13fdb8.curHp = _0x292a95.curHp;
  _0x13fdb8.cd = _0x292a95.cd;
  _0x13fdb8.curCd = _0x292a95.curCd;
  _0x13fdb8.buff = getCopyList(_0x292a95.buff);
  _0x13fdb8.stopCd = _0x292a95.stopCd;
  _0x13fdb8.canCDChange = _0x292a95.canCDChange;
  _0x13fdb8.isLeader = _0x292a95.isLeader;
  _0x13fdb8.isActed = _0x292a95.isActed;
  _0x13fdb8.hpAtkDmg = _0x292a95.hpAtkDmg;
  _0x13fdb8.hpUltDmg = _0x292a95.hpUltDmg;
  _0x13fdb8.isHealed = _0x292a95.isHealed;
  _0x13fdb8.isHealed2 = _0x292a95.isHealed2;
  _0x13fdb8.isHealed3 = _0x292a95.isHealed3;
  _0x13fdb8.stack = cloneValue(_0x292a95.stack);
}
function cloneValue(_0x2b9415) {
  if (Array.isArray(_0x2b9415)) {
    return [..._0x2b9415];
  }
  return _0x2b9415;
}
function getCopyList(_0x9698b7) {
  return _0x9698b7.map(copyTopLevelJson);
}
function copyTopLevelJson(_0x2bae4c) {
  const _0x3a6527 = {};
  for (let _0x21e949 in _0x2bae4c) {
    if (_0x2bae4c.hasOwnProperty(_0x21e949)) {
      _0x3a6527[_0x21e949] = _0x2bae4c[_0x21e949];
    }
  }
  return _0x3a6527;
}