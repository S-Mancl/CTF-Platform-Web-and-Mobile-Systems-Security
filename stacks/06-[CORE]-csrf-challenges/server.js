const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

const sessions = {}; // SESSION STORE DO NOT TOUCH!!!

const users = {
    'admin': { 
        inventory: [
            { id: 'item_1', name: 'P.T. Barnum\'s Cane', type: 'demo' },
            { id: 'item_2', name: 'Flashdance\'s Water Bucket', type: 'demo' },
            { id: 'level1', name: 'The Phantom\'s Mask - the request was well hidden', type: 'flag', value: 'flag{get_requests_are_not_secure}' },
            { id: 'level2', name: 'Grizabella\'s Tattered Costume - \'cause you had Memory of the previous challenge!', type: 'flag', value: 'flag{post_is_only_half_the_battle}' },
            { id: 'level3', name: 'Don Lockwood\'s Umbrella - can\'t protect you from heavy rain!', type: 'flag', value: 'flag{predictable_tokens_are_no_tokens}' },
            { id: 'level4', name: 'Elphaba\'s Broom - you\'re wizarding!', type: 'flag', value: 'flag{encoding_is_not_security}' },
            { id: 'level5', name: 'Aladdin\'s Magic Lamp - are you a genius?', type: 'flag', value: 'flag{hashing_is_still_not_random}' }
        ]
    },
    'attacker': { 
        inventory: [
            { id: 'item_3', name: 'Chekhov\'s Gun', type: 'demo' },
            { id: 'item_4', name: 'Hamilton\'s Quill', type: 'demo' }
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

app.get('/transfer-l1', authenticate, (req, res) => {
    if (req.query.item_id) return executeTransfer(req, res);
    res.send(layout("Level 1", `
        <h2>Level 1: GET Transfers</h2>
        ${renderInventory(req.user)}
        <div class="challenge-box">
            <p>This level uses <b>GET</b> parameters to move items.</p>
            <form method="GET">
                <input type="text" name="item_id" placeholder="Item ID (e.g. level1)">
                <input type="text" name="to" placeholder="Recipient (e.g. attacker)">
                <button type="submit">Transfer via GET</button>
            </form>
        </div>
    `, req.user));
});

app.all('/transfer-l2', authenticate, (req, res) => {
    if (req.method === 'POST') return executeTransfer(req, res);
    res.send(layout("Level 2", `
        <h2>Level 2: Simple POST</h2>
        ${renderInventory(req.user)}
        <div class="challenge-box">
            <p>This level uses <b>POST</b> but checks no tokens.</p>
            <form method="POST">
                <input type="text" name="item_id" placeholder="Item ID">
                <input type="text" name="to" placeholder="Recipient">
                <button type="submit">Transfer via POST</button>
            </form>
        </div>
    `, req.user));
});

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
            <div class="hint">The server is checking a token. Can you predict the Admin's token?</div>
        </div>
    `, req.user));
};

app.all('/transfer-l3', authenticate, (req, res) => handleTokenLevel(req, res, 3, (u) => u, "A trivial token"));
app.all('/transfer-l4', authenticate, (req, res) => handleTokenLevel(req, res, 4, (u) => Buffer.from(u).toString('base64'), "An almost trivial token"));
app.all('/transfer-l5', authenticate, (req, res) => handleTokenLevel(req, res, 5, (u) => getSHA256(u), "A slightly less trivial token"));

app.get('/', authenticate, (req, res) => {
    res.send(layout("Prop Manager", `
        <h1>Welcome, ${req.user}</h1>
        <p>Manage your props and test transfers below.</p>
        
        <h3>Your Current Props</h3>
        ${renderInventory(req.user)}

        <hr>
        <h3>Challenge Portals</h3>
        <p>Welcome in this lair, humble props artisan. The Evil Props Master stole almost all your props which he plans on using for a massive re-enactment of some of your favourite musical theatre pieces. You can't allow him to succeed! Luckily, one of his minions, the Maschinenmensch, is very easy to trick into performing actions... can you convince it to give you all your props? You can ask the Maschinenmensch to visit some web pages, and it will login as the Evil Prop Master before doing so. Trick it into sending you all the props! The ids are 'level1', 'level2' and so on... You can find the Maschinenmensch control panel <a href="http://websec-lab.esami.di.unimi.it:4000/">here</a>.</p>
        <ul>
            <li><a href="/transfer-l1">Level 1: The GET Vulnerability</a></li>
            <li><a href="/transfer-l2">Level 2: The POST Form</a></li>
            <li><a href="/transfer-l3">Level 3: Predictable Token</a></li>
            <li><a href="/transfer-l4">Level 4: Predictable Token Bis</a></li>
            <li><a href="/transfer-l5">Level 5: Predictable Token Ter</a></li>
        </ul>
    `, req.user));
});

app.listen(3000, () => console.log("CSRF Lab running on http://localhost:3000"));
