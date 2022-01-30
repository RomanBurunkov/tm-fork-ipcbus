const process = require('process');
const EventEmitter = require('events');
const { v4: uuidv4 } = require('uuid');
const { isObject, isEmpty } = require('tm-is');

/**
 * Each message is an object with the following structure:
 * { header: { [id: string], cmd: string, type: number }, [payload] }
 * id, payload are required fields only for several types of messages.
 * id fielad is required for requests/response communication.
 * TYPES array maps text type representation to a number by array index:
 * 0 - request, 1 - response, etc.
 */
const TYPES = [
  'request', 'response', 'event', 'task', 'message',
];

const DEF_REQ_TIMEOUT = 5000;

const REQUESTS = Symbol('Key for requests array');
const MSG_HANDLER = Symbol('Process messages handler');

module.exports = class FORK_IPC_BUS extends EventEmitter {
  /**
   * @param {Object} opts Options object
   * @param {number} opts.reqTimeout Request timeout in msec(Default DEF_REQ_TIMEOUT).
   * @param {Object} opts.process process to communicate(Default global process).
   */
  constructor(opts = {}) {
    super();
    this[REQUESTS] = [];
    this.reqTimeout = opts.reqTimeout || DEF_REQ_TIMEOUT;
    this[MSG_HANDLER] = (msg) => this.messageHandler(msg);
    this.process = opts.process || process;
    this.process.on('message', this[MSG_HANDLER]);
  }

  /**
   * Validates msg.
   * @param {Object} msg Message object.
   * @returns True or False in case message validation failed.
   */
  static validateMessage(msg) {
    if (!isObject(msg) || !isObject(msg.header)) return false;
    const { header } = msg;
    if (isEmpty(header.cmd) || isEmpty(header.type) || isEmpty(TYPES[header.type])) return false;
    const type = TYPES[header.type];
    switch (type) {
      case 'request':
      case 'response':
        return !isEmpty(header.id);
      default: return TYPES.includes(type);
    }
  }

  /**
   * Cleans up all bus data, timeouts, etc.
   */
  destroy() {
    // Clean up pending requests.
    this[REQUESTS].forEach((reqItm) => {
      clearTimeout(reqItm.timeout);
      reqItm.reject(new Error('Request canceled!'));
    });
    this[REQUESTS] = [];
    // Remove event listeners.
    this.process.removeListener('message', this[MSG_HANDLER]);
  }

  send(data) {
    this.process.send(data);
  }

  /**
   * Respond on pending requests(end up request promise).
   * @param {string} id Request unique id.
   * @param {string} method resolve/reject method to end up pending request promise.
   * @param {*} result Request results.
   */
  respondOnRequest(id, method, result) {
    const reqIndex = this[REQUESTS].findIndex((itm) => itm.id === id);
    if (reqIndex === -1) return;
    const [request] = this[REQUESTS].splice(reqIndex, 1);
    clearTimeout(request.timeout);
    request[method](result);
  }

  messageHandler(msg) {
    if (!FORK_IPC_BUS.validateMessage(msg)) {
      this.emit('invalidMessage', msg);
      return;
    }
    const { header, payload } = msg;
    const type = TYPES[header.type];
    this.emit(type, msg);
    if (type === 'response') {
      this.respondOnRequest(header.id, 'resolve', payload);
    }
  }

  setRequestTimeout(id, cmd) {
    return setTimeout(() => {
      this.respondOnRequest(id, 'reject', new Error(`Request '${cmd}' timeout!`));
    }, this.reqTimeout);
  }

  /**
   * Send a request through IPC channel.
   * @param {string} cmd Request command.
   * @param {*} payload Request data.
   * @returns {Promise} Promise which resolves after getting a response on the request.
   */
  request(cmd, payload) {
    const id = uuidv4();
    const header = { id, cmd, type: 0 };
    return new Promise((resolve, reject) => {
      this[REQUESTS].push({
        id, resolve, reject, timeout: this.setRequestTimeout(id, cmd),
      });
      try {
        this.send({ header, payload });
      } catch (err) {
        this.respondOnRequest(id, 'reject', err);
      }
    });
  }

  /**
   * Send a response message on the corresponding request.
   * @param {string} id Request id.
   * @param {string} cmd Request command.
   * @param {*} payload Request results to send within response message.
   */
  response(id, cmd, payload) {
    const header = { id, cmd, type: 1 };
    this.send({ header, payload });
  }

  /**
   * Send a task message.
   * @param {string} cmd Task command.
   * @param {*} payload Task data if needed.
   */
  task(cmd, payload) {
    const header = { cmd, type: 3 };
    this.send({ header, payload });
  }
};
