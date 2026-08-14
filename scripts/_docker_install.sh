#!/usr/bin/env bash
set -euo pipefail

# Idempotent Docker bootstrap for Cursor Cloud VMs.
# Safe to re-run: exits early when Docker is already healthy, does not kill a
# running daemon, and does not make /var/run/docker.sock world-writable.

DOCKERD_LOG=/tmp/dockerd.log
DOCKERD_TIMEOUT=60
USER_NAME="${SUDO_USER:-$USER}"

docker_info_sudo() {
  sudo docker info >/dev/null 2>&1
}

docker_info_user() {
  docker info >/dev/null 2>&1
}

wait_for_dockerd() {
  local elapsed=0
  until docker_info_sudo; do
    if (( elapsed >= DOCKERD_TIMEOUT )); then
      echo "dockerd did not become ready within ${DOCKERD_TIMEOUT}s. Last log lines:" >&2
      tail -n 50 "$DOCKERD_LOG" >&2 || true
      exit 1
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done
}

ensure_docker_group() {
  if [[ "$USER_NAME" == "root" ]]; then
    return
  fi
  if ! getent group docker >/dev/null 2>&1; then
    sudo groupadd docker
  fi
  if ! id -nG "$USER_NAME" | grep -qw docker; then
    sudo usermod -aG docker "$USER_NAME"
    echo "Added ${USER_NAME} to the docker group."
  fi
}

# Group membership only applies to new login sessions. Grant this user (only)
# rw on the live socket so `docker compose` works immediately, without
# chmod 666 (world-writable socket == root-equivalent for every process).
grant_current_session_socket_access() {
  if [[ "$USER_NAME" == "root" ]]; then
    return
  fi
  if docker_info_user; then
    return
  fi
  if [[ ! -S /var/run/docker.sock ]]; then
    echo "Docker socket not found at /var/run/docker.sock" >&2
    exit 1
  fi
  if ! command -v setfacl >/dev/null 2>&1; then
    sudo apt-get install -y acl
  fi
  sudo setfacl -m "u:${USER_NAME}:rw" /var/run/docker.sock
}

start_dockerd() {
  if docker_info_sudo; then
    return
  fi
  echo "=== Starting dockerd ==="
  sudo bash -c "nohup dockerd > ${DOCKERD_LOG} 2>&1 &"
  wait_for_dockerd
}

install_docker() {
  echo "=== Installing Docker ==="
  sudo install -m 0755 -d /etc/apt/keyrings
  curl --retry 3 --retry-delay 5 -fsSL https://download.docker.com/linux/ubuntu/gpg |
    sudo gpg --dearmor --yes -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" |
    sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
  sudo apt-get update
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  sudo apt-get install -y fuse-overlayfs iptables
}

ensure_daemon_json() {
  sudo mkdir -p /etc/docker
  if [[ -f /etc/docker/daemon.json ]]; then
    echo "=== /etc/docker/daemon.json already exists, leaving it unchanged ==="
    return
  fi
  echo "=== Writing Docker daemon.json (fuse-overlayfs) ==="
  sudo tee /etc/docker/daemon.json >/dev/null <<'EOF'
{
  "storage-driver": "fuse-overlayfs"
}
EOF
}

if docker_info_user || docker_info_sudo; then
  ensure_docker_group
  grant_current_session_socket_access
  echo "=== Docker already running ==="
  docker version 2>/dev/null || sudo docker version
  exit 0
fi

if ! command -v dockerd >/dev/null 2>&1; then
  install_docker
  ensure_daemon_json
  sudo update-alternatives --set iptables /usr/sbin/iptables-legacy || true
  sudo update-alternatives --set ip6tables /usr/sbin/ip6tables-legacy || true
else
  echo "=== Docker is installed; starting the daemon ==="
  ensure_daemon_json
fi

ensure_docker_group
start_dockerd
grant_current_session_socket_access

echo "=== Docker ready ==="
docker version 2>/dev/null || sudo docker version
