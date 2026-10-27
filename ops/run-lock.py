"""Hold an OS lock for one automation run; EOF or Enter releases it."""
import json
import msvcrt
import os
from pathlib import Path
import sys
from datetime import datetime, timezone
from uuid import uuid4

path = Path(__file__).resolve().parent / 'run.lock'
with path.open('a+b') as stream:
    stream.seek(0)
    if path.stat().st_size == 0:
        stream.write(b' ')
        stream.flush()
    stream.seek(0)
    try:
        msvcrt.locking(stream.fileno(), msvcrt.LK_NBLCK, 1)
    except OSError:
        print('Another run holds the lock', flush=True)
        sys.exit(2)
    stream.seek(0)
    previous = stream.read().decode('utf-8', errors='replace').strip()
    record = {'run_id': str(uuid4()), 'started_utc': datetime.now(timezone.utc).isoformat(), 'pid': os.getpid()}
    stream.seek(0)
    stream.truncate()
    stream.write(json.dumps(record).encode('utf-8'))
    stream.flush()
    print(json.dumps({'current': record, 'previous': previous}), flush=True)
    try:
        sys.stdin.readline()
    finally:
        stream.seek(0)
        msvcrt.locking(stream.fileno(), msvcrt.LK_UNLCK, 1)
