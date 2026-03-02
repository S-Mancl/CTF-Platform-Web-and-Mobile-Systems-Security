const express = require('express');
const cookieParser = require('cookie-parser');
const app = express();
app.use(cookieParser());

const renderLayout = (title, content, extraHead = '') => `
<html>
<head>
    <title>${title}</title>
    <style>
        body {
            margin: 0; height: 100vh; display: flex;
            justify-content: center; align-items: center;
            background: linear-gradient(135deg, #1e3c72, #2a5298);
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: white;
        }
        .card {
            background: white; color: #333; padding: 40px;
            border-radius: 16px; box-shadow: 0 15px 40px rgba(0, 0, 0, 0.2);
            text-align: center; width: 380px;
        }
        h1 { margin-top: 0; color: #2a5298; }
        .flag, .click-count, .role, .cookie-value, .id-value {
            margin-top: 20px; font-weight: bold; color: #1e3c72;
            background: #e6f0ff; padding: 12px; border-radius: 8px;
        }
        .click-count { font-size: 2rem; background: none; }
        .flag { font-size: 1.2rem; }
        button {
            background: #2a5298; color: white; border: none;
            padding: 12px 24px; font-size: 16px; border-radius: 8px;
            cursor: pointer; transition: all 0.2s ease;
        }
        button:hover { background: #1e3c72; transform: translateY(-2px); }
        .fact, .hint, .warning, .subtitle { margin-top: 20px; font-size: 0.9rem; color: #666; }
        .icon { font-size: 2rem; }
        ul { list-style: none; padding: 0; margin-top: 25px; }
        li { margin: 15px 0; }
        a {
            text-decoration: none; font-weight: bold; color: #1e3c72;
            background: #e6f0ff; padding: 10px 14px; border-radius: 8px;
            display: inline-block; transition: 0.2s ease;
        }
        a:hover { background: #d0e2ff; transform: translateY(-2px); }
    </style>
    ${extraHead}
</head>
<body>
    <div class="card">${content}</div>
</body>
</html>`;

function hash32(x) {
    x = x | 0; x ^= x >>> 16; x = Math.imul(x, 0x45d9f3b);
    x ^= x >>> 16; x = Math.imul(x, 0x45d9f3b);
    x ^= x >>> 16; return x >>> 0;
}


app.get('/keepclicking', (req, res) => {
    const clicks = req.cookies.num_clicks !== undefined ? parseInt(req.cookies.num_clicks) : 10;

    if (clicks === -1) {
        res.send(renderLayout('Keep Clicking', `
            <div class="flag">🎉 flag{click_click_click} 🎉</div>
        `));
    } else {
        res.send(renderLayout('Keep Clicking', `
            <h1>Keep Clicking</h1>
            <p>You will get the flag as soon as you reach <strong>-1</strong> clicks.</p>
            <div class="click-count">${clicks}</div>
            <button onclick="increment()">Increase Clicks</button>
            <div class="fact">💡 90% of clickers quit right before they're about to get the flag.</div>
        `, `
            <script>
                function increment() {
                    let current = ${clicks};
                    current++;
                    document.cookie = "num_clicks=" + current + "; path=/";
                    location.reload();
                }
            </script>
        `));
    }
});

app.get('/surelyadmin', (req, res) => {
    if (req.cookies.role === 'admin') {
        res.send(renderLayout('Surely an Admin', `<div class="flag">flag{you_are_an_admin_now}</div>`));
    } else {
        res.cookie('role', 'user', { path: '/surelyadmin' });
        res.send(renderLayout('Surely an Admin', `
            <div class="icon">🔒</div>
            <h1>Access Denied</h1>
            <p>Only <strong>'admin'</strong> users are allowed.</p>
            <div class="role">Current role: user</div>
        `));
    }
});

