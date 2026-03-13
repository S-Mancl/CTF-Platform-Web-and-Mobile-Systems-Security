const express = require('express');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));

let guestbookMessages = [
    { name: "Admin", message: "Welcome to the guestbook! Be nice." },
    { name: "User123", message: "Love this site." }
];

const layout = (title, content) => `
<html>
<head>
    <title>${title}</title>
<style>
        body { margin: 0; height: 100vh; display: flex; justify-content: center; align-items: center; 
               background: linear-gradient(135deg, #1e7a3c, #2a9852); font-family: 'Segoe UI', sans-serif; color: white; }
        .card { background: white; color: #333; padding: 40px; border-radius: 16px; box-shadow: 0 15px 40px rgba(0,0,0,0.2); 
                text-align: center; width: 450px; max-height: 80vh; overflow-y: auto; }
        h1 { color: #2a9852; margin-top: 0; }
        input, button, textarea { width: 100%; padding: 10px; margin: 10px 0; border-radius: 8px; border: 1px solid #ccc; }
        button { background: #2a9852; color: white; border: none; cursor: pointer; font-weight: bold; }
        button:hover { background: #1e7a3c; }
        .message-item { text-align: left; border-bottom: 1px solid #eee; padding: 10px 0; }
        .flag { color: #2a9852; font-weight: bold; background: #e6ffe6; padding: 10px; border-radius: 8px; margin-top: 20px; }
        a { color: #1e7a3c; text-decoration: none; font-weight: bold; }
    </style>
</head>
<body>
    <div class="card">
        ${content}
        <br><br>
    </div>
</body>
</html>
`;

app.get('/mirror', (req, res) => {
    const name = req.query.name || "";
    let content = `
        <h1>Snow White's Magic Mirror</h1>
        <p>Mirror, Mirror, on the wall, now, who is the fairest of us all?<br>Enter your name!</p>
        <form method="GET">
            <input type="text" name="name" placeholder="Your name...">
            <button type="submit">It's me!</button>
        </form>
        <script> const originalAlert = window.alert ; window.alert = function(a) { if (a === 1) { originalAlert("flag{the_queen_will_not_be_happy}"); } } </script>
    `;

    if (name) {
        content += `<div class="flag">Magic Mirror: Over the seven jewelled hills, beyond the seventh fall, in the the cottage of the Seven Dwarfs, dwells ${name}, fairest of us all.</div>`;
        content += `<p><em>Flag Hint: Can you trigger an alert(1)?</em></p>`;
    }
    res.send(layout("Snow White's Magic Mirror", content));
});

app.get('/sillydb', (req, res) => {
    let messageList = guestbookMessages.map(m => `
        <div class="message-item">
            <strong>${m.name}:</strong> ${m.message}
        </div>
    `).join('');

    let content = `
        <h1>SillyDB Guestbook</h1>
        <script> const originalAlert = window.alert ; window.alert = function(a) { if (a === 1) { originalAlert("flag{nice_guestbook_aint_it}"); } } </script>
        <p>Leave a message for everyone to see.</p>
        <div id="messages">${messageList}</div>
        <hr>
        <form method="POST" action="/sillydb">
            <input type="text" name="name" placeholder="Your Name" required>
            <textarea name="message" placeholder="Your Message" required></textarea>
            <button type="submit">Post Message</button>
        </form>
    `;
    res.send(layout("Stored XSS", content));
});

app.post('/sillydb', (req, res) => {
    const { name, message } = req.body;
    guestbookMessages.push({ name, message });
    res.redirect('/sillydb');
});

app.get('/freedom', (req, res) => {
    let content = `
        <h1>Profile Loader</h1>
        <script> const originalAlert = window.alert ; window.alert = function(a) { if (a === 1) { originalAlert("flag{free...DOM_from_urls!}"); } } </script>
        
        <div id="display" style="padding: 20px; border: 1px dashed #ccc; min-height: 50px;"></div>
        
        <script>
            function loadFromHash() {
                const rawHash = window.location.hash.substring(1); // Get everything after #
                if (rawHash) {
                    const decoded = decodeURIComponent(rawHash);
                    document.getElementById('display').innerHTML = "Welcome " + decoded;
                }
            }

            window.onload = loadFromHash;
            window.onhashchange = loadFromHash;
        </script>

        <div class="hint" style="margin-top: 30px; text-align: left; font-size: 0.9rem;">
            <strong>Pro Tip:</strong> <code>&lt;script&gt;</code> tags inserted via <code>innerHTML</code> won't run. Use something else instead. <br>
        </div>
    `;
    res.send(layout("DOM XSS", content));
});

