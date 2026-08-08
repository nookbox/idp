import type { listDeviceSessions } from '../api/device-sessions';

type ListResult = Awaited<ReturnType<typeof listDeviceSessions>>;

// listDeviceSessions 응답 한 건 = 세션 + 그 세션의 유저
export type DeviceSession = NonNullable<ListResult['data']>[number];
