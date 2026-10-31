FROM python:3.11-slim
RUN apt-get update && apt-get install -y --no-install-recommends libpcap-dev gcc python3-dev && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir opencanary scapy
RUN mkdir -p /etc/opencanaryd /logs && chmod 777 /logs
COPY opencanary.conf /etc/opencanaryd/opencanary.conf
CMD ["opencanaryd", "--dev"]
