"""Set up, install on and launch an LG TV in Developer Mode, using the official webOS CLI."""
from pathlib import Path
import json
import os
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
CLI = '@webos-tools/cli@3.2.6'
# On Windows npx is npx.cmd; shutil.which finds it through PATHEXT.
NPX = shutil.which('npx') or 'npx'
info = json.loads((ROOT / 'webos/appinfo.json').read_text())
version = json.loads((ROOT / 'package.json').read_text())['version']
device = os.environ.get('LG_DEVICE', 'tv')
action = sys.argv[1] if len(sys.argv) > 1 else ''
USAGE = '''Usage (device name from LG_DEVICE, default "tv"):
  python3 scripts/lg.py setup <TV-IP-address>   register the TV
  python3 scripts/lg.py key                     fetch the TV's key (asks for the passphrase)
  python3 scripts/lg.py info                    check the connection and webOS version
  python3 scripts/lg.py install                 install the built package
  python3 scripts/lg.py launch                  open CleanFrame on the TV
  python3 scripts/lg.py running                 list the apps running on the TV'''


def ares(tool, *arguments):
    return subprocess.run([NPX, '--yes', '-p', CLI, tool, *arguments], cwd=ROOT).returncode


if action == 'setup':
    if len(sys.argv) < 3:
        raise SystemExit('Give the TV address shown in the Developer Mode app, e.g. `npm run lg:setup -- 192.168.0.42`.')
    details = ['-i', 'host=' + sys.argv[2], '-i', 'port=9922', '-i', 'username=prisoner']
    print('Registering the TV at ' + sys.argv[2] + ' as "' + device + '".')
    # Add once; later runs update the address of the existing entry.
    known = Path.home() / '.webos/tv/novacom-devices.json'
    exists = known.is_file() and any(d.get('name') == device for d in json.loads(known.read_text() or '[]'))
    sys.exit(ares('ares-setup-device', '-m' if exists else '-a', device, *details))
if action == 'key':
    print('Enter the passphrase shown in the Developer Mode app on the TV.')
    sys.exit(ares('ares-novacom', '--device', device, '--getkey'))
if action == 'info':
    sys.exit(ares('ares-device', '-d', device, '--system-info'))
if action == 'install':
    package = ROOT / 'dist' / (info['id'] + '_' + version + '_all.ipk')
    if not package.is_file():
        raise SystemExit('Run `npm run package:webos` first, or put the downloaded .ipk in dist/.')
    print('Installing ' + package.name + ' on device "' + device + '".')
    sys.exit(ares('ares-install', '-d', device, str(package)))
if action == 'launch':
    print('Launching ' + info['id'] + ' on device "' + device + '".')
    sys.exit(ares('ares-launch', '-d', device, info['id']))
if action == 'running':
    sys.exit(ares('ares-launch', '-d', device, '--running'))
raise SystemExit(USAGE)
