#!/bin/bash
# Made by Lefteris Garyfalakis
# Last update: 25-08-2022

COL_NC='\e[0m' # No Color
COL_LIGHT_RED='\e[1;31m'
COL_LIGHT_GREEN='\e[1;32m'
COL_LIGHT_BLUE='\e[1;94m'
COL_LIGHT_YELLOW='\e[1;93m'
TICK="${COL_NC}[${COL_LIGHT_GREEN}✓${COL_NC}]"
CROSS="${COL_NC}[${COL_LIGHT_RED}✗${COL_NC}]"
INFO="${COL_NC}[${COL_LIGHT_YELLOW}i${COL_NC}]"
QUESTION="${COL_NC}[${COL_LIGHT_BLUE}?${COL_NC}]"

APT_SOURCE_PATH="/etc/apt/sources.list.d/caprine.list"
APT_SOURCE_CONTENT="deb [trusted=yes] https://apt.fury.io/lefterisgar/ * *"

clear

# Print ASCII logo and branding
printf "       ⠀⠀⠀⠀⠀⠀⠀⢀⣠⣤⣤⣶⣶⣶⣶⣤⣤⣄⡀⠀⠀⠀⠀⠀⠀⠀
         ⠀⠀⢀⣴⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣦⡀⠀⠀⠀⠀
       ⠀⠀⢀⣴⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣦⡀⠀⠀
       ⠀⢀⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⡀⠀
       ⠀⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠟⢿⣿⣿⣿⣿⣿⣿⡿⣿⣿⣿⣿⣿⠀
       ⢰⣿⣿⣿⣿⣿⣿⣿⣿⠟⠁⠀⠀⠙⠿⠿⠛⠉⣠⣾⣿⣿⣿⣿⣿⡆
       ⢸⣿⣿⣿⣿⣿⣿⠟⠁⢀⣠⣄⠀⠀⠀⠀⣠⣾⣿⣿⣿⣿⣿⣿⣿⡇
       ⠈⣿⣿⣿⣿⣟⣥⣶⣾⣿⣿⣿⣷⣦⣠⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⠁
       ⠀⠹⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠏⠀
       ⠀⠀⠙⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠋⠀⠀
        ⠀⠀⠈⢻⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⠟⠁⠀⠀⠀
        ⠀⠀⠀⢸⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠿⠛⠉⠀⠀⠀⠀⠀⠀
        ⠀⠀⠀⢸⡿⠛⠋\n\n"

printf "      ___               _
     / __|__ _ _ __ _ _(_)_ _  ___
    | (__/ _\` | '_ \ '_| | ' \/ -_)
     \___\__,_| .__/_| |_|_||_\___|
              |_|\n\n"

printf " Elegant Facebook Messenger desktop app\n\n"

printf "*** Caprine installation script ***\n"
printf -- "-----------------------------------\n"
printf "Author      : Lefteris Garyfalakis\n"
printf "Last update : 25-08-2022\n"
printf -- "-----------------------------------\n"

printf "%b %bDetecting APT...%b\\n" "${INFO}"

# Check if APT is installed
if hash apt 2>/dev/null; then
	printf "%b %b$(apt -v)%b\\n" "${TICK}" "${COL_LIGHT_GREEN}" "${COL_NC}"
else
	printf "%b %bAPT was not detected!%b\\n" "${CROSS}" "${COL_LIGHT_RED}" "${COL_NC}"
	printf "%b %bIs your distribution Debian-based? %b" "${QUESTION}"
    exit 2
fi

# Add Caprine's APT repository
printf "%b %bAdding APT repository...%b" "${INFO}"

# Disable globbing
set -f

echo $APT_SOURCE_CONTENT | sudo tee $APT_SOURCE_PATH > /dev/null

# Enable globbing
set +f

if [[ $(< $APT_SOURCE_PATH) == "$APT_SOURCE_CONTENT" ]]; then
	printf " Done!\n"
else
	printf "\n%b %bError adding APT repository!%b\\n" "${CROSS}" "${COL_LIGHT_RED}" "${COL_NC}"
	printf "%b %bReason: Content mismatch%b\\n" "${CROSS}" "${COL_LIGHT_RED}" "${COL_NC}"
	exit 5
fi

# Update the repositories
printf "%b %bUpdating repositories...%b" "${INFO}"

sudo apt update > /dev/null 2>&1

printf " Done!\n"

# Ask the user if he wants to install Caprine
printf "%b %bDo you want to install Caprine? (y/n) %b" "${QUESTION}"
read -n 1 -r < /dev/tty
printf "\n"

if [[ $REPLY =~ ^[Yy]$ ]]; then
	printf "%b %bInstalling Caprine...%b" "${INFO}"

	sudo apt install -y caprine > /dev/null 2>&1

	printf " Done!\n"
else
	printf "%b %bOperation cancelled by the user. Aborting.%b\\n" "${CROSS}" "${COL_LIGHT_RED}" "${COL_NC}"
	exit 125;
fi