app.get('/bargainhunter', (req, res) => {
    const price = req.cookies.item_price || "100";
    if (parseInt(price) <= 0) {
        res.send(renderLayout('Bargain Hunter', `
            <div class="icon">💰</div>
            <h1>Success!</h1>
            <p>You bought the flag for $${price}!</p>
            <div class="flag">flag{cheap_skate_master}</div>
        `));
    } else {
        res.cookie('item_price', '100', { path: '/bargainhunter' });
        res.send(renderLayout('Bargain Hunter', `
            <div class="icon">🛒</div>
            <h1>Checkout</h1>
            <p>The Flag is currently on sale!</p>
            <div class="role">Price: $${price}</div>
            <div class="warning">Error: You only have $0.00 in your wallet.</div>
            <div class="hint">Maybe you can convince the cookie the price is lower?</div>
        `));
    }
});

app.get('/timetraveler', (req, res) => {
    const expiry = req.cookies.trial_end || "2020-01-01";
    const today = new Date();
    const expiryDate = new Date(expiry);

    if (expiryDate > today) {
        res.send(renderLayout('Time Traveler', `
            <div class="icon">🚀</div>
            <h1>Premium Access</h1>
            <p>Welcome back! Your trial is valid until ${expiry}.</p>
            <div class="flag">flag{back_to_the_future_99}</div>
        `));
    } else {
        res.cookie('trial_end', '2020-01-01', { path: '/timetraveler' });
        res.send(renderLayout('Time Traveler', `
            <div class="icon">⌛</div>
            <h1>Trial Expired</h1>
            <p>Your free trial ended on <strong>${expiry}</strong>.</p>
            <div class="id-value">Status: EXPIRED</div>
            <div class="hint">If you could just set the date to 2099...</div>
        `));
    }
});

app.get('/encodedcookies', (req, res) => {
    const secret = req.cookies.secret;
    const decoded = Buffer.from(secret || "", 'base64').toString();

    if (decoded === 'give_me_flag') {
        res.send(renderLayout('Encoded Cookies', `
            <div class="icon">🏆</div>
            <h1>Access Granted</h1>
            <div class="flag">flag{base64_aint_encryption}</div>
        `));
    } else {
        const encoded = Buffer.from('dont_give_me_flag').toString('base64');
        res.cookie('secret', encoded, { path: '/encodedcookies' });
        res.send(renderLayout('Encoded Cookies', `
            <div class="icon">🍪</div>
            <h1>Encoded Cookies</h1>
            <p>The secret cookie looks encrypted...</p>
            <div class="cookie-value">secret = ${encoded}</div>
        `));
    }
});

app.get('/bruteforceme', (req, res) => {
    const id = parseInt(req.cookies.id);
    if (hash32(id) === 3195296983) {
        res.send(renderLayout('Brute Force Me', `
            <div class="icon">🏆</div>
            <h1>Access Granted</h1>
            <div class="flag">flag{bruteforce_can_be_the_way_to_go}</div>
        `));
    } else {
        if (!req.cookies.id) res.cookie('id', (hash32(1)).toString(), { path: '/bruteforceme' });
        res.send(renderLayout('Brute Force Me', `
            <div class="icon">🔐</div>
            <h1>Brute Force Me</h1>
            <p>Another user is the admin.</p>
            <div class="id-value">
                Your original identity: ID = 1 <br>
                Your current ID cookie: ${req.cookies.id || hash32(1)}
            </div>
            <div class="hint">Only the correct ID hash unlocks admin access...</div>
        `));
    }
});

app.get('/', (req, res) => {
    res.send(renderLayout('Cookie CTF', `
        <div class="icon">🍪</div>
        <h1>Cookie CTF</h1>
        <div class="subtitle">Play with cookies. Break the rules.</div>
        <ul>
            <li><a href='/keepclicking'>1. Always Keep Clicking</a></li>
            <li><a href='/surelyadmin'>2. Surely an Admin</a></li>
            <li><a href='/bargainhunter'>3. The Bargain Hunter</a></li>
            <li><a href='/timetraveler'>4. The Time Traveler</a></li>
            <li><a href='/encodedcookies'>5. Encoded Cookies</a></li>
            <li><a href='/bruteforceme'>6. Bruteforce is an Option</a></li>
        </ul>
    `));
});

app.listen(3000, () => console.log("CTF Server running on port 3000"));
