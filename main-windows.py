# WINDOWS VERSION MADE BY CHATGPT, absolutely not guaranteed

from fastapi import FastAPI, Request, Response
from fastapi.responses import FileResponse, StreamingResponse
import os
import subprocess
import signal

app = FastAPI()
# Using absolute pathing or ensuring forward slashes helps avoid escape character issues
STACKS_DIR = os.path.join(os.getcwd(), "stacks")

# Modern Docker Desktop for Windows uses "docker compose" (V2)
DOCKER_BASE_CMD = ["docker", "compose"]

@app.get("/favicon.ico")
async def favicon():
    return Response(status_code=204)

@app.get("/")
def get_index():
    return FileResponse("index.html")

@app.get("/list")
def list_projects():
    if not os.path.exists(STACKS_DIR):
        os.makedirs(STACKS_DIR)
        
    projects = []
    folders = sorted([f for f in os.listdir(STACKS_DIR) if os.path.isdir(os.path.join(STACKS_DIR, f))])
    
    for name in folders:
        path = os.path.join(STACKS_DIR, name, "docker-compose.yml")
        status = "stopped"
        port = 8000
        
        # Safe integer conversion for the port logic
        try:
            port += int(''.join(filter(str.isdigit, name)) or 0)
        except ValueError:
            pass

        if os.path.exists(path):
            try:
                # creationflags=0x08000000 hides the console window on Windows
                cmd = DOCKER_BASE_CMD + ["-f", path, "ps", "--status", "running"]
                output = subprocess.check_output(
                    cmd, 
                    stderr=subprocess.STDOUT, 
                    creationflags=subprocess.CREATE_NO_WINDOW
                ).decode()
                
                if name in output or "running" in output.lower():
                    status = "running"
            except Exception:
                status = "stopped"
                
        projects.append({"name": name, "status": status, "link": f"http://localhost:{port}"})
    return projects

@app.post("/action/{project}/{cmd}")
def handle_action(project: str, cmd: str):
    path = os.path.join(STACKS_DIR, project, "docker-compose.yml")
    
    actions = {
        "start": ["up", "-d"],
        "stop": ["stop"],
        "build": ["build"],
        "delete_container": ["down"],
        "delete_image": ["down", "--rmi", "all"]
    }
    
    if cmd in actions:
        full_cmd = DOCKER_BASE_CMD + ["-f", path] + actions[cmd]
        # Use CREATE_NO_WINDOW to prevent CMD popups
        subprocess.Popen(full_cmd, creationflags=subprocess.CREATE_NO_WINDOW)
    
    return {"status": "ok"}

@app.get("/logs/{project}")
async def stream_logs(project: str):
    path = os.path.join(STACKS_DIR, project, "docker-compose.yml")

    def log_generator():
        cmd = DOCKER_BASE_CMD + [
            "-f", path, 
            "logs", "-f", "--tail", "100", 
            "--no-color"
        ]
        
        # On Windows, we use a context manager or explicit close to handle the pipe
        process = subprocess.Popen(
            cmd, 
            stdout=subprocess.PIPE, 
            stderr=subprocess.STDOUT,
            creationflags=subprocess.CREATE_NO_WINDOW,
            text=True,
            encoding='utf-8',
            errors='replace'
        )
        
        try:
            while True:
                line = process.stdout.readline()
                if not line:
                    break
                # Clean Windows line endings
                clean_line = line.strip()
                if clean_line and not clean_line.startswith("Attaching to"):
                    yield f"data: {clean_line}\n\n"
        finally:
            # Proper Windows process termination
            process.terminate()
            try:
                process.wait(timeout=1)
            except subprocess.TimeoutExpired:
                process.kill()
            
    return StreamingResponse(log_generator(), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    # Make sure 'stacks' folder exists before boot
    if not os.path.exists(STACKS_DIR):
        os.makedirs(STACKS_DIR)
    uvicorn.run(app, host="127.0.0.1", port=8000)
