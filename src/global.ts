import { Bool, Func, List, Num, RValue, Scope, Str, Undefined, Async, Applied } from './eval';
import { list } from './ast';

export function makeDefaultGlobal(): Scope {
    const out: Scope = new Scope()

    out.get('if').set(new Func(async (_scope, cond, ifTrue, ifFalse) => {
        const scope = new Scope(_scope)
        const test = await cond(scope)

        if (await test.reify()) {
            return ifTrue(scope)
        } else {
            return ifFalse ? ifFalse(scope) : Undefined
        }
    }))

    out.get('print').set(new Func(async (scope, ...args) => {
        for(const arg of args) {
            console.log(await (await arg(scope)).reify())
        }
        return Undefined
    }))

    out.get('for').set(new Func(async (scope, fn, iter) => {
        const fnc = await fn(scope)

        if (fnc.type !== 'func') throw new Error(`Cannot Apply for`)

        var next: Applied
          , last: Applied

        while((next = await fnc.value(scope, iter)).type !== 'signal') {
            // we want to keep track of valid values
            // but we never want to return the stop signal
            last = next
        }

        return last! || Undefined
    }))

    out.get('list').set(new Func(async (scope, ...args) => {
        const list = await Promise.all(args.map(arg => arg(scope)))
        return new List(list.map(val => RValue(val)))
    }))

    out.get('head').set(new Func(async (scope, _list) => {
        const list = await _list(scope)

        if (list.type !== 'list') throw new Error(`Not a list`)

        return list.value[0].get() || Undefined
    }))

    out.get('with').set(new Func(async (scope, _newScope, _body) => {
        const newScope = await _newScope(scope)

        if (newScope.type !== 'scope') throw new Error(`With requires a Scope`)

        return _body(newScope)
    }))

    out.get('func').set(new Func(async (scope, body) => {
        const newScope = new Scope(scope)
        return new Func(async (scope, _args) => {
            const args = await _args(scope)

            if (args.type !== 'scope') throw new Error(`No function body!`)

            for (const key of Object.keys(args.value)) {
                newScope.get(key).set(args.get(key).get())
            }

            const out = await body(newScope)

            return out
        })
    }))

    return out
}