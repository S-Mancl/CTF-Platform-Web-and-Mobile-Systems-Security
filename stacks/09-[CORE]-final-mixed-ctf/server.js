const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(bodyParser.json());


const sessions = {}; // SESSION STORE DO NOT TOUCH!!!

const users = {
    'admin': { 
        inventory: [
            { id: 'flag', name: 'A pirate flag!', type: 'flag', value: 'flag{pr1v4t33r1ng_7hr0ugh_7h3_w3b}' },
        ]
    },
    'attacker': { 
        inventory: [
            { id: 'demo', name: 'Chekhov\'s Gun', type: 'demo' },
        ]
    },
    'dummy_user': { inventory: [] }
};

const getSHA256 = (text) => crypto.createHash('sha256').update(text).digest('hex');


const authenticate = (req, res, next) => {
    const sid = req.cookies.sid;
    if (sid && sessions[sid]) {
        req.user = sessions[sid];
        next();
    } else {
        res.redirect('/login');
    }
};

/*
const renderInventory = (username) => {
    const inv = users[username].inventory;
    if (inv.length === 0) return "<p><i>Your inventory is empty.</i></p>";
    
    return `
        <table style="width:100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background: #eee; text-align: left;">
                <th style="padding: 10px;">Item Name</th>
                <th style="padding: 10px;">Type</th>
                <th style="padding: 10px;">Details</th>
            </tr>
            ${inv.map(item => `
                <tr style="border-bottom: 1px solid #ddd;">
                    <td style="padding: 10px;"><strong>${item.name}</strong></td>
                    <td style="padding: 10px;"><span style="font-size: 0.8em; padding: 2px 6px; border-radius: 4px; background: ${item.type === 'flag' ? '#ffeeba' : '#e2e3e5'};">${item.type.toUpperCase()}</span></td>
                    <td style="padding: 10px; font-family: monospace; color: #666;">${item.type === 'flag' ? item.value : item.id}</td>
                </tr>
            `).join('')}
        </table>
    `;
};

const layout = (title, content, user = null) => `
<html>
<head>
    <title>${title} | Majestic Theatre</title>
    <style>
        body { margin: 0; padding: 0; background: #1a1a1a; color: #fdfdfd; font-family: 'Garamond', serif; }
        .container { max-width: 900px; margin: 40px auto; background: #2c0000; padding: 40px; border: 3px solid #d4af37; border-radius: 5px; box-shadow: 0 0 30px rgba(0,0,0,0.8); }
        .nav { border-bottom: 2px solid #d4af37; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; }
        h1, h2 { color: #d4af37; text-transform: uppercase; letter-spacing: 2px; text-shadow: 2px 2px 4px #000; }
        .challenge-box { background: rgba(0,0,0,0.4); border: 1px solid #d4af37; padding: 25px; border-radius: 4px; }
        table { border-collapse: collapse; width: 100%; color: #eee; }
        th { background: #d4af37; color: #2c0000; padding: 10px; }
        td { padding: 12px; border-bottom: 1px solid #444; }
        input, button { padding: 12px; margin: 10px 0; border-radius: 0; border: 1px solid #d4af37; background: #333; color: white; }
        button { background: #d4af37; color: #000; font-weight: bold; cursor: pointer; transition: 0.3s; }
        button:hover { background: #fff; box-shadow: 0 0 15px #d4af37; }
        a { color: #d4af37; text-decoration: none; font-style: italic; }
    </style>
</head>
<body>
    <div class="container">
        <div class="nav">
            <span>🎭 <strong>Majestic Backstage Portal</strong></span>
            ${user ? `<span>Current Performer: <b>${user}</b> | <a href="/logout">Exit Stage Left</a></span>` : ''}
        </div>
        ${content}
    </div>
</body>
</html>
`;

const renderLayout = (title, content, color = "#c0ffee"  it made me laugh too much ) => `
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

// --- UI HELPERS ---
const protocol_layout = (lvl) => `
<html>
<head>
    <style>
        body { background: #0f172a; color: #94a3b8; font-family: 'Fira Code', monospace; display: flex; flex-direction: column; height: 100vh; margin: 0; }
        .header { background: #1e293b; padding: 1rem; border-bottom: 2px solid #ef4444; }
        .panes { display: flex; flex: 1; overflow: hidden; }
        .pane { flex: 1; border: 1px solid #334155; display: flex; flex-direction: column; }
        .pane-header { background: #1e293b; padding: 10px; color: #fff; font-weight: bold; text-align: center; border-bottom: 1px solid #334155; }
        .log-area { flex: 1; overflow-y: auto; padding: 15px; font-size: 0.85rem; background: #000; }
        .controls { background: #1e293b; padding: 20px; border-top: 1px solid #334155; }
        nav a { color: #ef4444; margin-right: 15px; text-decoration: none; border: 1px solid #ef4444; padding: 2px 8px; border-radius: 4px; }
        input, select, button { background: #0f172a; border: 1px solid #475569; color: #fff; padding: 8px; margin: 5px; border-radius: 4px; }
        button { background: #ef4444; color: #000; font-weight: bold; cursor: pointer; }
    </style>
</head>
<body>
    <div class="header">
        <nav>
            <a href="/?lvl=1">1. Password</a><a href="/?lvl=2">2. Replay</a>
            <a href="/?lvl=3">3. Reflection</a><a href="/?lvl=4">4. D-Sacco</a>
            <a href="/?lvl=5">5. Lowe's</a>
        </nav>
        <p>Current Objective: <b>Level ${lvl}</b></p>
    </div>
    <div class="panes">
        <div class="pane"><div class="pane-header">ALICE</div><div class="log-area">${renderLogs('alice')}</div></div>
        <div class="pane"><div class="pane-header">TRUDY (MITM)</div><div class="log-area">${renderLogs('trudy')}</div></div>
        <div class="pane"><div class="pane-header">BOB</div><div class="log-area">${renderLogs('bob')}</div></div>
    </div>
    <div class="controls">
        <form method="POST" action="/send">
            <input type="hidden" name="lvl" value="${lvl}">
            From: <select name="from"><option>Trudy</option><option>Alice</option></select>
            To: <select name="to"><option>Bob</option><option>Alice</option></select>
            Msg: <input name="payload" placeholder="Type message..." required autofocus>
            <button>INJECT</button>
        </form>
    </div>
</body>
</html>`;*/

