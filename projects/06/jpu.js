
//console.log(dmux8({a: "1", sel: "110"}))
//console.log(add16({a:"0000000000000001", b:"0000000000000001"}))
//console.log(and16({a:"0000000000000001", b:"0000000000000011"}))
//console.log(not16({a:"0000000000000001"}))
//console.log(mux({a: 1, b: 0, sel: 1}))
//console.log(mux16({a: "1111111111111111", b: "0000000000000000", sel: 0}))
//console.log(alu({a: "0000000000000000", b: "0000000000000001", controlbits: "010011"}))

var machinecode = [
"0000 000000 000 011", // add to a
"1000 110000 010 000", // store in d
"0000 000000 000 000", // add to a
"1000 001100 001 000", // store in m
"1001 000010 010 000", // d = m + d 
"0000 000000 000 001",
"1000 001100 001 000", // m = m + a
"0000 000000 000 111",
"1000 010011 000 000", // get a - number
"0000 000000 000 000", // 
"1000 000000 000 111", // 
//"1000 000001 000 100", // check lt
//"1000 111101 000 010", // check eq
//"1000 000000 000 001", // check gt
//"1000 111100 000 101", // check ne
]

// ------
// cpu section
// ------

var areg = register()
var dreg = register()
var ram = ram16k()

for(var i = 0; i < machinecode.length; i++) {
  machinecode[i] = machinecode[i].replace(/ /g, "")
  var ainstruction = not(machinecode[i][0])
  var cinstruction = not(ainstruction)
  var jlt = cinstruction & machinecode[i][13] & not(machinecode[i][14]) & not(machinecode[i][15])
  var jle = cinstruction & machinecode[i][13] & machinecode[i][14] & not(machinecode[i][15])
  var jeq = cinstruction & not(machinecode[i][13]) & machinecode[i][14] & not(machinecode[i][15])
  var jne = cinstruction & machinecode[i][13] & not(machinecode[i][14]) & machinecode[i][15]
  var jgt = cinstruction & not(machinecode[i][13]) & not(machinecode[i][14]) & machinecode[i][15]
  var jge = cinstruction & not(machinecode[i][13]) & machinecode[i][14] & machinecode[i][15]
  var jjj = cinstruction & machinecode[i][13] & machinecode[i][14] & machinecode[i][15]
  var swapam = cinstruction & machinecode[i][3]
  var storeina = cinstruction & machinecode[i][10]
  var storeind = cinstruction & machinecode[i][11]
  var storeinm = cinstruction & machinecode[i][12]
  var aorm = mux16({sel: swapam, a: areg(), b: ram({addr: areg()})}) 
  areg({store: ainstruction, a: machinecode[i]})
  var {res, ng, zr} = alu({a: dreg(), b: aorm, controlbits: machinecode[i].substr(4, 6)}) 
  var jltv = jlt & ng
  var jlev = jle & (zr | ng)
  var jeqv = jeq & zr
  var jnev = jne & not(zr)
  var jgtv = jgt & (not(zr) & not(ng))
  var jgev = jge & (zr | (not(zr) & not(ng)))
  var jmp = or8way({a: "0"+jjj+jltv+jlev+jeqv+jnev+jgtv+jgev})
  dreg({store: storeind, a:res})
  areg({store: storeina, a:res})
  ram({store: storeinm, a: res, addr: areg().substr(2)})
  console.log(i, machinecode[i], "alu", res, ng, zr, "a", areg(), "d", dreg(), "ram", ram({addr: areg().substr(2)}), jlt, jeq, jgt)
  if(jmp) { 
    i = parseInt(areg(), 2) - 1
    continue
  }
}

for(var j = 0; j < 10; j++) {
  console.log(j, ram({addr: decimal_2_binary(j).substr(2)}))
}

// ------
// alu section
// ------

function alu({a, b, controlbits}) {
  var zero16 = "0000000000000000"
  var zx = controlbits[0]
  var nx = controlbits[1]
  var zy = controlbits[2]
  var ny = controlbits[3]
  var f = controlbits[4]
  var no = controlbits[5]

  a = mux16({a: a, b: zero16, sel: zx})
  a = mux16({a: a, b: not16(a), sel: nx})
  b = mux16({a: b, b: zero16, sel: zy})
  b = mux16({a: b, b: not16(b), sel: ny})
  var add = add16({a: a, b: b})
  var and = and16({a: a, b: b})
  var res = mux16({a: and, b: add, sel: f})
  res = mux16({a: res, b: not16(res), sel: no})
  var ng = mux({sel: res[0], a: 0, b: 1})
  var zr0 = or8way({a: res.substr(8)})
  var zr1 = or8way({a: res.substr(0, 8)})
  return {res: res, ng: ng, zr: not(zr0 | zr0)}
}

