'use strict';
// The adapter (task 0005): folder and file handles over Node's `fs` that behave like the browser's (File System
// Access API), so the format's own code – app/vendor/toolbox-format/toolbox-folder.js, copied unchanged – works on
// the real Toolbox folder. Only what that code uses is here:
//
//   directory handle: kind, name, getDirectoryHandle(name, {create}), getFileHandle(name, {create}), entries(),
//                     removeEntry(name, {recursive})
//   file handle:      kind, name, getFile(), createWritable()
//   file (getFile()): name, size, lastModified, type, slice(), arrayBuffer(), stream(), text()
//   writable:         write(data), close(), abort()
//
// Errors are DOMExceptions with the browser's names (NotFoundError, TypeMismatchError, NoModificationAllowedError …),
// because the format's code decides by them: a refused write must be NoModificationAllowedError (try again later), a
// refused read NotReadableError (not complete yet), a name the system cannot use a TypeError (a bad job).
// Where the adapter differs from a browser, on purpose:
// - A link (a symbolic link, a junction or a mounted drive on Windows) is never followed: it is listed with kind
//   'link', which the format's code skips; opening it gives TypeMismatchError ("not a plain file"); it is never
//   deleted, nor deleted through. Accepted: a handle is a path, so a folder swapped for a link after it was looked at
//   is followed by a later read (FORMAT.md 10: anyone who can write in the folder is trusted as the user is). A
//   recursive delete checks again before it goes into a folder.
// - getFileHandle(name, {create: true}) makes no empty file: the file appears whole when its writable is closed.
//   (A browser makes the empty file at once; a reader could then meet an empty job.json.)
// - createWritable() writes beside the file and moves it over the old one on close(): whole or not at all. If the
//   move is refused, close() tries a few times for a moment, then gives NoModificationAllowedError and leaves the old
//   file as it was – the format's code tries again later. (Measured on GitHub's Windows Server 2025: Node replaces
//   and deletes a file even while another program holds it open, so this is rare from Node; it is tested by forcing
//   it, tests/folder.test.js.)
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

/** How often and how long close() tries again when the move is refused. Short: the format's code has its own
    patience for statuses, and the app tries again at its next look. */
const REPLACE_TRIES = { count: 5, pauseMs: 20 };
const REFUSED = new Set(['EPERM', 'EACCES', 'EBUSY']);
const TEMP = /^\.tb-[0-9a-f]{12}\.tmp$/;
const WINDOWS = process.platform === 'win32';

function domError(name, message) {
  return new DOMException(message, name);
}

/** a Node error as the browser would name it; `writing` for errors of a write, move or delete */
function asDom(err, writing) {
  if (err instanceof DOMException || err instanceof TypeError) return err;
  const code = err && err.code;
  const msg = (err && err.message) || String(err);
  if (code === 'ENOENT') return domError('NotFoundError', msg);
  if (code === 'EISDIR' || code === 'ENOTDIR') return domError(writing ? 'InvalidModificationError' : 'TypeMismatchError', msg);
  if (code === 'ENOTEMPTY') return domError('InvalidModificationError', msg);
  if (code === 'ENOSPC' || code === 'EDQUOT') return domError('QuotaExceededError', msg);
  if (REFUSED.has(code)) return domError(writing ? 'NoModificationAllowedError' : 'NotReadableError', msg);
  return domError(writing ? 'UnknownError' : 'NotReadableError', msg);
}

/** a name the browser takes for one entry of a folder; TypeError otherwise. On Windows also no ':' (a name's
    hidden data stream) and no dot or space at the end (Windows would drop it). */
function checkName(name) {
  if (typeof name !== 'string' || name === '' || name === '.' || name === '..' || /[/\\\0]/.test(name) ||
      (WINDOWS && (/:/.test(name) || /[. ]$/.test(name)))) {
    throw new TypeError(`'${name}' is not a name for an entry of a folder`);
  }
}

/** 'file', 'directory', 'link' or 'other' – of the entry itself, never of what a link points to; null when missing.
    A folder on another drive than its parent (a drive mounted into a folder on Windows, a mount on Linux) counts as
    a link. `writing`: the look is part of a write, so a refusal is a refused write. */
async function kindOf(p, writing = false) {
  let st;
  try {
    st = await fsp.lstat(p);
  } catch (err) {
    if (err.code === 'ENOENT' || err.code === 'ENOTDIR') return null;
    if (err.code === 'EINVAL' || err.code === 'ENAMETOOLONG') throw new TypeError(err.message);   // a name this system cannot use
    throw asDom(err, writing);
  }
  if (st.isSymbolicLink()) return 'link';            // on Windows also a junction (Node reads its reparse tag)
  if (st.isDirectory()) {
    try {
      if ((await fsp.lstat(path.dirname(p))).dev !== st.dev) return 'link';
    } catch {
      // the parent cannot be looked at: the entry stays what it said it was
    }
    return 'directory';
  }
  if (st.isFile()) return 'file';
  return 'other';
}

