const net = require('net')
const port = process.env.PORT ? (process.env.PORT - 100) : 3000
const { spawn } = require('child_process')

process.env.ELECTRON_START_URL = `http://localhost:${port}`
process.env.DEBUG = 'true'

const client = new net.Socket();

let electron
const tryConnection = () => client.connect({port: port}, () => {
    client.end();
    if(!electron) {
      console.info('Starting electron...')
      electron = spawn('npm', ['run', 'electron'])

      electron.stdout.on('data', (data) => {
        console.log(data.toString());
      });

      electron.stderr.on('data', (data) => {
        console.error(data.toString());
      });

      electron.on('close', (code) => {
        console.info(`electron exited with code ${code}`);
      });
    }
  }
);

tryConnection()

client.on('error', (error) => {
  setTimeout(tryConnection, 1000)
})
