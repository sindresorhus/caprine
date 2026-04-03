#!/bin/bash
set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR"

VERSION=$(node -p "require('$PROJECT_DIR/package.json').version")
SPEC_FILE="/tmp/caprine.spec"

cat > "$SPEC_FILE" << EOF
Name:           caprine
Version:        $VERSION
Release:        1%{?dist}
Summary:        Elegant Facebook Messenger desktop app
License:        MIT
URL:            https://github.com/sindresorhus/caprine
Vendor:         Sindre Sorhus <sindresorhus@gmail.com>

Requires:       gtk3
Requires:       libnotify
Requires:       nss
Requires:       libXScrnSaver
Requires:       libXtst
Requires:       xdg-utils
Requires:       at-spi2-core
Requires:       libuuid

%description
Caprine is an unofficial and privacy focused Facebook Messenger app with many useful features.

%prep

%build

%install
mkdir -p %{buildroot}/opt/Caprine
cp -r $PROJECT_DIR/dist/linux-unpacked/* %{buildroot}/opt/Caprine/

mkdir -p %{buildroot}/usr/share/icons/hicolor/16x16/apps
install -m 644 $PROJECT_DIR/build/icons/16x16.png %{buildroot}/usr/share/icons/hicolor/16x16/apps/caprine.png

mkdir -p %{buildroot}/usr/share/icons/hicolor/32x32/apps
install -m 644 $PROJECT_DIR/build/icons/32x32.png %{buildroot}/usr/share/icons/hicolor/32x32/apps/caprine.png

mkdir -p %{buildroot}/usr/share/icons/hicolor/48x48/apps
install -m 644 $PROJECT_DIR/build/icons/48x48.png %{buildroot}/usr/share/icons/hicolor/48x48/apps/caprine.png

mkdir -p %{buildroot}/usr/share/icons/hicolor/64x64/apps
install -m 644 $PROJECT_DIR/build/icons/64x64.png %{buildroot}/usr/share/icons/hicolor/64x64/apps/caprine.png

mkdir -p %{buildroot}/usr/share/icons/hicolor/128x128/apps
install -m 644 $PROJECT_DIR/build/icons/128x128.png %{buildroot}/usr/share/icons/hicolor/128x128/apps/caprine.png

mkdir -p %{buildroot}/usr/share/icons/hicolor/256x256/apps
install -m 644 $PROJECT_DIR/build/icons/256x256.png %{buildroot}/usr/share/icons/hicolor/256x256/apps/caprine.png

mkdir -p %{buildroot}/usr/share/icons/hicolor/512x512/apps
install -m 644 $PROJECT_DIR/build/icons/512x512.png %{buildroot}/usr/share/icons/hicolor/512x512/apps/caprine.png

mkdir -p %{buildroot}/usr/share/applications
cat > %{buildroot}/usr/share/applications/caprine.desktop << 'DESKTOP_EOF'
[Desktop Entry]
Type=Application
Name=Caprine
GenericName=IM Client
Comment=Elegant Facebook Messenger desktop app
Icon=caprine
Exec=/opt/Caprine/caprine
Keywords=Messenger;Facebook;Chat;
Categories=GTK;InstantMessaging;Network;
StartupNotify=true
DESKTOP_EOF

%files
%defattr(-,root,root,-)
/opt/Caprine
/usr/share/icons/hicolor/*/apps/caprine.png
/usr/share/applications/caprine.desktop

%changelog
* $(date +'%a %b %d %Y') Builder <auto@example.com> - $VERSION-1
- Initial package build
EOF

rpmbuild -bb "$SPEC_FILE"
cp ~/rpmbuild/RPMS/x86_64/caprine-*.rpm "$PROJECT_DIR/dist/"
echo "RPM package built successfully: dist/caprine-$VERSION-1.x86_64.rpm"
