begin;

grant select on public.student_tuition_month_status to authenticated;
grant select on public.student_tuition_summary to authenticated;
grant select on public.accounting_ledger to authenticated;

commit;
