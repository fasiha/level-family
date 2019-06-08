const USAGE = `USAGE:
$ node [thisScript.js] USER USER2 ...
to (re)set the token for USER, USER2, etc. in ".data/config.json".
This file should be valid JSON or should not exist.
`;
const {readFileSync, writeFileSync} = require('fs');
const {parse} = require('path');
const mkdirp = require('mkdirp').sync;
const DEFAULTPATH = '.data/config.json';
function readEnv(fname = DEFAULTPATH) {
  try {
    return JSON.parse(readFileSync(fname, 'utf8'));
  } catch (e) {
    if (e instanceof SyntaxError && e.message.startsWith('Unexpected token')) {
      throw new Error('non-JSON .env found. Stopping.');
    }
    if (e instanceof Error && e.message.startsWith('ENOENT')) { return {}; }
  }
  return {};
}
function writeEnv(obj, fname = DEFAULTPATH) { writeFileSync(fname, JSON.stringify(obj)); }
function newToken(user, token, obj) {
  if (!('tokens' in obj && typeof obj.tokens === 'object')) { obj.tokens = {}; }
  obj.tokens[user] = token;
  return obj;
}
function randomToken() { return Array.from(Array(5), _ => Math.random().toString(36)).join('').replace(/0\./g, ''); }
function update(user, token, fname = DEFAULTPATH) {
  writeEnv(newToken(user, token || randomToken(), readEnv(fname)), fname);
};
module.exports = update;
if (module === require.main) {
  mkdirp(parse(DEFAULTPATH).dir);
  if (process.argv.length >= 3) {
    for (const user of process.argv.slice(2)) { update(user); }
  } else {
    console.error(USAGE);
  }
}