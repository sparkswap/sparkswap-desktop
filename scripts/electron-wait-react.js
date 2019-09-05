const net = require('net')
const { spawn } = require('child_process')

const client = new net.Socket()

const ELECTRON_DEV_PORT = 5000

let electron

const tryConnection = () => client.connect({port: ELECTRON_DEV_PORT}, () => {
    client.end()

    if(!electron) {
      console.info('Starting electron...')
      electron = spawn('npm', ['run', 'electron'])
      electron.stdout.on('data', data => console.log(data.toString()))
      electron.stderr.on('data', data => console.error(data.toString()))
      electron.on('close', code => console.info(`electron exited with code ${code}`))
    }
  }
);

tryConnection()

client.on('error', (_err) => setTimeout(tryConnection, 1000))