function add16({a, b}) {
  var carry = 0
  var value = []
  for(var i = 15; i >= 0; i--) {
    var {carry, result} = fulladd({a: a[i], b: b[i], carry: carry})
    value.unshift(result)
  } 
  return value.join("")
}

function fulladd({a, b, carry}) {
  var mainresult = halfadd({a: a, b: b})
  var carryresult = halfadd({a: mainresult.result, b: carry})
  return {result: carryresult.result, carry: carryresult.carry | mainresult.carry}
}

function halfadd({a, b}) {
  a = parseInt(a); b = parseInt(b);
  return {carry: a & b, result: a ^ b}
}

// ------
// basic gates section
// ------

function and16({a, b}) {
  var value = []
  for(var i = 15; i >= 0; i--) {
    value.unshift(a[i] & b[i])
  } 
  return value.join("")
}

function dmux8({a, sel}) {
  var high_bit_on = sel[0] === "1"
  var {a, b, c, d} = dmux4({a: a, sel: sel.substr(1)})
  return {
    a: a & !high_bit_on, 
    b: b & !high_bit_on, 
    c: c & !high_bit_on, 
    d: d & !high_bit_on,
    e: a & high_bit_on,
    f: b & high_bit_on,
    g: c & high_bit_on,
    h: d & high_bit_on
  }
}

function dmux4({a, sel}) {
  var high_bit_on = sel[0] === "1"
  var {a, b} = dmux({a: a, sel: sel[1]})
  return {
    a: a & !high_bit_on, 
    b: b & !high_bit_on, 
    c: a & high_bit_on, 
    d: b & high_bit_on
  }
}

function dmux({a, sel}) {
  var not_sel = not(sel)
  return {a: a & not_sel, b: a & sel}
}

function mux8way16({sel, a, b, c, d, e, f, g, h}) {
  var abcd = mux4way16({a: a, b: b, c: c, d: d, sel: sel.substr(1)})
  var efgh = mux4way16({a: e, b: f, c: g, d: h, sel: sel.substr(1)})
  return mux16({a: abcd, b: efgh, sel: sel[0]})
}

function mux4way16({sel, a, b, c, d}) {
  var ab = mux16({a: a, b: b, sel: sel[1]})
  var cd = mux16({a: c, b: d, sel: sel[1]})
  return mux16({a: ab, b: cd, sel: sel[0]})
}

function mux16({a, b, sel}) {
  var value = []
  for(var i = 15; i >= 0; i--) {
    value.unshift(mux({ a:a[i], b:b[i], sel: sel }))
  } 
  return value.join("")
}

function mux({a, b, sel}) {
  var not_sel = not(sel)
  var a_sel = a & not_sel
  var b_sel = b & sel
  return a_sel | b_sel
}

function or8way({a}) {
  return a[0] | a[1] | a[2] | a[3] | a[4] | a[5] | a[6] | a[7]
}

function not16(a) {
  var value = []
  for(var i = 15; i >= 0; i--) {
    value.unshift(not(a[i]))
  } 
  return value.join("")
}

function not(val) {
  return val == 0 ? 1 : 0
}

// ------
// memory section
// ------

function ram16k() {
  var _a = ram4k(); var _b = ram4k(); var _c = ram4k(); var _d = ram4k()
  return function({a = "0000000000000000", store = "0", addr} = {}) {
    var low_bits = addr.substr(2)
    var high_bits = addr.substr(0, 2)
    var store =  dmux4({a: store, sel: high_bits})
    var av = _a({a: a, store: store.a, addr: low_bits})
    var bv = _b({a: a, store: store.b, addr: low_bits}) 
    var cv = _c({a: a, store: store.c, addr: low_bits})
    var dv = _d({a: a, store: store.d, addr: low_bits})
    return mux4way16({ sel: high_bits, a: av, b: bv, c: cv, d: dv})
  }
}

function ram4k() {
  var _a = ram512(); var _b = ram512(); var _c = ram512(); var _d = ram512()
  var _e = ram512(); var _f = ram512(); var _g = ram512(); var _h = ram512()
  return function({a="0000000000000000", store="0" , addr} = {}) {
    var low_bits = addr.substr(3)
    var high_bits = addr.substr(0, 3)
    var store =  dmux8({a: store, sel: high_bits})
    var av = _a({a: a, store: store.a, addr: low_bits})
    var bv = _b({a: a, store: store.b, addr: low_bits}) 
    var cv = _c({a: a, store: store.c, addr: low_bits})
    var dv = _d({a: a, store: store.d, addr: low_bits})
    var ev = _e({a: a, store: store.e, addr: low_bits})
    var fv = _f({a: a, store: store.f, addr: low_bits}) 
    var gv = _g({a: a, store: store.g, addr: low_bits})
    var hv = _h({a: a, store: store.h, addr: low_bits})
    return mux8way16({ sel: high_bits, a: av, b: bv, c: cv, d: dv, e: ev, f: fv, g: gv, h: hv})
  }
}

