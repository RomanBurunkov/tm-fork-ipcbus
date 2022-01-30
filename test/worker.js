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
      return ipcBus.response(header.id, header.cmd, result);
    }
    case 'exit':
      ipcBus.response(header.id, header.cmd, 'ok');
      clearInterval(interval);
      return process.exit();
    default: return false;
  }
});

ipcBus.on('task', (task) => {
  const { header } = task;
  switch (header.cmd) {
    case 'sendInvalidMessage': return ipcBus.send('This is an invalid message!');
    default: return false;
  }
});
