'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function deleteUserAccountAction() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Chưa xác thực người dùng.' };
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    console.error('LỖI: Thiếu SUPABASE_SERVICE_ROLE_KEY trong biến môi trường.');
    return { success: false, error: 'Hệ thống chưa được cấu hình khóa bảo mật để xóa tài khoản.' };
  }

  // Khởi tạo Admin Client bằng Service Role Key
  const adminAuthClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  // Xóa user vĩnh viễn khỏi hệ thống auth Supabase
  const { error: deleteError } = await adminAuthClient.auth.admin.deleteUser(user.id);

  if (deleteError) {
    console.error('Lỗi khi xóa người dùng:', deleteError.message);
    return { success: false, error: 'Có lỗi xảy ra khi xóa tài khoản. Thử lại sau.' };
  }

  return { success: true };
}
