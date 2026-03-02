from fastapi import FastAPI, Request, Response
from fastapi.responses import FileResponse, StreamingResponse
import os
import subprocess

app = FastAPI()
STACKS_DIR = "./stacks"

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
        
        if os.path.exists(path):
            try:
                cmd = ["docker-compose", "-f", path, "ps"]
                output = subprocess.check_output(cmd, stderr=subprocess.STDOUT).decode()
                if "Up" in output or "running" in output:
                    status = "running"
                elif "Exit" in output or "exited" in output:
                    status = "exited"
            except:
                status = "stopped"
                
        projects.append({"name": name, "status": status, "link": f"http://localhost:{8000+int(name[0])}"})
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
        full_cmd = ["docker-compose", "-f", path] + actions[cmd]
        subprocess.Popen(full_cmd)
    
    return {"status": "ok"}

@app.get("/logs/{project}")
async def stream_logs(project: str):
    path = os.path.join(STACKS_DIR, project, "docker-compose.yml")

    def log_generator():
        cmd = [
            "docker-compose", "-f", path, 
            "logs", "-f", "--tail", "100", 
            "--no-color", "--no-log-prefix"
        ]
        
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        
        try:
            for line in iter(process.stdout.readline, b''):
                decoded_line = line.decode('utf-8', errors='ignore').strip()
                if not decoded_line or decoded_line.startswith("Attaching to"):
                    continue
                yield f"data: {decoded_line}\n\n"
        finally:
            process.terminate()
            
    return StreamingResponse(log_generator(), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
