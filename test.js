'use strict';
const family = require('./index');
const test = require('tape');
const fetch = require('node-fetch');
const rm = require('rimraf');

const config = {
  tokens: {testuser: 'token-test'}
};
const testUser = Object.keys(config.tokens)[0];
const testToken = config.tokens[testUser];

test('advanced', async t => {
  const fname = 'test-db2';
  const db = family.setup(fname);
  t.ok(db);
  const port = 2000;
  const server = family.serve(db, port, config);
  t.ok(server);

  // an actual test
  let ok = await (fetch(`http://localhost:${port}`).then(res => res.ok));
  t.ok(ok);

  const headers = {
    'X-Level-Family-User': testUser,
    'X-Level-Family-Token': testToken,
    'Content-Type': 'application/json'
  };
  ok = await (fetch(`http://localhost:${port}/since?since=0&user=${testUser}&app=life`, {headers}).then(res => res.ok));
  t.ok(ok);

  let raw = await fetch(`http://localhost:${port}/`,
                        {headers, method: 'POST', body: JSON.stringify({user: testUser, app: 'life', payload: 'hi'})});
  t.ok(raw.ok);

  raw = await fetch(`http://localhost:${port}/since?since=0&user=${testUser}&app=life`, {headers});
  t.ok(raw.ok);
  let response = await raw.json();
  t.ok(response.length > 0);
  t.ok(response[0].key.startsWith(testUser + '/life/'));
  t.equal(response[0].value, 'hi');

  rm(fname, e => {
    if (e) { throw e; }
  });
  server.close();
  t.end();
});