"""Validate built assets, or the actual public latest GitHub release."""
import argparse
import hashlib
import io
import json
from pathlib import Path
from urllib.request import Request, urlopen
import zipfile

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://github.com/xiangzhong26/YOUR-JOURNAL-LIST'
FEED = BASE + '/releases/latest/download/updates.json'


def download(url):
    with urlopen(Request(url, headers={'User-Agent': 'Your-Journal-List-release-check'}), timeout=45) as response:
        return response.read()


def verify(live=False, expected=None):
    source = json.loads((ROOT / 'addon/manifest.json').read_text(encoding='utf-8'))
    addon_id = source['applications']['zotero']['id']
    feed = json.loads(download(FEED) if live else (ROOT / 'dist/updates.json').read_bytes())
    entry = feed['addons'][addon_id]['updates'][0]
    version = entry['version']
    assert not expected or version == expected, f'Expected {expected}, got {version}'
    filename = f'your-journal-list-{version}.xpi'
    assert entry['update_link'] == f'{BASE}/releases/download/v{version}/{filename}', 'Wrong release download URL'
    content = download(entry['update_link']) if live else (ROOT / 'dist' / filename).read_bytes()
    assert entry['update_hash'] == 'sha256:' + hashlib.sha256(content).hexdigest(), 'XPI hash mismatch'
    with zipfile.ZipFile(io.BytesIO(content)) as archive:
        assert archive.testzip() is None
        manifest = json.loads(archive.read('manifest.json'))
        assert manifest['version'] == version, 'XPI and feed versions differ'
        app = manifest['applications']['zotero']
        assert app['id'] == addon_id and app['update_url'] == FEED, 'Plugin identity or update URL differs'
        for key in ['strict_min_version', 'strict_max_version']:
            assert entry['applications']['zotero'][key] == app[key], 'Compatibility differs'
        assert ('?v=' + version).encode() in archive.read('content/manager.xhtml'), 'Missing UI cache version'
    print(f'OK: {"Public GitHub" if live else "Local"} v{version}, XPI identity, compatibility, SHA-256 and update links')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--live', action='store_true')
    parser.add_argument('--expect-version')
    args = parser.parse_args()
    verify(args.live, args.expect_version)
