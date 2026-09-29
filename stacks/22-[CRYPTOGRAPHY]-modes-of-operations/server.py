import html
import os
import subprocess
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import parse_qs, urlparse

CHALLENGES = ["01_paper_crown.py", "02_whispering_blocks.py", "03_copycat_vault.py"]
STARTERS = {
    "01_paper_crown.py": '''from pwn import *

io = remote("127.0.0.1", 9022)
io.sendlineafter(b"> ", b"1")
io.recvuntil(b"Guest pass: ")
token = bytearray.fromhex(io.recvline().strip().decode())

# TODO: modify the encrypted pass without knowing the key.

io.sendlineafter(b"Forged pass (hex): ", token.hex().encode())
print(io.recvline().decode().strip())
io.close()
''',
    "02_whispering_blocks.py": '''from pwn import *

io = remote("127.0.0.1", 9022)
io.sendlineafter(b"> ", b"2")
io.recvuntil(b"Sealed message: ")
ciphertext = bytes.fromhex(io.recvline().strip().decode())
io.recvuntil(b"> ")

def oracle(payload):
    io.sendline(payload.hex().encode())
    accepted = io.recvline().strip() == b"VALID"
    io.recvuntil(b"> ")
    return accepted

# TODO: recover the plaintext using only oracle(payload).

io.sendline(b"quit")
io.close()
''',
    "03_copycat_vault.py": '''from pwn import *

io = remote("127.0.0.1", 9022)
io.sendlineafter(b"> ", b"3")
io.recvuntil(b"> ")

def oracle(label):
    io.sendline(label.hex().encode())
    ciphertext = bytes.fromhex(io.recvline().strip().decode())
    io.recvuntil(b"> ")
    return ciphertext

# TODO: use chosen labels to recover the hidden inscription.

io.sendline(b"quit")
io.close()
''',
}

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        query = parse_qs(urlparse(self.path).query)
        selected = query.get("challenge", [CHALLENGES[0]])[0]
        if selected not in CHALLENGES:
            selected = CHALLENGES[0]
        try:
            result = subprocess.run(["python", selected], capture_output=True, text=True, timeout=10)
            output = result.stdout + result.stderr
        except Exception as exc:
            output = str(exc)
        source = open(selected, encoding="utf-8").read()
        starter = STARTERS[selected]
        options = "".join(f"<option value='{name}' {'selected' if name == selected else ''}>{name[3:-3].replace('_', ' ').title()}</option>" for name in CHALLENGES)
        body = f"""<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width'><title>Modes of Operations</title><style>
body{{margin:0;background:#0b1020;color:#e5e7eb;font:15px system-ui,sans-serif}}main{{max-width:1050px;margin:auto;padding:44px 24px}}.eyebrow{{color:#7dd3fc;text-transform:uppercase;letter-spacing:.14em;font-size:12px;font-weight:700}}h1{{font-size:42px;margin:8px 0 10px}}.sub{{color:#94a3b8;margin-bottom:28px}}.panel{{background:#111a2e;border:1px solid #24324d;border-radius:14px;padding:22px;margin-top:18px}}label{{display:block;color:#94a3b8;font-size:12px;text-transform:uppercase;font-weight:700;margin-bottom:8px}}select,button{{border:1px solid #33466b;border-radius:8px;padding:11px 14px;background:#0b1222;color:#f8fafc;font-size:15px}}button{{background:#2563eb;border-color:#3b82f6;cursor:pointer;margin-left:8px}}pre{{white-space:pre-wrap;overflow:auto;background:#080c16;border-radius:10px;padding:18px;color:#a7f3d0;line-height:1.5;max-height:600px}}</style></head><body><main><div class='eyebrow'>Cryptography · Modes of Operations</div><h1>Modes of Operations</h1><p class='sub'>Explore three symmetric-cryptography mistakes through practical challenges.</p><div class='panel'><form><label for='challenge'>Challenge</label><select id='challenge' name='challenge'>{options}</select><button type='submit'>Generate challenge</button></form></div><div class='panel'><label>Connect with Netcat</label><pre>nc localhost 9022</pre></div><div class='panel'><label>Challenge material</label><pre>{html.escape(output)}</pre></div><div class='panel'><label>Pwntools starter script</label><pre>{html.escape(starter)}</pre></div><div class='panel'><label>Generator source · {html.escape(selected)}</label><pre>{html.escape(source)}</pre></div></main></body></html>"""
        data = body.encode()
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

HTTPServer(("0.0.0.0", 3000), Handler).serve_forever()
