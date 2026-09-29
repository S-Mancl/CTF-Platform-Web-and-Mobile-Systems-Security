# SQLMap

- **Author**: Samuel Udegbunam
- **Topic**: SQL Injection / SQLMap
- **Type**: EXTRA

This is an extra laboratory of the course of Web and Mobile Systems Security! In this laboratory, you will learn how to use sqlmap to identify and exploit SQL Injection vulnerabilities in web applications. You will be introduced to different injection points and techniques, including GET and POST parameters, cookies, captured requests, database dumps, schema enumeration, operating-system shells, and a short chain from SQL injection to reflected XSS.

To solve these challenges, you need to download sqlmap on your own computer. It is a command-line tool written in Python, and it is not included in the laboratory environment.

The download itself is the same on Linux, macOS, and Windows: clone the official repository. What changes is how you install Git and Python 3 from the terminal, and the command used to start Python.

### Linux

On Debian, Ubuntu, and similar distributions:

```bash
sudo apt update
sudo apt install -y git python3
```

On Fedora:

```bash
sudo dnf install -y git python3
```

On Arch Linux:

```bash
sudo pacman -S --needed git python
```

Then clone sqlmap and check that it runs:

```bash
git clone --depth 1 https://github.com/sqlmapproject/sqlmap.git sqlmap-dev
cd sqlmap-dev
python3 sqlmap.py -h
```

### macOS

Install Git and Python 3 with Homebrew, then clone sqlmap:

```bash
brew install git python
git clone --depth 1 https://github.com/sqlmapproject/sqlmap.git sqlmap-dev
cd sqlmap-dev
python3 sqlmap.py -h
```

If Homebrew is not installed, run `xcode-select --install` to get Git, install Python 3 from [python.org](https://www.python.org/downloads/macos/), and then run the `git clone` commands above.

### Windows

From PowerShell, install Git and Python 3 with winget:

```powershell
winget install --id Git.Git -e
winget install --id Python.Python.3.12 -e
```

Close and reopen the terminal so the new programs are on `PATH`, then clone sqlmap and check that it runs:

```powershell
git clone --depth 1 https://github.com/sqlmapproject/sqlmap.git sqlmap-dev
cd sqlmap-dev
py sqlmap.py -h
```

If `py` is not recognized, use `python sqlmap.py -h`.

You can also download the latest zip from the [sqlmap GitHub repository](https://github.com/sqlmapproject/sqlmap) and extract it, then run `sqlmap.py` the same way.
