'use strict';
const family = require('./index');
const test = require('tape');
const fetch = require('node-fetch');
const rm = require('rimraf');

test('basic', async t => {
  const fname = 'test-db1';
  const db = family.setup(fname);
  t.ok(db);
  const port = 1999;
  const server = family.serve(db, port);
  t.ok(server);

  // very dumb test here
  let ok = await (fetch(`http://localhost:${port}`).then(res => res.ok));
  t.ok(ok);

  rm(fname, e => {
    if (e) { throw e; }
  });
  server.close();
  t.end();
});

test('advanced', async t => {
  const fname = 'test-db2';
  const db = family.setup(fname);
  t.ok(db);
  const port = 2000;
  const server = family.serve(db, port);
  t.ok(server);

  // an actual test
  let ok = await (fetch(`http://localhost:${port}`).then(res => res.ok));
  t.ok(ok);

  ok = await (fetch(`http://localhost:${port}/since?since=0&user=elf&app=life`).then(res => res.ok));
  t.ok(ok);

  let raw = await fetch(`http://localhost:${port}/`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({user: 'elf', app: 'life', payload: 'hi'})
  });
  t.ok(raw.ok);

  raw = await fetch(`http://localhost:${port}/since?since=0&user=elf&app=life`);
  t.ok(raw.ok);
  let response = await raw.json();
  t.ok(response.length > 0);
  t.ok(response[0].key.startsWith('elf/life/'));
  t.equal(response[0].value, 'hi');

  rm(fname, e => {
    if (e) { throw e; }
  });
  server.close();
  t.end();
});