const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));

/** The bytes of a file on disk, read when asked (Node's file-backed Blob, which keeps no file open). Like a
    browser's File it fails with NotReadableError when the file changes or goes after it was opened. */
class NodeFile {
  constructor(blob, name, lastModified) {
    this._blob = blob;
    this.name = name;
    this.lastModified = lastModified;
    this.type = '';
  }
  get size() { return this._blob.size; }
  slice(start, end, type) { return this._blob.slice(start, end, type); }
  arrayBuffer() { return this._blob.arrayBuffer(); }
  stream() { return this._blob.stream(); }
  text() { return this._blob.text(); }
}

/** write all of `bytes`: one system call may write less than asked (a nearly full disk) */
async function writeAll(fh, bytes) {
  for (let done = 0; done < bytes.length;) {
    const { bytesWritten } = await fh.write(bytes, done, bytes.length - done);
    if (bytesWritten <= 0) throw Object.assign(new Error('nothing more could be written'), { code: 'ENOSPC' });
    done += bytesWritten;
  }
}

class Writable {
  constructor(target, temp, handle) {
    this._target = target;
    this._temp = temp;
    this._fh = handle;
    this._done = false;
  }

  _open() {
    if (this._done) throw new TypeError('the writable is closed');
  }

  async write(data) {
    this._open();
    if (data && typeof data === 'object' && data.type === 'write' && 'data' in data) data = data.data;
    try {
      if (typeof data === 'string') await writeAll(this._fh, Buffer.from(data, 'utf8'));
      else if (data instanceof ArrayBuffer) await writeAll(this._fh, new Uint8Array(data));
      else if (ArrayBuffer.isView(data)) await writeAll(this._fh, new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
      else if (data && typeof data.stream === 'function') {
        for await (const chunk of data.stream()) await writeAll(this._fh, chunk);
      } else throw new TypeError('write() takes text, bytes or a Blob');
    } catch (err) {
      throw asDom(err, true);
    }
  }

  /** the new content replaces the file whole; on a refusal the old file stays and the new one is dropped */
  async close() {
    this._open();
    this._done = true;
    try {
      try {
        await this._fh.sync();
      } catch (err) {
        if (!['EINVAL', 'ENOTSUP', 'ENOSYS'].includes(err.code)) throw err;   // a drive that cannot flush
      }
      await this._fh.close();
    } catch (err) {
      await this._fh.close().catch(() => {});
      await fsp.unlink(this._temp).catch(() => {});
      throw asDom(err, true);
    }
    for (let i = 0; ; i += 1) {
      try {
        const st = await fsp.lstat(this._target).catch((err) => { if (err.code === 'ENOENT') return null; throw err; });
        if (st && !st.isFile()) throw domError('TypeMismatchError', `${this._target} is not a plain file`);
        await fsp.rename(this._temp, this._target);
        return;
      } catch (err) {
        if (!REFUSED.has(err && err.code) || i + 1 >= REPLACE_TRIES.count) {
          await fsp.unlink(this._temp).catch(() => {});
          throw asDom(err, true);
        }
      }
      await sleep(REPLACE_TRIES.pauseMs);
    }
  }

  async abort() {
    if (this._done) return;
    this._done = true;
    await this._fh.close().catch(() => {});
    await fsp.unlink(this._temp).catch(() => {});
  }
}

class FileHandle {
  constructor(p) {
    this.kind = 'file';
    this.name = path.basename(p);
    this._path = p;
  }

  async getFile() {
    const kind = await kindOf(this._path);
    if (kind === null) throw domError('NotFoundError', `${this._path} is not there`);
    if (kind !== 'file') throw domError('TypeMismatchError', `${this._path} is not a plain file`);
    let blob;
    let st;
    try {
      // openAsBlob does not add Windows' long-path prefix itself (the rest of fs does)
      blob = await fs.openAsBlob(path.toNamespacedPath(this._path));
      st = await fsp.stat(this._path);
    } catch (err) {
      throw asDom(err, false);
    }
    return new NodeFile(blob, this.name, Math.floor(st.mtimeMs));
  }

