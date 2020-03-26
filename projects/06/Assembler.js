// Implementation of the assembler for the nand2tetris cpu
// Pipe its output to create Hack files.

const fs = require("fs")

// command to binary representation mapping, and symbol table

var jumps = {
  "JMP":"111",
  "JEQ":"010",
  "JNE":"101",
  "JGT":"001",
  "JGE":"011",
  "JLT":"100",
  "JLE":"110",
}

var locs = {
  "A":  "100",
  "D":  "010",
  "M":  "001",
  "MD": "011",
  "AM": "101",
  "AD": "110",
  "AMD":"111",
}

var alus = {
  "0":   "101010",
  "-1":  "111010",
  "1":   "111111",
  "D":   "001100",
  "A":   "110000",
  "!D":  "001101",
  "!A":  "110001",
  "D-1": "001110",
  "A-1": "110010",
  "D+1": "011111",
  "A+1": "110111",
  "-D":  "001111",
  "-A":  "110011",
  "D+A": "000010",
  "D&A": "000000",
  "D-A": "010011",
  "A-D": "000111",
  "D|A": "010101",
}

var symbols = {
  "SP":"0",
  "LCL":"1",
  "ARG":"2",
  "THIS":"3",
  "THAT":"4",
  "SCREEN":"16384",
  "KBD":"24576",
  "R0":"0",
  "R1":"1",
  "R2":"2",
  "R3":"3",
  "R4":"4",
  "R5":"5",
  "R6":"6",
  "R7":"7",
  "R8":"8",
  "R9":"9",
  "R10":"10",
  "R11":"11",
  "R12":"12",
  "R13":"13",
  "R14":"14",
  "R15":"15",
}

// read the source file, split into lines, remove comments

var file = fs.readFileSync(process.argv[2], "utf8").split("\n").map(line => line.trim())
file = file.filter(line => !line.startsWith("//") && !line.startsWith("\r") && line.length > 0)
file = file.map(line => {
  comment_loc = line.indexOf("//")
  if(comment_loc != -1) {
    return line.substr(0, comment_loc).trim()
  }
  return line
})

// load remove jump placeholders and put into symbol table

var jmp_replacements_so_far = 0
file = file.filter((line, i) => {
  if(line.startsWith("(")) {
    var name = line.substr(1, line.length-2)
    symbols[name] = (i-jmp_replacements_so_far)+""
    jmp_replacements_so_far++
  }
  return !line.startsWith("(")
})

// convert commands into binary

var datavalues = 16 // data values start at 16

function parseAInstruction(line) {
    var avalue = line.substr(1)
    // if it's a name, get it from the symbol table
    if(isNaN(parseInt(avalue[0]))) {
      if(!symbols[avalue]) {
        symbols[avalue] = datavalues++ // or it's a data value from RAM 16 onwards
      }
      avalue = symbols[avalue]
    }
    avalue = "0" + fast_decimal_2_binary(avalue).substr(1) // only 15 bits available
    return avalue
}

function parseBInstruction(line) {
  var alu
  var [command, jump] = line.split(";")
  var [loc, command] = command.trim().split("=")
  if(!command) {
    command = loc
    loc = undefined
  }
  mreg = command.search("M") > -1 ? "1" : "0"
  command = command.replace(/M/g, "A")
  jump = jumps[jump] ? jumps[jump] : "000"
  loc = locs[loc] ? locs[loc] : "000"
  alu = alus[command] ? alus[command] : "000000"
  return "111" + mreg +  alu + loc + jump
}

var lines = []
file.map(line => {
  if(line.startsWith("@")) {
    var avalue = parseAInstruction(line)
    lines.push(avalue)
  } else {
    var cvalue = parseBInstruction(line)
    lines.push(cvalue)
  }
})

console.log(lines.join("\n"))

function fast_decimal_2_binary(num) {
  var val = "0000000000000000".split("")
  var col = Math.pow(2, 16)
  for(var i = 0; i < 16; i++) {
    var bit  = parseInt(num / col)
    num = parseInt(num % col)
    val[i] = bit
    col = parseInt(col / 2)
  }
  return val.join("")
}

// decimal to binary using the function from nand2tetris, for fun

function decimal_2_binary(num) {
  var halfadd = function({a, b}) {
    a = parseInt(a); b = parseInt(b);
    return {carry: a & b, result: a ^ b}
  }
  var fulladd = function({a, b, carry}) {
    var mainresult = halfadd({a: a, b: b})
    var carryresult = halfadd({a: mainresult.result, b: carry})
    return {result: carryresult.result, carry: carryresult.carry | mainresult.carry}
  }
  var add16 = function({a, b}) {
    var carry = 0
    var sum = "0000000000000000".split("")
    for(var i = a.length-1; i >= 0; i--) {
      var {carry, result} = fulladd({a: a[i], b: b[i], carry: carry})
      sum[i] = result
    }
    return sum.join("");
  }
  var binary = "0000000000000000"
  for(var i = 0; i<num; i++) {
    binary = add16({a: binary, b: "0000000000000001"})
  }
  return binary
}
