"""Install or launch the built package on an LG TV registered with `ares-setup-device`."""
from pathlib import Path
import json
import os
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
CLI = '@webos-tools/cli@3.2.6'
info = json.loads((ROOT / 'webos/appinfo.json').read_text())
version = json.loads((ROOT / 'package.json').read_text())['version']
device = os.environ.get('LG_DEVICE', 'tv')
action = sys.argv[1] if len(sys.argv) > 1 else ''


def ares(tool, *arguments):
    return subprocess.run(['npx', '--yes', '-p', CLI, tool, *arguments], cwd=ROOT).returncode


if action == 'install':
    package = ROOT / 'dist' / (info['id'] + '_' + version + '_all.ipk')
    if not package.is_file():
        raise SystemExit('Run `npm run package:webos` first.')
    print('Installing ' + package.name + ' on device "' + device + '".')
    sys.exit(ares('ares-install', '-d', device, str(package)))
if action == 'launch':
    print('Launching ' + info['id'] + ' on device "' + device + '".')
    sys.exit(ares('ares-launch', '-d', device, info['id']))
raise SystemExit('Usage: python3 scripts/lg.py install|launch  (device name from LG_DEVICE, default "tv")')
