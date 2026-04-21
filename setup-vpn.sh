#!/bin/bash

if [ -z "$1" ]; then
    echo "Usage: ./setup-vpn.sh <YOUR_SERVER_PUBLIC_IP>"
    exit 1
fi

IP=$1

echo "Initializing OpenVPN configuration..."
docker compose run --rm vpn ovpn_genconfig -u tcp://$IP -r "172.19.0.0/16" -d

echo "Initializing PKI (you will be asked for a passphrase for the CA)..."
docker compose run --rm vpn ovpn_initpki

echo "Generating admin client certificate (admin_client)..."
docker compose run --rm vpn easyrsa build-client-full admin_client nopass

echo "Exporting admin_client.ovpn file..."
docker compose run --rm vpn ovpn_getclient admin_client > admin_client.ovpn

echo "Setup complete. The 'admin_client.ovpn' file is ready for your OpenVPN client."
