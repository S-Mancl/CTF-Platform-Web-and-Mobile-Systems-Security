import os
import re
import shutil
import asyncio
import subprocess
from fastapi import FastAPI, Request, Response
from fastapi.responses import HTMLResponse, StreamingResponse, PlainTextResponse

app = FastAPI()
STACKS_DIR = "./stacks"

def get_docker_compose_cmd():
    """Auto-detects whether to use V2 'docker compose' or V1 'docker-compose'."""
    try:
        subprocess.check_output(
            ["docker", "compose", "version"], 
            stderr=subprocess.DEVNULL
        )
        return ["docker", "compose"]
    except Exception:
        pass
    
    if shutil.which("docker-compose"):
        return ["docker-compose"]
        
    return ["docker", "compose"]  # Fallback

CMD_BASE = get_docker_compose_cmd()

def get_compose_file(project_dir: str):
    """Finds the compose file, supporting both .yml and .yaml extensions."""
    for filename in ["docker-compose.yml", "docker-compose.yaml", "compose.yml", "compose.yaml"]:
        path = os.path.join(project_dir, filename)
        if os.path.exists(path):
            return path
    return None

def parse_folder_name(folder_name: str, base_port: int = 8000):
    """
    Parses folder formats like: 01-[CORE]-cookie-challenges
    Returns: (port, type, display_name)
    """
    # Regex expects: numbers-[TYPE]-rest_of_string
    match = re.match(r'^(\d+)-\[([^\]]+)\]-(.+)$', folder_name)
    if match:
        port = base_port + int(match.group(1))
        stack_type = match.group(2).upper()
        # Convert "cookie-challenges" to "Cookie Challenges" for the UI
        display_name = match.group(3).replace('-', ' ').upper()#.title() 
        return port, stack_type, display_name
        
    # Fallback if a folder doesn't match the new naming convention strictly
    match_port = re.match(r'^(\d+)', folder_name)
    port = base_port + int(match_port.group(1)) if match_port else base_port
    return port, "OTHER", folder_name

def get_project_info(folder_name: str):
    """Gathers status, port, and parsed naming data for a given project."""
    project_dir = os.path.join(STACKS_DIR, folder_name)
    path = get_compose_file(project_dir)
    status = "stopped"

    if path:
        try:
            cmd = CMD_BASE + ["-f", path, "ps", "--format", "json"]
            output = subprocess.check_output(cmd, stderr=subprocess.DEVNULL).decode().strip()
            if output and output != "[]":
                status = "running"
        except Exception:
            pass

    port, stack_type, display_name = parse_folder_name(folder_name)

    return {
        "id": folder_name,          # The actual directory name (e.g. 01-[CORE]-test)
        "name": display_name,       # Cleaned up name (e.g. Test)
        "type": stack_type,         # The section group (e.g. CORE)
        "status": status,
        "port": port,
        "link": f"http://localhost:{port}"
    }

# ==========================================
# HTML TEMPLATES (Embedded for portability)
# ==========================================

HTML_HEAD = """
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Challenge Manager</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = { plugins: [ tailwind.plugin(({ addBase }) => addBase({})) ] }
    </script>
    <script src="https://cdn.tailwindcss.com?plugins=typography"></script>
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <style>
        .loader { border: 2px solid #374151; border-top: 2px solid #3b82f6; border-radius: 50%; width: 14px; height: 14px; animation: spin 1s linear infinite; display: inline-block; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .glow-green { box-shadow: 0 0 8px rgba(34,197,94,0.6); }
    </style>
</head>
"""

