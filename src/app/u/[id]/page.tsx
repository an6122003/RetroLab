import { Metadata, ResolvingMetadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Clock, MessageSquare, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getAvatar } from '@/constants/avatars';

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, bio')
    .eq('id', id)
    .single();

  if (!profile) {
    return { title: 'User Not Found | RetroLab' };
  }

  return {
    title: `${profile.display_name} | RetroLab`,
    description: profile.bio || `View ${profile.display_name}'s profile on RetroLab.`,
  };
}

export default async function PublicProfilePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_id, bio, created_at')
    .eq('id', id)
    .single();

  if (error || !profile) {
    notFound();
  }

  const currentAvatar = getAvatar(profile.avatar_id);

  // We can fetch their comments here in the future if we build public activity
  // const { data: comments } = await supabase.from('comments').select('...').eq('user_id', profile.id)

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        {/* Profile Header Card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-8 flex flex-col md:flex-row gap-8 items-center md:items-start shadow-sm relative overflow-hidden">
          {/* Subtle background decoration */}
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-r from-blue-50 to-indigo-50 z-0"></div>

          {/* Avatar side */}
          <div className="w-32 h-32 rounded-full bg-blue-50 flex items-center justify-center border-4 border-white shadow-md overflow-hidden shrink-0 z-10">
            <Image
              src={currentAvatar.src}
              alt={currentAvatar.label}
              width={128}
              height={128}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Info side */}
          <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left z-10 pt-4 md:pt-8 w-full">
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              {profile.display_name}
            </h1>
            
            <div className="flex items-center gap-1.5 text-sm font-medium text-gray-500 bg-white border border-gray-100 px-3 py-1.5 rounded-full mt-3 shadow-sm">
              <Clock size={14} className="text-blue-500" />
              <span>Thành viên từ {new Date(profile.created_at).toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' })}</span>
            </div>

            {profile.bio && (
              <p className="mt-6 text-gray-700 leading-relaxed max-w-2xl bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm italic">
                "{profile.bio}"
              </p>
            )}
          </div>
        </div>

        {/* Activity Section */}
        <div className="mt-12">
          <h2 className="text-xl font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2 mb-6 pb-4 border-b border-gray-200">
            <MessageSquare className="text-blue-600" size={24} fill="currentColor" />
            Hoạt động gần đây
          </h2>
          
          <div className="bg-gray-50 border border-gray-200 border-dashed rounded-xl p-12 text-center text-gray-500 flex flex-col items-center justify-center">
            <AlertCircle size={40} className="text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Chưa có thông tin</h3>
            <p className="text-sm max-w-sm mx-auto">
              {profile.display_name} chưa có hoạt động công khai nào (bình luận, bài thảo luận) trên hệ thống.
            </p>
          </div>
        </div>
      </div>
  );
}
