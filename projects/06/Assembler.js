// Implementation of the assembler for the nand2tetris cpu. Pipe its output to create Hack files.
const fs = require("fs")

// command to binary representation mapping, and symbol table

var jumps = {
  "JGT":"001", "JGE":"011", "JLT":"100", "JLE":"110",
  "JEQ":"010", "JNE":"101", "JMP":"111",
}

var locs = {
  "A":  "100", "MD": "011",
  "D":  "010", "AM": "101",
  "M":  "001", "AD": "110",
              "AMD": "111",
}

var alus = {
  "0":   "101010", "-1":  "111010", "1":   "111111",
  "D":   "001100", "A":   "110000", "!D":  "001101", "!A":  "110001", 
  "-D":  "001111", "-A":  "110011",
  "D-1": "001110", "A-1": "110010", "D+1": "011111", "A+1": "110111",
  "D+A": "000010", "D-A": "010011", "A-D": "000111",
  "D&A": "000000", "D|A": "010101",
}

var symbols = {
  "SP":"0", "LCL":"1", "ARG":"2", "THIS":"3", "THAT":"4", "SCREEN":"16384", "KBD":"24576",
  "R0":"0", "R1":"1", "R2":"2", "R3":"3", "R4":"4", "R5":"5", "R6":"6", "R7":"7", "R8":"8", "R9":"9",
  "R10":"10", "R11":"11", "R12":"12", "R13":"13", "R14":"14", "R15":"15",
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

var datavalues_in_ram = 16 // data values start at 16

function parse_a_instruction(line) {
    var avalue = line.substr(1)
    if(isNaN(parseInt(avalue[0]))) { // if name, get from symbol table
      if(!symbols[avalue]) { // or it's a data value from RAM 16
        symbols[avalue] = datavalues_in_ram++ 
      }
      avalue = symbols[avalue]
    }
    return decimal_2_binary(avalue)
}

function parse_b_instruction(line) {
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
    var avalue = parse_a_instruction(line)
    lines.push(avalue)
  } else {
    var cvalue = parse_b_instruction(line)
    lines.push(cvalue)
  }
})

console.log(lines.join("\n"))

function decimal_2_binary(num) {
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
