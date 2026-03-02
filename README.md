# CTF Platform for Web and Mobile Systems Security
CTF platform for the course of Web and Mobile Systems Security at the University of Milan
---------

## Guide to the Platform
### Prerequisites
The following software packages are required:
- A Python interpreter (suggested Python 3.8+)
- The Python packages fastapi and uvicorn
- Docker and Docker Compose (see FAQ for docker compose vs docker-compose)

Ports 8000–8100 should be available to be used by the system.

⚠️ WARNING: The system is not guaranteed to be secure in any way. Use it only on localhost.

### How to Start It

To start the platform, enter the folder and `make`. If that doesn't suite you, you can run:
```python3
python3 ./main.py
```

After that, the platform can be accessed at http://localhost:8000/

If you are on Windows, run ``python3 main-windows.py`` instead. You may need the WSL installed.

### How to Use It

When the platform is running (see previous section), open http://localhost:8000/

You will see the list of containers that can be started.

> Rule: 1 container = 1 laboratory = 1 port = 1 card at http://localhost:8000/

Each card contains the following actions:
- Start - starts the container
- Stop - stops the container
- Build - builds the image
- Logs - shows the container logs
- Open - opens the website associated with the container
- Delete container - removes the container
- Full reset - removes both the container and the image

If you're not interested in the technical details, follow this pattern:
- Press Start (this automatically performs a build if needed).
- Click the web icon to work on it.
- When finished, press Full reset to remove everything.

### How to Stop It
`CTRL + C`

### FAQ

**The system says I have `docker-compose` / `docker compose` instead of the other. What do I do?**
Open `main.py`, go to line 31, and replace the command in the array with the actual command that works on your device.