  async createWritable(options = {}) {
    if (options && options.keepExistingData) throw new TypeError('keepExistingData is not supported here');
    // Beside the file, a name no file of the format can have (3.3: no name starts with a dot); short, so a long
    // name plus it never passes the system's limit. Left behind only by a crash: removeTemps() clears old ones.
    const temp = path.join(path.dirname(this._path), '.tb-' + crypto.randomBytes(6).toString('hex') + '.tmp');
    let fh;
    try {
      fh = await fsp.open(temp, 'wx');
    } catch (err) {
      throw asDom(err, true);
    }
    return new Writable(this._path, temp, fh);
  }
}

/** the identity of a folder on disk, to see that it was not swapped for something else meanwhile */
async function identity(p) {
  const st = await fsp.lstat(p, { bigint: true });
  return st.isDirectory() && !st.isSymbolicLink() ? `${st.dev}:${st.ino}` : null;
}

/** Delete a folder and what is in it. A link inside is removed itself, never followed; a folder that changes into
    something else while it is deleted is not gone into. job.json goes first: a job folder that is only half
    deleted (Windows refused a file) is never taken for a new job. */
async function removeTree(p) {
  const before = await identity(p);
  const names = await fsp.readdir(p);
  if (!before || before !== await identity(p)) {
    throw Object.assign(new Error(`${p} changed while it was deleted`), { code: 'EBUSY' });
  }
  names.sort((a, b) => (a === 'job.json' ? -1 : b === 'job.json' ? 1 : 0));
  for (const name of names) {
    const q = path.join(p, name);
    const kind = await kindOf(q, true);
    if (kind === 'directory') await removeTree(q);
    else if (kind === 'link') {
      try {
        await fsp.unlink(q);
      } catch (err) {
        if (err.code !== 'EPERM' && err.code !== 'EISDIR') throw err;
        await fsp.rmdir(q);                                   // a junction or a link to a folder on Windows
      }
    } else if (kind !== null) await fsp.unlink(q);
  }
  await fsp.rmdir(p);
}

class DirectoryHandle {
  constructor(p) {
    this.kind = 'directory';
    this.name = path.basename(p);
    this._path = p;
  }

  async getDirectoryHandle(name, options = {}) {
    checkName(name);
    const p = path.join(this._path, name);
    let kind = await kindOf(p, !!options.create);
    if (kind === null && options.create) {
      try {
        await fsp.mkdir(p);
      } catch (err) {
        if (err.code !== 'EEXIST') throw asDom(err, true);
      }
      kind = await kindOf(p, true);
    }
    if (kind === null) throw domError('NotFoundError', `${p} is not there`);
    if (kind !== 'directory') throw domError('TypeMismatchError', `${p} is not a plain folder`);
    return new DirectoryHandle(p);
  }

  async getFileHandle(name, options = {}) {
    checkName(name);
    const p = path.join(this._path, name);
    const kind = await kindOf(p, !!options.create);
    if (kind === null) {
      if (!options.create) throw domError('NotFoundError', `${p} is not there`);
      if (await kindOf(this._path, true) !== 'directory') throw domError('NotFoundError', `${this._path} is not there`);
      return new FileHandle(p);
    }
    if (kind !== 'file') throw domError('TypeMismatchError', `${p} is not a plain file`);
    return new FileHandle(p);
  }

  async* entries() {
    let names;
    try {
      names = await fsp.readdir(this._path);
    } catch (err) {
      throw asDom(err, false);
    }
    for (const name of names) {
      const p = path.join(this._path, name);
      let kind;
      try {
        kind = await kindOf(p);
      } catch {
        continue;                                             // cannot be looked at right now: as if not there
      }
      if (kind === 'directory') yield [name, new DirectoryHandle(p)];
      else if (kind === 'file') yield [name, new FileHandle(p)];
      else if (kind !== null) yield [name, { kind, name }];   // a link or a device: the format's code skips it
    }
  }

  async removeEntry(name, options = {}) {
    checkName(name);
    const p = path.join(this._path, name);
    const kind = await kindOf(p, true);
    if (kind === null) throw domError('NotFoundError', `${p} is not there`);
    if (kind === 'link' || kind === 'other') {
      throw domError('InvalidModificationError', `${p} is a link or a device: it is never deleted, nor deleted through`);
    }
    try {
      if (kind === 'file') await fsp.unlink(p);
      else if (options.recursive) await removeTree(p);
      else await fsp.rmdir(p);
    } catch (err) {
      throw asDom(err, true);
    }
  }
}

/** a handle for a folder on disk (it need not exist yet) */
function directory(p) {
  return new DirectoryHandle(path.resolve(p));
}

/** a handle for a file on disk, e.g. one dropped on the app */
function fileAt(p) {
  return new FileHandle(path.resolve(p));
}

/** Delete what a crash left of writes in this folder (not in folders inside it): temporary files older than
    `minutes`. A delete that is refused is tried at the next call. */
async function removeTemps(p, minutes = 10) {
  let names;
  try {
    names = await fsp.readdir(p);
  } catch {
    return 0;
  }
  let removed = 0;
  for (const name of names) {
    if (!TEMP.test(name)) continue;
    try {
      const st = await fsp.lstat(path.join(p, name));
      if (st.isFile() && Date.now() - st.mtimeMs > minutes * 60 * 1000) {
        await fsp.unlink(path.join(p, name));
        removed += 1;
      }
    } catch {
      // gone already, or refused: next time
    }
  }
  return removed;
}

module.exports = { directory, fileAt, kindOf, removeTemps, REPLACE_TRIES };
