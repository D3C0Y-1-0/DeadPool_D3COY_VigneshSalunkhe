FROM python:3.11-slim
RUN apt-get update && apt-get install -y --no-install-recommends iproute2 && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir paramiko pymysql
WORKDIR /sim
COPY *.py .
CMD ["python", "-u", "watcher.py", "targeted"]
