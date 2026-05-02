/**
 * document.validator tests.
 */

const {
  validateFile,
  isAudioFile,
  isCodeFile,
  getFileExtension,
  MAX_FILE_SIZE,
} = require('../../validators/document.validator');

function file(over = {}) {
  return {
    originalname: 'doc.pdf',
    mimetype: 'application/pdf',
    size: 1024,
    buffer: Buffer.alloc(0),
    ...over,
  };
}

describe('getFileExtension', () => {
  it('returns lowercase extension without dot', () => {
    expect(getFileExtension('foo.PDF')).toBe('pdf');
    expect(getFileExtension('a.b.TS')).toBe('ts');
  });
  it('returns empty string for files without extensions', () => {
    expect(getFileExtension('Makefile')).toBe('');
    expect(getFileExtension('')).toBe('');
    expect(getFileExtension(null)).toBe('');
  });
});

describe('isAudioFile', () => {
  it('detects audio mime types', () => {
    expect(isAudioFile('audio/mpeg')).toBe(true);
    expect(isAudioFile('audio/wav')).toBe(true);
    expect(isAudioFile('audio/x-m4a')).toBe(true);
  });
  it('rejects non-audio', () => {
    expect(isAudioFile('application/pdf')).toBe(false);
    expect(isAudioFile('')).toBeFalsy();
    expect(isAudioFile(null)).toBeFalsy();
  });
});

describe('isCodeFile', () => {
  it('accepts via known extension regardless of mime type', () => {
    expect(isCodeFile('application/octet-stream', 'main.py')).toBe(true);
    expect(isCodeFile('text/plain', 'index.tsx')).toBe(true);
    expect(isCodeFile('', 'app.go')).toBe(true);
  });
  it('accepts via mime type when extension missing/unknown', () => {
    expect(isCodeFile('text/javascript', 'noext')).toBe(true);
    expect(isCodeFile('text/x-rust', 'noext')).toBe(true);
  });
  it('rejects unrelated content', () => {
    expect(isCodeFile('application/pdf', 'doc.pdf')).toBe(false);
    expect(isCodeFile('image/png', 'a.png')).toBe(false);
  });
  it('accepts .ipynb (notebook)', () => {
    expect(isCodeFile('application/json', 'analysis.ipynb')).toBe(true);
  });
});

describe('validateFile', () => {
  it('rejects when file missing', () => {
    expect(validateFile(null).valid).toBe(false);
  });

  it('accepts PDF', () => {
    expect(validateFile(file()).valid).toBe(true);
  });

  it('accepts DOCX', () => {
    expect(validateFile(file({
      originalname: 'a.docx',
      mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })).valid).toBe(true);
  });

  it('accepts code files by extension even with text/plain mime', () => {
    expect(validateFile(file({
      originalname: 'main.py', mimetype: 'text/plain',
    })).valid).toBe(true);
  });

  it('rejects unknown binary types', () => {
    const r = validateFile(file({
      originalname: 'a.exe', mimetype: 'application/x-msdownload',
    }));
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/Invalid file type/);
  });

  it('accepts file at exactly MAX_FILE_SIZE (boundary)', () => {
    expect(validateFile(file({ size: MAX_FILE_SIZE })).valid).toBe(true);
  });

  it('rejects file one byte over MAX_FILE_SIZE', () => {
    const r = validateFile(file({ size: MAX_FILE_SIZE + 1 }));
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/too large/);
  });

  it('accepts audio (validation only — premium gating happens in controller)', () => {
    expect(validateFile(file({
      originalname: 'a.mp3', mimetype: 'audio/mpeg', size: 1024,
    })).valid).toBe(true);
  });
});
