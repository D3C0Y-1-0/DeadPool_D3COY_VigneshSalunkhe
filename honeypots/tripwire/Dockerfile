FROM python:3.11-slim
WORKDIR /app
RUN mkdir -p /logs && chmod 777 /logs
COPY tripwire.py .
CMD ["python", "-u", "tripwire.py"]
