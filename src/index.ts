import { program } from './ast';
import { makeDefaultGlobal } from './global';
import { Applied, compileEval, LValue, RValue, Scope } from './eval';

const grammar = require('../virsh-lang')

export class EvalMachine {
    public global: Scope

    constructor() {
        this.global = makeDefaultGlobal()
    }

    eval(script: string): Promise<any> {
        return this.reify(this.evalAST(this.parse(script)))
    }

    parse(script: string): program {
        return parse(script)
    }

    evalAST(ast: program, glob: Scope = this.global): Promise<LValue|RValue> {
        return compileEval(ast, glob)
    }

    async reify(val: Promise<LValue|RValue> | LValue | RValue): Promise<any> {
        const out = await (await val).get()
        return out.reify()
    }
}

export function parse(script: string): program {
    return grammar.parse(script)
}
