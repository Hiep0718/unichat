#!/usr/bin/env bash
# Generate RS256 key pairs used by the Docker stack (ADR-005, ADR-006):
#   core-service-*  Core API -> AI Service request signing
#   ai-service-*    AI Service -> Core API request signing
#   jwt-*           user access-token signing (keeps sessions across restarts)
# Existing keys are never overwritten. Containers run as UID/GID 10001.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KEYS_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)/.service-keys"
CONTAINER_UID=10001

mkdir -p "${KEYS_DIR}"

generate_pair() {
    local name="$1"
    local private_key="${KEYS_DIR}/${name}-private.pem"
    local public_key="${KEYS_DIR}/${name}-public.pem"
    if [ -f "${private_key}" ]; then
        echo "- ${name}: already exists, skipped"
        return
    fi
    openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out "${private_key}" 2>/dev/null
    openssl rsa -pubout -in "${private_key}" -out "${public_key}" 2>/dev/null
    echo "+ ${name}: generated"
}

generate_pair core-service
generate_pair ai-service
generate_pair jwt

chmod 600 "${KEYS_DIR}"/*-private.pem
chmod 644 "${KEYS_DIR}"/*-public.pem
chmod 700 "${KEYS_DIR}"

# Private keys must be readable by the non-root container user.
if [ "$(id -u)" -eq 0 ]; then
    chown -R "${CONTAINER_UID}:${CONTAINER_UID}" "${KEYS_DIR}"
elif command -v sudo >/dev/null 2>&1; then
    sudo chown -R "${CONTAINER_UID}:${CONTAINER_UID}" "${KEYS_DIR}"
else
    echo "WARNING: run 'chown -R ${CONTAINER_UID}:${CONTAINER_UID} ${KEYS_DIR}' as root" >&2
fi

echo "Keys ready in ${KEYS_DIR}"
