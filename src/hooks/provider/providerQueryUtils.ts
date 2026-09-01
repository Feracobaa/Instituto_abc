import { QueryClient } from "@tanstack/react-query";
import { schoolQueryKeys } from "@/hooks/school/queryKeys";

export function invalidateProviderQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: schoolQueryKeys.provider.moduleCatalog });
  queryClient.invalidateQueries({ queryKey: schoolQueryKeys.provider.institutions });
  queryClient.invalidateQueries({ queryKey: schoolQueryKeys.provider.planModulesRoot });
  queryClient.invalidateQueries({ queryKey: schoolQueryKeys.provider.institutionModulesRoot });
  queryClient.invalidateQueries({ queryKey: schoolQueryKeys.provider.supportContext });
  queryClient.invalidateQueries({ queryKey: schoolQueryKeys.provider.auditLogs() });
  queryClient.invalidateQueries({ queryKey: schoolQueryKeys.provider.drift });
  queryClient.invalidateQueries({ queryKey: schoolQueryKeys.institution.settings });
}
