#!/usr/bin/env node

import {EvalMachine} from './index'
import {createInterface} from 'readline'

const vm = new EvalMachine()
const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
})

rl.setPrompt('> ')
rl.on('line', async (line) => {
    try {
        const out = await vm.eval(line)
        console.log(out)
    } catch(e) {
        console.error(e)
    } finally {
        rl.prompt()
    }
})
rl.prompt()