function ram512() {
  var _a = ram64(); var _b = ram64(); var _c = ram64(); var _d = ram64()
  var _e = ram64(); var _f = ram64(); var _g = ram64(); var _h = ram64()
  return function({a="0000000000000000", store="0" , addr} = {}) {
    var low_bits = addr.substr(3)
    var high_bits = addr.substr(0, 3)
    var store =  dmux8({a: store, sel: high_bits})
    var a8 = _a({a: a, store: store.a, addr: low_bits})
    var b8 = _b({a: a, store: store.b, addr: low_bits}) 
    var c8 = _c({a: a, store: store.c, addr: low_bits})
    var d8 = _d({a: a, store: store.d, addr: low_bits})
    var e8 = _e({a: a, store: store.e, addr: low_bits})
    var f8 = _f({a: a, store: store.f, addr: low_bits}) 
    var g8 = _g({a: a, store: store.g, addr: low_bits})
    var h8 = _h({a: a, store: store.h, addr: low_bits})
    return mux8way16({ sel: high_bits, a: a8, b: b8, c: c8, d: d8, e: e8, f: f8, g: g8, h: h8})
  }
}

function ram64() {
  var _a = ram8(); var _b = ram8(); var _c = ram8(); var _d = ram8()
  var _e = ram8(); var _f = ram8(); var _g = ram8(); var _h = ram8()
  return function({a="0000000000000000", store="0" , addr} = {}) {
    var low_bits = addr.substr(3)
    var high_bits = addr.substr(0, 3)
    var store =  dmux8({a: store, sel: high_bits})
    var a8 = _a({a: a, store: store.a, addr: low_bits})
    var b8 = _b({a: a, store: store.b, addr: low_bits}) 
    var c8 = _c({a: a, store: store.c, addr: low_bits})
    var d8 = _d({a: a, store: store.d, addr: low_bits})
    var e8 = _e({a: a, store: store.e, addr: low_bits})
    var f8 = _f({a: a, store: store.f, addr: low_bits}) 
    var g8 = _g({a: a, store: store.g, addr: low_bits})
    var h8 = _h({a: a, store: store.h, addr: low_bits})
    return mux8way16({ sel: high_bits, a: a8, b: b8, c: c8, d: d8, e: e8, f: f8, g: g8, h: h8})
  }
}

function ram8() {
  var _a = register(); var _b = register(); var _c = register(); var _d = register()
  var _e = register(); var _f = register(); var _g = register(); var _h = register()
  return function({a="0000000000000000", store="0" , addr} = {}) {
    var store = dmux8({a: store, sel: addr})
    _a({a: a, store: store.a}); _b({a: a, store: store.b}); _c({a: a, store: store.c}); _d({a: a, store: store.d})
    _e({a: a, store: store.e}); _f({a: a, store: store.f}); _g({a: a, store: store.g}); _h({a: a, store: store.h})
    return mux8way16({ sel: addr,
      a: _a(), b: _b(), c: _c(), d: _d(),
      e: _e(), f: _f(), g: _g(), h: _h()})
  }
}

function register() {
  var _a = bit(); var _b = bit(); var _c = bit(); var _d = bit() 
  var _e = bit(); var _f = bit(); var _g = bit(); var _h = bit() 
  var _i = bit(); var _j = bit(); var _k = bit(); var _l = bit()
  var _m = bit(); var _n = bit(); var _o = bit(); var _p = bit()
  return function({a, store} = {a: "0000000000000000", store: "0"}) {
    return "" +
      _a({store: store, a: a[0]}) + _b({store: store, a: a[1]}) +
      _c({store: store, a: a[2]}) + _d({store: store, a: a[3]}) +
      _e({store: store, a: a[4]}) + _f({store: store, a: a[5]}) +
      _g({store: store, a: a[6]}) + _h({store: store, a: a[7]}) +
      _i({store: store, a: a[8]}) + _j({store: store, a: a[9]}) +
      _k({store: store, a: a[10]}) + _l({store: store, a: a[11]}) +
      _m({store: store, a: a[12]}) + _n({store: store, a: a[13]}) +
      _o({store: store, a: a[14]}) + _p({store: store, a: a[15]})
  }
}

function bit() {
  var val = "0"
  return function({a, store}) {
    val = mux({a: val, b: a, sel: store})
    return val
  }
}

// --- utils

function decimal_2_binary(num) {
  var val = "0000000000000000".split("")
  var col = Math.pow(2, 15)
  for(var i = 0; i <= 15; i++) {
    var bit  = parseInt(num / col)
    num = parseInt(num % col)
    val[i] = bit
    col = parseInt(col / 2)
  }
  return val.join("")
}
