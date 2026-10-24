"""Build an LG webOS package (.ipk) from app/ with the official webOS CLI. No TV is contacted."""
from pathlib import Path
import argparse
import json
import shutil
import subprocess
import tempfile
import zipfile

from font_assets import ROOT, write_widget_archive

CLI = '@webos-tools/cli@3.2.6'
parser = argparse.ArgumentParser()
parser.add_argument('--private-fonts', action='store_true', help='Include local Pangram fonts (personal builds only)')
args = parser.parse_args()

info = json.loads((ROOT / 'webos/appinfo.json').read_text())
info['version'] = json.loads((ROOT / 'package.json').read_text())['version']
dist = ROOT / 'dist'
stage = dist / 'webos' / 'CleanFrame'
if stage.exists():
    shutil.rmtree(stage)
stage.mkdir(parents=True)

# Reuse the widget file selection and font overlay, then swap the Tizen manifest for appinfo.json.
with tempfile.TemporaryDirectory() as temp:
    archive = Path(temp) / 'app.zip'
    write_widget_archive(archive, include_private=args.private_fonts)
    with zipfile.ZipFile(archive) as widget:
        widget.extractall(stage)
(stage / 'config.xml').unlink()
(stage / 'appinfo.json').write_text(json.dumps(info, indent=2) + '\n')
for name in [info['icon'], info['largeIcon']]:
    shutil.copyfile(ROOT / 'webos' / name, stage / name)
for notice in ['LICENSE', 'THIRD_PARTY_NOTICES.md']:
    shutil.copyfile(ROOT / notice, stage / notice)

result = subprocess.run(['npx', '--yes', '-p', CLI, 'ares-package', '--no-minify', '-o', str(dist), str(stage)], cwd=ROOT)
if result.returncode:
    raise SystemExit('ares-package failed. The staged app is in ' + str(stage.relative_to(ROOT)) + '.')
package = dist / (info['id'] + '_' + info['version'] + '_all.ipk')
if not package.is_file():
    raise SystemExit('Expected package missing: ' + str(package.relative_to(ROOT)))
print('Created ' + str(package.relative_to(ROOT)) + (' with private fonts; keep it personal.' if args.private_fonts else ' (public fonts only).'))
