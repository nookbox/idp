import { PROFILE_CHARACTERS, ProfileCharacter } from './profile-character';

export function ProfileItem() {
  return (
    <>
      {PROFILE_CHARACTERS.map((c, i) => (
        <li className="profile-tile" key={i}>
          <ProfileCharacter {...c} className="w-full h-full " />
          <div className="text-[clamp(12px,1.3vw,1.5rem)] font-semibold truncate my-2.5 text-center text-gray-50">
            정중식
          </div>
        </li>
      ))}
    </>
  );
}
