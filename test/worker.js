/**
 * Test child process worker.
 */

const process = require('process');
const ForkIpcBus = require('../index');

// Will loop until got an exit request from a parent process.
const interval = setInterval(() => { }, 5000);

const ipcBus = new ForkIpcBus();

ipcBus.on('request', (req) => {
  const { header: { id, cmd }, payload } = req;
  switch (cmd) {
    case '+': {
      return ipcBus.response(id, cmd, payload.a + payload.b);
    }
    case 'exit':
      ipcBus.response(id, cmd, 'ok');
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
