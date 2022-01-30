const { fork } = require('child_process');
const { join } = require('path');
const { isFunc } = require('tm-is');
const IpcBus = require('../index');

const PUB_METHODS = ['request', 'response', 'task'];

describe('Basic FORK IPC BUS class tests', () => {
  test('IpcBus should be defined', () => expect(IpcBus).toBeDefined());
  test('IpcBus should be a constructor function', () => {
    expect(isFunc(IpcBus)).toBe(true);
  });
  describe('IpcBus instance has required public methods.', () => {
    const testIpcBus = new IpcBus();
    PUB_METHODS.forEach((method) => {
      test(`IpcBus instance should has '${method}' method.`, () => {
        expect(isFunc(testIpcBus[method])).toBe(true);
      });
    });
  });
});

describe('FORK IPC BUS class unit tests', () => {
  describe('validateMessage method tests', () => {
    test('Should return false if nothing passed', () => {
      expect(IpcBus.validateMessage()).toBe(false);
    });
    test('Should return false if empty object passed', () => {
      expect(IpcBus.validateMessage({})).toBe(false);
    });  
    test('Should return false if header object do not has required fields', () => {
      expect(IpcBus.validateMessage({ header: {} })).toBe(false);
    });
    test('Should return false if header object has unknown type', () => {
      expect(IpcBus.validateMessage({ header: { cmd: 'test', type: 20 } })).toBe(false);
    });
    test('Should return true if header object has all required fields and they are valid', () => {
      expect(IpcBus.validateMessage({ header: { cmd: 'test', type: 2 } })).toBe(true);
    });
    test('Should return false if header object do not has an id field for request', () => {
      expect(IpcBus.validateMessage({ header: { cmd: 'test', type: 0 } })).toBe(false);
    });
    test('Should return false if header object do not has an id field for response', () => {
      expect(IpcBus.validateMessage({ header: { cmd: 'test', type: 1 } })).toBe(false);
    });
  });
});

describe('Functional tests', () => {
  const workerProcess = fork(join(__dirname, 'worker.js'));
  const testIpcBus = new IpcBus({ process: workerProcess, reqTimeout: 1000 })

  test('Should make a successful test request to the worker', async () => {
    const a = 5;
    const b = 7;
    const result = await testIpcBus.request('+', { a, b })
    expect(result).toBe(a + b);
  });

  test('Should make a successful test request to the worker 100 times', async () => {
    let result;
    for (let i = 0; i < 100; i += 1) {
      result = await testIpcBus.request('+', { a: i, b: i })
      expect(result).toBe(i + i);
    }
  });

  test('Should throw an error if request to the worker timed out', async () => {
    const cmd = 'testTimeout';
    await expect(testIpcBus.request(cmd))
      .rejects.toThrow(`Request '${cmd}' timeout!`)
  });

  test('Should emit invalidMessage event if incoming message validation failed', (done) => {
    testIpcBus.once('invalidMessage', () => done());
    testIpcBus.task('sendInvalidMessage');
  });

  test('Should get ok response on exit request to the worker', async () => {
    const exit = await testIpcBus.request('exit');
    expect(exit).toBe('ok');
  });
});