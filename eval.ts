import * as assert from 'assert'
import { inspect } from 'util'

import { program } from './ast'

const grammar = require('./virsh-lang')

export type Async<T> = T | Promise<T>
export type opts = {[name:string]:  any}

export interface Addable<T> {
    add(to: Addable<T>): T
}

export function isAddable<T>(t: Addable<T>|any): t is Addable<T> {
    const a: any = t
    return a.add instanceof Function
}

export interface Subtractable<T> {
    subtract(to: Subtractable<T>): T
}

export function isSubtractable<T>(t: Subtractable<T>|any): t is Subtractable<T> {
    const a: any = t
    return a.subtract instanceof Function
}

export class Unbound<T extends Applied> {
    constructor(
        private bindable: (scope: Scope) => Async<T>
    ) {}
    bind(scope: Scope): Async<T> {
        return this.bindable(scope)
    }
}
export interface RValue {
    type: 'rvalue'
    get(): Async<Applied>
}
export interface LValue {
    type: 'lvalue'
    set(val: Async<Applied>): Promise<void>
    get(): Async<Applied>
}
export class LValue {
    type: 'lvalue' = 'lvalue'
    constructor(public slot: Async<Applied>) {}
    async set(val: Async<Applied>): Promise<void> {
        this.slot = val
    }
    get() {
        return this.slot
    }
}
export function RValue(getter: (() => Async<Applied>) | Async<Applied>): RValue {
    var get: () => Async<Applied>

    if (!(getter instanceof Function)) {
        get = () => getter
    } else {
        get = getter
    }

    return {
        type: 'rvalue',
        get() { return get() },
    }
}
export type Applied = List | Str | Num | Bool | Scope | Func | Undef
export class Num {
    type: 'num' = 'num'
    constructor(public value: Async<number>) { }
    reify(): Async<number> {
        return this.value
    }
    async add(num: Num): Promise<Num> {
        const out = (await this.value) + (await num.value)
        return new Num(out)
    }
    async subtract(num: Num): Promise<Num> {
        const out = (await this.value) - (await num.value)
        return new Num(out)
    }
}
export class Str {
    type: 'str' = 'str'
    constructor(public value: Async<string>) { }
    reify(): Async<string> {
        return this.value
    }
    async add(str: Str): Promise<Str> {
        const out = (await this.value) + (await str.value)
        return new Str(out)
    }
}
export class Bool {
    type: 'bool' = 'bool'
    constructor(public value: Async<boolean>) { }
    reify(): Async<boolean> {
        return this.value
    }
}
export class List {
    type: 'list' = 'list'
    constructor(public value: Array<RValue>) { }
    reify(): Async<Array<any>> {
        return Promise.all(this.value.map(async (val) => await (await val.get()).reify()))
    }
}
export class Scope {
    constructor(private parent?: Scope) { }
    type: 'scope' = 'scope'
    value : {[name:string]: LValue} = {}
    get(name: string): LValue {
        const out = this._get(name)
        if (!out) {
            return this.value[name] = new LValue(Undefined)
        } else {
            return out
        }
    }
    private _get(name:string): LValue | undefined {
        return this.value[name] || (this.parent && this.parent._get(name))
    }
    async reify(): Promise<{[name:string]: any}> {
        const out: any = {}
        for(const key of Object.keys(this.value)) {
            out[key] = await (await this.value[key].get()).reify()
        }
        return out
    }
}
export class Func {
    type: 'func' = 'func'
    constructor(public value: (scope: Scope, ...args:((scope: Scope) => Async<Applied>)[]) => Async<Applied>) { }
    async reify() {
        return function(){}
    }
}
export class Undef {
    type: 'undef' = 'undef'
    async reify() {
        return
    }
}
export const Undefined = new Undef()

export function Var(applied: Async<Applied>): LValue {
    return new LValue(applied)
}

export function Val(applied: Async<Applied>): RValue {
    return RValue(applied)
}

export class Path {
    constructor(private origin: string) {

    }
    async extract(scope: Scope): Promise<LValue> {
        return scope.get(this.origin)
    }
}

