import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeClosetPhoto } from '../lib/gemini.js';

test('analyzeClosetPhoto returns parsed category and color tags from Gemini output', async () => {
  process.env.GEMINI_API_KEY = 'test-key';
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      candidates: [
        {
          content: {
            parts: [{ text: '{"category":"Dress","colorTags":["red","white"],"styleTags":["long_sleeve","formal"]}' }]
          }
        }
      ]
    })
  });

  try {
    const result = await analyzeClosetPhoto({
      dataUrl: 'data:image/png;base64,AAAA',
      fallbackCategory: 'Other',
      fallbackColorTags: ['black']
    });

    assert.equal(result.category, 'Dress');
    assert.deepEqual(result.colorTags, ['red', 'white']);
    assert.deepEqual(result.styleTags, ['long_sleeve', 'formal']);
    assert.equal(result.source, 'gemini');
  } finally {
    global.fetch = originalFetch;
  }
});
