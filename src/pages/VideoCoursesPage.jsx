import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PortableText } from '@portabletext/react';
import portableTextComponents from '../components/PortableTextComponents';
import {
  ArrowRight,
  BookMarked,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  Clock3,
  ClipboardCheck,
  ListChecks,
  Play,
  Search,
  Sparkles,
  X
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { logVideoWatchActivity } from '../services/activityTracker';
import sanityClient from '../sanityClient';
import { getCourseValidity } from '../utils/courseValidity';
import {
  VIDEO_COURSE_PACKS_QUERY,
  VIDEO_COURSE_PACK_BY_SLUG_QUERY
} from '../sanityQueries';

const COURSE_ACCENTS = [
  'from-blue-600 to-indigo-700',
  'from-emerald-600 to-teal-700',
  'from-violet-600 to-fuchsia-700'
];
const REEL_ACCENTS = [
  'from-orange-500 via-rose-500 to-fuchsia-700',
  'from-cyan-500 via-blue-600 to-indigo-800',
  'from-emerald-500 via-teal-600 to-blue-800',
  'from-violet-500 via-purple-600 to-indigo-900'
];
const courseDescriptionComponents = {
  ...portableTextComponents,
  block: {
    normal: ({ children }) => <p className="my-4 text-sm leading-7 text-slate-700">{children}</p>,
    h2: ({ children }) => <h2 className="mb-4 mt-8 text-2xl font-black leading-tight text-slate-950">{children}</h2>,
    h3: ({ children }) => <h3 className="mb-3 mt-6 text-xl font-extrabold leading-snug text-slate-950">{children}</h3>
  },
  list: {
    bullet: ({ children }) => <ul className="my-5 list-disc space-y-2 pl-6 text-sm leading-7 text-slate-700">{children}</ul>,
    number: ({ children }) => <ol className="my-5 list-decimal space-y-2 pl-6 text-sm leading-7 text-slate-700">{children}</ol>
  },
  listItem: {
    bullet: ({ children }) => <li className="pl-1">{children}</li>,
    number: ({ children }) => <li className="pl-1">{children}</li>
  }
};

const uniqueValues = (items) => [...new Set(items.filter(Boolean))]
  .sort((first, second) => first.localeCompare(second));
const normalizeCourseId = (value) => (
  typeof value === 'string' ? value.trim().replace(/^drafts\./, '') : ''
);
const getCourseIdentifiers = (value) => {
  if (typeof value === 'string') return [normalizeCourseId(value)].filter(Boolean);
  if (!value || typeof value !== 'object') return [];
  return [
    value.courseId,
    value.id,
    value._id,
    value.slug?.current || value.slug,
    value.courseSlug,
    value.course?._ref,
    value.course?._id,
    value.course?.slug?.current || value.course?.slug,
    value._ref
  ].map(normalizeCourseId).filter(Boolean);
};

const mapVideo = (video, pack, kind = 'lesson') => ({
  id: `${pack._id}-${kind}-${video._key || video.videoTitle}`,
  lessonKey: kind === 'lesson' ? video._key : '',
  title: video.videoTitle,
  type: video.videoType,
  url: video.videoUrl,
  duration: video.duration || 'Video',
  subjectId: video.subject?._id || video.topic?.module?.subject?._id || '',
  subject: video.subject?.name || video.topic?.module?.subject?.name || '',
  moduleId: video.topic?.module?._id || '',
  module: video.topic?.module?.name || '',
  topicId: video.topic?._id || '',
  topic: video.topic?.name || '',
  courseId: pack._id,
  courseSlug: pack.slug || '',
  packType: pack.packType,
  packTitle: pack.title,
  tracks: pack.tracks || [],
  platforms: pack.platforms || []
});

const mapOnlineClass = (onlineClass, pack) => ({
  id: onlineClass._id,
  classId: onlineClass._id,
  courseId: pack._id,
  courseSlug: pack.slug || '',
  title: onlineClass.title,
  type: onlineClass.videoType,
  url: onlineClass.videoLink || '',
  duration: onlineClass.duration || 'Video',
  subjectId: onlineClass.subject?._id || '',
  subject: onlineClass.subject?.name || '',
  moduleId: onlineClass.module?._id || '',
  module: onlineClass.module?.name || '',
  topicId: onlineClass.topic?._id || '',
  topic: onlineClass.topic?.name || '',
  teacherName: onlineClass.teacherName || '',
  thumbnailUrl: onlineClass.imageUrl || '',
  classPdfUrl: onlineClass.classPdfUrl || '',
  classPdfAvailable: Boolean(onlineClass.classPdfAvailable || onlineClass.classPdfUrl),
  mappedBook: onlineClass.mappedBook || null,
  description: onlineClass.description || [],
  tracks: onlineClass.track ? [onlineClass.track] : [],
  platforms: onlineClass.platform ? [onlineClass.platform] : [],
  packTitle: pack.title,
  packType: pack.packType
});

const mapPack = (pack, index) => {
  const videos = (pack.videos || []).filter((video) => video?.videoTitle)
    .map((video) => mapVideo(video, pack));
  const onlineClasses = (pack.classes || [])
    .filter((onlineClass) => onlineClass?.status === 'Active' && onlineClass?._id && onlineClass?.title)
    .map((onlineClass) => ({
      ...mapOnlineClass(onlineClass, pack),
      packType: pack.packType || 'Free'
    }));
  const demoVideos = (pack.demoVideos || []).filter((video) => video?.videoTitle)
    .map((video) => mapVideo(video, pack, 'demo'));
  const courseVideos = onlineClasses.length ? onlineClasses : videos;
  const modules = [...new Map(courseVideos
    .filter((video) => video.moduleId)
    .map((video) => [video.moduleId, { id: video.moduleId, name: video.module }])).values()]
    .map((courseModule) => ({
      name: courseModule.name,
      topics: uniqueValues(courseVideos
        .filter((video) => video.moduleId === courseModule.id)
        .map((video) => video.topic))
    }));

  return {
    id: pack._id,
    title: pack.title,
    slug: pack.slug,
    description: pack.shortDescription || '',
    isFeatured: pack.isFeatured === true,
    richDescription: pack.description || [],
    deliveryMode: pack.deliveryMode || 'Recorded Video',
    timeTable: pack.timeTable || [],
    syllabusPlanner: pack.syllabusPlanner || [],
    tracks: pack.tracks || [],
    platforms: pack.platforms || [],
    subjectRefs: pack.subjectRefs?.length
      ? pack.subjectRefs
      : [...new Map(courseVideos.filter((video) => video.subjectId)
        .map((video) => [video.subjectId, { _id: video.subjectId, name: video.subject }])).values()],
    subjects: uniqueValues(courseVideos.map((video) => video.subject)),
    videos,
    onlineClasses,
    demoVideos,
    reels: videos.filter((video) => video.type === 'shortReel'),
    lessons: courseVideos.length,
    duration: pack.duration || '',
    packType: pack.packType || 'Free',
    packPurpose: pack.packPurpose || 'Individual',
    price: Number(pack.price) || 0,
    mrp: Number(pack.mrp) || 0,
    pricingPlans: Array.isArray(pack.pricingPlans)
      ? pack.pricingPlans.map((plan) => ({ ...plan, isAvailable: plan.isAvailable !== false }))
      : [],
    courseFeatures: Array.isArray(pack.courseFeatures) ? pack.courseFeatures.filter(Boolean) : [],
    mentors: Array.isArray(pack.mentors) ? pack.mentors : [],
    courseTypeTag: pack.courseTypeTag || '',
    language: pack.language || '',
    videoHours: Number(pack.videoHours) || 0,
    mockTestsCount: Number(pack.mockTestsCount) || 0,
    ebooksCount: Number(pack.ebooksCount) || 0,
    thumbnailUrl: pack.thumbnailUrl || '',
    modules,
    accent: COURSE_ACCENTS[index % COURSE_ACCENTS.length]
  };
};

const getVideoPlayer = (videoUrl) => {
  let parsedUrl;
  try {
    parsedUrl = new URL(videoUrl);
  } catch {
    return null;
  }
  if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') return null;

  const hostname = parsedUrl.hostname.toLowerCase();
  if (hostname === 'youtu.be') {
    const videoId = parsedUrl.pathname.split('/').filter(Boolean)[0] || '';
    return /^[A-Za-z0-9_-]{11}$/.test(videoId)
      ? { type: 'embed', src: `https://www.youtube-nocookie.com/embed/${videoId}` }
      : null;
  }
  if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(hostname)) {
    const videoId = parsedUrl.searchParams.get('v')
      || parsedUrl.pathname.match(/^\/(?:embed|shorts|live|share)\/([^/]+)/)?.[1];
    return videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId)
      ? { type: 'embed', src: `https://www.youtube-nocookie.com/embed/${videoId}` }
      : null;
  }
  if (hostname === 'vimeo.com' || hostname.endsWith('.vimeo.com')) {
    const videoId = parsedUrl.pathname.split('/').filter(Boolean).pop();
    return videoId && /^\d+$/.test(videoId)
      ? { type: 'embed', src: `https://player.vimeo.com/video/${videoId}` }
      : null;
  }
  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(parsedUrl.pathname + parsedUrl.search)) {
    return { type: 'file', src: parsedUrl.href };
  }
  return null;
};

