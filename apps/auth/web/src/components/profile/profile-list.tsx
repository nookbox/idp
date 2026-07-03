import { AddProfileBtn } from './add-profile';
import { ProfileItem } from './profile-item';

export function ProfileList() {
  return (
    <ul className="my-8 flex flex-wrap justify-center">
      {/* todo: 계정 리스트가 없다면 리턴안되게 변경 */}
      <ProfileItem />

      {/* todo: 계정 추가 버튼은 계정이 5개 이상이면 안보이게 변경 */}
      <AddProfileBtn />
    </ul>
  );
}