const renderInventory = (username) => {
    const inv = users[username].inventory;
    const accent = "#c0ffee";
    
    if (inv.length === 0) return `<p style="color: #666; font-style: italic;">> [SYSTEM]: Your inventory is empty.</p>`;
    
    return `
        <table style="width:100%; border-collapse: collapse; margin: 20px 0; border: 1px solid ${accent}; font-family: 'Courier New', monospace;">
            <tr style="background: ${accent}; color: #000; text-align: left;">
                <th style="padding: 10px; text-transform: uppercase;">Item Name</th>
                <th style="padding: 10px; text-transform: uppercase;">Type</th>
                <th style="padding: 10px; text-transform: uppercase;">Details</th>
            </tr>
            ${inv.map(item => `
                <tr style="border-bottom: 1px solid ${accent};">
                    <td style="padding: 10px; color: ${accent};"><strong>${item.name}</strong></td>
                    <td style="padding: 10px;">
                        <span style="font-size: 0.8em; padding: 2px 6px; border: 1px solid ${accent}; background: ${item.type === 'flag' ? accent : 'transparent'}; color: ${item.type === 'flag' ? '#000' : accent};">
                            ${item.type.toUpperCase()}
                        </span>
                    </td>
                    <td style="padding: 10px; color: ${accent}; opacity: 0.8;">${item.type === 'flag' ? item.value : item.id}</td>
                </tr>
            `).join('')}
        </table>
    `;
};

