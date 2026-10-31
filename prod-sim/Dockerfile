FROM python:3.11-slim
RUN pip install --no-cache-dir paramiko
WORKDIR /app
RUN mkdir -p /logs /shared && chmod 777 /logs
COPY server.py .
CMD ["python", "-u", "server.py"]