HOME_HTML = f"""
<!DOCTYPE html>
<html lang="en">
{HTML_HEAD}
<body class="bg-gray-900 text-gray-200 font-sans p-6 min-h-screen">
    <div class="max-w-6xl mx-auto">
        <div class="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
            <h1 class="text-3xl font-bold text-white tracking-tight">Docker Challenge Manager</h1>
            <button onclick="fetchProjects()" class="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded shadow transition border border-gray-700 text-sm font-medium">Refresh All</button>
        </div>
        
        <div id="projects" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
    </div>

    <script>
        async function fetchProjects() {{
            const container = document.getElementById('projects');
            container.innerHTML = '<div class="col-span-full text-center py-12 text-gray-400"><div class="loader mr-2"></div> Scanning stacks...</div>';
            
            const res = await fetch('/api/list');
            const data = await res.json();
            
            if (data.length === 0) {{
                container.innerHTML = '<div class="col-span-full text-center py-12 text-gray-500 bg-gray-800/50 rounded-lg border border-gray-700">No stacks found in ./stacks/ directory.</div>';
                return;
            }}
            
            container.innerHTML = '';
            
            // Group the data by stack type
            const groupedData = data.reduce((acc, curr) => {{
                if (!acc[curr.type]) acc[curr.type] = [];
                acc[curr.type].push(curr);
                return acc;
            }}, {{}});

            // Sort types alphabetically
            const types = Object.keys(groupedData).sort();

            types.forEach(type => {{
                // Inject Section Header
                container.insertAdjacentHTML('beforeend', `
                    <div class="col-span-full mt-6 mb-2 border-b border-gray-800 pb-2 flex items-center gap-3">
                        <h2 class="text-2xl font-bold text-gray-300 tracking-wider uppercase">${{type}}</h2>
                        <span class="px-2.5 py-0.5 rounded border border-gray-700 bg-gray-800 text-gray-400 text-xs font-mono">${{groupedData[type].length}}</span>
                    </div>
                `);
                
                // Inject Cards for this Section
                groupedData[type].forEach(p => {{
                    const isRunning = p.status === 'running';
                    const statusColor = isRunning ? 'bg-green-500 glow-green' : 'bg-gray-600';
                    
                    const html = `
                        <a href="/stack/${{p.id}}" class="block bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg hover:border-blue-500 hover:shadow-blue-900/20 transition duration-200 cursor-pointer group flex flex-col h-full">
                            <div class="flex items-start justify-between mb-4">
                                <h2 class="text-xl font-bold text-white group-hover:text-blue-400 transition pr-4">${{p.name}}</h2>
                                <span class="w-3 h-3 rounded-full flex-shrink-0 mt-2 ${{statusColor}}"></span>
                            </div>
                            <p class="text-sm text-gray-400 font-mono mt-auto flex justify-between">
                                <span>Port: ${{p.port}}</span>
                                <span class="text-xs uppercase tracking-wider ${{isRunning ? 'text-green-400' : 'text-gray-500'}} font-bold">${{p.status}}</span>
                            </p>
                        </a>
                    `;
                    container.insertAdjacentHTML('beforeend', html);
                }});
            }});
        }}
        fetchProjects();
    </script>
</body>
</html>
"""

