const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(bodyParser.json());

const db = new sqlite3.Database(':memory:');
db.serialize(() => {
    db.run("CREATE TABLE users (id INTEGER, username TEXT, password TEXT, role TEXT)");
    db.run("CREATE TABLE products (id INTEGER, name TEXT, price INTEGER)");
    db.run("CREATE TABLE flags (name TEXT, value TEXT)");

    db.run("INSERT INTO users VALUES (0, 'guest', 'guest', 'user')");
    db.run("INSERT INTO users VALUES (7, 'admin', 'flag{i_LIKE_sql_injections}', 'admin')");
    
    db.run("INSERT INTO products VALUES (1, 'Coffee', 5), (2, 'Tea', 3), (3, 'Energy Drink', 4)");
    db.run("INSERT INTO flags VALUES ('CHALLENGE_4', 'flag{limit_doesnt_limit_subqueries}')");
});

const renderLayout = (title, content, color = "#c0ffee" /* it made me laugh too much */) => `
<html>
<head>
    <title>${title}</title>
    <style>
        body { background: #0a0a0a; color: ${color}; font-family: 'Courier New', monospace; display: flex; justify-content: center; padding-top: 50px; }
        .terminal { background: #1a1a1a; border: 1px solid ${color}; padding: 30px; border-radius: 5px; width: 600px; box-shadow: 0 0 20px rgba(0,255,65,0.2); }
        h1 { border-bottom: 1px solid ${color}; padding-bottom: 10px; }
        input, button, textarea { background: #000; border: 1px solid ${color}; color: ${color}; padding: 10px; margin: 10px 0; width: 100%; }
        button { cursor: pointer; font-weight: bold; }
        button:hover { background: ${color}; color: #000; }
        .result { background: #000; padding: 15px; border: 1px dashed ${color}; margin-top: 20px; white-space: pre-wrap; }
        a { color: ${color}; text-decoration: none; display: block; margin: 10px 0; }
        .hint { color: #888; font-size: 0.8rem; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="terminal">
        ${content}
    </div>
</body>
</html>`;

app.get('/masquerade', (req, res) => {
    let mask = parseInt(req.cookies.user_id);
    
    if (isNaN(mask)) {
        res.cookie('user_id', '10', { path: '/masquerade' });
        mask = 10;
    }

    let status = "Logged in as: Guest (ID " + Math.log10(mask) + ")";
    let flag = "";

    if (mask == ("10000000")) {
        status = "Logged in as: ADMIN (ID 7)";
        flag = `<div class="result">ACCESS GRANTED: flag{a_decimal_bitmask}</div>`;
    }

    res.send(renderLayout('Challenge 1: Masquerade', `
        <h1>Masquerade</h1>
        <p>Current Status: <strong>${status}</strong></p>
        <p>Your session cookie is: <code>${mask}</code></p>
        ${flag}
        <div class="hint">Hint: The system checks if you are the user number 7... how are the users represented?</div>
    `));
});

app.get('/filteredaway', (req, res) => {
    const input = req.query.payload || "";
    const sanitized = input.replace(/[\(\)]/g, "");

    res.send(renderLayout('Challenge 2: Filtered Away', `
        <h1>Filtered Away</h1>
        <script>
            const oldAlert = window.alert;
            window.alert = function(n) { if (n == 1) oldAlert('flag{XSS_without_parentheses}'); else oldAlert('alert 1 pls');}
        </script>
        <form>
            <input name="payload" placeholder="Say something..." value="${sanitized}">
            <button>Echo</button>
        </form>
        <div class="result">Result: ${sanitized}</div>
        <div class="hint">Goal: Trigger alert(1). The filter may cause some troubles...</div>
    `));
});

app.get('/ilikeinjections', (req, res) => {
    const search = req.query.q || "";
    const query = `SELECT name, price FROM products WHERE name LIKE '%${search}%'`;

    db.all(query, (err, rows) => {
        let output = "";
        if (err) output = "SQL Error: " + err.message;
        else output = rows.map(r => `${r.name}: $${r.price}`).join("\n");

        res.send(renderLayout('I LIKE injections!', `
            <h1>Product Search</h1>
            <form>
                <input name="q" placeholder="Search products...">
                <button>Search</button>
            </form>
            <div class="result">Query: ${query}\n\nResults:\n${output}</div>
            <div class="hint">Find the admin's password.</div>
        `));
    });
});



app.get('/limit-api', (req, res) => {
    const limit = req.query.limit || "3";
    const query = `SELECT name, price FROM products LIMIT ${limit}`;
    
    db.all(query, (err, rows) => {
        let output = "";
        if (err) output = "SQL Error: " + err.message;
        else output = rows.map(r => `${r.name}: $${r.price}`).join("\n");

        res.send(renderLayout('Off Limits', `
            <h1>Product API</h1>
            <p>Show top N products:</p>
            <form>
                <input name="limit" placeholder="3">
                <button>Fetch</button>
            </form>
            <div class="result">Query: ${query}\n\nOutput:\n${output}</div>
            <div class="hint">The flag is the only row in the 'flags' table, field 'value'. UNION won't work... what about subquery injection?</div>
        `));
    });
});

app.get('/', (req, res) => {
    res.send(renderLayout('Midterm Mixed Labs', `
        <h1>Challenges:</h1>
        <a href="/masquerade">> 1. Masquerade </a>
        <a href="/filteredaway">> 2. Filtered Away</a>
        <a href="/ilikeinjections">> 3. Who LIKEs injections?</a>
        <a href="/limit-api">> 4. Off LIMITs</a>
    `));
});

app.listen(3000, () => console.log("Mixed CTF Lab running at http://localhost:3000"));
