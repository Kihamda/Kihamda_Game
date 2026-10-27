"""Stage and verify root files, then promote them with rollback on failure."""
from uuid import uuid4


def promote(ftp, changes, verify_http, read_ftp):
    # Listing distinguishes an absent file from a permission error on RETR.
    names = {name.rsplit('/', 1)[-1] for name in ftp.nlst()}
    if 'index.html' not in names:
        raise RuntimeError('Cannot confirm root directory from FTP listing')
    previous = {name: read_ftp(ftp, name) if name in names else None for name in changes}
    token = uuid4().hex
    pending = {name: f'{name}.pending-{token}' for name in changes}
    restore = {name: f'{name}.restore-{token}' for name in changes}
    if any(name in names for name in [*pending.values(), *restore.values()]):
        raise RuntimeError('Temporary FTP name already exists')
    attempted = set()
    promoted = []
    import io
    try:
        for name, body in changes.items():
            attempted.add(pending[name])
            ftp.storbinary('STOR ' + pending[name], io.BytesIO(body))
            if read_ftp(ftp, pending[name]) != body:
                raise RuntimeError('Staging verification failed: ' + name)
        for name, body in changes.items():
            current_names = {item.rsplit('/', 1)[-1] for item in ftp.nlst()}
            current = read_ftp(ftp, name) if name in current_names else None
            if current != previous[name]:
                raise RuntimeError('File changed during staging: ' + name)
            ftp.rename(pending[name], name)
            attempted.discard(pending[name])
            promoted.append(name)
            if read_ftp(ftp, name) != body:
                raise RuntimeError('FTP verification failed: ' + name)
            verify_http(name, body)
    except Exception as original:
        failures = []
        for name in reversed(promoted):
            try:
                if read_ftp(ftp, name) != changes[name]:
                    failures.append(name + ': changed by another writer')
                    continue
                if previous[name] is None:
                    ftp.delete(name)
                else:
                    attempted.add(restore[name])
                    ftp.storbinary('STOR ' + restore[name], io.BytesIO(previous[name]))
                    if read_ftp(ftp, restore[name]) != previous[name]:
                        raise RuntimeError('Restore staging verification failed')
                    ftp.rename(restore[name], name)
                    attempted.discard(restore[name])
                    if read_ftp(ftp, name) != previous[name]:
                        raise RuntimeError('Restore verification failed')
            except Exception as error:
                failures.append(name + ': ' + str(error))
        for name in attempted:
            try:
                # A partial upload may exist even when STOR raised an exception.
                if name in {item.rsplit('/', 1)[-1] for item in ftp.nlst()}:
                    ftp.delete(name)
            except Exception as error:
                failures.append(name + ': cleanup failed: ' + str(error))
        if failures:
            raise RuntimeError('Rollback or cleanup failed: ' + '; '.join(failures)) from original
        raise