function TaxonomySelect({ label, value, options, onChange }) {
  return (
    <label className="block min-w-40 flex-1 text-xs font-bold text-slate-600">
      <span className="mb-1.5 block">{label}</span>
      <span className="relative block">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 pr-9 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        >
          <option value="">All {label}s</option>
          {options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </span>
    </label>
  );
}

let youtubeApiPromise;

function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!youtubeApiPromise) {
    youtubeApiPromise = new Promise((resolve, reject) => {
      const previousCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previousCallback?.();
        resolve(window.YT);
      };
      let script = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
      if (!script) {
        script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        script.onerror = () => reject(new Error('YouTube playback tracking could not be initialized.'));
        document.head.appendChild(script);
      }
    }).catch(() => {
      youtubeApiPromise = null;
      throw error;
    });
  }
  return youtubeApiPromise;
}

function VideoPlayer({ video, onWatch }) {
  const player = getVideoPlayer(video.url);
  const aspectClass = video.type === 'shortReel' ? 'aspect-[9/16]' : 'aspect-video';
  const playerId = React.useId().replaceAll(':', '');
  const progressRef = React.useRef({
    watchedSeconds: 0,
    durationSeconds: 0,
    maxTimeSeconds: 0,
    lastTimeSeconds: null
  });
  const flushWatch = useCallback(() => {
    const progress = progressRef.current;
    if (progress.watchedSeconds >= 1) {
      onWatch({
        watchDurationSeconds: progress.watchedSeconds,
        videoDurationSeconds: progress.durationSeconds,
        videoProgressPercent: progress.durationSeconds
          ? Math.min(100, (progress.maxTimeSeconds / progress.durationSeconds) * 100)
          : 0
      });
      progress.watchedSeconds = 0;
    }
    progress.lastTimeSeconds = null;
  }, [onWatch]);
  const updateWatchProgress = useCallback((currentTime, duration) => {
    const progress = progressRef.current;
    if (Number.isFinite(duration) && duration > 0) progress.durationSeconds = duration;
    if (!Number.isFinite(currentTime) || currentTime < 0) return;
    if (progress.lastTimeSeconds !== null) {
      const elapsed = currentTime - progress.lastTimeSeconds;
      if (elapsed > 0 && elapsed <= 2) progress.watchedSeconds += elapsed;
    }
    progress.maxTimeSeconds = Math.max(progress.maxTimeSeconds, currentTime);
    progress.lastTimeSeconds = currentTime;
  }, []);

  useEffect(() => () => flushWatch(), [flushWatch]);

  if (player?.type === 'embed') {
    const youtubeId = player.src.match(/youtube-nocookie\.com\/embed\/([A-Za-z0-9_-]{11})/)?.[1];
    if (youtubeId) {
      const elementId = `youtube-player-${playerId}`;
      return (
        <YouTubeTrackedPlayer
          key={elementId}
          video={video}
          videoId={youtubeId}
          elementId={elementId}
          aspectClass={aspectClass}
          updateWatchProgress={updateWatchProgress}
          flushWatch={flushWatch}
        />
      );
    }
    const vimeoId = player.src.match(/player\.vimeo\.com\/video\/(\d+)/)?.[1];
    if (vimeoId) {
      return (
        <VimeoTrackedPlayer
          videoId={vimeoId}
          video={video}
          aspectClass={aspectClass}
          updateWatchProgress={updateWatchProgress}
          flushWatch={flushWatch}
        />
      );
    }
    return (
      <iframe
        title={video.title}
        src={player.src}
        className={`${aspectClass} w-full bg-black`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    );
  }
  if (player?.type === 'file') {
    return (
      <video
        className={`${aspectClass} w-full bg-black object-contain`}
        src={player.src}
        controls
        playsInline
        onPlay={(event) => {
          progressRef.current.lastTimeSeconds = event.currentTarget.currentTime;
        }}
        onTimeUpdate={(event) => updateWatchProgress(
          event.currentTarget.currentTime,
          event.currentTarget.duration
        )}
        onPause={(event) => {
          updateWatchProgress(event.currentTarget.currentTime, event.currentTarget.duration);
          flushWatch();
        }}
        onEnded={(event) => {
          updateWatchProgress(event.currentTarget.currentTime, event.currentTarget.duration);
          flushWatch();
        }}
      />
    );
  }
  return (
    <div className={`flex ${aspectClass} items-center justify-center bg-slate-950 p-6 text-center text-white`}>
      {video.url
        ? (
          <a href={video.url} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-white px-4 py-3 text-sm font-bold text-blue-950">
            Open video in a new tab
          </a>
        )
        : <p>This video is not available to play.</p>}
    </div>
  );
}

function YouTubeTrackedPlayer({
  video,
  videoId,
  elementId,
  aspectClass,
  updateWatchProgress,
  flushWatch
}) {
  const playerRef = React.useRef(null);
  const intervalRef = React.useRef(null);

  useEffect(() => {
    let disposed = false;
    loadYouTubeApi().then((youtube) => {
      if (disposed) return;
      playerRef.current = new youtube.Player(elementId, {
        videoId,
        playerVars: { playsinline: 1, rel: 0 },
        events: {
          onReady: () => {},
          onStateChange: (event) => {
            if (event.data === youtube.PlayerState.PLAYING) {
              if (intervalRef.current) window.clearInterval(intervalRef.current);
              const player = event.target;
              updateWatchProgress(player.getCurrentTime(), player.getDuration());
              intervalRef.current = window.setInterval(() => {
                updateWatchProgress(player.getCurrentTime(), player.getDuration());
              }, 1000);
            } else {
              if (intervalRef.current) window.clearInterval(intervalRef.current);
              intervalRef.current = null;
              const player = event.target;
              updateWatchProgress(player.getCurrentTime(), player.getDuration());
              if (event.data === youtube.PlayerState.PAUSED
                || event.data === youtube.PlayerState.ENDED) flushWatch();
            }
          }
        }
      });
    }).catch(() => {
      console.error('Unable to initialize tracked playback.');
    });

    return () => {
      disposed = true;
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = null;
      flushWatch();
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [elementId, videoId, video.title, updateWatchProgress, flushWatch]);

  return <div id={elementId} title={video.title} className={`${aspectClass} w-full bg-black`} />;
}

function VimeoTrackedPlayer({
  videoId,
  video,
  aspectClass,
  updateWatchProgress,
  flushWatch
}) {
  const frameRef = React.useRef(null);
  const playerId = React.useId().replaceAll(':', '');

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return undefined;
    const sendCommand = (method, value) => frame.contentWindow?.postMessage(
      { method, value },
      'https://player.vimeo.com'
    );
    const registerEvents = () => {
      ['play', 'pause', 'ended', 'timeupdate'].forEach((eventName) => {
        sendCommand('addEventListener', eventName);
      });
      sendCommand('getDuration');
    };
    const handleMessage = (event) => {
      if (event.origin !== 'https://player.vimeo.com' || event.source !== frame.contentWindow) return;
      let message = event.data;
      if (typeof message === 'string') {
        try {
          message = JSON.parse(message);
        } catch {
          return;
        }
      }
      const data = message?.data || {};
      if (message?.event === 'play') {
        updateWatchProgress(Number(data.seconds), Number(data.duration));
      } else if (message?.event === 'timeupdate') {
        updateWatchProgress(Number(data.seconds), Number(data.duration));
      } else if (message?.method === 'getDuration') {
        updateWatchProgress(Number.NaN, Number(message.value));
      } else if (message?.event === 'pause' || message?.event === 'ended') {
        if (Number.isFinite(Number(data.seconds))) {
          updateWatchProgress(Number(data.seconds), Number(data.duration));
        }
        flushWatch();
      }
    };
    frame.addEventListener('load', registerEvents);
    window.addEventListener('message', handleMessage);
    registerEvents();
    return () => {
      frame.removeEventListener('load', registerEvents);
      window.removeEventListener('message', handleMessage);
      flushWatch();
    };
  }, [flushWatch, updateWatchProgress]);

  return (
    <iframe
      ref={frameRef}
      title={video.title}
      src={`https://player.vimeo.com/video/${videoId}?api=1&player_id=${playerId}`}
      className={`${aspectClass} w-full bg-black`}
      allow="autoplay; fullscreen; picture-in-picture"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
    />
  );
}

function VideoCoursesPage({
  onBuyCourse,
  onEnrollCourse,
  onRequireAuth,
  enrolledCourseIds = [],
  purchasedCourseIds = [],
  expiredCourseIds = [],
  courseExpiryById = {}
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [track, setTrack] = useState('');
  const [platform, setPlatform] = useState('');
  const [subject, setSubject] = useState('');
  const [module, setModule] = useState('');
  const [topic, setTopic] = useState('');
  const [search, setSearch] = useState('');
  const [activeVideo, setActiveVideo] = useState(null);
  const [isPlayerLoading, setIsPlayerLoading] = useState(false);
  const [playerError, setPlayerError] = useState('');
  const [attachmentError, setAttachmentError] = useState('');
  const [enrollingCourseId, setEnrollingCourseId] = useState('');
  const [enrollmentError, setEnrollmentError] = useState('');
  const [enrollmentNotice, setEnrollmentNotice] = useState('');
  const [localEnrolledCourseIds, setLocalEnrolledCourseIds] = useState([]);
  const [selectedPlanKey, setSelectedPlanKey] = useState('');
  const [featuredCourseIndex, setFeaturedCourseIndex] = useState(0);
  const [isFeaturedCarouselPaused, setIsFeaturedCarouselPaused] = useState(false);
  const playerRequestId = React.useRef(0);
  const handleVideoWatch = useCallback((engagement) => {
    if (!currentUser || !activeVideo) return;
    void logVideoWatchActivity({
      user: currentUser,
      courseId: activeVideo.courseId,
      courseTitle: activeVideo.packTitle || '',
      videoId: activeVideo.classId || activeVideo.lessonKey || activeVideo.id,
      videoTitle: activeVideo.title,
      ...engagement
    });
  }, [activeVideo, currentUser]);
  const [detailNavigation, setDetailNavigation] = useState(null);
  const courseSlug = useMemo(() => {
    const match = location.pathname.match(/^\/video-courses\/([^/]+)\/?$/);
    if (!match) return '';
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }, [location.pathname]);
  const detailState = detailNavigation?.slug === courseSlug
    ? detailNavigation
    : { slug: courseSlug, tab: 'description', subjectId: '', moduleId: '', topicId: '' };
  const { tab: activeDetailTab, subjectId: selectedSubjectId, moduleId: selectedModuleId, topicId: selectedTopicId } = detailState;
  const updateDetailNavigation = (updates) => setDetailNavigation((previous) => ({
    ...(previous?.slug === courseSlug
      ? previous
      : { slug: courseSlug, tab: 'description', subjectId: '', moduleId: '', topicId: '' }),
    ...updates
  }));
  const detailCourse = courses.find((course) => course.slug === courseSlug || course.id === courseSlug);
  const entitlementSignature = JSON.stringify([...new Set([
    ...enrolledCourseIds,
    ...purchasedCourseIds,
    ...localEnrolledCourseIds
  ].flatMap(getCourseIdentifiers))].sort());
  const detailPricingPlans = detailCourse
    ? (detailCourse.pricingPlans.length
      ? detailCourse.pricingPlans
      : [{
        planTitle: detailCourse.duration || 'Full Course Access',
        price: detailCourse.price,
        mrp: detailCourse.mrp,
        isRecommended: false
      }])
    : [];
  const recommendedPlanIndex = detailPricingPlans.findIndex((plan) => (
    plan.isAvailable !== false && plan.isRecommended
  ));
  const firstAvailablePlanIndex = detailPricingPlans.findIndex((plan) => plan.isAvailable !== false);
  const defaultPricingPlanIndex = recommendedPlanIndex >= 0
    ? recommendedPlanIndex
    : firstAvailablePlanIndex;
  const currentPricingPlanKey = detailCourse
    ? `${detailCourse.id}-${detailPricingPlans[defaultPricingPlanIndex]?._key || defaultPricingPlanIndex}`
    : '';
  const activePricingPlanKey = selectedPlanKey.startsWith(`${detailCourse?.id}-`)
    ? selectedPlanKey
    : currentPricingPlanKey;
  const matchingPricingPlanIndex = detailPricingPlans.findIndex((plan, index) => (
    `${detailCourse?.id}-${plan._key || index}` === activePricingPlanKey
    && plan.isAvailable !== false
  ));
  const selectedPricingPlanIndex = matchingPricingPlanIndex >= 0
    ? matchingPricingPlanIndex
    : defaultPricingPlanIndex;
  const selectedPricingPlan = detailPricingPlans[selectedPricingPlanIndex];
  const accessibleCourseIds = useMemo(() => {
    const ownedIds = new Set([
      ...enrolledCourseIds.flatMap(getCourseIdentifiers),
      ...purchasedCourseIds.flatMap(getCourseIdentifiers),
      ...localEnrolledCourseIds.flatMap(getCourseIdentifiers)
    ]);
    for (const course of courses) {
      if (getCourseIdentifiers(course).some((identifier) => ownedIds.has(identifier))) {
        getCourseIdentifiers(course).forEach((identifier) => ownedIds.add(identifier));
      }
    }

    const expiredIds = new Set(expiredCourseIds.flatMap(getCourseIdentifiers));
    return new Set([...ownedIds].filter((courseId) => !expiredIds.has(courseId)));
  }, [
    courses,
    enrolledCourseIds,
    expiredCourseIds,
    localEnrolledCourseIds,
    purchasedCourseIds
  ]);
  const expiredCourseIdentifiers = useMemo(
    () => new Set(expiredCourseIds.flatMap(getCourseIdentifiers)),
    [expiredCourseIds]
  );
  const isCourseAccessible = useCallback((course) => getCourseIdentifiers(course)
    .some((identifier) => accessibleCourseIds.has(identifier)), [accessibleCourseIds]);
  const isCourseExpired = useCallback((course) => getCourseIdentifiers(course)
    .some((identifier) => expiredCourseIdentifiers.has(identifier)), [expiredCourseIdentifiers]);
  const isDetailCourseAccessible = detailCourse && isCourseAccessible(detailCourse);
  const isDetailCourseExpired = Boolean(detailCourse && isCourseExpired(detailCourse));
  const detailCourseValidity = detailCourse
    ? getCourseValidity(courseExpiryById[detailCourse.id])
    : null;
  const selectedPlanPrice = Number(selectedPricingPlan?.price ?? detailCourse?.price) || 0;
  const selectedPlanMrp = Number(selectedPricingPlan?.mrp ?? detailCourse?.mrp) || 0;
  const selectedPlanSavings = Math.max(0, selectedPlanMrp - selectedPlanPrice);
  const featuredCourses = useMemo(
    () => courses.filter((course) => course.isFeatured),
    [courses]
  );
  const activeFeaturedCourseIndex = featuredCourses.length
    ? featuredCourseIndex % featuredCourses.length
    : 0;

  useEffect(() => {
    if (isFeaturedCarouselPaused || featuredCourses.length < 2) return undefined;
    const intervalId = window.setInterval(() => {
      setFeaturedCourseIndex((index) => (index + 1) % featuredCourses.length);
    }, 4000);
    return () => window.clearInterval(intervalId);
  }, [featuredCourses.length, isFeaturedCarouselPaused]);

  useEffect(() => {
    let isCurrentRequest = true;
    const client = sanityClient.withConfig({ perspective: 'published', useCdn: false });
    const activeCourseEntitlementIds = new Set(JSON.parse(entitlementSignature));
    const loadCourses = async () => {
      const packDocuments = await client.fetch(VIDEO_COURSE_PACKS_QUERY);
      if (!Array.isArray(packDocuments)) {
        throw new Error('Sanity video course query did not return a list.');
      }

      const mappedCourses = packDocuments.filter((pack) => pack?.title).map(mapPack);
      if (courseSlug) {
        const detailPack = await client.fetch(VIDEO_COURSE_PACK_BY_SLUG_QUERY, { slug: courseSlug });
        if (detailPack?.hideFromStore === true) {
          const mappedDetail = mapPack(detailPack, mappedCourses.length);
          const hasActiveEntitlement = getCourseIdentifiers(mappedDetail)
            .some((identifier) => activeCourseEntitlementIds.has(identifier));
          if (hasActiveEntitlement) mappedCourses.push(mappedDetail);
        }
      }

      return mappedCourses;
    };

    loadCourses()
      .then((mappedCourses) => {
        if (!isCurrentRequest) return;
        setCourses(mappedCourses);
        setLoadError('');
      })
      .catch((error) => {
        if (error?.name === 'AbortError') return;
        console.error('Failed to load video courses or online classes from Sanity.');
        if (isCurrentRequest) setLoadError('Video courses could not be loaded. Please try again later.');
      })
      .finally(() => {
        if (isCurrentRequest) setIsLoading(false);
      });

    return () => {
      isCurrentRequest = false;
    };
  }, [courseSlug, entitlementSignature]);

  const filteredCourses = useMemo(() => courses.filter((course) => (
    (!track || course.tracks.some((item) => item.name === track))
    && (!platform || course.platforms.some((item) => item.name === platform))
    && (
      (!subject && !module && !topic)
      || (course.onlineClasses.length ? course.onlineClasses : course.videos).some((video) => (
        (!subject || video.subject === subject)
        && (!module || video.module === module)
        && (!topic || video.topic === topic)
      ))
    )
    && (!search || `${course.title} ${course.description} ${course.subjects.join(' ')} ${(course.onlineClasses.length ? course.onlineClasses : course.videos).map((video) => `${video.title} ${video.topic}`).join(' ')}`.toLowerCase().includes(search.toLowerCase()))
  )), [courses, track, platform, subject, module, topic, search]);

  const filteredVideos = useMemo(() => courses
    .filter((course) => course.packType === 'Free')
    .flatMap((course) => (course.onlineClasses.length ? course.onlineClasses : course.reels)
      .map((video, index) => ({ ...video, accent: REEL_ACCENTS[index % REEL_ACCENTS.length] })))
    .filter((video, index, videos) => (
    video.type === 'shortReel'
    && videos.findIndex((candidate) => candidate.id === video.id) === index
    && (!track || video.tracks.some((item) => item.name === track))
    && (!platform || video.platforms.some((item) => item.name === platform))
    && (!subject || video.subject === subject)
    && (!module || video.module === module)
    && (!topic || video.topic === topic)
    && (!search || `${video.title} ${video.topic} ${video.subject}`.toLowerCase().includes(search.toLowerCase()))
  )), [courses, track, platform, subject, module, topic, search]);

  const platforms = uniqueValues(courses
    .filter((course) => !track || course.tracks.some((item) => item.name === track))
    .flatMap((course) => course.platforms.map((item) => item.name)));
  const filteredTaxonomyVideos = courses.flatMap((course) => (course.onlineClasses.length ? course.onlineClasses : course.videos).map((video) => ({
    ...video,
    tracks: course.tracks,
    platforms: course.platforms
  }))).filter((video) => (
    (!track || video.tracks.some((item) => item.name === track))
    && (!platform || video.platforms.some((item) => item.name === platform))
  ));
  const subjects = uniqueValues(filteredTaxonomyVideos.map((video) => video.subject));
  const availableModules = uniqueValues(filteredTaxonomyVideos
    .filter((video) => !subject || video.subject === subject)
    .map((video) => video.module));
  const availableTopics = uniqueValues(filteredTaxonomyVideos
    .filter((video) => (!subject || video.subject === subject) && (!module || video.module === module))
    .map((video) => video.topic));
  const tracks = uniqueValues(courses.flatMap((course) => course.tracks.map((item) => item.name)));
  const detailVideos = useMemo(() => (
    detailCourse
      ? (detailCourse.onlineClasses.length ? detailCourse.onlineClasses : detailCourse.videos)
      : []
  ), [detailCourse]);
  const detailSubjects = [...new Map([
    ...(detailCourse?.subjectRefs || [])
      .filter((item) => item?._id && item?.name)
      .map((item) => [item._id, { id: item._id, name: item.name }]),
    ...detailVideos
      .filter((video) => video.subjectId)
      .map((video) => [video.subjectId, { id: video.subjectId, name: video.subject }])
  ]).values()];
  const subjectVideos = detailVideos.filter((video) => video.subjectId === selectedSubjectId);
  const detailModules = [...new Map(subjectVideos
    .filter((video) => video.moduleId)
    .map((video) => [video.moduleId, { id: video.moduleId, name: video.module }])).values()];
  const moduleVideos = subjectVideos.filter((video) => video.moduleId === selectedModuleId);
  const detailTopics = [...new Map(moduleVideos
    .filter((video) => video.topicId)
    .map((video) => [video.topicId, { id: video.topicId, name: video.topic }])).values()];
  const topicVideos = moduleVideos.filter((video) => video.topicId === selectedTopicId);
  const detailTabs = [
    { id: 'description', label: 'Description' },
    { id: 'demoVideos', label: 'Demo Videos' },
    { id: 'syllabusPlanner', label: 'Syllabus / Planner' },
    { id: 'timeTable', label: 'Time Table' },
    { id: 'delivery', label: 'Subjects' }
  ];

  function closePlayer() {
    playerRequestId.current += 1;
    setActiveVideo(null);
    setIsPlayerLoading(false);
    setPlayerError('');
  }

  useEffect(() => {
    if (!activeVideo) return undefined;
    const previousBodyOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        closePlayer();
      }
    };
    document.addEventListener('keydown', closeOnEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [activeVideo]);

  const openVideo = useCallback(async (video) => {
    if (isCourseExpired(video)) return;
    if (video.packType !== 'Free' && !isCourseAccessible(video)) return;
    const requestId = playerRequestId.current + 1;
    playerRequestId.current = requestId;
    setActiveVideo(video);
    setPlayerError('');
    setIsPlayerLoading(Boolean((video.classId || video.lessonKey) && !video.url));
    if ((!video.classId && !video.lessonKey) || video.url) return;
    if (!currentUser) {
      closePlayer();
      onRequireAuth?.();
      return;
    }

    try {
      const idToken = await currentUser.getIdToken();
      const response = await fetch('/api/video-course-class-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({
          uid: currentUser.uid,
          courseId: video.courseId,
          classId: video.classId,
          lessonKey: video.lessonKey || '',
          firebaseApiKey: import.meta.env.VITE_FIREBASE_API_KEY
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'This class could not be loaded.');
      if (requestId !== playerRequestId.current) return;
      setActiveVideo((current) => (
        current?.id === video.id
          ? {
            ...current,
            url: result.videoLink || '',
            type: result.videoType || current.type,
            classPdfUrl: result.classPdfUrl || current.classPdfUrl,
            mappedBook: result.mappedBook || current.mappedBook
          }
          : current
      ));
    } catch (error) {
      if (error?.name === 'AbortError') return;
      console.error('Failed to load entitled course class.');
      if (requestId === playerRequestId.current) {
        setPlayerError(error.message || 'This video could not be loaded. Please try again.');
      }
    } finally {
      if (requestId === playerRequestId.current) setIsPlayerLoading(false);
    }
  }, [currentUser, isCourseAccessible, isCourseExpired, onRequireAuth]);

  const downloadClassPdf = async (video) => {
    if (video.classPdfUrl) {
      window.open(video.classPdfUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    if (!currentUser) {
      onRequireAuth?.();
      return;
    }

    const pdfWindow = window.open('', '_blank');
    if (!pdfWindow) {
      setAttachmentError('Allow pop-ups to open the class PDF notes.');
      return;
    }
    setAttachmentError('');
    try {
      const idToken = await currentUser.getIdToken();
      const response = await fetch('/api/video-course-class-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + idToken
        },
        body: JSON.stringify({
          uid: currentUser.uid,
          courseId: video.courseId,
          classId: video.classId,
          lessonKey: video.lessonKey || '',
          firebaseApiKey: import.meta.env.VITE_FIREBASE_API_KEY
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Class PDF notes could not be loaded.');
      if (!result.classPdfUrl) throw new Error('PDF notes are not available for this class.');
      pdfWindow.location.href = result.classPdfUrl;
    } catch (error) {
      pdfWindow.close();
      console.error('Failed to load PDF notes.');
      setAttachmentError(error.message || 'Class PDF notes could not be loaded.');
    }
  };

  const renderMappedBookCard = (book, compact = false) => {
    if (!book) return null;
    const price = book.offerPrice ?? book.mrp;
    return (
      <article className={`flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 ${compact ? 'w-full sm:max-w-sm' : 'w-full border-t-0 rounded-t-none sm:rounded-t-xl'}`}>
        {book.coverImageUrl ? (
          <img src={book.coverImageUrl} alt="" className="h-16 w-12 shrink-0 rounded-md object-cover" loading="lazy" />
        ) : (
          <span className="flex h-16 w-12 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[10px] font-bold text-slate-400">Book</span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700">Recommended book</p>
          <h4 className="mt-0.5 line-clamp-2 text-sm font-extrabold text-slate-900">{book.title}</h4>
          {price != null && (
            <p className="mt-1 text-xs font-bold text-blue-950">
              {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(price)}
            </p>
          )}
        </div>
        {book.slug && (
          <button
            type="button"
            onClick={() => {
              closePlayer();
              navigate(`/book/${encodeURIComponent(book.slug)}`);
            }}
            className="shrink-0 rounded-lg border border-blue-200 px-3 py-2 text-xs font-extrabold text-blue-900 transition hover:bg-blue-50"
          >
            View Book
          </button>
        )}
      </article>
    );
  };

  const autoOpenedCourseId = React.useRef('');
  useEffect(() => {
    if (new URLSearchParams(location.search).get('play') !== '1'
      || !detailCourse
      || !isDetailCourseAccessible
      || autoOpenedCourseId.current === detailCourse.id) return;
    const firstPlayableVideo = detailVideos.find((video) => video.classId || video.lessonKey || video.url);
    if (!firstPlayableVideo) return;
    autoOpenedCourseId.current = detailCourse.id;
    void Promise.resolve().then(() => (
      openVideo({ ...firstPlayableVideo, packType: detailCourse.packType })
    ));
  }, [location.search, detailCourse, isDetailCourseAccessible, detailVideos, openVideo]);

  const enrollFreeCourse = async (course) => {
    if (!currentUser) {
      onRequireAuth?.();
      return;
    }
    setEnrollmentError('');
    setEnrollmentNotice('');
    setEnrollingCourseId(course.id);
    try {
      const enrolled = await onEnrollCourse?.(course);
      if (enrolled === false || enrolled?.success === false) {
        throw new Error(enrolled?.error || 'Enrollment could not be saved. Please try again.');
      }
      setLocalEnrolledCourseIds((current) => (
        current.includes(course.id) ? current : [...current, course.id]
      ));
      if (enrolled?.alreadyEnrolled) {
        setEnrollmentNotice('You’re already enrolled. Continue learning from this course.');
        if (courseSlug === course.slug) {
          updateDetailNavigation({
            tab: 'delivery',
            subjectId: detailSubjects[0]?.id || '',
            moduleId: '',
            topicId: ''
          });
        }
      } else {
        setEnrollmentNotice('You’re enrolled. Continue learning from this course.');
      }
    } catch (error) {
      console.error('Failed to enroll in video course.');
      setEnrollmentError(error.message || 'Enrollment could not be saved. Please try again.');
    } finally {
      setEnrollingCourseId('');
    }
  };

  const resetFilters = () => {
    setTrack('');
    setPlatform('');
    setSubject('');
    setModule('');
    setTopic('');
    setSearch('');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {!courseSlug && (
        <section
          aria-label="Featured video courses"
          onMouseEnter={() => setIsFeaturedCarouselPaused(true)}
          onMouseLeave={() => setIsFeaturedCarouselPaused(false)}
          className="relative overflow-hidden bg-gradient-to-br from-[#0c2356] via-[#102d6b] to-[#153a8a] text-white shadow-inner"
        >
        <div className="pointer-events-none absolute -right-24 -top-32 h-96 w-96 rounded-full border-[48px] border-white/5" />
        <div className="pointer-events-none absolute bottom-0 right-1/3 h-48 w-48 rounded-full bg-amber-400/10 blur-3xl" />
        <div className={`relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${featuredCourses.length ? 'h-[560px] py-6 sm:h-[470px] sm:py-12 lg:h-[500px]' : 'py-12 sm:py-16 lg:py-20'}`}>
          {featuredCourses.length ? (
            <>
              {featuredCourses.map((course, index) => (
                <article
                  key={course.id}
                  aria-hidden={index !== activeFeaturedCourseIndex}
                  className={`absolute inset-0 grid min-w-0 grid-cols-1 grid-rows-[210px_1fr] items-center gap-3 overflow-hidden px-11 pb-12 pt-5 transition-opacity duration-500 sm:grid-rows-1 sm:gap-7 sm:px-12 sm:py-10 lg:grid-cols-[minmax(0,1fr)_minmax(250px,300px)] lg:gap-10 lg:px-16 ${
                    index === activeFeaturedCourseIndex ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
                  }`}
                >
                  <div className="relative z-10 order-2 min-w-0 max-w-3xl sm:order-1">
                    <div className="inline-flex max-w-full items-center gap-2 truncate rounded-full border border-amber-300/40 bg-amber-400/15 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-amber-200">
                      <Sparkles className="h-3.5 w-3.5" /> Featured Course
                    </div>
                    <h1 className="mt-2 line-clamp-2 max-w-3xl text-2xl font-black leading-tight tracking-tight text-white sm:mt-4 sm:text-4xl lg:text-5xl">
                      {course.title}
                    </h1>
                    <p className="mt-2 line-clamp-2 max-w-2xl text-xs leading-relaxed text-blue-100 sm:mt-4 sm:text-base">
                      {course.description || `Explore ${course.deliveryMode.toLowerCase()} lessons and prepare with ${course.title}.`}
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate(`/video-courses/${encodeURIComponent(course.slug)}`)}
                      className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-400 px-4 py-2.5 text-xs font-extrabold text-slate-950 shadow-lg transition hover:bg-amber-300 sm:mt-6 sm:px-5 sm:py-3 sm:text-sm"
                    >
                      View Details <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="relative z-10 order-1 mx-auto flex h-[190px] w-[142px] items-center justify-center sm:order-2 sm:h-[300px] sm:w-[225px] lg:h-[380px] lg:w-[285px]">
                    <div className="absolute inset-3 rounded-full bg-amber-300/20 blur-3xl" />
                    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-white/20 bg-slate-950 shadow-[18px_22px_35px_rgba(0,0,0,0.45)] transition duration-300 hover:-translate-y-2 hover:rotate-1">
                      {course.thumbnailUrl ? (
                        <img
                          src={course.thumbnailUrl}
                          alt={`${course.title} course cover`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className={`flex h-full flex-col items-center justify-center bg-gradient-to-br ${course.accent} p-4 text-center`}>
                          <Play className="mb-4 h-10 w-10 text-amber-300" />
                          <span className="line-clamp-5 text-sm font-black leading-tight text-white sm:text-xl">{course.title}</span>
                          <span className="mt-3 text-xs font-semibold text-blue-100">{course.deliveryMode}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              ))}

              {featuredCourses.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Previous featured course"
                    onClick={() => setFeaturedCourseIndex((activeFeaturedCourseIndex - 1 + featuredCourses.length) % featuredCourses.length)}
                    className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/30 bg-slate-950/40 p-2.5 text-white backdrop-blur transition hover:bg-white/20 sm:left-6"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next featured course"
                    onClick={() => setFeaturedCourseIndex((activeFeaturedCourseIndex + 1) % featuredCourses.length)}
                    className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/30 bg-slate-950/40 p-2.5 text-white backdrop-blur transition hover:bg-white/20 sm:right-6"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
                    {featuredCourses.map((course, index) => (
                      <button
                        type="button"
                        key={course.id}
                        aria-label={`Show featured course ${index + 1}`}
                        aria-current={index === activeFeaturedCourseIndex ? 'true' : undefined}
                        onClick={() => setFeaturedCourseIndex(index)}
                        className={`h-2.5 rounded-full transition-all ${index === activeFeaturedCourseIndex ? 'w-7 bg-amber-300' : 'w-2.5 bg-white/50 hover:bg-white/80'}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1.5 text-xs font-extrabold uppercase tracking-wider text-amber-200">
              <Sparkles className="h-4 w-4" /> Learn your way
            </span>
            <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-5xl">Video Courses &amp; Reels</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-blue-100 sm:text-lg">
              Go deep with structured courses, then sharpen concepts with quick exam-focused bites.
              Find lessons through the same Track → Platform → Subject → Module → Topic learning path.
            </p>
            <a
              href="#course-catalog"
              className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-extrabold text-slate-950 shadow-lg transition hover:bg-amber-300"
            >
              Explore the catalog <ArrowRight className="h-4 w-4" />
            </a>
          </div>
          )}
        </div>
        </section>
      )}

      <main
        id="course-catalog"
        className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 sm:pb-20 sm:pt-10 lg:px-8"
        style={courseSlug ? { paddingInline: 'clamp(16px, 4vw, 32px)' } : undefined}
      >
        {enrollmentNotice && (
          <p role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
            {enrollmentNotice}
          </p>
        )}
        {enrollmentError && (
          <p role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-800">
            {enrollmentError}
          </p>
        )}
        {courseSlug ? (
          isLoading ? (
            <p role="status" className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
              Loading course details…
            </p>
          ) : loadError ? (
            <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-medium text-rose-800">{loadError}</p>
          ) : !detailCourse ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
              <h2 className="text-xl font-black text-slate-950">Course not found</h2>
              <p className="mt-2 text-sm text-slate-600">This course may have been unpublished or its link may be out of date.</p>
              <button
                type="button"
                onClick={() => navigate('/video-courses')}
                className="mt-5 rounded-xl bg-[#0c2356] px-4 py-2.5 text-sm font-bold text-white"
              >
                Browse Video Courses
              </button>
            </section>
          ) : (
            <div>
              <button
                type="button"
                onClick={() => navigate('/video-courses')}
                className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm font-bold text-blue-900 transition hover:bg-blue-50"
              >
                <ChevronLeft className="h-4 w-4" /> All Video Courses
              </button>

              <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
                <section className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                  <header
                    className="border-b border-slate-100 px-5 py-7 sm:px-8 sm:py-9"
                    style={{ padding: '28px clamp(16px, 5vw, 32px)' }}
                  >
                    <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-blue-700">
                      {detailCourse.courseTypeTag || detailCourse.deliveryMode}
                    </p>
                    <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{detailCourse.title}</h2>
                    {detailCourse.description && (
                      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">{detailCourse.description}</p>
                    )}
                  </header>

                  <div
                    role="tablist"
                    aria-label="Course details"
                    aria-orientation="horizontal"
                    className="course-detail-tabs"
                  >
                    {detailTabs.map((tab) => {
                      const isSelected = activeDetailTab === tab.id;
                      return (
                        <button
                          type="button"
                          role="tab"
                          key={tab.id}
                          id={`course-tab-${tab.id}`}
                          aria-selected={isSelected}
                          aria-controls="course-detail-panel"
                          tabIndex={isSelected ? 0 : -1}
                          onClick={() => updateDetailNavigation({
                            tab: tab.id,
                            ...(tab.id === 'delivery' ? { subjectId: '', moduleId: '', topicId: '' } : {})
                          })}
                          className="course-detail-tab"
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  <div
                    id="course-detail-panel"
                    role="tabpanel"
                    aria-labelledby={`course-tab-${activeDetailTab}`}
                    className="course-detail-panel"
                  >
                  {activeDetailTab === 'description' && (
                    <div className="space-y-10">
                      <div className="max-w-none">
                        {detailCourse.richDescription.length ? (
                          <PortableText value={detailCourse.richDescription} components={courseDescriptionComponents} />
                        ) : (
                          <p className="text-sm leading-7 text-slate-700">{detailCourse.description || 'Course details will be added soon.'}</p>
                        )}
                      </div>
                      {detailCourse.courseFeatures.length > 0 && (
                        <section aria-labelledby="course-features-heading">
                          <h3 id="course-features-heading" className="text-xl font-black text-slate-950">What You'll Get</h3>
                          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                            {detailCourse.courseFeatures.map((feature, index) => (
                              <li key={`${feature}-${index}`} className="flex items-start gap-3 text-sm leading-6 text-slate-700">
                                <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </section>
                      )}
                      {detailCourse.mentors.length > 0 && (
                        <section aria-labelledby="course-mentors-heading">
                          <h3 id="course-mentors-heading" className="text-xl font-black text-slate-950">Meet Your Mentors</h3>
                          <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            {detailCourse.mentors.map((mentor, index) => (
                              <article key={mentor._key || `${mentor.name}-${index}`} className="rounded-2xl border border-slate-200 p-5">
                                <h4 className="font-extrabold text-slate-950">{mentor.name}</h4>
                                {mentor.designation && <p className="mt-1 text-sm font-semibold text-blue-800">{mentor.designation}</p>}
                                {mentor.details && <p className="mt-3 text-sm leading-6 text-slate-600">{mentor.details}</p>}
                                {mentor.youtubeLink && (
                                  <a
                                    href={mentor.youtubeLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-blue-800 hover:text-blue-950"
                                  >
                                    <Play className="h-4 w-4" /> Watch mentor videos
                                  </a>
                                )}
                              </article>
                            ))}
                          </div>
                        </section>
                      )}
                    </div>
                  )}

                  {activeDetailTab === 'timeTable' && (
                    detailCourse.timeTable.length ? (
                      <div className="divide-y divide-slate-100">
                        {detailCourse.timeTable.map((session, index) => (
                          <article key={session._key || `${session.sessionTitle}-${index}`} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-800">
                              <CalendarDays className="h-5 w-5" />
                            </span>
                            <div className="min-w-0">
                              <h3 className="font-extrabold text-slate-900">{session.sessionTitle}</h3>
                              <p className="mt-1 text-xs font-semibold text-blue-800">
                                {[session.day, session.date, [session.startTime, session.endTime].filter(Boolean).join(' – ')].filter(Boolean).join(' · ')}
                              </p>
                              {session.notes && <p className="mt-2 text-sm leading-6 text-slate-600">{session.notes}</p>}
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : <p className="text-sm text-slate-600">The course timetable will be announced soon.</p>
                  )}

                  {activeDetailTab === 'syllabusPlanner' && (
                    detailCourse.syllabusPlanner.length ? (
                      <ol className="space-y-4">
                        {detailCourse.syllabusPlanner.map((item, index) => (
                          <li key={item._key || `${item.title}-${index}`} className="flex gap-4 rounded-2xl border border-slate-200 p-5">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-800">
                              <ListChecks className="h-5 w-5" />
                            </span>
                            <div className="min-w-0 space-y-2">
                              <p className="text-[11px] font-extrabold uppercase leading-5 tracking-wide text-blue-700">{item.week || `Part ${index + 1}`}</p>
                              <h3 className="text-base font-extrabold leading-6 text-slate-900">{item.title}</h3>
                              {(item.module?.name || item.topic?.name) && (
                                <p className="text-xs font-semibold leading-5 text-slate-500">{[item.module?.name, item.topic?.name].filter(Boolean).join(' · ')}</p>
                              )}
                              {item.details && <p className="text-sm leading-7 text-slate-600">{item.details}</p>}
                            </div>
                          </li>
                        ))}
                      </ol>
                    ) : <p className="text-sm text-slate-600">The syllabus and planner will be added soon.</p>
                  )}

                  {activeDetailTab === 'demoVideos' && (
                    detailCourse.demoVideos.length ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {detailCourse.demoVideos.map((video) => (
                          <button
                            type="button"
                            key={video.id}
                            onClick={() => openVideo(video)}
                            disabled={!video.url}
                            className="flex min-h-20 items-center gap-3 rounded-2xl border border-slate-200 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-900"><Play className="h-5 w-5 fill-current" /></span>
                            <span className="min-w-0 flex-1">
                              <span className="block font-extrabold text-slate-900">{video.title}</span>
                              <span className="mt-1 block text-xs text-slate-500">{[video.duration, video.type === 'shortReel' ? 'Reel preview' : 'Course preview'].filter(Boolean).join(' · ')}</span>
                            </span>
                            <span className="shrink-0 text-xs font-extrabold text-blue-800">Watch</span>
                          </button>
                        ))}
                      </div>
                    ) : <p className="text-sm text-slate-600">Demo videos will be available soon.</p>
                  )}

                  {activeDetailTab === 'delivery' && (
                    <section aria-label={`${detailCourse.deliveryMode} course content`}>
                      <div className="mb-6 flex flex-wrap items-center gap-2 text-xs font-bold">
                        <button
                          type="button"
                          onClick={() => updateDetailNavigation({ subjectId: '', moduleId: '', topicId: '' })}
                          className={`rounded-full px-3 py-2 ${!selectedSubjectId ? 'bg-blue-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-blue-50'}`}
                        >
                          Subjects
                        </button>
                        {selectedSubjectId && (
                          <>
                            <span className="text-slate-300">/</span>
                            <button type="button" onClick={() => updateDetailNavigation({ moduleId: '', topicId: '' })} className="rounded-full bg-blue-900 px-3 py-2 text-white">
                              {detailSubjects.find((item) => item.id === selectedSubjectId)?.name}
                            </button>
                          </>
                        )}
                        {selectedModuleId && (
                          <>
                            <span className="text-slate-300">/</span>
                            <button type="button" onClick={() => updateDetailNavigation({ topicId: '' })} className="rounded-full bg-blue-900 px-3 py-2 text-white">
                              {detailModules.find((item) => item.id === selectedModuleId)?.name}
                            </button>
                          </>
                        )}
                        {selectedTopicId && <><span className="text-slate-300">/</span><span className="rounded-full bg-slate-100 px-3 py-2 text-slate-700">{detailTopics.find((item) => item.id === selectedTopicId)?.name}</span></>}
                      </div>

                      {!selectedSubjectId && (
                        detailSubjects.length ? (
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {detailSubjects.map((item) => (
                              <button
                                type="button"
                                key={item.id}
                                onClick={() => updateDetailNavigation({ subjectId: item.id, moduleId: '', topicId: '' })}
                                className="flex min-h-20 items-center justify-between rounded-2xl border border-slate-200 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50"
                              >
                                <span className="font-extrabold text-slate-900">{item.name}</span>
                                <ArrowRight className="h-4 w-4 text-blue-800" />
                              </button>
                            ))}
                          </div>
                        ) : <p className="text-sm text-slate-600">No subjects or mapped lessons have been added to this course yet.</p>
                      )}

                      {selectedSubjectId && !selectedModuleId && (
                        detailModules.length ? (
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {detailModules.map((item) => (
                              <button
                                type="button"
                                key={item.id}
                                onClick={() => updateDetailNavigation({ moduleId: item.id, topicId: '' })}
                                className="flex min-h-20 items-center justify-between rounded-2xl border border-slate-200 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50"
                              >
                                <span className="font-extrabold text-slate-900">{item.name}</span>
                                <ArrowRight className="h-4 w-4 text-blue-800" />
                              </button>
                            ))}
                          </div>
                        ) : <p className="text-sm text-slate-600">No modules are mapped to this subject yet.</p>
                      )}

                      {selectedModuleId && !selectedTopicId && (
                        detailTopics.length ? (
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {detailTopics.map((item) => (
                              <button
                                type="button"
                                key={item.id}
                                onClick={() => updateDetailNavigation({ topicId: item.id })}
                                className="flex min-h-20 items-center justify-between rounded-2xl border border-slate-200 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50"
                              >
                                <span className="font-extrabold text-slate-900">{item.name}</span>
                                <ArrowRight className="h-4 w-4 text-blue-800" />
                              </button>
                            ))}
                          </div>
                        ) : <p className="text-sm text-slate-600">No topics are mapped to this module yet.</p>
                      )}

                      {selectedTopicId && (
                        topicVideos.length ? (
                          <div className="space-y-2">
                            {topicVideos.map((video, index) => (
                              <article key={video.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 p-3 sm:p-4">
                                {video.thumbnailUrl ? (
                                  <img src={video.thumbnailUrl} alt="" className="h-12 w-16 shrink-0 rounded-lg object-cover" loading="lazy" />
                                ) : (
                                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-extrabold text-blue-900">{index + 1}</span>
                                )}
                                <div className="min-w-0 flex-1">
                                  <h3 className="font-extrabold text-slate-900">{video.title}</h3>
                                  <p className="mt-1 text-xs text-slate-500">{video.duration}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!isDetailCourseAccessible && detailCourse.packType === 'Free') {
                                      void enrollFreeCourse(detailCourse);
                                    } else {
                                      void openVideo({ ...video, packType: detailCourse.packType });
                                    }
                                  }}
                                  disabled={
                                    (!isDetailCourseAccessible && detailCourse.packType !== 'Free')
                                    || (!isDetailCourseAccessible && detailCourse.packType === 'Free' && enrollingCourseId === detailCourse.id)
                                    || (!video.classId && !video.lessonKey && !video.url)
                                  }
                                  className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#0c2356] px-4 py-2 text-xs font-extrabold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:bg-slate-300"
                                >
                                  <Play className="h-3.5 w-3.5 fill-current" />
                                  {!isDetailCourseAccessible && detailCourse.packType === 'Free'
                                    ? 'Enroll Free'
                                    : !isDetailCourseAccessible
                                      ? 'Purchase required'
                                      : 'Watch Now'}
                                </button>
                                {video.classPdfAvailable && (
                                  <button
                                    type="button"
                                    onClick={() => void downloadClassPdf({ ...video, packType: detailCourse.packType })}
                                    className="inline-flex min-h-10 items-center justify-center rounded-xl border border-blue-200 px-3 py-2 text-xs font-extrabold text-blue-900 transition hover:bg-blue-50"
                                  >
                                    📥 Download PDF Notes
                                  </button>
                                )}
                                {video.mappedBook && renderMappedBookCard(video.mappedBook, true)}
                              </article>
                            ))}
                          </div>
                        ) : <p className="text-sm text-slate-600">No lessons are mapped to this topic yet.</p>
                      )}
                      {attachmentError && (
                        <p role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                          {attachmentError}
                        </p>
                      )}
                    </section>
                  )}
                  </div>
                </section>

                <aside className="lg:sticky lg:top-6" aria-label="Course purchase options">
                  <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg shadow-slate-200/60">
                    <div className="relative aspect-video bg-slate-100">
                      {detailCourse.thumbnailUrl ? (
                        <img src={detailCourse.thumbnailUrl} alt={`${detailCourse.title} course thumbnail`} className="h-full w-full object-cover" />
                      ) : (
                        <div className={`h-full w-full bg-gradient-to-br ${detailCourse.accent}`} />
                      )}
                      {detailCourse.courseTypeTag && (
                        <span className="absolute left-4 top-4 rounded-lg bg-white px-3 py-1.5 text-xs font-extrabold text-blue-950 shadow">
                          {detailCourse.courseTypeTag}
                        </span>
                      )}
                    </div>
                    <div className="p-5 sm:p-6">
                      <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Course access</p>
                      {detailCourse.packType === 'Free' ? (
                        <p className="mt-2 text-3xl font-black text-slate-950">Free</p>
                      ) : (
                        <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                          <span className="text-3xl font-black text-slate-950">
                            {selectedPricingPlan
                              ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(selectedPlanPrice)
                              : 'Unavailable'}
                          </span>
                          {selectedPricingPlan && selectedPlanMrp > selectedPlanPrice && (
                            <span className="text-sm font-semibold text-slate-400 line-through">
                              {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(selectedPlanMrp)}
                            </span>
                          )}
                        </div>
                      )}
                      {selectedPlanSavings > 0 && detailCourse.packType !== 'Free' && (
                        <p className="mt-1 text-sm font-bold text-emerald-700">
                          You save {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(selectedPlanSavings)}
                        </p>
                      )}

                      {detailCourse.packType !== 'Free' && detailPricingPlans.length > 0 && (
                        <fieldset className="mt-5 space-y-2.5">
                          <legend className="mb-2 text-sm font-extrabold text-slate-900">Choose your plan</legend>
                          {detailPricingPlans.map((plan, index) => {
                            const planKey = `${detailCourse.id}-${plan._key || index}`;
                            const isSelected = selectedPricingPlanIndex === index;
                            return (
                              <label
                                key={planKey}
                                className={`relative flex items-start gap-3 rounded-xl border p-3.5 transition ${
                                  plan.isAvailable === false
                                    ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-60'
                                    : isSelected
                                      ? 'cursor-pointer border-blue-700 bg-blue-50/70 ring-1 ring-blue-700'
                                      : 'cursor-pointer border-slate-200 hover:border-blue-300'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="course-pricing-plan"
                                  value={planKey}
                                  checked={isSelected}
                                  onChange={() => setSelectedPlanKey(planKey)}
                                  disabled={plan.isAvailable === false}
                                  className="mt-1 h-4 w-4 accent-blue-800"
                                />
                                <span className="min-w-0 flex-1">
                                  <span className="flex flex-wrap items-center gap-2 font-bold text-slate-900">
                                    {plan.planTitle || `Plan ${index + 1}`}
                                    {plan.isAvailable === false && (
                                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-slate-600">Unavailable</span>
                                    )}
                                    {plan.isRecommended && (
                                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-amber-900">Recommended</span>
                                    )}
                                  </span>
                                  {plan.mrp > plan.price && (
                                    <span className="mt-1 block text-xs text-slate-500">
                                      MRP <span className="line-through">
                                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(plan.mrp))}
                                      </span>
                                    </span>
                                  )}
                                </span>
                                <span className="shrink-0 text-sm font-black text-slate-950">
                                  {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(plan.price) || 0)}
                                </span>
                              </label>
                            );
                          })}
                        </fieldset>
                      )}

                      {detailCourse.duration && (
                        <p className="mt-4 flex items-center gap-2 text-sm text-slate-600">
                          <Clock3 className="h-4 w-4 text-blue-700" /> {detailCourse.duration} access
                        </p>
                      )}
                      {isDetailCourseExpired && (
                        <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm font-bold text-rose-800">Your course validity has expired.</p>
                      )}
                      {isDetailCourseAccessible && courseExpiryById[detailCourse.id] && !isDetailCourseExpired && (
                        <p className="mt-4 text-sm font-bold text-emerald-700">{detailCourseValidity.remaining}</p>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (isDetailCourseAccessible && !isDetailCourseExpired) {
                            updateDetailNavigation({ tab: 'delivery', subjectId: detailSubjects[0]?.id || '', moduleId: '', topicId: '' });
                          } else if (detailCourse.packType === 'Free') {
                            void enrollFreeCourse(detailCourse);
                          } else {
                            onBuyCourse?.({
                              ...detailCourse,
                              price: selectedPricingPlan?.price ?? detailCourse.price,
                              mrp: selectedPricingPlan?.mrp ?? detailCourse.mrp,
                              selectedPricingPlan: detailCourse.pricingPlans.length
                                ? selectedPricingPlan
                                : null,
                              selectedPlanId: detailCourse.pricingPlans.length
                                ? selectedPricingPlan?._key || ''
                                : '',
                              selectedPlanTitle: detailCourse.pricingPlans.length
                                ? selectedPricingPlan?.planTitle || ''
                                : ''
                            });
                          }
                        }}
                        disabled={enrollingCourseId === detailCourse.id
                          || (detailCourse.packType !== 'Free' && !selectedPricingPlan)}
                        className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-extrabold text-slate-950 shadow-sm transition hover:bg-amber-300 disabled:cursor-wait disabled:opacity-60"
                      >
                        {isDetailCourseAccessible && !isDetailCourseExpired
                          ? 'Continue Learning'
                          : detailCourse.packType === 'Free'
                            ? (isDetailCourseExpired ? 'Renew Free Enrollment' : 'Enroll for Free')
                            : (isDetailCourseExpired ? 'Renew Course' : 'Buy Now')}
                        <ArrowRight className="h-4 w-4" />
                      </button>
                      <p className="mt-3 text-center text-xs leading-5 text-slate-500">
                        {detailCourse.packType === 'Free' ? 'Start learning after enrolling.' : 'Secure checkout. Course access is added to your account after purchase.'}
                      </p>
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          )
        ) : (
          <>
        <section aria-label="Filter video lessons" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <label className="block flex-[1.5] text-xs font-bold text-slate-600">
              <span className="mb-1.5 block">Search courses and bites</span>
              <span className="relative block">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Try Polity, percentages, or data interpretation"
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm font-medium text-slate-800 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </span>
            </label>
            <TaxonomySelect
              label="Track"
              value={track}
              options={tracks}
              onChange={(value) => { setTrack(value); setPlatform(''); setSubject(''); setModule(''); setTopic(''); }}
            />
            <TaxonomySelect
              label="Platform"
              value={platform}
              options={platforms}
              onChange={(value) => { setPlatform(value); setSubject(''); setModule(''); setTopic(''); }}
            />
            <TaxonomySelect
              label="Subject"
              value={subject}
              options={subjects}
              onChange={(value) => { setSubject(value); setModule(''); setTopic(''); }}
            />
          </div>
          <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-end">
            <TaxonomySelect
              label="Module"
              value={module}
              options={availableModules}
              onChange={(value) => { setModule(value); setTopic(''); }}
            />
            <TaxonomySelect label="Topic" value={topic} options={availableTopics} onChange={setTopic} />
            <button
              type="button"
              onClick={resetFilters}
              className="min-h-11 shrink-0 rounded-xl px-3 text-sm font-bold text-blue-800 transition hover:bg-blue-50"
            >
              Clear filters
            </button>
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-500">
            Buy paid packs through the secure cart and coupon checkout, or enroll in a free course to save access to your account.
          </p>
        </section>

        <section aria-labelledby="courses-heading" className="mt-10 sm:mt-14">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-blue-700">Learn in depth</p>
              <h2 id="courses-heading" className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Video Course Packs</h2>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-900">{filteredCourses.length} packs</span>
          </div>

          {isLoading ? (
            <div role="status" className="mt-5 rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
              Loading published video packs…
            </div>
          ) : loadError ? (
            <p role="alert" className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-medium text-rose-800">{loadError}</p>
          ) : filteredCourses.length ? (
            <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredCourses.map((course) => {
                const courseIsExpired = isCourseExpired(course);
                const courseValidity = getCourseValidity(courseExpiryById[course.id]);
                const courseIsAccessible = isCourseAccessible(course);
                const availableCardPlans = course.pricingPlans.filter((plan) => plan.isAvailable !== false);
                const cardPlan = availableCardPlans.find((plan) => plan.isRecommended) || availableCardPlans[0];
                const cardPrice = Number(cardPlan?.price ?? course.price) || 0;
                const cardMrp = Number(cardPlan?.mrp ?? course.mrp) || 0;
                const discountPercentage = cardMrp > cardPrice
                  ? Math.round(((cardMrp - cardPrice) / cardMrp) * 100)
                  : 0;
                const instructorNames = course.mentors.map((mentor) => mentor.name).filter(Boolean);
                const courseTypeLabel = course.courseTypeTag
                  || (course.deliveryMode === 'Live Class' ? 'Live Classes' : 'Recorded');
                const courseStats = [
                  course.videoHours > 0
                    ? { key: 'hours', icon: Clock3, label: `${course.videoHours} video hours` }
                    : course.lessons > 0
                      ? { key: 'lessons', icon: Play, label: `${course.lessons} lessons` }
                      : null,
                  course.mockTestsCount > 0
                    ? { key: 'tests', icon: ClipboardCheck, label: `${course.mockTestsCount} mock tests` }
                    : null,
                  course.ebooksCount > 0
                    ? { key: 'ebooks', icon: BookMarked, label: `${course.ebooksCount} e-books` }
                    : null
                ].filter(Boolean);
                return (
                <article
                  key={course.id}
                  role="link"
                  tabIndex={0}
                  onClick={() => navigate(`/video-courses/${encodeURIComponent(course.slug)}`)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      navigate(`/video-courses/${encodeURIComponent(course.slug)}`);
                    }
                  }}
                  className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2"
                >
                  <div className={`relative aspect-video overflow-hidden bg-gradient-to-br ${course.accent}`}>
                    {course.thumbnailUrl && (
                      <img src={course.thumbnailUrl} alt={`${course.title} thumbnail`} className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" loading="lazy" />
                    )}
                    <span className="absolute left-3 top-3 rounded-md bg-white/95 px-2.5 py-1.5 text-[11px] font-extrabold text-slate-900 shadow-sm">
                      {courseTypeLabel}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="line-clamp-2 min-h-14 text-lg font-extrabold leading-7 text-slate-950">{course.title}</h3>
                    <p className="mt-2 min-h-5 text-xs font-medium leading-5 text-slate-500">
                      By: {instructorNames.length ? instructorNames.join(', ') : 'XamToppr Team'}
                      {course.language && <> <span className="mx-1.5 text-slate-300">|</span> {course.language}</>}
                    </p>
                    {courseIsExpired && (
                      <p className="mt-2 text-xs font-bold text-rose-700">Validity expired</p>
                    )}
                    {courseIsAccessible && courseExpiryById[course.id] && !courseIsExpired && (
                      <p className="mt-2 text-xs font-bold text-emerald-700">{courseValidity.remaining}</p>
                    )}

                    {courseStats.length > 0 && (
                      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-100 pt-3">
                        {courseStats.map(({ key, icon: Icon, label }) => (
                          <li key={key} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                            <Icon className="h-3.5 w-3.5 text-blue-700" />
                            {label}
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="mt-auto border-t border-slate-100 pt-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xl font-black text-slate-950">
                          {course.packType === 'Free'
                            ? 'Free'
                            : cardPlan
                              ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(cardPrice)
                              : 'Unavailable'}
                        </p>
                        {cardPlan && cardMrp > cardPrice && (
                          <span className="text-sm font-semibold text-slate-400 line-through">
                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(cardMrp)}
                          </span>
                        )}
                        {discountPercentage > 0 && (
                          <span className="rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-extrabold text-emerald-700">
                            {discountPercentage}% off
                          </span>
                        )}
                      </div>
                      <div className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-950 px-4 py-2.5 text-sm font-extrabold text-white transition group-hover:bg-blue-900">
                        <span>View Course Details</span>
                        <ArrowRight className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  </div>
                </article>
              )})}
            </div>
          ) : (
            <p className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
              No published video packs match these filters. Publish a pack in Sanity Studio or try another topic.
            </p>
          )}
        </section>

        <section aria-labelledby="reels-heading" className="mt-12 rounded-3xl bg-slate-950 px-4 py-7 text-white sm:mt-16 sm:px-7 sm:py-9">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-amber-300">Quick revision</p>
              <h2 id="reels-heading" className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Reels &amp; learning bites</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Short concept previews for the moments between study sessions.</p>
            </div>
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-200">{filteredVideos.length} bites</span>
          </div>
          {isLoading ? (
            <p role="status" className="mt-5 text-sm text-slate-300">Loading mapped reels…</p>
          ) : loadError ? (
            <p role="alert" className="mt-5 rounded-xl border border-rose-300/30 bg-rose-950/40 p-4 text-sm text-rose-100">{loadError}</p>
          ) : filteredVideos.length ? (
            <div className="mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 md:grid md:grid-cols-2 md:overflow-visible xl:grid-cols-4">
              {filteredVideos.map((video) => (
                <button
                  type="button"
                  key={video.id}
                  onClick={() => openVideo(video)}
                  className="group relative h-[350px] w-[230px] shrink-0 snap-start overflow-hidden rounded-2xl text-left shadow-lg transition hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-amber-300 md:w-full"
                  aria-label={`Play bite: ${video.title}`}
                >
                  <span className={`absolute inset-0 bg-gradient-to-br ${video.accent}`} />
                  {video.thumbnailUrl && <img src={video.thumbnailUrl} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />}
                  <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/5 to-black/10" />
                  <span className="absolute left-4 top-4 rounded-full border border-white/30 bg-black/20 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider backdrop-blur">
                    {video.platforms.map((item) => item.name).filter(Boolean).join(' · ') || video.packTitle}
                  </span>
                  <span className="absolute right-4 top-4 rounded-full bg-black/25 px-2.5 py-1 text-[10px] font-bold backdrop-blur">{video.duration}</span>
                  <span className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/50 bg-white/20 backdrop-blur transition group-hover:scale-110 group-hover:bg-white/30">
                    <Play className="ml-0.5 h-6 w-6 fill-white text-white" />
                  </span>
                  <span className="absolute inset-x-0 bottom-0 p-4">
                    <span className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-200">
                      <Sparkles className="h-3.5 w-3.5" /> {video.subject}
                    </span>
                    <span className="block text-lg font-black leading-tight">{video.title}</span>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-white/80">Play bite <ArrowRight className="h-3.5 w-3.5" /></span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-2xl border border-dashed border-white/20 p-8 text-center text-sm text-slate-300">
              No published short reels match these filters.
            </p>
          )}
          <p className="mt-3 text-xs text-slate-400">Swipe sideways to browse on mobile. Reels are published free class previews.</p>
        </section>
          </>
        )}
      </main>

      {activeVideo && (
        <div
          className="video-modal-backdrop fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/75 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closePlayer();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Video player"
            className="video-modal-panel relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
            style={{ maxWidth: activeVideo.type === 'shortReel' ? '28rem' : '48rem' }}
          >
            <header className="flex justify-end px-3 pt-3">
              <button
                type="button"
                onClick={closePlayer}
                aria-label="Close video player"
                className="shrink-0 rounded-full bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </header>
            <div
              className={activeVideo.type === 'shortReel' ? 'mx-auto w-full' : 'w-full'}
              style={activeVideo.type === 'shortReel'
                ? { maxWidth: 'min(100%, calc((92vh - 9rem) * 9 / 16))' }
                : undefined}
            >
              {isPlayerLoading ? (
                <p role="status" className={`flex ${activeVideo.type === 'shortReel' ? 'aspect-[9/16]' : 'aspect-video'} items-center justify-center bg-slate-950 p-6 text-sm font-semibold text-white`}>
                  Loading video…
                </p>
              ) : playerError ? (
                <p role="alert" className={`flex ${activeVideo.type === 'shortReel' ? 'aspect-[9/16]' : 'aspect-video'} items-center justify-center bg-slate-950 p-6 text-center text-sm font-semibold text-rose-100`}>
                  {playerError}
                </p>
              ) : (
                <VideoPlayer video={activeVideo} onWatch={handleVideoWatch} />
              )}
            </div>
            {(activeVideo.classPdfUrl || activeVideo.mappedBook) && (
              <div className="space-y-3 border-t border-slate-200 p-4">
                {activeVideo.mappedBook && renderMappedBookCard(activeVideo.mappedBook)}
                {activeVideo.classPdfUrl && (
                  <a
                    href={activeVideo.classPdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-900 px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-blue-800"
                  >
                    📥 Download PDF Notes
                  </a>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default VideoCoursesPage;
