/* lexical grammar */
%lex

%%
\s+                      /* ignore whitespace */;
["].*?["]                return 'DSTRING';
['].*?[']                return 'SSTRING';
[/][/A-Z0-9a-z_-]*       return 'PATH';
[#].*                    /* ingore */;
[0-9][.][0-9]+           return 'FLOAT';
[0-9]+                   return 'INTEGER';
[.][.]                   return 'RANGE';
[+][+]                   return 'INCREMENT';
[-][-]                   return 'DECREMENT';
[!][!]                   return 'INVERT';
true                     return 'TRUE';
false                    return 'FALSE';
No                       return 'FALSE';
Yes                      return 'FALSE';
else                     return 'ELSE';
if                       return 'IF';
for                      return 'FOR';
[&]                      return 'REF';
[-][>]                   return 'LOOK';
[<][-]                   return 'TAKE';
[=][>]                   return 'UNAPPLY';
[=][=]                   return 'EEQ';
[!][=]                   return 'NEQ';
[%]                      return 'MOD';
[$]                      return 'DOLLAR';
[+]                      return 'PLUS';
[-]                      return 'SUBTRACT';
[(]                      return 'OPAREN';
[)]                      return 'CPAREN';
\[                       return 'OBRACK';
\]                       return 'CBRACK';
[{]                      return 'OBRACE';
[}]                      return 'CBRACE';
[:]                      return 'COLON';
[;]                      return 'SEMICOLON';
[!]                      return 'BANG';
[,]                      return 'COMMA';
[/]                      return 'SLASH';
[<]                      return 'LT';
[>]                      return 'GT';
[=]                      return 'ASSIGN';
[.]                      return 'DOT';
[A-Z]+                   return 'SYMBOL';
\w+                      return 'WORD';
<<EOF>>                  return 'EOF';

/lex

%start done

%% /* language grammar */

done
    : block EOF {
        return $1
    }
    | blockNext EOF {
        return {
            type: 'block',
            sequence: [$1]
        }
    }
    ;

list
    : listNext COMMA {
        $$ = {
            type: 'list',
            sequence: [$1]
        }
    }
    | listNext COMMA listNext {
        $$ = {
            type: 'list',
            sequence: [$1, $3]
        }
    }
    | list COMMA listNext {
        $1.sequence.push($3)
        $$ = $1
    }
    ;

listNext : blockNext;

block
    : blockNext SEMICOLON blockNext {
        $$ = {
            type: 'block',
            sequence: [$1, $3]
        }
    }
    | block SEMICOLON blockNext {
        $1.sequence.push($3)
        $$ = $1
    }
    ;

blockNext : bigCall | bigCallNext;

bigCall
    : call bigCallAliases call {
        $1.args.push($3)
        $$ = $1
    }
    | call bigCallAliases callNext {
        $1.args.push($3)
        $$ = $1
    }
    | call bigCallAliases bigCall {
        $1.args.push($3)
        $$ = $1
    }
    ;

bigCallAliases : DOLLAR | ELSE;

bigCallNext: assign | assignNext;

assign
    : assignNext ASSIGN assignNext {
        $$ = {
            type: 'assign',
            lhs: $1,
            rhs: $3,
            op: $2,
        }
    }
    | assign ASSIGN assignNext {
        $$ = {
            type: 'assign',
            lhs: $1,
            rhs: $3,
            op: $2,
        }
    }
    ;

assignNext : ref | refNext;

ref
    : REF refNext {
        $$ = {
            type: 'ref',
            value: $2
        }
    }
    ;

refNext: unapply | unapplyNext;

unapply
    : unapplyNext UNAPPLY unapplyNext {
        $$ = {
            type: 'unapply',
            lhs: $1,
            rhs: $3,
        }
    }
    | unapplyNext UNAPPLY unapply {
        $$ = {
            type: 'unapply',
            lhs: $1,
            rhs: $3,
        }
    }
    ;

unapplyNext : invert | invertNext;

invert
    : BANG invertNext {
        $$ = {
            type: 'bang',
            rhs: $2,
        }
    }
    | BANG invert {
        $$ = {
            type: 'bang',
            rhs: $2,
        }
    }
    ;

invertNext : call | callNext;

call
    : callNext callNext {
        $$ = {
            type: 'call',
            lhs: $1,
            args: [$2],
        }
    }
    | call callNext {
        $1.args.push($2)
        $$ = $1
    }
    ;

callNext : take | takeNext;

take
    : reference TAKE takeNext {
        $$ = {
            type: 'take',
            lhs: $1,
            rhs: $3,
        }
    }
    | take TAKE takeNext {
        $$ = {
            type: 'take',
            lhs: $1,
            rhs: $3,
        }
    }
    ;

takeNext: compare | compareNext;

compare
    : compareNext cmp compareNext {
        $$ = {
            type: 'comp',
            lhs: $1,
            rhs: $3,
            op: $2,
        }
    }
    | compare cmp compareNext {
        $$ = {
            type: 'comp',
            lhs: $1,
            rhs: $3,
            op: $2,
        }
    }
    ;

cmp : EEQ | NEQ | LT | GT;

compareNext : obj | objNext;

obj
    : OBRACE CBRACE {
        $$ = {
            type: 'object',
            list: []
        }
    }
    | OBRACE objList CBRACE {
        $$ = {
            type: 'object',
            list: $2
        }
    }
    ;

objList
    : keyval {
        $$ = [$1]
    }
    | objList COMMA keyval {
        $1.push($3)
        $$ = $1
    }
    ;

keyval
    : WORD COLON keyvalNext {
        $$ = {
            type: 'keyval',
            key: $1,
            val: $3
        }
    }
    ;

keyvalNext: objNext | obj;

objNext : mod | modNext;

mod
    : modNext MOD modNext {
        $$ = {
            type: 'mod',
            lhs: $1,
            rhs: $3,
        }
    }
    | mod MOD modNext {
        $$ = {
            type: 'mod',
            lhs: $1,
            rhs: $3,
        }
    }
    ;

modNext: add | addNext;

add
    : addNext PLUS addNext {
        $$ = {
            type: 'add',
            lhs: $1,
            rhs: $3
        }
    }
    | add PLUS addNext {
        $$ = {
            type: 'add',
            lhs: $1,
            rhs: $3
        }
    }
    ;

addNext: subtract | subtractNext;

subtract
    : subtractNext SUBTRACT subtractNext {
        $$ = {
            type: 'subtract',
            lhs: $1,
            rhs: $3
        }
    }
    | subtract SUBTRACT subtractNext {
        $$ = {
            type: 'subtract',
            lhs: $1,
            rhs: $3
        }
    }
    ;

subtractNext: postfixUnitary | postfixUnitaryNext;

postfixUnitary
    : postfixUnitaryNext uniTypes {
        $$ = {
            type: 'postfix',
            lhs: $1,
            op: $2
        }
    }
    | postfixUnitary uniTypes {
        $$ = {
            type: 'postfix',
            lhs: $1,
            op: $2
        }
    }
    ;

uniTypes : INCREMENT | INVERT | DECREMENT;

postfixUnitaryNext : index | indexNext;

index
    : indexNext OBRACK indexInside CBRACK {
        $$ = {
            type: 'index',
            lhs: $1,
            rhs: $3,
        }
    }
    ;

indexInside: compareNext;

indexNext: lookup | lookupNext;

lookup
    : lookup lookOp lookupRHS {
        $$ = {
            type: 'look',
            lhs: $1,
            op: $2,
            rhs: $3,
        }
    }
    | lookupNext lookOp lookupRHS {
        $$ = {
            type: 'look',
            lhs: $1,
            op: $2,
            rhs: $3,
        }
    }
    ;

lookOp : DOT | LOOK;

lookupRHS : reference;

lookupNext : simple | simpleNext;

simple
    : reference
    | literal
    | deferred
    ;

reference
    : refWord {
        $$ = {
            type: 'reference',
            data: $1
        }
    }
    ;

refWord : WORD | IF | FOR;

deferred
    : OPAREN list CPAREN {
        $$ = {
            type: 'paren',
            block: $2
        }
    }
    | OPAREN block CPAREN {
        $$ = {
            type: 'paren',
            block: $2
        }
    }
    | OPAREN listNext CPAREN {
        $$ = {
            type: 'paren',
            block: $2
        }
    }
    | OBRACE block CBRACE {
        $$ = {
            type: 'brace',
            block: $2
        }
    }
    | OBRACE blockNext CBRACE {
        $$ = {
            type: 'brace',
            block: {
                type: 'block',
                sequence: [$2],
            }
        }
    }
    | INTEGER RANGE INTEGER {
        $$ = {
            type: 'range',
            from: parseInt($1),
            stop: parseInt($3),
        }
    }
    | OPAREN CPAREN {
        $$ = {
            type: 'void'
        }
    }
    ;

literal
    : PATH {
        $$ = {
            type: 'path',
            data: $1,
        }
    }
    | DSTRING {
        $$ = {
            type: 'dstring',
            data: $1.substr(1, $1.length - 2),
        }
    }
    | SSTRING {
        $$ = {
            type: 'sstring',
            data: $1.substr(1, $1.length - 2),
        }
    }
    | INTEGER {
        $$ = {
            type: 'int',
            data: parseInt($1),
        }
    }
    | FLOAT {
        $$ = {
            type: 'float',
            data: parseFloat($1)
        }
    }
    | TRUE {
        $$ = {
            type: 'literal',
            data: true
        }
    }
    | FALSE {
        $$ = {
            type: 'literal',
            data: false
        }
    }
    | SYMBOL {
        $$ = {
            type: 'symbol',
            data: $1,
        }
    }
    ;
