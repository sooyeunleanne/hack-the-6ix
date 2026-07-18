import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeClosetPhoto } from '../lib/gemini.js';

function mockGeminiText(text) {
  return async () => ({
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text }] } }]
    })
  });
}

test('analyzeClosetPhoto keeps only the single dominant hex color tag from Gemini output', async () => {
  process.env.GEMINI_API_KEY = 'test-key';
  const originalFetch = global.fetch;
  global.fetch = mockGeminiText('{"category":"Dress","colorTags":["#d0342c","#ffffff"],"styleTags":["long_sleeve","formal"]}');

  try {
    const result = await analyzeClosetPhoto({
      dataUrl: 'data:image/png;base64,AAAA',
      fallbackCategory: 'Other',
      fallbackColorTags: ['#000000']
    });

    assert.equal(result.category, 'Dress');
    // Only the first (most dominant) hex is kept — shadow/highlight shades
    // and secondary colors are not reported as separate tags.
    assert.deepEqual(result.colorTags, ['#D0342C']);
    assert.deepEqual(result.styleTags, ['long_sleeve', 'formal']);
    assert.equal(result.source, 'gemini');
  } finally {
    global.fetch = originalFetch;
  }
});

test('analyzeClosetPhoto drops non-hex color tags and falls back when none remain', async () => {
  process.env.GEMINI_API_KEY = 'test-key';
  const originalFetch = global.fetch;
  global.fetch = mockGeminiText('{"category":"Top","colorTags":["red","not-a-hex","#123"],"styleTags":[]}');

  try {
    const result = await analyzeClosetPhoto({
      dataUrl: 'data:image/png;base64,AAAA',
      fallbackCategory: 'Other',
      fallbackColorTags: ['#000000']
    });

    assert.deepEqual(result.colorTags, ['#000000']);
  } finally {
    global.fetch = originalFetch;
  }
});
