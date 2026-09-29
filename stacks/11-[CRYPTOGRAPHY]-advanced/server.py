import html
import os
import subprocess
from urllib.parse import parse_qs, urlparse
from http.server import BaseHTTPRequestHandler, HTTPServer

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        challenges = [name for name in ["singlechar.py", "truncation.py", "two-way-ness.py", "infamous.py", "salty-secrets.py"] if os.path.exists(name)]
        query = parse_qs(urlparse(self.path).query)
        selected = query.get("challenge", [challenges[0] if challenges else ""])[0]
        if selected not in challenges:
            selected = challenges[0] if challenges else ""
        if urlparse(self.path).path == "/download" and selected:
            data = open(selected, "rb").read()
            self.send_response(200)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Content-Disposition", f"attachment; filename={selected}")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return
        try:
            result = subprocess.run(["python", selected], capture_output=True, text=True, timeout=30)
            output = result.stdout + result.stderr
        except Exception as exc:
            output = str(exc)
        source = open(selected, encoding="utf-8").read() if selected else ""
        options = "".join(f"<option value='{html.escape(name)}' {'selected' if name == selected else ''}>{html.escape(name[:-3].replace('-', ' ').title())}</option>" for name in challenges)
        body = f"""<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width'><title>{html.escape(os.environ['TITLE'])}</title><style>body{{margin:0;background:#0b1020;color:#e5e7eb;font:15px system-ui,sans-serif}}main{{max-width:1000px;margin:auto;padding:48px 24px}}.eyebrow{{color:#7dd3fc;text-transform:uppercase;letter-spacing:.14em;font-size:12px;font-weight:700}}h1{{font-size:42px;margin:8px 0 10px}}.sub{{color:#94a3b8;margin-bottom:32px}}.panel{{background:#111a2e;border:1px solid #24324d;border-radius:14px;padding:22px}}label{{display:block;color:#94a3b8;font-size:12px;text-transform:uppercase;font-weight:700;margin-bottom:8px}}select,button{{border:1px solid #33466b;border-radius:8px;padding:11px 14px;background:#0b1222;color:#f8fafc;font-size:15px}}button{{background:#2563eb;border-color:#3b82f6;cursor:pointer;margin-left:8px}}pre{{white-space:pre-wrap;overflow:auto;min-height:180px;background:#080c16;border-radius:10px;padding:18px;color:#a7f3d0;line-height:1.5}}.hint{{color:#64748b;font-size:13px;margin-top:14px}}</style></head><body><main><div class='eyebrow'>Cryptography · {html.escape(os.environ['TITLE'])}</div><h1>{html.escape(os.environ['TITLE'])}</h1><p class='sub'>Select a challenge and inspect its generated output.</p><div class='panel'><form><label for='challenge'>Challenge</label><select id='challenge' name='challenge'>{options}</select><button type='submit'>Run challenge</button></form></div><div class='panel' style='margin-top:20px'><label>Challenge output</label><pre>{html.escape(output)}</pre></div><div class='panel' style='margin-top:20px'><label>Generator source · {html.escape(selected)}</label><pre>{html.escape(source)}</pre></div></main></body></html>"""
        data = body.encode()
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

HTTPServer(("0.0.0.0", 3000), Handler).serve_forever()
