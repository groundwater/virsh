#!/usr/bin/env node

import {EvalMachine} from './index'
import {createInterface} from 'readline'
import * as fs from 'fs'

async function main() {
    const [file] = process.argv.slice(2)

    if (file) {
        const script = fs.readFileSync(file, 'utf-8')
        const vm = new EvalMachine()
        const out = await vm.eval(script)
    } else {

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

    }
}

main()
.catch((e) => {
    console.error(e)
    process.exit(1)
})
