import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  SKIPPED_JOURNAL_TAGS,
  assertAppliedMigrationWhens,
  checkMigrationJournal,
} from './check-migration-journal.mjs';

const monotonic = [
  { idx: 0, tag: '0000_a', when: 100 },
  { idx: 1, tag: '0001_b', when: 200 },
  { idx: 2, tag: '0002_c', when: 300 },
];

describe('checkMigrationJournal', () => {
  it('accepts a strictly increasing journal', () => {
    assert.deepEqual(checkMigrationJournal(monotonic).failures, []);
  });

  it('rejects inverted timestamps', () => {
    const { failures } = checkMigrationJournal([
      { idx: 0, tag: '0000_a', when: 200 },
      { idx: 1, tag: '0001_b', when: 100 },
    ]);
    assert.match(failures[0], /0001_b when=100 <= 0000_a when=200/);
  });

  it('rejects equal timestamps (Drizzle would skip the later file)', () => {
    const { failures } = checkMigrationJournal([
      { idx: 0, tag: '0000_a', when: 100 },
      { idx: 1, tag: '0001_b', when: 100 },
    ]);
    assert.match(failures[0], /0001_b when=100 <= 0000_a when=100/);
  });

  it('rejects missing or non-finite when', () => {
    assert.match(
      checkMigrationJournal([{ idx: 0, tag: '0000_a' }]).failures[0],
      /finite number/
    );
    assert.match(
      checkMigrationJournal([{ idx: 0, tag: '0000_a', when: Number.NaN }]).failures[0],
      /finite number/
    );
  });

  it('allowlists the known 0017 inversion', () => {
    const { failures } = checkMigrationJournal([
      { idx: 0, tag: '0016_married_thing', when: 1786711054195 },
      { idx: 1, tag: '0017_new_redwing', when: 1786641850176 },
      { idx: 2, tag: '0018_remarkable_vulture', when: 1787833180461 },
    ]);
    assert.deepEqual(failures, []);
    assert.equal(SKIPPED_JOURNAL_TAGS.has('0017_new_redwing'), true);
  });
});

describe('assertAppliedMigrationWhens', () => {
  it('requires every non-allowlisted when to be present', () => {
    const { failures } = assertAppliedMigrationWhens(monotonic, [100, 300]);
    assert.match(failures[0], /0001_b when=200 is not in/);
  });

  it('allowlists 0017 when the row was never recorded', () => {
    const { failures } = assertAppliedMigrationWhens(
      [
        { tag: '0016_married_thing', when: 1786711054195 },
        { tag: '0017_new_redwing', when: 1786641850176 },
        { tag: '0018_remarkable_vulture', when: 1787833180461 },
      ],
      [1786711054195, 1787833180461]
    );
    assert.deepEqual(failures, []);
  });
});
