import importlib.util
import socket
import socketserver
from pathlib import Path

ROOT = Path(__file__).resolve().parent

def load(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

paper_crown = load("paper_crown", "01_paper_crown.py")
whispering_blocks = load("whispering_blocks", "02_whispering_blocks.py")
copycat_vault = load("copycat_vault", "03_copycat_vault.py")

class Handler(socketserver.StreamRequestHandler):
    def setup(self):
        super().setup()
        self.request.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)

    def send(self, message):
        self.wfile.write(message.encode())
        self.wfile.flush()

    def read(self):
        line = self.rfile.readline(131072)
        if not line:
            raise EOFError
        return line.strip()

    def handle(self):
        self.send(
            "Modes of Operations\n"
            "1. Paper Crown\n"
            "2. Whispering Blocks\n"
            "3. Copycat Vault\n"
            "> "
        )
        try:
            choice = self.read()
            if choice == b"1":
                self.paper_crown()
            elif choice == b"2":
                self.whispering_blocks()
            elif choice == b"3":
                self.copycat_vault()
            else:
                self.send("Unknown challenge.\n")
        except (EOFError, BrokenPipeError, ConnectionResetError):
            pass

    def paper_crown(self):
        self.send(f"Guest pass: {paper_crown.issue_pass().hex()}\nForged pass (hex): ")
        try:
            result = paper_crown.enter_palace(bytes.fromhex(self.read().decode()))
        except (ValueError, KeyError):
            result = "invalid pass"
        self.send(f"{result}\n")

    def whispering_blocks(self):
        self.send(
            f"Sealed message: {whispering_blocks.sealed_message().hex()}\n"
            "Submit a seal in hex, or type quit.\n"
        )
        while True:
            self.send("> ")
            value = self.read()
            if value.lower() == b"quit":
                return
            try:
                valid = whispering_blocks.gate_accepts(bytes.fromhex(value.decode()))
                self.send("VALID\n" if valid else "INVALID\n")
            except ValueError:
                self.send("INVALID HEX\n")

    def copycat_vault(self):
        self.send("Submit a label in hex, or type quit.\n")
        while True:
            self.send("> ")
            value = self.read()
            if value.lower() == b"quit":
                return
            try:
                self.send(f"{copycat_vault.seal(bytes.fromhex(value.decode())).hex()}\n")
            except ValueError:
                self.send("INVALID HEX\n")

class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True

Server(("0.0.0.0", 4000), Handler).serve_forever()
