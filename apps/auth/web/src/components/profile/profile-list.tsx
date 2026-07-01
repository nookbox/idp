import { AddProfileBtn } from './add-profile';
import { ProfileItem } from './profile-item';

export function ProfileList() {
  return (
    <ul className="my-8">
      <ProfileItem />
      <AddProfileBtn />
    </ul>
  );
}
