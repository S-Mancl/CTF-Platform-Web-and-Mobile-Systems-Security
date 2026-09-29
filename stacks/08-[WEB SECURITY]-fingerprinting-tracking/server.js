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
            margin: 0; min-height: 100vh; display: flex;
            justify-content: center; align-items: center;
            background: linear-gradient(135deg, #1e3c72, #2a5298);
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: white; padding: 20px;
        }
        .container { display: flex; width: 1000px; gap: 20px; align-items: stretch; }
        .pane {
            background: white; color: #333; padding: 30px;
            border-radius: 16px; box-shadow: 0 15px 40px rgba(0, 0, 0, 0.2);
            flex: 1; text-align: center; display: flex; flex-direction: column;
        }
        .full-pane { width: 100%; max-width: 600px; background: white; color: #333; padding: 35px; border-radius: 16px; text-align: center; }
        h1, h2 { margin-top: 0; color: #2a5298; }
        .tracking-id, .status-container {
            background: #222; color: #0f0; font-family: monospace;
            padding: 15px; border-radius: 8px; font-size: 1.1rem; margin: 10px 0;
            word-break: break-all;
        }
        .status-container { background: #f8f9fa; color: #333; border: 2px solid #ddd; }
        .detected { color: #b91c1c; font-weight: bold; }
        .safe { color: #059669; font-weight: bold; }
        .progress-container {
            background: #eee; border-radius: 10px; height: 20px; width: 100%; margin: 20px 0;
            overflow: hidden;
        }
        .progress-bar { background: #4caf50; height: 100%; transition: width 0.3s ease; }
        .flag {
            background: #e6f0ff; color: #1e3c72; padding: 15px;
            border-radius: 8px; font-weight: bold; margin-top: 20px; border: 2px dashed #1e3c72;
        }
        select, button {
            width: 100%; padding: 10px; margin: 5px 0; border-radius: 5px; border: 1px solid #ccc;
        }
        button { background: #2a5298; color: white; cursor: pointer; font-weight: bold; border: none; margin-top: 20px; }
        button:hover { background: #1e3c72; }
        .label { font-size: 0.85rem; color: #2a5298; text-align: left; display: block; margin-top: 15px; font-weight: bold; border-bottom: 1px solid #eee; }
        .checkbox-group { text-align: left; display: grid; grid-template-columns: 1fr 1fr; gap: 5px; padding-top: 10px; }
        .checkbox-item { font-size: 0.8rem; display: flex; align-items: center; gap: 5px; }
        .hint { font-size: 0.8rem; color: #666; margin-top: 15px; border-top: 1px solid #eee; padding-top: 10px; font-style: italic; }
        a.nav { color: white; text-decoration: none; font-size: 0.9rem; opacity: 0.8; margin-top: 20px;}
        .section-divider { border-top: 2px solid #eee; margin: 25px 0; padding-top: 10px; }
        .menu-btn { display:block; margin:5px 0; padding:12px; background:#e6f0ff; color:#1e3c72; text-decoration:none; border-radius:8px; font-weight:bold; }
        .menu-btn:hover { background: #d0e2ff; }
    </style>
    ${extraHead}
</head>
<body>
    <div style="display:flex; flex-direction:column; align-items:center;">
        <div class="container">${content}</div>
        <a href="/" class="nav">← Back to Level Selection</a>
    </div>
</body>
</html>`;

const OPTIONS = {
    os: ["Windows", "MacOS", "Linux", "Android"],
    browser: ["Chrome", "Firefox", "Safari", "Edge"],
    screen: ["1920x1080", "1440x900", "375x667"],
    plugins: ["AdBlock", "Ghostery", "DarkReader"],
    fonts: ["Arial", "Comic Sans", "Courier New", "Impact", "Verdana", "Georgia"]
};

const TARGETS = {
    1: { os: "Linux", browser: "Firefox" },
    2: { os: "MacOS", browser: "Safari", screen: "1440x900" },
    3: { os: "Windows", browser: "Edge", screen: "1920x1080", plugins: ["AdBlock", "DarkReader"] },
    4: { os: "Android", browser: "Chrome", screen: "375x667", plugins: ["Ghostery"], fonts: ["Comic Sans", "Impact"] }
};

function generateID(data) {
    const cleanData = JSON.parse(JSON.stringify(data));
    if (cleanData.plugins) cleanData.plugins.sort();
    if (cleanData.fonts) cleanData.fonts.sort();
    const str = JSON.stringify(cleanData);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash).toString(16).toUpperCase();
}

function ensureArray(val) {
    if (!val) return [];
    return Array.isArray(val) ? val : [val];
}

app.get('/level/:id', (req, res) => {
    const levelId = req.params.id;
    const target = TARGETS[levelId];
    if (!target) return res.redirect('/');

    const userChoices = {
        os: req.query.os || "Windows",
        browser: req.query.browser || "Chrome",
        ...(levelId >= 2 && { screen: req.query.screen || "1920x1080" }),
        ...(levelId >= 3 && { plugins: ensureArray(req.query.plugins) }),
        ...(levelId >= 4 && { fonts: ensureArray(req.query.fonts) })
    };

    const targetID = generateID(target);
    const userID = generateID(userChoices);

    const keys = Object.keys(target);
    let matches = 0;
    keys.forEach(k => {
        if (Array.isArray(target[k])) {
            const match = target[k].length === userChoices[k].length && 
                          target[k].every(val => userChoices[k].includes(val));
            if (match) matches++;
        } else {
            if (userChoices[k] === target[k]) matches++;
        }
    });
    const progress = (matches / keys.length) * 100;

    const renderCheckboxes = (name, options, selected) => `
        <div class="checkbox-group">
            ${options.map(opt => `
                <label class="checkbox-item">
                    <input type="checkbox" name="${name}" value="${opt}" ${selected.includes(opt) ? 'checked' : ''}> ${opt}
                </label>
            `).join('')}
        </div>`;

    let rightPane = `
        <h2>Your Configuration</h2>
        <form method="GET">
            <span class="label">Operating System</span>
            <select name="os">${OPTIONS.os.map(o => `<option ${userChoices.os === o ? 'selected' : ''}>${o}</option>`).join('')}</select>
            <span class="label">Browser</span>
            <select name="browser">${OPTIONS.browser.map(b => `<option ${userChoices.browser === b ? 'selected' : ''}>${b}</option>`).join('')}</select>
            ${levelId >= 2 ? `<span class="label">Screen Size</span><select name="screen">${OPTIONS.screen.map(s => `<option ${userChoices.screen === s ? 'selected' : ''}>${s}</option>`).join('')}</select>` : ''}
            ${levelId >= 3 ? `<span class="label">Installed Plugins</span>${renderCheckboxes('plugins', OPTIONS.plugins, userChoices.plugins)}` : ''}
            ${levelId >= 4 ? `<span class="label">System Fonts</span>${renderCheckboxes('fonts', OPTIONS.fonts, userChoices.fonts)}` : ''}
            <button type="submit">Recalculate Fingerprint</button>
        </form>
    `;

    let leftPane = `
        <h2>Mystery System</h2>
        <p>Target ID:</p>
        <div class="tracking-id">${targetID}</div>
        <p>Your ID:</p>
        <div class="tracking-id" style="color: #666;">${userID}</div>
        <div class="progress-container">
            <div class="progress-bar" style="width: ${progress}%"></div>
        </div>
        ${progress === 100 ? `<div class="flag">flag{collision_level_${levelId}_solved}</div>` : `<p>${matches} / ${keys.length} attributes match</p>`}
    `;

    res.send(renderLayout(`Level ${levelId}`, `<div class="pane">${leftPane}</div><div class="pane">${rightPane}</div>`));
});

app.get('/escape/c', (req, res) => {
    let current = req.cookies.tracking_id;
    if (!current) {
        res.send(renderLayout('Cookie Escape', `<div class="full-pane"><h1>Invisible!</h1><p class="safe">The server lost your trail.</p><div class="flag">flag{cookie_crumbs_cleaned}</div></div>`));
    } else {
        res.send(renderLayout('Cookie Escape', `<div class="full-pane"><h1>I See You...</h1><div class="status-container">Detected ID: <span class="detected">${current}</span></div></div>`));
    }
});

app.get('/escape/s', (req, res) => {
    res.send(renderLayout('Storage Escape', `<div class="full-pane"><h1>Ghost in the App</h1><div class="status-container" id="status-box">Status: <span class="detected">TRACKED</span></div><div id="flag-zone"></div></div>`, `
        <script>
            if (!localStorage.getItem('permanent_id')) localStorage.setItem('permanent_id', 'GHOST-' + Math.floor(Math.random()*1000));
            setInterval(() => {
                if (!localStorage.getItem('permanent_id')) {
                    document.getElementById('status-box').innerHTML = 'Status: <span class="safe">ANONYMOUS</span>';
                    document.getElementById('flag-zone').innerHTML = '<div class="flag">flag{ghost_busted_success}</div>';
                }
            }, 500);
        </script>`));
});

app.get('/escape/r', (req, res) => {
    const referer = req.get('Referer');
    if (!referer || !referer.includes(req.hostname)) {
        res.send(renderLayout('Referer Escape', `<div class="full-pane"><h1>Where are you from?</h1><p class="safe">No referer detected.</p><div class="flag">flag{no_more_tattling}</div></div>`));
    } else {
        res.send(renderLayout('Referer Escape', `<div class="full-pane"><h1>Tracked Path!</h1><div class="status-container">Source: <span class="detected">${referer}</span></div></div>`));
    }
});

app.get('/escape/u', (req, res) => {
    const ua = req.get('User-Agent');
    if (ua.length < 15) {
        res.send(renderLayout('UA Escape', `<div class="full-pane"><h1>Masked Identity</h1><p class="safe">Done</p><div class="flag">flag{master_of_disguise}</div></div>`));
    } else {
        res.send(renderLayout('UA Escape', `<div class="full-pane"><h1>UA Detected</h1><h2>Shorten your UA</h2><div class="status-container" style="font-size:0.7rem;">UA: <span class="detected">${ua}</span></div></div>`));
    }
});

app.get('/escape/e', (req, res) => {
    const hasTag = req.get('If-None-Match');
    if (!hasTag) {
        res.send(renderLayout('ETag Escape', `<div class="full-pane"><h1>Zombie Dead!</h1><p class="safe">Cache cleared.</p><div class="flag">flag{cache_is_not_a_tracking_device}</div></div>`));
    } else {
        res.set('ETag', 'v1-unforgettable-tag');
        res.send(renderLayout('ETag Escape', `<div class="full-pane"><h1>DNA Tracker</h1><div class="status-container">Cache ID: <span class="detected">${hasTag}</span></div></div>`));
    }
});

app.get('/', (req, res) => {
    if (!req.cookies.tracking_id) res.cookie('tracking_id', 'TRK-' + Math.floor(Math.random()*9999), { path: '/' });
    res.send(renderLayout('Privacy & Tracking CTF', `
        <div class="pane" style="width: 100%;">
            <h1>Identity Challenges</h1>
            
            <h2>Part 1: Fingerprinting (find collision)</h2>
            <p>Replicate the target's configuration to collide with their ID.</p>
            <a href="/level/1" class="menu-btn">Level 1</a>
            <a href="/level/2" class="menu-btn">Level 2</a>
            <a href="/level/3" class="menu-btn">Level 3</a>
            <a href="/level/4" class="menu-btn">Level 4</a>

            <div class="section-divider"></div>

            <h2>Part 2: Escape from tracking</h2>
            <p>The server is watching you. Can you become invisible?</p>
            <a href="/escape/c" class="menu-btn">Level 1</a>
            <a href="/escape/s" class="menu-btn">Level 2</a>
            <a href="/escape/r" class="menu-btn">Level 3</a>
            <a href="/escape/u" class="menu-btn">Level 4</a>
            <a href="/escape/e" class="menu-btn">Level 5</a>
        </div>
    `));
});

app.listen(3000, () => console.log("CTF Server running on port 3000"));
