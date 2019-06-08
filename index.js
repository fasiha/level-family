"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const fs_1 = require("fs");
const levelup_1 = __importDefault(require("levelup"));
const leveldown = require('leveldown');
const DEFAULTSEPARATOR = '/';
function setup(name) { return levelup_1.default(leveldown(name)); }
exports.setup = setup;
function leftpad(x, digits) {
    let xs = x.toString();
    return '0'.repeat(Math.max(0, digits - xs.length)) + xs;
}
function write(db, prefix, payload) {
    return db.put(prefix + DEFAULTSEPARATOR + leftpad(Date.now(), 16), payload);
}
exports.write = write;
function getSinceBatch(db, prefix, epoch) {
    return new Promise((resolve, reject) => {
        let kvs = [];
        db.createReadStream({ gt: prefix + DEFAULTSEPARATOR + leftpad(epoch, 16), keyAsBuffer: false, valueAsBuffer: false })
            .on('data', x => kvs.push(x))
            .on('error', err => reject(err))
            .on('close', () => resolve(kvs));
    });
}
exports.getSinceBatch = getSinceBatch;
function reqToUser(req, config) {
    const user = req.get('X-Level-Family-User');
    const token = req.get('X-Level-Family-Token');
    if (user && token && config.tokens[user] && config.tokens[user] === token) {
        return user;
    }
    return '';
}
function serve(db, port, config) {
    const app = express_1.default();
    app.use(express_1.default.json());
    app.get('/', (req, res) => res.send('Post `{user, app, payload}` to /.'));
    app.post('/', (req, res) => {
        const { payload, user, app } = req.body;
        const authUser = reqToUser(req, config);
        if (!(user && authUser && user === authUser)) {
            res.sendStatus(401);
        }
        else if (payload && user && app) {
            res.sendStatus(200);
            write(db, user + DEFAULTSEPARATOR + app, payload);
        }
        else {
            res.sendStatus(400);
        }
    });
    app.get('/since', (req, res) => __awaiter(this, void 0, void 0, function* () {
        const { since, user, app } = req.query;
        const authUser = reqToUser(req, config);
        if (!(user && authUser && user === authUser)) {
            res.sendStatus(401);
        }
        else if (since && user && app) {
            res.json(yield getSinceBatch(db, user + DEFAULTSEPARATOR + app, since));
        }
        else {
            res.sendStatus(400);
        }
    }));
    return app.listen(port, () => console.log(`Express listening on port ${port}!`));
}
exports.serve = serve;
if (module === require.main) {
    const config = JSON.parse(fs_1.readFileSync('.env', 'utf8'));
    const server = serve(setup('default-db'), 4321, config);
}
