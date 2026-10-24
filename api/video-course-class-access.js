import { createClient } from '@sanity/client';
import { verifyFirebaseIdToken } from '../server/studentProfileSync.js';
import { isCourseEntitlementActive } from '../src/utils/courseValidity.js';

const getString = (value) => (typeof value === 'string' ? value.trim() : '');
const normalizeCourseId = (value) => getString(value).replace(/^drafts\./, '');
const getEntitlementCourseId = (entry) => (
  typeof entry === 'string'
    ? entry
    : entry?.course?._ref
      || entry?.courseId
      || entry?.course?._id
      || entry?.course
      || entry?._ref
      || entry?._id
      || entry?.id
);

class VideoCourseAccessError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function getSanityClient(env) {
  const token = env.SANITY_API_WRITE_TOKEN;
  if (!token) {
    throw new VideoCourseAccessError(503, 'Course access is not configured.');
  }
  return createClient({
    projectId: env.SANITY_PROJECT_ID || env.VITE_SANITY_PROJECT_ID || 'rkev3aui',
    dataset: env.SANITY_DATASET || env.VITE_SANITY_DATASET || 'production',
    apiVersion: '2024-01-01',
    token,
    useCdn: false
  });
}

export async function getVideoCourseClassAccess({ body, authorization, env }) {
  const uid = getString(body?.uid);
  const courseId = getString(body?.courseId);
  const classId = getString(body?.classId);
  const lessonKey = getString(body?.lessonKey);
  const firebaseApiKey = getString(body?.firebaseApiKey)
    || env.VITE_FIREBASE_API_KEY
    || env.FIREBASE_WEB_API_KEY;
  const idToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!body || !uid || !courseId || (!classId && !lessonKey) || (classId && lessonKey) || !firebaseApiKey || !idToken) {
    throw new VideoCourseAccessError(400, 'Authenticated course and class details are required.');
  }

  try {
    const firebaseUser = await verifyFirebaseIdToken(idToken, firebaseApiKey);
    if (firebaseUser.localId !== uid) {
      throw new VideoCourseAccessError(403, 'The requested user does not match the authenticated account.');
    }

    const sanity = getSanityClient(env);
    const studentId = `student_${uid}`;
    const [course, student] = await Promise.all([
      sanity.fetch(`*[
        _type == "videoCoursePack"
        && (_id == $courseId || slug.current == $courseId)
        && (
          publishingStatus == "Instant"
          || (publishingStatus == "Scheduled" && defined(publishingDate) && publishingDate <= now())
        )
      ][0]{
        _id,
        "slug": slug.current,
        packType,
        duration,
        "classIds": classes[]->_id,
        "legacyLessons": videos[]{_key, videoTitle, videoType, duration, videoUrl}
      }`, { courseId }),
      sanity.getDocument(studentId)
    ]);

    const isMappedClass = classId && course?.classIds?.includes(classId);
    const legacyLesson = lessonKey
      ? course?.legacyLessons?.find((lesson) => lesson?._key === lessonKey)
      : null;
    if (!course || (!isMappedClass && !legacyLesson)) {
      throw new VideoCourseAccessError(404, 'The class is not part of this published course.');
    }
    const courseIdentifiers = new Set(
      [course._id, course.slug].map(normalizeCourseId).filter(Boolean)
    );
    const courseEntitlements = [
      ...(Array.isArray(student?.purchasedCourses) ? student.purchasedCourses : []),
      ...(Array.isArray(student?.enrolledCourses) ? student.enrolledCourses : []),
      ...(Array.isArray(student?.purchasedCourseIds) ? student.purchasedCourseIds : []),
      ...(Array.isArray(student?.enrolledCourseIds) ? student.enrolledCourseIds : [])
    ].filter((entry) => courseIdentifiers.has(normalizeCourseId(getEntitlementCourseId(entry))));
    if (!courseEntitlements.length) {
      throw new VideoCourseAccessError(403, 'Purchase or enroll in this course to access the class.');
    }
    if (!courseEntitlements.some((entry) => isCourseEntitlementActive(entry, course.duration))) {
      throw new VideoCourseAccessError(410, 'Course validity has expired. Renew the course to continue learning.');
    }

    const onlineClass = classId
      ? await sanity.fetch(`*[
        _type == "onlineClass"
        && _id == $classId
        && status == "Active"
      ][0]{
        title,
        videoType,
        videoLink,
        "classPdfUrl": classPdf.asset->url,
        "mappedBook": mappedBook->{
          _id,
          title,
          "slug": slug.current,
          author,
          "coverImageUrl": coverImage.asset->url,
          offerPrice,
          mrp,
          buyUrl
        }
      }`, { classId })
      : legacyLesson && {
        title: legacyLesson.videoTitle,
        videoType: legacyLesson.videoType,
        videoLink: legacyLesson.videoUrl
      };
    if (!onlineClass?.videoLink) {
      throw new VideoCourseAccessError(404, 'This class does not have a playable video.');
    }
    return onlineClass;
  } catch (error) {
    if (error.code === 'INVALID_FIREBASE_TOKEN') {
      throw new VideoCourseAccessError(401, 'Authentication is invalid or expired.');
    }
    if (error instanceof VideoCourseAccessError) throw error;
    console.error('Unable to load entitled video course class.');
    throw new VideoCourseAccessError(500, 'Unable to load this class right now.');
  }
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ success: false, error: 'Method not allowed.' });
  }
  const body = typeof request.body === 'string'
    ? (() => {
      try {
        return JSON.parse(request.body);
      } catch {
        return null;
      }
    })()
    : request.body;
  try {
    const result = await getVideoCourseClassAccess({
      body,
      authorization: request.headers.authorization,
      env: process.env
    });
    return response.status(200).json({ success: true, ...result });
  } catch (error) {
    if (error instanceof VideoCourseAccessError) {
      return response.status(error.status).json({ success: false, error: error.message });
    }
    console.error('Unable to handle course class access request.');
    return response.status(500).json({ success: false, error: 'Unable to load this class right now.' });
  }
}