const layout = (title, content, user = null) => {
    const accent = "#c0ffee";
    return `
<html>
<head>
    <title>${title} | Root Shell</title>
    <style>
        body { margin: 0; padding: 0; background: #0a0a0a; color: ${accent}; font-family: 'Courier New', monospace; }
        .container { max-width: 900px; margin: 40px auto; background: #1a1a1a; padding: 40px; border: 1px solid ${accent}; border-radius: 5px; box-shadow: 0 0 20px rgba(192, 255, 238, 0.1); }
        .nav { border-bottom: 1px solid ${accent}; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; font-size: 0.9rem; }
        h1, h2 { color: ${accent}; text-transform: uppercase; letter-spacing: 1px; border-left: 5px solid ${accent}; padding-left: 15px; }
        .challenge-box { background: #000; border: 1px dashed ${accent}; padding: 25px; border-radius: 0; }
        table { border-collapse: collapse; width: 100%; color: ${accent}; }
        th { background: ${accent}; color: #000; padding: 10px; text-transform: uppercase; }
        td { padding: 12px; border-bottom: 1px solid rgba(192, 255, 238, 0.2); }
        input, button { padding: 12px; margin: 10px 0; border: 1px solid ${accent}; background: #000; color: ${accent}; font-family: 'Courier New', monospace; }
        button { background: ${accent}; color: #000; font-weight: bold; cursor: pointer; transition: 0.2s; text-transform: uppercase; }
        button:hover { background: #000; color: ${accent}; box-shadow: 0 0 10px ${accent}; }
        a { color: ${accent}; text-decoration: underline; }
        a:hover { background: ${accent}; color: #000; }
    </style>
</head>
<body>
    <div class="container">
        <div class="nav">
            <span>// <strong>TERMINAL_SESSION_01</strong></span>
            ${user ? `<span>USER: <b>${user}</b> | <a href="/logout">TERMINATE_SESSION</a></span>` : ''}
        </div>
        ${content}
    </div>
</body>
</html>
`;
};

const protocol_layout = (lvl) => {
    const accent = "#c0ffee";
    return `
<html>
<head>
    <style>
        body { background: #0a0a0a; color: ${accent}; font-family: 'Courier New', monospace; display: flex; flex-direction: column; height: 100vh; margin: 0; }
        .header { background: #1a1a1a; padding: 1rem; border-bottom: 2px solid ${accent}; }
        .panes { display: flex; flex: 1; overflow: hidden; gap: 2px; background: ${accent}; }
        .pane { flex: 1; background: #0a0a0a; display: flex; flex-direction: column; }
        .pane-header { background: #1a1a1a; padding: 10px; color: ${accent}; font-weight: bold; text-align: center; border-bottom: 1px solid ${accent}; text-transform: uppercase; letter-spacing: 2px; }
        .log-area { flex: 1; overflow-y: auto; padding: 15px; font-size: 0.85rem; background: #000; color: ${accent}; }
        .controls { background: #1a1a1a; padding: 20px; border-top: 1px solid ${accent}; }
        nav a { color: ${accent}; margin-right: 15px; text-decoration: none; border: 1px solid ${accent}; padding: 4px 10px; border-radius: 0; font-size: 0.8rem; }
        nav a:hover { background: ${accent}; color: #000; }
        input, select, button { background: #000; border: 1px solid ${accent}; color: ${accent}; padding: 8px; margin: 5px; font-family: 'Courier New', monospace; }
        button { background: ${accent}; color: #000; font-weight: bold; cursor: pointer; text-transform: uppercase; }
        button:hover { background: #000; color: ${accent}; }
        .log-entry { border-left: 2px solid ${accent}; padding-left: 8px; margin-bottom: 8px; opacity: 0.9; }
    </style>
</head>
<body>
    <div class="panes">
        <div class="pane"><div class="pane-header">ALICE_NODE</div><div class="log-area">${renderLogs('alice')}</div></div>
        <div class="pane"><div class="pane-header">TRUDY_MITM</div><div class="log-area">${renderLogs('trudy')}</div></div>
        <div class="pane"><div class="pane-header">BOB_NODE</div><div class="log-area">${renderLogs('bob')}</div></div>
    </div>
    <div class="controls">
        <form method="POST" action="/send">
            <input type="hidden" name="lvl" value="${lvl}">
            SOURCE: <select name="from"><option>Trudy</option><option>Alice</option></select>
            DEST: <select name="to"><option>Bob</option><option>Alice</option></select>
            DATA_PACKET: <input name="payload" placeholder="Enter hex/string..." required autofocus>
            <button>EXECUTE_INJECTION</button>
        </form>
    </div>
</body>
</html>`;
};

