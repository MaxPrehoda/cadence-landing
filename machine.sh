#!/bin/sh
# Cadence: let your Mac see the coding agents on this box.
#
# Served at https://cadencevoice.ai/machine.sh. Cadence on the Mac
# (Settings > Agents > Other machines) shows the command to run here, with
# the Mac's SSH public key when it has one:
#
#   curl -fsSL https://cadencevoice.ai/machine.sh | sh -s -- ssh-ed25519 AAAA...
#
# What it does, and nothing else:
#   1. Installs herdr (https://herdr.dev), the open-source terminal runtime
#      the agents run in, with herdr's own installer, unless it is here.
#   2. Given a public key, lets the Mac it belongs to sign in over SSH: the
#      key goes into ~/.ssh/authorized_keys once, marked "cadence".
#
# The Mac connects to this box over SSH, as you would. Nothing here connects
# to Cadence, its relay or your phone, and no token or password is involved.
set -eu

say() { printf '%s\n' "$*"; }
fail() {
	printf 'cadence: %s\n' "$*" >&2
	exit 1
}

case "$(uname -s)" in
Linux | Darwin) ;;
*) fail "this box runs $(uname -s); Cadence connects to Linux and macOS boxes" ;;
esac
case "$(uname -m)" in
x86_64 | amd64 | aarch64 | arm64) ;;
*) fail "herdr has no build for $(uname -m)" ;;
esac

find_herdr() {
	if command -v herdr >/dev/null 2>&1; then
		command -v herdr
	elif [ -x "$HOME/.local/bin/herdr" ]; then
		printf '%s\n' "$HOME/.local/bin/herdr"
	fi
}

# 1. herdr
herdr_bin=$(find_herdr)
if [ -z "$herdr_bin" ]; then
	command -v curl >/dev/null 2>&1 || fail "curl is needed to install herdr"
	say "Installing herdr..."
	curl -fsSL https://herdr.dev/install.sh | sh
	herdr_bin=$(find_herdr)
	[ -n "$herdr_bin" ] || fail "herdr did not install; see https://herdr.dev/docs/install"
fi
say "herdr is here: $("$herdr_bin" --version 2>/dev/null || printf '%s' "$herdr_bin")"

# 2. The Mac's key
if [ $# -ge 2 ]; then
	kind=$1
	key=$2
	case "$kind" in
	ssh-ed25519 | ecdsa-sha2-nistp256 | ecdsa-sha2-nistp384 | ecdsa-sha2-nistp521 | ssh-rsa | \
		sk-ssh-ed25519@openssh.com | sk-ecdsa-sha2-nistp256@openssh.com) ;;
	*) fail "that is not an SSH public key" ;;
	esac
	case "$key" in
	"" | *[!A-Za-z0-9+/=]*) fail "that is not an SSH public key" ;;
	esac
	umask 077
	mkdir -p "$HOME/.ssh"
	touch "$HOME/.ssh/authorized_keys"
	if grep -qF "$kind $key" "$HOME/.ssh/authorized_keys"; then
		say "Your Mac could already sign in here."
	else
		printf '%s %s cadence\n' "$kind" "$key" >>"$HOME/.ssh/authorized_keys"
		say "Your Mac can sign in here now."
	fi
elif [ $# -eq 1 ]; then
	fail "that is not an SSH public key"
fi

# 3. What to type on the Mac
say ""
say "Done. In Cadence on your Mac, add this box as:  $(id -un)@<its address>"
say "(it calls itself $(hostname 2>/dev/null || uname -n))"
say "Run your agents here inside herdr: start herdr, then claude or codex in a pane."
