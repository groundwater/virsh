import * as assert from 'assert'
import { inspect } from 'util'

import { Bool, compileEval, Func, Num, Scope, Str } from './eval'
import { makeDefaultGlobal } from './global'
import { EvalMachine } from '.'
import { program } from "./ast";

const {test} = require('tap')

function pass(line: string, expect: any) {
    test(`Should Pass ${line}`, async () => {
        var ast, unbound, out
        const evalMachine = new EvalMachine()
        const start = Date.now()
        try {
            ast = evalMachine.parse(line)
            unbound = await evalMachine.evalAST(ast, makeScope())
            out = await evalMachine.reify(unbound)
            assert.deepEqual(await out, expect)
        } catch(e) {
            if (ast) console.log(inspect(ast, false, null))
            if (unbound) console.log(inspect(unbound, false, null))
            throw e
        }
        const end = Date.now()
        console.log(`Took ${end - start}ms`)
    })
    return line
}

function makeScope(): Scope {
    const out: Scope = makeDefaultGlobal()

    out.get('/a').set(new Str(Promise.resolve("/A")))
    out.get('/switch').set(new Str(Promise.resolve("on")))
    out.get('a').set(new Str(Promise.resolve("A")))
    out.get('b').set(new Bool(Promise.resolve(false)))
    out.get('n').set(new Num(Promise.resolve(1)))

    const p = new Scope()
    p.get('name').set(new Str('Jay'))
    p.get('age').set(new Num(28))
    out.get('p').set(p)

    const fs = new Scope()
    fs.get('open').set(new Func(async (scope, fname) => {
        return new Str("Hello")
    }))
    out.get('fs').set(fs)

    return out
}

pass(`1`, 1)
pass(`"Hello"`, "Hello")
pass(`a`, 'A')
pass(`i = 1`, '1')

pass(`b!!`, false)
pass(`b!!; b`, true)
pass(`b!!; b!!`, true)

pass(`n++`, 1)
pass(`n++; n`, 2)
pass(`n++; {n++}; n`, 3)
pass(`p->name`, "Jay")
pass(`p->name = 1; p->name`, 1)
pass(`p->name = 1; p->name++; p->name`, 2)

pass(`{i = 1}; i`, undefined)
pass(`{i = 1; i}`, 1)
pass(`if a { p->name }`, "Jay")
pass(`if false { p->name } { p->age }`, 28)
pass(`/a`, '/A')
pass(`0..1`, [0, 1])
pass(`j = 0; for i <- 0..10 { j = i }; j`, 10)
pass(`j = 0; for i <- 0..10 { j = i }; i`, undefined)
pass(`for i <- 0..10 { i }`, 10)
pass(`for i <- (1, 2, 3) { i }`, 3)
pass(`(1, 2, 3)`, [1,2,3])
pass(`(1,)`, [1])
pass(`(1)`, 1)
pass(`j = 0;
for i <- 1..10 {
    j = i;
    j++;
    j
}`, 11)
pass(`1 + 2`, 3)
pass(`"HELLO " + "WORLD"`, "HELLO WORLD")
pass(`"HELLO " + 1`, "HELLO 1")
pass(`1-1`, 0)
pass(`i = 0;
for j <- 1..99 {
    i = i + j
};
if i > 10 {
    i--
};
i
`, 4949)
pass(`1 < 10`, true)
pass(`1 > 10`, false)
pass(`i = 0;
k = {
    for j <- 1..99 {
        j + i
    }
};
k
`, 99)
pass(`{a: 1}`, {a: 1})
pass(`x = {a: 1};
x->a`, 1)
pass(`person = {
    name: "FOOFOO",
    age: 25,
    job: {
        location: "SF",
        title: "CXO"
    }
};
person->job->title`, "CXO")
pass(`person = {
    name: "FOOFOO",
    age: 25
}`, {
    name: "FOOFOO",
    age: 25
})
pass(`person = (1, 2, 3);
person[0]`, 1)
pass(`person = {
    job: {
        skills: ("Fast", "Smelly")
    }
};
person->job->skills[0]`, "Fast")
pass(`fs.open "file"`, "Hello")
pass(`//okay = true;
//okay!!`, true)
pass(`person = {};
x = 'name';
person[x] = 'Kim';
person->name`, 'Kim')
pass(`person = {};
x = 'name';
person['name'] = 'Kim';
person->name`, 'Kim')
pass(`lamp = {
    test: 'okay',
    switch: /switch
};
lamp->switch`, "on")
pass(`p = {
    j: 0
};
p->out = for i<- 1..10 {
    p->j = p->j + i
};
p.out`, 55)
pass(`name = "Foo";
"Hello {name}"
`, "Hello Foo")
pass(`person = {
    name: "Foo"
};
"Hello {person->name}"
`, "Hello Foo")
pass(`person = {
    name: "Foo",
    age: 38
};
"Hello {person->name} you are {person->age}"
`, "Hello Foo you are 38")

pass(`person = {
    name: "Foo",
    age: 38
};
"Hello {person->name} you are {person->age}"
`, "Hello Foo you are 38")

pass(`
out = 0;
for j <- 1..10 {
for i <- 1..10 {
    out = out + i + j
}}`, 1100)

pass(`list 2 $ list 3`, [2, [3]])

pass(`list 2 (list 3) (list 4)`, [2, [3], [4]])
pass(`list 2 $ list 3 $ list 4`, [2, [3 , [4]]])
pass(`list 2 $ list 3 (list 4)`, [2, [3 , [4]]])
pass(`list 2 (list 3 (list 4))`, [2, [3 , [4]]])
pass(`
out = 0;
for j <- 1..10 $
for i <- 1..10 {
    out = out + i + j
}`, 1100)
pass(`
if true $
if true 12 34
`, 12)
pass(`
if false
{ if true 12 34 }
40
`, 40)
pass(`
if true $
if false 12 34
`, 34)
pass(`
head (list 1 2 3)
`, 1)
pass(`
sc = {name: 'jay'};
with sc {
    name
}
`, 'jay')
pass(`
with {name: 'jay'} {
    name
}
`, 'jay')
pass(`
if false {
    "NOPE"
}
else {
    "OK"
}
`, "OK")
pass(`100 % 10`, 0)
pass(`121 % 9`, 4)