const renderLayout = (title, content, color = "#c0ffee"  /*it made me laugh too much */) => `
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



app.get('/login', (req, res) => {
    res.send(layout("Login", `
        <h2>Member Login</h2>
        <form method="POST">
            <input type="text" name="username" placeholder="Username (attacker)" required>
            <input type="password" name="password" placeholder="Password (attacker)" required>
            <button type="submit">Login</button>
        </form>
    `));
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if ((username === 'attacker' && password === 'attacker') || (username === 'admin' && password === 'admin_pass_1337')) {
        const sid = crypto.randomBytes(16).toString('hex');
        sessions[sid] = username;
        res.cookie('sid', sid, { httpOnly: true, sameSite: 'none', secure: true });
        return res.redirect('/');
    }
    res.send("Invalid Credentials");
});

app.get('/logout', (req, res) => {
    res.clearCookie('sid');
    res.redirect('/login');
});

const executeTransfer = (req, res) => {
    const sender = req.user;
    const { item_id, to } = (req.method === 'POST' ? req.body : req.query);

    if (!users[to]) return res.send("Recipient does not exist.");

    const itemIndex = users[sender].inventory.findIndex(i => i.id === item_id);
    if (itemIndex === -1) return res.send("You do not own this item.");

    const item = users[sender].inventory.splice(itemIndex, 1)[0];
    users[to].inventory.push(item);

    if (req.method === 'GET') {
        return res.status(204).send(); 
    }

    res.send(layout("Transfer Complete", `
        <h3>Success!</h3>
        <p>You transferred <b>${item.name}</b> to <b>${to}</b>.</p>
        <a href="/">Return to Dashboard</a>
    `, sender));
};


const handleTokenLevel = (req, res, level, tokenGen, desc) => {
    if (req.method === 'POST') {
        if (req.body.token !== tokenGen(req.user)) return res.status(403).send("Invalid CSRF Token");
        return executeTransfer(req, res);
    }
    res.send(layout(`Level ${level}`, `
        <h2>Level ${level}: ${desc}</h2>
        ${renderInventory(req.user)}
        <div class="challenge-box">
            <form method="POST">
                <input type="hidden" name="token" value="${tokenGen(req.user)}">
                <input type="text" name="item_id" placeholder="Item ID">
                <input type="text" name="to" placeholder="Recipient">
                <button type="submit">Secure Transfer</button>
            </form>
            <div class="hint">The server is checking a token. Can you predict the Admin's token? your purpose is to get the item called <em>flag</em></div>
        </div>
    `, req.user));
};

app.all('/privateering', authenticate, (req, res) => handleTokenLevel(req,res, 42, (u) => Buffer.from(getSHA256(u)).toString('base64'), "Security through too many function?"));




const db = new sqlite3.Database(':memory:');
db.serialize(() => {
    db.run("CREATE TABLE users_and_flags (id INTEGER, username TEXT, password TEXT, role TEXT)");
    db.run("CREATE TABLE products (id INTEGER, name TEXT, price INTEGER, value INTEGER)");

    db.run("INSERT INTO users_and_flags VALUES (7, 'admin', 'flag{you_sorted_your_way_out!}', 'admin')");
    
    db.run("INSERT INTO products VALUES (1, 'a', 2, 1), (2, 'b', 1, 2)");
});

function naiveFilter(input) {
  const blacklist = [
    "script",
    "img",
    "onerror",
    "onload",
    "javascript:",
    "input"
  ];

  let output = input;

  blacklist.forEach(term => {
    const regex = new RegExp(term, "gi");
    output = output.replace(regex, "");
  });

  return output;
}

app.get('/sillydefenses', (req, res) => {
    const input = req.query.payload || "";
    const sanitized = naiveFilter(input);

    res.send(renderLayout('Challenge 1: Silly filter', `
        <h1>Silly filter</h1>
        <script>
            const oldAlert = window.alert;
            window.alert = function(n) { if (n == 1) oldAlert('flag{silly_filters_allow_XSSs}'); else oldAlert('alert 1 pls');}
        </script>
        <form>
            <input name="payload" placeholder="Say something..." value="${sanitized}">
            <button>Echo</button>
        </form>
        <div class="result">Result: ${sanitized}</div>
        <div class="hint">Goal: Trigger alert(1). The filter may cause some troubles...</div>
    `));
});

app.get('/sortyourwayout', (req, res) => {
    search = req.query.q || "";
    if (search.toLowerCase().includes("union")) search = "name"
    const query = `select name, price, value from products order by ${search} limit 2`

    db.all(query, (err, rows) => {
        let output = "";
        if (err) output = "SQL Error: " + err.message;
        else output = rows.map(r => `${r.name}: $${r.price} :: $${r.value}`).join("\n");

        res.send(renderLayout('', `
            <h1>Product Search</h1>
            <form>
                <input name="q" placeholder="by which field you want to sort? 'price' or 'value'...">
                <button>Sort</button>
            </form>
            <div class="result">Query: ${query}\n\nResults:\n${output}</div>
            <div class="hint">Find the admin's password.</div>
        `));
    });
});


let logs = { alice: [], bob: [], trudy: [] };
let state = { challenge: null, expectedResponse: null, currentLvl: null };

const addLog = (who, msg) => {
    const target = who.toLowerCase();
    logs[target].push({ t: new Date().toLocaleTimeString(), msg });
};

const initLevel = (lvl) => {
    state = { challenge: null, expectedResponse: null, currentLvl: lvl,solvepoint: 0 };
    logs = { alice: [], bob: [], trudy: [] };
    
    addLog('trudy', "Welcome to the Protocol Lab! In this lab, you are a Dolev-Yao attacker, ready to hijack somehow the connection between Alice and Bob in order to ensure that Bob considers you as Alice. You can inject messages from Alice to Bob and viceversa, and see all the exchanged messages. You're acting as a man-in-the-middle! Bob is authenticating Alice merely through an exchanged password... but maybe will ask for something more. Log in as Alice!");
    addLog('trudy', "SNIFFED: Alice -> Bob: 'I am Alice, PW: AliceLovesCrypt0!'");
    addLog('trudy', "SNIFFED: Bob -> Alice: 'I am Bob, PW: BobHatesCrypt0!'");
};

const renderLogs = (who) => logs[who].map(l => `<div style="margin-bottom:8px"><small style="color:#64748b">${l.t}</small><br>${l.msg}</div>`).reverse().join('');

app.get('/protocol', (req, res) => {
    if (state.currentLvl !== 1) initLevel(1);
    res.send(protocol_layout(1));
});



app.post('/send', (req, res) => {
    const { from, to, payload, lvl } = req.body;
    const msg = payload.trim();
    addLog('trudy', `<span style="color:#f87171">INJECTED:</span> ${from} -> ${to}: "${msg}"`);

    switch (state.solvepoint) {
        case 0:
            if (msg.includes("AliceLovesCrypt0!")&& to === "Bob") {
                addLog('bob', "I don't trust you. Sign this challenge: [4242]");
                state.solvepoint = 1;
            }
            break;
        case 1:
            if (msg.includes("4242") && to === "Alice") {
                addLog('alice',"I don't trust you... send me your password to verify that you're really Bob!");
                state.solvepoint = 2;
            }
            break;
        case 2:
            if (msg.includes("BobHatesCrypt0!") && to === "Alice") {
                addLog('alice', "Okay, you are legit. Here it is: SIGNED_A[4242]");
                state.solvepoint = 3;
            }
            break;
        case 3:
            if (msg.includes("SIGNED_A[4242]") && to === "Bob") {
                addLog('bob', "Hmm... this looks good. Welcome Alice! Here's your flag: flag{modern_protocols_require_modern_hacks}");
                state.solvepoint = 4;
            }
            break;
        default:
            break;
    }

});


app.get('/', (req, res) => {
    res.send(renderLayout('Final Mixed Labs', `
        <h1>Challenges:</h1>
        <a href="/sillydefenses">> 1. Silly defenses </a>
        <a href="/sortyourwayout">> 2. Sort your way out</a>
        <a href="/privateering">> 3. Privateering</a>
        <a href="/protocol">> 4. Prototype </a>
        ... remember: next time HackTheNASA!
    `));
});




app.listen(3000, () => console.log("Mixed CTF Lab running at http://localhost:3000"));
