const express = require('express');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));

let logs = { alice: [], bob: [], trudy: [] };
let state = { challenge: null, expectedResponse: null, currentLvl: null };

const addLog = (who, msg) => {
    const target = who.toLowerCase();
    logs[target].push({ t: new Date().toLocaleTimeString(), msg });
};

const initLevel = (lvl) => {
    state = { challenge: null, expectedResponse: null, currentLvl: lvl };
    logs = { alice: [], bob: [], trudy: [] };
    
    if (lvl == "1") {
        addLog('trudy', "Welcome to the Protocol Lab! In this lab, your purpose is to hijack somehow the connection between Alice and Bob in order to ensure that Bob considers you as Alice. You can inject messages from Alice to Bob and viceversa, and see all the exchanged messages. You're acting as a man-in-the-middle! In this first level, Bob is authenticating Alice merely through an exchanged password. Log in as Alice!");
        addLog('trudy', "SNIFFED: Alice -> Bob: 'I am Alice, PW: AliceLovesCrypt0!'");
    } else if (lvl == "2") {
        addLog('trudy', "In this level, Bob is more cautious and is using a challenge-response mechanism to authenticate Alice. However, Alice might not have implemented all the necessary checks. Are you able to impersonate Alice by sending the right answer to Bob's challenge?");
        addLog('bob', "Waiting for someone to say 'HELLO'...");
    } else if (lvl == "5") {
        addLog('trudy', "In this final level, Bob is using a mutual authentication protocol that should be secure against replay and reflection attacks. However, there might be a flaw in the way Alice and Bob are implementing the protocol. Can you find a way to trick Bob into accepting you as Alice without actually being Alice? Notice that Alice is asking to speak with you... Remember Lowe's...");
        addLog('alice', "Initiating connection with Trudy: 'ENC_PkTrudy[Nonce_77, Alice]'");
        addLog('trudy','known public keys: PkBob, PkAlice')
        addLog('trudy', 'nonce derived: Nonce_77')
    } else if (lvl == "4") {
        addLog('trudy', "In this level, Bob is using a ticket-based authentication system. However, you have found an old ticket in your database that might still be valid. Can you use it to impersonate Alice and gain access to Bob's services? Replay attacks can be very effective if the system doesn't properly validate the freshness of the tickets.");
        state.oldTicket = "TICKET{Key:SESS_99, User:Alice, Issued:2023}";
        state.solved = false;
        addLog('trudy', `You found an old packet in your database: ${state.oldTicket}`);
        addLog('bob', "Status: Online. Ready for new session requests.");
    }
    else if (lvl == "3") {
        addLog('trudy', "In this level, Bob is using a simple challenge-response mechanism, but Alice is not properly verifying the source of the messages. Can you trick Bob into accepting you as Alice by reflecting his own challenge back to him? Remember the concept of session...");
        addLog('bob','Bob is waiting for a HELLO message to start the authentication process...');
    }
};

app.get('/', (req, res) => {
    const lvl = req.query.lvl || "1";
    if (state.currentLvl !== lvl) initLevel(lvl);
    res.send(layout(lvl));
});

