/**
 * Test child process worker.
 */

const process = require('process');
const ForkIpcBus = require('../index');

// Will loop until got an exit request from a parent process.
const interval = setInterval(() => { }, 5000);

const ipcBus = new ForkIpcBus();
ipcBus.on('request', (req) => {
  const { header, payload } = req;
  switch (header.cmd) {
    case '+': {
      const result = payload.a + payload.b;
      ipcBus.response(header.id, header.cmd, result);
      break;
    }
    case 'exit':
      ipcBus.response(header.id, header.cmd, 'ok');
      clearInterval(interval);
      process.exit();
      break;
    default: break;
  }
});
