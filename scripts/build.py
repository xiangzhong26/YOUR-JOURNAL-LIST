"""Build an installable XPI using Python's standard library only."""
import hashlib
import json
import re
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[1]


def build():
    manifest = json.loads((ROOT / 'addon/manifest.json').read_text(encoding='utf-8'))
    version = manifest['version']
    package = json.loads((ROOT / 'package.json').read_text(encoding='utf-8'))
    if version != package['version']:
        raise SystemExit('package.json and manifest.json versions must agree')
    target = ROOT / 'dist' / f'your-journal-list-{version}.xpi'
    target.parent.mkdir(exist_ok=True)
    with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as archive:
        for path in sorted((ROOT / 'addon').rglob('*')):
            if path.is_file():
                info = zipfile.ZipInfo(path.relative_to(ROOT / 'addon').as_posix(), (2026, 1, 1, 0, 0, 0))
                info.compress_type = zipfile.ZIP_DEFLATED
                info.external_attr = 0o644 << 16
                content = path.read_bytes()
                if path.name == "manager.xhtml":
                    content = re.sub(rb"\?v=[0-9.]+", ("?v=" + version).encode(), content)
                archive.writestr(info, content)
        info = zipfile.ZipInfo('LICENSE', (2026, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o644 << 16
        archive.writestr(info, (ROOT / 'LICENSE').read_bytes())
    with zipfile.ZipFile(target) as archive:
        if archive.testzip():
            raise SystemExit('Corrupted package')
        assert 'manifest.json' in archive.namelist() and 'bootstrap.js' in archive.namelist()
    digest = hashlib.sha256(target.read_bytes()).hexdigest()
    target.with_suffix('.xpi.sha256').write_text(f'{digest}  {target.name}\n', encoding='utf-8')
    app = manifest['applications']['zotero']
    updates = {'addons': {app['id']: {'updates': [{
        'version': version,
        'update_link': f'https://github.com/xiangzhong26/YOUR-JOURNAL-LIST/releases/download/v{version}/{target.name}',
        'update_hash': 'sha256:' + digest,
        'applications': {'zotero': {key: app[key] for key in ['strict_min_version', 'strict_max_version']}}
    }]}}}
    (target.parent / 'updates.json').write_text(json.dumps(updates, indent=2) + '\n', encoding='utf-8')
    print(f'Built {target}\nSHA256 {digest}')


if __name__ == '__main__':
    build()
