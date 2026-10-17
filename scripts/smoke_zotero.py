"""Integration smoke test in a new, isolated Zotero profile. Never opens the user's library."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time
import zipfile
import socket

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--zotero', default='C:/Program Files/Zotero/zotero.exe')
    args = parser.parse_args()
    if not Path(args.zotero).is_file():
        raise SystemExit('Use --zotero to specify your Zotero executable')
    profile = Path(tempfile.mkdtemp(prefix='your-journal-list-smoke-'))
    data = profile / 'data'
    data.mkdir()
    extensions = profile / 'extensions'
    extensions.mkdir()
    stage = profile / 'packages'
    stage.mkdir()
    with socket.socket() as port_probe:
        port_probe.bind(('127.0.0.1', 0))
        debug_port = port_probe.getsockname()[1]
    test_addon = profile / 'smoke-addon'
    test_addon.mkdir()
    plugin_id = json.loads((ROOT / 'addon/manifest.json').read_text(encoding='utf-8'))['applications']['zotero']['id']
    prefs = {
        'extensions.zotero.dataDir': str(data), 'extensions.zotero.useDataDir': True,
        'extensions.zotero.firstRun2': False, 'extensions.zotero.reportTranslationFailure': False,
        'extensions.zotero.automaticScraperUpdates': False,
        'extensions.zotero.sync.autoSync': False,
        'extensions.logging.enabled': True,
        'browser.dom.window.dump.enabled': True,
        'devtools.console.stdout.chrome': True,
        'devtools.console.stdout.content': True,
        'devtools.debugger.remote-port': debug_port,
        'devtools.debugger.remote-enabled': True,
        'devtools.debugger.prompt-connection': False,
        'devtools.debugger.force-local': True,
        'toolkit.telemetry.reportingpolicy.firstRun': False,
        'browser.shell.checkDefaultBrowser': False,
    }
    (profile / 'prefs.js').write_text('\n'.join(f'user_pref({json.dumps(k)}, {json.dumps(v)});' for k, v in prefs.items()), encoding='utf-8')
    source = (ROOT / 'tests/zotero-smoke.js').read_text(encoding='utf-8')
    source = source.replace('__RESULT_PATH__', json.dumps(str(profile / 'result.json')))
    source = source.replace('__FIXTURE_PATH__', json.dumps(str(ROOT / 'examples/demo-journals.json')))
    source = source.replace('__EXPORT_PATH__', json.dumps(str(profile / 'export.json')))
    source = source.replace('__CSV_PATH__', json.dumps(str(ROOT / 'examples/demo-journals.csv')))
    (test_addon / 'bootstrap.js').write_text(source, encoding='utf-8')
    for addon_id, source_dir in [(plugin_id, ROOT / 'addon')]:
        with zipfile.ZipFile(stage / (addon_id + '.xpi'), 'w', zipfile.ZIP_DEFLATED) as archive:
            for file in source_dir.rglob('*'):
                if file.is_file():
                    archive.write(file, file.relative_to(source_dir).as_posix())
    startup = None
    if os.name == 'nt':
        startup = subprocess.STARTUPINFO()
        startup.dwFlags |= subprocess.STARTF_USESHOWWINDOW
        startup.wShowWindow = 0
    print(f'Isolated profile: {profile}', flush=True)
    log = (profile / 'console.log').open('w', encoding='utf-8')
    process = subprocess.Popen([args.zotero, '-wait-for-browser', '-no-remote', '-profile', str(profile), '-purgecaches', '-ZoteroDebugText', '-debugger'], startupinfo=startup, stdout=log, stderr=log)
    result = profile / 'result.json'
    try:
        deadline = time.monotonic() + 100
        sock = None
        while time.monotonic() < deadline:
            try:
                sock = socket.create_connection(('127.0.0.1', debug_port), timeout=1)
                break
            except OSError:
                time.sleep(.5)
        if sock is None:
            raise SystemExit('Isolated Zotero debugger did not start')
        sock.settimeout(15)
        stream = sock.makefile('rb')

        def receive():
            size = b''
            while (char := stream.read(1)) != b':':
                if not char:
                    raise RuntimeError('Debugger connection closed')
                size += char
            return json.loads(stream.read(int(size)))

        def request(packet):
            encoded = json.dumps(packet).encode()
            sock.sendall(str(len(encoded)).encode() + b':' + encoded)
            while True:
                reply = receive()
                if reply.get('from') == packet['to']:
                    return reply

        receive()  # Protocol greeting
        form = request({'to': 'root', 'type': 'getProcess', 'id': 0})
        if 'processDescriptor' in form:
            form = request({'to': form['processDescriptor']['actor'], 'type': 'getTarget'})
        actor = form.get('process', form.get('form', form)).get('consoleActor')
        if not actor:
            raise RuntimeError('No parent-process console actor')
        install_script = '''(async () => {
          const { Zotero } = ChromeUtils.importESModule('chrome://zotero/content/zotero.mjs');
          await Zotero.initializationPromise;
          const { AddonManager } = ChromeUtils.importESModule('resource://gre/modules/AddonManager.sys.mjs');
          const file = Cc['@mozilla.org/file/local;1'].createInstance(Ci.nsIFile);
          file.initWithPath(INSTALL_PATH);
          let install;
          try {
            install = await AddonManager.getInstallForFile(file);
            await install.install();
            const scope = { Zotero, Services, ChromeUtils, Cc, Ci, IOUtils };
            Services.scriptloader.loadSubScript(TEST_URI, scope, 'UTF-8');
            scope.startup();
          } catch (error) {
            await IOUtils.writeJSON(RESULT_PATH, { ok: false, error: error.message, installError: install?.error, errors: error.additionalErrors, console: Services.console.getMessageArray().map(m => m.message).slice(-30) });
          }
        })();'''
        install_script = install_script.replace('INSTALL_PATH', json.dumps(str(stage / (plugin_id + '.xpi'))))
        install_script = install_script.replace('TEST_URI', json.dumps((test_addon / 'bootstrap.js').as_uri()))
        install_script = install_script.replace('RESULT_PATH', json.dumps(str(result)))
        request({'to': actor, 'type': 'evaluateJSAsync', 'text': install_script})
        while time.monotonic() < deadline and not result.exists():
            time.sleep(1)
        if not result.exists():
            raise SystemExit(f'No smoke result within 100s. Inspect isolated profile {profile}')
        report = json.loads(result.read_text(encoding='utf-8'))
        print(json.dumps(report, ensure_ascii=True, indent=2), flush=True)
        stream.close()
        sock.close()
        if not report.get('ok'):
            raise SystemExit(1)
    finally:
        # Terminate only the exact child we launched; leave all existing Zotero processes alone.
        if process.poll() is None:
            process.terminate()
            process.wait(timeout=15)
        if os.name == 'nt':
            # Mozilla's Windows launcher can detach the real browser process.
            # Filter by this exact disposable profile, never by process name alone.
            cleanup = "$taskProcesses = Get-CimInstance Win32_Process -Filter \"Name='zotero.exe'\"; $taskProcesses | Where-Object { $_.CommandLine -and $_.CommandLine.Contains($env:JOURNAL_SMOKE_PROFILE) } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"
            subprocess.run(['powershell', '-NoProfile', '-Command', cleanup], env={**os.environ, 'JOURNAL_SMOKE_PROFILE': str(profile)}, capture_output=True)
        log.close()


if __name__ == '__main__':
    main()
