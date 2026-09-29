const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const mysql = require('mysql2');
const multer = require('multer');
const { exec } = require('child_process');
const path = require('path');

const app = express();
app.use(express.urlencoded({ extended: true }));

// Simple layout helper
const render = (title, body) => `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<style>body{font-family:Segoe UI, Roboto, Arial; background:linear-gradient(135deg,#0f172a,#0b1220);color:#eee;display:flex;align-items:center;justify-content:center;height:100vh;margin:0} .card{background:#fff;color:#0b1220;padding:30px;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,0.4);width:720px} pre{background:#f6f8fa;padding:12px;border-radius:6px;overflow:auto}</style></head><body><div class="card"><h1>${title}</h1>${body}</div></body></html>`;

const fs = require('fs');

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Manage one sqlite DB per challenge to ensure isolation
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbs = {};
function getDB(challengeId) {
  const id = String(challengeId);
  if (dbs[id]) return dbs[id];

  const challengeDir = path.join(dataDir, `challenge_${id}`);
  if (!fs.existsSync(challengeDir)) fs.mkdirSync(challengeDir, { recursive: true });
  const dbPath = path.join(challengeDir, `sqlmap.db`);
  const existed = fs.existsSync(dbPath);
  const db = new sqlite3.Database(dbPath);

  if (!existed) {
    db.serialize(() => {
      if (id === '5') {
        const flagPath = path.join(__dirname, 'assets', 'level_5');
        let flagVal = 'flag{vault_schematic}';
        if (fs.existsSync(flagPath)) {
          try { flagVal = fs.readFileSync(flagPath, 'utf8').trim(); } catch (e) { /* ignore */ }
        }
        db.run(`CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT, password TEXT, role TEXT)`);
        db.run(`CREATE TABLE logs (id INTEGER PRIMARY KEY, event TEXT, detail TEXT)`);
        db.run(`CREATE TABLE vault (id INTEGER PRIMARY KEY, label TEXT, secret TEXT)`);
        const users = db.prepare(`INSERT INTO users (id,username,password,role) VALUES (?,?,?,?)`);
        users.run(1, 'alice', 'alice_alice_2026', 'user');
        users.run(2, 'bob', 'bob_bob_2026', 'user');
        users.run(1337, 'admin', 'not_the_flag', 'administrator');
        users.finalize();
        const logs = db.prepare(`INSERT INTO logs (event,detail) VALUES (?,?)`);
        logs.run('login', 'alice signed in');
        logs.run('lookup', 'bob opened a record');
        logs.finalize();
        const vault = db.prepare(`INSERT INTO vault (id,label,secret) VALUES (?,?,?)`);
        vault.run(1, 'admin', flagVal);
        vault.finalize();
        return;
      }
      if (id === '8') {
        db.run(`CREATE TABLE intel (id INTEGER PRIMARY KEY, topic TEXT, detail TEXT)`);
        const insert = db.prepare(`INSERT INTO intel (id,topic,detail) VALUES (?,?,?)`);
        insert.run(1, 'endpoint', '/c/8/preview');
        insert.run(2, 'parameter', 'msg');
        insert.run(3, 'note', 'The preview page writes msg into the HTML without encoding. Inject a script tag into msg: the response then sets the cookie named flag. That value is not stored in this database.');
        insert.finalize();
        return;
      }
      const tableName = `"Challenge ${id}"`;
      db.run(`CREATE TABLE ${tableName} (id INTEGER PRIMARY KEY, username TEXT, password TEXT, role TEXT)`);
      const flagPath = path.join(__dirname, 'assets', `level_${id}`);
      let flagVal = 'flag{sqlmap_identification_intro}';
      if (fs.existsSync(flagPath)) {
        try { flagVal = fs.readFileSync(flagPath, 'utf8').trim(); } catch (e) { /* ignore */ }
      }
      if (id === '2' || id === '3' || id === '4' || id === '6') {
        const insert = db.prepare(`INSERT INTO ${tableName} (id,username,password,role) VALUES (?,?,?,?)`);
        insert.run(1, 'alice', 'alice_alice_2026', 'user');
        insert.run(2, 'bob', 'bob_bob_2026', 'user');
        insert.run(1337, 'admin', flagVal, 'administrator');
        insert.finalize();
      } else {
        const insert = db.prepare(`INSERT INTO ${tableName} (username,password,role) VALUES (?,?,?)`);
        insert.run('alice', 'alice_alice_2026', 'user');
        insert.run('bob', 'bob_bob_2026', 'user');
        insert.run('admin', flagVal, 'administrator');
        insert.finalize();
      }
    });
  }

  dbs[id] = db;
  return db;
}

