// This file is part of www.nand2tetris.org
// and the book "The Elements of Computing Systems"
// by Nisan and Schocken, MIT Press.
// File name: projects/04/Fill.asm

// Runs an infinite loop that listens to the keyboard input.
// When a key is pressed (any key), the program blackens the screen,
// i.e. writes "black" in every pixel;
// the screen should remain fully black as long as the key is pressed. 
// When no key is pressed, the program clears the screen, i.e. writes
// "white" in every pixel;
// the screen should remain fully clear as long as no key is pressed.

// size of screen
@8192
D=A
@size
M=D

(MAIN)

@KBD
D=M
@NOPRESS
D;JEQ

@pixel
M=-1

@SCREENFILL
0;JMP

(NOPRESS)

@pixel
M=0

(SCREENFILL)

@i 
M=0

(SCREENFILLLOOP)

// check if we've got to the end
@size
D=M
@i
D=D-M
@MAIN
D;JEQ

// store screen pos in loc
@SCREEN
D=A
@i
D=D+M
@loc
// get pixel
M=D
@pixel
D=M
// put it into loc
@loc
A=M
M=D

@i
M=M+1

@SCREENFILLLOOP
0;JMP
