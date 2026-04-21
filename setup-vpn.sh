#!/bin/bash

set -e

if [ -z "$1" ]; then
    echo "Usage: ./setup-vpn.sh <YOUR_SERVER_PUBLIC_IP_OR_HOSTNAME> [PORT] [PROTO]"
    echo "Example: ./setup-vpn.sh 203.0.113.10 1194 tcp"
    exit 1
fi

HOST="$1"
PORT="${2:-1194}"
PROTO="${3:-tcp}"
REMOTE_URL="${PROTO}://${HOST}:${PORT}"

echo "Initializing OpenVPN configuration for ${REMOTE_URL}..."
docker compose run --rm vpn ovpn_genconfig -u "${REMOTE_URL}" -r "172.19.0.0/16" -d

echo "Initializing PKI (you will be asked for a passphrase for the CA)..."
docker compose run --rm vpn ovpn_initpki

echo "Generating admin client certificate (admin_client)..."
docker compose run --rm vpn easyrsa build-client-full admin_client nopass

echo "Exporting admin_client.ovpn file..."
docker compose run --rm vpn ovpn_getclient admin_client > admin_client.ovpn

echo "Setup complete. The 'admin_client.ovpn' file is ready for your OpenVPN client."