app.get('/gallery', (req, res) => {
    const imageUrl = req.query.image || "";

    let content = `
        <h1>Magical Image Gallery</h1>
        <p>Submit an image URL to display your masterpiece!</p>
        
        <form method="GET">
            <input type="text" name="image" placeholder="Enter image URL...">
            <button type="submit">Display Image</button>
        </form>

        <script>
            const originalAlert = window.alert;
            window.alert = function(a) {
                if (a === 1) {
                    originalAlert("flag{stay_calm_evil_images_cannot_hurt_you}");
                }
            }
        </script>
    `;

    if (imageUrl) {
        content += `
            <hr>
            <h3>Your Image:</h3>
            <img src="${imageUrl}" style="max-width:100%; border-radius:12px;">
        `;
    }

    res.send(layout("Image Gallery", content));
});

app.get('/briefcase', (req, res) => {
    const input = req.query.input || "";

    const sanitize = (str) => {
        return str.replace(/<script>/g, "");
    };

    let content = `
        <h1>The briefCASE</h1>
        <p>Someone told me that briefCASEs are very important...</p>

        <form method="GET">
            <input type="text" name="input" placeholder="Try something...">
            <button type="submit">Submit</button>
        </form>

        <script>
            const originalAlert = window.alert;
            window.alert = function(a) {
                if (a === 1) {
                    originalAlert("flag{a_brief_journey_into_cases}");
                }
            }
        </script>
    `;

    if (input) {
        const clean = sanitize(input);
        content += `<div style="margin-top:20px;">Result:<br>${clean}</div>`;
    }

    res.send(layout("The briefCASE", content));
});

app.get('/angles', (req, res) => {
    const input = req.query.input || "";

    const sanitize = (str) => {
        return str.replace(/[<>]/g, "");
    };

    let content = `
        <h1>Angles, always angles</h1>
        <p>Years of studying math and I'm still studying angles...</p>

        <form method="GET">
            <input type="text" name="input" placeholder="Enter text...">
            <button type="submit">Submit</button>
        </form>

        <div id="output" style="margin-top:20px;"></div>

        <script>
            const originalAlert = window.alert;
            window.alert = function(a) {
                if (a === 1) {
                    originalAlert("flag{angles_are_important_in_xss_too}");
                }
            }

            const raw = "${sanitize(input)}";
            const decoded = decodeURIComponent(raw);
            document.getElementById("output").innerHTML = decoded;
        </script>
    `;
    // hint: script inserted through innerHTML won't execute... but you already studied how to avoid using 'script' tags, right?

    res.send(layout("Angles", content));
});

app.get('/filter', (req, res) => {
    const input_data = req.query.input_data || "";
    
    const sanitize = (str) => {
        const blacklist = ['script', 'img', 'svg', 'iframe', 'details', 'video', 'audio', 'object', 'embed'];
        let sanitized = str;
        
        blacklist.forEach(tag => {
            const regex = new RegExp(`<${tag}`, 'gi');
            sanitized = sanitized.replace(regex, ``);
        });
        
        return sanitized;
    };

    let content = `
        <h1>Filter Bypass</h1>
        <p>Input whatever you want, you will never bypass my incredible filter!</p>
        <form method="GET">
            <input type="text" name="input_data" placeholder="Enter whatever you want">
            <button type="submit">Submit!</button>
        </form>
        <script> 
            const originalAlert = window.alert ;
            window.alert = function(a) { 
                if (a === 1) { 
                    const flag = "flag{filter_bypassed__blacklists_are_weak}";
                    originalAlert(flag);
                } 
            } 
        </script>
    `;

    if (input_data) {
        const cleanInput = sanitize(input_data);
        content += `<div class="result">Filtering your input... <br><br> ${cleanInput}</div>`;
    }

    res.send(layout("Filter Bypass", content));
});

app.get('/', (req, res) => {
    res.send(layout("XSS CTF", `
        <h1>XSS Laboratory</h1>
        <p>Learn to perform XSS attacks: trigger <strong>alert(1)</strong></p>
        <div style="text-align: left; display: inline-block;">
            <p><a href="/mirror?name=Snow White">1. Mirror, Mirror, on the wall</a></p>
            <p><a href="/sillydb">2. SillyDB</a></p>
            <p><a href="/freedom#user=my_name">3. freeDOM</a></p>
            <p><a href="/gallery">4. Image Gallery</a></p>
            <p><a href="/briefcase">5. The briefCASE</a></p>
            <p><a href="/angles">6. Angles, always angles</a></p>
            <p><a href="/filter">7. Filter Bypass</a></p>
        </div>
    `));
});

app.listen(3000, () => console.log("XSS CTF Server running on port 3000"));