STACK_HTML = f"""
<!DOCTYPE html>
<html lang="en">
{HTML_HEAD}
<body class="bg-gray-900 text-gray-200 font-sans p-6 min-h-screen">
    <div class="max-w-5xl mx-auto">
        <!-- Header -->
        <div class="mb-6">
            <a href="/" class="text-blue-400 hover:text-blue-300 text-sm font-medium inline-flex items-center mb-4 transition">&larr; Back to Dashboard</a>
            <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-800 pb-6">
                <div>
                    <div class="flex items-center gap-3">
                        <h1 id="project-title" class="text-4xl font-bold text-white tracking-tight">Loading...</h1>
                        <span id="type-badge" class="px-2 py-1 rounded bg-gray-800 text-gray-300 text-xs font-bold border border-gray-700 uppercase tracking-wider">...</span>
                        <span id="status-indicator" class="w-4 h-4 rounded-full bg-gray-600"></span>
                    </div>
                    <p class="text-sm text-gray-500 font-mono mt-2 flex gap-2 items-center">
                        <span class="text-gray-600">DIR:</span> <span id="project-dir" class="text-gray-400">...</span>
                    </p>
                </div>
                <a id="app-link" target="_blank" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded shadow font-medium transition flex items-center justify-center opacity-50 cursor-not-allowed">Open App</a>
            </div>
        </div>

        <!-- Control Panel -->
        <div class="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg mb-8">
            <h2 class="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Controls</h2>
            <div class="flex flex-wrap gap-3">
                <button onclick="action('start')" class="px-5 py-2.5 bg-green-600/10 text-green-400 hover:bg-green-600/30 rounded border border-green-600/30 font-medium transition">Start</button>
                <button onclick="action('stop')" class="px-5 py-2.5 bg-yellow-600/10 text-yellow-400 hover:bg-yellow-600/30 rounded border border-yellow-600/30 font-medium transition">Stop</button>
                <button onclick="action('build')" class="px-5 py-2.5 bg-blue-600/10 text-blue-400 hover:bg-blue-600/30 rounded border border-blue-600/30 font-medium transition">Build</button>
                <button onclick="action('delete_container')" class="px-5 py-2.5 bg-red-500/10 text-red-400 hover:bg-red-500/30 rounded border border-red-500/30 font-medium transition">Down</button>
                <button onclick="action('delete_image')" class="px-5 py-2.5 bg-red-800/20 text-red-500 hover:bg-red-800/40 rounded border border-red-800/50 font-medium transition">Destroy All</button>
                <div class="flex-grow"></div>
                <button onclick="openLogs()" class="px-5 py-2.5 bg-gray-700 text-gray-200 hover:bg-gray-600 rounded border border-gray-500 font-medium transition flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7"></path></svg> Live Logs
                </button>
            </div>
        </div>

        <!-- Markdown Documentation -->
        <div class="bg-gray-800 rounded-xl p-8 border border-gray-700 shadow-lg">
            <h2 class="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6 pb-2 border-b border-gray-700">Project Documentation</h2>
            <div id="markdown-content" class="prose prose-invert prose-blue max-w-none">
                <div class="loader"></div> Loading docs...
            </div>
        </div>
        
        <!-- Logs Overlay Modal -->
        <div id="logs-modal" class="hidden fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center p-4 z-50 transition-opacity">
            <div class="bg-gray-800 rounded-lg w-full max-w-5xl flex flex-col h-[85vh] border border-gray-700 shadow-2xl">
                <div class="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900 rounded-t-lg">
                    <h2 id="logs-title" class="text-lg font-bold text-gray-100 font-mono">Logs</h2>
                    <button onclick="closeLogs()" class="text-gray-400 hover:text-white font-bold text-2xl leading-none">&times;</button>
                </div>
                <div id="logs-content" class="p-4 flex-1 overflow-auto font-mono text-sm text-green-400 bg-black whitespace-pre-wrap"></div>
            </div>
        </div>
    </div>

    <script>
        const projectId = window.location.pathname.split('/').pop();
        let eventSource = null;

        async function init() {{
            document.getElementById('project-dir').innerText = projectId;
            await loadStatus();
            await loadMarkdown();
        }}

        async function loadStatus() {{
            const res = await fetch(`/api/stack/${{projectId}}`);
            const data = await res.json();
            
            document.getElementById('project-title').innerText = data.name;
            document.getElementById('type-badge').innerText = data.type;
            
            const isRunning = data.status === 'running';
            const indicator = document.getElementById('status-indicator');
            const appLink = document.getElementById('app-link');
            
            if(isRunning) {{
                indicator.className = 'w-4 h-4 rounded-full bg-green-500 glow-green';
                appLink.className = 'px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded shadow font-bold transition flex items-center justify-center';
                appLink.href = data.link;
            }} else {{
                indicator.className = 'w-4 h-4 rounded-full bg-gray-600';
                appLink.className = 'px-6 py-3 bg-gray-700 text-gray-400 rounded shadow font-bold transition flex items-center justify-center opacity-50 cursor-not-allowed';
                appLink.removeAttribute('href');
            }}
            
            appLink.innerText = `Open App (Port ${{data.port}})`;
        }}

        async function loadMarkdown() {{
            const content = document.getElementById('markdown-content');
            try {{
                const res = await fetch(`/api/markdown/${{projectId}}`);
                const text = await res.text();
                content.innerHTML = marked.parse(text);
            }} catch (e) {{
                content.innerHTML = '<p class="text-red-400">Failed to load documentation.</p>';
            }}
        }}

        async function action(cmd) {{
            await fetch(`/api/action/${{projectId}}/${{cmd}}`, {{ method: 'POST' }});
            setTimeout(loadStatus, 1500); 
        }}

        function openLogs() {{
            document.getElementById('logs-title').innerText = `> tail -f logs / ${{projectId}}`;
            document.getElementById('logs-modal').classList.remove('hidden');
            const content = document.getElementById('logs-content');
            content.innerText = 'Connecting to container streams...\\n';
            
            if (eventSource) eventSource.close();
            
            eventSource = new EventSource(`/api/logs/${{projectId}}`);
            eventSource.onmessage = function(event) {{
                content.innerText += event.data + '\\n';
                content.scrollTop = content.scrollHeight;
            }};
            eventSource.onerror = function() {{
                content.innerText += '\\n[Connection ended / Container Stopped]';
                eventSource.close();
            }};
        }}

        function closeLogs() {{
            document.getElementById('logs-modal').classList.add('hidden');
            if (eventSource) {{
                eventSource.close();
                eventSource = null;
            }}
        }}

        init();
    </script>
</body>
</html>
"""

