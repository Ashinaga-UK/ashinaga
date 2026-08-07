#!/usr/bin/env bash
set -euo pipefail

echo "=== Installing Docker ==="
sudo install -m 0755 -d /etc/apt/keyrings
curl --retry 3 --retry-delay 5 -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo apt-get install -y fuse-overlayfs iptables

echo "=== Configuring Docker daemon for fuse-overlayfs ==="
sudo mkdir -p /etc/docker
printf '%s\n' '{' '  "storage-driver": "fuse-overlayfs"' '}' | sudo tee /etc/docker/daemon.json > /dev/null

sudo update-alternatives --set iptables /usr/sbin/iptables-legacy || true
sudo update-alternatives --set ip6tables /usr/sbin/ip6tables-legacy || true

echo "=== Starting dockerd ==="
sudo pkill dockerd || true
sleep 2
sudo bash -c 'nohup dockerd > /tmp/dockerd.log 2>&1 &'
sleep 8
sudo docker version
echo "=== Docker ready ==="
