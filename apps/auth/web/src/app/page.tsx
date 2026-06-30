import Link from 'next/link';

export default function Home() {
  return (
    <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-8 space-y-6 text-center">
      <div>
        <h1 className="text-2xl font-semibold">Nook Auth</h1>
        <p className="text-sm text-gray-500 mt-1">Identity Provider</p>
      </div>
      <div className="flex gap-3 justify-center">
        <Link
          href="/signin"
          className="px-4 py-2 rounded-md bg-black text-white text-sm font-medium hover:bg-gray-800"
        >
          로그인
        </Link>
        <Link
          href="/signup"
          className="px-4 py-2 rounded-md border border-gray-300 text-sm font-medium hover:bg-gray-50"
        >
          회원가입
        </Link>
      </div>
    </div>
  );
}
