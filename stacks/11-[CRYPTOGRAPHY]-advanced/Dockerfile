FROM python:3.11-slim
WORKDIR /app
RUN pip install --no-cache-dir pycryptodomex
COPY . .
CMD ["python", "server.py"]
