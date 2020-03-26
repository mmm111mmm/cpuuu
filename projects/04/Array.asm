@output
M=0
@i
M=0

(LOOP)

@R1
D=M
@i
D=D-M
@ENDLOOP
D;JEQ

@R0
D=M
@i
A=D+M
D=M

@output
M=M+D

@i
M=M+1

@LOOP
0;JMP

(ENDLOOP)
@output
D=M
@R2
M=D
(END)
@END
0;JMP
