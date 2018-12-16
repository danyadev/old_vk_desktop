'use strict';

const util = require('util');
const EventEmitter = require('events').EventEmitter;

class Longpoll {
  constructor(data) {
    for(let key in data) this[key] = data[key];
    this.loop();
  }

  async loop() {
    let link = `https://${this.server}?act=a_check&key=${this.key}&ts=${this.ts}&wait=15&mode=234&version=3`,
        data = JSON.parse(await utils.request(link));

    if(data.failed == 1) {
      let history = await vkapi.method('messages.getLongPollHistory', {
        ts: this.ts || data.ts,
        pts: this.pts,
        onlines: 1,
        lp_version: 3
      });

      data.updates = history.response.history;
      this.pts = history.response.new_pts;
    }

    this.ts = data.ts || this.ts;
    this.pts = data.pts || this.pts;

    if([2, 3].includes(Number(data.failed))) {
      let lp = await vkapi.method('messages.getLongPollServer', { lp_version: 3 }),
          history = await vkapi.method('messages.getLongPollHistory', {
            ts: lp.response.ts,
            pts: this.pts,
            onlines: 1,
            lp_version: 3
          });

      this.key = lp.response.key;
      this.ts = lp.response.ts;
      this.server = lp.response.server;
      this.pts = history.response.new_pts;

      data.updates = history.response.updates;
    }

    for(let update of data.updates || []) {
      this.emit('event', update.splice(0, 1)[0], update);
    }

    this.loop();
  }
}

util.inherits(Longpoll, EventEmitter);

module.exports = Longpoll;
