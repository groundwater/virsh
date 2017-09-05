import { program } from "./ast";

export function compileAll(ast: program): string {
    switch(ast.type) {
    case 'reference':
        return ast.data
    case 'path':
        return ast.data
    case 'look':
        return `${compileAll(ast.lhs)}${ast.op}${compileAll(ast.rhs)}`
    case 'block':
        return ast.sequence.map(compileAll).join('; ')
    case 'call':
        return compileAll(ast.lhs) + ' ' + ast.args.map(compileAll).join(' ')
    case 'assign':
        return compileAll(ast.lhs) + ' = ' + compileAll(ast.rhs)
    case 'brace':
        return '{ ' + compileAll(ast.block) + ' }'
    case 'paren':
        return '(' + compileAll(ast.block) + ')'
    case 'float':
    case 'int':
        return String(ast.data)
    case 'comp':
        return compileAll(ast.lhs) + ` ${ast.op} ` + compileAll(ast.rhs)
    case 'postfix':
        return compileAll(ast.lhs) + ast.op
    case 'dstring':
        return `"${ast.data}"`
    case 'sstring':
        return `'${ast.data}'`
    case 'unapply':
        return `${compileAll(ast.lhs)} => ${compileAll(ast.rhs)}`
    case 'take':
        return `${compileAll(ast.lhs)} <- ${compileAll(ast.rhs)}`
    case 'literal':
        return String(ast.data)
    case 'list':
        return ast.sequence.map(compileAll).join(', ')
    case 'symbol':
        return ast.data
    case 'bang':
        return '!' + compileAll(ast.rhs)
    case 'math':
        return ast.data
    default:
        console.error(ast)
        throw new Error(`Unknown Type ${(<any> ast).type}`)
    }
}