# ==========================================
# FASTAPI ROUTES
# ==========================================

@app.get("/favicon.ico")
async def favicon():
    return Response(status_code=204)

# Frontend Page Routes
@app.get("/", response_class=HTMLResponse)
def get_index():
    return HOME_HTML

@app.get("/stack/{project}", response_class=HTMLResponse)
def get_stack_page(project: str):
    return STACK_HTML

# API Routes
@app.get("/api/list")
def list_projects():
    if not os.path.exists(STACKS_DIR):
        os.makedirs(STACKS_DIR)

    projects = []
    try:
        folders = sorted([
            f for f in os.listdir(STACKS_DIR)
            if os.path.isdir(os.path.join(STACKS_DIR, f))
        ])
    except Exception:
        folders = []

    for name in folders:
        projects.append(get_project_info(name))

    return projects

@app.get("/api/stack/{project}")
def get_single_project(project: str):
    return get_project_info(project)

@app.get("/api/markdown/{project}")
def get_markdown(project: str):
    md_path = os.path.join(STACKS_DIR, project, "index.md")
    if os.path.exists(md_path):
        with open(md_path, "r", encoding="utf-8") as f:
            return PlainTextResponse(f.read())
    
    return PlainTextResponse(
        f"# {project}\n\n"
        "No `index.md` found for this stack.\n\n"
        "To add documentation, create a file named `index.md` inside this stack's directory."
    )

@app.post("/api/action/{project}/{cmd}")
def handle_action(project: str, cmd: str):
    project_dir = os.path.join(STACKS_DIR, project)
    path = get_compose_file(project_dir)
    
    if not path:
        return {"status": "error", "message": "Compose file not found"}
    
    actions = {
        "start": ["up", "-d"],
        "stop": ["stop"],
        "build": ["build"],
        "delete_container": ["down"],
        "delete_image": ["down", "--rmi", "all"]
    }
    
    if cmd in actions:
        full_cmd = CMD_BASE + ["-f", path] + actions[cmd]
        subprocess.Popen(
            full_cmd, 
            stdout=subprocess.DEVNULL, 
            stderr=subprocess.DEVNULL,
            stdin=subprocess.DEVNULL
        )
    
    return {"status": "ok"}

@app.get("/api/logs/{project}")
async def stream_logs(project: str, request: Request):
    project_dir = os.path.join(STACKS_DIR, project)
    path = get_compose_file(project_dir)

    if not path:
        return Response(status_code=404)

    async def log_generator():
        cmd = CMD_BASE + [
            "-f", path, 
            "logs", "-f", "--tail", "100", 
            "--no-color", "--no-log-prefix"
        ]
        
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT
        )
        
        try:
            while True:
                if await request.is_disconnected():
                    break
                
                try:
                    line = await asyncio.wait_for(process.stdout.readline(), timeout=0.5)
                except asyncio.TimeoutError:
                    continue
                    
                if not line:
                    break
                    
                decoded = line.decode('utf-8', errors='ignore').strip()
                if not decoded or decoded.startswith("Attaching to"):
                    continue
                    
                yield f"data: {decoded}\n\n"
        finally:
            try:
                process.terminate()
                await asyncio.wait_for(process.wait(), timeout=1.0)
            except Exception:
                pass
            
    return StreamingResponse(log_generator(), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
