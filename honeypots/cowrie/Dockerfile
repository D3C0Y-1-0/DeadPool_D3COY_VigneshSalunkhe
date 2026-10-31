FROM python:3.11-slim
RUN pip install --no-cache-dir paramiko
WORKDIR /app
RUN mkdir -p /cowrie/cowrie-git/var/log/cowrie && chmod 777 -R /cowrie
COPY . .
EXPOSE 2222
CMD ["python", "-u", "mini_ssh.py"]
