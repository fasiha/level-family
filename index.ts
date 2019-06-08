import express from 'express';
import {readFileSync} from 'fs';
import level, {LevelUp} from 'levelup';

const leveldown = require('leveldown');
const DEFAULTSEPARATOR = '/';
export function setup(name: string) { return level(leveldown(name)); }
function leftpad(x: number, digits: number) {
  let xs = x.toString();
  return '0'.repeat(Math.max(0, digits - xs.length)) + xs;
}
export function write(db: LevelUp<any>, prefix: string, payload: string) {
  return db.put(prefix + DEFAULTSEPARATOR + leftpad(Date.now(), 16), payload);
}
export type KeyVal = {
  key: string,
  value: string
};
export function getSinceBatch(db: LevelUp<any>, prefix: string, epoch: number): Promise<KeyVal[]> {
  return new Promise((resolve, reject) => {
    let kvs: KeyVal[] = [];
    db.createReadStream({gt: prefix + DEFAULTSEPARATOR + leftpad(epoch, 16), keyAsBuffer: false, valueAsBuffer: false})
        .on('data', x => kvs.push(x))
        .on('error', err => reject(err))
        .on('close', () => resolve(kvs));
  });
}
function reqToUser(req: express.Request, config: any) {
  const user = req.get('X-Level-Family-User');
  const token = req.get('X-Level-Family-Token');
  if (user && token && config.tokens[user] && config.tokens[user] === token) { return user; }
  return '';
}
export function serve(db: LevelUp<any>, port: number, config: any) {
  const app = express();
  app.use(express.json());
  app.get('/', (req, res) => res.send('Post `{user, app, payload}` to /.'));
  app.post('/', (req, res) => {
    const {payload, user, app} = req.body;
    const authUser = reqToUser(req, config);
    if (!(user && authUser && user === authUser)) {
      res.sendStatus(401);
    } else if (payload && user && app) {
      res.sendStatus(200);
      write(db, user + DEFAULTSEPARATOR + app, payload);
    } else {
      res.sendStatus(400);
    }
  });
  app.get('/since', async (req, res) => {
    const {since, user, app} = req.query;
    const authUser = reqToUser(req, config);
    if (!(user && authUser && user === authUser)) {
      res.sendStatus(401);
    } else if (since && user && app) {
      res.json(await getSinceBatch(db, user + DEFAULTSEPARATOR + app, since));
    } else {
      res.sendStatus(400);
    }
  });
  return app.listen(port, () => console.log(`Express listening on port ${port}!`));
}
if (module === require.main) {
  const config = JSON.parse(readFileSync('.env', 'utf8'));
  const server = serve(setup('default-db'), 4321, config);
}