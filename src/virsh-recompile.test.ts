import * as assert from 'assert'
import { program } from "./ast"
import { compileAll } from "./recompile";

const {test} = require('tap')
const grammar = require('../virsh-lang')

function pass(s:TemplateStringsArray) {
    const [line] = s
    test(`Should Pass ${line}`, async () => {
        const ast = grammar.parse(line)
    })
    return line
}

function fail(s:TemplateStringsArray) {
    const [line] = s
    test(`Should Fail ${line}`, async () => {
        try {
            grammar.parse(line)
        } catch (e) {
            return
        }
        throw new Error(`Invalid ${line}`)
    })
}

const IGNORE = null
const templates = [
    pass`/`,
    pass`/a`,
    pass`//`,
    pass`/a/b/c`,
    pass`///`,
    pass`//a`,
    pass`/a/b//c`,
    fail`/a/../`,

    pass`a->b`,
    pass`a->b->c`,

    pass`a.b`,
    pass`a.b->c.d->e`,
    fail`a->`,
    fail`a.`,
    fail`a->.`,

    pass`"hello"`,
    pass`'hello'`,
    fail`'hello`,

    fail`]`,

    pass`a = b`,
    fail`a = `,
    fail`= a`,
    pass`a = a->b`,

    pass`a == b`,
    pass`a != b`,
    fail`!=b`,
    fail`!=`,
    fail`d!=`,
    pass`a->g == b.c`,
    pass`h == 4 = g.h->c = a->g == b.c`, // This feels like it shouldn't work
    fail`a-> == b.c`,
    fail`a->g == .c`,

    pass`a b`,
    pass`a b->c`,
    pass`a.c b->c`,

    fail`()`,
    pass`(a)`,
    pass`(a->b)->c`,

    pass`{ a = b }`,

    pass`a; b`,
    pass`{ a; b }`,
    pass`(a; b)`,

    pass`for (i = 1; i < 10; i++) { i }`,
    pass`i.b.c++`,
    pass`i!!`,
    pass`i.b.c!!`,
    pass`for (i <- x.y->c) { i }`,
    pass`for (i <- g <- c) { i }`,

    pass`//lights!!`,
    pass`//lights = !/lights`,
    pass`for (light <- //lights) { light.state!! }`,

    pass`1 # ignore this` && IGNORE,
    pass`trap FOOBAR { true }`,

    fail`a, b`,
    pass`(a, b)`,
    pass`open = (a, b) => {
        true
    }` && IGNORE,
    pass`open = (a, b) => { true } => d`,

    pass`1`,
    pass`1.1`,
    pass`1`,

    fail`()`
]

function recompile(s:TemplateStringsArray) {
    const [line] = s
    test(`Should Pass ${line}`, async () => {
        var ast, out
        try {
            var ast, out

            ast = grammar.parse(line)
            out = compileAll(ast)

            assert.equal(out, line)
        } catch(e) {
            console.error(line)
            console.error(ast)
            throw e
        }
    })
}

recompile`a`
recompile`/`
recompile`/as/asdf`
recompile`a.b`
recompile`a->b`
recompile`a->b.c->d`
recompile`a; b`
recompile`a.b; b->c.d; /asdf/asdf`
recompile`a b`
recompile`a->d.d b.c /as.d->d`
recompile`a = b`
recompile`a = b.c d /e`
recompile`a { b }`
recompile`(a = b)`
recompile`(a = 12)`
recompile`i < 10`
recompile`i++`
recompile`for (i = 0; i < 10; i++) { i }`


for(const temp of templates.filter(x => x)) {
    recompile(<any> [temp])
}