app.get('/', (req, res) => {
  const challenges = [
    'Dump DB',
    'POST parameter',
    'Request file',
    'Level and risk',
    'Schema',
    'Cookie',
    'OS shell',
    'SQLi to XSS',
  ];
  const items = challenges.map((title, i) => {
    const n = i + 1;
    return `<li><a href="/challenge/${n}">${n}. ${escapeHtml(title)}</a></li>`;
  }).join('');

  res.send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>SQLMap Challenges</title>
  <style>
    body { margin: 0; background: linear-gradient(135deg, #0f172a, #0b1220); font-family: 'Segoe UI', sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    .card { background: white; color: #333; padding: 40px; border-radius: 16px; box-shadow: 0 15px 40px rgba(0,0,0,0.2); text-align: center; width: 420px; }
    h1 { margin-top: 0; color: #1e3c72; }
    .subtitle { margin-top: 8px; font-size: 0.9rem; color: #666; }
    ul { list-style: none; padding: 0; margin-top: 25px; }
    li { margin: 12px 0; }
    a { text-decoration: none; font-weight: bold; color: #1e3c72; background: #e6f0ff; padding: 10px 14px; border-radius: 8px; display: inline-block; }
    a:hover { background: #d0e2ff; }
  </style>
</head>
<body>
  <div class="card">
    <h1>SQLMap Challenges</h1>
    <div class="subtitle">Point sqlmap at a different injection point in each case.</div>
    <ul>${items}</ul>
  </div>
</body>
</html>`);
});

const SQLMAP_FLAGS = [
  ['-u', 'is the target URL.'],
  ['--batch', 'answers every sqlmap question with the default, so the scan does not stop and wait.'],
  ['--dump', 'extracts the rows from the database.'],
  ['--data', 'sends <code>id</code> in the POST body. The parameter is not in the query string.'],
  ['-r', 'is the file where you saved the raw HTTP request. The URL is already inside that file, so you do not pass <code>-u</code>.'],
  ['--level', 'sets how many tests sqlmap runs. A higher value tries more payloads, including headers and cookies.'],
  ['--risk', 'sets how intrusive the tests are. <code>3</code> allows the most intrusive ones.'],
  ['--schema', 'lists the tables and columns.'],
  ['-T', 'selects one table.'],
  ['-C', 'selects one column. With <code>-T</code> and <code>--dump</code>, it extracts just that column.'],
  ['--cookie', 'sends a cookie. Here the injectable cookie is <code>id=1</code>.'],
  ['--os-shell', 'opens a shell on the database server. From there, run <code>ls</code> and <code>cat flag</code>.'],
];

function shellBlock(command) {
  const safe = escapeHtml(command);
  return `
    <div class="shell">
      <div class="shell-bar">
        <span class="shell-label"><span class="shell-icon">&lt;/&gt;</span> Shell</span>
        <button type="button" class="shell-copy" data-cmd="${safe}" aria-label="Copy">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        </button>
      </div>
      <pre class="shell-code">${safe}</pre>
    </div>
  `;
}

function renderSqlmapCase(title, intro, path, command, newFlagNames, previousFlagNames, afterClick) {
  const byName = Object.fromEntries(SQLMAP_FLAGS);
  const flagName = (name) => `<span class="flag-name">${escapeHtml(name)}</span>`;
  const flagItems = newFlagNames.map((name) => `<p class="flag-line">${flagName(name)} ${byName[name]}</p>`).join('');
  const previousRows = previousFlagNames.map((name) => `<tr><td>${flagName(name)}</td><td>${byName[name]}</td></tr>`).join('');
  const previousTable = previousFlagNames.length ? `
    <table style="width:100%;border-collapse:collapse;margin-top:72px">
      <tr>
        <th style="text-align:left;padding:8px 12px;border-bottom:2px solid #cbd5e1;width:9rem">Flag</th>
        <th style="text-align:left;padding:8px 12px;border-bottom:2px solid #cbd5e1">What it does</th>
      </tr>
      ${previousRows.replace(/<td>/g, '<td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;vertical-align:top">')}
    </table>
  ` : '';
  const newFlagsBlock = newFlagNames.length ? flagItems : '';
  return render(title, `
    <style>
      body { height: auto; min-height: 100vh; padding: 32px 0; align-items: flex-start; }
      .card { width: 980px; max-width: calc(100vw - 48px); padding: 42px 48px; font-size: 1.2rem; }
      .card h1 { font-size: 2.4rem; }
      .card pre { font-size: 1.15rem; padding: 16px; }
      .card code { font-size: 1.05em; }
      #clicker { font-size: 1.1rem; padding: 10px 16px; }
      .shell { background: #f4f5f7; border: 1px solid #e6e8ee; border-radius: 12px; overflow: hidden; margin: 12px 0 8px; }
      .shell-bar { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px 0; color: #6b7280; font-size: 0.95rem; }
      .shell-label { display: inline-flex; align-items: center; gap: 8px; font-weight: 600; }
      .shell-icon { font-family: ui-monospace, monospace; font-size: 0.85rem; }
      .shell-copy { border: 0; background: transparent; color: #6b7280; cursor: pointer; padding: 4px; border-radius: 6px; }
      .shell-copy:hover { background: #e7e9ee; color: #111827; }
      .shell-code { margin: 0; padding: 8px 16px 14px; background: transparent; color: #1f2937; font-size: 1.05rem; white-space: pre-wrap; }
      .flag-name { display: inline-block; margin-right: 6px; padding: 2px 8px; border-radius: 6px; background: #dbeafe; color: #1e3a8a; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-weight: 700; font-size: 0.95em; }
      .flag-line { margin: 10px 0; color: #1f2937; line-height: 1.5; }
    </style>
    <p style="margin-top:0;color:#444">${intro}</p>
    <p id="clicker-wrap"><a id="clicker" href="#" style="display:inline-block;padding:10px 16px;border:1px solid #3b82f6;color:#0b61d8;border-radius:4px;background:#fff;text-decoration:none">Show the URL</a></p>
    <p id="info" style="color:#555">This writes the target in the address bar without reloading. Copy the full address, including <code>http://localhost:8016</code>.</p>
    <p>From the folder where you downloaded sqlmap, run:</p>
    ${shellBlock(command)}
    ${newFlagsBlock}
    <script>
      document.getElementById('clicker').addEventListener('click', function(e){
        e.preventDefault();
        const target = ${JSON.stringify(path)};
        history.pushState({}, '', target);
        document.getElementById('clicker-wrap').style.display = 'none';
        document.getElementById('info').innerHTML = ${JSON.stringify(afterClick || 'Address bar updated: <code>__PATH__</code>. Copy the full URL in place of <code>...</code>.')}.replace('__PATH__', target);
      });
    </script>
    <script>
      document.querySelectorAll('.shell-copy').forEach(function(button){
        button.addEventListener('click', function(){
          navigator.clipboard.writeText(button.getAttribute('data-cmd'));
        });
      });
    </script>
    <p style="margin-top:18px"><a href="/">&larr; Back to challenges</a></p>
    ${previousTable}
  `);
}

app.get('/challenge/:id', (req, res) => {
  const id = parseInt(req.params.id, 10) || 0;
  if (id === 1) {
    res.send(renderSqlmapCase(
      'Case 1 — Dump DB',
      'The GET parameter <code>id</code> is injectable. Point sqlmap at it and dump the database.',
      '/c/1/user?id=1',
      'sqlmap -u ... --batch --dump',
      ['-u', '--batch', '--dump'],
      []
    ));
  } else if (id === 2) {
    res.send(renderSqlmapCase(
      'Case 2 — POST parameter',
      'The injectable value is <code>id</code> in the POST body, not in the URL.',
      '/c/2/user',
      'sqlmap -u ... --data="id=1" --batch',
      ['--data'],
      ['-u', '--batch', '--dump']
    ));
  } else if (id === 3) {
    res.set('Set-Cookie', 'c3=capture; Path=/; HttpOnly; SameSite=Lax');
    res.send(renderSqlmapCase(
      'Case 3 — Request file',
      'Save the POST request (Burp Suite or the browser DevTools) and give that file to sqlmap. The body is <code>id=1</code>.',
      '/c/3/user',
      'sqlmap -r request.txt --batch',
      ['-r'],
      ['-u', '--batch', '--dump', '--data'],
      'Address bar updated: <code>__PATH__</code>. Save the POST request to a file and pass that file with <code>-r</code>.'
    ));
  } else if (id === 4) {
    res.send(renderSqlmapCase(
      'Case 4 — Level and risk',
      'A plain scan is not enough. sqlmap dumps this database only with a higher level and risk.',
      '/c/4/user?id=1',
      'sqlmap -u ... --batch --level=5 --risk=3 --dump',
      ['--level', '--risk'],
      ['-u', '--batch', '--dump', '--data', '-r']
    ));
  } else if (id === 5) {
    res.send(renderSqlmapCase(
      'Case 5 — Schema',
      'List the tables first, then dump only the column that holds the flag.',
      '/c/5/user?id=1',
      'sqlmap -u ... --batch --schema',
      ['--schema', '-T', '-C'],
      ['-u', '--batch', '--dump', '--data', '-r', '--level', '--risk']
    ));
  } else if (id === 6) {
    res.set('Set-Cookie', 'id=1; Path=/; SameSite=Lax');
    res.send(renderSqlmapCase(
      'Case 6 — Cookie',
      'The injectable value is the cookie <code>id</code>, not a parameter in the URL. This page sets that cookie to <code>1</code>.',
      '/c/6/user?lang=en',
      'sqlmap -u ... --cookie="id=1" --level=2 --batch --dump',
      ['--cookie'],
      ['-u', '--batch', '--dump', '--data', '-r', '--level', '--risk', '--schema', '-T', '-C']
    ));
  } else if (id === 7) {
    res.send(renderSqlmapCase(
      'Case 7 — OS shell',
      'Get a command shell through sqlmap, then run <code>ls</code> and <code>cat flag</code>.',
      '/c/7/user?id=1',
      'sqlmap -u ... --batch --os-shell',
      ['--os-shell'],
      ['-u', '--batch', '--dump', '--data', '-r', '--level', '--risk', '--schema', '-T', '-C', '--cookie']
    ));
  } else if (id === 8) {
    res.send(renderSqlmapCase(
      'Case 8 — SQLi to XSS',
      'Dump the database with sqlmap. The rows point to a reflected parameter: finish the case with a reflected XSS.',
      '/c/8/user?id=1',
      'sqlmap -u ... --batch --dump',
      [],
      ['-u', '--batch', '--dump', '--data', '-r', '--level', '--risk', '--schema', '-T', '-C', '--cookie', '--os-shell']
    ));
  } else {
      res.send(render(`Challenge ${id}`, `
        <p>Coming soon — questa challenge non è ancora implementata.</p>
        <p style="margin-top:14px"><a href="/">&larr; Torna alle challenge</a></p>
      `));
  }
});

function readFlag(id) {
  const flagPath = path.join(__dirname, 'assets', `level_${id}`);
  try {
    return fs.readFileSync(flagPath, 'utf8').trim();
  } catch (e) {
    return 'flag{sqlmap_identification_intro}';
  }
}

// Challenge-scoped endpoints: each challenge uses its own DB file
function lookupUser(res, cid, rawId) {
  const db = getDB(cid);
  res.set('X-DBMS', 'SQLite');
  const tableName = cid === '5' ? 'users' : `"Challenge ${cid}"`;
  const sql = `SELECT id, username, password, role FROM ${tableName} WHERE id = ` + rawId;

  db.all(sql, (err, rows) => {
    if (err) {
      res.set('X-DBMS', 'SQLite');
      return res.send(render('Error', `<!-- DB: SQLite -->\n<p>SQL Error:</p><pre>${escapeHtml(err.message)}</pre><p><a href="/challenge/${cid}">Back</a></p>`));
    }
    const out = rows.map(r => `<li>${Object.values(r).map(v => escapeHtml(v == null ? '' : String(v))).join(' - ')}</li>`).join('');
    res.send(render('User Lookup', `<!-- DB: SQLite -->\n<ul>${out || '<li>No rows</li>'}</ul><p><a href="/challenge/${cid}">Back</a></p>`));
  });
}

function sendRows(res, cid, rows) {
  res.set('X-DBMS', 'SQLite');
  const out = rows.map(r => `<li>${Object.values(r).map(v => escapeHtml(v == null ? '' : String(v))).join(' - ')}</li>`).join('');
  res.send(render('User Lookup', `<!-- DB: SQLite -->\n<ul>${out || '<li>No rows</li>'}</ul><p><a href="/challenge/${cid}">Back</a></p>`));
}

function challenge5(req, res) {
  const db = getDB('5');
  const id = String(req.query.id || '1');
  const host = String(req.headers.host || '');
  db.all('SELECT id, username, password, role FROM "Challenge 5" WHERE id = ?', [id], (err, baseRows) => {
    const base = err ? [] : baseRows;
    if (/randomblob|benchmark|sleep\s*\(/i.test(host)) {
      return sendRows(res, '5', base);
    }
    db.all(`SELECT id, username, password, role FROM "Challenge 5" WHERE id = ${host}`, (hostErr, hostRows) => {
      const extra = hostErr ? [] : hostRows;
      const seen = new Set();
      const rows = [];
      for (const row of base.concat(extra)) {
        const key = row.id;
        if (seen.has(key)) continue;
        seen.add(key);
        rows.push(row);
      }
      sendRows(res, '5', rows);
    });
  });
}

function cookieValue(req, name) {
  const raw = String(req.headers.cookie || '');
  const match = raw.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : '';
}

function challenge7(req, res) {
  const id = cookieValue(req, 'id');
  if (!id) {
    return res.status(400).send(render('Cookie mancante', `<p>Questa challenge legge solo il cookie <code>id</code>.</p><p><a href="/challenge/6">Back</a></p>`));
  }
  lookupUser(res, '6', id);
}

function challenge9(req, res) {
  const db = getDB('8');
  const id = String(req.query.id || '1');
  db.all(`SELECT id, topic, detail FROM intel WHERE id = ${id}`, (err, rows) => {
    res.set('X-DBMS', 'SQLite');
    if (err) {
      return res.send(render('Error', `<!-- DB: SQLite -->\n<p>SQL Error:</p><pre>${escapeHtml(err.message)}</pre><p><a href="/challenge/8">Back</a></p>`));
    }
    sendRows(res, '8', rows);
  });
}

app.get('/c/8/preview', (req, res) => {
  const msg = req.query.msg == null ? '' : String(req.query.msg);
  if (/<\s*script\b|onerror\s*=|onload\s*=|javascript\s*:/i.test(msg)) {
    res.set('Set-Cookie', 'flag=flag{script_injection_complete}; Path=/; SameSite=Lax');
  }
  res.send(render('Preview', `<p>Anteprima del messaggio:</p><div id="preview">${msg}</div><p><a href="/challenge/8">Back</a></p>`));
});

app.get('/c/:cid/user', (req, res) => {
  const cid = req.params.cid || '1';
  if (cid === '8') return challenge9(req, res);
  if (cid === '7') return challenge8(req, res);
  if (cid === '6') return challenge7(req, res);
  if (cid === '4') return challenge5(req, res);
  if (cid === '2' || cid === '3') {
    return res.status(405).send(render('POST only', `<p>Questa challenge accetta solo richieste <strong>POST</strong> con il parametro <code>id</code> nel body.</p><p><a href="/challenge/${cid}">Back</a></p>`));
  }
  lookupUser(res, cid, req.query.id || '1');
});

function hasChallenge3Capture(req) {
  return /(?:^|;\s*)c3=capture(?:;|$)/.test(String(req.headers.cookie || ''));
}

app.post('/c/:cid/user', (req, res) => {
  const cid = req.params.cid || '1';
  if (cid !== '2' && cid !== '3') {
    return res.status(404).send(render('Not found', `<p>Questa challenge non accetta POST.</p><p><a href="/challenge/${cid}">Back</a></p>`));
  }
  if (cid === '3' && !hasChallenge3Capture(req)) {
    return res.status(403).send(render('Richiesta non valida', `<p>Questa challenge accetta solo la richiesta POST catturata dal browser.</p><p><a href="/challenge/3">Back</a></p>`));
  }
  lookupUser(res, cid, req.body.id == null || req.body.id === '' ? '1' : String(req.body.id));
});

app.get('/c/:cid/raw', (req, res) => {
  const cid = req.params.cid || '1';
  if (cid === '3' || cid === '4' || cid === '5' || cid === '6' || cid === '7' || cid === '8') {
    return res.status(404).type('txt').send('not found');
  }
  const db = getDB(cid);
  const id = req.query.id || '1';
  const tableName = `"Challenge ${cid}"`;
  const baseSql = `SELECT id, username, password, role FROM ${tableName} WHERE id = `;
  const sql = baseSql + id;

  db.all(sql, (err, rows) => {
    if (err) {
      res.type('txt').send(`ERROR: ${err.message}\nQUERY: ${sql}`);
    } else {
      res.type('txt').send(JSON.stringify(rows, null, 2));
    }
  });
});

const SHELL_DIR = '/shells';
const FLAG_DIR = '/opt/flagbox';
const upload = multer({ dest: '/tmp/uploads' });

let mysqlPool = null;
function getMysql(cb) {
  if (mysqlPool) return cb(mysqlPool);
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || 'mysql',
    user: process.env.MYSQL_USER || 'ctf',
    password: process.env.MYSQL_PASSWORD || 'ctf',
    database: process.env.MYSQL_DATABASE || 'ctf',
    waitForConnections: true,
    connectionLimit: 4,
  });
  const ready = () => {
    mysqlPool = pool;
    cb(pool);
  };
  pool.query(`CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY,
    username VARCHAR(64),
    password VARCHAR(128),
    role VARCHAR(64)
  )`, (err) => {
    if (err) {
      pool.end();
      return setTimeout(() => getMysql(cb), 1000);
    }
    pool.query('SELECT COUNT(*) AS c FROM users', (err2, rows) => {
      if (err2) {
        pool.end();
        return setTimeout(() => getMysql(cb), 1000);
      }
      if (rows[0].c === 0) {
        pool.query(
          `INSERT INTO users (id,username,password,role) VALUES (1,'alice','alice_alice_2026','user'),(2,'bob','bob_bob_2026','user'),(1337,'admin','not_in_the_database','administrator')`,
          () => ready()
        );
      } else {
        ready();
      }
    });
  });
}

function challenge8(req, res) {
  const id = String(req.query.id || '1');
  const sql = `SELECT id, username, password, role FROM users WHERE id = ${id}`;
  getMysql((pool) => {
    pool.query(sql, (err, rows) => {
      res.set('X-DBMS', 'MySQL');
      const hint = `<!-- in /shells/index.php on line 12 -->`;
      if (err) {
        return res.send(render('Error', `${hint}\n<!-- DB: MySQL -->\n<p>SQL Error:</p><pre>${escapeHtml(err.message)}</pre><p><a href="/challenge/7">Back</a></p>`));
      }
      const list = Array.isArray(rows) ? rows : [];
      const out = list.map(r => `<li>${[r.id, r.username, r.password, r.role].map(v => escapeHtml(v == null ? '' : String(v))).join(' - ')}</li>`).join('');
      res.send(render('User Lookup', `${hint}\n<!-- DB: MySQL -->\n<ul>${out || '<li>No rows</li>'}</ul><p><a href="/challenge/7">Back</a></p>`));
    });
  });
}

function shellPath(urlPath) {
  const base = path.basename(String(urlPath || '').split('?')[0]);
  if (!/^tmp[a-z0-9]+\.php$/i.test(base)) return null;
  const full = path.join(SHELL_DIR, base);
  if (!full.startsWith(SHELL_DIR + path.sep) && full !== path.join(SHELL_DIR, base)) return null;
  if (!fs.existsSync(full)) return null;
  return full;
}

function handleShell(req, res) {
  const file = shellPath(req.path);
  if (!file) return res.status(404).type('txt').send('not found');
  const src = fs.readFileSync(file, 'utf8');
  if (src.includes('sqlmap file uploader')) {
    if (req.file) {
      const dir = String((req.body && req.body.uploadDir) || '');
      const normalized = path.resolve(dir);
      if (normalized !== SHELL_DIR && normalized !== SHELL_DIR + '/') {
        return res.status(403).type('txt').send('denied');
      }
      const dest = path.join(SHELL_DIR, path.basename(req.file.originalname || 'upload.bin'));
      fs.copyFileSync(req.file.path, dest);
      fs.chmodSync(dest, 0o755);
      return res.type('txt').send('File uploaded');
    }
    return res.type('html').send('<form><b>sqlmap file uploader</b><br><input name=file type=file><br>to directory: <input type=text name=uploadDir value="/shells/"><input type=submit name=upload value=upload></form>');
  }
  if (src.includes('$_REQUEST["cmd"]') || src.includes('$_REQUEST[\'cmd\']')) {
    const cmd = String(req.query.cmd || (req.body && req.body.cmd) || '');
    return exec(cmd, { cwd: FLAG_DIR, timeout: 8000, shell: '/bin/sh' }, (err, stdout, stderr) => {
      const output = `${stdout || ''}${stderr || ''}`;
      res.type('html').send(`<pre>${escapeHtml(output)}</pre>`);
    });
  }
  return res.status(404).type('txt').send('not found');
}

app.get('/c/7/user', challenge8);
app.get(/\.php$/i, handleShell);
app.post(/\.php$/i, upload.single('file'), handleShell);

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`SQLMap intro server listening on ${port}`));
