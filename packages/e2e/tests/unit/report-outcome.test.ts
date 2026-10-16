import { describe, expect, it } from 'vitest';
import type { ReportResult, ReportSerialGroup } from '../../src/report/build.ts';
import { outcome } from '../../src/report/outcome.ts';
import { REPORT_AT, reportAttempt, reportResult } from '../helpers/report.ts';

function serialAttempt(index: number, status: 'failed' | 'interrupted', durationMs: number) {
  return {
    ...reportAttempt({ index, status }),
    members: [{ id: `member-${index}`, index: 0, testId: 'test-1', status: 'passed' as const, startedAt: REPORT_AT, durationMs, steps: [], secondaryErrors: [] }],
  };
}

function serialOutcome(attempts: ReportSerialGroup['attempts'], status: ReportResult['status'] = 'passed') {
  const group = { id: 'group-1', attempts } as ReportSerialGroup;
  return outcome(reportResult({ status, serialGroupId: group.id, attempts: [] }), new Map([[group.id, group]]));
}

describe('serial verdict attempt', () => {
  it('retains the earlier passed member when a retry is interrupted after that member passed', () => {
    const result = serialOutcome([serialAttempt(0, 'failed', 1200), serialAttempt(1, 'interrupted', 300)]);
    expect(result.durationMs).toBe(1200);
    expect(result.verdict.durationMs).toBe(1200);
    expect(result.final.durationMs).toBe(300);
    expect(result.attempts.map((attempt) => attempt.durationMs)).toEqual([1200, 300]);
  });

  it('keeps completed member timing from an interrupted first attempt', () => {
    expect(serialOutcome([serialAttempt(0, 'interrupted', 1200)]).durationMs).toBe(1200);
  });
});
