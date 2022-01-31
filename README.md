# tm-fork-ipcbus

Node fork inter process communication bus.
Allow communucation between parent and child processes in async request/response way.

## Installation

```npm install tm-fork-ipcbus```

## Test

 - ```npm test```
 - ```npm run test: coverage``` Tests with a coverage report.

## Available options

You can pass options with an options object to the constructor.

```
const IpcBus = require('tm-fork-ipcbus');

const ipc = new IpcBus(options);
```

 - `requestTimeout` Timeot in msecs for requests(default 5000 msecs).
 - `process` For parent process it should be a link to the child process. For child processes this option should be omitted.

 ## Methods

 - request
 - response
 - event
 - task
 - message

## Events.

Each bus instance is an event emitter with the following events:

 - request
 - response
 - event
 - task
 - message
 - invalidMessage