export async function compileEval(ast: program, scope: Scope): Promise<LValue | RValue> {
    switch(ast.type) {
    case 'int': {
        return Val(new Num(ast.data))
    }
    case 'reference': {
        return scope.get(ast.data)
    }
    case 'assign': {
        const lhs = await compileEval(ast.lhs, scope)
        if (lhs.type !== 'lvalue') throw new Error(`Invalid LHS Assignment`)
        const rhs = await compileEval(ast.rhs, scope)
        lhs.set(rhs.get())
        return rhs
    }
    case 'look': {
        const lhs = await compileEval(ast.lhs, scope)
        const scp = await lhs.get()
        if (scp.type !== 'scope') throw new Error(`Cannot look into ${lhs.type}`)
        const rhs = compileEval(ast.rhs, scp)

        return rhs
    }
    case 'block': {
        var last: RValue|LValue = RValue(Undefined)
        for(const block of ast.sequence) {
            last = await compileEval(block, scope)
        }
        return last
    }
    case 'brace': {
        const newScope = new Scope(scope)
        return compileEval(ast.block, newScope)
    }
    case 'postfix': {
        const lhs = await compileEval(ast.lhs, scope)
        if (lhs.type !== 'lvalue') throw new Error(`Invalid LHS Assignment`)
        const val = await lhs.get()
        switch(ast.op) {
        case '++': {
            if (val.type !== 'num') throw new Error(`Cannot increment ${val.type}`)
            const num = new Num(await val.reify() + 1)
            await lhs.set(num)
            return RValue(val)
        }
        case '--': {
            if (val.type !== 'num') throw new Error(`Cannot decrement ${val.type}`)
            const num = new Num(await val.reify() - 1)
            await lhs.set(num)
            return RValue(val)
        }
        case '!!': {
            if (val.type !== 'bool') throw new Error(`Cannot invert ${val.type}`)
            const num = new Bool(!(await val.reify()))
            await lhs.set(num)
            return RValue(val)
        }
        default:
            throw new Error(`Unknown Postfix Op ${(<any>ast).op}`)
        }
    }
    case 'path': {
        const path = new Path(ast.data)
        const lval = await path.extract(scope)
        return lval
    }
    case 'call': {
        const lhs = await compileEval(ast.lhs, scope)
        const args = ast.args.map(arg => async (scope: Scope) => {
            const val = await compileEval(arg, scope)
            const out = await val.get()
            return out
        })
        const val = await lhs.get()
        if (val.type !== 'func') throw new Error(`Cannot Call ${val.type}`)
        const out = await val.value(scope, ...args)
        return RValue(out)
    }
    case 'literal': {
        return RValue(new Bool(ast.data))
    }
    case 'range': {
        const {from, stop} = ast
        const list = []
        for(var i=from; i<=stop; i++) {
            list.push(RValue(new Num(i)))
        }
        return RValue(new List(list))
    }
    case 'paren': {
        return compileEval(ast.block, scope)
    }
    case 'list': {
        const list: RValue[] = []
        for(const item of ast.sequence) {
            const next = await compileEval(item, scope)
            list.push(RValue(await next.get()))
        }
        return RValue(new List(list))
    }
    case 'take': {
        const scp = new Scope(scope)
        const ivar = scp.get(ast.lhs.data)
        const range = await compileEval(ast.rhs, scope)
        const vals = await range.get()

        if (vals.type !== 'list') throw new Error(`Type ${vals.type} Not Iterable`)

        // TODO: make take return a funciton, that when applied, yields successive values
        //       i.e. make this a generator
        return RValue(new Func(async (scope, iter) => {
            let last: Async<Applied> = Undefined

            for(const val of vals.value) {
                await ivar.set(await val.get())
                last = await iter(scp)
            }

            return last
        }))
    }
    case 'sstring':
        return RValue(new Str(ast.data))
    case 'dstring': {
        let out = ''
        const re = new RegExp(/(?![\\])\{(.*?[^\\])\}/)
        let next
        let last = ast.data
        while(next = re.exec(last)) {
            const [match, escaped] = next
            const {index} = next

            const val = await compileEval(grammar.parse(escaped), scope)

            out += last.substr(0, index)
            out += String(await (await val.get()).reify())

            last = last.substr(index + match.length)
        }
        out += last

        return RValue(new Str(out))
    }
    case 'add': {
        const lhs = await compileEval(ast.lhs, scope)
        const rhs = await compileEval(ast.rhs, scope)
        const a = await lhs.get()
        const b = await rhs.get()

        if (isAddable<Applied>(a) && isAddable<Applied>(b)) {
            return RValue(a.add(b))
        } else {
            throw new Error(`Cannot Add`)
        }
    }
    case 'subtract': {
        const lhs = await compileEval(ast.lhs, scope)
        const rhs = await compileEval(ast.rhs, scope)
        const a = await lhs.get()
        const b = await rhs.get()

        if (isSubtractable<Applied>(a) && isSubtractable<Applied>(b)) {
            return RValue(a.subtract(b))
        } else {
            throw new Error(`Cannot Subtract`)
        }
    }
    case 'comp': {
        const $lhs = await compileEval(ast.lhs, scope)
        const $rhs = await compileEval(ast.rhs, scope)

        const lhs = await $lhs.get()
        const rhs = await $rhs.get()

        const l = await lhs.reify()
        const r = await rhs.reify()

        switch(ast.op) {
        case '!=': return RValue(new Bool(l != r))
        case '==': return RValue(new Bool(l == r))
        case '<': {
            if (lhs.type !== 'num' && rhs.type !== 'num') {
                throw new Error(`Can only compare (<) Num Type`)
            }

            return RValue(new Bool(l < r))
        }
        case '>': {
            if (lhs.type !== 'num' && rhs.type !== 'num') {
                throw new Error(`Can only compare (>) Num Type`)
            }

            return RValue(new Bool(l > r))
        }
        default:
            throw new Error(`Unknown Compartor`)
        }
    }
    case 'object': {
        const list = ast.list
        const scp = new Scope()

        for(const kv of list) {
            const lhs = await compileEval(kv.val, scope)
            scp.get(kv.key).set(lhs.get())
        }

        return RValue(scp)
    }
    case 'index': {
        const $lhs = await compileEval(ast.lhs, scope)
        const lhs = await $lhs.get()
        const $rhs = await compileEval(ast.rhs, scope)
        const rhs = await $rhs.get()
        switch(lhs.type){
        case 'list': {
            const index = await rhs.reify()
            if (typeof index !== 'number') throw new Error(`List index must be number`)
            return lhs.value[index]
        }
        case 'scope': {
            const index = await rhs.reify()
            return lhs.get(String(index))
        }
        default:
            throw new Error(`Cannot Index type ${lhs.type}`)
        }
    }
    case 'template': {
        const {preamble, postamble, contents} = ast
        const middle = await compileEval(contents, scope)
        const mid = await (await middle.get()).reify()
        return RValue(new Str(preamble + mid + postamble))
    }
    case 'filling': {
        const {begin, content, middle} = ast

        const s0 = await (await (await compileEval(begin, scope)).get()).reify()
        const s1 = middle
        const s2 = await (await (await compileEval(content, scope)).get()).reify()

        return RValue(new Str(s0 + s1 + s2))
    }
    default:
        console.error('AST', ast)
        throw new Error(`Unexpected type ${ast.type}`)
    }
}