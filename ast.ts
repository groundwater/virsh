export interface reference {
    type: 'reference'
    data: string
}
export interface look {
    type: 'look',
    lhs: lhs
    rhs: reference
    op: '.' | '->'
}
export interface math {
    type: 'math'
    data: string
}
export interface block {
    type: 'block'
    sequence: program[]
}
export interface call {
    type: 'call'
    lhs: program
    args: program[]
}
export interface assign {
    type: 'assign'
    lhs: lhs
    rhs: rhs
    op: '='
}
export interface brace {
    type: 'brace'
    block: block
}
export interface paren {
    type: 'paren'
    block: block
}
export interface integer {
    type: 'int'
    data: number
}
export interface float {
    type: 'float'
    data: number
}
export interface comp {
    type: 'comp'
    lhs: lhs
    rhs: program
    op: '>' | '<' | '==' | '!='
}
export interface postfix {
    type: 'postfix'
    lhs: lhs
    op: '++' | '!!' | '--'
}
export interface dstring {
    type: 'dstring'
    data: string
}
export interface sstring {
    type: 'sstring'
    data: string
}
export interface literal {
    type: 'literal'
    data: boolean
}
export interface range {
    type: 'range'
    from: number
    stop: number
}
export interface unapply {
    type: 'unapply'
    lhs: lhs
    rhs: program
}
export interface take {
    type: 'take'
    lhs: lhs
    rhs: program
}
export interface list {
    type: 'list'
    sequence: program[]
}
export interface obj {
    type: 'object'
    list: keyval[]
}
export interface index {
    type: 'index'
    lhs: program
    rhs: program
}
export interface keyval {
    type: 'keyval'
    key: string
    val: program
}
export interface sym {
    type: 'symbol'
    data: string
}
export interface bang {
    type: 'bang'
    rhs: program
}
export interface add {
    type: 'add'
    lhs: program
    rhs: program
}
export interface subtract {
    type: 'subtract'
    lhs: program
    rhs: program
}
export interface template {
    type: 'template'
    preamble: string
    contents: program
    postamble: string
}
export interface filling {
    type: 'filling'
    begin: program
    middle: string
    content: program
}
export type lhs = reference
export type rhs = program
export interface path {
    type: 'path'
    data: string
}

export type program = reference
    | obj
    | keyval
    | add
    | subtract
    | index
    | list
    | path
    | look
    | block
    | call
    | assign
    | brace
    | paren
    | integer
    | comp
    | postfix
    | sstring
    | dstring
    | unapply
    | take
    | literal
    | float
    | sym
    | bang
    | math
    | range
    | template
    | filling
    ;
