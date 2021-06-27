#!/usr/bin/env node

const fs = require('fs')
const { spawn } = require('child_process')
const chokidar = require('chokidar')
const program = require('caporal')
const chalk = require('chalk')
const readline = require('readline').createInterface({
	input: process.stdin,
})

const debounce = (fn, wait = 0) => {
	let timerId
	return (...args) => {
		if (timerId) clearTimeout(timerId)
		timerId = setTimeout(() => fn.apply(null, args), wait)
	}
}

const execProcess = (filename) => {
	console.log(chalk.green.bold(`>>> Starting \`node ${filename}\``))
	return spawn('node', [filename], { stdio: 'inherit' })
}

program
	.version('0.0.1')
	.argument('[filename]', 'Name of a file to execute')
	.option(
		'--ignore <files>',
		'Enter comma separated file and folder names to ignore',
		program.String,
		'node_modules'
	)
	.action(async ({ filename = 'index.js' }, { ignore }) => {
		try {
			await fs.promises.access(filename)
		} catch (err) {
			throw new Error(`Could not find the file ${filename}`)
		}

		let proc
		const start = debounce(() => {
			if (proc) {
				proc.kill()
				console.log(chalk.yellow.bold('>>> Restarting due to changes..'))
			} else {
				console.log(chalk.cyan.bold(`>>> To restart at any time enter \`rs\``))
			}
			proc = execProcess(filename)
		}, 100)

		const ignoreRegExp = new RegExp(ignore.replace(/,/g, '|'))

		chokidar
			.watch('.', { ignored: ignoreRegExp })
			.on('add', start)
			.on('change', start)
			.on('unlink', start)

		readline.on('line', (input) => {
			if (input === 'rs') {
				if (proc) {
					proc.kill()
				}

				proc = execProcess(filename)
			}
		})
	})

program.parse(process.argv)
