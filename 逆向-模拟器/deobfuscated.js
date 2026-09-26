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
class Boss {
  constructor() {
    this.hp = 10854389981;
    this.maxHp = 10854389981;
    this.def = false;
    this.name = "타깃";
    this.buff = [];
    this.li = [];
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
  constructor(_0x568eae, _0x376c22, _0x19918c, _0x59a170, _0x504e68, _0x127e09, _0x46c9f7, _0x1f2ea4, _0x3ddf29, _0x256204 = COEF, _0x49f193 = COEF) {
    this.id = _0x568eae;
    this.name = _0x376c22;
    this.hp = Math.floor(_0x19918c * _0x256204);
    this.curHp = this.hp;
    this.atk = Math.floor(_0x59a170 * _0x49f193);
    this.cd = _0x504e68;
    this.curCd = _0x504e68;
    this.element = _0x127e09;
    this.role = _0x46c9f7;
    this.coef_hp = _0x256204;
    this.coef_atk = _0x49f193;
    this.buff = [];
    this.atkMag = _0x1f2ea4;
    this.ultMag = _0x3ddf29;
    this.stopCd = false;
    this.canCDChange = true;
    this.isLeader = false;
    this.isActed = false;
    this.hpAtkDmg = 0;
    this.hpUltDmg = 0;
    this.isHealed = false;
    this.isHealed2 = false;
  }
  getArmor() {
    let _0x9b6ec8 = 0;
    for (let _0x32187d of this.buff) {
      if (isTurn(_0x32187d) && _0x32187d.type == "아머") {
        _0x9b6ec8 += _0x32187d.size / 100;
      }
    }
    return _0x9b6ec8;
  }
  getCurAtk(_0x3f624e = null) {
    const _0x79c9c2 = _0x3f624e || getBuffSizeList(this);
    const _0x2208e0 = Math.floor(this.atk * (1 + _0x79c9c2[0]) + _0x79c9c2[1]);
    if (_0x2208e0 > 0) {
      return _0x2208e0;
    } else {
      return 0;
    }
  }
  getAtkDmg(_0x40a6b5 = null) {
    const _0x3f527a = _0x40a6b5 || getBuffSizeList(this);
    const _0x3f8e6a = boss.def ? _0x3f527a[22] : 0;
    const _0x390ebb = [1 + _0x3f527a[2], 1 + _0x3f527a[3] + _0x3f527a[4] + _0x3f527a[13] + _0x3f527a[14] + _0x3f8e6a, 1 + _0x3f527a[9], 1 + _0x3f527a[10] + _0x3f527a[11]];
    if (Math.min(..._0x390ebb) < 0) {
      return 0;
    }
    return this.getCurAtk(_0x3f527a) * this.atkMag / 100 * _0x390ebb.reduce((_0x5d7fed, _0x137901) => _0x5d7fed * _0x137901, 1);
  }
  getHpAtkDmg(_0x5668ed = null) {
    const _0x9b810a = _0x5668ed || getBuffSizeList(this);
    const _0x14ed24 = boss.def ? _0x9b810a[22] : 0;
    const _0x7489b6 = [1 + _0x9b810a[2], 1 + _0x9b810a[3] + _0x9b810a[4] + _0x9b810a[13] + _0x9b810a[14] + _0x14ed24, 1 + _0x9b810a[9], 1 + _0x9b810a[10] + _0x9b810a[11]];
    if (Math.min(..._0x7489b6) < 0) {
      return 0;
    }
    return this.hpAtkDmg / 100 * _0x7489b6.reduce((_0x2a71f5, _0xf52e6c) => _0x2a71f5 * _0xf52e6c, 1);
  }
  atkAddCoef(_0x113b39 = null) {
    const _0x43db1d = _0x113b39 || getBuffSizeList(this);
    const _0xe72d33 = boss.def ? _0x43db1d[22] : 0;
    const _0x19fd8d = [1 + _0x43db1d[2], 1 + _0x43db1d[3] + _0x43db1d[4] + _0x43db1d[13] + _0x43db1d[14] + _0xe72d33, 1 + _0x43db1d[9], 1 + _0x43db1d[10] + _0x43db1d[11]];
    if (Math.min(..._0x19fd8d) < 0) {
      return 0;
    }
    return _0x19fd8d.reduce((_0x38159e, _0x59a671) => _0x38159e * _0x59a671, 1);
  }
  atkAtvCoef(_0x2da091 = null) {
    const _0xc9e933 = _0x2da091 || getBuffSizeList(this);
    const _0x3b7e4c = boss.def ? _0xc9e933[22] : 0;
    const _0x312590 = [1 + _0xc9e933[2], 1 + _0xc9e933[12] + _0xc9e933[5] + _0xc9e933[6] + _0xc9e933[7] + _0xc9e933[8] + _0xc9e933[13] + _0xc9e933[14] + _0x3b7e4c, 1 + _0xc9e933[9], 1 + _0xc9e933[10] + _0xc9e933[11]];
    if (Math.min(..._0x312590) < 0) {
      return 0;
    }
    return _0x312590.reduce((_0x366a80, _0x38a4b0) => _0x366a80 * _0x38a4b0, 1);
  }
  getUltDmg(_0x16c46f = null) {
    const _0x53d030 = _0x16c46f || getBuffSizeList(this);
    const _0x2ce45f = boss.def ? _0x53d030[22] : 0;
    const _0xc53402 = [1 + _0x53d030[2], 1 + _0x53d030[5] + _0x53d030[6] + _0x53d030[13] + _0x53d030[14] + _0x2ce45f, 1 + _0x53d030[9], 1 + _0x53d030[10] + _0x53d030[11]];
    if (Math.min(..._0xc53402) < 0) {
      return 0;
    }
    return this.getCurAtk(_0x53d030) * this.ultMag / 100 * _0xc53402.reduce((_0x22cdb3, _0xd6695f) => _0x22cdb3 * _0xd6695f, 1);
  }
  getHpUltDmg(_0x1e786b = null) {
    const _0x172e09 = _0x1e786b || getBuffSizeList(this);
    const _0x5e0c50 = boss.def ? _0x172e09[22] : 0;
    const _0x5dcddf = [1 + _0x172e09[2], 1 + _0x172e09[5] + _0x172e09[6] + _0x172e09[13] + _0x172e09[14] + _0x5e0c50, 1 + _0x172e09[9], 1 + _0x172e09[10] + _0x172e09[11]];
    if (Math.min(..._0x5dcddf) < 0) {
      return 0;
    }
    return this.hpUltDmg / 100 * _0x5dcddf.reduce((_0x180a71, _0x55119d) => _0x180a71 * _0x55119d, 1);
  }
  ultAddCoef(_0x1b441d = null) {
    const _0x3581fb = _0x1b441d || getBuffSizeList(this);
    const _0x4d4adb = boss.def ? _0x3581fb[22] : 0;
    const _0x2503b0 = [1 + _0x3581fb[2], 1 + _0x3581fb[5] + _0x3581fb[6] + _0x3581fb[13] + _0x3581fb[14] + _0x4d4adb, 1 + _0x3581fb[9], 1 + _0x3581fb[10] + _0x3581fb[11]];
    if (Math.min(..._0x2503b0) < 0) {
      return 0;
    }
    return _0x2503b0.reduce((_0x1fc726, _0x2c5d8f) => _0x1fc726 * _0x2c5d8f, 1);
  }
  ultAtvCoef(_0x2b18a4 = null) {
    const _0xdd7cb5 = _0x2b18a4 || getBuffSizeList(this);
    const _0x110761 = boss.def ? _0xdd7cb5[22] : 0;
    const _0x5bf256 = [1 + _0xdd7cb5[2], 1 + _0xdd7cb5[12] + _0xdd7cb5[5] + _0xdd7cb5[6] + _0xdd7cb5[7] + _0xdd7cb5[8] + _0xdd7cb5[13] + _0xdd7cb5[14] + _0x110761, 1 + _0xdd7cb5[9], 1 + _0xdd7cb5[10] + _0xdd7cb5[11]];
    if (Math.min(..._0x5bf256) < 0) {
      return 0;
    }
    return _0x5bf256.reduce((_0x24024b, _0x395fb2) => _0x24024b * _0x395fb2, 1);
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
  bless(_0x58bdfb) {
    addBuff(this, [_0x58bdfb], "추가");
    addBuff(this, [_0x58bdfb], "발동");
  }
  hit() {
    addBuff(this, ["피격"], "추가");
    addBuff(this, ["피격"], "발동");
  }
  getNest(_0x4b865e) {
    const _0x4b70e6 = this.buff.filter(_0x3049a4 => isNest(_0x3049a4) && _0x3049a4.type == _0x4b865e);
    if (_0x4b70e6.length == 0) {
      return 0;
    }
    return _0x4b70e6[0].nest;
  }
}
function getInt(_0x491dee, _0x4292f0, _0x314360 = null) {
  const _0x26e89d = _0x491dee.element;
  const _0x14d4e9 = _0x4292f0.element;
  if (_0x14d4e9 == undefined || _0x14d4e9 == -1 || _0x26e89d == undefined || _0x26e89d == -1) {
    return 1;
  }
  const _0x4909c6 = _0x314360 || getBuffSizeList(_0x491dee);
  let _0x3697f2 = _0x4909c6[19];
  if (_0x3697f2 > 1) {
    _0x3697f2 = 1;
  }
  function _0x16cfaf(_0x1ae10f, _0x3f8eab) {
    if (_0x3f8eab == 0) {
      if (_0x1ae10f == 1) {
        return -0.25;
      } else if (_0x1ae10f == 2) {
        return 0.5;
      } else {
        return 0;
      }
    }
    if (_0x3f8eab == 1) {
      if (_0x1ae10f == 2) {
        return -0.25;
      } else if (_0x1ae10f == 0) {
        return 0.5;
      } else {
        return 0;
      }
    }
    if (_0x3f8eab == 2) {
      if (_0x1ae10f == 0) {
        return -0.25;
      } else if (_0x1ae10f == 1) {
        return 0.5;
      } else {
        return 0;
      }
    }
    if (_0x3f8eab == 3) {
      if (_0x1ae10f == 4) {
        return 0.5;
      } else {
        return 0;
      }
    }
    if (_0x3f8eab == 4) {
      if (_0x1ae10f == 3) {
        return 0.5;
      } else {
        return 0;
      }
    }
    return 0;
  }
  return 1 + _0x16cfaf(_0x14d4e9, _0x26e89d) * (1 - _0x3697f2);
}
function isExpired(_0x4ef150) {
  let _0x52994d = _0x4ef150.ex == undefined && _0x4ef150.turn <= GLOBAL_TURN;
  let _0x2fb562 = _0x4ef150.ex != undefined && _0x4ef150.ex <= GLOBAL_TURN;
  return _0x52994d || _0x2fb562;
}
function nextTurn() {
  const _0x124f03 = boss.buff.filter(_0x30322c => _0x30322c.type == "도트뎀");
  const _0x30231b = getBossBuffSizeList(boss);
  lastDotDmg = 0;
  for (let _0x47e389 of _0x124f03) {
    applyDotDmg(Math.floor(_0x47e389.size / 100) * (1 + _0x30231b[2] + _0x30231b[18]), _0x47e389.from);
  }
  GLOBAL_TURN += 1;
  for (let _0x11d87d = 0; _0x11d87d < comp.length; _0x11d87d++) {
    if (!comp[_0x11d87d].stopCd) {
      comp[_0x11d87d].curCd = comp[_0x11d87d].curCd <= 0 ? 0 : comp[_0x11d87d].curCd - 1;
    }
    comp[_0x11d87d].buff = comp[_0x11d87d].buff.filter(_0x14232e => !isExpired(_0x14232e));
    comp[_0x11d87d].isActed = false;
  }
  boss.buff = boss.buff.filter(_0x37c8ef => !isExpired(_0x37c8ef));
  if (GLOBAL_TURN == 14) {
    dmg13 = Math.floor(boss.maxHp - boss.hp);
  }
  boss.def = false;
  _bumpBuffGen();   // [perf] R2-D：filter 重赋值 comp/boss buff 数组 → 派生量缓存全失效
}
function getSize(_0x2d6cf1) {
  let _0x349d2a = _0x2d6cf1.slice(1);
  let _0xa55710 = _0x349d2a.slice(0, 5);
  let _0x2ad097 = _0x349d2a.slice(5);
  let _0x15da7a = comp.filter(_0xdebccc => _0xdebccc.id == Number(_0xa55710))[0];
  if (_0x2d6cf1.charAt(0) == myCurAtk) {
    return {
      size: Number(_0x2ad097) * _0x15da7a.getCurAtk(),
      from: Number(_0xa55710)
    };
  } else if (_0x2d6cf1.charAt(0) == myCurShd) {
    return {
      size: Number(_0x2ad097) * _0x15da7a.getArmor(),
      from: Number(_0xa55710)
    };
  } else {
    alert("버프 오류 발견");
    return 0;
  }
}
// [perf] 热路径改写（self time 37%）：Array.from(arguments) → 直接使用 arguments。
//   工厂体在 new Function 下编译（非 strict，多例引擎.js 顶层 'use strict' 不传导字符串体），
//   arguments 非映射但可索引读写；全函数仅 all 分支改写 _0x10b5eb[0]（调用者数组与 arguments 均丢弃，无别名依赖）。
//   buff(..._0x10b5eb) 的 spread 对 arguments 对象同样适用（iterable）。
function buff() {
  const _0x10b5eb = arguments;
  if (_0x10b5eb[0] == all) {
    for (let _0x26de4f of comp) {
      _0x10b5eb[0] = _0x26de4f;
      buff(..._0x10b5eb);
    }
    return;
  }
  if (_0x10b5eb.length == 6) {
    let _0x4af266 = null;
    const _mt = _metaOf(_0x10b5eb[1]);   // [perf] R3-B：类型影子字段一次取好（push 端仅 1 次 Map.get）
    if (typeof _0x10b5eb[2] == "string") {
      const _0x530933 = getSize(_0x10b5eb[2]);
      if (_0x10b5eb[1] == "도트뎀") {
        _0x4af266 = _0x530933.from;
      }
      _0x10b5eb[2] = _0x530933.size;
    }
    if (_0x10b5eb[1] == "아머") {
      _0x10b5eb[0].buff.push({
        div: "기본", act: undefined, who: undefined,
        type: _0x10b5eb[1],
        size: _0x10b5eb[2] * (1 + buffSizeByType(_0x10b5eb[0], "받아증")),
        name: _0x10b5eb[3],
        nest: undefined, maxNest: undefined,
        turn: _0x10b5eb[4] + GLOBAL_TURN,
        ex: undefined,
        on: _0x10b5eb[5],
        from: undefined,
        ti: _mt.ti, aset: _mt.aset, dk: _mt.dk
      });
    } else if (_0x10b5eb[1] == "도트뎀") {
      // [perf] 闭包 find → for（语义同：首个命中即返，无命中 undefined）
      let _0x367594;
      for (let _0xj = 0; _0xj < comp.length; _0xj++) { if (comp[_0xj].id == _0x4af266) { _0x367594 = comp[_0xj]; break; } }
      _0x10b5eb[0].buff.push({
        div: "기본", act: undefined, who: undefined,
        type: _0x10b5eb[1],
        size: _0x10b5eb[2] * (1 + buffSizeByType(_0x367594, "가지증")),
        name: _0x10b5eb[3],
        nest: undefined, maxNest: undefined,
        turn: _0x10b5eb[4] + GLOBAL_TURN,
        ex: undefined,
        on: _0x10b5eb[5],
        from: _0x367594,
        ti: _mt.ti, aset: _mt.aset, dk: _mt.dk
      });
    } else if (_0x10b5eb[1] == "방어") {
      _0x10b5eb[0].def = true;
    } else {
      _0x10b5eb[0].buff.push({
        div: "기본", act: undefined, who: undefined,
        type: _0x10b5eb[1],
        size: _0x10b5eb[2],
        name: _0x10b5eb[3],
        nest: undefined, maxNest: undefined,
        turn: _0x10b5eb[4] + GLOBAL_TURN,
        ex: undefined,
        on: _0x10b5eb[5],
        from: undefined,
        ti: _mt.ti, aset: _mt.aset, dk: _mt.dk
      });
    }
  } else if (_0x10b5eb.length == 7) {
    const _mt = _metaOf(_0x10b5eb[1]);   // [perf] R3-B
    if (typeof _0x10b5eb[2] == "string") {
      _0x10b5eb[2] = getSize(_0x10b5eb[2]).size;
    }
    // [perf] 闭包 find → for（语义同）
    let _0x475b88;
    for (let _0xj = 0; _0xj < _0x10b5eb[0].buff.length; _0xj++) {
      const _0x4938b4 = _0x10b5eb[0].buff[_0xj];
      if (_0x4938b4.div == "기본" && isNest(_0x4938b4) && _0x4938b4.name == _0x10b5eb[3]) { _0x475b88 = _0x4938b4; break; }
    }
    if (_0x475b88) {
      _0x475b88.nest += _0x10b5eb[4];
      if (_0x475b88.nest > _0x475b88.maxNest) {
        _0x475b88.nest = _0x475b88.maxNest;
      }
      if (_0x475b88.nest < 0) {
        _0x475b88.nest = 0;
      }
    } else {
      _0x10b5eb[0].buff.push({
        div: "기본", act: undefined, who: undefined,
        type: _0x10b5eb[1],
        size: _0x10b5eb[2],
        name: _0x10b5eb[3],
        nest: _0x10b5eb[4] < 0 ? 0 : _0x10b5eb[4],
        maxNest: _0x10b5eb[5],
        turn: undefined, ex: undefined,
        on: _0x10b5eb[6],
        from: undefined,
        ti: _mt.ti, aset: _mt.aset, dk: _mt.dk
      });
    }
  } else if (_0x10b5eb.length == 10) {
    const _mt = _metaOf(_0x10b5eb[3]);   // [perf] R3-B（字段顺序与其余 push 点一致 → 单态隐藏类）
    _0x10b5eb[0].buff.push({
      div: _0x10b5eb[8], act: _0x10b5eb[1], who: _0x10b5eb[2],
      type: _0x10b5eb[3],
      size: _0x10b5eb[4],
      name: _0x10b5eb[5],
      nest: undefined, maxNest: undefined,
      turn: _0x10b5eb[6],
      ex: _0x10b5eb[7] + GLOBAL_TURN,
      on: _0x10b5eb[9],
      from: undefined,
      ti: _mt.ti, aset: _mt.aset, dk: _mt.dk
    });
  } else if (_0x10b5eb.length == 11) {
    const _mt = _metaOf(_0x10b5eb[3]);   // [perf] R3-B
    _0x10b5eb[0].buff.push({
      div: _0x10b5eb[9], act: _0x10b5eb[1], who: _0x10b5eb[2],
      type: _0x10b5eb[3],
      size: _0x10b5eb[4],
      name: _0x10b5eb[5],
      nest: _0x10b5eb[6],
      maxNest: _0x10b5eb[7],
      turn: undefined,
      ex: _0x10b5eb[8] + GLOBAL_TURN,
      on: _0x10b5eb[10],
      from: undefined,
      ti: _mt.ti, aset: _mt.aset, dk: _mt.dk
    });
  } else {
    alert("버프 오류 발견");
  }
  _bumpBuffGen();   // [perf] R2-D：push/nest 变更 → 派生量缓存失效（分支内无缓存读，函数尾统一 bump 正确）
}
const actSet = new Set(["평추가*", "평발동*", "궁추가*", "궁발동*", "방발동*", "평추가+", "평발동+", "궁추가+", "궁발동+", "방발동+", "반격*", "반격+"]);
const actList2 = ["공발동*", "공발동+"];
const actList3 = ["행발동*", "행발동+"];
const blessList = ["<빛의 축복>", "<바람의 축복>", "<불의 축복>"];
// [perf] 不可变列表的 Set 镜像（仅热路径 includes 替换用；列表全库无 push，恒等成立）
const actSet2 = new Set(actList2), actSet3 = new Set(actList3), blessSet = new Set(blessList);
// [perf] R3-B：buff 类型影子字段（ti/aset/dk）——.type 创建后全库无写点（审计过），可一次算好。
//   热循环里把 txtsMap.get + actSet/2/3.has + blessSet.has + type 串比较链 换成纯属性读+整数比较。
//   元数据按 type 去重（全局唯一 type 仅 ~40 个），push 端只多一次 Map.get。
//   快照兼容：copyTopLevelJson/_拷buff 全字段复制 → 影子字段随快照往返存活；
//   序列化buff 用显式键集 → getState 比较不含影子字段，对照不受影响。
//   ti = txtsMap.get(type)（number|undefined，保持 arr[ti] 的原语义含 undefined 下标怪癖）
//   aset = 位掩码 1=actSet 2=actSet2 4=actSet3（0=都不在，⟺ 原三连 has 全 false）
//   dk = 派发类别 1=제거 2=on 3=off 4=아머 5=힐 6=bless 0=其它（优先级同原 if/else-if 链）
const _metaByType = new Map();
function _metaOf(_t) {
  let _m = _metaByType.get(_t);
  if (_m === undefined) {
    _m = {
      ti: txtsMap.get(_t),
      aset: (actSet.has(_t) ? 1 : 0) | (actSet2.has(_t) ? 2 : 0) | (actSet3.has(_t) ? 4 : 0),
      dk: _t == "제거" ? 1 : _t == "on" ? 2 : _t == "off" ? 3 : _t == "아머" ? 4 : _t == "힐" ? 5 : (blessSet.has(_t) ? 6 : 0)
    };
    _metaByType.set(_t, _m);
  }
  return _m;
}
// [perf] addBuff 分区暂存（跨调用复用数组，避免每次调用 2~3 次临时分配）。
//   复用安全边界：暂存只在 addBuff 分区阶段写入并在同函数消费循环前清空出栈，
//   而 addBuff 内部递归（heal/bless → buff → …）只发生在消费循环之后 → 不可能重入破坏。
const _addBuff分区暂存 = [];
// [perf] actionMap 三层嵌套查找表（前缀 → mode → type → fn|null），懒填充自扁平 actionMap。
//   null=已查过且原表无此键；键串拼接只发生在首次 miss，之后纯 Map 查找零分配。
const _actionMap2 = new Map();
const actionMap = new Map([["평추가평추가+", (_0x52ad49, _0x516508, _0x789d70) => applyAddDmg(_0x516508.size / 100 * _0x52ad49.atkAddCoef(_0x789d70) * getInt(_0x52ad49, boss, _0x789d70))], ["평추가평추가*", (_0x5e468a, _0x5a65d0, _0x312c86) => applyAddDmg(_0x5a65d0.size / 100 * _0x5e468a.getCurAtk(_0x312c86) * _0x5e468a.atkAddCoef(_0x312c86) * getInt(_0x5e468a, boss, _0x312c86))], ["평발동평발동+", (_0x275356, _0x35d4cd, _0x1829eb) => applyAtvDmg(_0x35d4cd.size / 100 * _0x275356.atkAtvCoef(_0x1829eb) * getInt(_0x275356, boss, _0x1829eb))], ["평발동평발동*", (_0x160d05, _0x427fcb, _0x2d16b8) => applyAtvDmg(_0x427fcb.size / 100 * _0x160d05.getCurAtk(_0x2d16b8) * _0x160d05.atkAtvCoef(_0x2d16b8) * getInt(_0x160d05, boss, _0x2d16b8))], ["궁추가궁추가+", (_0x538feb, _0x1a699a, _0x2e19db) => applyAddDmg(_0x1a699a.size / 100 * _0x538feb.ultAddCoef(_0x2e19db) * getInt(_0x538feb, boss, _0x2e19db))], ["궁추가궁추가*", (_0x146e67, _0x2d7bac, _0x49527) => applyAddDmg(_0x2d7bac.size / 100 * _0x146e67.getCurAtk(_0x49527) * _0x146e67.ultAddCoef(_0x49527) * getInt(_0x146e67, boss, _0x49527))], ["궁발동궁발동+", (_0x3b4dab, _0x59f565, _0x201f9d) => applyAtvDmg(_0x59f565.size / 100 * _0x3b4dab.ultAtvCoef(_0x201f9d) * getInt(_0x3b4dab, boss, _0x201f9d))], ["궁발동궁발동*", (_0x24b83f, _0x4350f4, _0x48291a) => applyAtvDmg(_0x4350f4.size / 100 * _0x24b83f.getCurAtk(_0x48291a) * _0x24b83f.ultAtvCoef(_0x48291a) * getInt(_0x24b83f, boss, _0x48291a))], ["방발동방발동+", (_0x3a3929, _0x137e10, _0x119e1a) => applyAtvDmg(_0x137e10.size / 100 * _0x3a3929.ultAtvCoef(_0x119e1a) * getInt(_0x3a3929, boss, _0x119e1a))], ["방발동방발동*", (_0xc2e8a4, _0x3e17ca, _0x3a7d46) => applyAtvDmg(_0x3e17ca.size / 100 * _0xc2e8a4.getCurAtk(_0x3a7d46) * _0xc2e8a4.ultAtvCoef(_0x3a7d46) * getInt(_0xc2e8a4, boss, _0x3a7d46))], ["피격발동반격+", (_0x1237fa, _0x495799, _0xf76c0c) => applyRefDmg(_0x495799.size / 100 * _0x1237fa.ultAtvCoef(_0xf76c0c) * getInt(_0x1237fa, boss, _0xf76c0c), _0x1237fa)], ["피격발동반격*", (_0x3eb255, _0x9f2cf1, _0x26ec91) => applyRefDmg(_0x9f2cf1.size / 100 * _0x3eb255.getCurAtk(_0x26ec91) * _0x3eb255.ultAtvCoef(_0x26ec91) * getInt(_0x3eb255, boss, _0x26ec91), _0x3eb255)], ["공격발동공발동+", (_0x87de60, _0x354406, _0x51fcdb) => applyAtvDmg(_0x354406.size / 100 * _0x87de60.ultAtvCoef(_0x51fcdb) * getInt(_0x87de60, boss, _0x51fcdb))], ["공격발동공발동*", (_0x457034, _0x134535, _0x520d7b) => applyAtvDmg(_0x134535.size / 100 * _0x457034.getCurAtk(_0x520d7b) * _0x457034.ultAtvCoef(_0x520d7b) * getInt(_0x457034, boss, _0x520d7b))], ["행동발동행발동+", (_0x4ee778, _0x14aeb5, _0x28a9c1) => applyAtvDmg(_0x14aeb5.size / 100 * _0x4ee778.ultAtvCoef(_0x28a9c1) * getInt(_0x4ee778, boss, _0x28a9c1))], ["행동발동행발동*", (_0x90b401, _0x52c798, _0x19766b) => applyAtvDmg(_0x52c798.size / 100 * _0x90b401.getCurAtk(_0x19766b) * _0x90b401.ultAtvCoef(_0x19766b) * getInt(_0x90b401, boss, _0x19766b))]]);
// [perf] 热路径改写（self time 12%）：
//   ① filter+闭包 → for+push（选中集合与顺序同）；
//   ② sort(힐/bless 后置比较器) → 两遍稳定分区（比较器只分 힐/bless 与非两类，Array.prototype.sort 稳定性
//     保证组内原序，两遍分区产出与稳定排序逐位置等价）；
//   ③ actList2/3、blessList 的 includes → Set.has（元素全为字符串，无语义差异）。
function addBuff(_0x139bc4, _0x2a12d3, _0x41fa97) {
  let _0x3807a8 = [];
  const _0x1b = _0x139bc4.buff;
  if (_0x41fa97 == "추가") {
    for (let _0xj = 0; _0xj < _0x1b.length; _0xj++) {
      const _0x129276 = _0x1b[_0xj];
      if (_0x129276.div == "추가" && _0x2a12d3.includes(_0x129276.act) || _0x129276.div == "기본" && (_0x129276.aset & 1)) _0x3807a8.push(_0x129276);
    }
  } else if (_0x41fa97 == "발동") {
    if (_0x2a12d3.includes("공격")) {
      for (let _0xj = 0; _0xj < _0x1b.length; _0xj++) {
        const _0x2cfb38 = _0x1b[_0xj];
        if (_0x2cfb38.div == "발동" && _0x2cfb38.act == "공격" || _0x2cfb38.div == "기본" && (_0x2cfb38.aset & 2)) _0x3807a8.push(_0x2cfb38);
      }
    } else if (_0x2a12d3.includes("행동")) {
      for (let _0xj = 0; _0xj < _0x1b.length; _0xj++) {
        const _0xc1cbbd = _0x1b[_0xj];
        if (_0xc1cbbd.div == "발동" && _0xc1cbbd.act == "행동" || _0xc1cbbd.div == "기본" && (_0xc1cbbd.aset & 4)) _0x3807a8.push(_0xc1cbbd);
      }
    } else {
      for (let _0xj = 0; _0xj < _0x1b.length; _0xj++) {
        const _0x2ed8ba = _0x1b[_0xj];
        if (_0x2ed8ba.div == "발동" && _0x2a12d3.includes(_0x2ed8ba.act) || _0x2ed8ba.div == "기본" && (_0x2ed8ba.aset & 1)) _0x3807a8.push(_0x2ed8ba);
      }
    }
  }
  // 稳定两遍分区：非힐/bless 在前、힐/bless 在后、组内原序（== 旧比较器的稳定 sort 结果）
  // [perf] 第二轮改写 B：分区去中间分配（原 _전/_후 两个临时数组 + concat → 单遍收集힐/bless 进复用
  //   暂存、非힐/bless 原位前移，再回填）。递归安全：heal()/bless()→addBuff 的递归只发生在下方消费循环，
  //   分区本身纯数据读取不调引擎函数，暂存在递归发生前已消费完毕。
  const _分 = _addBuff分区暂存;
  _分.length = 0;
  let _n非 = 0;
  for (let _0xj = 0; _0xj < _0x3807a8.length; _0xj++) {
    const _b = _0x3807a8[_0xj];
    if (_b.dk == 5 || _b.dk == 6) _分.push(_b);   // [perf] R3-B：힐/bless → dk 整数比较
    else _0x3807a8[_n非++] = _b;
  }
  for (let _0xj = 0; _0xj < _分.length; _0xj++) _0x3807a8[_n非++] = _分[_0xj];
  _0x3807a8.length = _n非;
  // [perf] R3-B 循环不变量外提：_前缀 判定与 _actionMap2 两级查找只依赖 (触发列表, mode)，
  //   与当前元素无关——原实现每轮 dispatch 都重算（含 6 次数组 includes + 2 次 Map.get）。
  //   这里提到循环外各算一次；空触发列表/无前缀语义同（_m2 保持 null → 不查不调用）。
  const _前缀 = _0x2a12d3.includes("평") ? "평" : _0x2a12d3.includes("궁") ? "궁" : _0x2a12d3.includes("방") ? "방" : _0x2a12d3.includes("피격") ? "피격" : _0x2a12d3.includes("공격") ? "공격" : _0x2a12d3.includes("행동") ? "행동" : undefined;
  let _m2 = null;
  if (_前缀 !== undefined) {
    let _m1 = _actionMap2.get(_前缀);
    if (!_m1) { _m1 = new Map(); _actionMap2.set(_前缀, _m1); }
    _m2 = _m1.get(_0x41fa97);
    if (!_m2) { _m2 = new Map(); _m1.set(_0x41fa97, _m2); }
  }
  const _0x107ae8 = [];
  for (const _0xff73c0 of _0x3807a8) {
    if (!_0xff73c0.on) {
      continue;
    }
    if (_0xff73c0.dk == 1) {
      if (_0xff73c0.who == all) {
        for (let _0x3f3909 of comp) {
          deleteBuff(_0x3f3909, _0xff73c0.size, _0xff73c0.name);
        }
      } else {
        deleteBuff(_0xff73c0.who, _0xff73c0.size, _0xff73c0.name);
      }
      continue;
    } else if (_0xff73c0.dk == 2) {
      if (_0xff73c0.who == all) {
        for (let _0x47d908 of comp) {
          setBuffOn(_0x47d908, _0xff73c0.size, _0xff73c0.name, true);
        }
      } else {
        setBuffOn(_0xff73c0.who, _0xff73c0.size, _0xff73c0.name, true);
      }
      continue;
    } else if (_0xff73c0.dk == 3) {
      if (_0xff73c0.who == all) {
        for (let _0x25d72c of comp) {
          setBuffOn(_0x25d72c, _0xff73c0.size, _0xff73c0.name, false);
        }
      } else {
        setBuffOn(_0xff73c0.who, _0xff73c0.size, _0xff73c0.name, false);
      }
      continue;
    }
    if (_0xff73c0.dk == 4) {
      _0x107ae8.push(_0xff73c0);
      continue;
    }
    if (_0xff73c0.dk == 5) {
      if (_0xff73c0.div == "발동") {
        continue;
      }
      if (_0xff73c0.who == all) {
        for (let _0x148c42 of comp) {
          _0x148c42.heal();
        }
      } else {
        _0xff73c0.who.heal();
      }
    } else if (_0xff73c0.dk == 6) {
      if (_0xff73c0.who == all) {
        for (let _0x4a1ae4 of comp) {
          _0x4a1ae4.bless(_0xff73c0.type);
        }
      } else {
        _0xff73c0.who.bless(_0xff73c0.type);
      }
    } else if (_0xff73c0.div == "기본") {
      // [perf] 第二轮改写 C + R3-B：串键拼接+扁平Map.get → 三层嵌套Map查找（前缀/mode 两级已外提到
      //   循环前，元素相关查找只剩一次 _m2.get；miss 时懒填充扁平表并 null 占位 → 语义逐位同）。
      let _0x240b68;
      if (_m2 !== null) {
        const _hit = _m2.get(_0xff73c0.type);   // [perf] has+get 两次查找 → 一次 get（null=已查过无键）
        if (_hit !== undefined) _0x240b68 = _hit || undefined;
        else {
          _0x240b68 = actionMap.get(_前缀 + _0x41fa97 + _0xff73c0.type);
          _m2.set(_0xff73c0.type, _0x240b68 || null);
        }
      }
      if (_0x240b68) {
        _0x240b68(_0x139bc4, _0xff73c0, getBuffSizeList(_0x139bc4));
      }
    } else {
      if (_0xff73c0.div != undefined && _0xff73c0.div != "추가" && _0xff73c0.div != "발동") {
        alert("버프 오류 발견");
      }
      if (_0xff73c0.who == all) {
        for (let _0x42168e of comp) {
          if (_0xff73c0.nest == undefined) {
            buff(_0x42168e, _0xff73c0.type, _0xff73c0.size, _0xff73c0.name, _0xff73c0.turn, true);
          } else {
            buff(_0x42168e, _0xff73c0.type, _0xff73c0.size, _0xff73c0.name, _0xff73c0.nest, _0xff73c0.maxNest, true);
          }
        }
      } else if (_0xff73c0.who.id == 0 && _0x139bc4.name == "타깃" && _0x2a12d3.includes("피격")) {
        const _0x140a08 = comp.find(_0x378da6 => _0x378da6.id == whoActed);
        if (_0xff73c0.nest == undefined) {
          buff(_0x140a08 ? _0x140a08 : _0xff73c0.who, _0xff73c0.type, _0xff73c0.size, _0xff73c0.name, _0xff73c0.turn, true);
        } else {
          buff(_0x140a08 ? _0x140a08 : _0xff73c0.who, _0xff73c0.type, _0xff73c0.size, _0xff73c0.name, _0xff73c0.nest, _0xff73c0.maxNest, true);
        }
      } else if (_0xff73c0.nest == undefined) {
        buff(_0xff73c0.who, _0xff73c0.type, _0xff73c0.size, _0xff73c0.name, _0xff73c0.turn, true);
      } else {
        buff(_0xff73c0.who, _0xff73c0.type, _0xff73c0.size, _0xff73c0.name, _0xff73c0.nest, _0xff73c0.maxNest, true);
      }
    }
  }
  for (const _0x1f3e78 of _0x107ae8) {
    let _0x3153fc = _0x1f3e78.size;
    if (typeof _0x3153fc == "string") {
      _0x3153fc = getSize(_0x3153fc).size;
    }
    _0x3153fc *= armorUp(_0x139bc4, _0x2a12d3[0], _0x41fa97);
    if (_0x1f3e78.who == all) {
      for (let _0x5a723f of comp) {
        if (_0x1f3e78.nest == undefined) {
          buff(_0x5a723f, _0x1f3e78.type, _0x3153fc, _0x1f3e78.name, _0x1f3e78.turn, true);
        } else {
          buff(_0x5a723f, _0x1f3e78.type, _0x3153fc, _0x1f3e78.name, _0x1f3e78.nest, _0x1f3e78.maxNest, true);
        }
      }
    } else if (_0x1f3e78.nest == undefined) {
      buff(_0x1f3e78.who, _0x1f3e78.type, _0x3153fc, _0x1f3e78.name, _0x1f3e78.turn, true);
    } else {
      buff(_0x1f3e78.who, _0x1f3e78.type, _0x3153fc, _0x1f3e78.name, _0x1f3e78.nest, _0x1f3e78.maxNest, true);
    }
  }
}
let atvOverflowed = false;
const isOverflowed = [false, false, false, false, false];
function applyAddDmg(_0x15ef89) {
  if (_0x15ef89 <= 0) {
    _0x15ef89 = 0;
  }
  if (boss.def) {
    let _0x19613e = 0.5 - getBossBuffSizeList(boss)[21];
    if (_0x19613e < 0) {
      _0x19613e = 0;
    }
    _0x15ef89 = _0x15ef89 * (1 - _0x19613e);
  }
  if (_0x15ef89 > overflowDmg) {
    isOverflowed[1] = true;
    _0x15ef89 = overflowDmg;
  }
  lastAddDmg += _0x15ef89;
  boss.hp -= _0x15ef89;
  if (consoleOn) {
    console.log("추가 - " + _0x15ef89);
  }
}
function applyAtvDmg(_0x10c5be) {
  if (_0x10c5be <= 0) {
    _0x10c5be = 0;
  }
  if (boss.def) {
    let _0x2495c9 = 0.5 - getBossBuffSizeList(boss)[21];
    if (_0x2495c9 < 0) {
      _0x2495c9 = 0;
    }
    _0x10c5be = _0x10c5be * (1 - _0x2495c9);
  }
  if (_0x10c5be > overflowDmg) {
    isOverflowed[2] = true;
    _0x10c5be = overflowDmg;
  }
  lastAtvDmg += _0x10c5be;
  boss.hp -= _0x10c5be;
  if (consoleOn) {
    console.log("발동 - " + _0x10c5be);
  }
}
function applyDotDmg(_0x556b6d, _0x34b6ad) {
  if (_0x556b6d <= 0) {
    _0x556b6d = 0;
  }
  if (_0x556b6d > overflowDmg) {
    isOverflowed[3] = true;
    _0x556b6d = overflowDmg;
  }
  lastDotDmg += _0x556b6d;
  boss.hp -= _0x556b6d;
  if (consoleOn) {
    console.log("도트 - " + _0x556b6d);
  }
  return _0x556b6d;
}
function applyRefDmg(_0x17021c, _0x1bf99a) {
  if (_0x17021c <= 0) {
    _0x17021c = 0;
  }
  if (boss.def) {
    let _0x1326a2 = 0.5 - getBossBuffSizeList(boss)[21];
    if (_0x1326a2 < 0) {
      _0x1326a2 = 0;
    }
    _0x17021c = _0x17021c * (1 - _0x1326a2);
  }
  if (_0x17021c > overflowDmg) {
    isOverflowed[4] = true;
    _0x17021c = overflowDmg;
  }
  lastRefDmg += _0x17021c;
  boss.hp -= _0x17021c;
  if (consoleOn) {
    console.log("반격 - " + _0x17021c);
  }
  return _0x17021c;
}
function isNest(_0x1a9640) {
  return _0x1a9640.act == undefined && _0x1a9640.nest != undefined;
}
function isTurn(_0x4e679f) {
  return _0x4e679f.act == undefined && _0x4e679f.nest == undefined;
}
function isActNest(_0x5a030a) {
  return _0x5a030a.act != undefined && _0x5a030a.nest != undefined;
}
function isActTurn(_0x70edf5) {
  return _0x70edf5.act != undefined && _0x70edf5.nest == undefined;
}
const buff_ex = ["도트뎀"];
const txts = ["공퍼증", "공고증", "받뎀증", "일뎀증", "받일뎀", "궁뎀증", "받궁뎀", "발뎀증", "받발뎀", "가뎀증", "속뎀증", "받속뎀", "발효증", "받직뎀", "받캐뎀", "아머", "가아증", "받아증", "받지뎀", "속상감", "가지증", "방경감", "방뎀증"];
const txtsMap = new Map([["공퍼증", 0], ["공고증", 1], ["받뎀증", 2], ["일뎀증", 3], ["받일뎀", 4], ["궁뎀증", 5], ["받궁뎀", 6], ["발뎀증", 7], ["받발뎀", 8], ["가뎀증", 9], ["속뎀증", 10], ["받속뎀", 11], ["발효증", 12], ["받직뎀", 13], ["받캐뎀", 14], ["아머", 15], ["가아증", 16], ["받아증", 17], ["받지뎀", 18], ["속상감", 19], ["가지증", 20], ["방경감", 21], ["방뎀증", 22]]);
// [perf] 热路径改写（self time 10%）：filter 中间数组+闭包 → 单趟 for（div!="기본" 跳）；
//   actList2/3.includes → Set.has；buff_ex.includes → _buffExHas（R3-B Set 镜像，见下）。求和顺序同 → bit-exact。
function getBuffSizeList(_0x1a6d3d) {
  // [perf] R2-D：派生量缓存。键=(对象, _buffGen, GLOBAL_TURN, buff_ex.length)——
  //   buff_ex 是运行期可 push 的可变全局（45 个 setDefault 注册层 push + autocalc start() 重置），
  //   其内容参与本函数的 includes 过滤；push/reset 只改长度（全库无 pop/splice）→ 长度即完美指纹。
  //   ⚠ battle() 路径的 bump 在 autoCalc 之前，start() 期间若钩子交错执行会用旧 buff_ex 写缓存——
  //   长度进键兜住该窗口。其余 mutation 点（buff/deleteBuff*/setBuff*/nextTurn/loadBefore/钩子直改
  //   splice）已 bump _buffGen。返回数组全库只读（静态扫描无下标写）。
  const _c = _bslCache.get(_0x1a6d3d);
  if (_c !== undefined && _c.g === _buffGen && _c.t === GLOBAL_TURN && _c.x === buff_ex.length) return _c.out;
  const _0x176af3 = Array(txts.length).fill(0);
  const _0x1b = _0x1a6d3d.buff;
  for (let _0xj = 0; _0xj < _0x1b.length; _0xj++) {
    const _0x59757c = _0x1b[_0xj];
    if (_0x59757c.div != "기본") continue;
    if (!_0x59757c.on) {
      continue;
    }
    if (_buffExHas(_0x59757c.type)) {
      continue;
    }
    if (_0x59757c.turn != undefined && _0x59757c.turn <= GLOBAL_TURN) {
      continue;
    }
    let _0x2f3151 = _0x59757c.ti;   // [perf] R3-B：txtsMap.get(串) → 影子字段属性读（ti 语义同：含 undefined）
    if (_0x2f3151 == undefined && _0x59757c.aset == 0) {
      alert("버프 누락 : " + _0x59757c.type);
    } else {
      _0x176af3[_0x2f3151] += isTurn(_0x59757c) ? _0x59757c.size / 100 : _0x59757c.size * _0x59757c.nest / 100;
    }
  }
  boss.setBuff();
  for (let _0x1ba16f = 0; _0x1ba16f < txts.length; _0x1ba16f++) {
    _0x176af3[_0x1ba16f] += boss.li[_0x1ba16f];
  }
  _bslCache.set(_0x1a6d3d, { g: _buffGen, t: GLOBAL_TURN, x: buff_ex.length, out: _0x176af3 });
  return _0x176af3;
}// [perf] R3-B：buff_ex 的 Set 镜像（getBuffSizeList/getBossBuffSizeList 每元素 includes O(n) 线性扫
//   → O(1) Set.has）。buff_ex 全部变更 = push（长度+1）或 start() 里 length=0 重置；长度键捕捉所有
//   内容变更，"重置后无查询又涨回原长度"的致盲窗由 battle()/initBattle 入口 _buffExSetLen=-1 强制重建
//   封死（见 多例引擎.js）。对任何 calcSrc 无副作用（纯增量）。
function _buffExHas(_0xt) {
  if (_buffExSetLen !== buff_ex.length) {
    _buffExSet.clear();
    for (let _0xi = 0; _0xi < buff_ex.length; _0xi++) _buffExSet.add(buff_ex[_0xi]);
    _buffExSetLen = buff_ex.length;
  }
  return _buffExSet.has(_0xt);
}
// [perf] 同 getBuffSizeList：filter → 单趟 for，includes → Set.has（求和顺序同 → bit-exact）
// [perf] R2-D：boss 派生量缓存（键同 getBuffSizeList）。返回数组会被 setBuff 赋给 boss.li 且
//   getState/_浅拷字段 以 slice 复制读取，全库无下标写 → 共享缓存数组安全。
function getBossBuffSizeList(_0x3d744a) {
  const _c = _gbslCache.get(_0x3d744a);
  if (_c !== undefined && _c.g === _buffGen && _c.t === GLOBAL_TURN && _c.x === buff_ex.length) return _c.out;
  const _0x5c95e5 = Array(txts.length).fill(0);
  const _0x1b = _0x3d744a.buff;
  for (let _0xj = 0; _0xj < _0x1b.length; _0xj++) {
    const _0x177700 = _0x1b[_0xj];
    if (_0x177700.div != "기본") continue;
    if (!_0x177700.on) {
      continue;
    }
    if (_buffExHas(_0x177700.type)) {
      continue;
    }
    if (_0x177700.turn != undefined && _0x177700.turn <= GLOBAL_TURN) {
      continue;
    }
    let _0x1e58c8 = _0x177700.ti;   // [perf] R3-B：同 getBuffSizeList
    if (_0x1e58c8 == undefined && _0x177700.aset == 0) {
      alert("버프 누락 : " + _0x177700.type);
    } else {
      _0x5c95e5[_0x1e58c8] += isTurn(_0x177700) ? _0x177700.size / 100 : _0x177700.size * _0x177700.nest / 100;
    }
  }
  _gbslCache.set(_0x3d744a, { g: _buffGen, t: GLOBAL_TURN, x: buff_ex.length, out: _0x5c95e5 });
  return _0x5c95e5;
}
function deleteBuff(_0xe40bea, _0x42cf31, _0x230d3f) {
  for (let _0x5c437c = _0xe40bea.buff.length - 1; _0x5c437c >= 0; _0x5c437c--) {
    if (_0xe40bea.buff[_0x5c437c].name === _0x230d3f && _0xe40bea.buff[_0x5c437c].div == _0x42cf31) {
      _0xe40bea.buff.splice(_0x5c437c, 1);
    }
  }
  _bumpBuffGen();   // [perf] R2-D：splice 变更（无删到也 bump，过失效安全）
}
function keepOnlyLastBuff(_0x3d7f3f, _0x2f49df, _0x142692) {
  let _0x1a2020 = false;
  for (let _0x5a748c = _0x3d7f3f.buff.length - 1; _0x5a748c >= 0; _0x5a748c--) {
    if (_0x3d7f3f.buff[_0x5a748c].name === _0x142692 && _0x3d7f3f.buff[_0x5a748c].div == _0x2f49df) {
      if (!_0x1a2020) {
        _0x1a2020 = true;
      } else {
        _0x3d7f3f.buff.splice(_0x5a748c, 1);
      }
    }
  }
  _bumpBuffGen();   // [perf] R2-D
}
function deleteBuffType(_0x52f21a, _0x2a2af7, _0x33d014) {
  for (let _0x14f01f = _0x52f21a.buff.length - 1; _0x14f01f >= 0; _0x14f01f--) {
    if (_0x52f21a.buff[_0x14f01f].type === _0x33d014 && _0x52f21a.buff[_0x14f01f].div == _0x2a2af7) {
      _0x52f21a.buff.splice(_0x14f01f, 1);
    }
  }
  _bumpBuffGen();   // [perf] R2-D
}
const element = ["화", "수", "풍", "광", "암"];
const role = ["딜", "힐", "탱", "섶", "디"];
function getElementCnt() {
  let _0x3f4d68 = 0;
  let _0xa1b13b = Array.from(arguments);
  for (let _0x2fd57b = 0; _0x2fd57b < 5; _0x2fd57b++) {
    if (_0xa1b13b.includes(element[comp[_0x2fd57b].element])) {
      _0x3f4d68++;
    }
  }
  return _0x3f4d68;
}
function getRoleCnt() {
  let _0x426ac2 = 0;
  let _0x4f57b6 = Array.from(arguments);
  for (let _0x3028b4 = 0; _0x3028b4 < 5; _0x3028b4++) {
    if (_0x4f57b6.includes(role[comp[_0x3028b4].role])) {
      _0x426ac2++;
    }
  }
  return _0x426ac2;
}
function getElementIdx() {
  let _0x70f481 = [];
  let _0x3c1a5e = Array.from(arguments);
  for (let _0x279e6d = 0; _0x279e6d < 5; _0x279e6d++) {
    if (_0x3c1a5e.includes(element[comp[_0x279e6d].element])) {
      _0x70f481.push(_0x279e6d);
    }
  }
  return _0x70f481;
}
function getRoleIdx() {
  let _0x3112a2 = [];
  let _0xca3656 = Array.from(arguments);
  for (let _0x177e88 = 0; _0x177e88 < 5; _0x177e88++) {
    if (_0xca3656.includes(role[comp[_0x177e88].role])) {
      _0x3112a2.push(_0x177e88);
    }
  }
  return _0x3112a2;
}
function hpUpAll(_0x2da964) {
  for (let _0x12372b of comp) {
    hpUpMe(_0x12372b, _0x2da964);
  }
}
function hpUpMe(_0xc4a1ad, _0x2deef1) {
  const _0x14b8d5 = getCharacter(_0xc4a1ad.id);
  if (liberationList.includes(_0xc4a1ad.name)) {
    _0xc4a1ad.hp += Math.floor(_0x14b8d5.hp * _0xc4a1ad.coef_hp * 1.1 * (_0x2deef1 / 100));
  } else {
    _0xc4a1ad.hp += Math.floor(_0x14b8d5.hp * _0xc4a1ad.coef_hp * (_0x2deef1 / 100));
  }
  _0xc4a1ad.curHp = _0xc4a1ad.hp;
}
function cdChange(_0x5381aa, _0x3d2c36) {
  if (!_0x5381aa.canCDChange) {
    return;
  }
  _0x5381aa.curCd += _0x3d2c36;
  if (_0x5381aa.curCd < 0) {
    _0x5381aa.curCd = 0;
  } else if (_0x5381aa.curCd > _0x5381aa.cd) {
    _0x5381aa.curCd = _0x5381aa.cd;
  }
}
// [perf] 双 filter+闭包 → 双趟 for（求和顺序同：先全部 turn 型再全部 nest 型 → bit-exact）
function buffSizeByType(_0x22691d, _0x277bbc) {
  let _0x311283 = 0;
  const _0x1b = _0x22691d.buff;
  for (let _0xj = 0; _0xj < _0x1b.length; _0xj++) {
    const _0x392ce7 = _0x1b[_0xj];
    if (isTurn(_0x392ce7) && _0x392ce7.type == _0x277bbc) _0x311283 += _0x392ce7.size;
  }
  for (let _0xj = 0; _0xj < _0x1b.length; _0xj++) {
    const _0x20d588 = _0x1b[_0xj];
    if (isNest(_0x20d588) && _0x20d588.type == _0x277bbc) _0x311283 += _0x20d588.size * _0x20d588.nest;
  }
  return _0x311283 / 100;
}
function buffNestByType(_0x4efe9b, _0x524554) {
  const _0x1950b1 = _0x4efe9b.buff.filter(_0x14c9cb => isNest(_0x14c9cb) && _0x14c9cb.type == _0x524554);
  if (_0x1950b1.length == 0) {
    return 0;
  }
  if (_0x1950b1[0].nest > _0x1950b1[0].maxNest) {
    return _0x1950b1[0].maxNest;
  } else if (_0x1950b1[0].nest < 0) {
    return 0;
  } else {
    return _0x1950b1[0].nest;
  }
}
function armorUp(_0x667ef6, _0x1981a1, _0x367767) {
  if (_0x1981a1 == "궁") {
    if (_0x367767 == "추가") {
      return (1 + buffSizeByType(_0x667ef6, "궁뎀증")) * (1 + buffSizeByType(_0x667ef6, "가아증"));
    }
    if (_0x367767 == "발동") {
      return (1 + buffSizeByType(_0x667ef6, "궁뎀증") + buffSizeByType(_0x667ef6, "발효증") + buffSizeByType(_0x667ef6, "발뎀증")) * (1 + buffSizeByType(_0x667ef6, "가아증"));
    }
  } else if (_0x1981a1 == "평") {
    if (_0x367767 == "추가") {
      return (1 + buffSizeByType(_0x667ef6, "일뎀증")) * (1 + buffSizeByType(_0x667ef6, "가아증"));
    }
    if (_0x367767 == "발동") {
      return (1 + buffSizeByType(_0x667ef6, "궁뎀증") + buffSizeByType(_0x667ef6, "발효증") + buffSizeByType(_0x667ef6, "발뎀증")) * (1 + buffSizeByType(_0x667ef6, "가아증"));
    }
  } else if (_0x1981a1 == "방") {
    if (_0x367767 == "발동") {
      return (1 + buffSizeByType(_0x667ef6, "궁뎀증") + buffSizeByType(_0x667ef6, "발효증") + buffSizeByType(_0x667ef6, "발뎀증")) * (1 + buffSizeByType(_0x667ef6, "가아증"));
    }
  } else {
    return 1 + buffSizeByType(_0x667ef6, "가아증");
  }
}
// [perf] 第二轮改写 A：tbf 族热路径去 Array.from+spread（self time 合计~5%）。
//   常规调用（参数个数匹配）走显式位置传参零分配；非常规参数个数兜底走原 spread 路径逐位等价
//   （tbf 等封装的调用点全部固定参数个数，兜底分支实际不触发，仅保留语义完整）。
function tbf() {
  const _n = arguments.length;
  if (_n != 5) {
    showAlert(Array.from(arguments));
    return buff(...arguments, true);
  }
  return buff(arguments[0], arguments[1], arguments[2], arguments[3], arguments[4], true);
}
function ptbf() {
  const _n = arguments.length;
  if (_n != 8) {
    showAlert(Array.from(arguments));
    return buff(...arguments, "추가", true);
  }
  return buff(arguments[0], arguments[1], arguments[2], arguments[3], arguments[4], arguments[5], arguments[6], arguments[7], "추가", true);
}
function atbf() {
  const _n = arguments.length;
  if (_n != 8) {
    showAlert(Array.from(arguments));
    return buff(...arguments, "발동", true);
  }
  return buff(arguments[0], arguments[1], arguments[2], arguments[3], arguments[4], arguments[5], arguments[6], arguments[7], "발동", true);
}
function nbf() {
  const _n = arguments.length;
  if (_n != 6) {
    showAlert(Array.from(arguments));
    return buff(...arguments, true);
  }
  return buff(arguments[0], arguments[1], arguments[2], arguments[3], arguments[4], arguments[5], true);
}
function pnbf() {
  const _n = arguments.length;
  if (_n != 9) {
    showAlert(Array.from(arguments));
    return buff(...arguments, "추가", true);
  }
  return buff(arguments[0], arguments[1], arguments[2], arguments[3], arguments[4], arguments[5], arguments[6], arguments[7], arguments[8], "추가", true);
}
function anbf() {
  const _n = arguments.length;
  if (_n != 9) {
    showAlert(Array.from(arguments));
    return buff(...arguments, "발동", true);
  }
  return buff(arguments[0], arguments[1], arguments[2], arguments[3], arguments[4], arguments[5], arguments[6], arguments[7], arguments[8], "발동", true);
}
function showAlert(_0x4d8d76) {
  alert("버프 오류 발견");
}
function setBuffOnAll(_0x2166e3, _0x34543a, _0x2808e7, _0x4c9d96) {
  const _0x45abbe = _0x2166e3.buff.filter(_0x5bc10e => _0x5bc10e.div == _0x34543a && _0x5bc10e.name == _0x2808e7);
  _0x45abbe.forEach(_0x3f329f => _0x3f329f.on = _0x4c9d96);
  _bumpBuffGen();   // [perf] R2-D：on 字段变更影响派生量
}
function setBuffOn(_0x301a80, _0x460477, _0x400a21, _0x2f27a9) {
  const _0x208079 = _0x301a80.buff.find(_0x17eb0e => _0x17eb0e.div == _0x460477 && _0x17eb0e.name == _0x400a21);
  if (_0x208079) {
    _0x208079.on = _0x2f27a9;
    _bumpBuffGen();   // [perf] R2-D（仅在真变更时 bump，省无谓失效）
  }
}
function setBuffOnExtra(_0x143e61, _0x333646, _0x5061f3, _0x45e1e1, _0xa852b0) {
  const _0x4b7b51 = _0x143e61.buff.find(_0x351569 => _0x351569.div == _0x5061f3 && _0x351569.name == _0x45e1e1 && _0x5061f3 != "기본" && _0x351569.act == _0x333646);
  if (_0x4b7b51) {
    _0x4b7b51.on = _0xa852b0;
    _bumpBuffGen();   // [perf] R2-D
  }
}
function setBuffSizeUp(_0x47934d, _0x511956, _0xb28497, _0x329da4) {
  const _0x4be593 = _0x47934d.buff.find(_0x2d93ac => _0x2d93ac.div == _0x511956 && _0x2d93ac.name == _0xb28497);
  if (_0x4be593) {
    _0x4be593.size += _0x329da4;
    _bumpBuffGen();   // [perf] R2-D
  }
}
function setBuffSize(_0x514872, _0x376197, _0xfd7f44, _0x2623e1) {
  const _0x6e93fb = _0x514872.buff.find(_0x2411d4 => _0x2411d4.div == _0x376197 && _0x2411d4.name == _0xfd7f44);
  if (_0x6e93fb) {
    _0x6e93fb.size = _0x2623e1;
    _bumpBuffGen();   // [perf] R2-D
  }
}
function setBuffSizeAll(_0x5ce9f3, _0x5eadfd, _0x26862b, _0x33f1a8) {
  const _0x51bb5d = _0x5ce9f3.buff.filter(_0x3609d0 => _0x3609d0.div == _0x5eadfd && _0x3609d0.name == _0x26862b);
  _0x51bb5d.forEach(_0x3efbb3 => _0x3efbb3.size = _0x33f1a8);
  _bumpBuffGen();   // [perf] R2-D
}
function setBuffNest(_0x31da2b, _0x445ce3, _0x3ad8b9, _0x3b24bd) {
  const _0x46faf7 = _0x31da2b.buff.find(_0x861f0 => _0x861f0.div == _0x445ce3 && _0x861f0.name == _0x3ad8b9);
  if (_0x46faf7) {
    _0x46faf7.nest = _0x3b24bd;
    _bumpBuffGen();   // [perf] R2-D
  }
}
function setBuffWho(_0x34bcd3, _0x3b9926, _0x1e35aa, _0x1044c9) {
  const _0x233cd4 = _0x34bcd3.buff.find(_0x4d56eb => _0x4d56eb.div == _0x3b9926 && _0x4d56eb.name == _0x1e35aa);
  if (_0x233cd4) {
    _0x233cd4.who = _0x1044c9;
  }
}
function getBuffSize(_0x3e4c34, _0x381bde, _0x560538) {
  const _0x44725e = _0x3e4c34.buff.find(_0x10dba2 => _0x10dba2.div == _0x381bde && _0x10dba2.name == _0x560538);
  if (_0x44725e) {
    return _0x44725e.size;
  } else {
    return undefined;
  }
}
function setMnc(_0x1290a3, _0x1a1889, _0xbe2f38) {
  if (_0xbe2f38 == undefined || _0xbe2f38 == null || _0xbe2f38 < 1 || _0xbe2f38 > 5) {
    _0xbe2f38 = 5;
  }
  _0xbe2f38 -= 1;
  _0x1290a3.ultMag = _0x1a1889[_0xbe2f38 * 2];
  _0x1290a3.cd = _0x1a1889[_0xbe2f38 * 2 + 1];
  _0x1290a3.curCd = _0x1a1889[_0xbe2f38 * 2 + 1];
}
function setDefault(_0x55e037, _0x78c5e1) {
  switch (_0x55e037.id) {
    case 10001:
      setMnc(_0x55e037, [393, 4, 448, 4, 503, 4, 503, 4, 503, 3], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(_0x55e037, "공퍼증", 25, "맹렬한 불길1", 3);
            tbf(_0x55e037, "가뎀증", 5, "맹렬한 불길2", 3);
            break;
          case 2:
            tbf(_0x55e037, "공퍼증", 25, "맹렬한 불길1", 3);
            tbf(_0x55e037, "가뎀증", 5, "맹렬한 불길2", 3);
            break;
          case 3:
            tbf(_0x55e037, "공퍼증", 25, "맹렬한 불길1", 3);
            tbf(_0x55e037, "가뎀증", 10, "맹렬한 불길2", 3);
            break;
          case 4:
            tbf(_0x55e037, "공퍼증", 35, "맹렬한 불길1", 3);
            tbf(_0x55e037, "가뎀증", 10, "맹렬한 불길2", 3);
            break;
          default:
            tbf(_0x55e037, "공퍼증", 35, "맹렬한 불길1", 3);
            tbf(_0x55e037, "가뎀증", 10, "맹렬한 불길2", 3);
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
        cdChange(_0x55e037, -1);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(20);
        tbf(all, "공퍼증", 40, "마왕 바알의 꿍꿍이1", always);
        tbf(all, "가뎀증", 20, "마왕 바알의 꿍꿍이2", always);
        tbf(_0x55e037, "공퍼증", 125, "마왕 바알의 꿍꿍이3", always);
        tbf(_0x55e037, "궁뎀증", 25, "마왕 바알의 꿍꿍이4", always);
      };
      _0x55e037.passive = function () {
        tbf(_0x55e037, "일뎀증", 25, "마왕의 육체1", always);
        tbf(_0x55e037, "궁뎀증", 15, "마왕의 육체2", always);
        anbf(_0x55e037, "궁", _0x55e037, "공퍼증", 15, "알 수 없는 성격", 1, 2, always);
        for (let _0x568831 of getElementIdx("화")) {
          anbf(_0x55e037, "궁", comp[_0x568831], "받속뎀", 10, "바알의 장난", 1, 2, always);
        }
        tbf(_0x55e037, "일뎀증", 10, "일반 공격 데미지+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
        if (GLOBAL_TURN == 1) {
          cdChange(_0x55e037, -1);
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10002:
      setMnc(_0x55e037, [0, 4, 0, 4, 0, 4, 0, 4, 0, 3], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(_0x55e037, "공퍼증", 60, "잔학무도", 3);
            break;
          case 2:
            tbf(_0x55e037, "공퍼증", 80, "잔학무도", 3);
            break;
          case 3:
            tbf(_0x55e037, "공퍼증", 100, "잔학무도", 3);
            break;
          case 4:
            tbf(_0x55e037, "공퍼증", 100, "잔학무도", 3);
            break;
          default:
            tbf(_0x55e037, "공퍼증", 100, "잔학무도", 3);
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        tbf(all, "공퍼증", 40, "마왕 사탄의 호기1", always);
        tbf(all, "가뎀증", 20, "마왕 사탄의 호기2", always);
        tbf(_0x55e037, "공퍼증", 100, "마왕 사탄의 호기3", always);
      };
      _0x55e037.passive = function () {
        tbf(_0x55e037, "반격*", 100, "사탄의 보답1", always);
        anbf(_0x55e037, "피격", _0x55e037, "공퍼증", 10, "사탄의 보답2", 1, 10, always);
        anbf(_0x55e037, "피격", _0x55e037, "가뎀증", 2, "불패의 육체", 1, 10, always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10003:
      setMnc(_0x55e037, [388, 4, 445, 4, 503, 4, 560, 4, 560, 3], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            nbf(_0x55e037, "받캐뎀", 5, "장미 맹독", 1, 3);
            break;
          case 2:
            nbf(_0x55e037, "받캐뎀", 5, "장미 맹독", 1, 3);
            break;
          case 3:
            nbf(_0x55e037, "받캐뎀", 10, "장미 맹독", 1, 3);
            break;
          case 4:
            nbf(_0x55e037, "받캐뎀", 10, "장미 맹독", 1, 3);
            break;
          default:
            nbf(_0x55e037, "받캐뎀", 10, "장미 맹독", 1, 3);
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(20);
        tbf(all, "공퍼증", 40, "마왕 이블리스의 오만1", always);
        tbf(all, "가뎀증", 20, "마왕 이블리스의 오만2", always);
        tbf(_0x55e037, "평추가*", 150, "마왕 이블리스의 오만3", always);
        tbf(_0x55e037, "궁추가*", 150, "마왕 이블리스의 오만3", always);
      };
      _0x55e037.passive = function () {
        tbf(_0x55e037, "공퍼증", 20, "비전의 마력 의식", always);
        tbf(_0x55e037, "일뎀증", 20, "마력 섭취1", always);
        tbf(_0x55e037, "궁뎀증", 25, "마력 섭취3", always);
        tbf(_0x55e037, "공퍼증", 25, "중생 압박1", always);
        for (let _0x15b5b8 of getElementIdx("광")) {
          anbf(_0x55e037, "공격", comp[_0x15b5b8], "받속뎀", 4, "중생 압박2", 1, 5, always);
        }
        tbf(_0x55e037, "일뎀증", 10, "일반 공격 데미지+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10004:
      setMnc(_0x55e037, [475, 6, 550, 6, 625, 6, 625, 6, 625, 6], _0x78c5e1);
      _0x55e037.ultbefore = function () {};
      _0x55e037.ultafter = function () {
        switch (_0x78c5e1) {
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
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
        boss.def = false;
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(20);
        tbf(all, "공퍼증", 50, "엘프의 영역1", always);
        tbf(all, "일뎀증", 50, "엘프의 영역2", always);
        tbf(_0x55e037, "공퍼증", 50, "엘프의 영역3", always);
      };
      _0x55e037.passive = function () {
        atbf(_0x55e037, "공격", all, "가뎀증", 20, "인도자1", 1, always);
        atbf(_0x55e037, "공격", all, "일뎀증", 30, "인도자2", 1, always);
        pnbf(_0x55e037, "궁", boss, "받뎀증", 12.5, "파천일격1", 1, 2, always);
        anbf(_0x55e037, "궁", boss, "받일뎀", 35, "파천일격3", 1, 2, always);
        tbf(all, "공퍼증", 25, "불어오는 승리의 바람", always);
        tbf(_0x55e037, "일뎀증", 10, "일반 공격 데미지+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
        if (GLOBAL_TURN == 1) {
          cdChange(_0x55e037, -6);
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10005:
      setMnc(_0x55e037, [631, 6, 736, 6, 840, 6, 945, 6, 1050, 6], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        boss.def = false;
      };
      _0x55e037.ultafter = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(_0x55e037, "일뎀증", 60, "활공 찢기", 3);
            break;
          case 2:
            tbf(_0x55e037, "일뎀증", 70, "활공 찢기", 3);
            break;
          case 3:
            tbf(_0x55e037, "일뎀증", 80, "활공 찢기", 3);
            break;
          case 4:
            tbf(_0x55e037, "일뎀증", 90, "활공 찢기", 3);
            break;
          default:
            tbf(_0x55e037, "일뎀증", 100, "활공 찢기", 3);
            break;
        }
      };
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(20);
        tbf(_0x55e037, "공퍼증", 125, "난쟁이왕의 기세1", always);
        tbf(_0x55e037, "일뎀증", 100, "난쟁이왕의 기세2", always);
        tbf(_0x55e037, "가뎀증", 35, "난쟁이왕의 기세3", always);
      };
      _0x55e037.passive = function () {
        anbf(_0x55e037, "행동", _0x55e037, "공퍼증", 15, "에너지 세이브", 1, 4, always);
        anbf(_0x55e037, "행동", _0x55e037, "가뎀증", 5, "정신통일", 1, 4, always);
        tbf(_0x55e037, "궁뎀증", 50, "파룡의 환광1", always);
        for (let _0x10f84e of getElementIdx("수")) {
          anbf(_0x55e037, "행동", comp[_0x10f84e], "받속뎀", 6, "파룡의 환광2", 1, 4, always);
        }
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10006:
      setMnc(_0x55e037, [0, 5, 0, 5, 0, 4, 0, 4, 0, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            for (let _0x5db052 of getRoleIdx("섶")) {
              tbf(comp[_0x5db052], "공고증", myCurAtk + _0x55e037.id + 20, "모두 화이팅!", 1);
            }
            break;
          case 2:
            for (let _0x1d13f0 of getRoleIdx("섶")) {
              tbf(comp[_0x1d13f0], "공고증", myCurAtk + _0x55e037.id + 20, "모두 화이팅!", 1);
            }
            break;
          case 3:
            for (let _0x1f2408 of getRoleIdx("섶")) {
              tbf(comp[_0x1f2408], "공고증", myCurAtk + _0x55e037.id + 20, "모두 화이팅!", 1);
            }
            break;
          case 4:
            for (let _0x124643 of getRoleIdx("섶")) {
              tbf(comp[_0x124643], "공고증", myCurAtk + _0x55e037.id + 20, "모두 화이팅!", 1);
            }
            break;
          default:
            for (let _0x5736ed of getRoleIdx("섶")) {
              tbf(comp[_0x5736ed], "공고증", myCurAtk + _0x55e037.id + 25, "모두 화이팅!", 1);
            }
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
        for (let _0xb606ea of comp) {
          _0xb606ea.heal();
        }
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
        for (let _0x582d3d of comp) {
          _0x582d3d.heal();
        }
      };
      _0x55e037.leader = function () {
        hpUpAll(35);
        for (let _0x4d3e4a = 0; _0x4d3e4a < 5; _0x4d3e4a++) {
          if (getRoleIdx("탱").includes(_0x4d3e4a)) {
            hpUpMe(comp[_0x4d3e4a], 15);
          }
        }
        tbf(all, "공퍼증", 40, "보호 욕구 자극1", always);
        tbf(all, "궁뎀증", 25, "보호 욕구 자극2", always);
        tbf(all, "가뎀증", 20, "보호 욕구 자극3", always);
      };
      _0x55e037.passive = function () {
        const _0x310379 = comp.reduce((_0xefc669, _0x4b3ed0) => {
          if (_0x4b3ed0.curHp < _0xefc669.curHp) {
            return _0x4b3ed0;
          } else {
            return _0xefc669;
          }
        }, comp[0]);
        atbf(_0x55e037, "평", _0x310379, "힐", 40, "추가 치료", 1, always);
        atbf(_0x55e037, "공격", all, "공고증", myCurAtk + _0x55e037.id + 25, "전격 지원", 1, always);
        tbf(all, "궁뎀증", 30, "모두에게 노력의 성과를 보여주겠어!1", always);
        for (let _0x50cbd9 of getElementIdx("풍")) {
          anbf(_0x55e037, "궁", comp[_0x50cbd9], "받속뎀", 20, "모두에게 노력의 성과를 보여주겠어!2", 1, 2, always);
        }
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {};
      return _0x55e037;
    case 10007:
      setMnc(_0x55e037, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {};
      _0x55e037.ultafter = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(boss, "도트뎀", myCurAtk + _0x55e037.id + 399, "대천사의 진노", 1);
            break;
          case 2:
            tbf(boss, "도트뎀", myCurAtk + _0x55e037.id + 458, "대천사의 진노", 1);
            break;
          case 3:
            tbf(boss, "도트뎀", myCurAtk + _0x55e037.id + 518, "대천사의 진노", 1);
            break;
          case 4:
            tbf(boss, "도트뎀", myCurAtk + _0x55e037.id + 578, "대천사의 진노", 1);
            break;
          default:
            tbf(boss, "도트뎀", myCurAtk + _0x55e037.id + 638, "대천사의 진노", 1);
            break;
        }
      };
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        for (let _0x2725d0 of getElementIdx("광")) {
          atbf(comp[_0x2725d0], "행동", all, "공퍼증", 30, "<대천사의 축복-성벌>", 50, 1);
        }
        for (let _0x71fc01 of getElementIdx("화", "풍")) {
          atbf(comp[_0x71fc01], "행동", all, "일뎀증", 60, "<대천사의 축복-심판>", 50, 1);
        }
        for (let _0x39858e of getElementIdx("수", "암")) {
          atbf(comp[_0x39858e], "행동", all, "궁뎀증", 30, "<대천사의 축복-정죄>", 50, 1);
        }
      };
      _0x55e037.passive = function () {
        atbf(_0x55e037, "평", boss, "도트뎀", myCurAtk + _0x55e037.id + 130, "빛의 징계", 1, always);
        for (let _0x246ab7 of getElementIdx("광")) {
          atbf(comp[_0x246ab7], "행동", all, "공퍼증", 10, "<천사의 축복-성벌>", 50, 1);
        }
        for (let _0x24bbb3 of getElementIdx("화", "풍")) {
          atbf(comp[_0x24bbb3], "행동", all, "일뎀증", 20, "<천사의 축복-심판>", 50, 1);
        }
        for (let _0x414cfb of getElementIdx("수", "암")) {
          atbf(comp[_0x414cfb], "행동", all, "궁뎀증", 10, "<천사의 축복-정죄>", 50, 1);
        }
        atbf(_0x55e037, "공격", _0x55e037, "공퍼증", 50, "천벌의 힘", 4, always);
        tbf(_0x55e037, "공퍼증", 10, "공격력 증가", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10008:
      setMnc(_0x55e037, [60, 4, 70, 4, 80, 4, 90, 4, 100, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            nbf(_0x55e037, "공퍼증", 125, "전 지역 섬멸모드 - 가동", 1, 2);
            break;
          case 2:
            nbf(_0x55e037, "공퍼증", 130, "전 지역 섬멸모드 - 가동", 1, 2);
            break;
          case 3:
            nbf(_0x55e037, "공퍼증", 135, "전 지역 섬멸모드 - 가동", 1, 2);
            break;
          case 4:
            nbf(_0x55e037, "공퍼증", 140, "전 지역 섬멸모드 - 가동", 1, 2);
            break;
          default:
            nbf(_0x55e037, "공퍼증", 150, "전 지역 섬멸모드 - 가동", 1, 2);
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        tbf(all, "공퍼증", 70, "최종 병기 소녀 모드", always);
        _0x55e037.cd -= 3;
        tbf(_0x55e037, "공퍼증", 450, "<최종병기 · 해방>1", 6);
        tbf(_0x55e037, "일뎀증", 100, "<최종병기 · 해방>2", 6);
        tbf(_0x55e037, "궁뎀증", 100, "<최종병기 · 해방>3", 6);
      };
      _0x55e037.passive = function () {
        anbf(_0x55e037, "공격", _0x55e037, "가뎀증", 10, "자아 학습 전투 시스템", 1, 5, always);
        atbf(_0x55e037, "방", _0x55e037, "아머", _0x55e037.hp * 50, "방어 모드 - 전환", 3, always);
        anbf(_0x55e037, "방", _0x55e037, "가뎀증", 10, "자아 학습 전투 시스템", -2, 5, always);
        tbf(_0x55e037, "공발동*", 100, "마인드 센서포 - 가동", always);
        tbf(_0x55e037, "일뎀증", 10, "일반 공격 데미지+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {
          if (GLOBAL_TURN == 1) {
            cdChange(_0x55e037, -4);
          }
          if (GLOBAL_TURN == 7) {
            _0x55e037.cd += 3;
            _0x55e037.curCd += 3;
            if (_0x55e037.curCd > _0x55e037.cd) {
              _0x55e037.curCd = _0x55e037.cd;
            }
          }
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10017:
      setMnc(_0x55e037, [330, 4, 376, 4, 422, 4, 468, 4, 514, 3], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(_0x55e037, "가뎀증", 25, "태양제의 성찬", 3);
            break;
          case 2:
            tbf(_0x55e037, "가뎀증", 30, "태양제의 성찬", 3);
            break;
          case 3:
            tbf(_0x55e037, "가뎀증", 35, "태양제의 성찬", 3);
            break;
          case 4:
            tbf(_0x55e037, "가뎀증", 35, "태양제의 성찬", 4);
            break;
          default:
            tbf(_0x55e037, "가뎀증", 35, "태양제의 성찬", 4);
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037, 2);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(30);
        tbf(all, "공퍼증", 45, "축제 마왕의 기세1", always);
        tbf(_0x55e037, "일뎀증", 150, "축제 마왕의 기세2", always);
        anbf(boss, "피격", _0x55e037, "공퍼증", 20, "<광란의 올나잇>1", 1, 5, 50);
        atbf(boss, "피격", _0x55e037, "평추가*", 30, "<광란의 올나잇>2", 50, 50);
        atbf(boss, "피격", boss, "제거", "발동", "<광란의 올나잇>1", 1, 1);
        atbf(boss, "피격", boss, "제거", "발동", "<광란의 올나잇>2", 1, 1);
      };
      _0x55e037.passive = function () {
        tbf(_0x55e037, "공퍼증", 40, "돈은 행동력으로부터", always);
        tbf(_0x55e037, "일뎀증", 80, "돈은 행동력으로부터", always);
        atbf(_0x55e037, "궁", _0x55e037, "평추가*", 150, "<고가 매입>", 4, always);
        tbf(_0x55e037, "일뎀증", 10, "일반 공격 데미지+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
        if (GLOBAL_TURN == 1) {
          cdChange(_0x55e037, -4);
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10018:
      setMnc(_0x55e037, [0, 3, 0, 3, 0, 3, 0, 3, 0, 3], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(_0x55e037, "아머", _0x55e037.hp * 30 * armorUp(_0x55e037, "궁", "추가"), "용자 돌진 - 엉망진창1", 1);
            tbf(_0x55e037, "평추가+", _0x55e037.atk * 150, "용자 돌진 - 엉망진창2", 4);
            tbf(_0x55e037, "궁추가+", _0x55e037.atk * 150, "용자 돌진 - 엉망진창3", 4);
            break;
          case 2:
            tbf(_0x55e037, "아머", _0x55e037.hp * 35 * armorUp(_0x55e037, "궁", "추가"), "용자 돌진 - 엉망진창1", 1);
            tbf(_0x55e037, "평추가+", _0x55e037.atk * 190, "용자 돌진 - 엉망진창2", 4);
            tbf(_0x55e037, "궁추가+", _0x55e037.atk * 190, "용자 돌진 - 엉망진창3", 4);
            break;
          case 3:
            tbf(_0x55e037, "아머", _0x55e037.hp * 40 * armorUp(_0x55e037, "궁", "추가"), "용자 돌진 - 엉망진창1", 1);
            tbf(_0x55e037, "평추가+", _0x55e037.atk * 190, "용자 돌진 - 엉망진창2", 4);
            tbf(_0x55e037, "궁추가+", _0x55e037.atk * 190, "용자 돌진 - 엉망진창3", 4);
            break;
          case 4:
            tbf(_0x55e037, "아머", _0x55e037.hp * 45 * armorUp(_0x55e037, "궁", "추가"), "용자 돌진 - 엉망진창1", 1);
            tbf(_0x55e037, "평추가+", _0x55e037.atk * 190, "용자 돌진 - 엉망진창2", 4);
            tbf(_0x55e037, "궁추가+", _0x55e037.atk * 190, "용자 돌진 - 엉망진창3", 4);
            break;
          default:
            tbf(_0x55e037, "아머", _0x55e037.hp * 50 * armorUp(_0x55e037, "궁", "추가"), "용자 돌진 - 엉망진창1", 1);
            tbf(_0x55e037, "평추가+", _0x55e037.atk * 230, "용자 돌진 - 엉망진창2", 4);
            tbf(_0x55e037, "궁추가+", _0x55e037.atk * 230, "용자 돌진 - 엉망진창3", 4);
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {
        tbf(_0x55e037, "아머", _0x55e037.hp * 15, "생을 위한 투쟁", 1);
      };
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        tbf(all, "공퍼증", 30, "우자의 마음 - 나만의 정의1", always);
        hpUpAll(25);
        _0x55e037.cd -= 1;
        _0x55e037.curCd -= 1;
        tbf(_0x55e037, "일뎀증", 100, "우자의 마음 - 나만의 정의2", always);
        tbf(_0x55e037, "궁뎀증", 40, "우자의 마음 - 나만의 정의3", always);
      };
      _0x55e037.passive = function () {
        tbf(_0x55e037, "평추가+", _0x55e037.atk * 150, "바보의 직진1", always);
        tbf(_0x55e037, "궁추가+", _0x55e037.atk * 375, "바보의 직진2", always);
        tbf(_0x55e037, "받아증", 35, "공존 불가1", always);
        tbf(_0x55e037, "가뎀증", 25, "공존 불가2", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10019:
      setMnc(_0x55e037, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(_0x55e037, "공퍼증", 30, "성검해방 - 성신역법", 3);
            break;
          case 2:
            tbf(_0x55e037, "공퍼증", 30, "성검해방 - 성신역법", 3);
            break;
          case 3:
            tbf(_0x55e037, "공퍼증", 35, "성검해방 - 성신역법", 3);
            break;
          case 4:
            tbf(_0x55e037, "공퍼증", 40, "성검해방 - 성신역법", 3);
            break;
          default:
            tbf(_0x55e037, "공퍼증", 45, "성검해방 - 성신역법", 3);
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        tbf(all, "공퍼증", 40, "기원의 힘1", always);
        for (let _0x10b9c8 of getRoleIdx("딜")) {
          atbf(comp[_0x10b9c8], "공격", _0x55e037, "가뎀증", 25, "공격 습득1", 1, always);
          atbf(comp[_0x10b9c8], "공격", _0x55e037, "평추가*", 75, "공격 습득2", 1, always);
          atbf(comp[_0x10b9c8], "공격", _0x55e037, "궁추가*", 75, "공격 습득3", 1, always);
        }
        for (let _0x1e3849 of getRoleIdx("섶")) {
          const _0x43f865 = comp[_0x1e3849].ultafter;
          comp[_0x1e3849].ultafter = function (..._0x14d9e3) {
            _0x43f865.apply(this, _0x14d9e3);
            atbf(_0x55e037, "공격", _0x55e037, "공퍼증", 50, "보조 습득", 2, 1);
          };
          const _0x189d9c = comp[_0x1e3849].atkafter;
          comp[_0x1e3849].atkafter = function (..._0x59efdc) {
            _0x189d9c.apply(this, _0x59efdc);
            atbf(_0x55e037, "공격", _0x55e037, "공퍼증", 50, "보조 습득", 2, 1);
          };
        }
        for (let _0x303d29 of getRoleIdx("디")) {
          const _0x419f49 = comp[_0x303d29].ultafter;
          comp[_0x303d29].ultafter = function (..._0x10ca39) {
            _0x419f49.apply(this, _0x10ca39);
            atbf(_0x55e037, "공격", boss, "받뎀증", 20, "방해 습득", 2, 1);
          };
          const _0x4aba87 = comp[_0x303d29].atkafter;
          comp[_0x303d29].atkafter = function (..._0x4a823a) {
            _0x4aba87.apply(this, _0x4a823a);
            atbf(_0x55e037, "공격", boss, "받뎀증", 20, "방해 습득", 2, 1);
          };
        }
      };
      _0x55e037.passive = function () {
        tbf(_0x55e037, "궁추가*", 100, "흩날리는 별빛의 검", always);
        for (let _0x2e9c45 of comp) {
          if (_0x2e9c45.id != _0x55e037.id) {
            atbf(_0x2e9c45, "공격", _0x55e037, "일뎀증", 10, "스타더스트 플래시1", 1, 50);
            atbf(_0x2e9c45, "공격", _0x55e037, "궁뎀증", 4, "스타더스트 플래시2", 1, 50);
          }
        }
        atbf(_0x55e037, "평", _0x55e037, "아머", _0x55e037.hp * 12.5, "구원의 별빛1", 1, always);
        anbf(_0x55e037, "궁", _0x55e037, "받캐뎀", 17.5, "구원의 별빛2", 1, 2, always);
        tbf(_0x55e037, "공퍼증", 10, "공격력 증가", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10020:
      setMnc(_0x55e037, [265, 3, 298, 3, 331, 3, 364, 3, 397, 3], _0x78c5e1);
      _0x55e037.ultbefore = function () {};
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        tbf(all, "공퍼증", 40, "개조 시작... 히히히...1", always);
        const _0x3ad51a = [1, 3];
        for (let _0x13d91a of _0x3ad51a) {
          tbf(comp[_0x13d91a], "궁뎀증", 30, "개조 시작... 히히히...2", always);
          tbf(comp[_0x13d91a], "일뎀증", 60, "개조 시작... 히히히...3", always);
        }
      };
      _0x55e037.passive = function () {
        for (let _0x3730a6 of comp) {
          atbf(_0x55e037, "궁", _0x3730a6, "아머", _0x3730a6.hp * 30, "커브드 포스필드", 1, always);
        }
        tbf(_0x55e037, "공퍼증", 10, "공격+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 4 == 0) {
          const _0x36dc34 = [1, 3];
          for (let _0x394f1d of _0x36dc34) {
            tbf(comp[_0x394f1d], "궁뎀증", 50, "마도 개조 수술", 2);
          }
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10021:
      setMnc(_0x55e037, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            for (let _0x5d7ff3 of comp) {
              if (_0x5d7ff3.id != _0x55e037.id) {
                tbf(_0x5d7ff3, "공퍼증", 15, "재생의 바람1", 4);
              }
            }
            break;
          case 2:
            for (let _0x28cf12 of comp) {
              if (_0x28cf12.id != _0x55e037.id) {
                tbf(_0x28cf12, "공퍼증", 17.5, "재생의 바람1", 4);
              }
            }
            break;
          case 3:
            for (let _0x37a475 of comp) {
              if (_0x37a475.id != _0x55e037.id) {
                tbf(_0x37a475, "공퍼증", 17.5, "재생의 바람1", 1);
              }
            }
            for (let _0x3af2d9 of comp) {
              if (_0x3af2d9.id != _0x55e037.id) {
                tbf(_0x3af2d9, "공퍼증", 17.5, "재생의 바람1", 4);
              }
            }
            break;
          case 4:
            for (let _0x3f56cc of comp) {
              if (_0x3f56cc.id != _0x55e037.id) {
                tbf(_0x3f56cc, "공퍼증", 20, "재생의 바람1", 1);
              }
            }
            for (let _0x92649a of comp) {
              if (_0x92649a.id != _0x55e037.id) {
                tbf(_0x92649a, "공퍼증", 20, "재생의 바람1", 4);
              }
            }
            break;
          default:
            for (let _0x35b2de of comp) {
              if (_0x35b2de.id != _0x55e037.id) {
                tbf(_0x35b2de, "공퍼증", 25, "재생의 바람1", 1);
              }
            }
            for (let _0x37d4e3 of comp) {
              if (_0x37d4e3.id != _0x55e037.id) {
                tbf(_0x37d4e3, "공퍼증", 25, "재생의 바람1", 4);
              }
            }
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
        for (let _0x5072ef of comp) {
          _0x5072ef.heal();
        }
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
        for (let _0x3da1ed of comp) {
          _0x3da1ed.heal();
        }
      };
      _0x55e037.leader = function () {
        hpUpAll(10);
        tbf(all, "공퍼증", 40, "시공을 초월한 현자1", always);
        for (let _0xd51b60 of getRoleIdx("딜", "디")) {
          tbf(comp[_0xd51b60], "가뎀증", 20, "시공을 초월한 현자2", always);
        }
        for (let _0x2a030a of getRoleIdx("탱")) {
          hpUpMe(comp[_0x2a030a], 10);
        }
        for (let _0x5a11a6 of getRoleIdx("힐", "섶")) {
          tbf(comp[_0x5a11a6], "공퍼증", 40, "시공을 초월한 현자4", always);
        }
      };
      _0x55e037.passive = function () {
        hpUpMe(_0x55e037, 10);
        for (let _0x58a563 of comp) {
          atbf(_0x55e037, "공격", _0x58a563, "아머", _0x58a563.hp * 10, "전능의 술1", 1, always);
        }
        for (let _0x3f3445 of getRoleIdx("딜", "디")) {
          atbf(_0x55e037, "공격", comp[_0x3f3445], "공고증", myCurAtk + _0x55e037.id + 20, "전능의 술2", 1, always);
        }
        tbf(_0x55e037, "공퍼증", 20, "천 년의 지혜", always);
        for (let _0x137c63 of getRoleIdx("딜", "디")) {
          tbf(comp[_0x137c63], "가뎀증", 15, "<적재적소>1", 50);
        }
        for (let _0x53a9f2 of getRoleIdx("힐", "섶")) {
          tbf(comp[_0x53a9f2], "공퍼증", 15, "<적재적소>2", 50);
        }
        tbf(_0x55e037, "공퍼증", 10, "공격+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10022:
      setMnc(_0x55e037, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {};
      _0x55e037.ultafter = function () {
        switch (_0x78c5e1) {
          case 1:
            anbf(boss, "피격", _0x55e037, "받캐뎀", 8.75, "배 가르기1", 1, 8, 4);
            break;
          case 2:
            anbf(boss, "피격", _0x55e037, "받캐뎀", 10, "배 가르기1", 1, 8, 4);
            break;
          case 3:
            anbf(boss, "피격", _0x55e037, "받캐뎀", 11.25, "배 가르기1", 1, 8, 4);
            nbf(boss, "받뎀증", 10, "배 가르기2", 1, 1);
            break;
          case 4:
            anbf(boss, "피격", _0x55e037, "받캐뎀", 12.5, "배 가르기1", 1, 8, 4);
            nbf(boss, "받뎀증", 20, "배 가르기2", 1, 1);
            break;
          default:
            anbf(boss, "피격", _0x55e037, "받캐뎀", 15, "배 가르기1", 1, 8, 4);
            nbf(boss, "받뎀증", 30, "배 가르기2", 1, 1);
        }
      };
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037, 10);
        deleteBuff(_0x55e037, "기본", "배 가르기1");
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(20);
        for (let _0x5dc3a6 of comp) {
          tbf(_0x5dc3a6, "궁뎀증", 50, "전쟁의 광기1", always);
        }
        for (let _0x2a3e31 of getRoleIdx("딜", "디", "탱")) {
          tbf(comp[_0x2a3e31], "공퍼증", 40, "전쟁의 광기2", always);
          tbf(comp[_0x2a3e31], "가뎀증", 25, "전쟁의 광기3", always);
        }
        atbf(_0x55e037, "궁", all, "힐", myCurAtk + _0x55e037.id + 200, "전쟁의 광기4", 1, always);
        for (let _0x43b2ad of getRoleIdx("딜", "디", "탱")) {
          if (_0x43b2ad != 0) {
            atbf(comp[_0x43b2ad], "궁", comp[0], "공퍼증", 90, "학살 시간이다!1", 1, always);
            atbf(comp[_0x43b2ad], "궁", comp[0], "궁추가*", 80, "학살 시간이다!2", 1, always);
          }
        }
      };
      _0x55e037.passive = function () {
        anbf(_0x55e037, "방", _0x55e037, "공퍼증", 100, "극도의 흥분", 1, 1, always);
        atbf(_0x55e037, "궁", _0x55e037, "제거", "기본", "극도의 흥분", 1, always);
        anbf(_0x55e037, "궁", _0x55e037, "가뎀증", 12, "물고 늘어지기", 1, 5, always);
        atbf(_0x55e037, "평", _0x55e037, "궁뎀증", 50, "아드레날린1", 2, always);
        atbf(_0x55e037, "평", _0x55e037, "궁추가*", 100, "아드레날린2", 2, always);
        tbf(_0x55e037, "궁추가*", 30, "궁극기 추격+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader && GLOBAL_TURN > 1) {
          for (let _0x31076e of comp);
        }
      };
      _0x55e037.turnover = function () {};
      return _0x55e037;
    case 10023:
      _0x55e037.stack = 0;
      setMnc(_0x55e037, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x78c5e1);
      buff_ex.push("<재편제>", "<역공 타이밍>", "<나약한 허상>", "<방향 틀기>");
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(_0x55e037, "공퍼증", 40, "광견의 충복1", 1);
            for (let _0x4c3d41 of comp) {
              if (_0x4c3d41.id != _0x55e037.id) {
                tbf(_0x4c3d41, "공고증", myCurAtk + _0x55e037.id + 20, "광견의 충복2", 1);
              }
            }
            atbf(_0x55e037, "방", all, "아머", _0x55e037.hp * 15, "광견의 충복3", 4, 4);
            break;
          case 2:
            tbf(_0x55e037, "공퍼증", 60, "광견의 충복1", 1);
            for (let _0x8d7984 of comp) {
              if (_0x8d7984.id != _0x55e037.id) {
                tbf(_0x8d7984, "공고증", myCurAtk + _0x55e037.id + 20, "광견의 충복2", 1);
              }
            }
            atbf(_0x55e037, "방", all, "아머", _0x55e037.hp * 17.5, "광견의 충복3", 4, 4);
            break;
          case 3:
            tbf(_0x55e037, "공퍼증", 70, "광견의 충복1", 1);
            for (let _0x531ec7 of comp) {
              if (_0x531ec7.id != _0x55e037.id) {
                tbf(_0x531ec7, "공고증", myCurAtk + _0x55e037.id + 22.5, "광견의 충복2", 1);
              }
            }
            atbf(_0x55e037, "방", all, "아머", _0x55e037.hp * 17.5, "광견의 충복3", 4, 4);
            break;
          case 4:
            tbf(_0x55e037, "공퍼증", 90, "광견의 충복1", 1);
            for (let _0x7197a8 of comp) {
              if (_0x7197a8.id != _0x55e037.id) {
                tbf(_0x7197a8, "공고증", myCurAtk + _0x55e037.id + 22.5, "광견의 충복2", 1);
              }
            }
            atbf(_0x55e037, "방", all, "아머", _0x55e037.hp * 20, "광견의 충복3", 4, 4);
            break;
          default:
            tbf(_0x55e037, "공퍼증", 100, "광견의 충복1", 1);
            for (let _0x10cb4a of comp) {
              if (_0x10cb4a.id != _0x55e037.id) {
                tbf(_0x10cb4a, "공고증", myCurAtk + _0x55e037.id + 25, "광견의 충복2", 1);
              }
            }
            atbf(_0x55e037, "방", all, "아머", _0x55e037.hp * 20, "광견의 충복3", 4, 4);
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        const _0x79277f = _0x55e037.stack;
        setBuffOn(_0x55e037, "추가", "<반서의 포효>1-1", _0x79277f > 0);
        setBuffOn(_0x55e037, "추가", "<반서의 포효>1-2", _0x79277f > 0);
        setBuffOn(_0x55e037, "추가", "<반서의 포효>1-3", _0x79277f > 0);
        setBuffOn(_0x55e037, "추가", "<반서의 포효>1-4", _0x79277f > 0);
        setBuffOn(_0x55e037, "추가", "<반서의 포효>2", _0x79277f > 0);
        setBuffOn(_0x55e037, "추가", "<반서의 포효>3", _0x79277f > 0);
        setBuffOn(_0x55e037, "추가", "<반서의 포효>4", _0x79277f > 0);
        const _0x2610f0 = _0x55e037.getNest("<역공 타이밍>");
        setBuffOn(_0x55e037, "기본", "<역습의 포화>", _0x2610f0 > 0);
        setBuffOnAll(_0x55e037, "기본", "<역습의 총알 세례>", _0x2610f0 > 0);
        ultLogic(_0x55e037);
        _0x55e037.stack = 0;
      };
      _0x55e037.atkbefore = function () {
        tbf(all, "공퍼증", 25, "작전 지휘", 1);
      };
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(10);
        tbf(all, "공퍼증", 100, "광견의 시야1", always);
        for (let _0x374b7a of comp) {
          if (_0x374b7a.id != _0x55e037.id) {
            anbf(_0x374b7a, "방", comp[0], "<재편제>", 0, "광견의 시야2", 1, 4, 50);
          }
        }
        buff(_0x55e037, "궁", comp[1], "공고증", myCurAtk + _0x55e037.id + 25, "<반서의 포효>1-1", 1, always, "추가", false);
        buff(_0x55e037, "궁", comp[2], "공고증", myCurAtk + _0x55e037.id + 25, "<반서의 포효>1-2", 1, always, "추가", false);
        buff(_0x55e037, "궁", comp[3], "공고증", myCurAtk + _0x55e037.id + 25, "<반서의 포효>1-3", 1, always, "추가", false);
        buff(_0x55e037, "궁", comp[4], "공고증", myCurAtk + _0x55e037.id + 25, "<반서의 포효>1-4", 1, always, "추가", false);
        buff(_0x55e037, "궁", all, "가뎀증", 50, "<반서의 포효>2", 1, always, "추가", false);
        buff(_0x55e037, "궁", all, "궁뎀증", 50, "<반서의 포효>3", 1, always, "추가", false);
        buff(_0x55e037, "궁", boss, "받뎀증", 50, "<반서의 포효>4", 1, always, "추가", false);
        anbf(_0x55e037, "궁", _0x55e037, "<방향 틀기>", 0, "광견의 시야3", -1, 1, always);
      };
      _0x55e037.passive = function () {
        nbf(_0x55e037, "<나약한 허상>", 0, "전략적 후퇴", 1, 1);
        anbf(_0x55e037, "궁", _0x55e037, "<나약한 허상>", 0, "전략적 후퇴", 1, 1, always);
        anbf(_0x55e037, "방", _0x55e037, "<역공 타이밍>", 0, "자신감의 계략", 1, 1, always);
        buff(_0x55e037, "궁추가*", 150, "<역습의 포화>", always, false);
        anbf(_0x55e037, "궁", _0x55e037, "<역공 타이밍>", 0, "자신감의 계략", -1, 1, always);
        buff(_0x55e037, "궁추가*", 45.5, "<역습의 총알 세례>", always, false);
        buff(_0x55e037, "궁추가*", 45.5, "<역습의 총알 세례>", always, false);
        buff(_0x55e037, "궁추가*", 45.5, "<역습의 총알 세례>", always, false);
        buff(_0x55e037, "궁추가*", 45.5, "<역습의 총알 세례>", always, false);
        buff(_0x55e037, "궁추가*", 45.5, "<역습의 총알 세례>", always, false);
        buff(_0x55e037, "궁추가*", 45.5, "<역습의 총알 세례>", always, false);
        buff(_0x55e037, "궁추가*", 45.5, "<역습의 총알 세례>", always, false);
        buff(_0x55e037, "궁추가*", 45.5, "<역습의 총알 세례>", always, false);
        tbf(_0x55e037, "공퍼증", 10, "공격+", always);
      };
      const _0x4615a5 = _0x55e037.hit;
      _0x55e037.hit = function (..._0x49f67f) {
        _0x4615a5.apply(this, _0x49f67f);
        deleteBuff(_0x55e037, "발동", "<반격>");
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
        deleteBuff(_0x55e037, "발동", "광견의 충복3");
        if (_0x55e037.isLeader && _0x55e037.getNest("<재편제>") == 4) {
          nbf(_0x55e037, "<방향 틀기>", 0, "광견의 시야3", 1, 1);
          _0x55e037.stack = 1;
        }
        if (_0x55e037.getNest("<나약한 허상>") == 1) {
          atbf(_0x55e037, "피격", all, "가뎀증", 35, "<반격>", 5, 1);
          anbf(_0x55e037, "피격", _0x55e037, "<나약한 허상>", 0, "전략적 후퇴", -1, 1, 1);
        }
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {
          if (GLOBAL_TURN > 1) {
            nbf(_0x55e037, "<재편제>", 0, "광견의 시야2", -4, 4);
          }
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10024:
      setMnc(_0x55e037, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x78c5e1);
      buff_ex.push("<영혼 접촉>", "<대영혼 접촉>");
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
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
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        for (let _0x2d9e9e of getRoleIdx("딜", "디")) {
          buff(comp[_0x2d9e9e], "평추가*", 40, "<영혼 접촉>", always, false);
          const _0x46b3e5 = comp[_0x2d9e9e].attack;
          comp[_0x2d9e9e].attack = function (..._0x4196af) {
            const _0x59b8c2 = comp[_0x2d9e9e].getNest("<영혼 접촉>");
            setBuffOn(comp[_0x2d9e9e], "기본", "<영혼 접촉>", _0x59b8c2 > 0);
            _0x46b3e5.apply(this, _0x4196af);
            nbf(comp[_0x2d9e9e], "<영혼 접촉>", 0, "영혼 조종술 : 스릴 나이트", -1, 2);
            setBuffOn(comp[_0x2d9e9e], "기본", "<영혼 접촉>", _0x59b8c2 > 1);
          };
        }
        if (getRoleCnt("딜") >= 3) {
          tbf(all, "공퍼증", 40, "<망령 빙의>1", always);
          tbf(all, "일뎀증", 40, "<망령 빙의>2", always);
          for (let _0x8920f4 of comp) {
            anbf(_0x8920f4, "궁", _0x8920f4, "받일뎀", 6, "<망령 빙의>3", 1, 4, always);
          }
        }
        if (getRoleCnt("디") >= 2) {
          tbf(all, "공퍼증", 40, "<망령 빙의>1", always);
          tbf(all, "일뎀증", 40, "<망령 빙의>2", always);
          for (let _0x397a69 of comp) {
            anbf(_0x397a69, "궁", _0x397a69, "받일뎀", 6, "<망령 빙의>4", 1, 4, always);
          }
        }
      };
      _0x55e037.passive = function () {
        tbf(_0x55e037, "공퍼증", 40, "집령의 힘", always);
        for (let _0x8d1651 of getRoleIdx("딜", "디")) {
          buff(comp[_0x8d1651], "평추가*", 60, "<대영혼 접촉>", always, false);
          const _0x1ab9f5 = comp[_0x8d1651].attack;
          comp[_0x8d1651].attack = function (..._0x267273) {
            const _0x4787da = comp[_0x8d1651].getNest("<대영혼 접촉>");
            setBuffOn(comp[_0x8d1651], "기본", "<대영혼 접촉>", _0x4787da > 0);
            _0x1ab9f5.apply(this, _0x267273);
            nbf(comp[_0x8d1651], "<대영혼 접촉>", 0, "영혼 조종술 : 대영혼 접촉", -1, 2);
            setBuffOn(comp[_0x8d1651], "기본", "<대영혼 접촉>", _0x4787da > 1);
          };
        }
        anbf(_0x55e037, "평", boss, "받뎀증", 3.5, "영혼 찢어발기기", 1, 8, always);
        tbf(_0x55e037, "일뎀증", 10, "일반 공격 데미지+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {
          if (GLOBAL_TURN > 1) {
            for (let _0x298066 of getRoleIdx("딜", "디")) {
              tbf(comp[_0x298066], "공고증", myCurAtk + _0x55e037.id + 20, "<언데드 병사 강화술>", 1);
            }
          }
          if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 4 == 0) {
            for (let _0x58284e of getRoleIdx("딜", "디")) {
              nbf(comp[_0x58284e], "<영혼 접촉>", 0, "영혼 조종술 : 스릴 나이트", 2, 2);
              setBuffOn(comp[_0x58284e], "기본", "<영혼 접촉>", true);
            }
          }
        }
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 4 == 0) {
          for (let _0x18f6f0 of getRoleIdx("딜", "디")) {
            nbf(comp[_0x18f6f0], "<대영혼 접촉>", 0, "영혼 조종술 : 대영혼 접촉", 2, 2);
            setBuffOn(comp[_0x18f6f0], "기본", "<대영혼 접촉>", true);
          }
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10025:
      setMnc(_0x55e037, [0, 6, 0, 6, 0, 6, 0, 6, 0, 6], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(boss, "도트뎀", myCurAtk + _0x55e037.id + 138.5, "달밤의 뜨거운 노래", 6);
            break;
          case 2:
            tbf(boss, "도트뎀", myCurAtk + _0x55e037.id + 160.4, "달밤의 뜨거운 노래", 6);
            break;
          case 3:
            tbf(boss, "도트뎀", myCurAtk + _0x55e037.id + 182.3, "달밤의 뜨거운 노래", 6);
            break;
          case 4:
            tbf(boss, "도트뎀", myCurAtk + _0x55e037.id + 204.2, "달밤의 뜨거운 노래", 6);
            break;
          default:
            tbf(boss, "도트뎀", myCurAtk + _0x55e037.id + 220, "달밤의 뜨거운 노래", 6);
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {
        tbf(boss, "도트뎀", myCurAtk + _0x55e037.id + 50, "열창", 4);
      };
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        tbf(_0x55e037, "공퍼증", 50, "고귀하고 완벽한 마족 아이돌", always);
      };
      _0x55e037.passive = function () {
        tbf(_0x55e037, "공퍼증", 20, "가창력", always);
        _0x55e037.cd -= 2;
        _0x55e037.curCd = _0x55e037.curCd < 2 ? 0 : _0x55e037.curCd - 2;
        tbf(_0x55e037, "공퍼증", 10, "공격력 증가", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {
          if (GLOBAL_TURN == 1) {
            cdChange(_0x55e037, -6);
          }
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10026:
      setMnc(_0x55e037, [0, 6, 0, 6, 0, 6, 0, 6, 0, 6], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        for (let _0x355237 of comp) {
          if (_0x355237.id != _0x55e037.id) {
            cdChange(_0x355237, -1);
          }
        }
        switch (_0x78c5e1) {
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
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {
        tbf(all, "공고증", myCurAtk + _0x55e037.id + 30, "열창", 1);
      };
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(30);
        tbf(all, "공퍼증", 60, "반짝 아이돌 스타 노엘리1", always);
        tbf(all, "받아증", -75, "반짝 아이돌 스타 노엘리2", always);
        _0x55e037.cd -= 3;
        _0x55e037.curCd -= 3;
        anbf(_0x55e037, "궁", all, "궁뎀증", 10, "반짝 아이돌 스타 노엘리3", 1, 4, always);
      };
      _0x55e037.passive = function () {
        tbf(_0x55e037, "받아증", 30, "두 손을 들어요1", always);
        atbf(_0x55e037, "공격", all, "받아증", 12.5, "두 손을 들어요2", 2, always);
        anbf(_0x55e037, "궁", all, "공퍼증", 30, "함께 노래해요", 1, 1, always);
        atbf(_0x55e037, "궁", all, "공고증", myCurAtk + _0x55e037.id + 30, "팬들을 사랑해1", 1, always);
        atbf(_0x55e037, "궁", all, "아머", myCurAtk + _0x55e037.id + 100, "팬들을 사랑해2", 4, always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10027:
      setMnc(_0x55e037, [0, 3, 0, 3, 0, 3, 0, 3, 0, 3], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(boss, "받발뎀", 60, "살의의 유혹1", 3);
            tbf(_0x55e037, "공퍼증", 60, "살의의 유혹2", 1);
            break;
          case 2:
            tbf(boss, "받발뎀", 70, "살의의 유혹1", 3);
            tbf(_0x55e037, "공퍼증", 70, "살의의 유혹2", 1);
            break;
          case 3:
            tbf(boss, "받발뎀", 80, "살의의 유혹1", 3);
            tbf(_0x55e037, "공퍼증", 80, "살의의 유혹2", 1);
            break;
          case 4:
            tbf(boss, "받발뎀", 90, "살의의 유혹1", 3);
            tbf(_0x55e037, "공퍼증", 90, "살의의 유혹2", 1);
            break;
          default:
            tbf(boss, "받발뎀", 100, "살의의 유혹1", 3);
            tbf(_0x55e037, "공퍼증", 100, "살의의 유혹2", 1);
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {
        tbf(_0x55e037, "공퍼증", 25, "갈겨찢기", 2);
      };
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        _0x55e037.cd -= 1;
        _0x55e037.curCd -= 1;
        tbf(_0x55e037, "공퍼증", 33, "블러드문의 재앙", always);
      };
      _0x55e037.passive = function () {
        anbf(_0x55e037, "피격", _0x55e037, "공퍼증", 10, "고통과 희열", 1, 5, always);
        tbf(_0x55e037, "반격*", 100, "살육의 욕망대로", always);
        tbf(_0x55e037, "가뎀증", 35, "살육의 충동", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10028:
      setMnc(_0x55e037, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            for (let _0x11b0f3 of getElementIdx("풍")) {
              nbf(comp[_0x11b0f3], "받속뎀", 15, "치즈루 전력의 일격!", 1, 2);
            }
            break;
          case 2:
            for (let _0x2a0c8f of getElementIdx("풍")) {
              nbf(comp[_0x2a0c8f], "받속뎀", 15, "치즈루 전력의 일격!", 1, 2);
            }
            break;
          case 3:
            for (let _0x1c501e of getElementIdx("풍")) {
              nbf(comp[_0x1c501e], "받속뎀", 15, "치즈루 전력의 일격!", 1, 2);
            }
            break;
          case 4:
            for (let _0x34b21f of getElementIdx("풍")) {
              nbf(comp[_0x34b21f], "받속뎀", 20, "치즈루 전력의 일격!", 1, 2);
            }
            break;
          default:
            for (let _0x60ee80 of getElementIdx("풍")) {
              nbf(comp[_0x60ee80], "받속뎀", 25, "치즈루 전력의 일격!", 1, 2);
            }
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
        deleteBuff(_0x55e037, "기본", "방어 가속");
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpMe(_0x55e037, 50);
        tbf(_0x55e037, "공퍼증", 200, "각성 치즈루!1", always);
        tbf(_0x55e037, "궁뎀증", 100, "각성 치즈루!2", always);
      };
      _0x55e037.passive = function () {
        anbf(_0x55e037, "방", _0x55e037, "공퍼증", 50, "방어 가속", 1, 1, always);
        atbf(_0x55e037, "궁", all, "가뎀증", 20, "열풍의 격려1", 4, always);
        for (let _0x3a15cb of getElementIdx("풍")) {
          anbf(_0x55e037, "궁", comp[_0x3a15cb], "궁뎀증", 20, "열풍의 격려2", 1, 2, always);
        }
        tbf(_0x55e037, "궁뎀증", 10, "궁극기 데미지+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
        cdChange(_0x55e037, -1);
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10029:
      setMnc(_0x55e037, [365, 4, 417, 4, 470, 4, 523, 4, 576, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        if (_0x78c5e1 >= 5) {
          nbf(boss, "받뎀증", 20, "워터 슬라이드 최고!", 1, 1);
        }
      };
      _0x55e037.ultafter = function () {
        if (_0x78c5e1 < 5) {
          nbf(boss, "받뎀증", 20, "워터 슬라이드 최고!", 1, 1);
        }
      };
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        for (let _0x31a43f of getRoleIdx("딜")) {
          tbf(comp[_0x31a43f], "공퍼증", 60, "다들~전력을 다해 놀아보자구!", always);
        }
      };
      _0x55e037.passive = function () {
        anbf(_0x55e037, "공격", boss, "받뎀증", 4.5, "요호술 - 환통", 1, 6, always);
        tbf(_0x55e037, "공퍼증", 40, "멈출 수 없는 즐거움", always);
        tbf(_0x55e037, "궁뎀증", 10, "궁극기 데미지+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10030:
      setMnc(_0x55e037, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(all, "공퍼증", 20, "여름이 최고!1", 2);
            for (let _0x850d68 of getRoleIdx("힐", "섶")) {
              buff(comp[_0x850d68], "공격", all, "공퍼증", 15, "여름이 최고!2", 1, 2, "발동", false);
            }
            break;
          case 2:
            tbf(all, "공퍼증", 25, "여름이 최고!1", 2);
            for (let _0x12208d of getRoleIdx("힐", "섶")) {
              buff(comp[_0x12208d], "공격", all, "공퍼증", 15, "여름이 최고!2", 1, 2, "발동", false);
            }
            break;
          case 3:
            tbf(all, "공퍼증", 25, "여름이 최고!1", 2);
            for (let _0x5d440f of getRoleIdx("힐", "섶")) {
              buff(comp[_0x5d440f], "공격", all, "공퍼증", 20, "여름이 최고!2", 1, 2, "발동", false);
            }
            break;
          case 4:
            tbf(all, "공퍼증", 30, "여름이 최고!1", 2);
            for (let _0x26323b of getRoleIdx("힐", "섶")) {
              buff(comp[_0x26323b], "공격", all, "공퍼증", 20, "여름이 최고!2", 1, 2, "발동", false);
            }
            break;
          default:
            tbf(all, "공퍼증", 30, "여름이 최고!1", 2);
            for (let _0x5947e6 of getRoleIdx("힐", "섶")) {
              buff(comp[_0x5947e6], "공격", all, "공퍼증", 25, "여름이 최고!2", 1, 2, "발동", false);
            }
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
        for (let _0x1140d8 of comp) {
          setBuffOnAll(_0x1140d8, "발동", "여름이 최고!2", true);
        }
      };
      _0x55e037.atkbefore = function () {
        tbf(all, "공고증", myCurAtk + _0x55e037.id + 30, "공주의 응원", 1);
      };
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        for (let _0x1e561a of getRoleIdx("힐", "섶")) {
          tbf(comp[_0x1e561a], "평추가*", 100, "집결! 공주호위대1", always);
          tbf(comp[_0x1e561a], "궁추가*", 200, "집결! 공주호위대2", always);
        }
      };
      _0x55e037.passive = function () {
        atbf(_0x55e037, "궁", all, "아머", myCurAtk + _0x55e037.id + 100, "루루는 아픈 게 싫다구요", 1, always);
        for (let _0x3ccff4 of getRoleIdx("힐", "섶")) {
          tbf(comp[_0x3ccff4], "궁뎀증", 40, "난 강해질 거에요", 50);
        }
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 4 == 0) {
          tbf(boss, "받뎀증", 35, "루루를 괴롭히면 안 돼요~", 1);
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10031:
      setMnc(_0x55e037, [265, 3, 298, 3, 331, 3, 364, 3, 397, 3], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        if (_0x78c5e1 == 3) {
          tbf(boss, "받뎀증", 15, "출력 120% - 스매시", 3);
        }
        if (_0x78c5e1 == 4) {
          tbf(boss, "받뎀증", 20, "출력 120% - 스매시", 3);
        }
        if (_0x78c5e1 >= 5) {
          tbf(boss, "받뎀증", 20, "출력 120% - 스매시", 3);
        }
      };
      _0x55e037.ultafter = function () {
        if (_0x78c5e1 == 2) {
          tbf(boss, "받뎀증", 15, "출력 120% - 스매시", 3);
        }
        if (_0x78c5e1 == 1) {
          tbf(boss, "받뎀증", 15, "출력 120% - 스매시", 3);
        }
      };
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        tbf(boss, "받궁뎀", 50, "신뢰가는 해변의 보디가드", 50);
      };
      _0x55e037.passive = function () {
        tbf(_0x55e037, "궁뎀증", 20, "약점 분석", always);
        anbf(_0x55e037, "공격", boss, "받발뎀", 7.5, "고속 미니 어뢰3", 1, 4, always);
        anbf(_0x55e037, "궁", boss, "받발뎀", 32.5, "어획용 음폭탄3", 1, 1, always);
        tbf(_0x55e037, "공퍼증", 10, "공격력 증가", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 3 == 0) {
          tbf(_0x55e037, "공발동*", 40, "고속 미니 어뢰2", 1);
          tbf(_0x55e037, "공발동*", 40, "고속 미니 어뢰2", 1);
          tbf(_0x55e037, "공발동*", 40, "고속 미니 어뢰2", 1);
        }
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 4 == 0) {
          tbf(_0x55e037, "공발동*", 50, "어획용 음폭탄1", 1);
          tbf(_0x55e037, "공발동*", 50, "어획용 음폭탄1", 1);
          tbf(_0x55e037, "공발동*", 50, "어획용 음폭탄1", 1);
          tbf(_0x55e037, "공발동*", 50, "어획용 음폭탄1", 1);
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10032:
      setMnc(_0x55e037, [475, 6, 550, 6, 625, 6, 700, 6, 775, 6], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        if (_0x78c5e1 >= 5) {
          tbf(_0x55e037, "공퍼증", 15, "빛나는 모래사장이다냥!1", 1);
        }
        tbf(boss, "받궁뎀", 35, "빛나는 모래사장이다냥!2", 1);
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        tbf(all, "공발동*", 65, "묘비술오의 - 모래바람 냥이1", 50);
      };
      _0x55e037.passive = function () {
        anbf(_0x55e037, "궁", _0x55e037, "공퍼증", 30, "방심하지 않았다구", 1, 1, always);
        anbf(_0x55e037, "공격", all, "궁뎀증", 5, "민첩한 몸놀림", 1, 6, always);
        tbf(_0x55e037, "궁뎀증", 10, "궁극기 데미지+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10033:
      setMnc(_0x55e037, [0, 3, 0, 3, 0, 3, 0, 3, 0, 3], _0x78c5e1);
      _0x55e037.ultbefore = function () {};
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {
        tbf(boss, "받일뎀", 10, "악몽1", 3);
        tbf(boss, "궁뎀증", 5, "악몽2", 3);
        tbf(_0x55e037, "아머", myCurAtk + _0x55e037.id + armorUp(_0x55e037, "평", "추가") * 50, "악몽3", 1);
      };
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {};
      _0x55e037.passive = function () {};
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10034:
      setMnc(_0x55e037, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x78c5e1);
      const _0x2474ef = comp.find(_0x96c4e8 => _0x96c4e8.id == 10035);
      _0x55e037.ultbefore = function () {};
      _0x55e037.ultafter = function () {
        for (let _0x1ffe06 of comp) {
          tbf(_0x1ffe06, "아머", _0x1ffe06.hp * 15 * armorUp(_0x55e037, "궁", "추가"), "블러드 컷팅", 1);
        }
      };
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        for (let _0x975c1f of getElementIdx("화", "수")) {
          tbf(comp[_0x975c1f], "가뎀증", 50, "뒤엉킨 운명 - 레드1", always);
        }
        tbf(_0x55e037, "일뎀증", 30, "뒤엉킨 운명 - 레드2", 50);
        if (_0x2474ef) {
          tbf(_0x2474ef, "일뎀증", 30, "뒤엉킨 운명 - 레드2", 50);
        }
      };
      _0x55e037.passive = function () {
        tbf(_0x55e037, "일뎀증", 30, "붉은 재단", always);
        tbf(_0x55e037, "궁뎀증", 30, "블러드 커터1", always);
        if (_0x2474ef) {
          tbf(_0x55e037, "가뎀증", 20, "블러드 커터2", always);
        }
        atbf(_0x55e037, "궁", _0x55e037, "일뎀증", 50, "영감 폭발", 4, always);
        tbf(_0x55e037, "일뎀증", 10, "일반 공격 데미지+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10035:
      setMnc(_0x55e037, [388, 4, 445, 4, 503, 4, 560, 4, 618, 4], _0x78c5e1);
      const _0x5f28c7 = comp.find(_0x387801 => _0x387801.id == 10034);
      _0x55e037.ultbefore = function () {};
      _0x55e037.ultafter = function () {
        for (let _0x3a34ce of comp) {
          tbf(_0x3a34ce, "아머", _0x3a34ce.hp * 15 * armorUp(_0x55e037, "궁", "추가"), "쪽빛 방직", 1);
        }
      };
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        for (let _0x2f8bc1 of getElementIdx("화", "수")) {
          tbf(comp[_0x2f8bc1], "가뎀증", 50, "뒤엉킨 운명 - 블루1", always);
        }
        tbf(_0x55e037, "궁뎀증", 20, "뒤엉킨 운명 - 블루3", 50);
        if (_0x5f28c7) {
          tbf(_0x5f28c7, "궁뎀증", 20, "뒤엉킨 운명 - 블루3", 50);
        }
      };
      _0x55e037.passive = function () {
        tbf(_0x55e037, "궁뎀증", 30, "푸른 봉제", always);
        tbf(_0x55e037, "궁뎀증", 30, "코발트 니들1", always);
        if (_0x5f28c7) {
          tbf(_0x55e037, "가뎀증", 20, "코발트 니들2", always);
        }
        atbf(_0x55e037, "평", _0x55e037, "궁뎀증", 10, "냉정한 판단", 6, always);
        tbf(_0x55e037, "궁뎀증", 10, "궁극기 데미지+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10037:
      setMnc(_0x55e037, [330, 4, 376, 4, 376, 3, 422, 3, 468, 3], _0x78c5e1);
      _0x55e037.ultbefore = function () {};
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        for (let _0x56fe64 of getElementIdx("화")) {
          tbf(comp[_0x56fe64], "공퍼증", 35, "정열의 춤사위", always);
        }
      };
      _0x55e037.passive = function () {
        atbf(_0x55e037, "평", boss, "받일뎀", 10, "카두케우스의 물어뜯기1", 3, always);
        atbf(_0x55e037, "궁", boss, "받궁뎀", 15, "카두케우스의 물어뜯기2", 2, always);
        anbf(_0x55e037, "공격", boss, "받일뎀", 4, "메스, 케이티 협공!", 1, 5, always);
        tbf(_0x55e037, "일뎀증", 10, "일반 공격 데미지+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10039:
      setMnc(_0x55e037, [505, 5, 586, 5, 667, 5, 748, 5, 829, 5], _0x78c5e1);
      _0x55e037.ultbefore = function () {};
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        const _0x5ef8b9 = [1, 3];
        for (let _0x4cd86d of _0x5ef8b9) {
          atbf(comp[_0x4cd86d], "공격", _0x55e037, "공고증", myCurAtk + comp[_0x4cd86d].id + 65, "피의 제물1", 1, always);
        }
        atbf(_0x55e037, "공격", all, "힐", 15, "피의 제물2", 1, always);
      };
      _0x55e037.passive = function () {
        anbf(_0x55e037, "평", _0x55e037, "공퍼증", 5, "선혈 섭취", 1, 3, always);
        _0x55e037.cd -= 1;
        _0x55e037.curCd -= 1;
        tbf(_0x55e037, "공퍼증", 10, "공격력 증가", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
        if (GLOBAL_TURN == 1) {
          cdChange(_0x55e037, -5);
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10040:
      setMnc(_0x55e037, [330, 4, 376, 4, 422, 4, 422, 4, 468, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        if (_0x78c5e1 == 3) {
          nbf(_0x55e037, "받캐뎀", 10, "천재 특제, 할로윈 한정 마력포", 1, 2);
        }
        if (_0x78c5e1 > 3) {
          nbf(_0x55e037, "받캐뎀", 15, "천재 특제, 할로윈 한정 마력포", 1, 2);
        }
      };
      _0x55e037.ultafter = function () {
        if (_0x78c5e1 < 3) {
          nbf(_0x55e037, "받캐뎀", 10, "천재 특제, 할로윈 한정 마력포", 1, 2);
        }
      };
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        tbf(all, "공퍼증", 40, "여러분의 마력을 내게 내줄래... 농담이야1", always);
        _0x55e037.stopCd = true;
        tbf(_0x55e037, "궁뎀증", 100, "여러분의 마력을 내게 내줄래... 농담이야2", always);
        for (let _0x564832 = 1; _0x564832 < 5; _0x564832++) {
          if (!getRoleIdx("탱").includes(_0x564832)) {
            const _0x14d8ae = comp[_0x564832].defense;
            comp[_0x564832].defense = function (..._0x1ad8c6) {
              _0x14d8ae.apply(this, _0x1ad8c6);
              cdChange(comp[0], -2);
              cdChange(comp[_0x564832], 1);
            };
            atbf(comp[_0x564832], "방", _0x55e037, "공고증", myCurAtk + comp[_0x564832].id + 20, "여러분의 마력을 내게 내줄래... 농담이야3", 2, always);
          }
        }
      };
      _0x55e037.passive = function () {
        atbf(_0x55e037, "평", _0x55e037, "궁뎀증", 10, "서큐버스의 달란트", 4, always);
        atbf(_0x55e037, "궁", _0x55e037, "공퍼증", 50, "빠진 독에 마력 붓기", 4, always);
        tbf(_0x55e037, "가뎀증", 35, "서큐버스 군사의 비책", always);
        tbf(_0x55e037, "궁뎀증", 10, "궁극기 데미지+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
        for (let _0x12787b of _0x55e037.buff) {
          if (_0x12787b.div == "기본" && _0x12787b.name == "빠진 독에 마력 붓기") {
            _0x12787b.size -= 12.5;
          }
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10042:
      setMnc(_0x55e037, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            for (let _0x18e384 of getElementIdx("화", "수")) {
              tbf(comp[_0x18e384], "공퍼증", 30, "소녀의 연심은 무적!1", 1);
            }
            for (let _0xe33792 of getElementIdx("화", "수")) {
              nbf(comp[_0xe33792], "받속뎀", 5, "소녀의 연심은 무적!2", 1, 2);
            }
            break;
          case 2:
            for (let _0x3f065c of getElementIdx("화", "수")) {
              tbf(comp[_0x3f065c], "공퍼증", 30, "소녀의 연심은 무적!1", 1);
            }
            for (let _0x48b6e5 of getElementIdx("화", "수")) {
              nbf(comp[_0x48b6e5], "받속뎀", 7.5, "소녀의 연심은 무적!2", 1, 2);
            }
            break;
          case 3:
            for (let _0x36665d of getElementIdx("화", "수")) {
              tbf(comp[_0x36665d], "공퍼증", 40, "소녀의 연심은 무적!1", 1);
            }
            for (let _0x342697 of getElementIdx("화", "수")) {
              nbf(comp[_0x342697], "받속뎀", 10, "소녀의 연심은 무적!2", 1, 2);
            }
            break;
          case 4:
            for (let _0x543d96 of getElementIdx("화", "수")) {
              tbf(comp[_0x543d96], "공퍼증", 40, "소녀의 연심은 무적!1", 1);
            }
            for (let _0x296ef8 of getElementIdx("화", "수")) {
              nbf(comp[_0x296ef8], "받속뎀", 12.5, "소녀의 연심은 무적!2", 1, 2);
            }
            break;
          default:
            for (let _0x273a6a of getElementIdx("화", "수")) {
              tbf(comp[_0x273a6a], "공퍼증", 40, "소녀의 연심은 무적!1", 1);
            }
            for (let _0x231155 of getElementIdx("화", "수")) {
              nbf(comp[_0x231155], "받속뎀", 15, "소녀의 연심은 무적!2", 1, 2);
            }
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        tbf(all, "공퍼증", 100, "이블리스의 초호화 리조트!1", always);
        for (let _0x3cba8b of comp) {
          atbf(_0x55e037, "공격", _0x3cba8b, "아머", _0x3cba8b.hp * 25, "이블리스의 초호화 리조트!2", 1, always);
        }
        if (getRoleCnt("딜") == 5) {
          atbf(all, "공격", all, "힐", 1, "여름 만끽1", 1, always);
          for (let _0x2372c2 of comp) {
            atbf(_0x2372c2, "궁", all, "아머", myCurAtk + _0x2372c2.id + 12.5, "여름 만끽2", 1, always);
          }
          anbf(all, "공격", all, "궁뎀증", 5, "여름 만끽3", 1, 10, always);
          for (let _0x5c3f43 of getElementIdx("수", "화")) {
            anbf(all, "공격", comp[_0x5c3f43], "받속뎀", 3, "여름 만끽4", 1, 10, always);
          }
        }
      };
      _0x55e037.passive = function () {
        for (let _0xa95fd of getElementIdx("수", "화")) {
          anbf(_0x55e037, "궁", comp[_0xa95fd], "공퍼증", 15, "여름 해변의 꽃2", 1, 2, always);
        }
        tbf(_0x55e037, "가뎀증", 25, "나에게 굴복하라!", always);
        tbf(_0x55e037, "공퍼증", 10, "공격력 증가", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 4 == 0) {
          for (let _0x101230 of getElementIdx("수", "화")) {
            tbf(comp[_0x101230], "받속뎀", 40, "오만하구나!", 1);
          }
        }
      };
      _0x55e037.turnover = function () {};
      return _0x55e037;
    case 10043:
      setMnc(_0x55e037, [331.2, 4, 386.4, 4, 441.6, 4, 496.8, 4, 548, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        for (let _0x4d5cfe of comp) {
          deleteBuff(_0x4d5cfe, "기본", "최강 최고 최상의 할로 엘프 퀸1");
          deleteBuff(_0x4d5cfe, "기본", "최강 최고 최상의 할로 엘프 퀸2");
          deleteBuff(_0x4d5cfe, "기본", "최강 최고 최상의 할로 엘프 퀸3");
        }
        switch (_0x78c5e1) {
          case 1:
            tbf(all, "공퍼증", 22.2, "최강 최고 최상의 할로 엘프 퀸1", 4);
            for (let _0x5aeee3 of getElementIdx("풍")) {
              tbf(comp[_0x5aeee3], "받속뎀", 13.3, "최강 최고 최상의 할로 엘프 퀸3", 4);
            }
            break;
          case 2:
            tbf(all, "공퍼증", 25.9, "최강 최고 최상의 할로 엘프 퀸1", 4);
            for (let _0x3cbab1 of getElementIdx("풍")) {
              tbf(comp[_0x3cbab1], "받속뎀", 15.5, "최강 최고 최상의 할로 엘프 퀸3", 4);
            }
            break;
          case 3:
            tbf(all, "공퍼증", 29.6, "최강 최고 최상의 할로 엘프 퀸1", 4);
            for (let _0x2a6773 of getRoleIdx("딜", "섶")) {
              if (comp[_0x2a6773].id == _0x55e037.id) {
                continue;
              }
              tbf(comp[_0x2a6773], "궁추가*", 30.4, "최강 최고 최상의 할로 엘프 퀸2", 5);
            }
            for (let _0x450b2c of getElementIdx("풍")) {
              tbf(comp[_0x450b2c], "받속뎀", 17.8, "최강 최고 최상의 할로 엘프 퀸3", 4);
            }
            break;
          case 4:
            tbf(all, "공퍼증", 33.3, "최강 최고 최상의 할로 엘프 퀸1", 4);
            for (let _0x11dac9 of getRoleIdx("딜", "섶")) {
              if (comp[_0x11dac9].id == _0x55e037.id) {
                continue;
              }
              tbf(comp[_0x11dac9], "궁추가*", 34.2, "최강 최고 최상의 할로 엘프 퀸2", 5);
            }
            for (let _0x302ba1 of getElementIdx("풍")) {
              tbf(comp[_0x302ba1], "받속뎀", 20, "최강 최고 최상의 할로 엘프 퀸3", 4);
            }
            break;
          default:
            tbf(all, "공퍼증", 37, "최강 최고 최상의 할로 엘프 퀸1", 4);
            for (let _0x4c60be of getRoleIdx("딜", "섶")) {
              if (comp[_0x4c60be].id == _0x55e037.id) {
                continue;
              }
              tbf(comp[_0x4c60be], "궁추가*", 38, "최강 최고 최상의 할로 엘프 퀸2", 5);
            }
            for (let _0x55a67e of getElementIdx("풍")) {
              tbf(comp[_0x55a67e], "받속뎀", 22.2, "최강 최고 최상의 할로 엘프 퀸3", 4);
            }
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037, 2);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(55);
        if (getElementCnt("풍") >= 3) {
          for (let _0x5bb2ad of getRoleIdx("딜", "힐", "섶")) {
            tbf(comp[_0x5bb2ad], "공퍼증", 11.3, "<캔디 축제>1", always);
            tbf(comp[_0x5bb2ad], "가뎀증", 30.8, "<캔디 축제>2", always);
            tbf(comp[_0x5bb2ad], "일뎀증", 38.5, "<캔디 축제>3", always);
            tbf(comp[_0x5bb2ad], "궁뎀증", 25.8, "<캔디 축제>4", always);
            tbf(comp[_0x5bb2ad], "평추가*", 25.5, "<캔디 축제>5", always);
            tbf(comp[_0x5bb2ad], "궁추가*", 51.8, "<캔디 축제>6", always);
          }
        }
      };
      _0x55e037.passive = function () {
        for (let _0x5e37cd of getRoleIdx("딜", "섶")) {
          anbf(_0x55e037, "평", comp[_0x5e37cd], "받직뎀", 10, "출격! 나의 엘프(노예)여!", 1, 3, always);
        }
        anbf(_0x55e037, "평", boss, "받일뎀", 10, "사탕 징수령1", 1, 3, always);
        anbf(_0x55e037, "궁", boss, "받궁뎀", 5, "사탕 징수령2", 1, 2, always);
        anbf(_0x55e037, "궁", boss, "받뎀증", 7.4, "사탕 징수령3", 1, 2, always);
        for (let _0x857031 of getElementIdx("풍")) {
          anbf(_0x55e037, "궁", comp[_0x857031], "가뎀증", 15, "<여왕을 위해 싸운다>1", 1, 2, always);
          atbf(_0x55e037, "궁", comp[_0x857031], "제거", "기본", "<여왕을 위해 싸운다>2", 1, always);
          atbf(_0x55e037, "궁", comp[_0x857031], "평추가*", 18, "<여왕을 위해 싸운다>2", 4, always);
        }
        tbf(_0x55e037, "공퍼증", 10, "공격력 증가", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {
          if (GLOBAL_TURN == 1) {
            if (getElementCnt("풍") >= 3) {
              const _0xadbcdc = comp.find(_0x1284f6 => _0x1284f6.id == 10004);
              if (_0xadbcdc) {
                _0xadbcdc.cd -= 2;
                _0xadbcdc.curCd -= 2;
              }
              for (let _0x46890c of getRoleIdx("섶")) {
                cdChange(comp[_0x46890c], -4);
              }
              tbf(all, "공고증", myCurAtk + _0x55e037.id + 40, "<할로윈 엘프왕의 은총>3", 50);
              for (let _0x59036a of getRoleIdx("섶")) {
                anbf(comp[_0x59036a], "궁", boss, "받뎀증", 5.13, "<할로윈 엘프왕의 은총>4", 1, 4, 50);
                for (let _0x3bcea6 of getElementIdx("풍")) {
                  anbf(comp[_0x59036a], "궁", comp[_0x3bcea6], "받속뎀", 7.7, "<할로윈 엘프왕의 은총>5", 1, 4, 50);
                }
              }
            }
          }
        }
        if (GLOBAL_TURN == 1) {
          cdChange(_0x55e037, -4);
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10045:
      setMnc(_0x55e037, [0, 1, 0, 1, 0, 1, 0, 1, 0, 1], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(_0x55e037, "공퍼증", 75, "귀무에 취하다1", 1);
            break;
          case 2:
            tbf(_0x55e037, "공퍼증", 87.5, "귀무에 취하다1", 1);
            break;
          case 3:
            tbf(_0x55e037, "공퍼증", 87.5, "귀무에 취하다1", 1);
            tbf(_0x55e037, "가뎀증", 15, "귀무에 취하다2", 1);
            break;
          case 4:
            tbf(_0x55e037, "공퍼증", 100, "귀무에 취하다1", 1);
            tbf(_0x55e037, "가뎀증", 20, "귀무에 취하다2", 1);
            break;
          default:
            tbf(_0x55e037, "공퍼증", 112.5, "귀무에 취하다1", 1);
            tbf(_0x55e037, "가뎀증", 25, "귀무에 취하다2", 1);
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        if (getRoleCnt("딜") >= 3) {
          tbf(all, "공퍼증", 30, "미몽의 취무1", always);
        }
        if (getElementCnt("화") >= 3) {
          tbf(_0x55e037, "공퍼증", 40, "미몽의 취무2", always);
        }
      };
      _0x55e037.passive = function () {
        atbf(_0x55e037, "평", _0x55e037, "궁추가*", 60.5, "오니의 웃음", 7, always);
        anbf(_0x55e037, "궁", _0x55e037, "공퍼증", 15, "술 들이붓기", -2, 6, always);
        tbf(_0x55e037, "궁뎀증", 35, "오니의 가무", always);
        tbf(_0x55e037, "궁뎀증", 10, "궁극기 데미지+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
        if (GLOBAL_TURN > 1) {
          nbf(_0x55e037, "공퍼증", 15, "술 들이붓기", 1, 6);
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10047:
      setMnc(_0x55e037, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
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
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        for (let _0x62a664 of getElementIdx("풍")) {
          tbf(comp[_0x62a664], "공퍼증", 80, "바람의 인재1", always);
          tbf(comp[_0x62a664], "일뎀증", 60, "바람의 인재2", always);
          tbf(comp[_0x62a664], "궁뎀증", 30, "바람의 인재3", always);
        }
      };
      _0x55e037.passive = function () {
        tbf(_0x55e037, "궁뎀증", 20, "폭풍이여, 내게 복종하라!1", always);
        tbf(_0x55e037, "궁발동*", 50, "폭풍이여, 내게 복종하라!2", always);
        tbf(_0x55e037, "가뎀증", 10, "마법 검사1", always);
        tbf(_0x55e037, "궁발동*", 50, "마법 검사2", always);
        tbf(_0x55e037, "공퍼증", 10, "공격+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 4 == 0) {
          for (let _0xe51212 of getElementIdx("풍")) {
            tbf(comp[_0xe51212], "받속뎀", 25, "마법 검사3", 1);
          }
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10048:
      setMnc(_0x55e037, [200, 4, 200, 4, 200, 4, 200, 4, 200, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(_0x55e037, "평추가*", 130, "독액 배출1", 2);
            tbf(all, "일뎀증", 20, "독액 배출2", 4);
            break;
          case 2:
            tbf(_0x55e037, "평추가*", 176, "독액 배출1", 2);
            tbf(all, "일뎀증", 25, "독액 배출2", 4);
            break;
          case 3:
            tbf(_0x55e037, "평추가*", 222, "독액 배출1", 2);
            tbf(all, "일뎀증", 30, "독액 배출2", 4);
            break;
          case 4:
            tbf(_0x55e037, "평추가*", 268, "독액 배출1", 2);
            tbf(all, "일뎀증", 35, "독액 배출2", 4);
            break;
          default:
            tbf(_0x55e037, "평추가*", 314, "독액 배출1", 2);
            tbf(all, "일뎀증", 40, "독액 배출2", 4);
        }
        tbf(_0x55e037, "일뎀증", 100, "독액 배출3", 2);
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(20);
        tbf(all, "공퍼증", 40, "치명적인 독", always);
        for (let _0x2447b9 of getRoleIdx("딜", "디")) {
          tbf(comp[_0x2447b9], "일뎀증", 50, "<무해지독>1", always);
          tbf(comp[_0x2447b9], "가뎀증", 20, "<무해지독>2", always);
        }
      };
      _0x55e037.passive = function () {
        atbf(_0x55e037, "궁", _0x55e037, "공퍼증", 80, "통제불능의 전주곡", 2, always);
        atbf(_0x55e037, "궁", boss, "받일뎀", 60, "부식성 맹독", 2, always);
        for (let _0x3cc520 of getElementIdx("수")) {
          atbf(_0x55e037, "궁", comp[_0x3cc520], "받속뎀", 30, "스칼렛 톡신", 2, always);
        }
        tbf(_0x55e037, "일뎀증", 10, "일반 공격 데미지+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10049:
      setMnc(_0x55e037, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        tbf(all, "공고증", myCurAtk + _0x55e037.id + 20, "꿈이 하나 있어1", 1);
        switch (_0x78c5e1) {
          case 1:
            atbf(_0x55e037, "평", all, "공고증", myCurAtk + _0x55e037.id + 15, "꿈이 하나 있어2", 1, 4);
            break;
          case 2:
            atbf(_0x55e037, "평", all, "공고증", myCurAtk + _0x55e037.id + 20, "꿈이 하나 있어2", 1, 4);
            break;
          case 3:
            atbf(_0x55e037, "평", all, "공고증", myCurAtk + _0x55e037.id + 20, "꿈이 하나 있어2", 1, 4);
            break;
          case 4:
            atbf(_0x55e037, "평", all, "공고증", myCurAtk + _0x55e037.id + 22.5, "꿈이 하나 있어2", 1, 4);
            break;
          default:
            atbf(_0x55e037, "평", all, "공고증", myCurAtk + _0x55e037.id + 25, "꿈이 하나 있어2", 1, 4);
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
        for (let _0x40cf41 of comp) {
          _0x40cf41.heal2();
        }
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
        for (let _0x2e6a18 of comp) {
          _0x2e6a18.heal();
        }
      };
      _0x55e037.leader = function () {
        hpUpAll(20);
        tbf(all, "공퍼증", 20, "강자의 자비1", always);
        tbf(all, "일뎀증", 40, "강자의 자비2", always);
        tbf(all, "받아증", 30, "강자의 자비4", always);
      };
      _0x55e037.passive = function () {
        atbf(_0x55e037, "평", all, "아머", _0x55e037.hp * 20, "방해 마법", 1, always);
        anbf(_0x55e037, "평", all, "받아증", 5, "선한 마음1", 1, 6, always);
        anbf(_0x55e037, "궁", all, "일뎀증", 22.5, "귀족의 보호", 1, 2, always);
        tbf(_0x55e037, "공퍼증", 10, "공격력 증가", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
        if (GLOBAL_TURN == 1) {
          cdChange(_0x55e037, -2);
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10050:
      setMnc(_0x55e037, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {};
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        switch (_0x78c5e1) {
          case 1:
            _0x55e037.hpUltDmg = _0x55e037.hp * 89;
            break;
          case 2:
            _0x55e037.hpUltDmg = _0x55e037.hp * 107;
            break;
          case 3:
            _0x55e037.hpUltDmg = _0x55e037.hp * 125;
            break;
          case 4:
            _0x55e037.hpUltDmg = _0x55e037.hp * 143;
            break;
          default:
            _0x55e037.hpUltDmg = _0x55e037.hp * 161;
        }
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        _0x55e037.hpAtkDmg = _0x55e037.hp * 50;
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpMe(_0x55e037, 100);
        tbf(_0x55e037, "일뎀증", 125, "마왕의 꼭대기1", always);
        tbf(_0x55e037, "궁뎀증", 100, "마왕의 꼭대기2", always);
        tbf(all, "공퍼증", 40, "마왕의 꼭대기5", always);
        tbf(all, "가뎀증", 20, "마왕의 꼭대기6", always);
        for (let _0x5a04c5 of comp) {
          if (_0x5a04c5.id != _0x55e037.id) {
            atbf(_0x5a04c5, "방", all, "받속뎀", 6, "굴복하라", 2, always);
            atbf(_0x5a04c5, "궁", all, "받속뎀", 6, "굴복하라", 2, always);
          }
        }
      };
      _0x55e037.passive = function () {
        anbf(_0x55e037, "궁", _0x55e037, "가뎀증", 20, "마주한 공포", 1, 2, always);
        tbf(boss, "받뎀증", 20, "시저라는 이름1", 50);
        tbf(_0x55e037, "가뎀증", 7.5, "피해+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10052:
      setMnc(_0x55e037, [475, 5, 550, 5, 625, 5, 700, 5, 775, 5], _0x78c5e1);
      buff_ex.push("CD 카운트 정지");
      _0x55e037.ultbefore = function () {};
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpMe(_0x55e037, 50);
        for (let _0x4c4942 of getElementIdx("암")) {
          tbf(comp[_0x4c4942], "공퍼증", 20, "크리스마스 킬러", always);
        }
        const _0xf97793 = comp.find(_0x24dc1e => _0x24dc1e.id == 10053);
        if (_0xf97793) {
          tbf(_0x55e037, "공고증", myCurAtk + _0xf97793.id + 100, "공포에 굴복1", 50);
          tbf(_0xf97793, "CD 카운트 정지", 0, "공포에 굴복2", 5);
          _0xf97793.cd += 2;
          _0xf97793.curCd += 2;
          tbf(_0x55e037, "공퍼증", 50, "광기1", always);
          for (let _0x17d6eb of getElementIdx("암")) {
            tbf(comp[_0x17d6eb], "공퍼증", 25, "광기2", always);
          }
        }
        const _0x390996 = comp.find(_0x9c941 => _0x9c941.id == 10054);
        if (_0x390996) {
          tbf(_0x55e037, "공고증", myCurAtk + _0x390996.id + 100, "공포에 굴복1", 50);
          tbf(_0x390996, "CD 카운트 정지", 0, "공포에 굴복2", 5);
          _0x390996.cd += 2;
          _0x390996.curCd += 2;
          tbf(_0x55e037, "공퍼증", 50, "광기1", always);
          for (let _0x3fad64 of getElementIdx("암")) {
            tbf(comp[_0x3fad64], "공퍼증", 25, "광기2", always);
          }
        }
      };
      _0x55e037.passive = function () {
        anbf(_0x55e037, "평", boss, "받궁뎀", 2.5, "빌어먹을 순록", 1, 4, always);
        const _0x26f332 = comp.find(_0x1f38a5 => _0x1f38a5.id == 10054);
        if (_0x26f332) {
          for (let _0x3b5a18 of getElementIdx("암")) {
            anbf(_0x55e037, "평", comp[_0x3b5a18], "받속뎀", 5, "순록 사살", 1, 5, always);
          }
        }
        anbf(_0x55e037, "평", boss, "받일뎀", 5, "빌어먹을 순록", 1, 4, always);
        const _0x5009be = comp.find(_0x2c02ff => _0x2c02ff.id == 10053);
        if (_0x5009be) {
          anbf(_0x55e037, "평", boss, "받일뎀", 6, "크리스마스 파괴", 1, 5, always);
        }
        tbf(_0x55e037, "일뎀증", 50, "암흑의 크리스마스", always);
        tbf(_0x55e037, "공퍼증", 10, "공격력 증가", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {
          const _0x5c25b1 = comp.find(_0x5e504c => _0x5e504c.id == 10053);
          if (_0x5c25b1) {
            const _0x4f561a = _0x5c25b1.buff.find(_0x595045 => _0x595045.type == "기본" && _0x595045.type == "CD 카운트 정지");
            if (_0x4f561a) {
              _0x5c25b1.stopCd = true;
            } else {
              _0x5c25b1.stopCd = false;
            }
          }
          const _0x51dd1c = comp.find(_0x1921c6 => _0x1921c6.id == 10054);
          if (_0x51dd1c) {
            const _0x24741d = _0x51dd1c.buff.find(_0xb69067 => _0xb69067.type == "기본" && _0xb69067.type == "CD 카운트 정지");
            if (_0x24741d) {
              _0x51dd1c.stopCd = true;
            } else {
              _0x51dd1c.stopCd = false;
            }
          }
        }
      };
      return _0x55e037;
    case 10053:
      setMnc(_0x55e037, [0, 5, 0, 5, 0, 4, 0, 4, 0, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(all, "아머", _0x55e037.hp * 50, "크리스마스 선물1", 1);
            tbf(all, "공퍼증", 10, "크리스마스 선물2", 3);
            break;
          case 2:
            tbf(all, "아머", _0x55e037.hp * 55, "크리스마스 선물1", 1);
            tbf(all, "공퍼증", 15, "크리스마스 선물2", 3);
            break;
          case 3:
            tbf(all, "아머", _0x55e037.hp * 55, "크리스마스 선물1", 1);
            tbf(all, "공퍼증", 15, "크리스마스 선물2", 3);
            break;
          case 4:
            tbf(all, "아머", _0x55e037.hp * 60, "크리스마스 선물1", 1);
            tbf(all, "공퍼증", 20, "크리스마스 선물2", 3);
            break;
          default:
            tbf(all, "아머", _0x55e037.hp * 60, "크리스마스 선물1", 1);
            tbf(all, "공퍼증", 20, "크리스마스 선물2", 4);
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
        for (let _0x21ac11 of comp) {
          _0x21ac11.heal();
        }
      };
      _0x55e037.leader = function () {
        tbf(_0x55e037, "공퍼증", 100, "X-mas 난쟁이의 기백", always);
        for (let _0x59ca00 of getRoleIdx("딜")) {
          anbf(comp[_0x59ca00], "평", comp[_0x59ca00], "궁뎀증", 15, "<시저의 특별 메뉴>1", 1, 2, 50);
          anbf(comp[_0x59ca00], "궁", comp[_0x59ca00], "일뎀증", 50, "<시저의 특별 메뉴>2", 1, 1, 50);
        }
      };
      _0x55e037.passive = function () {
        atbf(_0x55e037, "공격", all, "공고증", myCurAtk + _0x55e037.id + 25, "썰매 진짜 빠르다~", 1, always);
        nbf(comp[0], "받아증", 20, "사탕은 달고 맛있어~1", 1, 1);
        nbf(comp[4], "공퍼증", 20, "사탕은 달고 맛있어~2", 1, 1);
        nbf(comp[4], "일뎀증", 20, "사탕은 달고 맛있어~3", 1, 1);
        nbf(comp[4], "궁뎀증", 10, "사탕은 달고 맛있어~4", 1, 1);
        for (let _0x518cae of getRoleIdx("딜", "힐")) {
          tbf(comp[_0x518cae], "궁뎀증", 25, "크리스마스는 우리가 지킨다!", always);
        }
        tbf(_0x55e037, "공퍼증", 10, "공격력 증가", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10054:
      setMnc(_0x55e037, [0, 4, 0, 4, 0, 3, 0, 3, 0, 3], _0x78c5e1);
      _0x55e037.ultbefore = function () {};
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
        _0x55e037.heal();
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        let _0x272f97 = [0, 2, 4];
        for (let _0x5d7599 of _0x272f97) {
          tbf(comp[_0x5d7599], "공퍼증", 40, "기적의 사자1", always);
          tbf(comp[_0x5d7599], "궁뎀증", 20, "기적의 사자2", always);
          tbf(comp[_0x5d7599], "일뎀증", 40, "기적의 사자3", always);
        }
      };
      _0x55e037.passive = function () {
        for (let _0x1fa8d8 = 0; _0x1fa8d8 < 2; _0x1fa8d8++) {
          atbf(_0x55e037, "궁", comp[_0x1fa8d8], "공퍼증", 30, "크리스마스 스피릿", 2, always);
        }
        hpUpMe(_0x55e037, 10);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {
          for (let _0x5c3362 of comp);
        }
      };
      return _0x55e037;
    case 10056:
      setMnc(_0x55e037, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(_0x55e037, "아머", _0x55e037.hp * 40 * armorUp(_0x55e037, "궁", "추가"), "결정의 벽", 1);
            break;
          case 2:
            tbf(_0x55e037, "아머", _0x55e037.hp * 45 * armorUp(_0x55e037, "궁", "추가"), "결정의 벽", 1);
            break;
          case 3:
            tbf(_0x55e037, "아머", _0x55e037.hp * 45 * armorUp(_0x55e037, "궁", "추가"), "결정의 벽", 1);
            break;
          case 4:
            tbf(_0x55e037, "아머", _0x55e037.hp * 50 * armorUp(_0x55e037, "궁", "추가"), "결정의 벽", 1);
            break;
          default:
            tbf(_0x55e037, "아머", _0x55e037.hp * 50 * armorUp(_0x55e037, "궁", "추가"), "결정의 벽", 1);
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        _0x55e037.cd -= 1;
        _0x55e037.curCd -= 1;
        hpUpMe(_0x55e037, 60);
      };
      _0x55e037.passive = function () {
        atbf(_0x55e037, "평", _0x55e037, "아머", _0x55e037.hp * 5, "결정과 공생", 50, always);
        atbf(_0x55e037, "궁", _0x55e037, "반격*", 300, "결정의 침식1", 1, always);
        atbf(_0x55e037, "방", _0x55e037, "반격*", 100, "결정의 침식2", 1, always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10057:
      setMnc(_0x55e037, [0, 4, 0, 4, 0, 3, 0, 3, 0, 3], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(all, "아머", myCurAtk + _0x55e037.id + armorUp(_0x55e037, "궁", "추가") * 165, "종극의 암흑 화염 저승길의 섬멸진?1", 2);
            tbf(all, "공고증", myCurAtk + _0x55e037.id + 30, "종극의 암흑 화염 저승길의 섬멸진?2", 2);
            break;
          case 2:
            tbf(all, "아머", myCurAtk + _0x55e037.id + armorUp(_0x55e037, "궁", "추가") * 188, "종극의 암흑 화염 저승길의 섬멸진?1", 2);
            tbf(all, "공고증", myCurAtk + _0x55e037.id + 30, "종극의 암흑 화염 저승길의 섬멸진?2", 2);
            break;
          case 3:
            tbf(all, "아머", myCurAtk + _0x55e037.id + armorUp(_0x55e037, "궁", "추가") * 188, "종극의 암흑 화염 저승길의 섬멸진?1", 2);
            tbf(all, "공고증", myCurAtk + _0x55e037.id + 30, "종극의 암흑 화염 저승길의 섬멸진?2", 2);
            break;
          case 4:
            tbf(all, "아머", myCurAtk + _0x55e037.id + armorUp(_0x55e037, "궁", "추가") * 211, "종극의 암흑 화염 저승길의 섬멸진?1", 2);
            tbf(all, "공고증", myCurAtk + _0x55e037.id + 30, "종극의 암흑 화염 저승길의 섬멸진?2", 2);
            break;
          default:
            tbf(all, "아머", myCurAtk + _0x55e037.id + armorUp(_0x55e037, "궁", "추가") * 211, "종극의 암흑 화염 저승길의 섬멸진?1", 2);
            tbf(all, "공고증", myCurAtk + _0x55e037.id + 40, "종극의 암흑 화염 저승길의 섬멸진?2", 2);
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {
        tbf(all, "아머", myCurAtk + _0x55e037.id + armorUp(_0x55e037, "평", "추가") * 50, "암흑의 저승 결계", 1);
      };
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        tbf(comp[0], "공퍼증", 33, "저승 심연의 켈베로스!1", always);
        tbf(comp[0], "궁뎀증", 15, "저승 심연의 켈베로스!2", always);
        tbf(comp[2], "공퍼증", 33, "저승 심연의 켈베로스!1", always);
        tbf(comp[2], "궁뎀증", 15, "저승 심연의 켈베로스!2", always);
        tbf(comp[4], "공퍼증", 33, "저승 심연의 켈베로스!1", always);
        tbf(comp[4], "궁뎀증", 15, "저승 심연의 켈베로스!2", always);
      };
      _0x55e037.passive = function () {
        tbf(_0x55e037, "일뎀증", 25, "지옥의 발톱!", always);
        tbf(_0x55e037, "일뎀증", 10, "일반 공격 데미지+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 6 == 0) {
          tbf(comp[0], "궁뎀증", 50, "명계의 서의 계시", 2);
          tbf(comp[2], "궁뎀증", 50, "명계의 서의 계시", 2);
          tbf(comp[4], "궁뎀증", 50, "명계의 서의 계시", 2);
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10058:
      setMnc(_0x55e037, [200, 8, 200, 8, 200, 8, 200, 8, 200, 8], _0x78c5e1);
      buff_ex.push("궁극기 CD 변경 면역");
      _0x55e037.ultbefore = function () {};
      _0x55e037.ultafter = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(_0x55e037, "일뎀증", 96, "월하의 하울링", 6);
            break;
          case 2:
            tbf(_0x55e037, "일뎀증", 118, "월하의 하울링", 6);
            break;
          case 3:
            tbf(_0x55e037, "일뎀증", 141, "월하의 하울링", 6);
            break;
          case 4:
            tbf(_0x55e037, "일뎀증", 163, "월하의 하울링", 6);
            break;
          default:
            tbf(_0x55e037, "일뎀증", 186, "월하의 하울링", 6);
        }
      };
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        tbf(_0x55e037, "일뎀증", 20, "겁쟁이 늑대의 여정1", always);
        tbf(all, "일뎀증", 40, "겁쟁이 늑대의 여정2", always);
      };
      _0x55e037.passive = function () {
        atbf(_0x55e037, "궁", _0x55e037, "궁극기 CD 변경 면역", 0, "아드레날린", 8, always);
        atbf(_0x55e037, "궁", _0x55e037, "평발동*", 90, "3연격 발톱 공격", 6, always);
        anbf(_0x55e037, "궁", _0x55e037, "가뎀증", 20, "심해지는 광기", 1, 2, always);
        tbf(_0x55e037, "공퍼증", 10, "공격력 증가", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
        if (GLOBAL_TURN == 1) {
          cdChange(_0x55e037, -6);
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
        const _0x1dee36 = _0x55e037.buff.find(_0x50682e => _0x50682e.div == "기본" && _0x50682e.type == "궁극기 CD 변경 면역");
        if (_0x1dee36) {
          _0x55e037.canCDChange = false;
        } else {
          _0x55e037.canCDChange = true;
        }
      };
      return _0x55e037;
    case 10059:
      setMnc(_0x55e037, [205, 2, 226, 2, 247, 2, 268, 2, 289, 2], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(_0x55e037, "공퍼증", 20, "팬텀 킬러", 3);
            break;
          case 2:
            tbf(_0x55e037, "공퍼증", 20, "팬텀 킬러", 3);
            break;
          case 3:
            tbf(_0x55e037, "공퍼증", 25, "팬텀 킬러", 3);
            break;
          case 4:
            tbf(_0x55e037, "공퍼증", 25, "팬텀 킬러", 3);
            break;
          default:
            tbf(_0x55e037, "공퍼증", 30, "팬텀 킬러", 3);
        }
      };
      _0x55e037.ultafter = function () {
        for (let _0x277156 of comp) {
          if (_0x277156.id != _0x55e037.id) {
            atbf(_0x277156, "공격", all, "궁뎀증", 5, "<음벽 초월>", 2, 2);
          }
        }
      };
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        tbf(all, "공퍼증", 20, "댄싱 머신1", always);
        atbf(_0x55e037, "공격", all, "공퍼증", 8, "댄싱 머신2", 2, always);
      };
      _0x55e037.passive = function () {
        anbf(_0x55e037, "평", _0x55e037, "궁뎀증", 5, "유망주", 1, 4, always);
        atbf(_0x55e037, "평", _0x55e037, "궁추가*", 75, "<백은의 바람>", 2, always);
        anbf(_0x55e037, "궁", _0x55e037, "일뎀증", 5, "잠재력 폭발", 1, 4, always);
        atbf(_0x55e037, "궁", _0x55e037, "평추가*", 20, "<팬텀의 바람>", 2, always);
        tbf(_0x55e037, "궁뎀증", 50, "마하 선봉", always);
        tbf(_0x55e037, "공퍼증", 10, "공격력 증가", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10060:
      setMnc(_0x55e037, [0, 5, 0, 5, 0, 5, 0, 5, 0, 5], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
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
        for (let _0x55cc68 of getRoleIdx("딜", "탱")) {
          cdChange(comp[_0x55cc68], -1);
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
        for (let _0x7c7c36 of comp) {
          _0x7c7c36.heal();
        }
      };
      _0x55e037.leader = function () {
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
      _0x55e037.passive = function () {
        atbf(_0x55e037, "공격", all, "공고증", myCurAtk + _0x55e037.id + 25, "멈출수 없는 환락", 1, always);
        anbf(_0x55e037, "공격", all, "가뎀증", 5, "열정과 흥분", 1, 5, always);
        tbf(_0x55e037, "공퍼증", 10, "공격력 증가", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10062:
      setMnc(_0x55e037, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
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
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
        for (let _0x26e3c3 of comp) {
          _0x26e3c3.heal();
        }
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
        for (let _0x3a15ac of comp) {
          _0x3a15ac.heal();
        }
      };
      _0x55e037.leader = function () {
        hpUpAll(30);
        tbf(all, "공퍼증", 30, "상인본색1", always);
        atbf(_0x55e037, "궁", all, "공고증", myCurAtk + _0x55e037.id + 30, "상인본색2", 1, always);
        for (let _0x5a33d8 of comp) {
          if (_0x5a33d8.id != _0x55e037.id) {
            anbf(_0x5a33d8, "공격", _0x55e037, "공퍼증", 3, "<저가 매입>", 1, 15, 50);
          }
        }
      };
      _0x55e037.passive = function () {
        for (let _0xfc00a5 of getRoleIdx("딜")) {
          atbf(_0x55e037, "공격", comp[_0xfc00a5], "공고증", myCurAtk + _0x55e037.id + 25, "정보의 중요성", 1, always);
        }
        let _0xf1d12b = comp.reduce((_0x44454c, _0x38774b) => {
          if (_0x38774b.curHp < _0x44454c.curHp) {
            return _0x38774b;
          } else {
            return _0x44454c;
          }
        }, comp[0]);
        atbf(_0x55e037, "평", _0xf1d12b, "아머", _0xf1d12b.hp * 20, "최신 상품1", 1, always);
        for (let _0x5cf6fc of comp) {
          if (_0x5cf6fc.id != _0x55e037.id) {
            atbf(_0x5cf6fc, "방", _0x5cf6fc, "궁뎀증", 15, "<선착순 1명>", always, 1);
            atbf(_0x5cf6fc, "방", _0x5cf6fc, "가뎀증", 15, "<선착순 1명>", always, 1);
            atbf(_0x5cf6fc, "방", _0x5cf6fc, "공퍼증", 30, "<선착순 1명>", always, 1);
            for (let _0x50d40f of comp) {
              if (_0x50d40f.id != _0x5cf6fc.id) {
                atbf(_0x5cf6fc, "방", _0x50d40f, "제거", "발동", "<선착순 1명>", 1, 1);
              }
            }
          }
        }
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10063:
      setMnc(_0x55e037, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(all, "공고증", myCurAtk + _0x55e037.id + 15, "메이드 분신술1", 1);
            tbf(comp[4], "공퍼증", 20, "메이드 분신술2", 1);
            break;
          case 2:
            tbf(all, "공고증", myCurAtk + _0x55e037.id + 20, "메이드 분신술1", 1);
            tbf(comp[4], "공퍼증", 25, "메이드 분신술2", 1);
            break;
          case 3:
            tbf(all, "공고증", myCurAtk + _0x55e037.id + 30, "메이드 분신술1", 1);
            tbf(comp[4], "공퍼증", 30, "메이드 분신술2", 1);
            break;
          case 4:
            tbf(all, "공고증", myCurAtk + _0x55e037.id + 30, "메이드 분신술1", 1);
            tbf(comp[4], "공퍼증", 45, "메이드 분신술2", 1);
            break;
          default:
            tbf(all, "공고증", myCurAtk + _0x55e037.id + 30, "메이드 분신술1", 1);
            tbf(comp[4], "공퍼증", 60, "메이드 분신술2", 1);
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
        for (let _0x484cda of comp) {
          _0x484cda.heal();
        }
        cdChange(comp[4], -4);
      };
      _0x55e037.atkbefore = function () {
        tbf(all, "공고증", myCurAtk + _0x55e037.id + 30, "엄격한 지도", 1);
      };
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        tbf(_0x55e037, "공퍼증", 100, "빈틈없는 메이드장1", always);
      };
      _0x55e037.passive = function () {
        anbf(_0x55e037, "평", _0x55e037, "공퍼증", 10, "메이드 비기 - 고속요리술", 1, 4, always);
        atbf(_0x55e037, "궁", comp[4], "공퍼증", 40, "메이드 비기 - 순간환복술", 2, always);
        atbf(_0x55e037, "궁", all, "가뎀증", 30, "메이드 비기 - 무결청소술", 1, always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {
          if (GLOBAL_TURN > 1) {
            tbf(all, "공고증", myCurAtk + _0x55e037.id + 30, "빈틈없는 메이드장2", 1);
          }
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10066:
      setMnc(_0x55e037, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(_0x55e037, "공퍼증", 20, "마술회로-저주전개", 4);
            break;
          case 2:
            tbf(_0x55e037, "공퍼증", 35, "마술회로-저주전개", 4);
            break;
          case 3:
            tbf(_0x55e037, "공퍼증", 35, "마술회로-저주전개", 4);
            break;
          case 4:
            tbf(_0x55e037, "공퍼증", 50, "마술회로-저주전개", 4);
            break;
          default:
            tbf(_0x55e037, "공퍼증", 50, "마술회로-저주전개", 4);
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        tbf(all, "속상감", 100, "마도 현자0", always);
        tbf(all, "공퍼증", 30, "마도 현자1", always);
        hpUpAll(15);
      };
      _0x55e037.passive = function () {
        tbf(_0x55e037, "궁뎀증", 25, "천주1", always);
        anbf(_0x55e037, "공격", _0x55e037, "궁뎀증", 2, "천주2", 1, 25, always);
        tbf(_0x55e037, "가뎀증", 10, "구조 해석1", always);
        anbf(_0x55e037, "궁", _0x55e037, "가뎀증", 6, "구조 해석2", 1, 5, always);
        anbf(_0x55e037, "공격", _0x55e037, "공퍼증", 2, "편집광2", 1, 50, always);
        tbf(_0x55e037, "궁뎀증", 10, "궁극기+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {
          if (GLOBAL_TURN > 1) {
            nbf(all, "공퍼증", 5, "마도 현자2", 1, 25);
          }
        }
        if (GLOBAL_TURN > 1) {
          nbf(_0x55e037, "공퍼증", 4, "편집광1", 1, 50);
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10067:
      setMnc(_0x55e037, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {};
      _0x55e037.ultafter = function () {
        switch (_0x78c5e1) {
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
            nbf(_0x55e037, "발효증", 10, "<명경지수>", 1, 10);
            break;
          default:
            nbf(boss, "받발뎀", 50, "비검 - 근하신년", 1, 2);
            nbf(_0x55e037, "발효증", 10, "<명경지수>", 2, 10);
        }
      };
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        tbf(boss, "받발뎀", 100, "도검 극의1", 50);
        hpUpAll(15);
        tbf(all, "공퍼증", 50, "도검 극의2", always);
        for (let _0x1fcc2a of getRoleIdx("딜", "탱", "디")) {
          if (comp[_0x1fcc2a].id != _0x55e037.id) {
            tbf(comp[_0x1fcc2a], "평발동*", 45, "<신무이도류 - 전수>1", always);
            tbf(comp[_0x1fcc2a], "궁발동*", 135, "<신무이도류 - 전수>2", always);
          }
        }
      };
      _0x55e037.passive = function () {
        tbf(_0x55e037, "평발동*", 60, "미나요미 이도류 - 하고이타1", always);
        tbf(_0x55e037, "궁발동*", 180, "미나요미 이도류 - 하고이타2", always);
        anbf(_0x55e037, "궁", _0x55e037, "발효증", 10, "<명경지수>", -2, 10, always);
        tbf(_0x55e037, "발효증", 50, "정신통일1", always);
        anbf(_0x55e037, "공격", boss, "받발뎀", 12.5, "정신통일2", 1, 4, always);
        tbf(_0x55e037, "발효증", 30, "발동+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
        if (GLOBAL_TURN > 1) {
          nbf(_0x55e037, "발효증", 10, "<명경지수>", 1, 10);
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10068:
      setMnc(_0x55e037, [0, 3, 0, 3, 0, 3, 0, 3, 0, 3], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
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
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
        for (let _0x1536c8 of comp) {
          _0x1536c8.heal();
        }
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
        for (let _0x3c93ab of comp) {
          _0x3c93ab.heal();
        }
      };
      _0x55e037.leader = function () {
        tbf(all, "공퍼증", 30, "배고픔을 느껴라!", always);
        hpUpAll(30);
        tbf(all, "공퍼증", 40, "더는... 못먹겠어...", always);
      };
      _0x55e037.passive = function () {};
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 3 == 0) {
          tbf(all, "아머", _0x55e037.hp * 10, "주문하신 크림스튜 나왔습니다!1", 1);
          tbf(all, "공퍼증", 20, "주문하신 크림스튜 나왔습니다!2", 1);
          tbf(all, "궁뎀증", 30, "주문하신 최상급 시저 스테이크 나왔습니다!1", 1);
          tbf(all, "공고증", myCurAtk + _0x55e037.id + 20, "주문하신 최상급 시저 스테이크 나왔습니다!2", 1);
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10069:
      setMnc(_0x55e037, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            for (let _0x202e29 of getRoleIdx("딜", "디")) {
              tbf(comp[_0x202e29], "궁뎀증", 10, "너무 하고 싶지만 안 돼!1", 2);
            }
            for (let _0x290d79 of comp) {
              if (_0x290d79.id != _0x55e037.id) {
                tbf(_0x290d79, "공발동*", 25, "너무 하고 싶지만 안 돼!2", 4);
              }
            }
            break;
          case 2:
            for (let _0x5e462b of getRoleIdx("딜", "디")) {
              tbf(comp[_0x5e462b], "궁뎀증", 15, "너무 하고 싶지만 안 돼!1", 2);
            }
            for (let _0x2f95b4 of comp) {
              if (_0x2f95b4.id != _0x55e037.id) {
                tbf(_0x2f95b4, "공발동*", 35, "너무 하고 싶지만 안 돼!2", 4);
              }
            }
            break;
          case 3:
            for (let _0x253b95 of getRoleIdx("딜", "디")) {
              tbf(comp[_0x253b95], "궁뎀증", 20, "너무 하고 싶지만 안 돼!1", 2);
            }
            for (let _0x57a842 of comp) {
              if (_0x57a842.id != _0x55e037.id) {
                tbf(_0x57a842, "공발동*", 45, "너무 하고 싶지만 안 돼!2", 4);
              }
            }
            break;
          case 4:
            for (let _0x4287cd of getRoleIdx("딜", "디")) {
              tbf(comp[_0x4287cd], "궁뎀증", 25, "너무 하고 싶지만 안 돼!1", 2);
            }
            for (let _0x12fc56 of comp) {
              if (_0x12fc56.id != _0x55e037.id) {
                tbf(_0x12fc56, "공발동*", 55, "너무 하고 싶지만 안 돼!2", 4);
              }
            }
            break;
          default:
            for (let _0x56df99 of getRoleIdx("딜", "디")) {
              tbf(comp[_0x56df99], "궁뎀증", 30, "너무 하고 싶지만 안 돼!1", 2);
            }
            for (let _0xa3546f of comp) {
              if (_0xa3546f.id != _0x55e037.id) {
                tbf(_0xa3546f, "공발동*", 65, "너무 하고 싶지만 안 돼!2", 4);
              }
            }
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {
        tbf(all, "공퍼증", 50, "토끼의 서포트", 1);
      };
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(20);
        tbf(all, "공퍼증", 50, "토끼 공격술1", always);
        for (let _0x41d39c of getRoleIdx("딜", "디")) {
          anbf(comp[_0x41d39c], "공격", comp[_0x41d39c], "공퍼증", 20, "<성욕 토끼발>1", 1, 5, always);
          anbf(comp[_0x41d39c], "공격", boss, "받발뎀", 20, "<성욕 토끼발>2", 1, 5, always);
          tbf(comp[_0x41d39c], "궁발동*", 150, "<성욕 토끼발>3", always);
        }
      };
      _0x55e037.passive = function () {
        atbf(_0x55e037, "궁", all, "공퍼증", 50, "모두 파이팅!", 1, always);
        atbf(_0x55e037, "궁", _0x55e037, "아머", _0x55e037.hp * 15, "야아아아아아!", 1, always);
        tbf(all, "가뎀증", 20, "로맨틱한 연애!", always);
        tbf(_0x55e037, "공퍼증", 10, "공격 데미지+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {
          if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 4 == 0) {
            tbf(all, "궁뎀증", 35, "토끼 공격술2", 2);
          }
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10071:
      setMnc(_0x55e037, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(_0x55e037, "공퍼증", 180, "저주 멸살의 눈1", 2);
            tbf(_0x55e037, "일뎀증", 60, "저주 멸살의 눈2", 2);
            tbf(_0x55e037, "평추가*", 80, "저주 멸살의 눈4", 4);
            break;
          case 2:
            tbf(_0x55e037, "공퍼증", 180, "저주 멸살의 눈1", 2);
            tbf(_0x55e037, "일뎀증", 80, "저주 멸살의 눈2", 2);
            tbf(_0x55e037, "평추가*", 100, "저주 멸살의 눈4", 4);
            break;
          case 3:
            tbf(_0x55e037, "공퍼증", 200, "저주 멸살의 눈1", 2);
            tbf(_0x55e037, "일뎀증", 80, "저주 멸살의 눈2", 2);
            for (let _0x1e4b4b of getElementIdx("화")) {
              nbf(comp[_0x1e4b4b], "받속뎀", 5, "저주 멸살의 눈3", 1, 2);
            }
            tbf(_0x55e037, "평추가*", 100, "저주 멸살의 눈4", 4);
            break;
          case 4:
            tbf(_0x55e037, "공퍼증", 200, "저주 멸살의 눈1", 2);
            tbf(_0x55e037, "일뎀증", 100, "저주 멸살의 눈2", 2);
            for (let _0xc29f60 of getElementIdx("화")) {
              nbf(comp[_0xc29f60], "받속뎀", 5, "저주 멸살의 눈3", 1, 2);
            }
            tbf(_0x55e037, "평추가*", 110, "저주 멸살의 눈4", 4);
            break;
          default:
            tbf(_0x55e037, "공퍼증", 240, "저주 멸살의 눈1", 2);
            tbf(_0x55e037, "일뎀증", 100, "저주 멸살의 눈2", 2);
            for (let _0x8bfc96 of getElementIdx("화")) {
              nbf(comp[_0x8bfc96], "받속뎀", 5, "저주 멸살의 눈3", 1, 2);
            }
            tbf(_0x55e037, "평추가*", 130, "저주 멸살의 눈4", 4);
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(20);
        tbf(all, "공퍼증", 60, "금지구역의 수호자1", always);
        tbf(all, "일뎀증", 60, "금지구역의 수호자2", always);
        tbf(_0x55e037, "가뎀증", 50, "금지구역의 수호자3", always);
        anbf(_0x55e037, "평", boss, "받뎀증", 5, "금지구역의 수호자4", 1, 8, always);
        atbf(_0x55e037, "궁", _0x55e037, "평추가*", 150, "금지구역의 수호자5", 2, always);
      };
      _0x55e037.passive = function () {
        tbf(_0x55e037, "공퍼증", 50, "전율의 사냥", always);
        atbf(_0x55e037, "궁", _0x55e037, "평추가*", 70, "2연발", 2, always);
        tbf(_0x55e037, "가뎀증", 7.5, "데미지+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
        if (GLOBAL_TURN == 6) {
          tbf(boss, "받일뎀", 100, "쇠약의 저주", 50);
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10072:
      setMnc(_0x55e037, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(_0x55e037, "공고증", myCurAtk + _0x55e037.id + 40, "부케 임자는 이미 정해졌엉~1", 1);
            tbf(comp[1], "공고증", myCurAtk + _0x55e037.id + 65, "부케 임자는 이미 정해졌엉~2", 1);
            tbf(comp[1], "일뎀증", 80, "부케 임자는 이미 정해졌엉~3", 2);
            tbf(comp[1], "궁뎀증", 30, "부케 임자는 이미 정해졌엉~4", 1);
            break;
          case 2:
            tbf(_0x55e037, "공고증", myCurAtk + _0x55e037.id + 40, "부케 임자는 이미 정해졌엉~1", 1);
            tbf(comp[1], "공고증", myCurAtk + _0x55e037.id + 65, "부케 임자는 이미 정해졌엉~2", 1);
            tbf(comp[1], "일뎀증", 90, "부케 임자는 이미 정해졌엉~3", 2);
            tbf(comp[1], "궁뎀증", 35, "부케 임자는 이미 정해졌엉~4", 1);
            break;
          case 3:
            tbf(_0x55e037, "공고증", myCurAtk + _0x55e037.id + 45, "부케 임자는 이미 정해졌엉~1", 1);
            tbf(comp[1], "공고증", myCurAtk + _0x55e037.id + 70, "부케 임자는 이미 정해졌엉~2", 1);
            tbf(comp[1], "일뎀증", 90, "부케 임자는 이미 정해졌엉~3", 2);
            tbf(comp[1], "궁뎀증", 35, "부케 임자는 이미 정해졌엉~4", 1);
            break;
          case 4:
            tbf(_0x55e037, "공고증", myCurAtk + _0x55e037.id + 45, "부케 임자는 이미 정해졌엉~1", 1);
            tbf(comp[1], "공고증", myCurAtk + _0x55e037.id + 70, "부케 임자는 이미 정해졌엉~2", 1);
            tbf(comp[1], "일뎀증", 100, "부케 임자는 이미 정해졌엉~3", 2);
            tbf(comp[1], "궁뎀증", 40, "부케 임자는 이미 정해졌엉~4", 1);
            break;
          default:
            tbf(_0x55e037, "공고증", myCurAtk + _0x55e037.id + 50, "부케 임자는 이미 정해졌엉~1", 1);
            tbf(comp[1], "공고증", myCurAtk + _0x55e037.id + 75, "부케 임자는 이미 정해졌엉~2", 1);
            tbf(comp[1], "일뎀증", 100, "부케 임자는 이미 정해졌엉~3", 2);
            tbf(comp[1], "궁뎀증", 40, "부케 임자는 이미 정해졌엉~4", 1);
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {
        tbf(comp[1], "공고증", myCurAtk + _0x55e037.id + 75, "부케 던지기", 1);
      };
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        tbf(_0x55e037, "공퍼증", 80, "마왕의 연애 시뮬레이션1", always);
        tbf(_0x55e037, "가뎀증", 30, "마왕의 연애 시뮬레이션2", always);
        tbf(_0x55e037, "일뎀증", 125, "마왕의 연애 시뮬레이션3", always);
        tbf(_0x55e037, "궁뎀증", 50, "마왕의 연애 시뮬레이션4", always);
        tbf(_0x55e037, "평추가*", 125, "<마왕 바알이 원하는 고백>1", 50);
        tbf(_0x55e037, "궁추가*", 500, "<마왕 바알이 원하는 고백>2", 50);
      };
      _0x55e037.passive = function () {
        tbf(comp[1], "가뎀증", 25, "친구의 도움은 필수!", 50);
        tbf(_0x55e037, "공퍼증", 10, "공격력 증가", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
        if (GLOBAL_TURN == 1) {
          cdChange(_0x55e037, -4);
        }
        if (GLOBAL_TURN > 1) {
          nbf(_0x55e037, "공퍼증", 15, "<밀당의 매력>", 1, 8);
        }
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 2 == 0) {
          nbf(_0x55e037, "공퍼증", 15, "<밀당의 매력>", 1, 8);
        }
        if (GLOBAL_TURN > 1) {
          tbf(_0x55e037, "공고증", myCurAtk + _0x55e037.id + 35, "시크릿 연애 대작전", 1);
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10074:
      setMnc(_0x55e037, [306, 3, 348, 3, 390, 3, 429, 3, 471, 3], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
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
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037, 3);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(30);
        tbf(all, "공퍼증", 100, "툰드라1", always);
        _0x55e037.cd += 1;
        _0x55e037.curCd += 1;
        anbf(_0x55e037, "궁", boss, "받뎀증", 15, "툰드라2", 1, 4, always);
        anbf(_0x55e037, "궁", boss, "받궁뎀", 12.5, "툰드라3", 1, 4, always);
        tbf(_0x55e037, "가뎀증", 40, "툰드라5", always);
        tbf(_0x55e037, "궁뎀증", 60, "툰드라6", always);
      };
      _0x55e037.passive = function () {
        atbf(_0x55e037, "방", all, "아머", _0x55e037.hp * 10, "설풍 장벽", 1, always);
        anbf(_0x55e037, "궁", _0x55e037, "공퍼증", 25, "칼바람1", 1, 4, always);
        anbf(_0x55e037, "궁", _0x55e037, "궁뎀증", 15, "칼바람2", 1, 4, always);
        tbf(_0x55e037, "가뎀증", 25, "설산 미인1", always);
        atbf(_0x55e037, "궁", all, "아머", _0x55e037.hp * 20, "설산 미인2", 1, always);
        tbf(_0x55e037, "공퍼증", 10, "공격력 증가", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {
          if (GLOBAL_TURN > 1) {
            tbf(all, "공고증", myCurAtk + _0x55e037.id + 30, "툰드라4", 1);
          }
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10075:
      setMnc(_0x55e037, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(_0x55e037, "공퍼증", 30, "역전극 개연~ 깡총~1", 1);
            tbf(all, "공고증", myCurAtk + _0x55e037.id + 30, "역전극 개연~ 깡총~2", 1);
            break;
          case 2:
            tbf(_0x55e037, "공퍼증", 35, "역전극 개연~ 깡총~1", 1);
            tbf(all, "공고증", myCurAtk + _0x55e037.id + 30, "역전극 개연~ 깡총~2", 1);
            break;
          case 3:
            tbf(_0x55e037, "공퍼증", 40, "역전극 개연~ 깡총~1", 1);
            tbf(all, "공고증", myCurAtk + _0x55e037.id + 35, "역전극 개연~ 깡총~2", 1);
            break;
          case 4:
            tbf(_0x55e037, "공퍼증", 45, "역전극 개연~ 깡총~1", 1);
            tbf(all, "공고증", myCurAtk + _0x55e037.id + 35, "역전극 개연~ 깡총~2", 1);
            break;
          default:
            tbf(_0x55e037, "공퍼증", 50, "역전극 개연~ 깡총~1", 1);
            tbf(all, "공고증", myCurAtk + _0x55e037.id + 40, "역전극 개연~ 깡총~2", 1);
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
        if (_0x55e037.isLeader && getRoleCnt("딜") >= 3) {
          for (let _0x274c3d of getRoleIdx("딜")) {
            cdChange(comp[_0x274c3d], -1);
          }
        }
      };
      _0x55e037.atkbefore = function () {
        tbf(all, "공고증", myCurAtk + _0x55e037.id + 30, "역전극 개연~ 깡총~2", 1);
      };
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        if (getRoleCnt("딜") >= 3) {
          tbf(all, "궁뎀증", 50, "<래빗의 팀워크>", always);
          hpUpAll(30);
        }
      };
      _0x55e037.passive = function () {
        atbf(_0x55e037, "평", all, "일뎀증", 40, "행운의 토끼 다리1", 1, always);
        atbf(_0x55e037, "궁", all, "궁뎀증", 15, "행운의 토끼 다리2", 1, always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {
          if (GLOBAL_TURN > 1) {
            for (let _0x23fa3a of comp) {
              if (_0x23fa3a.id != _0x55e037.id) {
                atbf(_0x23fa3a, "평", _0x55e037, "공퍼증", 15, "<깡총 깡총 깡깡총>", 5, 1);
              }
            }
          }
        }
        if (GLOBAL_TURN > 1) {
          nbf(all, "공퍼증", 2.5, "급하다 급해~", 1, 8);
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10076:
      setMnc(_0x55e037, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {};
      _0x55e037.ultafter = function () {
        switch (_0x78c5e1) {
          case 1:
            for (let _0xae9bd2 of getRoleIdx("딜")) {
              tbf(comp[_0xae9bd2], "평추가*", 37.5, "다과회 동맹 전원 돌격", 3);
            }
            break;
          case 2:
            for (let _0x567bfb of getRoleIdx("딜")) {
              tbf(comp[_0x567bfb], "평추가*", 45, "다과회 동맹 전원 돌격", 3);
            }
            break;
          case 3:
            for (let _0xd0bd53 of getRoleIdx("딜")) {
              tbf(comp[_0xd0bd53], "평추가*", 45, "다과회 동맹 전원 돌격", 4);
            }
            break;
          case 4:
            for (let _0x234144 of getRoleIdx("딜")) {
              tbf(comp[_0x234144], "평추가*", 52.5, "다과회 동맹 전원 돌격", 4);
            }
            break;
          default:
            for (let _0x2772b0 of getRoleIdx("딜")) {
              tbf(comp[_0x2772b0], "평추가*", 60, "다과회 동맹 전원 돌격", 4);
            }
            break;
        }
      };
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        for (let _0x187e96 of getRoleIdx("딜")) {
          atbf(_0x55e037, "궁", comp[_0x187e96], "평추가*", 37.5, "<Shuffling>", 4, always);
        }
        if (getRoleCnt("딜") >= 4) {
          tbf(all, "공퍼증", 70, "<Four of a Kind>1", always);
          tbf(all, "일뎀증", 100, "<Four of a Kind>2", always);
        }
      };
      _0x55e037.passive = function () {
        anbf(_0x55e037, "궁", all, "일뎀증", 30, "아름다운 소망", 1, 2, always);
        tbf(all, "일뎀증", 30, "공주의 리더십(꿈)", 50);
        anbf(_0x55e037, "궁", all, "가뎀증", 12.5, "다과회 동맹의 야심", 1, 2, always);
        tbf(_0x55e037, "일뎀증", 10, "일반 공격 데미지+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {
          if (GLOBAL_TURN == 1) {
            cdChange(_0x55e037, -4);
          }
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10077:
      setMnc(_0x55e037, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(_0x55e037, "공고증", _0x55e037.hp * 10, "바삭바삭 닭고기 맛!", 4);
            break;
          case 2:
            tbf(_0x55e037, "공고증", _0x55e037.hp * 10, "바삭바삭 닭고기 맛!", 4);
            break;
          case 3:
            tbf(_0x55e037, "공고증", _0x55e037.hp * 12.5, "바삭바삭 닭고기 맛!", 4);
            break;
          case 4:
            tbf(_0x55e037, "공고증", _0x55e037.hp * 15, "바삭바삭 닭고기 맛!", 4);
            break;
          default:
            tbf(_0x55e037, "공고증", _0x55e037.hp * 20, "바삭바삭 닭고기 맛!", 4);
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
        for (let _0x43d642 of comp) {
          _0x43d642.heal();
        }
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
        for (let _0x546a94 of comp) {
          _0x546a94.heal2();
        }
      };
      _0x55e037.leader = function () {
        hpUpMe(_0x55e037, 50);
        atbf(_0x55e037, "평", all, "공고증", _0x55e037.hp * 6, "진정한 생존 전문가1", 1, always);
        atbf(_0x55e037, "궁", all, "공고증", _0x55e037.hp * 8, "진정한 생존 전문가2", 1, always);
        tbf(all, "공퍼증", 60, "진정한 생존 전문가3", always);
        for (let _0x315bb5 of getRoleIdx("딜", "디")) {
          tbf(comp[_0x315bb5], "가뎀증", 50, "진정한 생존 전문가4", always);
        }
        for (let _0xd1952a of getRoleIdx("탱", "힐", "섶")) {
          atbf(comp[_0xd1952a], "궁", all, "궁뎀증", 30, "진정한 생존 전문가5", 2, always);
        }
      };
      _0x55e037.passive = function () {
        atbf(_0x55e037, "평", all, "공고증", myCurAtk + _0x55e037.id + 20, "다같이 가자!1", 1, always);
        atbf(_0x55e037, "궁", all, "공고증", myCurAtk + _0x55e037.id + 25, "다같이 가자!2", 1, always);
        atbf(_0x55e037, "평", all, "아머", _0x55e037.hp * 10, "왕성한 호기심1", 1, always);
        atbf(_0x55e037, "평", all, "아머", myCurAtk + _0x55e037.id + 10, "왕성한 호기심2", 1, always);
        atbf(_0x55e037, "궁", all, "공퍼증", 25, "머리 빼고 다 먹을 수 있어", 8, always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10078:
      setMnc(_0x55e037, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            nbf(boss, "받뎀증", 7.5, "루루는 잘못 없어!1", 1, 2);
            for (let _0xec8ecb of getElementIdx("수")) {
              nbf(comp[_0xec8ecb], "받속뎀", 5, "루루는 잘못 없어!2", 1, 2);
            }
            break;
          case 2:
            nbf(boss, "받뎀증", 7.5, "루루는 잘못 없어!1", 1, 2);
            for (let _0x330df0 of getElementIdx("수")) {
              nbf(comp[_0x330df0], "받속뎀", 7.5, "루루는 잘못 없어!2", 1, 2);
            }
            break;
          case 3:
            nbf(boss, "받뎀증", 10, "루루는 잘못 없어!1", 1, 2);
            for (let _0x4912b1 of getElementIdx("수")) {
              nbf(comp[_0x4912b1], "받속뎀", 7.5, "루루는 잘못 없어!2", 1, 2);
            }
            break;
          case 4:
            nbf(boss, "받뎀증", 12.5, "루루는 잘못 없어!1", 1, 2);
            for (let _0x36d4bf of getElementIdx("수")) {
              nbf(comp[_0x36d4bf], "받속뎀", 10, "루루는 잘못 없어!2", 1, 2);
            }
            break;
          default:
            nbf(boss, "받뎀증", 15, "루루는 잘못 없어!1", 1, 2);
            for (let _0xd33501 of getElementIdx("수")) {
              nbf(comp[_0xd33501], "받속뎀", 12.5, "루루는 잘못 없어!2", 1, 2);
            }
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(30);
        tbf(all, "공퍼증", 25, "제어 불가능1", always);
        tbf(_0x55e037, "일뎀증", 30, "제어 불가능2", always);
        for (let _0x501721 of getElementIdx("수")) {
          anbf(comp[_0x501721], "공격", boss, "받일뎀", 15, "<수인화>1", 1, 5, always);
          tbf(comp[_0x501721], "평추가*", 30, "<수인화>2", always);
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
      _0x55e037.passive = function () {
        anbf(_0x55e037, "공격", _0x55e037, "공퍼증", 10, "파스제국 최강 고양이", 1, 5, always);
        tbf(_0x55e037, "평추가*", 35, "난 무척 귀여워, 그러니까 밥이나 줘", always);
        for (let _0x32e07b of getElementIdx("수")) {
          anbf(_0x55e037, "평", comp[_0x32e07b], "받속뎀", 2, "꽃병 파괴자1", 1, 5, always);
        }
        anbf(_0x55e037, "평", boss, "받일뎀", 15, "꽃병 파괴자2", 1, 5, always);
        tbf(_0x55e037, "가뎀증", 7.5, "데미지+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10079:
      setMnc(_0x55e037, [200, 4, 200, 4, 200, 4, 200, 4, 200, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(_0x55e037, "공퍼증", 50, "정월인법 - 근하신년1", 3);
            break;
          case 2:
            tbf(_0x55e037, "공퍼증", 65, "정월인법 - 근하신년1", 3);
            break;
          case 3:
            tbf(_0x55e037, "공퍼증", 80, "정월인법 - 근하신년1", 3);
            break;
          case 4:
            tbf(_0x55e037, "공퍼증", 95, "정월인법 - 근하신년1", 4);
            break;
          default:
            tbf(_0x55e037, "공퍼증", 110, "정월인법 - 근하신년1", 4);
        }
      };
      _0x55e037.ultafter = function () {
        switch (_0x78c5e1) {
          case 1:
            break;
          case 2:
            break;
          case 3:
            nbf(_0x55e037, "가뎀증", 10, "정월인법 - 근하신년2", 1, 1);
            break;
          case 4:
            nbf(_0x55e037, "가뎀증", 15, "정월인법 - 근하신년2", 1, 1);
            break;
          default:
            nbf(_0x55e037, "가뎀증", 20, "정월인법 - 근하신년2", 1, 1);
        }
      };
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        tbf(all, "공퍼증", 50, "축제 거행 전문가1", always);
        tbf(all, "일뎀증", 30, "축제 거행 전문가2", always);
        atbf(_0x55e037, "궁", _0x55e037, "공고증", myCurAtk + _0x55e037.id + 100, "<새해의 축복>1", 50, 1);
        _0x55e037.stopCd = true;
        _0x55e037.canCDChange = false;
      };
      _0x55e037.passive = function () {
        anbf(_0x55e037, "평", boss, "받일뎀", 20, "닌닌 - 전과 확대술", 1, 4, always);
        tbf(all, "일뎀증", 30, "닌닌 - 암암리 지원술", 50);
        tbf(_0x55e037, "가뎀증", 10, "닌닌 - 분위기 띄운술1", always);
        anbf(_0x55e037, "공격", boss, "받뎀증", 5, "닌닌 - 분위기 띄운술2", 1, 5, always);
        tbf(_0x55e037, "공퍼증", 10, "공격력 증가", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {
          if (GLOBAL_TURN == 1) {
            cdChange(_0x55e037, -4);
          }
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10081:
      setMnc(_0x55e037, [388, 4, 445, 4, 503, 4, 560, 4, 618, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(_0x55e037, "가뎀증", 30, "암즈 오버클럭 - 연정1", 1);
            for (let _0xab738e of getElementIdx("수")) {
              tbf(comp[_0xab738e], "가뎀증", 30, "암즈 오버클럭 - 연정2", 1);
            }
            break;
          case 2:
            tbf(_0x55e037, "가뎀증", 35, "암즈 오버클럭 - 연정1", 1);
            for (let _0x81a62b of getElementIdx("수")) {
              tbf(comp[_0x81a62b], "가뎀증", 35, "암즈 오버클럭 - 연정2", 1);
            }
            break;
          case 3:
            tbf(_0x55e037, "가뎀증", 40, "암즈 오버클럭 - 연정1", 1);
            for (let _0x1bd666 of getElementIdx("수")) {
              tbf(comp[_0x1bd666], "가뎀증", 40, "암즈 오버클럭 - 연정2", 1);
            }
            break;
          case 4:
            tbf(_0x55e037, "가뎀증", 45, "암즈 오버클럭 - 연정1", 1);
            for (let _0x1c0d8a of getElementIdx("수")) {
              tbf(comp[_0x1c0d8a], "가뎀증", 45, "암즈 오버클럭 - 연정2", 1);
            }
            break;
          default:
            tbf(_0x55e037, "가뎀증", 50, "암즈 오버클럭 - 연정1", 1);
            for (let _0x32eafa of getElementIdx("수")) {
              tbf(comp[_0x32eafa], "가뎀증", 50, "암즈 오버클럭 - 연정2", 1);
            }
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037, 2);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(40);
        tbf(_0x55e037, "평발동*", 50, "진정한 후궁 최강자", always);
      };
      _0x55e037.passive = function () {
        tbf(_0x55e037, "궁발동*", 120, "웨딩 암즈 서포트 AI", always);
        for (let _0x198508 of getElementIdx("수")) {
          tbf(comp[_0x198508], "궁발동*", 120, "웨딩 암즈 서포트 AI", always);
        }
        for (let _0x125f3b of getElementIdx("수", "광")) {
          anbf(_0x55e037, "평", comp[_0x125f3b], "받속뎀", 5, "프로토타입 Z1", 1, 7, always);
        }
        tbf(_0x55e037, "궁발동*", 150, "프로토타입 Z2", always);
        tbf(_0x55e037, "공퍼증", 10, "공격력 증가", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {
          if (GLOBAL_TURN == 1) {
            for (let _0x3697d5 of getElementIdx("수", "광")) {
              tbf(comp[_0x3697d5], "공퍼증", 100, "<고귀한 웨딩>1", 50);
              anbf(comp[_0x3697d5], "궁", boss, "받발뎀", 20, "<고귀한 웨딩>2", 1, 5, 50);
              anbf(comp[_0x3697d5], "공격", boss, "받궁뎀", 2, "<고귀한 웨딩>3", 1, 60, 50);
              anbf(comp[_0x3697d5], "공격", boss, "받뎀증", 1, "<고귀한 웨딩>4", 1, 60, 50);
              for (let _0x509992 of getElementIdx("수", "광")) {
                anbf(comp[_0x3697d5], "평", comp[_0x509992], "받속뎀", 5, "<고귀한 웨딩>5", 1, 7, 50);
              }
            }
          }
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
        nbf(_0x55e037, "궁뎀증", 9, "암즈 공명 - 소녀의 마음", 1, 11);
        for (let _0x4e8f47 of getElementIdx("수")) {
          nbf(comp[_0x4e8f47], "궁뎀증", 9, "암즈 공명 - 소녀의 마음", 1, 11);
        }
      };
      return _0x55e037;
    case 10082:
      setMnc(_0x55e037, [490, 5, 568, 5, 646, 5, 724, 5, 802, 5], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            nbf(_0x55e037, "궁뎀증", 20, "지옥의 꽃1", 1, 1);
            nbf(_0x55e037, "일뎀증", 40, "지옥의 꽃2", 1, 1);
            break;
          case 2:
            nbf(_0x55e037, "궁뎀증", 20, "지옥의 꽃1", 1, 1);
            nbf(_0x55e037, "일뎀증", 40, "지옥의 꽃2", 1, 1);
            break;
          case 3:
            nbf(_0x55e037, "궁뎀증", 40, "지옥의 꽃1", 1, 1);
            nbf(_0x55e037, "일뎀증", 80, "지옥의 꽃2", 1, 1);
            break;
          case 4:
            nbf(_0x55e037, "궁뎀증", 40, "지옥의 꽃1", 1, 1);
            nbf(_0x55e037, "일뎀증", 80, "지옥의 꽃2", 1, 1);
            break;
          default:
            nbf(_0x55e037, "궁뎀증", 50, "지옥의 꽃1", 1, 1);
            nbf(_0x55e037, "일뎀증", 100, "지옥의 꽃2", 1, 1);
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(20);
        tbf(_0x55e037, "공퍼증", 100, "청순의 힘1", always);
        tbf(all, "공퍼증", 25, "청순의 힘2", always);
        for (let _0x3b9c21 of comp) {
          if (_0x3b9c21.id != _0x55e037.id) {
            for (let _0x544cd0 of getElementIdx("암")) {
              anbf(_0x3b9c21, "공격", comp[_0x544cd0], "받속뎀", 1, "<절대 복종>1", 1, 20, 50);
            }
            atbf(_0x3b9c21, "공격", comp[0], "공고증", myCurAtk + _0x3b9c21.id + 15, "<절대 복종>2", 1, 50);
          }
        }
      };
      _0x55e037.passive = function () {
        for (let _0x341fe9 of getElementIdx("암")) {
          anbf(_0x55e037, "공격", comp[_0x341fe9], "받속뎀", 4, "무구한 의복", 1, 5, always);
        }
        atbf(_0x55e037, "방", _0x55e037, "공퍼증", 100, "고통의 쾌락", 2, always);
        anbf(_0x55e037, "공격", all, "공퍼증", 3, "진정한 힘", 1, 10, always);
        tbf(_0x55e037, "궁뎀증", 10, "궁극기 데미지+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {
          if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 5 == 0) {
            tbf(all, "공퍼증", 50, "청순의 힘3", 3);
          }
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10083:
      setMnc(_0x55e037, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(all, "공고증", myCurAtk + _0x55e037.id + 40, "함께 가버리는 거야~1", 1);
            break;
          case 2:
            tbf(all, "공고증", myCurAtk + _0x55e037.id + 45, "함께 가버리는 거야~1", 1);
            break;
          case 3:
            tbf(all, "공고증", myCurAtk + _0x55e037.id + 50, "함께 가버리는 거야~1", 1);
            tbf(all, "공퍼증", 10, "함께 가버리는 거야~2", 4);
            break;
          case 4:
            tbf(all, "공고증", myCurAtk + _0x55e037.id + 50, "함께 가버리는 거야~1", 1);
            tbf(all, "공퍼증", 15, "함께 가버리는 거야~2", 4);
            break;
          default:
            tbf(all, "공고증", myCurAtk + _0x55e037.id + 50, "함께 가버리는 거야~1", 1);
            tbf(all, "공퍼증", 20, "함께 가버리는 거야~2", 4);
        }
      };
      _0x55e037.ultafter = function () {
        if (_0x55e037.isLeader) {
          for (let _0x26edb8 of comp) {
            if (_0x26edb8.id != _0x55e037.id) {
              atbf(_0x26edb8, "궁", _0x55e037, "공고증", myCurAtk + _0x26edb8.id + 50, "나도 기분 좋게 해줘~", 2, 1);
            }
          }
        }
      };
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
        for (let _0x3fe7e1 of comp) {
          _0x3fe7e1.heal();
        }
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
        for (let _0x46082b of comp) {
          _0x46082b.heal();
        }
      };
      _0x55e037.leader = function () {
        tbf(all, "공퍼증", 30, "누구나 환영~", always);
        atbf(_0x55e037, "궁", _0x55e037, "평발동*", 50, "크레이지 츄르릅", 2, always);
        atbf(_0x55e037, "궁", _0x55e037, "평발동*", 50, "크레이지 츄르릅", 2, always);
        atbf(_0x55e037, "궁", _0x55e037, "평발동*", 50, "크레이지 츄르릅", 2, always);
        anbf(_0x55e037, "평", _0x55e037, "공퍼증", 10, "<절정으로 Fly>", 1, 7, always);
        atbf(_0x55e037, "궁", _0x55e037, "제거", "기본", "<절정으로 Fly>", 1, always);
      };
      _0x55e037.passive = function () {
        atbf(_0x55e037, "궁", _0x55e037, "평발동*", 50, "<멈출수 없는 츄르릅>", 2, always);
        atbf(_0x55e037, "궁", _0x55e037, "평발동*", 50, "<멈출수 없는 츄르릅>", 2, always);
        atbf(_0x55e037, "궁", _0x55e037, "평발동*", 50, "<멈출수 없는 츄르릅>", 2, always);
        anbf(_0x55e037, "평", _0x55e037, "공퍼증", 10, "<갈수록 짜릿짜릿>", 1, 7, always);
        atbf(_0x55e037, "궁", _0x55e037, "제거", "기본", "<갈수록 짜릿짜릿>", 1, always);
        anbf(_0x55e037, "방", _0x55e037, "공퍼증", 10, "<갈수록 짜릿짜릿>", 3, 7, always);
        if (_0x55e037.isLeader) {
          anbf(_0x55e037, "방", _0x55e037, "공퍼증", 10, "<절정으로 Fly>", 3, 7, always);
        }
        tbf(_0x55e037, "공퍼증", 10, "공격력 증가", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10084:
      setMnc(_0x55e037, [265, 3, 298, 3, 331, 3, 364, 3, 397, 3], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
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
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(40);
        tbf(all, "공퍼증", 40, "죽었지만 죽지 않았어", always);
        _0x55e037.cd -= 1;
        _0x55e037.curCd -= 1;
      };
      _0x55e037.passive = function () {
        atbf(_0x55e037, "공격", _0x55e037, "공퍼증", 20, "슈퍼챗", 3, always);
        anbf(_0x55e037, "궁", _0x55e037, "가뎀증", 7, "<신나게 라이브를!>1", 1, 5, always);
        atbf(_0x55e037, "궁", _0x55e037, "공발동*", 50, "<신나게 라이브를!>2", 3, always);
        tbf(_0x55e037, "궁발동*", 99.9, "이방인의 전법1", always);
        atbf(_0x55e037, "공격", _0x55e037, "궁뎀증", 10, "이방인의 전법2", 5, always);
        tbf(_0x55e037, "궁뎀증", 10, "필살+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10085:
      setMnc(_0x55e037, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(all, "공퍼증", 20, "애무의 손길1", 3);
            tbf(_0x55e037, "일뎀증", 30, "애무의 손길2", 4);
            break;
          case 2:
            tbf(all, "공퍼증", 25, "애무의 손길1", 3);
            tbf(_0x55e037, "일뎀증", 30, "애무의 손길2", 4);
            break;
          case 3:
            tbf(all, "공퍼증", 25, "애무의 손길1", 4);
            tbf(_0x55e037, "일뎀증", 40, "애무의 손길2", 4);
            break;
          case 4:
            tbf(all, "공퍼증", 30, "애무의 손길1", 4);
            tbf(_0x55e037, "일뎀증", 40, "애무의 손길2", 4);
            break;
          default:
            tbf(all, "공퍼증", 35, "애무의 손길1", 4);
            tbf(_0x55e037, "일뎀증", 50, "애무의 손길2", 4);
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
        for (let _0x2c727d of comp) {
          _0x2c727d.heal();
        }
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
        for (let _0x149764 of comp) {
          _0x149764.heal();
        }
      };
      _0x55e037.leader = function () {
        hpUpAll(35);
        for (let _0x7f1c6b of getElementIdx("화", "암")) {
          atbf(comp[_0x7f1c6b], "힐", comp[_0x7f1c6b], "궁뎀증", 7.5, "시드는 꽃잎1", 2, always);
          atbf(comp[_0x7f1c6b], "힐", comp[_0x7f1c6b], "일뎀증", 10, "시드는 꽃잎2", 2, always);
        }
        for (let _0x1076b7 of getElementIdx("화", "암")) {
          ptbf(comp[_0x1076b7], "공격", all, "힐", 5, "시드는 꽃잎3", 1, always);
        }
      };
      _0x55e037.passive = function () {
        for (let _0x183ef1 of comp) {
          atbf(_0x183ef1, "힐", _0x183ef1, "공퍼증", 12.5, "<취생몽사>", 2, always);
        }
        for (let _0x7b8320 of comp) {
          atbf(_0x7b8320, "힐", _0x7b8320, "가뎀증", 5, "<무르익은 춘의>", 2, always);
        }
        tbf(_0x55e037, "공퍼증", 10, "공격+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10088:
      setMnc(_0x55e037, [265, 3, 298, 3, 331, 3, 364, 3, 397, 3], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
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
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        atbf(_0x55e037, "궁", all, "가뎀증", 35, "열정적인 쌍성 점장", 1, always);
        const _0x54e662 = getRoleCnt("딜");
        if (_0x54e662 >= 1) {
          tbf(all, "공퍼증", 15, "술1", always);
        }
        if (_0x54e662 >= 2) {
          tbf(all, "공퍼증", 20, "술2", always);
        }
        if (_0x54e662 >= 3) {
          tbf(all, "공퍼증", 30, "술3", always);
        }
        const _0x1144c6 = getRoleCnt("디");
        if (_0x1144c6 >= 1) {
          tbf(all, "공퍼증", 15, "미인1", always);
        }
        if (_0x1144c6 >= 2) {
          tbf(all, "공퍼증", 20, "미인2", always);
        }
        if (_0x1144c6 >= 3) {
          tbf(all, "공퍼증", 30, "미인3", always);
        }
        if (getRoleCnt("탱") >= 1) {
          tbf(all, "궁뎀증", 50, "기도", always);
        }
        for (let _0x2dd66f of comp) {
          if (_0x2dd66f.name == "신파랑") {
            tbf(all, "가뎀증", 20, "예쁜 동생", always);
          }
        }
      };
      _0x55e037.passive = function () {
        atbf(_0x55e037, "궁", all, "궁뎀증", 25, "기세등등", 1, always);
        for (let _0x1a21e6 of getRoleIdx("딜", "디")) {
          if (comp[_0x1a21e6].id == _0x55e037.id) {
            continue;
          }
          atbf(_0x55e037, "궁", comp[_0x1a21e6], "궁발동*", 77, "추가 주문", 1, always);
        }
        tbf(_0x55e037, "공퍼증", 10, "공격 데미지+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
        if (GLOBAL_TURN == 7) {
          nbf(all, "가뎀증", 30, "칠석의 기원", 1, 1);
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10089:
      setMnc(_0x55e037, [0, 3, 0, 3, 0, 3, 0, 3, 0, 3], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(_0x55e037, "아머", _0x55e037.hp * 40 * armorUp(_0x55e037, "궁", "추가"), "언니는 내가 지켜!1", 1);
            for (let _0x4134a1 of getElementIdx("화", "수")) {
              tbf(comp[_0x4134a1], "받속뎀", 14, "언니는 내가 지켜!2", 2);
            }
            break;
          case 2:
            tbf(_0x55e037, "아머", _0x55e037.hp * 45 * armorUp(_0x55e037, "궁", "추가"), "언니는 내가 지켜!1", 1);
            for (let _0x39c3cf of getElementIdx("화", "수")) {
              tbf(comp[_0x39c3cf], "받속뎀", 18, "언니는 내가 지켜!2", 2);
            }
            break;
          case 3:
            tbf(_0x55e037, "아머", _0x55e037.hp * 50 * armorUp(_0x55e037, "궁", "추가"), "언니는 내가 지켜!1", 1);
            for (let _0x360955 of getElementIdx("화", "수")) {
              tbf(comp[_0x360955], "받속뎀", 22, "언니는 내가 지켜!2", 2);
            }
            break;
          case 4:
            tbf(_0x55e037, "아머", _0x55e037.hp * 55 * armorUp(_0x55e037, "궁", "추가"), "언니는 내가 지켜!1", 1);
            for (let _0x2a3db3 of getElementIdx("화", "수")) {
              tbf(comp[_0x2a3db3], "받속뎀", 26, "언니는 내가 지켜!2", 2);
            }
            break;
          default:
            tbf(_0x55e037, "아머", _0x55e037.hp * 60 * armorUp(_0x55e037, "궁", "추가"), "언니는 내가 지켜!1", 1);
            for (let _0x56fea2 of getElementIdx("화", "수")) {
              tbf(comp[_0x56fea2], "받속뎀", 30, "언니는 내가 지켜!2", 2);
            }
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
        _0x55e037.heal();
        for (let _0x437fe5 of comp) {
          if (_0x437fe5.id == 10088) {
            _0x437fe5.heal();
          }
        }
      };
      _0x55e037.leader = function () {
        hpUpAll(c, 30);
        hpUpMe(_0x55e037, 40);
        tbf(all, "공퍼증", 40, "최고급 클럽 매니저1", always);
        tbf(_0x55e037, "받아증", 30, "최고급 클럽 매니저2", always);
        for (let _0x5519ea of comp) {
          if (_0x5519ea.id == 10088) {
            tbf(_0x5519ea, "받아증", 30, "최고급 클럽 매니저3", always);
          }
        }
      };
      _0x55e037.passive = function () {
        atbf(_0x55e037, "평", all, "아머", _0x55e037.hp * 10, "꿈의 직장1", 1, always);
        for (let _0x2bae71 of comp) {
          if (_0x2bae71.id == 10088) {
            atbf(_0x55e037, "평", _0x2bae71, "아머", _0x55e037.hp * 10, "꿈의 직장2", 1, always);
          }
        }
        for (let _0x5515ac of getElementIdx("화", "수")) {
          for (let _0x40d8d5 of getElementIdx("화", "수")) {
            anbf(comp[_0x5515ac], "공격", comp[_0x40d8d5], "받속뎀", 1.5, "<뒤엉킨 운명>1", 1, 7, always);
          }
          anbf(comp[_0x5515ac], "공격", comp[_0x5515ac], "가뎀증", 1.5, "<뒤엉킨 운명>2", 1, 7, always);
          anbf(comp[_0x5515ac], "공격", comp[_0x5515ac], "궁뎀증", 1.5, "<뒤엉킨 운명>3", 1, 7, always);
        }
        for (let _0x28b726 of getElementIdx("화", "수")) {
          if (comp.find(_0x2f7cfd => _0x2f7cfd.id == 10088)) {
            anbf(comp[_0x28b726], "공격", comp[_0x28b726], "가뎀증", 1.5, "<뒤엉킨 운명-구속>1", 1, 7, always);
            anbf(comp[_0x28b726], "공격", comp[_0x28b726], "궁뎀증", 1.5, "<뒤엉킨 운명-구속>2", 1, 7, always);
          }
        }
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10090:
      setMnc(_0x55e037, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {};
      _0x55e037.ultafter = function () {
        switch (_0x78c5e1) {
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
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        tbf(all, "공퍼증", 50, "천사의 헌팅 구역1", always);
        for (let _0x16575d of getRoleIdx("딜", "탱", "디")) {
          tbf(comp[_0x16575d], "공퍼증", 40, "<섹스 신의 부름>1", always);
          tbf(comp[_0x16575d], "궁발동*", 80, "<섹스 신의 부름>2", always);
        }
      };
      _0x55e037.passive = function () {
        tbf(_0x55e037, "궁발동*", 80, "낙원의 인2", always);
        anbf(_0x55e037, "평", boss, "받발뎀", 20, "실신의 파도", 1, 5, always);
        tbf(_0x55e037, "가뎀증", 20, "신의 애무1", always);
        tbf(_0x55e037, "궁뎀증", 40, "신의 애무2", always);
        tbf(_0x55e037, "궁뎀증", 10, "필살+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {
          if (GLOBAL_TURN > 1) {
            nbf(all, "발효증", 20, "천사의 헌팅 구역2", 1, 10);
          }
        }
        if (GLOBAL_TURN > 1) {
          nbf(_0x55e037, "공퍼증", 10, "낙원의 인1", 1, 10);
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10091:
      setMnc(_0x55e037, [0, 3, 0, 3, 0, 3, 0, 3, 0, 3], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            for (let _0x59e393 of getRoleIdx("디")) {
              tbf(comp[_0x59e393], "공고증", myCurAtk + _0x55e037.id + 40, "블링블링 노엘리빔", 1);
            }
            break;
          case 2:
            for (let _0x391851 of getRoleIdx("디")) {
              tbf(comp[_0x391851], "공고증", myCurAtk + _0x55e037.id + 45, "블링블링 노엘리빔", 1);
            }
            break;
          case 3:
            for (let _0x50f05b of getRoleIdx("디")) {
              tbf(comp[_0x50f05b], "공고증", myCurAtk + _0x55e037.id + 45, "블링블링 노엘리빔", 2);
            }
            break;
          case 4:
            for (let _0x97aea of getRoleIdx("디")) {
              tbf(comp[_0x97aea], "공고증", myCurAtk + _0x55e037.id + 50, "블링블링 노엘리빔", 2);
            }
            break;
          default:
            for (let _0x245975 of getRoleIdx("디")) {
              tbf(comp[_0x245975], "공고증", myCurAtk + _0x55e037.id + 55, "블링블링 노엘리빔", 2);
            }
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
        for (let _0x9e6523 of getRoleIdx("디")) {
          cdChange(comp[_0x9e6523], -1);
        }
      };
      _0x55e037.atkbefore = function () {
        for (let _0x251b71 of getRoleIdx("디")) {
          tbf(comp[_0x251b71], "공고증", myCurAtk + _0x55e037.id + 40, "열정의 제창", 1);
        }
      };
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(20);
        tbf(all, "공퍼증", 40, "여름의 운치 해변의 빛나는 별1", always);
        for (let _0x28e0e2 of getRoleIdx("디")) {
          atbf(_0x55e037, "평", comp[_0x28e0e2], "공고증", myCurAtk + _0x55e037.id + 40, "여름의 운치 해변의 빛나는 별2", 1, always);
        }
        for (let _0x400fa7 of getRoleIdx("디")) {
          atbf(_0x55e037, "궁", comp[_0x400fa7], "공고증", myCurAtk + _0x55e037.id + 25, "여름의 운치 해변의 빛나는 별3", 10, always);
        }
        for (let _0x40bb00 of getRoleIdx("디")) {
          atbf(comp[_0x40bb00], "공격", comp[0], "공퍼증", 25, "아이돌 응원단!", 4, always);
        }
      };
      _0x55e037.passive = function () {
        atbf(_0x55e037, "궁", all, "아머", _0x55e037.hp * 50, "떨어지는 유성 같은~", 1, always);
        for (let _0x290b16 of getRoleIdx("디")) {
          tbf(comp[_0x290b16], "궁뎀증", 35, "무대 위의 초신성", 50);
        }
        atbf(_0x55e037, "공격", all, "공고증", myCurAtk + _0x55e037.id + 10, "브릴리언트 블링블링 빅뱅1", 1, always);
        for (let _0x13a844 of getRoleIdx("디")) {
          tbf(comp[_0x13a844], "가뎀증", 20, "브릴리언트 블링블링 빅뱅2", 50);
        }
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10092:
      setMnc(_0x55e037, [348, 3, 396, 3, 447, 3, 495, 3, 546, 3], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(_0x55e037, "궁뎀증", 10, "거대한 파도 크레이지 빅독", 12);
            break;
          case 2:
            tbf(_0x55e037, "궁뎀증", 10, "거대한 파도 크레이지 빅독", 12);
            break;
          case 3:
            tbf(_0x55e037, "궁뎀증", 12.5, "거대한 파도 크레이지 빅독", 12);
            break;
          case 4:
            tbf(_0x55e037, "궁뎀증", 12.5, "거대한 파도 크레이지 빅독", 12);
            break;
          default:
            tbf(_0x55e037, "궁뎀증", 15, "거대한 파도 크레이지 빅독", 12);
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037, 3);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        tbf(all, "공퍼증", 50, "레전더리 서퍼 전승자1", always);
      };
      _0x55e037.passive = function () {
        tbf(_0x55e037, "공퍼증", 50, "숨만 쉬면 돼...", always);
        tbf(_0x55e037, "궁발동*", 90, "출렁이는 여파", always);
        tbf(_0x55e037, "공퍼증", 10, "공격력 증가", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {
          if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 3 == 0) {
            tbf(_0x55e037, "가뎀증", 125, "<파도 추격>1", 1);
          }
          if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 3 == 0) {
            tbf(boss, "받뎀증", 50, "<파도 추격>2", 1);
          }
          if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 6 == 0) {
            tbf(_0x55e037, "궁뎀증", 125, "<파도 탑승>", 1);
          }
        }
        if (GLOBAL_TURN == 4) {
          tbf(_0x55e037, "공퍼증", 40, "수면 부족의 분노1", 50);
        }
        if (GLOBAL_TURN == 7) {
          tbf(_0x55e037, "공퍼증", 80, "수면 부족의 분노2", 50);
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10093:
      setMnc(_0x55e037, [423, 4, 486, 4, 552, 4, 615, 4, 681, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            nbf(_0x55e037, "공퍼증", 10, "과로의 냥이 빔!1", 1, 2);
            break;
          case 2:
            nbf(_0x55e037, "공퍼증", 20, "과로의 냥이 빔!1", 1, 2);
            break;
          case 3:
            nbf(_0x55e037, "공퍼증", 30, "과로의 냥이 빔!1", 1, 2);
            for (let _0x231b3c of getElementIdx("광")) {
              nbf(comp[_0x231b3c], "받속뎀", 5, "과로의 냥이 빔!2", 1, 2);
            }
            break;
          case 4:
            nbf(_0x55e037, "공퍼증", 40, "과로의 냥이 빔!1", 1, 2);
            for (let _0x50c1ae of getElementIdx("광")) {
              nbf(comp[_0x50c1ae], "받속뎀", 7.5, "과로의 냥이 빔!2", 1, 2);
            }
            break;
          default:
            nbf(_0x55e037, "공퍼증", 50, "과로의 냥이 빔!1", 1, 2);
            for (let _0x2538bc of getElementIdx("광")) {
              nbf(comp[_0x2538bc], "받속뎀", 10, "과로의 냥이 빔!2", 1, 2);
            }
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037, 3);
        tbf(_0x55e037, "공발동*", 67.5, "<초과 근무의 죽빵>", 8);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(40);
        tbf(_0x55e037, "공퍼증", 90, "별의 공진", always);
        for (let _0x5b1dd5 of comp) {
          if (_0x5b1dd5.id == _0x55e037.id) {
            continue;
          }
          atbf(_0x5b1dd5, "공격", _0x55e037, "공고증", myCurAtk + _0x5b1dd5.id + 20, "<에너지 집중>1", 1, always);
          for (let _0x3fb5ea of getElementIdx("광", "암")) {
            anbf(_0x5b1dd5, "공격", comp[_0x3fb5ea], "받속뎀", 4, "<에너지 집중>2", 1, 15, always);
          }
        }
        const _0x1fffab = getElementCnt("광");
        const _0x2c5b3b = getElementCnt("암");
        for (let _0x3f972d of comp) {
          if (_0x1fffab >= 1) {
            tbf(_0x3f972d, "공퍼증", 5, "<별의 조각>1", always);
          }
          if (_0x1fffab >= 2) {
            tbf(_0x3f972d, "공퍼증", 25, "<별의 조각>2", always);
          }
          if (_0x2c5b3b >= 1) {
            tbf(_0x3f972d, "공퍼증", 5, "<별의 조각>3", always);
          }
          if (_0x2c5b3b >= 2) {
            tbf(_0x3f972d, "공퍼증", 25, "<별의 조각>3", always);
          }
        }
      };
      _0x55e037.passive = function () {
        anbf(_0x55e037, "평", _0x55e037, "일뎀증", 6, "과로사할 운명1", 1, 8, always);
        anbf(_0x55e037, "궁", _0x55e037, "궁뎀증", 20, "과로사할 운명2", 1, 2, always);
        anbf(_0x55e037, "힐", _0x55e037, "공퍼증", 8, "출출하다냥!2", 1, 8, always);
        anbf(_0x55e037, "힐", _0x55e037, "가뎀증", 4, "슈퍼 야근 모드!", 1, 8, always);
        tbf(_0x55e037, "공퍼증", 10, "공격+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10094:
      setMnc(_0x55e037, [306, 50, 348, 50, 389, 50, 430, 50, 471, 50], _0x78c5e1);
      _0x55e037.ultbefore = function () {};
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {
        if (GLOBAL_TURN == 1) {
          for (let _0x4f8aac of comp) {
            atbf(_0x4f8aac, "궁", _0x4f8aac, "가뎀증", 20, "<자주 학습>", 4, 1);
          }
        }
      };
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpMe(_0x55e037, 70);
      };
      _0x55e037.passive = function () {
        _0x55e037.stopCd = true;
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
        if (GLOBAL_TURN == 1) {
          for (let _0x2eb844 of comp) {
            if (_0x2eb844.id != _0x55e037.id) {
              atbf(_0x2eb844, "궁", _0x55e037, "공고증", myCurAtk + _0x2eb844.id + 25, "<소극 적응>", 1, 50);
            }
          }
        }
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {
          if (GLOBAL_TURN == 4) {
            anbf(_0x55e037, "궁", _0x55e037, "궁뎀증", 60, "<진화단계1>", 1, 1, 1);
          }
          if (GLOBAL_TURN == 7) {
            anbf(_0x55e037, "궁", _0x55e037, "가뎀증", 60, "<진화단계2>", 1, 1, 1);
          }
          if (GLOBAL_TURN == 10) {
            anbf(_0x55e037, "궁", _0x55e037, "궁뎀증", 120, "<진화단계3>", 1, 1, 1);
          }
        }
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 3 == 0) {
          cdChange(_0x55e037, -50);
        }
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 4 == 0) {
          cdChange(_0x55e037, -50);
        }
        if (GLOBAL_TURN > 1) {
          nbf(_0x55e037, "공퍼증", 5, "적응 재진화", 1, 50);
        }
        if (GLOBAL_TURN == 4) {
          anbf(_0x55e037, "궁", _0x55e037, "궁뎀증", 20, "<잠식단계1>", 1, 1, 1);
        }
        if (GLOBAL_TURN == 7) {
          anbf(_0x55e037, "궁", _0x55e037, "가뎀증", 20, "<잠식단계2>", 1, 1, 1);
        }
        if (GLOBAL_TURN == 10) {
          anbf(_0x55e037, "궁", _0x55e037, "궁뎀증", 40, "<잠식단계3>", 1, 1, 1);
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10095:
      _0x55e037.stack = 0;
      setMnc(_0x55e037, [0, 3, 0, 3, 0, 3, 0, 3, 0, 3], _0x78c5e1);
      buff_ex.push("<불굴의 결심>", "<작은 기사>");
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(_0x55e037, "공퍼증", 10, "큰 용기1", 3);
            ptbf(_0x55e037, "궁", _0x55e037, "아머", _0x55e037.hp * 30, "큰 용기2", 1, 1);
            tbf(boss, "받뎀증", 5, "큰 용기3", 3);
            break;
          case 2:
            tbf(_0x55e037, "공퍼증", 20, "큰 용기1", 3);
            ptbf(_0x55e037, "궁", _0x55e037, "아머", _0x55e037.hp * 35, "큰 용기2", 1, 1);
            tbf(boss, "받뎀증", 10, "큰 용기3", 3);
            break;
          case 3:
            tbf(_0x55e037, "공퍼증", 30, "큰 용기1", 3);
            ptbf(_0x55e037, "궁", _0x55e037, "아머", _0x55e037.hp * 40, "큰 용기2", 1, 1);
            tbf(boss, "받뎀증", 15, "큰 용기3", 3);
            break;
          case 4:
            tbf(_0x55e037, "공퍼증", 40, "큰 용기1", 3);
            ptbf(_0x55e037, "궁", _0x55e037, "아머", _0x55e037.hp * 45, "큰 용기2", 1, 1);
            tbf(boss, "받뎀증", 20, "큰 용기3", 3);
            break;
          default:
            tbf(_0x55e037, "공퍼증", 50, "큰 용기1", 3);
            ptbf(_0x55e037, "궁", _0x55e037, "아머", _0x55e037.hp * 50, "큰 용기2", 1, 1);
            tbf(boss, "받뎀증", 25, "큰 용기3", 3);
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
        _0x55e037.stack++;
        if (_0x55e037.stack > 10) {
          _0x55e037.stack = 10;
        }
        setBuffSize(_0x55e037, "기본", "드높은 투지1", _0x55e037.stack * 10);
        setBuffNest(_0x55e037, "발동", "드높은 투지2", _0x55e037.stack);
      };
      _0x55e037.leader = function () {
        tbf(all, "공퍼증", 50, "어엿한 성기사가 되겠어!1", always);
        for (let _0x1d939b of getElementIdx("광")) {
          tbf(comp[_0x1d939b], "궁뎀증", 30, "어엿한 성기사가 되겠어!2", always);
        }
        nbf(_0x55e037, "<불굴의 결심>", 0, "굳센 결심", 10, 10);
      };
      _0x55e037.passive = function () {
        anbf(_0x55e037, "피격", _0x55e037, "<불굴의 결심>", 0, "굳센 결심", 1, 10, always);
        tbf(_0x55e037, "궁발동*", 0, "굳센 결심1", always);
        anbf(_0x55e037, "궁", _0x55e037, "<불굴의 결심>", 0, "굳센 결심", 2, 10, always);
        tbf(_0x55e037, "평발동*", 0, "드높은 투지1", always);
        anbf(_0x55e037, "평", _0x55e037, "<작은 기사>", 0, "드높은 투지", 1, 10, always);
        anbf(_0x55e037, "궁", boss, "받발뎀", 10, "드높은 투지2", 0, 10, always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {
          if (GLOBAL_TURN > 1) {
            for (let _0x15c63f of getElementIdx("광")) {
              if (comp[_0x15c63f].id != _0x55e037.id) {
                tbf(comp[_0x15c63f], "공고증", myCurAtk + _0x55e037.id + 40, "어엿한 성기사가 되겠어!4", 1);
              }
            }
          }
        }
        setBuffSize(_0x55e037, "기본", "굳센 결심1", _0x55e037.getNest("<불굴의 결심>") * 45);
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10096:
      setMnc(_0x55e037, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(all, "공고증", myCurAtk + _0x55e037.id + 30, "피로 물든 밤의 광기1", 1);
            for (let _0x4832bf of getRoleIdx("딜", "디", "탱")) {
              for (let _0x490696 of comp) {
                if (_0x490696.id != comp[_0x4832bf].id) {
                  atbf(comp[_0x4832bf], "공격", _0x490696, "공고증", myCurAtk + comp[_0x4832bf].id + 10, "피로 물든 밤의 광기2", 1, 1);
                }
              }
            }
            break;
          case 2:
            tbf(all, "공고증", myCurAtk + _0x55e037.id + 35, "피로 물든 밤의 광기1", 1);
            for (let _0x28ac3d of getRoleIdx("딜", "디", "탱")) {
              for (let _0x463832 of comp) {
                if (_0x463832.id != comp[_0x28ac3d].id) {
                  atbf(comp[_0x28ac3d], "공격", _0x463832, "공고증", myCurAtk + comp[_0x28ac3d].id + 10, "피로 물든 밤의 광기2", 1, 1);
                }
              }
            }
            break;
          case 3:
            tbf(all, "공고증", myCurAtk + _0x55e037.id + 35, "피로 물든 밤의 광기1", 1);
            for (let _0x380924 of getRoleIdx("딜", "디", "탱")) {
              for (let _0x1ac7a8 of comp) {
                if (_0x1ac7a8.id != comp[_0x380924].id) {
                  atbf(comp[_0x380924], "공격", _0x1ac7a8, "공고증", myCurAtk + comp[_0x380924].id + 12.5, "피로 물든 밤의 광기2", 1, 1);
                }
              }
            }
            break;
          case 4:
            tbf(all, "공고증", myCurAtk + _0x55e037.id + 40, "피로 물든 밤의 광기1", 1);
            for (let _0x4255f8 of getRoleIdx("딜", "디", "탱")) {
              for (let _0x276175 of comp) {
                if (_0x276175.id != comp[_0x4255f8].id) {
                  atbf(comp[_0x4255f8], "공격", _0x276175, "공고증", myCurAtk + comp[_0x4255f8].id + 12.5, "피로 물든 밤의 광기2", 1, 1);
                }
              }
            }
            break;
          default:
            tbf(all, "공고증", myCurAtk + _0x55e037.id + 40, "피로 물든 밤의 광기1", 1);
            for (let _0x3150b1 of getRoleIdx("딜", "디", "탱")) {
              for (let _0x2d5325 of comp) {
                if (_0x2d5325.id != comp[_0x3150b1].id) {
                  atbf(comp[_0x3150b1], "공격", _0x2d5325, "공고증", myCurAtk + comp[_0x3150b1].id + 15, "피로 물든 밤의 광기2", 1, 1);
                }
              }
            }
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {
        tbf(all, "공고증", myCurAtk + _0x55e037.id + 30, "피의 축복", 1);
      };
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        for (let _0x3a2b9e of getElementIdx("암")) {
          nbf(comp[_0x3a2b9e], "공퍼증", 100, "은혜1", 1, 1);
          nbf(comp[_0x3a2b9e], "궁뎀증", 50, "은혜2", 1, 1);
        }
      };
      _0x55e037.passive = function () {
        atbf(_0x55e037, "평", all, "일뎀증", 30, "할로윈의 광기1", 1, always);
        atbf(_0x55e037, "궁", all, "궁뎀증", 10, "할로윈의 광기2", 2, always);
        for (let _0x50bf82 of getRoleIdx("딜", "디", "탱")) {
          atbf(comp[_0x50bf82], "행동", all, "공퍼증", 15, "소나타", 50, 1);
        }
        tbf(_0x55e037, "공퍼증", 10, "공격+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 4 == 0) {
          tbf(boss, "받뎀증", 30, "피안개", 1);
        }
      };
      _0x55e037.turnover = function () {};
      return _0x55e037;
    case 10097:
      setMnc(_0x55e037, [265, 3, 298, 3, 331, 3, 364, 3, 397, 3], _0x78c5e1);
      _0x55e037.stack = false;
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(all, "궁뎀증", 25, "섹스마스 강림!1", 2);
            break;
          case 2:
            tbf(all, "궁뎀증", 30, "섹스마스 강림!1", 2);
            break;
          case 3:
            tbf(all, "궁뎀증", 30, "섹스마스 강림!1", 2);
            tbf(_0x55e037, "가뎀증", 20, "섹스마스 강림!2", 2);
            break;
          case 4:
            tbf(all, "궁뎀증", 30, "섹스마스 강림!1", 2);
            tbf(_0x55e037, "가뎀증", 20, "섹스마스 강림!2", 2);
            break;
          default:
            tbf(all, "궁뎀증", 35, "섹스마스 강림!1", 2);
            tbf(_0x55e037, "가뎀증", 25, "섹스마스 강림!2", 2);
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
        if (_0x55e037.isLeader) {
          if (_0x55e037.stack) {
            cdChange(_0x55e037, -3);
            _0x55e037.stack = false;
          }
        }
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        let _0x4fa54b = 0;
        if (getElementCnt("광") >= 3) {
          _0x4fa54b += 10;
          tbf(all, "공퍼증", 65, "<오럴송>1", always);
          for (let _0x22279b of getElementIdx("광")) {
            anbf(all, "공격", comp[_0x22279b], "받속뎀", 4, "<오럴송>2", 1, 5, always);
          }
          for (let _0x159e98 of getElementIdx("풍")) {
            anbf(all, "공격", comp[_0x159e98], "받속뎀", 4, "<오럴송>3", 1, 5, always);
          }
        }
        if (getElementCnt("풍") >= 2) {
          _0x4fa54b += 10;
          tbf(all, "공퍼증", 65, "<난교 파티>1", always);
          for (let _0x2f45b8 of getElementIdx("광")) {
            anbf(all, "공격", comp[_0x2f45b8], "받속뎀", 4, "<난교 파티>2", 1, 5, always);
          }
          for (let _0x442e92 of getElementIdx("풍")) {
            anbf(all, "공격", comp[_0x442e92], "받속뎀", 4, "<난교 파티>3", 1, 5, always);
          }
        }
        if (_0x4fa54b != 0) {
          hpUpAll(_0x4fa54b);
        }
      };
      _0x55e037.passive = function () {
        anbf(_0x55e037, "궁", _0x55e037, "받캐뎀", 50, "발골", 1, 1, always);
        anbf(_0x55e037, "궁", _0x55e037, "공퍼증", 50, "정신통일", 1, 2, always);
        tbf(_0x55e037, "가뎀증", 15, "시저 님을 위하여1", always);
        atbf(_0x55e037, "궁", boss, "받뎀증", 35, "시저 님을 위하여2", 2, always);
        tbf(_0x55e037, "궁뎀증", 10, "궁극기+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {
          if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 3 == 0) {
            _0x55e037.stack = true;
          }
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10098:
      setMnc(_0x55e037, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
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
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
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
      _0x55e037.passive = function () {
        tbf(_0x55e037, "가뎀증", 35, "시험작 999호1", always);
        tbf(_0x55e037, "공퍼증", 10, "공격+", always);
        anbf(_0x55e037, "궁", boss, "받뎀증", 5, "다방구 시작~", 4, 11, always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {
          if (GLOBAL_TURN == 5) {
            nbf(all, "궁뎀증", 30, "함께 놀수록 재밌는 법~2", 1, 1);
          }
          if (GLOBAL_TURN == 9) {
            nbf(all, "가뎀증", 20, "함께 놀수록 재밌는 법~3", 1, 1);
          }
        }
      };
      _0x55e037.turnover = function () {
        nbf(boss, "받뎀증", 5, "다방구 시작~", 1, 11);
      };
      return _0x55e037;
    case 10100:
      setMnc(_0x55e037, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            break;
          case 2:
            break;
          case 3:
            tbf(_0x55e037, "가뎀증", 15, "우사기 히메데스!", 4);
            break;
          case 4:
            tbf(_0x55e037, "가뎀증", 17.5, "우사기 히메데스!", 4);
            break;
          default:
            tbf(_0x55e037, "가뎀증", 20, "우사기 히메데스!", 4);
            break;
        }
      };
      _0x55e037.ultafter = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(_0x55e037, "가뎀증", 10, "우사기 히메데스!", 4);
            break;
          case 2:
            tbf(_0x55e037, "가뎀증", 12.5, "우사기 히메데스!", 4);
            break;
          case 3:
            break;
          case 4:
            break;
          default:
            break;
        }
      };
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037, 10);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        tbf(all, "공퍼증", 30, "고유 결계 - 악토끼 왕국!1", always);
        anbf(_0x55e037, "궁", _0x55e037, "공퍼증", 50, "고유 결계 - 악토끼 왕국!2", 1, 4, always);
        for (let _0x4bd4f8 of getRoleIdx("딜", "탱", "디")) {
          tbf(comp[_0x4bd4f8], "평추가*", 60, "<무다 무다 무다!>1", always);
          tbf(comp[_0x4bd4f8], "일뎀증", 60, "<무다 무다 무다!>2", always);
        }
      };
      _0x55e037.passive = function () {
        tbf(_0x55e037, "평추가*", 60, "무한 찌찌!1", always);
        anbf(_0x55e037, "평", all, "일뎀증", 15, "무한 찌찌!2", 1, 3, always);
        tbf(_0x55e037, "공퍼증", 10, "공격력 증가", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {
          if (GLOBAL_TURN == 1) {
            for (let _0x476f30 of comp) {
              cdChange(_0x476f30, -2);
            }
          }
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
        nbf(boss, "받일뎀", 20, "가라! 악토끼 삼전사!", 1, 5);
      };
      return _0x55e037;
    case 10106:
      setMnc(_0x55e037, [200, 3, 200, 3, 200, 3, 200, 3, 200, 3], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(_0x55e037, "가뎀증", 10, "엘프궁술 - 연격의 화살1", 3);
            break;
          case 2:
            tbf(_0x55e037, "가뎀증", 10, "엘프궁술 - 연격의 화살1", 3);
            break;
          case 3:
            tbf(_0x55e037, "가뎀증", 15, "엘프궁술 - 연격의 화살1", 3);
            break;
          case 4:
            tbf(_0x55e037, "가뎀증", 15, "엘프궁술 - 연격의 화살1", 3);
            break;
          default:
            tbf(_0x55e037, "가뎀증", 20, "엘프궁술 - 연격의 화살1", 3);
            break;
        }
      };
      _0x55e037.ultafter = function () {
        switch (_0x78c5e1) {
          case 1:
            buff(_0x55e037, "공발동*", 50, "엘프궁술 - 연격의 화살3", 3, false);
            break;
          case 2:
            buff(_0x55e037, "공발동*", 65, "엘프궁술 - 연격의 화살3", 3, false);
            break;
          case 3:
            buff(_0x55e037, "공발동*", 80, "엘프궁술 - 연격의 화살3", 3, false);
            break;
          case 4:
            buff(_0x55e037, "공발동*", 95, "엘프궁술 - 연격의 화살3", 3, false);
            break;
          default:
            buff(_0x55e037, "공발동*", 110, "엘프궁술 - 연격의 화살3", 3, false);
            break;
        }
      };
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
        for (let _0x24fd42 of comp) {
          setBuffOnAll(_0x24fd42, "기본", "엘프궁술 - 연격의 화살3", true);
        }
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(20);
        if (getElementCnt("풍") >= 3) {
          for (let _0x4bed04 of getRoleIdx("딜", "디")) {
            tbf(comp[_0x4bed04], "공퍼증", 25, "<엘프 대장>1", always);
            tbf(comp[_0x4bed04], "발뎀증", 175, "<엘프 대장>2", always);
            tbf(comp[_0x4bed04], "평발동*", 40, "<엘프 대장>3", always);
            tbf(comp[_0x4bed04], "궁발동*", 100, "<엘프 대장>4", always);
          }
        }
        if (getElementCnt("화") >= 2) {
          tbf(all, "공퍼증", 100, "<저격 포메이션>", always);
        }
      };
      _0x55e037.passive = function () {
        tbf(_0x55e037, "궁발동*", 80, "추풍의 맹격", always);
        anbf(_0x55e037, "평", boss, "받발뎀", 20, "부식 화살통1", 1, 5, always);
        tbf(_0x55e037, "평발동*", 35, "부식 화살통2", always);
        anbf(_0x55e037, "평", all, "궁뎀증", 6, "영기의 강격1", 1, 5, always);
        anbf(_0x55e037, "궁", boss, "받궁뎀", 15, "영기의 강격2", 1, 2, always);
        tbf(_0x55e037, "궁뎀증", 10, "궁극기+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10107:
      setMnc(_0x55e037, [353, 4, 404, 4, 454, 4, 505, 4, 555, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            nbf(_0x55e037, "공퍼증", 18.75, "회전 회오리 슛!", 4, 4);
            break;
          case 2:
            nbf(_0x55e037, "공퍼증", 22.5, "회전 회오리 슛!", 4, 4);
            break;
          case 3:
            nbf(_0x55e037, "공퍼증", 26.25, "회전 회오리 슛!", 4, 4);
            break;
          case 4:
            nbf(_0x55e037, "공퍼증", 30, "회전 회오리 슛!", 4, 4);
            break;
          default:
            nbf(_0x55e037, "공퍼증", 33.75, "회전 회오리 슛!", 4, 4);
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
        deleteBuff(_0x55e037, "기본", "큰거 한방!");
        deleteBuff(_0x55e037, "기본", "공수전환!!");
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
        nbf(_0x55e037, "공퍼증", 33.75, "회전 회오리 슛!", -1, 4);
      };
      _0x55e037.leader = function () {
        hpUpAll(20);
        tbf(all, "공퍼증", 40, "악수는 승패가 난 후에!1", always);
        for (let _0x4b3544 of getRoleIdx("딜")) {
          atbf(_0x55e037, "평", comp[_0x4b3544], "공고증", myCurAtk + _0x55e037.id + 40, "악수는 승패가 난 후에!2", 1, always);
        }
        if (getRoleCnt("딜") >= 4) {
          for (let _0x2cf873 of getRoleIdx("딜")) {
            tbf(comp[_0x2cf873], "공퍼증", 100, "<일파만파!>1", always);
            atbf(comp[_0x2cf873], "궁", comp[0], "공고증", myCurAtk + comp[_0x2cf873].id + 60, "<일파만파!>2", 1, always);
          }
        }
      };
      _0x55e037.passive = function () {
        anbf(_0x55e037, "평", _0x55e037, "공퍼증", 12.5, "파워 차징!", 1, 4, always);
        tbf(all, "가뎀증", 10, "공수 전환!!1", always);
        tbf(_0x55e037, "궁뎀증", 10, "궁극기+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 4 == 0) {
          nbf(_0x55e037, "공퍼증", 75, "큰거 한방!", 1, 1);
          nbf(_0x55e037, "가뎀증", 40, "공수 전환!!", 1, 1);
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10108:
      setMnc(_0x55e037, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        for (let _0x4e8585 of comp) {
          if (_0x4e8585.id != _0x55e037.id) {
            tbf(_0x4e8585, "공고증", myCurAtk + _0x55e037.id + 20, "발렌타인 초콜릿 대방출~1", 1);
          }
        }
        switch (_0x78c5e1) {
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
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {
        for (let _0x453b6d of comp) {
          if (_0x453b6d.id != _0x55e037.id) {
            tbf(_0x453b6d, "공고증", myCurAtk + _0x55e037.id + 20, "달콤한 맛", 1);
          }
        }
      };
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
        for (let _0x291c8a of comp) {
          _0x291c8a.heal();
        }
      };
      _0x55e037.leader = function () {
        hpUpAll(20);
        tbf(all, "공퍼증", 50, "연애하는 소녀의 기분이란", always);
        if (getElementCnt("화") >= 3) {
          atbf(all, "궁", boss, "받궁뎀", 15, "<모두 함께 초콜릿을 만들어보자>1", 2, always);
          for (let _0xe1a1b3 of getElementIdx("화")) {
            atbf(all, "궁", comp[_0xe1a1b3], "받속뎀", 15, "<모두 함께 초콜릿을 만들어보자>2", 2, always);
          }
        }
        tbf(comp[2], "공퍼증", 70, "<가장 사랑하는 그대에게>1", always);
        anbf(comp[2], "궁", comp[2], "가뎀증", 20, "<가장 사랑하는 그대에게>2", 1, 2, always);
      };
      _0x55e037.passive = function () {
        for (let _0x80ca0d of getRoleIdx("힐", "섶")) {
          tbf(comp[_0x80ca0d], "공퍼증", 40, "<격정의 밤>", always);
        }
        tbf(_0x55e037, "공퍼증", 10, "공격 데미지+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10109:
      setMnc(_0x55e037, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            for (let _0x28d373 of getElementIdx("광")) {
              tbf(comp[_0x28d373], "공고증", myCurAtk + _0x55e037.id + 20, "설탕처럼 진한 달콤함1", 1);
            }
            tbf(comp[4], "공고증", myCurAtk + _0x55e037.id + 30, "설탕처럼 진한 달콤함2", 1);
            break;
          case 2:
            for (let _0x24f6c2 of getElementIdx("광")) {
              tbf(comp[_0x24f6c2], "공고증", myCurAtk + _0x55e037.id + 20, "설탕처럼 진한 달콤함1", 1);
            }
            tbf(comp[4], "공고증", myCurAtk + _0x55e037.id + 35, "설탕처럼 진한 달콤함2", 1);
            break;
          case 3:
            for (let _0x5f157c of getElementIdx("광")) {
              tbf(comp[_0x5f157c], "공고증", myCurAtk + _0x55e037.id + 20, "설탕처럼 진한 달콤함1", 1);
            }
            tbf(comp[4], "공고증", myCurAtk + _0x55e037.id + 40, "설탕처럼 진한 달콤함2", 1);
            break;
          case 4:
            for (let _0x2398ce of getElementIdx("광")) {
              tbf(comp[_0x2398ce], "공고증", myCurAtk + _0x55e037.id + 30, "설탕처럼 진한 달콤함1", 1);
            }
            tbf(comp[4], "공고증", myCurAtk + _0x55e037.id + 40, "설탕처럼 진한 달콤함2", 1);
            break;
          default:
            for (let _0x5c4611 of getElementIdx("광")) {
              tbf(comp[_0x5c4611], "공고증", myCurAtk + _0x55e037.id + 40, "설탕처럼 진한 달콤함1", 1);
            }
            tbf(comp[4], "공고증", myCurAtk + _0x55e037.id + 40, "설탕처럼 진한 달콤함2", 1);
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {
        for (let _0x696908 of getElementIdx("광")) {
          tbf(comp[_0x696908], "공고증", myCurAtk + _0x55e037.id + 10, "네게만 줄게1", 1);
        }
        tbf(comp[4], "공고증", myCurAtk + _0x55e037.id + 20, "네게만 줄게2", 1);
        tbf(comp[4], "일뎀증", 35, "네게만 줄게3", 1);
      };
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(30);
        tbf(all, "공퍼증", 40, "달콤한 날", always);
        for (let _0x3e770a of getRoleIdx("힐", "섶")) {
          atbf(comp[_0x3e770a], "궁", comp[4], "가뎀증", 15, "<가장 사랑하는 그대에게>1", 1, always);
          atbf(comp[_0x3e770a], "궁", comp[4], "궁발동*", 50, "<가장 사랑하는 그대에게>2", 1, always);
        }
        for (let _0x5cec95 = 0; _0x5cec95 < 4; _0x5cec95++) {
          anbf(comp[4], "궁", comp[_0x5cec95], "공퍼증", 50, "<정이 담긴 초콜릿>", 1, 1, always);
        }
      };
      _0x55e037.passive = function () {
        nbf(comp[4], "일뎀증", 50, "달콤한 선물", 1, 1);
        atbf(_0x55e037, "궁", comp[4], "궁뎀증", 30, "연애, 마왕, 초콜릿1", 1, always);
        for (let _0x54983c of getRoleIdx("딜")) {
          atbf(_0x55e037, "궁", comp[_0x54983c], "궁뎀증", 20, "연애, 마왕, 초콜릿2", 1, always);
        }
        tbf(_0x55e037, "공퍼증", 10, "공격+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 4 == 0) {
          tbf(comp[4], "궁뎀증", 40, "정성 가득 초콜릿", 1);
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10110:
      _0x55e037.stack = 0;
      setMnc(_0x55e037, [215, 4, 238, 4, 261, 4, 284, 4, 307, 4], _0x78c5e1);
      buff_ex.push("<치명적인 향기>", "<달콤한 살기>", "<마조 엑스터시>");
      _0x55e037.ultbefore = function () {
        nbf(_0x55e037, "<치명적인 향기>", 0, "달콤한 죽음을", 1, 9);
        switch (_0x78c5e1) {
          case 1:
            nbf(boss, "받뎀증", 10, "메이드 비기 - 모조리 사형(?)1", 1, 2);
            tbf(_0x55e037, "평추가*", 30, "메이드 비기 - 모조리 사형(?)2", 4);
            break;
          case 2:
            nbf(boss, "받뎀증", 10, "메이드 비기 - 모조리 사형(?)1", 1, 2);
            tbf(_0x55e037, "평추가*", 50, "메이드 비기 - 모조리 사형(?)2", 4);
            break;
          case 3:
            nbf(boss, "받뎀증", 12.5, "메이드 비기 - 모조리 사형(?)1", 1, 2);
            tbf(_0x55e037, "평추가*", 70, "메이드 비기 - 모조리 사형(?)2", 4);
            break;
          case 4:
            nbf(boss, "받뎀증", 12.5, "메이드 비기 - 모조리 사형(?)1", 1, 2);
            tbf(_0x55e037, "평추가*", 90, "메이드 비기 - 모조리 사형(?)2", 4);
            break;
          default:
            nbf(boss, "받뎀증", 15, "메이드 비기 - 모조리 사형(?)1", 1, 2);
            tbf(_0x55e037, "평추가*", 110, "메이드 비기 - 모조리 사형(?)2", 4);
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        const _0x4bfa0e = _0x55e037.getNest("<치명적인 향기>");
        if (_0x4bfa0e == 8) {
          setBuffOn(_0x55e037, "발동", "달콤한 죽음을2", true);
        } else if (_0x4bfa0e == 2) {
          setBuffOn(_0x55e037, "발동", "한번 죽어보도록~1", true);
        }
        atkLogic(_0x55e037);
        if (_0x4bfa0e == 2) {
          setBuffOn(_0x55e037, "기본", "달콤한 죽음을1", true);
          setBuffOn(_0x55e037, "기본", "한번 죽어보도록~1", true);
        } else if (_0x4bfa0e == 5) {
          setBuffOn(_0x55e037, "발동", "한번 죽어보도록~2", true);
        } else if (_0x4bfa0e == 8) {
          setBuffOn(_0x55e037, "기본", "달콤한 죽음을2", true);
          setBuffOn(_0x55e037, "발동", "한번 죽어보도록~3", true);
        }
      };
      _0x55e037.leader = function () {
        hpUpAll(20);
        tbf(all, "공퍼증", 50, "피로 얼룩진 사랑1", always);
        tbf(all, "일뎀증", 30, "피로 얼룩진 사랑2", always);
        for (let _0x28a65e of getRoleIdx("딜", "디")) {
          anbf(comp[_0x28a65e], "공격", all, "<달콤한 살기>", 0, "피로 얼룩진 사랑", 1, 30, always);
        }
        const _0x2fcf3a = getRoleIdx("딜", "디");
        for (let _0x4ac886 of _0x2fcf3a) {
          buff(comp[_0x4ac886], "공격", comp[_0x4ac886], "on", "기본", "피로 얼룩진 사랑4", 1, always, "발동", false);
          buff(comp[_0x4ac886], "공격", comp[_0x4ac886], "on", "기본", "피로 얼룩진 사랑5", 1, always, "발동", false);
          buff(comp[_0x4ac886], "평추가*", 50, "피로 얼룩진 사랑3", always, false);
          buff(comp[_0x4ac886], "공퍼증", 50, "피로 얼룩진 사랑4", always, false);
          buff(comp[_0x4ac886], "가뎀증", 25, "피로 얼룩진 사랑5", always, false);
          const _0x3469c0 = comp[_0x4ac886].attack;
          comp[_0x4ac886].attack = function (..._0x3ae08a) {
            if (_0x55e037.stack == 19) {
              setBuffOn(comp[_0x4ac886], "발동", "피로 얼룩진 사랑4", true);
            } else if (_0x55e037.stack == 29) {
              setBuffOn(comp[_0x4ac886], "발동", "피로 얼룩진 사랑5", true);
            }
            _0x3469c0.apply(this, _0x3ae08a);
            if (_0x55e037.stack == 19) {
              setBuffOn(comp[_0x4ac886], "발동", "피로 얼룩진 사랑4", false);
            } else if (_0x55e037.stack == 29) {
              setBuffOn(comp[_0x4ac886], "발동", "피로 얼룩진 사랑5", false);
            }
            _0x55e037.stack++;
            if (_0x55e037.stack > 30) {
              _0x55e037.stack = 30;
            }
            for (let _0x3072ff of _0x2fcf3a) {
              if (_0x55e037.stack == 10) {
                setBuffOn(comp[_0x3072ff], "기본", "피로 얼룩진 사랑3", true);
              } else if (_0x55e037.stack == 20) {
                setBuffOn(comp[_0x3072ff], "기본", "피로 얼룩진 사랑4", true);
              } else if (_0x55e037.stack == 30) {
                setBuffOn(comp[_0x3072ff], "기본", "피로 얼룩진 사랑5", true);
              }
            }
          };
          const _0x5079a6 = comp[_0x4ac886].ultimate;
          comp[_0x4ac886].ultimate = function (..._0x3af01a) {
            if (_0x55e037.stack == 19) {
              setBuffOn(comp[_0x4ac886], "발동", "피로 얼룩진 사랑4", true);
            } else if (_0x55e037.stack == 29) {
              setBuffOn(comp[_0x4ac886], "발동", "피로 얼룩진 사랑5", true);
            }
            _0x5079a6.apply(this, _0x3af01a);
            if (_0x55e037.stack == 19) {
              setBuffOn(comp[_0x4ac886], "발동", "피로 얼룩진 사랑4", false);
            } else if (_0x55e037.stack == 29) {
              setBuffOn(comp[_0x4ac886], "발동", "피로 얼룩진 사랑5", false);
            }
            _0x55e037.stack++;
            if (_0x55e037.stack > 30) {
              _0x55e037.stack = 30;
            }
            for (let _0x373ec8 of _0x2fcf3a) {
              if (_0x55e037.stack == 10) {
                setBuffOn(comp[_0x373ec8], "기본", "피로 얼룩진 사랑3", true);
              } else if (_0x55e037.stack == 20) {
                setBuffOn(comp[_0x373ec8], "기본", "피로 얼룩진 사랑4", true);
              } else if (_0x55e037.stack == 30) {
                setBuffOn(comp[_0x373ec8], "기본", "피로 얼룩진 사랑5", true);
              }
            }
          };
        }
      };
      _0x55e037.passive = function () {
        anbf(_0x55e037, "평", _0x55e037, "<치명적인 향기>", 0, "달콤한 죽음을", 1, 9, always);
        buff(_0x55e037, "평", _0x55e037, "on", "기본", "달콤한 죽음을2", 1, always, "발동", false);
        buff(_0x55e037, "평", _0x55e037, "on", "기본", "한번 죽어보도록~1", 1, always, "발동", false);
        buff(_0x55e037, "평추가*", 40, "달콤한 죽음을1", always, false);
        buff(_0x55e037, "공퍼증", 50, "달콤한 죽음을2", always, false);
        anbf(_0x55e037, "피격", _0x55e037, "<마조 엑스터시>", 0, "부족해 부족해 부족하다고!", 1, 10, always);
        buff(_0x55e037, "공퍼증", 20, "부족해 부족해 부족하다고!1", always, false);
        buff(_0x55e037, "공퍼증", 40, "부족해 부족해 부족하다고!2", always, false);
        buff(_0x55e037, "가뎀증", 20, "한번 죽어보도록~1", always, false);
        buff(_0x55e037, "평", _0x55e037, "일뎀증", 10, "한번 죽어보도록~2", 1, 3, always, "발동", false);
        buff(_0x55e037, "공격", boss, "받뎀증", 15, "한번 죽어보도록~3", 1, 1, always, "발동", false);
        tbf(_0x55e037, "공퍼증", 10, "공격 데미지+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
        const _0x4d952e = _0x55e037.getNest("<마조 엑스터시>");
        setBuffOn(_0x55e037, "기본", "부족해 부족해 부족하다고!1", _0x4d952e >= 5);
        setBuffOn(_0x55e037, "기본", "부족해 부족해 부족하다고!2", _0x4d952e >= 10);
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
        nbf(_0x55e037, "<마조 엑스터시>", 0, "부족해 부족해 부족하다고!", 1, 10);
      };
      return _0x55e037;
    case 10111:
      setMnc(_0x55e037, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(all, "공고증", myCurAtk + _0x55e037.id + 20, "시저 님의 냄새1", 1);
            break;
          case 2:
            tbf(all, "공고증", myCurAtk + _0x55e037.id + 20, "시저 님의 냄새1", 1);
            break;
          case 3:
            tbf(all, "공고증", myCurAtk + _0x55e037.id + 25, "시저 님의 냄새1", 1);
            tbf(all, "공퍼증", 10, "시저 님의 냄새2", 4);
            break;
          case 4:
            tbf(all, "공고증", myCurAtk + _0x55e037.id + 25, "시저 님의 냄새1", 1);
            tbf(all, "공퍼증", 20, "시저 님의 냄새2", 4);
            break;
          default:
            tbf(all, "공고증", myCurAtk + _0x55e037.id + 30, "시저 님의 냄새1", 1);
            tbf(all, "공퍼증", 20, "시저 님의 냄새2", 4);
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
        for (let _0x15c9f7 of comp) {
          _0x15c9f7.heal();
        }
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
        for (let _0x2005bd of comp) {
          _0x2005bd.heal();
        }
      };
      _0x55e037.leader = function () {
        tbf(all, "공퍼증", 40, "수치성 열치료실", always);
        const _0x1a1624 = comp.filter(_0x4964ad => _0x4964ad.role == 0);
        if (_0x1a1624.length != 0) {
          let _0x2768b9 = _0x1a1624.reduce((_0x5d2c33, _0x59f0b1) => {
            if (_0x59f0b1.atk > _0x5d2c33.atk) {
              return _0x59f0b1;
            } else {
              return _0x5d2c33;
            }
          }, _0x1a1624[0]);
          tbf(_0x2768b9, "공퍼증", 60, "<성욕 팽창>1", always);
          tbf(_0x2768b9, "가뎀증", 35, "<성욕 팽창>2", always);
          tbf(_0x2768b9, "궁뎀증", 40, "<성욕 팽창>3", always);
          tbf(_0x2768b9, "궁발동*", 275, "<성욕 팽창>4", always);
        }
        let _0x42efe2 = comp.reduce((_0x4da533, _0x4bb690) => {
          if (_0x4bb690.atk < _0x4da533.atk) {
            return _0x4bb690;
          } else {
            return _0x4da533;
          }
        }, comp[0]);
        tbf(_0x42efe2, "받아증", 30, "<자극적인 배덕감>", 50);
      };
      _0x55e037.passive = function () {
        tbf(all, "받아증", 30, "약 복용과 섹스는 적당하게1", always);
        atbf(_0x55e037, "방", all, "아머", myCurAtk + _0x55e037.id + 25, "약 복용과 섹스는 적당하게2", 1, always);
        hpUpMe(_0x55e037, 10);
        tbf(_0x55e037, "공퍼증", 10, "말 안들으면 벌 줄거에요1", always);
        anbf(_0x55e037, "궁", boss, "받궁뎀", 20, "말 안들으면 벌 줄거에요2", 1, 2, always);
        tbf(_0x55e037, "공퍼증", 10, "공격+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10113:
      setMnc(_0x55e037, [445, 4, 514, 4, 583, 4, 652, 4, 721, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {};
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        if (getRoleCnt("섶") >= 1) {
          tbf(_0x55e037, "궁뎀증", 35, "내 전문적인 의료행위에 딴지 걸지 마!1", always);
        }
        if (getRoleCnt("섶") >= 2) {
          tbf(_0x55e037, "궁뎀증", 35, "내 전문적인 의료행위에 딴지 걸지 마!2", always);
        }
        if (getRoleCnt("힐") >= 1) {
          tbf(_0x55e037, "궁뎀증", 35, "내 전문적인 의료행위에 딴지 걸지 마!3", always);
        }
        if (getRoleCnt("힐") >= 2) {
          tbf(_0x55e037, "궁뎀증", 35, "내 전문적인 의료행위에 딴지 걸지 마!4", always);
        }
        if (getElementCnt("암") >= 3) {
          hpUpAll(20);
          tbf(all, "공퍼증", 50, "<암흑요법>1", always);
          anbf(all, "궁", boss, "받뎀증", 8, "<암흑요법>2", 1, 5, always);
          for (let _0x4e93ac of getElementIdx("암")) {
            anbf(all, "궁", comp[_0x4e93ac], "받속뎀", 8, "<암흑요법>3", 1, 5, always);
          }
        }
      };
      _0x55e037.passive = function () {
        if (getRoleCnt("딜") >= 1) {
          tbf(_0x55e037, "궁추가*", 100, "일침견혈(?)1", always);
        }
        if (getRoleCnt("딜") >= 2) {
          tbf(_0x55e037, "궁추가*", 100, "일침견혈(?)2", always);
        }
        if (getElementCnt("암") >= 2) {
          tbf(_0x55e037, "공퍼증", 50, "혼돈 요법1", always);
        }
        if (getElementCnt("암") >= 3) {
          tbf(_0x55e037, "공퍼증", 50, "혼돈 요법2", always);
        }
        if (getRoleCnt("섶") >= 1) {
          tbf(_0x55e037, "가뎀증", 15, "투여량 대폭 증가1", always);
        }
        if (getRoleCnt("섶") >= 2) {
          tbf(_0x55e037, "가뎀증", 15, "투여량 대폭 증가2", always);
        }
        if (getRoleCnt("힐") >= 1) {
          tbf(_0x55e037, "가뎀증", 15, "투여량 대폭 증가1", always);
        }
        if (getRoleCnt("힐") >= 2) {
          tbf(_0x55e037, "가뎀증", 15, "투여량 대폭 증가2", always);
        }
        tbf(_0x55e037, "공퍼증", 10, "공격+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10114:
      setMnc(_0x55e037, [388, 4, 445, 4, 503, 4, 560, 4, 618, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
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
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(30);
        if (getElementCnt("암") >= 3) {
          tbf(all, "공퍼증", 40, "<원초의 마법소녀>1", always);
          anbf(all, "행동", boss, "받뎀증", 2.5, "<원초의 마법소녀>2", 1, 12, always);
          anbf(all, "행동", boss, "받발뎀", 5, "<원초의 마법소녀>3", 1, 12, always);
        }
        if (getElementCnt("광") >= 2) {
          tbf(all, "가뎀증", 20, "<성월의 축복>1", always);
          for (let _0x58c117 of getElementIdx("암", "광")) {
            anbf(all, "궁", comp[_0x58c117], "받속뎀", 17.5, "<성월의 축복>2", 1, 2, always);
          }
        }
        tbf(comp[0], "공퍼증", 80, "<힘 증폭>1", always);
        tbf(comp[0], "일뎀증", 60, "<힘 증폭>2", always);
        tbf(comp[0], "궁뎀증", 40, "<힘 증폭>3", always);
        tbf(comp[0], "궁발동*", 150, "<힘 증폭>4", always);
      };
      _0x55e037.passive = function () {
        tbf(_0x55e037, "공퍼증", 40, "다가오지 마!1", always);
        tbf(_0x55e037, "궁뎀증", 20, "다가오지 마!2", always);
        tbf(comp[4], "궁뎀증", 40, "<다시 찾은 광명>1", always);
        tbf(comp[4], "가뎀증", 40, "<다시 찾은 광명>2", always);
        tbf(_0x55e037, "발뎀증", 100, "마법소녀의 힘의 근원1", always);
        tbf(_0x55e037, "궁발동*", 180, "마법소녀의 힘의 근원2", always);
        tbf(_0x55e037, "공퍼증", 10, "공격+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10115:
      setMnc(_0x55e037, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(all, "아머", _0x55e037.hp * 20 * armorUp(_0x55e037, "궁", "추가"), "자동 가열 진동 모드?1", 1);
            break;
          case 2:
            tbf(all, "아머", _0x55e037.hp * 24 * armorUp(_0x55e037, "궁", "추가"), "자동 가열 진동 모드?1", 1);
            break;
          case 3:
            tbf(all, "아머", _0x55e037.hp * 28 * armorUp(_0x55e037, "궁", "추가"), "자동 가열 진동 모드?1", 1);
            tbf(boss, "받뎀증", 10, "자동 가열 진동 모드?2", 4);
            break;
          case 4:
            tbf(all, "아머", _0x55e037.hp * 32 * armorUp(_0x55e037, "궁", "추가"), "자동 가열 진동 모드?1", 1);
            tbf(boss, "받뎀증", 15, "자동 가열 진동 모드?2", 4);
            break;
          default:
            tbf(all, "아머", _0x55e037.hp * 36 * armorUp(_0x55e037, "궁", "추가"), "자동 가열 진동 모드?1", 1);
            tbf(boss, "받뎀증", 20, "자동 가열 진동 모드?2", 4);
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
        if (_0x55e037.isLeader) {
          for (let _0x67e239 of comp) {
            if (_0x67e239.id != _0x55e037.id) {
              setBuffOn(_0x67e239, "발동", "<마력 응집>1", true);
              setBuffOn(_0x67e239, "발동", "<마력 응집>2", true);
              setBuffOn(_0x67e239, "발동", "<마력 응집>3", true);
            }
          }
        }
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
        for (let _0x301a02 of comp) {
          _0x301a02.heal();
        }
        if (_0x55e037.isLeader) {
          for (let _0x31e704 of comp) {
            if (_0x31e704.id != _0x55e037.id) {
              setBuffOn(_0x31e704, "발동", "<마력 응집>1", true);
              setBuffOn(_0x31e704, "발동", "<마력 응집>2", true);
              setBuffOn(_0x31e704, "발동", "<마력 응집>3", true);
            }
          }
        }
      };
      _0x55e037.leader = function () {
        for (let _0x39ed61 of getElementIdx("풍")) {
          nbf(comp[_0x39ed61], "받속뎀", 35, "별이 반짝 천재 마법소녀1", 1, 1);
        }
        tbf(_0x55e037, "가뎀증", 50, "별이 반짝 천재 마법소녀2", always);
        for (let _0x57262d of comp) {
          if (_0x57262d.id != _0x55e037.id) {
            atbf(_0x55e037, "공격", _0x57262d, "가뎀증", 20, "<정의의 이름으로 널 심판하겠다>1", 1, always);
            buff(_0x57262d, "공격", comp[0], "공퍼증", 50, "<마력 응집>1", 2, always, "발동", false);
            buff(_0x57262d, "공격", comp[0], "평추가*", 75, "<마력 응집>2", 2, always, "발동", false);
            buff(_0x57262d, "공격", comp[0], "궁추가*", 125, "<마력 응집>3", 2, always, "발동", false);
          }
        }
      };
      _0x55e037.passive = function () {
        atbf(_0x55e037, "공격", all, "공고증", myCurAtk + _0x55e037.id + 20, "분홍빛 최음 광선", 1, always);
        tbf(all, "받아증", 20, "노출광 모드", always);
        atbf(_0x55e037, "힐", all, "공퍼증", 20, "도피는 유용하지만 도피할 수 없어1", 1, always);
        tbf(all, "가뎀증", 15, "도피는 유용하지만 도피할 수 없어2", always);
        tbf(_0x55e037, "공퍼증", 10, "공격력+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {
          for (let _0x1eb66b of comp) {
            if (_0x1eb66b.id != _0x55e037.id) {
              setBuffOn(_0x1eb66b, "발동", "<마력 응집>1", false);
              setBuffOn(_0x1eb66b, "발동", "<마력 응집>2", false);
              setBuffOn(_0x1eb66b, "발동", "<마력 응집>3", false);
            }
          }
        }
      };
      return _0x55e037;
    case 10116:
      setMnc(_0x55e037, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(_0x55e037, "공퍼증", 50, "포효하라 칼리버!", 2);
            break;
          case 2:
            tbf(_0x55e037, "공퍼증", 60, "포효하라 칼리버!", 2);
            break;
          case 3:
            tbf(_0x55e037, "공퍼증", 70, "포효하라 칼리버!", 3);
            break;
          case 4:
            tbf(_0x55e037, "공퍼증", 80, "포효하라 칼리버!", 4);
            break;
          default:
            tbf(_0x55e037, "공퍼증", 100, "포효하라 칼리버!", 4);
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(25);
        tbf(all, "일뎀증", 50, "여름 용자의 바캉스 타임1", always);
        if (getRoleCnt("딜") >= 3) {
          tbf(comp[0], "공퍼증", 40, "<나는 먹는다. 고로 존재한다>1", always);
          tbf(comp[0], "평추가*", 50, "<나는 먹는다. 고로 존재한다>2", always);
          for (let _0x4e1fbd of getElementIdx("화")) {
            anbf(comp[0], "궁", comp[_0x4e1fbd], "받속뎀", 20, "<나는 먹는다. 고로 존재한다>3", 1, 2, always);
          }
          anbf(_0x55e037, "궁", boss, "받일뎀", 40, "<나는 먹는다. 고로 존재한다>4", 1, 2, always);
        }
        if (getElementCnt("화") >= 3) {
          tbf(all, "공퍼증", 40, "<라이딩 모드 ON>1", always);
          for (let _0x398c63 of comp) {
            anbf(_0x398c63, "행동", _0x398c63, "가뎀증", 7, "<라이딩 모드 ON>2", 1, 5, always);
          }
          for (let _0x41e503 of comp) {
            anbf(_0x41e503, "행동", _0x41e503, "일뎀증", 15, "<라이딩 모드 ON>3", 1, 5, always);
          }
        }
      };
      _0x55e037.passive = function () {
        tbf(_0x55e037, "일뎀증", 30, "디저트 금단 현상1", always);
        tbf(_0x55e037, "궁뎀증", 20, "디저트 금단 현상2", always);
        tbf(boss, "받뎀증", 15, "우리 엄마가 하와이에서 가르쳐주셨어1", 50);
        tbf(_0x55e037, "평추가*", 25, "셀프 BGM의 용자1", always);
        anbf(_0x55e037, "평", _0x55e037, "가뎀증", 10, "셀프 BGM의 용자2", 1, 3, always);
        tbf(_0x55e037, "궁뎀증", 10, "궁극기+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
        if (GLOBAL_TURN == 8) {
          tbf(_0x55e037, "궁뎀증", 40, "우리 엄마가 하와이에서 가르쳐주셨어2", 50);
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10117:
      setMnc(_0x55e037, [100, 4, 100, 4, 100, 4, 100, 4, 100, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {};
      _0x55e037.ultafter = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(_0x55e037, "평추가*", 96, "돌진! 시저 호!", 4);
            break;
          case 2:
            tbf(_0x55e037, "평추가*", 115, "돌진! 시저 호!", 4);
            break;
          case 3:
            tbf(_0x55e037, "평추가*", 135, "돌진! 시저 호!", 4);
            break;
          case 4:
            tbf(_0x55e037, "평추가*", 154, "돌진! 시저 호!", 4);
            break;
          default:
            tbf(_0x55e037, "평추가*", 173, "돌진! 시저 호!", 4);
            break;
        }
      };
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpMe(_0x55e037, 20);
        for (let _0x2046d6 of getElementIdx("화", "광")) {
          hpUpMe(comp[_0x2046d6], 20);
        }
        tbf(_0x55e037, "가뎀증", 20, "여름 상품 전면 세일 중~1", always);
        for (let _0x530e32 of getElementIdx("화", "광")) {
          tbf(comp[_0x530e32], "가뎀증", 20, "여름 상품 전면 세일 중~1", always);
        }
        tbf(_0x55e037, "공퍼증", 50, "여름 상품 전면 세일 중~2", always);
        tbf(_0x55e037, "일뎀증", 20, "여름 상품 전면 세일 중~3", always);
        for (let _0x11e5d9 of getElementIdx("화", "광")) {
          tbf(comp[_0x11e5d9], "공퍼증", 80, "여름 상품 전면 세일 중~4", always);
        }
        for (let _0x1b351b of getElementIdx("화", "광")) {
          tbf(comp[_0x1b351b], "일뎀증", 50, "여름 상품 전면 세일 중~5", always);
        }
        if (getElementCnt("화") >= 2) {
          for (let _0xee2ca1 of getRoleIdx("딜", "디")) {
            tbf(comp[_0xee2ca1], "평추가*", 40, "<바알상회 특제 BBQ 그릴>1", always);
            pnbf(comp[_0xee2ca1], "평", boss, "받일뎀", 18, "<바알상회 특제 BBQ 그릴>2", 1, 5, always);
          }
        }
        if (getElementCnt("광") >= 2) {
          for (let _0x78be5 of getRoleIdx("딜", "디")) {
            tbf(comp[_0x78be5], "평추가*", 40, "<바알상회 특제 BBQ 그릴>3", always);
            pnbf(comp[_0x78be5], "평", boss, "받일뎀", 18, "<바알상회 특제 BBQ 그릴>4", 1, 5, always);
          }
        }
      };
      _0x55e037.passive = function () {
        for (let _0x9e87c2 of getElementIdx("수")) {
          tbf(comp[_0x9e87c2], "공퍼증", 30, "수영복 모카 피부 마왕1", always);
        }
        for (let _0x4775e9 of getElementIdx("수")) {
          tbf(comp[_0x4775e9], "일뎀증", 20, "수영복 모카 피부 마왕2", always);
        }
        for (let _0x5b1f6e of getRoleIdx("딜", "디")) {
          let _0x870a0e = getElementCnt("수");
          if (_0x870a0e == 4) {
            tbf(comp[_0x5b1f6e], "평추가*", 15, "<바알상회 특제 물총>1", always);
          } else if (_0x870a0e == 5) {
            tbf(comp[_0x5b1f6e], "평추가*", 30, "<바알상회 특제 물총>1", always);
          }
          if (_0x870a0e == 4) {
            pnbf(comp[_0x5b1f6e], "평", boss, "받일뎀", 9, "<바알상회 특제 물총>2", 1, 5, always);
          } else if (_0x870a0e == 5) {
            pnbf(comp[_0x5b1f6e], "평", boss, "받일뎀", 18, "<바알상회 특제 물총>2", 1, 5, always);
          }
        }
        if (getRoleCnt("딜") >= 2) {
          tbf(all, "가뎀증", 30, "<해변의 집 프리미엄 상품>1", always);
          tbf(all, "일뎀증", 30, "<해변의 집 프리미엄 상품>2", always);
        }
        tbf(_0x55e037, "일뎀증", 10, "일반 공격+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10118:
      setMnc(_0x55e037, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            for (let _0x21e949 of getElementIdx("광")) {
              tbf(comp[_0x21e949], "받속뎀", 10, "지상신국이 도래한다~", 1);
            }
            break;
          case 2:
            for (let _0x5c888d of getElementIdx("광")) {
              tbf(comp[_0x5c888d], "받속뎀", 10, "지상신국이 도래한다~", 1);
            }
            break;
          case 3:
            for (let _0x53c1b6 of getElementIdx("광")) {
              tbf(comp[_0x53c1b6], "받속뎀", 15, "지상신국이 도래한다~", 1);
            }
            break;
          case 4:
            for (let _0x3cbd49 of getElementIdx("광")) {
              tbf(comp[_0x3cbd49], "받속뎀", 20, "지상신국이 도래한다~", 1);
            }
            break;
          default:
            for (let _0x1e6552 of getElementIdx("광")) {
              tbf(comp[_0x1e6552], "받속뎀", 25, "지상신국이 도래한다~", 1);
            }
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
        for (let _0x3a26b0 of comp) {
          _0x3a26b0.heal();
        }
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
        for (let _0x4711a5 of comp) {
          _0x4711a5.heal();
        }
      };
      _0x55e037.leader = function () {
        hpUpAll(20);
        if (getElementCnt("광") >= 4) {
          tbf(all, "공퍼증", 100, "섹스의 복음 전파자1", always);
        }
        for (let _0x2e29c3 of getElementIdx("광")) {
          tbf(comp[_0x2e29c3], "궁뎀증", 50, "섹스의 복음 전파자2", always);
        }
        atbf(_0x55e037, "힐", all, "가뎀증", 15, "섹스의 복음 전파자4", 1, always);
      };
      _0x55e037.passive = function () {
        anbf(_0x55e037, "궁", all, "공퍼증", 40, "절정으로 사랑이 널리 퍼지기를1", 1, 1, always);
        atbf(_0x55e037, "힐", all, "공퍼증", 10, "절정으로 사랑이 널리 퍼지기를2", 1, always);
        anbf(_0x55e037, "궁", all, "궁뎀증", 30, "함께 절정을 느껴봐요~1", 1, 1, always);
        atbf(_0x55e037, "힐", all, "궁뎀증", 10, "함께 절정을 느껴봐요~2", 1, always);
        anbf(_0x55e037, "궁", all, "가뎀증", 20, "섹스의 진리1", 1, 1, always);
        atbf(_0x55e037, "힐", all, "가뎀증", 5, "섹스의 진리2", 1, always);
        tbf(_0x55e037, "일뎀증", 10, "일반 공격 데미지+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {
          if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 4 == 0) {
            tbf(boss, "받뎀증", 50, "섹스의 복음 전파자3", 1);
          }
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10119:
      setMnc(_0x55e037, [0, 3, 0, 3, 0, 3, 0, 3, 0, 3], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
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
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        tbf(all, "공퍼증", 50, "시저 님은 신이야", always);
        tbf(_0x55e037, "가뎀증", 50, "전속 종업원1", always);
        tbf(_0x55e037, "평발동*", 100, "전속 종업원2", always);
        tbf(_0x55e037, "궁발동*", 250, "전속 종업원3", always);
        if (getRoleCnt("탱") >= 2) {
          for (let _0x1e94c3 of getRoleIdx("탱")) {
            tbf(comp[_0x1e94c3], "가뎀증", 50, "시저 님은 영원히 옳다1", always);
            tbf(comp[_0x1e94c3], "평발동*", 100, "시저 님은 영원히 옳다2", always);
            tbf(comp[_0x1e94c3], "평발동+", comp[_0x1e94c3].hp * 50, "시저 님은 영원히 옳다2", always);
            tbf(comp[_0x1e94c3], "궁발동*", 250, "시저 님은 영원히 옳다3", always);
            tbf(comp[_0x1e94c3], "궁발동+", comp[_0x1e94c3].hp * 125, "시저 님은 영원히 옳다3", always);
          }
        }
      };
      _0x55e037.passive = function () {
        atbf(_0x55e037, "궁", all, "힐", 150, "메이드... 종업원 섹스 테크닉!1", 1, always);
        tbf(_0x55e037, "궁발동*", 250, "메이드... 종업원 섹스 테크닉!2", always);
        tbf(_0x55e037, "공퍼증", 50, "아름다운 맛~", always);
        tbf(_0x55e037, "발효증", 75, "꾸잉 꾸잉 뀨~1", always);
        atbf(_0x55e037, "궁", all, "아머", _0x55e037.hp * 15, "꾸잉 꾸잉 뀨~2", 1, always);
        tbf(_0x55e037, "공퍼증", 10, "공격+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10120:
      setMnc(_0x55e037, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(_0x55e037, "발효증", 40, "심해의 파인애플!1", 3);
            break;
          case 2:
            tbf(_0x55e037, "발효증", 60, "심해의 파인애플!1", 3);
            break;
          case 3:
            tbf(_0x55e037, "발효증", 60, "심해의 파인애플!1", 3);
            tbf(_0x55e037, "궁뎀증", 20, "심해의 파인애플!2", 1);
            break;
          case 4:
            tbf(_0x55e037, "발효증", 80, "심해의 파인애플!1", 3);
            tbf(_0x55e037, "궁뎀증", 37.5, "심해의 파인애플!2", 1);
            break;
          default:
            tbf(_0x55e037, "발효증", 100, "심해의 파인애플!1", 3);
            tbf(_0x55e037, "궁뎀증", 45, "심해의 파인애플!2", 1);
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
        deleteBuff(_0x55e037, "기본", "<화약 장전>");
        deleteBuff(_0x55e037, "기본", "<네, 선장님!>");
        deleteBuff(_0x55e037, "기본", "<목소리가 작다!>");
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(20);
        tbf(all, "공퍼증", 50, "난쟁이 선장과 함께!1", always);
        if (getElementCnt("풍") >= 3) {
          for (let _0x568739 of getRoleIdx("딜", "디")) {
            tbf(comp[_0x568739], "공퍼증", 80, "<바람을 타고>1", always);
            tbf(comp[_0x568739], "가뎀증", 40, "<바람을 타고>2", always);
            atbf(comp[_0x568739], "공격", comp[0], "평발동*", 65, "<참파도랑>", 1, always);
          }
        }
        for (let _0x1be844 of getElementIdx("풍")) {
          tbf(comp[_0x1be844], "받속뎀", 25, "난쟁이 선장과 함께!2", 50);
        }
      };
      _0x55e037.passive = function () {
        atbf(_0x55e037, "평", _0x55e037, "공퍼증", 50, "<화약 장전>", 3, always);
        atbf(_0x55e037, "평", _0x55e037, "궁발동*", 80, "<네, 선장님!>", 3, always);
        _0x55e037.cd -= 1;
        _0x55e037.curCd -= 1;
        atbf(_0x55e037, "평", _0x55e037, "가뎀증", 20, "<목소리가 작다!>", 3, always);
        tbf(_0x55e037, "가뎀증", 7.5, "데미지+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10121:
      setMnc(_0x55e037, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(_0x55e037, "일뎀증", 60, "회기ㆍ백화투영1", 4);
            tbf(boss, "받일뎀", 40, "회기ㆍ백화투영2", 8);
            break;
          case 2:
            tbf(_0x55e037, "일뎀증", 75, "회기ㆍ백화투영1", 4);
            tbf(boss, "받일뎀", 55, "회기ㆍ백화투영2", 8);
            break;
          case 3:
            tbf(_0x55e037, "일뎀증", 90, "회기ㆍ백화투영1", 4);
            tbf(boss, "받일뎀", 70, "회기ㆍ백화투영2", 8);
            break;
          case 4:
            tbf(_0x55e037, "일뎀증", 105, "회기ㆍ백화투영1", 4);
            tbf(boss, "받일뎀", 85, "회기ㆍ백화투영2", 8);
            break;
          default:
            tbf(_0x55e037, "일뎀증", 120, "회기ㆍ백화투영1", 4);
            tbf(boss, "받일뎀", 100, "회기ㆍ백화투영2", 8);
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {
        tbf(all, "일뎀증", 50, "후방 보급이다냥", 2);
      };
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(25);
        if (getElementCnt("풍") >= 3) {
          tbf(all, "공퍼증", 40, "<갈매기 도적단>1", always);
          tbf(all, "일뎀증", 100, "<갈매기 도적단>2", always);
          tbf(all, "평추가*", 65, "<갈매기 도적단>3", always);
        }
        if (getRoleCnt("딜") >= 2) {
          anbf(_0x55e037, "평", boss, "받뎀증", 5, "<대해를 향하여!>1", 1, 10, always);
          for (let _0x309993 of getElementIdx("풍")) {
            atbf(_0x55e037, "궁", comp[_0x309993], "받속뎀", 15, "<대해를 향하여!>2", 2, always);
          }
        }
      };
      _0x55e037.passive = function () {
        ptbf(_0x55e037, "평", all, "아머", _0x55e037.hp * 10, "폭풍우 감행", 1, always);
        atbf(_0x55e037, "궁", _0x55e037, "평추가*", 120, "<폭풍우도 우릴 막을 수 없어>1", 2, always);
        for (let _0x3a914c of getElementIdx("풍")) {
          atbf(_0x55e037, "궁", comp[_0x3a914c], "받속뎀", 15, "<폭풍우도 우릴 막을 수 없어>2", 2, always);
        }
        tbf(_0x55e037, "평추가*", 70, "프로젝터 캐논", always);
        tbf(all, "가뎀증", 10, "오랜 추억1", always);
        anbf(_0x55e037, "평", all, "공퍼증", 10, "오랜 추억2", 1, 4, always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
        if (GLOBAL_TURN == 1) {
          cdChange(_0x55e037, -4);
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10122:
      setMnc(_0x55e037, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x78c5e1);
      buff_ex.push("<시기의 화염>");
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
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
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {
        tbf(all, "가뎀증", 25, "성광의 축복", 1);
      };
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(20);
        atbf(_0x55e037, "궁", boss, "받뎀증", 20, "가슴이 커야 사람들의 마음을 수용할 수 있는 법1", 9, always);
        if (getElementCnt("화") >= 1) {
          tbf(all, "공퍼증", 40, "가슴이 커야 사람들의 마음을 수용할 수 있는 법2", always);
        }
        if (getElementCnt("암") >= 1) {
          tbf(all, "공퍼증", 40, "가슴이 커야 사람들의 마음을 수용할 수 있는 법2", always);
        }
      };
      _0x55e037.passive = function () {
        anbf(_0x55e037, "궁", all, "궁뎀증", 20, "드라이브 엔젤 하트", 1, 2, always);
        tbf(_0x55e037, "궁발동*", 150, "이게 히메의 사랑이야", always);
        tbf(_0x55e037, "평발동*", 50, "불안해지면 먼저 가슴을 만져1", always);
        tbf(_0x55e037, "궁발동*", 100, "불안해지면 먼저 가슴을 만져2", always);
        tbf(_0x55e037, "궁발동*", 30, "궁극기 발동+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {
          if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 4 == 0) {
            anbf(_0x55e037, "궁", boss, "받궁뎀", 20, "<시기의 화염>", 1, 2, 4);
            atbf(_0x55e037, "궁", _0x55e037, "제거", "발동", "<시기의 화염>", 1, 4);
          }
        }
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 4 == 0) {
          atbf(all, "궁", all, "발효증", 30, "불안해지면 먼저 가슴을 만져3", 4, 4);
          for (let _0x222064 of comp) {
            atbf(_0x222064, "궁", _0x222064, "제거", "발동", "불안해지면 먼저 가슴을 만져3", 1, 4);
          }
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10123:
      setMnc(_0x55e037, [265, 3, 298, 3, 331, 3, 364, 3, 397, 3], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
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
      _0x55e037.ultafter = function () {
        switch (_0x78c5e1) {
          case 1:
            for (let _0x117e7e of getRoleIdx("딜", "디")) {
              buff(comp[_0x117e7e], "공발동*", 33, "안닌궁주 보너스!2", 3, false);
            }
            break;
          case 2:
            for (let _0x53f20d of getRoleIdx("딜", "디")) {
              buff(comp[_0x53f20d], "공발동*", 39, "안닌궁주 보너스!2", 3, false);
            }
            break;
          case 3:
            for (let _0x18f2fa of getRoleIdx("딜", "디")) {
              buff(comp[_0x18f2fa], "공발동*", 46, "안닌궁주 보너스!2", 3, false);
            }
            break;
          case 4:
            for (let _0x469963 of getRoleIdx("딜", "디")) {
              buff(comp[_0x469963], "공발동*", 52, "안닌궁주 보너스!2", 3, false);
            }
            break;
          default:
            for (let _0x379a2a of getRoleIdx("딜", "디")) {
              buff(comp[_0x379a2a], "공발동*", 59, "안닌궁주 보너스!2", 3, false);
            }
            break;
        }
      };
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
        for (let _0x54a43a of comp) {
          setBuffOnAll(_0x54a43a, "기본", "안닌궁주 보너스!2", true);
        }
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
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
      _0x55e037.passive = function () {
        anbf(_0x55e037, "궁", _0x55e037, "공퍼증", 40, "18x18=88", 1, 2, always);
        atbf(_0x55e037, "궁", boss, "받궁뎀", 20, "마음을 훔치는 소악마가 로그인했다고~", 4, always);
        atbf(_0x55e037, "궁", boss, "받뎀증", 20, "오늘은 야한 미루 꿈 꿔", 4, always);
        tbf(_0x55e037, "궁뎀증", 10, "궁극기+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10124:
      setMnc(_0x55e037, [265, 3, 298, 3, 331, 3, 364, 3, 397, 3], _0x78c5e1);
      buff_ex.push("<애교 시간>");
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            nbf(_0x55e037, "받캐뎀", 30, "네 마음을 NyoroNyoro하게", 1, 2);
            break;
          case 2:
            nbf(_0x55e037, "받캐뎀", 30, "네 마음을 NyoroNyoro하게", 1, 2);
            break;
          case 3:
            nbf(_0x55e037, "받캐뎀", 35, "네 마음을 NyoroNyoro하게", 1, 2);
            break;
          case 4:
            nbf(_0x55e037, "받캐뎀", 35, "네 마음을 NyoroNyoro하게", 1, 2);
            break;
          default:
            nbf(_0x55e037, "받캐뎀", 40, "네 마음을 NyoroNyoro하게", 1, 2);
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
        if (_0x55e037.isLeader) {
          if (buffNestByType(_0x55e037, "<애교 시간>") < 2) {
            _0x55e037.cd -= 1;
            _0x55e037.curCd -= 1;
            nbf(_0x55e037, "<애교 시간>", 0, "애교계 청순한 여친", 1, 2);
          } else {
            _0x55e037.cd = 3;
            _0x55e037.curCd = 3;
            deleteBuffType(_0x55e037, "기본", "<애교 시간>");
          }
        }
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(20);
        if (getElementCnt("광") >= 1) {
          tbf(all, "공퍼증", 80, "<우사기 히메 부비부비~>", always);
        }
        if (getElementCnt("암") >= 1) {
          tbf(_0x55e037, "공퍼증", 60, "<미루 부비부비~>1", always);
          for (let _0x39cdd0 of getElementIdx("화")) {
            anbf(_0x55e037, "궁", comp[_0x39cdd0], "받속뎀", 25, "<미루 부비부비~>2", 1, 2, always);
          }
          tbf(_0x55e037, "궁추가*", 160, "<미루 부비부비~>3", always);
        }
      };
      _0x55e037.passive = function () {
        anbf(_0x55e037, "공격", _0x55e037, "공퍼증", 20, "꼬리달린 소형 양생동물", 1, 4, always);
        tbf(_0x55e037, "궁추가*", 66, "핑크빛 유혹", always);
        tbf(_0x55e037, "가뎀증", 40, "뇨로는 모두를 좋아해~", always);
        tbf(_0x55e037, "가뎀증", 7.5, "피해+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10125:
      setMnc(_0x55e037, [0, 3, 0, 3, 0, 3, 0, 3, 0, 3], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(_0x55e037, "공퍼증", 200, "장난은 안치지만 사탕 내 놔1", 1);
            tbf(_0x55e037, "공고증", myCurAtk + _0x55e037.id + 25, "장난은 안치지만 사탕 내 놔2", 1);
            break;
          case 2:
            tbf(_0x55e037, "공퍼증", 200, "장난은 안치지만 사탕 내 놔1", 1);
            tbf(_0x55e037, "공고증", myCurAtk + _0x55e037.id + 30, "장난은 안치지만 사탕 내 놔2", 1);
            break;
          case 3:
            tbf(_0x55e037, "공퍼증", 250, "장난은 안치지만 사탕 내 놔1", 1);
            tbf(_0x55e037, "공고증", myCurAtk + _0x55e037.id + 35, "장난은 안치지만 사탕 내 놔2", 1);
            break;
          case 4:
            tbf(_0x55e037, "공퍼증", 250, "장난은 안치지만 사탕 내 놔1", 1);
            tbf(_0x55e037, "공고증", myCurAtk + _0x55e037.id + 40, "장난은 안치지만 사탕 내 놔2", 1);
            break;
          default:
            tbf(_0x55e037, "공퍼증", 300, "장난은 안치지만 사탕 내 놔1", 1);
            tbf(_0x55e037, "공고증", myCurAtk + _0x55e037.id + 45, "장난은 안치지만 사탕 내 놔2", 1);
            break;
        }
        for (let _0x212e2d of getRoleIdx("딜", "디")) {
          tbf(comp[_0x212e2d], "공고증", myCurAtk + _0x55e037.id + 25, "장난은 안치지만 사탕 내 놔3", 1);
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {
        tbf(all, "공퍼증", 50, "용기의 힘", 1);
      };
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(20);
        tbf(all, "공퍼증", 50, "할로윈 코스프레 파티1", always);
        tbf(all, "가뎀증", 50, "할로윈 코스프레 파티2", always);
        tbf(all, "궁뎀증", 70, "할로윈 코스프레 파티3", always);
      };
      _0x55e037.passive = function () {
        tbf(_0x55e037, "궁추가*", 250, "호박을 자르는데 어찌 성검을 쓰겠는가", always);
        for (let _0x30d2f1 of getRoleIdx("딜", "디")) {
          tbf(comp[_0x30d2f1], "궁추가*", 100, "할로윈에 입을 옷", 50);
        }
        tbf(_0x55e037, "공퍼증", 10, "공격+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 3 == 0) {
          for (let _0x156c3d of getRoleIdx("딜", "디")) {
            atbf(_0x55e037, "궁", comp[_0x156c3d], "공고증", myCurAtk + _0x55e037.id + 25, "즉석 호박파이", 1, 1);
          }
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10126:
      _0x55e037.stack = 0;
      setMnc(_0x55e037, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x78c5e1);
      buff_ex.push("<연쇄 트랩>");
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
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
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {
        for (let _0x4ab326 of comp) {
          tbf(_0x4ab326, "공고증", myCurAtk + _0x55e037.id + 30, "찹쌀 끈적끈적탄", 1);
        }
      };
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(30);
        atbf(_0x55e037, "궁", all, "아머", _0x55e037.hp * 10, "참신한 말썽꾸러기1", 1, always);
        for (let _0x284c98 of getElementIdx("광", "암")) {
          atbf(_0x55e037, "궁", comp[_0x284c98], "받속뎀", 0, "참신한 말썽꾸러기2", 1, always);
        }
        for (let _0x489804 of getElementIdx("화", "수")) {
          atbf(_0x55e037, "궁", comp[_0x489804], "받속뎀", 0, "참신한 말썽꾸러기3", 1, always);
        }
        if (getRoKind() == 4) {
          tbf(all, "공퍼증", 120, "<할로윈 장난 파티>1", always);
          tbf(all, "가뎀증", 50, "<할로윈 장난 파티>2", always);
        }
      };
      _0x55e037.passive = function () {
        atbf(_0x55e037, "궁", all, "공고증", myCurAtk + _0x55e037.id + 30, "천방백계1", 1, always);
        buff(_0x55e037, "받아증", 20, "천방백계2", always, false);
        buff(_0x55e037, "공퍼증", 20, "천방백계3", always, false);
        buff(_0x55e037, "공퍼증", 20, "천방백계4", always, false);
        for (let _0x5e35eb of getElementIdx("화", "수")) {
          atbf(_0x55e037, "궁", comp[_0x5e35eb], "받속뎀", 0, "할로윈 미궁", 1, always);
        }
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
        nbf(_0x55e037, "<연쇄 트랩>", 0, "작은 몸과 큰 머리", 1, 9);
        if (_0x55e037.stack == 3) {
          setBuffOn(_0x55e037, "기본", "천방백계2", true);
        } else if (_0x55e037.stack == 6) {
          setBuffOn(_0x55e037, "기본", "천방백계3", true);
        } else if (_0x55e037.stack == 8) {
          setBuffOn(_0x55e037, "기본", "천방백계4", true);
        }
        if (_0x55e037.stack < 9) {
          if (_0x55e037.isLeader) {
            setBuffSizeAll(_0x55e037, "발동", "참신한 말썽꾸러기2", (_0x55e037.stack + 1) * 6);
            setBuffSizeAll(_0x55e037, "발동", "참신한 말썽꾸러기3", (_0x55e037.stack + 1) * 3);
          }
          setBuffSizeAll(_0x55e037, "발동", "할로윈 미궁", (_0x55e037.stack + 1) * 3);
        }
        _0x55e037.stack++;
        if (_0x55e037.stack > 9) {
          _0x55e037.stack = 9;
        }
      };
      return _0x55e037;
    case 10127:
      setMnc(_0x55e037, [0, 30, 0, 30, 0, 30, 0, 30, 0, 30], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(all, "궁뎀증", 10, "꿈나라의 왕1", 15);
            buff(_0x55e037, "공격", all, "공고증", myCurAtk + _0x55e037.id + 20, "꿈나라의 왕2", 1, 15, "발동", false);
            break;
          case 2:
            tbf(all, "궁뎀증", 15, "꿈나라의 왕1", 15);
            buff(_0x55e037, "공격", all, "공고증", myCurAtk + _0x55e037.id + 22.5, "꿈나라의 왕2", 1, 15, "발동", false);
            break;
          case 3:
            tbf(all, "궁뎀증", 20, "꿈나라의 왕1", 15);
            buff(_0x55e037, "공격", all, "공고증", myCurAtk + _0x55e037.id + 25, "꿈나라의 왕2", 1, 15, "발동", false);
            break;
          case 4:
            tbf(all, "궁뎀증", 25, "꿈나라의 왕1", 15);
            buff(_0x55e037, "공격", all, "공고증", myCurAtk + _0x55e037.id + 27.5, "꿈나라의 왕2", 1, 15, "발동", false);
            break;
          default:
            tbf(all, "궁뎀증", 30, "꿈나라의 왕1", 15);
            buff(_0x55e037, "공격", all, "공고증", myCurAtk + _0x55e037.id + 30, "꿈나라의 왕2", 1, 15, "발동", false);
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
        cdChange(_0x55e037, -1);
        for (let _0xef682a of comp) {
          setBuffOnAll(_0xef682a, "발동", "꿈나라의 왕2", true);
        }
      };
      _0x55e037.atkbefore = function () {
        for (let _0x535b12 of getElementIdx("수")) {
          tbf(comp[_0x535b12], "공퍼증", 40, "꿈의 거품", 1);
        }
      };
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
        cdChange(_0x55e037, -1);
      };
      _0x55e037.leader = function () {
        hpUpAll(20);
        tbf(all, "공퍼증", 40, "전설의 환수1", always);
        if (getElementCnt("수") >= 4) {
          tbf(all, "공퍼증", 80, "<영원한 꿈>1", always);
          anbf(all, "궁", all, "가뎀증", 50, "<영원한 꿈>2", 1, 1, always);
        }
      };
      _0x55e037.passive = function () {
        for (let _0x21e6f1 of comp) {
          if (_0x21e6f1.id != _0x55e037.id) {
            atbf(_0x55e037, "평", _0x21e6f1, "공발동*", 25, "<강제 수면>1", 1, always);
          }
        }
        tbf(_0x55e037, "공퍼증", 10, "공격+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
        cdChange(_0x55e037, -1);
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {
          if (GLOBAL_TURN == 10) {
            tbf(all, "궁뎀증", 150, "전설의 환수2", 40);
          }
        }
        if (GLOBAL_TURN == 1) {
          cdChange(_0x55e037, -30);
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
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10128:
      setMnc(_0x55e037, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            for (let _0x5e2db9 of getRoleIdx("딜")) {
              nbf(comp[_0x5e2db9], "받직뎀", 30, "흔들리는 와인잔1", 1, 2);
            }
            tbf(_0x55e037, "평추가*", 50, "흔들리는 와인잔2", 4);
            break;
          case 2:
            for (let _0x2cd0ac of getRoleIdx("딜")) {
              nbf(comp[_0x2cd0ac], "받직뎀", 36.5, "흔들리는 와인잔1", 1, 2);
            }
            tbf(_0x55e037, "평추가*", 56.5, "흔들리는 와인잔2", 4);
            break;
          case 3:
            for (let _0x1da20d of getRoleIdx("딜")) {
              nbf(comp[_0x1da20d], "받직뎀", 40, "흔들리는 와인잔1", 1, 2);
            }
            tbf(_0x55e037, "평추가*", 70, "흔들리는 와인잔2", 4);
            break;
          case 4:
            for (let _0x5036a9 of getRoleIdx("딜")) {
              nbf(comp[_0x5036a9], "받직뎀", 46.5, "흔들리는 와인잔1", 1, 2);
            }
            tbf(_0x55e037, "평추가*", 76.5, "흔들리는 와인잔2", 4);
            break;
          default:
            for (let _0x18df69 of getRoleIdx("딜")) {
              nbf(comp[_0x18df69], "받직뎀", 50, "흔들리는 와인잔1", 1, 2);
            }
            tbf(_0x55e037, "평추가*", 90, "흔들리는 와인잔2", 4);
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(20);
        nbf(all, "공퍼증", 40, "숨막히는 여왕", 1, 1);
        let _0x538bbf = getElementCnt("광");
        let _0x118bac = getRoleCnt("딜");
        let _0x26e93d = getElementIdx("광");
        let _0x2e1cb8 = getRoleIdx("딜");
        if (_0x538bbf >= 3) {
          tbf(_0x55e037, "속상감", 55, "야릇한 음악0", always);
          for (const _0x2c0641 of _0x2e1cb8) {
            atbf(_0x55e037, "평", comp[_0x2c0641], "공고증", _0x55e037.atk * 30, "야릇한 음악1", 4, always);
          }
          for (const _0x485fa8 of _0x26e93d) {
            anbf(_0x55e037, "평", comp[_0x485fa8], "속뎀증", 7, "야릇한음악2", 1, 8, always);
          }
        }
        if (_0x118bac >= 3) {
          for (const _0x130ee9 of _0x2e1cb8) {
            comp[_0x130ee9].canCDChange = false;
            tbf(comp[_0x130ee9], "가뎀증", 20, "무장방어1", always);
            tbf(comp[_0x130ee9], "평추가*", 40, "무장방어2", always);
          }
        }
      };
      _0x55e037.passive = function () {
        let _0x2ebc80 = getRoleIdx("딜");
        for (const _0x51885b of _0x2ebc80) {
          tbf(comp[_0x51885b], "일뎀증", 30, "곡도 같은 눈썹1", always);
        }
        tbf(_0x55e037, "일뎀증", 60, "곡도 같은 눈썹2", always);
        for (const _0xac5ae1 of _0x2ebc80) {
          tbf(comp[_0xac5ae1], "공퍼증", 30, "핏빛 입술1", always);
        }
        tbf(_0x55e037, "공퍼증", 50, "핏빛 입술2", always);
        for (const _0x1fc25e of _0x2ebc80) {
          tbf(comp[_0x1fc25e], "가뎀증", 15, "모든 것을 독점한 아름다움1", always);
        }
        tbf(_0x55e037, "가뎀증", 20, "모든 것을 독점한 아름다움2", always);
        tbf(_0x55e037, "가뎀증", 7.5, "가하는 데미지+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {};
      _0x55e037.turnover = function () {};
      return _0x55e037;
    case 10129:
      setMnc(_0x55e037, [388, 4, 445, 4, 503, 4, 560, 4, 618, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
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
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpMe(_0x55e037, 30);
        tbf(_0x55e037, "가아증", 50, "순결마성의 매력1", always);
        nbf(boss, "받뎀증", 50, "순결마성의 매력2", 1, 1);
        if (getElementCnt("풍") >= 4) {
          tbf(all, "공퍼증", 130, "<메리 섹스마스!>1", always);
          tbf(all, "궁뎀증", 50, "<메리 섹스마스!>2", always);
          tbf(all, "가뎀증", 20, "<메리 섹스마스!>3", always);
        }
      };
      _0x55e037.passive = function () {
        anbf(_0x55e037, "피격", all, "궁뎀증", 3, "브레이크를 위한 액셀", 1, 15, always);
        atbf(_0x55e037, "공격", _0x55e037, "아머", _0x55e037.hp * 20, "함께 파티 시작!", 1, always);
        anbf(_0x55e037, "피격", _0x55e037, "가뎀증", 10, "이것이 바로 속박의 힘!1", 1, 4, always);
        atbf(_0x55e037, "피격", _0x55e037, "아머", _0x55e037.hp * 23, "이것이 바로 속박의 힘!2", 2, always);
        tbf(_0x55e037, "가아증", 10, "아머+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
        nbf(all, "궁뎀증", 3, "브레이크를 위한 액셀", 1, 15);
      };
      return _0x55e037;
    case 10130:
      _0x55e037.stack = 0;
      setMnc(_0x55e037, [211, 3, 234, 3, 256, 3, 278, 3, 300, 3], _0x78c5e1);
      buff_ex.push("<싸움상등!>");
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(_0x55e037, "반격*", 156, "이 일격으로 머리를 뚫어버린다!2", 3);
            break;
          case 2:
            tbf(_0x55e037, "반격*", 156, "이 일격으로 머리를 뚫어버린다!2", 3);
            break;
          case 3:
            tbf(boss, "받뎀증", 20, "이 일격으로 머리를 뚫어버린다!1", 3);
            tbf(_0x55e037, "반격*", 178, "이 일격으로 머리를 뚫어버린다!2", 3);
            break;
          case 4:
            tbf(boss, "받뎀증", 20, "이 일격으로 머리를 뚫어버린다!1", 3);
            tbf(_0x55e037, "반격*", 178, "이 일격으로 머리를 뚫어버린다!2", 3);
            break;
          default:
            tbf(boss, "받뎀증", 25, "이 일격으로 머리를 뚫어버린다!1", 3);
            tbf(_0x55e037, "반격*", 200, "이 일격으로 머리를 뚫어버린다!2", 3);
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(20);
        if (getRoleCnt("탱") >= 3) {
          tbf(all, "공퍼증", 140, "크리스마스 계승자1", always);
          tbf(all, "가뎀증", 100, "크리스마스 계승자2", always);
          anbf(all, "피격", boss, "받발뎀", 20, "<빠따는 훌륭한 대화 수단!>", 1, 10, always);
          for (let _0x3223bf of comp) {
            atbf(_0x3223bf, "궁", _0x3223bf, "반격*", 250, "<그래도 넌 내가 이김!>", 3, always);
            const _0xeca2fe = _0x3223bf.hit;
            _0x3223bf.hit = function (..._0x1cdd50) {
              _0xeca2fe.apply(this, _0x1cdd50);
              deleteBuff(_0x3223bf, "기본", "<그래도 넌 내가 이김!>");
            };
          }
        }
      };
      _0x55e037.passive = function () {
        _0x55e037.canCDChange = false;
        anbf(_0x55e037, "피격", _0x55e037, "<싸움상등!>", 0, "늑대가 뒤를 돌아본 것은!", 1, 10, always);
        buff(_0x55e037, "피격", _0x55e037, "on", "기본", "보은 때문이 아닌!1", 1, always, "발동", false);
        buff(_0x55e037, "피격", _0x55e037, "on", "기본", "보은 때문이 아닌!2", 1, always, "발동", false);
        buff(_0x55e037, "피격", _0x55e037, "on", "기본", "보은 때문이 아닌!3", 1, always, "발동", false);
        const _0x53fddc = _0x55e037.hit;
        _0x55e037.hit = function (..._0x3bfb89) {
          setBuffNest(_0x55e037, "기본", "<싸움상등!>", _0x55e037.stack + 1 > 10 ? 10 : _0x55e037.stack + 1);
          if (_0x55e037.stack == 2) {
            setBuffOn(_0x55e037, "발동", "보은 때문이 아닌!1", true);
          } else if (_0x55e037.stack == 5) {
            setBuffOn(_0x55e037, "발동", "보은 때문이 아닌!2", true);
          } else if (_0x55e037.stack == 8) {
            setBuffOn(_0x55e037, "발동", "보은 때문이 아닌!3", true);
          }
          _0x53fddc.apply(this, _0x3bfb89);
          if (_0x55e037.stack == 2) {
            setBuffOn(_0x55e037, "발동", "보은 때문이 아닌!1", false);
          } else if (_0x55e037.stack == 5) {
            setBuffOn(_0x55e037, "발동", "보은 때문이 아닌!2", false);
          } else if (_0x55e037.stack == 8) {
            setBuffOn(_0x55e037, "발동", "보은 때문이 아닌!3", false);
          }
          _0x55e037.stack++;
          if (_0x55e037.stack > 10) {
            _0x55e037.stack = 10;
          }
          deleteBuff(_0x55e037, "기본", "이 일격으로 머리를 뚫어버린다!2");
          deleteBuff(_0x55e037, "기본", "<빠가야로!>");
        };
        nbf(_0x55e037, "공퍼증", 5, "<싸움상등!>", 0, 10);
        buff(_0x55e037, "가뎀증", 5, "보은 때문이 아닌!1", always, false);
        buff(_0x55e037, "가뎀증", 10, "보은 때문이 아닌!2", always, false);
        buff(_0x55e037, "가뎀증", 15, "보은 때문이 아닌!3", always, false);
        buff(_0x55e037, "행동", _0x55e037, "반격*", 100, "<빠가야로!>", 1, always, "발동", false);
        tbf(_0x55e037, "가뎀증", 7.5, "데미지+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
        if (GLOBAL_TURN == 1) {
          nbf(_0x55e037, "<싸움상등!>", 0, "늑대가 뒤를 돌아본 것은!", 2, 10);
          _0x55e037.stack += 2;
          if (_0x55e037.stack > 10) {
            _0x55e037.stack = 10;
          }
        }
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 3 == 0) {
          nbf(_0x55e037, "<싸움상등!>", 0, "늑대가 뒤를 돌아본 것은!", 2, 10);
          _0x55e037.stack += 2;
          if (_0x55e037.stack > 10) {
            _0x55e037.stack = 10;
          }
        }
        setBuffNest(_0x55e037, "기본", "<싸움상등!>", _0x55e037.stack);
        setBuffOn(_0x55e037, "기본", "보은 때문이 아닌!1", _0x55e037.stack >= 3);
        setBuffOn(_0x55e037, "기본", "보은 때문이 아닌!2", _0x55e037.stack >= 6);
        setBuffOn(_0x55e037, "기본", "보은 때문이 아닌!3", _0x55e037.stack >= 9);
        setBuffOn(_0x55e037, "발동", "<빠가야로!>", _0x55e037.stack >= 10);
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10131:
      setMnc(_0x55e037, [265, 3, 298, 3, 331, 3, 364, 3, 397, 3], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(_0x55e037, "받캐뎀", 50, "시간을 초월한 희망", 3);
            break;
          case 2:
            tbf(_0x55e037, "받캐뎀", 62.5, "시간을 초월한 희망", 3);
            break;
          case 3:
            tbf(_0x55e037, "받캐뎀", 75, "시간을 초월한 희망", 3);
            break;
          case 4:
            tbf(_0x55e037, "받캐뎀", 87.5, "시간을 초월한 희망", 3);
            break;
          default:
            tbf(_0x55e037, "받캐뎀", 100, "시간을 초월한 희망", 3);
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(25);
        tbf(all, "공퍼증", 90, "시간을 다스리는 자1", always);
        for (let _0x2fd873 of getRoleIdx("딜", "디")) {
          tbf(comp[_0x2fd873], "가뎀증", 40, "시간을 다스리는 자2", always);
        }
        tbf(_0x55e037, "공퍼증", 90, "시간을 다스리는 자3", always);
      };
      _0x55e037.passive = function () {
        nbf(_0x55e037, "가뎀증", 4, "부서진 창공", 1, 5);
        tbf(_0x55e037, "가뎀증", 20, "시공간 지배1", always);
        atbf(_0x55e037, "궁", _0x55e037, "받캐뎀", 10, "시공간 지배2", 4, always);
        tbf(_0x55e037, "평발동*", 70, "찬란한 세월1", always);
        tbf(_0x55e037, "궁발동*", 70, "찬란한 세월2", always);
        tbf(_0x55e037, "공퍼증", 10, "공격 데미지+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 3 == 0) {
          nbf(_0x55e037, "가뎀증", 4, "부서진 창공", 2, 5);
          if (GLOBAL_TURN <= 7) {
            setBuffSizeUp(_0x55e037, "발동", "시공간 지배2", 20);
          }
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10132:
      setMnc(_0x55e037, [265, 3, 298, 3, 331, 3, 364, 3, 397, 3], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(all, "궁뎀증", 20, "드리워진 밤의 장막1", 3);
            tbf(_0x55e037, "가아증", 10, "드리워진 밤의 장막2", 3);
            break;
          case 2:
            tbf(all, "궁뎀증", 30, "드리워진 밤의 장막1", 3);
            tbf(_0x55e037, "가아증", 15, "드리워진 밤의 장막2", 3);
            break;
          case 3:
            tbf(all, "궁뎀증", 40, "드리워진 밤의 장막1", 3);
            tbf(_0x55e037, "가아증", 20, "드리워진 밤의 장막2", 3);
            break;
          case 4:
            tbf(all, "궁뎀증", 50, "드리워진 밤의 장막1", 3);
            tbf(_0x55e037, "가아증", 25, "드리워진 밤의 장막2", 3);
            break;
          default:
            tbf(all, "궁뎀증", 60, "드리워진 밤의 장막1", 3);
            tbf(_0x55e037, "가아증", 30, "드리워진 밤의 장막2", 3);
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(20);
        tbf(all, "공퍼증", 80, "어둠의 여제", always);
        if (getElementCnt("수") >= 3) {
          tbf(_0x55e037, "공퍼증", 60, "<어두운 밤>1", always);
          for (let _0x5b796d of getElementIdx("암", "수")) {
            anbf(_0x55e037, "궁", comp[_0x5b796d], "받속뎀", 5, "<어두운 밤>2", 1, 3, always);
          }
          for (let _0x1ef551 of comp) {
            atbf(_0x55e037, "공격", _0x1ef551, "공고증", myCurAtk + _0x55e037.id + 40, "<어두운 밤>3", 1, always);
          }
        }
        if (getElementCnt("암") >= 2) {
          tbf(comp[2], "가뎀증", 30, "<용병 지침>1", always);
          tbf(comp[4], "가뎀증", 30, "<용병 지침>1", always);
          tbf(comp[2], "궁추가*", 40, "<용병 지침>2", always);
          tbf(comp[4], "궁추가*", 40, "<용병 지침>2", always);
        }
      };
      _0x55e037.passive = function () {
        ptbf(_0x55e037, "궁", boss, "받뎀증", 15, "희미한 규방", 7, always);
        ptbf(_0x55e037, "궁", all, "아머", _0x55e037.hp * 7, "부슬비", 1, always);
        ptbf(_0x55e037, "궁", boss, "받궁뎀", 20, "끝없이 흐르는 밤", 7, always);
        tbf(_0x55e037, "공퍼증", 10, "공격+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10133:
      setMnc(_0x55e037, [0, 3, 0, 3, 0, 3, 0, 3, 0, 3], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(all, "공고증", _0x55e037.atk * 50, "이것이 바로 프로 아이돌의 매력1", 4);
            tbf(all, "궁뎀증", 20, "이것이 바로 프로 아이돌의 매력2", 4);
            break;
          case 2:
            tbf(all, "공고증", _0x55e037.atk * 55, "이것이 바로 프로 아이돌의 매력1", 4);
            tbf(all, "궁뎀증", 25, "이것이 바로 프로 아이돌의 매력2", 4);
            break;
          case 3:
            tbf(all, "공고증", _0x55e037.atk * 60, "이것이 바로 프로 아이돌의 매력1", 4);
            tbf(all, "궁뎀증", 30, "이것이 바로 프로 아이돌의 매력2", 4);
            break;
          case 4:
            tbf(all, "공고증", _0x55e037.atk * 65, "이것이 바로 프로 아이돌의 매력1", 4);
            tbf(all, "궁뎀증", 35, "이것이 바로 프로 아이돌의 매력2", 4);
            break;
          default:
            tbf(all, "공고증", _0x55e037.atk * 70, "이것이 바로 프로 아이돌의 매력1", 4);
            tbf(all, "궁뎀증", 40, "이것이 바로 프로 아이돌의 매력2", 4);
            break;
        }
      };
      _0x55e037.ultafter = function () {
        tbf(all, "아머", _0x55e037.getCurAtk() * 25 * armorUp(_0x55e037, "궁", "추가"), "청순 아이돌1", 1);
        tbf(all, "아머", _0x55e037.hp * 30 * armorUp(_0x55e037, "궁", "추가"), "청순 아이돌2", 1);
        if (_0x55e037.isLeader) {
          tbf(_0x55e037, "궁발동+", myCurShd + _0x55e037.id + 60, "나나미의 형상으로 변한 것뿐2", 1);
        }
      };
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
        if (_0x55e037.isLeader) {
          _0x55e037.hit();
          deleteBuffType(_0x55e037, "기본", "아머");
        }
      };
      _0x55e037.atkbefore = function () {
        tbf(all, "아머", _0x55e037.getCurAtk() * 25 * armorUp(_0x55e037, "평", "추가"), "한눈 팔기 없기~1", 1);
        tbf(all, "아머", _0x55e037.hp * 30 * armorUp(_0x55e037, "평", "추가"), "한눈 팔기 없기~2", 1);
      };
      _0x55e037.atkafter = function () {
        if (_0x55e037.isLeader) {
          tbf(_0x55e037, "평발동+", myCurShd + _0x55e037.id + 55, "나나미의 형상으로 변한 것뿐1", 1);
        }
        if (_0x55e037.isLeader) {
          _0x55e037.hit();
          deleteBuffType(_0x55e037, "기본", "아머");
        }
      };
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        tbf(all, "공퍼증", 50, "악수회 시간이야~1", always);
        tbf(all, "발효증", 100, "악수회 시간이야~2", always);
        tbf(all, "가뎀증", 20, "악수회 시간이야~3", always);
        if (getRoleCnt("섶") >= 2) {
          _0x55e037.getArmor = function () {
            return 0;
          };
        }
        for (let _0x128789 of comp) {
          if (_0x128789.id != _0x55e037.id) {
            atbf(_0x128789, "공격", comp[0], "아머", myCurAtk + _0x128789.id + 30, "<돈은 사라지지 않아>", 1, always);
          }
        }
      };
      _0x55e037.passive = function () {
        tbf(_0x55e037, "가아증", 15, "무대 준비", always);
        tbf(_0x55e037, "공퍼증", 10, "공격+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
        if (GLOBAL_TURN > 1) {
          tbf(all, "공고증", myCurAtk + _0x55e037.id + 25, "OnlySex", 1);
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10134:
      setMnc(_0x55e037, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x78c5e1);
      _0x55e037.turnHeal = false;
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            for (let _0x55c9c5 of getRoleIdx("딜", "디")) {
              tbf(comp[_0x55c9c5], "궁추가*", 65, "다들 함께 불러요~2", 1);
            }
            tbf(all, "가뎀증", 30, "다들 함께 불러요~3", 1);
            break;
          case 2:
            for (let _0x217593 of getRoleIdx("딜", "디")) {
              tbf(comp[_0x217593], "궁추가*", 75, "다들 함께 불러요~2", 1);
            }
            tbf(all, "가뎀증", 37.5, "다들 함께 불러요~3", 1);
            break;
          case 3:
            for (let _0x1756db of getRoleIdx("딜", "디")) {
              tbf(comp[_0x1756db], "궁추가*", 75, "다들 함께 불러요~2", 1);
            }
            tbf(all, "가뎀증", 45, "다들 함께 불러요~3", 1);
            break;
          case 4:
            for (let _0x1971bf of getRoleIdx("딜", "디")) {
              tbf(comp[_0x1971bf], "궁추가*", 75, "다들 함께 불러요~2", 1);
            }
            tbf(all, "가뎀증", 52.5, "다들 함께 불러요~3", 1);
            break;
          default:
            for (let _0x3cc7cc of getRoleIdx("딜", "디")) {
              tbf(comp[_0x3cc7cc], "궁추가*", 75, "다들 함께 불러요~2", 1);
            }
            tbf(all, "가뎀증", 60, "다들 함께 불러요~3", 1);
            break;
        }
        _0x55e037.turnHeal = true;
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
        for (let _0x23479c of comp) {
          _0x23479c.heal();
        }
        switch (_0x78c5e1) {
          case 1:
            break;
          case 2:
            break;
          case 3:
            for (let _0x55eea9 of comp) {
              if (_0x55eea9.id != _0x55e037.id) {
                atbf(_0x55e037, "평", _0x55eea9, "공고증", myCurAtk + _0x55e037.id + 10, "다들 함께 불러요~1", 1, 5);
              }
            }
            for (let _0x28f8ea of comp) {
              if (_0x28f8ea.id != _0x55e037.id) {
                atbf(_0x55e037, "궁", _0x28f8ea, "공고증", myCurAtk + _0x55e037.id + 10, "다들 함께 불러요~1", 1, 5);
              }
            }
            break;
          case 4:
            for (let _0x1b5f37 of comp) {
              if (_0x1b5f37.id != _0x55e037.id) {
                atbf(_0x55e037, "평", _0x1b5f37, "공고증", myCurAtk + _0x55e037.id + 12.5, "다들 함께 불러요~1", 1, 5);
              }
            }
            for (let _0x2efdd7 of comp) {
              if (_0x2efdd7.id != _0x55e037.id) {
                atbf(_0x55e037, "궁", _0x2efdd7, "공고증", myCurAtk + _0x55e037.id + 12.5, "다들 함께 불러요~1", 1, 5);
              }
            }
            break;
          default:
            for (let _0x521a81 of comp) {
              if (_0x521a81.id != _0x55e037.id) {
                atbf(_0x55e037, "평", _0x521a81, "공고증", myCurAtk + _0x55e037.id + 15, "다들 함께 불러요~1", 1, 5);
              }
            }
            for (let _0x56f5e0 of comp) {
              if (_0x56f5e0.id != _0x55e037.id) {
                atbf(_0x55e037, "궁", _0x56f5e0, "공고증", myCurAtk + _0x55e037.id + 15, "다들 함께 불러요~1", 1, 5);
              }
            }
            break;
        }
      };
      _0x55e037.atkbefore = function () {
        _0x55e037.turnHeal = true;
      };
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
        for (let _0x389a91 of comp) {
          _0x389a91.heal();
        }
      };
      _0x55e037.leader = function () {
        hpUpAll(35);
        atbf(_0x55e037, "궁", boss, "받뎀증", 30, "<슬픔을 몰아내는 빛>1", 1, always);
        for (let _0x55b40d of getRoleIdx("딜", "디")) {
          atbf(_0x55e037, "궁", comp[_0x55b40d], "궁추가*", 80, "<슬픔을 몰아내는 빛>2", 1, always);
        }
        if (getElKind() == 4) {
          tbf(all, "공퍼증", 125, "<아이돌 댄스팀>1", always);
        }
      };
      _0x55e037.passive = function () {
        tbf(_0x55e037, "공퍼증", 35, "입만 열면 터지는 flow1", always);
        for (let _0x361bfa of comp) {
          if (_0x361bfa.id != _0x55e037.id) {
            atbf(_0x55e037, "궁", _0x361bfa, "공고증", myCurAtk + _0x55e037.id + 15, "입만 열면 터지는 flow2", 1, always);
          }
        }
        for (let _0x45c298 of comp) {
          if (_0x45c298.id != _0x55e037.id) {
            atbf(_0x55e037, "궁", _0x45c298, "공고증", myCurAtk + _0x55e037.id + 15, "팬들은 wow", 1, always);
          }
        }
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
        if (_0x55e037.turnHeal) {
          for (let _0x5b5c05 of comp);
        }
        _0x55e037.turnHeal = false;
      };
      return _0x55e037;
    case 10135:
      _0x55e037.stack = 0;
      setMnc(_0x55e037, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x78c5e1);
      buff_ex.push("<위대한 나가퀸>");
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(_0x55e037, "가뎀증", 10, "돈이 곧 힘!1", 2);
            break;
          case 2:
            tbf(_0x55e037, "가뎀증", 15, "돈이 곧 힘!1", 2);
            break;
          case 3:
            tbf(_0x55e037, "가뎀증", 20, "돈이 곧 힘!1", 2);
            break;
          case 4:
            tbf(_0x55e037, "가뎀증", 25, "돈이 곧 힘!1", 2);
            break;
          default:
            tbf(_0x55e037, "가뎀증", 30, "돈이 곧 힘!1", 2);
            break;
        }
      };
      _0x55e037.ultafter = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(_0x55e037, "평추가*", 80, "돈이 곧 힘!2", 2);
            break;
          case 2:
            tbf(_0x55e037, "평추가*", 100, "돈이 곧 힘!2", 2);
            break;
          case 3:
            tbf(_0x55e037, "평추가*", 120, "돈이 곧 힘!2", 2);
            break;
          case 4:
            tbf(_0x55e037, "평추가*", 140, "돈이 곧 힘!2", 2);
            break;
          default:
            tbf(_0x55e037, "평추가*", 160, "돈이 곧 힘!2", 2);
            break;
        }
      };
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        tbf(_0x55e037, "공퍼증", 50, "슈퍼 리치 메스미나 님1", always);
        tbf(_0x55e037, "평추가*", 50, "슈퍼 리치 메스미나 님2", always);
        for (let _0xd3c636 of comp) {
          if (_0xd3c636.id != _0x55e037.id) {
            tbf(_0xd3c636, "가뎀증", -100, "슈퍼 리치 메스미나 님3", always);
          }
        }
        nbf(_0x55e037, "<위대한 나가퀸>", 0, "아이돌 매니저의 상담 시간1", 4, 4);
      };
      _0x55e037.passive = function () {
        anbf(comp[2], "공격", _0x55e037, "<위대한 나가퀸>", 0, "아이돌 매니저의 상담 시간1", 1, 4, always);
        atbf(comp[2], "공격", _0x55e037, "공고증", myCurAtk + comp[2].id + 10, "아이돌 매니저의 상담 시간2", 1, always);
        tbf(comp[2], "가뎀증", -100, "아이돌 매니저의 상담 시간3", always);
        buff(_0x55e037, "일뎀증", 75, "아무것도 안 하는 게 최고야!1", always, false);
        buff(_0x55e037, "공퍼증", 100, "아무것도 안 하는 게 최고야!2", always, false);
        buff(_0x55e037, "공퍼증", 100, "아무것도 안 하는 게 최고야!3", always, false);
        buff(_0x55e037, "궁뎀증", 60, "아무것도 안 하는 게 최고야!4", always, false);
        const _0x1a9f51 = comp[2].attack;
        comp[2].attack = function (..._0x4181fe) {
          _0x1a9f51.apply(this, _0x4181fe);
          if (!_0x55e037.isLeader) {
            if (_0x55e037.stack == 0) {
              setBuffOn(_0x55e037, "기본", "아무것도 안 하는 게 최고야!1", true);
            } else if (_0x55e037.stack == 1) {
              setBuffOn(_0x55e037, "기본", "아무것도 안 하는 게 최고야!2", true);
            } else if (_0x55e037.stack == 2) {
              setBuffOn(_0x55e037, "기본", "아무것도 안 하는 게 최고야!3", true);
            } else if (_0x55e037.stack == 3) {
              setBuffOn(_0x55e037, "기본", "아무것도 안 하는 게 최고야!4", true);
            }
            _0x55e037.stack++;
            if (_0x55e037.stack > 4) {
              _0x55e037.stack = 4;
            }
          }
        };
        const _0x4245b6 = comp[2].ultimate;
        comp[2].ultimate = function (..._0x18ce52) {
          _0x4245b6.apply(this, _0x18ce52);
          if (!_0x55e037.isLeader) {
            if (_0x55e037.stack == 0) {
              setBuffOn(_0x55e037, "기본", "아무것도 안 하는 게 최고야!1", true);
            } else if (_0x55e037.stack == 1) {
              setBuffOn(_0x55e037, "기본", "아무것도 안 하는 게 최고야!2", true);
            } else if (_0x55e037.stack == 2) {
              setBuffOn(_0x55e037, "기본", "아무것도 안 하는 게 최고야!3", true);
            } else if (_0x55e037.stack == 3) {
              setBuffOn(_0x55e037, "기본", "아무것도 안 하는 게 최고야!4", true);
            }
            _0x55e037.stack++;
            if (_0x55e037.stack > 4) {
              _0x55e037.stack = 4;
            }
          }
        };
        atbf(comp[2], "궁", _0x55e037, "가뎀증", 40, "럭셔리의 기쁨", 2, always);
        tbf(_0x55e037, "가뎀증", 7.5, "피해+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {
          if (GLOBAL_TURN == 1) {
            _0x55e037.stack = 4;
            setBuffOn(_0x55e037, "기본", "아무것도 안 하는 게 최고야!1", true);
            setBuffOn(_0x55e037, "기본", "아무것도 안 하는 게 최고야!2", true);
            setBuffOn(_0x55e037, "기본", "아무것도 안 하는 게 최고야!3", true);
            setBuffOn(_0x55e037, "기본", "아무것도 안 하는 게 최고야!4", true);
          }
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10136:
      setMnc(_0x55e037, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
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
      _0x55e037.ultafter = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(_0x55e037, "평추가*", 15, "이제부터 돈 벌 시간!2", 4);
            break;
          case 2:
            tbf(_0x55e037, "평추가*", 15, "이제부터 돈 벌 시간!2", 4);
            break;
          case 3:
            tbf(_0x55e037, "평추가*", 22.5, "이제부터 돈 벌 시간!2", 4);
            break;
          case 4:
            tbf(_0x55e037, "평추가*", 22.5, "이제부터 돈 벌 시간!2", 4);
            break;
          default:
            tbf(_0x55e037, "평추가*", 30, "이제부터 돈 벌 시간!2", 4);
            break;
        }
      };
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        for (let _0x21da06 of getElementIdx("수", "풍")) {
          hpUpMe(comp[_0x21da06], 20);
        }
        for (let _0x408370 of getElementIdx("수", "풍")) {
          tbf(comp[_0x408370], "공퍼증", 100, "수배령1", always);
        }
        for (let _0x5ae719 of getElementIdx("수")) {
          tbf(comp[_0x5ae719], "일뎀증", 80, "수배령2", always);
        }
        for (let _0x3a0dba of getElementIdx("수")) {
          tbf(comp[_0x3a0dba], "가뎀증", 50, "수배령3", always);
        }
        for (let _0x2641b9 of getElementIdx("풍")) {
          if (getRoleIdx("힐", "섶").includes(_0x2641b9)) {
            for (let _0x2d616c of getElementIdx("수")) {
              atbf(comp[_0x2641b9], "공격", comp[_0x2d616c], "가뎀증", 30, "<집단 사냥>", 1, always);
            }
          }
        }
      };
      _0x55e037.passive = function () {
        tbf(_0x55e037, "일뎀증", 70, "사냥감 추적", always);
        for (let _0x2e577a of getElementIdx("수")) {
          if (getRoleIdx("딜", "탱", "디").includes(_0x2e577a)) {
            atbf(_0x55e037, "궁", comp[_0x2e577a], "평추가*", 30, "<비검 전달>", 1, always);
          }
        }
        let _0x46651b = comp.findIndex(_0x2960fc => _0x2960fc.id == _0x55e037.id);
        for (let _0x1b0ac4 of getElementIdx("수")) {
          if (getRoleIdx("딜", "탱", "디").includes(_0x1b0ac4)) {
            if (_0x1b0ac4 == _0x46651b) {
              continue;
            }
            atbf(comp[_0x1b0ac4], "궁", _0x55e037, "평추가*", 30, "<비검 전달>", 1, always);
          }
        }
        tbf(_0x55e037, "일뎀증", 10, "일반 공격+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
        if (GLOBAL_TURN == 1) {
          cdChange(_0x55e037, -4);
          for (let _0x3d36cd of getElementIdx("수")) {
            if (comp[_0x3d36cd].id != _0x55e037.id) {
              cdChange(comp[_0x3d36cd], -1);
            }
          }
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10137:
      setMnc(_0x55e037, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(boss, "받뎀증", 20, "함께 시저 님을 섬겨요~1", 4);
            for (let _0x527a26 of getRoleIdx("딜", "탱", "디")) {
              tbf(comp[_0x527a26], "평추가*", 10, "함께 시저 님을 섬겨요~2", 4);
            }
            tbf(_0x55e037, "평추가*", 20, "함께 시저 님을 섬겨요~3", 4);
            break;
          case 2:
            tbf(boss, "받뎀증", 25, "함께 시저 님을 섬겨요~1", 4);
            for (let _0xf471d6 of getRoleIdx("딜", "탱", "디")) {
              tbf(comp[_0xf471d6], "평추가*", 15, "함께 시저 님을 섬겨요~2", 4);
            }
            tbf(_0x55e037, "평추가*", 30, "함께 시저 님을 섬겨요~3", 4);
            break;
          case 3:
            tbf(boss, "받뎀증", 30, "함께 시저 님을 섬겨요~1", 4);
            for (let _0x14096e of getRoleIdx("딜", "탱", "디")) {
              tbf(comp[_0x14096e], "평추가*", 20, "함께 시저 님을 섬겨요~2", 4);
            }
            tbf(_0x55e037, "평추가*", 40, "함께 시저 님을 섬겨요~3", 4);
            break;
          case 4:
            tbf(boss, "받뎀증", 35, "함께 시저 님을 섬겨요~1", 4);
            for (let _0xdffac4 of getRoleIdx("딜", "탱", "디")) {
              tbf(comp[_0xdffac4], "평추가*", 25, "함께 시저 님을 섬겨요~2", 4);
            }
            tbf(_0x55e037, "평추가*", 50, "함께 시저 님을 섬겨요~3", 4);
            break;
          default:
            tbf(boss, "받뎀증", 40, "함께 시저 님을 섬겨요~1", 4);
            for (let _0x2f937c of getRoleIdx("딜", "탱", "디")) {
              tbf(comp[_0x2f937c], "평추가*", 30, "함께 시저 님을 섬겨요~2", 4);
            }
            tbf(_0x55e037, "평추가*", 60, "함께 시저 님을 섬겨요~3", 4);
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {
        tbf(_0x55e037, "공퍼증", 50, "버니 웨이브", 1);
      };
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(30);
        const _0x636144 = getElementIdx("풍");
        for (let _0x324b89 of getRoleIdx("딜", "탱", "디")) {
          if (!_0x636144.includes(_0x324b89)) {
            continue;
          }
          anbf(comp[_0x324b89], "평", all, "공퍼증", 6, "<정욕 페로몬>1", 1, 18, always);
          anbf(comp[_0x324b89], "평", all, "일뎀증", 6, "<정욕 페로몬>2", 1, 18, always);
          anbf(comp[_0x324b89], "평", all, "가뎀증", 2, "<정욕 페로몬>3", 1, 18, always);
        }
      };
      _0x55e037.passive = function () {
        anbf(_0x55e037, "평", _0x55e037, "공퍼증", 15, "샤랄라 쁘띠 원피스", 1, 6, always);
        anbf(_0x55e037, "평", boss, "받일뎀", 15, "큐티 썬캡", 1, 6, always);
        tbf(_0x55e037, "가뎀증", 20, "쇼 로망스1", always);
        for (let _0x3a1d97 of getElementIdx("풍")) {
          anbf(_0x55e037, "궁", comp[_0x3a1d97], "받속뎀", 10, "쇼 로망스2", 1, 3, always);
        }
        tbf(_0x55e037, "일뎀증", 10, "일반 공격+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10138:
      setMnc(_0x55e037, [0, 3, 0, 3, 0, 3, 0, 3, 0, 3], _0x78c5e1);
      buff_ex.push("<파티 사회자>", "<파티 참가자>");
      _0x55e037.stack = false;
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
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
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
        if (_0x55e037.isLeader) {
          tbf(comp[4], "가뎀증", buffNestByType(_0x55e037, "<파티 사회자>") * 7.5, "파자마 파티 스타트~3", 1);
          tbf(boss, "받뎀증", buffNestByType(_0x55e037, "<파티 참가자>") * 7.5, "파자마 파티 스타트~4", 1);
        }
        tbf(comp[4], "가뎀증", buffNestByType(_0x55e037, "<파티 사회자>") * 8.75, "스릴 넘치는 파티 게임3", 1);
        tbf(boss, "받뎀증", buffNestByType(_0x55e037, "<파티 참가자>") * 8.75, "스릴 넘치는 파티 게임4", 1);
        switch (_0x78c5e1) {
          case 1:
            if (!_0x55e037.stack) {
              nbf(_0x55e037, "<파티 사회자>", 0, "스릴 넘치는 파티 게임1", 1, 4);
            }
            if (!_0x55e037.stack) {
              nbf(_0x55e037, "<파티 참가자>", 0, "스릴 넘치는 파티 게임2", 1, 4);
            }
            break;
          case 2:
            if (!_0x55e037.stack) {
              nbf(_0x55e037, "<파티 사회자>", 0, "스릴 넘치는 파티 게임1", 1, 4);
            }
            if (!_0x55e037.stack) {
              nbf(_0x55e037, "<파티 참가자>", 0, "스릴 넘치는 파티 게임2", 1, 4);
            }
            break;
          case 3:
            if (!_0x55e037.stack) {
              nbf(_0x55e037, "<파티 사회자>", 0, "스릴 넘치는 파티 게임1", 2, 4);
            }
            if (!_0x55e037.stack) {
              nbf(_0x55e037, "<파티 참가자>", 0, "스릴 넘치는 파티 게임2", 2, 4);
            }
            break;
          case 4:
            if (!_0x55e037.stack) {
              nbf(_0x55e037, "<파티 사회자>", 0, "스릴 넘치는 파티 게임1", 2, 4);
            }
            if (!_0x55e037.stack) {
              nbf(_0x55e037, "<파티 참가자>", 0, "스릴 넘치는 파티 게임2", 2, 4);
            }
            break;
          default:
            if (!_0x55e037.stack) {
              nbf(_0x55e037, "<파티 사회자>", 0, "스릴 넘치는 파티 게임1", 3, 4);
            }
            if (!_0x55e037.stack) {
              nbf(_0x55e037, "<파티 참가자>", 0, "스릴 넘치는 파티 게임2", 3, 4);
            }
            break;
        }
        _0x55e037.stack = true;
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(30);
        tbf(all, "공퍼증", 50, "파자마 파티 스타트~1", always);
        atbf(_0x55e037, "궁", comp[4], "궁뎀증", 30, "파자마 파티 스타트~2", 1, always);
        for (let _0x325e97 of getRoleIdx("섶")) {
          atbf(comp[_0x325e97], "궁", comp[4], "공고증", myCurAtk + comp[_0x325e97].id + 10, "파자마 파티 스타트~5", 1, always);
        }
        let _0x167b78 = 0;
        let _0x27eb9c = 0;
        for (let _0x432008 = 0; _0x432008 < 5; _0x432008++) {
          if (comp[_0x432008].hp > _0x27eb9c) {
            _0x167b78 = _0x432008;
            _0x27eb9c = comp[_0x432008].hp;
          }
        }
        let _0x16a959 = 0;
        let _0x3bf677 = 999999999;
        for (let _0x5d8f85 = 0; _0x5d8f85 < 5; _0x5d8f85++) {
          if (comp[_0x5d8f85].hp < _0x3bf677) {
            _0x16a959 = _0x5d8f85;
            _0x3bf677 = comp[_0x5d8f85].hp;
          }
        }
        atbf(comp[_0x167b78], "방", comp[_0x16a959], "아머", comp[_0x167b78] * 30, "파자마 파티 스타트~6", 1, always);
        for (let _0x16303e of getRoleIdx("디")) {
          atbf(comp[_0x16303e], "궁", comp[4], "궁추가*", 50, "<파티 주인공>", 1, always);
        }
      };
      _0x55e037.passive = function () {
        atbf(_0x55e037, "궁", all, "힐", myCurAtk + _0x55e037.id + 100, "수줍은 연애 이야기1", 1, always);
        nbf(_0x55e037, "<파티 사회자>", 0, "스릴 넘치는 파티 게임1", getRoleCnt("섶") * 1, 4);
        nbf(_0x55e037, "<파티 참가자>", 0, "스릴 넘치는 파티 게임2", getRoleCnt("디") * 1, 4);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
        for (let _0x3dca24 of comp);
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10139:
      setMnc(_0x55e037, [520, 5, 550, 5, 580, 5, 610, 5, 640, 5], _0x78c5e1);
      buff_ex.push("<마법소녀의 힘>");
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            for (let _0x4a79de of getElementIdx("광")) {
              nbf(comp[_0x4a79de], "받속뎀", 10, "마법소녀 초건전 빔1", 1, 1);
            }
            nbf(boss, "받뎀증", 10, "마법소녀 초건전 빔2", 1, 1);
            break;
          case 2:
            for (let _0x5a30c0 of getElementIdx("광")) {
              nbf(comp[_0x5a30c0], "받속뎀", 15, "마법소녀 초건전 빔1", 1, 1);
            }
            nbf(boss, "받뎀증", 10, "마법소녀 초건전 빔2", 1, 2);
            nbf(all, "공퍼증", 10, "마법소녀 초건전 빔3", 1, 1);
            break;
          case 3:
            for (let _0x1ab23a of getElementIdx("광")) {
              nbf(comp[_0x1ab23a], "받속뎀", 20, "마법소녀 초건전 빔1", 1, 1);
            }
            nbf(boss, "받뎀증", 10, "마법소녀 초건전 빔2", 1, 2);
            nbf(all, "공퍼증", 10, "마법소녀 초건전 빔3", 1, 1);
            break;
          case 4:
            for (let _0x145da2 of getElementIdx("광")) {
              nbf(comp[_0x145da2], "받속뎀", 20, "마법소녀 초건전 빔1", 1, 1);
            }
            nbf(boss, "받뎀증", 10, "마법소녀 초건전 빔2", 1, 2);
            nbf(all, "공퍼증", 10, "마법소녀 초건전 빔3", 1, 1);
            break;
          default:
            for (let _0x1b366f of getElementIdx("광")) {
              nbf(comp[_0x1b366f], "받속뎀", 20, "마법소녀 초건전 빔1", 1, 1);
            }
            nbf(boss, "받뎀증", 10, "마법소녀 초건전 빔2", 1, 2);
            nbf(all, "공퍼증", 10, "마법소녀 초건전 빔3", 1, 1);
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
        cdChange(_0x55e037, -2);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        let _0x5c8cbe = getElementCnt("광", "화");
        if (_0x5c8cbe > 4) {
          _0x5c8cbe = 4;
        }
        if (_0x5c8cbe >= 2) {
          tbf(_0x55e037, "공퍼증", 50, "이것이 바로 우정의 힘1", always);
          tbf(_0x55e037, "가뎀증", 20, "이것이 바로 우정의 힘2", always);
        }
        if (_0x5c8cbe >= 3) {
          anbf(_0x55e037, "공격", boss, "받뎀증", 10, "이것이 바로 우정의 힘3", 1, 4, always);
        }
        if (_0x5c8cbe >= 4) {
          tbf(_0x55e037, "궁추가*", 120, "이것이 바로 우정의 힘4", always);
        }
        nbf(_0x55e037, "<마법소녀의 힘>", 0, "이것이 바로 우정의 힘", _0x5c8cbe, 4);
        for (let _0x5eb174 of getElementIdx("광", "화")) {
          hpUpMe(comp[_0x5eb174], 30);
          tbf(comp[_0x5eb174], "공퍼증", 100, "<마법소녀 집결>1", always);
          tbf(comp[_0x5eb174], "가뎀증", 20, "<마법소녀 집결>2", always);
          tbf(comp[_0x5eb174], "궁뎀증", 40, "<마법소녀 집결>3", always);
        }
      };
      _0x55e037.passive = function () {
        for (let _0x329368 of getElementIdx("광")) {
          if (getRoleIdx("딜").includes(_0x329368)) {
            if (_0x55e037.id != comp[_0x329368].id) {
              comp[_0x329368].canCDChange = false;
            }
          }
        }
        anbf(_0x55e037, "궁", _0x55e037, "가뎀증", 15, "블링블링 베개 분쇄기", 1, 2, always);
        for (let _0x39b94f of getElementIdx("광")) {
          anbf(_0x55e037, "궁", comp[_0x39b94f], "받속뎀", 20, "어렴풋이 보여", 1, 1, always);
        }
        tbf(_0x55e037, "궁뎀증", 10, "궁극기+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
        if (GLOBAL_TURN == 1) {
          cdChange(_0x55e037, -2);
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10140:
      setMnc(_0x55e037, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x78c5e1);
      buff_ex.push("<강림치>");
      _0x55e037.ultbefore = function () {};
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpMe(_0x55e037, 50);
        tbf(all, "공퍼증", 100, "왜곡 의식1", always);
        tbf(_0x55e037, "궁발동*", 400, "왜곡 의식2", always);
        for (let _0x520406 = 1; _0x520406 <= 2; _0x520406++) {
          tbf(comp[_0x520406], "가뎀증", -300, "<살아있는 제물>1", always);
          atbf(comp[_0x520406], "공격", comp[0], "공고증", comp[_0x520406].atk * 125, "<살아있는 제물>2", 1, always);
          for (let _0x37178e of getElementIdx("암")) {
            atbf(comp[_0x520406], "궁", comp[_0x37178e], "받속뎀", 14, "<살아있는 제물>3", 2, always);
          }
          if (getRoleIdx("딜").includes(_0x520406)) {
            atbf(comp[_0x520406], "행동", comp[0], "궁발동+", comp[0].hp * 100, "<의식 박리>1", 50, 1);
            atbf(comp[_0x520406], "행동", comp[0], "궁발동*", 150, "<의식 박리>2", 50, 1);
            atbf(comp[_0x520406], "행동", comp[0], "가뎀증", 25, "<의식 박리>3", 50, 1);
          }
          if (getRoleIdx("디").includes(_0x520406)) {
            const _0x2612fc = comp[_0x520406].ultimate;
            comp[_0x520406].isFirstTurnActed = false;
            comp[_0x520406].ultimate = function (..._0xc313d9) {
              _0x2612fc.apply(this, _0xc313d9);
              if (!comp[_0x520406].isFirstTurnActed) {
                buff(comp[0], "궁", boss, "받뎀증", 45, "<의식 박리>5", 9, 50, "발동", true);
              }
              comp[_0x520406].isFirstTurnActed = true;
            };
            const _0x5b3a1c = comp[_0x520406].attack;
            comp[_0x520406].attack = function (..._0x5838c) {
              _0x5b3a1c.apply(this, _0x5838c);
              if (!comp[_0x520406].isFirstTurnActed) {
                buff(comp[0], "궁", boss, "받뎀증", 45, "<의식 박리>5", 9, 50, "발동", true);
              }
              comp[_0x520406].isFirstTurnActed = true;
            };
            const _0x292fb2 = comp[_0x520406].defense;
            comp[_0x520406].defense = function (..._0x51d231) {
              _0x292fb2.apply(this, _0x51d231);
              if (!comp[_0x520406].isFirstTurnActed) {
                buff(comp[0], "궁", boss, "받뎀증", 45, "<의식 박리>5", 9, 50, "발동", true);
              }
              comp[_0x520406].isFirstTurnActed = true;
            };
            atbf(comp[_0x520406], "행동", comp[0], "가뎀증", 25, "<의식 박리>6", 50, 1);
          }
          if (getRoleIdx("탱", "힐", "섶").includes(_0x520406)) {
            tbf(comp[_0x520406], "공퍼증", -600, "<의식 박리>7", always);
          }
        }
      };
      _0x55e037.passive = function () {
        tbf(all, "궁뎀증", 30, "심연의 관저", always);
        tbf(_0x55e037, "가뎀증", 10, "형언할 수 없는 몸1", always);
        atbf(_0x55e037, "궁", all, "가뎀증", 20, "형언할 수 없는 몸2", 1, always);
        anbf(_0x55e037, "평", _0x55e037, "<강림치>", 0, "<강림 준비>", 1, 10, always);
        anbf(_0x55e037, "궁", _0x55e037, "<강림치>", 0, "<강림 준비>", 3, 10, always);
        buff(_0x55e037, "평", boss, "받뎀증", 5, "<최고 신 강림>1", 3, 9, always, "발동", false);
        buff(_0x55e037, "궁발동+", _0x55e037.hp * 50, "<최고 신 강림>2", always, false);
        tbf(_0x55e037, "가뎀증", 7.5, "데미지+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.check = true;
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
        if (buffNestByType(_0x55e037, "<강림치>") >= 10 && _0x55e037.check) {
          setBuffOn(_0x55e037, "발동", "<최고 신 강림>1", true);
          setBuffOn(_0x55e037, "기본", "<최고 신 강림>2", true);
          _0x55e037.check = false;
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10141:
      _0x55e037.stack = 0;
      setMnc(_0x55e037, [120, 6, 139.8, 6, 159.6, 6, 180, 6, 199.8, 6], _0x78c5e1);
      buff_ex.push("<이성치>", "<이성치>감소X");
      _0x55e037.isSANFix = function () {
        const _0x4458f3 = _0x55e037.buff.filter(_0x4aaa52 => isTurn(_0x4aaa52) && _0x4aaa52.type == "<이성치>감소X");
        if (_0x4458f3.length > 0) {
          return true;
        } else {
          return false;
        }
      };
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            break;
          case 2:
            break;
          case 3:
            tbf(all, "발효증", 80, "백발백중이다냥!1", 6);
            for (let _0xa82409 of getElementIdx("풍")) {
              tbf(comp[_0xa82409], "받속뎀", 20, "백발백중이다냥!2", 6);
            }
            break;
          case 4:
            tbf(all, "발효증", 90, "백발백중이다냥!1", 6);
            for (let _0x540a86 of getElementIdx("풍")) {
              tbf(comp[_0x540a86], "받속뎀", 25, "백발백중이다냥!2", 6);
            }
            break;
          default:
            tbf(all, "발효증", 100, "백발백중이다냥!1", 6);
            for (let _0x473fa3 of getElementIdx("풍")) {
              tbf(comp[_0x473fa3], "받속뎀", 30, "백발백중이다냥!2", 6);
            }
            break;
        }
      };
      _0x55e037.ultafter = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(all, "발효증", 60, "백발백중이다냥!1", 6);
            for (let _0x1ce595 of getElementIdx("풍")) {
              tbf(comp[_0x1ce595], "받속뎀", 10, "백발백중이다냥!2", 6);
            }
            break;
          case 2:
            tbf(all, "발효증", 70, "백발백중이다냥!1", 6);
            for (let _0x190bf7 of getElementIdx("풍")) {
              tbf(comp[_0x190bf7], "받속뎀", 15, "백발백중이다냥!2", 6);
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
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037, 6);
        nbf(_0x55e037, "<이성치>", 0, "야옹이 요원 탐험 중", 50, 50);
        _0x55e037.stack = 50;
        setBuffOn(_0x55e037, "기본", "심연 직시3", true);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(20);
        tbf(all, "공퍼증", 50, "심연과의 동행", always);
        tbf(_0x55e037, "공퍼증", 40, "진실 조사1", always);
        tbf(_0x55e037, "가뎀증", 50, "진실 조사2", always);
        tbf(_0x55e037, "공발동*", 100, "진실 조사3", always);
        for (let _0x2095ef of getElementIdx("풍")) {
          atbf(_0x55e037, "궁", comp[_0x2095ef], "받속뎀", 30, "진실 조사4", 6, always);
        }
      };
      _0x55e037.passive = function () {
        buff(_0x55e037, "발효증", 30, "심연 직시1", always, false);
        buff(_0x55e037, "가뎀증", 20, "심연 직시2", always, false);
        buff(_0x55e037, "공발동*", 100, "심연 직시3", always, false);
        buff(_0x55e037, "공퍼증", 65, "심연 직시4", always, false);
        buff(_0x55e037, "공퍼증", 65, "심연 직시5", always, false);
        tbf(_0x55e037, "궁발동*", 100, "이성치-바보 시저1", always);
        atbf(_0x55e037, "궁", _0x55e037, "on", "기본", "심연 직시1", 1, always);
        atbf(_0x55e037, "궁", _0x55e037, "on", "기본", "심연 직시2", 1, always);
        atbf(_0x55e037, "궁", _0x55e037, "on", "기본", "심연 직시4", 1, always);
        atbf(_0x55e037, "궁", _0x55e037, "on", "기본", "심연 직시5", 1, always);
        atbf(_0x55e037, "궁", _0x55e037, "<이성치>감소X", 0, "이성치-바보 시저2", 4, always);
        tbf(_0x55e037, "발효증", 30, "발동+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (GLOBAL_TURN == 1) {
          cdChange(_0x55e037, _0x55e037.isLeader ? -6 : -3);
        }
        if (GLOBAL_TURN == 1) {
          nbf(_0x55e037, "<이성치>", 0, "야옹이 요원 탐험 중", 50, 50);
          _0x55e037.stack = 50;
        }
        if (_0x55e037.getNest("<이성치>") < 1) {
          nbf(_0x55e037, "<이성치>", 0, "야옹이 요원 탐험 중", 50, 50);
          _0x55e037.stack = 50;
        } else if (GLOBAL_TURN > 1 && !_0x55e037.isSANFix()) {
          nbf(_0x55e037, "<이성치>", 0, "야옹이 요원 탐험 중", -10, 50);
          _0x55e037.stack -= 10;
          if (_0x55e037.stack < 0) {
            _0x55e037.stack = 0;
          }
        }
        setBuffOn(_0x55e037, "기본", "심연 직시1", _0x55e037.stack >= 50);
        setBuffOn(_0x55e037, "기본", "심연 직시2", _0x55e037.stack >= 40);
        setBuffOn(_0x55e037, "기본", "심연 직시3", _0x55e037.stack >= 30);
        setBuffOn(_0x55e037, "기본", "심연 직시4", _0x55e037.stack >= 20);
        setBuffOn(_0x55e037, "기본", "심연 직시5", _0x55e037.stack >= 10);
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10142:
      setMnc(_0x55e037, [200, 4, 200, 4, 200, 4, 200, 4, 200, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(_0x55e037, "일뎀증", 50, "다 함께 수박 깨기~1", 4);
            tbf(_0x55e037, "가뎀증", 20, "다 함께 수박 깨기~2", 4);
            for (let _0xd4754b of getRoleIdx("딜")) {
              tbf(comp[_0xd4754b], "평추가*", 20, "다 함께 수박 깨기~3", 4);
              atbf(comp[_0xd4754b], "평", _0x55e037, "공퍼증", 10, "다 함께 수박 깨기~3", 1, 4);
            }
            break;
          case 2:
            tbf(_0x55e037, "일뎀증", 70, "다 함께 수박 깨기~1", 4);
            tbf(_0x55e037, "가뎀증", 25, "다 함께 수박 깨기~2", 4);
            for (let _0x51694e of getRoleIdx("딜")) {
              tbf(comp[_0x51694e], "평추가*", 30, "다 함께 수박 깨기~3", 4);
              atbf(comp[_0x51694e], "평", _0x55e037, "공퍼증", 10, "다 함께 수박 깨기~3", 1, 4);
            }
            break;
          case 3:
            tbf(_0x55e037, "일뎀증", 90, "다 함께 수박 깨기~1", 4);
            tbf(_0x55e037, "가뎀증", 30, "다 함께 수박 깨기~2", 4);
            for (let _0x53b584 of getRoleIdx("딜")) {
              tbf(comp[_0x53b584], "평추가*", 30, "다 함께 수박 깨기~3", 4);
              atbf(comp[_0x53b584], "평", _0x55e037, "공퍼증", 20, "다 함께 수박 깨기~3", 1, 4);
            }
            break;
          case 4:
            tbf(_0x55e037, "일뎀증", 110, "다 함께 수박 깨기~1", 4);
            tbf(_0x55e037, "가뎀증", 35, "다 함께 수박 깨기~2", 4);
            for (let _0x3a07f4 of getRoleIdx("딜")) {
              tbf(comp[_0x3a07f4], "평추가*", 40, "다 함께 수박 깨기~3", 4);
              atbf(comp[_0x3a07f4], "평", _0x55e037, "공퍼증", 20, "다 함께 수박 깨기~3", 1, 4);
            }
            break;
          default:
            tbf(_0x55e037, "일뎀증", 130, "다 함께 수박 깨기~1", 4);
            tbf(_0x55e037, "가뎀증", 40, "다 함께 수박 깨기~2", 4);
            for (let _0x916c94 of getRoleIdx("딜")) {
              tbf(comp[_0x916c94], "평추가*", 60, "다 함께 수박 깨기~3", 4);
              atbf(comp[_0x916c94], "평", _0x55e037, "공퍼증", 30, "다 함께 수박 깨기~3", 1, 4);
            }
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(40);
        tbf(all, "공퍼증", 50, "발리볼 대회 스타트~", always);
        if (getRoleCnt("딜") >= 3) {
          atbf(_0x55e037, "궁", boss, "받뎀증", 20, "<시합 참여>1", 4, always);
          for (let _0x192cc0 of getRoleIdx("딜")) {
            atbf(_0x55e037, "궁", comp[_0x192cc0], "가뎀증", 20, "<시합 참여>2", 4, always);
            atbf(_0x55e037, "궁", comp[_0x192cc0], "일뎀증", 110, "<시합 참여>3", 4, always);
          }
        }
      };
      _0x55e037.passive = function () {
        for (let _0x44e3dc of getRoleIdx("딜")) {
          atbf(comp[_0x44e3dc], "궁", _0x55e037, "공퍼증", 20, "<머리통 바로잡기>", 4, always);
        }
        anbf(_0x55e037, "궁", boss, "받뎀증", 20, "웨딩드레스 병기 - 힘 강화", 1, 2, always);
        tbf(_0x55e037, "공퍼증", 10, "공격+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
        if (GLOBAL_TURN == 1) {
          cdChange(_0x55e037, -4);
        }
        if (GLOBAL_TURN > 1) {
          const _0x4f1961 = getRoleCnt("딜");
          for (let _0x2f5279 = 0; _0x2f5279 < _0x4f1961; _0x2f5279++) {
            tbf(boss, "받일뎀", 30, "<해설 타임>", 1);
          }
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10143:
      setMnc(_0x55e037, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(all, "일뎀증", 30, "여름날의 아름다운 풍경1", 4);
            ptbf(all, "평", all, "힐", 4, "여름날의 아름다운 풍경2", 1, 4);
            tbf(_0x55e037, "평추가*", 60, "여름날의 아름다운 풍경3", 4);
            break;
          case 2:
            tbf(all, "일뎀증", 45, "여름날의 아름다운 풍경1", 4);
            ptbf(all, "평", all, "힐", 4, "여름날의 아름다운 풍경2", 1, 4);
            tbf(_0x55e037, "평추가*", 80, "여름날의 아름다운 풍경3", 4);
            break;
          case 3:
            tbf(all, "일뎀증", 60, "여름날의 아름다운 풍경1", 4);
            ptbf(all, "평", all, "힐", 6, "여름날의 아름다운 풍경2", 1, 4);
            tbf(_0x55e037, "평추가*", 100, "여름날의 아름다운 풍경3", 4);
            tbf(_0x55e037, "공퍼증", 30, "여름날의 아름다운 풍경4", 4);
            break;
          case 4:
            tbf(all, "일뎀증", 75, "여름날의 아름다운 풍경1", 4);
            ptbf(all, "평", all, "힐", 6, "여름날의 아름다운 풍경2", 1, 4);
            tbf(_0x55e037, "평추가*", 120, "여름날의 아름다운 풍경3", 4);
            tbf(_0x55e037, "공퍼증", 60, "여름날의 아름다운 풍경4", 4);
            break;
          default:
            tbf(all, "일뎀증", 90, "여름날의 아름다운 풍경1", 4);
            ptbf(all, "평", all, "힐", 10, "여름날의 아름다운 풍경2", 1, 4);
            tbf(_0x55e037, "평추가*", 140, "여름날의 아름다운 풍경3", 4);
            tbf(_0x55e037, "공퍼증", 90, "여름날의 아름다운 풍경4", 4);
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(30);
        if (getRoKind() == 3) {
          tbf(all, "공퍼증", 100, "<엘프 여왕의 여름 나기>1", always);
          tbf(all, "일뎀증", 110, "<엘프 여왕의 여름 나기>2", always);
          tbf(all, "가뎀증", 20, "<엘프 여왕의 여름 나기>3", always);
          tbf(all, "평추가*", 30, "<엘프 여왕의 여름 나기>4", always);
        }
      };
      _0x55e037.passive = function () {
        tbf(_0x55e037, "공퍼증", 30, "우아한 발걸음1", always);
        atbf(_0x55e037, "궁", all, "아머", _0x55e037.hp * 25, "파라솔을 펴다", 1, always);
        tbf(_0x55e037, "공퍼증", 10, "공격+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
        if (GLOBAL_TURN == 9) {
          tbf(boss, "받뎀증", 50, "웨딩드레스 병기 - 마력 강화", 50);
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10144:
      setMnc(_0x55e037, [295, 4, 364, 4, 433, 4, 502, 4, 571, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {};
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        switch (_0x78c5e1) {
          case 1:
            _0x55e037.hpUltDmg = _0x55e037.hp * 89;
            break;
          case 2:
            _0x55e037.hpUltDmg = _0x55e037.hp * 107;
            break;
          case 3:
            _0x55e037.hpUltDmg = _0x55e037.hp * 125;
            break;
          case 4:
            _0x55e037.hpUltDmg = _0x55e037.hp * 143;
            break;
          default:
            _0x55e037.hpUltDmg = _0x55e037.hp * 161;
            break;
        }
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        _0x55e037.hpAtkDmg = _0x55e037.hp * 50;
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(20);
        hpUpMe(_0x55e037, 20);
        tbf(all, "공퍼증", 50, "바다의 군림자!1", always);
        nbf(_0x55e037, "공퍼증", 5, "웨딩드레스 병기 - 에너지 섭취1", 20, 20);
        nbf(_0x55e037, "받캐뎀", 4, "웨딩드레스 병기 - 에너지 섭취2", 15, 15);
        nbf(_0x55e037, "가뎀증", 20, "웨딩드레스 병기 - 에너지 섭취3", 4, 4);
        for (let _0x264216 of comp) {
          if (_0x264216.id == _0x55e037.id) {
            continue;
          }
          atbf(_0x264216, "방", boss, "받뎀증", 9, "여름날 마왕의 위엄", 2, always);
          atbf(_0x264216, "궁", boss, "받뎀증", 9, "여름날 마왕의 위엄", 2, always);
          atbf(_0x264216, "방", comp[0], "공고증", _0x264216.atk * 75, "여름날 마왕의 위엄", 1, always);
          atbf(_0x264216, "궁", comp[0], "공고증", _0x264216.atk * 75, "여름날 마왕의 위엄", 1, always);
        }
      };
      _0x55e037.passive = function () {
        tbf(_0x55e037, "공퍼증", 50, "마왕 바다 가르기1", always);
        tbf(_0x55e037, "궁뎀증", 30, "마왕 바다 가르기2", always);
        anbf(_0x55e037, "평", _0x55e037, "받캐뎀", 4, "웨딩드레스 병기 - 에너지 섭취2", 1, 15, always);
        anbf(_0x55e037, "궁", _0x55e037, "가뎀증", 20, "웨딩드레스 병기 - 에너지 섭취3", 1, 4, always);
        tbf(_0x55e037, "궁추가*", 150, "웨딩드레스 병기 - 연산 공유", always);
        tbf(_0x55e037, "공퍼증", 10, "공격+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
        if (GLOBAL_TURN > 1) {
          for (let _0x50352e of comp) {
            tbf(_0x50352e, "공고증", myCurAtk + _0x55e037.id + 5, "웨딩드레스 병기 - 연산 공유2", 1);
          }
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
        nbf(_0x55e037, "공퍼증", 5, "웨딩드레스 병기 - 에너지 섭취1", 1, 20);
      };
      return _0x55e037;
    case 10145:
      setMnc(_0x55e037, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            break;
          case 2:
            break;
          case 3:
            tbf(all, "공고증", _0x55e037.hp * 7.5, "피비린내1", 5);
            break;
          case 4:
            tbf(all, "공고증", _0x55e037.hp * 8.75, "피비린내1", 5);
            break;
          default:
            tbf(all, "공고증", _0x55e037.hp * 10, "피비린내1", 5);
            break;
        }
      };
      _0x55e037.ultafter = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(all, "공고증", _0x55e037.hp * 5, "피비린내1", 5);
            break;
          case 2:
            tbf(all, "공고증", _0x55e037.hp * 6.25, "피비린내1", 5);
            break;
          case 3:
            tbf(all, "아머", _0x55e037.hp * 25 * armorUp(_0x55e037, "궁", "추가"), "피비린내2", 2);
            break;
          case 4:
            tbf(all, "아머", _0x55e037.hp * 25 * armorUp(_0x55e037, "궁", "추가"), "피비린내2", 2);
            break;
          default:
            tbf(all, "아머", _0x55e037.hp * 25 * armorUp(_0x55e037, "궁", "추가"), "피비린내2", 2);
            break;
        }
        _0x55e037.hit();
      };
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {
        _0x55e037.hit();
      };
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(40);
        tbf(all, "공퍼증", 70, "마계의 낚시 마스터1", always);
        tbf(all, "일뎀증", 60, "마계의 낚시 마스터2", always);
        tbf(all, "궁뎀증", 20, "마계의 낚시 마스터3", always);
        atbf(_0x55e037, "공격", all, "공고증", _0x55e037.hp * 5, "마계의 낚시 마스터4", 2, always);
        anbf(_0x55e037, "피격", all, "가뎀증", 1.33, "<걸려들었다>1", 1, 15, always);
        anbf(_0x55e037, "피격", boss, "받뎀증", 1.33, "<걸려들었다>2", 1, 15, always);
      };
      _0x55e037.passive = function () {
        anbf(_0x55e037, "평", all, "일뎀증", 5, "피로 묻는 안부2", 1, 10, always);
        anbf(_0x55e037, "궁", all, "궁뎀증", 10, "피로 묻는 안부4", 1, 3, always);
        anbf(_0x55e037, "피격", all, "가뎀증", 1.33, "학살 욕망", 1, 15, always);
        anbf(_0x55e037, "피격", boss, "받뎀증", 1.33, "웨딩드레스 병기 - 장애 식별", 1, 15, always);
        tbf(_0x55e037, "가뎀증", 7.5, "데미지+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10146:
      _0x55e037.stack = 0;
      setMnc(_0x55e037, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x78c5e1);
      buff_ex.push("<잡념 떨치기>");
      _0x55e037.ultbefore = function () {
        nbf(_0x55e037, "일뎀증", -150, "이도류 오의 - 절멸참1", 1, 1);
        switch (_0x78c5e1) {
          case 1:
            nbf(_0x55e037, "궁뎀증", 60, "이도류 오의 - 절멸참2", 1, 1);
            for (let _0x32fa6f of getElementIdx("암")) {
              nbf(comp[_0x32fa6f], "받속뎀", 10, "이도류 오의 - 절멸참3", 1, 1);
            }
            break;
          case 2:
            nbf(_0x55e037, "궁뎀증", 70, "이도류 오의 - 절멸참2", 1, 1);
            for (let _0x171ec3 of getElementIdx("암")) {
              nbf(comp[_0x171ec3], "받속뎀", 15, "이도류 오의 - 절멸참3", 1, 1);
            }
            break;
          case 3:
            nbf(_0x55e037, "궁뎀증", 80, "이도류 오의 - 절멸참2", 1, 1);
            for (let _0x48016d of getElementIdx("암")) {
              nbf(comp[_0x48016d], "받속뎀", 20, "이도류 오의 - 절멸참3", 1, 1);
            }
            break;
          case 4:
            nbf(_0x55e037, "궁뎀증", 90, "이도류 오의 - 절멸참2", 1, 1);
            for (let _0x5813ef of getElementIdx("암")) {
              nbf(comp[_0x5813ef], "받속뎀", 30, "이도류 오의 - 절멸참3", 1, 1);
            }
            break;
          default:
            nbf(_0x55e037, "궁뎀증", 100, "이도류 오의 - 절멸참2", 1, 1);
            for (let _0x35b506 of getElementIdx("암")) {
              nbf(comp[_0x35b506], "받속뎀", 40, "이도류 오의 - 절멸참3", 1, 1);
            }
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(30);
        tbf(all, "공퍼증", 50, "편집광1", always);
        tbf(_0x55e037, "궁추가*", 80, "편집광2", always);
        for (let _0x5421ab of getRoleIdx("딜", "디")) {
          tbf(all, "공고증", comp[_0x5421ab].atk * 10, "<궁극의 무도>1", 50);
        }
      };
      _0x55e037.passive = function () {
        anbf(_0x55e037, "평", _0x55e037, "공퍼증", 40, "<정신통일>", 1, 2, always);
        atbf(_0x55e037, "궁", _0x55e037, "제거", "기본", "<정신통일>", 1, always);
        tbf(_0x55e037, "가뎀증", 15, "침착한 마음1", always);
        for (let _0x5d7edc of getRoleIdx("딜", "디")) {
          if (comp[_0x5d7edc].id != _0x55e037.id) {
            tbf(comp[_0x5d7edc], "가뎀증", 15, "침착한 마음2", 50);
            tbf(_0x55e037, "가뎀증", 15, "침착한 마음2", 50);
          }
        }
        buff(_0x55e037, "궁추가*", 220, "공명정대2", always, false);
        tbf(_0x55e037, "공퍼증", 10, "공격+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {
          for (let _0x1721d4 of getRoleIdx("딜", "디")) {
            if (GLOBAL_TURN == 5) {
              nbf(comp[_0x1721d4], "궁뎀증", 50, "<궁극의 무도>2", 1, 1);
            }
            if (GLOBAL_TURN == 9) {
              nbf(boss, "받뎀증", 33, "<궁극의 무도>3", 1, 3);
            }
          }
        }
        if (GLOBAL_TURN > 1 && _0x55e037.stack < 8) {
          nbf(_0x55e037, "<잡념 떨치기>", 0, "공명정대1", 1, 8);
          if (_0x55e037.stack == 7) {
            setBuffOn(_0x55e037, "기본", "공명정대2", true);
          }
          _0x55e037.stack++;
          if (_0x55e037.stack > 8) {
            _0x55e037.stack = 8;
          }
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10147:
      setMnc(_0x55e037, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            break;
          case 2:
            break;
          case 3:
            for (let _0x1951c2 of getElementIdx("풍", "광")) {
              tbf(comp[_0x1951c2], "받속뎀", 40, "널 요리해 버리는 수밖에!1", 2);
            }
            tbf(boss, "받뎀증", 15, "널 요리해 버리는 수밖에!2", 2);
            break;
          case 4:
            for (let _0x56e4d0 of getElementIdx("풍", "광")) {
              tbf(comp[_0x56e4d0], "받속뎀", 45, "널 요리해 버리는 수밖에!1", 2);
            }
            tbf(boss, "받뎀증", 15, "널 요리해 버리는 수밖에!2", 2);
            break;
          default:
            for (let _0x4b7012 of getElementIdx("풍", "광")) {
              tbf(comp[_0x4b7012], "받속뎀", 50, "널 요리해 버리는 수밖에!1", 2);
            }
            tbf(boss, "받뎀증", 15, "널 요리해 버리는 수밖에!2", 2);
            break;
        }
      };
      _0x55e037.ultafter = function () {
        switch (_0x78c5e1) {
          case 1:
            for (let _0x15626a of getElementIdx("풍", "광")) {
              tbf(comp[_0x15626a], "받속뎀", 30, "널 요리해 버리는 수밖에!1", 2);
            }
            break;
          case 2:
            for (let _0x5a4909 of getElementIdx("풍", "광")) {
              tbf(comp[_0x5a4909], "받속뎀", 35, "널 요리해 버리는 수밖에!1", 2);
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
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
        if (_0x55e037.isLeader) {
          for (let _0x2ae4f1 of comp) {
            if (_0x2ae4f1.id != _0x55e037.id) {
              for (let _0x4ab9e3 of comp) {
                if (_0x4ab9e3.id != _0x2ae4f1.id) {
                  atbf(_0x2ae4f1, "행동", _0x4ab9e3, "제거", "기본", "<특제-마물요리>", 1, 2);
                }
              }
            }
          }
          for (let _0x3bbfb6 of comp) {
            if (_0x3bbfb6.id != _0x55e037.id) {
              for (let _0x3bb9e8 of comp) {
                if (_0x3bb9e8.id != _0x55e037.id) {
                  atbf(_0x3bbfb6, "행동", _0x3bb9e8, "제거", "발동", "<특제-마물요리>", 1, 2);
                }
              }
            }
          }
        }
        for (let _0x582b92 of comp) {
          if (_0x582b92.id != _0x55e037.id) {
            for (let _0x7fbd15 of comp) {
              if (_0x7fbd15.id != _0x582b92.id) {
                atbf(_0x582b92, "행동", _0x7fbd15, "제거", "기본", "<즐거운 만찬>", 1, 2);
              }
            }
          }
        }
        for (let _0x27baad of comp) {
          if (_0x27baad.id != _0x55e037.id) {
            for (let _0x352529 of comp) {
              if (_0x352529.id != _0x55e037.id) {
                atbf(_0x27baad, "행동", _0x352529, "제거", "발동", "<즐거운 만찬>", 1, 2);
              }
            }
          }
        }
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(40);
        tbf(all, "공퍼증", 50, "마물 요리 셰프", always);
        tbf(_0x55e037, "공퍼증", 100, "<모두 어서 먹어보라니까!>1", always);
        tbf(_0x55e037, "가뎀증", 50, "<모두 어서 먹어보라니까!>2", always);
        tbf(_0x55e037, "궁뎀증", 100, "<모두 어서 먹어보라니까!>3", always);
        tbf(_0x55e037, "일뎀증", 100, "<모두 어서 먹어보라니까!>4", always);
        for (let _0x14adfe of comp) {
          if (_0x14adfe.id != _0x55e037.id) {
            atbf(_0x55e037, "궁", _0x14adfe, "공퍼증", 100, "<특제-마물요리>", 2, always);
            atbf(_0x55e037, "궁", _0x14adfe, "가뎀증", 30, "<특제-마물요리>", 2, always);
            atbf(_0x55e037, "궁", _0x14adfe, "궁뎀증", 50, "<특제-마물요리>", 1, always);
            atbf(_0x55e037, "궁", _0x14adfe, "일뎀증", 100, "<특제-마물요리>", 2, always);
          }
        }
      };
      _0x55e037.passive = function () {
        for (let _0x362353 of comp) {
          if (_0x362353.id != _0x55e037.id) {
            atbf(_0x55e037, "궁", _0x362353, "공퍼증", 100, "<즐거운 만찬>", 2, always);
            atbf(_0x55e037, "궁", _0x362353, "일뎀증", 100, "<즐거운 만찬>", 2, always);
          }
        }
        atbf(comp[1], "궁", boss, "받궁뎀", 100, "칼질 지도1", 1, always);
        tbf(_0x55e037, "공퍼증", 10, "공격+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10148:
      setMnc(_0x55e037, [100, 4, 125, 4, 150, 4, 175, 4, 200, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            for (let _0x44cb1c of getElementIdx("수")) {
              nbf(comp[_0x44cb1c], "받속뎀", 10, "시즈카는 놀러가야지~1", 1, 2);
            }
            tbf(_0x55e037, "평추가*", 110, "시즈카는 놀러가야지~2", 4);
            break;
          case 2:
            for (let _0x530e24 of getElementIdx("수")) {
              nbf(comp[_0x530e24], "받속뎀", 12.5, "시즈카는 놀러가야지~1", 1, 2);
            }
            tbf(_0x55e037, "평추가*", 125, "시즈카는 놀러가야지~2", 4);
            break;
          case 3:
            for (let _0x227f6f of getElementIdx("수")) {
              nbf(comp[_0x227f6f], "받속뎀", 15, "시즈카는 놀러가야지~1", 1, 2);
            }
            tbf(_0x55e037, "평추가*", 140, "시즈카는 놀러가야지~2", 4);
            break;
          case 4:
            for (let _0x2656df of getElementIdx("수")) {
              nbf(comp[_0x2656df], "받속뎀", 17.5, "시즈카는 놀러가야지~1", 1, 2);
            }
            tbf(_0x55e037, "평추가*", 155, "시즈카는 놀러가야지~2", 4);
            break;
          default:
            for (let _0x5a5c52 of getElementIdx("수")) {
              nbf(comp[_0x5a5c52], "받속뎀", 20, "시즈카는 놀러가야지~1", 1, 2);
            }
            tbf(_0x55e037, "평추가*", 170, "시즈카는 놀러가야지~2", 4);
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(40);
        tbf(all, "공퍼증", 50, "요호 탐험대 출발!", always);
        for (let _0x4e5c30 of getRoleIdx("딜", "디")) {
          if (getRoleCnt("힐") >= 2) {
            ptbf(comp[_0x4e5c30], "평", all, "힐", 10, "<한잔해~>", 1, always);
          }
        }
        for (let _0x10076a of getRoleIdx("힐")) {
          if (getRoleCnt("힐") >= 2) {
            tbf(comp[_0x10076a], "가뎀증", 30, "<말썽꾸러기 요호>1", always);
            tbf(comp[_0x10076a], "일뎀증", 60, "<말썽꾸러기 요호>2", always);
            tbf(comp[_0x10076a], "평추가*", 100, "<말썽꾸러기 요호>3", always);
            atbf(comp[_0x10076a], "공격", comp[0], "평추가*", 25, "<장난칠 시간>1", 1, always);
            atbf(comp[_0x10076a], "공격", all, "가뎀증", 5, "<장난칠 시간>2", 4, always);
            atbf(comp[_0x10076a], "공격", all, "일뎀증", 6.25, "<장난칠 시간>3", 4, always);
          }
        }
      };
      _0x55e037.passive = function () {
        for (let _0x31eb5f of getRoleIdx("딜", "디")) {
          atbf(_0x55e037, "힐", comp[_0x31eb5f], "공퍼증", 2.5, "활발하고 귀여운 요호", 4, always);
        }
        anbf(_0x55e037, "공격", _0x55e037, "일뎀증", 10, "우선 한잔해", 1, 10, always);
        for (let _0x478b28 of getRoleIdx("힐")) {
          for (let _0x47f248 of getRoleIdx("딜", "디")) {
            atbf(comp[_0x478b28], "공격", comp[_0x47f248], "가뎀증", 10, "<주문하신 술 나왔습니다>1", 1, always);
            atbf(comp[_0x478b28], "공격", comp[_0x47f248], "평추가*", 10, "<주문하신 술 나왔습니다>2", 1, always);
          }
        }
        tbf(_0x55e037, "일뎀증", 10, "일반 공격 데미지+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
        if (GLOBAL_TURN == 1) {
          for (let _0x3ba4d8 of getRoleIdx("힐")) {
            cdChange(comp[_0x3ba4d8], -4);
          }
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10149:
      setMnc(_0x55e037, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            for (let _0x5b7428 of getElementIdx("화")) {
              tbf(comp[_0x5b7428], "궁뎀증", 20, "천호요화1", 4);
            }
            for (let _0x38d4ad of getRoleIdx("디")) {
              tbf(comp[_0x38d4ad], "가뎀증", 15, "천호요화2", 4);
            }
            break;
          case 2:
            for (let _0x243520 of getElementIdx("화")) {
              tbf(comp[_0x243520], "궁뎀증", 30, "천호요화1", 4);
            }
            for (let _0x3b196f of getRoleIdx("디")) {
              tbf(comp[_0x3b196f], "가뎀증", 20, "천호요화2", 4);
            }
            break;
          case 3:
            for (let _0x174a80 of getElementIdx("화")) {
              tbf(comp[_0x174a80], "궁뎀증", 40, "천호요화1", 4);
            }
            for (let _0x2c2b8e of getRoleIdx("디")) {
              tbf(comp[_0x2c2b8e], "가뎀증", 30, "천호요화2", 4);
            }
            break;
          case 4:
            for (let _0x2d7187 of getElementIdx("화")) {
              tbf(comp[_0x2d7187], "궁뎀증", 50, "천호요화1", 4);
            }
            for (let _0x4a2d2d of getRoleIdx("디")) {
              tbf(comp[_0x4a2d2d], "가뎀증", 40, "천호요화2", 4);
            }
            break;
          default:
            for (let _0xb4a7ad of getElementIdx("화")) {
              tbf(comp[_0xb4a7ad], "궁뎀증", 60, "천호요화1", 4);
            }
            for (let _0x4a2cdd of getRoleIdx("디")) {
              tbf(comp[_0x4a2cdd], "가뎀증", 50, "천호요화2", 4);
            }
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(30);
        tbf(all, "공퍼증", 40, "옥면과 은빛 꼬리의 구미호1", always);
        for (let _0x2993c0 of getRoleIdx("디")) {
          comp[_0x2993c0].canCDChange = false;
        }
        for (let _0x2c0a9d of getElementIdx("화")) {
          anbf(_0x55e037, "궁", comp[_0x2c0a9d], "받속뎀", 100, "옥면과 은빛 꼬리의 구미호2", 1, 1, always);
        }
        for (let _0x9f018b of getRoleIdx("디")) {
          anbf(_0x55e037, "궁", comp[_0x9f018b], "받직뎀", 50, "옥면과 은빛 꼬리의 구미호3", 1, 2, always);
        }
        for (let _0x4887fd of getRoleIdx("디")) {
          atbf(comp[_0x4887fd], "방", comp[_0x4887fd], "공퍼증", 50, "<요술달인>1", 2, always);
          atbf(comp[_0x4887fd], "방", comp[_0x4887fd], "궁뎀증", 60, "<요술달인>2", 2, always);
          atbf(comp[_0x4887fd], "방", comp[_0x4887fd], "궁추가*", 100, "<요술달인>3", 2, always);
        }
        if (getElementCnt("화") >= 2) {
          tbf(all, "공퍼증", -250, "<과열>1", always);
          tbf(all, "궁뎀증", -250, "<과열>2", always);
        }
      };
      _0x55e037.passive = function () {
        atbf(_0x55e037, "궁", _0x55e037, "힐", 75, "나이는 비밀~", 1, always);
        anbf(_0x55e037, "궁", boss, "받뎀증", 30, "장난 전문가", 1, 2, always);
        tbf(_0x55e037, "공퍼증", 10, "공격+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 4 == 0) {
          tbf(_0x55e037, "공고증", myCurAtk + _0x55e037.id + 60, "살짝 놀리기만 하면 돼", 1);
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10044:
      setMnc(_0x55e037, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            for (let _0x3638cf of comp) {
              buff(_0x3638cf, "궁", _0x3638cf, "궁뎀증", 20, "운명을 엿보는 자1", 1, 2, 1, "발동", false);
            }
            for (let _0x4ccae7 of comp) {
              anbf(_0x4ccae7, "평", _0x4ccae7, "일뎀증", 20, "운명을 엿보는 자2", 1, 2, 2);
            }
            tbf(all, "가뎀증", 10, "운명을 엿보는 자3", 2);
            break;
          case 2:
            for (let _0x26c3d8 of comp) {
              buff(_0x26c3d8, "궁", _0x26c3d8, "궁뎀증", 22.5, "운명을 엿보는 자1", 1, 2, 1, "발동", false);
            }
            for (let _0x3792b4 of comp) {
              anbf(_0x3792b4, "평", _0x3792b4, "일뎀증", 25, "운명을 엿보는 자2", 1, 2, 2);
            }
            tbf(all, "가뎀증", 10, "운명을 엿보는 자3", 2);
            break;
          case 3:
            for (let _0x2ee875 of comp) {
              buff(_0x2ee875, "궁", _0x2ee875, "궁뎀증", 25, "운명을 엿보는 자1", 1, 2, 1, "발동", false);
            }
            for (let _0x355259 of comp) {
              anbf(_0x355259, "평", _0x355259, "일뎀증", 30, "운명을 엿보는 자2", 1, 2, 2);
            }
            tbf(all, "가뎀증", 15, "운명을 엿보는 자3", 2);
            break;
          case 4:
            for (let _0x25757d of comp) {
              buff(_0x25757d, "궁", _0x25757d, "궁뎀증", 27.5, "운명을 엿보는 자1", 1, 2, 1, "발동", false);
            }
            for (let _0x4aae2b of comp) {
              anbf(_0x4aae2b, "평", _0x4aae2b, "일뎀증", 35, "운명을 엿보는 자2", 1, 2, 2);
            }
            tbf(all, "가뎀증", 15, "운명을 엿보는 자3", 2);
            break;
          default:
            for (let _0x17163b of comp) {
              buff(_0x17163b, "궁", _0x17163b, "궁뎀증", 30, "운명을 엿보는 자1", 1, 2, 1, "발동", false);
            }
            for (let _0x5f3e4b of comp) {
              anbf(_0x5f3e4b, "평", _0x5f3e4b, "일뎀증", 40, "운명을 엿보는 자2", 1, 2, 2);
            }
            tbf(all, "가뎀증", 20, "운명을 엿보는 자3", 2);
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
        for (let _0x5df565 of comp) {
          setBuffOn(_0x5df565, "발동", "운명을 엿보는 자1", true);
        }
      };
      _0x55e037.atkbefore = function () {
        tbf(all, "공고증", myCurAtk + _0x55e037.id + 30, "점술", 1);
      };
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(30);
        tbf(all, "궁뎀증", 20, "고독한 점술사1", always);
        tbf(all, "일뎀증", 30, "고독한 점술사2", always);
        tbf(_0x55e037, "공퍼증", 350, "고독한 점술사3", always);
        for (let _0x15da36 of comp) {
          if (_0x55e037.id != _0x15da36.id) {
            atbf(_0x55e037, "궁", _0x15da36, "궁추가*", 100, "고독한 점술사4", 1, always);
          }
        }
        for (let _0x1d1ccd of comp) {
          if (_0x55e037.id != _0x1d1ccd.id) {
            atbf(_0x55e037, "궁", _0x1d1ccd, "평추가*", 25, "고독한 점술사5", 2, always);
          }
        }
        if (getRoleCnt("딜") >= 2) {
          tbf(_0x55e037, "공퍼증", -350, "<운명 간섭>", always);
        }
        if (getRoleCnt("탱") >= 2) {
          tbf(_0x55e037, "공퍼증", -350, "<운명 간섭>", always);
        }
        if (getRoleCnt("힐") >= 2) {
          tbf(_0x55e037, "공퍼증", -350, "<운명 간섭>", always);
        }
        if (getRoleCnt("섶") >= 2) {
          tbf(_0x55e037, "공퍼증", -350, "<운명 간섭>", always);
        }
        if (getRoleCnt("디") >= 2) {
          tbf(_0x55e037, "공퍼증", -350, "<운명 간섭>", always);
        }
      };
      _0x55e037.passive = function () {
        atbf(_0x55e037, "궁", all, "공고증", myCurAtk + _0x55e037.id + 30, "길흉을 가리다", 1, always);
        anbf(_0x55e037, "방", _0x55e037, "공퍼증", 30, "운명의 그물1", 1, 3, always);
        tbf(_0x55e037, "공퍼증", 10, "공격+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {
          if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 4 == 0) {
            for (let _0x584b7c of getElementIdx("화", "수", "풍", "광", "암")) {
              tbf(comp[_0x584b7c], "받속뎀", 70, "고독한 점술사6", 2);
            }
          }
        }
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 4 == 0) {
          tbf(boss, "받뎀증", 25, "미래 선택", 2);
        }
        if (GLOBAL_TURN > 1) {
          tbf(all, "공고증", myCurAtk + _0x55e037.id + 5, "운명의 그물2", 1);
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10150:
      setMnc(_0x55e037, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            for (let _0xe1b3c of getElementIdx("광")) {
              nbf(comp[_0xe1b3c], "가뎀증", 10, "무한 666666", 1, 2);
            }
            break;
          case 2:
            for (let _0x148a86 of getElementIdx("광")) {
              nbf(comp[_0x148a86], "가뎀증", 10, "무한 666666", 1, 2);
            }
            break;
          case 3:
            for (let _0x4731d5 of getElementIdx("광")) {
              nbf(comp[_0x4731d5], "가뎀증", 15, "무한 666666", 1, 2);
            }
            break;
          case 4:
            for (let _0x2f1598 of getElementIdx("광")) {
              nbf(comp[_0x2f1598], "가뎀증", 15, "무한 666666", 1, 2);
            }
            break;
          default:
            for (let _0x5acbbb of getElementIdx("광")) {
              nbf(comp[_0x5acbbb], "가뎀증", 20, "무한 666666", 1, 2);
            }
            break;
        }
      };
      _0x55e037.ultafter = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(_0x55e037, "평추가*", 50, "무한 666666", 4);
            break;
          case 2:
            tbf(_0x55e037, "평추가*", 57, "무한 666666", 4);
            break;
          case 3:
            tbf(_0x55e037, "평추가*", 65, "무한 666666", 4);
            break;
          case 4:
            tbf(_0x55e037, "평추가*", 72, "무한 666666", 4);
            break;
          default:
            tbf(_0x55e037, "평추가*", 80, "무한 666666", 4);
            break;
        }
      };
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(40);
        tbf(all, "공퍼증", 80, "엔터테인먼트 시티의 용자 딜러1", always);
        if (getElementCnt("광") >= 4) {
          tbf(_0x55e037, "궁뎀증", 40, "<섹시 딜러의 서비스>1", always);
          tbf(_0x55e037, "궁추가*", 66.6, "<섹시 딜러의 서비스>2", always);
        }
        if (getElementCnt("광") >= 4) {
          for (let _0x1e2ad4 of getElementIdx("광")) {
            comp[_0x1e2ad4].canCDChange = false;
            tbf(comp[_0x1e2ad4], "속상감", 100, "<타짜 입장>0", always);
            tbf(comp[_0x1e2ad4], "가뎀증", 30, "<타짜 입장>1", always);
            tbf(comp[_0x1e2ad4], "일뎀증", 50, "<타짜 입장>2", always);
            tbf(comp[_0x1e2ad4], "평추가*", 18, "<타짜 입장>3", always);
            anbf(comp[_0x1e2ad4], "공격", boss, "받뎀증", 0.4, "<타짜 입장>4", 1, 50, always);
            for (let _0xfda6d2 of getElementIdx("광")) {
              anbf(comp[_0x1e2ad4], "공격", comp[_0xfda6d2], "받속뎀", 0.6, "<타짜 입장>5", 1, 50, always);
            }
          }
        }
      };
      _0x55e037.passive = function () {
        _0x55e037.canCDChange = false;
        tbf(_0x55e037, "공퍼증", 50, "날카로운 청각1", always);
        for (let _0x32efa9 of getElementIdx("광")) {
          tbf(comp[_0x32efa9], "공퍼증", 30, "날카로운 청각2", always);
        }
        tbf(_0x55e037, "일뎀증", 30, "용자의 가호1", always);
        for (let _0x4ba356 of getElementIdx("광")) {
          if (comp[_0x4ba356].id != _0x55e037.id) {
            atbf(_0x55e037, "평", comp[_0x4ba356], "일뎀증", 40, "용자의 가호2", 1, always);
          }
        }
        for (let _0x35933e of getElementIdx("광")) {
          if (comp[_0x35933e].id != _0x55e037.id) {
            atbf(comp[_0x35933e], "궁", _0x55e037, "가뎀증", 6.66, "<손은 눈보다 빠르다>1", 4, always);
            atbf(comp[_0x35933e], "궁", _0x55e037, "궁뎀증", 18, "<손은 눈보다 빠르다>2", 1, always);
            atbf(comp[_0x35933e], "궁", _0x55e037, "궁추가*", 25, "<손은 눈보다 빠르다>3", 1, always);
          }
        }
        tbf(_0x55e037, "가뎀증", 7.5, "가하는 데미지+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {
          if (getElementCnt("광") >= 4) {
            if (GLOBAL_TURN == 1 && boss.element != undefined && boss.element == 4) {
              for (let _0x85a894 of getElementIdx("광")) {
                tbf(comp[_0x85a894], "받속뎀", 50, "<섹시 딜러의 서비스>0", 50);
              }
            }
          }
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10151:
      setMnc(_0x55e037, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
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
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {
        tbf(all, "공퍼증", 50, "종업원의 분노", 1);
      };
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(40);
        tbf(all, "공퍼증", 40, "엔터테인먼트 시티의 마왕 경리1", always);
        for (let _0x1d184d of getRoleIdx("딜")) {
          comp[_0x1d184d].canCDChange = false;
        }
        const _0x43cd83 = getElKind();
        if (_0x43cd83 == 2) {
          for (let _0x4c9515 of getElementIdx("풍")) {
            nbf(all, "공퍼증", 25, "<이 몸은 운에 기대지 않아>1", 1, 3);
            nbf(all, "궁뎀증", 25, "<이 몸은 운에 기대지 않아>2", 1, 3);
            for (let _0x38f089 of getRoleIdx("딜")) {
              tbf(comp[_0x38f089], "궁추가*", 25, "<이 몸은 운에 기대지 않아>3", 50);
            }
          }
        }
        if (_0x43cd83 == 2) {
          for (let _0xca48fe of getElementIdx("광")) {
            nbf(all, "가뎀증", 15, "<압도적인 실력>1", 1, 3);
            nbf(all, "일뎀증", 35, "<압도적인 실력>2", 1, 3);
            for (let _0x58db5c of getRoleIdx("딜")) {
              tbf(comp[_0x58db5c], "평추가*", 20, "<압도적인 실력>3", 50);
            }
          }
        }
      };
      _0x55e037.passive = function () {
        _0x55e037.canCDChange = false;
        atbf(_0x55e037, "평", all, "일뎀증", 30, "무례한 녀석", 1, always);
        atbf(_0x55e037, "궁", all, "궁뎀증", 30, "꺼져!", 1, always);
        atbf(_0x55e037, "공격", all, "공고증", myCurAtk + _0x55e037.id + 30, "마왕의 절대 영역1", 1, always);
        for (let _0x41b733 of getRoleIdx("딜")) {
          atbf(comp[_0x41b733], "공격", all, "공고증", myCurAtk + comp[_0x41b733].id + 5, "마왕의 절대 영역2", 1, always);
        }
        tbf(_0x55e037, "공퍼증", 10, "공격+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10152:
      setMnc(_0x55e037, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(all, "가뎀증", 25, "밝은 달빛1", 4);
            nbf(_0x55e037, "공퍼증", 20, "밝은 달빛2", 1, 1);
            break;
          case 2:
            tbf(all, "가뎀증", 30, "밝은 달빛1", 4);
            nbf(_0x55e037, "공퍼증", 40, "밝은 달빛2", 1, 1);
            break;
          case 3:
            tbf(all, "가뎀증", 40, "밝은 달빛1", 4);
            nbf(_0x55e037, "공퍼증", 60, "밝은 달빛2", 1, 1);
            break;
          case 4:
            tbf(all, "가뎀증", 50, "밝은 달빛1", 4);
            nbf(_0x55e037, "공퍼증", 80, "밝은 달빛2", 1, 1);
            break;
          default:
            tbf(all, "가뎀증", 60, "밝은 달빛1", 4);
            nbf(_0x55e037, "공퍼증", 100, "밝은 달빛2", 1, 1);
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
        for (let _0x312665 of comp) {
          _0x312665.heal2();
        }
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
        for (let _0x1d8215 of comp) {
          _0x1d8215.heal();
        }
      };
      _0x55e037.leader = function () {
        hpUpAll(50);
        tbf(all, "받아증", -200, "선택받은 욕주1", always);
        const _0x32f19a = getElKind();
        if (_0x32f19a == 1 || _0x32f19a == 2) {
          tbf(all, "공퍼증", 75, "<영웅 소환>1", always);
          for (let _0x196e78 of getElementIdx("광", "암")) {
            anbf(all, "궁", comp[_0x196e78], "받속뎀", 3, "<영웅 소환>2", 1, 15, always);
          }
          tbf(all, "궁추가*", 200, "<영웅 소환>3", always);
          tbf(all, "평추가*", 100, "<영웅 소환>4", always);
        }
      };
      _0x55e037.passive = function () {
        atbf(_0x55e037, "궁", all, "공고증", myCurAtk + _0x55e037.id + 30, "성배 파편", 1, always);
        for (let _0x429ab9 of getElementIdx("광", "암")) {
          tbf(comp[_0x429ab9], "공퍼증", 40, "믿음직하고 성숙한 여성2", always);
        }
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10153:
      _0x55e037.stack = 0;
      buff_ex.push("<고급 할로윈 디저트 세트>");
      setMnc(_0x55e037, [0, 3, 0, 3, 0, 3, 0, 3, 0, 3], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            nbf(boss, "받뎀증", 15, "싹트는 살육 욕망1", 1, 2);
            for (let _0x224ea3 of getElementIdx("암")) {
              nbf(comp[_0x224ea3], "받속뎀", 5, "싹트는 살육 욕망2", 1, 2);
            }
            break;
          case 2:
            nbf(boss, "받뎀증", 20, "싹트는 살육 욕망1", 1, 2);
            for (let _0x1fddcf of getElementIdx("암")) {
              nbf(comp[_0x1fddcf], "받속뎀", 5, "싹트는 살육 욕망2", 1, 2);
            }
            break;
          case 3:
            nbf(boss, "받뎀증", 20, "싹트는 살육 욕망1", 1, 2);
            for (let _0x49c167 of getElementIdx("암")) {
              nbf(comp[_0x49c167], "받속뎀", 10, "싹트는 살육 욕망2", 1, 2);
            }
            break;
          case 4:
            nbf(boss, "받뎀증", 25, "싹트는 살육 욕망1", 1, 2);
            for (let _0x322e81 of getElementIdx("암")) {
              nbf(comp[_0x322e81], "받속뎀", 10, "싹트는 살육 욕망2", 1, 2);
            }
            break;
          default:
            nbf(boss, "받뎀증", 25, "싹트는 살육 욕망1", 1, 2);
            for (let _0x480d7d of getElementIdx("암")) {
              nbf(comp[_0x480d7d], "받속뎀", 15, "싹트는 살육 욕망2", 1, 2);
            }
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        if (getBuffSize(_0x55e037, "기본", "성배의 메아리") != 0) {
          for (let _0xa1d59b = 0; _0xa1d59b < _0x78c5e1 + 5; _0xa1d59b++) {
            tbf(_0x55e037, "궁발동*", 30, "성배의 메아리2", 1);
          }
        }
        setBuffSize(_0x55e037, "기본", "성배의 메아리", 0);
        ultLogic(_0x55e037);
        deleteBuff(_0x55e037, "기본", "성배의 메아리2");
        setBuffSize(_0x55e037, "기본", "성배의 메아리", (_0x78c5e1 + 5) * 30);
        setBuffNest(_0x55e037, "기본", "디저트 폭식", 0);
        _0x55e037.stack = 0;
        setBuffSize(_0x55e037, "기본", "디저트 폭식1", 0);
        setBuffOn(_0x55e037, "기본", "디저트 폭식2", false);
        setBuffOn(_0x55e037, "기본", "디저트 폭식3", false);
        setBuffOn(_0x55e037, "기본", "디저트 폭식4", false);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
        setBuffNest(_0x55e037, "기본", "디저트 폭식", 0);
        _0x55e037.stack = 0;
        setBuffSize(_0x55e037, "기본", "디저트 폭식1", 0);
        setBuffOn(_0x55e037, "기본", "디저트 폭식2", false);
        setBuffOn(_0x55e037, "기본", "디저트 폭식3", false);
        setBuffOn(_0x55e037, "기본", "디저트 폭식4", false);
      };
      _0x55e037.leader = function () {
        hpUpAll(40);
        tbf(all, "공퍼증", 50, "귀엽고 위험한 사신", always);
        if (getElementCnt("암") >= 4) {
          tbf(_0x55e037, "공퍼증", 100, "<달콤살벌한 살의>1", always);
          tbf(_0x55e037, "가뎀증", 50, "<달콤살벌한 살의>2", always);
          for (let _0x347e67 of getElementIdx("암")) {
            anbf(_0x55e037, "피격", comp[_0x347e67], "받속뎀", 5, "<달콤살벌한 살의>3", 1, 10, always);
          }
        }
        if (getElementCnt("암") >= 4) {
          for (let _0x223f29 of comp) {
            if (_0x223f29.id != _0x55e037.id) {
              tbf(_0x223f29, "공발동*", 20, "<살육을 즐기자>1", always);
            }
          }
        }
      };
      _0x55e037.passive = function () {
        tbf(_0x55e037, "궁발동*", 0, "성배의 메아리", always);
        for (let _0x28bf77 of comp) {
          if (_0x28bf77.id != _0x55e037.id) {
            anbf(_0x28bf77, "피격", _0x55e037, "<고급 할로윈 디저트 세트>", 0, "디저트 폭식", 1, 6, always);
            const _0x4fe4f0 = _0x28bf77.hit;
            _0x28bf77.hit = function (..._0x22c0b1) {
              _0x4fe4f0.apply(this, _0x22c0b1);
              _0x55e037.stack++;
              if (_0x55e037.stack > 6) {
                _0x55e037.stack = 6;
              }
              setBuffSize(_0x55e037, "기본", "디저트 폭식1", _0x55e037.stack * 10);
              setBuffOn(_0x55e037, "기본", "디저트 폭식2", _0x55e037.stack >= 2);
              setBuffOn(_0x55e037, "기본", "디저트 폭식3", _0x55e037.stack >= 4);
              setBuffOn(_0x55e037, "기본", "디저트 폭식4", _0x55e037.stack >= 6);
            };
          }
        }
        tbf(_0x55e037, "평발동*", 0, "디저트 폭식1", always);
        buff(_0x55e037, "발효증", 50, "디저트 폭식2", always, false);
        buff(_0x55e037, "공퍼증", 40, "디저트 폭식3", always, false);
        buff(_0x55e037, "가뎀증", 30, "디저트 폭식4", always, false);
        for (let _0x4d1aba of comp) {
          if (_0x4d1aba.id != _0x55e037.id) {
            const _0x516cea = _0x4d1aba.attack;
            _0x4d1aba.attack = function (..._0x27b85e) {
              _0x516cea.apply(this, _0x27b85e);
              _0x4d1aba.hit();
            };
            const _0x1a0744 = _0x4d1aba.ultimate;
            _0x4d1aba.ultimate = function (..._0x57ba9b) {
              _0x1a0744.apply(this, _0x57ba9b);
              _0x4d1aba.hit();
            };
          }
        }
        tbf(_0x55e037, "발효증", 30, "트리거+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
        setBuffNest(_0x55e037, "기본", "디저트 폭식", 0);
        _0x55e037.stack = 0;
        setBuffSize(_0x55e037, "기본", "디저트 폭식1", 0);
        setBuffOn(_0x55e037, "기본", "디저트 폭식2", false);
        setBuffOn(_0x55e037, "기본", "디저트 폭식3", false);
        setBuffOn(_0x55e037, "기본", "디저트 폭식4", false);
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {
          if (getElementCnt("암") >= 4 && GLOBAL_TURN > 1) {
            nbf(_0x55e037, "<고급 할로윈 디저트 세트>", 0, "디저트 폭식", 2, 6);
            _0x55e037.stack += 2;
            if (_0x55e037.stack > 6) {
              _0x55e037.stack = 6;
            }
            setBuffSize(_0x55e037, "기본", "디저트 폭식1", _0x55e037.stack * 10);
            setBuffOn(_0x55e037, "기본", "디저트 폭식2", _0x55e037.stack >= 2);
            setBuffOn(_0x55e037, "기본", "디저트 폭식3", _0x55e037.stack >= 4);
            setBuffOn(_0x55e037, "기본", "디저트 폭식4", _0x55e037.stack >= 6);
          }
        }
        if (GLOBAL_TURN == 1) {
          cdChange(_0x55e037, -3);
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10154:
      setMnc(_0x55e037, [265, 3, 298, 3, 331, 3, 364, 3, 397, 3], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            for (let _0x3d7d49 of getElementIdx("수")) {
              if (comp[_0x3d7d49].id != _0x55e037.id) {
                tbf(comp[_0x3d7d49], "궁추가*", 80, "러브 메이드의 모에모에 빔", 1);
              }
            }
            break;
          case 2:
            for (let _0x35b4dc of getElementIdx("수")) {
              if (comp[_0x35b4dc].id != _0x55e037.id) {
                tbf(comp[_0x35b4dc], "궁추가*", 90, "러브 메이드의 모에모에 빔", 1);
              }
            }
            break;
          case 3:
            for (let _0x23030f of getElementIdx("수")) {
              if (comp[_0x23030f].id != _0x55e037.id) {
                tbf(comp[_0x23030f], "궁추가*", 100, "러브 메이드의 모에모에 빔", 1);
              }
            }
            break;
          case 4:
            for (let _0x5de5dd of getElementIdx("수")) {
              if (comp[_0x5de5dd].id != _0x55e037.id) {
                tbf(comp[_0x5de5dd], "궁추가*", 110, "러브 메이드의 모에모에 빔", 1);
              }
            }
            break;
          default:
            for (let _0x2b941a of getElementIdx("수")) {
              if (comp[_0x2b941a].id != _0x55e037.id) {
                tbf(comp[_0x2b941a], "궁추가*", 120, "러브 메이드의 모에모에 빔", 1);
              }
            }
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(40);
        tbf(all, "공퍼증", 50, "☆스타라이트 걸☆", always);
      };
      _0x55e037.passive = function () {
        for (let _0x2b5c30 of getElementIdx("수")) {
          anbf(_0x55e037, "궁", comp[_0x2b5c30], "받속뎀", 7.5, "비밀 개조 마도 전투복", 1, 4, always);
        }
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
        if ((GLOBAL_TURN - 1) % 3 == 0) {
          cdChange(_0x55e037, 3);
        }
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader && GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 3 == 0) {
          if (getElementCnt("수") >= 4) {
            _0x3f9627();
          }
          if (getRoKind() == 4) {
            _0x3f9627();
          }
          if (getRoleCnt("딜") >= 1) {
            _0x3f9627();
          }
          if (getRoleCnt("섶") >= 1) {
            _0x3f9627();
          }
          function _0x3f9627() {
            tbf(all, "공퍼증", 15, "<유성처럼 추락>1", 1);
            tbf(all, "가뎀증", 10, "<유성처럼 추락>2", 1);
            tbf(all, "궁뎀증", 12.5, "<유성처럼 추락>3", 1);
            tbf(all, "궁추가*", 10, "<유성처럼 추락>4", 1);
            tbf(boss, "받뎀증", 10, "<유성처럼 추락>5", 1);
          }
        }
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 3 == 0) {
          tbf(all, "궁뎀증", 50, "<너만의 아이돌>1", 1);
          for (let _0x49d93a of getElementIdx("수")) {
            tbf(comp[_0x49d93a], "공퍼증", 120, "두근두근♡사랑 시작의 신호1", 1);
          }
          for (let _0x305738 of getElementIdx("수")) {
            tbf(comp[_0x305738], "가뎀증", 60, "두근두근♡사랑 시작의 신호2", 1);
          }
        }
        if (GLOBAL_TURN == 1) {
          cdChange(_0x55e037, -3);
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10155:
      setMnc(_0x55e037, [0, 3, 0, 3, 0, 3, 0, 3, 0, 3], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(_0x55e037, "공퍼증", 100, "정확히 후두부 가격1", 1);
            tbf(_0x55e037, "발효증", 100, "정확히 후두부 가격2", 3);
            tbf(boss, "받발뎀", 60, "정확히 후두부 가격3", 3);
            break;
          case 2:
            tbf(_0x55e037, "공퍼증", 125, "정확히 후두부 가격1", 1);
            tbf(_0x55e037, "발효증", 150, "정확히 후두부 가격2", 3);
            tbf(boss, "받발뎀", 70, "정확히 후두부 가격3", 3);
            break;
          case 3:
            tbf(_0x55e037, "공퍼증", 150, "정확히 후두부 가격1", 1);
            tbf(_0x55e037, "발효증", 200, "정확히 후두부 가격2", 3);
            tbf(boss, "받발뎀", 80, "정확히 후두부 가격3", 3);
            break;
          case 4:
            tbf(_0x55e037, "공퍼증", 175, "정확히 후두부 가격1", 1);
            tbf(_0x55e037, "발효증", 250, "정확히 후두부 가격2", 3);
            tbf(boss, "받발뎀", 90, "정확히 후두부 가격3", 3);
            break;
          default:
            tbf(_0x55e037, "공퍼증", 200, "정확히 후두부 가격1", 1);
            tbf(_0x55e037, "발효증", 300, "정확히 후두부 가격2", 3);
            tbf(boss, "받발뎀", 100, "정확히 후두부 가격3", 3);
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {
        tbf(_0x55e037, "공퍼증", 100, "케첩 짜기", 1);
      };
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(30);
        if (getElKind() == 1) {
          tbf(all, "공퍼증", 70, "<유머 대결>1", always);
          tbf(all, "가뎀증", 30, "<유머 대결>2", always);
          tbf(all, "공발동*", 40, "<유머 대결>3", always);
        }
      };
      _0x55e037.passive = function () {
        tbf(_0x55e037, "평발동*", 100, "간단한 메이드 잡기술", always);
        tbf(all, "공퍼증", 30, "신형 마도포1", always);
        tbf(_0x55e037, "궁발동*", 300, "신형 마도포2", always);
        tbf(_0x55e037, "가뎀증", 30, "넘어지기 스킬1", always);
        tbf(_0x55e037, "방발동*", 50, "넘어지기 스킬2", always);
        tbf(_0x55e037, "공퍼증", 10, "공격+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader && GLOBAL_TURN == 10) {
          if (getElKind() == 1) {
            for (let _0x3e222c of getElementIdx("화")) {
              nbf(comp[_0x3e222c], "받속뎀", 10, "<유머 대결>4", getElementCnt("화"), 5);
            }
          }
        }
        if (GLOBAL_TURN == 7) {
          nbf(_0x55e037, "궁뎀증", 100, "넘어지기 스킬3", 1, 1);
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10156:
      setMnc(_0x55e037, [388, 4, 446, 4, 502, 4, 560, 4, 618, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            nbf(boss, "받뎀증", 10, "달링~ 사줘~1", 1, 1);
            for (let _0x40d2fd of getElementIdx("화")) {
              nbf(comp[_0x40d2fd], "받속뎀", 20, "달링~ 사줘~2", 1, 1);
            }
            break;
          case 2:
            nbf(boss, "받뎀증", 20, "달링~ 사줘~1", 1, 1);
            for (let _0x332a86 of getElementIdx("화")) {
              nbf(comp[_0x332a86], "받속뎀", 25, "달링~ 사줘~2", 1, 1);
            }
            break;
          case 3:
            nbf(boss, "받뎀증", 30, "달링~ 사줘~1", 1, 1);
            for (let _0x32a9eb of getElementIdx("화")) {
              nbf(comp[_0x32a9eb], "받속뎀", 30, "달링~ 사줘~2", 1, 1);
            }
            break;
          case 4:
            nbf(boss, "받뎀증", 40, "달링~ 사줘~1", 1, 1);
            for (let _0xf1201d of getElementIdx("화")) {
              nbf(comp[_0xf1201d], "받속뎀", 35, "달링~ 사줘~2", 1, 1);
            }
            break;
          default:
            nbf(boss, "받뎀증", 60, "달링~ 사줘~1", 1, 1);
            for (let _0x161791 of getElementIdx("화")) {
              nbf(comp[_0x161791], "받속뎀", 40, "달링~ 사줘~2", 1, 1);
            }
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037, 2);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(40);
        if (getRoleCnt("딜") >= 3) {
          tbf(all, "공퍼증", 80, "<비즈니스 기회!>1", always);
          tbf(all, "궁추가*", 100, "<비즈니스 기회!>3", always);
        }
      };
      _0x55e037.passive = function () {
        anbf(_0x55e037, "궁", _0x55e037, "공퍼증", 60, "아양 좀 떨어도 괜잖겠지?1", 1, 3, always);
        if (getElementCnt("화") >= 3) {
          tbf(_0x55e037, "공퍼증", -180, "아양 좀 떨어도 괜잖겠지?2", always);
        }
        anbf(_0x55e037, "궁", _0x55e037, "가뎀증", 30, "제멋대로인 여친이 네 마음을 점령~1", 1, 3, always);
        if (getElementCnt("화") >= 3) {
          tbf(_0x55e037, "가뎀증", -90, "제멋대로인 여친이 네 마음을 점령~2", always);
        }
        anbf(_0x55e037, "궁", _0x55e037, "궁뎀증", 50, "필승 크리스마스 전략1", 1, 3, always);
        if (getElementCnt("화") >= 3) {
          tbf(_0x55e037, "궁뎀증", -150, "필승 크리스마스 전략2", always);
        }
        tbf(_0x55e037, "공퍼증", 10, "공격+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {
          if (getRoleCnt("딜") >= 3 && GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 4 == 0) {
            for (let _0x33b751 of getRoleIdx("딜")) {
              tbf(comp[_0x33b751], "받직뎀", 150, "<비즈니스 기회!>2", 1);
            }
          }
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10157:
      buff_ex.push("<순진한 소원>");
      setMnc(_0x55e037, [0, 1, 0, 1, 0, 1, 0, 1, 0, 1], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(all, "공고증", myCurAtk + _0x55e037.id + 30, "섹스마스의 예찬2", 1);
            break;
          case 2:
            tbf(all, "공고증", myCurAtk + _0x55e037.id + 30, "섹스마스의 예찬2", 1);
            break;
          case 3:
            tbf(all, "공고증", myCurAtk + _0x55e037.id + 30, "섹스마스의 예찬2", 1);
            break;
          case 4:
            tbf(all, "공고증", myCurAtk + _0x55e037.id + 30, "섹스마스의 예찬2", 1);
            break;
          default:
            tbf(all, "공고증", myCurAtk + _0x55e037.id + 30, "섹스마스의 예찬2", 1);
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
        if (_0x55e037.getNest("<순진한 소원>") == 0) {
          nbf(_0x55e037, "<순진한 소원>", 0, "섹스마스의 예찬1", _0x78c5e1 + 5, 10);
          setBuffOn(_0x55e037, "발동", "<정해진 운명>1", true);
          setBuffOn(_0x55e037, "발동", "<정해진 운명>2", true);
          setBuffOn(_0x55e037, "발동", "<정해진 운명>3", true);
          setBuffOnAll(_0x55e037, "발동", "마음에 사랑이 깃든다면1", true);
          setBuffOnAll(_0x55e037, "발동", "마음에 사랑이 깃든다면2", true);
          setBuffOn(_0x55e037, "발동", "<가장 아름다운 밤>1", true);
          setBuffOn(_0x55e037, "발동", "<가장 아름다운 밤>2", true);
        }
      };
      _0x55e037.atkbefore = function () {
        tbf(all, "공고증", myCurAtk + _0x55e037.id + 30, "크리스마스의 환희", 1);
      };
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(40);
        tbf(all, "공퍼증", 100, "크리스마스의 핫걸 무엘라1", always);
        tbf(all, "평추가*", 15, "크리스마스의 핫걸 무엘라2", always);
        tbf(all, "궁추가*", 30, "크리스마스의 핫걸 무엘라3", always);
        buff(_0x55e037, "공격", all, "가뎀증", 0.75, "<정해진 운명>1", _0x78c5e1 + 5, 80, always, "발동", false);
        buff(_0x55e037, "공격", boss, "받뎀증", 0.25, "<정해진 운명>2", _0x78c5e1 + 5, 80, always, "발동", false);
        buff(_0x55e037, "공격", all, "받속뎀", 0.25, "<정해진 운명>3", _0x78c5e1 + 5, 80, always, "발동", false);
      };
      _0x55e037.passive = function () {
        for (let _0x31e502 of comp) {
          atbf(_0x31e502, "평", _0x31e502, "제거", "기본", "마음에 사랑이 깃든다면1", 1, always);
          atbf(_0x31e502, "궁", _0x31e502, "제거", "기본", "마음에 사랑이 깃든다면2", 1, always);
        }
        buff(_0x55e037, "평", all, "일뎀증", 8, "마음에 사랑이 깃든다면1", _0x78c5e1 + 5, 20, always, "발동", false);
        buff(_0x55e037, "궁", all, "궁뎀증", 1.25, "마음에 사랑이 깃든다면2", _0x78c5e1 + 5, 50, always, "발동", false);
        buff(_0x55e037, "공격", boss, "받뎀증", 0.25, "<가장 아름다운 밤>1", _0x78c5e1 + 5, 80, always, "발동", false);
        buff(_0x55e037, "공격", all, "받속뎀", 0.25, "<가장 아름다운 밤>2", _0x78c5e1 + 5, 80, always, "발동", false);
        tbf(_0x55e037, "공퍼증", 10, "공격+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
        if (GLOBAL_TURN == 1) {
          cdChange(_0x55e037, -1);
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10158:
      buff_ex.push("<절묘한 비책>");
      setMnc(_0x55e037, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
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
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
        for (let _0x2f50f6 of comp) {
          if (_0x2f50f6.id != _0x55e037.id) {
            _0x55e037.tmpfunc(_0x2f50f6, 0);
          }
        }
        for (let _0x15d543 of comp) {
          if (_0x15d543.id != _0x55e037.id) {
            anbf(_0x15d543, "공격", _0x15d543, "<절묘한 비책>", 0, "<절묘한 비책>", 3, 3, 1);
            for (let _0x2edb29 of comp) {
              if (_0x2edb29.id != _0x15d543.id && _0x2edb29.id != _0x55e037.id) {
                atbf(_0x15d543, "공격", _0x2edb29, "제거", "발동", "<절묘한 비책>", 1, 1);
              }
            }
          }
        }
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(40);
        if (getElKind() == 5) {
          tbf(all, "공퍼증", 50, "<결승천리지외>1", always);
          tbf(all, "가뎀증", 80, "<결승천리지외>2", always);
          anbf(all, "공격", boss, "받뎀증", 1, "<결승천리지외>3", 1, 50, always);
          tbf(all, "평추가*", 100, "<결승천리지외>4", always);
          tbf(all, "궁추가*", 130, "<결승천리지외>5", always);
        }
      };
      _0x55e037.tmpfunc = function (_0x506482, _0x41bcc6 = undefined) {
        const _0x3ef19c = _0x41bcc6 || _0x506482.getNest("<절묘한 비책>");
        setBuffOnExtra(_0x506482, "피격", "발동", "<신묘한 계략>", _0x3ef19c == 3);
        setBuffOnExtra(_0x506482, "피격", "발동", "<절묘한 비책>", _0x3ef19c == 3);
        setBuffOn(_0x506482, "기본", "<제2계-옹중착별>", _0x3ef19c == 2);
        setBuffOnExtra(_0x506482, "궁", "발동", "<신묘한 계략>", _0x3ef19c == 2);
        setBuffOnExtra(_0x506482, "궁", "발동", "<절묘한 비책>", _0x3ef19c == 2);
        setBuffOnExtra(_0x506482, "궁", "발동", "<제2계-옹중착별>", _0x3ef19c == 2);
        setBuffOn(_0x506482, "기본", "<제3계-천승추격>", _0x3ef19c == 1);
        setBuffOnExtra(_0x506482, "평", "발동", "<신묘한 계략>", _0x3ef19c == 1);
        setBuffOnExtra(_0x506482, "평", "발동", "<절묘한 비책>", _0x3ef19c == 1);
        setBuffOnExtra(_0x506482, "평", "발동", "<제3계-천승추격>", _0x3ef19c == 1);
        setBuffOnExtra(_0x506482, "평", "발동", "계략 총동원", _0x3ef19c == 1);
        setBuffOn(_0x506482, "기본", "계략 총동원", _0x3ef19c >= 1);
      };
      _0x55e037.passive = function () {
        for (let _0x40cf4c of comp) {
          if (_0x40cf4c.id != _0x55e037.id) {
            anbf(_0x55e037, "궁", _0x40cf4c, "<절묘한 비책>", 0, "<절묘한 비책>", -3, 3, always);
          }
        }
        for (let _0x233e03 of comp) {
          if (_0x233e03.id != _0x55e037.id) {
            buff(_0x233e03, "피격", boss, "받뎀증", 5, "<신묘한 계략>", 1, 6, always, "발동", false);
            buff(_0x233e03, "피격", _0x233e03, "<절묘한 비책>", 0, "<절묘한 비책>", -1, 3, always, "발동", false);
            buff(_0x233e03, "궁뎀증", 30, "<제2계-옹중착별>", always, false);
            buff(_0x233e03, "궁", boss, "받뎀증", 5, "<신묘한 계략>", 1, 6, always, "발동", false);
            buff(_0x233e03, "궁", _0x233e03, "<절묘한 비책>", 0, "<절묘한 비책>", -1, 3, always, "발동", false);
            buff(_0x233e03, "궁", _0x233e03, "off", "기본", "<제2계-옹중착별>", 1, always, "발동", false);
            buff(_0x233e03, "일뎀증", 60, "<제3계-천승추격>", always, false);
            buff(_0x233e03, "평", boss, "받뎀증", 5, "<신묘한 계략>", 1, 6, always, "발동", false);
            buff(_0x233e03, "평", _0x233e03, "<절묘한 비책>", 0, "<절묘한 비책>", -1, 3, always, "발동", false);
            buff(_0x233e03, "평", _0x233e03, "off", "기본", "<제3계-천승추격>", 1, always, "발동", false);
            buff(_0x233e03, "평", _0x233e03, "off", "기본", "계략 총동원", 1, always, "발동", false);
            const _0x529d9d = _0x233e03.attack;
            const _0x232ecf = _0x233e03.ultimate;
            const _0x41be0b = _0x233e03.hit;
            _0x233e03.attack = function (..._0x2791f4) {
              _0x529d9d.apply(this, _0x2791f4);
              _0x55e037.tmpfunc(_0x233e03);
            };
            _0x233e03.ultimate = function (..._0xcea625) {
              _0x232ecf.apply(this, _0xcea625);
              _0x55e037.tmpfunc(_0x233e03);
            };
            _0x233e03.hit = function (..._0x32fec6) {
              _0x41be0b.apply(this, _0x32fec6);
              _0x55e037.tmpfunc(_0x233e03);
            };
          }
        }
        for (let _0x11ad25 of comp) {
          if (_0x11ad25.id != _0x55e037.id) {
            buff(_0x11ad25, "가뎀증", 20, "계략 총동원", always, false);
          }
        }
        tbf(_0x55e037, "공퍼증", 10, "공격+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
        if (GLOBAL_TURN == 1) {
          cdChange(_0x55e037, -1);
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10175:
      setMnc(_0x55e037, [0, 3, 0, 3, 0, 3, 0, 3, 0, 3], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
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
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {
        tbf(all, "공퍼증", 40, "3연발 눈덩이 공격!3", 1);
      };
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(40);
        for (let _0x36f18d of getElementIdx("수", "암")) {
          tbf(comp[_0x36f18d], "공퍼증", 100, "겨울 놀이 마스터", always);
        }
      };
      _0x55e037.passive = function () {
        tbf(_0x55e037, "공퍼증", 40, "설녀의 진짜 실력", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {
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
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10159:
      setMnc(_0x55e037, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            nbf(_0x55e037, "공퍼증", 10, "섹스의 해가 다가왔습니다~1", 1, 4);
            tbf(all, "공고증", myCurAtk + _0x55e037.id + 30, "섹스의 해가 다가왔습니다~2", 1);
            tbf(all, "가뎀증", 10, "섹스의 해가 다가왔습니다~3", 4);
            break;
          case 2:
            nbf(_0x55e037, "공퍼증", 12.5, "섹스의 해가 다가왔습니다~1", 1, 4);
            tbf(all, "공고증", myCurAtk + _0x55e037.id + 30, "섹스의 해가 다가왔습니다~2", 1);
            tbf(all, "가뎀증", 15, "섹스의 해가 다가왔습니다~3", 4);
            break;
          case 3:
            nbf(_0x55e037, "공퍼증", 15, "섹스의 해가 다가왔습니다~1", 1, 4);
            tbf(all, "공고증", myCurAtk + _0x55e037.id + 30, "섹스의 해가 다가왔습니다~2", 1);
            tbf(all, "가뎀증", 20, "섹스의 해가 다가왔습니다~3", 4);
            break;
          case 4:
            nbf(_0x55e037, "공퍼증", 20, "섹스의 해가 다가왔습니다~1", 1, 4);
            tbf(all, "공고증", myCurAtk + _0x55e037.id + 30, "섹스의 해가 다가왔습니다~2", 1);
            tbf(all, "가뎀증", 25, "섹스의 해가 다가왔습니다~3", 4);
            break;
          default:
            nbf(_0x55e037, "공퍼증", 25, "섹스의 해가 다가왔습니다~1", 1, 4);
            tbf(all, "공고증", myCurAtk + _0x55e037.id + 30, "섹스의 해가 다가왔습니다~2", 1);
            tbf(all, "가뎀증", 30, "섹스의 해가 다가왔습니다~3", 4);
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {
        tbf(all, "공고증", myCurAtk + _0x55e037.id + 30, "성수 뿌리기", 1);
      };
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(50);
        if (getElKind() == 2) {
          tbf(all, "공퍼증", 80, "<음춘 대회>1", always);
          tbf(all, "가뎀증", 30, "<음춘 대회>2", always);
          tbf(all, "궁뎀증", 70, "<음춘 대회>3", always);
          for (let _0x821021 of getElementIdx("수", "암")) {
            anbf(all, "궁", comp[_0x821021], "받속뎀", 4, "<음춘 대회>4", 1, 12, always);
          }
        }
        for (let _0x13be63 of getRoleIdx("힐")) {}
      };
      _0x55e037.passive = function () {
        for (let _0x4551aa of getElementIdx("수", "암")) {
          if (comp[_0x4551aa].role == 0 || comp[_0x4551aa].role == 4) {
            anbf(comp[_0x4551aa], "궁", boss, "받뎀증", 5, "<오르가즘의 빛>", 1, 6, always);
          }
        }
        for (let _0x477d71 of getElementIdx("수", "암")) {
          anbf(_0x55e037, "궁", comp[_0x477d71], "받속뎀", 12, "81회 오르가즘", 1, 3, always);
        }
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10161:
      setMnc(_0x55e037, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        deleteBuff(boss, "기본", "삼매룡화3");
        switch (_0x78c5e1) {
          case 1:
            nbf(boss, "받뎀증", 15, "삼매룡화1", 1, 2);
            tbf(_0x55e037, "공고증", myCurAtk + _0x55e037.id + 30, "삼매룡화2", 1);
            tbf(boss, "도트뎀", myCurAtk + _0x55e037.id + 210, "삼매룡화3", 4);
            break;
          case 2:
            nbf(boss, "받뎀증", 17.5, "삼매룡화1", 1, 2);
            tbf(_0x55e037, "공고증", myCurAtk + _0x55e037.id + 35, "삼매룡화2", 1);
            tbf(boss, "도트뎀", myCurAtk + _0x55e037.id + 245, "삼매룡화3", 4);
            break;
          case 3:
            nbf(boss, "받뎀증", 20, "삼매룡화1", 1, 2);
            tbf(_0x55e037, "공고증", myCurAtk + _0x55e037.id + 40, "삼매룡화2", 1);
            tbf(boss, "도트뎀", myCurAtk + _0x55e037.id + 280, "삼매룡화3", 4);
            break;
          case 4:
            nbf(boss, "받뎀증", 22.5, "삼매룡화1", 1, 2);
            tbf(_0x55e037, "공고증", myCurAtk + _0x55e037.id + 45, "삼매룡화2", 1);
            tbf(boss, "도트뎀", myCurAtk + _0x55e037.id + 315, "삼매룡화3", 4);
            break;
          default:
            nbf(boss, "받뎀증", 25, "삼매룡화1", 1, 2);
            tbf(_0x55e037, "공고증", myCurAtk + _0x55e037.id + 50, "삼매룡화2", 1);
            tbf(boss, "도트뎀", myCurAtk + _0x55e037.id + 350, "삼매룡화3", 4);
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(40);
        tbf(all, "공퍼증", 100, "진룡의 화신1", always);
        tbf(all, "가뎀증", -200, "진룡의 화신2", always);
      };
      _0x55e037.passive = function () {
        tbf(_0x55e037, "공퍼증", 100, "인룡혼혈", always);
        atbf(_0x55e037, "평", boss, "도트뎀", myCurAtk + _0x55e037.id + 50, "타오르는 몸1", 4, always);
        tbf(_0x55e037, "가지증", 150, "타오르는 몸2", always);
        anbf(_0x55e037, "공격", boss, "받뎀증", 2, "<고온탄화>1", 1, 10, always);
        anbf(_0x55e037, "공격", boss, "받일뎀", 12, "<고온탄화>2", 1, 10, always);
        tbf(_0x55e037, "공퍼증", 10, "공격+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {
          if (GLOBAL_TURN == 1) {
            tbf(boss, "받지뎀", 200, "<화염산 점화>1", 50);
            tbf(boss, "받뎀증", 100, "<화염산 점화>2", 50);
          }
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10162:
      _0x55e037.stack = 0;
      buff_ex.push("<시저 대명신의 가호>");
      setMnc(_0x55e037, [0, 4, 0, 5, 0, 6, 0, 7, 0, 8], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            nbf(_0x55e037, "<시저 대명신의 가호>", 0, "천지창조!1", 3, 7);
            _0x55e037.stack += 3;
            if (_0x55e037.stack > 7) {
              _0x55e037.stack = 7;
            }
            nbf(_0x55e037, "가뎀증", 35, "천지창조!2", 1, 1);
            break;
          case 2:
            nbf(_0x55e037, "<시저 대명신의 가호>", 0, "천지창조!1", 4, 7);
            _0x55e037.stack += 4;
            if (_0x55e037.stack > 7) {
              _0x55e037.stack = 7;
            }
            nbf(_0x55e037, "가뎀증", 45, "천지창조!2", 1, 1);
            break;
          case 3:
            nbf(_0x55e037, "<시저 대명신의 가호>", 0, "천지창조!1", 5, 7);
            _0x55e037.stack += 5;
            if (_0x55e037.stack > 7) {
              _0x55e037.stack = 7;
            }
            nbf(_0x55e037, "가뎀증", 55, "천지창조!2", 1, 1);
            break;
          case 4:
            nbf(_0x55e037, "<시저 대명신의 가호>", 0, "천지창조!1", 6, 7);
            _0x55e037.stack += 6;
            if (_0x55e037.stack > 7) {
              _0x55e037.stack = 7;
            }
            nbf(_0x55e037, "가뎀증", 65, "천지창조!2", 1, 1);
            break;
          default:
            nbf(_0x55e037, "<시저 대명신의 가호>", 0, "천지창조!1", 7, 7);
            _0x55e037.stack += 7;
            if (_0x55e037.stack > 7) {
              _0x55e037.stack = 7;
            }
            nbf(_0x55e037, "가뎀증", 75, "천지창조!2", 1, 1);
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
        setBuffOn(_0x55e037, "기본", "<정화 작업>1", true);
        setBuffOn(_0x55e037, "기본", "<정화 작업>2", true);
        setBuffOn(_0x55e037, "발동", "<시저 대현신>1", true);
        setBuffOnAll(_0x55e037, "발동", "<시저 대현신>2", true);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
        nbf(_0x55e037, "<시저 대명신의 가호>", 0, "천지창조!1", -1, 7);
        if (_0x55e037.stack == 3) {
          setBuffOn(_0x55e037, "발동", "<시저 대현신>1", false);
          setBuffOnAll(_0x55e037, "발동", "<시저 대현신>2", false);
        } else if (_0x55e037.stack == 1) {
          setBuffOn(_0x55e037, "기본", "<정화 작업>1", false);
          setBuffOn(_0x55e037, "기본", "<정화 작업>2", false);
        }
        _0x55e037.stack -= 1;
        if (_0x55e037.stack < 0) {
          _0x55e037.stack = 0;
        }
      };
      _0x55e037.leader = function () {
        hpUpAll(40);
        tbf(all, "공퍼증", 80, "시저 대명신의 무녀1", always);
        tbf(all, "가뎀증", 50, "시저 대명신의 무녀2", always);
        tbf(all, "일뎀증", 100, "시저 대명신의 무녀3", always);
        anbf(all, "평", boss, "받뎀증", 1.5, "시저 대명신의 무녀4", 1, 50, always);
        if (getRoleCnt("섶") >= 1) {
          tbf(all, "가뎀증", -500, "<이교 신앙>", always);
        }
      };
      _0x55e037.passive = function () {
        buff(_0x55e037, "일뎀증", 125, "<정화 작업>1", always, false);
        buff(_0x55e037, "평추가*", 150, "<정화 작업>2", always, false);
        buff(_0x55e037, "평", boss, "받뎀증", 3, "<시저 대현신>1", 1, 5, always, "발동", false);
        for (let _0x530cbf of getElementIdx("암")) {
          buff(_0x55e037, "평", comp[_0x530cbf], "받속뎀", 3, "<시저 대현신>2", 1, 5, always, "발동", false);
        }
        tbf(_0x55e037, "공퍼증", 10, "공격+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
        if (GLOBAL_TURN == 1) {
          cdChange(_0x55e037, -8);
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10163:
      _0x55e037.stack = 0;
      buff_ex.push("<마왕 분신>");
      setMnc(_0x55e037, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            nbf(_0x55e037, "가뎀증", 10, "오의·진마수리검1", 1, 1);
            nbf(all, "받속뎀", 15, "오의·진마수리검2", 1, 1);
            break;
          case 2:
            nbf(_0x55e037, "가뎀증", 23, "오의·진마수리검1", 1, 1);
            nbf(all, "받속뎀", 20, "오의·진마수리검2", 1, 1);
            break;
          case 3:
            nbf(_0x55e037, "가뎀증", 36, "오의·진마수리검1", 1, 1);
            nbf(all, "받속뎀", 25, "오의·진마수리검2", 1, 1);
            break;
          case 4:
            nbf(_0x55e037, "가뎀증", 49, "오의·진마수리검1", 1, 1);
            nbf(all, "받속뎀", 30, "오의·진마수리검2", 1, 1);
            break;
          default:
            nbf(_0x55e037, "가뎀증", 62, "오의·진마수리검1", 1, 1);
            nbf(all, "받속뎀", 35, "오의·진마수리검2", 1, 1);
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037, 2);
        _0x55e037.stack = 0;
        setBuffOn(_0x55e037, "기본", "인법·마왕분신술3", false);
        setBuffOn(_0x55e037, "기본", "인법·마왕분신술4", false);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(40);
        tbf(all, "공퍼증", 50, "마왕 비기·닌자전대결집1", always);
        for (let _0x1d1c38 of getRoleIdx("딜", "디")) {
          comp[_0x1d1c38].canCDChange = false;
          atbf(comp[_0x1d1c38], "방", all, "가뎀증", 20, "<닌자·참전!>1", 2, always);
          atbf(comp[_0x1d1c38], "방", comp[_0x1d1c38], "궁뎀증", 30, "<닌자·참전!>2", 2, always);
          atbf(comp[_0x1d1c38], "방", comp[_0x1d1c38], "공퍼증", 40, "<닌자·참전!>3", 2, always);
          tbf(comp[_0x1d1c38], "궁발동*", 55, "<닌자·참전!>4", always);
        }
      };
      _0x55e037.passive = function () {
        anbf(_0x55e037, "방", _0x55e037, "궁뎀증", 20, "인법·마왕분신술1", 1, 5, always);
        anbf(_0x55e037, "방", _0x55e037, "<마왕 분신>", 0, "<마왕 분신>", 1, 2, always);
        buff(_0x55e037, "궁발동*", 90, "인법·마왕분신술3", always, false);
        buff(_0x55e037, "궁발동*", 90, "인법·마왕분신술4", always, false);
        anbf(_0x55e037, "궁", _0x55e037, "<마왕 분신>", 0, "<마왕 분신>", -2, 2, always);
        for (let _0x27e4d8 of getRoleIdx("딜", "디")) {
          nbf(_0x55e037, "공퍼증", 50, "비기·삼라만상", 1, 3);
        }
        atbf(all, "방", boss, "받뎀증", 12, "비기·기운 차단!", 2, always);
        tbf(_0x55e037, "공퍼증", 10, "공격+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
        if (_0x55e037.stack == 0) {
          setBuffOn(_0x55e037, "기본", "인법·마왕분신술3", true);
        } else if (_0x55e037.stack == 1) {
          setBuffOn(_0x55e037, "기본", "인법·마왕분신술4", true);
        }
        _0x55e037.stack += 1;
        if (_0x55e037.stack > 2) {
          _0x55e037.stack = 2;
        }
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10164:
      setMnc(_0x55e037, [0, 3, 0, 3, 0, 3, 0, 3, 0, 3], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        deleteBuff(boss, "기본", "수줍은 정취1");
        switch (_0x78c5e1) {
          case 1:
            tbf(boss, "받발뎀", 60, "수줍은 정취1", 3);
            tbf(all, "공고증", myCurAtk + _0x55e037.id + 20, "수줍은 정취2", 1);
            tbf(_0x55e037, "반격*", 265, "수줍은 정취3", 3);
            break;
          case 2:
            tbf(boss, "받발뎀", 70, "수줍은 정취1", 3);
            tbf(all, "공고증", myCurAtk + _0x55e037.id + 22.5, "수줍은 정취2", 1);
            tbf(_0x55e037, "반격*", 298, "수줍은 정취3", 3);
            break;
          case 3:
            tbf(boss, "받발뎀", 80, "수줍은 정취1", 3);
            tbf(all, "공고증", myCurAtk + _0x55e037.id + 25, "수줍은 정취2", 1);
            tbf(_0x55e037, "반격*", 331, "수줍은 정취3", 3);
            break;
          case 4:
            tbf(boss, "받발뎀", 90, "수줍은 정취1", 3);
            tbf(all, "공고증", myCurAtk + _0x55e037.id + 27.5, "수줍은 정취2", 1);
            tbf(_0x55e037, "반격*", 364, "수줍은 정취3", 3);
            break;
          default:
            tbf(boss, "받발뎀", 100, "수줍은 정취1", 3);
            tbf(all, "공고증", myCurAtk + _0x55e037.id + 30, "수줍은 정취2", 1);
            tbf(_0x55e037, "반격*", 397, "수줍은 정취3", 3);
            break;
        }
        atbf(_0x55e037, "피격", _0x55e037, "제거", "기본", "수줍은 정취3", 1, 3);
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {
        tbf(all, "공고증", myCurAtk + _0x55e037.id + 15, "달빛 동행", 1);
      };
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(40);
        tbf(all, "공퍼증", 60, "님과 함께라면1", always);
        if (getElKind() == 2) {
          tbf(all, "가뎀증", 50, "<재색겸비>1", always);
          tbf(all, "발효증", 100, "<재색겸비>2", always);
          anbf(all, "피격", boss, "받뎀증", 0.8, "<재색겸비>3", 1, 50, always);
        }
      };
      _0x55e037.passive = function () {
        atbf(_0x55e037, "평", _0x55e037, "반격*", 100, "<가녀린 손>", 2, always);
        atbf(_0x55e037, "피격", _0x55e037, "제거", "기본", "<가녀린 손>", 1, always);
        atbf(_0x55e037, "방", all, "제거", "기본", "<백아의 미소>1", 1, always);
        atbf(_0x55e037, "방", all, "공퍼증", 50, "<백아의 미소>1", 3, always);
        tbf(_0x55e037, "공퍼증", 10, "공격+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 3 == 0) {
          for (let _0x42231a of getElementIdx("풍")) {
            atbf(_0x55e037, "피격", comp[_0x42231a], "받속뎀", 30, "<연꽃의 자태>", 5, 3);
            atbf(_0x55e037, "피격", comp[_0x42231a], "제거", "발동", "<연꽃의 자태>", 1, 3);
          }
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10165:
      setMnc(_0x55e037, [0, 8, 0, 8, 0, 8, 0, 8, 0, 8], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        deleteBuff(_0x55e037, "기본", "연심♡공명1");
        deleteBuff(_0x55e037, "기본", "연심♡공명2");
        deleteBuff(_0x55e037, "기본", "연심♡공명3");
        switch (_0x78c5e1) {
          case 1:
            tbf(_0x55e037, "공퍼증", 60, "연심♡공명1", 8);
            tbf(_0x55e037, "일뎀증", 60, "연심♡공명2", 8);
            tbf(_0x55e037, "가뎀증", 40, "연심♡공명3", 8);
            break;
          case 2:
            tbf(_0x55e037, "공퍼증", 70, "연심♡공명1", 8);
            tbf(_0x55e037, "일뎀증", 70, "연심♡공명2", 8);
            tbf(_0x55e037, "가뎀증", 45, "연심♡공명3", 8);
            break;
          case 3:
            tbf(_0x55e037, "공퍼증", 80, "연심♡공명1", 8);
            tbf(_0x55e037, "일뎀증", 80, "연심♡공명2", 8);
            tbf(_0x55e037, "가뎀증", 50, "연심♡공명3", 8);
            break;
          case 4:
            tbf(_0x55e037, "공퍼증", 90, "연심♡공명1", 8);
            tbf(_0x55e037, "일뎀증", 90, "연심♡공명2", 8);
            tbf(_0x55e037, "가뎀증", 55, "연심♡공명3", 8);
            break;
          default:
            tbf(_0x55e037, "공퍼증", 100, "연심♡공명1", 8);
            tbf(_0x55e037, "일뎀증", 100, "연심♡공명2", 8);
            tbf(_0x55e037, "가뎀증", 60, "연심♡공명3", 8);
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(40);
        tbf(all, "공퍼증", 50, "슈퍼 언리쉬", always);
        if (getElementCnt("화") >= 1) {
          tbf(_0x55e037, "공퍼증", 50, "<특화 무장α>1", always);
          for (let _0xb6cbb7 of getElementIdx("화", "풍")) {
            anbf(_0x55e037, "평", comp[_0xb6cbb7], "받속뎀", 4, "<특화 무장α>2", 1, 10, always);
          }
        }
        if (getElKind() == 2) {
          tbf(_0x55e037, "일뎀증", 100, "<특화 무장β>1", always);
          anbf(_0x55e037, "평", boss, "받뎀증", 4, "<특화 무장β>2", 1, 10, always);
        }
        if (getRoleCnt("딜") >= 3) {
          tbf(_0x55e037, "가뎀증", 35, "<특화 무장γ>1", always);
          tbf(_0x55e037, "평추가*", 20, "<특화 무장γ>2", always);
        }
      };
      _0x55e037.passive = function () {
        tbf(_0x55e037, "공퍼증", 30, "실버아울1", always);
        tbf(_0x55e037, "일뎀증", 60, "실버아울2", always);
        tbf(_0x55e037, "공퍼증", 70, "핑크 토네이도1", always);
        tbf(_0x55e037, "가뎀증", 25, "핑크 토네이도2", always);
        tbf(_0x55e037, "일뎀증", 10, "일반 공격 데미지+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 2 == 0) {
          for (let _0x3bb5dd = 1; _0x3bb5dd < 7; _0x3bb5dd++) {
            tbf(_0x55e037, "평추가*", 30, "<날개형 유도탄>" + _0x3bb5dd, 1);
          }
        }
        if (GLOBAL_TURN == 1) {
          cdChange(_0x55e037, -3);
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10166:
      setMnc(_0x55e037, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            nbf(_0x55e037, "공퍼증", 14, "곰돌이의 분노1", 1, 3);
            tbf(all, "궁뎀증", 36, "곰돌이의 분노2", 1);
            break;
          case 2:
            nbf(_0x55e037, "공퍼증", 16.5, "곰돌이의 분노1", 1, 3);
            tbf(all, "궁뎀증", 42, "곰돌이의 분노2", 1);
            break;
          case 3:
            nbf(_0x55e037, "공퍼증", 19, "곰돌이의 분노1", 1, 3);
            tbf(all, "궁뎀증", 48, "곰돌이의 분노2", 1);
            break;
          case 4:
            nbf(_0x55e037, "공퍼증", 21.5, "곰돌이의 분노1", 1, 3);
            tbf(all, "궁뎀증", 54, "곰돌이의 분노2", 1);
            break;
          default:
            nbf(_0x55e037, "공퍼증", 24, "곰돌이의 분노1", 1, 3);
            tbf(all, "궁뎀증", 60, "곰돌이의 분노2", 1);
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {
        tbf(all, "공고증", myCurAtk + _0x55e037.id + 30, "사탕 드세요~", 1);
      };
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(40);
        tbf(all, "공퍼증", 50, "폴라 베어ㆍ애니, 출격!1", always);
        tbf(all, "궁뎀증", 30, "폴라 베어ㆍ애니, 출격!2", always);
      };
      _0x55e037.passive = function () {
        atbf(_0x55e037, "궁", all, "가뎀증", 20, "곰돌이의 사랑", 1, always);
        atbf(_0x55e037, "평", all, "공퍼증", 20, "천재 암즈걸1", 2, always);
        atbf(_0x55e037, "방", all, "공퍼증", 10, "천재 암즈걸2", 2, always);
        atbf(_0x55e037, "궁", all, "공고증", myCurAtk + _0x55e037.id + 30, "천재 암즈걸3", 1, always);
        tbf(_0x55e037, "공퍼증", 10, "공격+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {
          if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 4 == 0) {
            for (let _0xcd1146 of getElementIdx("광", "암")) {
              if (getRoleIdx("딜", "디").includes(_0xcd1146)) {
                tbf(boss, "받뎀증", 20, "<백백의 과도한 서포트>1", 1);
                tbf(comp[_0xcd1146], "공퍼증", 80, "<백백의 과도한 서포트>2", 1);
                tbf(comp[_0xcd1146], "궁뎀증", 45, "<백백의 과도한 서포트>3", 1);
                tbf(comp[_0xcd1146], "가뎀증", 50, "<백백의 과도한 서포트>4", 1);
              }
            }
          }
        }
        if (GLOBAL_TURN == 1) {
          nbf(boss, "받궁뎀", 30, "백백 탐측기", 1, 1);
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10176:
      setMnc(_0x55e037, [0, 3, 0, 3, 165, 3, 211, 3, 257, 3], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
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
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        tbf(_0x55e037, "공퍼증", 100, "<콩코드 공격용 장갑>1", 1);
        tbf(_0x55e037, "일뎀증", 100, "<콩코드 공격용 장갑>2", 1);
        tbf(_0x55e037, "가뎀증", 50, "<콩코드 공격용 장갑>3", 1);
        tbf(_0x55e037, "평추가*", 100, "<콩코드 공격용 장갑>4", 1);
      };
      _0x55e037.passive = function () {
        tbf(_0x55e037, "공퍼증", 70, "성형 후 컴백1", always);
        tbf(_0x55e037, "일뎀증", 70, "성형 후 컴백2", always);
        tbf(_0x55e037, "궁뎀증", 30, "성형 후 컴백3", always);
        tbf(_0x55e037, "가뎀증", 20, "성형 후 컴백4", always);
        tbf(_0x55e037, "평추가*", 50, "성형 후 컴백5", always);
        tbf(_0x55e037, "공퍼증", 10, "공격+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10167:
      setMnc(_0x55e037, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            for (let _0x4c3a59 of getRoleIdx("딜")) {
              tbf(comp[_0x4c3a59], "공퍼증", 20, "반짝☆응원1", 2);
            }
            for (let _0x3e5b6a of getRoleIdx("딜")) {
              nbf(comp[_0x3e5b6a], "가뎀증", 10, "반짝☆응원2", 1, 4);
            }
            for (let _0x11059b of getRoleIdx("딜")) {
              atbf(comp[_0x11059b], "궁", comp[_0x11059b], "제거", "기본", "반짝☆응원3", 2, 1);
              atbf(comp[_0x11059b], "궁", comp[_0x11059b], "공고증", myCurAtk + comp[_0x11059b].id + 10, "반짝☆응원3", 2, 1);
            }
            for (let _0x159ba7 of getElementIdx("화")) {
              nbf(comp[_0x159ba7], "받속뎀", 5, "반짝☆응원4", 1, 4);
            }
            break;
          case 2:
            for (let _0xa07323 of getRoleIdx("딜")) {
              tbf(comp[_0xa07323], "공퍼증", 25, "반짝☆응원1", 2);
            }
            for (let _0x1bf0fc of getRoleIdx("딜")) {
              nbf(comp[_0x1bf0fc], "가뎀증", 11.25, "반짝☆응원2", 1, 4);
            }
            for (let _0x4e3db3 of getRoleIdx("딜")) {
              atbf(comp[_0x4e3db3], "궁", comp[_0x4e3db3], "제거", "기본", "반짝☆응원3", 2, 1);
              atbf(comp[_0x4e3db3], "궁", comp[_0x4e3db3], "공고증", myCurAtk + comp[_0x4e3db3].id + 11.25, "반짝☆응원3", 2, 1);
            }
            for (let _0x261b0d of getElementIdx("화")) {
              nbf(comp[_0x261b0d], "받속뎀", 7.5, "반짝☆응원4", 1, 3);
            }
            break;
          case 3:
            for (let _0x31f9ee of getRoleIdx("딜")) {
              tbf(comp[_0x31f9ee], "공퍼증", 30, "반짝☆응원1", 2);
            }
            for (let _0x5ebfc2 of getRoleIdx("딜")) {
              nbf(comp[_0x5ebfc2], "가뎀증", 16.66, "반짝☆응원2", 1, 3);
            }
            for (let _0x49ecb4 of getRoleIdx("딜")) {
              atbf(comp[_0x49ecb4], "궁", comp[_0x49ecb4], "제거", "기본", "반짝☆응원3", 2, 1);
              atbf(comp[_0x49ecb4], "궁", comp[_0x49ecb4], "공고증", myCurAtk + comp[_0x49ecb4].id + 12.5, "반짝☆응원3", 2, 1);
            }
            for (let _0x14f8f1 of getElementIdx("화")) {
              nbf(comp[_0x14f8f1], "받속뎀", 8.33, "반짝☆응원4", 1, 3);
            }
            break;
          case 4:
            for (let _0x5c9094 of getRoleIdx("딜")) {
              tbf(comp[_0x5c9094], "공퍼증", 35, "반짝☆응원1", 2);
            }
            for (let _0xf5809e of getRoleIdx("딜")) {
              nbf(comp[_0xf5809e], "가뎀증", 18.33, "반짝☆응원2", 1, 3);
            }
            for (let _0x4e7483 of getRoleIdx("딜")) {
              atbf(comp[_0x4e7483], "궁", comp[_0x4e7483], "제거", "기본", "반짝☆응원3", 2, 1);
              atbf(comp[_0x4e7483], "궁", comp[_0x4e7483], "공고증", myCurAtk + comp[_0x4e7483].id + 13.75, "반짝☆응원3", 2, 1);
            }
            for (let _0x4b9af8 of getElementIdx("화")) {
              nbf(comp[_0x4b9af8], "받속뎀", 13.75, "반짝☆응원4", 1, 2);
            }
            break;
          default:
            for (let _0x443d31 of getRoleIdx("딜")) {
              tbf(comp[_0x443d31], "공퍼증", 40, "반짝☆응원1", 2);
            }
            for (let _0x29fa2c of getRoleIdx("딜")) {
              nbf(comp[_0x29fa2c], "가뎀증", 30, "반짝☆응원2", 1, 2);
            }
            for (let _0x1bb915 of getRoleIdx("딜")) {
              atbf(comp[_0x1bb915], "궁", comp[_0x1bb915], "제거", "기본", "반짝☆응원3", 2, 1);
              atbf(comp[_0x1bb915], "궁", comp[_0x1bb915], "공고증", myCurAtk + comp[_0x1bb915].id + 15, "반짝☆응원3", 2, 1);
            }
            for (let _0x442652 of getElementIdx("화")) {
              nbf(comp[_0x442652], "받속뎀", 15, "반짝☆응원4", 1, 2);
            }
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {
        tbf(all, "공고증", myCurAtk + _0x55e037.id + 30, "아이돌 응원", 1);
      };
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(40);
        for (let _0x275ec5 of comp) {
          if (_0x275ec5.element != 0) {
            continue;
          }
          if (_0x275ec5.role == 0) {
            continue;
          }
          atbf(_0x275ec5, "평", boss, "받뎀증", 5, "<열정 나눔>1", 1, 50);
          for (let _0x423cbc of getElementIdx("화")) {
            atbf(_0x275ec5, "평", comp[_0x423cbc], "받속뎀", 5, "<열정 나눔>2", 1, 50);
          }
          nbf(all, "공퍼증", 20, "<열정 나눔>3", 1, 4);
          for (let _0x5de51a of comp) {
            if (_0x5de51a.element == 0 && _0x5de51a.role == 0) {
              nbf(_0x5de51a, "일뎀증", 15, "<열정 나눔>4", 1, 4);
              nbf(_0x5de51a, "가뎀증", 10, "<열정 나눔>5", 1, 4);
              tbf(_0x5de51a, "평추가*", 15, "<열정 나눔>6", 50);
            }
          }
        }
      };
      _0x55e037.passive = function () {
        tbf(_0x55e037, "평추가*", 50, "한 방 역전☆1", always);
        atbf(_0x55e037, "궁", all, "공고증", myCurAtk + _0x55e037.id + 30, "한 방 역전☆2", 1, always);
        for (let _0xb78e11 of getRoleIdx("딜")) {
          atbf(comp[_0xb78e11], "궁", comp[_0xb78e11], "평추가*", 40, "<스페셜 응원 스킬♡>", 2, always);
        }
        tbf(_0x55e037, "공퍼증", 10, "공격+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
        if (GLOBAL_TURN == 2 || GLOBAL_TURN == 6 || GLOBAL_TURN == 10) {
          for (let _0x4921ae of getRoleIdx("딜")) {
            nbf(comp[_0x4921ae], "일뎀증", 30, "용기☆두근두근~!", 1, 3);
          }
        }
        if (GLOBAL_TURN == 1) {
          cdChange(_0x55e037, -4);
          for (let _0x100932 of getRoleIdx("딜")) {
            cdChange(comp[_0x100932], -4);
          }
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10168:
      _0x55e037.stack = 0;
      buff_ex.push("<행운의 부적>");
      setMnc(_0x55e037, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
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
            for (let _0x57972a of getElementIdx("풍")) {
              tbf(comp[_0x57972a], "받속뎀", 10, "가득한 기운을 모두에게☆3", 1);
            }
            for (let _0x1e9b84 of getElementIdx("풍")) {
              nbf(comp[_0x1e9b84], "받속뎀", 5, "가득한 기운을 모두에게☆4", 1, 2);
            }
            break;
          case 4:
            tbf(boss, "받뎀증", 18, "가득한 기운을 모두에게☆1", 1);
            nbf(boss, "받뎀증", 9, "가득한 기운을 모두에게☆2", 1, 2);
            for (let _0x12cf4e of getElementIdx("풍")) {
              tbf(comp[_0x12cf4e], "받속뎀", 12, "가득한 기운을 모두에게☆3", 1);
            }
            for (let _0x1cc77d of getElementIdx("풍")) {
              nbf(comp[_0x1cc77d], "받속뎀", 6, "가득한 기운을 모두에게☆4", 1, 2);
            }
            break;
          default:
            tbf(boss, "받뎀증", 20, "가득한 기운을 모두에게☆1", 1);
            nbf(boss, "받뎀증", 10, "가득한 기운을 모두에게☆2", 1, 2);
            for (let _0xdc4b2c of getElementIdx("풍")) {
              tbf(comp[_0xdc4b2c], "받속뎀", 14, "가득한 기운을 모두에게☆3", 1);
            }
            for (let _0x4e21b6 of getElementIdx("풍")) {
              nbf(comp[_0x4e21b6], "받속뎀", 7, "가득한 기운을 모두에게☆4", 1, 2);
            }
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        if (_0x55e037.stack == 0) {
          setBuffOn(_0x55e037, "발동", "<행운 더하기>1", true);
        }
        if (_0x55e037.stack == 2) {
          setBuffOn(_0x55e037, "발동", "<행운 더하기>3", true);
        }
        ultLogic(_0x55e037);
        if (_0x55e037.stack == 0) {
          setBuffOn(_0x55e037, "발동", "<행운 더하기>1", false);
        }
        if (_0x55e037.stack == 2) {
          setBuffOn(_0x55e037, "발동", "<행운 더하기>3", false);
        }
        _0x55e037.stack += 1;
        if (_0x55e037.stack > 3) {
          _0x55e037.stack = 3;
        }
        if (_0x55e037.stack == 1) {
          for (let _0x44cb99 of comp) {
            setBuffOn(_0x44cb99, "기본", "<행운 더하기>1", true);
          }
        }
        if (_0x55e037.stack == 3) {
          for (let _0xb39606 of comp) {
            setBuffOn(_0xb39606, "기본", "<행운 더하기>3", true);
          }
        }
        for (let _0x51de07 of comp) {
          _0x51de07.heal();
        }
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
        for (let _0x3f58c9 of comp) {
          _0x3f58c9.heal();
        }
      };
      _0x55e037.leader = function () {
        for (let _0x38a277 of getElementIdx("풍")) {
          hpUpMe(comp[_0x38a277], 50);
        }
        for (let _0x531add of getElementIdx("풍")) {
          tbf(comp[_0x531add], "공퍼증", 100, "전력을 다해 승리를 쟁취~!1", always);
        }
        for (let _0x40e20e of getElementIdx("풍")) {
          anbf(_0x55e037, "궁", comp[_0x40e20e], "받속뎀", 10, "전력을 다해 승리를 쟁취~!2", 1, 2, always);
        }
        if (getElementCnt("풍") >= 4) {
          tbf(all, "일뎀증", 80, "<플레이, 플레이, 필승!>1", always);
          tbf(all, "궁뎀증", 50, "<플레이, 플레이, 필승!>2", always);
        }
      };
      _0x55e037.passive = function () {
        anbf(_0x55e037, "궁", all, "<행운의 부적>", 0, "부적은 많으면 많을수록 좋아!", 1, 3, always);
        buff(all, "공퍼증", 30, "<행운 더하기>1", always, false);
        buff(_0x55e037, "궁", _0x55e037, "on", "기본", "<행운 더하기>1", 1, always, "발동", false);
        buff(all, "일뎀증", 30, "<행운 더하기>3", always, false);
        buff(_0x55e037, "궁", _0x55e037, "on", "기본", "<행운 더하기>3", 1, always, "발동", false);
        atbf(_0x55e037, "공격", all, "공고증", myCurAtk + _0x55e037.id + 10, "컨디션 최고!1", 1, always);
        atbf(_0x55e037, "궁", all, "궁뎀증", 30, "컨디션 최고!2", 1, always);
        tbf(all, "궁추가*", 25, "응원 만점!2", always);
        tbf(_0x55e037, "공퍼증", 10, "공격+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
        if (GLOBAL_TURN == 1) {
          cdChange(_0x55e037, -4);
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10169:
      setMnc(_0x55e037, [265, 4, 298, 4, 331, 4, 364, 4, 397, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(_0x55e037, "공퍼증", 100, "기분이 좋아지는 일을 해봐요~1", 1);
            nbf(boss, "받궁뎀", 6, "기분이 좋아지는 일을 해봐요~2", 1, 6);
            nbf(boss, "받발뎀", 6, "기분이 좋아지는 일을 해봐요~3", 1, 6);
            break;
          case 2:
            tbf(_0x55e037, "공퍼증", 125, "기분이 좋아지는 일을 해봐요~1", 1);
            nbf(boss, "받궁뎀", 10.5, "기분이 좋아지는 일을 해봐요~2", 1, 4);
            nbf(boss, "받발뎀", 10.5, "기분이 좋아지는 일을 해봐요~3", 1, 4);
            break;
          case 3:
            tbf(_0x55e037, "공퍼증", 150, "기분이 좋아지는 일을 해봐요~1", 1);
            for (let _0x4a1f4f of getElementIdx("암")) {
              nbf(comp[_0x4a1f4f], "받속뎀", 2.5, "기분이 좋아지는 일을 해봐요~4", 1, 4);
            }
            nbf(boss, "받궁뎀", 12, "기분이 좋아지는 일을 해봐요~2", 1, 4);
            nbf(boss, "받발뎀", 12, "기분이 좋아지는 일을 해봐요~3", 1, 4);
            break;
          case 4:
            tbf(_0x55e037, "공퍼증", 175, "기분이 좋아지는 일을 해봐요~1", 1);
            for (let _0x5b7175 of getElementIdx("암")) {
              nbf(comp[_0x5b7175], "받속뎀", 3.75, "기분이 좋아지는 일을 해봐요~4", 1, 4);
            }
            nbf(boss, "받궁뎀", 13.5, "기분이 좋아지는 일을 해봐요~2", 1, 4);
            nbf(boss, "받발뎀", 13.5, "기분이 좋아지는 일을 해봐요~3", 1, 4);
            break;
          default:
            tbf(_0x55e037, "공퍼증", 200, "기분이 좋아지는 일을 해봐요~1", 1);
            for (let _0x2984b8 of getElementIdx("암")) {
              nbf(comp[_0x2984b8], "받속뎀", 5, "기분이 좋아지는 일을 해봐요~4", 1, 4);
            }
            nbf(boss, "받궁뎀", 15, "기분이 좋아지는 일을 해봐요~2", 1, 4);
            nbf(boss, "받발뎀", 15, "기분이 좋아지는 일을 해봐요~3", 1, 4);
            break;
        }
      };
      _0x55e037.ultafter = function () {
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 4 == 0) {
          cdChange(_0x55e037, -3);
        }
      };
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {
        tbf(_0x55e037, "공퍼증", 100, "엄마의 사랑♡", 1);
      };
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(40);
        tbf(all, "공퍼증", 100, "토끼 모녀 덮밥1", always);
        if (getElKind() == 2) {
          for (let _0x56171d of getElementIdx("화")) {
            for (let _0xbfb46b of getElementIdx("암")) {
              atbf(comp[_0x56171d], "공격", comp[_0xbfb46b], "공고증", myCurAtk + comp[_0x56171d].id + 10, "<모녀 합심>1", 1, always);
            }
            atbf(comp[_0x56171d], "공격", boss, "받뎀증", 3.5, "<모녀 합심>2", 2, always);
            for (let _0xa39368 of getElementIdx("암")) {
              atbf(comp[_0x56171d], "공격", comp[_0xa39368], "받속뎀", 3, "<모녀 합심>3", 2, always);
            }
          }
          for (let _0x3a6c09 of getElementIdx("암")) {
            tbf(comp[_0x3a6c09], "가뎀증", 30, "<전력 착정>1", always);
            tbf(comp[_0x3a6c09], "궁뎀증", 40, "<전력 착정>2", always);
            tbf(comp[_0x3a6c09], "발효증", 80, "<전력 착정>3", always);
          }
        }
      };
      _0x55e037.passive = function () {
        tbf(_0x55e037, "공발동*", 50, "평타 연격 관통1", always);
        tbf(_0x55e037, "공발동*", 50, "평타 연격 관통2", always);
        tbf(_0x55e037, "방뎀증", 100, "평타 연격 관통3", always);
        atbf(_0x55e037, "공격", boss, "받뎀증", 10, "<채양보음>1", 3, always);
        anbf(_0x55e037, "공격", all, "받아증", 3, "<채양보음>3", 1, 10, always);
        tbf(_0x55e037, "공퍼증", 10, "공격+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 4 == 0) {
          cdChange(_0x55e037, -1);
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10170:
      _0x55e037.stack = 0;
      buff_ex.push("<응석 받아줄게~>");
      setMnc(_0x55e037, [120, 4, 140, 4, 160, 4, 180, 4, 200, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        for (let _0x539e8e of getElementIdx("수")) {
          if (role[comp[_0x539e8e].role] == "딜") {
            deleteBuff(comp[_0x539e8e], "기본", "엄마의 사랑 요리♡2");
          }
        }
        switch (_0x78c5e1) {
          case 1:
            for (let _0x4b0f74 of getElementIdx("수")) {
              if (role[comp[_0x4b0f74].role] == "딜") {
                tbf(comp[_0x4b0f74], "가뎀증", 24, "엄마의 사랑 요리♡2", 4);
              }
            }
            break;
          case 2:
            for (let _0x2b42d4 of getElementIdx("수")) {
              if (role[comp[_0x2b42d4].role] == "딜") {
                tbf(comp[_0x2b42d4], "가뎀증", 28, "엄마의 사랑 요리♡2", 4);
              }
            }
            break;
          case 3:
            for (let _0x5e5735 of getElementIdx("수")) {
              if (role[comp[_0x5e5735].role] == "딜") {
                tbf(comp[_0x5e5735], "가뎀증", 32, "엄마의 사랑 요리♡2", 4);
              }
            }
            break;
          case 4:
            for (let _0x141d95 of getElementIdx("수")) {
              if (role[comp[_0x141d95].role] == "딜") {
                tbf(comp[_0x141d95], "가뎀증", 36, "엄마의 사랑 요리♡2", 4);
              }
            }
            break;
          default:
            for (let _0x322c01 of getElementIdx("수")) {
              if (role[comp[_0x322c01].role] == "딜") {
                tbf(comp[_0x322c01], "가뎀증", 40, "엄마의 사랑 요리♡2", 4);
              }
            }
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        if (_0x55e037.stack == 0) {
          setBuffOn(_0x55e037, "기본", "영양 만점의 맛있는 저녁1", true);
        }
        ultLogic(_0x55e037);
        switch (_0x78c5e1) {
          case 1:
            nbf(_0x55e037, "<응석 받아줄게~>", 0, "엄마의 사랑 요리♡", 4, 8);
            _0x55e037.stack += 4;
            if (_0x55e037.stack > 8) {
              _0x55e037.stack = 8;
            }
            break;
          case 2:
            nbf(_0x55e037, "<응석 받아줄게~>", 0, "엄마의 사랑 요리♡", 5, 8);
            _0x55e037.stack += 5;
            if (_0x55e037.stack > 8) {
              _0x55e037.stack = 8;
            }
            break;
          case 3:
            nbf(_0x55e037, "<응석 받아줄게~>", 0, "엄마의 사랑 요리♡", 6, 8);
            _0x55e037.stack += 6;
            if (_0x55e037.stack > 8) {
              _0x55e037.stack = 8;
            }
            break;
          case 4:
            nbf(_0x55e037, "<응석 받아줄게~>", 0, "엄마의 사랑 요리♡", 7, 8);
            _0x55e037.stack += 7;
            if (_0x55e037.stack > 8) {
              _0x55e037.stack = 8;
            }
            break;
          default:
            nbf(_0x55e037, "<응석 받아줄게~>", 0, "엄마의 사랑 요리♡", 8, 8);
            _0x55e037.stack += 8;
            if (_0x55e037.stack > 8) {
              _0x55e037.stack = 8;
            }
            break;
        }
        _0x55e037.tmpfunc();
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(40);
        if (getElementCnt("수") >= 3) {
          tbf(all, "공퍼증", 80, "<행복한 장난>1", always);
          tbf(all, "일뎀증", 70, "<행복한 장난>2", always);
          ptbf(all, "평", all, "힐", 20, "<행복한 장난>3", 1, always);
          ptbf(all, "궁", all, "힐", 50, "<행복한 장난>4", 1, always);
        }
        if (getElementCnt("수") >= 5) {
          tbf(all, "평추가*", 20, "<착한 아이를 위한 선물>1", always);
          for (let _0x33e3f7 of getElementIdx("수")) {
            anbf(all, "평", comp[_0x33e3f7], "받속뎀", 2.5, "<착한 아이를 위한 선물>2", 1, 10, always);
          }
        }
      };
      _0x55e037.tmpfunc = function () {
        const _0xd9b341 = _0x55e037.stack;
        setBuffSize(_0x55e037, "발동", "초보 엄마의 새출발2", _0xd9b341 * 10);
        setBuffSize(_0x55e037, "발동", "초보 엄마의 새출발3", _0xd9b341 * 10);
        setBuffOn(_0x55e037, "기본", "영양 만점의 맛있는 저녁1", _0xd9b341 >= 1);
        setBuffOn(_0x55e037, "기본", "영양 만점의 맛있는 저녁2", _0xd9b341 >= 2);
        setBuffOn(_0x55e037, "기본", "영양 만점의 맛있는 저녁3", _0xd9b341 >= 3);
      };
      _0x55e037.passive = function () {
        anbf(_0x55e037, "평", boss, "받뎀증", 1.5, "초보 엄마의 새출발1", 1, 10, always);
        atbf(_0x55e037, "공격", _0x55e037, "평추가*", 0, "초보 엄마의 새출발2", 2, always);
        atbf(_0x55e037, "방", _0x55e037, "평추가*", 0, "초보 엄마의 새출발3", 2, always);
        buff(_0x55e037, "공퍼증", 50, "영양 만점의 맛있는 저녁1", always, false);
        buff(_0x55e037, "일뎀증", 35, "영양 만점의 맛있는 저녁2", always, false);
        buff(_0x55e037, "평추가*", 30, "영양 만점의 맛있는 저녁3", always, false);
        tbf(_0x55e037, "가뎀증", 20, "여우 엄마의 비밀 특훈1", always);
        for (let _0x3db62f of getRoleIdx("딜", "디")) {
          atbf(_0x55e037, "힐", comp[_0x3db62f], "일뎀증", 9, "여우 엄마의 비밀 특훈2", 4, always);
        }
        tbf(_0x55e037, "공퍼증", 10, "공격+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
        if (GLOBAL_TURN == 1) {
          for (let _0x575b56 of getElementIdx("수")) {
            if (role[comp[_0x575b56].role] == "딜") {
              cdChange(comp[_0x575b56], -4);
            }
          }
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
        nbf(_0x55e037, "<응석 받아줄게~>", 0, "엄마의 사랑 요리♡", -1, 8);
        _0x55e037.stack -= 1;
        if (_0x55e037.stack < 0) {
          _0x55e037.stack = 0;
        }
        _0x55e037.tmpfunc();
      };
      return _0x55e037;
    case 10171:
      _0x55e037.stack = 0;
      buff_ex.push("<만물을 굴복시키는 왕자의 위엄>", "<만물을 굴복시키는 왕자의 위엄>감소면역");
      setMnc(_0x55e037, [330, 4, 375, 4, 420, 4, 465, 4, 510, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            nbf(_0x55e037, "<만물을 굴복시키는 왕자의 위엄>", 0, "최후의 불꽃·장미의 춤", 1, 4);
            _0x55e037.stack += 1;
            if (_0x55e037.stack > 4) {
              _0x55e037.stack = 4;
            }
            break;
          case 2:
            nbf(_0x55e037, "<만물을 굴복시키는 왕자의 위엄>", 0, "최후의 불꽃·장미의 춤", 2, 4);
            _0x55e037.stack += 2;
            if (_0x55e037.stack > 4) {
              _0x55e037.stack = 4;
            }
            break;
          case 3:
            nbf(_0x55e037, "<만물을 굴복시키는 왕자의 위엄>", 0, "최후의 불꽃·장미의 춤", 3, 4);
            _0x55e037.stack += 3;
            if (_0x55e037.stack > 4) {
              _0x55e037.stack = 4;
            }
            break;
          case 4:
            nbf(_0x55e037, "<만물을 굴복시키는 왕자의 위엄>", 0, "최후의 불꽃·장미의 춤", 4, 4);
            _0x55e037.stack += 4;
            if (_0x55e037.stack > 4) {
              _0x55e037.stack = 4;
            }
            break;
          default:
            nbf(_0x55e037, "<만물을 굴복시키는 왕자의 위엄>", 0, "최후의 불꽃·장미의 춤", 4, 4);
            _0x55e037.stack += 4;
            if (_0x55e037.stack > 4) {
              _0x55e037.stack = 4;
            }
            tbf(_0x55e037, "<만물을 굴복시키는 왕자의 위엄>감소면역", 0, "최후의 불꽃·장미의 춤2", 4);
            break;
        }
        setBuffOn(_0x55e037, "기본", "절대적인 힘1", _0x55e037.stack >= 1);
        setBuffOn(_0x55e037, "기본", "절대적인 힘2", _0x55e037.stack >= 2);
        setBuffOn(_0x55e037, "기본", "절대적인 힘3", _0x55e037.stack >= 3);
        setBuffOn(_0x55e037, "기본", "절대적인 힘4", _0x55e037.stack >= 4);
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037, 3);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        if (_0x55e037.isLeader && getElKind() == 5) {
          for (let _0x5964a3 of comp) {
            if (_0x5964a3.id == _0x55e037.id) {
              continue;
            }
            atbf(_0x5964a3, "평", boss, "받뎀증", 5.5, "<영광의 귀환 이블리스>1", 2, 1);
            atbf(_0x5964a3, "궁", boss, "받뎀증", 5.5, "<영광의 귀환 이블리스>2", 2, 2);
            atbf(_0x5964a3, "평", _0x55e037, "공고증", myCurAtk + _0x5964a3.id + 10, "<영광의 귀환 이블리스>3", 2, 1);
            atbf(_0x5964a3, "궁", _0x55e037, "공고증", myCurAtk + _0x5964a3.id + 10, "<영광의 귀환 이블리스>4", 2, 2);
            atbf(_0x5964a3, "평", _0x55e037, "평추가*", 30, "<영광의 귀환 이블리스>5", 2, 1);
            atbf(_0x5964a3, "궁", _0x55e037, "평추가*", 30, "<영광의 귀환 이블리스>6", 2, 2);
            atbf(_0x5964a3, "평", _0x55e037, "궁추가*", 60, "<영광의 귀환 이블리스>7", 1, 1);
            atbf(_0x5964a3, "궁", _0x55e037, "궁추가*", 60, "<영광의 귀환 이블리스>8", 1, 2);
          }
        }
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(40);
        tbf(all, "공퍼증", 50, "최강의 이블리스", always);
        if (getElKind() == 5) {
          tbf(_0x55e037, "일뎀증", 100, "<선봉의 왕>1", always);
          tbf(_0x55e037, "궁뎀증", 50, "<선봉의 왕>2", always);
          tbf(_0x55e037, "가뎀증", 30, "<선봉의 왕>3", always);
          for (let _0x314d72 of getElementIdx("풍")) {
            atbf(_0x55e037, "궁", comp[_0x314d72], "받속뎀", 25, "<선봉의 왕>6", 5, always);
          }
        }
      };
      _0x55e037.passive = function () {
        atbf(_0x55e037, "피격", all, "제거", "기본", "도전 응수자의 프라이드2", 1, always);
        atbf(_0x55e037, "피격", all, "공퍼증", 50, "도전 응수자의 프라이드2", 5, always);
        buff(_0x55e037, "방뎀증", 110, "절대적인 힘1", always, false);
        buff(_0x55e037, "일뎀증", 100, "절대적인 힘2", always, false);
        buff(_0x55e037, "궁뎀증", 50, "절대적인 힘3", always, false);
        buff(_0x55e037, "가뎀증", 30, "절대적인 힘4", always, false);
        tbf(_0x55e037, "가뎀증", 7.5, "데미지+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
        if (getBuffSize(_0x55e037, "기본", "최후의 불꽃·장미의 춤2") == undefined) {
          nbf(_0x55e037, "<만물을 굴복시키는 왕자의 위엄>", 0, "최후의 불꽃·장미의 춤", -1, 4);
          _0x55e037.stack -= 1;
          if (_0x55e037.stack < 0) {
            _0x55e037.stack = 0;
          }
          setBuffOn(_0x55e037, "기본", "절대적인 힘1", _0x55e037.stack >= 1);
          setBuffOn(_0x55e037, "기본", "절대적인 힘2", _0x55e037.stack >= 2);
          setBuffOn(_0x55e037, "기본", "절대적인 힘3", _0x55e037.stack >= 3);
          setBuffOn(_0x55e037, "기본", "절대적인 힘4", _0x55e037.stack >= 4);
        }
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {
          if (GLOBAL_TURN == 1) {
            if (getElKind() == 5) {
              cdChange(_0x55e037, -4);
            }
          }
        }
        if (GLOBAL_TURN == 1) {
          _0x55e037.canCDChange = false;
        }
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 4 == 0) {
          if (_0x55e037.stack >= 4) {
            tbf(boss, "받뎀증", 30, "<마왕 영역>1", 4);
            for (let _0x5c1b41 of getElementIdx("풍")) {
              tbf(comp[_0x5c1b41], "받속뎀", 25, "<마왕 영역>2", 4);
            }
            tbf(boss, "방경감", 50, "<마왕 영역>3", 1);
            atbf(boss, "피격", boss, "방어", 0, "<마왕 영역>4", 1, 1);
            atbf(boss, "피격", boss, "제거", "발동", "<마왕 영역>4", 1, 1);
          }
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10172:
      setMnc(_0x55e037, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        deleteBuff(_0x55e037, "기본", "물총 전쟁 시작~!1");
        switch (_0x78c5e1) {
          case 1:
            tbf(_0x55e037, "공퍼증", 60, "물총 전쟁 시작~!1", 4);
            for (let _0x14786f of getElementIdx("광")) {
              nbf(comp[_0x14786f], "받속뎀", 18, "물총 전쟁 시작~!2", 1, 1);
            }
            tbf(all, "아머", _0x55e037.hp * 20 * armorUp(_0x55e037, "궁", "추가"), "물총 전쟁 시작~!4", 2);
            break;
          case 2:
            tbf(_0x55e037, "공퍼증", 70, "물총 전쟁 시작~!1", 4);
            for (let _0x508eac of getElementIdx("광")) {
              nbf(comp[_0x508eac], "받속뎀", 21, "물총 전쟁 시작~!2", 1, 1);
            }
            tbf(all, "아머", _0x55e037.hp * 20 * armorUp(_0x55e037, "궁", "추가"), "물총 전쟁 시작~!4", 2);
            break;
          case 3:
            tbf(_0x55e037, "공퍼증", 80, "물총 전쟁 시작~!1", 4);
            for (let _0x1218f3 of getElementIdx("광")) {
              nbf(comp[_0x1218f3], "받속뎀", 24, "물총 전쟁 시작~!2", 1, 1);
            }
            tbf(all, "아머", _0x55e037.hp * 20 * armorUp(_0x55e037, "궁", "추가"), "물총 전쟁 시작~!4", 2);
            break;
          case 4:
            tbf(_0x55e037, "공퍼증", 90, "물총 전쟁 시작~!1", 4);
            for (let _0x5f0cc4 of getElementIdx("광")) {
              nbf(comp[_0x5f0cc4], "받속뎀", 27, "물총 전쟁 시작~!2", 1, 1);
            }
            tbf(all, "아머", _0x55e037.hp * 20 * armorUp(_0x55e037, "궁", "추가"), "물총 전쟁 시작~!4", 2);
            break;
          default:
            tbf(_0x55e037, "공퍼증", 100, "물총 전쟁 시작~!1", 4);
            for (let _0x4e6d2b of getElementIdx("광")) {
              nbf(comp[_0x4e6d2b], "받속뎀", 30, "물총 전쟁 시작~!2", 1, 1);
            }
            tbf(all, "아머", _0x55e037.hp * 20 * armorUp(_0x55e037, "궁", "추가"), "물총 전쟁 시작~!4", 2);
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
        for (let _0x3f6740 of comp) {
          _0x3f6740.heal();
        }
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
        for (let _0x4c1803 of comp) {
          _0x4c1803.heal();
        }
      };
      _0x55e037.leader = function () {
        hpUpAll(40);
        tbf(all, "공퍼증", 100, "프로 순록 가이드1", always);
        if (getElementCnt("광") >= 4) {
          tbf(all, "일뎀증", 75, "<출발 준비 완료>1", always);
          tbf(all, "평추가*", 30, "<출발 준비 완료>2", always);
          tbf(all, "평추가*", 30, "<출발 준비 완료>3", always);
        }
        atbf(_0x55e037, "공격", all, "공고증", myCurAtk + _0x55e037.id + 10, "프로 순록 가이드2", 1, always);
        nbf(boss, "받뎀증", 30, "프로 순록 가이드3", 1, 1);
      };
      _0x55e037.passive = function () {
        for (let _0xa0bdc4 of getElementIdx("광")) {
          atbf(_0x55e037, "평", comp[_0xa0bdc4], "일뎀증", 85, "시련의 안내인1", 1, always);
        }
        atbf(_0x55e037, "공격", all, "공고증", myCurAtk + _0x55e037.id + 20, "지속형 순록 보급1", 1, always);
        for (let _0x4163c1 of getElementIdx("광")) {
          tbf(comp[_0x4163c1], "평추가*", 30, "지속형 순록 보급3", always);
        }
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10173:
      buff_ex.push("<고속 장전>");
      setMnc(_0x55e037, [265, 3, 298.20000000000005, 3, 331.09999999999997, 3, 364, 3, 396.90000000000003, 3], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        boss.def = false;
        switch (_0x78c5e1) {
          case 1:
            tbf(_0x55e037, "가뎀증", 36, "선수필승이다!2", 1);
            tbf(_0x55e037, "궁뎀증", 18, "선수필승이다!3", 1);
            tbf(_0x55e037, "발효증", 50, "선수필승이다!4", 1);
            break;
          case 2:
            tbf(_0x55e037, "가뎀증", 42, "선수필승이다!2", 1);
            tbf(_0x55e037, "궁뎀증", 21, "선수필승이다!3", 1);
            tbf(_0x55e037, "발효증", 55, "선수필승이다!4", 1);
            break;
          case 3:
            tbf(_0x55e037, "가뎀증", 48, "선수필승이다!2", 1);
            tbf(_0x55e037, "궁뎀증", 24, "선수필승이다!3", 1);
            tbf(_0x55e037, "발효증", 60, "선수필승이다!4", 1);
            buff(_0x55e037, "행동", _0x55e037, "<고속 장전>", 0, "생존 게임 노장", 3, 6, 2, "발동", false);
            break;
          case 4:
            tbf(_0x55e037, "가뎀증", 54, "선수필승이다!2", 1);
            tbf(_0x55e037, "궁뎀증", 27, "선수필승이다!3", 1);
            tbf(_0x55e037, "발효증", 65, "선수필승이다!4", 1);
            buff(_0x55e037, "행동", _0x55e037, "<고속 장전>", 0, "생존 게임 노장", 3, 6, 2, "발동", false);
            break;
          default:
            tbf(_0x55e037, "가뎀증", 60, "선수필승이다!2", 1);
            tbf(_0x55e037, "궁뎀증", 30, "선수필승이다!3", 1);
            tbf(_0x55e037, "발효증", 70, "선수필승이다!4", 1);
            buff(_0x55e037, "행동", _0x55e037, "<고속 장전>", 0, "생존 게임 노장", 3, 6, 2, "발동", false);
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        const _0x883beb = boss.def;
        ultLogic(_0x55e037, _0x78c5e1 + 4);
        setBuffOnAll(_0x55e037, "발동", "생존 게임 노장", true);
        if (_0x883beb) {
          for (let _0x3bfc3e of getElementIdx("수")) {
            deleteBuff(comp[_0x3bfc3e], "기본", "바로 지금이다! 가랏!");
            tbf(comp[_0x3bfc3e], "받속뎀", 20, "바로 지금이다! 가랏!", 4);
          }
        }
        _0x55e037.tmpfunc();
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
        _0x55e037.tmpfunc();
      };
      _0x55e037.leader = function () {
        hpUpAll(40);
        tbf(all, "공퍼증", 100, "하운드 소대 여름 집합1", always);
        tbf(all, "가뎀증", 40, "하운드 소대 여름 집합2", always);
        tbf(all, "궁뎀증", 30, "하운드 소대 여름 집합3", always);
        tbf(all, "발효증", 60, "하운드 소대 여름 집합4", always);
        nbf(boss, "받뎀증", 30, "하운드 소대 여름 집합5", 1, 1);
        for (let _0x2f64c5 of comp) {
          if (_0x2f64c5.id == _0x55e037.id) {
            continue;
          }
          tbf(_0x2f64c5, "공발동*", 60, "<엄호 공격>1", always);
          tbf(_0x2f64c5, "궁추가*", 120, "<엄호 공격>2", always);
        }
        for (let _0x2c5094 of getRoleIdx("딜")) {
          if (comp[_0x2c5094].id == _0x55e037.id) {
            continue;
          }
          tbf(comp[_0x2c5094], "가뎀증", -500, "<물러서!>", always);
        }
      };
      _0x55e037.tmpfunc = function () {
        const _0x22d2d9 = _0x55e037.getNest("<고속 장전>");
        setBuffOn(_0x55e037, "기본", "<전력 사격>1", _0x22d2d9 >= 1);
        setBuffOn(_0x55e037, "기본", "<전력 사격>2", _0x22d2d9 >= 2);
        setBuffOn(_0x55e037, "기본", "<전력 사격>3", _0x22d2d9 >= 3);
        setBuffOn(_0x55e037, "기본", "<전력 사격>4", _0x22d2d9 >= 4);
        setBuffOn(_0x55e037, "기본", "<전력 사격>5", _0x22d2d9 >= 5);
        setBuffOn(_0x55e037, "기본", "<전력 사격>6", _0x22d2d9 == 6);
        setBuffOn(_0x55e037, "기본", "바로 지금이다! 가랏!1", _0x22d2d9 >= 1);
        setBuffOn(_0x55e037, "기본", "바로 지금이다! 가랏!2", _0x22d2d9 >= 2);
        setBuffOn(_0x55e037, "기본", "바로 지금이다! 가랏!3", _0x22d2d9 >= 3);
        setBuffOn(_0x55e037, "기본", "하운드의 정신적 상징1", _0x22d2d9 >= 4);
        setBuffOn(_0x55e037, "기본", "하운드의 정신적 상징2", _0x22d2d9 >= 5);
        setBuffOn(_0x55e037, "기본", "하운드의 정신적 상징3", _0x22d2d9 == 6);
      };
      _0x55e037.passive = function () {
        anbf(_0x55e037, "방", _0x55e037, "<고속 장전>", 0, "생존 게임 노장", 3, 6, always);
        anbf(_0x55e037, "피격", _0x55e037, "<고속 장전>", 0, "생존 게임 노장", 3, 6, always);
        const _0x3b7abb = _0x55e037.hit;
        _0x55e037.hit = function (..._0x1eaba3) {
          _0x3b7abb.apply(this, _0x1eaba3);
          _0x55e037.tmpfunc();
        };
        buff(_0x55e037, "궁발동*", 50, "<전력 사격>1", always, false);
        buff(_0x55e037, "궁발동*", 50, "<전력 사격>2", always, false);
        buff(_0x55e037, "궁발동*", 50, "<전력 사격>3", always, false);
        buff(_0x55e037, "궁발동*", 50, "<전력 사격>4", always, false);
        buff(_0x55e037, "궁발동*", 50, "<전력 사격>5", always, false);
        buff(_0x55e037, "궁발동*", 50, "<전력 사격>6", always, false);
        if (getRoleCnt("딜") >= 2) {
          anbf(_0x55e037, "행동", _0x55e037, "<고속 장전>", 0, "생존 게임 노장", -6, 6, always);
        }
        buff(_0x55e037, "공퍼증", 50, "바로 지금이다! 가랏!1", always, false);
        buff(_0x55e037, "발효증", 20, "바로 지금이다! 가랏!2", always, false);
        buff(_0x55e037, "발효증", 20, "바로 지금이다! 가랏!3", always, false);
        atbf(_0x55e037, "방", all, "제거", "기본", "하운드의 정신적 상징", 1, always);
        atbf(_0x55e037, "방", all, "공퍼증", 50, "하운드의 정신적 상징", 2, always);
        buff(_0x55e037, "발효증", 20, "하운드의 정신적 상징1", always, false);
        buff(_0x55e037, "발효증", 20, "하운드의 정신적 상징2", always, false);
        buff(_0x55e037, "궁뎀증", 30, "하운드의 정신적 상징3", always, false);
        tbf(_0x55e037, "공퍼증", 10, "공격+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
        _0x55e037.tmpfunc();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 3 == 0) {
          anbf(_0x55e037, "행동", _0x55e037, "<고속 장전>", 0, "생존 게임 노장", -6, 6, 1);
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10174:
      buff_ex.push("<수중 깊이>");
      setMnc(_0x55e037, [120, 4, 140, 4, 160, 4, 180, 4, 200, 4], _0x78c5e1);
      _0x55e037.stack = 0;
      _0x55e037.ultbefore = function () {
        const _0x5e6590 = _0x55e037.stack;
        switch (_0x78c5e1) {
          case 1:
            _0x55e037.stack += 20;
            nbf(_0x55e037, "공퍼증", 40, "비기 - 소용돌이 폭포!2", 1, 4);
            break;
          case 2:
            _0x55e037.stack += 20;
            nbf(_0x55e037, "공퍼증", 56.66, "비기 - 소용돌이 폭포!2", 1, 3);
            break;
          case 3:
            _0x55e037.stack += 30;
            nbf(_0x55e037, "공퍼증", 60, "비기 - 소용돌이 폭포!2", 1, 3);
            nbf(_0x55e037, "가뎀증", 10, "비기 - 소용돌이 폭포!3", 1, 2);
            break;
          case 4:
            _0x55e037.stack += 30;
            nbf(_0x55e037, "공퍼증", 95, "비기 - 소용돌이 폭포!2", 1, 2);
            nbf(_0x55e037, "가뎀증", 22.5, "비기 - 소용돌이 폭포!3", 1, 2);
            break;
          default:
            _0x55e037.stack += 40;
            nbf(_0x55e037, "공퍼증", 100, "비기 - 소용돌이 폭포!2", 1, 2);
            nbf(_0x55e037, "가뎀증", 30, "비기 - 소용돌이 폭포!3", 1, 2);
            break;
        }
        if (_0x5e6590 < 33 && _0x55e037.stack >= 33) {
          setBuffOn(_0x55e037, "기본", "심해 잠행1", true);
        }
        if (_0x5e6590 < 66 && _0x55e037.stack >= 66) {
          setBuffOn(_0x55e037, "기본", "심해 잠행2", true);
        }
        if (_0x5e6590 < 99 && _0x55e037.stack >= 99) {
          setBuffOn(_0x55e037, "기본", "심해 잠행3", true);
        }
        if (_0x5e6590 < 100 && _0x55e037.stack >= 100) {
          setBuffOn(_0x55e037, "기본", "<심해 밑바닥>2", true);
        }
        if (_0x55e037.stack > 100) {
          _0x55e037.stack = 100;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        const _0x2eb4e1 = _0x55e037.stack;
        ultLogic(_0x55e037);
        switch (_0x78c5e1) {
          case 1:
            nbf(_0x55e037, "<수중 깊이>", 0, "비기 - 소용돌이 폭포!", 20, 100);
            break;
          case 2:
            nbf(_0x55e037, "<수중 깊이>", 0, "비기 - 소용돌이 폭포!", 20, 100);
            break;
          case 3:
            nbf(_0x55e037, "<수중 깊이>", 0, "비기 - 소용돌이 폭포!", 30, 100);
            break;
          case 4:
            nbf(_0x55e037, "<수중 깊이>", 0, "비기 - 소용돌이 폭포!", 30, 100);
            break;
          default:
            nbf(_0x55e037, "<수중 깊이>", 0, "비기 - 소용돌이 폭포!", 40, 100);
            break;
        }
        if (_0x2eb4e1 < 100 && _0x55e037.stack >= 100) {
          setBuffOn(_0x55e037, "기본", "<심해 밑바닥>3", true);
          setBuffOn(_0x55e037, "발동", "<심해 밑바닥>4", true);
          setBuffOn(_0x55e037, "발동", "<심해 밑바닥>5", true);
          setBuffOnAll(_0x55e037, "발동", "<심해 밑바닥>6", true);
        }
      };
      _0x55e037.atkbefore = function () {
        tbf(_0x55e037, "아머", myCurAtk + _0x55e037.id + armorUp(_0x55e037, "평", "추가") * 25, "닻 휘두르기", 1);
      };
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        const _0x2e9942 = _0x55e037.stack;
        _0x55e037.stack += 5;
        if (_0x2e9942 < 33 && _0x55e037.stack >= 33) {
          setBuffOn(_0x55e037, "발동", "심해 잠행1", true);
        }
        if (_0x2e9942 < 66 && _0x55e037.stack >= 66) {
          setBuffOn(_0x55e037, "발동", "심해 잠행2", true);
        }
        if (_0x2e9942 < 99 && _0x55e037.stack >= 99) {
          setBuffOn(_0x55e037, "발동", "심해 잠행3", true);
        }
        if (_0x2e9942 < 100 && _0x55e037.stack >= 100) {
          setBuffOn(_0x55e037, "발동", "<심해 밑바닥>2", true);
        }
        atkLogic(_0x55e037);
        if (_0x2e9942 < 33 && _0x55e037.stack >= 33) {
          setBuffOn(_0x55e037, "발동", "심해 잠행1", false);
        }
        if (_0x2e9942 < 66 && _0x55e037.stack >= 66) {
          setBuffOn(_0x55e037, "발동", "심해 잠행2", false);
        }
        if (_0x2e9942 < 99 && _0x55e037.stack >= 99) {
          setBuffOn(_0x55e037, "발동", "심해 잠행3", false);
        }
        if (_0x2e9942 < 100 && _0x55e037.stack >= 100) {
          setBuffOn(_0x55e037, "발동", "<심해 밑바닥>2", false);
        }
        if (_0x2e9942 < 100 && _0x55e037.stack >= 100) {
          setBuffOn(_0x55e037, "기본", "<심해 밑바닥>3", true);
          setBuffOn(_0x55e037, "발동", "<심해 밑바닥>4", true);
          setBuffOn(_0x55e037, "발동", "<심해 밑바닥>5", true);
          setBuffOnAll(_0x55e037, "발동", "<심해 밑바닥>6", true);
        }
      };
      _0x55e037.leader = function () {
        hpUpMe(_0x55e037, 60);
        tbf(all, "공퍼증", 100, "배가 나고, 내가 배야1", always);
        tbf(all, "가뎀증", 30, "배가 나고, 내가 배야2", always);
        tbf(all, "일뎀증", 40, "배가 나고, 내가 배야3", always);
        for (let _0x218576 of comp) {
          for (let _0x4d9fa1 of getElementIdx("수", "암")) {
            atbf(_0x218576, "공격", comp[_0x4d9fa1], "받속뎀", 5, "<닻을 올리고 출항>", 2, always);
          }
        }
      };
      _0x55e037.passive = function () {
        anbf(_0x55e037, "평", _0x55e037, "<수중 깊이>", 0, "비기 - 소용돌이 폭포!", 5, 100, always);
        buff(_0x55e037, "평", _0x55e037, "on", "기본", "심해 잠행1", 1, always, "발동", false);
        buff(_0x55e037, "평", _0x55e037, "on", "기본", "심해 잠행2", 1, always, "발동", false);
        buff(_0x55e037, "평", _0x55e037, "on", "기본", "심해 잠행3", 1, always, "발동", false);
        buff(_0x55e037, "평", _0x55e037, "on", "기본", "<심해 밑바닥>2", 1, always, "발동", false);
        anbf(_0x55e037, "피격", _0x55e037, "<수중 깊이>", 0, "비기 - 소용돌이 폭포!", 3, 100, always);
        buff(_0x55e037, "공퍼증", 60, "심해 잠행1", always, false);
        buff(_0x55e037, "일뎀증", 60, "심해 잠행2", always, false);
        buff(_0x55e037, "가뎀증", 30, "심해 잠행3", always, false);
        atbf(_0x55e037, "궁", _0x55e037, "아머", myCurAtk + _0x55e037.id + armorUp(_0x55e037, "궁", "발동") * 50, "<사냥 시작>", 1, always);
        buff(_0x55e037, "일뎀증", 60, "<심해 밑바닥>2", always, false);
        buff(_0x55e037, "평추가*", 30, "<심해 밑바닥>3", always, false);
        buff(_0x55e037, "공격", boss, "받뎀증", 20, "<심해 밑바닥>4", 2, always, "발동", false);
        buff(_0x55e037, "공격", boss, "받일뎀", 50, "<심해 밑바닥>5", 2, always, "발동", false);
        for (let _0x5d41d7 of getElementIdx("암")) {
          buff(_0x55e037, "공격", comp[_0x5d41d7], "받속뎀", 20, "<심해 밑바닥>6", 2, always, "발동", false);
        }
        tbf(_0x55e037, "공퍼증", 10, "공격+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
        if (GLOBAL_TURN == 1) {
          cdChange(_0x55e037, -4);
        }
      };
      const _0xaef79f = _0x55e037.hit;
      _0x55e037.hit = function (..._0x4db280) {
        const _0x297417 = _0x55e037.stack;
        _0x55e037.stack += 3;
        if (_0x297417 < 33 && _0x55e037.stack >= 33) {
          setBuffOn(_0x55e037, "기본", "심해 잠행1", true);
        }
        if (_0x297417 < 66 && _0x55e037.stack >= 66) {
          setBuffOn(_0x55e037, "기본", "심해 잠행2", true);
        }
        if (_0x297417 < 99 && _0x55e037.stack >= 99) {
          setBuffOn(_0x55e037, "기본", "심해 잠행3", true);
        }
        if (_0x297417 < 100 && _0x55e037.stack >= 100) {
          setBuffOn(_0x55e037, "기본", "<심해 밑바닥>2", true);
        }
        _0xaef79f.call(this);
        if (_0x297417 < 100 && _0x55e037.stack >= 100) {
          setBuffOn(_0x55e037, "기본", "<심해 밑바닥>3", true);
          setBuffOn(_0x55e037, "발동", "<심해 밑바닥>4", true);
          setBuffOn(_0x55e037, "발동", "<심해 밑바닥>5", true);
          setBuffOnAll(_0x55e037, "발동", "<심해 밑바닥>6", true);
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10160:
      buff_ex.push("<지켜야 할 존재>");
      setMnc(_0x55e037, [840, 40, 980, 40, 1120, 40, 1260, 40, 1400, 40], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        for (let _0x148bda of getElementIdx("광")) {
          deleteBuff(comp[_0x148bda], "기본", "성검 포효·성진편년1");
        }
        for (let _0x4ed50e of getRoleIdx("딜")) {
          deleteBuff(comp[_0x4ed50e], "기본", "성검 포효·성진편년2");
        }
        switch (_0x78c5e1) {
          case 1:
            for (let _0x4e8a83 of getElementIdx("광")) {
              tbf(comp[_0x4e8a83], "받속뎀", 18, "성검 포효·성진편년1", 8);
            }
            break;
          case 2:
            for (let _0x27ed01 of getElementIdx("광")) {
              tbf(comp[_0x27ed01], "받속뎀", 21, "성검 포효·성진편년1", 8);
            }
            break;
          case 3:
            for (let _0x91f0fd of getElementIdx("광")) {
              tbf(comp[_0x91f0fd], "받속뎀", 24, "성검 포효·성진편년1", 8);
            }
            for (let _0x4e3927 of getRoleIdx("딜")) {
              tbf(comp[_0x4e3927], "평추가*", 15, "성검 포효·성진편년2", 8);
            }
            break;
          case 4:
            for (let _0x313c6e of getElementIdx("광")) {
              tbf(comp[_0x313c6e], "받속뎀", 27, "성검 포효·성진편년1", 8);
            }
            for (let _0x5be337 of getRoleIdx("딜")) {
              tbf(comp[_0x5be337], "평추가*", 20, "성검 포효·성진편년2", 8);
            }
            break;
          default:
            for (let _0x5e1698 of getElementIdx("광")) {
              tbf(comp[_0x5e1698], "받속뎀", 30, "성검 포효·성진편년1", 8);
            }
            for (let _0x2ee465 of getRoleIdx("딜")) {
              tbf(comp[_0x2ee465], "평추가*", 25, "성검 포효·성진편년2", 8);
            }
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037, _0x78c5e1 + 5);
      };
      _0x55e037.atkbefore = function () {
        deleteBuff(boss, "기본", "역날");
        tbf(boss, "받뎀증", 10, "역날", 2);
      };
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(40);
        let _0x1575ac = 0;
        for (let _0x585c91 of comp) {
          if (_0x585c91.element == 3) {
            continue;
          }
          _0x1575ac++;
          nbf(_0x55e037, "<지켜야 할 존재>", 0, "마지막 용자", 1, 4);
        }
        if (_0x1575ac == 4) {
          _0x55e037.cd -= 20;
          _0x55e037.curCd -= 20;
          tbf(_0x55e037, "공퍼증", 200, "<모든 것을 지키는 결심>1", always);
          tbf(_0x55e037, "가뎀증", 50, "<모든 것을 지키는 결심>2", always);
          tbf(_0x55e037, "일뎀증", 100, "<모든 것을 지키는 결심>3", always);
          tbf(_0x55e037, "궁뎀증", 60, "<모든 것을 지키는 결심>4", always);
          for (let _0x1cd322 of getElementIdx("광")) {
            anbf(_0x55e037, "궁", comp[_0x1cd322], "받속뎀", 30, "<모든 것을 지키는 결심>5", 1, 1, always);
          }
        }
      };
      _0x55e037.passive = function () {
        tbf(_0x55e037, "공퍼증", 50, "용사의 직책1", always);
        tbf(_0x55e037, "일뎀증", 50, "용사의 직책2", always);
        tbf(_0x55e037, "궁뎀증", 30, "용사의 직책3", always);
        tbf(_0x55e037, "방뎀증", 100, "용사의 직책4", always);
        for (let _0x44c2cf of comp) {
          if (_0x44c2cf.id == _0x55e037.id) {
            continue;
          }
          const _0x1d6a0a = _0x44c2cf.ultimate;
          const _0x1a12a0 = _0x44c2cf.attack;
          _0x44c2cf.ultimate = function (..._0x4bd365) {
            _0x1d6a0a.apply(this, _0x4bd365);
            cdChange(_0x55e037, -1);
          };
          _0x44c2cf.attack = function (..._0x32aea0) {
            _0x1a12a0.apply(this, _0x32aea0);
            cdChange(_0x55e037, -1);
          };
        }
        atbf(_0x55e037, "방", _0x55e037, "아머", _0x55e037.hp * 20 * armorUp(_0x55e037, "방", "발동"), "<새벽빛>1", 1, always);
        atbf(_0x55e037, "방", _0x55e037, "평추가*", 50, "<새벽빛>2", 2, always);
        tbf(_0x55e037, "가뎀증", 30, "성검 해방, 최종 형태!", always);
        tbf(_0x55e037, "가뎀증", 7.5, "가하는 데미지+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
        if (GLOBAL_TURN == 1) {
          for (let _0x5d966e of comp) {
            if (_0x5d966e.id == _0x55e037.id || _0x5d966e.role != 0) {
              continue;
            }
            cdChange(_0x55e037, -20);
          }
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10177:
      buff_ex.push("<기내식엔 저도 포함♡>");
      setMnc(_0x55e037, [0, 3, 0, 3, 0, 3, 0, 3, 0, 3], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(all, "공퍼증", 45, "가성비 좌석~!1", 1);
            for (let _0x202096 of getRoleIdx("딜")) {
              tbf(comp[_0x202096], "궁뎀증", 24, "가성비 좌석~!2", 1);
            }
            break;
          case 2:
            tbf(all, "공퍼증", 52.5, "이코노미 좌석~!!", 1);
            for (let _0x209ef2 of getRoleIdx("딜")) {
              tbf(comp[_0x209ef2], "궁뎀증", 28, "이코노미 좌석~!2", 1);
            }
            break;
          case 3:
            tbf(all, "공퍼증", 60, "프리미엄 이코노미 좌석~!1", 1);
            for (let _0x178c07 of getRoleIdx("딜")) {
              tbf(comp[_0x178c07], "궁뎀증", 32, "프리미엄 이코노미 좌석~!2", 1);
            }
            for (let _0x6983f6 of getRoleIdx("딜")) {
              tbf(comp[_0x6983f6], "가뎀증", 5, "프리미엄 이코노미 좌석~!3", 1);
            }
            for (let _0x4d0616 of getRoleIdx("딜")) {
              tbf(comp[_0x4d0616], "궁추가*", 20, "프리미엄 이코노미 좌석~!4", 1);
            }
            break;
          case 4:
            tbf(all, "공퍼증", 67.5, "비즈니스 좌석~!1", 1);
            for (let _0x1e32e3 of getRoleIdx("딜")) {
              tbf(comp[_0x1e32e3], "궁뎀증", 36, "비즈니스 좌석~!2", 1);
            }
            for (let _0x70c128 of getRoleIdx("딜")) {
              tbf(comp[_0x70c128], "가뎀증", 10, "비즈니스 좌석~!3", 1);
            }
            for (let _0xab11fa of getRoleIdx("딜")) {
              tbf(comp[_0xab11fa], "궁추가*", 40, "비즈니스 좌석~!4", 1);
            }
            break;
          default:
            tbf(all, "공퍼증", 75, "품격 만점의 퍼스트 클래스~!1", 1);
            for (let _0x191306 of getRoleIdx("딜")) {
              tbf(comp[_0x191306], "궁뎀증", 40, "품격 만점의 퍼스트 클래스~!2", 1);
            }
            for (let _0x5c7181 of getRoleIdx("딜")) {
              tbf(comp[_0x5c7181], "가뎀증", 15, "품격 만점의 퍼스트 클래스~!3", 1);
            }
            for (let _0x330d52 of getRoleIdx("딜")) {
              tbf(comp[_0x330d52], "궁추가*", 60, "품격 만점의 퍼스트 클래스~!4", 1);
            }
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {
        for (let _0x18fe71 of getRoleIdx("딜")) {
          tbf(comp[_0x18fe71], "공고증", myCurAtk + _0x55e037.id + 30, "기내 서비스", 1);
        }
      };
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(40);
        tbf(all, "공퍼증", 120, "바알 항공에 탑승하신 여러분을 환영합니다~1", always);
        for (let _0x10b7a3 of getElementIdx("광")) {
          anbf(comp[_0x10b7a3], "궁", comp[_0x10b7a3], "<기내식엔 저도 포함♡>", 0, "<즐거운 여행 되시길 바랍니다>", 1, 3, always);
          buff(comp[_0x10b7a3], "궁", comp[_0x10b7a3], "on", "기본", "<즐거운 여행 되시길 바랍니다>1", 1, always, "발동", false);
          buff(comp[_0x10b7a3], "궁", comp[_0x10b7a3], "on", "기본", "<즐거운 여행 되시길 바랍니다>2", 1, always, "발동", false);
          buff(comp[_0x10b7a3], "궁", comp[_0x10b7a3], "on", "기본", "<즐거운 여행 되시길 바랍니다>3", 1, always, "발동", false);
          buff(comp[_0x10b7a3], "궁뎀증", 50, "<즐거운 여행 되시길 바랍니다>1", always, false);
          buff(comp[_0x10b7a3], "궁뎀증", 50, "<즐거운 여행 되시길 바랍니다>2", always, false);
          buff(comp[_0x10b7a3], "궁추가*", 140, "<즐거운 여행 되시길 바랍니다>3", always, false);
          const _0x17f1fb = comp[_0x10b7a3].ultimate;
          comp[_0x10b7a3].ultimate = function (..._0x1bba98) {
            const _0x261ed7 = comp[_0x10b7a3].getNest("<기내식엔 저도 포함♡>");
            if (_0x261ed7 == 0) {
              setBuffOn(comp[_0x10b7a3], "발동", "<즐거운 여행 되시길 바랍니다>1", true);
            }
            if (_0x261ed7 == 1) {
              setBuffOn(comp[_0x10b7a3], "발동", "<즐거운 여행 되시길 바랍니다>2", true);
            }
            if (_0x261ed7 == 2) {
              setBuffOn(comp[_0x10b7a3], "발동", "<즐거운 여행 되시길 바랍니다>3", true);
            }
            _0x17f1fb.apply(this, _0x1bba98);
            if (_0x261ed7 == 0) {
              setBuffOn(comp[_0x10b7a3], "발동", "<즐거운 여행 되시길 바랍니다>1", false);
            }
            if (_0x261ed7 == 1) {
              setBuffOn(comp[_0x10b7a3], "발동", "<즐거운 여행 되시길 바랍니다>2", false);
            }
            if (_0x261ed7 == 2) {
              setBuffOn(comp[_0x10b7a3], "발동", "<즐거운 여행 되시길 바랍니다>3", false);
            }
          };
        }
        const _0x2c0ce2 = getElKind();
        if (_0x2c0ce2 == 3 || _0x2c0ce2 == 4 || _0x2c0ce2 == 5) {
          tbf(_0x55e037, "공퍼증", -500, "<나나미는 바빠요>", always);
        }
      };
      _0x55e037.passive = function () {
        for (let _0x1ffd09 of getRoleIdx("딜")) {
          atbf(_0x55e037, "궁", comp[_0x1ffd09], "공고증", myCurAtk + _0x55e037.id + 30, "비행하기에 아주 좋은 날이네요~1", 1, always);
        }
        for (let _0x2fc3c4 of getRoleIdx("딜")) {
          tbf(comp[_0x2fc3c4], "궁추가*", 15, "비행하기에 아주 좋은 날이네요~2", always);
        }
        for (let _0x345b2f of getRoleIdx("딜")) {
          atbf(_0x55e037, "궁", comp[_0x345b2f], "공고증", myCurAtk + _0x55e037.id + 20, "나나미의 개인 서비스1", 1, always);
        }
        for (let _0x17eb6f of getRoleIdx("딜")) {
          tbf(comp[_0x17eb6f], "궁추가*", 15, "나나미의 개인 서비스3", always);
        }
        tbf(_0x55e037, "공퍼증", 10, "공격+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {
          if (GLOBAL_TURN == 1) {
            for (let _0x4973f4 of getElementIdx("광")) {
              cdChange(comp[_0x4973f4], -3);
            }
          }
          if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 3 == 0) {
            for (let _0x310a95 of getElementIdx("광")) {
              tbf(comp[_0x310a95], "받속뎀", 50, "바알 항공에 탑승하신 여러분을 환영합니다~2", 1);
            }
            tbf(boss, "받뎀증", 25, "바알 항공에 탑승하신 여러분을 환영합니다~3", 1);
          }
        }
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 3 == 0) {
          for (let _0x402013 of getElementIdx("광", "암")) {
            tbf(comp[_0x402013], "받속뎀", 20, "청순하고 달콤한 영업용 미소", 1);
          }
          for (let _0x4c8fc6 of getElementIdx("광", "암")) {
            tbf(comp[_0x4c8fc6], "받속뎀", 20, "나나미의 개인 서비스2", 1);
          }
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10178:
      setMnc(_0x55e037, [0, 3, 0, 3, 0, 3, 0, 3, 0, 3], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        deleteBuff(_0x55e037, "기본", "초고속 루프 기동2");
        for (let _0x83b110 of getElementIdx("풍")) {
          deleteBuff(comp[_0x83b110], "기본", "초고속 루프 기동3");
        }
        deleteBuff(_0x55e037, "기본", "초고속 루프 기동4");
        switch (_0x78c5e1) {
          case 1:
            tbf(_0x55e037, "공퍼증", 100, "초고속 루프 기동1", 1);
            tbf(_0x55e037, "발효증", 150, "초고속 루프 기동2", 3);
            for (let _0x35a2f6 of getElementIdx("풍")) {
              tbf(comp[_0x35a2f6], "받속뎀", 18, "초고속 루프 기동3", 3);
            }
            break;
          case 2:
            tbf(_0x55e037, "공퍼증", 125, "초고속 루프 기동1", 1);
            tbf(_0x55e037, "발효증", 175, "초고속 루프 기동2", 3);
            for (let _0x9ced4 of getElementIdx("풍")) {
              tbf(comp[_0x9ced4], "받속뎀", 21, "초고속 루프 기동3", 3);
            }
            break;
          case 3:
            tbf(_0x55e037, "공퍼증", 150, "초고속 루프 기동1", 1);
            tbf(_0x55e037, "발효증", 200, "초고속 루프 기동2", 3);
            for (let _0x43ce1c of getElementIdx("풍")) {
              tbf(comp[_0x43ce1c], "받속뎀", 24, "초고속 루프 기동3", 3);
            }
            buff(_0x55e037, "공발동*", 80, "초고속 루프 기동4", 3, false);
            break;
          case 4:
            tbf(_0x55e037, "공퍼증", 175, "초고속 루프 기동1", 1);
            tbf(_0x55e037, "발효증", 225, "초고속 루프 기동2", 3);
            for (let _0x337979 of getElementIdx("풍")) {
              tbf(comp[_0x337979], "받속뎀", 27, "초고속 루프 기동3", 3);
            }
            buff(_0x55e037, "공발동*", 100, "초고속 루프 기동4", 3, false);
            break;
          default:
            tbf(_0x55e037, "공퍼증", 200, "초고속 루프 기동1", 1);
            tbf(_0x55e037, "발효증", 250, "초고속 루프 기동2", 3);
            for (let _0x33d491 of getElementIdx("풍")) {
              tbf(comp[_0x33d491], "받속뎀", 30, "초고속 루프 기동3", 3);
            }
            buff(_0x55e037, "공발동*", 120, "초고속 루프 기동4", 3, false);
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
        setBuffOnAll(_0x55e037, "기본", "초고속 루프 기동4", true);
      };
      _0x55e037.atkbefore = function () {
        tbf(_0x55e037, "공퍼증", 100, "회오리 여행 가방", 1);
      };
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(40);
        tbf(all, "공퍼증", 50, "바알 항공이 정성을 다해 모시겠습니다", always);
        if (getElementCnt("풍") >= 4) {
          tbf(all, "가뎀증", 40, "<전속력으로☆바알 항공>1", always);
          tbf(all, "발효증", 90, "<전속력으로☆바알 항공>2", always);
          for (let _0x18b553 of getElementIdx("풍")) {
            anbf(all, "궁", comp[_0x18b553], "받속뎀", 3, "<전속력으로☆바알 항공>3", 1, 20, always);
          }
        }
      };
      _0x55e037.passive = function () {
        _0x55e037.canCDChange = false;
        tbf(_0x55e037, "평발동*", 100, "타올라라! 이 몸의 생존 본능!1", always);
        tbf(_0x55e037, "궁발동*", 200, "타올라라! 이 몸의 생존 본능!2", always);
        anbf(_0x55e037, "궁", _0x55e037, "가뎀증", 15, "검은 스타킹의 유혹", 1, 3, always);
        tbf(_0x55e037, "가뎀증", 7.5, "가하는 데미지+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 3 == 0) {
          if (getRoleCnt("딜") >= 2) {
            tbf(boss, "받발뎀", 80, "<리틀 바알 출동!>1", 3);
            for (let _0x3108c4 of getElementIdx("풍")) {
              tbf(comp[_0x3108c4], "받속뎀", 20, "<리틀 바알 출동!>2", 1);
            }
          }
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10179:
      setMnc(_0x55e037, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        for (let _0x560b5f of comp) {
          deleteBuff(_0x560b5f, "기본", "화려한 붕대 치료법1");
        }
        switch (_0x78c5e1) {
          case 1:
            tbf(all, "공퍼증", 20, "화려한 붕대 치료법1", 4);
            for (let _0xb0a802 of getElementIdx("화")) {
              nbf(comp[_0xb0a802], "받속뎀", 6, "화려한 붕대 치료법2", 1, 2);
            }
            break;
          case 2:
            tbf(all, "공퍼증", 25, "화려한 붕대 치료법1", 4);
            for (let _0x21f978 of getElementIdx("화")) {
              nbf(comp[_0x21f978], "받속뎀", 7, "화려한 붕대 치료법2", 1, 2);
            }
            break;
          case 3:
            tbf(all, "공퍼증", 30, "화려한 붕대 치료법1", 4);
            for (let _0x54837d of getElementIdx("화")) {
              nbf(comp[_0x54837d], "받속뎀", 8, "화려한 붕대 치료법2", 1, 2);
            }
            nbf(boss, "받뎀증", 3, "화려한 붕대 치료법3", 1, 2);
            break;
          case 4:
            tbf(all, "공퍼증", 35, "화려한 붕대 치료법1", 4);
            for (let _0x540ed8 of getElementIdx("화")) {
              nbf(comp[_0x540ed8], "받속뎀", 9, "화려한 붕대 치료법2", 1, 2);
            }
            nbf(boss, "받뎀증", 4, "화려한 붕대 치료법3", 1, 2);
            break;
          default:
            tbf(all, "공퍼증", 40, "화려한 붕대 치료법1", 4);
            for (let _0x451b30 of getElementIdx("화")) {
              nbf(comp[_0x451b30], "받속뎀", 10, "화려한 붕대 치료법2", 1, 2);
            }
            nbf(boss, "받뎀증", 5, "화려한 붕대 치료법3", 1, 2);
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
        for (let _0x2d9647 of comp) {
          _0x2d9647.heal();
        }
      };
      _0x55e037.atkbefore = function () {
        for (let _0x4427cf of comp) {
          _0x4427cf.heal();
        }
      };
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(50);
        tbf(all, "공퍼증", 50, "시저의 전용 간호사", always);
        if (getElKind() == 2) {
          tbf(all, "일뎀증", 100, "<♡전용 간호사♡>1", always);
          tbf(all, "가뎀증", 30, "<♡전용 간호사♡>2", always);
          anbf(all, "평", boss, "받뎀증", 1, "<♡전용 간호사♡>3", 1, 20, always);
          for (let _0x68c522 of comp) {
            atbf(_0x68c522, "궁", _0x68c522, "일뎀증", 50, "<♡전용 간호사♡>4", 2, always);
          }
        }
      };
      _0x55e037.passive = function () {
        tbf(_0x55e037, "공퍼증", 30, "디저트를 위해 싸우겠어1", always);
        tbf(_0x55e037, "평추가*", 75, "디저트를 위해 싸우겠어2", always);
        atbf(_0x55e037, "방", all, "일뎀증", 40, "<루루♡슈퍼 신중 모드>1", 4, always);
        for (let _0x44f814 of getRoleIdx("딜")) {
          tbf(comp[_0x44f814], "평추가*", 20, "간호사도 명탐정이 될 수 있어", always);
        }
        tbf(_0x55e037, "공퍼증", 10, "공격+", always);
      };
      _0x55e037.defense = function () {
        for (let _0x467149 of comp) {
          deleteBuff(_0x467149, "기본", "<루루♡슈퍼 신중 모드>1");
        }
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
        if (GLOBAL_TURN == 1) {
          cdChange(_0x55e037, -4);
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10180:
      setMnc(_0x55e037, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        deleteBuff(boss, "기본", "치명적인 연애3");
        switch (_0x78c5e1) {
          case 1:
            tbf(boss, "받뎀증", 20, "치명적인 연애1", 1);
            tbf(boss, "방경감", 5, "치명적인 연애3", 4);
            break;
          case 2:
            tbf(boss, "받뎀증", 25, "치명적인 연애1", 1);
            for (let _0x3b15f2 of getElementIdx("수")) {
              tbf(comp[_0x3b15f2], "받속뎀", 5, "치명적인 연애2", 1);
            }
            tbf(boss, "방경감", 5, "치명적인 연애3", 4);
            break;
          case 3:
            tbf(boss, "받뎀증", 30, "치명적인 연애1", 1);
            for (let _0x16eac of getElementIdx("수")) {
              tbf(comp[_0x16eac], "받속뎀", 10, "치명적인 연애2", 1);
            }
            tbf(boss, "방경감", 10, "치명적인 연애3", 4);
            break;
          case 4:
            tbf(boss, "받뎀증", 35, "치명적인 연애1", 1);
            for (let _0x9177ad of getElementIdx("수")) {
              tbf(comp[_0x9177ad], "받속뎀", 15, "치명적인 연애2", 1);
            }
            tbf(boss, "방경감", 10, "치명적인 연애3", 4);
            break;
          default:
            tbf(boss, "받뎀증", 40, "치명적인 연애1", 1);
            for (let _0x3c58e9 of getElementIdx("수")) {
              tbf(comp[_0x3c58e9], "받속뎀", 20, "치명적인 연애2", 1);
            }
            tbf(boss, "방경감", 10, "치명적인 연애3", 4);
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(40);
        if (getRoleCnt("디") >= 4) {
          tbf(all, "공퍼증", 50, "<유리만 있으면 돼♡>1", always);
          tbf(all, "가뎀증", 20, "<유리만 있으면 돼♡>2", always);
          tbf(all, "일뎀증", 50, "<유리만 있으면 돼♡>3", always);
          tbf(all, "궁뎀증", 30, "<유리만 있으면 돼♡>4", always);
          tbf(all, "발효증", 30, "<유리만 있으면 돼♡>5", always);
          for (let _0x574f70 of comp) {
            atbf(_0x574f70, "공격", all, "공고증", myCurAtk + _0x574f70.id + 20, "<꼼짝 못 하게 해줄게♡>1", 1, always);
            anbf(_0x574f70, "공격", boss, "받뎀증", 0.4, "<꼼짝 못 하게 해줄게♡>2", 1, 50, always);
            for (let _0x39ae88 of comp) {
              anbf(_0x574f70, "공격", _0x39ae88, "받속뎀", 0.6, "<꼼짝 못 하게 해줄게♡>3", 1, 50, always);
            }
            for (let _0x124e51 of getRoleIdx("디")) {
              anbf(_0x574f70, "공격", comp[_0x124e51], "받직뎀", 1.2, "<꼼짝 못 하게 해줄게♡>4", 1, 50, always);
            }
          }
        }
      };
      _0x55e037.passive = function () {
        tbf(_0x55e037, "공퍼증", 50, "감정을 억제할 수가 없어1", always);
        tbf(_0x55e037, "방뎀증", 100, "감정을 억제할 수가 없어2", always);
        atbf(_0x55e037, "평", boss, "받일뎀", 70, "삼독오대1", 1, always);
        atbf(_0x55e037, "궁", boss, "받궁뎀", 35, "삼독오대2", 1, always);
        tbf(_0x55e037, "가뎀증", 30, "전용 간호사", always);
        atbf(_0x55e037, "공격", boss, "받뎀증", 20, "<밀착 간호>1", 1, always);
        for (let _0x41a728 of getElementIdx("수")) {
          atbf(_0x55e037, "공격", comp[_0x41a728], "받속뎀", 20, "<밀착 간호>2", 1, always);
        }
        tbf(_0x55e037, "공퍼증", 10, "공격+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10181:
      _0x55e037.stack = 0;
      setMnc(_0x55e037, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x78c5e1);
      buff_ex.push("<포만감>", "<격렬한 운동>");
      _0x55e037.ultbefore = function () {
        for (let _0x4db7f6 of comp) {
          deleteBuff(_0x4db7f6, "기본", "오늘 저녁은 쇼가야키!5");
        }
        switch (_0x78c5e1) {
          case 1:
            nbf(_0x55e037, "<포만감>", 0, "오늘 저녁은 쇼가야키!1", 2, 5);
            _0x55e037.stack += 2;
            if (_0x55e037.stack > 5) {
              _0x55e037.stack = 5;
            }
            tbf(all, "가뎀증", 12, "오늘 저녁은 쇼가야키!2", 1);
            nbf(all, "가뎀증", 3, "오늘 저녁은 쇼가야키!3", 1, 2);
            tbf(all, "궁추가*", 75, "오늘 저녁은 쇼가야키!4", 1);
            tbf(all, "평추가*", 37.5, "오늘 저녁은 쇼가야키!5", 4);
            break;
          case 2:
            nbf(_0x55e037, "<포만감>", 0, "오늘 저녁은 쇼가야키!1", 2, 5);
            _0x55e037.stack += 2;
            if (_0x55e037.stack > 5) {
              _0x55e037.stack = 5;
            }
            tbf(all, "가뎀증", 14, "오늘 저녁은 쇼가야키!2", 1);
            nbf(all, "가뎀증", 3.5, "오늘 저녁은 쇼가야키!3", 1, 2);
            tbf(all, "궁추가*", 87.5, "오늘 저녁은 쇼가야키!4", 1);
            tbf(all, "평추가*", 43.8, "오늘 저녁은 쇼가야키!5", 4);
            break;
          case 3:
            nbf(_0x55e037, "<포만감>", 0, "오늘 저녁은 쇼가야키!1", 2, 5);
            _0x55e037.stack += 2;
            if (_0x55e037.stack > 5) {
              _0x55e037.stack = 5;
            }
            tbf(all, "가뎀증", 16, "오늘 저녁은 쇼가야키!2", 1);
            nbf(all, "가뎀증", 4, "오늘 저녁은 쇼가야키!3", 1, 2);
            tbf(all, "궁추가*", 100, "오늘 저녁은 쇼가야키!4", 1);
            tbf(all, "평추가*", 50, "오늘 저녁은 쇼가야키!5", 4);
            break;
          case 4:
            nbf(_0x55e037, "<포만감>", 0, "오늘 저녁은 쇼가야키!1", 2, 5);
            _0x55e037.stack += 2;
            if (_0x55e037.stack > 5) {
              _0x55e037.stack = 5;
            }
            tbf(all, "가뎀증", 18, "오늘 저녁은 쇼가야키!2", 1);
            nbf(all, "가뎀증", 4.5, "오늘 저녁은 쇼가야키!3", 1, 2);
            tbf(all, "궁추가*", 112.5, "오늘 저녁은 쇼가야키!4", 1);
            tbf(all, "평추가*", 56.3, "오늘 저녁은 쇼가야키!5", 4);
            break;
          default:
            nbf(_0x55e037, "<포만감>", 0, "오늘 저녁은 쇼가야키!1", 2, 5);
            _0x55e037.stack += 2;
            if (_0x55e037.stack > 5) {
              _0x55e037.stack = 5;
            }
            tbf(all, "가뎀증", 20, "오늘 저녁은 쇼가야키!2", 1);
            nbf(all, "가뎀증", 5, "오늘 저녁은 쇼가야키!3", 1, 2);
            tbf(all, "궁추가*", 125, "오늘 저녁은 쇼가야키!4", 1);
            tbf(all, "평추가*", 62.5, "오늘 저녁은 쇼가야키!5", 4);
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        if (_0x55e037.stack == 2 || _0x55e037.stack == 3) {
          setBuffOn(_0x55e037, "기본", "기억 속의 맛4", true);
        } else if (_0x55e037.stack == 1) {
          setBuffOn(_0x55e037, "발동", "기억 속의 맛4", true);
        }
        ultLogic(_0x55e037);
        if (_0x55e037.stack == 1) {
          setBuffOn(_0x55e037, "발동", "기억 속의 맛4", false);
        }
        _0x55e037.stack += 1;
        if (_0x55e037.stack > 5) {
          _0x55e037.stack = 5;
        }
        setBuffOn(_0x55e037, "발동", "기억 속의 맛3", true);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        if (_0x55e037.stack == 3) {
          setBuffOn(_0x55e037, "발동", "기억 속의 맛4", true);
        }
        atkLogic(_0x55e037);
        if (_0x55e037.stack == 3) {
          setBuffOn(_0x55e037, "발동", "기억 속의 맛4", false);
        }
        _0x55e037.stack += 1;
        if (_0x55e037.stack > 5) {
          _0x55e037.stack = 5;
        }
        if (_0x55e037.stack == 3) {
          setBuffOn(_0x55e037, "발동", "기억 속의 맛3", true);
        }
      };
      _0x55e037.leader = function () {
        hpUpMe(_0x55e037, 60);
        for (let _0x28f714 of comp) {
          if (_0x28f714.id != _0x55e037.id) {
            hpUpMe(_0x28f714, 30);
          }
        }
        atbf(_0x55e037, "방", all, "아머", _0x55e037.hp * 10, "<꿈 탈출>", 1, always);
      };
      _0x55e037.passive = function () {
        anbf(_0x55e037, "공격", _0x55e037, "<포만감>", 0, "오늘 저녁은 쇼가야키!1", 1, 5, always);
        buff(_0x55e037, "공격", _0x55e037, "on", "기본", "기억 속의 맛4", 1, always, "발동", false);
        buff(_0x55e037, "궁", all, "아머", _0x55e037.hp * 20, "기억 속의 맛3", 2, always, "발동", false);
        buff(_0x55e037, "가뎀증", 30, "기억 속의 맛4", always, false);
        anbf(_0x55e037, "피격", _0x55e037, "<격렬한 운동>", 0, "스포츠 만능", 1, 1, always);
        tbf(all, "일뎀증", 70, "잠자는 숲 속의 검사2", always);
        tbf(all, "궁뎀증", 35, "잠자는 숲 속의 검사3", always);
        tbf(all, "받아증", 30, "잠자는 숲 속의 검사4", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
        if (GLOBAL_TURN == 1) {
          cdChange(_0x55e037, -4);
          nbf(_0x55e037, "<포만감>", 0, "오늘 저녁은 쇼가야키!1", 2, 5);
          _0x55e037.stack += 2;
          if (_0x55e037.stack > 5) {
            _0x55e037.stack = 5;
          }
        }
        if (GLOBAL_TURN > 1) {
          if (_0x55e037.getNest("<격렬한 운동>") == 1) {
            for (let _0x3c8c96 of comp) {
              deleteBuff(_0x3c8c96, "기본", "<소화 촉진>1");
            }
            tbf(all, "공퍼증", 30, "<소화 촉진>1", 2);
            nbf(_0x55e037, "<포만감>", 0, "오늘 저녁은 쇼가야키!1", -1, 5);
            nbf(_0x55e037, "<격렬한 운동>", 0, "스포츠 만능", -1, 1);
            if (_0x55e037.stack == 3) {
              setBuffOn(_0x55e037, "발동", "기억 속의 맛3", false);
            } else if (_0x55e037.stack == 4) {
              setBuffOn(_0x55e037, "기본", "기억 속의 맛4", false);
            }
            _0x55e037.stack -= 1;
            if (_0x55e037.stack < 0) {
              _0x55e037.stack = 0;
            }
          }
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {
          for (let _0x232366 of comp) {
            if (_0x232366.curHp / _0x232366.hp > 0.5) {
              if (_0x232366.id == _0x55e037.id) {
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
      return _0x55e037;
    case 10182:
      _0x55e037.stack = 0;
      setMnc(_0x55e037, [0, 5, 0, 5, 0, 5, 0, 5, 0, 5], _0x78c5e1);
      buff_ex.push("<가족의 정>");
      _0x55e037.ultbefore = function () {
        for (let _0x557e57 of comp) {
          deleteBuff(_0x557e57, "기본", "오피스 여왕의 응시3");
          deleteBuff(_0x557e57, "기본", "오피스 여왕의 응시4");
        }
        switch (_0x78c5e1) {
          case 1:
            nbf(_0x55e037, "공퍼증", 18, "오파스 여왕의 응시1", 1, 2);
            for (let _0x429e91 of getElementIdx("암")) {
              nbf(comp[_0x429e91], "받속뎀", 6.5, "오피스 여왕의 응시2", 1, 2);
            }
            for (let _0x17cc85 of comp) {
              if (_0x17cc85.role == 0 || _0x17cc85.role == 2) {
                tbf(_0x17cc85, "일뎀증", 18, "오피스 여왕의 응시3", 5);
              }
            }
            break;
          case 2:
            nbf(_0x55e037, "공퍼증", 21, "오파스 여왕의 응시1", 1, 2);
            for (let _0x19b5c3 of getElementIdx("암")) {
              nbf(comp[_0x19b5c3], "받속뎀", 8, "오피스 여왕의 응시2", 1, 2);
            }
            for (let _0x303749 of comp) {
              if (_0x303749.role == 0 || _0x303749.role == 2) {
                tbf(_0x303749, "일뎀증", 21, "오피스 여왕의 응시3", 5);
                tbf(_0x303749, "평추가*", 21, "오피스 여왕의 응시4", 5);
              }
            }
            break;
          case 3:
            nbf(_0x55e037, "공퍼증", 24, "오파스 여왕의 응시1", 1, 2);
            for (let _0x334546 of getElementIdx("암")) {
              nbf(comp[_0x334546], "받속뎀", 9.5, "오피스 여왕의 응시2", 1, 2);
            }
            for (let _0x442390 of comp) {
              if (_0x442390.role == 0 || _0x442390.role == 2) {
                tbf(_0x442390, "일뎀증", 24, "오피스 여왕의 응시3", 5);
                tbf(_0x442390, "평추가*", 24, "오피스 여왕의 응시4", 5);
              }
            }
            break;
          case 4:
            nbf(_0x55e037, "공퍼증", 27, "오파스 여왕의 응시1", 1, 2);
            for (let _0x7678f5 of getElementIdx("암")) {
              nbf(comp[_0x7678f5], "받속뎀", 11, "오피스 여왕의 응시2", 1, 2);
            }
            for (let _0x3615fe of comp) {
              if (_0x3615fe.role == 0 || _0x3615fe.role == 2) {
                tbf(_0x3615fe, "일뎀증", 27, "오피스 여왕의 응시3", 5);
                tbf(_0x3615fe, "평추가*", 27, "오피스 여왕의 응시4", 5);
              }
            }
            break;
          default:
            nbf(_0x55e037, "공퍼증", 30, "오파스 여왕의 응시1", 1, 2);
            for (let _0x102c9d of getElementIdx("암")) {
              nbf(comp[_0x102c9d], "받속뎀", 12.5, "오피스 여왕의 응시2", 1, 2);
            }
            for (let _0x348c84 of comp) {
              if (_0x348c84.role == 0 || _0x348c84.role == 2) {
                tbf(_0x348c84, "일뎀증", 30, "오피스 여왕의 응시3", 5);
                tbf(_0x348c84, "평추가*", 30, "오피스 여왕의 응시4", 5);
              }
            }
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {
        tbf(all, "공고증", myCurAtk + _0x55e037.id + 30, "지령 전달", 1);
      };
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(45);
        tbf(all, "공퍼증", 85, "도도한 위엄의 가장1", always);
        tbf(all, "일뎀증", 110, "도도한 위엄의 가장2", always);
        if (getRoleCnt("섶") >= 2) {
          tbf(all, "공퍼증", -500, "도도한 위엄의 가장3", always);
        }
        anbf(_0x55e037, "공격", all, "가뎀증", 6, "도도한 위엄의 가장5", 1, 5, always);
        for (let _0x220ff5 of comp) {
          if (_0x220ff5.id != _0x55e037.id) {
            anbf(_0x220ff5, "공격", _0x55e037, "공퍼증", 2, "<네, 엄마!!>1", 1, 20, always);
            for (let _0x19671b of getElementIdx("암")) {
              anbf(_0x220ff5, "공격", comp[_0x19671b], "받속뎀", 1.5, "<네, 엄마!!>2", 1, 20, always);
            }
            anbf(_0x220ff5, "공격", boss, "받뎀증", 1.5, "<네, 엄마!!>3", 1, 20, always);
          }
        }
      };
      _0x55e037.passive = function () {
        tbf(_0x55e037, "평추가*", 75, "엄마의 호통1", always);
        atbf(_0x55e037, "궁", all, "공고증", myCurAtk + _0x55e037.id + 30, "엄마의 호통2", 1, always);
        for (let _0x359705 of comp) {
          if (_0x359705.id != _0x55e037.id) {
            anbf(_0x359705, "평", _0x55e037, "<가족의 정>", 0, "도도한 위엄의 가장4", 1, 24, always);
            const _0x2baec7 = _0x359705.attack;
            _0x359705.attack = function (..._0x1bb20d) {
              const _0x5373c1 = _0x55e037.stack;
              _0x2baec7.apply(this, _0x1bb20d);
              _0x55e037.stack += 1;
              if (_0x55e037.stack > 24) {
                _0x55e037.stack = 24;
              }
              if (_0x5373c1 < 12 && _0x55e037.stack >= 12) {
                setBuffOnAll(_0x55e037, "발동", "사랑이 담긴 암흑 요리2", true);
              }
              if (_0x5373c1 < 24 && _0x55e037.stack >= 24) {
                setBuffOn(_0x55e037, "발동", "사랑이 담긴 암흑 요리3", true);
              }
              if (_0x5373c1 < 8 && _0x55e037.stack >= 8) {
                setBuffOnAll(_0x55e037, "발동", "엄마의 따뜻한 포옹1", true);
              }
              if (_0x5373c1 < 20 && _0x55e037.stack >= 20) {
                setBuffOn(_0x55e037, "발동", "엄마의 따뜻한 포옹2", true);
              }
            };
          }
        }
        for (let _0x50719a of comp) {
          if (_0x50719a.id != _0x55e037.id) {
            buff(_0x55e037, "공격", _0x50719a, "일뎀증", 20, "사랑이 담긴 암흑 요리2", 1, always, "발동", false);
          }
        }
        buff(_0x55e037, "공격", boss, "받뎀증", 5, "사랑이 담긴 암흑 요리3", 1, always, "발동", false);
        for (let _0x48bcf8 of comp) {
          if (_0x48bcf8.id != _0x55e037.id) {
            buff(_0x55e037, "공격", _0x48bcf8, "일뎀증", 20, "엄마의 따뜻한 포옹1", 1, always, "발동", false);
          }
        }
        buff(_0x55e037, "공격", boss, "받뎀증", 5, "엄마의 따뜻한 포옹2", 1, always, "발동", false);
        tbf(_0x55e037, "공퍼증", 10, "공격+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {
          if (GLOBAL_TURN == 1) {
            nbf(_0x55e037, "<가족의 정>", 0, "도도한 위엄의 가장4", 8, 24);
            _0x55e037.stack += 8;
            if (_0x55e037.stack > 24) {
              _0x55e037.stack = 24;
            }
            setBuffOnAll(_0x55e037, "발동", "엄마의 따뜻한 포옹1", true);
          }
        }
        if (GLOBAL_TURN == 1) {
          cdChange(_0x55e037, -5);
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10183:
      _0x55e037.stack = 0;
      setMnc(_0x55e037, [0, 4, 0, 4, 60, 4, 90, 4, 120, 4], _0x78c5e1);
      buff_ex.push("<이목 끌기>");
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            nbf(_0x55e037, "공퍼증", 24, "이 천재의 반전극1", 1, 3);
            nbf(_0x55e037, "가뎀증", 12, "이 천재의 반전극2", 1, 3);
            nbf(_0x55e037, "궁뎀증", 12, "이 천재의 반전극3", 1, 3);
            break;
          case 2:
            nbf(_0x55e037, "공퍼증", 28, "이 천재의 반전극1", 1, 3);
            nbf(_0x55e037, "가뎀증", 14, "이 천재의 반전극2", 1, 3);
            nbf(_0x55e037, "궁뎀증", 14, "이 천재의 반전극3", 1, 3);
            break;
          case 3:
            nbf(_0x55e037, "공퍼증", 48, "이 천재의 반전극1", 1, 2);
            nbf(_0x55e037, "가뎀증", 24, "이 천재의 반전극2", 1, 2);
            nbf(_0x55e037, "궁뎀증", 24, "이 천재의 반전극3", 1, 2);
            break;
          case 4:
            nbf(_0x55e037, "공퍼증", 54, "이 천재의 반전극1", 1, 2);
            nbf(_0x55e037, "가뎀증", 27, "이 천재의 반전극2", 1, 2);
            nbf(_0x55e037, "궁뎀증", 27, "이 천재의 반전극3", 1, 2);
            break;
          default:
            nbf(_0x55e037, "공퍼증", 60, "이 천재의 반전극1", 1, 2);
            nbf(_0x55e037, "가뎀증", 30, "이 천재의 반전극2", 1, 2);
            nbf(_0x55e037, "궁뎀증", 30, "이 천재의 반전극3", 1, 2);
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
        nbf(_0x55e037, "<이목 끌기>", 0, "<갸루 화장 스킬>", -12, 12);
        _0x55e037.stack = 0;
        setBuffOn(_0x55e037, "기본", "트렌드를 좇는 건 필수1", false);
        setBuffOn(_0x55e037, "기본", "트렌드를 좇는 건 필수2", false);
        setBuffOn(_0x55e037, "기본", "트렌드를 좇는 건 필수3", false);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
        for (let _0x56846f of comp) {
          if (_0x56846f.id != _0x55e037.id) {
            anbf(_0x56846f, "평", _0x55e037, "<이목 끌기>", 0, "<갸루 화장 스킬>", 1, 12, 1);
          }
        }
      };
      _0x55e037.leader = function () {
        hpUpAll(45);
        if (getElementCnt("수") >= 3) {
          tbf(_0x55e037, "공퍼증", 120, "<갸루 Style♡>1", always);
          tbf(_0x55e037, "궁뎀증", 60, "<갸루 Style♡>2", always);
          tbf(_0x55e037, "가뎀증", 60, "<갸루 Style♡>3", always);
        }
        if (getElementCnt("수") >= 3) {
          for (let _0x1d4c73 of comp) {
            if (_0x1d4c73.id != _0x55e037.id) {
              tbf(_0x1d4c73, "공퍼증", 50, "<블링하게 등장☆>1", always);
              atbf(_0x1d4c73, "궁", _0x55e037, "궁추가*", 30, "<천재의 무적 매력~>1", 1, always);
              atbf(_0x1d4c73, "궁", boss, "받궁뎀", 15, "<천재의 무적 매력~>2", 1, always);
              for (let _0x64bc8c of getElementIdx("수")) {
                atbf(_0x1d4c73, "궁", comp[_0x64bc8c], "받속뎀", 10, "<천재의 무적 매력~>3", 1, always);
              }
              atbf(_0x1d4c73, "궁", boss, "받뎀증", 7.5, "<천재의 무적 매력~>4", 1, always);
            }
          }
        }
      };
      _0x55e037.passive = function () {
        for (let _0x57812f of getElementIdx("수")) {
          atbf(_0x55e037, "평", comp[_0x57812f], "받속뎀", 10, "<소개팅 무적 콤보 스킬>1", 4, always);
        }
        atbf(_0x55e037, "평", _0x55e037, "궁뎀증", 8, "<소개팅 무적 콤보 스킬>2", 4, always);
        atbf(_0x55e037, "평", _0x55e037, "가뎀증", 8, "<소개팅 무적 콤보 스킬>3", 4, always);
        for (let _0x26e161 of comp) {
          if (_0x26e161.id != _0x55e037.id) {
            const _0x138cf3 = _0x26e161.attack;
            _0x26e161.attack = function (..._0x507771) {
              _0x138cf3.apply(this, _0x507771);
              _0x55e037.stack = _0x55e037.getNest("<이목 끌기>");
              if (_0x55e037.stack >= 4) {
                setBuffOn(_0x55e037, "기본", "트렌드를 좇는 건 필수1", true);
              }
              if (_0x55e037.stack >= 8) {
                setBuffOn(_0x55e037, "기본", "트렌드를 좇는 건 필수2", true);
              }
              if (_0x55e037.stack >= 12) {
                setBuffOn(_0x55e037, "기본", "트렌드를 좇는 건 필수3", true);
              }
            };
          }
        }
        buff(_0x55e037, "궁추가*", 210, "트렌드를 좇는 건 필수1", always, false);
        buff(_0x55e037, "궁추가*", 140, "트렌드를 좇는 건 필수2", always, false);
        buff(_0x55e037, "궁추가*", 70, "트렌드를 좇는 건 필수3", always, false);
        atbf(_0x55e037, "평", all, "공퍼증", 20, "오타쿠에게 다정한 갸루1", 4, always);
        for (let _0x4791ae of comp) {
          if (_0x4791ae.id != _0x55e037.id) {
            anbf(_0x4791ae, "방", _0x55e037, "<이목 끌기>", 0, "<갸루 화장 스킬>", 2, 12, always);
            const _0x40e21a = _0x4791ae.defense;
            _0x4791ae.defense = function (..._0x58c2ec) {
              _0x40e21a.apply(this, _0x58c2ec);
              const _0x14972f = _0x55e037.stack;
              _0x55e037.stack += 2;
              if (_0x55e037.stack > 12) {
                _0x55e037.stack = 12;
              }
              if (_0x14972f < 4 && _0x55e037.stack >= 4) {
                setBuffOn(_0x55e037, "기본", "트렌드를 좇는 건 필수1", true);
              }
              if (_0x14972f < 8 && _0x55e037.stack >= 8) {
                setBuffOn(_0x55e037, "기본", "트렌드를 좇는 건 필수2", true);
              }
              if (_0x14972f < 12 && _0x55e037.stack >= 12) {
                setBuffOn(_0x55e037, "기본", "트렌드를 좇는 건 필수3", true);
              }
            };
          }
        }
        tbf(_0x55e037, "공퍼증", 10, "공격+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {
          if (GLOBAL_TURN == 1) {
            for (let _0x3f88cf of getElementIdx("수")) {
              nbf(comp[_0x3f88cf], "받속뎀", 30, "천재 갸루 군사1", 1, 1);
            }
          }
        }
        if (GLOBAL_TURN == 1) {
          cdChange(_0x55e037, -4);
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10184:
      _0x55e037.stack = 0;
      buff_ex.push("<마력 수집>");
      setMnc(_0x55e037, [0, 3, 0, 3, 0, 3, 0, 3, 0, 3], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        let _0x48c67f = getElementIdx("풍", "암");
        switch (_0x78c5e1) {
          case 1:
            for (let _0x54ea69 of _0x48c67f) {
              tbf(comp[_0x54ea69], "궁뎀증", 30, "아담한 몸집, 모성의 포용1", 1);
            }
            for (let _0x471af0 of _0x48c67f) {
              tbf(comp[_0x471af0], "가뎀증", 12, "아담한 몸집, 모성의 포용2", 1);
            }
            for (let _0x2d2a05 of _0x48c67f) {
              tbf(comp[_0x2d2a05], "받속뎀", 18, "아담한 몸집, 모성의 포용3", 1);
            }
            break;
          case 2:
            for (let _0x2f1cef of _0x48c67f) {
              tbf(comp[_0x2f1cef], "궁뎀증", 35, "아담한 몸집, 모성의 포용1", 1);
            }
            for (let _0x37d11a of _0x48c67f) {
              tbf(comp[_0x37d11a], "가뎀증", 14, "아담한 몸집, 모성의 포용2", 1);
            }
            for (let _0x5b670a of _0x48c67f) {
              tbf(comp[_0x5b670a], "받속뎀", 21, "아담한 몸집, 모성의 포용3", 1);
            }
            break;
          case 3:
            for (let _0x5c69a2 of _0x48c67f) {
              tbf(comp[_0x5c69a2], "궁뎀증", 40, "아담한 몸집, 모성의 포용1", 1);
            }
            for (let _0x32a362 of _0x48c67f) {
              tbf(comp[_0x32a362], "가뎀증", 16, "아담한 몸집, 모성의 포용2", 1);
            }
            for (let _0x591cb4 of _0x48c67f) {
              tbf(comp[_0x591cb4], "받속뎀", 24, "아담한 몸집, 모성의 포용3", 1);
            }
            break;
          case 4:
            for (let _0x1b3a9f of _0x48c67f) {
              tbf(comp[_0x1b3a9f], "궁뎀증", 45, "아담한 몸집, 모성의 포용1", 1);
            }
            for (let _0x4d6482 of _0x48c67f) {
              tbf(comp[_0x4d6482], "가뎀증", 18, "아담한 몸집, 모성의 포용2", 1);
            }
            for (let _0x130ba1 of _0x48c67f) {
              tbf(comp[_0x130ba1], "받속뎀", 27, "아담한 몸집, 모성의 포용3", 1);
            }
            break;
          default:
            for (let _0x1b8359 of _0x48c67f) {
              tbf(comp[_0x1b8359], "궁뎀증", 50, "아담한 몸집, 모성의 포용1", 1);
            }
            for (let _0x1d41a9 of _0x48c67f) {
              tbf(comp[_0x1d41a9], "가뎀증", 20, "아담한 몸집, 모성의 포용2", 1);
            }
            for (let _0x57beb5 of _0x48c67f) {
              tbf(comp[_0x57beb5], "받속뎀", 30, "아담한 몸집, 모성의 포용3", 1);
            }
            break;
        }
      };
      _0x55e037.ultafter = function () {
        boss.def = false;
      };
      _0x55e037.ultimate = function () {
        if (_0x55e037.stack == 0) {
          setBuffOn(_0x55e037, "발동", "페어리 행복 안심 위원회1", true);
        }
        ultLogic(_0x55e037);
        if (_0x55e037.stack == 0) {
          setBuffOn(_0x55e037, "발동", "페어리 행복 안심 위원회1", false);
        }
        nbf(_0x55e037, "<마력 수집>", 0, "미니 더피 등장!", 1, 3);
        if (_0x55e037.stack == 2) {
          setBuffOnAll(_0x55e037, "발동", "페어리 행복 안심 위원회3", true);
        }
        _0x55e037.stack += 1;
        if (_0x55e037.stack > 3) {
          _0x55e037.stack = 3;
        }
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(45);
        for (let _0x3c6f07 of comp) {
          for (let _0xb0d0b0 of comp) {
            anbf(_0x3c6f07, "궁", _0xb0d0b0, "공퍼증", 8, "<애교 타임>2", 1, 11, always);
          }
          for (let _0x2a56bb of comp) {
            anbf(_0x3c6f07, "궁", _0x2a56bb, "가뎀증", 5, "<애교 타임>3", 1, 11, always);
          }
          anbf(_0x3c6f07, "궁", boss, "받궁뎀", 4, "<애교 타임>4", 1, 11, always);
        }
      };
      _0x55e037.passive = function () {
        buff(_0x55e037, "공퍼증", 100, "페어리 행복 안심 위원회1", always, false);
        buff(_0x55e037, "궁", _0x55e037, "on", "기본", "페어리 행복 안심 위원회1", 1, always, "발동", false);
        for (let _0x40dee3 of comp) {
          buff(_0x55e037, "궁", _0x40dee3, "공고증", myCurAtk + _0x55e037.id + 20, "페어리 행복 안심 위원회3", 1, always, "발동", false);
        }
        for (let _0x573aa2 of getRoleIdx("딜", "탱", "디")) {
          tbf(comp[_0x573aa2], "궁추가*", 75, "꼬마 엄마의 섹스테크닉♡", always);
        }
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {
          if (GLOBAL_TURN == 1) {
            nbf(_0x55e037, "<마력 수집>", 0, "미니 더피 등장!", 1, 3);
            _0x55e037.stack += 1;
            if (_0x55e037.stack > 3) {
              _0x55e037.stack = 3;
            }
            setBuffOn(_0x55e037, "기본", "페어리 행복 안심 위원회1", true);
          }
        }
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 3 == 0) {
          if (_0x55e037.stack >= 2) {
            tbf(boss, "받뎀증", 15, "페어리 행복 안심 위원회2", 1);
          }
        }
        if (GLOBAL_TURN == 1) {
          cdChange(_0x55e037, -3);
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10185:
      _0x55e037.stack = 0;
      buff_ex.push("<원금에 이자까지>");
      setMnc(_0x55e037, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(_0x55e037, "공퍼증", 105, "시멘트 통에 처박아줄게♡1", 1);
            tbf(_0x55e037, "발효증", 150, "시멘트 통에 처박아줄게♡2", 1);
            tbf(_0x55e037, "가뎀증", 24, "시멘트 통에 처박아줄게♡3", 1);
            break;
          case 2:
            tbf(_0x55e037, "공퍼증", 120, "시멘트 통에 처박아줄게♡1", 1);
            tbf(_0x55e037, "발효증", 175, "시멘트 통에 처박아줄게♡2", 1);
            tbf(_0x55e037, "가뎀증", 28, "시멘트 통에 처박아줄게♡3", 1);
            tbf(boss, "받뎀증", 14, "시멘트 통에 처박아줄게♡4", 1);
            break;
          case 3:
            tbf(_0x55e037, "공퍼증", 135, "시멘트 통에 처박아줄게♡1", 1);
            tbf(_0x55e037, "발효증", 200, "시멘트 통에 처박아줄게♡2", 1);
            tbf(_0x55e037, "가뎀증", 32, "시멘트 통에 처박아줄게♡3", 1);
            tbf(boss, "받뎀증", 16, "시멘트 통에 처박아줄게♡4", 1);
            break;
          case 4:
            tbf(_0x55e037, "공퍼증", 150, "시멘트 통에 처박아줄게♡1", 1);
            tbf(_0x55e037, "발효증", 225, "시멘트 통에 처박아줄게♡2", 1);
            tbf(_0x55e037, "가뎀증", 36, "시멘트 통에 처박아줄게♡3", 1);
            tbf(boss, "받뎀증", 18, "시멘트 통에 처박아줄게♡4", 1);
            break;
          default:
            tbf(_0x55e037, "공퍼증", 165, "시멘트 통에 처박아줄게♡1", 1);
            tbf(_0x55e037, "발효증", 250, "시멘트 통에 처박아줄게♡2", 1);
            tbf(_0x55e037, "가뎀증", 40, "시멘트 통에 처박아줄게♡3", 1);
            tbf(boss, "받뎀증", 20, "시멘트 통에 처박아줄게♡4", 1);
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        if (_0x55e037.stack >= 1) {
          tbf(_0x55e037, "궁발동*", 110, "달콤한 마력 이자1", 1);
        }
        if (_0x55e037.stack >= 2) {
          tbf(_0x55e037, "궁발동*", 110, "달콤한 마력 이자2", 1);
        }
        if (_0x55e037.stack >= 3) {
          tbf(_0x55e037, "궁발동*", 110, "달콤한 마력 이자3", 1);
        }
        if (_0x55e037.stack >= 4) {
          tbf(_0x55e037, "궁발동*", 110, "달콤한 마력 이자4", 1);
        }
        ultLogic(_0x55e037);
        nbf(_0x55e037, "<원금에 이자까지>", 0, "<빚 갚을 시간>", -4, 4);
        _0x55e037.stack = 0;
        setBuffOn(_0x55e037, "기본", "<일수 악마>", false);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(45);
        const _0x5aa2ba = getElementIdx("광");
        if (_0x5aa2ba.length >= 3) {
          for (let _0x93a47a of comp) {
            if (_0x93a47a.id == _0x55e037.id) {
              continue;
            }
            tbf(_0x93a47a, "공퍼증", 45, "<잡어! 잡어!>", always);
            anbf(_0x93a47a, "공격", _0x55e037, "<원금에 이자까지>", 0, "<빚 갚을 시간>", 1, 4, always);
            const _0x18a175 = _0x93a47a.attack;
            _0x93a47a.attack = function (..._0x1984f9) {
              _0x18a175.apply(this, _0x1984f9);
              if (_0x55e037.stack == 3) {
                setBuffOn(_0x55e037, "기본", "<일수 악마>", true);
              }
              _0x55e037.stack += 1;
              if (_0x55e037.stack > 4) {
                _0x55e037.stack = 4;
              }
            };
            const _0x21155f = _0x93a47a.ultimate;
            _0x93a47a.ultimate = function (..._0x5a87b6) {
              _0x21155f.apply(this, _0x5a87b6);
              if (_0x55e037.stack == 3) {
                setBuffOn(_0x55e037, "기본", "<일수 악마>", true);
              }
              _0x55e037.stack += 1;
              if (_0x55e037.stack > 4) {
                _0x55e037.stack = 4;
              }
            };
            for (let _0x5e6d78 of _0x5aa2ba) {
              atbf(_0x93a47a, "공격", comp[_0x5e6d78], "받속뎀", 7.5, "<빚 갚을 시간>2", 1, always);
            }
            atbf(_0x93a47a, "궁", _0x55e037, "궁발동*", 65, "<이자 2배!>1", 1, always);
            atbf(_0x93a47a, "궁", _0x55e037, "공퍼증", 25, "<이자 2배!>2", 1, always);
            atbf(_0x93a47a, "궁", _0x55e037, "가뎀증", 10, "<이자 2배!>3", 1, always);
            atbf(_0x93a47a, "궁", _0x55e037, "발효증", 25, "<이자 2배!>4", 1, always);
          }
        }
      };
      _0x55e037.passive = function () {
        tbf(_0x55e037, "공퍼증", 65, "잡어가 파산해버렸네", always);
        for (let _0x3fe321 of comp) {
          if (_0x3fe321.id == _0x55e037.id) {
            continue;
          }
          anbf(_0x3fe321, "궁", _0x55e037, "<원금에 이자까지>", 0, "<빚 갚을 시간>", 1, 4, always);
          const _0x843fe5 = _0x3fe321.ultimate;
          _0x3fe321.ultimate = function (..._0x34e70a) {
            _0x843fe5.apply(this, _0x34e70a);
            if (_0x55e037.stack == 3) {
              setBuffOn(_0x55e037, "기본", "<일수 악마>", true);
            }
            _0x55e037.stack += 1;
            if (_0x55e037.stack > 4) {
              _0x55e037.stack = 4;
            }
          };
          for (let _0x444110 of getElementIdx("광")) {
            atbf(_0x3fe321, "궁", comp[_0x444110], "받속뎀", 7.5, "<빚 갚을 시간>2", 1, always);
          }
        }
        buff(_0x55e037, "궁발동*", 65, "<일수 악마>", always, false);
        tbf(_0x55e037, "공퍼증", 10, "공격+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10186:
      _0x55e037.stack = -1;
      buff_ex.push("<시저 님의 전속 메이드>", "<엘프 일족의 완벽한 여왕>");
      setMnc(_0x55e037, [0, 1, 0, 1, 0, 1, 0, 1, 0, 1], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            for (let _0x297280 of getRoleIdx("딜", "탱", "디")) {
              if (comp[_0x297280].element != 1) {
                continue;
              }
              nbf(comp[_0x297280], "일뎀증", 60, "여왕의 봉사1", 1, 1);
              deleteBuff(comp[_0x297280], "기본", "여왕의 봉사2");
              tbf(comp[_0x297280], "평추가*", 27, "여왕의 봉사2", 50);
            }
            nbf(boss, "받뎀증", 12, "여왕의 봉사3", 1, 1);
            break;
          case 2:
            for (let _0x15de55 of getRoleIdx("딜", "탱", "디")) {
              if (comp[_0x15de55].element != 1) {
                continue;
              }
              nbf(comp[_0x15de55], "일뎀증", 70, "여왕의 봉사1", 1, 1);
              deleteBuff(comp[_0x15de55], "기본", "여왕의 봉사2");
              tbf(comp[_0x15de55], "평추가*", 31.5, "여왕의 봉사2", 50);
            }
            nbf(boss, "받뎀증", 14, "여왕의 봉사3", 1, 1);
            break;
          case 3:
            for (let _0x3f942c of getRoleIdx("딜", "탱", "디")) {
              if (comp[_0x3f942c].element != 1) {
                continue;
              }
              nbf(comp[_0x3f942c], "일뎀증", 80, "여왕의 봉사1", 1, 1);
              deleteBuff(comp[_0x3f942c], "기본", "여왕의 봉사2");
              tbf(comp[_0x3f942c], "평추가*", 36, "여왕의 봉사2", 50);
            }
            nbf(boss, "받뎀증", 16, "여왕의 봉사3", 1, 1);
            break;
          case 4:
            for (let _0x282508 of getRoleIdx("딜", "탱", "디")) {
              if (comp[_0x282508].element != 1) {
                continue;
              }
              nbf(comp[_0x282508], "일뎀증", 90, "여왕의 봉사1", 1, 1);
              deleteBuff(comp[_0x282508], "기본", "여왕의 봉사2");
              tbf(comp[_0x282508], "평추가*", 40.5, "여왕의 봉사2", 50);
            }
            nbf(boss, "받뎀증", 18, "여왕의 봉사3", 1, 1);
            break;
          default:
            for (let _0x3a55e7 of getRoleIdx("딜", "탱", "디")) {
              if (comp[_0x3a55e7].element != 1) {
                continue;
              }
              nbf(comp[_0x3a55e7], "일뎀증", 100, "여왕의 봉사1", 1, 1);
              deleteBuff(comp[_0x3a55e7], "기본", "여왕의 봉사2");
              tbf(comp[_0x3a55e7], "평추가*", 45, "여왕의 봉사2", 50);
            }
            nbf(boss, "받뎀증", 20, "여왕의 봉사3", 1, 1);
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        if (_0x55e037.stack == 0) {
          nbf(_0x55e037, "<시저 님의 전속 메이드>", 0, "가끔은 휴가를 내는 것도 나쁘지 않지", -1, 1);
          nbf(_0x55e037, "<엘프 일족의 완벽한 여왕>", 0, "왕의 책임을 잊어선 안 돼", 1, 1);
          _0x55e037.stack = 1;
        } else {
          nbf(_0x55e037, "<시저 님의 전속 메이드>", 0, "가끔은 휴가를 내는 것도 나쁘지 않지", 1, 1);
          nbf(_0x55e037, "<엘프 일족의 완벽한 여왕>", 0, "왕의 책임을 잊어선 안 돼", -1, 1);
          atbf(_0x55e037, "궁", _0x55e037, "on", "기본", "<전속 메이드 서비스>1", 1, 1);
          _0x55e037.stack = 0;
        }
        ultLogic(_0x55e037);
        setBuffOn(_0x55e037, "기본", "<전속 메이드 서비스>1", _0x55e037.stack == 0);
        setBuffOn(_0x55e037, "기본", "<전속 메이드 서비스>2", _0x55e037.stack == 0);
        setBuffOnAll(_0x55e037, "발동", "<완벽한 여왕의 비호>1", _0x55e037.stack == 1);
        setBuffOn(_0x55e037, "발동", "<완벽한 여왕의 비호>2", _0x55e037.stack == 1);
        setBuffOnAll(_0x55e037, "발동", "여왕 혹은 메이드 전부 문제없지2", _0x55e037.stack == 0);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(45);
        if (getElementCnt("암") >= 2) {
          for (let _0x43ebf2 of getElementIdx("수")) {
            tbf(comp[_0x43ebf2], "공퍼증", 50, "<메이드 청소팀>1", always);
            tbf(comp[_0x43ebf2], "일뎀증", 100, "<메이드 청소팀>2", always);
            tbf(comp[_0x43ebf2], "가뎀증", 40, "<메이드 청소팀>3", always);
            tbf(comp[_0x43ebf2], "평추가*", 50, "<메이드 청소팀>4", always);
            anbf(comp[_0x43ebf2], "평", boss, "받뎀증", 0.75, "<메이드 청소팀>5", 1, 40, always);
            for (let _0x38da64 of getElementIdx("수")) {
              anbf(comp[_0x43ebf2], "평", comp[_0x38da64], "받속뎀", 2, "<메이드 청소팀>6", 1, 20, always);
            }
          }
        }
        if (getElementCnt("수") >= 2) {
          for (let _0x56e912 of getElementIdx("암")) {
            tbf(comp[_0x56e912], "공퍼증", 100, "<메이드 봉사팀>1", always);
            tbf(comp[_0x56e912], "일뎀증", 150, "<메이드 봉사팀>2", always);
            tbf(comp[_0x56e912], "가뎀증", 40, "<메이드 봉사팀>3", always);
            tbf(comp[_0x56e912], "평추가*", 80, "<메이드 봉사팀>4", always);
            anbf(comp[_0x56e912], "평", boss, "받뎀증", 0.75, "<메이드 봉사팀>5", 1, 40, always);
            for (let _0x9ed324 of getElementIdx("암")) {
              anbf(comp[_0x56e912], "평", comp[_0x9ed324], "받속뎀", 3.5, "<메이드 봉사팀>6", 1, 20, always);
            }
          }
        }
      };
      _0x55e037.passive = function () {
        buff(_0x55e037, "가뎀증", 30, "<전속 메이드 서비스>1", always, false);
        buff(_0x55e037, "평추가*", 50, "<전속 메이드 서비스>2", always, false);
        for (let _0x18bfc3 of getElementIdx("수")) {
          buff(_0x55e037, "평", comp[_0x18bfc3], "아머", _0x55e037.hp * 10, "<완벽한 여왕의 비호>1", 1, always, "발동", false);
        }
        buff(_0x55e037, "방", _0x55e037, "아머", _0x55e037.hp * 30, "<완벽한 여왕의 비호>2", 1, always, "발동", false);
        for (let _0x932067 of getElementIdx("수")) {
          anbf(_0x55e037, "평", comp[_0x932067], "공퍼증", 6.25, "여왕 혹은 메이드 전부 문제없지1", 1, 8, always);
        }
        for (let _0x28cc2b of getElementIdx("수")) {
          buff(_0x55e037, "평", comp[_0x28cc2b], "받속뎀", 3.75, "여왕 혹은 메이드 전부 문제없지2", 8, always, "발동", false);
        }
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
        if (GLOBAL_TURN == 1) {
          cdChange(_0x55e037, -1);
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10187:
      buff_ex.push("<소녀의 음수>");
      setMnc(_0x55e037, [265, 3, 298, 3, 331, 3, 364, 3, 397, 3], _0x78c5e1);
      _0x55e037.stack = 0;
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            nbf(boss, "받발뎀", 21, "메이드 청소술! 먼지 멸절 쾌도!1", 1, 3);
            break;
          case 2:
            nbf(boss, "받발뎀", 24.5, "메이드 청소술! 먼지 멸절 쾌도!1", 1, 3);
            for (let _0x4f286e of getRoleIdx("딜", "탱", "디")) {
              buff(comp[_0x4f286e], "공발동*", 14, "메이드 청소술! 먼지 멸절 쾌도!2", 4, false);
            }
            break;
          case 3:
            nbf(boss, "받발뎀", 28, "메이드 청소술! 먼지 멸절 쾌도!1", 1, 3);
            for (let _0x1743f0 of getRoleIdx("딜", "탱", "디")) {
              buff(comp[_0x1743f0], "공발동*", 16, "메이드 청소술! 먼지 멸절 쾌도!2", 4, false);
            }
            break;
          case 4:
            nbf(boss, "받발뎀", 31.5, "메이드 청소술! 먼지 멸절 쾌도!1", 1, 3);
            for (let _0x26f6d6 of getRoleIdx("딜", "탱", "디")) {
              buff(comp[_0x26f6d6], "공발동*", 18, "메이드 청소술! 먼지 멸절 쾌도!2", 4, false);
            }
            break;
          default:
            nbf(boss, "받발뎀", 35, "메이드 청소술! 먼지 멸절 쾌도!1", 1, 3);
            for (let _0x4b1ac3 of getRoleIdx("딜", "탱", "디")) {
              buff(comp[_0x4b1ac3], "공발동*", 20, "메이드 청소술! 먼지 멸절 쾌도!2", 4, false);
            }
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        if (_0x55e037.stack == 2) {
          setBuffOn(_0x55e037, "발동", "특제! 신성한 세정제!3", true);
        }
        ultLogic(_0x55e037);
        if (_0x55e037.stack == 2) {
          setBuffOn(_0x55e037, "발동", "특제! 신성한 세정제!3", false);
        }
        for (let _0x30b046 of comp) {
          setBuffOnAll(_0x30b046, "기본", "메이드 청소술! 먼지 멸절 쾌도!2", true);
        }
        if (_0x55e037.stack == 0) {
          setBuffOnAll(_0x55e037, "발동", "특제! 신성한 세정제!1", true);
        } else if (_0x55e037.stack == 1) {
          setBuffOn(_0x55e037, "기본", "특제! 신성한 세정제!2", true);
        }
        _0x55e037.stack++;
        if (_0x55e037.stack > 3) {
          _0x55e037.stack = 3;
        }
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(45);
        tbf(all, "공퍼증", 90, "일류 메이드 학습 중!1", always);
        tbf(all, "가뎀증", 25, "일류 메이드 학습 중!2", always);
        anbf(_0x55e037, "궁", boss, "받뎀증", 5, "<메이드 청소 비급서 특별판>1", 1, 3, always);
        for (let _0x14e1ac of getElementIdx("암")) {
          anbf(_0x55e037, "궁", comp[_0x14e1ac], "받속뎀", 10, "<메이드 청소 비급서 특별판>2", 1, 3, always);
        }
        anbf(_0x55e037, "궁", boss, "받발뎀", 42.5, "<메이드 청소 비급서 특별판>3", 1, 3, always);
      };
      _0x55e037.passive = function () {
        anbf(_0x55e037, "궁", _0x55e037, "<소녀의 음수>", 0, "특제! 신성한 세정제!", 1, 3, always);
        buff(_0x55e037, "궁", _0x55e037, "on", "기본", "특제! 신성한 세정제!3", 1, always, "발동", false);
        for (let _0x520fb3 of getElementIdx("암")) {
          buff(_0x55e037, "궁", comp[_0x520fb3], "받속뎀", 2.5, "특제! 신성한 세정제!1", 1, 3, always, "발동", false);
        }
        buff(_0x55e037, "궁발동*", 40, "특제! 신성한 세정제!2", always, false);
        buff(_0x55e037, "가뎀증", 15, "특제! 신성한 세정제!3", always, false);
        anbf(_0x55e037, "궁", boss, "받뎀증", 20, "받아라! 초강력 세정제!1", 1, 3, always);
        for (let _0x1d5893 of getElementIdx("암")) {
          anbf(_0x55e037, "궁", comp[_0x1d5893], "받속뎀", 5, "메이드 청소술! 먼지 박멸 회오리!", 1, 3, always);
        }
        tbf(_0x55e037, "공퍼증", 10, "공격+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
        if (GLOBAL_TURN == 1) {
          cdChange(_0x55e037, -3);
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10188:
      _0x55e037.stack = 0;
      setMnc(_0x55e037, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x78c5e1);
      buff_ex.push("<뼈저린 후회>");
      _0x55e037.ultbefore = function () {
        for (let _0x2d65d9 of comp) {
          deleteBuff(_0x2d65d9, "기본", "장미 개화1");
        }
        for (let _0x1885a2 of comp) {
          deleteBuff(_0x1885a2, "기본", "장미 개화3");
        }
        deleteBuff(boss, "기본", "장미 개화4");
        switch (_0x78c5e1) {
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
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
        const _0x55c19a = _0x55e037.stack;
        if (_0x55e037.isLeader) {
          if (_0x55c19a == 3) {
            setBuffOn(comp[4], "기본", "스스로 유배된 마왕2", true);
          }
          if (_0x55c19a == 3) {
            setBuffOn(comp[4], "기본", "스스로 유배된 마왕3", true);
          }
          if (_0x55c19a == 7) {
            setBuffOn(comp[4], "기본", "스스로 유배된 마왕4", true);
          }
          if (_0x55c19a == 7) {
            setBuffOn(comp[4], "기본", "스스로 유배된 마왕5", true);
          }
        }
        if (_0x55c19a == 3) {
          setBuffOnAll(comp[4], "발동", "<더 이상 피하지 않겠어>1", true);
        }
        if (_0x55c19a == 3) {
          setBuffOnAll(comp[4], "발동", "<더 이상 피하지 않겠어>2", true);
        }
        if (_0x55c19a == 3) {
          setBuffOn(comp[4], "기본", "다시 다진 결의1", true);
        }
        if (_0x55c19a == 7) {
          setBuffOnAll(comp[4], "발동", "<모든 것을 지키겠어>1", true);
        }
        if (_0x55c19a == 7) {
          setBuffOn(comp[4], "발동", "<모든 것을 지키겠어>2", true);
        }
        if (_0x55c19a == 7) {
          setBuffOn(comp[4], "기본", "다시 다진 결의2", true);
        }
        if (_0x55c19a == 3) {
          setBuffOn(comp[4], "발동", "잊은 적 없는 그 사람", true);
        }
        _0x55e037.stack++;
        if (_0x55e037.stack > 8) {
          _0x55e037.stack = 8;
        }
      };
      _0x55e037.atkbefore = function () {
        tbf(all, "공고증", myCurAtk + _0x55e037.id + 30, "축복의 빛", 1);
      };
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
        const _0x5a081a = _0x55e037.stack;
        if (_0x55e037.isLeader) {
          if (_0x5a081a == 3) {
            setBuffOn(comp[4], "기본", "스스로 유배된 마왕2", true);
          }
          if (_0x5a081a == 3) {
            setBuffOn(comp[4], "기본", "스스로 유배된 마왕3", true);
          }
          if (_0x5a081a == 7) {
            setBuffOn(comp[4], "기본", "스스로 유배된 마왕4", true);
          }
          if (_0x5a081a == 7) {
            setBuffOn(comp[4], "기본", "스스로 유배된 마왕5", true);
          }
        }
        if (_0x5a081a == 3) {
          setBuffOnAll(comp[4], "발동", "<더 이상 피하지 않겠어>1", true);
        }
        if (_0x5a081a == 3) {
          setBuffOnAll(comp[4], "발동", "<더 이상 피하지 않겠어>2", true);
        }
        if (_0x5a081a == 3) {
          setBuffOn(comp[4], "기본", "다시 다진 결의1", true);
        }
        if (_0x5a081a == 7) {
          setBuffOnAll(comp[4], "발동", "<모든 것을 지키겠어>1", true);
        }
        if (_0x5a081a == 7) {
          setBuffOn(comp[4], "발동", "<모든 것을 지키겠어>2", true);
        }
        if (_0x5a081a == 7) {
          setBuffOn(comp[4], "기본", "다시 다진 결의2", true);
        }
        if (_0x5a081a == 3) {
          setBuffOn(comp[4], "발동", "잊은 적 없는 그 사람", true);
        }
        _0x55e037.stack++;
        if (_0x55e037.stack > 8) {
          _0x55e037.stack = 8;
        }
      };
      _0x55e037.leader = function () {
        hpUpAll(50);
        if (getElKind() == 1) {
          tbf(all, "공퍼증", 50, "<은밀한 도움>1", always);
          tbf(all, "가뎀증", 45, "<은밀한 도움>2", always);
          tbf(all, "일뎀증", 75, "<은밀한 도움>3", always);
          tbf(all, "평추가*", 30, "<은밀한 도움>4", always);
        }
        for (let _0x513e66 of getRoleIdx("딜", "탱", "디")) {
          atbf(comp[_0x513e66], "공격", all, "공고증", myCurAtk + comp[_0x513e66].id + 15, "스스로 유배된 마왕1", 1, always);
        }
        buff(comp[4], "궁뎀증", 40, "스스로 유배된 마왕2", always, false);
        buff(comp[4], "궁추가*", 50, "스스로 유배된 마왕3", always, false);
        buff(comp[4], "궁뎀증", 80, "스스로 유배된 마왕4", always, false);
        buff(comp[4], "궁추가*", 100, "스스로 유배된 마왕5", always, false);
      };
      _0x55e037.passive = function () {
        anbf(_0x55e037, "공격", comp[4], "<뼈저린 후회>", 0, "잊은 적 없는 그 사람", 1, 8, always);
        atbf(_0x55e037, "궁", all, "공고증", myCurAtk + _0x55e037.id + 30, "잊은 적 없는 그 사람2", 1, always);
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
        const _0x2854b5 = comp[4].ultimate;
        comp[4].ultimate = function (..._0x184077) {
          _0x2854b5.apply(this, _0x184077);
          if (_0x55e037.stack >= 4) {
            _0x55e037.stack = 0;
            if (_0x55e037.isLeader) {
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
        atbf(_0x55e037, "공격", comp[4], "공고증", myCurAtk + _0x55e037.id + 15, "다시 출발1", 1, always);
        tbf(_0x55e037, "공퍼증", 10, "공격+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {
          if (GLOBAL_TURN == 1) {
            nbf(boss, "받뎀증", 16, "스스로 유배된 마왕6", 1, 1);
            for (let _0x55f789 of getElementIdx("광")) {
              nbf(comp[_0x55f789], "받속뎀", 40, "스스로 유배된 마왕7", 1, 1);
            }
          }
        }
        if (GLOBAL_TURN == 1 || GLOBAL_TURN == 5 || GLOBAL_TURN == 9) {
          for (let _0x3e27d2 of getElementIdx("광")) {
            nbf(comp[_0x3e27d2], "받속뎀", 10, "다시 출발2", 1, 3);
          }
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10189:
      _0x55e037.stack = 0;
      buff_ex.push("<지옥의 화염>", "<저주 같은 사랑>");
      setMnc(_0x55e037, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(_0x55e037, "공퍼증", 100, "종언-잔혹의 발톱1", 2);
            tbf(_0x55e037, "일뎀증", 50, "종언-잔혹의 발톱2", 2);
            for (let _0x1f652f of getElementIdx("화")) {
              tbf(comp[_0x1f652f], "받속뎀", 18, "종언-잔혹의 발톱3", 2);
            }
            break;
          case 2:
            tbf(_0x55e037, "공퍼증", 115, "종언-잔혹의 발톱1", 2);
            tbf(_0x55e037, "일뎀증", 65, "종언-잔혹의 발톱2", 2);
            for (let _0x547985 of getElementIdx("화")) {
              tbf(comp[_0x547985], "받속뎀", 21, "종언-잔혹의 발톱3", 2);
            }
            break;
          case 3:
            tbf(_0x55e037, "공퍼증", 130, "종언-잔혹의 발톱1", 2);
            tbf(_0x55e037, "일뎀증", 80, "종언-잔혹의 발톱2", 2);
            for (let _0x188a42 of getElementIdx("화")) {
              tbf(comp[_0x188a42], "받속뎀", 24, "종언-잔혹의 발톱3", 2);
            }
            anbf(_0x55e037, "평", _0x55e037, "<지옥의 화염>", 0, "만물 멸절", 1, 6, 2);
            break;
          case 4:
            tbf(_0x55e037, "공퍼증", 145, "종언-잔혹의 발톱1", 2);
            tbf(_0x55e037, "일뎀증", 95, "종언-잔혹의 발톱2", 2);
            for (let _0x13c222 of getElementIdx("화")) {
              tbf(comp[_0x13c222], "받속뎀", 27, "종언-잔혹의 발톱3", 2);
            }
            anbf(_0x55e037, "평", _0x55e037, "<지옥의 화염>", 0, "만물 멸절", 2, 6, 2);
            break;
          default:
            tbf(_0x55e037, "공퍼증", 160, "종언-잔혹의 발톱1", 2);
            tbf(_0x55e037, "일뎀증", 110, "종언-잔혹의 발톱2", 2);
            for (let _0x42e199 of getElementIdx("화")) {
              tbf(comp[_0x42e199], "받속뎀", 30, "종언-잔혹의 발톱3", 2);
            }
            anbf(_0x55e037, "평", _0x55e037, "<지옥의 화염>", 0, "만물 멸절", 3, 6, 2);
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
        setBuffOnAll(_0x55e037, "발동", "만물 멸절1", false);
        setBuffOnAll(_0x55e037, "발동", "만물 멸절2", false);
        setBuffOnAll(_0x55e037, "발동", "만물 멸절3", false);
        setBuffOnAll(_0x55e037, "발동", "만물 멸절4", false);
        setBuffOnAll(_0x55e037, "발동", "만물 멸절5", false);
        setBuffOnAll(_0x55e037, "발동", "만물 멸절6", false);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {
        nbf(_0x55e037, "일뎀증", 5, "타오르지 않는 증오2", 1, 10);
      };
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
        _0x55e037.hit();
      };
      _0x55e037.leader = function () {
        hpUpAll(50);
        if (getRoleCnt("딜") >= 2) {
          tbf(all, "공퍼증", -500, "욕망을 상실한 마왕1", always);
        }
        for (let _0x3ef16d of comp) {
          if (_0x3ef16d.id == _0x55e037.id) {
            continue;
          }
          tbf(_0x3ef16d, "공퍼증", 50, "<화염의 만연>1", always);
          const _0x47046d = _0x3ef16d.ultimate;
          _0x3ef16d.ultimate = function (..._0x1a2eb6) {
            atbf(_0x3ef16d, "평", boss, "받뎀증", 5, "<화염의 만연>2", 1, 2);
            atbf(_0x3ef16d, "평", boss, "받일뎀", 10, "<화염의 만연>3", 1, 2);
            _0x47046d.apply(this, _0x1a2eb6);
            atbf(comp[0], "궁", comp[0], "공퍼증", 35, "<타오르는 전투 욕구>1", 2, 1);
            atbf(comp[0], "궁", comp[0], "가뎀증", 10.5, "<타오르는 전투 욕구>2", 2, 1);
            atbf(comp[0], "궁", comp[0], "일뎀증", 30, "<타오르는 전투 욕구>3", 2, 1);
            atbf(comp[0], "궁", comp[0], "평추가*", 52.5, "<타오르는 전투 욕구>4", 2, 1);
          };
        }
      };
      _0x55e037.passive = function () {
        tbf(_0x55e037, "공퍼증", 45, "타오르지 않는 증오1", always);
        anbf(_0x55e037, "피격", _0x55e037, "<지옥의 화염>", 0, "만물 멸절", 1, 6, always);
        const _0x1900a3 = _0x55e037.hit;
        _0x55e037.hit = function (..._0x4a5b44) {
          _0x1900a3.apply(this, _0x4a5b44);
          const _0x5afd67 = _0x55e037.getNest("<지옥의 화염>");
          setBuffOnAll(_0x55e037, "발동", "만물 멸절1", _0x5afd67 >= 1);
          setBuffOnAll(_0x55e037, "발동", "만물 멸절2", _0x5afd67 >= 2);
          setBuffOnAll(_0x55e037, "발동", "만물 멸절3", _0x5afd67 >= 3);
          setBuffOnAll(_0x55e037, "발동", "만물 멸절4", _0x5afd67 >= 4);
          setBuffOnAll(_0x55e037, "발동", "만물 멸절5", _0x5afd67 >= 5);
          setBuffOnAll(_0x55e037, "발동", "만물 멸절6", _0x5afd67 >= 6);
        };
        buff(_0x55e037, "궁", _0x55e037, "가뎀증", 5, "만물 멸절1", 2, always, "발동", false);
        buff(_0x55e037, "궁", _0x55e037, "평추가*", 52.5, "만물 멸절1", 2, always, "발동", false);
        buff(_0x55e037, "궁", _0x55e037, "가뎀증", 5, "만물 멸절2", 2, always, "발동", false);
        buff(_0x55e037, "궁", _0x55e037, "평추가*", 52.5, "만물 멸절2", 2, always, "발동", false);
        buff(_0x55e037, "궁", _0x55e037, "가뎀증", 5, "만물 멸절3", 2, always, "발동", false);
        buff(_0x55e037, "궁", _0x55e037, "평추가*", 52.5, "만물 멸절3", 2, always, "발동", false);
        buff(_0x55e037, "궁", _0x55e037, "가뎀증", 5, "만물 멸절4", 2, always, "발동", false);
        buff(_0x55e037, "궁", _0x55e037, "평추가*", 52.5, "만물 멸절4", 2, always, "발동", false);
        buff(_0x55e037, "궁", _0x55e037, "가뎀증", 5, "만물 멸절5", 2, always, "발동", false);
        buff(_0x55e037, "궁", _0x55e037, "평추가*", 52.5, "만물 멸절5", 2, always, "발동", false);
        buff(_0x55e037, "궁", _0x55e037, "가뎀증", 5, "만물 멸절6", 2, always, "발동", false);
        buff(_0x55e037, "궁", _0x55e037, "평추가*", 52.5, "만물 멸절6", 2, always, "발동", false);
        anbf(_0x55e037, "궁", _0x55e037, "<지옥의 화염>", 0, "만물 멸절", -6, 6, always);
        for (let _0x34d65a of comp) {
          anbf(_0x34d65a, "피격", _0x55e037, "<저주 같은 사랑>", 0, "되찾을 수 없는 욕망", 1, 10, always);
        }
        buff(_0x55e037, "공퍼증", 30, "되찾을 수 없는 욕망1", always, false);
        buff(_0x55e037, "방뎀증", 100, "되찾을 수 없는 욕망2", always, false);
        buff(_0x55e037, "궁", _0x55e037, "가뎀증", 30, "되찾을 수 없는 욕망3", 2, always, "발동", false);
        for (let _0x47b2da of comp) {
          const _0xe0ceeb = _0x47b2da.hit;
          _0x47b2da.hit = function (..._0x2d73aa) {
            _0xe0ceeb.apply(this, _0x2d73aa);
            if (_0x55e037.stack == 1) {
              setBuffOn(_0x55e037, "기본", "되찾을 수 없는 욕망1", true);
            } else if (_0x55e037.stack == 5) {
              setBuffOn(_0x55e037, "기본", "되찾을 수 없는 욕망2", true);
            } else if (_0x55e037.stack == 9) {
              setBuffOn(_0x55e037, "발동", "되찾을 수 없는 욕망3", true);
            }
            _0x55e037.stack += 1;
            if (_0x55e037.stack >= 10) {
              _0x55e037.stack = 10;
            }
          };
        }
        tbf(_0x55e037, "공퍼증", 10, "공격+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10190:
      buff_ex.push("<모두를 지키겠어>", "<잃어버린 마력>");
      _0x55e037.stack = 0;
      setMnc(_0x55e037, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        for (let _0x33210a of comp) {
          if (_0x33210a.id != _0x55e037.id) {
            deleteBuff(_0x33210a, "기본", "승부수를 던지다3");
          }
        }
        switch (_0x78c5e1) {
          case 1:
            nbf(_0x55e037, "공퍼증", 18, "승부수를 던지다1", 1, 3);
            nbf(all, "발효증", 25.2, "승부수를 던지다2", 1, 3);
            buff(all, "공발동*", 18, "승부수를 던지다3", 4, false);
            break;
          case 2:
            nbf(_0x55e037, "공퍼증", 21, "승부수를 던지다1", 1, 3);
            nbf(all, "발효증", 29.4, "승부수를 던지다2", 1, 3);
            buff(all, "공발동*", 21, "승부수를 던지다3", 4, false);
            break;
          case 3:
            nbf(_0x55e037, "공퍼증", 24, "승부수를 던지다1", 1, 3);
            nbf(all, "발효증", 33.6, "승부수를 던지다2", 1, 3);
            buff(all, "공발동*", 24, "승부수를 던지다3", 4, false);
            break;
          case 4:
            nbf(_0x55e037, "공퍼증", 27, "승부수를 던지다1", 1, 3);
            nbf(all, "발효증", 37.8, "승부수를 던지다2", 1, 3);
            buff(all, "공발동*", 27, "승부수를 던지다3", 4, false);
            break;
          default:
            nbf(_0x55e037, "공퍼증", 30, "승부수를 던지다1", 1, 3);
            nbf(all, "발효증", 42, "승부수를 던지다2", 1, 3);
            buff(all, "공발동*", 30, "승부수를 던지다3", 4, false);
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
        for (let _0x5e53a2 = 0; _0x5e53a2 < _0x55e037.buff.length; _0x5e53a2++) {
          if (_0x55e037.buff[_0x5e53a2].name === "승부수를 던지다3" && _0x55e037.buff[_0x5e53a2].div == "기본" && _0x55e037.buff[_0x5e53a2].on) {
            _0x55e037.buff.splice(_0x5e53a2, 1);
            _bumpBuffGen();   // [perf] R2-D：钩子直改 buff 数组（全库唯一绕过封装函数的 mutation 点）
            break;
          }
        }
        for (let _0x476a79 of comp) {
          setBuffOn(_0x476a79, "기본", "승부수를 던지다3", true);
          _0x476a79.heal();
        }
        nbf(_0x55e037, "<잃어버린 마력>", 0, "마력 상실", 1, 3);
        _0x55e037.stack += 1;
        if (_0x55e037.stack > 3) {
          _0x55e037.stack = 3;
        }
        setBuffOnAll(_0x55e037, "발동", "마력 상실1", _0x55e037.stack >= 1);
        setBuffOnAll(_0x55e037, "발동", "마력 상실3", _0x55e037.stack >= 3);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
        for (let _0x1c46a6 of comp) {
          _0x1c46a6.heal();
        }
      };
      _0x55e037.leader = function () {
        hpUpAll(50);
        tbf(all, "공퍼증", 50, "유언의 계승자1", always);
        for (let _0x53b0e9 of comp) {
          anbf(_0x53b0e9, "힐", _0x53b0e9, "<모두를 지키겠어>", 0, "마지막 당부", 1, 40, always);
          anbf(_0x53b0e9, "힐", _0x53b0e9, "발효증", 2.25, "마지막 당부2", 1, 40, always);
        }
        if (getElementCnt("광") >= 2 || getElementCnt("수") >= 2) {
          for (let _0x580537 of comp) {
            const _0x8596f2 = _0x580537.act_attack;
            _0x580537.act_attack = function (..._0x227092) {
              _0x8596f2.apply(this, _0x227092);
              for (let _0x4d4d02 of comp) {
                _0x4d4d02.heal3();
              }
            };
            const _0x35d259 = _0x580537.act_ultimate;
            _0x580537.act_ultimate = function (..._0x143bd3) {
              _0x35d259.apply(this, _0x143bd3);
              for (let _0x2ce6f3 of comp) {
                _0x2ce6f3.heal3();
              }
            };
          }
        }
        buff(all, "공발동*", 20, "유언의 계승자4", always, false);
        buff(all, "공발동*", 20, "유언의 계승자5", always, false);
        for (let _0x3a99a8 of comp) {
          const _0x3ee962 = _0x3a99a8.attack;
          _0x3a99a8.attack = function (..._0x37c5f4) {
            _0x3ee962.apply(this, _0x37c5f4);
            _0x4e6c1b();
          };
          const _0x2e9812 = _0x3a99a8.ultimate;
          _0x3a99a8.ultimate = function (..._0x5f4b7b) {
            _0x2e9812.apply(this, _0x5f4b7b);
            _0x4e6c1b();
          };
          const _0x51a05c = _0x3a99a8.defense;
          _0x3a99a8.defense = function (..._0x20321e) {
            _0x51a05c.apply(this, _0x20321e);
            _0x4e6c1b();
          };
        }
        function _0x4e6c1b() {
          for (let _0x392765 of comp) {
            const _0x29d0d2 = _0x392765.getNest("<모두를 지키겠어>");
            setBuffOn(_0x392765, "기본", "유언의 계승자4", _0x29d0d2 >= 20);
            setBuffOn(_0x392765, "기본", "유언의 계승자5", _0x29d0d2 >= 40);
          }
        }
      };
      _0x55e037.passive = function () {
        anbf(_0x55e037, "힐", all, "발효증", 6, "<시저의 영면>1", 1, 10, always);
        for (let _0x5aa710 of comp) {
          const _0x3e157e = _0x5aa710.attack;
          _0x5aa710.attack = function (..._0x31af4a) {
            _0x3e157e.apply(this, _0x31af4a);
            _0x3ff2db();
          };
          const _0x2829e7 = _0x5aa710.ultimate;
          _0x5aa710.ultimate = function (..._0x3a49ae) {
            _0x2829e7.apply(this, _0x3a49ae);
            _0x3ff2db();
          };
          const _0x3a1db2 = _0x5aa710.defense;
          _0x5aa710.defense = function (..._0x567b92) {
            _0x3a1db2.apply(this, _0x567b92);
            _0x3ff2db();
          };
        }
        function _0x3ff2db() {
          if (_0x55e037.isHealed || _0x55e037.isHealed2 || _0x55e037.isHealed3) {
            for (let _0x45a905 of comp) {
              deleteBuff(_0x45a905, "기본", "<시저의 영면>2");
              tbf(_0x45a905, "공발동*", 30, "<시저의 영면>2", 1);
            }
          }
        }
        for (let _0x540dc7 of getElementIdx("수", "광")) {
          buff(_0x55e037, "힐", comp[_0x540dc7], "가뎀증", 10, "마력 상실1", 1, always, "발동", false);
        }
        for (let _0xe773bf of comp) {
          if (_0xe773bf.id != _0x55e037.id) {
            buff(_0x55e037, "힐", _0xe773bf, "공고증", myCurAtk + _0x55e037.id + 6, "마력 상실3", 1, always, "발동", false);
          }
        }
        anbf(_0x55e037, "힐", all, "가뎀증", 1.5, "약속 이행3", 1, 10, always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {
          if (GLOBAL_TURN != 1) {
            for (let _0x2bef95 of getElementIdx("수", "광")) {
              nbf(comp[_0x2bef95], "받속뎀", 2, "유언의 계승자6", 1, 10);
            }
          }
        }
        if (GLOBAL_TURN == 1) {
          cdChange(_0x55e037, -4);
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10191:
      _0x55e037.stack = 0;
      buff_ex.push("<여전히 함께>");
      setMnc(_0x55e037, [246, 4, 310.5, 4, 375, 4, 439.5, 4, 504, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        deleteBuff(_0x55e037, "기본", "혈체술-영혼갈퀴0");
        deleteBuff(_0x55e037, "기본", "혈체술-영혼갈퀴2");
        switch (_0x78c5e1) {
          case 1:
            tbf(_0x55e037, "궁뎀증", 39, "혈체술-영혼갈퀴1", 1);
            tbf(_0x55e037, "발효증", 39, "혈체술-영혼갈퀴2", 4);
            break;
          case 2:
            tbf(_0x55e037, "궁뎀증", 45.5, "혈체술-영혼갈퀴1", 1);
            tbf(_0x55e037, "발효증", 45.5, "혈체술-영혼갈퀴2", 4);
            break;
          case 3:
            tbf(_0x55e037, "가뎀증", 10, "혈체술-영혼갈퀴0", 4);
            tbf(_0x55e037, "궁뎀증", 52, "혈체술-영혼갈퀴1", 1);
            tbf(_0x55e037, "발효증", 52, "혈체술-영혼갈퀴2", 4);
            break;
          case 4:
            tbf(_0x55e037, "가뎀증", 20, "혈체술-영혼갈퀴0", 4);
            tbf(_0x55e037, "궁뎀증", 58.5, "혈체술-영혼갈퀴1", 1);
            tbf(_0x55e037, "발효증", 58.5, "혈체술-영혼갈퀴2", 4);
            break;
          default:
            tbf(_0x55e037, "가뎀증", 30, "혈체술-영혼갈퀴0", 4);
            tbf(_0x55e037, "궁뎀증", 65, "혈체술-영혼갈퀴1", 1);
            tbf(_0x55e037, "발효증", 65, "혈체술-영혼갈퀴2", 4);
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037, 5);
        nbf(_0x55e037, "<여전히 함께>", 0, "마왕의 힘", -3, 3);
        _0x55e037.stack = 0;
        setBuffOn(_0x55e037, "기본", "마왕의 힘1", false);
        setBuffOn(_0x55e037, "기본", "마왕의 힘2", false);
        setBuffOn(_0x55e037, "기본", "마왕의 힘3", false);
      };
      _0x55e037.atkbefore = function () {
        tbf(_0x55e037, "가뎀증", 8, "빌려온 힘", 4);
      };
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
        if (_0x55e037.stack == 0) {
          setBuffOn(_0x55e037, "기본", "마왕의 힘1", true);
        } else if (_0x55e037.stack == 1) {
          setBuffOn(_0x55e037, "기본", "마왕의 힘2", true);
        } else if (_0x55e037.stack == 2) {
          setBuffOn(_0x55e037, "기본", "마왕의 힘3", true);
        }
        _0x55e037.stack += 1;
        if (_0x55e037.stack > 3) {
          _0x55e037.stack = 3;
        }
      };
      _0x55e037.leader = function () {
        hpUpAll(50);
        if (getRoKind() == 3) {
          tbf(_0x55e037, "공퍼증", 70, "<의식 코어>1", always);
          tbf(_0x55e037, "가뎀증", 70, "<의식 코어>2", always);
          tbf(_0x55e037, "궁뎀증", 75, "<의식 코어>3", always);
          tbf(_0x55e037, "발효증", 75, "<의식 코어>4", always);
          tbf(_0x55e037, "궁추가*", 100, "<의식 코어>5", always);
          tbf(_0x55e037, "궁발동*", 50, "<의식 코어>6", always);
          for (let _0x334a1f of comp) {
            if (_0x334a1f.role == 0) {
              continue;
            }
            tbf(_0x334a1f, "공퍼증", 70, "<힘 흡수>1", always);
            atbf(_0x334a1f, "공격", boss, "받뎀증", 7, "<힘 흡수>2", 1, always);
            for (let _0x389404 of getElementIdx("풍")) {
              atbf(_0x334a1f, "공격", comp[_0x389404], "받속뎀", 10.5, "<힘 흡수>3", 1, always);
            }
          }
        }
      };
      _0x55e037.passive = function () {
        tbf(_0x55e037, "공퍼증", 60, "광기에 빠진 시저1", always);
        tbf(_0x55e037, "평발동*", 100, "광기에 빠진 시저2", always);
        anbf(_0x55e037, "평", _0x55e037, "<여전히 함께>", 0, "마왕의 힘", 1, 3, always);
        buff(_0x55e037, "궁발동*", 36, "마왕의 힘1", always, false);
        buff(_0x55e037, "궁발동*", 72, "마왕의 힘2", always, false);
        buff(_0x55e037, "궁발동*", 108, "마왕의 힘3", always, false);
        tbf(_0x55e037, "가뎀증", 27.5, "이루지 못한 아쉬움1", always);
        for (let _0x1e581b of comp) {
          if (_0x1e581b.role != 0) {
            atbf(_0x1e581b, "공격", boss, "받뎀증", 6.5, "<다하지 못한 약속>1", 1, always);
            for (let _0x1beb4c of getElementIdx("풍")) {
              atbf(_0x1e581b, "공격", comp[_0x1beb4c], "받속뎀", 9.75, "<다하지 못한 약속>2", 1, always);
            }
          }
        }
        tbf(_0x55e037, "가뎀증", 7.5, "데미지+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10192:
      _0x55e037.stack = 0;
      setMnc(_0x55e037, [324, 4, 378, 4, 432, 4, 486, 4, 540, 4], _0x78c5e1);
      buff_ex.push("<순진무구>", "<여우 신부의 축복>");
      _0x55e037.ultbefore = function () {
        deleteBuff(_0x55e037, "기본", "새로운 빛으로 물들이다1");
        deleteBuff(_0x55e037, "기본", "새로운 빛으로 물들이다2");
        for (let _0x194cde of comp) {
          if (_0x194cde.id != _0x55e037.id) {
            deleteBuff(_0x194cde, "발동", "새로운 빛으로 물들이다3");
            deleteBuff(_0x194cde, "발동", "새로운 빛으로 물들이다4");
          }
        }
        switch (_0x78c5e1) {
          case 1:
            tbf(_0x55e037, "공퍼증", 100, "새로운 빛으로 물들이다1", 4);
            tbf(_0x55e037, "가뎀증", 18, "새로운 빛으로 물들이다2", 4);
            for (let _0x2ec3dd of comp) {
              if (_0x2ec3dd.id != _0x55e037.id) {
                for (let _0x358551 of getElementIdx("암")) {
                  atbf(_0x2ec3dd, "공격", comp[_0x358551], "받속뎀", 5, "새로운 빛으로 물들이다4", 1, 5);
                }
              }
            }
            break;
          case 2:
            tbf(_0x55e037, "공퍼증", 112, "새로운 빛으로 물들이다1", 4);
            tbf(_0x55e037, "가뎀증", 21, "새로운 빛으로 물들이다2", 4);
            for (let _0x590f60 of comp) {
              if (_0x590f60.id != _0x55e037.id) {
                atbf(_0x590f60, "공격", boss, "받뎀증", 3.5, "새로운 빛으로 물들이다3", 1, 5);
                for (let _0x1c4a81 of getElementIdx("암")) {
                  atbf(_0x590f60, "공격", comp[_0x1c4a81], "받속뎀", 6, "새로운 빛으로 물들이다4", 1, 5);
                }
              }
            }
            break;
          case 3:
            tbf(_0x55e037, "공퍼증", 128, "새로운 빛으로 물들이다1", 4);
            tbf(_0x55e037, "가뎀증", 24, "새로운 빛으로 물들이다2", 4);
            for (let _0x35f67b of comp) {
              if (_0x35f67b.id != _0x55e037.id) {
                atbf(_0x35f67b, "공격", boss, "받뎀증", 4, "새로운 빛으로 물들이다3", 1, 5);
                for (let _0x5c6123 of getElementIdx("암")) {
                  atbf(_0x35f67b, "공격", comp[_0x5c6123], "받속뎀", 7, "새로운 빛으로 물들이다4", 1, 5);
                }
              }
            }
            break;
          case 4:
            tbf(_0x55e037, "공퍼증", 144, "새로운 빛으로 물들이다1", 4);
            tbf(_0x55e037, "가뎀증", 27, "새로운 빛으로 물들이다2", 4);
            for (let _0x124b65 of comp) {
              if (_0x124b65.id != _0x55e037.id) {
                atbf(_0x124b65, "공격", boss, "받뎀증", 4.5, "새로운 빛으로 물들이다3", 1, 5);
                for (let _0xab4394 of getElementIdx("암")) {
                  atbf(_0x124b65, "공격", comp[_0xab4394], "받속뎀", 8, "새로운 빛으로 물들이다4", 1, 5);
                }
              }
            }
            break;
          default:
            tbf(_0x55e037, "공퍼증", 160, "새로운 빛으로 물들이다1", 4);
            tbf(_0x55e037, "가뎀증", 30, "새로운 빛으로 물들이다2", 4);
            for (let _0x3da0e3 of comp) {
              if (_0x3da0e3.id != _0x55e037.id) {
                atbf(_0x3da0e3, "공격", boss, "받뎀증", 5, "새로운 빛으로 물들이다3", 1, 5);
                for (let _0x4ced06 of getElementIdx("암")) {
                  atbf(_0x3da0e3, "공격", comp[_0x4ced06], "받속뎀", 9, "새로운 빛으로 물들이다4", 1, 5);
                }
              }
            }
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037, 3);
        const _0x4783f6 = _0x55e037.stack;
        for (let _0x2aa057 = 0; _0x2aa057 < _0x4783f6; _0x2aa057++) {
          tbf(_0x55e037, "일뎀증", 7, "<여우의 어령>1", 4);
          tbf(_0x55e037, "가뎀증", 5, "<여우의 어령>2", 5);
          tbf(_0x55e037, "평추가*", 10, "<여우의 어령>3", 4);
        }
        nbf(_0x55e037, "<순진무구>", 0, "장난꾸러기 요호의 하루 기원", -3, 3);
        _0x55e037.stack = 0;
        setBuffOn(_0x55e037, "기본", "<무결한 마음>1", false);
        setBuffOn(_0x55e037, "기본", "<무결한 마음>2", false);
        setBuffOnAll(_0x55e037, "발동", "<무결한 마음>3", false);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        if (_0x55e037.stack == 2) {
          setBuffOn(_0x55e037, "발동", "<무결한 마음>1", true);
          setBuffOn(_0x55e037, "발동", "<무결한 마음>2", true);
        }
        atkLogic(_0x55e037);
        if (_0x55e037.stack == 2) {
          setBuffOn(_0x55e037, "발동", "<무결한 마음>1", false);
          setBuffOn(_0x55e037, "발동", "<무결한 마음>2", false);
          setBuffOnAll(_0x55e037, "발동", "<무결한 마음>3", true);
        }
        _0x55e037.stack += 1;
        if (_0x55e037.stack > 3) {
          _0x55e037.stack = 3;
        }
      };
      _0x55e037.leader = function () {
        hpUpAll(50);
        anbf(_0x55e037, "방", _0x55e037, "<순진무구>", 0, "장난꾸러기 요호의 하루 기원", 1, 3, always);
        const _0x4d4199 = getRoleCnt("딜", "탱", "디");
        for (let _0xcb360e of comp) {
          nbf(_0xcb360e, "<여우 신부의 축복>", 0, "오늘은 시즈카가 시집가는 날~", _0x4d4199, 4);
        }
        if (_0x4d4199 >= 4) {
          for (let _0x5e1891 of comp) {
            tbf(_0x5e1891, "공퍼증", 100, "<새해의 인연>1", always);
            tbf(_0x5e1891, "가뎀증", 35, "<새해의 인연>2", always);
            tbf(_0x5e1891, "일뎀증", 60, "<새해의 인연>3", always);
            tbf(_0x5e1891, "궁뎀증", 40, "<새해의 인연>4", always);
            atbf(_0x5e1891, "공격", all, "공고증", myCurAtk + _0x5e1891.id + 10, "<새해의 인연>5", 1, always);
            tbf(_0x5e1891, "평추가*", 25, "<새해의 인연>6", always);
            tbf(_0x5e1891, "궁추가*", 50, "<새해의 인연>7", always);
          }
        }
      };
      _0x55e037.passive = function () {
        anbf(_0x55e037, "평", _0x55e037, "궁뎀증", 2.5, "소꿉놀이로 끝내고 싶지 않아1", 1, 6, always);
        anbf(_0x55e037, "궁", _0x55e037, "일뎀증", 10, "소꿉놀이로 끝내고 싶지 않아2", 1, 3, always);
        anbf(_0x55e037, "평", _0x55e037, "<순진무구>", 0, "장난꾸러기 요호의 하루 기원", 1, 3, always);
        buff(_0x55e037, "평", _0x55e037, "on", "기본", "<무결한 마음>1", 1, always, "발동", false);
        buff(_0x55e037, "평", _0x55e037, "on", "기본", "<무결한 마음>2", 1, always, "발동", false);
        buff(_0x55e037, "궁뎀증", 20, "<무결한 마음>1", always, false);
        buff(_0x55e037, "방뎀증", 100, "<무결한 마음>2", always, false);
        buff(_0x55e037, "궁", all, "제거", "기본", "<무결한 마음>3", 1, always, "발동", false);
        buff(_0x55e037, "궁", all, "공퍼증", 15, "<무결한 마음>3", 5, always, "발동", false);
        tbf(_0x55e037, "가뎀증", 7.5, "가하는 데미지+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
        if (_0x55e037.isLeader) {
          if (_0x55e037.stack == 2) {
            setBuffOn(_0x55e037, "기본", "<무결한 마음>1", true);
            setBuffOn(_0x55e037, "기본", "<무결한 마음>2", true);
            setBuffOnAll(_0x55e037, "발동", "<무결한 마음>3", true);
          }
          _0x55e037.stack += 1;
          if (_0x55e037.stack > 3) {
            _0x55e037.stack = 3;
          }
        }
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
        if (GLOBAL_TURN == 1) {
          cdChange(_0x55e037, -4);
          nbf(_0x55e037, "<순진무구>", 0, "장난꾸러기 요호의 하루 기원", 3, 3);
          _0x55e037.stack += 3;
          setBuffOn(_0x55e037, "기본", "<무결한 마음>1", true);
          setBuffOn(_0x55e037, "기본", "<무결한 마음>2", true);
          setBuffOnAll(_0x55e037, "발동", "<무결한 마음>3", true);
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10193:
      setMnc(_0x55e037, [265, 3, 298, 3, 331, 3, 364, 3, 397, 3], _0x78c5e1);
      buff_ex.push("<킹크랩 양념 부적>", "<통증이 사라진다 부적>", "<정면으로 덤벼라 부적>", "<느끼면 패배 부적>");
      _0x55e037.stack = 0;
      _0x55e037.ultbefore = function () {
        for (let _0x2bb71b of getRoleIdx("딜", "디")) {
          deleteBuff(comp[_0x2bb71b], "기본", "붓이 아주 크니까, 조금만 참아2");
        }
        deleteBuff(boss, "기본", "붓이 아주 크니까, 조금만 참아3");
        switch (_0x78c5e1) {
          case 1:
            for (let _0x40d7ca of getRoleIdx("딜", "디")) {
              tbf(comp[_0x40d7ca], "궁추가*", 36, "붓이 아주 크니까, 조금만 참아1", 1);
              tbf(comp[_0x40d7ca], "평발동*", 21.6, "붓이 아주 크니까, 조금만 참아2", 3);
            }
            tbf(boss, "받뎀증", 13.2, "붓이 아주 크니까, 조금만 참아3", 3);
            break;
          case 2:
            for (let _0x22f040 of getRoleIdx("딜", "디")) {
              tbf(comp[_0x22f040], "궁추가*", 42, "붓이 아주 크니까, 조금만 참아1", 1);
              tbf(comp[_0x22f040], "평발동*", 25.2, "붓이 아주 크니까, 조금만 참아2", 3);
            }
            tbf(boss, "받뎀증", 15.4, "붓이 아주 크니까, 조금만 참아3", 3);
            break;
          case 3:
            for (let _0x305419 of getRoleIdx("딜", "디")) {
              tbf(comp[_0x305419], "궁추가*", 48, "붓이 아주 크니까, 조금만 참아1", 1);
              tbf(comp[_0x305419], "평발동*", 28.8, "붓이 아주 크니까, 조금만 참아2", 3);
            }
            tbf(boss, "받뎀증", 17.6, "붓이 아주 크니까, 조금만 참아3", 3);
            break;
          case 4:
            for (let _0x139f49 of getRoleIdx("딜", "디")) {
              tbf(comp[_0x139f49], "궁추가*", 54, "붓이 아주 크니까, 조금만 참아1", 1);
              tbf(comp[_0x139f49], "평발동*", 32.4, "붓이 아주 크니까, 조금만 참아2", 3);
            }
            tbf(boss, "받뎀증", 19.8, "붓이 아주 크니까, 조금만 참아3", 3);
            break;
          default:
            for (let _0x5561b4 of getRoleIdx("딜", "디")) {
              tbf(comp[_0x5561b4], "궁추가*", 60, "붓이 아주 크니까, 조금만 참아1", 1);
              tbf(comp[_0x5561b4], "평발동*", 36, "붓이 아주 크니까, 조금만 참아2", 3);
            }
            tbf(boss, "받뎀증", 22, "붓이 아주 크니까, 조금만 참아3", 3);
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
        _0x55e037.tmpOff();
        _0x55e037.stack = 1;
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
        if (_0x55e037.stack == 1) {
          anbf(_0x55e037, "평", _0x55e037, "<킹크랩 양념 부적>", 0, "귀화부의 대가01", 1, 1, 2);
          anbf(_0x55e037, "방", _0x55e037, "<통증이 사라진다 부적>", 0, "귀화부의 대가02", 1, 1, 2);
          _0x55e037.stack = 0;
        }
        _0x55e037.tmpOn();
      };
      _0x55e037.leader = function () {
        hpUpAll(50);
        if (getElKind() == 2) {
          for (let _0x56edd8 of getElementIdx("광", "암")) {
            tbf(comp[_0x56edd8], "공퍼증", 55, "<우사기 히메 대명신의 신도>1", always);
            tbf(comp[_0x56edd8], "가뎀증", 30, "<우사기 히메 대명신의 신도>2", always);
            tbf(comp[_0x56edd8], "궁뎀증", 30, "<우사기 히메 대명신의 신도>3", always);
            tbf(comp[_0x56edd8], "발효증", 30, "<우사기 히메 대명신의 신도>4", always);
            tbf(comp[_0x56edd8], "궁추가*", 60, "<우사기 히메 대명신의 신도>5", always);
            tbf(comp[_0x56edd8], "평발동*", 36, "<우사기 히메 대명신의 신도>6", always);
            tbf(comp[_0x56edd8], "방발동*", 36, "<우사기 히메 대명신의 신도>7", always);
            anbf(comp[_0x56edd8], "행동", boss, "받뎀증", 0.5, "<우사기 히메 대명신의 신도>8", 1, 40, always);
            for (let _0x3c8e08 of getElementIdx("광", "암")) {
              anbf(comp[_0x56edd8], "행동", comp[_0x3c8e08], "받속뎀", 0.75, "<우사기 히메 대명신의 신도>9", 1, 40, always);
            }
          }
        }
      };
      _0x55e037.passive = function () {
        tbf(_0x55e037, "평발동*", 100, "귀화부의 대가1", always);
        tbf(_0x55e037, "방발동*", 100, "귀화부의 대가2", always);
        for (let _0x27d790 of getElementIdx("광")) {
          buff(_0x55e037, "궁", comp[_0x27d790], "받속뎀", 24, "하늘이시여, 땅이시여~11", 1, always, "발동", false);
          buff(_0x55e037, "궁", comp[_0x27d790], "제거", "기본", "하늘이시여, 땅이시여~12", 3, always, "발동", false);
          buff(_0x55e037, "궁", comp[_0x27d790], "받속뎀", 24, "하늘이시여, 땅이시여~12", 3, always, "발동", false);
        }
        buff(_0x55e037, "궁", all, "궁뎀증", 30, "하늘이시여, 땅이시여~21", 1, 1, always, "발동", false);
        buff(_0x55e037, "궁", all, "발효증", 30, "하늘이시여, 땅이시여~22", 1, 1, always, "발동", false);
        buff(_0x55e037, "궁", all, "아머", _0x55e037.hp * 10, "하늘이시여, 땅이시여~23", 2, always, "발동", false);
        buff(_0x55e037, "궁", all, "받아증", 50, "하늘이시여, 땅이시여~32", 1, 1, always, "발동", false);
        buff(_0x55e037, "궁", _0x55e037, "아머", _0x55e037.hp * 30, "하늘이시여, 땅이시여~42", 3, always, "발동", false);
        for (let _0x1dbaf0 of comp) {
          if (_0x1dbaf0.id != _0x55e037.id) {
            atbf(_0x55e037, "궁", _0x1dbaf0, "<빛의 축복>", 0, "우사기 히메에게 드리는 기도", 1, always);
          }
        }
        for (let _0x476ec0 of getRoleIdx("힐", "섶")) {
          anbf(comp[_0x476ec0], "<빛의 축복>", comp[_0x476ec0], "공퍼증", 12, "우사기 히메에게 드리는 기도1", 1, 6, always);
        }
        for (let _0xd5a94a of getRoleIdx("딜", "디")) {
          anbf(comp[_0xd5a94a], "<빛의 축복>", comp[_0xd5a94a], "가뎀증", 6, "우사기 히메에게 드리는 기도2", 1, 6, always);
        }
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
        if (_0x55e037.stack == 1) {
          anbf(_0x55e037, "평", _0x55e037, "<정면으로 덤벼라 부적>", 0, "귀화부의 대가03", 1, 1, 2);
          anbf(_0x55e037, "방", _0x55e037, "<느끼면 패배 부적>", 0, "귀화부의 대가04", 1, 1, 2);
          _0x55e037.stack = 0;
        }
        _0x55e037.tmpOn();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
        if (GLOBAL_TURN == 1) {
          cdChange(_0x55e037, -3);
        }
      };
      _0x55e037.tmpOn = function () {
        const _0x57cf3b = _0x55e037.getNest("<킹크랩 양념 부적>");
        const _0x54b1c2 = _0x55e037.getNest("<통증이 사라진다 부적>");
        const _0x54acd7 = _0x55e037.getNest("<정면으로 덤벼라 부적>");
        const _0x531dd1 = _0x55e037.getNest("<느끼면 패배 부적>");
        if (_0x57cf3b >= 1) {
          setBuffOnAll(_0x55e037, "발동", "하늘이시여, 땅이시여~11", true);
          setBuffOnAll(_0x55e037, "발동", "하늘이시여, 땅이시여~12", true);
        }
        if (_0x54b1c2 >= 1) {
          setBuffOnAll(_0x55e037, "발동", "하늘이시여, 땅이시여~21", true);
          setBuffOnAll(_0x55e037, "발동", "하늘이시여, 땅이시여~22", true);
          setBuffOnAll(_0x55e037, "발동", "하늘이시여, 땅이시여~23", true);
        }
        if (_0x54acd7 >= 1) {
          setBuffOnAll(_0x55e037, "발동", "하늘이시여, 땅이시여~32", true);
        }
        if (_0x531dd1 >= 1) {
          setBuffOn(_0x55e037, "발동", "하늘이시여, 땅이시여~42", true);
        }
      };
      _0x55e037.tmpOff = function () {
        nbf(_0x55e037, "<킹크랩 양념 부적>", 0, "귀화부의 대가01", -1, 1);
        nbf(_0x55e037, "<통증이 사라진다 부적>", 0, "귀화부의 대가02", -1, 1);
        nbf(_0x55e037, "<정면으로 덤벼라 부적>", 0, "귀화부의 대가03", -1, 1);
        nbf(_0x55e037, "<느끼면 패배 부적>", 0, "귀화부의 대가04", -1, 1);
        setBuffOnAll(_0x55e037, "발동", "하늘이시여, 땅이시여~11", false);
        setBuffOnAll(_0x55e037, "발동", "하늘이시여, 땅이시여~12", false);
        setBuffOnAll(_0x55e037, "발동", "하늘이시여, 땅이시여~21", false);
        setBuffOnAll(_0x55e037, "발동", "하늘이시여, 땅이시여~22", false);
        setBuffOnAll(_0x55e037, "발동", "하늘이시여, 땅이시여~23", false);
        setBuffOnAll(_0x55e037, "발동", "하늘이시여, 땅이시여~32", false);
        setBuffOn(_0x55e037, "발동", "하늘이시여, 땅이시여~42", false);
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10194:
      setMnc(_0x55e037, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(_0x55e037, "궁뎀증", 36, "시저님과의 유대2", 1);
            break;
          case 2:
            tbf(_0x55e037, "궁뎀증", 42, "시저님과의 유대2", 1);
            break;
          case 3:
            nbf(_0x55e037, "가뎀증", 7, "시저님과의 유대1", 1, 2);
            tbf(_0x55e037, "궁뎀증", 48, "시저님과의 유대2", 1);
            break;
          case 4:
            nbf(_0x55e037, "가뎀증", 14, "시저님과의 유대1", 1, 2);
            tbf(_0x55e037, "궁뎀증", 54, "시저님과의 유대2", 1);
            break;
          default:
            nbf(_0x55e037, "가뎀증", 21, "시저님과의 유대1", 1, 2);
            tbf(_0x55e037, "궁뎀증", 60, "시저님과의 유대2", 1);
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037, 5);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(50);
        tbf(all, "공퍼증", 50, "화이트 리본 사이클론-아이카1", always);
        anbf(all, "궁", boss, "받뎀증", 2, "화이트 리본 사이클론-아이카2", 1, 10, always);
        for (let _0x3f0fd5 of getElementIdx("화")) {
          anbf(all, "궁", comp[_0x3f0fd5], "받속뎀", 3.5, "화이트 리본 사이클론-아이카3", 1, 10, always);
        }
        const _0xa5514f = getRoleCnt("딜");
        if (_0xa5514f >= 2) {
          tbf(_0x55e037, "궁뎀증", 36, "<마음>1", always);
          tbf(_0x55e037, "가뎀증", 30, "<마음>2", always);
          tbf(_0x55e037, "궁추가*", 100, "<마음>3", always);
        }
        if (_0xa5514f >= 2) {
          for (let _0x477469 of getRoleIdx("딜", "탱", "디")) {
            tbf(comp[_0x477469], "궁뎀증", 36, "<마음>4", always);
            tbf(comp[_0x477469], "가뎀증", 30, "<마음>5", always);
            tbf(comp[_0x477469], "궁추가*", 100, "<마음>6", always);
          }
        }
      };
      _0x55e037.passive = function () {
        tbf(_0x55e037, "공퍼증", 35, "영원히 당신 곁에1", always);
        tbf(_0x55e037, "궁추가*", 100, "영원히 당신 곁에2", always);
        anbf(all, "궁", boss, "받뎀증", 2, "영원히 당신 곁에4", 1, 10, always);
        const _0x50019c = getElementCnt("화");
        if (_0x50019c >= 4) {
          for (let _0x655605 of comp) {
            pnbf(_0x655605, "궁", _0x655605, "공퍼증", 13, "<웨딩드레스 착용>1", 1, 2, always);
            pnbf(_0x655605, "궁", _0x655605, "가뎀증", 7.5, "<웨딩드레스 착용>2", 1, 2, always);
            pnbf(_0x655605, "궁", _0x655605, "궁뎀증", 10, "<웨딩드레스 착용>3", 1, 2, always);
          }
        }
        if (_0x50019c >= 5) {
          for (let _0x5370f8 of comp) {
            pnbf(_0x5370f8, "궁", _0x5370f8, "공퍼증", 13, "<웨딩드레스 착용>4", 1, 2, always);
            pnbf(_0x5370f8, "궁", _0x5370f8, "가뎀증", 7.5, "<웨딩드레스 착용>5", 1, 2, always);
            pnbf(_0x5370f8, "궁", _0x5370f8, "궁뎀증", 10, "<웨딩드레스 착용>6", 1, 2, always);
          }
        }
        if (_0x50019c >= 4) {
          for (let _0x3925d8 of comp) {
            tbf(_0x3925d8, "궁추가*", 100, "<부케>1", always);
            for (let _0x8fddd0 of getElementIdx("화")) {
              pnbf(_0x3925d8, "궁", comp[_0x8fddd0], "받속뎀", 2, "<부케>2", 1, 10, always);
            }
          }
        }
        if (_0x50019c >= 5) {
          for (let _0x5067cf of comp) {
            tbf(_0x5067cf, "궁추가*", 100, "<부케>3", always);
            for (let _0x4d49f0 of getElementIdx("화")) {
              pnbf(_0x5067cf, "궁", comp[_0x4d49f0], "받속뎀", 2, "<부케>4", 1, 10, always);
            }
          }
        }
        tbf(_0x55e037, "궁뎀증", 10, "궁극기+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
        if (GLOBAL_TURN == 1) {
          for (let _0x37a068 of getRoleIdx("딜", "섶", "디")) {
            nbf(comp[_0x37a068], "일뎀증", -99, "영원히 당신 곁에3", 1, 1);
          }
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10195:
      setMnc(_0x55e037, [265, 3, 298, 3, 331, 3, 364, 3, 397, 3], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        deleteBuff(boss, "기본", "칼리버, 길을 열어줘!2");
        for (let _0x3442dd of comp) {
          deleteBuff(_0x3442dd, "기본", "칼리버, 길을 열어줘!4");
        }
        switch (_0x78c5e1) {
          case 1:
            tbf(boss, "받뎀증", 15, "칼리버, 길을 열어줘!1", 1);
            tbf(boss, "받뎀증", 15, "칼리버, 길을 열어줘!2", 3);
            for (let _0x5cdeae of getElementIdx("광")) {
              tbf(comp[_0x5cdeae], "받속뎀", 9, "칼리버, 길을 열어줘!3", 1);
              tbf(comp[_0x5cdeae], "받속뎀", 9, "칼리버, 길을 열어줘!4", 3);
            }
            break;
          case 2:
            tbf(boss, "받뎀증", 17.5, "칼리버, 길을 열어줘!1", 1);
            tbf(boss, "받뎀증", 17.5, "칼리버, 길을 열어줘!2", 3);
            for (let _0x2c2fd0 of getElementIdx("광")) {
              tbf(comp[_0x2c2fd0], "받속뎀", 10.5, "칼리버, 길을 열어줘!3", 1);
              tbf(comp[_0x2c2fd0], "받속뎀", 10.5, "칼리버, 길을 열어줘!4", 3);
            }
            break;
          case 3:
            tbf(boss, "받뎀증", 20, "칼리버, 길을 열어줘!1", 1);
            tbf(boss, "받뎀증", 20, "칼리버, 길을 열어줘!2", 3);
            for (let _0x3b2bd4 of getElementIdx("광")) {
              tbf(comp[_0x3b2bd4], "받속뎀", 12, "칼리버, 길을 열어줘!3", 1);
              tbf(comp[_0x3b2bd4], "받속뎀", 12, "칼리버, 길을 열어줘!4", 3);
            }
            break;
          case 4:
            tbf(boss, "받뎀증", 22.5, "칼리버, 길을 열어줘!1", 1);
            tbf(boss, "받뎀증", 22.5, "칼리버, 길을 열어줘!2", 3);
            for (let _0x3d6951 of getElementIdx("광")) {
              tbf(comp[_0x3d6951], "받속뎀", 13.5, "칼리버, 길을 열어줘!3", 1);
              tbf(comp[_0x3d6951], "받속뎀", 13.5, "칼리버, 길을 열어줘!4", 3);
            }
            break;
          default:
            tbf(boss, "받뎀증", 25, "칼리버, 길을 열어줘!1", 1);
            tbf(boss, "받뎀증", 25, "칼리버, 길을 열어줘!2", 3);
            for (let _0x4c275e of getElementIdx("광")) {
              tbf(comp[_0x4c275e], "받속뎀", 15, "칼리버, 길을 열어줘!3", 1);
              tbf(comp[_0x4c275e], "받속뎀", 15, "칼리버, 길을 열어줘!4", 3);
            }
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037, 2);
      };
      _0x55e037.atkbefore = function () {
        tbf(boss, "받뎀증", 5, "휘날리는 면사포", 3);
      };
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
        comp[4].bless("<빛의 축복>");
      };
      _0x55e037.leader = function () {
        hpUpAll(50);
        tbf(all, "공퍼증", 85, "신부를 꿈꾸며1", always);
        if (getRoleCnt("딜") >= 1) {
          tbf(all, "가뎀증", -500, "신부를 꿈꾸며2", always);
        }
        anbf(all, "공격", boss, "받뎀증", 2.5, "신부를 꿈꾸며3", 1, 40, always);
        for (let _0x2c4da8 of getElementIdx("광")) {
          anbf(all, "공격", comp[_0x2c4da8], "받속뎀", 1.25, "신부를 꿈꾸며4", 1, 40, always);
        }
      };
      _0x55e037.passive = function () {
        anbf(_0x55e037, "평", boss, "받궁뎀", 3, "<용자 킥>1", 1, 9, always);
        anbf(_0x55e037, "평", boss, "받발뎀", 3, "<용자 킥>2", 1, 9, always);
        tbf(_0x55e037, "평발동*", 100, "<용자 킥>3", always);
        if (getRoleCnt("힐") >= 2) {
          _0x55e037.isSealed = true;
        }
        tbf(comp[4], "평발동*", 15, "사랑을 지키는 용자1", always);
        tbf(comp[4], "궁추가*", 50, "사랑을 지키는 용자2", always);
        anbf(comp[4], "<빛의 축복>", comp[4], "가뎀증", 2.3, "신부에게 보내는 축복1", 1, 13, always);
        tbf(_0x55e037, "가뎀증", 7.5, "가하는 데미지+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {
          if (GLOBAL_TURN == 1) {
            tbf(_0x55e037, "궁뎀증", 42.5, "<웨딩드레스를 입는 그날>1", 50);
            tbf(_0x55e037, "발효증", 42.5, "<웨딩드레스를 입는 그날>2", 50);
            tbf(_0x55e037, "평발동*", 40.5, "<웨딩드레스를 입는 그날>3", 50);
            tbf(_0x55e037, "궁추가*", 135, "<웨딩드레스를 입는 그날>4", 50);
            deleteBuff(comp[4], "기본", "사랑을 지키는 용자1");
            deleteBuff(comp[4], "기본", "사랑을 지키는 용자2");
            deleteBuff(comp[4], "발동", "신부에게 보내는 축복1");
            anbf(comp[4], "<빛의 축복>", _0x55e037, "가뎀증", 10, "<웨딩드레스를 입는 그날>5", 1, 13, 50);
          }
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10196:
      _0x55e037.stack = 0;
      buff_ex.push("<동반자의 힘>", "<수련의 행복>");
      setMnc(_0x55e037, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(_0x55e037, "공퍼증", 30, "아령 열단파1", 1);
            for (let _0x227a18 of getRoleIdx("딜", "탱", "디")) {
              tbf(comp[_0x227a18], "궁추가*", 30, "아령 열단파3", 1);
            }
            tbf(boss, "받뎀증", 9, "아령 열단파4", 1);
            break;
          case 2:
            tbf(_0x55e037, "공퍼증", 35, "아령 열단파1", 1);
            for (let _0x184b0e of getRoleIdx("딜", "탱", "디")) {
              tbf(comp[_0x184b0e], "궁뎀증", 17.5, "아령 열단파2", 1);
              tbf(comp[_0x184b0e], "궁추가*", 35, "아령 열단파3", 1);
            }
            tbf(boss, "받뎀증", 10.5, "아령 열단파4", 1);
            break;
          case 3:
            tbf(_0x55e037, "공퍼증", 40, "아령 열단파1", 1);
            for (let _0x47240d of getRoleIdx("딜", "탱", "디")) {
              tbf(comp[_0x47240d], "궁뎀증", 20, "아령 열단파2", 1);
              tbf(comp[_0x47240d], "궁추가*", 40, "아령 열단파3", 1);
            }
            tbf(boss, "받뎀증", 12, "아령 열단파4", 1);
            break;
          case 4:
            tbf(_0x55e037, "공퍼증", 45, "아령 열단파1", 1);
            for (let _0x520d58 of getRoleIdx("딜", "탱", "디")) {
              tbf(comp[_0x520d58], "궁뎀증", 22.5, "아령 열단파2", 1);
              tbf(comp[_0x520d58], "궁추가*", 45, "아령 열단파3", 1);
            }
            tbf(boss, "받뎀증", 13.5, "아령 열단파4", 1);
            break;
          default:
            tbf(_0x55e037, "공퍼증", 50, "아령 열단파1", 1);
            for (let _0x38cbd5 of getRoleIdx("딜", "탱", "디")) {
              tbf(comp[_0x38cbd5], "궁뎀증", 25, "아령 열단파2", 1);
              tbf(comp[_0x38cbd5], "궁추가*", 50, "아령 열단파3", 1);
            }
            tbf(boss, "받뎀증", 15, "아령 열단파4", 1);
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
        if (_0x55e037.stack >= 2) {
          _0x55e037.stack = 0;
          nbf(_0x55e037, "<수련의 행복>", 0, "사랑이 곧 힘", -2, 2);
          setBuffOnAll(_0x55e037, "추가", "사랑이 곧 힘1", false);
        }
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
        if (_0x55e037.stack == 1) {
          setBuffOnAll(_0x55e037, "추가", "사랑이 곧 힘1", true);
        }
        _0x55e037.stack += 1;
        atbf(boss, "피격", bossHitTarget, "공퍼증", 25, "<난쟁이 왕의 위압>1", 3, 1);
        atbf(boss, "피격", bossHitTarget, "가뎀증", 10, "<난쟁이 왕의 위압>2", 3, 1);
      };
      _0x55e037.leader = function () {
        hpUpAll(50);
        tbf(all, "공퍼증", 50, "웨딩드레스를 입은 난쟁이 왕의 진심1", always);
        for (let _0x46aef8 of getElementIdx("풍")) {
          buff(_0x55e037, "평", comp[_0x46aef8], "받속뎀", 10, "웨딩드레스를 입은 난쟁이 왕의 진심2", 3, always, "발동", false);
        }
        buff(_0x55e037, "공퍼증", 50, "웨딩드레스를 입은 난쟁이 왕의 진심3", always, false);
        buff(_0x55e037, "궁", all, "가뎀증", 20, "웨딩드레스를 입은 난쟁이 왕의 진심4", 1, always, "발동", false);
        for (let _0x17761b of comp) {
          if (_0x17761b.id == _0x55e037.id) {
            continue;
          }
          const _0x34be4d = _0x17761b.attack;
          _0x17761b.attack = function (..._0xf0fe44) {
            _0x34be4d.apply(this, _0xf0fe44);
            const _0x46af6f = _0x55e037.getNest("<동반자의 힘>");
            if (_0x46af6f >= 1) {
              setBuffOnAll(_0x55e037, "발동", "웨딩드레스를 입은 난쟁이 왕의 진심2", true);
            }
            if (_0x46af6f >= 4) {
              setBuffOn(_0x55e037, "기본", "웨딩드레스를 입은 난쟁이 왕의 진심3", true);
            }
            if (_0x46af6f >= 8) {
              setBuffOnAll(_0x55e037, "발동", "웨딩드레스를 입은 난쟁이 왕의 진심4", true);
            }
          };
          const _0x5a893d = _0x17761b.ultimate;
          _0x17761b.ultimate = function (..._0x4eb779) {
            _0x5a893d.apply(this, _0x4eb779);
            const _0x33d347 = _0x55e037.getNest("<동반자의 힘>");
            if (_0x33d347 >= 1) {
              setBuffOnAll(_0x55e037, "발동", "웨딩드레스를 입은 난쟁이 왕의 진심2", true);
            }
            if (_0x33d347 >= 4) {
              setBuffOn(_0x55e037, "기본", "웨딩드레스를 입은 난쟁이 왕의 진심3", true);
            }
            if (_0x33d347 >= 8) {
              setBuffOnAll(_0x55e037, "발동", "웨딩드레스를 입은 난쟁이 왕의 진심4", true);
            }
          };
        }
      };
      _0x55e037.passive = function () {
        atbf(_0x55e037, "평", _0x55e037, "공퍼증", 25, "축복의 무게1", 3, always);
        if (getRoleCnt("섶") >= 2) {
          for (let _0x564a4c of getRoleIdx("딜", "탱", "디")) {
            tbf(comp[_0x564a4c], "발효증", -500, "축복의 무게4", always);
          }
        }
        ptbf(_0x55e037, "궁", all, "공고증", myCurAtk + _0x55e037.id + 30, "<풀파워 부케 아령 투척>1", 1, always);
        ptbf(_0x55e037, "궁", all, "궁뎀증", 10, "<풀파워 부케 아령 투척>2", 1, always);
        for (let _0x34a037 of getElementIdx("풍")) {
          ptbf(_0x55e037, "궁", comp[_0x34a037], "받속뎀", 30, "<풀파워 부케 아령 투척>3", 1, always);
        }
        tbf(_0x55e037, "궁추가*", 200, "<풀파워 부케 아령 투척>4", always);
        anbf(_0x55e037, "평", _0x55e037, "<수련의 행복>", 0, "사랑이 곧 힘", 1, 2, always);
        for (let _0x4c3d64 of comp) {
          if (_0x4c3d64.id != _0x55e037.id) {
            buff(_0x55e037, "궁", _0x4c3d64, "<바람의 축복>", 0, "사랑이 곧 힘1", 1, always, "추가", false);
          }
        }
        for (let _0x1203d1 of comp) {
          if (_0x1203d1.id != _0x55e037.id) {
            anbf(_0x1203d1, "<바람의 축복>", _0x1203d1, "공퍼증", 15, "사랑이 곧 힘2", 1, 5, always);
            anbf(_0x1203d1, "<바람의 축복>", _0x1203d1, "궁뎀증", 5, "사랑이 곧 힘3", 1, 5, always);
          }
        }
        tbf(_0x55e037, "공퍼증", 10, "공격+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {
          if (GLOBAL_TURN == 1) {
            if (getElKind() == 1) {
              for (let _0x32aba0 of comp) {
                if (_0x32aba0.id == _0x55e037.id) {
                  continue;
                }
                tbf(_0x32aba0, "공퍼증", 50, "<부케를 받은 자>", 50);
                tbf(_0x32aba0, "가뎀증", 50, "<부케를 받은 자>", 50);
                tbf(_0x32aba0, "궁뎀증", 50, "<부케를 받은 자>", 50);
                anbf(_0x32aba0, "공격", _0x55e037, "<동반자의 힘>", 0, "<부케를 받은 자>", 1, 8, 50);
                tbf(_0x32aba0, "궁추가*", 75, "<부케를 받은 자>", 50);
                for (let _0x2ec582 of comp) {
                  if (_0x2ec582.id == _0x32aba0.id || _0x2ec582.id == _0x55e037.id) {
                    continue;
                  }
                  atbf(_0x32aba0, "행동", _0x2ec582, "제거", "기본", "<부케를 받은 자>", 1, 1);
                  atbf(_0x32aba0, "행동", _0x2ec582, "제거", "발동", "<부케를 받은 자>", 1, 1);
                }
              }
            }
          }
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10197:
      setMnc(_0x55e037, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x78c5e1);
      buff_ex.push("<상부상조>");
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(_0x55e037, "공퍼증", 231, "천-요화유리1", 1);
            nbf(_0x55e037, "궁뎀증", 15, "천-요화유리2", 1, 3);
            boss.def = false;
            break;
          case 2:
            tbf(_0x55e037, "공퍼증", 269.5, "천-요화유리1", 1);
            nbf(_0x55e037, "궁뎀증", 17.5, "천-요화유리2", 1, 3);
            boss.def = false;
            break;
          case 3:
            tbf(_0x55e037, "공퍼증", 308, "천-요화유리1", 1);
            nbf(_0x55e037, "궁뎀증", 20, "천-요화유리2", 1, 3);
            boss.def = false;
            for (let _0x2eca69 of getElementIdx("광")) {
              nbf(comp[_0x2eca69], "받속뎀", 3, "천-요화유리4", 1, 3);
            }
            break;
          case 4:
            tbf(_0x55e037, "공퍼증", 346.5, "천-요화유리1", 1);
            nbf(_0x55e037, "궁뎀증", 22.5, "천-요화유리2", 1, 3);
            boss.def = false;
            for (let _0x5ae0b6 of getElementIdx("광")) {
              nbf(comp[_0x5ae0b6], "받속뎀", 6, "천-요화유리4", 1, 3);
            }
            break;
          default:
            tbf(_0x55e037, "공퍼증", 385, "천-요화유리1", 1);
            nbf(_0x55e037, "궁뎀증", 25, "천-요화유리2", 1, 3);
            boss.def = false;
            for (let _0x5ab58c of getElementIdx("광")) {
              nbf(comp[_0x5ab58c], "받속뎀", 9, "천-요화유리4", 1, 3);
            }
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        const _0x3a1dd4 = boss.def;
        ultLogic(_0x55e037, 5);
        if (_0x3a1dd4) {
          nbf(_0x55e037, "가뎀증", 30, "여우의 환영", 1, 2);
        }
        nbf(_0x55e037, "<상부상조>", 0, "<익자삼우>", -3, 3);
        setBuffOn(_0x55e037, "기본", "세상을 유영하다1", false);
        setBuffOn(_0x55e037, "기본", "세상을 유영하다2", false);
        setBuffOn(_0x55e037, "기본", "세상을 유영하다3", false);
        if (_0x55e037.isLeader) {
          setBuffOnAll(_0x55e037, "기본", "<절대 매혹>3", false);
          setBuffOnAll(_0x55e037, "기본", "<절대 매혹>4", false);
          setBuffOnAll(_0x55e037, "기본", "<절대 매혹>5", false);
          for (let _0x35567f of getRoleIdx("딜", "탱", "디")) {
            if (comp[_0x35567f].id != _0x55e037.id) {
              const _0x320cde = comp[_0x35567f].getNest("<상부상조>");
              setBuffOn(comp[_0x35567f], "기본", "<절대 매혹>3", _0x320cde >= 1);
              setBuffOn(comp[_0x35567f], "기본", "<절대 매혹>4", _0x320cde >= 2);
              setBuffOn(comp[_0x35567f], "기본", "<절대 매혹>5", _0x320cde >= 3);
            }
          }
        }
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
        if (_0x55e037.isLeader) {
          for (let _0x238118 of getRoleIdx("딜", "탱", "디")) {
            if (comp[_0x238118].id != _0x55e037.id) {
              const _0x22dd50 = comp[_0x238118].getNest("<상부상조>");
              setBuffOn(comp[_0x238118], "기본", "<절대 매혹>3", _0x22dd50 >= 1);
              setBuffOn(comp[_0x238118], "기본", "<절대 매혹>4", _0x22dd50 >= 2);
              setBuffOn(comp[_0x238118], "기본", "<절대 매혹>5", _0x22dd50 >= 3);
            }
          }
        }
      };
      _0x55e037.leader = function () {
        hpUpAll(50);
        tbf(all, "공퍼증", 50, "경국경성-얀코1", always);
        for (let _0x3b24cb of getRoleIdx("딜", "탱", "디")) {
          if (comp[_0x3b24cb].id != _0x55e037.id) {
            const _0x151ef5 = comp[_0x3b24cb].ultimate;
            comp[_0x3b24cb].ultimate = function (..._0x30cf12) {
              _0x151ef5.apply(this, _0x30cf12);
              nbf(comp[_0x3b24cb], "<상부상조>", 0, "<익자삼우>", -3, 3);
              setBuffOn(comp[_0x3b24cb], "기본", "<절대 매혹>3", false);
              setBuffOn(comp[_0x3b24cb], "기본", "<절대 매혹>4", false);
              setBuffOn(comp[_0x3b24cb], "기본", "<절대 매혹>5", false);
            };
          }
        }
        const _0x1fe929 = comp[3].ultimate;
        comp[3].ultimate = function (..._0x23f47d) {
          _0x1fe929.apply(this, _0x23f47d);
          for (let _0x26c874 of comp) {
            atbf(_0x26c874, "궁", boss, "방어", 0, "<호란신미>", 1, 1);
          }
        };
        if (getElKind() == 1) {
          for (let _0x1c35ad of getRoleIdx("딜", "탱", "디")) {
            if (comp[_0x1c35ad].id != _0x55e037.id) {
              anbf(_0x55e037, "행동", comp[_0x1c35ad], "<상부상조>", 0, "<익자삼우>", 1, 3, always);
            }
          }
        }
        pnbf(_0x55e037, "궁", boss, "받뎀증", 2, "<절대 매혹>1", 1, 15, always);
        for (let _0x3d30aa of getElementIdx("광")) {
          pnbf(_0x55e037, "궁", comp[_0x3d30aa], "받속뎀", 3, "<절대 매혹>2", 1, 15, always);
        }
        buff(_0x55e037, "궁뎀증", 45, "<절대 매혹>3", always, false);
        buff(_0x55e037, "가뎀증", 55, "<절대 매혹>4", always, false);
        buff(_0x55e037, "궁추가*", 100, "<절대 매혹>5", always, false);
        for (let _0x77bed0 of getRoleIdx("딜", "탱", "디")) {
          pnbf(comp[_0x77bed0], "궁", boss, "받뎀증", 2, "<절대 매혹>1", 1, 15, always);
          for (let _0x3f5ddb of getElementIdx("광")) {
            pnbf(comp[_0x77bed0], "궁", comp[_0x3f5ddb], "받속뎀", 3, "<절대 매혹>2", 1, 15, always);
          }
          buff(comp[_0x77bed0], "궁뎀증", 45, "<절대 매혹>3", always, false);
          buff(comp[_0x77bed0], "가뎀증", 55, "<절대 매혹>4", always, false);
          buff(comp[_0x77bed0], "궁추가*", 100, "<절대 매혹>5", always, false);
        }
      };
      _0x55e037.passive = function () {
        tbf(_0x55e037, "궁추가*", 100, "꽃속의 그림자1", always);
        for (let _0x1858ca of comp) {
          if (_0x1858ca.id != _0x55e037.id) {
            anbf(_0x1858ca, "궁", boss, "받뎀증", 3.33, "꽃속의 그림자2", 1, 12, always);
            for (let _0x1f3396 of getElementIdx("광")) {
              anbf(_0x1858ca, "궁", comp[_0x1f3396], "받속뎀", 2.75, "꽃속의 그림자3", 1, 12, always);
            }
          }
        }
        for (let _0x5ab2f2 of getRoleIdx("딜", "탱", "디")) {
          if (comp[_0x5ab2f2].id != _0x55e037.id) {
            anbf(comp[_0x5ab2f2], "평", _0x55e037, "<상부상조>", 0, "<익자삼우>", 1, 3, always);
            const _0x291009 = comp[_0x5ab2f2].attack;
            comp[_0x5ab2f2].attack = function (..._0x3c107b) {
              _0x291009.apply(this, _0x3c107b);
              const _0x2248e5 = _0x55e037.getNest("<상부상조>");
              setBuffOn(_0x55e037, "기본", "세상을 유영하다1", _0x2248e5 >= 1);
              setBuffOn(_0x55e037, "기본", "세상을 유영하다2", _0x2248e5 >= 2);
              setBuffOn(_0x55e037, "기본", "세상을 유영하다3", _0x2248e5 >= 3);
              if (_0x55e037.isLeader) {
                setBuffOnAll(_0x55e037, "기본", "<절대 매혹>3", _0x2248e5 >= 1);
                setBuffOnAll(_0x55e037, "기본", "<절대 매혹>4", _0x2248e5 >= 2);
                setBuffOnAll(_0x55e037, "기본", "<절대 매혹>5", _0x2248e5 >= 3);
              }
            };
          }
        }
        buff(_0x55e037, "궁뎀증", 25, "세상을 유영하다1", always, false);
        buff(_0x55e037, "가뎀증", 60, "세상을 유영하다2", always, false);
        buff(_0x55e037, "궁추가*", 100, "세상을 유영하다3", always, false);
        anbf(_0x55e037, "방", _0x55e037, "<상부상조>", 0, "<익자삼우>", 1, 3, always);
        if (!_0x55e037.isLeader) {
          const _0x1eb525 = comp[2].ultimate;
          comp[2].ultimate = function (..._0x50ec47) {
            _0x1eb525.apply(this, _0x50ec47);
            for (let _0x54278a of comp) {
              atbf(_0x54278a, "궁", boss, "방어", 0, "<호란신미>", 1, 1);
            }
          };
        }
        tbf(_0x55e037, "궁뎀증", 10, "궁극기+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
        const _0x3b06d8 = _0x55e037.getNest("<상부상조>");
        setBuffOn(_0x55e037, "기본", "세상을 유영하다1", _0x3b06d8 >= 1);
        setBuffOn(_0x55e037, "기본", "세상을 유영하다2", _0x3b06d8 >= 2);
        setBuffOn(_0x55e037, "기본", "세상을 유영하다3", _0x3b06d8 >= 3);
        if (_0x55e037.isLeader) {
          setBuffOnAll(_0x55e037, "기본", "<절대 매혹>3", _0x3b06d8 >= 1);
          setBuffOnAll(_0x55e037, "기본", "<절대 매혹>4", _0x3b06d8 >= 2);
          setBuffOnAll(_0x55e037, "기본", "<절대 매혹>5", _0x3b06d8 >= 3);
          for (let _0x28e4bf of getRoleIdx("딜", "탱", "디")) {
            if (comp[_0x28e4bf].id != _0x55e037.id) {
              const _0x1b5fcc = comp[_0x28e4bf].getNest("<상부상조>");
              setBuffOn(comp[_0x28e4bf], "기본", "<절대 매혹>3", _0x1b5fcc >= 1);
              setBuffOn(comp[_0x28e4bf], "기본", "<절대 매혹>4", _0x1b5fcc >= 2);
              setBuffOn(comp[_0x28e4bf], "기본", "<절대 매혹>5", _0x1b5fcc >= 3);
            }
          }
        }
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10198:
      buff_ex.push("<붉은 장미>");
      _0x55e037.stack = 0;
      setMnc(_0x55e037, [0, 1, 0, 1, 0, 1, 0, 1, 0, 1], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            nbf(_0x55e037, "공퍼증", 90, "구음진경(위)-해방1", 1, 1);
            nbf(_0x55e037, "일뎀증", 30, "구음진경(위)-해방2", 1, 1);
            break;
          case 2:
            nbf(_0x55e037, "공퍼증", 105, "구음진경(위)-해방1", 1, 1);
            nbf(_0x55e037, "일뎀증", 35, "구음진경(위)-해방2", 1, 1);
            break;
          case 3:
            nbf(_0x55e037, "공퍼증", 120, "구음진경(위)-해방1", 1, 1);
            nbf(_0x55e037, "일뎀증", 40, "구음진경(위)-해방2", 1, 1);
            nbf(_0x55e037, "가뎀증", 20, "구음진경(위)-해방3", 1, 1);
            break;
          case 4:
            nbf(_0x55e037, "공퍼증", 135, "구음진경(위)-해방1", 1, 1);
            nbf(_0x55e037, "일뎀증", 45, "구음진경(위)-해방2", 1, 1);
            nbf(_0x55e037, "가뎀증", 22.5, "구음진경(위)-해방3", 1, 1);
            break;
          default:
            nbf(_0x55e037, "공퍼증", 150, "구음진경(위)-해방1", 1, 1);
            nbf(_0x55e037, "일뎀증", 50, "구음진경(위)-해방2", 1, 1);
            nbf(_0x55e037, "가뎀증", 25, "구음진경(위)-해방3", 1, 1);
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
        deleteBuff(_0x55e037, "발동", "<질풍 세계>1");
        deleteBuff(_0x55e037, "발동", "<질풍 세계>2");
        _0x55e037.stopCd = true;
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        if (_0x55e037.stack == 12) {
          setBuffOn(_0x55e037, "추가", "핏빛 꿰뚫기술1", true);
          setBuffOn(_0x55e037, "추가", "핏빛 꿰뚫기술2", true);
        }
        atkLogic(_0x55e037, 2);
        if (_0x55e037.stack == 12) {
          _0x55e037.stack = 0;
          setBuffOn(_0x55e037, "추가", "핏빛 꿰뚫기술1", false);
          setBuffOn(_0x55e037, "추가", "핏빛 꿰뚫기술2", false);
          setBuffOnAll(_0x55e037, "기본", "핏빛 꿰뚫기술3", false);
          setBuffOnAll(_0x55e037, "추가", "핏빛 꿰뚫기술4", false);
          setBuffOn(_0x55e037, "추가", "<장미의 잔영>", false);
        }
      };
      _0x55e037.leader = function () {
        hpUpAll(50);
        tbf(all, "공퍼증", 50, "장미의 그림자1", always);
        if (getRoleCnt("딜") >= 5) {
          tbf(_0x55e037, "가뎀증", 60, "<꽃잎의 춤>1", always);
          tbf(_0x55e037, "일뎀증", 60, "<꽃잎의 춤>2", always);
          tbf(_0x55e037, "평추가*", 30, "<꽃잎의 춤>3", always);
        }
        if (getRoleCnt("딜") >= 5) {
          for (let _0xf78023 of comp) {
            if (_0xf78023.id != _0x55e037.id) {
              atbf(_0xf78023, "공격", _0x55e037, "공고증", myCurAtk + _0xf78023.id + 12.5, "<장미의 잔영>1", 1, always);
              anbf(_0xf78023, "공격", _0x55e037, "<붉은 장미>", 0, "<장미의 잔영>", 2, 12, always);
              const _0x27e1aa = _0xf78023.ultimate;
              _0xf78023.ultimate = function (..._0x11dfab) {
                _0x27e1aa.apply(this, _0x11dfab);
                _0x55e037.stack += 2;
                if (_0x55e037.stack > 12) {
                  _0x55e037.stack = 12;
                }
              };
              const _0x344cd5 = _0xf78023.attack;
              _0xf78023.attack = function (..._0x1182b9) {
                _0x344cd5.apply(this, _0x1182b9);
                _0x55e037.stack += 2;
                if (_0x55e037.stack > 12) {
                  _0x55e037.stack = 12;
                }
              };
            }
          }
        }
      };
      _0x55e037.passive = function () {
        for (let _0x3e3d62 of comp) {
          if (_0x3e3d62.id != _0x55e037.id) {
            anbf(_0x3e3d62, "공격", _0x55e037, "<붉은 장미>", 0, "<장미의 잔영>", 1, 12, always);
            const _0x2eeaf4 = _0x3e3d62.ultimate;
            _0x3e3d62.ultimate = function (..._0xbe819a) {
              const _0x194195 = _0x55e037.stack;
              _0x2eeaf4.apply(this, _0xbe819a);
              _0x55e037.stack++;
              if (_0x55e037.stack > 12) {
                _0x55e037.stack = 12;
              }
              if (_0x194195 < 4 && _0x55e037.stack >= 4) {
                setBuffOn(_0x55e037, "기본", "핏빛 꿰뚫기술1", true);
              }
              if (_0x194195 < 8 && _0x55e037.stack >= 8) {
                setBuffOn(_0x55e037, "기본", "핏빛 꿰뚫기술2", true);
              }
              if (_0x194195 < 12 && _0x55e037.stack >= 12) {
                setBuffOnAll(_0x55e037, "기본", "핏빛 꿰뚫기술3", true);
              }
              if (_0x194195 < 12 && _0x55e037.stack >= 12) {
                setBuffOnAll(_0x55e037, "추가", "핏빛 꿰뚫기술4", true);
              }
              if (_0x194195 < 12 && _0x55e037.stack >= 12) {
                setBuffOn(_0x55e037, "추가", "<장미의 잔영>", true);
              }
            };
            const _0x5285d2 = _0x3e3d62.attack;
            _0x3e3d62.attack = function (..._0x24ae03) {
              const _0x2d7406 = _0x55e037.stack;
              _0x5285d2.apply(this, _0x24ae03);
              _0x55e037.stack++;
              if (_0x55e037.stack > 12) {
                _0x55e037.stack = 12;
              }
              if (_0x2d7406 < 4 && _0x55e037.stack >= 4) {
                setBuffOn(_0x55e037, "기본", "핏빛 꿰뚫기술1", true);
              }
              if (_0x2d7406 < 8 && _0x55e037.stack >= 8) {
                setBuffOn(_0x55e037, "기본", "핏빛 꿰뚫기술2", true);
              }
              if (_0x2d7406 < 12 && _0x55e037.stack >= 12) {
                setBuffOnAll(_0x55e037, "기본", "핏빛 꿰뚫기술3", true);
              }
              if (_0x2d7406 < 12 && _0x55e037.stack >= 12) {
                setBuffOnAll(_0x55e037, "추가", "핏빛 꿰뚫기술4", true);
              }
              if (_0x2d7406 < 12 && _0x55e037.stack >= 12) {
                setBuffOn(_0x55e037, "추가", "<장미의 잔영>", true);
              }
            };
          }
        }
        buff(_0x55e037, "일뎀증", 85, "핏빛 꿰뚫기술1", always, false);
        buff(_0x55e037, "가뎀증", 30, "핏빛 꿰뚫기술2", always, false);
        buff(_0x55e037, "평추가*", 30, "핏빛 꿰뚫기술3", always, false);
        buff(_0x55e037, "평추가*", 30, "핏빛 꿰뚫기술3", always, false);
        buff(_0x55e037, "평추가*", 30, "핏빛 꿰뚫기술3", always, false);
        buff(_0x55e037, "평추가*", 30, "핏빛 꿰뚫기술3", always, false);
        for (let _0x40fbd0 of getElementIdx("암")) {
          buff(_0x55e037, "평", comp[_0x40fbd0], "받속뎀", 37.5, "핏빛 꿰뚫기술4", 1, 1, always, "추가", false);
        }
        buff(_0x55e037, "평", _0x55e037, "<붉은 장미>", 0, "<장미의 잔영>", -12, 12, always, "추가", false);
        buff(_0x55e037, "평", _0x55e037, "off", "기본", "핏빛 꿰뚫기술1", 1, always, "추가", false);
        buff(_0x55e037, "평", _0x55e037, "off", "기본", "핏빛 꿰뚫기술2", 1, always, "추가", false);
        anbf(_0x55e037, "방", _0x55e037, "<붉은 장미>", 0, "<장미의 잔영>", 4, 12, always);
        atbf(_0x55e037, "궁", _0x55e037, "공퍼증", 110, "<질풍 세계>1", 50, always);
        atbf(_0x55e037, "궁", _0x55e037, "방뎀증", 110, "<질풍 세계>2", 50, always);
        tbf(_0x55e037, "일뎀증", 10, "일반 공격 데미지+", always);
      };
      _0x55e037.defense = function () {
        const _0x4ab9fa = _0x55e037.stack;
        _0x55e037.act_defense();
        _0x55e037.stack += 4;
        if (_0x55e037.stack > 12) {
          _0x55e037.stack = 12;
        }
        if (_0x4ab9fa < 4 && _0x55e037.stack >= 4) {
          setBuffOn(_0x55e037, "기본", "핏빛 꿰뚫기술1", true);
        }
        if (_0x4ab9fa < 8 && _0x55e037.stack >= 8) {
          setBuffOn(_0x55e037, "기본", "핏빛 꿰뚫기술2", true);
        }
        if (_0x4ab9fa < 12 && _0x55e037.stack >= 12) {
          setBuffOnAll(_0x55e037, "기본", "핏빛 꿰뚫기술3", true);
        }
        if (_0x4ab9fa < 12 && _0x55e037.stack >= 12) {
          setBuffOnAll(_0x55e037, "추가", "핏빛 꿰뚫기술4", true);
        }
        if (_0x4ab9fa < 12 && _0x55e037.stack >= 12) {
          setBuffOn(_0x55e037, "추가", "<장미의 잔영>", true);
        }
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {
          if (GLOBAL_TURN == 1) {
            if (getRoleCnt("딜") >= 5) {
              nbf(boss, "받뎀증", 15, "<꽃잎의 춤>4", 1, 1);
              for (let _0x26cd23 of comp) {
                nbf(_0x26cd23, "받속뎀", 20, "<꽃잎의 춤>5", 1, 1);
                cdChange(_0x26cd23, -4);
              }
            }
          }
        }
        if (GLOBAL_TURN == 1) {
          cdChange(_0x55e037, -1);
          const _0x191f39 = getRoleCnt("딜", "디", "탱") - 1;
          for (let _0x14db76 = 0; _0x14db76 < _0x191f39; _0x14db76++) {
            nbf(_0x55e037, "가뎀증", 15, "암살자 길드의 엘리트1", 1, 2);
            nbf(boss, "받뎀증", 12.5, "암살자 길드의 엘리트2", 1, 2);
          }
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10199:
      setMnc(_0x55e037, [0, 3, 0, 3, 0, 3, 0, 3, 0, 3], _0x78c5e1);
      _0x55e037.stack = 0;
      buff_ex.push("<카드 한 장 세트>");
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            for (let _0x3b3fb3 of getElementIdx("수")) {
              tbf(comp[_0x3b3fb3], "공퍼증", 28.5, "섹스 신의 선고1", 1);
              tbf(comp[_0x3b3fb3], "가뎀증", 17.1, "섹스 신의 선고2", 1);
            }
            tbf(boss, "받뎀증", 11.4, "섹스 신의 선고3", 1);
            for (let _0x59de0d of getElementIdx("수")) {
              tbf(comp[_0x59de0d], "받속뎀", 17.1, "섹스 신의 선고4", 1);
            }
            break;
          case 2:
            for (let _0x27537a of getElementIdx("수")) {
              tbf(comp[_0x27537a], "공퍼증", 33.25, "섹스 신의 선고1", 1);
              tbf(comp[_0x27537a], "가뎀증", 19.95, "섹스 신의 선고2", 1);
            }
            tbf(boss, "받뎀증", 13.3, "섹스 신의 선고3", 1);
            for (let _0x3980fd of getElementIdx("수")) {
              tbf(comp[_0x3980fd], "받속뎀", 19.95, "섹스 신의 선고4", 1);
            }
            break;
          case 3:
            for (let _0x43ce87 of getElementIdx("수")) {
              tbf(comp[_0x43ce87], "공퍼증", 38, "섹스 신의 선고1", 1);
              tbf(comp[_0x43ce87], "가뎀증", 22.8, "섹스 신의 선고2", 1);
            }
            tbf(boss, "받뎀증", 15.2, "섹스 신의 선고3", 1);
            for (let _0x329660 of getElementIdx("수")) {
              tbf(comp[_0x329660], "받속뎀", 22.8, "섹스 신의 선고4", 1);
            }
            break;
          case 4:
            for (let _0x138e4d of getElementIdx("수")) {
              tbf(comp[_0x138e4d], "공퍼증", 42.75, "섹스 신의 선고1", 1);
              tbf(comp[_0x138e4d], "가뎀증", 25.65, "섹스 신의 선고2", 1);
            }
            tbf(boss, "받뎀증", 17.1, "섹스 신의 선고3", 1);
            for (let _0x14d150 of getElementIdx("수")) {
              tbf(comp[_0x14d150], "받속뎀", 25.65, "섹스 신의 선고4", 1);
            }
            break;
          default:
            for (let _0x2c86a1 of getElementIdx("수")) {
              tbf(comp[_0x2c86a1], "공퍼증", 47.5, "섹스 신의 선고1", 1);
              tbf(comp[_0x2c86a1], "가뎀증", 28.5, "섹스 신의 선고2", 1);
            }
            tbf(boss, "받뎀증", 19, "섹스 신의 선고3", 1);
            for (let _0x11394b of getElementIdx("수")) {
              tbf(comp[_0x11394b], "받속뎀", 28.5, "섹스 신의 선고4", 1);
            }
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
        _0x55e037.stack = 0;
        setBuffOnAll(_0x55e037, "발동", "<리버스 카드 오픈>1", false);
        setBuffOnAll(_0x55e037, "발동", "<리버스 카드 오픈>2", false);
      };
      _0x55e037.atkbefore = function () {
        for (let _0x5d6ce5 of getElementIdx("수")) {
          tbf(comp[_0x5d6ce5], "공고증", myCurAtk + _0x55e037.id + 30, "드로우!", 1);
        }
      };
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
        _0x55e037.stack++;
        if (_0x55e037.stack > 2) {
          _0x55e037.stack = 2;
        }
        setBuffOnAll(_0x55e037, "발동", "<리버스 카드 오픈>1", _0x55e037.stack >= 1);
        setBuffOnAll(_0x55e037, "발동", "<리버스 카드 오픈>2", _0x55e037.stack >= 2);
      };
      _0x55e037.leader = function () {
        hpUpAll(50);
        tbf(all, "공퍼증", 65, "섹스 신관의 특훈1", always);
        if (getElementCnt("수") >= 4) {
          tbf(all, "가뎀증", -500, "섹스 신관의 특훈2", always);
        }
      };
      _0x55e037.passive = function () {
        for (let _0x47e13e of getElementIdx("수")) {
          atbf(_0x55e037, "궁", comp[_0x47e13e], "공고증", myCurAtk + _0x55e037.id + 30, "전술마법 「야외 자위」", 1, always);
        }
        anbf(_0x55e037, "평", _0x55e037, "<카드 한 장 세트>", 0, "섹스 듀얼리스트의 마음", 1, 2, always);
        for (let _0x5b8195 of getElementIdx("수")) {
          buff(_0x55e037, "궁", comp[_0x5b8195], "궁뎀증", 12, "<리버스 카드 오픈>1", 1, always, "발동", false);
          buff(_0x55e037, "궁", comp[_0x5b8195], "발효증", 24, "<리버스 카드 오픈>1", 1, always, "발동", false);
          buff(_0x55e037, "궁", comp[_0x5b8195], "궁뎀증", 12, "<리버스 카드 오픈>2", 1, always, "발동", false);
          buff(_0x55e037, "궁", comp[_0x5b8195], "발효증", 24, "<리버스 카드 오픈>2", 1, always, "발동", false);
        }
        anbf(_0x55e037, "궁", _0x55e037, "<카드 한 장 세트>", 0, "섹스 듀얼리스트의 마음", -2, 2, always);
        tbf(_0x55e037, "공퍼증", 10, "공격+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {
          if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 3 == 0) {
            for (let _0xf2bd of getElementIdx("수")) {
              tbf(comp[_0xf2bd], "가뎀증", 38.5, "<하늘에서 내려온 복음>1", 1);
              tbf(comp[_0xf2bd], "궁뎀증", 32, "<하늘에서 내려온 복음>2", 1);
              tbf(comp[_0xf2bd], "발효증", 64, "<하늘에서 내려온 복음>3", 1);
            }
            for (let _0x5d5e11 of getRoleIdx("딜", "탱", "디")) {
              if (comp[_0x5d5e11].element == 1) {
                tbf(comp[_0x5d5e11], "궁추가*", 48, "<하늘에서 내려온 복음>4", 1);
                tbf(comp[_0x5d5e11], "궁발동*", 24, "<하늘에서 내려온 복음>5", 1);
              }
            }
            tbf(boss, "받뎀증", 25.5, "<하늘에서 내려온 복음>6", 1);
            for (let _0x44293a of getElementIdx("수")) {
              tbf(comp[_0x44293a], "받속뎀", 38.5, "<하늘에서 내려온 복음>7", 1);
            }
          }
        }
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 3 == 0) {
          for (let _0xcda583 of getRoleIdx("딜", "탱", "디")) {
            if (comp[_0xcda583].element == 1) {
              tbf(comp[_0xcda583], "궁추가*", 35.6, "<섹스의 힘>1", 1);
              tbf(comp[_0xcda583], "궁발동*", 17.8, "<섹스의 힘>2", 1);
            }
          }
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10200:
      setMnc(_0x55e037, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            nbf(boss, "받뎀증", 19.8, "섹스 천사의 절대 의식1", 1, 2);
            nbf(boss, "받일뎀", 16.5, "섹스 천사의 절대 의식2", 1, 2);
            break;
          case 2:
            nbf(boss, "받뎀증", 23.1, "섹스 천사의 절대 의식1", 1, 2);
            nbf(boss, "받일뎀", 19.25, "섹스 천사의 절대 의식2", 1, 2);
            for (let _0x54330a of getElementIdx("풍")) {
              nbf(comp[_0x54330a], "받속뎀", 9.9, "섹스 천사의 절대 의식3", 1, 2);
            }
            break;
          case 3:
            nbf(boss, "받뎀증", 26.4, "섹스 천사의 절대 의식1", 1, 2);
            nbf(boss, "받일뎀", 22, "섹스 천사의 절대 의식2", 1, 2);
            for (let _0x59047e of getElementIdx("풍")) {
              nbf(comp[_0x59047e], "받속뎀", 12.1, "섹스 천사의 절대 의식3", 1, 2);
            }
            break;
          case 4:
            nbf(boss, "받뎀증", 29.7, "섹스 천사의 절대 의식1", 1, 2);
            nbf(boss, "받일뎀", 24.75, "섹스 천사의 절대 의식2", 1, 2);
            for (let _0x245ed9 of getElementIdx("풍")) {
              nbf(comp[_0x245ed9], "받속뎀", 14.3, "섹스 천사의 절대 의식3", 1, 2);
            }
            break;
          default:
            nbf(boss, "받뎀증", 33, "섹스 천사의 절대 의식1", 1, 2);
            nbf(boss, "받일뎀", 27.5, "섹스 천사의 절대 의식2", 1, 2);
            for (let _0x3549b6 of getElementIdx("풍")) {
              nbf(comp[_0x3549b6], "받속뎀", 16.5, "섹스 천사의 절대 의식3", 1, 2);
            }
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {
        tbf(boss, "받일뎀", 27.5, "섹스 쇼크 웨이브", 1);
      };
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(50);
        tbf(all, "공퍼증", 50, "강욕의 선고자", always);
        if (getElKind() == 1) {
          tbf(all, "가뎀증", 22.5, "<선고>1", always);
          tbf(all, "평추가*", 37.5, "<선고>2", always);
          for (let _0xad531a of comp) {
            atbf(_0xad531a, "공격", all, "공고증", myCurAtk + _0xad531a.id + 3, "<선고>3", 1, always);
          }
          anbf(_0x55e037, "궁", boss, "받뎀증", 7.5, "강욕의 선고자1", 1, 2, always);
          anbf(_0x55e037, "궁", boss, "받일뎀", 28, "강욕의 선고자2", 1, 2, always);
          for (let _0x261d2b of getElementIdx("풍")) {
            anbf(_0x55e037, "궁", comp[_0x261d2b], "받속뎀", 11.25, "강욕의 선고자3", 1, 2, always);
          }
        }
      };
      _0x55e037.passive = function () {
        tbf(_0x55e037, "공퍼증", 220, "천공의 성역", always);
        tbf(_0x55e037, "평추가*", 155, "소환! 섹스 천사", always);
        tbf(_0x55e037, "가뎀증", 33, "섹스의 가호1", always);
        atbf(_0x55e037, "방", all, "일뎀증", 27.5, "섹스의 가호2", 1, always);
        tbf(_0x55e037, "일뎀증", 10, "일반 공격+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
        if (GLOBAL_TURN == 1) {
          cdChange(_0x55e037, -4);
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10201:
      _0x55e037.stack = 0;
      buff_ex.push("<자애르기 파>", "<나쁜 아이 발견♡>");
      setMnc(_0x55e037, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            for (let _0x3d4804 of getElementIdx("화")) {
              tbf(comp[_0x3d4804], "공퍼증", 31.7, "자애로운 토끼 빔~1", 2);
              tbf(comp[_0x3d4804], "가뎀증", 19.1, "자애로운 토끼 빔~2", 2);
            }
            for (let _0x430b7f of getRoleIdx("딜", "탱", "디")) {
              if (comp[_0x430b7f].element == 0) {
                if (comp[_0x430b7f].id != _0x55e037.id) {
                  atbf(comp[_0x430b7f], "궁", comp[_0x430b7f], "평추가*", 58.7, "자애로운 토끼 빔~3", 2, 1);
                }
              }
            }
            tbf(_0x55e037, "평추가*", 154.2, "자애로운 토끼 빔~4", 2);
            break;
          case 2:
            for (let _0x318009 of getElementIdx("화")) {
              tbf(comp[_0x318009], "공퍼증", 37.1, "자애로운 토끼 빔~1", 2);
              tbf(comp[_0x318009], "가뎀증", 22.3, "자애로운 토끼 빔~2", 2);
            }
            for (let _0x182f7a of getRoleIdx("딜", "탱", "디")) {
              if (comp[_0x182f7a].element == 0) {
                if (comp[_0x182f7a].id != _0x55e037.id) {
                  atbf(comp[_0x182f7a], "궁", comp[_0x182f7a], "평추가*", 68.5, "자애로운 토끼 빔~3", 2, 1);
                }
              }
            }
            tbf(_0x55e037, "평추가*", 179.9, "자애로운 토끼 빔~4", 2);
            break;
          case 3:
            for (let _0x119b69 of getElementIdx("화")) {
              tbf(comp[_0x119b69], "공퍼증", 42.4, "자애로운 토끼 빔~1", 2);
              tbf(comp[_0x119b69], "가뎀증", 25.4, "자애로운 토끼 빔~2", 2);
            }
            for (let _0x36a878 of getRoleIdx("딜", "탱", "디")) {
              if (comp[_0x36a878].element == 0) {
                if (comp[_0x36a878].id != _0x55e037.id) {
                  atbf(comp[_0x36a878], "궁", comp[_0x36a878], "평추가*", 78.4, "자애로운 토끼 빔~3", 2, 1);
                }
              }
            }
            tbf(_0x55e037, "평추가*", 205.6, "자애로운 토끼 빔~4", 2);
            break;
          case 4:
            for (let _0x3b7b15 of getElementIdx("화")) {
              tbf(comp[_0x3b7b15], "공퍼증", 47.7, "자애로운 토끼 빔~1", 2);
              tbf(comp[_0x3b7b15], "가뎀증", 28.6, "자애로운 토끼 빔~2", 2);
            }
            for (let _0x3f246f of getRoleIdx("딜", "탱", "디")) {
              if (comp[_0x3f246f].element == 0) {
                if (comp[_0x3f246f].id != _0x55e037.id) {
                  atbf(comp[_0x3f246f], "궁", comp[_0x3f246f], "평추가*", 88.2, "자애로운 토끼 빔~3", 2, 1);
                }
              }
            }
            tbf(_0x55e037, "평추가*", 231.3, "자애로운 토끼 빔~4", 2);
            break;
          default:
            for (let _0x20bb60 of getElementIdx("화")) {
              tbf(comp[_0x20bb60], "공퍼증", 53, "자애로운 토끼 빔~1", 2);
              tbf(comp[_0x20bb60], "가뎀증", 31.8, "자애로운 토끼 빔~2", 2);
            }
            for (let _0x4d08c1 of getRoleIdx("딜", "탱", "디")) {
              if (comp[_0x4d08c1].element == 0) {
                if (comp[_0x4d08c1].id != _0x55e037.id) {
                  atbf(comp[_0x4d08c1], "궁", comp[_0x4d08c1], "평추가*", 98, "자애로운 토끼 빔~3", 2, 1);
                }
              }
            }
            tbf(_0x55e037, "평추가*", 257, "자애로운 토끼 빔~4", 2);
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
        const _0x40bb20 = _0x55e037.getNest("<자애르기 파>");
        for (let _0x4a98fc of getRoleIdx("딜", "탱", "디")) {
          if (comp[_0x4a98fc].element == 0) {
            for (let _0x2a5aa6 = 0; _0x2a5aa6 < _0x40bb20; _0x2a5aa6++) {
              tbf(comp[_0x4a98fc], "일뎀증", 10, "<가득한 모성애>1", 2);
              tbf(comp[_0x4a98fc], "방뎀증", 15, "<가득한 모성애>2", 2);
              tbf(comp[_0x4a98fc], "평추가*", 19.6, "<가득한 모성애>3", 2);
            }
          }
        }
        nbf(_0x55e037, "<자애르기 파>", 0, "사랑과 정의의 마법소녀(?)", -3, 3);
        _0x55e037.stack = 1;
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
        _0x55e037.stack = 0;
      };
      _0x55e037.leader = function () {
        hpUpAll(50);
        const _0xe0294c = getRoKind();
        if (_0xe0294c == 4) {
          for (let _0x48214e of getRoleIdx("섶", "힐")) {
            tbf(comp[_0x48214e], "공퍼증", 50, "<포근한 힐링>1", always);
            atbf(comp[_0x48214e], "평", boss, "받일뎀", 9, "<포근한 힐링>2", 4, always);
            for (let _0x2b184a of getElementIdx("화")) {
              atbf(comp[_0x48214e], "평", comp[_0x2b184a], "받속뎀", 3.5, "<포근한 힐링>3", 4, always);
            }
            for (let _0x57b7b8 of getRoleIdx("딜", "탱", "디")) {
              atbf(comp[_0x48214e], "궁", comp[_0x57b7b8], "공고증", myCurAtk + comp[_0x48214e].id + 15, "<포근한 힐링>4", 2, always);
            }
          }
        }
        if (_0xe0294c == 4) {
          for (let _0x58e7d5 of getRoleIdx("딜", "탱", "디")) {
            atbf(comp[_0x58e7d5], "궁", comp[_0x58e7d5], "공퍼증", 125, "<사랑의 대폭발~♡>1", 2, always);
            atbf(comp[_0x58e7d5], "궁", comp[_0x58e7d5], "가뎀증", 21, "<사랑의 대폭발~♡>2", 2, always);
            atbf(comp[_0x58e7d5], "궁", comp[_0x58e7d5], "평추가*", 106, "<사랑의 대폭발~♡>3", 2, always);
          }
        }
      };
      _0x55e037.passive = function () {
        atbf(_0x55e037, "공격", boss, "받일뎀", 16.5, "관중을 위한 서비스♡", 4, always);
        anbf(_0x55e037, "평", _0x55e037, "<자애르기 파>", 0, "사랑과 정의의 마법소녀(?)", 1, 3, always);
        anbf(_0x55e037, "궁", _0x55e037, "<나쁜 아이 발견♡>", 0, "말 안듣는 나쁜 아이들아~ 어디에 있니~", 1, 1, always);
        anbf(_0x55e037, "행동", _0x55e037, "<나쁜 아이 발견♡>", 0, "말 안듣는 나쁜 아이들아~ 어디에 있니~", -1, 1, always);
        tbf(_0x55e037, "공퍼증", 10, "공격+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
        _0x55e037.stack = 0;
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
        if (_0x55e037.stack == 1) {
          tbf(boss, "받뎀증", 21.3, "<정의의 징벌♡>1", 1);
          for (let _0x4a3b90 of getElementIdx("화")) {
            tbf(comp[_0x4a3b90], "받속뎀", 31.8, "<정의의 징벌♡>2", 1);
          }
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10202:
      _0x55e037.stack = 0;
      setMnc(_0x55e037, [165, 4, 188, 4, 211, 4, 234, 4, 257, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(_0x55e037, "공퍼증", 138, "정의의 사악 광선1", 1);
            tbf(all, "가뎀증", 20.7, "정의의 사악 광선2", 1);
            for (let _0x50bc53 of getElementIdx("암")) {
              tbf(comp[_0x50bc53], "받속뎀", 20.7, "정의의 사악 광선4", 1);
            }
            break;
          case 2:
            tbf(_0x55e037, "공퍼증", 161, "정의의 사악 광선1", 1);
            tbf(all, "가뎀증", 24.15, "정의의 사악 광선2", 1);
            tbf(boss, "받뎀증", 16.1, "정의의 사악 광선3", 1);
            for (let _0x2da072 of getElementIdx("암")) {
              tbf(comp[_0x2da072], "받속뎀", 24.15, "정의의 사악 광선4", 1);
            }
            break;
          case 3:
            tbf(_0x55e037, "공퍼증", 184, "정의의 사악 광선1", 1);
            tbf(all, "가뎀증", 27.6, "정의의 사악 광선2", 1);
            tbf(boss, "받뎀증", 18.4, "정의의 사악 광선3", 1);
            for (let _0x98b4c0 of getElementIdx("암")) {
              tbf(comp[_0x98b4c0], "받속뎀", 27.6, "정의의 사악 광선4", 1);
            }
            break;
          case 4:
            tbf(_0x55e037, "공퍼증", 207, "정의의 사악 광선1", 1);
            tbf(all, "가뎀증", 31.05, "정의의 사악 광선2", 1);
            tbf(boss, "받뎀증", 20.7, "정의의 사악 광선3", 1);
            for (let _0x4fb4f1 of getElementIdx("암")) {
              tbf(comp[_0x4fb4f1], "받속뎀", 31.05, "정의의 사악 광선4", 1);
            }
            break;
          default:
            tbf(_0x55e037, "공퍼증", 230, "정의의 사악 광선1", 1);
            tbf(all, "가뎀증", 34.5, "정의의 사악 광선2", 1);
            tbf(boss, "받뎀증", 23, "정의의 사악 광선3", 1);
            for (let _0xfb6ec2 of getElementIdx("암")) {
              tbf(comp[_0xfb6ec2], "받속뎀", 34.5, "정의의 사악 광선4", 1);
            }
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
        if (_0x55e037.stack == 1) {
          cdChange(_0x55e037, -3);
        }
        _0x55e037.stack = 0;
      };
      _0x55e037.atkbefore = function () {
        tbf(_0x55e037, "공퍼증", 100, "아그이 분쇄 타격", 1);
      };
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(50);
        tbf(all, "공퍼증", 63.5, "악의 왕의 명령1", always);
        anbf(all, "궁", all, "가뎀증", 2.54, "<마법소녀를 위한 함정>1", 1, 15, always);
        anbf(all, "궁", all, "궁뎀증", 2.12, "<마법소녀를 위한 함정>2", 1, 15, always);
        anbf(all, "궁", all, "발효증", 2.12, "<마법소녀를 위한 함정>3", 1, 15, always);
        anbf(all, "궁", boss, "받뎀증", 1.69, "<마법소녀를 위한 함정>4", 1, 15, always);
        for (let _0x1fb7c5 of getElementIdx("암")) {
          anbf(all, "궁", comp[_0x1fb7c5], "받속뎀", 2.54, "<마법소녀를 위한 함정>5", 1, 15, always);
        }
        if (getRoleCnt("힐") >= 1) {
          tbf(all, "가뎀증", -500, "악의 왕의 명령3", always);
        }
      };
      _0x55e037.passive = function () {
        tbf(_0x55e037, "공발동*", 50, "평범한 아르바이트생1", always);
        atbf(_0x55e037, "방", all, "제거", "기본", "평범한 아르바이트생2", 3, always);
        atbf(_0x55e037, "방", all, "아머", _0x55e037.hp * 10, "평범한 아르바이트생2", 3, always);
        tbf(all, "궁뎀증", 28.75, "평범한 아르바이트생3", always);
        tbf(all, "발효증", 28.75, "평범한 아르바이트생4", always);
        tbf(all, "받아증", 50, "평범한 아르바이트생5", always);
        tbf(_0x55e037, "궁발동*", 100, "<돈이 곧 힘>3", always);
        atbf(_0x55e037, "궁", _0x55e037, "아머", _0x55e037.hp * 30, "<돈이 곧 힘>4", 1, always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {
          if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 4 == 0) {
            for (let _0x75a855 of getRoleIdx("딜", "탱", "디")) {
              if (comp[_0x75a855].element == 4) {
                tbf(comp[_0x75a855], "궁추가*", 63.5, "<악의 발톱 소환>1", 2);
                tbf(comp[_0x75a855], "궁발동*", 19, "<악의 발톱 소환>2", 2);
              }
            }
          }
        }
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 4 == 0) {
          cdChange(_0x55e037, -1);
          _0x55e037.stack = 1;
          for (let _0x3af33d of getRoleIdx("딜", "탱", "디")) {
            if (comp[_0x3af33d].element == 4) {
              tbf(comp[_0x3af33d], "궁추가*", 57.5, "<마법봉의 응답>1", 2);
              tbf(comp[_0x3af33d], "궁발동*", 17.2, "<마법봉의 응답>2", 2);
            }
          }
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10203:
      setMnc(_0x55e037, [330, 4, 376, 4, 422, 4, 468, 4, 514, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            nbf(_0x55e037, "공퍼증", 98.4, "웨딩드레스 병기 X 시리즈1", 1, 2);
            nbf(boss, "받뎀증", 9.84, "웨딩드레스 병기 X 시리즈2", 1, 2);
            break;
          case 2:
            nbf(_0x55e037, "공퍼증", 114.8, "웨딩드레스 병기 X 시리즈1", 1, 2);
            nbf(boss, "받뎀증", 11.48, "웨딩드레스 병기 X 시리즈2", 1, 2);
            break;
          case 3:
            nbf(_0x55e037, "공퍼증", 131.2, "웨딩드레스 병기 X 시리즈1", 1, 2);
            nbf(boss, "받뎀증", 13.12, "웨딩드레스 병기 X 시리즈2", 1, 2);
            for (let _0x572983 of getElementIdx("화")) {
              nbf(comp[_0x572983], "받속뎀", 14.76, "웨딩드레스 병기 X 시리즈3", 1, 2);
            }
            break;
          case 4:
            nbf(_0x55e037, "공퍼증", 147.6, "웨딩드레스 병기 X 시리즈1", 1, 2);
            nbf(boss, "받뎀증", 14.76, "웨딩드레스 병기 X 시리즈2", 1, 2);
            for (let _0x160c45 of getElementIdx("화")) {
              nbf(comp[_0x160c45], "받속뎀", 19.68, "웨딩드레스 병기 X 시리즈3", 1, 2);
            }
            break;
          default:
            nbf(_0x55e037, "공퍼증", 164, "웨딩드레스 병기 X 시리즈1", 1, 2);
            nbf(boss, "받뎀증", 16.4, "웨딩드레스 병기 X 시리즈2", 1, 2);
            for (let _0x24e2b8 of getElementIdx("화")) {
              nbf(comp[_0x24e2b8], "받속뎀", 24.6, "웨딩드레스 병기 X 시리즈3", 1, 2);
            }
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037, 5);
        _0x55e037.bless("<불의 축복>");
      };
      _0x55e037.atkbefore = function () {
        nbf(_0x55e037, "발효증", 6, "데이터 조사", 1, 4);
      };
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(55);
        tbf(all, "공퍼증", 40.5, "용궁의 주인1", always);
        const _0x5231e8 = getElKind();
        if (_0x5231e8 == 4 || _0x5231e8 == 5) {
          tbf(_0x55e037, "가뎀증", 48.6, "<관리자 권한>1", always);
          tbf(_0x55e037, "궁뎀증", 16.2, "<관리자 권한>2", always);
          tbf(_0x55e037, "발효증", 32.4, "<관리자 권한>3", always);
          tbf(_0x55e037, "궁추가*", 32.4, "<관리자 권한>4", always);
          tbf(_0x55e037, "공발동*", 14.6, "<관리자 권한>5", always);
          anbf(_0x55e037, "궁", boss, "받뎀증", 8.1, "<관리자 권한>6", 1, 2, always);
          for (let _0x1db7e0 of getElementIdx("화")) {
            tbf(comp[_0x1db7e0], "받속뎀", 97.2, "<관리자 권한>7", 50);
          }
        }
      };
      _0x55e037.passive = function () {
        tbf(_0x55e037, "가뎀증", 98.4, "마도 기술의 작은 한 걸음1", always);
        tbf(_0x55e037, "궁뎀증", 19.68, "마도 기술의 작은 한 걸음2", always);
        if (getRoleCnt("딜") >= 2) {
          _0x55e037.isSealed = true;
        }
        tbf(_0x55e037, "궁추가*", 65.6, "신형 전투복 실전 테스트1", always);
        tbf(_0x55e037, "평발동*", 100, "신형 전투복 실전 테스트2", always);
        tbf(_0x55e037, "공발동*", 17.7, "신형 전투복 실전 테스트3", always);
        for (let _0x3fc07d of comp) {
          if (_0x55e037.id != _0x3fc07d.id) {
            ptbf(_0x55e037, "궁", _0x3fc07d, "<불의 축복>", 0, "궁극의 용궁 방어 시스템1", 1, always);
          }
        }
        tbf(_0x55e037, "궁발동*", 23.6, "궁극의 용궁 방어 시스템2", always);
        anbf(_0x55e037, "<불의 축복>", _0x55e037, "궁뎀증", 3.28, "궁극의 용궁 방어 시스템3", 1, 10, always);
        anbf(_0x55e037, "<불의 축복>", _0x55e037, "발효증", 6.56, "궁극의 용궁 방어 시스템4", 1, 10, always);
        atbf(_0x55e037, "<불의 축복>", _0x55e037, "공발동*", 23.6, "궁극의 용궁 방어 시스템5", 1, always);
        tbf(_0x55e037, "발효증", 10, "트리거+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10204:
      buff_ex.push("<방한 계획>");
      setMnc(_0x55e037, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            for (let _0x3663a5 of getRoleIdx("딜", "탱", "디")) {
              nbf(comp[_0x3663a5], "가뎀증", 7.94, "난로 화력 개발1", 1, 2);
              tbf(comp[_0x3663a5], "가뎀증", 10.58, "난로 화력 개발2", 1);
            }
            nbf(boss, "받뎀증", 8.82, "난로 화력 개발3", 1, 2);
            for (let _0x49b069 of getElementIdx("화")) {
              tbf(comp[_0x49b069], "받속뎀", 26.46, "난로 화력 개발4", 1);
            }
            tbf(all, "공고증", myCurAtk + _0x55e037.id + 30, "난로 화력 개발5", 1);
            break;
          case 2:
            for (let _0x454c72 of getRoleIdx("딜", "탱", "디")) {
              nbf(comp[_0x454c72], "가뎀증", 9.26, "난로 화력 개발1", 1, 2);
              tbf(comp[_0x454c72], "가뎀증", 12.34, "난로 화력 개발2", 1);
            }
            nbf(boss, "받뎀증", 10.29, "난로 화력 개발3", 1, 2);
            for (let _0x1cfb19 of getElementIdx("화")) {
              tbf(comp[_0x1cfb19], "받속뎀", 30.87, "난로 화력 개발4", 1);
            }
            tbf(all, "공고증", myCurAtk + _0x55e037.id + 30, "난로 화력 개발5", 1);
            break;
          case 3:
            for (let _0x4368e3 of getRoleIdx("딜", "탱", "디")) {
              nbf(comp[_0x4368e3], "가뎀증", 10.58, "난로 화력 개발1", 1, 2);
              tbf(comp[_0x4368e3], "가뎀증", 14.1, "난로 화력 개발2", 1);
            }
            nbf(boss, "받뎀증", 11.76, "난로 화력 개발3", 1, 2);
            for (let _0x174bc9 of getElementIdx("화")) {
              tbf(comp[_0x174bc9], "받속뎀", 35.28, "난로 화력 개발4", 1);
            }
            tbf(all, "공고증", myCurAtk + _0x55e037.id + 30, "난로 화력 개발5", 1);
            break;
          case 4:
            for (let _0x1d6a1c of getRoleIdx("딜", "탱", "디")) {
              nbf(comp[_0x1d6a1c], "가뎀증", 11.9, "난로 화력 개발1", 1, 2);
              tbf(comp[_0x1d6a1c], "가뎀증", 15.87, "난로 화력 개발2", 1);
            }
            nbf(boss, "받뎀증", 13.23, "난로 화력 개발3", 1, 2);
            for (let _0x11159d of getElementIdx("화")) {
              tbf(comp[_0x11159d], "받속뎀", 39.69, "난로 화력 개발4", 1);
            }
            tbf(all, "공고증", myCurAtk + _0x55e037.id + 30, "난로 화력 개발5", 1);
            break;
          default:
            for (let _0x32dfc8 of getRoleIdx("딜", "탱", "디")) {
              nbf(comp[_0x32dfc8], "가뎀증", 13.23, "난로 화력 개발1", 1, 2);
              tbf(comp[_0x32dfc8], "가뎀증", 17.64, "난로 화력 개발2", 1);
            }
            nbf(boss, "받뎀증", 14.7, "난로 화력 개발3", 1, 2);
            for (let _0x2dc2a6 of getElementIdx("화")) {
              tbf(comp[_0x2dc2a6], "받속뎀", 44.1, "난로 화력 개발4", 1);
            }
            tbf(all, "공고증", myCurAtk + _0x55e037.id + 30, "난로 화력 개발5", 1);
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
        _0x55e037.bless("<불의 축복>");
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {
        tbf(all, "공고증", myCurAtk + _0x55e037.id + 30, "일단은 뜨끈한 것부터 먹자~", 1);
      };
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(55);
        tbf(all, "공퍼증", 63.5, "천재의 방한 계획1", always);
        if (getRoKind() == 5) {
          tbf(all, "가뎀증", 38.4, "<덜덜>1", always);
          tbf(all, "발효증", 51.2, "<덜덜>2", always);
          tbf(all, "공발동*", 23.1, "<덜덜>3", always);
          for (let _0x440fee of comp) {
            anbf(_0x440fee, "평", _0x440fee, "<방한 계획>", 0, "<덜덜>", 1, 3, always);
            const _0x46dac5 = _0x440fee.attack;
            _0x440fee.attack = function (..._0x2c56fe) {
              const _0xdca31b = _0x440fee.getNest("<방한 계획>");
              if (_0xdca31b == 0) {
                setBuffOnAll(_0x440fee, "기본", "<방한의 힘>11", true);
                setBuffOnAll(_0x440fee, "기본", "<방한의 힘>12", true);
              } else if (_0xdca31b == 1) {
                setBuffOnAll(_0x440fee, "기본", "<방한의 힘>21", true);
                setBuffOnAll(_0x440fee, "기본", "<방한의 힘>22", true);
              } else if (_0xdca31b == 2) {
                setBuffOnAll(_0x440fee, "기본", "<방한의 힘>31", true);
                setBuffOnAll(_0x440fee, "기본", "<방한의 힘>32", true);
              }
              _0x46dac5.apply(this, _0x2c56fe);
            };
          }
          anbf(all, "궁", boss, "받뎀증", 2.56, "<덜덜>5", 1, 10, always);
          for (let _0x56aacb of getElementIdx("화")) {
            anbf(all, "궁", comp[_0x56aacb], "받속뎀", 3.84, "<덜덜>6", 1, 10, always);
          }
          for (let _0x48c08f of comp) {
            anbf(_0x48c08f, "궁", _0x48c08f, "<방한 계획>", 0, "<덜덜>", -3, 3, always);
            atbf(_0x48c08f, "궁", _0x48c08f, "off", "기본", "<방한의 힘>11", 1, always);
            atbf(_0x48c08f, "궁", _0x48c08f, "off", "기본", "<방한의 힘>12", 1, always);
            atbf(_0x48c08f, "궁", _0x48c08f, "off", "기본", "<방한의 힘>21", 1, always);
            atbf(_0x48c08f, "궁", _0x48c08f, "off", "기본", "<방한의 힘>22", 1, always);
            atbf(_0x48c08f, "궁", _0x48c08f, "off", "기본", "<방한의 힘>31", 1, always);
            atbf(_0x48c08f, "궁", _0x48c08f, "off", "기본", "<방한의 힘>32", 1, always);
          }
        }
        buff(all, "궁뎀증", 8.53, "<방한의 힘>11", always, false);
        buff(all, "궁추가*", 17, "<방한의 힘>12", always, false);
        buff(all, "궁뎀증", 8.53, "<방한의 힘>21", always, false);
        buff(all, "궁추가*", 17, "<방한의 힘>22", always, false);
        buff(all, "궁뎀증", 8.53, "<방한의 힘>31", always, false);
        buff(all, "궁추가*", 17, "<방한의 힘>32", always, false);
      };
      _0x55e037.passive = function () {
        if (getRoleCnt("탱") >= 1) {
          atbf(_0x55e037, "궁", all, "궁뎀증", 29.4, "눈, 눈... 더 많은 눈!1", 1, always);
        }
        if (getRoleCnt("디") >= 1) {
          anbf(_0x55e037, "궁", all, "발효증", 29.4, "눈, 눈... 더 많은 눈!2", 1, 2, always);
        }
        if (getRoleCnt("딜") >= 2) {
          _0x55e037.isSealed = true;
        }
        _0x55e037.canCDChange = false;
        for (let _0x4efa4d of getRoleIdx("딜", "탱", "디")) {
          tbf(comp[_0x4efa4d], "궁추가*", 58.8, "짙푸른 빙점2", always);
          tbf(comp[_0x4efa4d], "공발동*", 26.5, "짙푸른 빙점3", always);
        }
        tbf(_0x55e037, "공퍼증", 44.1, "방한 대책1", always);
        for (let _0x47bfaa of comp) {
          if (_0x55e037.id != _0x47bfaa.id) {
            ptbf(_0x55e037, "궁", _0x47bfaa, "<불의 축복>", 0, "방한 대책2", 1, always);
          }
        }
        for (let _0x4bfa50 of getRoleIdx("힐", "섶")) {
          anbf(comp[_0x4bfa50], "<불의 축복>", comp[_0x4bfa50], "공퍼증", 7.35, "방한 대책3", 1, 10, always);
        }
        tbf(_0x55e037, "공퍼증", 10, "공격+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10205:
      buff_ex.push("<사진 소재>");
      setMnc(_0x55e037, [0, 3, 0, 3, 0, 4, 0, 4, 0, 5], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        for (let _0x1cbaef of comp) {
          deleteBuff(_0x1cbaef, "기본", "완벽한 셀카 각도1");
          deleteBuff(_0x1cbaef, "기본", "완벽한 셀카 각도3");
        }
        switch (_0x78c5e1) {
          case 1:
            tbf(all, "가뎀증", 12.24, "완벽한 셀카 각도1", 3);
            nbf(all, "<사진 소재>", 0, "완벽한 셀카 각도", 3, 5);
            for (let _0x2ea534 of getRoleIdx("딜", "탱", "디")) {
              tbf(comp[_0x2ea534], "평추가*", 40.8, "완벽한 셀카 각도3", 3);
            }
            break;
          case 2:
            tbf(all, "가뎀증", 14.28, "완벽한 셀카 각도1", 3);
            nbf(all, "<사진 소재>", 0, "완벽한 셀카 각도", 3, 5);
            for (let _0x252642 of getRoleIdx("딜", "탱", "디")) {
              tbf(comp[_0x252642], "평추가*", 47.6, "완벽한 셀카 각도3", 3);
            }
            break;
          case 3:
            tbf(all, "가뎀증", 16.32, "완벽한 셀카 각도1", 4);
            nbf(all, "<사진 소재>", 0, "완벽한 셀카 각도", 4, 5);
            for (let _0x890733 of getRoleIdx("딜", "탱", "디")) {
              tbf(comp[_0x890733], "평추가*", 54.4, "완벽한 셀카 각도3", 4);
            }
            break;
          case 4:
            tbf(all, "가뎀증", 18.36, "완벽한 셀카 각도1", 4);
            nbf(all, "<사진 소재>", 0, "완벽한 셀카 각도", 4, 5);
            for (let _0x524ca3 of getRoleIdx("딜", "탱", "디")) {
              tbf(comp[_0x524ca3], "평추가*", 61.2, "완벽한 셀카 각도3", 4);
            }
            break;
          default:
            tbf(all, "가뎀증", 20.4, "완벽한 셀카 각도1", 5);
            nbf(all, "<사진 소재>", 0, "완벽한 셀카 각도", 5, 5);
            for (let _0x105fe0 of getRoleIdx("딜", "탱", "디")) {
              tbf(comp[_0x105fe0], "평추가*", 68, "완벽한 셀카 각도3", 5);
            }
            break;
        }
        for (let _0x299964 of comp) {
          setBuffOn(_0x299964, "기본", "아이돌도 낚시할 수 있는데1", true);
          setBuffOn(_0x299964, "기본", "아이돌도 낚시할 수 있는데2", true);
          setBuffOn(_0x299964, "발동", "페어 스케이팅1", true);
          setBuffOnAll(_0x299964, "발동", "페어 스케이팅2", true);
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(55);
        if (getElKind() == 1) {
          tbf(all, "공퍼증", 63.5, "〈VIP 교환권〉1", always);
          tbf(all, "가뎀증", 19.05, "〈VIP 교환권〉2", always);
          tbf(all, "일뎀증", 95.25, "〈VIP 교환권〉3", always);
          tbf(all, "평추가*", 63.5, "〈VIP 교환권〉4", always);
        }
        if (getElKind() == 1) {
          tbf(_0x55e037, "가뎀증", 19.05, "<바캉스 한정♡시크릿포토>1", always);
          anbf(boss, "피격", boss, "받뎀증", 0.63, "<바캉스 한정♡시크릿포토>2", 1, 40, always);
          for (let _0x299adf of getElementIdx("수")) {
            anbf(boss, "피격", comp[_0x299adf], "받속뎀", 0.95, "<바캉스 한정♡시크릿포토>2", 1, 40, always);
          }
        }
      };
      _0x55e037.passive = function () {
        tbf(_0x55e037, "공퍼증", 68, "데이트 방해하지 마1", always);
        tbf(_0x55e037, "가뎀증", 20.4, "데이트 방해하지 마2", always);
        for (let _0x180405 of comp) {
          anbf(_0x180405, "평", _0x180405, "<사진 소재>", 0, "완벽한 셀카 각도", -1, 5, always);
        }
        buff(all, "공퍼증", 40.8, "아이돌도 낚시할 수 있는데1", always, false);
        buff(all, "일뎀증", 102, "아이돌도 낚시할 수 있는데2", always, false);
        buff(all, "평", boss, "받뎀증", 0.68, "페어 스케이팅1", 1, 40, always, "발동", false);
        for (let _0x4c7211 of getElementIdx("수")) {
          buff(all, "평", comp[_0x4c7211], "받속뎀", 1.02, "페어 스케이팅2", 1, 40, always, "발동", false);
        }
        for (let _0x148889 of comp) {
          const _0x13be71 = _0x148889.attack;
          _0x148889.attack = function (..._0x1d9604) {
            const _0x237cd9 = _0x148889.getNest("<사진 소재>");
            _0x13be71.apply(this, _0x1d9604);
            if (_0x237cd9 <= 1) {
              setBuffOn(_0x148889, "기본", "아이돌도 낚시할 수 있는데1", false);
              setBuffOn(_0x148889, "기본", "아이돌도 낚시할 수 있는데2", false);
              setBuffOn(_0x148889, "발동", "페어 스케이팅1", false);
              setBuffOnAll(_0x148889, "발동", "페어 스케이팅2", false);
            }
          };
        }
        tbf(_0x55e037, "가뎀증", 7.5, "데미지+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
        if (GLOBAL_TURN == 1) {
          cdChange(_0x55e037, -5);
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10206:
      setMnc(_0x55e037, [365, 4, 425.8, 4, 486.6, 4, 547.4, 4, 608, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(all, "공고증", myCurAtk + _0x55e037.id + 20, "리고라 빔!1", 1);
            for (let _0x25e7c1 of getElementIdx("풍")) {
              tbf(comp[_0x25e7c1], "가뎀증", 17, "리고라 빔!2", 1);
            }
            for (let _0x319bbe of getRoleIdx("딜", "디")) {
              if (comp[_0x319bbe].element != 2) {
                continue;
              }
              tbf(comp[_0x319bbe], "궁추가*", 56.6, "리고라 빔!3", 1);
            }
            break;
          case 2:
            tbf(all, "공고증", myCurAtk + _0x55e037.id + 20, "리고라 빔!1", 1);
            for (let _0x2ff872 of getElementIdx("풍")) {
              tbf(comp[_0x2ff872], "가뎀증", 19.8, "리고라 빔!2", 1);
            }
            for (let _0x1cef0e of getRoleIdx("딜", "디")) {
              if (comp[_0x1cef0e].element != 2) {
                continue;
              }
              tbf(comp[_0x1cef0e], "궁추가*", 66, "리고라 빔!3", 1);
            }
            break;
          case 3:
            tbf(all, "공고증", myCurAtk + _0x55e037.id + 20, "리고라 빔!1", 1);
            for (let _0x3fd0f9 of getElementIdx("풍")) {
              tbf(comp[_0x3fd0f9], "가뎀증", 22.6, "리고라 빔!2", 1);
            }
            for (let _0x428dbe of getRoleIdx("딜", "디")) {
              if (comp[_0x428dbe].element != 2) {
                continue;
              }
              tbf(comp[_0x428dbe], "궁추가*", 75.4, "리고라 빔!3", 1);
            }
            for (let _0x794233 of getElementIdx("풍")) {
              tbf(comp[_0x794233], "받속뎀", 22.6, "리고라 빔!4", 1);
            }
            break;
          case 4:
            tbf(all, "공고증", myCurAtk + _0x55e037.id + 20, "리고라 빔!1", 1);
            for (let _0xf821c9 of getElementIdx("풍")) {
              tbf(comp[_0xf821c9], "가뎀증", 25.5, "리고라 빔!2", 1);
            }
            for (let _0x2420e3 of getRoleIdx("딜", "디")) {
              if (comp[_0x2420e3].element != 2) {
                continue;
              }
              tbf(comp[_0x2420e3], "궁추가*", 84.9, "리고라 빔!3", 1);
            }
            for (let _0x1ab294 of getElementIdx("풍")) {
              tbf(comp[_0x1ab294], "받속뎀", 25.5, "리고라 빔!4", 1);
            }
            break;
          default:
            tbf(all, "공고증", myCurAtk + _0x55e037.id + 20, "리고라 빔!1", 1);
            for (let _0x1317ea of getElementIdx("풍")) {
              tbf(comp[_0x1317ea], "가뎀증", 28.3, "리고라 빔!2", 1);
            }
            for (let _0x2204ba of getRoleIdx("딜", "디")) {
              if (comp[_0x2204ba].element != 2) {
                continue;
              }
              tbf(comp[_0x2204ba], "궁추가*", 94.3, "리고라 빔!3", 1);
            }
            for (let _0x48acae of getElementIdx("풍")) {
              tbf(comp[_0x48acae], "받속뎀", 28.3, "리고라 빔!4", 1);
            }
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037, 2);
        _0x55e037.bless("<바람의 축복>");
        if (_0x55e037.isLeader) {
          deleteBuff(_0x55e037, "발동", "<따뜻한 자아>5");
          deleteBuff(_0x55e037, "발동", "<따뜻한 자아>6");
        }
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(55);
        tbf(all, "공퍼증", 51.5, "평화를 사랑하는 괴수1", always);
      };
      _0x55e037.passive = function () {
        atbf(_0x55e037, "방", all, "아머", _0x55e037.hp * 10, "리고라 배고파2", 1, always);
        ptbf(_0x55e037, "궁", boss, "받뎀증", 18.8, "마지막 괴수의 축복1", 1, always);
        for (let _0x1ab95a of comp) {
          if (_0x1ab95a.id != _0x55e037.id) {
            ptbf(_0x55e037, "궁", _0x1ab95a, "<바람의 축복>", 0, "마지막 괴수의 축복2", 1, always);
          }
        }
        for (let _0x5796da of comp) {
          anbf(_0x5796da, "<바람의 축복>", _0x5796da, "공퍼증", 9.45, "마지막 괴수의 축복3", 1, 5, always);
          anbf(_0x5796da, "<바람의 축복>", _0x5796da, "궁뎀증", 9.45, "마지막 괴수의 축복4", 1, 5, always);
        }
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
        if (_0x55e037.isLeader) {
          deleteBuff(_0x55e037, "발동", "<따뜻한 자아>5");
          deleteBuff(_0x55e037, "발동", "<따뜻한 자아>6");
        }
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {
          if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 4 == 0) {
            if (getElKind() == 2) {
              nbf(all, "가뎀증", 7.75, "<따뜻한 자아>1", 1, 4);
              nbf(all, "궁뎀증", 12.9, "<따뜻한 자아>2", 1, 4);
              tbf(all, "궁추가*", 51.5, "<따뜻한 자아>4", 4);
              for (let _0x18dae4 of comp) {
                atbf(_0x18dae4, "궁", _0x18dae4, "제거", "기본", "<따뜻한 자아>4", 1, always);
              }
              for (let _0xf21d0 of getElementIdx("풍")) {
                anbf(_0x55e037, "궁", comp[_0xf21d0], "받속뎀", 7.75, "<따뜻한 자아>5", 1, 4, always);
                anbf(_0x55e037, "방", comp[_0xf21d0], "받속뎀", 7.75, "<따뜻한 자아>5", 1, 4, always);
              }
              anbf(_0x55e037, "궁", boss, "받뎀증", 5.15, "<따뜻한 자아>6", 1, 4, always);
              anbf(_0x55e037, "방", boss, "받뎀증", 5.15, "<따뜻한 자아>6", 1, 4, always);
            }
          }
          if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 4 == 0) {
            if (getRoleCnt("딜") >= 2) {
              nbf(all, "가뎀증", 7.75, "<따뜻한 자아>1", 1, 4);
              nbf(all, "궁뎀증", 12.9, "<따뜻한 자아>2", 1, 4);
              tbf(all, "궁추가*", 51.5, "<따뜻한 자아>4", 4);
              for (let _0x357a05 of comp) {
                atbf(_0x357a05, "궁", _0x357a05, "제거", "기본", "<따뜻한 자아>4", 1, always);
              }
              for (let _0x3d315e of getElementIdx("풍")) {
                anbf(_0x55e037, "궁", comp[_0x3d315e], "받속뎀", 7.75, "<따뜻한 자아>5", 1, 4, always);
                anbf(_0x55e037, "방", comp[_0x3d315e], "받속뎀", 7.75, "<따뜻한 자아>5", 1, 4, always);
              }
              anbf(_0x55e037, "궁", boss, "받뎀증", 5.15, "<따뜻한 자아>6", 1, 4, always);
              anbf(_0x55e037, "방", boss, "받뎀증", 5.15, "<따뜻한 자아>6", 1, 4, always);
            }
          }
        }
        if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 4 == 0) {
          atbf(_0x55e037, "방", all, "받아증", 50, "<리고라는 모두를 지킬 거야!>5", 4, 4);
          atbf(_0x55e037, "방", _0x55e037, "제거", "발동", "<리고라는 모두를 지킬 거야!>5", 1, 4);
          atbf(_0x55e037, "방", _0x55e037, "아머", _0x55e037.hp * 30, "<리고라는 모두를 지킬 거야!>6", 4, 4);
          atbf(_0x55e037, "방", _0x55e037, "제거", "발동", "<리고라는 모두를 지킬 거야!>6", 1, 4);
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10207:
      buff_ex.push("<피어나는 샛별>");
      setMnc(_0x55e037, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(all, "궁뎀증", 22.5, "심쿵♡에너지1", 1);
            for (let _0x2f479a of getRoleIdx("딜", "탱", "디")) {
              tbf(comp[_0x2f479a], "가뎀증", 13.5, "심쿵♡에너지2", 1);
            }
            tbf(boss, "받뎀증", 9, "심쿵♡에너지3", 1);
            break;
          case 2:
            tbf(all, "궁뎀증", 26.25, "심쿵♡에너지1", 1);
            for (let _0x1684d0 of getRoleIdx("딜", "탱", "디")) {
              tbf(comp[_0x1684d0], "가뎀증", 15.75, "심쿵♡에너지2", 1);
            }
            tbf(boss, "받뎀증", 10.5, "심쿵♡에너지3", 1);
            break;
          case 3:
            tbf(all, "궁뎀증", 30, "심쿵♡에너지1", 1);
            for (let _0x38f1f6 of getRoleIdx("딜", "탱", "디")) {
              tbf(comp[_0x38f1f6], "가뎀증", 18, "심쿵♡에너지2", 1);
            }
            tbf(boss, "받뎀증", 12, "심쿵♡에너지3", 1);
            break;
          case 4:
            tbf(all, "궁뎀증", 33.75, "심쿵♡에너지1", 1);
            for (let _0x23e65b of getRoleIdx("딜", "탱", "디")) {
              tbf(comp[_0x23e65b], "가뎀증", 20.25, "심쿵♡에너지2", 1);
            }
            tbf(boss, "받뎀증", 13.5, "심쿵♡에너지3", 1);
            break;
          default:
            tbf(all, "궁뎀증", 37.5, "심쿵♡에너지1", 1);
            for (let _0x4960cd of getRoleIdx("딜", "탱", "디")) {
              tbf(comp[_0x4960cd], "가뎀증", 22.5, "심쿵♡에너지2", 1);
            }
            tbf(boss, "받뎀증", 15, "심쿵♡에너지3", 1);
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
        for (let _0x4299bc of comp) {
          _0x4299bc.heal();
        }
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(55);
        tbf(all, "공퍼증", 88, "길 잃은 신입을 이끄는 선배!1", always);
        if (getElementCnt("수") >= 5) {
          for (let _0x386d09 of getRoleIdx("딜", "탱", "디")) {
            anbf(comp[_0x386d09], "방", comp[_0x386d09], "<피어나는 샛별>", 0, "희망의 빛이 되어☆", 1, 3, always);
            const _0x23e5c2 = comp[_0x386d09].defense;
            comp[_0x386d09].defense = function (..._0x2e5e5b) {
              const _0x4a86c1 = comp[_0x386d09].getNest("<피어나는 샛별>");
              _0x23e5c2.apply(this, _0x2e5e5b);
              if (_0x4a86c1 == 0) {
                setBuffOn(comp[_0x386d09], "기본", "<반짝☆스포트라이트>1", true);
              } else if (_0x4a86c1 == 1) {
                setBuffOn(comp[_0x386d09], "기본", "<반짝☆스포트라이트>1", false);
                setBuffOn(comp[_0x386d09], "기본", "<반짝☆스포트라이트>2", true);
              } else if (_0x4a86c1 == 2) {
                setBuffOn(comp[_0x386d09], "기본", "<반짝☆스포트라이트>2", false);
                setBuffOn(comp[_0x386d09], "기본", "<반짝☆스포트라이트>3", true);
              }
            };
          }
        }
      };
      _0x55e037.passive = function () {
        tbf(_0x55e037, "공퍼증", 37.5, "블랙과 화이트의 하모니~1", always);
        for (let _0x8a41aa of comp) {
          if (_0x55e037.id != _0x8a41aa.id) {
            atbf(_0x55e037, "공격", _0x8a41aa, "공고증", myCurAtk + _0x55e037.id + 25, "블랙과 화이트의 하모니~2", 1, always);
          }
        }
        for (let _0x372ff9 of getRoleIdx("딜", "탱", "디")) {
          anbf(comp[_0x372ff9], "평", comp[_0x372ff9], "<피어나는 샛별>", 0, "희망의 빛이 되어☆", 1, 3, always);
          const _0x5ae218 = comp[_0x372ff9].attack;
          comp[_0x372ff9].attack = function (..._0x40d8f6) {
            const _0x4fb569 = comp[_0x372ff9].getNest("<피어나는 샛별>");
            _0x5ae218.apply(this, _0x40d8f6);
            if (_0x4fb569 == 0) {
              setBuffOn(comp[_0x372ff9], "기본", "<반짝☆스포트라이트>1", true);
            } else if (_0x4fb569 == 1) {
              setBuffOn(comp[_0x372ff9], "기본", "<반짝☆스포트라이트>1", false);
              setBuffOn(comp[_0x372ff9], "기본", "<반짝☆스포트라이트>2", true);
            } else if (_0x4fb569 == 2) {
              setBuffOn(comp[_0x372ff9], "기본", "<반짝☆스포트라이트>2", false);
              setBuffOn(comp[_0x372ff9], "기본", "<반짝☆스포트라이트>3", true);
            }
          };
          anbf(comp[_0x372ff9], "궁", comp[_0x372ff9], "<피어나는 샛별>", 0, "희망의 빛이 되어☆", -3, 3, always);
          const _0x460b0f = comp[_0x372ff9].ultimate;
          comp[_0x372ff9].ultimate = function (..._0x40f298) {
            _0x460b0f.apply(this, _0x40f298);
            setBuffOn(comp[_0x372ff9], "기본", "<반짝☆스포트라이트>1", false);
            setBuffOn(comp[_0x372ff9], "기본", "<반짝☆스포트라이트>2", false);
            setBuffOn(comp[_0x372ff9], "기본", "<반짝☆스포트라이트>3", false);
          };
          buff(comp[_0x372ff9], "궁추가*", 25, "<반짝☆스포트라이트>1", always, false);
          buff(comp[_0x372ff9], "궁추가*", 50, "<반짝☆스포트라이트>2", always, false);
          buff(comp[_0x372ff9], "궁추가*", 75, "<반짝☆스포트라이트>3", always, false);
        }
        for (let _0x185ebf of getElementIdx("수")) {
          atbf(_0x55e037, "궁", comp[_0x185ebf], "받속뎀", 22.5, "노엘리는 여러분을 제일 사랑해요♡1", 1, always);
        }
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {
          if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 4 == 0) {
            if (getElementCnt("수") >= 5) {
              tbf(boss, "받뎀증", 35.2, "<세심한 케어♡>1", 1);
              for (let _0x26b9a8 of getElementIdx("수")) {
                tbf(comp[_0x26b9a8], "받속뎀", 52.8, "<세심한 케어♡>2", 1);
              }
              for (let _0x214af1 of getRoleIdx("딜", "탱", "디")) {
                tbf(comp[_0x214af1], "가뎀증", 52.8, "<철저한 계획>1", 1);
                tbf(comp[_0x214af1], "궁뎀증", 88, "<철저한 계획>2", 1);
                tbf(comp[_0x214af1], "궁추가*", 176, "<철저한 계획>3", 1);
              }
            }
          }
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10208:
      setMnc(_0x55e037, [265, 3, 298, 3, 331, 3, 364, 3, 397, 3], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        deleteBuff(_0x55e037, "기본", "나~는~아~이~돌~이~될~거~야~!3");
        deleteBuff(boss, "기본", "나~는~아~이~돌~이~될~거~야~!5");
        switch (_0x78c5e1) {
          case 1:
            tbf(_0x55e037, "공퍼증", 180, "나~는~아~이~돌~이~될~거~야~!1", 1);
            tbf(_0x55e037, "가뎀증", 27, "나~는~아~이~돌~이~될~거~야~!2", 1);
            tbf(_0x55e037, "가뎀증", 27, "나~는~아~이~돌~이~될~거~야~!3", 3);
            break;
          case 2:
            tbf(_0x55e037, "공퍼증", 210, "나~는~아~이~돌~이~될~거~야~!1", 1);
            tbf(_0x55e037, "가뎀증", 31.5, "나~는~아~이~돌~이~될~거~야~!2", 1);
            tbf(_0x55e037, "가뎀증", 31.5, "나~는~아~이~돌~이~될~거~야~!3", 3);
            tbf(boss, "받뎀증", 10.5, "나~는~아~이~돌~이~될~거~야~!4", 1);
            tbf(boss, "받뎀증", 10.5, "나~는~아~이~돌~이~될~거~야~!5", 3);
            break;
          case 3:
            tbf(_0x55e037, "공퍼증", 240, "나~는~아~이~돌~이~될~거~야~!1", 1);
            tbf(_0x55e037, "가뎀증", 36, "나~는~아~이~돌~이~될~거~야~!2", 1);
            tbf(_0x55e037, "가뎀증", 36, "나~는~아~이~돌~이~될~거~야~!3", 3);
            tbf(boss, "받뎀증", 12, "나~는~아~이~돌~이~될~거~야~!4", 1);
            tbf(boss, "받뎀증", 12, "나~는~아~이~돌~이~될~거~야~!5", 3);
            break;
          case 4:
            tbf(_0x55e037, "공퍼증", 270, "나~는~아~이~돌~이~될~거~야~!1", 1);
            tbf(_0x55e037, "가뎀증", 40.5, "나~는~아~이~돌~이~될~거~야~!2", 1);
            tbf(_0x55e037, "가뎀증", 40.5, "나~는~아~이~돌~이~될~거~야~!3", 3);
            tbf(boss, "받뎀증", 13.5, "나~는~아~이~돌~이~될~거~야~!4", 1);
            tbf(boss, "받뎀증", 13.5, "나~는~아~이~돌~이~될~거~야~!5", 3);
            break;
          default:
            tbf(_0x55e037, "공퍼증", 300, "나~는~아~이~돌~이~될~거~야~!1", 1);
            tbf(_0x55e037, "가뎀증", 45, "나~는~아~이~돌~이~될~거~야~!2", 1);
            tbf(_0x55e037, "가뎀증", 45, "나~는~아~이~돌~이~될~거~야~!3", 3);
            tbf(boss, "받뎀증", 15, "나~는~아~이~돌~이~될~거~야~!4", 1);
            tbf(boss, "받뎀증", 15, "나~는~아~이~돌~이~될~거~야~!5", 3);
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037, 5);
        deleteBuff(_0x55e037, "기본", "<아이돌의 빛>2");
        _0x55e037.bless("<빛의 축복>");
      };
      _0x55e037.atkbefore = function () {
        tbf(_0x55e037, "공퍼증", 100, "음침한 소녀 메이크업 중", 1);
      };
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
        _0x55e037.bless("<빛의 축복>");
      };
      _0x55e037.leader = function () {
        hpUpAll(55);
        if (getRoKind() == 3) {
          for (let _0x58c91b of getRoleIdx("딜", "탱", "디")) {
            tbf(comp[_0x58c91b], "공퍼증", 55, "<아이돌 3명의 무대>1", always);
            tbf(comp[_0x58c91b], "가뎀증", 16.5, "<아이돌 3명의 무대>2", always);
            tbf(comp[_0x58c91b], "궁뎀증", 27.5, "<아이돌 3명의 무대>3", always);
            tbf(comp[_0x58c91b], "발효증", 27.5, "<아이돌 3명의 무대>4", always);
            tbf(comp[_0x58c91b], "궁추가*", 55, "<아이돌 3명의 무대>5", always);
            anbf(comp[_0x58c91b], "공격", boss, "받뎀증", 0.44, "<찬란한 빛>1", 1, 50, always);
            for (let _0x369745 of getElementIdx("광")) {
              anbf(comp[_0x58c91b], "공격", comp[_0x369745], "받속뎀", 0.66, "<찬란한 빛>2", 1, 50, always);
            }
            atbf(comp[_0x58c91b], "공격", all, "공고증", myCurAtk + comp[_0x58c91b].id + 15, "<찬란한 빛>3", 1, always);
            tbf(comp[_0x58c91b], "공발동*", 16.5, "<찬란한 빛>4", always);
          }
          tbf(_0x55e037, "가뎀증", 16.5, "콜라보 콘서트2", always);
        }
        if (getRoleCnt("섶") >= 1) {
          tbf(all, "가뎀증", -500, "콜라보 콘서트3", always);
        }
      };
      _0x55e037.passive = function () {
        atbf(_0x55e037, "공격", _0x55e037, "궁뎀증", 18.75, "신예 아이돌1", 3, always);
        atbf(_0x55e037, "공격", _0x55e037, "발효증", 18.75, "신예 아이돌2", 3, always);
        tbf(_0x55e037, "평발동*", 100, "신예 아이돌3", always);
        for (let _0x23efe7 of getElementIdx("광")) {
          anbf(_0x55e037, "궁", comp[_0x23efe7], "받속뎀", 15, "아이돌 라이브 중", 1, 3, always);
        }
        atbf(_0x55e037, "<빛의 축복>", _0x55e037, "평발동*", 4.5, "<아이돌의 빛>1", 3, always);
        atbf(_0x55e037, "<빛의 축복>", _0x55e037, "궁추가*", 15, "<아이돌의 빛>2", 3, always);
        tbf(_0x55e037, "가뎀증", 7.5, "가하는 데미지+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10209:
      setMnc(_0x55e037, [0, 5, 0, 5, 0, 5, 0, 5, 0, 5], _0x78c5e1);
      deleteBuff(_0x55e037, "기본", "1바퀴 돌기, 적의 주의 끌기4");
      deleteBuff(_0x55e037, "기본", "2바퀴 돌기, 적을 어지럽게 만들기4");
      deleteBuff(_0x55e037, "기본", "3바퀴 돌기, 뭘 봐!4");
      deleteBuff(_0x55e037, "기본", "4바퀴 돌기, 원해서 돈 게 아니야4");
      deleteBuff(_0x55e037, "기본", "5바퀴 돌기, 신난다 신나!4");
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            nbf(_0x55e037, "공퍼증", 67.2, "1바퀴 돌기, 적의 주의 끌기1", 1, 2);
            nbf(_0x55e037, "가뎀증", 10.08, "1바퀴 돌기, 적의 주의 끌기2", 1, 2);
            nbf(_0x55e037, "발효증", 16.8, "1바퀴 돌기, 적의 주의 끌기3", 1, 2);
            tbf(_0x55e037, "반격*", 10, "1바퀴 돌기, 적의 주의 끌기4", 5);
            nbf(boss, "받뎀증", 3.36, "1바퀴 돌기, 적의 주의 끌기5", 1, 2);
            break;
          case 2:
            nbf(_0x55e037, "공퍼증", 78.4, "2바퀴 돌기, 적을 어지럽게 만들기1", 1, 2);
            nbf(_0x55e037, "가뎀증", 13.44, "2바퀴 돌기, 적을 어지럽게 만들기2", 1, 2);
            nbf(_0x55e037, "발효증", 22.4, "2바퀴 돌기, 적을 어지럽게 만들기3", 1, 2);
            tbf(_0x55e037, "반격*", 10.9, "2바퀴 돌기, 적을 어지럽게 만들기4", 5);
            nbf(boss, "받뎀증", 3.92, "2바퀴 돌기, 적을 어지럽게 만들기5", 1, 2);
            break;
          case 3:
            nbf(_0x55e037, "공퍼증", 89.6, "3바퀴 돌기, 뭘 봐!1", 1, 2);
            nbf(_0x55e037, "가뎀증", 16.8, "3바퀴 돌기, 뭘 봐!2", 1, 2);
            nbf(_0x55e037, "발효증", 28, "3바퀴 돌기, 뭘 봐!3", 1, 2);
            tbf(_0x55e037, "반격*", 11.8, "3바퀴 돌기, 뭘 봐!4", 5);
            nbf(boss, "받뎀증", 4.48, "3바퀴 돌기, 뭘 봐!5", 1, 2);
            break;
          case 4:
            nbf(_0x55e037, "공퍼증", 100.8, "4바퀴 돌기, 원해서 돈 게 아니야1", 1, 2);
            nbf(_0x55e037, "가뎀증", 20.16, "4바퀴 돌기, 원해서 돈 게 아니야2", 1, 2);
            nbf(_0x55e037, "발효증", 33.6, "4바퀴 돌기, 원해서 돈 게 아니야3", 1, 2);
            tbf(_0x55e037, "반격*", 12.7, "4바퀴 돌기, 원해서 돈 게 아니야4", 5);
            nbf(boss, "받뎀증", 5.04, "4바퀴 돌기, 원해서 돈 게 아니야5", 1, 2);
            break;
          default:
            nbf(_0x55e037, "공퍼증", 112, "5바퀴 돌기, 신난다 신나!1", 1, 2);
            nbf(_0x55e037, "가뎀증", 23.52, "5바퀴 돌기, 신난다 신나!2", 1, 2);
            nbf(_0x55e037, "발효증", 39.2, "5바퀴 돌기, 신난다 신나!3", 1, 2);
            tbf(_0x55e037, "반격*", 13.7, "5바퀴 돌기, 신난다 신나!4", 5);
            nbf(boss, "받뎀증", 5.6, "5바퀴 돌기, 신난다 신나!5", 1, 2);
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
        _0x55e037.hit();
      };
      _0x55e037.atkbefore = function () {
        _0x55e037.hit();
      };
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(55);
        tbf(all, "공퍼증", 73, "케모미미 대장 놀라이티1", always);
        if (getElKind() == 1) {
          anbf(_0x55e037, "궁", boss, "받뎀증", 7.3, "<신체 내성 UP>1", 1, 2, always);
          for (let _0x55dddd of getElementIdx("풍")) {
            anbf(_0x55e037, "궁", comp[_0x55dddd], "받속뎀", 10.95, "<신체 내성 UP>2", 1, 2, always);
          }
          tbf(_0x55e037, "반격*", 4.4, "<신체 내성 UP>4", always);
        }
        if (getElKind() == 1) {
          for (let _0x57cfde of getRoleIdx("딜", "디")) {
            tbf(comp[_0x57cfde], "가뎀증", 43.8, "<늑대 무리 사냥 스타트!>1", always);
            tbf(comp[_0x57cfde], "발효증", 146, "<늑대 무리 사냥 스타트!>2", always);
            tbf(comp[_0x57cfde], "공발동*", 21.9, "<늑대 무리 사냥 스타트!>3", always);
          }
        }
        if (getRoleCnt("탱") >= 1) {
          tbf(all, "가뎀증", -500, "케모미미 대장 놀라이티4", always);
        }
      };
      _0x55e037.passive = function () {
        tbf(_0x55e037, "반격*", 10, "늑대의 반격1", always);
        for (let _0x101702 of comp) {
          if (_0x101702.id != _0x55e037.id) {
            const _0x5add74 = _0x101702.ultimate;
            _0x101702.ultimate = function (..._0xe9914) {
              _0x5add74.apply(this, _0xe9914);
              _0x55e037.hit();
            };
            const _0x4474ac = _0x101702.attack;
            _0x101702.attack = function (..._0x2f08c6) {
              _0x4474ac.apply(this, _0x2f08c6);
              _0x55e037.hit();
            };
          }
        }
        tbf(_0x55e037, "가뎀증", 20.16, "야생 늑대의 유연성1", always);
        tbf(_0x55e037, "발효증", 33.6, "야생 늑대의 유연성2", always);
        for (let _0x19a5b8 of getElementIdx("풍")) {
          anbf(_0x55e037, "피격", comp[_0x19a5b8], "받속뎀", 0.34, "수인화 Power2", 1, 50, always);
        }
        tbf(_0x55e037, "가뎀증", 6, "데미지+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
        if (GLOBAL_TURN == 1) {
          cdChange(_0x55e037, -5);
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10210:
      setMnc(_0x55e037, [0, 3, 0, 3, 0, 3, 0, 3, 0, 3], _0x78c5e1);
      buff_ex.push("<진귀 버섯>");
      _0x55e037.stack = 0;
      _0x55e037.ultbefore = function () {
        const _0x4f27af = _0x55e037.stack;
        switch (_0x78c5e1) {
          case 1:
            nbf(all, "<진귀 버섯>", 0, "초간지 버섯 채집견", 12, 60);
            _0x55e037.stack += 12;
            if (_0x55e037.stack > 60) {
              _0x55e037.stack = 60;
            }
            tbf(all, "가뎀증", 13.2, "초간지 버섯 채집견2", 1);
            for (let _0x1c9006 of getRoleIdx("딜", "탱", "디")) {
              if (comp[_0x1c9006].element == 4) {
                tbf(comp[_0x1c9006], "궁추가*", 44.1, "초간지 버섯 채집견3", 1);
              }
            }
            break;
          case 2:
            nbf(all, "<진귀 버섯>", 0, "초간지 버섯 채집견", 15, 60);
            _0x55e037.stack += 15;
            if (_0x55e037.stack > 60) {
              _0x55e037.stack = 60;
            }
            tbf(all, "가뎀증", 15.4, "초간지 버섯 채집견2", 1);
            for (let _0x5df1d2 of getRoleIdx("딜", "탱", "디")) {
              if (comp[_0x5df1d2].element == 4) {
                tbf(comp[_0x5df1d2], "궁추가*", 51.5, "초간지 버섯 채집견3", 1);
              }
            }
            break;
          case 3:
            nbf(all, "<진귀 버섯>", 0, "초간지 버섯 채집견", 15, 60);
            _0x55e037.stack += 15;
            if (_0x55e037.stack > 60) {
              _0x55e037.stack = 60;
            }
            tbf(all, "가뎀증", 17.6, "초간지 버섯 채집견2", 1);
            for (let _0x338142 of getRoleIdx("딜", "탱", "디")) {
              if (comp[_0x338142].element == 4) {
                tbf(comp[_0x338142], "궁추가*", 58.8, "초간지 버섯 채집견3", 1);
              }
            }
            break;
          case 4:
            nbf(all, "<진귀 버섯>", 0, "초간지 버섯 채집견", 20, 60);
            _0x55e037.stack += 20;
            if (_0x55e037.stack > 60) {
              _0x55e037.stack = 60;
            }
            tbf(all, "가뎀증", 19.8, "초간지 버섯 채집견2", 1);
            for (let _0x223606 of getRoleIdx("딜", "탱", "디")) {
              if (comp[_0x223606].element == 4) {
                tbf(comp[_0x223606], "궁추가*", 66.2, "초간지 버섯 채집견3", 1);
              }
            }
            break;
          default:
            nbf(all, "<진귀 버섯>", 0, "초간지 버섯 채집견", 20, 60);
            _0x55e037.stack += 20;
            if (_0x55e037.stack > 60) {
              _0x55e037.stack = 60;
            }
            tbf(all, "가뎀증", 22, "초간지 버섯 채집견2", 1);
            for (let _0x423a2b of getRoleIdx("딜", "탱", "디")) {
              if (comp[_0x423a2b].element == 4) {
                tbf(comp[_0x423a2b], "궁추가*", 73.5, "초간지 버섯 채집견3", 1);
              }
            }
            break;
        }
        for (let _0x3c3b18 of comp) {
          if (_0x4f27af < 20 && _0x55e037.stack >= 20) {
            setBuffOn(_0x3c3b18, "기본", "<♡심장 박동 가속♡>1", true);
          }
          if (_0x4f27af < 40 && _0x55e037.stack >= 40) {
            setBuffOn(_0x3c3b18, "기본", "<♡심장 박동 가속♡>2", true);
          }
          if (_0x4f27af < 60 && _0x55e037.stack >= 60) {
            setBuffOn(_0x3c3b18, "기본", "<♡심장 박동 가속♡>3", true);
            setBuffOn(_0x3c3b18, "기본", "<♡심장 박동 가속♡>4", true);
          }
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        const _0x29592d = _0x55e037.stack;
        ultLogic(_0x55e037);
        if (_0x29592d < 40 && _0x55e037.stack >= 40) {
          setBuffOnAll(_0x55e037, "발동", "왕성한 번식욕1", true);
          setBuffOn(_0x55e037, "발동", "왕성한 번식욕2", true);
        }
      };
      _0x55e037.atkbefore = function () {
        tbf(all, "공고증", myCurAtk + _0x55e037.id + 30, "정찰 개시", 1);
      };
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(55);
        if (getElementCnt("풍") >= 2) {
          tbf(all, "공퍼증", 53, "<우리는 멍멍이의 꼬리다!>1", always);
          tbf(all, "궁뎀증", 53, "<우리는 멍멍이의 꼬리다!>2", always);
          tbf(all, "궁추가*", 105.5, "<우리는 멍멍이의 꼬리다!>3", always);
        }
        if (getElementCnt("암") >= 2) {
          atbf(_0x55e037, "궁", all, "가뎀증", 31.7, "<목표는 전설의 모험가 소대!>1", 1, always);
          atbf(_0x55e037, "궁", boss, "받뎀증", 21.2, "<목표는 전설의 모험가 소대!>2", 1, always);
          for (let _0x5e29f1 of getElementIdx("풍", "암")) {
            atbf(_0x55e037, "궁", comp[_0x5e29f1], "받속뎀", 76.7, "<목표는 전설의 모험가 소대!>3", 1, always);
          }
        }
      };
      _0x55e037.passive = function () {
        atbf(_0x55e037, "궁", all, "공고증", myCurAtk + _0x55e037.id + 30, "복슬복슬한 게 정의다", 1, always);
        buff(all, "공퍼증", 16.7, "<♡심장 박동 가속♡>1", always, false);
        buff(all, "궁뎀증", 16.7, "<♡심장 박동 가속♡>2", always, false);
        buff(all, "공퍼증", 20, "<♡심장 박동 가속♡>3", always, false);
        buff(all, "궁뎀증", 20, "<♡심장 박동 가속♡>4", always, false);
        for (let _0x7cf13d of getElementIdx("암")) {
          buff(_0x55e037, "궁", comp[_0x7cf13d], "받속뎀", 22, "왕성한 번식욕1", 1, always, "발동", false);
        }
        buff(_0x55e037, "궁", boss, "받뎀증", 14.6, "왕성한 번식욕2", 1, always, "발동", false);
        tbf(_0x55e037, "공퍼증", 10, "공격+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
        if (GLOBAL_TURN == 1) {
          cdChange(_0x55e037, -3);
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10211:
      _0x55e037.stack = 0;
      buff_ex.push("<악즉참>");
      setMnc(_0x55e037, [382.5, 4, 428.5, 4, 474.5, 4, 520.5, 4, 566.5, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        deleteBuff(_0x55e037, "기본", "성검해방! 월아충파!1");
        deleteBuff(_0x55e037, "기본", "성검해방! 월아충파!2");
        switch (_0x78c5e1) {
          case 1:
            tbf(_0x55e037, "공퍼증", 78.6, "성검해방! 월아충파!1", 4);
            tbf(_0x55e037, "가뎀증", 23.58, "성검해방! 월아충파!2", 4);
            nbf(boss, "받뎀증", 7.86, "성검해방! 월아충파!3", 1, 2);
            break;
          case 2:
            tbf(_0x55e037, "공퍼증", 91.7, "성검해방! 월아충파!1", 4);
            tbf(_0x55e037, "가뎀증", 27.51, "성검해방! 월아충파!2", 4);
            nbf(boss, "받뎀증", 9.17, "성검해방! 월아충파!3", 1, 2);
            for (let _0x4e77b7 of getElementIdx("광")) {
              nbf(comp[_0x4e77b7], "받속뎀", 11.79, "성검해방! 월아충파!4", 1, 2);
            }
            break;
          case 3:
            tbf(_0x55e037, "공퍼증", 104.8, "성검해방! 월아충파!1", 4);
            tbf(_0x55e037, "가뎀증", 31.44, "성검해방! 월아충파!2", 4);
            nbf(boss, "받뎀증", 10.48, "성검해방! 월아충파!3", 1, 2);
            for (let _0x20d509 of getElementIdx("광")) {
              nbf(comp[_0x20d509], "받속뎀", 14.41, "성검해방! 월아충파!4", 1, 2);
            }
            break;
          case 4:
            tbf(_0x55e037, "공퍼증", 117.9, "성검해방! 월아충파!1", 4);
            tbf(_0x55e037, "가뎀증", 35.37, "성검해방! 월아충파!2", 4);
            nbf(boss, "받뎀증", 11.79, "성검해방! 월아충파!3", 1, 2);
            for (let _0x526050 of getElementIdx("광")) {
              nbf(comp[_0x526050], "받속뎀", 17.03, "성검해방! 월아충파!4", 1, 2);
            }
            break;
          default:
            tbf(_0x55e037, "공퍼증", 131, "성검해방! 월아충파!1", 4);
            tbf(_0x55e037, "가뎀증", 39.3, "성검해방! 월아충파!2", 4);
            nbf(boss, "받뎀증", 13.1, "성검해방! 월아충파!3", 1, 2);
            for (let _0x542145 of getElementIdx("광")) {
              nbf(comp[_0x542145], "받속뎀", 19.65, "성검해방! 월아충파!4", 1, 2);
            }
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037, 5);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(55);
        for (let _0x2a2d96 of comp) {
          if (_0x2a2d96.id == 10160) {
            _0x2a2d96.cd -= 20;
            _0x2a2d96.curCd -= 20;
          }
        }
        const _0x173831 = getElementCnt("광");
        nbf(all, "<악즉참>", 0, "파사성검", _0x173831, 5);
        if (_0x173831 == 3) {
          tbf(all, "공퍼증", 63, "<인류의 수호자>1", always);
          anbf(all, "궁", boss, "받뎀증", 2.52, "<인류의 수호자>2", 1, 10, always);
          for (let _0x3348b7 of getElementIdx("광")) {
            anbf(all, "궁", comp[_0x3348b7], "받속뎀", 3.78, "<인류의 수호자>3", 1, 10, always);
          }
        }
        if (getRoleCnt("딜") >= 2) {
          for (let _0x3c4988 of getElementIdx("광")) {
            if (comp[_0x3c4988].role != 0) {
              continue;
            }
            tbf(comp[_0x3c4988], "가뎀증", 37.8, "<마왕 말살의 검>1", always);
            tbf(comp[_0x3c4988], "일뎀증", 56.7, "<마왕 말살의 검>2", always);
            tbf(comp[_0x3c4988], "궁뎀증", 25.2, "<마왕 말살의 검>3", always);
            tbf(comp[_0x3c4988], "평추가*", 37.8, "<마왕 말살의 검>4", always);
            tbf(comp[_0x3c4988], "궁추가*", 50.4, "<마왕 말살의 검>5", always);
          }
        }
      };
      _0x55e037.passive = function () {
        tbf(_0x55e037, "일뎀증", 29.48, "간파1", always);
        tbf(_0x55e037, "궁뎀증", 13.1, "간파2", always);
        for (let _0x42a62d of getElementIdx("광")) {
          if (comp[_0x42a62d].role != 0) {
            continue;
          }
          tbf(comp[_0x42a62d], "공퍼증", 65.5, "십자순섬1", always);
          tbf(comp[_0x42a62d], "일뎀증", 14.74, "십자순섬2", always);
          tbf(comp[_0x42a62d], "궁뎀증", 6.55, "십자순섬3", always);
        }
        for (let _0x28373a of getElementIdx("광")) {
          if (comp[_0x28373a].role != 0) {
            continue;
          }
          tbf(comp[_0x28373a], "가뎀증", 19.65, "여명의 일격1", always);
          tbf(comp[_0x28373a], "평추가*", 19.7, "여명의 일격2", always);
          tbf(comp[_0x28373a], "궁추가*", 26.2, "여명의 일격3", always);
        }
        tbf(_0x55e037, "가뎀증", 6, "데미지+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10212:
      setMnc(_0x55e037, [458.5, 3, 524, 3, 589, 3, 654.5, 3, 719.5, 3], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
            tbf(_0x55e037, "가뎀증", 58.05, "빙폭의 장송1", 1);
            tbf(boss, "받뎀증", 19.35, "빙폭의 장송2", 1);
            break;
          case 2:
            tbf(_0x55e037, "가뎀증", 67.73, "빙폭의 장송1", 1);
            tbf(boss, "받뎀증", 22.58, "빙폭의 장송2", 1);
            break;
          case 3:
            tbf(_0x55e037, "가뎀증", 77.4, "빙폭의 장송1", 1);
            tbf(boss, "받뎀증", 25.8, "빙폭의 장송2", 1);
            break;
          case 4:
            tbf(_0x55e037, "가뎀증", 87.08, "빙폭의 장송1", 1);
            tbf(boss, "받뎀증", 29.03, "빙폭의 장송2", 1);
            break;
          default:
            tbf(_0x55e037, "가뎀증", 96.75, "빙폭의 장송1", 1);
            tbf(boss, "받뎀증", 32.25, "빙폭의 장송2", 1);
            break;
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037, 5);
      };
      _0x55e037.atkbefore = function () {
        tbf(_0x55e037, "궁뎀증", 15, "힘 축적", 3);
      };
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(55);
        for (let _0x349512 of comp) {
          if (_0x55e037.id != _0x349512.id) {
            tbf(_0x349512, "공퍼증", 50, "영혼을 삼키는 마검1", always);
          }
        }
        if (getElKind() == 1) {
          tbf(_0x55e037, "가뎀증", 36, "<마력 충전>2", always);
          tbf(_0x55e037, "궁뎀증", 30, "<마력 충전>3", always);
          tbf(_0x55e037, "궁추가*", 120, "<마력 충전>4", always);
        }
        if (getElKind() == 1) {
          for (let _0x39bddd of comp) {
            if (_0x55e037.id != _0x39bddd.id) {
              atbf(_0x39bddd, "궁", _0x55e037, "공고증", _0x39bddd.hp * 5.76, "<영혼 흡수>1", 1, always);
              anbf(_0x39bddd, "궁", boss, "받뎀증", 1, "<영혼 흡수>2", 1, 12, always);
              for (let _0x202596 of getElementIdx("암")) {
                anbf(_0x39bddd, "궁", comp[_0x202596], "받속뎀", 1.5, "<영혼 흡수>3", 1, 12, always);
              }
            }
          }
        }
      };
      _0x55e037.passive = function () {
        anbf(_0x55e037, "공격", _0x55e037, "궁뎀증", 5.05, "마왕의 피로 벼려낸 검", 1, 10, always);
        for (let _0x5be4f3 of comp) {
          if (_0x55e037.id != _0x5be4f3.id) {
            atbf(_0x5be4f3, "궁", _0x55e037, "공고증", _0x5be4f3.hp * 13.76, "혹독한 겨울", 1, always);
          }
        }
        for (let _0x2d9758 of getElementIdx("암")) {
          anbf(_0x55e037, "궁", comp[_0x2d9758], "받속뎀", 16.1, "서리 독의 침식2", 1, 3, always);
        }
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {
          if (GLOBAL_TURN == 1 && getElKind() == 1) {
            for (let _0x350073 of comp) {
              if (_0x350073.id != _0x55e037.id) {
                cdChange(_0x350073, -3);
              }
            }
          }
        }
        if (GLOBAL_TURN == 1) {
          cdChange(_0x55e037, -3);
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10213:
      _0x55e037.stack = 0;
      buff_ex.push("<살기 축적>");
      setMnc(_0x55e037, [0, 50, 0, 50, 0, 50, 0, 50, 0, 50], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        for (let _0x11fa4e of comp) {
          deleteBuff(_0x11fa4e, "기본", "미나요미 일도류 오의 요염1");
          deleteBuff(_0x11fa4e, "기본", "미나요미 일도류 오의 요염2");
          deleteBuff(_0x11fa4e, "기본", "미나요미 일도류 오의 요염3");
          if (_0x55e037.id != _0x11fa4e.id) {
            deleteBuff(_0x11fa4e, "기본", "미나요미 일도류 오의 요염4");
          }
        }
        switch (_0x78c5e1) {
          case 1:
            tbf(all, "공퍼증", 39.9, "미나요미 일도류 오의 요염1", 4);
            tbf(all, "발효증", 61.8, "미나요미 일도류 오의 요염2", 4);
            buff(_0x55e037, "공발동*", 24, "미나요미 일도류 오의 요염4", 4, false);
            for (let _0x3d2c60 of getRoleIdx("딜", "탱", "디")) {
              if (_0x55e037.id != comp[_0x3d2c60].id) {
                tbf(comp[_0x3d2c60], "공발동*", 24, "미나요미 일도류 오의 요염4", 4);
              }
            }
            break;
          case 2:
            tbf(all, "공퍼증", 46.55, "미나요미 일도류 오의 요염1", 4);
            tbf(all, "발효증", 72.1, "미나요미 일도류 오의 요염2", 4);
            buff(_0x55e037, "공발동*", 28, "미나요미 일도류 오의 요염4", 4, false);
            for (let _0x1046fb of getRoleIdx("딜", "탱", "디")) {
              if (_0x55e037.id != comp[_0x1046fb].id) {
                tbf(comp[_0x1046fb], "공발동*", 28, "미나요미 일도류 오의 요염4", 4);
              }
            }
            break;
          case 3:
            tbf(all, "공퍼증", 53.2, "미나요미 일도류 오의 요염1", 4);
            tbf(all, "발효증", 82.4, "미나요미 일도류 오의 요염2", 4);
            for (let _0x362860 of getElementIdx("화")) {
              tbf(comp[_0x362860], "받속뎀", 32, "미나요미 일도류 오의 요염3", 4);
            }
            buff(_0x55e037, "공발동*", 32, "미나요미 일도류 오의 요염4", 4, false);
            for (let _0xe22000 of getRoleIdx("딜", "탱", "디")) {
              if (_0x55e037.id != comp[_0xe22000].id) {
                tbf(comp[_0xe22000], "공발동*", 32, "미나요미 일도류 오의 요염4", 4);
              }
            }
            break;
          case 4:
            tbf(all, "공퍼증", 59.85, "미나요미 일도류 오의 요염1", 4);
            tbf(all, "발효증", 92.7, "미나요미 일도류 오의 요염2", 4);
            for (let _0x58dd58 of getElementIdx("화")) {
              tbf(comp[_0x58dd58], "받속뎀", 36, "미나요미 일도류 오의 요염3", 4);
            }
            buff(_0x55e037, "공발동*", 36, "미나요미 일도류 오의 요염4", 4, false);
            for (let _0x3887b6 of getRoleIdx("딜", "탱", "디")) {
              if (_0x55e037.id != comp[_0x3887b6].id) {
                tbf(comp[_0x3887b6], "공발동*", 36, "미나요미 일도류 오의 요염4", 4);
              }
            }
            break;
          default:
            tbf(all, "공퍼증", 66.5, "미나요미 일도류 오의 요염1", 4);
            tbf(all, "발효증", 103, "미나요미 일도류 오의 요염2", 4);
            for (let _0x7278cb of getElementIdx("화")) {
              tbf(comp[_0x7278cb], "받속뎀", 40, "미나요미 일도류 오의 요염3", 4);
            }
            buff(_0x55e037, "공발동*", 40, "미나요미 일도류 오의 요염4", 4, false);
            for (let _0x4b1099 of getRoleIdx("딜", "탱", "디")) {
              if (_0x55e037.id != comp[_0x4b1099].id) {
                tbf(comp[_0x4b1099], "공발동*", 40, "미나요미 일도류 오의 요염4", 4);
              }
            }
            break;
        }
      };
      _0x55e037.ultafter = function () {
        boss.def = false;
      };
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
        setBuffOnAll(_0x55e037, "기본", "미나요미 일도류 오의 요염4", true);
        keepOnlyLastBuff(_0x55e037, "기본", "미나요미 일도류 오의 요염4");
      };
      _0x55e037.atkbefore = function () {
        tbf(all, "발효증", 30, "복수의 일격", 1);
      };
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpAll(55);
        tbf(all, "공퍼증", 48.2, "목숨을 앗는 사도1", always);
        if (getRoKind() == 4) {
          tbf(_0x55e037, "공발동*", 28.8, "<검신화>5", always);
          for (let _0x5f3f52 of getElementIdx("화")) {
            anbf(_0x55e037, "궁", comp[_0x5f3f52], "받속뎀", 28.8, "<검신화>6", 1, 1, always);
          }
          anbf(_0x55e037, "궁", boss, "받뎀증", 19.2, "<검신화>7", 1, 1, always);
          for (let _0x3eb4cf of getRoleIdx("딜")) {
            if (_0x55e037.id == comp[_0x3eb4cf].id) {
              continue;
            }
            for (let _0x2795db of getRoleIdx("딜")) {
              nbf(comp[_0x2795db], "가뎀증", 28.8, "<요도의 주인>1", 1, 1);
              nbf(comp[_0x2795db], "발효증", 96.4, "<요도의 주인>2", 1, 1);
            }
            tbf(comp[_0x3eb4cf], "공발동*", 28.8, "<요도의 주인>3", always);
          }
        }
      };
      _0x55e037.passive = function () {
        tbf(_0x55e037, "평발동*", 100, "월하이섬1", always);
        tbf(_0x55e037, "궁발동*", 400, "월하이섬2", always);
        buff(_0x55e037, "궁", all, "발효증", 30, "강자를 향한 집념1", 1, always, "발동", false);
        buff(_0x55e037, "궁", boss, "제거", "기본", "강자를 향한 집념2", 1, always, "발동", false);
        buff(_0x55e037, "궁", boss, "받뎀증", 26.5, "강자를 향한 집념2", 4, always, "발동", false);
        for (let _0x850359 of getElementIdx("화")) {
          tbf(comp[_0x850359], "가뎀증", 40, "귀면의 혈야차1", always);
        }
        tbf(_0x55e037, "가뎀증", 6, "데미지+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        const _0x25f224 = getRoKind();
        if (_0x55e037.isLeader) {
          if (GLOBAL_TURN == 1 && _0x25f224 == 4) {
            nbf(_0x55e037, "<살기 축적>", 0, "강자를 향한 집념", 3, 3);
            _0x55e037.stack += 3;
            if (_0x55e037.stack > 3) {
              _0x55e037.stack = 3;
            }
            setBuffOn(_0x55e037, "발동", "강자를 향한 집념1", true);
            setBuffOnAll(_0x55e037, "발동", "강자를 향한 집념2", true);
            cdChange(_0x55e037, -50);
          }
          if ((GLOBAL_TURN - 1) % 3 == 0 && GLOBAL_TURN > 1 && _0x25f224 == 4) {
            cdChange(_0x55e037, -50);
          }
        }
        if ((GLOBAL_TURN - 1) % 4 == 0 && GLOBAL_TURN > 1) {
          cdChange(_0x55e037, -50);
        }
        if (GLOBAL_TURN == 3 || GLOBAL_TURN == 5 || GLOBAL_TURN == 7) {
          if (!_0x55e037.isLeader || _0x55e037.isLeader && _0x25f224 != 4) {
            nbf(_0x55e037, "<살기 축적>", 0, "강자를 향한 집념", 1, 3);
            _0x55e037.stack += 1;
            if (_0x55e037.stack > 3) {
              _0x55e037.stack = 3;
            }
            if (_0x55e037.stack == 1) {
              setBuffOn(_0x55e037, "발동", "강자를 향한 집념1", true);
            }
            if (_0x55e037.stack == 2) {
              setBuffOnAll(_0x55e037, "발동", "강자를 향한 집념2", true);
            }
          }
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case -1:
      setMnc(_0x55e037, [], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
          case 1:
          case 2:
          case 3:
          case 4:
          default:
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {};
      _0x55e037.passive = function () {};
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10009:
      setMnc(_0x55e037, [0, 4, 0, 4, 0, 4, 0, 4, 0, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
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
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
        for (let _0x331a50 of comp) {
          _0x331a50.heal();
        }
        cdChange(comp[2], -4);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
        for (let _0x11dac5 of comp) {
          _0x11dac5.heal();
        }
      };
      _0x55e037.leader = function () {
        tbf(comp[2], "공퍼증", 50, "아이카의 밀착 서비스", always);
      };
      _0x55e037.passive = function () {
        atbf(_0x55e037, "평", comp[2], "공퍼증", 10, "최고의 원군", 1, always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10013:
      setMnc(_0x55e037, [266, 3, 282, 3, 298, 3, 315, 3, 331, 3], _0x78c5e1);
      _0x55e037.ultbefore = function () {};
      _0x55e037.ultafter = function () {
        nbf(boss, "받뎀증", 10, "신무이도류-멸천일격", 1, 3);
      };
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        tbf(boss, "받뎀증", 30, "신기-약점 간파", 50);
      };
      _0x55e037.passive = function () {
        tbf(_0x55e037, "평발동*", 30, "신무류-추격 베기", always);
        anbf(_0x55e037, "공격", boss, "받뎀증", 5, "신무류-무쇠 가르기", 1, 5, always);
        anbf(_0x55e037, "공격", _0x55e037, "공퍼증", 6, "호기만천", 1, 5, always);
        tbf(_0x55e037, "일뎀증", 10, "일반 공격 데미지+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10036:
      setMnc(_0x55e037, [0, 5, 0, 5, 0, 5, 0, 5, 0, 4], _0x78c5e1);
      _0x55e037.ultbefore = function () {};
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        hpUpMe(_0x55e037, 30);
      };
      _0x55e037.passive = function () {
        let _0x11e80d = comp.reduce((_0x2159d7, _0x1745fe) => {
          if (_0x1745fe.curHp < _0x2159d7.curHp) {
            return _0x1745fe;
          } else {
            return _0x2159d7;
          }
        }, comp[0]);
        atbf(_0x55e037, "평", _0x11e80d, "힐", 100, "에너지 젤리", 1, always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {
          if (GLOBAL_TURN > 1 && (GLOBAL_TURN - 1) % 4 == 0) {
            tbf(boss, "받뎀증", 15, "나는 착한 슬라임이야", 2);
          }
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10038:
      setMnc(_0x55e037, [445, 5, 514, 5, 583, 5, 652, 5, 721, 5], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        for (let _0x3a0898 of getElementIdx("광")) {
          nbf(comp[_0x3a0898], "받속뎀", 30, "필살기-마법소녀 빔!", 1, 1);
        }
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
        if (Math.random() < 0.5) {
          cdChange(_0x55e037, -2);
        }
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        for (let _0x5b25d7 of getElementIdx("광")) {
          tbf(comp[_0x5b25d7], "공퍼증", 30, "사랑과 희망의 빛!1", always);
        }
        tbf(_0x55e037, "궁뎀증", 25, "사랑과 희망의 빛!2", always);
      };
      _0x55e037.passive = function () {
        atbf(_0x55e037, "궁", _0x55e037, "궁뎀증", 50, "정의는 굴복하지 않아!", 4, always);
        for (let _0x6e5ca0 of getElementIdx("광")) {
          atbf(_0x55e037, "궁", comp[_0x6e5ca0], "받속뎀", 20, "마법소녀의 아우라!", 4, always);
        }
        tbf(_0x55e037, "궁뎀증", 10, "궁극기 데미지+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10041:
      setMnc(_0x55e037, [0, 5, 0, 5, 0, 5, 0, 5, 0, 5], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        tbf(_0x55e037, "공퍼증", 20, "전 제 직업이 정말 좋아요!1", 4);
        switch (_0x78c5e1) {
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
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
        for (let _0x1896db of comp) {
          _0x1896db.heal();
        }
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
        for (let _0x1e50c6 of comp) {
          _0x1e50c6.heal();
        }
      };
      _0x55e037.leader = function () {
        tbf(all, "공퍼증", 30, "모험가 길드에 오신 것을 환영합니다!1", always);
        hpUpAll(30);
      };
      _0x55e037.passive = function () {
        for (let _0x11bbe8 of comp) {
          if (_0x11bbe8.id != _0x55e037.id) {
            nbf(_0x11bbe8, "일뎀증", 20, "오늘의 의뢰들이에요~1", 1, 1);
          }
        }
        for (let _0xf4ece2 of comp) {
          if (_0xf4ece2.id != _0x55e037.id) {
            nbf(_0xf4ece2, "궁뎀증", 10, "오늘의 의뢰들이에요~2", 1, 1);
          }
        }
        _0x55e037.cd -= 1;
        _0x55e037.curCd -= 1;
        atbf(_0x55e037, "공격", all, "일뎀증", 4, "여러분의 든든한 지원군이 되어드릴 거에요!", 5, always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10055:
      setMnc(_0x55e037, [0, 3, 0, 3, 0, 3, 0, 3, 0, 3], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        switch (_0x78c5e1) {
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
        tbf(all, "공고증", myCurAtk + _0x55e037.id + 25, "신사의 무희2", 1);
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
        for (let _0x411133 of comp) {
          _0x411133.heal();
        }
      };
      _0x55e037.atkbefore = function () {
        tbf(all, "공고증", myCurAtk + _0x55e037.id + 25, "유혹의 자태", 1);
      };
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {
        tbf(_0x55e037, "공퍼증", 50, "순결한 무희", always);
        hpUpAll(10);
      };
      _0x55e037.passive = function () {
        anbf(_0x55e037, "평", all, "궁뎀증", 2, "요조숙녀", 1, 5, always);
        anbf(_0x55e037, "궁", all, "일뎀증", 10, "도읍 최고의 무녀", 1, 2, always);
        anbf(_0x55e037, "궁", all, "공퍼증", 10, "전국 최고의 무녀", 1, 3, always);
        tbf(_0x55e037, "공퍼증", 10, "공격력 증가", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {}
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    case 10012:
      setMnc(_0x55e037, [133, 3, 149, 3, 166, 3, 182, 3, 199, 3], _0x78c5e1);
      _0x55e037.ultbefore = function () {
        tbf(boss, "받뎀증", 20, "인법 - 고통 흘리기", 1);
      };
      _0x55e037.ultafter = function () {};
      _0x55e037.ultimate = function () {
        ultLogic(_0x55e037);
      };
      _0x55e037.atkbefore = function () {};
      _0x55e037.atkafter = function () {};
      _0x55e037.attack = function () {
        atkLogic(_0x55e037);
      };
      _0x55e037.leader = function () {};
      _0x55e037.passive = function () {
        tbf(_0x55e037, "평추가*", 33, "즉효성 독약", always);
        tbf(_0x55e037, "공퍼증", 20, "집중인법 - 일엽", 4);
        tbf(boss, "받뎀증", 20, "선제인법 - 식갑", 1);
        tbf(_0x55e037, "일뎀증", 10, "일반 공격 데미지+", always);
      };
      _0x55e037.defense = function () {
        _0x55e037.act_defense();
      };
      _0x55e037.turnstart = function () {
        if (_0x55e037.isLeader) {
          if (GLOBAL_TURN == 1) {
            for (let _0xc1f80f of comp) {
              cdChange(_0xc1f80f, -4);
            }
          }
        }
      };
      _0x55e037.turnover = function () {
        if (_0x55e037.isLeader) {}
      };
      return _0x55e037;
    default:
      return null;
  }
}
function ultLogic(_0x2549f0, _0x3bcb8f = 1) {
  lastDmg = 0;
  lastAddDmg = 0;
  lastAtvDmg = 0;
  lastDotDmg = 0;
  lastRefDmg = 0;
  whoActed = _0x2549f0.id;
  _0x2549f0.ultbefore();
  bossUltAttack(_0x2549f0, _0x3bcb8f);
  _0x2549f0.ultafter();
  _0x2549f0.act_ultimate();
  if (lastDmg > 0 || lastAddDmg > 0) {
    boss.hit();
  }
}
function atkLogic(_0x42796f, _0x3c8f6c = 1) {
  lastDmg = 0;
  lastAddDmg = 0;
  lastAtvDmg = 0;
  lastDotDmg = 0;
  lastRefDmg = 0;
  whoActed = _0x42796f.id;
  _0x42796f.atkbefore();
  bossAttack(_0x42796f, _0x3c8f6c);
  _0x42796f.atkafter();
  _0x42796f.act_attack();
  if (lastDmg > 0 || lastAddDmg > 0) {
    boss.hit();
  }
}
let atkOverflowed = false;
function bossAttack(_0x4c04a4, _0x359980) {
  const _0x3a537b = getBuffSizeList(_0x4c04a4);
  let _0x3b1ac0 = _0x4c04a4.getAtkDmg(_0x3a537b) * getInt(_0x4c04a4, boss, _0x3a537b);
  let _0xde283d = _0x4c04a4.getHpAtkDmg(_0x3a537b) * getInt(_0x4c04a4, boss, _0x3a537b);
  if (_0x3b1ac0 <= 0) {
    _0x3b1ac0 = 0;
  }
  if (_0xde283d <= 0) {
    _0xde283d = 0;
  }
  if (boss.def) {
    let _0x3ecbbc = 0.5 - getBossBuffSizeList(boss)[21];
    if (_0x3ecbbc < 0) {
      _0x3ecbbc = 0;
    }
    _0x3b1ac0 = _0x3b1ac0 * (1 - _0x3ecbbc);
    _0xde283d = _0xde283d * (1 - _0x3ecbbc);
  }
  if (_0x3b1ac0 / _0x359980 > overflowDmg) {
    _0x3b1ac0 = overflowDmg * _0x359980;
    isOverflowed[0] = true;
  }
  if (_0x3b1ac0 > overflowDmg) {
    _0x3b1ac0 = overflowDmg;
  }
  boss.hp -= lastDmg = _0x3b1ac0;
  boss.hp -= lastAddDmg = _0xde283d;
  if (consoleOn) {
    for (let _0x3a8fd8 = 0; _0x3a8fd8 < _0x359980; _0x3a8fd8++) {
      console.log("평타 - " + _0x3b1ac0 / _0x359980);
    }
  }
}
let overflowed = false;
function bossUltAttack(_0x4a7d9c, _0x402df1) {
  const _0x545810 = getBuffSizeList(_0x4a7d9c);
  let _0x2165a9 = _0x4a7d9c.getUltDmg(_0x545810) * getInt(_0x4a7d9c, boss, _0x545810);
  let _0x4a8d4a = _0x4a7d9c.getHpUltDmg(_0x545810) * getInt(_0x4a7d9c, boss, _0x545810);
  if (_0x2165a9 <= 0) {
    _0x2165a9 = 0;
  }
  if (_0x4a8d4a <= 0) {
    _0x4a8d4a = 0;
  }
  if (boss.def) {
    let _0x21fb98 = 0.5 - getBossBuffSizeList(boss)[21];
    if (_0x21fb98 < 0) {
      _0x21fb98 = 0;
    }
    _0x2165a9 = _0x2165a9 * (1 - _0x21fb98);
    _0x4a8d4a = _0x4a8d4a * (1 - _0x21fb98);
  }
  if (_0x2165a9 / _0x402df1 > overflowDmg) {
    _0x2165a9 = overflowDmg * _0x402df1;
    isOverflowed[0] = true;
  }
  boss.hp -= lastDmg = _0x2165a9;
  boss.hp -= lastAddDmg = _0x4a8d4a;
  _0x4a7d9c.curCd = _0x4a7d9c.cd;
  if (consoleOn) {
    for (let _0x44d7f7 = 0; _0x44d7f7 < _0x402df1; _0x44d7f7++) {
      console.log("궁극 - " + _0x2165a9 / _0x402df1);
    }
  }
}
function getElKind() {
  let _0x28f564 = 0;
  let _0x433541 = ["화", "수", "풍", "광", "암"];
  for (let _0x373773 of _0x433541) {
    if (getElementCnt(_0x373773) > 0) {
      _0x28f564++;
    }
  }
  return _0x28f564;
}
function getRoKind() {
  let _0x23a86a = 0;
  let _0x5183b6 = ["딜", "힐", "탱", "섶", "디"];
  for (let _0x4200f6 of _0x5183b6) {
    if (getRoleCnt(_0x4200f6) > 0) {
      _0x23a86a++;
    }
  }
  return _0x23a86a;
}
const fixSet = new Set(["궁추가+", "궁발동+", "공발동+", "행발동+", "공고증", "평추가+", "평발동+", "아머", "도트뎀"]);
function get_buff_all(_0x19d65b) {
  if (_0x19d65b == -1) {
    return allBuffToString(boss);
  } else {
    return allBuffToString(comp[_0x19d65b]);
  }
}
function get_buff_simple(_0x5e498f) {
  if (_0x5e498f == -1) {
    return buffListToString(boss);
  } else {
    return buffListToString(comp[_0x5e498f]);
  }
}
function buffListToString(_0x4be72a) {
  const _0x4548ef = getBossBuffSizeList(_0x4be72a);
  const _0x56983f = [t("버프요약") + " - " + t(_0x4be72a.name), ""];
  _0x56983f.push("HP : " + _0x4be72a.hp.toFixed(0));
  _0x56983f.push("ATK : " + _0x4be72a.getCurAtk().toFixed(0));
  _0x56983f.push(t("현재 아머 수치") + " : " + _0x4be72a.getArmor().toFixed(0));
  for (let _0x48211e = 0, _0x45f065; _0x48211e < _0x4548ef.length; _0x48211e++) {
    if (_0x4548ef[_0x48211e] == 0) {
      continue;
    }
    if (fixSet.has(txts[_0x48211e])) {
      _0x45f065 = Math.floor(_0x4548ef[_0x48211e]);
    } else {
      _0x45f065 = Math.floor(_0x4548ef[_0x48211e] * 100000) / 1000 + "%";
    }
    _0x56983f.push(t(txts[_0x48211e]) + " : " + _0x45f065);
  }
  return _0x56983f.join("<hr>");
}
function allBuffToString(_0x44bf14) {
  const _0x1d926d = [..._0x44bf14.buff];
  const _0x5d6ace = [t("버프상세") + " - " + t(_0x44bf14.name), ""];
  for (const _0x25b70b of _0x1d926d) {
    let _0x4b9f0f;
    if (fixSet.has(_0x25b70b.type) && typeof _0x25b70b.size != "string") {
      _0x4b9f0f = " " + Math.floor(_0x25b70b.size / 100);
    } else if (typeof _0x25b70b.size == "string" && (_0x25b70b.size.charAt(0) == myCurAtk || _0x25b70b.size.charAt(0) == myCurShd)) {
      let _0x558790 = _0x25b70b.size.slice(1);
      let _0x9d8dc3 = _0x558790.slice(0, 5);
      let _0x3ec5b4 = _0x558790.slice(5);
      let _0x37fc67 = comp.filter(_0x574169 => _0x574169.id == Number(_0x9d8dc3))[0];
      const _0x238fe3 = _0x37fc67.name;
      const _0x97757f = _0x25b70b.size.charAt(0) == myCurAtk ? t("공") : t("아머");
      _0x4b9f0f = " 『" + t(_0x238fe3) + t("의") + " " + _0x97757f + " " + _0x3ec5b4 + "%" + t("만큼") + "』";
    } else if (_0x25b70b.type == "제거") {
      let _0x56d67 = _0x25b70b.ex >= 100 ? t("상시") : "" + (_0x25b70b.ex - GLOBAL_TURN) + t("턴");
      _0x5d6ace.push(t(_0x25b70b.act + "시") + " " + (_0x25b70b.who == all ? t("모두") : t(_0x25b70b.who.name)) + t("의") + " " + _0x25b70b.name + " " + t(_0x25b70b.size) + t("버프 제거") + " (" + _0x56d67 + ")");
      continue;
    } else if (_0x25b70b.type == "on" || _0x25b70b.type == "off") {
      continue;
    } else {
      _0x4b9f0f = _0x25b70b.size == 0 ? "" : " " + _0x25b70b.size + "%";
    }
    if (isNest(_0x25b70b)) {
      _0x5d6ace.push("" + t(_0x25b70b.type) + _0x4b9f0f + " " + _0x25b70b.nest + t("중첩") + " (" + t("최대") + " " + _0x25b70b.maxNest + t("중첩") + ")" + (_0x25b70b.on ? "" : " (" + t("미발동") + ")") + " : " + (lang == "ko" ? _0x25b70b.name : ""));
    } else if (isTurn(_0x25b70b)) {
      let _0x20741 = _0x25b70b.turn >= 100 ? t("상시") : "" + (_0x25b70b.turn - GLOBAL_TURN) + t("턴");
      _0x5d6ace.push("" + t(_0x25b70b.type) + _0x4b9f0f + " (" + _0x20741 + ")" + (_0x25b70b.on ? "" : " (" + t("미발동") + ")") + " : " + (lang == "ko" ? _0x25b70b.name : ""));
    } else if (isActNest(_0x25b70b)) {
      let _0x4b0670 = _0x25b70b.ex >= 100 ? t("상시") : "" + (_0x25b70b.ex - GLOBAL_TURN) + t("턴");
      _0x5d6ace.push(t(_0x25b70b.act + "시") + " " + (_0x25b70b.who == all ? t("모두") : t(_0x25b70b.who.name)) + " " + t("에게") + " " + t(_0x25b70b.type) + _0x4b9f0f + " " + _0x25b70b.nest + t("중첩") + " (" + t("최대") + " " + _0x25b70b.maxNest + t("중첩") + ") " + t("부여") + "(" + _0x4b0670 + ") " + t(_0x25b70b.div) + (_0x25b70b.on ? "" : " (" + t("미발동") + ")") + " : " + (lang == "ko" ? _0x25b70b.name : ""));
    } else if (isActTurn(_0x25b70b)) {
      let _0x218eb2 = _0x25b70b.ex >= 100 ? t("상시") : "" + (_0x25b70b.ex - GLOBAL_TURN) + t("턴");
      _0x5d6ace.push(t(_0x25b70b.act + "시") + " " + (_0x25b70b.who == all ? t("모두") : t(_0x25b70b.who.name)) + " " + t("에게") + " " + t(_0x25b70b.type) + _0x4b9f0f + " (" + _0x25b70b.turn + t("턴") + ") " + t("부여") + "(" + _0x218eb2 + ") " + t(_0x25b70b.div) + (_0x25b70b.on ? "" : " (" + t("미발동") + ")") + " : " + (lang == "ko" ? _0x25b70b.name : ""));
    } else {
      _0x5d6ace.push(JSON.stringify(_0x25b70b));
    }
  }
  return _0x5d6ace.join("<hr>");
}
const savedData = [];
function loadBefore() {
  if (savedData.length == 0) {
    return;
  }
  command.pop();
  const _0x20534e = savedData.pop();
  for (let _0x4b7717 = 0; _0x4b7717 < 5; _0x4b7717++) {
    jsonToCharacter(_0x4b7717, _0x20534e[_0x4b7717]);
  }
  jsonToBoss(_0x20534e[5]);
  _bumpBuffGen();   // [perf] R2-D：jsonToCharacter/jsonToBoss 用 getCopyList 重建 buff 数组 → 缓存失效
  lastDmg = 0;
  lastAddDmg = 0;
  lastAtvDmg = 0;
  lastDotDmg = 0;
  lastRefDmg = 0;
  updateAll();
}
function saveCur() {
  const _0x3c65f8 = [];
  for (let _0x5007d8 = 0; _0x5007d8 < 5; _0x5007d8++) {
    _0x3c65f8.push(characterToJson(_0x5007d8));
  }
  _0x3c65f8.push(bossToJson());
  savedData.push(_0x3c65f8);
}
function bossToJson() {
  const _0x18acf8 = {
    hp: boss.hp,
    maxHp: boss.maxHp,
    def: boss.def,
    buff: getCopyList(boss.buff),
    li: JSON.parse(JSON.stringify(boss.li)),
    turn: GLOBAL_TURN
  };
  return _0x18acf8;
}
function jsonToBoss(_0x239499) {
  boss.hp = _0x239499.hp;
  boss.maxHp = _0x239499.maxHp;
  boss.def = _0x239499.def;
  boss.buff = getCopyList(_0x239499.buff);
  boss.li = JSON.parse(JSON.stringify(_0x239499.li));
  GLOBAL_TURN = _0x239499.turn;
}
function characterToJson(_0x1dc279) {
  const _0x240526 = comp[_0x1dc279];
  const _0x43e13f = {
    atk: _0x240526.atk,
    hp: _0x240526.hp,
    curHp: _0x240526.curHp,
    cd: _0x240526.cd,
    curCd: _0x240526.curCd,
    buff: getCopyList(_0x240526.buff),
    stopCd: _0x240526.stopCd,
    canCDChange: _0x240526.canCDChange,
    isLeader: _0x240526.isLeader,
    isActed: _0x240526.isActed,
    hpAtkDmg: _0x240526.hpAtkDmg,
    hpUltDmg: _0x240526.hpUltDmg,
    isHealed: _0x240526.isHealed,
    isHealed2: _0x240526.isHealed2,
    isHealed3: _0x240526.isHealed3,
    stack: cloneValue(_0x240526.stack)
  };
  return _0x43e13f;
}
function jsonToCharacter(_0x158ec0, _0x57e3cf) {
  const _0x33cf67 = comp[_0x158ec0];
  _0x33cf67.atk = _0x57e3cf.atk;
  _0x33cf67.hp = _0x57e3cf.hp;
  _0x33cf67.curHp = _0x57e3cf.curHp;
  _0x33cf67.cd = _0x57e3cf.cd;
  _0x33cf67.curCd = _0x57e3cf.curCd;
  _0x33cf67.buff = getCopyList(_0x57e3cf.buff);
  _0x33cf67.stopCd = _0x57e3cf.stopCd;
  _0x33cf67.canCDChange = _0x57e3cf.canCDChange;
  _0x33cf67.isLeader = _0x57e3cf.isLeader;
  _0x33cf67.isActed = _0x57e3cf.isActed;
  _0x33cf67.hpAtkDmg = _0x57e3cf.hpAtkDmg;
  _0x33cf67.hpUltDmg = _0x57e3cf.hpUltDmg;
  _0x33cf67.isHealed = _0x57e3cf.isHealed;
  _0x33cf67.isHealed2 = _0x57e3cf.isHealed2;
  _0x33cf67.isHealed3 = _0x57e3cf.isHealed3;
  _0x33cf67.stack = cloneValue(_0x57e3cf.stack);
}
function cloneValue(_0x1bb55d) {
  if (Array.isArray(_0x1bb55d)) {
    return [..._0x1bb55d];
  }
  return _0x1bb55d;
}
function getCopyList(_0x135060) {
  return _0x135060.map(copyTopLevelJson);
}
function copyTopLevelJson(_0x162eb2) {
  const _0x187ce0 = {};
  for (let _0x561d1b in _0x162eb2) {
    if (_0x162eb2.hasOwnProperty(_0x561d1b)) {
      _0x187ce0[_0x561d1b] = _0x162eb2[_0x561d1b];
    }
  }
  return _0x187ce0;
}