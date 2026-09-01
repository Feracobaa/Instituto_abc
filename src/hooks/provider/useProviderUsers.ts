import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { schoolQueryKeys } from "@/hooks/school/queryKeys";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { getFriendlyErrorMessage } from "@/lib/supabaseErrors";
import { invalidateProviderQueries } from "./providerQueryUtils";

export interface ProviderAssignUserRolePayload {
  email: string;
  fullName?: string;
  institutionId: string;
  makeDefault?: boolean;
  role: "rector" | "profesor" | "parent" | "contable";
}

export interface EtymonCreateUserPayload {
  email: string;
  full_name: string;
  institution_id: string;
  role: "rector" | "profesor" | "contable";
  temporary_password?: string;
}

export interface EtymonCreateUserResult {
  user_id: string;
  email: string;
  full_name: string;
  temporary_password: string;
  role: string;
  institution_id: string;
}

export interface EtymonInstitutionUser {
  email: string;
  full_name: string;
  institution_id: string;
  is_default: boolean;
  membership_id: string;
  role: string;
  user_id: string;
}

export interface ProviderRolePermission {
  role: string;
  module_id: string;
  module_code: string;
  module_name: string;
  access_level: "full" | "readonly" | "none";
}

export function useProviderLinkRectorByEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { email: string; institutionId: string; makeDefault?: boolean }) => {
      const { data, error } = await supabase.rpc("provider_link_rector_by_email", {
        p_email: payload.email,
        p_institution_id: payload.institutionId,
        p_make_default: payload.makeDefault ?? true,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateProviderQueries(queryClient);
      toast({ title: "Rector vinculado" });
    },
    onError: (error) => {
      toast({
        title: "Error al vincular rector",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

export function useProviderAssignUserRoleByEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ProviderAssignUserRolePayload) => {
      const { data, error } = await supabase.rpc("provider_assign_user_role_by_email", {
        p_email: payload.email,
        p_full_name: payload.fullName ?? null,
        p_institution_id: payload.institutionId,
        p_make_default: payload.makeDefault ?? true,
        p_role: payload.role,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateProviderQueries(queryClient);
      toast({ title: "Usuario asignado", description: "Perfil y rol alineados con la institucion." });
    },
    onError: (error) => {
      toast({
        title: "Error al asignar usuario",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

/** Creates a new platform user with a temporary password via Etymon Edge Function. */
export function useEtymonCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: EtymonCreateUserPayload): Promise<EtymonCreateUserResult> => {
      const { data, error } = await supabase.functions.invoke("etymon-create-user", {
        body: payload,
      });

      if (data?.error) {
        throw new Error(data.error as string);
      }

      if (error) {
        let serverMessage = error.message;
        try {
          if (error && typeof error === 'object' && 'context' in error) {
            const contextError = error as { context?: { json?: () => Promise<{ error?: string }> } };
            if (contextError.context && typeof contextError.context.json === 'function') {
              const errBody = await contextError.context.json();
              if (errBody && errBody.error) {
                serverMessage = errBody.error;
              }
            }
          }
        } catch {
          // Ignorar si falla al parsear
        }
        
        throw new Error(serverMessage ?? "Error desconocido al invocar la funcion.");
      }

      return data as EtymonCreateUserResult;
    },
    onSuccess: (result) => {
      invalidateProviderQueries(queryClient);
      toast({
        title: "Usuario creado",
        description: `${result.full_name} (${result.email}) fue creado exitosamente.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error al crear usuario",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

/** Lists all users (memberships + profiles) for a given institution. */
export function useEtymonInstitutionUsers(institutionId?: string | null) {
  return useQuery({
    queryKey: ["etymon", "institution-users", institutionId ?? "none"],
    enabled: Boolean(institutionId),
    queryFn: async (): Promise<EtymonInstitutionUser[]> => {
      const { data, error } = await supabase
        .from("institution_memberships")
        .select("id, user_id, role, institution_id, is_default")
        .eq("institution_id", institutionId as string)
        .order("role", { ascending: true });

      if (error) throw error;
      if (!data || data.length === 0) return [];

      const userIds = data.map((row) => row.user_id);

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds);

      if (profilesError) throw profilesError;

      const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));

      return data.map((membership) => {
        const profile = profileMap.get(membership.user_id);
        return {
          email: profile?.email ?? "—",
          full_name: profile?.full_name ?? "Sin nombre",
          institution_id: membership.institution_id,
          is_default: membership.is_default,
          membership_id: membership.id,
          role: membership.role,
          user_id: membership.user_id,
        };
      });
    },
  });
}

/** Removes a user's membership from an institution (does NOT delete the auth account). */
export function useEtymonRemoveUserMembership() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      membershipId,
      institutionId,
    }: {
      membershipId: string;
      institutionId: string;
    }) => {
      const { error } = await supabase
        .from("institution_memberships")
        .delete()
        .eq("id", membershipId)
        .eq("institution_id", institutionId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["etymon", "institution-users", variables.institutionId] });
      invalidateProviderQueries(queryClient);
      toast({ title: "Acceso revocado", description: "El usuario fue desvinculado de esta institución." });
    },
    onError: (error) => {
      toast({
        title: "Error al revocar acceso",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

export function useProviderRolePermissions() {
  return useQuery({
    queryKey: schoolQueryKeys.provider.rolePermissions,
    queryFn: async (): Promise<ProviderRolePermission[]> => {
      const { data, error } = await supabase.rpc("provider_get_role_permissions_matrix");
      if (error) throw error;
      return (data ?? []) as ProviderRolePermission[];
    },
  });
}

export function useProviderSetRolePermission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      role,
      moduleCode,
      accessLevel,
    }: {
      role: string;
      moduleCode: string;
      accessLevel: "full" | "readonly" | "none";
    }) => {
      const { error } = await supabase.rpc("provider_set_role_permission", {
        p_role: role,
        p_module_code: moduleCode,
        p_access_level: accessLevel,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.provider.rolePermissions });
      invalidateProviderQueries(queryClient);
    },
    onError: (error) => {
      toast({
        title: "Error al actualizar permiso",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}
