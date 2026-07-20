const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

const db = new sqlite3.Database(':memory:');

db.serialize(() => {
    db.run("CREATE TABLE users (id INTEGER, username TEXT, password TEXT, role TEXT)");
    db.run("CREATE TABLE secrets (id INTEGER, title TEXT, content TEXT)");
    db.run("CREATE TABLE products (id INTEGER, name TEXT, description TEXT)");

    db.run("INSERT INTO users VALUES (1, 'me', 'super_secure_password', 'user')");
    db.run("INSERT INTO users VALUES (2, 'admin', 'p4ssw0rd_2026', 'admin')");
    db.run("INSERT INTO secrets VALUES (1, 'Flag 1', 'flag{cookie_monster_sqli}')");
    db.run("INSERT INTO secrets VALUES (2, 'Flag 2', 'flag{boolean_logic_god}')");
    db.run("INSERT INTO secrets VALUES (3, 'Flag 3', 'flag{patience_is_a_virtue}')");
    db.run("INSERT INTO products VALUES (1, 'Espresso', 'Dark and bold.')");
});

const layout = (title, content) => `
<html>
<head>
    <title>${title}</title>
<style>
    body { margin: 0; background: #701a75; font-family: 'Segoe UI', sans-serif; color: #e2e8f0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    .card { background: #1e293b; padding: 40px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); width: 600px; border: 1px solid #334155; }
    h1 { color: #f0abfc; margin-top: 0; }
    input { width: 100%; padding: 12px; margin: 10px 0; background: #0f172a; border: 1px solid #334155; color: #f0abfc; border-radius: 6px; }
    button { width: 100%; padding: 12px; background: #f0abfc; color: #701a75; border: none; font-weight: bold; cursor: pointer; border-radius: 6px; margin-top: 10px; }
    .result { background: #0f172a; padding: 15px; border-radius: 6px; margin-top: 20px; border-left: 4px solid #f0abfc; white-space: pre-wrap; font-family: monospace; font-size: 0.9rem; }
    a { color: #f0abfc; text-decoration: none; font-size: 0.9rem; display: inline-block; margin-top: 20px; }
</style>
</head>
<body>
    <div class="card">
        <h1>${title}</h1>
        ${content}
    </div>
</body>
</html>
`;

app.get('/challenge1', (req, res) => {
    let trackingId = req.cookies.trackingId;
    if (!trackingId) {
        res.cookie('trackingId', '1');
        trackingId = '1';
    }

    const query = `SELECT name FROM products WHERE id = ${trackingId}`;
    db.all(query, (err, rows) => {
        let display = rows && rows.length > 0 ? rows[0].name : "No product tracked.";
        res.send(layout("Challenge 1: The Cookie Jar", 
            `<p>We are tracking your interests via cookies. There is no form here. Can you still extract data from <code>secrets</code>? Suggestion: column <code>content</code>, <code>id=1</code></p>
             <div class="result">Active Cookie: trackingId=${trackingId}\nOutput: ${display}</div>`));
    });
});

app.get('/challenge2', (req, res) => {
    const id = req.query.id || "1";
    const query = `SELECT * FROM products WHERE id = 1 AND (${id})`;
    
    db.get(query, (err, row) => {
        let status = (row) ? "[v] Product is in stock." : "[x] Out of stock or invalid ID.";
        res.send(layout("Challenge 2: True or False?", 
            `<p>The UI only tells you if a product is in stock. Use boolean logic to guess the secret content.</p>
             <form><input name="id" placeholder="Condition (e.g. 1=1)"><button>Check</button></form>
             <div class="result">Status: ${status}</div>`));
    });
});

app.get('/challenge3', (req, res) => {
    const id = req.query.id || "1";
    const start = Date.now();
    
    const query = `SELECT name FROM products WHERE id = ${id}`;
    
    db.get(query, (err, row) => {
        const end = Date.now();
        const duration = (end - start);
        res.send(layout("Challenge 3: Race Against Time", 
            `<p>This page is silent. It won't give you data or errors. Your only hint is how long the server takes to respond.</p>
             <form><input name="id" placeholder="ID"><button>Search</button></form>
             <div class="result">Server processed request in: ${duration}ms</div>`));
    });
});

app.get('/', (req, res) => {
    res.send(layout("Advanced SQLi Lab", `
        <ul style="text-align: left; line-height: 2;">
            <li><a href="/challenge1">1. SQLi via Cookies</a></li>
            <li><a href="/challenge2">2. Boolean-based Blind SQLi</a></li>
            <li><a href="/challenge3">3. Time-based Blind SQLi</a></li>
        </ul>
    `));
});

app.listen(3000, () => console.log("Advanced Lab running on http://localhost:3000"));
