import { describe, expect, it } from 'vitest';
import type { ReportSerialGroup } from '../../src/report/build.ts';
import { outcome } from '../../src/report/outcome.ts';
import { renderMarkdownReport } from '../../src/report/markdown.ts';
import { REPORT_AT, reportAttempt, reportDocument, reportResult } from '../helpers/report.ts';
function fixture(status: 'failed' | 'passed', lastStatus: 'interrupted' | 'failed') {
 const result = reportResult({status, serialGroupId: 'g', attempts: []});
 const member = (state: 'failed' | 'passed' | 'skipped', ms: number) => ({id: 'm', index: 0, testId: result.testId, status: state, startedAt: REPORT_AT, durationMs: ms, steps: [], secondaryErrors: []});
 const group: ReportSerialGroup = {id:'g', serialId:'g', declarationIndex:0, file:result.file, source:result.source, titlePath:['flow'], targetId:result.targetId, platform:result.platform, agent:result.agent, repeat:0, memberTestIds:[result.testId], status, attempts:[{...reportAttempt({status}), members:[member(status, 1250)]},{...reportAttempt({status:lastStatus}), members:[member('skipped',0)]}]};
 return {result,group};
}
describe('retained serial verdict timing', () => {
 it.each(['failed','passed'] as const)('keeps the %s verdict duration after an interrupted retry', status => {
  const {result,group}=fixture(status,'interrupted');
  expect(outcome(result,new Map([['g',group]])).durationMs).toBe(1250);
 });
 it('keeps duration when a retry never reached a member', () => {
  const {result,group}=fixture('failed','failed');
  expect(outcome(result,new Map([['g',group]])).durationMs).toBe(1250);
 });
 it('prints the retained duration in the actual Markdown result row', () => {
  const {result,group}=fixture('failed','interrupted');
  expect(renderMarkdownReport(reportDocument({results:[result],serialGroups:[group]}))).toContain('1.3s');
 });
 it('uses the latest measured duration when the retry reached a verdict', () => {
  const {result,group}=fixture('failed','failed');
  const changed: ReportSerialGroup = {...group, attempts:[group.attempts[0]!, {...group.attempts[1]!, members:[{...group.attempts[1]!.members[0]!,status:'failed',durationMs:650}]}]};
  expect(outcome(result,new Map([['g',changed]])).durationMs).toBe(650);
 });
});
