const assert = require('node:assert/strict');
const test = require('node:test');
const sharp = require('sharp');
const { PHASE_DEVELOPMENT_SERVER } = require('next/constants');
const { defaultConfig } = require('next/dist/server/config-shared');
const { ImageOptimizerCache, imageOptimizer } = require('next/dist/server/image-optimizer');
const loadConfig = require('next/dist/server/config').default;

for (const format of ['png', 'webp', 'avif']) {
  test(`patched optimizer converts legitimate ${format} bytes to WebP`, async () => {
    const buffer = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#123456' } }).toFormat(format).toBuffer();
    const output = await imageOptimizer(
      { buffer, contentType: 'image/png', cacheControl: null, etag: 'synthetic' },
      { href: '/synthetic', width: 2, quality: 75, mimeType: 'image/webp' },
      defaultConfig, { isDev: false, silent: true },
    );
    assert.equal(output.error, undefined);
    const metadata = await sharp(output.buffer).metadata();
    assert.equal(metadata.format, 'webp');
    assert.equal(metadata.width, 2);
    assert.equal(metadata.height, 2);
  });
}

test('optimizer rejects invalid bytes and SVG despite a PNG declaration', async () => {
  for (const buffer of [Buffer.from('not an image'), Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')]) {
    await assert.rejects(() => imageOptimizer(
      { buffer, contentType: 'image/png', cacheControl: null, etag: 'synthetic' },
      { href: '/synthetic', width: 2, quality: 75, mimeType: 'image/webp' },
      defaultConfig, { isDev: false, silent: true },
    ), (error) => error.statusCode === 400);
  }
});

test('configured optimizer preserves avatar hosts and rejects unrelated or recursive URLs', async () => {
  const config = await loadConfig(PHASE_DEVELOPMENT_SERVER, process.cwd(), { silent: true });
  const request = { headers: { accept: 'image/webp' } };
  const validate = (url) => ImageOptimizerCache.validateParams(request, { url, w: '640', q: '75' }, config, false);
  for (const url of ['/images/local.png', 'https://lh3.googleusercontent.com/avatar.png', 'https://example.supabase.co/avatar.png']) {
    assert(!('errorMessage' in validate(url)), `Legitimate image URL rejected: ${url}`);
  }
  for (const url of ['https://example.invalid/image.png', 'http://lh3.googleusercontent.com/avatar.png', '//example.invalid/image.png', '/_next%2Fimage?url=x']) {
    assert('errorMessage' in validate(url), `Unexpected admission: ${url}`);
  }
});
