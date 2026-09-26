import { Instagram, Heart } from 'lucide-react';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import TikTokIcon from '@/components/icons/TikTokIcon';

const POSTS = [
  'https://images.pexels.com/photos/7818170/pexels-photo-7818170.png?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
  'https://images.pexels.com/photos/15191189/pexels-photo-15191189.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
  'https://images.pexels.com/photos/5816408/pexels-photo-5816408.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
  'https://images.pexels.com/photos/8558490/pexels-photo-8558490.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
  'https://images.pexels.com/photos/3065075/pexels-photo-3065075.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
  'https://images.pexels.com/photos/6732262/pexels-photo-6732262.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
];

export default function FollowTheHaven() {
  const { getSetting } = useSiteSettings();

  const headline = getSetting('follow_haven_headline', 'Follow the Haven');
  const subtext = getSetting(
    'follow_haven_subtext',
    'Self-care tips, behind-the-scenes, and little reminders to take care of you — join our community.'
  );
  const instagramHandle = getSetting('instagram_handle', '@jazelle.skin.haven');
  const instagramUrl = getSetting('instagram_url', 'https://www.instagram.com/jazelle.skin.haven');
  const tiktokHandle = getSetting('tiktok_handle', '@jazelleskinhaven');
  const tiktokUrl = getSetting('tiktok_url', 'https://www.tiktok.com/@jazelleskinhaven');

  return (
    <section className="container-jazelle py-14 sm:py-20">
      <div className="text-center mb-8">
        <span className="section-subtitle">Community</span>
        <h2 className="section-title mt-2">{headline}</h2>
        <p className="text-berry-400 text-sm sm:text-base mt-2 max-w-md mx-auto">
          {subtext}
        </p>
      </div>

      {/* Social handles */}
      <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
        <a
          href={instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2.5 px-5 py-3 rounded-full bg-white shadow-soft text-berry-700 font-medium text-sm hover:text-blush-600 hover:shadow-soft-lg transition-all"
        >
          <Instagram className="w-5 h-5 text-blush-500" />
          <span>{instagramHandle}</span>
        </a>
        <a
          href={tiktokUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2.5 px-5 py-3 rounded-full bg-white shadow-soft text-berry-700 font-medium text-sm hover:text-berry-900 hover:shadow-soft-lg transition-all"
        >
          <TikTokIcon className="w-4 h-4 text-berry-900" />
          <span>{tiktokHandle}</span>
        </a>
      </div>

      {/* Post grid */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
        {POSTS.map((src, i) => (
          <a
            key={i}
            href={i % 2 === 0 ? instagramUrl : tiktokUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative aspect-square rounded-2xl overflow-hidden bg-blush-50"
            aria-label={i % 2 === 0 ? 'View on Instagram' : 'View on TikTok'}
          >
            <img
              src={src}
              alt="Social media showcase"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-berry-900/0 group-hover:bg-berry-900/30 transition-colors duration-300 flex items-center justify-center">
              {i % 2 === 0 ? (
                <Instagram className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              ) : (
                <TikTokIcon className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              )}
            </div>
          </a>
        ))}
      </div>

      {/* Love note */}
      <p className="text-center mt-8 text-sm text-berry-400 inline-flex items-center gap-1.5 justify-center w-full">
        Tag us in your self-care moments
        <Heart className="w-3.5 h-3.5 fill-blush-300 stroke-blush-300" />
      </p>
    </section>
  );
}
