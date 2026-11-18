import { render, screen } from '@testing-library/react';
import { Suspense } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { lazyWithRetry } from './lazyWithRetry';
import { isChunkLoadError, retry } from './retry';

const chunkError = () => Object.assign(new Error('Loading chunk 42 failed.'), { name: 'ChunkLoadError' });

describe('retry', () => {
  it('retries then succeeds', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error('blip')).mockResolvedValue('ok');
    await expect(retry(fn, 1, 1)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('gives up after the retry budget', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('down'));
    await expect(retry(fn, 1, 1)).rejects.toThrow('down');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('isChunkLoadError', () => {
  it('recognises webpack chunk failures', () => {
    expect(isChunkLoadError(chunkError())).toBe(true);
    expect(isChunkLoadError(new Error('Loading CSS chunk abc failed'))).toBe(true);
    expect(isChunkLoadError(new Error('nope'))).toBe(false);
  });
});

describe('lazyWithRetry', () => {
  it('recovers from one ChunkLoadError and shares the preload promise', async () => {
    const factory = vi
      .fn()
      .mockRejectedValueOnce(chunkError())
      .mockResolvedValue({ default: () => <p>loaded</p> });
    const Lazy = lazyWithRetry(factory, { retries: 1, delayMs: 1 });

    const preload = Lazy.preload();
    render(
      <Suspense fallback={<p>loading</p>}>
        <Lazy />
      </Suspense>,
    );
    expect(await screen.findByText('loaded')).toBeInTheDocument();
    await preload;
    expect(factory).toHaveBeenCalledTimes(2); // one failure + one retry, not more
  });
});
