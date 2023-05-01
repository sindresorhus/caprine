#!/bin/bash

# Copyright(c) 2023 Alex313031

YEL='\033[1;33m' # Yellow
CYA='\033[1;96m' # Cyan
RED='\033[1;31m' # Red
GRE='\033[1;32m' # Green
c0='\033[0m' # Reset Text
bold='\033[1m' # Bold Text
underline='\033[4m' # Underline Text

# Error handling
yell() { echo "$0: $*" >&2; }
die() { yell "$*"; exit 111; }
try() { "$@" || die "${RED}Failed $*"; }

# Set msvs_version for node-gyp on Windows
export MSVS_VERSION="2022" &&
export GYP_MSVS_VERSION="2022" &&
# Download electron binaries here
export ELECTRON_CACHE="${PWD}/electron" &&
export electron_config_cache="${PWD}/electron" &&

# --help
displayHelp () {
	printf "\n" &&
	printf "${bold}${GRE}Script to build Caprine.${c0}\n" &&
	printf "${bold}${YEL}Use the --deps flag to install build dependencies.${c0}\n" &&
	printf "${bold}${YEL}Use the -i flag to run \`nvm install\` and \`npm install\`.${c0}\n" &&
	printf "${bold}${YEL}Use the --build flag to build Caprine.${c0}\n" &&
	printf "${bold}${YEL}Use the --clean flag to run \`npm run clean\`.${c0}\n" &&
	printf "${bold}${YEL}Use the --distclean flag to run \`npm run distclean\`.${c0}\n" &&
	printf "${bold}${YEL}Use the --dist flag to generate .zip and .deb/.exe packages.${c0}\n" &&
	printf "${bold}${YEL}Use the --help flag to show this help.${c0}\n" &&
	printf "\n"
}
case $1 in
	--help) displayHelp; exit 0;;
esac

# Install prerequisites
installDeps () {
	sudo apt-get install build-essential git node-gyp nodejs npm
}
case $1 in
	--deps) installDeps; exit 0;;
esac

cleanApp () {
printf "\n" &&
printf "${bold}${YEL} Cleaning artifacts and node_modules...${c0}\n" &&
	
npm run clean
}
case $1 in
	--clean) cleanApp; exit 0;;
esac

distcleanApp () {

printf "\n" &&
printf "${bold}${YEL} Cleaning build artifacts in \`dist\`...${c0}\n" &&

npm run distclean
}
case $1 in
	--distclean) distcleanApp; exit 0;;
esac

bootstrapApp () {
# Optimization parameters
export CFLAGS="-DNDEBUG -mavx -maes -O3 -g0 -s" &&
export CXXFLAGS="-DNDEBUG -mavx -maes -O3 -g0 -s" &&
export CPPFLAGS="-DNDEBUG -mavx -maes -O3 -g0 -s" &&
export LDFLAGS="-Wl,-O3 -mavx -maes -s" &&
export VERBOSE=1 &&
export V=1 &&

export MSVS_VERSION="2022" &&
export GYP_MSVS_VERSION="2022" &&
export ELECTRON_CACHE="${PWD}/electron" &&
export electron_config_cache="${PWD}/electron" &&

printf "\n" &&
printf "${bold}${GRE} Bootstrapping with nvm install & npm install...${c0}\n" &&
printf "\n" &&

export NVM_DIR=$HOME/.nvm &&
source $NVM_DIR/nvm.sh &&

nvm install &&
npm install
}
case $1 in
	-i) bootstrapApp; exit 0;;
esac

buildApp () {
# Optimization parameters
export CFLAGS="-DNDEBUG -mavx -maes -O3 -g0 -s" &&
export CXXFLAGS="-DNDEBUG -mavx -maes -O3 -g0 -s" &&
export CPPFLAGS="-DNDEBUG -mavx -maes -O3 -g0 -s" &&
export LDFLAGS="-Wl,-O3 -mavx -maes -s" &&
export VERBOSE=1 &&
export V=1 &&

export MSVS_VERSION="2022" &&
export GYP_MSVS_VERSION="2022" &&
export ELECTRON_CACHE="${PWD}/electron" &&
export electron_config_cache="${PWD}/electron" &&

printf "\n" &&
printf "${bold}${GRE} Building...${c0}\n" &&

export NODE_ENV=production &&

npm run build
}
case $1 in
	--build) buildApp; exit 0;;
esac

packageApp () {
# Optimization parameters
export CFLAGS="-DNDEBUG -mavx -maes -O3 -g0 -s" &&
export CXXFLAGS="-DNDEBUG -mavx -maes -O3 -g0 -s" &&
export CPPFLAGS="-DNDEBUG -mavx -maes -O3 -g0 -s" &&
export LDFLAGS="-Wl,-O3 -mavx -maes -s" &&
export VERBOSE=1 &&
export V=1 &&

export MSVS_VERSION="2022" &&
export GYP_MSVS_VERSION="2022" &&
export ELECTRON_CACHE="${PWD}/electron" &&
export electron_config_cache="${PWD}/electron" &&

printf "\n" &&
printf "${bold}${GRE} Generating installation packages...${c0}\n" &&

export NODE_ENV=production &&

npm run dist
}
case $1 in
	--dist) packageApp; exit 0;;
esac

printf "\n" &&
printf "${bold}${GRE}Script to build Caprine.${c0}\n" &&
printf "${bold}${YEL}Use the --deps flag to install build dependencies.${c0}\n" &&
printf "${bold}${YEL}Use the -i flag to run \`nvm install\` and \`npm install\`.${c0}\n" &&
printf "${bold}${YEL}Use the --build flag to build Caprine.${c0}\n" &&
printf "${bold}${YEL}Use the --clean flag to run \`npm run clean\`.${c0}\n" &&
printf "${bold}${YEL}Use the --distclean flag to run \`npm run distclean\`.${c0}\n" &&
printf "${bold}${YEL}Use the --dist flag to generate .zip and .deb/.exe packages.${c0}\n" &&
printf "${bold}${YEL}Use the --help flag to show this help.${c0}\n" &&
printf "\n" &&

tput sgr0 &&
exit 0
