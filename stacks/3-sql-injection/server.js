const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));

// --- DATABASE SETUP ---
const db = new sqlite3.Database(':memory:');

db.serialize(() => {
    db.run("CREATE TABLE users (id INTEGER, username TEXT, password TEXT, role TEXT)");
    db.run("CREATE TABLE secrets (id INTEGER, content TEXT)");
    db.run("CREATE TABLE products (id INTEGER, name TEXT, description TEXT)");

    db.run("INSERT INTO users VALUES (1, 'me', 'super_secure_password', 'user')");
    db.run("INSERT INTO users VALUES (2, 'admin', 'p4ssw0rd_2026', 'admin')");
    db.run("INSERT INTO secrets VALUES (1337, 'flag{sql_dialect_detective}')");
    db.run("INSERT INTO products VALUES (1, 'Espresso', 'Dark and bold.')");
    db.run("INSERT INTO products VALUES (2, 'Latte', 'Smooth and creamy.')");
    db.run("INSERT INTO products VALUES (3, 'Cappuccino', 'Frothy and rich.')");
});

// --- UI LAYOUT ---
const layout = (title, content) => `
<html>
<head>
    <title>${title}</title>
<style>
    body { margin: 0; background: #7f1d1d; font-family: 'Segoe UI', sans-serif; color: #e2e8f0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    .card { background: #1e293b; padding: 40px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); width: 600px; border: 1px solid #334155; }
    h1 { color: #ef4444; margin-top: 0; }
    input { width: 100%; padding: 12px; margin: 10px 0; background: #0f172a; border: 1px solid #334155; color: #ef4444; border-radius: 6px; }
    button { width: 100%; padding: 12px; background: #ef4444; color: #0f172a; border: none; font-weight: bold; cursor: pointer; border-radius: 6px; margin-top: 10px; }
    .result { background: #0f172a; padding: 15px; border-radius: 6px; margin-top: 20px; border-left: 4px solid #ef4444; white-space: pre-wrap; font-family: monospace; font-size: 0.9rem; }
    a { color: #ef4444; text-decoration: none; font-size: 0.9rem; display: inline-block; margin-top: 20px; }
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

app.all('/login', (req, res) => {
    const { username, password } = req.body;
    let result = "Waiting for input...";
    if (username) {
        const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
        db.get(query, (err, row) => {
            result = row ? `Logged in as: ${row.username}` : "Invalid login.";
            res.send(layout("1. Login Bypass", `your user: me<br>your password: super_secure_password<br><form method="POST"><input name="username" placeholder="Username"><input name="password" type="password" placeholder="Password"><button>Login</button></form><div class="result">Query: ${query}\nResult: ${result}</div>`));
        });
    } else res.send(layout("1. Login Bypass", `your user: me<br>your password: super_secure_password<br><form method="POST"><input name="username" placeholder="Username"><input name="password" type="password" placeholder="Password"><button>Login</button></form>`));
});

app.get('/version', (req, res) => {
    const id = req.query.id || "1";
    const query = `SELECT name FROM products WHERE id = ${id}`;
    db.all(query, (err, rows) => {
        let display = rows ? rows.map(r => r.name).join('\n') : "No results.";
        res.send(layout("2. Extract Version", 
            `<p>Find the version. (Hint: <code>@@version</code> is for MSSQL, use the SQLite function.)</p>
             <form><input name="id" placeholder="ID"><button>Search</button></form>
             <div class="result">Output: ${display}</div>`));
    });
});

app.get('/schema', (req, res) => {
    const id = req.query.id || "1";
    const query = `SELECT name, description FROM products WHERE id = ${id}`;
    db.all(query, (err, rows) => {
        let display = rows ? rows.map(r => `${r.name}`).join('\n') : "No results.";
        res.send(layout("3. Schema Extraction", 
            `<p>Extract the names of the tables.</p>
             <form><input name="id" placeholder="ID"><button>Search</button></form>
             <div class="result">Output: ${display}</div>`));
    });
});

app.get('/union', (req, res) => {
    const id = req.query.id || "1";
    const query = `SELECT name, description FROM products WHERE id = ${id}`;
    db.all(query, (err, rows) => {
        let display = rows ? rows.map(r => `${r.name}: ${r.description}`).join('\n') : "No results.";
        res.send(layout("4. Union-Based Extraction", 
            `<p>Extract data from the most interesting table you found in the previous task.</p>
             <form><input name="id" placeholder="ID"><button>Search</button></form>
             <div class="result">Output: ${display}</div>`));
    });
});

app.get('/', (req, res) => {
    res.send(layout("Basic SQLi in SQLite", `
        <ul style="text-align: left; line-height: 2;">
            <li><a href="/login">1. Classic Login Bypass</a></li>
            <li><a href="/version">2. Extract Version</a> (Hint: <code>sqlite_version()</code>)</li>
            <li><a href="/schema">3. Extract Table Names</a> (Hint: <code>sqlite_master</code>)</li>
            <li><a href="/union">4. Union-Based SQLi for data exfiltration</a></li>
        </ul>
    `));
});

app.listen(3000, () => console.log("SQLi running on http://localhost:3000"));
