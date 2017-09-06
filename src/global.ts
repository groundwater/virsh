import { Applied, Async, Bool, Func, List, LValue, Num, RValue, Scope, Str, Undef, Undefined } from './eval';
import { list } from './ast';
import { readFile, readdir } from 'fs';

export function makeUnsafeScope(): Scope {
    const out: Scope = makeDefaultGlobal()

    const io = new Scope()

    io.get('stdin').set(new List(async function*(): AsyncIterableIterator<RValue> {
            const data: string[] = []
            var awaits: () => any
            process.stdin.on('data', (datum) => {
                data.push(datum.toString())
                if (awaits) awaits()
            })
            while(true) {
                var next
                while(next = data.shift()) {
                    yield RValue(new Str(next.trim()))
                }
                await new Promise(pass => awaits = pass)
            }
        }()
    ))

    const fs = new Scope()

    fs.get('read').set(new Func(async (scope, fname) => {
        const name = await (await fname(scope)).reify()
        return new Promise<Applied>((pass, fail) => {
            readFile(name, 'utf-8', (err, data) => {
                if (err) return fail(err)

                pass(new Str(data))
            })
        })
    }))

    fs.get('ls').set(new Func(async (scope, fname) => {
        return new Promise<Applied>((pass, fail) => {
            readdir('.', (err, list) => {
                if (err) fail(err)
                pass(new List(list.map(list => RValue(new Str(list)))))
            })
        })
    }))

    fs.get('lines').set(new Func(async (scope, fname) => {
        const name = await (await fname(scope)).reify()
        return new Promise<Applied>((pass, fail) => {
            readFile(name, 'utf-8', (err, data) => {
                if (err) return fail(err)

                pass(new List(data.trim().split(/\n/).map(line => {
                    return RValue(new Str(line))
                })))
            })
        })
    }))

    out.get('fs').set(fs)
    out.get('io').set(io)

    return out
}
export function makeDefaultGlobal(): Scope {
    const out: Scope = new Scope()

    out.get('test').set(new Func(async (scope, ...args) => {
        return new Num(1)
    }, 0))

    out.get('if').set(new Func(async (_scope, cond, ifTrue, ifFalse) => {
        const scope = new Scope(_scope)
        const test = await cond(scope)

        if (await test.reify()) {
            return ifTrue(scope)
        } else {
            return ifFalse ? ifFalse(scope) : Undefined
        }
    }))

    out.get('write').set(new Func(async (scope, ...args) => {
        for(const arg of args) {
            var out = await (await arg(scope)).reify()
            process.stdout.write(String(out))
        }
        return Undefined
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

        for await(const next of list) {
            return next.get()
        }
        return Undefined
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