import { supabase, getCurrentUser } from './supabase';

export interface AdminLogParams {
  actionType: string;
  actionCategory: 'balance' | 'trading' | 'user' | 'wallet' | 'deposit' | 'withdrawal' | 'system' | 'security';
  targetUserId?: string;
  details?: any;
  status?: 'success' | 'failed' | 'partial';
  errorMessage?: string;
  notes?: string;
}

export async function logAdminAction(params: AdminLogParams): Promise<string | null> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      console.error('Cannot log admin action: No authenticated user');
      return null;
    }

    const { data, error } = await supabase.rpc('log_admin_action', {
      p_admin_user_id: user.id,
      p_action_type: params.actionType,
      p_action_category: params.actionCategory,
      p_target_user_id: params.targetUserId || null,
      p_details: params.details || {},
      p_status: params.status || 'success',
      p_error_message: params.errorMessage || null,
      p_notes: params.notes || null
    });

    if (error) {
      console.error('Error logging admin action:', error);
      return null;
    }

    return data as string;
  } catch (err) {
    console.error('Exception while logging admin action:', err);
    return null;
  }
}

export async function logBalanceChange(
  targetUserId: string,
  symbol: string,
  amount: number,
  type: 'add' | 'remove' | 'transfer',
  balanceBefore: number,
  balanceAfter: number,
  notes?: string
): Promise<string | null> {
  try {
    const user = await getCurrentUser();

    if (!user) return null;

    const { data, error } = await supabase.rpc('log_balance_change', {
      p_admin_user_id: user.id,
      p_target_user_id: targetUserId,
      p_symbol: symbol,
      p_amount: amount,
      p_type: type,
      p_balance_before: balanceBefore,
      p_balance_after: balanceAfter,
      p_notes: notes || null
    });

    if (error) {
      console.error('Error logging balance change:', error);
      return null;
    }

    return data as string;
  } catch (err) {
    console.error('Exception while logging balance change:', err);
    return null;
  }
}