app.post('/send', (req, res) => {
    const { from, to, payload, lvl } = req.body;
    const msg = payload.trim();
    addLog('trudy', `<span style="color:#f87171">INJECTED:</span> ${from} -> ${to}: "${msg}"`);

    if (lvl == "1" && to === "Bob") {
        if (msg.includes("AliceLovesCrypt0!")) addLog('bob', "SUCCESS: Password verified.");
        else addLog('bob', "ERROR: Unauthorized.");
    }

    if (lvl == "2") {
        if (to === "Bob" && msg.toUpperCase().includes("HELLO")) {
            state.challenge = Math.floor(Math.random() * 9000) + 1000;
            state.expectedResponse = `SIG_Alice(${state.challenge})`;
            addLog('bob', `To Alice: Prove your identity. Solve this nonce: [${state.challenge}]`);
        } 
        
        else if (to === "Alice" && state.challenge && msg.includes(String(state.challenge))) {
            addLog('alice', `I've signed it for you: ${state.expectedResponse}`);
            addLog('trudy', `Now I know ${state.expectedResponse}`);
        } 

        else if (to === "Bob" && state.expectedResponse && msg.includes(state.expectedResponse)) {
            addLog('bob', `<span style="color: #10b981">SUCCESS:</span> Signature valid. Welcome Alice!`);
        }
        
        else if (to === "Bob" && state.challenge) {
            addLog('bob', `ERROR: I am waiting for ${state.expectedResponse}`);
        }
    }
   
if (lvl == "3" && to === "Bob") {

    if (msg.toUpperCase() === "HELLO") {

        state.challenge = Math.floor(Math.random() * 9000) + 1000;
        state.sessionId = Math.random().toString(36).substring(7);
        state.solved = false;

        addLog('bob', `[Session ${state.sessionId}] Challenge: ${state.challenge}`);
    }

    else if (msg.match(/\[Session (?<sessionId>[a-z0-9]+)\] Challenge: (?<challengeVal>\d+)/i)) {

        const match = msg.match(/\[Session (?<sessionId>[a-z0-9]+)\] Challenge: (?<challengeVal>\d+)/i);
        const { sessionId, challengeVal } = match.groups;

        if (sessionId !== state.sessionId && Number(challengeVal) === state.challenge) {
            addLog('bob', `As requested: RESPONSE(${state.challenge})`);
            state.solved = true;
            addLog('trudy', `Now you know RESPONSE(${state.challenge}) for session ${state.sessionId}`);
        }
        else {
            addLog('bob', "ERROR: Invalid session or challenge.");
        }
    }
    else if (msg.includes(`RESPONSE(${state.challenge})`) && msg.includes(state.sessionId)) {
        if (state.solved==true) {
            addLog('bob', "SUCCESS: Identity confirmed");
        }
        else {
            addLog('bob', "ERROR: you don't know yet that value / invalid session number.");
        }
    }
    else {
        addLog('bob', "ERROR: I am waiting for a HELLO or a valid challenge response.");
    }
}

if (lvl == "4") {
    if (to === "Bob") {
        if (msg.includes("SESS_99") && msg.includes("TICKET")) {
            addLog('bob', `<span style="color: #10b981">SUCCESS:</span> Ticket accepted. Session Key SESS_99 is now active for Alice.`);
            addLog('bob', `To Alice: Please confirm by encrypting this nonce: [777]`);
            state.challenge = "777";
            state.solved = false;
        } 
        else if (msg.includes("ENC_SESS_99[777]") && state.solved == true) {
            addLog('bob', "Mutual Auth Complete. (Replay Attack Successful)");
        }
        else {
            addLog('bob', "ERROR: Invalid Ticket Format.");
        }
    }
    if (to === "Alice" && msg.includes("777")) {
        addLog('alice', "Wait, I didn't start a session... but I'll respond anyway: ENC_SESS_99[777]");
        state.solved = true;
        addLog('trudy', "Now you know ENC_SESS_99[777], which Bob will accept as proof of identity.");
    }
}
    if (lvl == "5") {
        if (to === "Bob" && msg.includes("ENC_PkBob[Nonce_77, Alice]")) {
            addLog('bob', "Hi Alice! Here is your nonce back + mine: ENC_PkAlice[Nonce_77, Nonce_Bob]");
            state.solved = false;
        } else if (to === "Alice" && msg.includes("Nonce_77")) {
            addLog('alice', "Decrypted! Here is your nonce: Nonce_Bob");
            addLog('trudy', "Now you know Nonce_Bob, which Bob will accept as proof of identity.");
            state.solved = true;
        } else if (to === "Bob" && msg === "Nonce_Bob" && state.solved) {
            addLog('bob', "SUCCESS: Mutual authentication complete!");
        }
    }

    res.redirect(`/?lvl=${lvl}`);
});

// --- UI HELPERS ---
const layout = (lvl) => `
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
</html>`;

const renderLogs = (who) => logs[who].map(l => `<div style="margin-bottom:8px"><small style="color:#64748b">${l.t}</small><br>${l.msg}</div>`).reverse().join('');

app.listen(3000, () => console.log("Protocol Lab: http://localhost:3000"));
