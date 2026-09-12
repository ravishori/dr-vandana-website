export {
  authenticateDoctor,
  clearDoctorSessionCookie,
  createSessionToken,
  getDoctorSession,
  hashPassword,
  isDoctorAuthConfigured,
  readSessionToken,
  requireDoctorSession,
  setDoctorSessionCookie,
} from "@/lib/doctor-auth/authenticate";
export { sessionCookieOptions } from "@/lib/doctor-auth/session";
