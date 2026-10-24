import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PortableText } from '@portabletext/react';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  Check,
  Clock3,
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
  VIDEO_COURSE_PACKS_QUERY
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
  const [localEnrolledCourseIds, setLocalEnrolledCourseIds] = useState([]);
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

  useEffect(() => {
    let isCurrentRequest = true;
    sanityClient.fetch(VIDEO_COURSE_PACKS_QUERY)
      .then((packDocuments) => {
        if (!Array.isArray(packDocuments)) {
          throw new Error('Sanity video course query did not return a list.');
        }
        if (isCurrentRequest) {
          setCourses(packDocuments.filter((pack) => pack?.title).map(mapPack));
          setLoadError('');
        }
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
  }, []);

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
  const detailSubjects = [...new Map(detailVideos
    .filter((video) => video.subjectId)
    .map((video) => [video.subjectId, { id: video.subjectId, name: video.subject }])).values()];
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
    { id: 'timeTable', label: 'Time Table' },
    { id: 'syllabusPlanner', label: 'Syllabus / Planner' },
    { id: 'demoVideos', label: 'Demo Videos' },
    { id: 'delivery', label: detailCourse?.deliveryMode || 'Recorded Video' }
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
    setEnrollingCourseId(course.id);
    try {
      const enrolled = await onEnrollCourse?.(course);
      if (enrolled === false) throw new Error('Enrollment could not be saved. Please try again.');
      setLocalEnrolledCourseIds((current) => (
        current.includes(course.id) ? current : [...current, course.id]
      ));
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
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0c2356] via-blue-900 to-indigo-900 text-white">
        <div className="pointer-events-none absolute -right-24 -top-32 h-96 w-96 rounded-full border-[48px] border-white/5" />
        <div className="pointer-events-none absolute bottom-0 right-1/3 h-48 w-48 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
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
        </div>
      </section>

      <main id="course-catalog" className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 sm:pb-20 sm:pt-10 lg:px-8">
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

              <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="relative min-h-56 overflow-hidden bg-gradient-to-br from-blue-800 to-indigo-950 p-6 text-white sm:min-h-72 sm:p-9">
                  {detailCourse.thumbnailUrl && (
                    <img src={detailCourse.thumbnailUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/65 to-slate-950/15" />
                  <div className="relative z-10 flex min-h-44 max-w-3xl flex-col justify-end sm:min-h-52">
                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${detailCourse.packType === 'Free' ? 'bg-emerald-300 text-emerald-950' : 'bg-amber-300 text-amber-950'}`}>
                        {detailCourse.packType}
                      </span>
                      <span className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-bold">{detailCourse.deliveryMode}</span>
                    </div>
                    <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">{detailCourse.title}</h2>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">{detailCourse.description}</p>
                    <p className="mt-3 text-sm font-extrabold text-white">
                      {detailCourse.packType === 'Free'
                        ? 'Free'
                        : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(detailCourse.price)}
                      {detailCourse.duration && <span className="ml-3 font-medium text-blue-100">{detailCourse.duration} access</span>}
                    </p>
                    {isDetailCourseExpired ? (
                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <span className="rounded-full bg-rose-100 px-3 py-1.5 text-xs font-extrabold text-rose-800">
                          Validity Expired
                        </span>
                        <button
                          type="button"
                          onClick={() => detailCourse.packType === 'Free'
                            ? void enrollFreeCourse(detailCourse)
                            : onBuyCourse?.(detailCourse)}
                          disabled={enrollingCourseId === detailCourse.id}
                          className="rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-extrabold text-slate-950 hover:bg-amber-300 disabled:cursor-wait disabled:opacity-60"
                        >
                          {detailCourse.packType === 'Free' ? 'Renew Free Enrollment' : 'Renew Course'}
                        </button>
                      </div>
                    ) : isDetailCourseAccessible && courseExpiryById[detailCourse.id] ? (
                      <p className="mt-3 text-sm font-bold text-emerald-200">{detailCourseValidity.remaining}</p>
                    ) : null}
                  </div>
                </div>

                <div role="tablist" aria-label="Course details" className="flex gap-1 overflow-x-auto border-b border-slate-200 px-3 pt-3 sm:px-6">
                  {detailTabs.map((tab) => (
                    <button
                      type="button"
                      role="tab"
                      key={tab.id}
                      id={`course-tab-${tab.id}`}
                      aria-selected={activeDetailTab === tab.id}
                      aria-controls="course-detail-panel"
                      onClick={() => updateDetailNavigation({ tab: tab.id })}
                      className={`min-h-11 shrink-0 border-b-2 px-3 text-xs font-extrabold transition sm:px-4 sm:text-sm ${
                        activeDetailTab === tab.id
                          ? 'border-amber-500 text-blue-950'
                          : 'border-transparent text-slate-500 hover:text-blue-800'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div
                  id="course-detail-panel"
                  role="tabpanel"
                  aria-labelledby={`course-tab-${activeDetailTab}`}
                  className="min-h-64 p-4 sm:p-7"
                >
                  {activeDetailTab === 'description' && (
                    <div className="prose prose-slate max-w-none">
                      {detailCourse.richDescription.length ? (
                        <PortableText value={detailCourse.richDescription} />
                      ) : (
                        <p className="text-sm leading-7 text-slate-600">{detailCourse.description || 'Course details will be added soon.'}</p>
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
                      <ol className="space-y-3">
                        {detailCourse.syllabusPlanner.map((item, index) => (
                          <li key={item._key || `${item.title}-${index}`} className="flex gap-4 rounded-2xl border border-slate-200 p-4">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-800">
                              <ListChecks className="h-5 w-5" />
                            </span>
                            <div>
                              <p className="text-[11px] font-extrabold uppercase tracking-wide text-blue-700">{item.week || `Part ${index + 1}`}</p>
                              <h3 className="mt-1 font-extrabold text-slate-900">{item.title}</h3>
                              {(item.module?.name || item.topic?.name) && (
                                <p className="mt-1 text-xs font-semibold text-slate-500">{[item.module?.name, item.topic?.name].filter(Boolean).join(' · ')}</p>
                              )}
                              {item.details && <p className="mt-2 text-sm leading-6 text-slate-600">{item.details}</p>}
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
                return (
                <article key={course.id} className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl">
                  <div className={`relative aspect-video overflow-hidden bg-gradient-to-br ${course.accent}`}>
                    {course.thumbnailUrl && (
                      <img src={course.thumbnailUrl} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" loading="lazy" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/35 via-transparent to-transparent" />
                    <span className={`absolute right-3 top-3 rounded-full px-3 py-1 text-[11px] font-extrabold shadow ${course.packType === 'Free' ? 'bg-emerald-300 text-emerald-950' : 'bg-amber-300 text-amber-950'}`}>
                      {course.packType}
                    </span>
                    {courseIsExpired && (
                      <span className="absolute bottom-3 right-3 rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-extrabold text-rose-800">
                        Validity Expired
                      </span>
                    )}
                    {course.platforms[0]?.name && (
                      <span className="absolute bottom-3 left-3 rounded-full border border-white/30 bg-slate-950/50 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur">
                        {course.platforms[0].name}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="line-clamp-2 min-h-12 text-base font-extrabold leading-6 text-slate-950">{course.title}</h3>
                    <div className="mt-2 flex min-h-5 flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-500">
                      {course.duration && <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5 text-blue-700" />{course.duration}</span>}
                      {courseIsAccessible && courseExpiryById[course.id] && (
                        <span className="font-bold text-emerald-700">{courseValidity.remaining}</span>
                      )}
                      {course.lessons > 0 && <span className="inline-flex items-center gap-1"><BookOpen className="h-3.5 w-3.5 text-blue-700" />{course.lessons} lessons</span>}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {uniqueValues([
                        ...course.tracks.map((item) => item.name),
                        ...course.platforms.map((item) => item.name),
                        course.packPurpose
                      ]).map((tag) => (
                        <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">{tag}</span>
                      ))}
                    </div>
                    <div className="mt-auto border-t border-slate-100 pt-4">
                      <p className="text-lg font-black text-blue-950">
                      {course.packType === 'Free'
                        ? 'Free'
                        : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(course.price)}
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/video-courses/${encodeURIComponent(course.slug)}`)}
                          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-white px-2.5 py-2 text-xs font-extrabold text-blue-950 transition hover:bg-blue-50"
                        >
                          Explore <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                        {course.packType === 'Free' ? (
                          <button
                            type="button"
                            onClick={() => courseIsAccessible && !courseIsExpired
                              ? navigate(`/video-courses/${encodeURIComponent(course.slug)}`)
                              : void enrollFreeCourse(course)}
                            disabled={enrollingCourseId === course.id}
                            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-2 text-xs font-extrabold text-white transition hover:bg-emerald-500 disabled:cursor-wait disabled:opacity-60"
                          >
                            {enrollingCourseId === course.id
                              ? 'Enrolling…'
                              : courseIsAccessible && !courseIsExpired
                                ? <><Check className="h-3.5 w-3.5" /> Enrolled</>
                                : courseIsExpired ? 'Renew Free' : 'Enroll Free'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => courseIsAccessible && !courseIsExpired
                              ? navigate(`/video-courses/${encodeURIComponent(course.slug)}`)
                              : onBuyCourse?.(course)}
                            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-2 text-xs font-extrabold text-white transition hover:bg-emerald-500"
                          >
                            {courseIsExpired ? 'Renew Course' : courseIsAccessible ? 'Continue' : 'Buy Now'}
                          </button>
                        )}
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
          {enrollmentError && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-800">{enrollmentError}</p>}
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
